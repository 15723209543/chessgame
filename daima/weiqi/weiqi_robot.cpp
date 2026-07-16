#include "weiqi_robot.h"

#include <algorithm>
#include <cctype>
#include <limits>
#include <sstream>

bool weiqi_robot::weiqi_gtp(const std::string& weiqi_command, std::string& weiqi_response, unsigned long long weiqi_timeout_ms)
{
    if (!weiqi_engine.qilei_send(weiqi_command)) return false;
    const unsigned long long weiqi_deadline = GetTickCount64() + weiqi_timeout_ms; // weiqi_deadline 是等待本条 GTP 应答的截止时刻。
    while (true)
    {
        const unsigned long long weiqi_now = GetTickCount64(); // weiqi_now 是本轮读取 GTP 输出的当前时刻。
        if (weiqi_now > weiqi_deadline) break;
        std::string weiqi_line; // weiqi_line 接收 KataGo 的一行日志或协议应答。
        const unsigned long long weiqi_remaining = weiqi_deadline - weiqi_now; // weiqi_remaining 是本条命令剩余等待毫秒数。
        if (!weiqi_engine.qilei_wait_for("\n", std::min<unsigned long long>(1000, weiqi_remaining), weiqi_line)) continue;
        while (!weiqi_line.empty() && std::isspace(static_cast<unsigned char>(weiqi_line.front()))) weiqi_line.erase(weiqi_line.begin());
        if (weiqi_line.empty()) continue;
        if (weiqi_line.front() == '?') return false;
        if (weiqi_line.front() != '=') continue;
        weiqi_response = weiqi_line.substr(1);
        while (!weiqi_response.empty() && std::isspace(static_cast<unsigned char>(weiqi_response.front()))) weiqi_response.erase(weiqi_response.begin());
        while (!weiqi_response.empty() && std::isspace(static_cast<unsigned char>(weiqi_response.back()))) weiqi_response.pop_back();
        return true;
    }
    return false;
}

bool weiqi_robot::weiqi_start()
{
    if (weiqi_katago_ready) return true;
    const std::filesystem::path weiqi_executable = qilei_engine_path(L"weiqi", L"katago.exe"); // weiqi_executable 是 KataGo 1.16.5 可执行文件。
    const std::filesystem::path weiqi_model = qilei_engine_path(L"weiqi", L"model.bin.gz"); // weiqi_model 是 KataGo 高强度神经网络权重。
    const std::filesystem::path weiqi_config = qilei_engine_path(L"weiqi", L"gtp.cfg"); // weiqi_config 是 KataGo GTP 搜索参数文件。
    if (!std::filesystem::exists(weiqi_model) || !std::filesystem::exists(weiqi_config) ||
        !weiqi_engine.qilei_start(weiqi_executable, L"gtp -model \"" + weiqi_model.wstring() + L"\" -config \"" + weiqi_config.wstring() + L"\""))
    {
        weiqi_katago_ready = false;
        return false;
    }
    std::string weiqi_response; // weiqi_response 接收 KataGo 棋盘初始化应答。
    weiqi_katago_ready = weiqi_gtp("boardsize 19", weiqi_response, 120000) && weiqi_gtp("komi 7.5", weiqi_response, 5000);
    return weiqi_katago_ready;
}

std::string weiqi_robot::weiqi_to_gtp(const weiqi_move& weiqi_move_value)
{
    if (weiqi_move_value.weiqi_pass) return "pass";
    char weiqi_column = static_cast<char>('A' + weiqi_move_value.weiqi_col); // weiqi_column 是 GTP 列字母。
    if (weiqi_column >= 'I') ++weiqi_column;
    return std::string(1, weiqi_column) + std::to_string(19 - weiqi_move_value.weiqi_row);
}

weiqi_move weiqi_robot::weiqi_from_gtp(std::string weiqi_text)
{
    std::transform(weiqi_text.begin(), weiqi_text.end(), weiqi_text.begin(), [](unsigned char weiqi_character) { return static_cast<char>(std::tolower(weiqi_character)); });
    if (weiqi_text.find("pass") != std::string::npos || weiqi_text.find("resign") != std::string::npos) return { -1, -1, true };
    const std::size_t weiqi_start = weiqi_text.find_first_of("abcdefghjklmnopqrst"); // weiqi_start 是 GTP 坐标列字母位置。
    if (weiqi_start == std::string::npos) return { -1, -1, true };
    int weiqi_col = weiqi_text[weiqi_start] - 'a'; // weiqi_col 是跳过 I 列前的列下标。
    if (weiqi_text[weiqi_start] > 'i') --weiqi_col;
    int weiqi_rank = 0; // weiqi_rank 是 GTP 从底部起算的行号。
    try { weiqi_rank = std::stoi(weiqi_text.substr(weiqi_start + 1)); } catch (...) { return { -1, -1, true }; }
    return { 19 - weiqi_rank, weiqi_col, false };
}

weiqi_move weiqi_robot::weiqi_choose_move(const weiqi_board& weiqi_board_value, int weiqi_think_ms)
{
    if (weiqi_katago_ready && weiqi_engine.qilei_running())
    {
        std::string weiqi_response; // weiqi_response 接收局面重放与 genmove 应答。
        if (!weiqi_gtp("clear_board", weiqi_response, 5000)) weiqi_katago_ready = false;
        int weiqi_side_value = 0; // weiqi_side_value 是重放历史时当前步所属方。
        for (const weiqi_move& weiqi_move_value : weiqi_board_value.weiqi_move_history()) // weiqi_move_value 是向 KataGo 重放的历史步骤。
        {
            if (!weiqi_gtp(std::string("play ") + (weiqi_side_value == 0 ? "B " : "W ") + weiqi_to_gtp(weiqi_move_value), weiqi_response, 5000)) { weiqi_katago_ready = false; break; }
            weiqi_side_value = 1 - weiqi_side_value;
        }
        if (weiqi_katago_ready)
        {
            weiqi_gtp("kata-set-param maxTime " + std::to_string(std::max(0.2, weiqi_think_ms / 1000.0)), weiqi_response, 5000);
            if (weiqi_gtp(std::string("genmove ") + (weiqi_board_value.weiqi_side() == 0 ? "B" : "W"), weiqi_response, static_cast<unsigned long long>(weiqi_think_ms + 120000)))
            {
                const weiqi_move weiqi_result = weiqi_from_gtp(weiqi_response); // weiqi_result 是 KataGo GTP 应答转换后的落子。
                if (weiqi_result.weiqi_pass || weiqi_board_value.weiqi_legal(weiqi_result.weiqi_row, weiqi_result.weiqi_col)) return weiqi_result;
            }
            weiqi_katago_ready = false;
        }
    }
    return weiqi_choose_local(weiqi_board_value);
}

std::wstring weiqi_robot::weiqi_engine_name() const
{
    return L"机器人";
}

weiqi_move weiqi_robot::weiqi_choose_local(const weiqi_board& weiqi_board_value) const
{
    const std::vector<weiqi_move> weiqi_moves = weiqi_board_value.weiqi_legal_moves(); // weiqi_moves 是后备机器人的全部合法落点。
    if (weiqi_moves.empty()) return { -1, -1, true };
    int weiqi_before_opponent = 0; // weiqi_before_opponent 是落子前棋盘上对方棋子数。
    const int weiqi_opponent_stone = weiqi_board_value.weiqi_side() == 0 ? 2 : 1; // weiqi_opponent_stone 是对方棋子编码。
    for (int weiqi_row = 0; weiqi_row < 19; ++weiqi_row) for (int weiqi_col = 0; weiqi_col < 19; ++weiqi_col) if (weiqi_board_value.weiqi_stone(weiqi_row, weiqi_col) == weiqi_opponent_stone) ++weiqi_before_opponent; // weiqi_row/weiqi_col 是落子前数子行列。
    int weiqi_best_score = std::numeric_limits<int>::min(); // weiqi_best_score 是当前最佳启发式分数。
    weiqi_move weiqi_best = weiqi_moves.front(); // weiqi_best 是当前最佳落点。
    for (const weiqi_move& weiqi_move_value : weiqi_moves) // weiqi_move_value 是当前评估的合法落点。
    {
        weiqi_board weiqi_copy = weiqi_board_value; // weiqi_copy 是用于评估提子数的棋盘副本。
        weiqi_copy.weiqi_play(weiqi_move_value);
        int weiqi_after_opponent = 0; // weiqi_after_opponent 是落子后对方棋子数。
        for (int weiqi_row = 0; weiqi_row < 19; ++weiqi_row) for (int weiqi_col = 0; weiqi_col < 19; ++weiqi_col) if (weiqi_copy.weiqi_stone(weiqi_row, weiqi_col) == weiqi_opponent_stone) ++weiqi_after_opponent; // weiqi_row/weiqi_col 是落子后数子行列。
        int weiqi_neighbors_score = 0; // weiqi_neighbors_score 是落点周围棋子密度奖励。
        const int weiqi_offsets[4][2] = { {-1,0},{1,0},{0,-1},{0,1} }; // weiqi_offsets 是评估落点四个直交邻点。
        for (const auto& weiqi_offset : weiqi_offsets) if (weiqi_board_value.weiqi_stone(weiqi_move_value.weiqi_row + weiqi_offset[0], weiqi_move_value.weiqi_col + weiqi_offset[1]) != 0) ++weiqi_neighbors_score; // weiqi_offset 是当前邻点偏移。
        const int weiqi_center_score = 18 - (std::abs(weiqi_move_value.weiqi_row - 9) + std::abs(weiqi_move_value.weiqi_col - 9)); // weiqi_center_score 是靠近中心的轻微奖励。
        const int weiqi_score = (weiqi_before_opponent - weiqi_after_opponent) * 1000 + weiqi_neighbors_score * 16 + weiqi_center_score; // weiqi_score 是当前落点启发式总分。
        if (weiqi_score > weiqi_best_score) { weiqi_best_score = weiqi_score; weiqi_best = weiqi_move_value; }
    }
    return weiqi_best;
}
