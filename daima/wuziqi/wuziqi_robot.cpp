#include "wuziqi_robot.h"

#include <algorithm>
#include <cctype>
#include <limits>
#include <sstream>

bool wuziqi_robot::wuziqi_start()
{
    if (wuziqi_rapfi_ready) return true;
    const std::filesystem::path wuziqi_path = qilei_engine_path(L"wuziqi", L"rapfi.exe"); // wuziqi_path 是 Rapfi 可执行文件路径。
    if (!wuziqi_engine.qilei_start(wuziqi_path)) { wuziqi_rapfi_ready = false; return false; }
    wuziqi_engine.qilei_send("START 15");
    std::string wuziqi_output; // wuziqi_output 接收 Rapfi START 应答。
    wuziqi_rapfi_ready = wuziqi_engine.qilei_wait_for("OK", 10000, wuziqi_output);
    return wuziqi_rapfi_ready;
}

wuziqi_move wuziqi_robot::wuziqi_choose_move(const wuziqi_board& wuziqi_board_value, int wuziqi_think_ms)
{
    const unsigned long long wuziqi_decision_deadline = GetTickCount64() + 2600ULL; // wuziqi_decision_deadline 为本地快速回退预留时间，保证整次决策不超过三秒。
    if (wuziqi_rapfi_ready && wuziqi_engine.qilei_running())
    {
        wuziqi_engine.qilei_send("RESTART");
        std::string wuziqi_output; // wuziqi_output 接收 Rapfi 重置和落子输出。
        const unsigned long long wuziqi_restart_now = GetTickCount64(); // wuziqi_restart_now 是开始等待 Rapfi 重置应答的毫秒时刻。
        const int wuziqi_restart_wait_ms = static_cast<int>(wuziqi_restart_now < wuziqi_decision_deadline ?
            std::min<unsigned long long>(300ULL, wuziqi_decision_deadline - wuziqi_restart_now) : 0ULL); // wuziqi_restart_wait_ms 限制重置协议等待时间。
        if (wuziqi_restart_wait_ms <= 0 || !wuziqi_engine.qilei_wait_for("OK", wuziqi_restart_wait_ms, wuziqi_output)) wuziqi_rapfi_ready = false;
        if (wuziqi_rapfi_ready)
        {
            const unsigned long long wuziqi_search_now = GetTickCount64(); // wuziqi_search_now 是配置 Rapfi 搜索时间前的毫秒时刻。
            const int wuziqi_search_remaining = wuziqi_search_now < wuziqi_decision_deadline ?
                static_cast<int>(wuziqi_decision_deadline - wuziqi_search_now) : 0; // wuziqi_search_remaining 是当前仍可使用的决策毫秒数。
            const int wuziqi_bounded_think_ms = std::max(200, std::min(wuziqi_think_ms, std::max(200, wuziqi_search_remaining - 150))); // wuziqi_bounded_think_ms 为读取最终坐标预留协议余量。
            wuziqi_engine.qilei_send("INFO timeout_turn " + std::to_string(wuziqi_bounded_think_ms));
            wuziqi_engine.qilei_send("INFO game_type 1");
            wuziqi_engine.qilei_send("BOARD");
            int wuziqi_move_side = 0; // wuziqi_move_side 是重放历史时当前落子所属方。
            for (const wuziqi_move& wuziqi_move_value : wuziqi_board_value.wuziqi_move_history()) // wuziqi_move_value 是向 Rapfi 重放的历史落子。
            {
                const int wuziqi_owner = wuziqi_move_side == wuziqi_board_value.wuziqi_side() ? 1 : 2; // wuziqi_owner 是 Piskvork BOARD 命令中的引擎/对手编码。
                wuziqi_engine.qilei_send(std::to_string(wuziqi_move_value.wuziqi_col) + "," + std::to_string(wuziqi_move_value.wuziqi_row) + "," + std::to_string(wuziqi_owner));
                wuziqi_move_side = 1 - wuziqi_move_side;
            }
            wuziqi_engine.qilei_send("DONE");
            while (GetTickCount64() < wuziqi_decision_deadline)
            {
                std::string wuziqi_line; // wuziqi_line 是 Rapfi 当前返回的一行。
                const unsigned long long wuziqi_wait_now = GetTickCount64(); // wuziqi_wait_now 是本轮读取 Rapfi 输出前的毫秒时刻。
                const int wuziqi_wait_ms = static_cast<int>(wuziqi_wait_now < wuziqi_decision_deadline ?
                    std::min<unsigned long long>(100ULL, wuziqi_decision_deadline - wuziqi_wait_now) : 0ULL); // wuziqi_wait_ms 限制单次读取，避免超过三秒截止时刻。
                if (wuziqi_wait_ms <= 0 || !wuziqi_engine.qilei_wait_for("\n", wuziqi_wait_ms, wuziqi_line)) continue;
                int wuziqi_col = -1; // wuziqi_col 是解析出的 Rapfi 落子列。
                int wuziqi_row = -1; // wuziqi_row 是解析出的 Rapfi 落子行。
                char wuziqi_comma = 0; // wuziqi_comma 接收 Rapfi 坐标中的逗号分隔符。
                std::stringstream wuziqi_stream(wuziqi_line); // wuziqi_stream 用于解析 x,y 坐标。
                if (wuziqi_stream >> wuziqi_col >> wuziqi_comma >> wuziqi_row)
                {
                    const bool wuziqi_coordinate_valid = wuziqi_row >= 0 && wuziqi_row < 15 && wuziqi_col >= 0 && wuziqi_col < 15; // wuziqi_coordinate_valid 表示 Rapfi 返回坐标位于十五路棋盘内。
                    if (wuziqi_comma == ',' && wuziqi_coordinate_valid && wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) == 0) return { wuziqi_row, wuziqi_col };
                }
            }
            wuziqi_engine.qilei_send("STOP");
            wuziqi_rapfi_ready = false;
        }
    }
    return wuziqi_choose_local(wuziqi_board_value);
}

std::wstring wuziqi_robot::wuziqi_engine_name() const
{
    return L"机器人";
}

void wuziqi_robot::wuziqi_stop()
{
    wuziqi_engine.qilei_stop("END");
    wuziqi_rapfi_ready = false;
}

int wuziqi_robot::wuziqi_pattern_score(const wuziqi_board& wuziqi_board_value, int wuziqi_row, int wuziqi_col, int wuziqi_stone_value) const
{
    const int wuziqi_directions[4][2] = { {1,0},{0,1},{1,1},{1,-1} }; // wuziqi_directions 是连型评估的四个方向。
    int wuziqi_total = 0; // wuziqi_total 是四向连型累计分。
    for (const auto& wuziqi_direction : wuziqi_directions) // wuziqi_direction 是当前评估方向。
    {
        int wuziqi_count = 1; // wuziqi_count 是假设落子后的连续同色子数。
        int wuziqi_open = 0; // wuziqi_open 是连型两端的空点数。
        for (int wuziqi_sign : { -1, 1 }) // wuziqi_sign 是沿方向正向或反向检查的符号。
        {
            int wuziqi_step = 1; // wuziqi_step 是从候选点向外的格数。
            while (wuziqi_board_value.wuziqi_stone(wuziqi_row + wuziqi_sign * wuziqi_step * wuziqi_direction[0], wuziqi_col + wuziqi_sign * wuziqi_step * wuziqi_direction[1]) == wuziqi_stone_value) { ++wuziqi_count; ++wuziqi_step; }
            const int wuziqi_end_row = wuziqi_row + wuziqi_sign * wuziqi_step * wuziqi_direction[0]; // wuziqi_end_row 是连型末端行。
            const int wuziqi_end_col = wuziqi_col + wuziqi_sign * wuziqi_step * wuziqi_direction[1]; // wuziqi_end_col 是连型末端列。
            if (wuziqi_end_row >= 0 && wuziqi_end_row < 15 && wuziqi_end_col >= 0 && wuziqi_end_col < 15 && wuziqi_board_value.wuziqi_stone(wuziqi_end_row, wuziqi_end_col) == 0) ++wuziqi_open;
        }
        if (wuziqi_count >= 5) wuziqi_total += 1000000;
        else if (wuziqi_count == 4 && wuziqi_open == 2) wuziqi_total += 120000;
        else if (wuziqi_count == 4 && wuziqi_open == 1) wuziqi_total += 18000;
        else if (wuziqi_count == 3 && wuziqi_open == 2) wuziqi_total += 9000;
        else if (wuziqi_count == 3 && wuziqi_open == 1) wuziqi_total += 1200;
        else if (wuziqi_count == 2 && wuziqi_open == 2) wuziqi_total += 450;
        else wuziqi_total += wuziqi_count * wuziqi_count * 8 + wuziqi_open;
    }
    return wuziqi_total;
}

wuziqi_move wuziqi_robot::wuziqi_choose_local(const wuziqi_board& wuziqi_board_value) const
{
    if (wuziqi_board_value.wuziqi_move_history().empty()) return { 7, 7 };
    const int wuziqi_own = wuziqi_board_value.wuziqi_side() + 1; // wuziqi_own 是机器人棋子编码。
    const int wuziqi_opponent = 3 - wuziqi_own; // wuziqi_opponent 是对方棋子编码。
    int wuziqi_best_score = std::numeric_limits<int>::min(); // wuziqi_best_score 是当前最佳候选点评分。
    wuziqi_move wuziqi_best = { 7, 7 }; // wuziqi_best 是当前最佳落子。
    for (int wuziqi_row = 0; wuziqi_row < 15; ++wuziqi_row) // wuziqi_row 是当前候选落子行。
    {
        for (int wuziqi_col = 0; wuziqi_col < 15; ++wuziqi_col) // wuziqi_col 是当前候选落子列。
        {
            if (wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) != 0) continue;
            bool wuziqi_near = false; // wuziqi_near 表示候选点两格范围内是否已有棋子。
            for (int wuziqi_delta_row = -2; wuziqi_delta_row <= 2; ++wuziqi_delta_row) for (int wuziqi_delta_col = -2; wuziqi_delta_col <= 2; ++wuziqi_delta_col) if (wuziqi_board_value.wuziqi_stone(wuziqi_row + wuziqi_delta_row, wuziqi_col + wuziqi_delta_col) != 0) wuziqi_near = true; // wuziqi_delta_row/col 是邻域检查偏移。
            if (!wuziqi_near) continue;
            const int wuziqi_attack = wuziqi_pattern_score(wuziqi_board_value, wuziqi_row, wuziqi_col, wuziqi_own); // wuziqi_attack 是本方在候选点的进攻分。
            const int wuziqi_defense = wuziqi_pattern_score(wuziqi_board_value, wuziqi_row, wuziqi_col, wuziqi_opponent); // wuziqi_defense 是对方在候选点的威胁分。
            const int wuziqi_center = 14 - (std::abs(wuziqi_row - 7) + std::abs(wuziqi_col - 7)); // wuziqi_center 是靠近中心的轻微奖励。
            const int wuziqi_score = wuziqi_attack + wuziqi_defense * 9 / 10 + wuziqi_center; // wuziqi_score 是候选点进攻、防守与中心综合分。
            if (wuziqi_score > wuziqi_best_score) { wuziqi_best_score = wuziqi_score; wuziqi_best = { wuziqi_row, wuziqi_col }; }
        }
    }
    return wuziqi_best;
}
