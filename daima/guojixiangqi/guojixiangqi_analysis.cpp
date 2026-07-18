#include "guojixiangqi_analysis.h"

#include <algorithm>
#include <cmath>

guojixiangqi_analysis_result guojixiangqi_analyze(const guojixiangqi_board& guojixiangqi_board_value)
{
    guojixiangqi_analysis_result guojixiangqi_result; // guojixiangqi_result 保存本次局势分析结果。
    const int guojixiangqi_move_count = static_cast<int>(guojixiangqi_board_value.guojixiangqi_uci_history().size()); // guojixiangqi_move_count 是从标准开局开始已经执行的半回合数。
    if (guojixiangqi_move_count == 0)
    {
        guojixiangqi_result.guojixiangqi_score = 0;
        guojixiangqi_result.guojixiangqi_summary = L"标准开局，双方机会均等";
        return guojixiangqi_result;
    }
    const int guojixiangqi_values[] = { 0, 100, 320, 330, 500, 900, 0 }; // guojixiangqi_values 是各棋子的标准厘兵价值。
    int guojixiangqi_score = 0; // guojixiangqi_score 累积白方相对黑方的局面优势。
    int guojixiangqi_white_bishops = 0; // guojixiangqi_white_bishops 是白方当前仍在场的象数量。
    int guojixiangqi_black_bishops = 0; // guojixiangqi_black_bishops 是黑方当前仍在场的象数量。
    for (int guojixiangqi_square = 0; guojixiangqi_square < 64; ++guojixiangqi_square) // guojixiangqi_square 是当前评估棋格编号。
    {
        const int guojixiangqi_piece_value = guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_square); // guojixiangqi_piece_value 是当前棋格的棋子编码。
        if (guojixiangqi_piece_value == 0) continue;
        const int guojixiangqi_sign = guojixiangqi_piece_value > 0 ? 1 : -1; // guojixiangqi_sign 是棋子对白方评分的正负号。
        const int guojixiangqi_type = std::abs(guojixiangqi_piece_value); // guojixiangqi_type 是当前棋子的绝对值类型编码。
        if (guojixiangqi_type < 1 || guojixiangqi_type > 6) continue;
        if (guojixiangqi_type == 3)
        {
            if (guojixiangqi_sign > 0) ++guojixiangqi_white_bishops;
            else ++guojixiangqi_black_bishops;
        }
        guojixiangqi_score += guojixiangqi_sign * guojixiangqi_values[guojixiangqi_type];
        const int guojixiangqi_row = guojixiangqi_square / 8; // guojixiangqi_row 是棋子所在行。
        const int guojixiangqi_col = guojixiangqi_square % 8; // guojixiangqi_col 是棋子所在列。
        const int guojixiangqi_center_bonus = 7 - std::abs(2 * guojixiangqi_row - 7) - std::abs(2 * guojixiangqi_col - 7); // guojixiangqi_center_bonus 是靠近棋盘中心的奖励。
        guojixiangqi_score += guojixiangqi_sign * std::max(0, guojixiangqi_center_bonus) * 3;
        if (guojixiangqi_type == 1)
        {
            const int guojixiangqi_pawn_advance = guojixiangqi_sign > 0 ? std::max(0, 6 - guojixiangqi_row) : std::max(0, guojixiangqi_row - 1); // guojixiangqi_pawn_advance 是兵从初始横线向前推进的格数。
            guojixiangqi_score += guojixiangqi_sign * guojixiangqi_pawn_advance * 4;
        }
    }
    if (guojixiangqi_white_bishops >= 2) guojixiangqi_score += 22;
    if (guojixiangqi_black_bishops >= 2) guojixiangqi_score -= 22;
    if (guojixiangqi_board_value.guojixiangqi_in_check(0)) guojixiangqi_score -= 45;
    if (guojixiangqi_board_value.guojixiangqi_in_check(1)) guojixiangqi_score += 45;

    if (guojixiangqi_board_value.guojixiangqi_game_over())
    {
        const bool guojixiangqi_checkmate = guojixiangqi_board_value.guojixiangqi_in_check(guojixiangqi_board_value.guojixiangqi_side()); // guojixiangqi_checkmate 表示当前无子可走是将死而非和棋。
        if (guojixiangqi_checkmate)
        {
            guojixiangqi_result.guojixiangqi_white_percent = guojixiangqi_board_value.guojixiangqi_side() == 0 ? 0 : 100;
            guojixiangqi_result.guojixiangqi_black_percent = 100 - guojixiangqi_result.guojixiangqi_white_percent;
            guojixiangqi_result.guojixiangqi_score = guojixiangqi_board_value.guojixiangqi_side() == 0 ? -100000 : 100000;
            guojixiangqi_result.guojixiangqi_summary = L"将死，胜负已确定";
            return guojixiangqi_result;
        }
        guojixiangqi_result.guojixiangqi_summary = L"和棋，双方机会均等";
        guojixiangqi_result.guojixiangqi_white_percent = 50;
        guojixiangqi_result.guojixiangqi_black_percent = 50;
        guojixiangqi_result.guojixiangqi_score = 0;
        return guojixiangqi_result;
    }

    const double guojixiangqi_phase = std::clamp(guojixiangqi_move_count / 80.0, 0.0, 1.0); // guojixiangqi_phase 是由开局到残局的阶段系数。
    const double guojixiangqi_scale = 520.0 - 210.0 * guojixiangqi_phase; // guojixiangqi_scale 让开局预测更克制、残局预测更敏感。
    const double guojixiangqi_probability = 1.0 / (1.0 + std::exp(-guojixiangqi_score / guojixiangqi_scale)); // guojixiangqi_probability 是按对局阶段折算的白方胜率。
    guojixiangqi_result.guojixiangqi_white_percent = std::clamp(static_cast<int>(std::lround(guojixiangqi_probability * 100.0)), 1, 99);
    guojixiangqi_result.guojixiangqi_black_percent = 100 - guojixiangqi_result.guojixiangqi_white_percent;
    guojixiangqi_result.guojixiangqi_score = guojixiangqi_score;
    if (std::abs(guojixiangqi_score) < 70) guojixiangqi_result.guojixiangqi_summary = L"局势均衡";
    else if (guojixiangqi_score > 0) guojixiangqi_result.guojixiangqi_summary = guojixiangqi_score > 350 ? L"白方明显占优" : L"白方略占优势";
    else guojixiangqi_result.guojixiangqi_summary = guojixiangqi_score < -350 ? L"黑方明显占优" : L"黑方略占优势";
    return guojixiangqi_result;
}
