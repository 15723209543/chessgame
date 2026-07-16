#pragma once

#include <array>
#include <string>
#include <vector>

// guojixiangqi_move 描述一步国际象棋的起点、终点与升变类型。
struct guojixiangqi_move
{
    int guojixiangqi_from = -1;       // guojixiangqi_from 是 0~63 的起点格编号。
    int guojixiangqi_to = -1;         // guojixiangqi_to 是 0~63 的终点格编号。
    int guojixiangqi_promotion = 0;   // guojixiangqi_promotion 是兵到底线后的升变棋子，默认为后。
};

// guojixiangqi_position 保存可完整恢复的一个国际象棋局面。
struct guojixiangqi_position
{
    std::array<int, 64> guojixiangqi_squares{}; // guojixiangqi_squares 保存棋盘，正数白子、负数黑子。
    int guojixiangqi_side = 0;                  // guojixiangqi_side 为 0 白方行棋、1 黑方行棋。
    int guojixiangqi_castling = 15;             // guojixiangqi_castling 用四个位保存双方王车易位权利。
    int guojixiangqi_en_passant = -1;           // guojixiangqi_en_passant 是当前可吃过路兵的目标格。
    int guojixiangqi_halfmove = 0;              // guojixiangqi_halfmove 是五十步规则使用的半回合计数。
    int guojixiangqi_fullmove = 1;              // guojixiangqi_fullmove 是从 1 开始的回合数。
};

// guojixiangqi_board 封装标准国际象棋棋盘、合法性、将军与悔棋。
class guojixiangqi_board
{
public:
    // guojixiangqi_reset 恢复标准国际象棋开局。
    void guojixiangqi_reset();

    // guojixiangqi_piece 返回指定格的棋子编码。
    int guojixiangqi_piece(int guojixiangqi_square) const;

    // guojixiangqi_side 返回当前行动方，0 白、1 黑。
    int guojixiangqi_side() const;

    // guojixiangqi_legal_moves 生成当前行动方全部不会送王的合法走法。
    std::vector<guojixiangqi_move> guojixiangqi_legal_moves() const;

    // guojixiangqi_legal_moves_from 生成某一起点棋子的全部合法走法。
    std::vector<guojixiangqi_move> guojixiangqi_legal_moves_from(int guojixiangqi_from) const;

    // guojixiangqi_make_move 执行一步已校验走法并保存悔棋快照。
    bool guojixiangqi_make_move(const guojixiangqi_move& guojixiangqi_move_value);

    // guojixiangqi_make_uci 校验并执行一步 UCI 坐标走法。
    bool guojixiangqi_make_uci(const std::string& guojixiangqi_uci);

    // guojixiangqi_undo 撤回上一步并删除对应 UCI 历史。
    bool guojixiangqi_undo();

    // guojixiangqi_in_check 判断指定一方的王是否正在被攻击。
    bool guojixiangqi_in_check(int guojixiangqi_side_value) const;

    // guojixiangqi_game_over 判断当前局面是否已经将死、逼和或达到五十步。
    bool guojixiangqi_game_over() const;

    // guojixiangqi_result_text 返回当前结束原因或行动方提示。
    std::wstring guojixiangqi_result_text() const;

    // guojixiangqi_uci_history 返回从标准开局开始的 UCI 走法序列。
    const std::vector<std::string>& guojixiangqi_uci_history() const;

    // guojixiangqi_to_uci 把内部走法转换为 UCI 坐标文本。
    static std::string guojixiangqi_to_uci(const guojixiangqi_move& guojixiangqi_move_value);

private:
    // guojixiangqi_pseudo_moves 生成未过滤送王的伪合法走法。
    std::vector<guojixiangqi_move> guojixiangqi_pseudo_moves() const;

    // guojixiangqi_square_attacked 判断格子是否被指定一方攻击。
    bool guojixiangqi_square_attacked(int guojixiangqi_square, int guojixiangqi_by_side) const;

    // guojixiangqi_apply_unchecked 执行不再检查合法性的内部走法。
    void guojixiangqi_apply_unchecked(const guojixiangqi_move& guojixiangqi_move_value);

    guojixiangqi_position guojixiangqi_current;              // guojixiangqi_current 是当前局面。
    std::vector<guojixiangqi_position> guojixiangqi_history; // guojixiangqi_history 保存每步之前的悔棋快照。
    std::vector<std::string> guojixiangqi_moves;             // guojixiangqi_moves 保存已执行的 UCI 走法。
};
