"""qilei_storage.py：只在 data/用户名/user 与 data/用户名/result 中保存用户 JSON 数据。"""

from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import Any, Dict, List, Optional, Tuple
import json
import os
import shutil
import uuid


def qilei_now_text() -> str:
    """返回带本地时区、适合显示和排序的 ISO 时间。"""
    return datetime.now().astimezone().isoformat(timespec="seconds")


class qilei_json_storage:
    """为每名玩家建立两个数据文件夹，并提供线程安全的原子 JSON 读写。"""

    def __init__(self, qilei_data_dir: Path, qilei_users_dir: Path) -> None:
        # qilei_data_dir：只保存运行数据的 data 根目录。
        self.qilei_data_dir = qilei_data_dir
        # qilei_users_dir：新结构中与 data 根目录相同，保留参数以兼容服务器构造代码。
        self.qilei_users_dir = qilei_users_dir
        # qilei_legacy_accounts_path：旧版集中账号文件，仅用于一次迁移。
        self.qilei_legacy_accounts_path = qilei_data_dir / "accounts.json"
        # qilei_legacy_users_dir：旧版 users 目录，仅用于一次迁移。
        self.qilei_legacy_users_dir = qilei_data_dir / "users"
        # qilei_lock：保护多线程读写操作的可重入锁。
        self.qilei_lock = RLock()
        self.qilei_data_dir.mkdir(parents=True, exist_ok=True)
        self.qilei_migrate_legacy_layout()

    def qilei_read_json(self, qilei_path: Path, qilei_default: Any) -> Any:
        """读取 JSON；文件不存在或损坏时返回调用者提供的默认值。"""
        if not qilei_path.exists():
            return qilei_default
        try:
            with qilei_path.open("r", encoding="utf-8") as qilei_stream:
                return json.load(qilei_stream)
        except (OSError, json.JSONDecodeError):
            return qilei_default

    def qilei_write_json(self, qilei_path: Path, qilei_value: Any) -> None:
        """先写同目录临时文件并同步磁盘，再原子替换目标 JSON。"""
        qilei_path.parent.mkdir(parents=True, exist_ok=True)
        # qilei_temporary：与目标同目录的原子写入临时文件。
        qilei_temporary = qilei_path.with_name(qilei_path.name + ".tmp")
        with qilei_temporary.open("w", encoding="utf-8") as qilei_stream:
            json.dump(qilei_value, qilei_stream, ensure_ascii=False, indent=2)
            qilei_stream.flush()
            os.fsync(qilei_stream.fileno())
        os.replace(str(qilei_temporary), str(qilei_path))

    def qilei_user_dir(self, qilei_username: str) -> Path:
        """返回 data 下以纯数字用户名直接命名的玩家目录。"""
        return self.qilei_data_dir / qilei_username

    def qilei_account_dir(self, qilei_username: str) -> Path:
        """返回玩家目录中的 user 账号数据文件夹。"""
        return self.qilei_user_dir(qilei_username) / "user"

    def qilei_result_dir(self, qilei_username: str) -> Path:
        """返回玩家目录中的 result 单局数据文件夹。"""
        return self.qilei_user_dir(qilei_username) / "result"

    def qilei_account_path(self, qilei_username: str) -> Path:
        """返回以用户名命名的账号摘要 JSON 文件。"""
        return self.qilei_account_dir(qilei_username) / (qilei_username + ".json")

    def qilei_create_user_folder(self, qilei_username: str, qilei_is_admin: bool = False) -> None:
        """只创建 data/用户名/user 和 data/用户名/result 两个数据文件夹。"""
        del qilei_is_admin
        with self.qilei_lock:
            self.qilei_account_dir(qilei_username).mkdir(parents=True, exist_ok=True)
            self.qilei_result_dir(qilei_username).mkdir(parents=True, exist_ok=True)

    def qilei_delete_user_folder(self, qilei_username: str) -> bool:
        """在确认目录边界后，删除一名玩家的整个独立数据文件夹。"""
        if not qilei_username.isdigit():
            return False
        with self.qilei_lock:
            # qilei_target：解析后的待删除玩家目录。
            qilei_target = self.qilei_user_dir(qilei_username).resolve()
            # qilei_data_root：解析后的 data 根目录，用于阻止越界删除。
            qilei_data_root = self.qilei_data_dir.resolve()
            if qilei_target.parent != qilei_data_root or not qilei_target.is_dir():
                return False
            shutil.rmtree(qilei_target)
            return not qilei_target.exists()

    def qilei_load_accounts(self) -> Dict[str, Dict[str, Any]]:
        """扫描每名玩家 user 文件夹中的独立账号摘要。"""
        with self.qilei_lock:
            # qilei_accounts：用户名到账号摘要的安全映射。
            qilei_accounts: Dict[str, Dict[str, Any]] = {}
            for qilei_player_dir in self.qilei_data_dir.iterdir():
                if not qilei_player_dir.is_dir() or not qilei_player_dir.name.isdigit():
                    continue
                # qilei_username：当前玩家目录名称。
                qilei_username = qilei_player_dir.name
                # qilei_account：当前玩家独立账号文件内容。
                qilei_account = self.qilei_read_json(self.qilei_account_path(qilei_username), None)
                if isinstance(qilei_account, dict):
                    qilei_account["username"] = qilei_username
                    qilei_accounts[qilei_username] = qilei_account
            return qilei_accounts

    def qilei_save_accounts(self, qilei_accounts: Dict[str, Dict[str, Any]]) -> None:
        """把每个账号分别写入其 data/用户名/user/用户名.json。"""
        with self.qilei_lock:
            for qilei_username, qilei_account in qilei_accounts.items():
                if not str(qilei_username).isdigit() or not isinstance(qilei_account, dict):
                    continue
                self.qilei_create_user_folder(qilei_username)
                # qilei_value：包含用户名、密码摘要和公开属性的独立账号数据。
                qilei_value = {"username": qilei_username, **qilei_account}
                self.qilei_write_json(self.qilei_account_path(qilei_username), qilei_value)

    def qilei_result_filename(self, qilei_record: Dict[str, Any]) -> str:
        """生成按打开时间、棋类和记录编号组成的单局文件名。"""
        # qilei_opened：去掉日期分隔符后的稳定时间片段。
        qilei_opened = "".join(qilei_character for qilei_character in str(qilei_record.get("opened_at", "")) if qilei_character.isdigit())[:14]
        # qilei_game_id：只允许已验证棋类编号中的字母。
        qilei_game_id = "".join(qilei_character for qilei_character in str(qilei_record.get("game_id", "")) if qilei_character.isalnum()) or "game"
        # qilei_record_id：只允许十六进制记录编号。
        qilei_record_id = "".join(qilei_character for qilei_character in str(qilei_record.get("id", "")) if qilei_character.isalnum())
        return f"{qilei_opened or 'result'}_{qilei_game_id}_{qilei_record_id}.json"

    def qilei_result_public(self, qilei_value: Dict[str, Any]) -> Dict[str, Any]:
        """从单局文件中取出历史页面需要的字段，不返回棋盘状态。"""
        return {
            "id": str(qilei_value.get("id", "")),
            "game_id": str(qilei_value.get("game_id", "")),
            "game_name": str(qilei_value.get("game_name", "")),
            "opened_at": qilei_value.get("opened_at"),
            "finished_at": qilei_value.get("finished_at"),
            "result": str(qilei_value.get("result", "进行中")),
        }

    def qilei_result_files(self, qilei_username: str) -> List[Tuple[Path, Dict[str, Any]]]:
        """读取一名玩家 result 中的全部有效单局文件并按打开时间排序。"""
        self.qilei_create_user_folder(qilei_username)
        # qilei_items：单局文件路径与解析对象组合。
        qilei_items: List[Tuple[Path, Dict[str, Any]]] = []
        for qilei_path in self.qilei_result_dir(qilei_username).glob("*.json"):
            # qilei_value：一个单局 JSON 的完整内容。
            qilei_value = self.qilei_read_json(qilei_path, None)
            if isinstance(qilei_value, dict) and qilei_value.get("id"):
                qilei_items.append((qilei_path, qilei_value))
        qilei_items.sort(key=lambda qilei_item: str(qilei_item[1].get("opened_at", "")))
        return qilei_items

    def qilei_find_result(self, qilei_username: str, qilei_record_id: str) -> Optional[Tuple[Path, Dict[str, Any]]]:
        """按唯一记录编号查找一份单局文件。"""
        for qilei_path, qilei_value in self.qilei_result_files(qilei_username):
            if str(qilei_value.get("id", "")) == qilei_record_id:
                return qilei_path, qilei_value
        return None

    def qilei_load_history(self, qilei_username: str) -> List[Dict[str, Any]]:
        """从 result 中每局一份的文件生成用户历史记录。"""
        with self.qilei_lock:
            return [self.qilei_result_public(qilei_value) for _, qilei_value in self.qilei_result_files(qilei_username)]

    def qilei_start_game(self, qilei_username: str, qilei_game_id: str, qilei_game_name: str) -> Dict[str, Any]:
        """为开始新游戏创建一份独立的 result JSON 文件。"""
        with self.qilei_lock:
            # qilei_record：本次新局的完整数据文件。
            qilei_record = {
                "id": uuid.uuid4().hex,
                "game_id": qilei_game_id,
                "game_name": qilei_game_name,
                "opened_at": qilei_now_text(),
                "updated_at": qilei_now_text(),
                "finished_at": None,
                "result": "进行中",
                "state": None,
            }
            # qilei_path：本局独立结果文件路径。
            qilei_path = self.qilei_result_dir(qilei_username) / self.qilei_result_filename(qilei_record)
            self.qilei_write_json(qilei_path, qilei_record)
            return self.qilei_result_public(qilei_record)

    def qilei_finish_game(self, qilei_username: str, qilei_record_id: str, qilei_result: str) -> bool:
        """在对应单局文件中写入终局结果和完成时间。"""
        with self.qilei_lock:
            # qilei_found：目标单局文件及其完整数据。
            qilei_found = self.qilei_find_result(qilei_username, qilei_record_id)
            if not qilei_found:
                return False
            # qilei_path、qilei_value：待更新单局文件路径与内容。
            qilei_path, qilei_value = qilei_found
            qilei_value["result"] = qilei_result[:80]
            qilei_value["finished_at"] = qilei_now_text()
            qilei_value["updated_at"] = qilei_now_text()
            self.qilei_write_json(qilei_path, qilei_value)
            return True

    def qilei_delete_history_record(self, qilei_username: str, qilei_record_id: str) -> bool:
        """删除 result 中与历史行对应的整份单局文件。"""
        with self.qilei_lock:
            # qilei_found：目标单局文件及其数据。
            qilei_found = self.qilei_find_result(qilei_username, qilei_record_id)
            if not qilei_found:
                return False
            qilei_found[0].unlink()
            return True

    def qilei_clear_history(self, qilei_username: str) -> int:
        """删除 result 中全部单局文件并返回删除数量。"""
        with self.qilei_lock:
            # qilei_files：清空前的全部有效单局文件。
            qilei_files = self.qilei_result_files(qilei_username)
            for qilei_path, _ in qilei_files:
                qilei_path.unlink()
            return len(qilei_files)

    def qilei_load_state(self, qilei_username: str, qilei_game_id: str) -> Optional[Dict[str, Any]]:
        """读取指定棋类最近一份未结束单局文件中的存档。"""
        with self.qilei_lock:
            # qilei_candidates：该棋类仍可继续且含状态的单局文件。
            qilei_candidates = [
                qilei_value for _, qilei_value in self.qilei_result_files(qilei_username)
                if qilei_value.get("game_id") == qilei_game_id
                and not qilei_value.get("finished_at")
                and isinstance(qilei_value.get("state"), dict)
            ]
            if not qilei_candidates:
                return None
            # qilei_latest：按打开顺序最后一份可继续存档。
            qilei_latest = qilei_candidates[-1]
            return {
                "game_id": qilei_game_id,
                "record_id": qilei_latest["id"],
                "updated_at": qilei_latest.get("updated_at", qilei_latest.get("opened_at")),
                "state": qilei_latest["state"],
                "record": self.qilei_result_public(qilei_latest),
            }

    def qilei_save_state(self, qilei_username: str, qilei_game_id: str, qilei_record_id: str, qilei_state: Dict[str, Any]) -> bool:
        """把棋盘状态写回本局自己的 result 文件。"""
        with self.qilei_lock:
            # qilei_found：当前打开的单局文件及其数据。
            qilei_found = self.qilei_find_result(qilei_username, qilei_record_id)
            if not qilei_found:
                return False
            # qilei_path、qilei_value：待更新单局文件路径与内容。
            qilei_path, qilei_value = qilei_found
            if qilei_value.get("game_id") != qilei_game_id:
                return False
            qilei_value["state"] = qilei_state
            qilei_value["updated_at"] = qilei_now_text()
            self.qilei_write_json(qilei_path, qilei_value)
            return True

    def qilei_delete_state(self, qilei_username: str, qilei_game_id: str, qilei_record_id: str = "") -> bool:
        """只清空指定单局文件中的棋盘状态，不删除该局历史文件。"""
        with self.qilei_lock:
            # qilei_found：优先按记录编号查找，否则使用最近可继续存档。
            qilei_found = self.qilei_find_result(qilei_username, qilei_record_id) if qilei_record_id else None
            if not qilei_found:
                # qilei_saved：最近一份同类存档包装对象。
                qilei_saved = self.qilei_load_state(qilei_username, qilei_game_id)
                if not qilei_saved:
                    return False
                qilei_found = self.qilei_find_result(qilei_username, qilei_saved["record_id"])
            if not qilei_found or qilei_found[1].get("game_id") != qilei_game_id:
                return False
            # qilei_path、qilei_value：待清空状态的本局文件。
            qilei_path, qilei_value = qilei_found
            qilei_value["state"] = None
            qilei_value["updated_at"] = qilei_now_text()
            self.qilei_write_json(qilei_path, qilei_value)
            return True

    def qilei_admin_users(self) -> List[Dict[str, Any]]:
        """为管理员汇总每个玩家独立账号与单局文件数量。"""
        with self.qilei_lock:
            # qilei_accounts：从各 user 文件夹扫描到的全部账号摘要。
            qilei_accounts = self.qilei_load_accounts()
            # qilei_result：不含密码摘要的管理员账号概览。
            qilei_result = []
            for qilei_username, qilei_account in sorted(qilei_accounts.items()):
                # qilei_history：当前玩家 result 中的全部单局记录。
                qilei_history = self.qilei_load_history(qilei_username)
                # qilei_completed：当前玩家已经结束的单局数量。
                qilei_completed = sum(1 for qilei_item in qilei_history if qilei_item.get("finished_at"))
                qilei_result.append({
                    "username": qilei_username,
                    "is_admin": bool(qilei_account.get("is_admin")),
                    "created_at": qilei_account.get("created_at", ""),
                    "opened_games": len(qilei_history),
                    "completed_games": qilei_completed,
                })
            return qilei_result

    def qilei_migrate_legacy_layout(self) -> None:
        """把旧 accounts/users 数据迁移成玩家直属 user/result，并删除旧容器。"""
        with self.qilei_lock:
            if not self.qilei_legacy_accounts_path.exists() and not self.qilei_legacy_users_dir.exists():
                return
            # qilei_legacy_accounts：旧集中账号文件中的密码摘要。
            qilei_legacy_accounts = self.qilei_read_json(self.qilei_legacy_accounts_path, {})
            if not isinstance(qilei_legacy_accounts, dict):
                qilei_legacy_accounts = {}
            # qilei_usernames：账号文件和旧用户目录中出现的全部用户名。
            qilei_usernames = set(str(qilei_username) for qilei_username in qilei_legacy_accounts if str(qilei_username).isdigit())
            if self.qilei_legacy_users_dir.is_dir():
                qilei_usernames.update(qilei_path.name for qilei_path in self.qilei_legacy_users_dir.iterdir() if qilei_path.is_dir() and qilei_path.name.isdigit())
            for qilei_username in sorted(qilei_usernames):
                self.qilei_create_user_folder(qilei_username)
                # qilei_legacy_user：旧版当前玩家目录。
                qilei_legacy_user = self.qilei_legacy_users_dir / qilei_username
                # qilei_account：合并旧账号摘要与旧公开资料。
                qilei_account = qilei_legacy_accounts.get(qilei_username, {})
                if not isinstance(qilei_account, dict):
                    qilei_account = {}
                # qilei_profile：旧公开资料文件内容。
                qilei_profile = self.qilei_read_json(qilei_legacy_user / "profile.json", {})
                if isinstance(qilei_profile, dict):
                    qilei_account = {**qilei_profile, **qilei_account}
                qilei_account["username"] = qilei_username
                if qilei_account.get("password_hash") and not self.qilei_account_path(qilei_username).exists():
                    self.qilei_write_json(self.qilei_account_path(qilei_username), qilei_account)
                # qilei_history：旧版单一 history.json 中的历史数组。
                qilei_history = self.qilei_read_json(qilei_legacy_user / "history.json", [])
                if not isinstance(qilei_history, list):
                    qilei_history = []
                # qilei_latest_ids：每种棋最后一条历史记录编号，用于挂接旧状态。
                qilei_latest_ids: Dict[str, str] = {}
                for qilei_record in qilei_history:
                    if isinstance(qilei_record, dict) and qilei_record.get("id"):
                        qilei_latest_ids[str(qilei_record.get("game_id", ""))] = str(qilei_record["id"])
                # qilei_states：旧 states 中按棋类编号保存的状态包装对象。
                qilei_states: Dict[str, Dict[str, Any]] = {}
                qilei_states_dir = qilei_legacy_user / "states"
                if qilei_states_dir.is_dir():
                    for qilei_state_path in qilei_states_dir.glob("*.json"):
                        qilei_state_value = self.qilei_read_json(qilei_state_path, None)
                        if isinstance(qilei_state_value, dict):
                            qilei_states[qilei_state_path.stem] = qilei_state_value
                for qilei_record in qilei_history:
                    if not isinstance(qilei_record, dict) or not qilei_record.get("id"):
                        continue
                    # qilei_game_id：当前旧历史记录的棋类编号。
                    qilei_game_id = str(qilei_record.get("game_id", ""))
                    # qilei_state_wrapper：该棋类旧状态包装数据。
                    qilei_state_wrapper = qilei_states.get(qilei_game_id)
                    # qilei_document：迁移后的完整单局文件。
                    qilei_document = {
                        **qilei_record,
                        "updated_at": (qilei_state_wrapper or {}).get("updated_at", qilei_record.get("opened_at")),
                        "state": (qilei_state_wrapper or {}).get("state") if qilei_latest_ids.get(qilei_game_id) == str(qilei_record["id"]) else None,
                    }
                    # qilei_target：迁移后的独立单局文件路径。
                    qilei_target = self.qilei_result_dir(qilei_username) / self.qilei_result_filename(qilei_document)
                    if not qilei_target.exists():
                        self.qilei_write_json(qilei_target, qilei_document)
                # qilei_known_games：已有历史文件覆盖的棋类编号。
                qilei_known_games = {str(qilei_record.get("game_id", "")) for qilei_record in qilei_history if isinstance(qilei_record, dict)}
                for qilei_game_id, qilei_state_wrapper in qilei_states.items():
                    if qilei_game_id in qilei_known_games:
                        continue
                    # qilei_record：没有旧历史但存在状态时补建的单局文件。
                    qilei_record = {
                        "id": uuid.uuid4().hex,
                        "game_id": qilei_game_id,
                        "game_name": qilei_game_id,
                        "opened_at": qilei_state_wrapper.get("updated_at", qilei_now_text()),
                        "updated_at": qilei_state_wrapper.get("updated_at", qilei_now_text()),
                        "finished_at": None,
                        "result": "进行中",
                        "state": qilei_state_wrapper.get("state"),
                    }
                    self.qilei_write_json(self.qilei_result_dir(qilei_username) / self.qilei_result_filename(qilei_record), qilei_record)
            if self.qilei_legacy_accounts_path.exists():
                self.qilei_legacy_accounts_path.unlink()
            if self.qilei_legacy_users_dir.exists():
                shutil.rmtree(self.qilei_legacy_users_dir)
