#pragma once

#include <array>
#include <string>
#include <vector>

// weiqi_move 描述一步围棋的行列，weiqi_pass 为 true 时表示停一手。
struct weiqi_move
{
    int weiqi_row = -1;      // weiqi_row 是 0~18 的落子行。
    int weiqi_col = -1;      // weiqi_col 是 0~18 的落子列。
    bool weiqi_pass = false; // weiqi_pass 表示该步是停一手。
};

// weiqi_position 保存围棋悔棋所需的完整局面快照。
struct weiqi_position
{
    std::array<int, 361> weiqi_points{}; // weiqi_points 保存 19x19 棋盘，1 黑、2 白。
    int weiqi_side = 0;                  // weiqi_side 为 0 黑方、1 白方。
    int weiqi_consecutive_passes = 0;    // weiqi_consecutive_passes 是连续停一手次数。
    std::array<int, 2> weiqi_captures{};  // weiqi_captures 保存黑方、白方分别提掉的对方棋子数。
};

// weiqi_board 封装 19 路中国数子规则、提子、禁入点、简单劫和计分。
class weiqi_board
{
public:
    // weiqi_reset 清空棋盘并让黑方先行。
    void weiqi_reset();

    // weiqi_stone 返回指定交叉点的棋子编码。
    int weiqi_stone(int weiqi_row, int weiqi_col) const;

    // weiqi_side 返回当前行动方，0 黑、1 白。
    int weiqi_side() const;

    // weiqi_stone_count 返回指定一方当前仍在棋盘上的棋子数量。
    int weiqi_stone_count(int weiqi_side_value) const;

    // weiqi_capture_count 返回指定一方本局已经提掉的对方棋子数量。
    int weiqi_capture_count(int weiqi_side_value) const;

    // weiqi_play 按提子、禁入点和简单劫规则校验并执行落子。
    bool weiqi_play(const weiqi_move& weiqi_move_value);

    // weiqi_legal 判断指定交叉点是否可以合法落子。
    bool weiqi_legal(int weiqi_row, int weiqi_col) const;

    // weiqi_legal_moves 生成全部合法落子点，不包含停一手。
    std::vector<weiqi_move> weiqi_legal_moves() const;

    // weiqi_undo 撤回上一手并恢复提子与连续停手状态。
    bool weiqi_undo();

    // weiqi_game_over 判断双方是否已连续停一手。
    bool weiqi_game_over() const;

    // weiqi_score 按中国数子法返回黑方、白方面积分，白方含 7.5 目贴目。
    std::pair<double, double> weiqi_score() const;

    // weiqi_result_text 返回当前行动提示或数子结果。
    std::wstring weiqi_result_text() const;

    // weiqi_move_history 返回已走步骤，用于向 KataGo 重放局面。
    const std::vector<weiqi_move>& weiqi_move_history() const;

private:
    // weiqi_collect_group 收集同色相连块并计算气数。
    std::vector<int> weiqi_collect_group(const std::array<int, 361>& weiqi_points, int weiqi_start, int& weiqi_liberties) const;

    // weiqi_apply_to_points 在棋盘副本上执行落子与提子，返回是否非自杀。
    bool weiqi_apply_to_points(std::array<int, 361>& weiqi_points, int weiqi_side_value, int weiqi_row, int weiqi_col, int* weiqi_captured_count = nullptr) const;

    weiqi_position weiqi_current;              // weiqi_current 是当前围棋局面。
    std::vector<weiqi_position> weiqi_history; // weiqi_history 保存每步之前的快照。
    std::vector<weiqi_move> weiqi_moves;       // weiqi_moves 保存已执行落子与停手。
};
