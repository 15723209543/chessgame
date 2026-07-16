#pragma once

#include "guojixiangqi_board.h"
#include "guojixiangqi_analysis.h"
#include "guojixiangqi_robot.h"
#include "../qilei_common.h"

#include <string>
#include <vector>

// guojixiangqi_session 封装一局国际象棋的 EasyX 界面与输入循环。
class guojixiangqi_session
{
public:
    // guojixiangqi_run 根据设置运行完整国际象棋对局。
    int guojixiangqi_run(const qilei_game_setting& guojixiangqi_setting);

private:
    // guojixiangqi_draw 绘制棋盘、棋子、合法落点、计时和操作面板。
    void guojixiangqi_draw(const qilei_game_setting& guojixiangqi_setting, const std::wstring& guojixiangqi_status) const;

    // guojixiangqi_click_square 处理玩家点击棋盘格子的选子或走子。
    bool guojixiangqi_click_square(int guojixiangqi_square);

    // guojixiangqi_finish_move 执行已确认的普通走法或指定类型的升变走法。
    bool guojixiangqi_finish_move(const guojixiangqi_move& guojixiangqi_move_value);

    // guojixiangqi_choose_promotion 处理右侧后、车、象、马升变选项。
    bool guojixiangqi_choose_promotion(int guojixiangqi_piece_type);

    // guojixiangqi_reset_round 重置棋盘、计时、提示与本局结果记录。
    void guojixiangqi_reset_round(const qilei_game_setting& guojixiangqi_setting);

    // guojixiangqi_make_hint 使用 Stockfish 或后备搜索计算并保存推荐着。
    void guojixiangqi_make_hint(const qilei_game_setting& guojixiangqi_setting);

    // guojixiangqi_log_analysis 将当前胜负预测写入本局日志。
    void guojixiangqi_log_analysis();

    guojixiangqi_board guojixiangqi_board_value;        // guojixiangqi_board_value 是当前国际象棋棋盘。
    guojixiangqi_robot guojixiangqi_robot_value;        // guojixiangqi_robot_value 是 Stockfish/内置机器人。
    qilei_clock guojixiangqi_clock_value;                // guojixiangqi_clock_value 是双方计时器。
    qilei_result_logger guojixiangqi_logger;             // guojixiangqi_logger 是对局结果记录器。
    int guojixiangqi_selected = -1;                      // guojixiangqi_selected 是当前选中的棋盘格。
    std::vector<guojixiangqi_move> guojixiangqi_targets; // guojixiangqi_targets 是当前选中棋子的合法落点。
    guojixiangqi_move guojixiangqi_hint_move;             // guojixiangqi_hint_move 是当前显示的推荐走法。
    bool guojixiangqi_hint_visible = false;                // guojixiangqi_hint_visible 表示棋盘是否绘制推荐着。
    guojixiangqi_move guojixiangqi_pending_move;           // guojixiangqi_pending_move 是等待再次点击或选择升变的走法。
    bool guojixiangqi_pending_visible = false;             // guojixiangqi_pending_visible 表示终点格是否只显示确认轮廓。
    bool guojixiangqi_promotion_waiting = false;           // guojixiangqi_promotion_waiting 表示右侧正在等待升变类型。
    std::wstring guojixiangqi_operation_text;              // guojixiangqi_operation_text 保存右侧“本次操作”文字。
};
