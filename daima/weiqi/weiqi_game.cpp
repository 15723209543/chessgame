#include "weiqi_game.h"

#include <graphics.h>
#include <windows.h>

#include <chrono>
#include <cmath>
#include <future>

namespace
{
    constexpr int weiqi_window_width = 1180; // weiqi_window_width 是围棋窗口宽度。
    constexpr int weiqi_window_height = 840; // weiqi_window_height 是围棋窗口高度。
    constexpr int weiqi_board_left = 60;     // weiqi_board_left 是棋盘第一条纵线的横坐标。
    constexpr int weiqi_board_top = 66;      // weiqi_board_top 是棋盘第一条横线的纵坐标。
    constexpr int weiqi_spacing = 39;        // weiqi_spacing 是相邻交叉点间距。
    constexpr int weiqi_panel_left = 820;    // weiqi_panel_left 是右侧信息面板左边界。

    // weiqi_draw_button 绘制右侧面板中一个操作按钮。
    void weiqi_draw_button(int weiqi_left, int weiqi_top, int weiqi_width, const std::wstring& weiqi_text, COLORREF weiqi_color)
    {
        setfillcolor(weiqi_color);
        setlinecolor(weiqi_color);
        fillroundrect(weiqi_left, weiqi_top, weiqi_left + weiqi_width, weiqi_top + 48, 10, 10);
        setbkmode(TRANSPARENT);
        settextcolor(WHITE);
        settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT weiqi_rect = { weiqi_left, weiqi_top, weiqi_left + weiqi_width, weiqi_top + 48 }; // weiqi_rect 是按钮文字绘制区域。
        drawtext(weiqi_text.c_str(), &weiqi_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }

    // weiqi_column_text 返回跳过 I 的围棋列字母。
    wchar_t weiqi_column_text(int weiqi_col)
    {
        wchar_t weiqi_letter = static_cast<wchar_t>(L'A' + weiqi_col); // weiqi_letter 是跳过 I 之前的列字母。
        if (weiqi_letter >= L'I') ++weiqi_letter;
        return weiqi_letter;
    }
}

void weiqi_session::weiqi_draw(const std::wstring& weiqi_status) const
{
    setbkcolor(RGB(226, 196, 137));
    cleardevice();
    setfillcolor(RGB(224, 187, 116));
    solidrectangle(22, 24, 780, 802);
    setlinecolor(RGB(72, 55, 35));
    setlinestyle(PS_SOLID, 1);
    for (int weiqi_index = 0; weiqi_index < 19; ++weiqi_index) // weiqi_index 是当前绘制的棋盘线下标。
    {
        line(weiqi_board_left, weiqi_board_top + weiqi_index * weiqi_spacing, weiqi_board_left + 18 * weiqi_spacing, weiqi_board_top + weiqi_index * weiqi_spacing);
        line(weiqi_board_left + weiqi_index * weiqi_spacing, weiqi_board_top, weiqi_board_left + weiqi_index * weiqi_spacing, weiqi_board_top + 18 * weiqi_spacing);
    }
    const int weiqi_stars[3] = { 3, 9, 15 }; // weiqi_stars 是 19 路棋盘星位行列下标。
    setfillcolor(RGB(55, 42, 28));
    for (int weiqi_row : weiqi_stars) for (int weiqi_col : weiqi_stars) fillcircle(weiqi_board_left + weiqi_col * weiqi_spacing, weiqi_board_top + weiqi_row * weiqi_spacing, 5); // weiqi_row/weiqi_col 是当前星位行列。

    for (int weiqi_row = 0; weiqi_row < 19; ++weiqi_row) // weiqi_row 是当前绘制棋子行。
    {
        for (int weiqi_col = 0; weiqi_col < 19; ++weiqi_col) // weiqi_col 是当前绘制棋子列。
        {
            const int weiqi_stone_value = weiqi_board_value.weiqi_stone(weiqi_row, weiqi_col); // weiqi_stone_value 是当前交叉点棋子。
            if (!weiqi_stone_value) continue;
            const int weiqi_x = weiqi_board_left + weiqi_col * weiqi_spacing; // weiqi_x 是棋子中心横坐标。
            const int weiqi_y = weiqi_board_top + weiqi_row * weiqi_spacing; // weiqi_y 是棋子中心纵坐标。
            setfillcolor(weiqi_stone_value == 1 ? RGB(28, 31, 33) : RGB(246, 244, 235));
            setlinecolor(weiqi_stone_value == 1 ? RGB(15, 17, 18) : RGB(150, 146, 137));
            fillcircle(weiqi_x, weiqi_y, 18);
        }
    }
    if (!weiqi_board_value.weiqi_move_history().empty())
    {
        const weiqi_move& weiqi_last = weiqi_board_value.weiqi_move_history().back(); // weiqi_last 是最近一步，用于绘制落子标记。
        if (!weiqi_last.weiqi_pass)
        {
            setfillcolor(weiqi_board_value.weiqi_stone(weiqi_last.weiqi_row, weiqi_last.weiqi_col) == 1 ? WHITE : BLACK);
            fillcircle(weiqi_board_left + weiqi_last.weiqi_col * weiqi_spacing, weiqi_board_top + weiqi_last.weiqi_row * weiqi_spacing, 4);
        }
    }
    if (weiqi_hint_visible && !weiqi_hint_move.weiqi_pass)
    {
        const int weiqi_hint_x = weiqi_board_left + weiqi_hint_move.weiqi_col * weiqi_spacing; // weiqi_hint_x 是推荐落点的中心横坐标。
        const int weiqi_hint_y = weiqi_board_top + weiqi_hint_move.weiqi_row * weiqi_spacing; // weiqi_hint_y 是推荐落点的中心纵坐标。
        setlinecolor(RGB(244, 66, 52));
        setlinestyle(PS_SOLID, 4);
        circle(weiqi_hint_x, weiqi_hint_y, 15);
        line(weiqi_hint_x - 8, weiqi_hint_y, weiqi_hint_x + 8, weiqi_hint_y);
        line(weiqi_hint_x, weiqi_hint_y - 8, weiqi_hint_x, weiqi_hint_y + 8);
    }
    if (weiqi_pending_visible && !weiqi_pending_move.weiqi_pass)
    {
        const int weiqi_pending_x = weiqi_board_left + weiqi_pending_move.weiqi_col * weiqi_spacing; // weiqi_pending_x 是待确认落点轮廓中心横坐标。
        const int weiqi_pending_y = weiqi_board_top + weiqi_pending_move.weiqi_row * weiqi_spacing; // weiqi_pending_y 是待确认落点轮廓中心纵坐标。
        setlinecolor(RGB(42, 119, 184));
        setlinestyle(PS_SOLID, 4);
        circle(weiqi_pending_x, weiqi_pending_y, 17);
        setlinestyle(PS_SOLID, 1);
    }
    setbkmode(TRANSPARENT);
    settextcolor(RGB(77, 58, 36));
    settextstyle(14, 0, L"Microsoft YaHei");
    for (int weiqi_index = 0; weiqi_index < 19; ++weiqi_index) // weiqi_index 是坐标标注下标。
    {
        outtextxy(weiqi_board_left + weiqi_index * weiqi_spacing - 5, 782, std::wstring(1, weiqi_column_text(weiqi_index)).c_str());
        outtextxy(34, weiqi_board_top + weiqi_index * weiqi_spacing - 9, std::to_wstring(19 - weiqi_index).c_str());
    }

    setfillcolor(RGB(34, 49, 63));
    solidrectangle(weiqi_panel_left, 0, weiqi_window_width, weiqi_window_height);
    settextcolor(WHITE);
    settextstyle(34, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 20, L"围棋");

    settextcolor(RGB(230, 197, 111));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 70, L"本次操作");
    setfillcolor(RGB(42, 60, 75));
    setlinecolor(RGB(121, 104, 58));
    setlinestyle(PS_SOLID, 2);
    fillroundrect(weiqi_panel_left + 22, 98, weiqi_window_width - 22, 170, 10, 10);
    settextcolor(RGB(225, 234, 239));
    settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT weiqi_status_rect = { weiqi_panel_left + 36, 104, weiqi_window_width - 36, 164 }; // weiqi_status_rect 是本次操作文字区域。
    drawtext(weiqi_status.c_str(), &weiqi_status_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);

    const int weiqi_black_stones = weiqi_board_value.weiqi_stone_count(0); // weiqi_black_stones 是黑方当前场上棋子数。
    const int weiqi_white_stones = weiqi_board_value.weiqi_stone_count(1); // weiqi_white_stones 是白方当前场上棋子数。
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 184, L"黑方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 214, (L"场上 " + std::to_wstring(weiqi_black_stones) + L" 子 · 提子 " + std::to_wstring(weiqi_board_value.weiqi_capture_count(0))).c_str());
    settextstyle(18, 0, L"Microsoft YaHei");
    outtextxy(weiqi_panel_left + 24, 244, (L"步时 " + qilei_clock::qilei_format(weiqi_clock_value.qilei_step_remaining_by_side[0]) + L" · 局时 " + qilei_clock::qilei_format(weiqi_clock_value.qilei_total_remaining[0])).c_str());
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 280, L"白方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 310, (L"场上 " + std::to_wstring(weiqi_white_stones) + L" 子 · 提子 " + std::to_wstring(weiqi_board_value.weiqi_capture_count(1))).c_str());
    settextstyle(18, 0, L"Microsoft YaHei");
    outtextxy(weiqi_panel_left + 24, 340, (L"步时 " + qilei_clock::qilei_format(weiqi_clock_value.qilei_step_remaining_by_side[1]) + L" · 局时 " + qilei_clock::qilei_format(weiqi_clock_value.qilei_total_remaining[1])).c_str());

    const weiqi_analysis_result weiqi_analysis = weiqi_analyze(weiqi_board_value); // weiqi_analysis 是当前实时胜负预测。
    settextcolor(RGB(225, 234, 239));
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 378, (L"胜负预测  黑 " + std::to_wstring(weiqi_analysis.weiqi_black_percent) + L"%  白 " + std::to_wstring(weiqi_analysis.weiqi_white_percent) + L"%").c_str());
    const int weiqi_bar_left = weiqi_panel_left + 24; // weiqi_bar_left 是胜率条左边界。
    const int weiqi_bar_width = 312; // weiqi_bar_width 是胜率条总宽度。
    const int weiqi_black_width = weiqi_bar_width * weiqi_analysis.weiqi_black_percent / 100; // weiqi_black_width 是黑方胜率条宽度。
    setfillcolor(RGB(27, 30, 33));
    solidrectangle(weiqi_bar_left, 414, weiqi_bar_left + weiqi_black_width, 442);
    setfillcolor(RGB(239, 237, 228));
    solidrectangle(weiqi_bar_left + weiqi_black_width, 414, weiqi_bar_left + weiqi_bar_width, 442);
    settextcolor(RGB(205, 218, 226));
    settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(weiqi_panel_left + 24, 452, weiqi_analysis.weiqi_summary.c_str());

    weiqi_draw_button(weiqi_panel_left + 22, 664, 145, L"停一手 (P)", RGB(54, 132, 102));
    weiqi_draw_button(weiqi_panel_left + 181, 664, 145, L"提示 (H)", RGB(52, 132, 104));
    weiqi_draw_button(weiqi_panel_left + 22, 718, 145, L"悔棋 (U)", RGB(58, 124, 154));
    weiqi_draw_button(weiqi_panel_left + 181, 718, 145, L"重开 (N)", RGB(132, 103, 48));
    weiqi_draw_button(weiqi_panel_left + 22, 772, 145, L"投降 (R)", RGB(149, 75, 67));
    weiqi_draw_button(weiqi_panel_left + 181, 772, 145, L"退出 (Esc)", RGB(176, 66, 58));
}

void weiqi_session::weiqi_log_move(const std::wstring& weiqi_actor, const weiqi_move& weiqi_move_value)
{
    if (weiqi_move_value.weiqi_pass) { weiqi_logger.qilei_write(weiqi_actor + L"：停一手。"); return; }
    const std::wstring weiqi_coordinate = std::wstring(1, weiqi_column_text(weiqi_move_value.weiqi_col)) + std::to_wstring(19 - weiqi_move_value.weiqi_row); // weiqi_coordinate 是日志使用的 GTP 坐标。
    weiqi_logger.qilei_write(weiqi_actor + L"：" + weiqi_coordinate);
}

void weiqi_session::weiqi_reset_round(const qilei_game_setting& weiqi_setting)
{
    weiqi_board_value.weiqi_reset();
    weiqi_clock_value.qilei_reset(weiqi_setting, 0);
    weiqi_hint_visible = false;
    weiqi_pending_visible = false;
    weiqi_pending_move = {};
    weiqi_robot_confirm_phase = 0;
    weiqi_robot_confirm_tick = 0;
    weiqi_operation_text = L"等待黑方操作";
    weiqi_logger.qilei_open(L"围棋");
    weiqi_logger.qilei_write(L"计时：每步 " + std::to_wstring(weiqi_setting.qilei_step_seconds) + L" 秒，每方 " + std::to_wstring(weiqi_setting.qilei_total_seconds / 60) + L" 分钟。");
    weiqi_logger.qilei_write(L"机器人难度：" + std::to_wstring(weiqi_setting.qilei_robot_level + 1) + L" 级。");
    weiqi_log_analysis();
}

void weiqi_session::weiqi_make_hint(const qilei_game_setting& weiqi_setting)
{
    weiqi_robot_value.weiqi_start();
    weiqi_hint_move = weiqi_robot_value.weiqi_choose_move(weiqi_board_value, qilei_robot_think_ms(weiqi_setting, 2400));
    weiqi_hint_visible = !weiqi_hint_move.weiqi_pass && weiqi_hint_move.weiqi_row >= 0;
    if (weiqi_hint_move.weiqi_pass) weiqi_logger.qilei_write(L"请求提示：推荐停一手。");
    else
    {
        const std::wstring weiqi_coordinate = std::wstring(1, weiqi_column_text(weiqi_hint_move.weiqi_col)) + std::to_wstring(19 - weiqi_hint_move.weiqi_row); // weiqi_coordinate 是推荐落点的 GTP 坐标。
        weiqi_logger.qilei_write(L"请求提示：推荐 " + weiqi_coordinate);
        weiqi_operation_text = L"提示：推荐落在 " + weiqi_coordinate;
    }
}

void weiqi_session::weiqi_log_analysis()
{
    const weiqi_analysis_result weiqi_analysis = weiqi_analyze(weiqi_board_value); // weiqi_analysis 是需要写入日志的实时预测。
    weiqi_logger.qilei_write(L"胜负预测：黑方 " + std::to_wstring(weiqi_analysis.weiqi_black_percent) + L"%，白方 " + std::to_wstring(weiqi_analysis.weiqi_white_percent) + L"%（" + weiqi_analysis.weiqi_summary + L"）。");
}

int weiqi_session::weiqi_run(const qilei_game_setting& weiqi_setting)
{
    weiqi_reset_round(weiqi_setting);
    initgraph(weiqi_window_width, weiqi_window_height);
    SetWindowTextW(GetHWnd(), L"围棋");
    BeginBatchDraw();
    if (weiqi_setting.qilei_robot_mode != 0)
    {
        weiqi_draw(L"正在启动机器人…");
        FlushBatchDraw();
        weiqi_robot_value.weiqi_start();
    }
    weiqi_clock_value.qilei_reset(weiqi_setting, weiqi_board_value.weiqi_side());
    weiqi_logger.qilei_write(L"机器人：" + weiqi_robot_value.weiqi_engine_name());
    bool weiqi_running = true; // weiqi_running 表示围棋窗口循环是否继续。
    bool weiqi_forced_over = false; // weiqi_forced_over 表示是否因超时强制结束。
    std::wstring weiqi_forced_text; // weiqi_forced_text 是超时结果文字。
    bool weiqi_result_logged = false; // weiqi_result_logged 防止终局结果被重复写入日志。
    unsigned long long weiqi_last_draw = 0; // weiqi_last_draw 是上一次界面刷新时刻。
    unsigned long long weiqi_next_robot_tick = GetTickCount64(); // weiqi_next_robot_tick 是下一次机器人可以开始选点的时刻。
    std::future<weiqi_move> weiqi_robot_future; // weiqi_robot_future 保存后台机器人决策任务。
    bool weiqi_robot_search_active = false; // weiqi_robot_search_active 表示机器人当前正在后台计算落点。
    unsigned long long weiqi_round_generation = 0; // weiqi_round_generation 用于识别重开、悔棋前的过期机器人结果。
    unsigned long long weiqi_search_generation = 0; // weiqi_search_generation 保存当前后台任务所属的局面代数。
    while (weiqi_running)
    {
        const int weiqi_timeout_side = weiqi_clock_value.qilei_update(); // weiqi_timeout_side 是刚超时的一方。
        if (weiqi_timeout_side >= 0 && !weiqi_forced_over)
        {
            weiqi_forced_over = true;
            weiqi_forced_text = weiqi_timeout_side == 0 ? L"黑方超时，白方获胜" : L"白方超时，黑方获胜";
            weiqi_pending_visible = false;
            weiqi_pending_move = {};
            weiqi_robot_confirm_phase = 0;
            ++weiqi_round_generation;
            weiqi_logger.qilei_write(weiqi_forced_text);
        }
        if (weiqi_board_value.weiqi_game_over() && !weiqi_result_logged)
        {
            weiqi_clock_value.qilei_stop();
            weiqi_logger.qilei_write(weiqi_board_value.weiqi_result_text());
            weiqi_result_logged = true;
        }
        const bool weiqi_over = weiqi_forced_over || weiqi_board_value.weiqi_game_over(); // weiqi_over 表示对局是否已结束。
        const unsigned long long weiqi_robot_now = GetTickCount64(); // weiqi_robot_now 是机器人确认流程使用的当前毫秒时刻。
        if (weiqi_robot_search_active &&
            weiqi_robot_future.wait_for(std::chrono::milliseconds(0)) == std::future_status::ready)
        {
            weiqi_move weiqi_robot_result{}; // weiqi_robot_result 接收后台线程完成的机器人落点。
            try
            {
                weiqi_robot_result = weiqi_robot_future.get();
            }
            catch (...)
            {
                weiqi_robot_result = {};
            }
            weiqi_robot_search_active = false;
            const bool weiqi_result_current = weiqi_search_generation == weiqi_round_generation && !weiqi_over &&
                qilei_side_is_robot(weiqi_setting, weiqi_board_value.weiqi_side()); // weiqi_result_current 表示后台结果仍属于当前机器人局面。
            const bool weiqi_result_valid = weiqi_robot_result.weiqi_pass ||
                (weiqi_robot_result.weiqi_row >= 0 && weiqi_robot_result.weiqi_row < 19 &&
                 weiqi_robot_result.weiqi_col >= 0 && weiqi_robot_result.weiqi_col < 19); // weiqi_result_valid 检查返回的是停一手或棋盘内落点。
            if (weiqi_result_current && weiqi_result_valid)
            {
                weiqi_pending_move = weiqi_robot_result;
                weiqi_pending_visible = !weiqi_pending_move.weiqi_pass;
                weiqi_robot_confirm_phase = 1;
                weiqi_robot_confirm_tick = GetTickCount64();
                weiqi_operation_text = weiqi_pending_move.weiqi_pass ? L"机器人已选择停一手，停留 2 秒" :
                    L"机器人已选择 " + std::wstring(1, weiqi_column_text(weiqi_pending_move.weiqi_col)) +
                    std::to_wstring(19 - weiqi_pending_move.weiqi_row) + L"，停留 2 秒";
            }
            else
            {
                weiqi_next_robot_tick = GetTickCount64() + 200;
            }
        }
        if (!weiqi_over && qilei_side_is_robot(weiqi_setting, weiqi_board_value.weiqi_side()))
        {
            if (!weiqi_robot_search_active && weiqi_robot_confirm_phase == 0 && weiqi_robot_now >= weiqi_next_robot_tick)
            {
                const weiqi_board weiqi_board_copy = weiqi_board_value; // weiqi_board_copy 是交给后台机器人读取的独立棋盘副本。
                const int weiqi_think_ms = qilei_robot_think_ms(weiqi_setting, 2800); // weiqi_think_ms 把机器人决策限制在三秒以内。
                weiqi_search_generation = weiqi_round_generation;
                weiqi_robot_future = std::async(std::launch::async, [this, weiqi_board_copy, weiqi_think_ms]()
                {
                    return weiqi_robot_value.weiqi_choose_move(weiqi_board_copy, weiqi_think_ms);
                });
                weiqi_robot_search_active = true;
                weiqi_operation_text = L"机器人正在思考（最多 3 秒）…";
            }
            else if (weiqi_robot_confirm_phase == 1 && weiqi_robot_now - weiqi_robot_confirm_tick >= 2000)
            {
                const weiqi_move weiqi_robot_move = weiqi_pending_move; // weiqi_robot_move 是显示落点轮廓并确认后的机器人走法。
                if (weiqi_clock_value.qilei_update() < 0 && weiqi_board_value.weiqi_play(weiqi_robot_move))
                {
                    weiqi_log_move(L"机器人", weiqi_robot_move);
                    weiqi_operation_text = weiqi_robot_move.weiqi_pass ? L"机器人确认停一手" :
                        L"机器人确认落子：" + std::wstring(1, weiqi_column_text(weiqi_robot_move.weiqi_col)) + std::to_wstring(19 - weiqi_robot_move.weiqi_row);
                    weiqi_hint_visible = false;
                    weiqi_log_analysis();
                    weiqi_clock_value.qilei_switch(weiqi_board_value.weiqi_side());
                }
                weiqi_pending_visible = false;
                weiqi_pending_move = {};
                weiqi_robot_confirm_phase = 0;
                weiqi_next_robot_tick = GetTickCount64() + 200;
            }
        }

        ExMessage weiqi_message; // weiqi_message 是当前鼠标或键盘输入消息。
        while (peekmessage(&weiqi_message, EM_MOUSE | EM_KEY))
        {
            if (weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == VK_ESCAPE) weiqi_running = false;
            else if (weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == 'H' && !weiqi_over && !weiqi_robot_search_active) weiqi_make_hint(weiqi_setting);
            else if (weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == 'N') { weiqi_reset_round(weiqi_setting); ++weiqi_round_generation; weiqi_forced_over = false; weiqi_forced_text.clear(); weiqi_result_logged = false; }
            else if (weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == 'R' && !weiqi_over) { weiqi_forced_over = true; weiqi_forced_text = weiqi_board_value.weiqi_side() == 0 ? L"黑方投降，白方获胜" : L"白方投降，黑方获胜"; weiqi_clock_value.qilei_stop(); weiqi_logger.qilei_write(weiqi_forced_text); }
            else if ((weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == 'P') ||
                     (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 22 && weiqi_message.x <= weiqi_panel_left + 167 && weiqi_message.y >= 664 && weiqi_message.y <= 712))
            {
                if (!weiqi_over && !qilei_side_is_robot(weiqi_setting, weiqi_board_value.weiqi_side()))
                {
                    const weiqi_move weiqi_pass_move = { -1, -1, true }; // weiqi_pass_move 是玩家停一手步骤。
                    weiqi_board_value.weiqi_play(weiqi_pass_move);
                    weiqi_log_move(L"玩家", weiqi_pass_move);
                    weiqi_operation_text = L"玩家选择停一手";
                    weiqi_hint_visible = false;
                    weiqi_pending_visible = false;
                    weiqi_log_analysis();
                    weiqi_clock_value.qilei_switch(weiqi_board_value.weiqi_side());
                }
            }
            else if ((weiqi_message.message == WM_KEYDOWN && weiqi_message.vkcode == 'U') ||
                     (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 22 && weiqi_message.x <= weiqi_panel_left + 167 && weiqi_message.y >= 718 && weiqi_message.y <= 766))
            {
                if (weiqi_board_value.weiqi_undo())
                {
                    if (weiqi_setting.qilei_robot_mode != 0) weiqi_board_value.weiqi_undo();
                    weiqi_clock_value.qilei_switch(weiqi_board_value.weiqi_side());
                    weiqi_logger.qilei_write(L"悔棋。");
                    weiqi_hint_visible = false;
                    weiqi_pending_visible = false;
                    weiqi_pending_move = {};
                    weiqi_robot_confirm_phase = 0;
                    ++weiqi_round_generation;
                    weiqi_operation_text = L"已撤回上一轮走子";
                    weiqi_log_analysis();
                    weiqi_forced_over = false;
                    weiqi_result_logged = false;
                }
            }
            else if (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 181 && weiqi_message.x <= weiqi_panel_left + 326 && weiqi_message.y >= 664 && weiqi_message.y <= 712 && !weiqi_over && !weiqi_robot_search_active) weiqi_make_hint(weiqi_setting);
            else if (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 181 && weiqi_message.x <= weiqi_panel_left + 326 && weiqi_message.y >= 718 && weiqi_message.y <= 766) { weiqi_reset_round(weiqi_setting); ++weiqi_round_generation; weiqi_forced_over = false; weiqi_forced_text.clear(); weiqi_result_logged = false; }
            else if (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 22 && weiqi_message.x <= weiqi_panel_left + 167 && weiqi_message.y >= 772 && weiqi_message.y <= 820 && !weiqi_over) { weiqi_forced_over = true; weiqi_forced_text = weiqi_board_value.weiqi_side() == 0 ? L"黑方投降，白方获胜" : L"白方投降，黑方获胜"; weiqi_operation_text = weiqi_forced_text; weiqi_clock_value.qilei_stop(); weiqi_logger.qilei_write(weiqi_forced_text); }
            else if (weiqi_message.message == WM_LBUTTONDOWN && weiqi_message.x >= weiqi_panel_left + 181 && weiqi_message.x <= weiqi_panel_left + 326 && weiqi_message.y >= 772 && weiqi_message.y <= 820) weiqi_running = false;
            else if (weiqi_message.message == WM_LBUTTONDOWN && !weiqi_over && !qilei_side_is_robot(weiqi_setting, weiqi_board_value.weiqi_side()))
            {
                const int weiqi_col = static_cast<int>(std::lround((weiqi_message.x - weiqi_board_left) / static_cast<double>(weiqi_spacing))); // weiqi_col 是鼠标最近的棋盘列。
                const int weiqi_row = static_cast<int>(std::lround((weiqi_message.y - weiqi_board_top) / static_cast<double>(weiqi_spacing))); // weiqi_row 是鼠标最近的棋盘行。
                const int weiqi_x = weiqi_board_left + weiqi_col * weiqi_spacing; // weiqi_x 是最近交叉点横坐标。
                const int weiqi_y = weiqi_board_top + weiqi_row * weiqi_spacing; // weiqi_y 是最近交叉点纵坐标。
                if (weiqi_row >= 0 && weiqi_row < 19 && weiqi_col >= 0 && weiqi_col < 19 && std::abs(weiqi_message.x - weiqi_x) <= 16 && std::abs(weiqi_message.y - weiqi_y) <= 16)
                {
                    const weiqi_move weiqi_human_move = { weiqi_row, weiqi_col, false }; // weiqi_human_move 是鼠标点击转换后的玩家落子。
                    const std::wstring weiqi_coordinate = std::wstring(1, weiqi_column_text(weiqi_col)) + std::to_wstring(19 - weiqi_row); // weiqi_coordinate 是待确认落点的显示坐标。
                    if (!weiqi_board_value.weiqi_legal(weiqi_row, weiqi_col))
                    {
                        weiqi_pending_visible = false;
                        weiqi_operation_text = L"该点不可落子，请重新选择";
                    }
                    else if (!weiqi_pending_visible || weiqi_pending_move.weiqi_row != weiqi_row || weiqi_pending_move.weiqi_col != weiqi_col)
                    {
                        weiqi_pending_move = weiqi_human_move;
                        weiqi_pending_visible = true;
                        weiqi_operation_text = L"已选择 " + weiqi_coordinate + L"，再次点击确认";
                    }
                    else if (weiqi_board_value.weiqi_play(weiqi_human_move))
                    {
                        weiqi_log_move(L"玩家", weiqi_human_move);
                        weiqi_operation_text = L"玩家落子：" + weiqi_coordinate;
                        weiqi_pending_visible = false;
                        weiqi_hint_visible = false;
                        weiqi_log_analysis();
                        weiqi_clock_value.qilei_switch(weiqi_board_value.weiqi_side());
                    }
                }
            }
        }
        const unsigned long long weiqi_now = GetTickCount64(); // weiqi_now 是当前毫秒时刻。
        if (weiqi_now - weiqi_last_draw >= 100)
        {
            weiqi_draw(weiqi_forced_over ? weiqi_forced_text : (weiqi_operation_text.empty() ? weiqi_board_value.weiqi_result_text() : weiqi_operation_text));
            FlushBatchDraw();
            weiqi_last_draw = weiqi_now;
        }
        Sleep(10);
    }
    if (weiqi_robot_search_active && weiqi_robot_future.valid())
    {
        weiqi_robot_future.wait();
        try { (void)weiqi_robot_future.get(); } catch (...) {}
        weiqi_robot_search_active = false;
    }
    weiqi_clock_value.qilei_stop();
    weiqi_logger.qilei_write(L"窗口关闭。");
    EndBatchDraw();
    closegraph();
    return 0;
}
