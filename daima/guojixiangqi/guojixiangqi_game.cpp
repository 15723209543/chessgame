#include "guojixiangqi_game.h"

#include <graphics.h>
#include <windows.h>

#include <algorithm>

namespace
{
    constexpr int guojixiangqi_window_width = 1120;  // guojixiangqi_window_width 是国际象棋窗口宽度。
    constexpr int guojixiangqi_window_height = 810;  // guojixiangqi_window_height 是国际象棋窗口高度。
    constexpr int guojixiangqi_board_left = 48;      // guojixiangqi_board_left 是棋盘左边界。
    constexpr int guojixiangqi_board_top = 48;       // guojixiangqi_board_top 是棋盘上边界。
    constexpr int guojixiangqi_cell = 88;            // guojixiangqi_cell 是单个棋格边长。
    constexpr int guojixiangqi_panel_left = 790;     // guojixiangqi_panel_left 是右侧面板左边界。

    // guojixiangqi_symbol 返回棋子对应的 Unicode 国际象棋符号。
    const wchar_t* guojixiangqi_symbol(int guojixiangqi_piece_value)
    {
        static const wchar_t* guojixiangqi_white[] = { L"", L"♙", L"♘", L"♗", L"♖", L"♕", L"♔" }; // guojixiangqi_white 是白方棋子符号表。
        static const wchar_t* guojixiangqi_black[] = { L"", L"♟", L"♞", L"♝", L"♜", L"♛", L"♚" }; // guojixiangqi_black 是黑方棋子符号表。
        const int guojixiangqi_type = std::abs(guojixiangqi_piece_value); // guojixiangqi_type 是经过范围检查的棋子类型。
        if (guojixiangqi_type < 1 || guojixiangqi_type > 6) return L"";
        return guojixiangqi_piece_value > 0 ? guojixiangqi_white[guojixiangqi_type] : guojixiangqi_black[guojixiangqi_type];
    }

    // guojixiangqi_square_text 把 0~63 棋格编号转换为 e4 形式坐标。
    std::wstring guojixiangqi_square_text(int guojixiangqi_square)
    {
        if (guojixiangqi_square < 0 || guojixiangqi_square >= 64) return L"?";
        return std::wstring(1, static_cast<wchar_t>(L'a' + guojixiangqi_square % 8)) + std::to_wstring(8 - guojixiangqi_square / 8);
    }

    // guojixiangqi_draw_button 绘制右侧面板中一个可点击按钮。
    void guojixiangqi_draw_button(int guojixiangqi_left, int guojixiangqi_top, int guojixiangqi_width, const std::wstring& guojixiangqi_text, COLORREF guojixiangqi_color)
    {
        setfillcolor(guojixiangqi_color);
        setlinecolor(guojixiangqi_color);
        fillroundrect(guojixiangqi_left, guojixiangqi_top, guojixiangqi_left + guojixiangqi_width, guojixiangqi_top + 48, 10, 10);
        settextcolor(WHITE);
        settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT guojixiangqi_rect = { guojixiangqi_left, guojixiangqi_top, guojixiangqi_left + guojixiangqi_width, guojixiangqi_top + 48 }; // guojixiangqi_rect 是按钮文字区域。
        drawtext(guojixiangqi_text.c_str(), &guojixiangqi_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
}

void guojixiangqi_session::guojixiangqi_draw(const qilei_game_setting& guojixiangqi_setting, const std::wstring& guojixiangqi_status) const
{
    setbkcolor(RGB(237, 232, 219));
    cleardevice();
    for (int guojixiangqi_row = 0; guojixiangqi_row < 8; ++guojixiangqi_row) // guojixiangqi_row 是当前绘制棋格行。
    {
        for (int guojixiangqi_col = 0; guojixiangqi_col < 8; ++guojixiangqi_col) // guojixiangqi_col 是当前绘制棋格列。
        {
            const int guojixiangqi_square = guojixiangqi_row * 8 + guojixiangqi_col; // guojixiangqi_square 是当前棋格编号。
            const int guojixiangqi_left = guojixiangqi_board_left + guojixiangqi_col * guojixiangqi_cell; // guojixiangqi_left 是棋格左边界。
            const int guojixiangqi_top = guojixiangqi_board_top + guojixiangqi_row * guojixiangqi_cell; // guojixiangqi_top 是棋格上边界。
            COLORREF guojixiangqi_color = (guojixiangqi_row + guojixiangqi_col) % 2 == 0 ? RGB(238, 221, 187) : RGB(143, 101, 72); // guojixiangqi_color 是棋格深浅颜色。
            if (guojixiangqi_square == guojixiangqi_selected) guojixiangqi_color = RGB(226, 184, 70);
            setfillcolor(guojixiangqi_color);
            solidrectangle(guojixiangqi_left, guojixiangqi_top, guojixiangqi_left + guojixiangqi_cell, guojixiangqi_top + guojixiangqi_cell);
            const int guojixiangqi_piece_value = guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_square); // guojixiangqi_piece_value 是当前格的棋子。
            if (guojixiangqi_piece_value)
            {
                setbkmode(TRANSPARENT);
                settextcolor(guojixiangqi_piece_value > 0 ? RGB(250, 248, 238) : RGB(25, 30, 35));
                settextstyle(64, 0, L"Segoe UI Symbol");
                RECT guojixiangqi_piece_rect = { guojixiangqi_left, guojixiangqi_top - 3, guojixiangqi_left + guojixiangqi_cell, guojixiangqi_top + guojixiangqi_cell }; // guojixiangqi_piece_rect 是棋子符号绘制区域。
                drawtext(guojixiangqi_symbol(guojixiangqi_piece_value), &guojixiangqi_piece_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
            }
        }
    }
    for (const guojixiangqi_move& guojixiangqi_move_value : guojixiangqi_targets) // guojixiangqi_move_value 是当前绘制的合法落点。
    {
        const int guojixiangqi_center_x = guojixiangqi_board_left + (guojixiangqi_move_value.guojixiangqi_to % 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_center_x 是落点中心横坐标。
        const int guojixiangqi_center_y = guojixiangqi_board_top + (guojixiangqi_move_value.guojixiangqi_to / 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_center_y 是落点中心纵坐标。
        setfillcolor(RGB(62, 156, 97));
        if (guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_move_value.guojixiangqi_to))
        {
            setlinecolor(RGB(62, 156, 97));
            setlinestyle(PS_SOLID, 5);
            circle(guojixiangqi_center_x, guojixiangqi_center_y, 34);
        }
        else fillcircle(guojixiangqi_center_x, guojixiangqi_center_y, 10);
    }
    if (guojixiangqi_pending_visible)
    {
        const int guojixiangqi_pending_left = guojixiangqi_board_left + (guojixiangqi_pending_move.guojixiangqi_to % 8) * guojixiangqi_cell; // guojixiangqi_pending_left 是待确认终点格左边界。
        const int guojixiangqi_pending_top = guojixiangqi_board_top + (guojixiangqi_pending_move.guojixiangqi_to / 8) * guojixiangqi_cell; // guojixiangqi_pending_top 是待确认终点格上边界。
        setlinecolor(RGB(42, 119, 184));
        setlinestyle(PS_SOLID, 6);
        rectangle(guojixiangqi_pending_left + 5, guojixiangqi_pending_top + 5, guojixiangqi_pending_left + guojixiangqi_cell - 5, guojixiangqi_pending_top + guojixiangqi_cell - 5);
        setlinestyle(PS_SOLID, 1);
    }
    if (guojixiangqi_hint_visible)
    {
        const int guojixiangqi_hint_from_x = guojixiangqi_board_left + (guojixiangqi_hint_move.guojixiangqi_from % 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_hint_from_x 是推荐着起点中心横坐标。
        const int guojixiangqi_hint_from_y = guojixiangqi_board_top + (guojixiangqi_hint_move.guojixiangqi_from / 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_hint_from_y 是推荐着起点中心纵坐标。
        const int guojixiangqi_hint_to_x = guojixiangqi_board_left + (guojixiangqi_hint_move.guojixiangqi_to % 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_hint_to_x 是推荐着终点中心横坐标。
        const int guojixiangqi_hint_to_y = guojixiangqi_board_top + (guojixiangqi_hint_move.guojixiangqi_to / 8) * guojixiangqi_cell + guojixiangqi_cell / 2; // guojixiangqi_hint_to_y 是推荐着终点中心纵坐标。
        setlinecolor(RGB(255, 210, 72));
        setlinestyle(PS_SOLID, 6);
        circle(guojixiangqi_hint_from_x, guojixiangqi_hint_from_y, 35);
        circle(guojixiangqi_hint_to_x, guojixiangqi_hint_to_y, 28);
        line(guojixiangqi_hint_from_x, guojixiangqi_hint_from_y, guojixiangqi_hint_to_x, guojixiangqi_hint_to_y);
    }
    setfillcolor(RGB(35, 51, 65));
    solidrectangle(guojixiangqi_panel_left, 0, guojixiangqi_window_width, guojixiangqi_window_height);
    setbkmode(TRANSPARENT);
    settextcolor(WHITE);
    settextstyle(34, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 18, L"国际象棋");

    settextcolor(RGB(230, 197, 111));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 68, L"本次操作");
    setfillcolor(RGB(43, 61, 76));
    setlinecolor(RGB(121, 104, 58));
    setlinestyle(PS_SOLID, 2);
    fillroundrect(guojixiangqi_panel_left + 18, 96, guojixiangqi_window_width - 18, 164, 10, 10);
    settextcolor(RGB(225, 234, 239));
    settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    RECT guojixiangqi_status_rect = { guojixiangqi_panel_left + 30, 102, guojixiangqi_window_width - 30, 158 }; // guojixiangqi_status_rect 是本次操作文字区域。
    drawtext(guojixiangqi_status.c_str(), &guojixiangqi_status_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);

    int guojixiangqi_white_pieces = 0; // guojixiangqi_white_pieces 是白方当前场上棋子总数。
    int guojixiangqi_black_pieces = 0; // guojixiangqi_black_pieces 是黑方当前场上棋子总数。
    for (int guojixiangqi_square = 0; guojixiangqi_square < 64; ++guojixiangqi_square) // guojixiangqi_square 是统计双方棋子数的棋格编号。
    {
        const int guojixiangqi_piece_value = guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_square); // guojixiangqi_piece_value 是当前统计格中的棋子编码。
        if (guojixiangqi_piece_value > 0) ++guojixiangqi_white_pieces;
        else if (guojixiangqi_piece_value < 0) ++guojixiangqi_black_pieces;
    }
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 178, L"白方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 208, (L"场上 " + std::to_wstring(guojixiangqi_white_pieces) + L" 子 · 吃子 " + std::to_wstring(16 - guojixiangqi_black_pieces)).c_str());
    settextstyle(17, 0, L"Microsoft YaHei");
    outtextxy(guojixiangqi_panel_left + 22, 238, (L"步时 " + qilei_clock::qilei_format(guojixiangqi_clock_value.qilei_step_remaining) + L" · 局时 " + qilei_clock::qilei_format(guojixiangqi_clock_value.qilei_total_remaining[0])).c_str());
    settextcolor(WHITE);
    settextstyle(21, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 272, L"黑方状态");
    settextcolor(RGB(205, 218, 226));
    settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 302, (L"场上 " + std::to_wstring(guojixiangqi_black_pieces) + L" 子 · 吃子 " + std::to_wstring(16 - guojixiangqi_white_pieces)).c_str());
    settextstyle(17, 0, L"Microsoft YaHei");
    outtextxy(guojixiangqi_panel_left + 22, 332, (L"步时 " + qilei_clock::qilei_format(guojixiangqi_clock_value.qilei_step_remaining) + L" · 局时 " + qilei_clock::qilei_format(guojixiangqi_clock_value.qilei_total_remaining[1])).c_str());

    const guojixiangqi_analysis_result guojixiangqi_analysis = guojixiangqi_analyze(guojixiangqi_board_value); // guojixiangqi_analysis 是当前实时胜负预测。
    settextcolor(RGB(225, 234, 239));
    settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 368, (L"胜负预测  白 " + std::to_wstring(guojixiangqi_analysis.guojixiangqi_white_percent) + L"%  黑 " + std::to_wstring(guojixiangqi_analysis.guojixiangqi_black_percent) + L"%").c_str());
    const int guojixiangqi_bar_left = guojixiangqi_panel_left + 22; // guojixiangqi_bar_left 是胜率条左边界。
    const int guojixiangqi_bar_width = 286; // guojixiangqi_bar_width 是胜率条总宽度。
    const int guojixiangqi_white_width = guojixiangqi_bar_width * guojixiangqi_analysis.guojixiangqi_white_percent / 100; // guojixiangqi_white_width 是白方胜率条宽度。
    setfillcolor(RGB(232, 229, 216));
    solidrectangle(guojixiangqi_bar_left, 404, guojixiangqi_bar_left + guojixiangqi_white_width, 432);
    setfillcolor(RGB(35, 38, 42));
    solidrectangle(guojixiangqi_bar_left + guojixiangqi_white_width, 404, guojixiangqi_bar_left + guojixiangqi_bar_width, 432);
    settextcolor(RGB(205, 218, 226));
    settextstyle(18, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
    outtextxy(guojixiangqi_panel_left + 22, 442, guojixiangqi_analysis.guojixiangqi_summary.c_str());
    settextstyle(17, 0, L"Microsoft YaHei");
    RECT guojixiangqi_engine_rect = { guojixiangqi_panel_left + 22, 468, guojixiangqi_window_width - 18, 508 }; // guojixiangqi_engine_rect 是机器人名称区域。
    drawtext(guojixiangqi_robot_value.guojixiangqi_engine_name().c_str(), &guojixiangqi_engine_rect, DT_LEFT | DT_VCENTER | DT_WORDBREAK);

    if (guojixiangqi_promotion_waiting)
    {
        settextcolor(RGB(230, 197, 111));
        settextstyle(19, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        outtextxy(guojixiangqi_panel_left + 22, 516, L"请选择小兵升变棋子");
        guojixiangqi_draw_button(guojixiangqi_panel_left + 22, 548, 64, L"后 Q", RGB(94, 82, 145));
        guojixiangqi_draw_button(guojixiangqi_panel_left + 94, 548, 64, L"车 R", RGB(59, 124, 154));
        guojixiangqi_draw_button(guojixiangqi_panel_left + 166, 548, 64, L"象 B", RGB(52, 132, 104));
        guojixiangqi_draw_button(guojixiangqi_panel_left + 238, 548, 64, L"马 N", RGB(132, 103, 48));
    }

    guojixiangqi_draw_button(guojixiangqi_panel_left + 18, 632, 134, L"提示 (H)", RGB(52, 132, 104));
    guojixiangqi_draw_button(guojixiangqi_panel_left + 166, 632, 134, L"悔棋 (U)", RGB(59, 124, 154));
    guojixiangqi_draw_button(guojixiangqi_panel_left + 18, 686, 134, L"重开 (N)", RGB(132, 103, 48));
    guojixiangqi_draw_button(guojixiangqi_panel_left + 166, 686, 134, L"投降 (R)", RGB(149, 75, 67));
    guojixiangqi_draw_button(guojixiangqi_panel_left + 18, 740, 282, L"退出对局 (Esc)", RGB(176, 66, 58));
    settextcolor(RGB(118, 82, 59));
    settextstyle(16, 0, L"Microsoft YaHei");
    for (int guojixiangqi_col = 0; guojixiangqi_col < 8; ++guojixiangqi_col) // guojixiangqi_col 是底部列标绘制下标。
        outtextxy(guojixiangqi_board_left + guojixiangqi_col * guojixiangqi_cell + 39, 760, std::wstring(1, static_cast<wchar_t>(L'a' + guojixiangqi_col)).c_str());
    (void)guojixiangqi_setting;
}

bool guojixiangqi_session::guojixiangqi_click_square(int guojixiangqi_square)
{
    if (guojixiangqi_promotion_waiting) return false;
    const int guojixiangqi_piece_value = guojixiangqi_board_value.guojixiangqi_piece(guojixiangqi_square); // guojixiangqi_piece_value 是被点击格的棋子。
    const int guojixiangqi_piece_side = guojixiangqi_piece_value > 0 ? 0 : (guojixiangqi_piece_value < 0 ? 1 : -1); // guojixiangqi_piece_side 是被点击棋子所属方。
    if (guojixiangqi_selected >= 0)
    {
        auto guojixiangqi_iterator = std::find_if(guojixiangqi_targets.begin(), guojixiangqi_targets.end(), [&](const guojixiangqi_move& guojixiangqi_move_value) { return guojixiangqi_move_value.guojixiangqi_to == guojixiangqi_square; }); // guojixiangqi_iterator 指向点击的第一个合法落点。
        if (guojixiangqi_iterator != guojixiangqi_targets.end())
        {
            if (!guojixiangqi_pending_visible || guojixiangqi_pending_move.guojixiangqi_to != guojixiangqi_square)
            {
                guojixiangqi_pending_move = { guojixiangqi_selected, guojixiangqi_square, 0 };
                guojixiangqi_pending_visible = true;
                guojixiangqi_operation_text = L"已选择 " + guojixiangqi_square_text(guojixiangqi_square) + L"，再次点击确认";
                return false;
            }
            const bool guojixiangqi_is_promotion = std::any_of(guojixiangqi_targets.begin(), guojixiangqi_targets.end(), [&](const guojixiangqi_move& guojixiangqi_move_value) { return guojixiangqi_move_value.guojixiangqi_to == guojixiangqi_square && guojixiangqi_move_value.guojixiangqi_promotion != 0; }); // guojixiangqi_is_promotion 表示该终点需要玩家选择升变类型。
            if (guojixiangqi_is_promotion)
            {
                guojixiangqi_promotion_waiting = true;
                guojixiangqi_operation_text = L"小兵到达底线，请在右侧选择升变";
                return false;
            }
            return guojixiangqi_finish_move(*guojixiangqi_iterator);
        }
    }
    if (guojixiangqi_piece_side == guojixiangqi_board_value.guojixiangqi_side())
    {
        guojixiangqi_selected = guojixiangqi_square;
        guojixiangqi_targets = guojixiangqi_board_value.guojixiangqi_legal_moves_from(guojixiangqi_square);
        guojixiangqi_pending_visible = false;
        guojixiangqi_operation_text = L"已选中 " + guojixiangqi_square_text(guojixiangqi_square) + L"，请选择目标格";
    }
    else
    {
        guojixiangqi_selected = -1;
        guojixiangqi_targets.clear();
        guojixiangqi_pending_visible = false;
        guojixiangqi_operation_text = L"请先选择己方棋子";
    }
    return false;
}

bool guojixiangqi_session::guojixiangqi_finish_move(const guojixiangqi_move& guojixiangqi_move_value)
{
    const std::string guojixiangqi_uci = guojixiangqi_board::guojixiangqi_to_uci(guojixiangqi_move_value); // guojixiangqi_uci 是本步记录使用的完整 UCI 坐标。
    if (guojixiangqi_uci.empty() || !guojixiangqi_board_value.guojixiangqi_make_move(guojixiangqi_move_value)) return false;
    guojixiangqi_logger.qilei_write(L"玩家走子：" + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end()));
    guojixiangqi_operation_text = L"玩家走子：" + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end());
    guojixiangqi_hint_visible = false;
    guojixiangqi_pending_visible = false;
    guojixiangqi_promotion_waiting = false;
    guojixiangqi_log_analysis();
    guojixiangqi_selected = -1;
    guojixiangqi_targets.clear();
    return true;
}

bool guojixiangqi_session::guojixiangqi_choose_promotion(int guojixiangqi_piece_type)
{
    if (!guojixiangqi_promotion_waiting) return false;
    auto guojixiangqi_iterator = std::find_if(guojixiangqi_targets.begin(), guojixiangqi_targets.end(), [&](const guojixiangqi_move& guojixiangqi_move_value)
    {
        return guojixiangqi_move_value.guojixiangqi_from == guojixiangqi_pending_move.guojixiangqi_from &&
               guojixiangqi_move_value.guojixiangqi_to == guojixiangqi_pending_move.guojixiangqi_to &&
               guojixiangqi_move_value.guojixiangqi_promotion == guojixiangqi_piece_type;
    }); // guojixiangqi_iterator 指向玩家选定类型对应的合法升变走法。
    return guojixiangqi_iterator != guojixiangqi_targets.end() && guojixiangqi_finish_move(*guojixiangqi_iterator);
}

void guojixiangqi_session::guojixiangqi_reset_round(const qilei_game_setting& guojixiangqi_setting)
{
    guojixiangqi_board_value.guojixiangqi_reset();
    guojixiangqi_clock_value.qilei_reset(guojixiangqi_setting, 0);
    guojixiangqi_selected = -1;
    guojixiangqi_targets.clear();
    guojixiangqi_hint_visible = false;
    guojixiangqi_pending_visible = false;
    guojixiangqi_promotion_waiting = false;
    guojixiangqi_pending_move = {};
    guojixiangqi_operation_text = L"等待白方操作";
    guojixiangqi_logger.qilei_open(L"国际象棋");
    guojixiangqi_logger.qilei_write(L"计时：每步 " + std::to_wstring(guojixiangqi_setting.qilei_step_seconds) + L" 秒，每方 " + std::to_wstring(guojixiangqi_setting.qilei_total_seconds / 60) + L" 分钟。");
    guojixiangqi_logger.qilei_write(L"机器人难度：" + std::to_wstring(guojixiangqi_setting.qilei_robot_level + 1) + L" 级。");
    guojixiangqi_log_analysis();
}

void guojixiangqi_session::guojixiangqi_make_hint(const qilei_game_setting& guojixiangqi_setting)
{
    guojixiangqi_robot_value.guojixiangqi_start();
    const guojixiangqi_move guojixiangqi_candidate = guojixiangqi_robot_value.guojixiangqi_choose_move(guojixiangqi_board_value, qilei_robot_think_ms(guojixiangqi_setting, 2200)); // guojixiangqi_candidate 是引擎给出的推荐走法。
    if (guojixiangqi_candidate.guojixiangqi_from < 0) return;
    guojixiangqi_hint_move = guojixiangqi_candidate;
    guojixiangqi_hint_visible = true;
    const std::string guojixiangqi_uci = guojixiangqi_board::guojixiangqi_to_uci(guojixiangqi_candidate); // guojixiangqi_uci 是推荐着的 UCI 坐标。
    guojixiangqi_logger.qilei_write(L"请求提示：推荐 " + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end()));
    guojixiangqi_operation_text = L"提示：推荐 " + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end());
}

void guojixiangqi_session::guojixiangqi_log_analysis()
{
    const guojixiangqi_analysis_result guojixiangqi_analysis = guojixiangqi_analyze(guojixiangqi_board_value); // guojixiangqi_analysis 是需要写入日志的实时预测。
    guojixiangqi_logger.qilei_write(L"胜负预测：白方 " + std::to_wstring(guojixiangqi_analysis.guojixiangqi_white_percent) + L"%，黑方 " + std::to_wstring(guojixiangqi_analysis.guojixiangqi_black_percent) + L"%（" + guojixiangqi_analysis.guojixiangqi_summary + L"）。");
}

int guojixiangqi_session::guojixiangqi_run(const qilei_game_setting& guojixiangqi_setting)
{
    guojixiangqi_reset_round(guojixiangqi_setting);
    if (guojixiangqi_setting.qilei_robot_mode != 0) guojixiangqi_robot_value.guojixiangqi_start();
    guojixiangqi_logger.qilei_write(L"机器人：" + guojixiangqi_robot_value.guojixiangqi_engine_name());
    initgraph(guojixiangqi_window_width, guojixiangqi_window_height);
    SetWindowTextW(GetHWnd(), L"国际象棋 - Stockfish 18");
    BeginBatchDraw();
    bool guojixiangqi_running = true; // guojixiangqi_running 表示对局窗口循环是否继续。
    bool guojixiangqi_forced_over = false; // guojixiangqi_forced_over 表示对局是否因超时结束。
    std::wstring guojixiangqi_forced_text; // guojixiangqi_forced_text 是超时结果文字。
    unsigned long long guojixiangqi_last_draw = 0; // guojixiangqi_last_draw 是上一次刷新界面的毫秒时刻。
    unsigned long long guojixiangqi_next_robot_tick = GetTickCount64(); // guojixiangqi_next_robot_tick 是允许下一方机器人开始计算的最早毫秒时刻，避免双方机器人无间隔连续调度。
    while (guojixiangqi_running)
    {
        const int guojixiangqi_timeout_side = guojixiangqi_clock_value.qilei_update(); // guojixiangqi_timeout_side 是刚超时的一方。
        if (guojixiangqi_timeout_side >= 0 && !guojixiangqi_forced_over)
        {
            guojixiangqi_forced_over = true;
            guojixiangqi_forced_text = guojixiangqi_timeout_side == 0 ? L"白方超时，黑方获胜" : L"黑方超时，白方获胜";
            guojixiangqi_logger.qilei_write(guojixiangqi_forced_text);
        }
        const bool guojixiangqi_over = guojixiangqi_forced_over || guojixiangqi_board_value.guojixiangqi_game_over(); // guojixiangqi_over 表示对局是否已经结束。
        if (guojixiangqi_board_value.guojixiangqi_game_over() && guojixiangqi_clock_value.qilei_running)
        {
            guojixiangqi_clock_value.qilei_stop();
            guojixiangqi_logger.qilei_write(guojixiangqi_board_value.guojixiangqi_result_text());
        }
        if (!guojixiangqi_over && GetTickCount64() >= guojixiangqi_next_robot_tick && qilei_side_is_robot(guojixiangqi_setting, guojixiangqi_board_value.guojixiangqi_side()))
        {
            guojixiangqi_draw(guojixiangqi_setting, guojixiangqi_robot_value.guojixiangqi_engine_name() + L" 正在思考…");
            FlushBatchDraw();
            const guojixiangqi_move guojixiangqi_robot_move = guojixiangqi_robot_value.guojixiangqi_choose_move(guojixiangqi_board_value, qilei_robot_think_ms(guojixiangqi_setting, 2500)); // guojixiangqi_robot_move 是机器人选出的走法。
            if (guojixiangqi_clock_value.qilei_update() < 0 && guojixiangqi_robot_move.guojixiangqi_from >= 0 && guojixiangqi_board_value.guojixiangqi_make_move(guojixiangqi_robot_move))
            {
                const std::string guojixiangqi_uci = guojixiangqi_board::guojixiangqi_to_uci(guojixiangqi_robot_move); // guojixiangqi_uci 是机器人走法的 UCI 文本。
                guojixiangqi_logger.qilei_write(L"机器人走子：" + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end()));
                guojixiangqi_operation_text = L"机器人走子：" + std::wstring(guojixiangqi_uci.begin(), guojixiangqi_uci.end());
                guojixiangqi_hint_visible = false;
                guojixiangqi_pending_visible = false;
                guojixiangqi_promotion_waiting = false;
                guojixiangqi_log_analysis();
                guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side());
            }
            guojixiangqi_selected = -1;
            guojixiangqi_targets.clear();
            guojixiangqi_next_robot_tick = GetTickCount64() + 200; // guojixiangqi_next_robot_tick 为下一方保留一次界面刷新和消息处理间隔。
        }

        ExMessage guojixiangqi_message; // guojixiangqi_message 是当前鼠标或键盘消息。
        while (peekmessage(&guojixiangqi_message, EM_MOUSE | EM_KEY))
        {
            if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_promotion_waiting &&
                (guojixiangqi_message.vkcode == 'Q' || guojixiangqi_message.vkcode == 'R' || guojixiangqi_message.vkcode == 'B' || guojixiangqi_message.vkcode == 'N'))
            {
                const int guojixiangqi_piece_type = guojixiangqi_message.vkcode == 'Q' ? 5 : (guojixiangqi_message.vkcode == 'R' ? 4 : (guojixiangqi_message.vkcode == 'B' ? 3 : 2)); // guojixiangqi_piece_type 是键盘选择的后、车、象、马编码。
                if (guojixiangqi_choose_promotion(guojixiangqi_piece_type)) guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side());
            }
            else if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_message.vkcode == VK_ESCAPE) guojixiangqi_running = false;
            else if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_message.vkcode == 'H' && !guojixiangqi_over) guojixiangqi_make_hint(guojixiangqi_setting);
            else if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_message.vkcode == 'N')
            {
                guojixiangqi_reset_round(guojixiangqi_setting);
                guojixiangqi_forced_over = false;
                guojixiangqi_forced_text.clear();
            }
            else if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_message.vkcode == 'R' && !guojixiangqi_over)
            {
                guojixiangqi_forced_over = true;
                guojixiangqi_forced_text = guojixiangqi_board_value.guojixiangqi_side() == 0 ? L"白方投降，黑方获胜" : L"黑方投降，白方获胜";
                guojixiangqi_clock_value.qilei_stop();
                guojixiangqi_logger.qilei_write(guojixiangqi_forced_text);
            }
            else if (guojixiangqi_message.message == WM_KEYDOWN && guojixiangqi_message.vkcode == 'U')
            {
                if (guojixiangqi_board_value.guojixiangqi_undo())
                {
                    if (guojixiangqi_setting.qilei_robot_mode != 0 && !qilei_side_is_robot(guojixiangqi_setting, guojixiangqi_board_value.guojixiangqi_side())) guojixiangqi_board_value.guojixiangqi_undo();
                    guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side());
                    guojixiangqi_logger.qilei_write(L"悔棋。");
                    guojixiangqi_hint_visible = false;
                    guojixiangqi_pending_visible = false;
                    guojixiangqi_promotion_waiting = false;
                    guojixiangqi_operation_text = L"已撤回上一轮走子";
                    guojixiangqi_log_analysis();
                    guojixiangqi_forced_over = false;
                }
            }
            else if (guojixiangqi_message.message == WM_LBUTTONDOWN)
            {
                if (guojixiangqi_promotion_waiting && guojixiangqi_message.y >= 548 && guojixiangqi_message.y <= 596 && guojixiangqi_message.x >= guojixiangqi_panel_left + 22 && guojixiangqi_message.x <= guojixiangqi_panel_left + 302)
                {
                    const int guojixiangqi_promotion_index = (guojixiangqi_message.x - (guojixiangqi_panel_left + 22)) / 72; // guojixiangqi_promotion_index 是鼠标点击的四个升变按钮下标。
                    const int guojixiangqi_promotion_types[4] = { 5, 4, 3, 2 }; // guojixiangqi_promotion_types 按后、车、象、马保存内部棋子编码。
                    if (guojixiangqi_promotion_index >= 0 && guojixiangqi_promotion_index < 4 && guojixiangqi_choose_promotion(guojixiangqi_promotion_types[guojixiangqi_promotion_index])) guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side());
                }
                else if (guojixiangqi_message.x >= guojixiangqi_panel_left + 18 && guojixiangqi_message.x <= guojixiangqi_panel_left + 152 && guojixiangqi_message.y >= 632 && guojixiangqi_message.y <= 680 && !guojixiangqi_over) guojixiangqi_make_hint(guojixiangqi_setting);
                else if (guojixiangqi_message.x >= guojixiangqi_panel_left + 166 && guojixiangqi_message.x <= guojixiangqi_panel_left + 300 && guojixiangqi_message.y >= 632 && guojixiangqi_message.y <= 680)
                {
                    if (guojixiangqi_board_value.guojixiangqi_undo()) { if (guojixiangqi_setting.qilei_robot_mode != 0) guojixiangqi_board_value.guojixiangqi_undo(); guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side()); guojixiangqi_logger.qilei_write(L"悔棋。"); guojixiangqi_hint_visible = false; guojixiangqi_pending_visible = false; guojixiangqi_promotion_waiting = false; guojixiangqi_operation_text = L"已撤回上一轮走子"; guojixiangqi_log_analysis(); guojixiangqi_forced_over = false; }
                }
                else if (guojixiangqi_message.x >= guojixiangqi_panel_left + 18 && guojixiangqi_message.x <= guojixiangqi_panel_left + 152 && guojixiangqi_message.y >= 686 && guojixiangqi_message.y <= 734) { guojixiangqi_reset_round(guojixiangqi_setting); guojixiangqi_forced_over = false; guojixiangqi_forced_text.clear(); }
                else if (guojixiangqi_message.x >= guojixiangqi_panel_left + 166 && guojixiangqi_message.x <= guojixiangqi_panel_left + 300 && guojixiangqi_message.y >= 686 && guojixiangqi_message.y <= 734 && !guojixiangqi_over) { guojixiangqi_forced_over = true; guojixiangqi_forced_text = guojixiangqi_board_value.guojixiangqi_side() == 0 ? L"白方投降，黑方获胜" : L"黑方投降，白方获胜"; guojixiangqi_operation_text = guojixiangqi_forced_text; guojixiangqi_clock_value.qilei_stop(); guojixiangqi_logger.qilei_write(guojixiangqi_forced_text); }
                else if (guojixiangqi_message.x >= guojixiangqi_panel_left + 18 && guojixiangqi_message.x <= guojixiangqi_panel_left + 300 && guojixiangqi_message.y >= 740 && guojixiangqi_message.y <= 788) guojixiangqi_running = false;
                else if (!guojixiangqi_over && !qilei_side_is_robot(guojixiangqi_setting, guojixiangqi_board_value.guojixiangqi_side()) &&
                         guojixiangqi_message.x >= guojixiangqi_board_left && guojixiangqi_message.x < guojixiangqi_board_left + 8 * guojixiangqi_cell &&
                         guojixiangqi_message.y >= guojixiangqi_board_top && guojixiangqi_message.y < guojixiangqi_board_top + 8 * guojixiangqi_cell)
                {
                    const int guojixiangqi_col = (guojixiangqi_message.x - guojixiangqi_board_left) / guojixiangqi_cell; // guojixiangqi_col 是鼠标点击棋格列。
                    const int guojixiangqi_row = (guojixiangqi_message.y - guojixiangqi_board_top) / guojixiangqi_cell; // guojixiangqi_row 是鼠标点击棋格行。
                    if (guojixiangqi_click_square(guojixiangqi_row * 8 + guojixiangqi_col)) guojixiangqi_clock_value.qilei_switch(guojixiangqi_board_value.guojixiangqi_side());
                }
            }
        }
        const unsigned long long guojixiangqi_now = GetTickCount64(); // guojixiangqi_now 是当前毫秒时刻。
        if (guojixiangqi_now - guojixiangqi_last_draw >= 100)
        {
            guojixiangqi_draw(guojixiangqi_setting, guojixiangqi_forced_over ? guojixiangqi_forced_text : (guojixiangqi_operation_text.empty() ? guojixiangqi_board_value.guojixiangqi_result_text() : guojixiangqi_operation_text));
            FlushBatchDraw();
            guojixiangqi_last_draw = guojixiangqi_now;
        }
        Sleep(10);
    }
    guojixiangqi_clock_value.qilei_stop();
    guojixiangqi_logger.qilei_write(L"窗口关闭。");
    EndBatchDraw();
    closegraph();
    return 0;
}
