"""qilei_engine.py：为网页端四种双人棋调用项目已附带的外部 engine。"""

from pathlib import Path
from queue import Empty, Queue
from threading import Lock, Thread
from typing import Any, Dict, List, Optional
import atexit
import os
import random
import subprocess
import time

from qilei_config import QILEI_ROOT_DIR


# QILEI_ENGINE_DIR：项目根目录中四种外部 engine 的统一目录。
QILEI_ENGINE_DIR = QILEI_ROOT_DIR.parent / "engines"
# QILEI_ENGINE_TIMEOUT_SECONDS：一次机器人决策允许占用的最长后台时间。
QILEI_ENGINE_TIMEOUT_SECONDS = 3.0
# QILEI_NO_WINDOW：Windows 启动 engine 时隐藏额外控制台窗口。
QILEI_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
# QILEI_LAST_VARIATION：记录相同局面的上一着，确保连续新局不会机械重复同一开局。
QILEI_LAST_VARIATION: Dict[Any, str] = {}


def qilei_engine_process(qilei_command: List[str], qilei_cwd: Path) -> subprocess.Popen:
    """以 UTF-8 文本管道和隐藏窗口方式启动一个外部 engine 进程。"""
    return subprocess.Popen(
        qilei_command,
        cwd=str(qilei_cwd),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        creationflags=QILEI_NO_WINDOW,
    )


def qilei_engine_read_lines(qilei_process: subprocess.Popen, qilei_deadline: float,
                            qilei_match) -> Optional[str]:
    """在截止时间前异步读取 engine 输出，返回首个符合条件的行。"""
    # qilei_queue：后台读取线程向当前请求传递标准输出行。
    qilei_queue: Queue = Queue()

    def qilei_reader() -> None:
        """逐行读取当前 engine 标准输出，结束时写入空值哨兵。"""
        try:
            if qilei_process.stdout:
                for qilei_line in qilei_process.stdout:
                    qilei_queue.put(qilei_line.strip())
        finally:
            qilei_queue.put(None)

    # qilei_thread：避免 Windows 管道 readline 阻塞请求线程的读取线程。
    qilei_thread = Thread(target=qilei_reader, daemon=True)
    qilei_thread.start()
    while time.monotonic() < qilei_deadline:
        try:
            # qilei_line：engine 在本轮搜索中产生的一行文本。
            qilei_line = qilei_queue.get(timeout=min(0.1, max(0.01, qilei_deadline - time.monotonic())))
        except Empty:
            continue
        if qilei_line is None:
            return None
        if qilei_match(qilei_line):
            return qilei_line
    return None


def qilei_engine_collect_uci(qilei_process: subprocess.Popen, qilei_deadline: float) -> Dict[str, Any]:
    """读取到 bestmove 为止，同时收集 MultiPV 候选着法和分数。"""
    # qilei_queue：当前 UCI 搜索输出的线程安全队列。
    qilei_queue: Queue = Queue()

    def qilei_reader() -> None:
        """持续读取当前 UCI 搜索输出。"""
        try:
            if qilei_process.stdout:
                for qilei_line in qilei_process.stdout:
                    qilei_queue.put(qilei_line.strip())
        finally:
            qilei_queue.put(None)

    qilei_thread = Thread(target=qilei_reader, daemon=True)  # qilei_thread：防止 Windows 管道阻塞主请求的读取线程。
    qilei_thread.start()
    qilei_candidates: Dict[int, Dict[str, Any]] = {}  # qilei_candidates：按 MultiPV 编号保存最后一轮候选着法。
    qilei_bestmove = ""
    while time.monotonic() < qilei_deadline:
        try:
            qilei_line = qilei_queue.get(timeout=min(0.1, max(0.01, qilei_deadline - time.monotonic())))  # qilei_line：本轮 engine 输出。
        except Empty:
            continue
        if qilei_line is None:
            break
        if qilei_line.startswith("bestmove "):
            qilei_bestmove = qilei_line.split()[1]
            break
        if not qilei_line.startswith("info ") or " pv " not in qilei_line or " score " not in qilei_line:
            continue
        qilei_parts = qilei_line.split()  # qilei_parts：当前 info 行的空格分词。
        try:
            qilei_pv_index = int(qilei_parts[qilei_parts.index("multipv") + 1]) if "multipv" in qilei_parts else 1
            qilei_score_index = qilei_parts.index("score")
            qilei_score_kind = qilei_parts[qilei_score_index + 1]
            qilei_score_value = int(qilei_parts[qilei_score_index + 2])
            qilei_move = qilei_parts[qilei_parts.index("pv") + 1]
        except (ValueError, IndexError):
            continue
        qilei_score = qilei_score_value if qilei_score_kind == "cp" else (100000 if qilei_score_value > 0 else -100000)
        qilei_candidates[qilei_pv_index] = {"move": qilei_move, "score": qilei_score}
    return {"bestmove": qilei_bestmove, "candidates": [qilei_candidates[qilei_index] for qilei_index in sorted(qilei_candidates)]}


def qilei_engine_choose_uci(qilei_result: Dict[str, Any], qilei_position: Dict[str, Any],
                            qilei_level: int, qilei_close_score: int) -> str:
    """从 engine 的强候选中带小幅随机性选着，避免双方机器人每局完全重复。"""
    qilei_bestmove = str(qilei_result.get("bestmove") or "")  # qilei_bestmove：engine 的第一候选。
    qilei_candidates = list(qilei_result.get("candidates") or [])  # qilei_candidates：MultiPV 候选列表。
    if not qilei_candidates:
        return qilei_bestmove
    qilei_balanced = bool(qilei_position.get("balanced"))  # qilei_balanced：双方机器人模式需要在强候选间变化。
    qilei_move_count = max(0, int(qilei_position.get("moveCount") or 0))  # qilei_move_count：用于限制开局随机范围。
    if not qilei_balanced and qilei_level >= 3:
        return qilei_bestmove or str(qilei_candidates[0]["move"])
    qilei_threshold = qilei_close_score + (20 if qilei_move_count < 12 else 0) + (15 if qilei_level == 1 else 0)  # qilei_threshold：可接受的最优分差。
    qilei_top_score = int(qilei_candidates[0]["score"])  # qilei_top_score：第一候选局面分。
    qilei_close_candidates = [
        qilei_candidate for qilei_candidate in qilei_candidates
        if qilei_top_score - int(qilei_candidate["score"]) <= qilei_threshold
    ]
    if len(qilei_close_candidates) <= 1:
        return qilei_bestmove or str(qilei_candidates[0]["move"])
    qilei_board = qilei_position.get("board")  # qilei_board：用于区分同一局面的棋盘数组。
    qilei_variation_key = (tuple(qilei_board) if isinstance(qilei_board, list) else (), str(qilei_position.get("side", "")))  # qilei_variation_key：相同局面和行动方的变化记录键。
    qilei_last_move = QILEI_LAST_VARIATION.get(qilei_variation_key, "")  # qilei_last_move：上一次相同局面实际返回的着法。
    qilei_pool = [qilei_candidate for qilei_candidate in qilei_close_candidates if str(qilei_candidate["move"]) != qilei_last_move] or qilei_close_candidates  # qilei_pool：尽量排除连续重复后的强候选池。
    qilei_weights = [max(1, len(qilei_pool) - qilei_index) for qilei_index in range(len(qilei_pool))]  # qilei_weights：仍然偏向高排名候选。
    qilei_selected_move = str(random.choices(qilei_pool, weights=qilei_weights, k=1)[0]["move"])  # qilei_selected_move：最终返回的强候选着法。
    QILEI_LAST_VARIATION[qilei_variation_key] = qilei_selected_move
    if len(QILEI_LAST_VARIATION) > 2048:
        QILEI_LAST_VARIATION.pop(next(iter(QILEI_LAST_VARIATION)))
    return qilei_selected_move


def qilei_engine_write(qilei_process: subprocess.Popen, *qilei_commands: str) -> None:
    """向 engine 依次写入协议命令并立即刷新。"""
    if not qilei_process.stdin:
        raise RuntimeError("engine 输入管道不可用。")
    for qilei_command in qilei_commands:
        qilei_process.stdin.write(qilei_command + "\n")
    qilei_process.stdin.flush()


def qilei_engine_stop(qilei_process: Optional[subprocess.Popen]) -> None:
    """温和关闭 engine；无响应时终止，避免残留后台进程。"""
    if not qilei_process:
        return
    try:
        if qilei_process.poll() is None:
            qilei_engine_write(qilei_process, "quit")
            qilei_process.wait(timeout=0.4)
    except (BrokenPipeError, OSError, subprocess.TimeoutExpired):
        try:
            qilei_process.kill()
        except OSError:
            pass


def guojixiangqi_engine_fen(guojixiangqi_board: List[Any], guojixiangqi_side: str) -> str:
    """把网页国际象棋棋盘转换为 UCI engine 使用的 FEN。"""
    # guojixiangqi_rows：FEN 从黑方底线到白方底线的八行文本。
    guojixiangqi_rows: List[str] = []
    for guojixiangqi_row in range(8):
        # guojixiangqi_text：当前 FEN 行。
        guojixiangqi_text = ""
        # guojixiangqi_empty_count：当前连续空格数。
        guojixiangqi_empty_count = 0
        for guojixiangqi_col in range(8):
            # guojixiangqi_piece：网页棋盘中的 wP、bK 等棋子编码。
            guojixiangqi_piece = guojixiangqi_board[guojixiangqi_row * 8 + guojixiangqi_col]
            if not guojixiangqi_piece:
                guojixiangqi_empty_count += 1
                continue
            if guojixiangqi_empty_count:
                guojixiangqi_text += str(guojixiangqi_empty_count)
                guojixiangqi_empty_count = 0
            # guojixiangqi_letter：FEN 使用的大小写棋子字母。
            guojixiangqi_letter = str(guojixiangqi_piece)[1]
            guojixiangqi_text += guojixiangqi_letter.upper() if str(guojixiangqi_piece)[0] == "w" else guojixiangqi_letter.lower()
        if guojixiangqi_empty_count:
            guojixiangqi_text += str(guojixiangqi_empty_count)
        guojixiangqi_rows.append(guojixiangqi_text)
    return f"{'/'.join(guojixiangqi_rows)} {'w' if guojixiangqi_side == 'w' else 'b'} - - 0 1"


def guojixiangqi_engine_parse_move(guojixiangqi_text: str) -> Optional[Dict[str, Any]]:
    """把国际象棋 UCI 坐标转换为网页棋盘下标和可选升变。"""
    if len(guojixiangqi_text) < 4:
        return None
    try:
        # guojixiangqi_from_col/from_row：UCI 起点坐标。
        guojixiangqi_from_col = ord(guojixiangqi_text[0]) - ord("a")
        guojixiangqi_from_row = 8 - int(guojixiangqi_text[1])
        # guojixiangqi_to_col/to_row：UCI 终点坐标。
        guojixiangqi_to_col = ord(guojixiangqi_text[2]) - ord("a")
        guojixiangqi_to_row = 8 - int(guojixiangqi_text[3])
    except (ValueError, IndexError):
        return None
    if not all(0 <= qilei_value < 8 for qilei_value in (guojixiangqi_from_col, guojixiangqi_from_row, guojixiangqi_to_col, guojixiangqi_to_row)):
        return None
    # guojixiangqi_promotion：UCI 第五字符对应的升变棋子。
    guojixiangqi_promotion = guojixiangqi_text[4].upper() if len(guojixiangqi_text) > 4 else "Q"
    return {
        "from": guojixiangqi_from_row * 8 + guojixiangqi_from_col,
        "to": guojixiangqi_to_row * 8 + guojixiangqi_to_col,
        "promotion": guojixiangqi_promotion,
    }


def guojixiangqi_engine_move(guojixiangqi_position: Dict[str, Any], qilei_level: int) -> Optional[Dict[str, Any]]:
    """调用国际象棋 UCI engine 返回一步坐标。"""
    # guojixiangqi_dir/exe：国际象棋 engine 目录和程序。
    guojixiangqi_dir = QILEI_ENGINE_DIR / "guojixiangqi"
    guojixiangqi_exe = guojixiangqi_dir / "stockfish.exe"
    # guojixiangqi_board/side：网页传入的当前局面。
    guojixiangqi_board = guojixiangqi_position.get("board")
    guojixiangqi_side = str(guojixiangqi_position.get("side", "w"))
    if not guojixiangqi_exe.is_file() or not isinstance(guojixiangqi_board, list) or len(guojixiangqi_board) != 64:
        return None
    # guojixiangqi_process：本次 UCI 搜索进程。
    guojixiangqi_process = qilei_engine_process([str(guojixiangqi_exe)], guojixiangqi_dir)
    try:
        # guojixiangqi_milliseconds：难度对应的 UCI 思考时间，始终小于三秒。
        guojixiangqi_milliseconds = [450, 1100, 2200][max(0, min(2, qilei_level - 1))]
        qilei_engine_write(
            guojixiangqi_process,
            "uci",
            "setoption name Threads value 4",
            "setoption name Hash value 256",
            "setoption name MultiPV value 4",
            "isready",
            f"position fen {guojixiangqi_engine_fen(guojixiangqi_board, guojixiangqi_side)}",
            f"go movetime {guojixiangqi_milliseconds}",
        )
        # guojixiangqi_result：包含 bestmove 和四个强候选的 UCI 搜索结果。
        guojixiangqi_result = qilei_engine_collect_uci(guojixiangqi_process, time.monotonic() + QILEI_ENGINE_TIMEOUT_SECONDS)
        # guojixiangqi_move_text：根据模式从分差很小的强候选中选出的着法。
        guojixiangqi_move_text = qilei_engine_choose_uci(guojixiangqi_result, guojixiangqi_position, qilei_level, 35)
        if not guojixiangqi_move_text:
            return None
        return guojixiangqi_engine_parse_move(guojixiangqi_move_text)
    finally:
        qilei_engine_stop(guojixiangqi_process)


def zhongguoxiangqi_engine_fen(zhongguoxiangqi_board: List[Any], zhongguoxiangqi_side: str) -> str:
    """把网页中国象棋棋盘转换为 UCI 象棋 engine 使用的 FEN。"""
    # zhongguoxiangqi_type_map：网页类型字母到 FEN 字母的映射。
    zhongguoxiangqi_type_map = {"K": "k", "A": "a", "E": "b", "H": "n", "R": "r", "C": "c", "P": "p"}
    # zhongguoxiangqi_rows：FEN 的十行文本。
    zhongguoxiangqi_rows: List[str] = []
    for zhongguoxiangqi_row in range(10):
        # zhongguoxiangqi_text/empty_count：当前 FEN 行和连续空点数。
        zhongguoxiangqi_text = ""
        zhongguoxiangqi_empty_count = 0
        for zhongguoxiangqi_col in range(9):
            # zhongguoxiangqi_piece：网页中的 rK、bP 等棋子编码。
            zhongguoxiangqi_piece = zhongguoxiangqi_board[zhongguoxiangqi_row * 9 + zhongguoxiangqi_col]
            if not zhongguoxiangqi_piece:
                zhongguoxiangqi_empty_count += 1
                continue
            if zhongguoxiangqi_empty_count:
                zhongguoxiangqi_text += str(zhongguoxiangqi_empty_count)
                zhongguoxiangqi_empty_count = 0
            # zhongguoxiangqi_letter：当前棋子的象棋 FEN 字母。
            zhongguoxiangqi_letter = zhongguoxiangqi_type_map[str(zhongguoxiangqi_piece)[1]]
            zhongguoxiangqi_text += zhongguoxiangqi_letter.upper() if str(zhongguoxiangqi_piece)[0] == "r" else zhongguoxiangqi_letter
        if zhongguoxiangqi_empty_count:
            zhongguoxiangqi_text += str(zhongguoxiangqi_empty_count)
        zhongguoxiangqi_rows.append(zhongguoxiangqi_text)
    return f"{'/'.join(zhongguoxiangqi_rows)} {'w' if zhongguoxiangqi_side == 'r' else 'b'} - - 0 1"


def zhongguoxiangqi_engine_parse_move(zhongguoxiangqi_text: str) -> Optional[Dict[str, int]]:
    """把中国象棋 UCI 坐标转换为十行九列网页下标。"""
    if len(zhongguoxiangqi_text) < 4:
        return None
    try:
        # zhongguoxiangqi_from/to：由文件字母和自红方起算的行号组成的两个坐标。
        zhongguoxiangqi_from_col = ord(zhongguoxiangqi_text[0]) - ord("a")
        zhongguoxiangqi_from_row = 9 - int(zhongguoxiangqi_text[1])
        zhongguoxiangqi_to_col = ord(zhongguoxiangqi_text[2]) - ord("a")
        zhongguoxiangqi_to_row = 9 - int(zhongguoxiangqi_text[3])
    except (ValueError, IndexError):
        return None
    if not (0 <= zhongguoxiangqi_from_col < 9 and 0 <= zhongguoxiangqi_to_col < 9 and 0 <= zhongguoxiangqi_from_row < 10 and 0 <= zhongguoxiangqi_to_row < 10):
        return None
    return {
        "from": zhongguoxiangqi_from_row * 9 + zhongguoxiangqi_from_col,
        "to": zhongguoxiangqi_to_row * 9 + zhongguoxiangqi_to_col,
    }


def zhongguoxiangqi_engine_move(zhongguoxiangqi_position: Dict[str, Any], qilei_level: int) -> Optional[Dict[str, int]]:
    """调用中国象棋 UCI engine 返回一步坐标。"""
    # zhongguoxiangqi_dir/exe：象棋 engine 目录和程序。
    zhongguoxiangqi_dir = QILEI_ENGINE_DIR / "zhongguoxiangqi"
    zhongguoxiangqi_exe = zhongguoxiangqi_dir / "pikafish.exe"
    # zhongguoxiangqi_board/side：网页当前棋盘和行动方。
    zhongguoxiangqi_board = zhongguoxiangqi_position.get("board")
    zhongguoxiangqi_side = str(zhongguoxiangqi_position.get("side", "r"))
    if not zhongguoxiangqi_exe.is_file() or not isinstance(zhongguoxiangqi_board, list) or len(zhongguoxiangqi_board) != 90:
        return None
    # zhongguoxiangqi_process：本次象棋 UCI 搜索进程。
    zhongguoxiangqi_process = qilei_engine_process([str(zhongguoxiangqi_exe)], zhongguoxiangqi_dir)
    try:
        # zhongguoxiangqi_milliseconds：难度对应的思考时间。
        zhongguoxiangqi_milliseconds = [450, 1100, 2200][max(0, min(2, qilei_level - 1))]
        qilei_engine_write(
            zhongguoxiangqi_process,
            "uci",
            "setoption name Threads value 4",
            "setoption name Hash value 256",
            "setoption name EvalFile value pikafish.nnue",
            "setoption name MultiPV value 4",
            "isready",
            f"position fen {zhongguoxiangqi_engine_fen(zhongguoxiangqi_board, zhongguoxiangqi_side)}",
            f"go movetime {zhongguoxiangqi_milliseconds}",
        )
        # zhongguoxiangqi_result：包含 bestmove 和四个强候选的 UCI 搜索结果。
        zhongguoxiangqi_result = qilei_engine_collect_uci(zhongguoxiangqi_process, time.monotonic() + QILEI_ENGINE_TIMEOUT_SECONDS)
        # zhongguoxiangqi_move_text：在接近最优的强候选中保留小幅对局变化。
        zhongguoxiangqi_move_text = qilei_engine_choose_uci(zhongguoxiangqi_result, zhongguoxiangqi_position, qilei_level, 45)
        if not zhongguoxiangqi_move_text:
            return None
        return zhongguoxiangqi_engine_parse_move(zhongguoxiangqi_move_text)
    finally:
        qilei_engine_stop(zhongguoxiangqi_process)


def wuziqi_engine_move(wuziqi_position: Dict[str, Any], qilei_level: int) -> Optional[Dict[str, int]]:
    """使用 Gomocup 协议调用五子棋 engine。"""
    # wuziqi_dir/exe：五子棋 engine 目录和程序。
    wuziqi_dir = QILEI_ENGINE_DIR / "wuziqi"
    wuziqi_exe = wuziqi_dir / "rapfi.exe"
    # wuziqi_board/side：十五路棋盘和当前棋色。
    wuziqi_board = wuziqi_position.get("board")
    wuziqi_side = int(wuziqi_position.get("side", 1))
    if not wuziqi_exe.is_file() or not isinstance(wuziqi_board, list) or len(wuziqi_board) != 225 or wuziqi_side not in (1, 2):
        return None
    # wuziqi_move_count：当前盘面已落子数，用于双方机器人开局产生合规变化。
    wuziqi_move_count = sum(1 for wuziqi_stone in wuziqi_board if int(wuziqi_stone or 0) in (1, 2))
    if bool(wuziqi_position.get("balanced")) and wuziqi_move_count == 0:
        # wuziqi_opening_candidates：中心及紧邻中心的高质量开局点。
        wuziqi_opening_candidates = [(7, 7), (6, 7), (8, 7), (7, 6), (7, 8), (6, 6), (8, 8), (6, 8), (8, 6)]
        wuziqi_row, wuziqi_col = random.choice(wuziqi_opening_candidates)
        return {"row": wuziqi_row, "col": wuziqi_col}
    # wuziqi_process：本次 Gomocup 请求进程。
    wuziqi_process = qilei_engine_process([str(wuziqi_exe)], wuziqi_dir)
    try:
        # wuziqi_timeout：按难度设置的毫秒思考上限。
        wuziqi_timeout = [350, 900, 1800][max(0, min(2, qilei_level - 1))]
        qilei_engine_write(
            wuziqi_process,
            "START 15",
            f"INFO timeout_turn {wuziqi_timeout}",
            f"INFO time_left {max(1000, wuziqi_timeout * 4)}",
            "INFO game_type 1",
            "BOARD",
        )
        for wuziqi_index, wuziqi_stone in enumerate(wuziqi_board):
            if int(wuziqi_stone or 0) not in (1, 2):
                continue
            # wuziqi_owner：Gomocup 中 1 表示当前 engine，2 表示对手。
            wuziqi_owner = 1 if int(wuziqi_stone) == wuziqi_side else 2
            qilei_engine_write(wuziqi_process, f"{wuziqi_index % 15},{wuziqi_index // 15},{wuziqi_owner}")
        qilei_engine_write(wuziqi_process, "DONE")
        # wuziqi_line：engine 返回的 x,y 坐标行。
        wuziqi_line = qilei_engine_read_lines(
            wuziqi_process,
            time.monotonic() + QILEI_ENGINE_TIMEOUT_SECONDS,
            lambda qilei_line: "," in qilei_line and qilei_line.replace(",", "").replace("-", "").isdigit(),
        )
        if not wuziqi_line:
            return None
        # wuziqi_col/row：Gomocup 坐标中的列和行。
        wuziqi_col, wuziqi_row = (int(qilei_value) for qilei_value in wuziqi_line.split(",")[:2])
        if 0 <= wuziqi_row < 15 and 0 <= wuziqi_col < 15 and not wuziqi_board[wuziqi_row * 15 + wuziqi_col]:
            return {"row": wuziqi_row, "col": wuziqi_col}
        return None
    finally:
        qilei_engine_stop(wuziqi_process)


def weiqi_engine_vertex(weiqi_row: int, weiqi_col: int) -> str:
    """把网页围棋行列转换为 GTP 坐标。"""
    # weiqi_columns：GTP 跳过字母 I 的十九列。
    weiqi_columns = "ABCDEFGHJKLMNOPQRST"
    return f"{weiqi_columns[weiqi_col]}{19 - weiqi_row}"


def weiqi_engine_parse_vertex(weiqi_vertex: str) -> Optional[Dict[str, int]]:
    """把 GTP 坐标转换回网页围棋行列。"""
    # weiqi_columns：GTP 的十九列字母。
    weiqi_columns = "ABCDEFGHJKLMNOPQRST"
    weiqi_upper_vertex = weiqi_vertex.strip().upper()
    if weiqi_upper_vertex in ("PASS", "RESIGN") or len(weiqi_upper_vertex) < 2:
        return None
    try:
        # weiqi_col/row：解析后的网页列和行。
        weiqi_col = weiqi_columns.index(weiqi_upper_vertex[0])
        weiqi_row = 19 - int(weiqi_upper_vertex[1:])
    except (ValueError, IndexError):
        return None
    if 0 <= weiqi_row < 19 and 0 <= weiqi_col < 19:
        return {"row": weiqi_row, "col": weiqi_col}
    return None


class weiqi_engine_session:
    """常驻加载围棋模型，避免每回合重复读取大型网络文件。"""

    def __init__(self) -> None:
        # weiqi_process：常驻的围棋 GTP engine 进程。
        self.weiqi_process: Optional[subprocess.Popen] = None
        # weiqi_output：常驻读取线程写入的 GTP 响应队列。
        self.weiqi_output: Queue = Queue()
        # weiqi_lock：保护进程启动、清盘、重放和生成命令。
        self.weiqi_lock = Lock()
        # weiqi_ready：常驻模型是否已经成功完成过一次 GTP 生成。
        self.weiqi_ready = False
        # weiqi_warm_thread：网站启动时后台预加载模型的线程。
        self.weiqi_warm_thread = Thread(target=self.weiqi_start, daemon=True)
        self.weiqi_warm_thread.start()

    def weiqi_start(self) -> bool:
        """启动并保持围棋 GTP engine；已经运行时直接复用。"""
        with self.weiqi_lock:
            if self.weiqi_process and self.weiqi_process.poll() is None:
                return True
            # weiqi_dir/exe/model/config：围棋 engine 的程序、网络和配置文件。
            weiqi_dir = QILEI_ENGINE_DIR / "weiqi"
            weiqi_exe = weiqi_dir / "katago.exe"
            weiqi_model = weiqi_dir / "model.bin.gz"
            weiqi_config = weiqi_dir / "gtp.cfg"
            if not all(qilei_path.is_file() for qilei_path in (weiqi_exe, weiqi_model, weiqi_config)):
                return False
            self.weiqi_output = Queue()
            self.weiqi_ready = False
            self.weiqi_process = qilei_engine_process(
                [str(weiqi_exe), "gtp", "-model", str(weiqi_model), "-config", str(weiqi_config)],
                weiqi_dir,
            )

            def weiqi_reader() -> None:
                """持续读取常驻围棋 engine 的标准输出。"""
                try:
                    if self.weiqi_process and self.weiqi_process.stdout:
                        for weiqi_line in self.weiqi_process.stdout:
                            self.weiqi_output.put(weiqi_line.strip())
                finally:
                    self.weiqi_output.put(None)

            # weiqi_reader_thread：常驻进程唯一的标准输出读取线程。
            weiqi_reader_thread = Thread(target=weiqi_reader, daemon=True)
            weiqi_reader_thread.start()
            return True

    def weiqi_move(self, weiqi_board: List[Any], weiqi_side: int,
                   qilei_level: int, weiqi_balanced: bool = False) -> Optional[Dict[str, int]]:
        """清盘、重放当前局面并在常驻模型中生成落点。"""
        if not self.weiqi_start():
            return None
        with self.weiqi_lock:
            if not self.weiqi_process or self.weiqi_process.poll() is not None:
                return None
            while True:
                try:
                    self.weiqi_output.get_nowait()
                except Empty:
                    break
            # weiqi_commands：初始化并按当前棋盘重放的 GTP 命令。
            weiqi_commands = ["boardsize 19", "komi 7.5", "clear_board"]
            for weiqi_index, weiqi_stone in enumerate(weiqi_board):
                if int(weiqi_stone or 0) in (1, 2):
                    weiqi_commands.append(
                        f"play {'B' if int(weiqi_stone) == 1 else 'W'} {weiqi_engine_vertex(weiqi_index // 19, weiqi_index % 19)}"
                    )
            # weiqi_visits/time：难度对应的访问数和思考时间，最高档仍控制在三秒以内。
            weiqi_level_index = max(0, min(2, qilei_level - 1))
            weiqi_visits = [80, 250, 700][weiqi_level_index]
            weiqi_max_time = [0.4, 0.9, 1.8][weiqi_level_index]
            weiqi_commands.extend([
                f"kata-set-param maxVisits {weiqi_visits}",
                f"kata-set-param maxTime {weiqi_max_time}",
                f"kata-set-param rootNoiseEnabled {'true' if weiqi_balanced else 'false'}",
                f"genmove {'B' if weiqi_side == 1 else 'W'}",
            ])
            qilei_engine_write(self.weiqi_process, *weiqi_commands)
            # weiqi_deadline：预热后的八秒硬截止时间；首次大型模型加载放宽到二十秒。
            weiqi_deadline = time.monotonic() + (8.0 if self.weiqi_ready else 20.0)
            while time.monotonic() < weiqi_deadline:
                try:
                    # weiqi_line：一条 GTP 响应，只有 genmove 响应带有落点文本。
                    weiqi_line = self.weiqi_output.get(timeout=min(0.1, max(0.01, weiqi_deadline - time.monotonic())))
                except Empty:
                    continue
                if weiqi_line is None:
                    break
                if weiqi_line.startswith("=") and len(weiqi_line) > 1:
                    self.weiqi_ready = True
                    return weiqi_engine_parse_vertex(weiqi_line[1:].strip())
            return None

    def weiqi_stop(self) -> None:
        """网站退出时关闭常驻围棋 engine。"""
        with self.weiqi_lock:
            qilei_engine_stop(self.weiqi_process)
            self.weiqi_process = None
            self.weiqi_ready = False


# QILEI_WEIQI_ENGINE_SESSION：网站进程共享且预热一次的围棋模型会话。
QILEI_WEIQI_ENGINE_SESSION = weiqi_engine_session()
atexit.register(QILEI_WEIQI_ENGINE_SESSION.weiqi_stop)


def weiqi_engine_move(weiqi_position: Dict[str, Any], qilei_level: int) -> Optional[Dict[str, int]]:
    """调用围棋 GTP engine，重放当前棋盘后生成一步落子。"""
    # weiqi_board/side：十九路棋盘和当前棋色。
    weiqi_board = weiqi_position.get("board")
    weiqi_side = int(weiqi_position.get("side", 1))
    if not isinstance(weiqi_board, list) or len(weiqi_board) != 361 or weiqi_side not in (1, 2):
        return None
    return QILEI_WEIQI_ENGINE_SESSION.weiqi_move(weiqi_board, weiqi_side, qilei_level, bool(weiqi_position.get("balanced")))


class qilei_engine_service:
    """串行调度外部 engine，避免多个机器人同时争用模型文件。"""

    def __init__(self) -> None:
        # qilei_lock：一次只允许一个外部 engine 请求执行。
        self.qilei_lock = Lock()

    def qilei_move(self, qilei_game_id: str, qilei_position: Dict[str, Any],
                   qilei_level: int = 2) -> Optional[Dict[str, Any]]:
        """按棋类编号调用对应 engine；失败时返回空值供前端规则机器人兜底。"""
        # qilei_handlers：四种网页棋类到 engine 适配函数的映射。
        qilei_handlers = {
            "xiangqi": zhongguoxiangqi_engine_move,
            "chess": guojixiangqi_engine_move,
            "go": weiqi_engine_move,
            "gomoku": wuziqi_engine_move,
        }
        # qilei_handler：当前棋类的 engine 适配函数。
        qilei_handler = qilei_handlers.get(qilei_game_id)
        if not qilei_handler:
            return None
        with self.qilei_lock:
            try:
                return qilei_handler(qilei_position, max(1, min(3, int(qilei_level or 2))))
            except (OSError, RuntimeError, subprocess.SubprocessError, ValueError):
                return None


# QILEI_ENGINE_SERVICE：HTTP 请求线程共享的外部 engine 服务。
QILEI_ENGINE_SERVICE = qilei_engine_service()
