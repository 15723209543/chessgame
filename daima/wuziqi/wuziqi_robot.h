#pragma once

#include "wuziqi_board.h"
#include "../qilei_common.h"

// wuziqi_robot 优先使用 Rapfi Piskvork 引擎，引擎不可用时使用内置连型启发式机器人。
class wuziqi_robot
{
public:
    // wuziqi_start 启动 Rapfi 并使用 START 15 初始化标准棋盘。
    bool wuziqi_start();

    // wuziqi_choose_move 为当前棋盘返回一步合法落子。
    wuziqi_move wuziqi_choose_move(const wuziqi_board& wuziqi_board_value, int wuziqi_think_ms);

    // wuziqi_engine_name 返回当前实际使用的机器人名称。
    std::wstring wuziqi_engine_name() const;

    // wuziqi_stop 使用 Piskvork END 命令安全结束 Rapfi 并释放通信句柄。
    void wuziqi_stop();

private:
    // wuziqi_choose_local 用必胜、必防和连型分值选择后备落子。
    wuziqi_move wuziqi_choose_local(const wuziqi_board& wuziqi_board_value) const;

    // wuziqi_pattern_score 评估在指定点为某方落子后的四向连型分值。
    int wuziqi_pattern_score(const wuziqi_board& wuziqi_board_value, int wuziqi_row, int wuziqi_col, int wuziqi_stone_value) const;

    qilei_engine_process wuziqi_engine; // wuziqi_engine 是 Rapfi 子进程与 Piskvork 管道。
    bool wuziqi_rapfi_ready = false;     // wuziqi_rapfi_ready 表示 Rapfi 是否已完成 START 初始化。
};
