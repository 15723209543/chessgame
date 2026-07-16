#include "wuziqi_game.h"

#include <graphics.h>
#include <windows.h>

#include <cmath>

namespace
{
    constexpr int wuziqi_window_width = 1120; // wuziqi_window_width 是五子棋窗口宽度。
    constexpr int wuziqi_window_height = 820; // wuziqi_window_height 是五子棋窗口高度。
    constexpr int wuziqi_board_left = 62;     // wuziqi_board_left 是棋盘第一条纵线横坐标。
    constexpr int wuziqi_board_top = 66;      // wuziqi_board_top 是棋盘第一条横线纵坐标。
    constexpr int wuziqi_spacing = 49;        // wuziqi_spacing 是棋盘相邻交叉点间距。
    constexpr int wuziqi_panel_left = 800;    // wuziqi_panel_left 是右侧信息面板左边界。

    // wuziqi_draw_button 绘制右侧面板操作按钮。
    void wuziqi_draw_button(int wuziqi_left, int wuziqi_top, int wuziqi_width, const std::wstring& wuziqi_text, COLORREF wuziqi_color)
    {
        setfillcolor(wuziqi_color);
        setlinecolor(wuziqi_color);
        fillroundrect(wuziqi_left, wuziqi_top, wuziqi_left + wuziqi_width, wuziqi_top + 48, 10, 10);
        setbkmode(TRANSPARENT);
        settextcolor(WHITE);
        settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT wuziqi_rect = { wuziqi_left, wuziqi_top, wuziqi_left + wuziqi_width, wuziqi_top + 48 }; // wuziqi_rect 是按钮文字绘制区域。
        drawtext(wuziqi_text.c_str(), &wuziqi_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
}

void wuziqi_session::wuziqi_draw(const std::wstring& wuziqi_status) const
{
    setbkcolor(RGB(235, 211, 164));
    cleardevice();
    setfillcolor(RGB(224, 187, 116));
    solidrectangle(24, 26, 760, 784);
    setlinecolor(RGB(67, 50, 31));
    setlinestyle(PS_SOLID, 1);
    for (int wuziqi_index = 0; wuziqi_index < 15; ++wuziqi_index) // wuziqi_index 是当前绘制的棋盘线下标。
    {
        line(wuziqi_board_left, wuziqi_board_top + wuziqi_index * wuziqi_spacing, wuziqi_board_left + 14 * wuziqi_spacing, wuziqi_board_top + wuziqi_index * wuziqi_spacing);
        line(wuziqi_board_left + wuziqi_index * wuziqi_spacing, wuziqi_board_top, wuziqi_board_left + wuziqi_index * wuziqi_spacing, wuziqi_board_top + 14 * wuziqi_spacing);
    }
    const int wuziqi_stars[5][2] = { {3,3},{3,11},{7,7},{11,3},{11,11} }; // wuziqi_stars 是 15 路棋盘五个星位。
    setfillcolor(RGB(52, 39, 25));
    for (const auto& wuziqi_star : wuziqi_stars) fillcircle(wuziqi_board_left + wuziqi_star[1] * wuziqi_spacing, wuziqi_board_top + wuziqi_star[0] * wuziqi_spacing, 5); // wuziqi_star 是当前星位行列。
    for (int wuziqi_row = 0; wuziqi_row < 15; ++wuziqi_row) // wuziqi_row 是当前绘制棋子行。
    {
        for (int wuziqi_col = 0; wuziqi_col < 15; ++wuziqi_col) // wuziqi_col 是当前绘制棋子列。
        {
            const int wuziqi_stone_value = wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col); // wuziqi_stone_value 是当前交叉点棋子。
            if (!wuziqi_stone_value) continue;
            setfillcolor(wuziqi_stone_value == 1 ? RGB(28, 31, 33) : RGB(247, 245, 237));
            setlinecolor(wuziqi_stone_value == 1 ? RGB(15, 17, 18) : RGB(148, 144, 136));
            fillcircle(wuziqi_board_left + wuziqi_col * wuziqi_spacing, wuziqi_board_top + wuziqi_row * wuziqi_spacing, 22);
        }
    }
    if (!wuziqi_board_value.wuziqi_move_history().empty())
    {
        const wuziqi_move& wuziqi_last = wuziqi_board_value.wuziqi_move_history().back(); // wuziqi_last 是最近一步落子。
        setfillcolor(wuziqi_board_value.wuziqi_stone(wuziqi_last.wuziqi_row, wuziqi_last.wuziqi_col) == 1 ? WHITE : BLACK);
        fillcircle(wuziqi_board_left + wuziqi_last.wuziqi_col * wuziqi_spacing, wuziqi_board_top + wuziqi_last.wuziqi_row * wuziqi_spacing, 5);
    }
    if (wuziqi_hint_visible)
    {
        const int wuziqi_hint_x = wuziqi_board_left + wuziqi_hint_move.wuziqi_col * wuziqi_spacing; // wuziqi_hint_x 是推荐落点的中心横坐标。
        const int wuziqi_hint_y = wuziqi_board_top + wuziqi_hint_move.wuziqi_row * wuziqi_spacing; // wuziqi_hint_y 是推荐落点的中心纵坐标。
        setlinecolor(RGB(209, 44, 37));
        setlinestyle(PS_SOLID, 4);
        circle(wuziqi_hint_x, wuziqi_hint_y, 18);
        line(wuziqi_hint_x - 10, wuziqi_hint_y, wuziqi_hint_x + 10, wuziqi_hint_y);
        line(wuziqi_hint_x, wuziqi_hint_y - 10, wuziqi_hint_x, wuziqi_hint_y + 10);
    }
    if (wuziqi_pending_visible)
    {
        const int wuziqi_pending_x = wuziqi_board_left + wuziqi_pending_move.wuziqi_col * wuziqi_spacing; // wuziqi_pending_x 是待确认落点轮廓中心横坐标。
        const int wuziqi_pending_y = wuziqi_board_top + wuziqi_pending_move.wuziqi_row * wuziqi_spacing; // wuziqi_pending_y 是待确认落点轮廓中心纵坐标。
        setlinecolor(RGB(42, 119, 184));
        setlinestyle(PS_SOLID, 4);
        circle(wuziqi_pending_x, wuziqi_pending_y, 21);
        setlinestyle(PS_SOLID, 1);
    }
    setbkmode(TRANSPARENT);
    settextcolor(RGB(82, 61, 36));
    settextstyle(14, 0, L"Microsoft YaHei");
    for (int wuziqi_index = 0; wuziqi_index < 15; ++wuziqi_index) // wuziqi_index 是行列坐标标注下标。
    {
        outtextxy(wuziqi_board_left + wuziqi_index * wuziqi_spacing - 5, 768, std::wstring(1, static_cast<wchar_t>(L'A' + wuziqi_index)).c_str());
        outtextxy(38, wuziqi_board_top + wuziqi_index * wuziqi_spacing - 9, std::to_wstring(15 - wuziqi_index).c_str());
    }

    setfillcolor(RGB(34, 49, 63));
    solidrectangle(wuziqi_panel_left, 0, wuziqi_window_width, wuziqi_window_height);
    settextcolor(WHITE);
    settextstyle(34, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 18, L"五子棋");

    settextcolor(RGB(230, 197, 111));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 68, L"本次操作");
    setfillcolor(RGB(42, 60, 75));
    setlinecolor(RGB(121, 104, 58));
    setlinestyle(PS_SOLID, 2);
    fillroundrect(wuziqi_panel_left + 18, 96, wuziqi_window_width - 18, 168, 10, 10);
    settextcolor(RGB(225, 234, 239));
    settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT wuziqi_status_rect = { wuziqi_panel_left + 30, 102, wuziqi_window_width - 30, 162 }; // wuziqi_status_rect 是本次操作文字区域。
    drawtext(wuziqi_status.c_str(), &wuziqi_status_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);

    int wuziqi_black_stones = 0; // wuziqi_black_stones 是黑方当前场上棋子数。
    int wuziqi_white_stones = 0; // wuziqi_white_stones 是白方当前场上棋子数。
    for (int wuziqi_row = 0; wuziqi_row < 15; ++wuziqi_row)
        for (int wuziqi_col = 0; wuziqi_col < 15; ++wuziqi_col)
            if (wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) == 1) ++wuziqi_black_stones;
            else if (wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) == 2) ++wuziqi_white_stones;
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 182, L"黑方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 212, (L"场上 " + std::to_wstring(wuziqi_black_stones) + L" 子 · 已走 " + std::to_wstring(wuziqi_black_stones) + L" 手").c_str());
    settextstyle(18, 0, L"Microsoft YaHei");
    outtextxy(wuziqi_panel_left + 22, 242, (L"步时 " + qilei_clock::qilei_format(wuziqi_clock_value.qilei_step_remaining) + L" · 局时 " + qilei_clock::qilei_format(wuziqi_clock_value.qilei_total_remaining[0])).c_str());
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 278, L"白方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 308, (L"场上 " + std::to_wstring(wuziqi_white_stones) + L" 子 · 已走 " + std::to_wstring(wuziqi_white_stones) + L" 手").c_str());
    settextstyle(18, 0, L"Microsoft YaHei");
    outtextxy(wuziqi_panel_left + 22, 338, (L"步时 " + qilei_clock::qilei_format(wuziqi_clock_value.qilei_step_remaining) + L" · 局时 " + qilei_clock::qilei_format(wuziqi_clock_value.qilei_total_remaining[1])).c_str());

    const wuziqi_analysis_result wuziqi_analysis = wuziqi_analyze(wuziqi_board_value); // wuziqi_analysis 是当前实时胜负预测。
    settextcolor(RGB(225, 234, 239));
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 376, (L"胜负预测  黑 " + std::to_wstring(wuziqi_analysis.wuziqi_black_percent) + L"%  白 " + std::to_wstring(wuziqi_analysis.wuziqi_white_percent) + L"%").c_str());
    const int wuziqi_bar_left = wuziqi_panel_left + 22; // wuziqi_bar_left 是胜率条左边界。
    const int wuziqi_bar_width = 276; // wuziqi_bar_width 是胜率条总宽度。
    const int wuziqi_black_width = wuziqi_bar_width * wuziqi_analysis.wuziqi_black_percent / 100; // wuziqi_black_width 是黑方胜率条宽度。
    setfillcolor(RGB(27, 30, 33));
    solidrectangle(wuziqi_bar_left, 412, wuziqi_bar_left + wuziqi_black_width, 440);
    setfillcolor(RGB(239, 237, 228));
    solidrectangle(wuziqi_bar_left + wuziqi_black_width, 412, wuziqi_bar_left + wuziqi_bar_width, 440);
    settextcolor(RGB(205, 218, 226));
    settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(wuziqi_panel_left + 22, 450, wuziqi_analysis.wuziqi_summary.c_str());
    settextstyle(17, 0, L"Microsoft YaHei");
    RECT wuziqi_engine_rect = { wuziqi_panel_left + 22, 478, wuziqi_window_width - 18, 526 }; // wuziqi_engine_rect 是机器人名称区域。
    drawtext(wuziqi_robot_value.wuziqi_engine_name().c_str(), &wuziqi_engine_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);

    wuziqi_draw_button(wuziqi_panel_left + 18, 642, 136, L"提示 (H)", RGB(52, 132, 104));
    wuziqi_draw_button(wuziqi_panel_left + 166, 642, 136, L"悔棋 (U)", RGB(58, 124, 154));
    wuziqi_draw_button(wuziqi_panel_left + 18, 696, 136, L"重开 (N)", RGB(132, 103, 48));
    wuziqi_draw_button(wuziqi_panel_left + 166, 696, 136, L"投降 (R)", RGB(149, 75, 67));
    wuziqi_draw_button(wuziqi_panel_left + 18, 750, 284, L"退出对局 (Esc)", RGB(176, 66, 58));
}

void wuziqi_session::wuziqi_log_move(const std::wstring& wuziqi_actor, const wuziqi_move& wuziqi_move_value)
{
    const std::wstring wuziqi_coordinate = std::wstring(1, static_cast<wchar_t>(L'A' + wuziqi_move_value.wuziqi_col)) + std::to_wstring(15 - wuziqi_move_value.wuziqi_row); // wuziqi_coordinate 是日志使用的落子坐标。
    wuziqi_logger.qilei_write(wuziqi_actor + L"：" + wuziqi_coordinate);
}

void wuziqi_session::wuziqi_reset_round(const qilei_game_setting& wuziqi_setting)
{
    wuziqi_board_value.wuziqi_reset();
    wuziqi_clock_value.qilei_reset(wuziqi_setting, 0);
    wuziqi_hint_visible = false;
    wuziqi_pending_visible = false;
    wuziqi_pending_move = {};
    wuziqi_operation_text = L"等待黑方操作";
    wuziqi_logger.qilei_open(L"五子棋");
    wuziqi_logger.qilei_write(L"计时：每步 " + std::to_wstring(wuziqi_setting.qilei_step_seconds) + L" 秒，每方 " + std::to_wstring(wuziqi_setting.qilei_total_seconds / 60) + L" 分钟。");
    wuziqi_logger.qilei_write(L"机器人难度：" + std::to_wstring(wuziqi_setting.qilei_robot_level + 1) + L" 级。");
    wuziqi_log_analysis();
}

void wuziqi_session::wuziqi_make_hint(const qilei_game_setting& wuziqi_setting)
{
    wuziqi_robot_value.wuziqi_start();
    wuziqi_hint_move = wuziqi_robot_value.wuziqi_choose_move(wuziqi_board_value, qilei_robot_think_ms(wuziqi_setting, 2200));
    wuziqi_hint_visible = wuziqi_hint_move.wuziqi_row >= 0;
    if (!wuziqi_hint_visible) return;
    const std::wstring wuziqi_coordinate = std::wstring(1, static_cast<wchar_t>(L'A' + wuziqi_hint_move.wuziqi_col)) + std::to_wstring(15 - wuziqi_hint_move.wuziqi_row); // wuziqi_coordinate 是推荐落点的棋盘坐标。
    wuziqi_logger.qilei_write(L"请求提示：推荐 " + wuziqi_coordinate);
    wuziqi_operation_text = L"提示：推荐落在 " + wuziqi_coordinate;
}

void wuziqi_session::wuziqi_log_analysis()
{
    const wuziqi_analysis_result wuziqi_analysis = wuziqi_analyze(wuziqi_board_value); // wuziqi_analysis 是需要写入日志的实时预测。
    wuziqi_logger.qilei_write(L"胜负预测：黑方 " + std::to_wstring(wuziqi_analysis.wuziqi_black_percent) + L"%，白方 " + std::to_wstring(wuziqi_analysis.wuziqi_white_percent) + L"%（" + wuziqi_analysis.wuziqi_summary + L"）。");
}

int wuziqi_session::wuziqi_run(const qilei_game_setting& wuziqi_setting)
{
    wuziqi_reset_round(wuziqi_setting);
    initgraph(wuziqi_window_width, wuziqi_window_height);
    SetWindowTextW(GetHWnd(), L"五子棋 - 机器人");
    BeginBatchDraw();
    if (wuziqi_setting.qilei_robot_mode != 0)
    {
        wuziqi_draw(L"正在启动机器人…");
        FlushBatchDraw();
        wuziqi_robot_value.wuziqi_start();
    }
    wuziqi_logger.qilei_write(L"机器人：" + wuziqi_robot_value.wuziqi_engine_name());
    bool wuziqi_running = true; // wuziqi_running 表示五子棋窗口循环是否继续。
    bool wuziqi_forced_over = false; // wuziqi_forced_over 表示是否因超时强制结束。
    std::wstring wuziqi_forced_text; // wuziqi_forced_text 是超时结果文字。
    bool wuziqi_result_logged = false; // wuziqi_result_logged 防止胜负结果重复写入日志。
    unsigned long long wuziqi_last_draw = 0; // wuziqi_last_draw 是上一次界面刷新时刻。
    unsigned long long wuziqi_next_robot_tick = GetTickCount64(); // wuziqi_next_robot_tick 是允许下一方机器人开始计算的最早毫秒时刻，避免双方机器人无间隔连续调度。
    while (wuziqi_running)
    {
        const int wuziqi_timeout_side = wuziqi_clock_value.qilei_update(); // wuziqi_timeout_side 是刚超时的一方。
        if (wuziqi_timeout_side >= 0 && !wuziqi_forced_over)
        {
            wuziqi_forced_over = true;
            wuziqi_forced_text = wuziqi_timeout_side == 0 ? L"黑方超时，白方获胜" : L"白方超时，黑方获胜";
            wuziqi_logger.qilei_write(wuziqi_forced_text);
        }
        if (wuziqi_board_value.wuziqi_game_over() && !wuziqi_result_logged)
        {
            wuziqi_clock_value.qilei_stop();
            wuziqi_logger.qilei_write(wuziqi_board_value.wuziqi_result_text());
            wuziqi_result_logged = true;
        }
        const bool wuziqi_over = wuziqi_forced_over || wuziqi_board_value.wuziqi_game_over(); // wuziqi_over 表示对局是否已结束。
        if (!wuziqi_over && GetTickCount64() >= wuziqi_next_robot_tick && qilei_side_is_robot(wuziqi_setting, wuziqi_board_value.wuziqi_side()))
        {
            wuziqi_draw(wuziqi_robot_value.wuziqi_engine_name() + L" 正在思考…");
            FlushBatchDraw();
            const wuziqi_move wuziqi_robot_move = wuziqi_robot_value.wuziqi_choose_move(wuziqi_board_value, qilei_robot_think_ms(wuziqi_setting, 2500)); // wuziqi_robot_move 是机器人选出的落子。
            const bool wuziqi_robot_move_valid = wuziqi_robot_move.wuziqi_row >= 0 && wuziqi_robot_move.wuziqi_row < 15 && wuziqi_robot_move.wuziqi_col >= 0 && wuziqi_robot_move.wuziqi_col < 15; // wuziqi_robot_move_valid 表示机器人坐标位于十五路棋盘内。
            if (wuziqi_clock_value.qilei_update() < 0 && wuziqi_robot_move_valid && wuziqi_board_value.wuziqi_play(wuziqi_robot_move))
            {
                wuziqi_log_move(L"机器人", wuziqi_robot_move);
                const std::wstring wuziqi_coordinate = std::wstring(1, static_cast<wchar_t>(L'A' + wuziqi_robot_move.wuziqi_col)) + std::to_wstring(15 - wuziqi_robot_move.wuziqi_row); // wuziqi_coordinate 是机器人落子显示坐标。
                wuziqi_operation_text = L"机器人落子：" + wuziqi_coordinate;
                wuziqi_hint_visible = false;
                wuziqi_pending_visible = false;
                wuziqi_log_analysis();
                wuziqi_clock_value.qilei_switch(wuziqi_board_value.wuziqi_side());
            }
            wuziqi_next_robot_tick = GetTickCount64() + 200; // wuziqi_next_robot_tick 为下一方保留一次界面刷新和消息处理间隔。
        }

        ExMessage wuziqi_message; // wuziqi_message 是当前鼠标或键盘输入消息。
        while (peekmessage(&wuziqi_message, EM_MOUSE | EM_KEY))
        {
            if (wuziqi_message.message == WM_KEYDOWN && wuziqi_message.vkcode == VK_ESCAPE) wuziqi_running = false;
            else if (wuziqi_message.message == WM_KEYDOWN && wuziqi_message.vkcode == 'H' && !wuziqi_over) wuziqi_make_hint(wuziqi_setting);
            else if (wuziqi_message.message == WM_KEYDOWN && wuziqi_message.vkcode == 'N') { wuziqi_reset_round(wuziqi_setting); wuziqi_forced_over = false; wuziqi_forced_text.clear(); wuziqi_result_logged = false; }
            else if (wuziqi_message.message == WM_KEYDOWN && wuziqi_message.vkcode == 'R' && !wuziqi_over) { wuziqi_forced_over = true; wuziqi_forced_text = wuziqi_board_value.wuziqi_side() == 0 ? L"黑方投降，白方获胜" : L"白方投降，黑方获胜"; wuziqi_clock_value.qilei_stop(); wuziqi_logger.qilei_write(wuziqi_forced_text); }
            else if ((wuziqi_message.message == WM_KEYDOWN && wuziqi_message.vkcode == 'U') ||
                     (wuziqi_message.message == WM_LBUTTONDOWN && wuziqi_message.x >= wuziqi_panel_left + 166 && wuziqi_message.x <= wuziqi_panel_left + 302 && wuziqi_message.y >= 642 && wuziqi_message.y <= 690))
            {
                if (wuziqi_board_value.wuziqi_undo())
                {
                    if (wuziqi_setting.qilei_robot_mode != 0) wuziqi_board_value.wuziqi_undo();
                    wuziqi_clock_value.qilei_switch(wuziqi_board_value.wuziqi_side());
                    wuziqi_logger.qilei_write(L"悔棋。");
                    wuziqi_hint_visible = false;
                    wuziqi_pending_visible = false;
                    wuziqi_operation_text = L"已撤回上一轮走子";
                    wuziqi_log_analysis();
                    wuziqi_forced_over = false;
                    wuziqi_result_logged = false;
                }
            }
            else if (wuziqi_message.message == WM_LBUTTONDOWN && wuziqi_message.x >= wuziqi_panel_left + 18 && wuziqi_message.x <= wuziqi_panel_left + 154 && wuziqi_message.y >= 642 && wuziqi_message.y <= 690 && !wuziqi_over) wuziqi_make_hint(wuziqi_setting);
            else if (wuziqi_message.message == WM_LBUTTONDOWN && wuziqi_message.x >= wuziqi_panel_left + 18 && wuziqi_message.x <= wuziqi_panel_left + 154 && wuziqi_message.y >= 696 && wuziqi_message.y <= 744) { wuziqi_reset_round(wuziqi_setting); wuziqi_forced_over = false; wuziqi_forced_text.clear(); wuziqi_result_logged = false; }
            else if (wuziqi_message.message == WM_LBUTTONDOWN && wuziqi_message.x >= wuziqi_panel_left + 166 && wuziqi_message.x <= wuziqi_panel_left + 302 && wuziqi_message.y >= 696 && wuziqi_message.y <= 744 && !wuziqi_over) { wuziqi_forced_over = true; wuziqi_forced_text = wuziqi_board_value.wuziqi_side() == 0 ? L"黑方投降，白方获胜" : L"白方投降，黑方获胜"; wuziqi_operation_text = wuziqi_forced_text; wuziqi_clock_value.qilei_stop(); wuziqi_logger.qilei_write(wuziqi_forced_text); }
            else if (wuziqi_message.message == WM_LBUTTONDOWN && wuziqi_message.x >= wuziqi_panel_left + 18 && wuziqi_message.x <= wuziqi_panel_left + 302 && wuziqi_message.y >= 750 && wuziqi_message.y <= 798) wuziqi_running = false;
            else if (wuziqi_message.message == WM_LBUTTONDOWN && !wuziqi_over && !qilei_side_is_robot(wuziqi_setting, wuziqi_board_value.wuziqi_side()))
            {
                const int wuziqi_col = static_cast<int>(std::lround((wuziqi_message.x - wuziqi_board_left) / static_cast<double>(wuziqi_spacing))); // wuziqi_col 是鼠标最近棋盘列。
                const int wuziqi_row = static_cast<int>(std::lround((wuziqi_message.y - wuziqi_board_top) / static_cast<double>(wuziqi_spacing))); // wuziqi_row 是鼠标最近棋盘行。
                const int wuziqi_x = wuziqi_board_left + wuziqi_col * wuziqi_spacing; // wuziqi_x 是最近交叉点横坐标。
                const int wuziqi_y = wuziqi_board_top + wuziqi_row * wuziqi_spacing; // wuziqi_y 是最近交叉点纵坐标。
                if (wuziqi_row >= 0 && wuziqi_row < 15 && wuziqi_col >= 0 && wuziqi_col < 15 && std::abs(wuziqi_message.x - wuziqi_x) <= 19 && std::abs(wuziqi_message.y - wuziqi_y) <= 19)
                {
                    const wuziqi_move wuziqi_human_move = { wuziqi_row, wuziqi_col }; // wuziqi_human_move 是鼠标点击转换后的玩家落子。
                    const std::wstring wuziqi_coordinate = std::wstring(1, static_cast<wchar_t>(L'A' + wuziqi_col)) + std::to_wstring(15 - wuziqi_row); // wuziqi_coordinate 是待确认落点的显示坐标。
                    if (wuziqi_board_value.wuziqi_stone(wuziqi_row, wuziqi_col) != 0)
                    {
                        wuziqi_pending_visible = false;
                        wuziqi_operation_text = L"该点已有棋子，请重新选择";
                    }
                    else if (!wuziqi_pending_visible || wuziqi_pending_move.wuziqi_row != wuziqi_row || wuziqi_pending_move.wuziqi_col != wuziqi_col)
                    {
                        wuziqi_pending_move = wuziqi_human_move;
                        wuziqi_pending_visible = true;
                        wuziqi_operation_text = L"已选择 " + wuziqi_coordinate + L"，再次点击确认";
                    }
                    else if (wuziqi_board_value.wuziqi_play(wuziqi_human_move))
                    {
                        wuziqi_log_move(L"玩家", wuziqi_human_move);
                        wuziqi_operation_text = L"玩家落子：" + wuziqi_coordinate;
                        wuziqi_pending_visible = false;
                        wuziqi_hint_visible = false;
                        wuziqi_log_analysis();
                        wuziqi_clock_value.qilei_switch(wuziqi_board_value.wuziqi_side());
                    }
                }
            }
        }
        const unsigned long long wuziqi_now = GetTickCount64(); // wuziqi_now 是当前毫秒时刻。
        if (wuziqi_now - wuziqi_last_draw >= 100)
        {
            wuziqi_draw(wuziqi_forced_over ? wuziqi_forced_text : (wuziqi_operation_text.empty() ? wuziqi_board_value.wuziqi_result_text() : wuziqi_operation_text));
            FlushBatchDraw();
            wuziqi_last_draw = wuziqi_now;
        }
        Sleep(10);
    }
    wuziqi_clock_value.qilei_stop();
    wuziqi_logger.qilei_write(L"窗口关闭。");
    EndBatchDraw();
    closegraph();
    return 0;
}
