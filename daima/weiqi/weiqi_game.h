#pragma once

#include "weiqi_board.h"
#include "weiqi_analysis.h"
#include "weiqi_robot.h"
#include "../qilei_common.h"

#include <string>

// weiqi_session 封装一局 19 路围棋的 EasyX 界面、计时、输入与机器人调度。
class weiqi_session
{
public:
    // weiqi_run 根据设置运行一局完整围棋。
    int weiqi_run(const qilei_game_setting& weiqi_setting);

private:
    // weiqi_draw 绘制棋盘、星位、棋子、计时和操作面板。
    void weiqi_draw(const std::wstring& weiqi_status) const;

    // weiqi_log_move 把落子或停一手转换为中文日志。
    void weiqi_log_move(const std::wstring& weiqi_actor, const weiqi_move& weiqi_move_value);

    // weiqi_reset_round 重置棋盘、计时、提示与本局结果记录。
    void weiqi_reset_round(const qilei_game_setting& weiqi_setting);

    // weiqi_make_hint 使用 KataGo 或后备算法计算并保存推荐落点。
    void weiqi_make_hint(const qilei_game_setting& weiqi_setting);

    // weiqi_log_analysis 将当前胜负预测写入本局日志。
    void weiqi_log_analysis();

    weiqi_board weiqi_board_value;        // weiqi_board_value 是当前 19 路棋盘与规则对象。
    weiqi_robot weiqi_robot_value;        // weiqi_robot_value 是 KataGo/内置后备机器人。
    qilei_clock weiqi_clock_value;        // weiqi_clock_value 是黑白双方倒计时器。
    qilei_result_logger weiqi_logger;     // weiqi_logger 是统一结果目录日志记录器。
    weiqi_move weiqi_hint_move;           // weiqi_hint_move 是当前显示的推荐落点。
    bool weiqi_hint_visible = false;       // weiqi_hint_visible 表示棋盘是否绘制推荐落点。
    weiqi_move weiqi_pending_move;         // weiqi_pending_move 是等待玩家第二次点击确认的落点。
    bool weiqi_pending_visible = false;    // weiqi_pending_visible 表示棋盘是否显示待确认落点轮廓。
    std::wstring weiqi_operation_text;     // weiqi_operation_text 保存右侧“本次操作”区域显示的文字。
};
