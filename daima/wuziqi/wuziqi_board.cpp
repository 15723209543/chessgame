#include "wuziqi_board.h"

#include <algorithm>

namespace
{
    // wuziqi_inside 判断行列是否在 15x15 棋盘内。
    bool wuziqi_inside(int wuziqi_row, int wuziqi_col)
    {
        return wuziqi_row >= 0 && wuziqi_row < 15 && wuziqi_col >= 0 && wuziqi_col < 15;
    }
}

void wuziqi_board::wuziqi_reset()
{
    wuziqi_points.fill(0);
    wuziqi_moves.clear();
    wuziqi_current_side = 0;
}

int wuziqi_board::wuziqi_stone(int wuziqi_row, int wuziqi_col) const
{
    return wuziqi_inside(wuziqi_row, wuziqi_col) ? wuziqi_points[wuziqi_row * 15 + wuziqi_col] : 0;
}

int wuziqi_board::wuziqi_side() const
{
    return wuziqi_current_side;
}

bool wuziqi_board::wuziqi_play(const wuziqi_move& wuziqi_move_value)
{
    if (!wuziqi_inside(wuziqi_move_value.wuziqi_row, wuziqi_move_value.wuziqi_col) || wuziqi_points[wuziqi_move_value.wuziqi_row * 15 + wuziqi_move_value.wuziqi_col] != 0 || wuziqi_game_over()) return false;
    wuziqi_points[wuziqi_move_value.wuziqi_row * 15 + wuziqi_move_value.wuziqi_col] = wuziqi_current_side + 1;
    wuziqi_moves.push_back(wuziqi_move_value);
    wuziqi_current_side = 1 - wuziqi_current_side;
    return true;
}

bool wuziqi_board::wuziqi_undo()
{
    if (wuziqi_moves.empty()) return false;
    const wuziqi_move wuziqi_last = wuziqi_moves.back(); // wuziqi_last 是需要撤回的最近落子。
    wuziqi_moves.pop_back();
    wuziqi_points[wuziqi_last.wuziqi_row * 15 + wuziqi_last.wuziqi_col] = 0;
    wuziqi_current_side = 1 - wuziqi_current_side;
    return true;
}

int wuziqi_board::wuziqi_winner() const
{
    const int wuziqi_directions[4][2] = { {1,0},{0,1},{1,1},{1,-1} }; // wuziqi_directions 是四个不重复连线方向。
    for (int wuziqi_row = 0; wuziqi_row < 15; ++wuziqi_row) // wuziqi_row 是当前检查起点行。
    {
        for (int wuziqi_col = 0; wuziqi_col < 15; ++wuziqi_col) // wuziqi_col 是当前检查起点列。
        {
            const int wuziqi_stone_value = wuziqi_stone(wuziqi_row, wuziqi_col); // wuziqi_stone_value 是连线起点棋子。
            if (!wuziqi_stone_value) continue;
            for (const auto& wuziqi_direction : wuziqi_directions) // wuziqi_direction 是当前连线方向。
            {
                int wuziqi_count = 1; // wuziqi_count 是从起点沿方向的连续同色子数。
                while (wuziqi_stone(wuziqi_row + wuziqi_count * wuziqi_direction[0], wuziqi_col + wuziqi_count * wuziqi_direction[1]) == wuziqi_stone_value) ++wuziqi_count;
                if (wuziqi_count >= 5) return wuziqi_stone_value;
            }
        }
    }
    return 0;
}

bool wuziqi_board::wuziqi_full() const
{
    return std::none_of(wuziqi_points.begin(), wuziqi_points.end(), [](int wuziqi_value) { return wuziqi_value == 0; });
}

bool wuziqi_board::wuziqi_game_over() const
{
    return wuziqi_winner() != 0 || wuziqi_full();
}

std::wstring wuziqi_board::wuziqi_result_text() const
{
    const int wuziqi_winner_value = wuziqi_winner(); // wuziqi_winner_value 是当前获胜棋子编码。
    if (wuziqi_winner_value == 1) return L"黑方五子连珠，黑方获胜";
    if (wuziqi_winner_value == 2) return L"白方五子连珠，白方获胜";
    if (wuziqi_full()) return L"棋盘已满，和棋";
    return wuziqi_current_side == 0 ? L"黑方行棋" : L"白方行棋";
}

const std::vector<wuziqi_move>& wuziqi_board::wuziqi_move_history() const
{
    return wuziqi_moves;
}
