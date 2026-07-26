#include "weiqi_analysis.h"

#include <algorithm>
#include <cmath>

weiqi_analysis_result weiqi_analyze(const weiqi_board& weiqi_board_value)
{
    weiqi_analysis_result weiqi_result; // weiqi_result 保存本次围棋局势分析。
    const int weiqi_move_count = static_cast<int>(weiqi_board_value.weiqi_move_history().size()); // weiqi_move_count 是已进行的手数。
    if (weiqi_move_count == 0)
    {
        weiqi_result.weiqi_lead = 0.0;
        weiqi_result.weiqi_summary = L"空盘开局，双方机会均等";
        return weiqi_result;
    }
    const std::pair<double, double> weiqi_score = weiqi_board_value.weiqi_score(); // weiqi_score 是按中国数子法得到的黑白盘面分。
    const int weiqi_black_stones = weiqi_board_value.weiqi_stone_count(0); // weiqi_black_stones 是棋盘上的黑子数。
    const int weiqi_white_stones = weiqi_board_value.weiqi_stone_count(1); // weiqi_white_stones 是棋盘上的白子数。
    const int weiqi_black_captures = weiqi_board_value.weiqi_capture_count(0); // weiqi_black_captures 是黑方已经提掉的白子数。
    const int weiqi_white_captures = weiqi_board_value.weiqi_capture_count(1); // weiqi_white_captures 是白方已经提掉的黑子数。
    const double weiqi_area_lead = weiqi_score.first - weiqi_score.second; // weiqi_area_lead 是完整盘面数子得到的黑方领先目数。
    const double weiqi_phase = std::clamp(weiqi_move_count / 180.0, 0.0, 1.0); // weiqi_phase 是由布局到官子的阶段系数。
    const double weiqi_opening_compensation = 7.5 * (1.0 - weiqi_phase); // weiqi_opening_compensation 在布局阶段用黑方先行价值抵消贴目造成的空盘偏置。
    const double weiqi_capture_lead = static_cast<double>(weiqi_black_captures - weiqi_white_captures) * 0.65; // weiqi_capture_lead 是提子差折算出的辅助领先值。
    const double weiqi_stone_lead = static_cast<double>(weiqi_black_stones - weiqi_white_stones) + weiqi_capture_lead - 7.5 + weiqi_opening_compensation; // weiqi_stone_lead 是结合现存棋子、提子、贴目与先行补偿的布局领先值。
    const double weiqi_area_weight = weiqi_phase * weiqi_phase; // weiqi_area_weight 让稀疏布局少依赖尚不稳定的空域归属。
    weiqi_result.weiqi_lead = weiqi_stone_lead * (1.0 - weiqi_area_weight) + weiqi_area_lead * weiqi_area_weight;
    if (weiqi_board_value.weiqi_game_over()) weiqi_result.weiqi_lead = weiqi_area_lead;
    const double weiqi_scale = 36.0 - 24.0 * weiqi_phase; // weiqi_scale 让布局预测保持克制，并在终局数子时提高灵敏度。
    const double weiqi_probability = 1.0 / (1.0 + std::exp(-weiqi_result.weiqi_lead / weiqi_scale)); // weiqi_probability 是黑方估算胜率。
    weiqi_result.weiqi_black_percent = std::clamp(static_cast<int>(std::lround(weiqi_probability * 100.0)), 1, 99);
    weiqi_result.weiqi_white_percent = 100 - weiqi_result.weiqi_black_percent;
    if (weiqi_board_value.weiqi_game_over())
    {
        if (std::abs(weiqi_result.weiqi_lead) < 0.05)
        {
            weiqi_result.weiqi_black_percent = 50;
            weiqi_result.weiqi_white_percent = 50;
            weiqi_result.weiqi_summary = L"双方停手，数子结果为和棋";
        }
        else
        {
            weiqi_result.weiqi_black_percent = weiqi_result.weiqi_lead > 0.0 ? 100 : 0;
            weiqi_result.weiqi_white_percent = 100 - weiqi_result.weiqi_black_percent;
            weiqi_result.weiqi_summary = L"双方停手，数子结果已确定";
        }
    }
    else if (std::abs(weiqi_result.weiqi_lead) < 2.0) weiqi_result.weiqi_summary = L"盘面接近，胜负未明";
    else if (weiqi_result.weiqi_lead > 0.0) weiqi_result.weiqi_summary = weiqi_result.weiqi_lead > 12.0 ? L"黑方明显领先" : L"黑方暂时领先";
    else weiqi_result.weiqi_summary = weiqi_result.weiqi_lead < -12.0 ? L"白方明显领先" : L"白方暂时领先";
    return weiqi_result;
}
