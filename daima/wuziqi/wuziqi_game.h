#pragma once

#include "wuziqi_board.h"
#include "wuziqi_analysis.h"
#include "wuziqi_robot.h"
#include "../qilei_common.h"

#include <string>

// wuziqi_session 封装一局五子棋的 EasyX 界面、计时、输入和 Rapfi 调度。
class wuziqi_session
{
public:
    // wuziqi_run 根据设置运行一局完整五子棋。
    int wuziqi_run(const qilei_game_setting& wuziqi_setting);

private:
    // wuziqi_draw 绘制棋盘、星位、棋子、计时与按钮。
    void wuziqi_draw(const std::wstring& wuziqi_status) const;

    // wuziqi_log_move 把落子坐标写入统一结果日志。
    void wuziqi_log_move(const std::wstring& wuziqi_actor, const wuziqi_move& wuziqi_move_value);

    // wuziqi_reset_round 重置棋盘、计时、提示与本局结果记录。
    void wuziqi_reset_round(const qilei_game_setting& wuziqi_setting);

    // wuziqi_make_hint 使用 Rapfi 或后备算法计算并保存推荐落点。
    void wuziqi_make_hint(const qilei_game_setting& wuziqi_setting);

    // wuziqi_log_analysis 将当前胜负预测写入本局日志。
    void wuziqi_log_analysis();

    wuziqi_board wuziqi_board_value;      // wuziqi_board_value 是当前五子棋棋盘。
    wuziqi_robot wuziqi_robot_value;      // wuziqi_robot_value 是 Rapfi/内置机器人。
    qilei_clock wuziqi_clock_value;       // wuziqi_clock_value 是黑白双方倒计时器。
    qilei_result_logger wuziqi_logger;    // wuziqi_logger 是统一结果日志记录器。
    wuziqi_move wuziqi_hint_move;         // wuziqi_hint_move 是当前显示的推荐落点。
    bool wuziqi_hint_visible = false;      // wuziqi_hint_visible 表示棋盘是否绘制推荐落点。
    wuziqi_move wuziqi_pending_move;       // wuziqi_pending_move 是等待玩家第二次点击确认的落点。
    bool wuziqi_pending_visible = false;   // wuziqi_pending_visible 表示棋盘是否显示待确认落点轮廓。
    int wuziqi_robot_confirm_phase = 0;    // wuziqi_robot_confirm_phase 表示机器人选择落点和确认落子两阶段。
    unsigned long long wuziqi_robot_confirm_tick = 0; // wuziqi_robot_confirm_tick 表示机器人当前确认阶段开始时刻。
    std::wstring wuziqi_operation_text;    // wuziqi_operation_text 保存右侧“本次操作”区域显示的文字。
};
