#include "weiqi_board.h"

#include <algorithm>
#include <iomanip>
#include <queue>
#include <sstream>

namespace
{
    // weiqi_inside 判断行列是否在 19x19 棋盘内。
    bool weiqi_inside(int weiqi_row, int weiqi_col)
    {
        return weiqi_row >= 0 && weiqi_row < 19 && weiqi_col >= 0 && weiqi_col < 19;
    }

    // weiqi_neighbors 返回指定交叉点的有效上下左右邻点。
    std::vector<int> weiqi_neighbors(int weiqi_point)
    {
        std::vector<int> weiqi_result; // weiqi_result 收集相邻交叉点编号。
        const int weiqi_row = weiqi_point / 19; // weiqi_row 是交叉点所在行。
        const int weiqi_col = weiqi_point % 19; // weiqi_col 是交叉点所在列。
        const int weiqi_offsets[4][2] = { {-1,0},{1,0},{0,-1},{0,1} }; // weiqi_offsets 是四个直交邻点偏移。
        for (const auto& weiqi_offset : weiqi_offsets) // weiqi_offset 是当前邻点偏移。
        {
            const int weiqi_next_row = weiqi_row + weiqi_offset[0]; // weiqi_next_row 是邻点行。
            const int weiqi_next_col = weiqi_col + weiqi_offset[1]; // weiqi_next_col 是邻点列。
            if (weiqi_inside(weiqi_next_row, weiqi_next_col)) weiqi_result.push_back(weiqi_next_row * 19 + weiqi_next_col);
        }
        return weiqi_result;
    }
}

void weiqi_board::weiqi_reset()
{
    weiqi_current = {};
    weiqi_history.clear();
    weiqi_moves.clear();
}

int weiqi_board::weiqi_stone(int weiqi_row, int weiqi_col) const
{
    return weiqi_inside(weiqi_row, weiqi_col) ? weiqi_current.weiqi_points[weiqi_row * 19 + weiqi_col] : 0;
}

int weiqi_board::weiqi_side() const
{
    return weiqi_current.weiqi_side;
}

int weiqi_board::weiqi_stone_count(int weiqi_side_value) const
{
    const int weiqi_color = weiqi_side_value + 1; // weiqi_color 是指定一方在棋盘数组中的棋子编码。
    return static_cast<int>(std::count(weiqi_current.weiqi_points.begin(), weiqi_current.weiqi_points.end(), weiqi_color));
}

int weiqi_board::weiqi_capture_count(int weiqi_side_value) const
{
    return weiqi_side_value >= 0 && weiqi_side_value < 2 ? weiqi_current.weiqi_captures[weiqi_side_value] : 0;
}

std::vector<int> weiqi_board::weiqi_collect_group(const std::array<int, 361>& weiqi_points, int weiqi_start, int& weiqi_liberties) const
{
    std::vector<int> weiqi_group; // weiqi_group 收集同色连通块的所有交叉点。
    std::array<bool, 361> weiqi_seen{}; // weiqi_seen 标记已加入连通块搜索的点。
    std::array<bool, 361> weiqi_liberty_seen{}; // weiqi_liberty_seen 防止同一口气被重复计数。
    std::queue<int> weiqi_queue; // weiqi_queue 是连通块广度优先搜索队列。
    const int weiqi_color = weiqi_points[weiqi_start]; // weiqi_color 是当前连通块颜色。
    weiqi_queue.push(weiqi_start);
    weiqi_seen[weiqi_start] = true;
    weiqi_liberties = 0;
    while (!weiqi_queue.empty())
    {
        const int weiqi_point = weiqi_queue.front(); // weiqi_point 是当前扩展的连通块交叉点。
        weiqi_queue.pop();
        weiqi_group.push_back(weiqi_point);
        for (int weiqi_neighbor : weiqi_neighbors(weiqi_point)) // weiqi_neighbor 是当前点的直交邻点。
        {
            if (weiqi_points[weiqi_neighbor] == 0 && !weiqi_liberty_seen[weiqi_neighbor]) { weiqi_liberty_seen[weiqi_neighbor] = true; ++weiqi_liberties; }
            else if (weiqi_points[weiqi_neighbor] == weiqi_color && !weiqi_seen[weiqi_neighbor]) { weiqi_seen[weiqi_neighbor] = true; weiqi_queue.push(weiqi_neighbor); }
        }
    }
    return weiqi_group;
}

bool weiqi_board::weiqi_apply_to_points(std::array<int, 361>& weiqi_points, int weiqi_side_value, int weiqi_row, int weiqi_col, int* weiqi_captured_count) const
{
    if (weiqi_captured_count) *weiqi_captured_count = 0;
    if (!weiqi_inside(weiqi_row, weiqi_col) || weiqi_points[weiqi_row * 19 + weiqi_col] != 0) return false;
    const int weiqi_point = weiqi_row * 19 + weiqi_col; // weiqi_point 是本步落子交叉点。
    const int weiqi_color = weiqi_side_value + 1; // weiqi_color 是本步棋子编码。
    const int weiqi_opponent = 3 - weiqi_color; // weiqi_opponent 是对方棋子编码。
    weiqi_points[weiqi_point] = weiqi_color;
    for (int weiqi_neighbor : weiqi_neighbors(weiqi_point)) // weiqi_neighbor 是可能被提子的相邻对方块起点。
    {
        if (weiqi_points[weiqi_neighbor] != weiqi_opponent) continue;
        int weiqi_liberties = 0; // weiqi_liberties 是相邻对方块剩余气数。
        const std::vector<int> weiqi_group = weiqi_collect_group(weiqi_points, weiqi_neighbor, weiqi_liberties); // weiqi_group 是相邻对方连通块。
        if (weiqi_liberties == 0)
        {
            if (weiqi_captured_count) *weiqi_captured_count += static_cast<int>(weiqi_group.size());
            for (int weiqi_captured : weiqi_group) weiqi_points[weiqi_captured] = 0; // weiqi_captured 是被提掉的对方棋子。
        }
    }
    int weiqi_own_liberties = 0; // weiqi_own_liberties 是落子后本方连通块气数。
    weiqi_collect_group(weiqi_points, weiqi_point, weiqi_own_liberties);
    return weiqi_own_liberties > 0;
}

bool weiqi_board::weiqi_legal(int weiqi_row, int weiqi_col) const
{
    std::array<int, 361> weiqi_copy = weiqi_current.weiqi_points; // weiqi_copy 是用来检查禁入点与劫的棋盘副本。
    if (!weiqi_apply_to_points(weiqi_copy, weiqi_current.weiqi_side, weiqi_row, weiqi_col)) return false;
    if (!weiqi_history.empty() && weiqi_copy == weiqi_history.back().weiqi_points) return false;
    return true;
}

bool weiqi_board::weiqi_play(const weiqi_move& weiqi_move_value)
{
    if (weiqi_move_value.weiqi_pass)
    {
        weiqi_history.push_back(weiqi_current);
        weiqi_moves.push_back(weiqi_move_value);
        ++weiqi_current.weiqi_consecutive_passes;
        weiqi_current.weiqi_side = 1 - weiqi_current.weiqi_side;
        return true;
    }
    if (!weiqi_legal(weiqi_move_value.weiqi_row, weiqi_move_value.weiqi_col)) return false;
    weiqi_history.push_back(weiqi_current);
    weiqi_moves.push_back(weiqi_move_value);
    int weiqi_captured_count = 0; // weiqi_captured_count 是本步实际提掉的对方棋子数量。
    weiqi_apply_to_points(weiqi_current.weiqi_points, weiqi_current.weiqi_side, weiqi_move_value.weiqi_row, weiqi_move_value.weiqi_col, &weiqi_captured_count);
    weiqi_current.weiqi_captures[weiqi_current.weiqi_side] += weiqi_captured_count;
    weiqi_current.weiqi_consecutive_passes = 0;
    weiqi_current.weiqi_side = 1 - weiqi_current.weiqi_side;
    return true;
}

std::vector<weiqi_move> weiqi_board::weiqi_legal_moves() const
{
    std::vector<weiqi_move> weiqi_result; // weiqi_result 收集当前所有合法落子点。
    for (int weiqi_row = 0; weiqi_row < 19; ++weiqi_row) // weiqi_row 是当前检查行。
        for (int weiqi_col = 0; weiqi_col < 19; ++weiqi_col) // weiqi_col 是当前检查列。
            if (weiqi_legal(weiqi_row, weiqi_col)) weiqi_result.push_back({ weiqi_row, weiqi_col, false });
    return weiqi_result;
}

bool weiqi_board::weiqi_undo()
{
    if (weiqi_history.empty()) return false;
    weiqi_current = weiqi_history.back();
    weiqi_history.pop_back();
    if (!weiqi_moves.empty()) weiqi_moves.pop_back();
    return true;
}

bool weiqi_board::weiqi_game_over() const
{
    return weiqi_current.weiqi_consecutive_passes >= 2;
}

std::pair<double, double> weiqi_board::weiqi_score() const
{
    double weiqi_black = 0.0; // weiqi_black 是黑方棋子与围空总面积。
    double weiqi_white = 7.5; // weiqi_white 是白方棋子、围空与 7.5 贴目总面积。
    std::array<bool, 361> weiqi_seen{}; // weiqi_seen 标记已经统计的空点区域。
    for (int weiqi_point = 0; weiqi_point < 361; ++weiqi_point) // weiqi_point 是当前统计交叉点。
    {
        if (weiqi_current.weiqi_points[weiqi_point] == 1) { ++weiqi_black; continue; }
        if (weiqi_current.weiqi_points[weiqi_point] == 2) { ++weiqi_white; continue; }
        if (weiqi_seen[weiqi_point]) continue;
        std::queue<int> weiqi_queue; // weiqi_queue 是空点连通区域搜索队列。
        std::vector<int> weiqi_region; // weiqi_region 收集当前空点区域。
        bool weiqi_touches_black = false; // weiqi_touches_black 表示区域是否接触黑子。
        bool weiqi_touches_white = false; // weiqi_touches_white 表示区域是否接触白子。
        weiqi_queue.push(weiqi_point);
        weiqi_seen[weiqi_point] = true;
        while (!weiqi_queue.empty())
        {
            const int weiqi_empty = weiqi_queue.front(); // weiqi_empty 是当前扩展的空点。
            weiqi_queue.pop();
            weiqi_region.push_back(weiqi_empty);
            for (int weiqi_neighbor : weiqi_neighbors(weiqi_empty)) // weiqi_neighbor 是空点的直交邻点。
            {
                const int weiqi_value = weiqi_current.weiqi_points[weiqi_neighbor]; // weiqi_value 是邻点内容。
                if (weiqi_value == 0 && !weiqi_seen[weiqi_neighbor]) { weiqi_seen[weiqi_neighbor] = true; weiqi_queue.push(weiqi_neighbor); }
                else if (weiqi_value == 1) weiqi_touches_black = true;
                else if (weiqi_value == 2) weiqi_touches_white = true;
            }
        }
        if (weiqi_touches_black && !weiqi_touches_white) weiqi_black += static_cast<double>(weiqi_region.size());
        if (weiqi_touches_white && !weiqi_touches_black) weiqi_white += static_cast<double>(weiqi_region.size());
    }
    return { weiqi_black, weiqi_white };
}

std::wstring weiqi_board::weiqi_result_text() const
{
    if (!weiqi_game_over()) return weiqi_current.weiqi_side == 0 ? L"黑方行棋" : L"白方行棋";
    const auto weiqi_scores = weiqi_score(); // weiqi_scores 是黑白双方中国数子法面积分。
    std::wstringstream weiqi_stream; // weiqi_stream 组合对局结果文字。
    weiqi_stream << std::fixed << std::setprecision(1) << L"黑 " << weiqi_scores.first << L" 目，白 " << weiqi_scores.second << L" 目；";
    weiqi_stream << (weiqi_scores.first > weiqi_scores.second ? L"黑方胜 " : L"白方胜 ") << std::abs(weiqi_scores.first - weiqi_scores.second) << L" 目";
    return weiqi_stream.str();
}

const std::vector<weiqi_move>& weiqi_board::weiqi_move_history() const
{
    return weiqi_moves;
}
