#include "weiqi_analysis.h"

#include <algorithm>
#include <cmath>

weiqi_analysis_result weiqi_analyze(const weiqi_board& weiqi_board_value)
{
    weiqi_analysis_result weiqi_result; // weiqi_result 保存本次围棋局势分析。
    const std::pair<double, double> weiqi_score = weiqi_board_value.weiqi_score(); // weiqi_score 是按中国数子法得到的黑白盘面分。
    const int weiqi_move_count = static_cast<int>(weiqi_board_value.weiqi_move_history().size()); // weiqi_move_count 是已进行的手数。
    int weiqi_black_stones = 0; // weiqi_black_stones 是棋盘上的黑子数。
    int weiqi_white_stones = 0; // weiqi_white_stones 是棋盘上的白子数。
    for (int weiqi_row = 0; weiqi_row < 19; ++weiqi_row) // weiqi_row 是当前统计行。
    {
        for (int weiqi_col = 0; weiqi_col < 19; ++weiqi_col) // weiqi_col 是当前统计列。
        {
            const int weiqi_stone_value = weiqi_board_value.weiqi_stone(weiqi_row, weiqi_col); // weiqi_stone_value 是当前交叉点棋子编码。
            if (weiqi_stone_value == 1) ++weiqi_black_stones;
            else if (weiqi_stone_value == 2) ++weiqi_white_stones;
        }
    }
    const double weiqi_area_lead = weiqi_score.first - weiqi_score.second; // weiqi_area_lead 是完整盘面数子得到的黑方领先目数。
    const double weiqi_stone_lead = static_cast<double>(weiqi_black_stones - weiqi_white_stones) - 7.5; // weiqi_stone_lead 是仅按现存棋子与贴目得到的领先值。
    const double weiqi_phase = std::clamp(weiqi_move_count / 180.0, 0.0, 1.0); // weiqi_phase 是由布局到官子的阶段系数。
    weiqi_result.weiqi_lead = weiqi_stone_lead * (1.0 - weiqi_phase) + weiqi_area_lead * weiqi_phase;
    if (weiqi_board_value.weiqi_game_over()) weiqi_result.weiqi_lead = weiqi_area_lead;
    const double weiqi_scale = 30.0 - 18.0 * weiqi_phase; // weiqi_scale 是随终局临近而提高灵敏度的胜率换算尺度。
    const double weiqi_probability = 1.0 / (1.0 + std::exp(-weiqi_result.weiqi_lead / weiqi_scale)); // weiqi_probability 是黑方估算胜率。
    weiqi_result.weiqi_black_percent = std::clamp(static_cast<int>(std::lround(weiqi_probability * 100.0)), 1, 99);
    weiqi_result.weiqi_white_percent = 100 - weiqi_result.weiqi_black_percent;
    if (weiqi_board_value.weiqi_game_over())
    {
        weiqi_result.weiqi_black_percent = weiqi_result.weiqi_lead > 0.0 ? 100 : 0;
        weiqi_result.weiqi_white_percent = 100 - weiqi_result.weiqi_black_percent;
        weiqi_result.weiqi_summary = L"双方停手，数子结果已确定";
    }
    else if (std::abs(weiqi_result.weiqi_lead) < 2.0) weiqi_result.weiqi_summary = L"盘面接近，胜负未明";
    else if (weiqi_result.weiqi_lead > 0.0) weiqi_result.weiqi_summary = weiqi_result.weiqi_lead > 12.0 ? L"黑方明显领先" : L"黑方暂时领先";
    else weiqi_result.weiqi_summary = weiqi_result.weiqi_lead < -12.0 ? L"白方明显领先" : L"白方暂时领先";
    return weiqi_result;
}
