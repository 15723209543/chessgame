#pragma once

#include "guojixiangqi_board.h"
#include "../qilei_common.h"

#include <string>

// guojixiangqi_robot 优先使用 Stockfish 18 UCI 引擎，引擎不可用时使用内置 alpha-beta 机器人。
class guojixiangqi_robot
{
public:
    // guojixiangqi_start 启动并初始化 Stockfish UCI 引擎。
    bool guojixiangqi_start();

    // guojixiangqi_choose_move 为当前局面返回一步合法走法。
    guojixiangqi_move guojixiangqi_choose_move(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_think_ms);

    // guojixiangqi_engine_name 返回当前实际使用的机器人名称。
    std::wstring guojixiangqi_engine_name() const;

private:
    // guojixiangqi_choose_local 使用内置 alpha-beta 搜索选择走法。
    guojixiangqi_move guojixiangqi_choose_local(const guojixiangqi_board& guojixiangqi_board_value) const;

    // guojixiangqi_search 递归搜索固定深度国际象棋局面。
    int guojixiangqi_search(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_depth, int guojixiangqi_alpha, int guojixiangqi_beta, int guojixiangqi_root_side) const;

    // guojixiangqi_evaluate 从指定一方视角评估材力和中心控制。
    int guojixiangqi_evaluate(const guojixiangqi_board& guojixiangqi_board_value, int guojixiangqi_root_side) const;

    qilei_engine_process guojixiangqi_engine; // guojixiangqi_engine 是 Stockfish 子进程与管道。
    bool guojixiangqi_stockfish_ready = false; // guojixiangqi_stockfish_ready 表示 Stockfish 是否已完成 UCI 初始化。
};
