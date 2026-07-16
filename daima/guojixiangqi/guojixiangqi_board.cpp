#include "guojixiangqi_board.h"

#include <algorithm>
#include <cmath>

namespace
{
    constexpr int guojixiangqi_pawn = 1;   // guojixiangqi_pawn 是兵的绝对值编码。
    constexpr int guojixiangqi_knight = 2; // guojixiangqi_knight 是马的绝对值编码。
    constexpr int guojixiangqi_bishop = 3; // guojixiangqi_bishop 是象的绝对值编码。
    constexpr int guojixiangqi_rook = 4;   // guojixiangqi_rook 是车的绝对值编码。
    constexpr int guojixiangqi_queen = 5;  // guojixiangqi_queen 是后的绝对值编码。
    constexpr int guojixiangqi_king = 6;   // guojixiangqi_king 是王的绝对值编码。

    // guojixiangqi_inside 判断行列是否在 8x8 棋盘内。
    bool guojixiangqi_inside(int guojixiangqi_row, int guojixiangqi_col)
    {
        return guojixiangqi_row >= 0 && guojixiangqi_row < 8 && guojixiangqi_col >= 0 && guojixiangqi_col < 8;
    }

    // guojixiangqi_color 返回棋子所属方，空格返回 -1。
    int guojixiangqi_color(int guojixiangqi_piece_value)
    {
        return guojixiangqi_piece_value > 0 ? 0 : (guojixiangqi_piece_value < 0 ? 1 : -1);
    }
}

void guojixiangqi_board::guojixiangqi_reset()
{
    guojixiangqi_current = {};
    const std::array<int, 8> guojixiangqi_back = { guojixiangqi_rook, guojixiangqi_knight, guojixiangqi_bishop, guojixiangqi_queen, guojixiangqi_king, guojixiangqi_bishop, guojixiangqi_knight, guojixiangqi_rook }; // guojixiangqi_back 是两方底线棋子顺序。
    for (int guojixiangqi_col = 0; guojixiangqi_col < 8; ++guojixiangqi_col) // guojixiangqi_col 是初始化棋子所在列。
    {
        guojixiangqi_current.guojixiangqi_squares[guojixiangqi_col] = -guojixiangqi_back[guojixiangqi_col];
        guojixiangqi_current.guojixiangqi_squares[8 + guojixiangqi_col] = -guojixiangqi_pawn;
        guojixiangqi_current.guojixiangqi_squares[48 + guojixiangqi_col] = guojixiangqi_pawn;
        guojixiangqi_current.guojixiangqi_squares[56 + guojixiangqi_col] = guojixiangqi_back[guojixiangqi_col];
    }
    guojixiangqi_current.guojixiangqi_side = 0;
    guojixiangqi_current.guojixiangqi_castling = 15;
    guojixiangqi_current.guojixiangqi_en_passant = -1;
    guojixiangqi_current.guojixiangqi_fullmove = 1;
    guojixiangqi_history.clear();
    guojixiangqi_moves.clear();
}

int guojixiangqi_board::guojixiangqi_piece(int guojixiangqi_square) const
{
    return guojixiangqi_square >= 0 && guojixiangqi_square < 64 ? guojixiangqi_current.guojixiangqi_squares[guojixiangqi_square] : 0;
}

int guojixiangqi_board::guojixiangqi_side() const
{
    return guojixiangqi_current.guojixiangqi_side;
}

std::vector<guojixiangqi_move> guojixiangqi_board::guojixiangqi_pseudo_moves() const
{
    std::vector<guojixiangqi_move> guojixiangqi_result; // guojixiangqi_result 收集全部伪合法走法。
    const int guojixiangqi_side_value = guojixiangqi_current.guojixiangqi_side; // guojixiangqi_side_value 是当前行动方。
    const int guojixiangqi_sign = guojixiangqi_side_value == 0 ? 1 : -1; // guojixiangqi_sign 是当前行动方棋子的符号。
    for (int guojixiangqi_from = 0; guojixiangqi_from < 64; ++guojixiangqi_from) // guojixiangqi_from 是当前生成走法的起点。
    {
        const int guojixiangqi_piece_value = guojixiangqi_current.guojixiangqi_squares[guojixiangqi_from]; // guojixiangqi_piece_value 是起点棋子。
        if (guojixiangqi_color(guojixiangqi_piece_value) != guojixiangqi_side_value) continue;
        const int guojixiangqi_type = std::abs(guojixiangqi_piece_value); // guojixiangqi_type 是棋子类型。
        const int guojixiangqi_row = guojixiangqi_from / 8; // guojixiangqi_row 是起点行。
        const int guojixiangqi_col = guojixiangqi_from % 8; // guojixiangqi_col 是起点列。

        auto guojixiangqi_add = [&](int guojixiangqi_to, int guojixiangqi_promotion_value = 0)
        {
            if (guojixiangqi_to >= 0 && guojixiangqi_to < 64 &&
                std::abs(guojixiangqi_current.guojixiangqi_squares[guojixiangqi_to]) != guojixiangqi_king &&
                guojixiangqi_color(guojixiangqi_current.guojixiangqi_squares[guojixiangqi_to]) != guojixiangqi_side_value)
            {
                guojixiangqi_result.push_back({ guojixiangqi_from, guojixiangqi_to, guojixiangqi_promotion_value });
            }
        };

        if (guojixiangqi_type == guojixiangqi_pawn)
        {
            const int guojixiangqi_direction = guojixiangqi_side_value == 0 ? -1 : 1; // guojixiangqi_direction 是兵前进的行增量。
            const int guojixiangqi_start_row = guojixiangqi_side_value == 0 ? 6 : 1; // guojixiangqi_start_row 是兵可走两格的初始行。
            const int guojixiangqi_promotion_row = guojixiangqi_side_value == 0 ? 0 : 7; // guojixiangqi_promotion_row 是兵的升变行。
            const int guojixiangqi_next_row = guojixiangqi_row + guojixiangqi_direction; // guojixiangqi_next_row 是兵前方一行。
            if (guojixiangqi_inside(guojixiangqi_next_row, guojixiangqi_col))
            {
                const int guojixiangqi_forward = guojixiangqi_next_row * 8 + guojixiangqi_col; // guojixiangqi_forward 是兵正前方格。
                if (guojixiangqi_current.guojixiangqi_squares[guojixiangqi_forward] == 0)
                {
                    if (guojixiangqi_next_row == guojixiangqi_promotion_row)
                    {
                        for (int guojixiangqi_promote : { guojixiangqi_queen, guojixiangqi_rook, guojixiangqi_bishop, guojixiangqi_knight }) guojixiangqi_add(guojixiangqi_forward, guojixiangqi_promote); // guojixiangqi_promote 是当前候选升变棋子。
                    }
                    else
                    {
                        guojixiangqi_add(guojixiangqi_forward);
                        const int guojixiangqi_double = (guojixiangqi_row + 2 * guojixiangqi_direction) * 8 + guojixiangqi_col; // guojixiangqi_double 是兵从初始位走两格的终点。
                        if (guojixiangqi_row == guojixiangqi_start_row && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_double] == 0) guojixiangqi_add(guojixiangqi_double);
                    }
                }
                for (int guojixiangqi_delta_col : { -1, 1 }) // guojixiangqi_delta_col 是兵斜向吃子的列增量。
                {
                    const int guojixiangqi_capture_col = guojixiangqi_col + guojixiangqi_delta_col; // guojixiangqi_capture_col 是兵吃子目标列。
                    if (!guojixiangqi_inside(guojixiangqi_next_row, guojixiangqi_capture_col)) continue;
                    const int guojixiangqi_capture = guojixiangqi_next_row * 8 + guojixiangqi_capture_col; // guojixiangqi_capture 是兵吃子或过路兵目标格。
                    if (guojixiangqi_color(guojixiangqi_current.guojixiangqi_squares[guojixiangqi_capture]) == 1 - guojixiangqi_side_value || guojixiangqi_capture == guojixiangqi_current.guojixiangqi_en_passant)
                    {
                        if (guojixiangqi_next_row == guojixiangqi_promotion_row)
                        {
                            for (int guojixiangqi_promote : { guojixiangqi_queen, guojixiangqi_rook, guojixiangqi_bishop, guojixiangqi_knight }) guojixiangqi_add(guojixiangqi_capture, guojixiangqi_promote); // guojixiangqi_promote 是吃子升变类型。
                        }
                        else guojixiangqi_add(guojixiangqi_capture);
                    }
                }
            }
        }
        else if (guojixiangqi_type == guojixiangqi_knight)
        {
            const int guojixiangqi_offsets[8][2] = { {-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1} }; // guojixiangqi_offsets 是马的八个相对落点。
            for (const auto& guojixiangqi_offset : guojixiangqi_offsets) // guojixiangqi_offset 是当前马步行列增量。
            {
                const int guojixiangqi_to_row = guojixiangqi_row + guojixiangqi_offset[0]; // guojixiangqi_to_row 是马步目标行。
                const int guojixiangqi_to_col = guojixiangqi_col + guojixiangqi_offset[1]; // guojixiangqi_to_col 是马步目标列。
                if (guojixiangqi_inside(guojixiangqi_to_row, guojixiangqi_to_col)) guojixiangqi_add(guojixiangqi_to_row * 8 + guojixiangqi_to_col);
            }
        }
        else if (guojixiangqi_type == guojixiangqi_king)
        {
            for (int guojixiangqi_delta_row = -1; guojixiangqi_delta_row <= 1; ++guojixiangqi_delta_row) // guojixiangqi_delta_row 是王步的行增量。
            {
                for (int guojixiangqi_delta_col = -1; guojixiangqi_delta_col <= 1; ++guojixiangqi_delta_col) // guojixiangqi_delta_col 是王步的列增量。
                {
                    if (guojixiangqi_delta_row == 0 && guojixiangqi_delta_col == 0) continue;
                    const int guojixiangqi_to_row = guojixiangqi_row + guojixiangqi_delta_row; // guojixiangqi_to_row 是王步目标行。
                    const int guojixiangqi_to_col = guojixiangqi_col + guojixiangqi_delta_col; // guojixiangqi_to_col 是王步目标列。
                    if (guojixiangqi_inside(guojixiangqi_to_row, guojixiangqi_to_col)) guojixiangqi_add(guojixiangqi_to_row * 8 + guojixiangqi_to_col);
                }
            }
            const int guojixiangqi_home = guojixiangqi_side_value == 0 ? 60 : 4; // guojixiangqi_home 是当前王的初始格。
            const int guojixiangqi_right_king = guojixiangqi_side_value == 0 ? 1 : 4; // guojixiangqi_right_king 是王翼易位权位。
            const int guojixiangqi_right_queen = guojixiangqi_side_value == 0 ? 2 : 8; // guojixiangqi_right_queen 是后翼易位权位。
            if (guojixiangqi_from == guojixiangqi_home && !guojixiangqi_square_attacked(guojixiangqi_home, 1 - guojixiangqi_side_value))
            {
                if ((guojixiangqi_current.guojixiangqi_castling & guojixiangqi_right_king) &&
                    guojixiangqi_current.guojixiangqi_squares[guojixiangqi_home + 1] == 0 && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_home + 2] == 0 &&
                    !guojixiangqi_square_attacked(guojixiangqi_home + 1, 1 - guojixiangqi_side_value) && !guojixiangqi_square_attacked(guojixiangqi_home + 2, 1 - guojixiangqi_side_value)) guojixiangqi_add(guojixiangqi_home + 2);
                if ((guojixiangqi_current.guojixiangqi_castling & guojixiangqi_right_queen) &&
                    guojixiangqi_current.guojixiangqi_squares[guojixiangqi_home - 1] == 0 && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_home - 2] == 0 && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_home - 3] == 0 &&
                    !guojixiangqi_square_attacked(guojixiangqi_home - 1, 1 - guojixiangqi_side_value) && !guojixiangqi_square_attacked(guojixiangqi_home - 2, 1 - guojixiangqi_side_value)) guojixiangqi_add(guojixiangqi_home - 2);
            }
        }
        else
        {
            std::vector<std::array<int, 2>> guojixiangqi_directions; // guojixiangqi_directions 保存长距离棋子的滑动方向。
            if (guojixiangqi_type == guojixiangqi_bishop || guojixiangqi_type == guojixiangqi_queen)
                guojixiangqi_directions.insert(guojixiangqi_directions.end(), { {-1,-1},{-1,1},{1,-1},{1,1} });
            if (guojixiangqi_type == guojixiangqi_rook || guojixiangqi_type == guojixiangqi_queen)
                guojixiangqi_directions.insert(guojixiangqi_directions.end(), { {-1,0},{1,0},{0,-1},{0,1} });
            for (const auto& guojixiangqi_direction : guojixiangqi_directions) // guojixiangqi_direction 是当前滑动方向。
            {
                int guojixiangqi_to_row = guojixiangqi_row + guojixiangqi_direction[0]; // guojixiangqi_to_row 是滑动目标行。
                int guojixiangqi_to_col = guojixiangqi_col + guojixiangqi_direction[1]; // guojixiangqi_to_col 是滑动目标列。
                while (guojixiangqi_inside(guojixiangqi_to_row, guojixiangqi_to_col))
                {
                    const int guojixiangqi_to = guojixiangqi_to_row * 8 + guojixiangqi_to_col; // guojixiangqi_to 是当前滑动目标格。
                    if (guojixiangqi_current.guojixiangqi_squares[guojixiangqi_to] == 0) guojixiangqi_add(guojixiangqi_to);
                    else { guojixiangqi_add(guojixiangqi_to); break; }
                    guojixiangqi_to_row += guojixiangqi_direction[0];
                    guojixiangqi_to_col += guojixiangqi_direction[1];
                }
            }
        }
    }
    return guojixiangqi_result;
}

bool guojixiangqi_board::guojixiangqi_square_attacked(int guojixiangqi_square, int guojixiangqi_by_side) const
{
    const int guojixiangqi_row = guojixiangqi_square / 8; // guojixiangqi_row 是被检查格的行。
    const int guojixiangqi_col = guojixiangqi_square % 8; // guojixiangqi_col 是被检查格的列。
    const int guojixiangqi_sign = guojixiangqi_by_side == 0 ? 1 : -1; // guojixiangqi_sign 是攻击方棋子符号。
    const int guojixiangqi_pawn_row = guojixiangqi_row + (guojixiangqi_by_side == 0 ? 1 : -1); // guojixiangqi_pawn_row 是可能攻击该格的兵所在行。
    for (int guojixiangqi_delta_col : { -1, 1 }) // guojixiangqi_delta_col 是兵攻击来源列增量。
    {
        const int guojixiangqi_source_col = guojixiangqi_col + guojixiangqi_delta_col; // guojixiangqi_source_col 是兵的可能来源列。
        if (guojixiangqi_inside(guojixiangqi_pawn_row, guojixiangqi_source_col) && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_pawn_row * 8 + guojixiangqi_source_col] == guojixiangqi_sign * guojixiangqi_pawn) return true;
    }
    const int guojixiangqi_knight_offsets[8][2] = { {-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1} }; // guojixiangqi_knight_offsets 是马攻击来源偏移。
    for (const auto& guojixiangqi_offset : guojixiangqi_knight_offsets) // guojixiangqi_offset 是当前马偏移。
    {
        const int guojixiangqi_source_row = guojixiangqi_row + guojixiangqi_offset[0]; // guojixiangqi_source_row 是马的可能来源行。
        const int guojixiangqi_source_col = guojixiangqi_col + guojixiangqi_offset[1]; // guojixiangqi_source_col 是马的可能来源列。
        if (guojixiangqi_inside(guojixiangqi_source_row, guojixiangqi_source_col) && guojixiangqi_current.guojixiangqi_squares[guojixiangqi_source_row * 8 + guojixiangqi_source_col] == guojixiangqi_sign * guojixiangqi_knight) return true;
    }
    const int guojixiangqi_directions[8][2] = { {-1,-1},{-1,1},{1,-1},{1,1},{-1,0},{1,0},{0,-1},{0,1} }; // guojixiangqi_directions 是象、车、后的八个攻击方向。
    for (int guojixiangqi_index = 0; guojixiangqi_index < 8; ++guojixiangqi_index) // guojixiangqi_index 是当前攻击方向下标。
    {
        int guojixiangqi_source_row = guojixiangqi_row + guojixiangqi_directions[guojixiangqi_index][0]; // guojixiangqi_source_row 是滑动攻击来源行。
        int guojixiangqi_source_col = guojixiangqi_col + guojixiangqi_directions[guojixiangqi_index][1]; // guojixiangqi_source_col 是滑动攻击来源列。
        int guojixiangqi_distance = 1; // guojixiangqi_distance 是来源与目标间的格数。
        while (guojixiangqi_inside(guojixiangqi_source_row, guojixiangqi_source_col))
        {
            const int guojixiangqi_value = guojixiangqi_current.guojixiangqi_squares[guojixiangqi_source_row * 8 + guojixiangqi_source_col]; // guojixiangqi_value 是攻击射线上遇到的棋子。
            if (guojixiangqi_value != 0)
            {
                if (guojixiangqi_color(guojixiangqi_value) == guojixiangqi_by_side)
                {
                    const int guojixiangqi_type = std::abs(guojixiangqi_value); // guojixiangqi_type 是射线棋子类型。
                    if (guojixiangqi_type == guojixiangqi_queen || (guojixiangqi_index < 4 && guojixiangqi_type == guojixiangqi_bishop) || (guojixiangqi_index >= 4 && guojixiangqi_type == guojixiangqi_rook) || (guojixiangqi_distance == 1 && guojixiangqi_type == guojixiangqi_king)) return true;
                }
                break;
            }
            guojixiangqi_source_row += guojixiangqi_directions[guojixiangqi_index][0];
            guojixiangqi_source_col += guojixiangqi_directions[guojixiangqi_index][1];
            ++guojixiangqi_distance;
        }
    }
    return false;
}

bool guojixiangqi_board::guojixiangqi_in_check(int guojixiangqi_side_value) const
{
    const int guojixiangqi_king_value = guojixiangqi_side_value == 0 ? guojixiangqi_king : -guojixiangqi_king; // guojixiangqi_king_value 是需查找的王编码。
    for (int guojixiangqi_square = 0; guojixiangqi_square < 64; ++guojixiangqi_square) // guojixiangqi_square 是当前查找的棋盘格。
    {
        if (guojixiangqi_current.guojixiangqi_squares[guojixiangqi_square] == guojixiangqi_king_value) return guojixiangqi_square_attacked(guojixiangqi_square, 1 - guojixiangqi_side_value);
    }
    return true;
}

std::vector<guojixiangqi_move> guojixiangqi_board::guojixiangqi_legal_moves() const
{
    std::vector<guojixiangqi_move> guojixiangqi_result; // guojixiangqi_result 收集过滤送王后的合法走法。
    const int guojixiangqi_moving_side = guojixiangqi_current.guojixiangqi_side; // guojixiangqi_moving_side 是生成走法的行动方。
    for (const guojixiangqi_move& guojixiangqi_candidate : guojixiangqi_pseudo_moves()) // guojixiangqi_candidate 是当前伪合法候选走法。
    {
        guojixiangqi_board guojixiangqi_copy = *this; // guojixiangqi_copy 是用来检查送王的临时棋盘。
        guojixiangqi_copy.guojixiangqi_apply_unchecked(guojixiangqi_candidate);
        if (!guojixiangqi_copy.guojixiangqi_in_check(guojixiangqi_moving_side)) guojixiangqi_result.push_back(guojixiangqi_candidate);
    }
    return guojixiangqi_result;
}

std::vector<guojixiangqi_move> guojixiangqi_board::guojixiangqi_legal_moves_from(int guojixiangqi_from) const
{
    std::vector<guojixiangqi_move> guojixiangqi_result; // guojixiangqi_result 收集指定起点的合法走法。
    for (const guojixiangqi_move& guojixiangqi_move_value : guojixiangqi_legal_moves()) // guojixiangqi_move_value 是当前检查的全局合法走法。
        if (guojixiangqi_move_value.guojixiangqi_from == guojixiangqi_from) guojixiangqi_result.push_back(guojixiangqi_move_value);
    return guojixiangqi_result;
}

void guojixiangqi_board::guojixiangqi_apply_unchecked(const guojixiangqi_move& guojixiangqi_move_value)
{
    if (guojixiangqi_move_value.guojixiangqi_from < 0 || guojixiangqi_move_value.guojixiangqi_from >= 64 ||
        guojixiangqi_move_value.guojixiangqi_to < 0 || guojixiangqi_move_value.guojixiangqi_to >= 64) return;
    const int guojixiangqi_piece_value = guojixiangqi_current.guojixiangqi_squares[guojixiangqi_move_value.guojixiangqi_from]; // guojixiangqi_piece_value 是被移动棋子。
    const int guojixiangqi_captured = guojixiangqi_current.guojixiangqi_squares[guojixiangqi_move_value.guojixiangqi_to]; // guojixiangqi_captured 是目标格原棋子。
    const int guojixiangqi_moving_side = guojixiangqi_current.guojixiangqi_side; // guojixiangqi_moving_side 是本步行动方。
    guojixiangqi_current.guojixiangqi_squares[guojixiangqi_move_value.guojixiangqi_from] = 0;
    guojixiangqi_current.guojixiangqi_squares[guojixiangqi_move_value.guojixiangqi_to] = guojixiangqi_piece_value;
    if (std::abs(guojixiangqi_piece_value) == guojixiangqi_pawn && guojixiangqi_move_value.guojixiangqi_to == guojixiangqi_current.guojixiangqi_en_passant && guojixiangqi_captured == 0)
    {
        const int guojixiangqi_capture_square = guojixiangqi_move_value.guojixiangqi_to + (guojixiangqi_moving_side == 0 ? 8 : -8); // guojixiangqi_capture_square 是被吃过路兵的实际格子。
        guojixiangqi_current.guojixiangqi_squares[guojixiangqi_capture_square] = 0;
    }
    if (std::abs(guojixiangqi_piece_value) == guojixiangqi_king && std::abs(guojixiangqi_move_value.guojixiangqi_to - guojixiangqi_move_value.guojixiangqi_from) == 2)
    {
        const bool guojixiangqi_king_side = guojixiangqi_move_value.guojixiangqi_to > guojixiangqi_move_value.guojixiangqi_from; // guojixiangqi_king_side 表示本次是王翼易位。
        const int guojixiangqi_rook_from = guojixiangqi_move_value.guojixiangqi_from + (guojixiangqi_king_side ? 3 : -4); // guojixiangqi_rook_from 是易位车的起点。
        const int guojixiangqi_rook_to = guojixiangqi_move_value.guojixiangqi_from + (guojixiangqi_king_side ? 1 : -1); // guojixiangqi_rook_to 是易位车的终点。
        guojixiangqi_current.guojixiangqi_squares[guojixiangqi_rook_to] = guojixiangqi_current.guojixiangqi_squares[guojixiangqi_rook_from];
        guojixiangqi_current.guojixiangqi_squares[guojixiangqi_rook_from] = 0;
    }
    if (std::abs(guojixiangqi_piece_value) == guojixiangqi_pawn && (guojixiangqi_move_value.guojixiangqi_to / 8 == 0 || guojixiangqi_move_value.guojixiangqi_to / 8 == 7))
        guojixiangqi_current.guojixiangqi_squares[guojixiangqi_move_value.guojixiangqi_to] = (guojixiangqi_piece_value > 0 ? 1 : -1) * (guojixiangqi_move_value.guojixiangqi_promotion ? guojixiangqi_move_value.guojixiangqi_promotion : guojixiangqi_queen);

    if (std::abs(guojixiangqi_piece_value) == guojixiangqi_king) guojixiangqi_current.guojixiangqi_castling &= guojixiangqi_moving_side == 0 ? ~3 : ~12;
    if (guojixiangqi_move_value.guojixiangqi_from == 63 || guojixiangqi_move_value.guojixiangqi_to == 63) guojixiangqi_current.guojixiangqi_castling &= ~1;
    if (guojixiangqi_move_value.guojixiangqi_from == 56 || guojixiangqi_move_value.guojixiangqi_to == 56) guojixiangqi_current.guojixiangqi_castling &= ~2;
    if (guojixiangqi_move_value.guojixiangqi_from == 7 || guojixiangqi_move_value.guojixiangqi_to == 7) guojixiangqi_current.guojixiangqi_castling &= ~4;
    if (guojixiangqi_move_value.guojixiangqi_from == 0 || guojixiangqi_move_value.guojixiangqi_to == 0) guojixiangqi_current.guojixiangqi_castling &= ~8;
    guojixiangqi_current.guojixiangqi_en_passant = -1;
    if (std::abs(guojixiangqi_piece_value) == guojixiangqi_pawn && std::abs(guojixiangqi_move_value.guojixiangqi_to - guojixiangqi_move_value.guojixiangqi_from) == 16)
        guojixiangqi_current.guojixiangqi_en_passant = (guojixiangqi_move_value.guojixiangqi_to + guojixiangqi_move_value.guojixiangqi_from) / 2;
    guojixiangqi_current.guojixiangqi_halfmove = (std::abs(guojixiangqi_piece_value) == guojixiangqi_pawn || guojixiangqi_captured != 0) ? 0 : guojixiangqi_current.guojixiangqi_halfmove + 1;
    if (guojixiangqi_moving_side == 1) ++guojixiangqi_current.guojixiangqi_fullmove;
    guojixiangqi_current.guojixiangqi_side = 1 - guojixiangqi_moving_side;
}

bool guojixiangqi_board::guojixiangqi_make_move(const guojixiangqi_move& guojixiangqi_move_value)
{
    if (guojixiangqi_move_value.guojixiangqi_from < 0 || guojixiangqi_move_value.guojixiangqi_from >= 64 ||
        guojixiangqi_move_value.guojixiangqi_to < 0 || guojixiangqi_move_value.guojixiangqi_to >= 64) return false;
    if (guojixiangqi_move_value.guojixiangqi_promotion != 0 && guojixiangqi_move_value.guojixiangqi_promotion != guojixiangqi_knight &&
        guojixiangqi_move_value.guojixiangqi_promotion != guojixiangqi_bishop && guojixiangqi_move_value.guojixiangqi_promotion != guojixiangqi_rook &&
        guojixiangqi_move_value.guojixiangqi_promotion != guojixiangqi_queen) return false;
    const std::vector<guojixiangqi_move> guojixiangqi_moves_value = guojixiangqi_legal_moves(); // guojixiangqi_moves_value 是当前全部合法走法。
    auto guojixiangqi_iterator = std::find_if(guojixiangqi_moves_value.begin(), guojixiangqi_moves_value.end(), [&](const guojixiangqi_move& guojixiangqi_candidate)
    {
        return guojixiangqi_candidate.guojixiangqi_from == guojixiangqi_move_value.guojixiangqi_from && guojixiangqi_candidate.guojixiangqi_to == guojixiangqi_move_value.guojixiangqi_to &&
               (guojixiangqi_move_value.guojixiangqi_promotion == 0 || guojixiangqi_candidate.guojixiangqi_promotion == guojixiangqi_move_value.guojixiangqi_promotion);
    }); // guojixiangqi_iterator 指向与请求匹配的合法走法。
    if (guojixiangqi_iterator == guojixiangqi_moves_value.end()) return false;
    guojixiangqi_move guojixiangqi_selected = *guojixiangqi_iterator; // guojixiangqi_selected 是最终执行的合法走法。
    if (guojixiangqi_selected.guojixiangqi_promotion && guojixiangqi_move_value.guojixiangqi_promotion == 0) guojixiangqi_selected.guojixiangqi_promotion = guojixiangqi_queen;
    guojixiangqi_history.push_back(guojixiangqi_current);
    guojixiangqi_moves.push_back(guojixiangqi_to_uci(guojixiangqi_selected));
    guojixiangqi_apply_unchecked(guojixiangqi_selected);
    return true;
}

bool guojixiangqi_board::guojixiangqi_make_uci(const std::string& guojixiangqi_uci)
{
    if (guojixiangqi_uci.size() < 4) return false;
    const int guojixiangqi_from_col = guojixiangqi_uci[0] - 'a'; // guojixiangqi_from_col 是 UCI 起点列。
    const int guojixiangqi_from_row = 8 - (guojixiangqi_uci[1] - '0'); // guojixiangqi_from_row 是 UCI 起点行。
    const int guojixiangqi_to_col = guojixiangqi_uci[2] - 'a'; // guojixiangqi_to_col 是 UCI 终点列。
    const int guojixiangqi_to_row = 8 - (guojixiangqi_uci[3] - '0'); // guojixiangqi_to_row 是 UCI 终点行。
    if (!guojixiangqi_inside(guojixiangqi_from_row, guojixiangqi_from_col) || !guojixiangqi_inside(guojixiangqi_to_row, guojixiangqi_to_col)) return false;
    int guojixiangqi_promotion_value = 0; // guojixiangqi_promotion_value 是 UCI 第五个字符表示的升变类型。
    if (guojixiangqi_uci.size() >= 5)
    {
        if (guojixiangqi_uci[4] == 'n') guojixiangqi_promotion_value = guojixiangqi_knight;
        else if (guojixiangqi_uci[4] == 'b') guojixiangqi_promotion_value = guojixiangqi_bishop;
        else if (guojixiangqi_uci[4] == 'r') guojixiangqi_promotion_value = guojixiangqi_rook;
        else guojixiangqi_promotion_value = guojixiangqi_queen;
    }
    return guojixiangqi_make_move({ guojixiangqi_from_row * 8 + guojixiangqi_from_col, guojixiangqi_to_row * 8 + guojixiangqi_to_col, guojixiangqi_promotion_value });
}

bool guojixiangqi_board::guojixiangqi_undo()
{
    if (guojixiangqi_history.empty()) return false;
    guojixiangqi_current = guojixiangqi_history.back();
    guojixiangqi_history.pop_back();
    if (!guojixiangqi_moves.empty()) guojixiangqi_moves.pop_back();
    return true;
}

bool guojixiangqi_board::guojixiangqi_game_over() const
{
    return guojixiangqi_current.guojixiangqi_halfmove >= 100 || guojixiangqi_legal_moves().empty();
}

std::wstring guojixiangqi_board::guojixiangqi_result_text() const
{
    if (guojixiangqi_current.guojixiangqi_halfmove >= 100) return L"五十步规则，和棋";
    if (guojixiangqi_legal_moves().empty())
    {
        if (guojixiangqi_in_check(guojixiangqi_current.guojixiangqi_side)) return guojixiangqi_current.guojixiangqi_side == 0 ? L"白方被将死，黑方获胜" : L"黑方被将死，白方获胜";
        return L"无子可动，和棋";
    }
    std::wstring guojixiangqi_text = guojixiangqi_current.guojixiangqi_side == 0 ? L"白方行棋" : L"黑方行棋"; // guojixiangqi_text 是当前状态提示。
    if (guojixiangqi_in_check(guojixiangqi_current.guojixiangqi_side)) guojixiangqi_text += L"（将军）";
    return guojixiangqi_text;
}

const std::vector<std::string>& guojixiangqi_board::guojixiangqi_uci_history() const
{
    return guojixiangqi_moves;
}

std::string guojixiangqi_board::guojixiangqi_to_uci(const guojixiangqi_move& guojixiangqi_move_value)
{
    if (guojixiangqi_move_value.guojixiangqi_from < 0 || guojixiangqi_move_value.guojixiangqi_from >= 64 ||
        guojixiangqi_move_value.guojixiangqi_to < 0 || guojixiangqi_move_value.guojixiangqi_to >= 64) return {};
    std::string guojixiangqi_text; // guojixiangqi_text 保存生成的 UCI 坐标。
    guojixiangqi_text += static_cast<char>('a' + guojixiangqi_move_value.guojixiangqi_from % 8);
    guojixiangqi_text += static_cast<char>('8' - guojixiangqi_move_value.guojixiangqi_from / 8);
    guojixiangqi_text += static_cast<char>('a' + guojixiangqi_move_value.guojixiangqi_to % 8);
    guojixiangqi_text += static_cast<char>('8' - guojixiangqi_move_value.guojixiangqi_to / 8);
    if (guojixiangqi_move_value.guojixiangqi_promotion)
    {
        const char guojixiangqi_promotions[] = { 'q','q','n','b','r','q','q' }; // guojixiangqi_promotions 是内部棋子类型到 UCI 升变字符的映射。
        if (guojixiangqi_move_value.guojixiangqi_promotion < 2 || guojixiangqi_move_value.guojixiangqi_promotion > 5) return {};
        guojixiangqi_text += guojixiangqi_promotions[guojixiangqi_move_value.guojixiangqi_promotion];
    }
    return guojixiangqi_text;
}
