#include "wuziqi_analysis.h"

#include <algorithm>
#include <cmath>

namespace
{
    // wuziqi_line_score 计算指定一方所有连续棋型的攻防价值。
    int wuziqi_line_score(const wuziqi_board& wuziqi_board_value, int wuziqi_stone_value)
    {
        const int wuziqi_directions[4][2] = { {0, 1}, {1, 0}, {1, 1}, {1, -1} }; // wuziqi_directions 是横、竖和两条斜线方向。
        const int wuziqi_weights[] = { 0, 8, 90, 850, 9000, 100000 }; // wuziqi_weights 是不同连续长度的基础价值。
        int wuziqi_total = 0; // wuziqi_total 累积指定一方全部连型分数。
        for (int wuziqi_row = 0; wuziqi_row < 15; ++wuziqi_row) // wuziqi_row 是当前检查行。
        {
            for (int wuziqi_col = 0; wuziqi_col < 15; ++wuziqi_col) // wuziqi_col 是当前检查列。
            {
                if (wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) != wuziqi_stone_value) continue;
                for (const auto& wuziqi_direction : wuziqi_directions) // wuziqi_direction 是当前检查方向。
                {
                    const int wuziqi_previous_row = wuziqi_row - wuziqi_direction[0]; // wuziqi_previous_row 是连续段前一格的行。
                    const int wuziqi_previous_col = wuziqi_col - wuziqi_direction[1]; // wuziqi_previous_col 是连续段前一格的列。
                    if (wuziqi_previous_row >= 0 && wuziqi_previous_row < 15 && wuziqi_previous_col >= 0 && wuziqi_previous_col < 15 &&
                        wuziqi_board_value.wuziqi_stone(wuziqi_previous_row, wuziqi_previous_col) == wuziqi_stone_value) continue;
                    int wuziqi_length = 0; // wuziqi_length 是当前连续段长度。
                    int wuziqi_next_row = wuziqi_row; // wuziqi_next_row 是扫描连续段使用的行。
                    int wuziqi_next_col = wuziqi_col; // wuziqi_next_col 是扫描连续段使用的列。
                    while (wuziqi_next_row >= 0 && wuziqi_next_row < 15 && wuziqi_next_col >= 0 && wuziqi_next_col < 15 &&
                           wuziqi_board_value.wuziqi_stone(wuziqi_next_row, wuziqi_next_col) == wuziqi_stone_value)
                    {
                        ++wuziqi_length;
                        wuziqi_next_row += wuziqi_direction[0];
                        wuziqi_next_col += wuziqi_direction[1];
                    }
                    int wuziqi_open_ends = 0; // wuziqi_open_ends 是当前连续段两端空位数量。
                    if (wuziqi_previous_row >= 0 && wuziqi_previous_row < 15 && wuziqi_previous_col >= 0 && wuziqi_previous_col < 15 &&
                        wuziqi_board_value.wuziqi_stone(wuziqi_previous_row, wuziqi_previous_col) == 0) ++wuziqi_open_ends;
                    if (wuziqi_next_row >= 0 && wuziqi_next_row < 15 && wuziqi_next_col >= 0 && wuziqi_next_col < 15 &&
                        wuziqi_board_value.wuziqi_stone(wuziqi_next_row, wuziqi_next_col) == 0) ++wuziqi_open_ends;
                    const int wuziqi_index = std::min(wuziqi_length, 5); // wuziqi_index 是权重表使用的连续长度。
                    wuziqi_total += wuziqi_weights[wuziqi_index] * (wuziqi_open_ends == 2 ? 3 : (wuziqi_open_ends == 1 ? 1 : 0));
                    if (wuziqi_length >= 5) wuziqi_total += 100000;
                }
            }
        }
        return wuziqi_total;
    }
}

wuziqi_analysis_result wuziqi_analyze(const wuziqi_board& wuziqi_board_value)
{
    wuziqi_analysis_result wuziqi_result; // wuziqi_result 保存本次五子棋局势分析。
    const int wuziqi_winner_value = wuziqi_board_value.wuziqi_winner(); // wuziqi_winner_value 是当前获胜方棋子编码。
    if (wuziqi_winner_value != 0)
    {
        wuziqi_result.wuziqi_black_percent = wuziqi_winner_value == 1 ? 100 : 0;
        wuziqi_result.wuziqi_white_percent = 100 - wuziqi_result.wuziqi_black_percent;
        wuziqi_result.wuziqi_score = wuziqi_winner_value == 1 ? 1000000 : -1000000;
        wuziqi_result.wuziqi_summary = L"五子连珠，胜负已确定";
        return wuziqi_result;
    }
    if (wuziqi_board_value.wuziqi_full())
    {
        wuziqi_result.wuziqi_summary = L"棋盘已满，本局和棋";
        return wuziqi_result;
    }
    const int wuziqi_black_score = wuziqi_line_score(wuziqi_board_value, 1); // wuziqi_black_score 是黑方全部连型分数。
    const int wuziqi_white_score = wuziqi_line_score(wuziqi_board_value, 2); // wuziqi_white_score 是白方全部连型分数。
    wuziqi_result.wuziqi_score = wuziqi_black_score - wuziqi_white_score + (wuziqi_board_value.wuziqi_side() == 0 ? 120 : -120);
    const double wuziqi_probability = 1.0 / (1.0 + std::exp(-wuziqi_result.wuziqi_score / 4200.0)); // wuziqi_probability 是黑方连型分差折算的胜率。
    wuziqi_result.wuziqi_black_percent = std::clamp(static_cast<int>(std::lround(wuziqi_probability * 100.0)), 1, 99);
    wuziqi_result.wuziqi_white_percent = 100 - wuziqi_result.wuziqi_black_percent;
    if (std::abs(wuziqi_result.wuziqi_score) < 500) wuziqi_result.wuziqi_summary = L"双方连型接近";
    else if (wuziqi_result.wuziqi_score > 0) wuziqi_result.wuziqi_summary = wuziqi_result.wuziqi_score > 8000 ? L"黑方形成强烈攻势" : L"黑方暂时占优";
    else wuziqi_result.wuziqi_summary = wuziqi_result.wuziqi_score < -8000 ? L"白方形成强烈攻势" : L"白方暂时占优";
    return wuziqi_result;
}
