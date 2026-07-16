#include "guojixiangqi_robot.h"

#include <algorithm>
#include <cctype>
#include <limits>
#include <sstream>

bool guojixiangqi_robot::guojixiangqi_start()
{
    if (guojixiangqi_stockfish_ready) return true;
    const std::filesystem::path guojixiangqi_path = qilei_engine_path(L"guojixiangqi", L"stockfish.exe"); // guojixiangqi_path 是 Stockfish 18 可执行文件路径。
    if (!guojixiangqi_engine.qilei_start(guojixiangqi_path))
    {
        guojixiangqi_stockfish_ready = false;
        return false;
    }
    std::string guojixiangqi_output; // guojixiangqi_output 接收 Stockfish 初始化输出。
    guojixiangqi_engine.qilei_send("uci");
    if (!guojixiangqi_engine.qilei_wait_for("uciok", 5000, guojixiangqi_output))
    {
        guojixiangqi_stockfish_ready = false;
        return false;
    }
    guojixiangqi_engine.qilei_send("setoption name Threads value 4");
    guojixiangqi_engine.qilei_send("setoption name Hash value 256");
    guojixiangqi_engine.qilei_send("isready");
    guojixiangqi_stockfish_ready = guojixiangqi_engine.qilei_wait_for("readyok", 5000, guojixiangqi_output);
    return guojixiangqi_stockfish_ready;
}

guojixiangqi_move guojixiangqi_robot::guojixiangqi_choose_move(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_think_ms)
{
    if (guojixiangqi_stockfish_ready && guojixiangqi_engine.qilei_running())
    {
        std::ostringstream guojixiangqi_position; // guojixiangqi_position 组合 UCI position startpos moves 命令。
        guojixiangqi_position << "position startpos";
        if (!guojixiangqi_board_value.guojixiangqi_uci_history().empty())
        {
            guojixiangqi_position << " moves";
            for (const std::string& guojixiangqi_move_text : guojixiangqi_board_value.guojixiangqi_uci_history()) guojixiangqi_position << ' ' << guojixiangqi_move_text; // guojixiangqi_move_text 是已走的一步 UCI 坐标。
        }
        guojixiangqi_engine.qilei_send(guojixiangqi_position.str());
        guojixiangqi_engine.qilei_send("go movetime " + std::to_string(std::max(200, guojixiangqi_think_ms)));
        const unsigned long long guojixiangqi_deadline = GetTickCount64() + static_cast<unsigned long long>(guojixiangqi_think_ms + 5000); // guojixiangqi_deadline 是等待 bestmove 的超时时刻。
        while (GetTickCount64() < guojixiangqi_deadline)
        {
            std::string guojixiangqi_line; // guojixiangqi_line 是 Stockfish 返回的一行输出。
            if (!guojixiangqi_engine.qilei_wait_for("\n", 500, guojixiangqi_line)) continue;
            const std::size_t guojixiangqi_position_index = guojixiangqi_line.find("bestmove "); // guojixiangqi_position_index 是 bestmove 标记在行中的位置。
            if (guojixiangqi_position_index != std::string::npos)
            {
                std::istringstream guojixiangqi_bestmove_stream(guojixiangqi_line.substr(guojixiangqi_position_index)); // guojixiangqi_bestmove_stream 只解析 bestmove 后的完整 token。
                std::string guojixiangqi_keyword; // guojixiangqi_keyword 接收并校验 bestmove 关键字。
                std::string guojixiangqi_uci; // guojixiangqi_uci 是引擎返回的完整 UCI 走法。
                guojixiangqi_bestmove_stream >> guojixiangqi_keyword >> guojixiangqi_uci;
                const bool guojixiangqi_valid_length = guojixiangqi_uci.size() == 4 || guojixiangqi_uci.size() == 5; // guojixiangqi_valid_length 表示 UCI 长度是否为普通走法或升变走法长度。
                const bool guojixiangqi_valid_square = guojixiangqi_valid_length &&
                    guojixiangqi_uci[0] >= 'a' && guojixiangqi_uci[0] <= 'h' && guojixiangqi_uci[1] >= '1' && guojixiangqi_uci[1] <= '8' &&
                    guojixiangqi_uci[2] >= 'a' && guojixiangqi_uci[2] <= 'h' && guojixiangqi_uci[3] >= '1' && guojixiangqi_uci[3] <= '8'; // guojixiangqi_valid_square 表示起点终点字符均在棋盘范围。
                const bool guojixiangqi_valid_promotion = guojixiangqi_uci.size() != 5 || guojixiangqi_uci[4] == 'q' || guojixiangqi_uci[4] == 'r' || guojixiangqi_uci[4] == 'b' || guojixiangqi_uci[4] == 'n'; // guojixiangqi_valid_promotion 表示第五字符是有效升变类型。
                if (guojixiangqi_keyword != "bestmove" || !guojixiangqi_valid_square || !guojixiangqi_valid_promotion) break;
                for (const guojixiangqi_move& guojixiangqi_candidate : guojixiangqi_board_value.guojixiangqi_legal_moves()) // guojixiangqi_candidate 是用本地规则层二次校验的走法。
                {
                    if (guojixiangqi_board::guojixiangqi_to_uci(guojixiangqi_candidate) == guojixiangqi_uci) return guojixiangqi_candidate;
                }
                break;
            }
        }
        guojixiangqi_stockfish_ready = false;
    }
    return guojixiangqi_choose_local(guojixiangqi_board_value);
}

std::wstring guojixiangqi_robot::guojixiangqi_engine_name() const
{
    return guojixiangqi_stockfish_ready ? L"Stockfish 18" : L"内置 alpha-beta 后备机器人";
}

guojixiangqi_move guojixiangqi_robot::guojixiangqi_choose_local(const guojixiangqi_board& guojixiangqi_board_value) const
{
    const std::vector<guojixiangqi_move> guojixiangqi_moves = guojixiangqi_board_value.guojixiangqi_legal_moves(); // guojixiangqi_moves 是内置搜索的根节点走法。
    if (guojixiangqi_moves.empty()) return {};
    const int guojixiangqi_root_side = guojixiangqi_board_value.guojixiangqi_side(); // guojixiangqi_root_side 是机器人所属方。
    int guojixiangqi_best_score = std::numeric_limits<int>::min(); // guojixiangqi_best_score 是当前最佳走法评分。
    guojixiangqi_move guojixiangqi_best = guojixiangqi_moves.front(); // guojixiangqi_best 是当前最佳走法。
    for (const guojixiangqi_move& guojixiangqi_move_value : guojixiangqi_moves) // guojixiangqi_move_value 是当前评估的根走法。
    {
        guojixiangqi_board guojixiangqi_copy = guojixiangqi_board_value; // guojixiangqi_copy 是执行候选走法的棋盘副本。
        guojixiangqi_copy.guojixiangqi_make_move(guojixiangqi_move_value);
        const int guojixiangqi_score = guojixiangqi_search(guojixiangqi_copy, 2, -1000000, 1000000, guojixiangqi_root_side); // guojixiangqi_score 是候选走法的 alpha-beta 分数。
        if (guojixiangqi_score > guojixiangqi_best_score)
        {
            guojixiangqi_best_score = guojixiangqi_score;
            guojixiangqi_best = guojixiangqi_move_value;
        }
    }
    return guojixiangqi_best;
}

int guojixiangqi_robot::guojixiangqi_search(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_depth, int guojixiangqi_alpha, int guojixiangqi_beta, int guojixiangqi_root_side) const
{
    if (guojixiangqi_depth == 0 || guojixiangqi_board_value.guojixiangqi_game_over()) return guojixiangqi_evaluate(guojixiangqi_board_value, guojixiangqi_root_side);
    const std::vector<guojixiangqi_move> guojixiangqi_moves = guojixiangqi_board_value.guojixiangqi_legal_moves(); // guojixiangqi_moves 是当前搜索节点的合法走法。
    const bool guojixiangqi_maximizing = guojixiangqi_board_value.guojixiangqi_side() == guojixiangqi_root_side; // guojixiangqi_maximizing 表示当前节点是极大层。
    int guojixiangqi_best = guojixiangqi_maximizing ? -1000000 : 1000000; // guojixiangqi_best 是当前节点已搜索子节点中的最佳分数。
    for (const guojixiangqi_move& guojixiangqi_move_value : guojixiangqi_moves) // guojixiangqi_move_value 是当前展开的子走法。
    {
        guojixiangqi_board guojixiangqi_copy = guojixiangqi_board_value; // guojixiangqi_copy 是当前子节点棋盘。
        guojixiangqi_copy.guojixiangqi_make_move(guojixiangqi_move_value);
        const int guojixiangqi_score = guojixiangqi_search(guojixiangqi_copy, guojixiangqi_depth - 1, guojixiangqi_alpha, guojixiangqi_beta, guojixiangqi_root_side); // guojixiangqi_score 是子节点搜索分数。
        if (guojixiangqi_maximizing) { guojixiangqi_best = std::max(guojixiangqi_best, guojixiangqi_score); guojixiangqi_alpha = std::max(guojixiangqi_alpha, guojixiangqi_best); }
        else { guojixiangqi_best = std::min(guojixiangqi_best, guojixiangqi_score); guojixiangqi_beta = std::min(guojixiangqi_beta, guojixiangqi_best); }
        if (guojixiangqi_beta <= guojixiangqi_alpha) break;
    }
    return guojixiangqi_best;
}

int guojixiangqi_robot::guojixiangqi_evaluate(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_root_side) const
{
    const int guojixiangqi_values[7] = { 0, 100, 320, 330, 500, 900, 20000 }; // guojixiangqi_values 是各类棋子的基础材力值。
    int guojixiangqi_score = 0; // guojixiangqi_score 是从白方视角累计的局面分。
    for (int guojixiangqi_square = 0; guojixiangqi_square < 64; ++guojixiangqi_square) // guojixiangqi_square 是当前评估格子。
    {
        const int guojixiangqi_piece_value = guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_square); // guojixiangqi_piece_value 是当前格棋子。
        if (!guojixiangqi_piece_value) continue;
        const int guojixiangqi_row = guojixiangqi_square / 8; // guojixiangqi_row 是评估格所在行。
        const int guojixiangqi_col = guojixiangqi_square % 8; // guojixiangqi_col 是评估格所在列。
        const int guojixiangqi_center = 6 - (std::abs(guojixiangqi_row - 3) + std::abs(guojixiangqi_col - 3)); // guojixiangqi_center 是简单中心控制奖励。
        const int guojixiangqi_type = std::abs(guojixiangqi_piece_value); // guojixiangqi_type 是经过范围校验的棋子绝对值编码。
        if (guojixiangqi_type < 1 || guojixiangqi_type > 6) continue;
        const int guojixiangqi_value = guojixiangqi_values[guojixiangqi_type] + guojixiangqi_center; // guojixiangqi_value 是本棋子的材力与位置总值。
        guojixiangqi_score += guojixiangqi_piece_value > 0 ? guojixiangqi_value : -guojixiangqi_value;
    }
    if (guojixiangqi_board_value.guojixiangqi_game_over() && guojixiangqi_board_value.guojixiangqi_in_check(guojixiangqi_board_value.guojixiangqi_side()))
        guojixiangqi_score += guojixiangqi_board_value.guojixiangqi_side() == 0 ? -500000 : 500000;
    return guojixiangqi_root_side == 0 ? guojixiangqi_score : -guojixiangqi_score;
}
