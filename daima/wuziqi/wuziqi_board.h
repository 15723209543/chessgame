#pragma once

#include <array>
#include <string>
#include <vector>

// wuziqi_move 描述一步 15 路五子棋的行列坐标。
struct wuziqi_move
{
    int wuziqi_row = -1; // wuziqi_row 是 0~14 的落子行。
    int wuziqi_col = -1; // wuziqi_col 是 0~14 的落子列。
};

// wuziqi_board 封装 15 路无禁手五子棋规则、胜负判断和悔棋。
class wuziqi_board
{
public:
    // wuziqi_reset 清空棋盘并让黑方先行。
    void wuziqi_reset();

    // wuziqi_stone 返回指定交叉点棋子，1 黑、2 白。
    int wuziqi_stone(int wuziqi_row, int wuziqi_col) const;

    // wuziqi_side 返回当前行动方，0 黑、1 白。
    int wuziqi_side() const;

    // wuziqi_play 在空交叉点执行落子并切换行动方。
    bool wuziqi_play(const wuziqi_move& wuziqi_move_value);

    // wuziqi_undo 撤回上一步落子。
    bool wuziqi_undo();

    // wuziqi_winner 返回获胜棋子编码，未分胜负时返回 0。
    int wuziqi_winner() const;

    // wuziqi_full 判断棋盘是否已经下满。
    bool wuziqi_full() const;

    // wuziqi_game_over 判断是否已连成五子或和棋。
    bool wuziqi_game_over() const;

    // wuziqi_result_text 返回当前行棋方或终局结果。
    std::wstring wuziqi_result_text() const;

    // wuziqi_move_history 返回全部已走坐标，用于同步 Rapfi 引擎。
    const std::vector<wuziqi_move>& wuziqi_move_history() const;

private:
    std::array<int, 225> wuziqi_points{}; // wuziqi_points 保存 15x15 棋盘。
    std::vector<wuziqi_move> wuziqi_moves; // wuziqi_moves 保存所有已执行落子。
    int wuziqi_current_side = 0;           // wuziqi_current_side 是当前行动方。
};
