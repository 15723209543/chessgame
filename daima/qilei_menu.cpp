#include "qilei_menu.h"

#include <graphics.h>
#include <windows.h>

#include <array>
#include <string>

namespace
{
    constexpr int qilei_window_width = 1180;   // qilei_window_width 是欢迎窗口宽度。
    constexpr int qilei_window_height = 760;   // qilei_window_height 是欢迎窗口高度。
    constexpr int qilei_card_width = 300;      // qilei_card_width 是单个棋类卡片宽度。
    constexpr int qilei_card_height = 170;     // qilei_card_height 是单个棋类卡片高度。
    constexpr int qilei_card_gap_x = 36;       // qilei_card_gap_x 是卡片水平间距。
    constexpr int qilei_card_gap_y = 30;       // qilei_card_gap_y 是卡片垂直间距。
    constexpr int qilei_card_start_x = 106;    // qilei_card_start_x 是第一列卡片的左边界。
    constexpr int qilei_card_start_y = 286;    // qilei_card_start_y 是第一行卡片的上边界。

    // qilei_names 按主菜单顺序保存六种棋类名称。
    const std::array<const wchar_t*, 6> qilei_names = {
        L"中国象棋", L"国际象棋", L"围棋",
        L"五子棋", L"飞行棋", L"跳棋"
    };

    // qilei_descriptions 保存每张卡片的简短功能说明。
    const std::array<const wchar_t*, 6> qilei_descriptions = {
        L"Pikafish 引擎 · 红黑对弈",
        L"Stockfish 引擎 · 标准规则",
        L"KataGo 引擎 · 19路棋盘",
        L"Rapfi 引擎 · 15路连珠",
        L"四色竞速 · 骰子与机器人",
        L"星形棋盘 · 多人机器人"
    };

    // qilei_accents 保存六张卡片的主题颜色。
    const std::array<COLORREF, 6> qilei_accents = {
        RGB(190, 58, 52), RGB(58, 92, 145), RGB(45, 123, 94),
        RGB(184, 116, 35), RGB(116, 77, 153), RGB(38, 132, 153)
    };

    // qilei_draw_icon 在卡片内绘制与棋盘相关的装饰图标。
    void qilei_draw_icon(int qilei_center_x, int qilei_center_y, COLORREF qilei_color, int qilei_index)
    {
        setlinecolor(qilei_color);
        setfillcolor(RGB(255, 255, 255));
        fillcircle(qilei_center_x, qilei_center_y, 38);
        setlinestyle(PS_SOLID, 2);
        circle(qilei_center_x, qilei_center_y, 38);

        if (qilei_index == 2 || qilei_index == 3)
        {
            for (int qilei_offset = -18; qilei_offset <= 18; qilei_offset += 12) // qilei_offset 是小棋盘网格的偏移量。
            {
                line(qilei_center_x - 24, qilei_center_y + qilei_offset, qilei_center_x + 24, qilei_center_y + qilei_offset);
                line(qilei_center_x + qilei_offset, qilei_center_y - 24, qilei_center_x + qilei_offset, qilei_center_y + 24);
            }
            setfillcolor(qilei_color);
            fillcircle(qilei_center_x + 12, qilei_center_y - 12, 7);
        }
        else
        {
            settextcolor(qilei_color);
            setbkmode(TRANSPARENT);
            settextstyle(34, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
            const wchar_t* qilei_mark = qilei_index == 4 ? L"飞" : (qilei_index == 5 ? L"跳" : L"棋"); // qilei_mark 是图标中央的文字。
            RECT qilei_icon_rect = { qilei_center_x - 30, qilei_center_y - 24, qilei_center_x + 30, qilei_center_y + 25 }; // qilei_icon_rect 是图标文字区域。
            drawtext(qilei_mark, &qilei_icon_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        }
    }
}

void qilei_menu::qilei_draw(int qilei_selected) const
{
    setbkcolor(RGB(245, 241, 232));
    cleardevice();

    setfillcolor(RGB(30, 45, 58));
    solidrectangle(0, 0, qilei_window_width, 218);
    setfillcolor(RGB(201, 72, 61));
    solidrectangle(0, 212, qilei_window_width, 218);

    setbkmode(TRANSPARENT);
    settextcolor(RGB(255, 255, 255));
    settextstyle(52, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT qilei_title_rect = { 0, 50, qilei_window_width, 116 }; // qilei_title_rect 是欢迎标题的绘制区域。
    drawtext(L"欢迎来到棋类游戏", &qilei_title_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    settextcolor(RGB(205, 216, 224));
    settextstyle(24, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT qilei_subtitle_rect = { 0, 128, qilei_window_width, 172 }; // qilei_subtitle_rect 是欢迎副标题的绘制区域。
    drawtext(L"选择你喜欢的棋类，开始一场精彩对局", &qilei_subtitle_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    for (int qilei_index = 0; qilei_index < 6; ++qilei_index) // qilei_index 是当前绘制的卡片下标。
    {
        const int qilei_row = qilei_index / 3; // qilei_row 是卡片所在行。
        const int qilei_col = qilei_index % 3; // qilei_col 是卡片所在列。
        const int qilei_left = qilei_card_start_x + qilei_col * (qilei_card_width + qilei_card_gap_x); // qilei_left 是卡片左边界。
        const int qilei_top = qilei_card_start_y + qilei_row * (qilei_card_height + qilei_card_gap_y); // qilei_top 是卡片上边界。
        const bool qilei_active = qilei_index == qilei_selected; // qilei_active 表示该卡片是否处于选中状态。

        setfillcolor(qilei_active ? RGB(255, 252, 245) : RGB(255, 255, 255));
        setlinecolor(qilei_active ? qilei_accents[qilei_index] : RGB(211, 207, 198));
        setlinestyle(PS_SOLID, qilei_active ? 4 : 1);
        fillroundrect(qilei_left, qilei_top, qilei_left + qilei_card_width, qilei_top + qilei_card_height, 18, 18);

        if (qilei_active)
        {
            setfillcolor(qilei_accents[qilei_index]);
            solidrectangle(qilei_left, qilei_top, qilei_left + 7, qilei_top + qilei_card_height);
        }

        qilei_draw_icon(qilei_left + 62, qilei_top + 75, qilei_accents[qilei_index], qilei_index);

        settextcolor(RGB(35, 42, 49));
        settextstyle(30, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        outtextxy(qilei_left + 108, qilei_top + 32, qilei_names[qilei_index]);
        settextcolor(RGB(103, 109, 112));
        settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT qilei_description_rect = { qilei_left + 108, qilei_top + 72, qilei_left + 292, qilei_top + 124 }; // qilei_description_rect 是允许说明文字自动换行的绘制区域。
        drawtext(qilei_descriptions[qilei_index], &qilei_description_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);
        if (qilei_active)
        {
            settextcolor(qilei_accents[qilei_index]);
            settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
            outtextxy(qilei_left + 108, qilei_top + 132, L"按 Enter 进入");
        }
    }

    settextcolor(RGB(103, 102, 98));
    settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT qilei_hint_rect = { 0, 698, qilei_window_width, 732 }; // qilei_hint_rect 是底部操作提示的绘制区域。
    drawtext(L"鼠标点击选择   ↑ ↓ ← → 切换   Enter 进入   Esc 退出", &qilei_hint_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}

int qilei_menu::qilei_hit_test(int qilei_x, int qilei_y) const
{
    for (int qilei_index = 0; qilei_index < 6; ++qilei_index) // qilei_index 是当前正在命中检测的卡片下标。
    {
        const int qilei_row = qilei_index / 3; // qilei_row 是卡片所在行。
        const int qilei_col = qilei_index % 3; // qilei_col 是卡片所在列。
        const int qilei_left = qilei_card_start_x + qilei_col * (qilei_card_width + qilei_card_gap_x); // qilei_left 是卡片左边界。
        const int qilei_top = qilei_card_start_y + qilei_row * (qilei_card_height + qilei_card_gap_y); // qilei_top 是卡片上边界。
        if (qilei_x >= qilei_left && qilei_x <= qilei_left + qilei_card_width &&
            qilei_y >= qilei_top && qilei_y <= qilei_top + qilei_card_height)
        {
            return qilei_index;
        }
    }
    return -1;
}

int qilei_menu::qilei_choose()
{
    initgraph(qilei_window_width, qilei_window_height);
    SetWindowTextW(GetHWnd(), L"棋类游戏大厅");
    BeginBatchDraw();

    int qilei_selected = 0; // qilei_selected 是当前键盘或鼠标选中的卡片下标。
    bool qilei_running = true; // qilei_running 表示欢迎页消息循环是否继续。
    int qilei_choice = 0; // qilei_choice 保存最终返回的 1~6 棋类编号。
    qilei_draw(qilei_selected);
    FlushBatchDraw();

    while (qilei_running)
    {
        ExMessage qilei_message = getmessage(EM_MOUSE | EM_KEY); // qilei_message 是当前鼠标或键盘消息。
        bool qilei_need_draw = false; // qilei_need_draw 表示本次输入后是否需要重绘菜单。

        if (qilei_message.message == WM_MOUSEMOVE)
        {
            const int qilei_hover = qilei_hit_test(qilei_message.x, qilei_message.y); // qilei_hover 是鼠标悬停卡片下标。
            if (qilei_hover >= 0 && qilei_hover != qilei_selected)
            {
                qilei_selected = qilei_hover;
                qilei_need_draw = true;
            }
        }
        else if (qilei_message.message == WM_LBUTTONDOWN)
        {
            const int qilei_clicked = qilei_hit_test(qilei_message.x, qilei_message.y); // qilei_clicked 是鼠标点击卡片下标。
            if (qilei_clicked >= 0)
            {
                qilei_choice = qilei_clicked + 1;
                qilei_running = false;
            }
        }
        else if (qilei_message.message == WM_KEYDOWN)
        {
            if (qilei_message.vkcode == VK_LEFT)
            {
                qilei_selected = (qilei_selected % 3 == 0) ? qilei_selected + 2 : qilei_selected - 1;
                qilei_need_draw = true;
            }
            else if (qilei_message.vkcode == VK_RIGHT)
            {
                qilei_selected = (qilei_selected % 3 == 2) ? qilei_selected - 2 : qilei_selected + 1;
                qilei_need_draw = true;
            }
            else if (qilei_message.vkcode == VK_UP || qilei_message.vkcode == VK_DOWN)
            {
                qilei_selected = (qilei_selected + 3) % 6;
                qilei_need_draw = true;
            }
            else if (qilei_message.vkcode == VK_RETURN)
            {
                qilei_choice = qilei_selected + 1;
                qilei_running = false;
            }
            else if (qilei_message.vkcode == VK_ESCAPE)
            {
                qilei_running = false;
            }
        }

        if (qilei_need_draw)
        {
            qilei_draw(qilei_selected);
            FlushBatchDraw();
        }
    }

    EndBatchDraw();
    closegraph();
    return qilei_choice;
}
