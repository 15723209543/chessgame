#include "feixingqi_game.h"
#include "feixingqi_keyboard.h"
#include <algorithm>
#include <ctime>
#include <windows.h>

namespace feixingqi
{

// 构造游戏对象：初始化所有游戏状态变量和默认设置。
game::game()
    : numplayers(4), state(STATE_SETUP), drawn(0), turnindex(0), curplayer(0),
      dicevalue(1), hasrolled(false), gotsix(false), selectedpiece(-1), winner(-1), loser(-1),
      setupselect(0), quit(false),
      notice(L"请选择游戏人数、棋子数量、机器人和计时设置。"), special(L"无"),
      ranknotice(L""),
      jumpactive(false), jumpfrom(-1), jumpto(-1), jumpowner(-1), logfile(nullptr) {
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        piececounts[i] = 4; // piececounts：每队棋子数量，默认4个。
        eliminated[i] = false; // eliminated：超时判负玩家标记，开局全部有效。
        eliminatedfinished[i] = 0; // eliminatedfinished：判负瞬间完成数，开局为0。
        completed[i] = false; // completed：完成比赛玩家标记，开局全部未完成。
    }
}

// 析构游戏对象：确保日志文件被关闭。
game::~game() {
    close_log();
}

// 初始化游戏：设置随机种子并创建默认棋盘。
void game::init() {
    srand((unsigned)time(nullptr));
    gameboard.init(numplayers);
}

// 游戏主循环：不断绘制当前界面，并等待鼠标或键盘操作。
void game::run() {
    while (!quit) {
        update_clock();
        update_robot();
        ExMessage msg; // msg：EasyX输入消息。
        while (peekmessage(&msg, EM_MOUSE | EM_KEY, true)) {
            if (msg.message == WM_LBUTTONDOWN) {
                handle_click(msg.x, msg.y);
            } else if (msg.message == WM_KEYDOWN) {
                handle_keyboard(*this, msg.vkcode, msg.scancode);
            }
            update_clock();
            update_robot();
        }
        draw();
        Sleep(40);
    }
}

// 重置游戏：回到设置界面并清空运行数据。
void game::reset() {
    close_log();
    numplayers = 4;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        piececounts[i] = 4;
    }
    state = STATE_SETUP;
    players.clear();
    playorder.clear();
    drawvalues.clear();
    rankings.clear();
    eliminationorder.clear();
    history.clear();
    drawn = 0;
    turnindex = 0;
    curplayer = 0;
    dicevalue = 1;
    hasrolled = false;
    gotsix = false;
    selectedpiece = -1;
    winner = -1;
    loser = -1;
    setupselect = 0;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        eliminated[i] = false;
        eliminatedfinished[i] = 0;
        completed[i] = false;
    }
    notice = L"请选择游戏人数、棋子数量、机器人和计时设置。";
    special = L"无";
    ranknotice.clear();
    jumpactive = false;
    jumpfrom = -1;
    jumpto = -1;
    jumpowner = -1;
    timeclock.reset();
    robotai.reset();
    gameboard.init(numplayers);
}

// 保存快照：用于“返回上一步”功能。
void game::save() {
    snapshot snap; // snap：保存点击前的完整游戏状态。
    snap.numplayers = numplayers;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        snap.piececounts[i] = piececounts[i];
    }
    snap.state = state;
    snap.players = players;
    snap.playorder = playorder;
    snap.drawvalues = drawvalues;
    snap.drawn = drawn;
    snap.turnindex = turnindex;
    snap.curplayer = curplayer;
    snap.dicevalue = dicevalue;
    snap.hasrolled = hasrolled;
    snap.gotsix = gotsix;
    snap.selectedpiece = selectedpiece;
    snap.winner = winner;
    snap.loser = loser;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        snap.eliminated[i] = eliminated[i];
        snap.eliminatedfinished[i] = eliminatedfinished[i];
        snap.completed[i] = completed[i];
    }
    snap.eliminationorder = eliminationorder;
    snap.rankings = rankings;
    snap.setupselect = setupselect;
    snap.notice = notice;
    snap.special = special;
    snap.ranknotice = ranknotice;
    snap.jumpactive = jumpactive;
    snap.jumpfrom = jumpfrom;
    snap.jumpto = jumpto;
    snap.jumpowner = jumpowner;
    snap.gameboard = gameboard;
    snap.timeclock = timeclock;
    snap.robotai = robotai;
    history.push_back(snap);
    if (history.size() > 80) {
        history.erase(history.begin());
    }
}

// 返回上一步：从快照栈恢复游戏状态。
void game::undo() {
    if (history.empty()) {
        notice = L"当前没有可以返回的上一步。";
        return;
    }
    snapshot snap = history.back();
    history.pop_back();
    numplayers = snap.numplayers;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        piececounts[i] = snap.piececounts[i];
    }
    state = snap.state;
    players = snap.players;
    playorder = snap.playorder;
    drawvalues = snap.drawvalues;
    drawn = snap.drawn;
    turnindex = snap.turnindex;
    curplayer = snap.curplayer;
    dicevalue = snap.dicevalue;
    hasrolled = snap.hasrolled;
    gotsix = snap.gotsix;
    selectedpiece = snap.selectedpiece;
    winner = snap.winner;
    loser = snap.loser;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        eliminated[i] = snap.eliminated[i];
        eliminatedfinished[i] = snap.eliminatedfinished[i];
        completed[i] = snap.completed[i];
    }
    eliminationorder = snap.eliminationorder;
    rankings = snap.rankings;
    setupselect = snap.setupselect;
    notice = L"已返回上一步。";
    special = snap.special;
    ranknotice = snap.ranknotice;
    jumpactive = snap.jumpactive;
    jumpfrom = snap.jumpfrom;
    jumpto = snap.jumpto;
    jumpowner = snap.jumpowner;
    gameboard = snap.gameboard;
    timeclock = snap.timeclock;
    timeclock.resume_now();
    robotai = snap.robotai;
    robotai.resume();
    log_event(L"返回上一步");
}

// 创建返回按钮：位置在骰子左侧，按钮比原来更小。
button game::back_button() const {
    const bool tomainmenu = state == STATE_SETUP; // tomainmenu：设置页中的该按钮是否用于返回六棋大厅。
    button one(PANEL_X + 28, PANEL_Y + 790, 150, 40, tomainmenu ? L"返回主界面" : L"返回上一步");
    one.bgcolor = RGB(92, 104, 124);
    one.enabled = tomainmenu || !history.empty();
    return one;
}

// 创建骰子点击区域：缩小蓝色区域，避免遮挡规则说明。
button game::dice_button() const {
    return button(PANEL_X + 330, PANEL_Y + 742, 120, 145, L"");
}

// 创建“不走”按钮：和返回按钮在同一行。
button game::skip_button() const {
    button one(PANEL_X + 190, PANEL_Y + 790, 120, 40, L"不走");
    one.bgcolor = RGB(206, 126, 54);
    return one;
}

// 按当前状态绘制界面。
void game::draw() {
    BeginBatchDraw();
    switch (state) {
    case STATE_SETUP:
        draw_setup();
        break;
    case STATE_LOT:
        draw_lot();
        break;
    case STATE_ROLL:
    case STATE_SELECT:
        draw_play();
        break;
    case STATE_OVER:
        draw_over();
        break;
    }
    EndBatchDraw();
}

// 绘制设置界面。
void game::draw_setup() {
    clear_screen(COLOR_BG);
    gameboard.draw_board();
    draw_panel_base(L"游戏设置");
    draw_panel_setup();
}

// 绘制抽签界面。
void game::draw_lot() {
    clear_screen(COLOR_BG);
    gameboard.draw_board();
    gameboard.draw_pieces(players, -1, false);
    draw_panel_base(L"抽签顺序");
    draw_panel_lot();
}

// 绘制游戏进行界面。
void game::draw_play() {
    clear_screen(COLOR_BG);
    gameboard.draw_board();
    draw_jump_path();
    gameboard.draw_pieces(players, curplayer, state == STATE_SELECT);
    if (state == STATE_SELECT) {
        draw_select_marks();
    }
    draw_panel_base(L"游戏信息");
    draw_panel_play();
}

// 绘制游戏结束界面。
void game::draw_over() {
    clear_screen(COLOR_BG);
    gameboard.draw_board();
    gameboard.draw_pieces(players, -1, false);
    draw_panel_base(L"游戏结束");
    draw_panel_over();
}

// 绘制右侧面板基础外框和标题。
void game::draw_panel_base(const std::wstring& title) {
    setfillcolor(COLOR_PANEL);
    setlinecolor(RGB(182, 190, 204));
    fillrectangle(PANEL_X, PANEL_Y, PANEL_X + PANEL_W, PANEL_Y + PANEL_H);
    rectangle(PANEL_X, PANEL_Y, PANEL_X + PANEL_W, PANEL_Y + PANEL_H);
    draw_text_left(PANEL_X + 28, PANEL_Y + 18, title, RGB(38, 67, 122), 26);
    setlinecolor(RGB(214, 220, 230));
    line(PANEL_X + 24, PANEL_Y + 720, PANEL_X + PANEL_W - 24, PANEL_Y + 720);
}

// setup_row_y：返回设置界面第row行的上边界。
int game::setup_row_y(int row) const {
    return PANEL_Y + 130 + row * 78;
}

// setup_minus_button：返回设置界面第row行的减少按钮。
button game::setup_minus_button(int row) const {
    button one(PANEL_X + 282, setup_row_y(row) + 13, 42, 34, L"-");
    one.bgcolor = COLOR_DANGER;
    return one;
}

// setup_plus_button：返回设置界面第row行的增加按钮。
button game::setup_plus_button(int row) const {
    button one(PANEL_X + 398, setup_row_y(row) + 13, 42, 34, L"+");
    one.bgcolor = COLOR_GOOD;
    return one;
}

// setup_label：返回设置界面第row行的标题。
std::wstring game::setup_label(int row) const {
    switch (row) {
    case 0:
        return L"玩家人数";
    case 1:
        return L"所有玩家棋子数量";
    case 2:
        return L"机器人数量";
    case 3:
        return L"每步时长";
    case 4:
        return L"单方时长";
    default:
        return L"设置项";
    }
}

// setup_value_text：返回设置界面第row行当前值的显示文本。
std::wstring game::setup_value_text(int row) const {
    switch (row) {
    case 0:
        return std::to_wstring(numplayers);
    case 1:
        return std::to_wstring(piececounts[0]);
    case 2:
        return std::to_wstring(robotai.count());
    case 3:
        return timeclock.step_label();
    case 4:
        return timeclock.total_label();
    default:
        return L"";
    }
}

// draw_setup_row：绘制设置界面一整行，当前选中行会用绿色边框提示。
void game::draw_setup_row(int row, int y, const std::wstring& label, const std::wstring& value,
                          bool candecrease, bool canincrease) {
    int x = PANEL_X + 30; // x：设置行左边界。
    int w = PANEL_W - 60; // w：设置行宽度。
    COLORREF border = row == setupselect ? COLOR_GOOD : RGB(214, 220, 230);
    COLORREF fill = row == setupselect ? RGB(241, 248, 244) : RGB(246, 248, 252);

    setfillcolor(fill);
    setlinecolor(border);
    setlinestyle(PS_SOLID, row == setupselect ? 2 : 1);
    fillrectangle(x, y, x + w, y + 60);
    rectangle(x, y, x + w, y + 60);
    setlinestyle(PS_SOLID, 1);

    draw_text_left(x + 18, y + 18, label, row == setupselect ? COLOR_GOOD : COLOR_TEXT, 17);

    button minus = setup_minus_button(row);
    minus.enabled = candecrease;
    minus.draw();

    draw_text_center(PANEL_X + 330, y + 13, 62, 34, value, COLOR_TEXT, 17);

    button plus = setup_plus_button(row);
    plus.enabled = canincrease;
    plus.draw();
}

// sync_piececounts：把所有玩家棋子数量同步成同一个数。
void game::sync_piececounts(int count) {
    if (count < 2) {
        count = 2;
    }
    if (count > 6) {
        count = 6;
    }
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        piececounts[i] = count;
    }
}

// change_setup_value：按当前选中行执行一次减少或增加。
bool game::change_setup_value(int row, int delta) {
    bool changed = false; // changed：本次是否真的改变了设置值。
    if (row == 0) {
        int next = numplayers + delta;
        if (next >= 2 && next <= 6) {
            save();
            numplayers = next;
            robotai.setcount(numplayers, robotai.count());
            gameboard.init(numplayers);
            changed = true;
            notice = L"玩家人数已调整为 " + std::to_wstring(numplayers) + L" 人。";
        }
    } else if (row == 1) {
        int next = piececounts[0] + delta;
        if (next >= 2 && next <= 6) {
            save();
            sync_piececounts(next);
            changed = true;
            notice = L"所有玩家棋子数量已调整为 " + std::to_wstring(piececounts[0]) + L"。";
        }
    } else if (row == 2) {
        int next = robotai.count() + delta;
        if (next >= 0 && next <= numplayers) {
            save();
            robotai.setcount(numplayers, next);
            changed = true;
            notice = L"机器人数量已调整为 " + std::to_wstring(robotai.count()) +
                     L"，编号靠后的队伍由机器人控制。";
        }
    } else if (row == 3) {
        int next = timeclock.stepindex + delta;
        if (next >= 0 && next < 3) {
            save();
            timeclock.set_step_index(next);
            changed = true;
            notice = L"每步时长已调整为 " + timeclock.step_label() + L"。";
        }
    } else if (row == 4) {
        int next = timeclock.totalindex + delta;
        if (next >= 0 && next < 4) {
            save();
            timeclock.set_total_index(next);
            changed = true;
            notice = L"单方时长已调整为 " + timeclock.total_label() + L"。";
        }
    }

    if (!changed) {
        notice = L"该项已经到达限制，不能继续调整。";
    }
    return changed;
}

// is_active_player：判断玩家是否仍需行动，既未超时判负也未完成比赛。
bool game::is_active_player(int owner) const {
    return owner >= 0 && owner < (int)players.size() && !eliminated[owner] && !completed[owner];
}

// active_count：统计还没有被超时淘汰的玩家人数。
int game::active_count() const {
    int count = 0; // count：有效玩家数量。
    for (int i = 0; i < (int)players.size(); ++i) {
        if (is_active_player(i)) {
            ++count;
        }
    }
    return count;
}

// only_active_player：如果只剩一名有效玩家，返回该玩家编号。
int game::only_active_player() const {
    for (int i = 0; i < (int)players.size(); ++i) {
        if (is_active_player(i)) {
            return i;
        }
    }
    return -1;
}

// rank_of：返回指定玩家当前名次，尚未进入排名时返回0。
int game::rank_of(int owner) const {
    for (int i = 0; i < (int)rankings.size(); ++i) {
        if (rankings[i] == owner) {
            return i + 1;
        }
    }
    return 0;
}

// eliminated_ranking：按完成比例从高到低排列判负玩家；比例相同时后判负者靠前。
std::vector<int> game::eliminated_ranking() const {
    std::vector<int> order = eliminationorder; // order：按当前规则计算出的判负玩家顺序。
    std::sort(order.begin(), order.end(), [&](int a, int b) {
        long long left = (long long)eliminatedfinished[a] * players[b].piececount;
        long long right = (long long)eliminatedfinished[b] * players[a].piececount;
        if (left != right) {
            return left > right;
        }

        int apos = 0; // apos：玩家a在原始判负顺序中的位置。
        int bpos = 0; // bpos：玩家b在原始判负顺序中的位置。
        for (int i = 0; i < (int)eliminationorder.size(); ++i) {
            if (eliminationorder[i] == a) {
                apos = i;
            }
            if (eliminationorder[i] == b) {
                bpos = i;
            }
        }
        return apos > bpos;
    });
    return order;
}

// eliminated_rank：返回判负玩家当前动态名次，后续有人判负时该名次可能变化。
int game::eliminated_rank(int owner) const {
    std::vector<int> order = eliminated_ranking();
    int first = numplayers - (int)order.size() + 1; // first：当前判负区最靠前的名次。
    for (int i = 0; i < (int)order.size(); ++i) {
        if (order[i] == owner) {
            return first + i;
        }
    }
    return 0;
}

// display_player：返回带机器人身份标记的玩家标题。
std::wstring game::display_player(int owner) const {
    std::wstring text = player_title(owner);
    if (robotai.isrobot(owner)) {
        text += L"（机器人）";
    }
    return text;
}

// finish_if_decided：只剩一位未完成玩家时补齐末位，并结束本局显示完整排名。
bool game::finish_if_decided(const std::wstring& text) {
    int left = active_count(); // left：仍需行动的玩家数量。
    if (left > 1) {
        return false;
    }

    if (left == 1) {
        int last = only_active_player(); // last：最后一位仍在场上的玩家。
        if (last >= 0 && rank_of(last) == 0) {
            rankings.push_back(last);
            ranknotice = display_player(last) + L"为最后剩余玩家，当前排名 " +
                         std::to_wstring(rankings.size()) + L"。";
            log_event(ranknotice);
        }
    }

    winner = rankings.empty() ? -1 : rankings.front();
    state = STATE_OVER;
    hasrolled = false;
    gotsix = false;
    selectedpiece = -1;
    special = L"排名已确定";
    notice = text;
    if (!ranknotice.empty()) {
        notice += L"\n" + ranknotice;
    }
    timeclock.stop();
    robotai.cancel();
    log_event(L"全部名次已经确定，本局结束。");
    for (int i = 0; i < (int)rankings.size(); ++i) {
        log_event(L"最终第 " + std::to_wstring(i + 1) + L" 名：" + display_player(rankings[i]));
    }
    std::vector<int> outorder = eliminated_ranking();
    for (int i = 0; i < (int)outorder.size(); ++i) {
        int owner = outorder[i];
        log_event(L"最终第 " + std::to_wstring(eliminated_rank(owner)) + L" 名：" +
                  display_player(owner) + L"，超时判负，完成 " +
                  std::to_wstring(eliminatedfinished[owner]) + L"/" +
                  std::to_wstring(players[owner].piececount));
    }
    close_log();
    return true;
}

// 绘制设置面板：人数、棋子数量和开始按钮。
void game::draw_panel_setup() {
    {
        int x = PANEL_X + 30; // x：右侧内容左边距。
        draw_text_wrap(x, PANEL_Y + 76, PANEL_W - 60,
                       L"上下选择设置项，左右调整当前项；机器人安排在编号靠后的队伍。",
                       COLOR_MUTED, 14, 18, 2);

        draw_setup_row(0, setup_row_y(0), setup_label(0), setup_value_text(0),
                       numplayers > 2, numplayers < 6);
        draw_setup_row(1, setup_row_y(1), setup_label(1), setup_value_text(1),
                       piececounts[0] > 2, piececounts[0] < 6);
        draw_setup_row(2, setup_row_y(2), setup_label(2), setup_value_text(2),
                       robotai.count() > 0, robotai.count() < numplayers);
        draw_setup_row(3, setup_row_y(3), setup_label(3), setup_value_text(3),
                       timeclock.stepindex > 0, timeclock.stepindex < 2);
        draw_setup_row(4, setup_row_y(4), setup_label(4), setup_value_text(4),
                       timeclock.totalindex > 0, timeclock.totalindex < 3);

        button start(x, PANEL_Y + 700, PANEL_W - 60, 48, L"开始抽签");
        start.bgcolor = RGB(206, 66, 66);
        start.draw();
        draw_back_button();
        draw_text_wrap(x, PANEL_Y + 760, PANEL_W - 60, notice, COLOR_MUTED, 14, 18, 3);
        return;
    }

    int x = PANEL_X + 30; // x：右侧内容左边距。
    int y = PANEL_Y + 76; // y：当前绘制行Y坐标。
    draw_text_left(x, y, L"选择玩家人数", COLOR_TEXT, 18);
    y += 36;
    for (int i = 0; i < 5; ++i) {
        int val = i + 2;
        button one(x + i * 68, y, 54, 38, std::to_wstring(val));
        one.bgcolor = val == numplayers ? COLOR_GOOD : RGB(76, 125, 209);
        one.draw();
    }

    y += 66;
    draw_text_left(x, y, L"每队棋子数量", COLOR_TEXT, 18);
    y += 34;
    for (int i = 0; i < numplayers; ++i) {
        int rowy = y + i * 44;
        setfillcolor(PLAYER_COLORS[i]);
        setlinecolor(PLAYER_COLORS[i]);
        solidrectangle(x, rowy + 8, x + 24, rowy + 32);
        draw_text_left(x + 34, rowy + 8, player_name(i), PLAYER_COLORS[i], 16);
        button minus(x + 190, rowy, 36, 32, L"-");
        minus.bgcolor = COLOR_DANGER;
        minus.enabled = piececounts[i] > 2;
        minus.draw();
        draw_text_center(x + 232, rowy, 44, 32, std::to_wstring(piececounts[i]), COLOR_TEXT, 17);
        button plus(x + 282, rowy, 36, 32, L"+");
        plus.bgcolor = COLOR_GOOD;
        plus.enabled = piececounts[i] < 6;
        plus.draw();
    }

    int timey = y + numplayers * 44 + 18; // timey：计时设置区域起始Y坐标。
    draw_text_left(x, timey, L"每步时长", COLOR_TEXT, 17);
    int stepvalues[] = {10, 15, 30};
    for (int i = 0; i < 3; ++i) {
        button one(x + i * 78, timey + 28, 62, 30, std::to_wstring(stepvalues[i]) + L"s");
        one.bgcolor = i == timeclock.stepindex ? COLOR_GOOD : RGB(76, 125, 209);
        one.draw();
    }

    timey += 76;
    draw_text_left(x, timey, L"单方时长", COLOR_TEXT, 17);
    int totalvalues[] = {5, 10, 15, 30};
    for (int i = 0; i < 4; ++i) {
        button one(x + i * 92, timey + 28, 76, 30, std::to_wstring(totalvalues[i]) + L"min");
        one.bgcolor = i == timeclock.totalindex ? COLOR_GOOD : RGB(76, 125, 209);
        one.draw();
    }

    button start(x, PANEL_Y + 700, PANEL_W - 60, 48, L"开始抽签");
    start.bgcolor = RGB(206, 66, 66);
    start.draw();
    draw_back_button();
    draw_text_wrap(x, PANEL_Y + 760, PANEL_W - 60, notice, COLOR_MUTED, 14, 18, 2);
}

// 绘制抽签面板：抽签点数和出发顺序分区显示。
void game::draw_panel_lot() {
    int x = PANEL_X + 30;
    int y = PANEL_Y + 76;
    if (drawn < numplayers) {
        draw_text_left(x, y, L"当前操作是：" + display_player(drawn), COLOR_TEXT, 17);
        std::wstring prompt = robotai.isrobot(drawn)
                                  ? L"机器人正在自动滚动骰子抽签。"
                                  : L"点击下方骰子抽签，点数大的先出发。";
        draw_text_left(x, y + 34, prompt, COLOR_MUTED, 14);
    } else {
        draw_text_left(x, y, L"抽签完成。", COLOR_TEXT, 17);
    }

    y += 78;
    draw_text_left(x, y, L"抽签点数", COLOR_TEXT, 16);
    y += 26;
    for (int i = 0; i < numplayers; ++i) {
        int rowy = y + i * 30;
        setfillcolor(PLAYER_COLORS[i]);
        setlinecolor(PLAYER_COLORS[i]);
        solidrectangle(x, rowy + 5, x + 20, rowy + 25);
        std::wstring text = display_player(i);
        text += drawvalues[i] > 0 ? L"  点数：" + std::to_wstring(drawvalues[i]) : L"  等待抽签";
        draw_text_left(x + 30, rowy + 5, text, COLOR_TEXT, 15);
    }

    if (drawn >= numplayers) {
        std::vector<int> order(numplayers);
        for (int i = 0; i < numplayers; ++i) {
            order[i] = i;
        }
        std::sort(order.begin(), order.end(), [&](int a, int b) {
            return drawvalues[a] == drawvalues[b] ? a < b : drawvalues[a] > drawvalues[b];
        });

        int oy = PANEL_Y + 395;
        draw_text_left(x, oy - 28, L"出发顺序", COLOR_TEXT, 16);
        for (int i = 0; i < numplayers; ++i) {
            std::wstring text = std::to_wstring(i + 1) + L". " + display_player(order[i]);
            draw_text_left(x, oy + i * 28, text, PLAYER_COLORS[order[i]], 15);
        }
        button start(x, PANEL_Y + 700, PANEL_W - 60, 48, L"进入游戏");
        start.bgcolor = COLOR_GOOD;
        start.draw();
    }

    draw_back_button();
    if (drawn < numplayers) {
        draw_dice_box(!robotai.isrobot(drawn) || robotai.rolling(drawn));
    }
    draw_text_wrap(x, PANEL_Y + 760, PANEL_W - 60, notice, COLOR_MUTED, 14, 18, 2);
}

// 绘制游戏面板：操作说明、输出框、进度、规则、按钮和骰子。
void game::draw_panel_play() {
    {
        int x = PANEL_X + 30;
        int y = PANEL_Y + 76;
        if (!ranknotice.empty()) {
            draw_text_left(x, y, ranknotice, COLOR_GOOD, 15);
            y += 28;
        }
        if (!players.empty()) {
            draw_text_left(x, y, L"当前操作是：" + display_player(curplayer), COLOR_TEXT, 18);
        }
        y += 30;
        draw_text_left(x, y, L"本步剩余时间：" +
                       timeclock.format_seconds(timeclock.step_left_seconds()) +
                       L" / 每步 " + timeclock.step_label(),
                       timeclock.step_left_seconds() <= 5 ? COLOR_DANGER : COLOR_TEXT, 16);
        y += 30;
        if (robotai.isrobot(curplayer) && robotai.rolling(curplayer)) {
            draw_text_left(x, y, L"机器人正在滚动骰子：" + std::to_wstring(dicevalue),
                           RGB(38, 94, 158), 16);
        } else if (hasrolled && robotai.isrobot(curplayer) && robotai.confirming(curplayer)) {
            draw_text_left(x, y, L"机器人已选择 " + std::to_wstring(selectedpiece + 1) +
                           L"号棋子，正在确认移动。", RGB(38, 94, 158), 16);
        } else if (hasrolled && robotai.isrobot(curplayer) && robotai.moving(curplayer)) {
            draw_text_left(x, y, L"机器人投出 " + std::to_wstring(dicevalue) +
                           L" 点，正在显示并分析可走棋子。",
                           RGB(38, 94, 158), 16);
        } else if (hasrolled && selectedpiece >= 0) {
            draw_text_left(x, y, L"已选择 " + std::to_wstring(selectedpiece + 1) +
                           L"号棋子，请再次选择确认移动。", COLOR_TEXT, 16);
        } else if (hasrolled) {
            draw_text_left(x, y, L"当前玩家投掷出的点数是：" + std::to_wstring(dicevalue), COLOR_TEXT, 16);
        } else if (robotai.isrobot(curplayer)) {
            draw_text_left(x, y, L"机器人决策中，剩余 " +
                           std::to_wstring(robotai.waitleftseconds()) + L" 秒。",
                           RGB(38, 94, 158), 16);
        } else {
            draw_text_left(x, y, L"请点击右下骰子投掷。", COLOR_TEXT, 16);
        }

        int outy = PANEL_Y + (ranknotice.empty() ? 182 : 204); // outy：蓝色输出框上边界。
        int outh = ranknotice.empty() ? 92 : 70; // outh：排名提示出现后压缩输出框高度。
        setfillcolor(RGB(246, 248, 252));
        setlinecolor(RGB(80, 160, 220));
        fillrectangle(x - 4, outy, PANEL_X + PANEL_W - 30, outy + outh);
        rectangle(x - 4, outy, PANEL_X + PANEL_W - 30, outy + outh);

        int texty = outy + 12; // texty：输出框内当前文字Y坐标。
        int maxlines = ranknotice.empty() ? 4 : 3; // maxlines：输出框最多显示行数。
        if (special != L"无") {
            draw_text_left(x + 10, texty, L"特殊操作：" + special,
                           special == L"超时判负" ? COLOR_DANGER : RGB(169, 91, 25), 14);
            texty += 22;
            maxlines = ranknotice.empty() ? 3 : 2;
        }
        draw_text_wrap(x + 10, texty, PANEL_W - 76, notice, COLOR_MUTED, 15, 18, maxlines);

        draw_progress(x, PANEL_Y + 300);
        draw_rules(x, PANEL_Y + 550);
        draw_back_button();
        if (state == STATE_SELECT && !robotai.isrobot(curplayer)) {
            button skip = skip_button();
            skip.draw();
        }
        draw_dice_box(state == STATE_ROLL &&
                      (!robotai.isrobot(curplayer) || robotai.rolling(curplayer)));
        return;
    }

    int x = PANEL_X + 30;
    int y = PANEL_Y + 76;
    if (!players.empty()) {
        draw_text_left(x, y, L"当前操作是：" + player_title(curplayer), COLOR_TEXT, 18);
    }
    y += 30;
    draw_text_left(x, y, L"本步剩余时间：" +
                   timeclock.format_seconds(timeclock.step_left_seconds()) +
                   L" / 每步 " + timeclock.step_label(),
                   timeclock.step_left_seconds() <= 5 ? COLOR_DANGER : COLOR_TEXT, 16);
    y += 30;
    if (hasrolled) {
        draw_text_left(x, y, L"当前玩家投掷出的点数是：" + std::to_wstring(dicevalue), COLOR_TEXT, 16);
    } else {
        draw_text_left(x, y, L"请点击右下骰子投掷。", COLOR_TEXT, 16);
    }
    y += 34;
    draw_text_left(x, y, L"特殊操作：" + special, special == L"无" ? COLOR_MUTED : RGB(169, 91, 25), 15);

    int outy = PANEL_Y + 182; // outy：输出框上边界，上移以减少右侧空白。
    setfillcolor(RGB(246, 248, 252));
    setlinecolor(RGB(80, 160, 220));
    fillrectangle(x - 4, outy, PANEL_X + PANEL_W - 30, outy + 92);
    rectangle(x - 4, outy, PANEL_X + PANEL_W - 30, outy + 92);
    draw_text_wrap(x + 10, outy + 12, PANEL_W - 76, notice, COLOR_MUTED, 15, 18, 4);

    draw_progress(x, PANEL_Y + 300);
    draw_rules(x, PANEL_Y + 550);
    draw_back_button();
    if (state == STATE_SELECT) {
        button skip = skip_button();
        skip.draw();
    }
    draw_dice_box(state == STATE_ROLL);
}

// 绘制游戏结束面板。
void game::draw_panel_over() {
    {
        int x = PANEL_X + 30;
        int y = PANEL_Y + 82;
        if (winner >= 0) {
            draw_text_left(x, y, display_player(winner) + L" 获得第一名！", PLAYER_COLORS[winner], 24);
        } else {
            draw_text_left(x, y, L"比赛结束", COLOR_TEXT, 24);
        }
        draw_text_wrap(x, y + 42, PANEL_W - 60, notice, COLOR_MUTED, 14, 18, 2);

        int listy = y + 94; // listy：最终排名列表开始位置。
        draw_text_left(x, listy, L"最终排名", COLOR_TEXT, 18);
        listy += 30;
        for (int i = 0; i < (int)rankings.size(); ++i) {
            int owner = rankings[i]; // owner：当前名次对应的玩家编号。
            setfillcolor(PLAYER_COLORS[owner]);
            setlinecolor(PLAYER_COLORS[owner]);
            solidrectangle(x, listy + 3, x + 22, listy + 25);
            std::wstring text = std::to_wstring(i + 1) + L". " + display_player(owner);
            if (!completed[owner]) {
                text += L"（最后剩余）";
            }
            draw_text_left(x + 32, listy + 3, text, PLAYER_COLORS[owner], 15);
            listy += 30;
        }
        std::vector<int> outorder = eliminated_ranking(); // outorder：最终判负玩家的排名顺序。
        for (int i = 0; i < (int)outorder.size(); ++i) {
            int owner = outorder[i];
            int rank = eliminated_rank(owner);
            setfillcolor(PLAYER_COLORS[owner]);
            setlinecolor(PLAYER_COLORS[owner]);
            solidrectangle(x, listy + 3, x + 22, listy + 25);
            std::wstring text = std::to_wstring(rank) + L". " + display_player(owner) +
                                L"：超时判负，完成" +
                                std::to_wstring(eliminatedfinished[owner]) + L"/" +
                                std::to_wstring(players[owner].piececount);
            draw_text_left(x + 32, listy + 3, text, COLOR_DANGER, 13);
            listy += 30;
        }

        draw_progress(x, PANEL_Y + 430);
        draw_text_left(x, PANEL_Y + 700, L"本局操作记录已写入 result 文件夹。", COLOR_TEXT, 14);
        if (!logpath.empty()) {
            std::wstring showpath = logpath;
            size_t pos = showpath.find_last_of(L"\\/");
            if (pos != std::wstring::npos) {
                showpath = showpath.substr(pos + 1);
            }
            draw_text_left(x, PANEL_Y + 724, L"文件：" + showpath, COLOR_MUTED, 12);
        }
        draw_back_button();

        button again(x, PANEL_Y + 842, 150, 42, L"重新开始");
        again.bgcolor = COLOR_GOOD;
        again.draw();
        button exitbtn(x + 170, PANEL_Y + 842, 150, 42, L"返回主界面");
        exitbtn.bgcolor = COLOR_DANGER;
        exitbtn.draw();
        return;
    }

    int x = PANEL_X + 30;
    int y = PANEL_Y + 82;
    if (loser >= 0) {
        draw_text_left(x, y, player_title(loser) + L" 时间用完，判负！", COLOR_DANGER, 25);
    } else if (winner >= 0) {
        draw_text_left(x, y, player_title(winner) + L" 获胜！", PLAYER_COLORS[winner], 25);
    }
    draw_text_left(x, y + 48, L"本局操作记录已写入 result 文件夹。", COLOR_TEXT, 15);
    if (!logpath.empty()) {
        std::wstring showpath = logpath;
        size_t pos = showpath.find_last_of(L"\\/");
        if (pos != std::wstring::npos) {
            showpath = showpath.substr(pos + 1);
        }
        draw_text_left(x, y + 76, L"文件：" + showpath, COLOR_MUTED, 13);
    }
    draw_progress(x, PANEL_Y + 300);
    draw_rules(x, PANEL_Y + 550);
    draw_back_button();

    button again(x, PANEL_Y + 842, 150, 42, L"重新开始");
    again.bgcolor = COLOR_GOOD;
    again.draw();
    button exitbtn(x + 170, PANEL_Y + 842, 150, 42, L"返回主界面");
    exitbtn.bgcolor = COLOR_DANGER;
    exitbtn.draw();
}

// 绘制返回按钮。
void game::draw_back_button() {
    button one = back_button();
    one.draw();
}

// 绘制骰子区域：缩小蓝色外框和骰子大小。
void game::draw_dice_box(bool active) {
    button area = dice_button();
    COLORREF fill = active ? RGB(245, 248, 252) : RGB(230, 233, 239);
    setfillcolor(fill);
    setlinecolor(active ? RGB(68, 112, 188) : RGB(170, 178, 192));
    setlinestyle(PS_SOLID, active ? 3 : 1);
    fillrectangle(area.x, area.y, area.x + area.w, area.y + area.h);
    rectangle(area.x, area.y, area.x + area.w, area.y + area.h);
    setlinestyle(PS_SOLID, 1);

    int value = dicevalue;
    if (value < 1 || value > 6) {
        value = 1;
    }
    draw_dice(area.x + 25, area.y + 18, 70, value, COLOR_WHITE);
    bool robotrolling = (state == STATE_LOT && drawn < numplayers && robotai.rolling(drawn)) ||
                        ((state == STATE_ROLL || state == STATE_SELECT) && robotai.rolling(curplayer));
    std::wstring label = active ? (robotrolling ? L"骰子滚动" : L"点击骰子")
                                : (hasrolled ? L"骰子结果" : L"骰子等待");
    draw_text_center(area.x, area.y + 98, area.w, 32, label,
                     active ? RGB(38, 67, 122) : COLOR_MUTED, 15);
}

// 绘制玩家完成任务进度：文案改成“xx队完成任务进度”。
void game::draw_progress(int x, int y) {
    {
        draw_text_left(x, y, L"玩家任务进度", COLOR_TEXT, 18);
        y += 34;
        for (int i = 0; i < (int)players.size(); ++i) {
            bool out = eliminated[i]; // out：该玩家是否已经超时判负。
            bool done = completed[i]; // done：该玩家是否已经完成比赛。
            int rank = out ? eliminated_rank(i) : rank_of(i); // rank：完成或判负玩家的当前名次。
            int finished = out ? eliminatedfinished[i] : players[i].arrivedcount();
            int total = players[i].piececount;
            if (total <= 0) {
                total = players[i].piececount;
            }

            setfillcolor(PLAYER_COLORS[i]);
            setlinecolor(PLAYER_COLORS[i]);
            solidrectangle(x, y + 4, x + 24, y + 28);

            std::wstring text = std::wstring(player_name(i));
            if (robotai.isrobot(i)) {
                text += L"(机器人)";
            }
            if (out) {
                text += L" 第" + std::to_wstring(rank) + L"名 超时判负";
                text += L" 完成" + std::to_wstring(finished) + L"/" + std::to_wstring(total);
            } else if (rank > 0) {
                text += L" 第" + std::to_wstring(rank) + L"名";
                text += done ? L" 已完成" : L" 最后剩余";
            } else {
                text += L" 剩余" + timeclock.format_seconds(timeclock.player_left_seconds(i));
                text += L" 完成 " + std::to_wstring(finished) + L"/" + std::to_wstring(total);
            }

            std::wstring statustext;
            int statuscount = 0; // statuscount：本行已经写出的特殊状态数量。
            bool morestatus = false; // morestatus：状态太多时显示“等”。
            if (!out && !done && rank == 0) {
                for (int k = 0; k < (int)players[i].pieces.size(); ++k) {
                    const piece& one = players[i].pieces[k];
                    if (one.extralaps > 0) {
                        if (statuscount < 2) {
                            if (!statustext.empty()) {
                                statustext += L"；";
                            }
                            statustext += std::to_wstring(one.id + 1) + L"号多跑";
                            statustext += one.extralaps == 1 ? L"一圈" : std::to_wstring(one.extralaps) + L"圈";
                        } else {
                            morestatus = true;
                        }
                        ++statuscount;
                    }
                    if (one.skipturns > 0) {
                        if (statuscount < 2) {
                            if (!statustext.empty()) {
                                statustext += L"；";
                            }
                            statustext += std::to_wstring(one.id + 1) + L"号停止一次";
                        } else {
                            morestatus = true;
                        }
                        ++statuscount;
                    }
                }
            }
            if (morestatus) {
                statustext += L"等";
            }

            COLORREF textcolor = out ? COLOR_DANGER : (rank > 0 ? COLOR_GOOD : COLOR_TEXT);
            draw_text_left(x + 34, y + 3, text, textcolor,
                           out ? 12 : (statustext.empty() ? 14 : 13));
            if (!statustext.empty()) {
                draw_text_left(x + 285, y + 4, statustext, RGB(169, 91, 25), 12);
            }

            int barx = x + 34;
            int bary = y + 27;
            int barw = PANEL_W - 94;
            setfillcolor(RGB(224, 229, 238));
            setlinecolor(RGB(224, 229, 238));
            solidrectangle(barx, bary, barx + barw, bary + 8);
            if (total > 0) {
                setfillcolor(PLAYER_COLORS[i]);
                int barfinished = done ? total : finished;
                solidrectangle(barx, bary, barx + barw * barfinished / total, bary + 8);
            }
            y += 34;
        }
        return;
    }

    draw_text_left(x, y, L"玩家任务进度", COLOR_TEXT, 18);
    y += 34;
    for (int i = 0; i < (int)players.size(); ++i) {
        int finished = players[i].arrivedcount();
        int total = (int)players[i].pieces.size();
        setfillcolor(PLAYER_COLORS[i]);
        setlinecolor(PLAYER_COLORS[i]);
        solidrectangle(x, y + 4, x + 24, y + 28);
        std::wstring text = std::wstring(player_name(i)) + L" 剩余" +
                            timeclock.format_seconds(timeclock.player_left_seconds(i)) +
                            L" 完成 " + std::to_wstring(finished) + L"/" + std::to_wstring(total);

        // statustext：显示本队棋子的当前特殊状态，罚圈全程显示，停止一次结束后消失。
        std::wstring statustext;
        int statuscount = 0; // statuscount：已写入进度行的特殊状态数量，避免文字过长。
        bool morestatus = false; // morestatus：状态过多时用“等”提示。
        for (int k = 0; k < total; ++k) {
            const piece& one = players[i].pieces[k];
            if (one.extralaps > 0) {
                if (statuscount < 2) {
                    if (!statustext.empty()) {
                        statustext += L"；";
                    }
                    statustext += std::to_wstring(one.id + 1) + L"号多跑";
                    statustext += one.extralaps == 1 ? L"一圈" : std::to_wstring(one.extralaps) + L"圈";
                } else {
                    morestatus = true;
                }
                ++statuscount;
            }
            if (one.skipturns > 0) {
                if (statuscount < 2) {
                    if (!statustext.empty()) {
                        statustext += L"；";
                    }
                    statustext += std::to_wstring(one.id + 1) + L"号停止一次";
                } else {
                    morestatus = true;
                }
                ++statuscount;
            }
        }
        if (morestatus) {
            statustext += L"等";
        }

        draw_text_left(x + 34, y + 3, text, COLOR_TEXT, statustext.empty() ? 14 : 13);
        if (!statustext.empty()) {
            draw_text_left(x + 265, y + 4, statustext, RGB(169, 91, 25), 12);
        }
        int barx = x + 34;
        int bary = y + 27;
        int barw = PANEL_W - 94;
        setfillcolor(RGB(224, 229, 238));
        setlinecolor(RGB(224, 229, 238));
        solidrectangle(barx, bary, barx + barw, bary + 8);
        if (total > 0) {
            setfillcolor(PLAYER_COLORS[i]);
            solidrectangle(barx, bary, barx + barw * finished / total, bary + 8);
        }
        y += 34;
    }
}

// 绘制游戏规则说明：字号加大，放在进度区域下面。
void game::draw_rules(int x, int y) {
    draw_text_left(x, y, L"游戏规则说明", COLOR_TEXT, 18);
    y += 28;
    draw_text_left(x, y, L"1. 掷出6可起飞，掷出6可再投一次。", COLOR_MUTED, 14);
    y += 20;
    draw_text_left(x, y, L"2. 落到本队普通色格，飞到下一同色格。", COLOR_MUTED, 14);
    y += 20;
    draw_text_left(x, y, L"3. 落到别人起点，该棋子停一个回合。", COLOR_MUTED, 14);
    y += 20;
    draw_text_left(x, y, L"4. 每条边有黑陷阱，同圈两次踩中多跑一圈。", COLOR_MUTED, 14);
    y += 20;
    draw_text_left(x, y, L"5. 同格不击退，全部棋子进终点列即胜。", COLOR_MUTED, 14);
}

// 绘制同色飞跃路径：用玩家颜色画虚线。
void game::draw_jump_path() {
    if (!jumpactive || jumpfrom < 0 || jumpto < 0 || jumpowner < 0 || jumpowner >= numplayers) {
        return;
    }
    int x1 = 0;
    int y1 = 0;
    int x2 = 0;
    int y2 = 0;
    gameboard.track_center(jumpfrom, x1, y1);
    gameboard.track_center(jumpto, x2, y2);

    COLORREF color = PLAYER_COLORS[jumpowner];
    setlinecolor(color);
    setlinestyle(PS_DASH, 3);
    line(x1, y1, x2, y2);
    setlinestyle(PS_SOLID, 1);

    setfillcolor(COLOR_WHITE);
    setlinecolor(color);
    fillcircle(x1, y1, 9);
    circle(x1, y1, 9);
    fillcircle(x2, y2, 11);
    circle(x2, y2, 11);
}

// 绘制棋子选择标记：金色细圈表示可走，橙色粗圈表示已经选中。
void game::draw_select_marks() {
    for (int i = 0; i < (int)players[curplayer].pieces.size(); ++i) {
        if (!can_move(i)) {
            continue;
        }
        const piece& one = players[curplayer].pieces[i];
        int cx = 0;
        int cy = 0;
        if (one.state == PIECE_BASE) {
            gameboard.base_piece_center(curplayer, one.id, (int)players[curplayer].pieces.size(), cx, cy);
        } else if (one.state == PIECE_TRACK) {
            gameboard.track_center(one.trackpos, cx, cy);
        } else if (one.state == PIECE_FINISH) {
            gameboard.finish_center(curplayer, one.finishpos, cx, cy);
        }
        bool selected = i == selectedpiece; // selected：当前棋子是否已经完成第一次选择。
        setlinecolor(selected ? RGB(224, 92, 44) : COLOR_GOLD);
        setlinestyle(PS_SOLID, selected ? 5 : 3);
        circle(cx, cy, selected ? 26 : 23);
        setlinestyle(PS_SOLID, 1);
    }
}

// update_clock：刷新正式游戏计时，发现超时立刻判负。
void game::update_clock() {
    if (state != STATE_ROLL && state != STATE_SELECT) {
        return;
    }
    int timeoutplayer = -1; // timeoutplayer：本次刷新中超时的玩家编号。
    if (timeclock.update(timeoutplayer)) {
        lose_by_time(timeoutplayer);
    }
}

// update_robot：按准备、投骰、展示可走棋子、选择、确认五个阶段推进机器人。
void game::update_robot() {
    if (state == STATE_LOT) {
        if (drawn >= numplayers) {
            robotai.cancel();
            return;
        }
        int owner = drawn; // owner：当前等待抽签的玩家编号。
        if (!robotai.isrobot(owner)) {
            robotai.cancel();
            return;
        }

        save();
        robotai.beginrolling(owner);
        lot_roll();
        robotai.cancel();
        if (drawn >= numplayers && robotai.count() == numplayers) {
            start_play();
        }
        return;
    }

    if (state != STATE_ROLL && state != STATE_SELECT) {
        robotai.cancel();
        return;
    }
    if (!is_active_player(curplayer) || !robotai.isrobot(curplayer)) {
        robotai.cancel();
        return;
    }

    if (state == STATE_ROLL) {
        robotai.begin(curplayer);
        if (!robotai.ready(curplayer)) {
            return;
        }

        // 一份快照覆盖机器人本步的投骰和走棋，撤销时会完整退回行动前。
        save();
        robotai.beginrolling(curplayer);
        roll_dice(true);
        if (state == STATE_SELECT && is_active_player(curplayer) && robotai.isrobot(curplayer)) {
            robotai.beginmove(curplayer);
        }
        return;
    }

    // 机器人已完成第一次选择，短暂展示选中状态后执行第二次确认。
    if (robotai.confirming(curplayer)) {
        if (!robotai.confirmready(curplayer)) {
            return;
        }
        int index = selectedpiece; // index：机器人上一阶段选中的棋子下标。
        robotai.cancel();
        if (index >= 0 && can_move(index)) {
            move_piece(index);
        } else {
            skip_move();
        }
        return;
    }

    if (!robotai.moving(curplayer)) {
        robotai.beginmove(curplayer);
    }
    if (!robotai.moveready(curplayer)) {
        return;
    }

    int index = robotai.choosepiece(*this); // index：机器人算法选出的最佳棋子下标。
    if (index >= 0 && can_move(index)) {
        selectedpiece = index;
        special = L"已选择 " + std::to_wstring(index + 1) + L"号棋子";
        notice = display_player(curplayer) + L" 已选择 " + std::to_wstring(index + 1) +
                 L"号棋子，正在进行第二次确认。";
        robotai.beginconfirm(curplayer);
    } else {
        robotai.cancel();
        skip_move();
    }
}

// lose_by_time：处理玩家步时长或总时长用完后的失败结算。
void game::lose_by_time(int owner) {
    {
        if (state == STATE_OVER || owner < 0 || owner >= (int)players.size() || eliminated[owner]) {
            return;
        }

        eliminatedfinished[owner] = players[owner].arrivedcount();
        eliminationorder.push_back(owner);
        eliminated[owner] = true;
        loser = owner;
        players[owner].pieces.clear();
        timeclock.playerleftms[owner] = 0;
        timeclock.stop();
        robotai.cancel();
        hasrolled = false;
        gotsix = false;
        selectedpiece = -1;
        jumpactive = false;
        jumpfrom = -1;
        jumpto = -1;
        jumpowner = -1;
        special = L"超时判负";

        std::wstring text = player_title(owner) + L" 超时判负，当前排名第 " +
                            std::to_wstring(eliminated_rank(owner)) + L" 名，完成进度 " +
                            std::to_wstring(eliminatedfinished[owner]) + L"/" +
                            std::to_wstring(players[owner].piececount) +
                            L"；仅清除场上棋子，进度保留。";
        notice = text;
        log_event(text);

        if (finish_if_decided(text)) {
            return;
        }

        next_turn(text);
        return;
    }

    if (state == STATE_OVER || owner < 0 || owner >= (int)players.size()) {
        return;
    }
    loser = owner;
    winner = -1;
    state = STATE_OVER;
    hasrolled = false;
    gotsix = false;
    selectedpiece = -1;
    special = L"时间用完";
    notice = player_title(owner) + L" 时间用完，本局判负。";
    log_event(notice);
    close_log();
}

// 处理鼠标点击：按当前状态分发给不同点击函数。
void game::handle_click(int mx, int my) {
    button back = back_button();
    if (back.inside(mx, my)) {
        if (state == STATE_SETUP) {
            quit = true;
            close_log();
            return;
        }
        undo();
        return;
    }

    switch (state) {
    case STATE_SETUP:
        click_setup(mx, my);
        break;
    case STATE_LOT:
        click_lot(mx, my);
        break;
    case STATE_ROLL:
    case STATE_SELECT:
        click_play(mx, my);
        break;
    case STATE_OVER:
        click_over(mx, my);
        break;
    }
}

// 处理设置界面点击。
void game::click_setup(int mx, int my) {
    {
        int x = PANEL_X + 30; // x：设置行左边界。
        int w = PANEL_W - 60; // w：设置行宽度。

        for (int row = 0; row < 5; ++row) {
            button minus = setup_minus_button(row);
            button plus = setup_plus_button(row);
            if (minus.inside(mx, my)) {
                setupselect = row;
                change_setup_value(row, -1);
                return;
            }
            if (plus.inside(mx, my)) {
                setupselect = row;
                change_setup_value(row, 1);
                return;
            }

            int rowy = setup_row_y(row);
            if (mx >= x && mx <= x + w && my >= rowy && my <= rowy + 60) {
                setupselect = row;
                notice = L"已选中：" + setup_label(row) + L"，可按左右或点击本行按钮调整。";
                return;
            }
        }

        button start(x, PANEL_Y + 700, PANEL_W - 60, 48, L"开始抽签");
        if (start.inside(mx, my)) {
            save();
            start_game();
            return;
        }
        notice = L"当前点击无效，请点击右侧四行设置、开始抽签或返回上一步。";
        return;
    }

    int x = PANEL_X + 30;
    int y = PANEL_Y + 112;
    for (int i = 0; i < 5; ++i) {
        int val = i + 2;
        button one(x + i * 68, y, 54, 38, std::to_wstring(val));
        if (one.inside(mx, my)) {
            save();
            numplayers = val;
            gameboard.init(numplayers);
            notice = L"已选择 " + std::to_wstring(numplayers) + L" 人游戏。";
            return;
        }
    }

    y = PANEL_Y + 212;
    for (int i = 0; i < numplayers; ++i) {
        int rowy = y + i * 44;
        button minus(x + 190, rowy, 36, 32, L"-");
        minus.enabled = piececounts[i] > 2;
        button plus(x + 282, rowy, 36, 32, L"+");
        plus.enabled = piececounts[i] < 6;
        if (minus.inside(mx, my)) {
            save();
            --piececounts[i];
            notice = player_title(i) + L" 棋子数量减少为 " + std::to_wstring(piececounts[i]) + L"。";
            return;
        }
        if (plus.inside(mx, my)) {
            save();
            ++piececounts[i];
            notice = player_title(i) + L" 棋子数量增加为 " + std::to_wstring(piececounts[i]) + L"。";
            return;
        }
    }

    int timey = y + numplayers * 44 + 18;
    int stepvalues[] = {10, 15, 30};
    for (int i = 0; i < 3; ++i) {
        button one(x + i * 78, timey + 28, 62, 30, std::to_wstring(stepvalues[i]) + L"s");
        if (one.inside(mx, my)) {
            save();
            timeclock.set_step_index(i);
            notice = L"已选择每步时长 " + timeclock.step_label() + L"。";
            return;
        }
    }

    timey += 76;
    int totalvalues[] = {5, 10, 15, 30};
    for (int i = 0; i < 4; ++i) {
        button one(x + i * 92, timey + 28, 76, 30, std::to_wstring(totalvalues[i]) + L"min");
        if (one.inside(mx, my)) {
            save();
            timeclock.set_total_index(i);
            notice = L"已选择单方时长 " + timeclock.total_label() + L"。";
            return;
        }
    }

    button start(x, PANEL_Y + 700, PANEL_W - 60, 48, L"开始抽签");
    if (start.inside(mx, my)) {
        save();
        start_game();
        return;
    }
    notice = L"当前点击无效，请在右侧设置区操作。";
}

// 处理抽签界面点击。
void game::click_lot(int mx, int my) {
    if (drawn < numplayers && robotai.isrobot(drawn)) {
        notice = L"当前由机器人自动滚动骰子抽签，鼠标操作无效。";
        return;
    }
    button dice = dice_button();
    if (drawn < numplayers && dice.inside(mx, my)) {
        save();
        lot_roll();
        return;
    }

    button start(PANEL_X + 30, PANEL_Y + 700, PANEL_W - 60, 48, L"进入游戏");
    if (drawn >= numplayers && start.inside(mx, my)) {
        save();
        start_play();
        return;
    }
    notice = L"当前点击无效，请按提示点击骰子或进入游戏。";
}

// 处理游戏进行界面点击。
void game::click_play(int mx, int my) {
    if (robotai.isrobot(curplayer)) {
        notice = L"当前是机器人回合，鼠标走棋操作无效。";
        return;
    }
    if (state == STATE_ROLL) {
        button dice = dice_button();
        if (dice.inside(mx, my)) {
            save();
            roll_dice();
            return;
        }
        notice = L"当前只能点击右下方骰子。";
        return;
    }

    button skip = skip_button();
    if (skip.inside(mx, my)) {
        save();
        skip_move();
        return;
    }

    int idx = gameboard.hit_piece(players, curplayer, mx, my);
    if (idx >= 0 && can_move(idx)) {
        save();
        if (selectedpiece != idx) {
            selectedpiece = idx;
            special = L"已选择 " + std::to_wstring(idx + 1) + L"号棋子";
            notice = L"已选择 " + std::to_wstring(idx + 1) +
                     L"号棋子，请再次点击该棋子确认移动。";
        } else {
            move_piece(idx);
        }
        return;
    }
    notice = selectedpiece >= 0
                 ? L"已选棋子保持不变；请再次点击已选棋子确认，或点击其他金圈棋子更换选择。"
                 : L"当前点击无效，请先点击带金色圈的棋子，或选择不走。";
}

// 处理结束界面点击。
void game::click_over(int mx, int my) {
    int x = PANEL_X + 30;
    button again(x, PANEL_Y + 842, 150, 42, L"重新开始");
    button exitbtn(x + 170, PANEL_Y + 842, 150, 42, L"返回主界面");
    if (again.inside(mx, my)) {
        reset();
        return;
    }
    if (exitbtn.inside(mx, my)) {
        quit = true;
        return;
    }
    notice = L"当前点击无效，请选择重新开始或返回主界面。";
}

// 开始游戏：创建玩家、初始化棋盘和日志。
void game::start_game() {
    players.clear();
    rankings.clear();
    eliminationorder.clear();
    sync_piececounts(piececounts[0]);
    robotai.configure(numplayers, robotai.count());
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        eliminated[i] = false;
        eliminatedfinished[i] = 0;
        completed[i] = false;
    }
    for (int i = 0; i < numplayers; ++i) {
        player one;
        one.init(i, piececounts[i], PLAYER_COLORS[i]);
        one.startpos = i * TRACK_COUNT / numplayers;
        one.endpos = (one.startpos + TRACK_COUNT - 1) % TRACK_COUNT;
        players.push_back(one);
    }
    gameboard.init(numplayers);
    timeclock.init_players(numplayers);
    drawvalues.assign(numplayers, 0);
    playorder.clear();
    drawn = 0;
    state = STATE_LOT;
    dicevalue = 1;
    hasrolled = false;
    selectedpiece = -1;
    winner = -1;
    loser = -1;
    special = L"无";
    ranknotice.clear();
    jumpactive = false;
    jumpfrom = -1;
    jumpto = -1;
    jumpowner = -1;
    notice = L"开始抽签。";
    start_log();
    log_event(L"开始游戏设置：玩家数 " + std::to_wstring(numplayers));
    log_event(L"机器人数量：" + std::to_wstring(robotai.count()) +
              L"，编号靠后的队伍由机器人控制。");
    log_event(L"计时设置：每步 " + timeclock.step_label() + L"，单方 " + timeclock.total_label());
}

// 抽签掷骰：播放骰子动画后立即记录点数并切换到下一名抽签玩家。
void game::lot_roll(bool animate) {
    if (animate) {
        for (int i = 0; i < 12; ++i) {
            dicevalue = rand() % 6 + 1;
            notice = L"抽签骰子滚动中。";
            draw();
            Sleep(45);
        }
    } else {
        dicevalue = rand() % 6 + 1;
    }
    drawvalues[drawn] = dicevalue;
    players[drawn].drawvalue = dicevalue;
    log_event(display_player(drawn) + L" 抽签点数 " + std::to_wstring(dicevalue));
    ++drawn;
    notice = drawn < numplayers ? L"请下一位玩家点击骰子抽签。" : L"抽签完成，点击进入游戏。";
}

// 根据抽签点数进入正式游戏。
void game::start_play() {
    playorder.resize(numplayers);
    for (int i = 0; i < numplayers; ++i) {
        playorder[i] = i;
    }
    std::sort(playorder.begin(), playorder.end(), [&](int a, int b) {
        return drawvalues[a] == drawvalues[b] ? a < b : drawvalues[a] > drawvalues[b];
    });
    turnindex = 0;
    curplayer = playorder[turnindex];
    state = STATE_ROLL;
    hasrolled = false;
    gotsix = false;
    selectedpiece = -1;
    dicevalue = 1;
    special = L"无";
    timeclock.start_turn(curplayer);
    robotai.cancel();
    notice = robotai.isrobot(curplayer) ? L"机器人正在准备投骰，本步不超过5秒。" : L"请点击骰子开始本回合。";
}

// 掷骰：随机生成点数并判断是否有棋子可走。
void game::roll_dice(bool animate) {
    selectedpiece = -1;
    for (int i = 0; i < (int)players[curplayer].pieces.size(); ++i) {
        if (players[curplayer].pieces[i].skipturns > 0) {
            players[curplayer].pieces[i].skipfresh = false;
        }
    }
    hasrolled = true;
    special = L"无";
    jumpactive = false;
    jumpfrom = -1;
    jumpto = -1;
    jumpowner = -1;
    if (animate) {
        for (int i = 0; i < 12; ++i) {
            dicevalue = rand() % 6 + 1;
            notice = L"骰子转动中。";
            draw();
            Sleep(45);
        }
    } else {
        dicevalue = rand() % 6 + 1;
    }
    gotsix = dicevalue == 6;
    log_event(player_title(curplayer) + L" 投掷点数 " + std::to_wstring(dicevalue));
    state = STATE_SELECT;
    if (!any_move()) {
        special = L"无棋可走";
        notice = player_title(curplayer) + L" 投出 " + std::to_wstring(dicevalue) +
                 L" 点，没有可移动棋子，骰子结束后立即切换下一人。";
        log_event(notice);
        next_turn(notice);
        return;
    }
    notice = gotsix
                 ? L"掷出 6，已显示可走棋子；先选择棋子，再次选择确认移动，完成后额外再投一次。"
                 : L"已显示可走棋子；先选择棋子，再次选择同一棋子确认移动，也可以不走。";
}

// 判断当前玩家是否至少有一个棋子可以移动。
bool game::any_move() const {
    for (int i = 0; i < (int)players[curplayer].pieces.size(); ++i) {
        if (can_move(i)) {
            return true;
        }
    }
    return false;
}

// 判断指定棋子是否可以按当前骰子点数移动。
bool game::can_move(int index) const {
    if (!is_active_player(curplayer)) {
        return false;
    }
    if (index < 0 || index >= (int)players[curplayer].pieces.size()) {
        return false;
    }
    const piece& one = players[curplayer].pieces[index];
    if (one.skipturns > 0) {
        return false;
    }
    if (one.state == PIECE_BASE) {
        return dicevalue == 6;
    }
    if (one.state == PIECE_TRACK) {
        moveresult res = gameboard.move(one.trackpos, dicevalue, players[curplayer].startpos);
        return one.extralaps > 0 || res.valid;
    }
    if (one.state == PIECE_FINISH) {
        int need = FINISH_COUNT - 1 - one.finishpos;
        return dicevalue <= need;
    }
    return false;
}

// 移动棋子：处理起飞、普通移动、终点列移动和特殊格。
void game::move_piece(int index) {
    selectedpiece = -1;
    piece& one = players[curplayer].pieces[index];
    std::wstring text = player_title(curplayer) + L" 移动 " + std::to_wstring(one.id + 1) + L"号棋子：";
    special = L"无";

    if (one.state == PIECE_BASE) {
        one.state = PIECE_TRACK;
        one.trackpos = players[curplayer].startpos;
        text += L"起飞到起点。";
    } else if (one.state == PIECE_TRACK) {
        moveresult res = gameboard.move(one.trackpos, dicevalue, players[curplayer].startpos);
        if (res.enterfinish && one.extralaps > 0) {
            one.trackpos = (one.trackpos + dicevalue) % TRACK_COUNT;
            --one.extralaps;
            one.trapcount = 0;
            text += L"完成额外一圈的一段，落在第 " + std::to_wstring(one.trackpos) + L" 格。";
            text += apply_special(one, curplayer);
        } else if (res.enterfinish) {
            one.state = PIECE_FINISH;
            one.finishpos = res.finishpos;
            one.trapcount = 0;
            text += L"进入终点列第 " + std::to_wstring(res.finishpos + 1) + L" 格。";
            if (one.finishpos >= FINISH_COUNT - 1) {
                one.state = PIECE_HOME;
                text += L"到达停车区。";
            }
        } else {
            one.trackpos = res.newpos;
            text += L"前进到第 " + std::to_wstring(one.trackpos) + L" 格。";
            text += apply_special(one, curplayer);
        }
    } else if (one.state == PIECE_FINISH) {
        one.finishpos += dicevalue;
        text += L"在终点列前进到第 " + std::to_wstring(one.finishpos + 1) + L" 格。";
        if (one.finishpos >= FINISH_COUNT - 1) {
            one.state = PIECE_HOME;
            text += L"到达停车区。";
        }
    }

    notice = text;
    log_event(text);
    finish_action();
}

// 玩家选择不走。
void game::skip_move() {
    selectedpiece = -1;
    std::wstring text = player_title(curplayer) + L" 选择不走。";
    notice = text;
    special = L"无";
    log_event(text);
    finish_action();
}

// 完成一次行动后：判断胜利、额外回合或切换下一个玩家。
void game::finish_action() {
    selectedpiece = -1;
    if (check_win()) {
        timeclock.stop();
        robotai.cancel();
        if (!finish_if_decided(notice)) {
            next_turn(notice);
        }
        return;
    }
    if (gotsix) {
        state = STATE_ROLL;
        hasrolled = false;
        gotsix = false;
        selectedpiece = -1;
        dicevalue = 1;
        timeclock.start_turn(curplayer);
        robotai.cancel();
        notice += L" 掷出 6，继续投骰子。";
        return;
    }
    next_turn(notice);
}

// 切换到下一名玩家。
void game::next_turn(const std::wstring& last) {
    {
        if (is_active_player(curplayer)) {
            reduce_skips(curplayer);
        }

        if (finish_if_decided(last)) {
            return;
        }

        int total = (int)playorder.size(); // total：抽签产生的行动顺序长度。
        if (total <= 0) {
            return;
        }
        for (int i = 0; i < total; ++i) {
            turnindex = (turnindex + 1) % total;
            int next = playorder[turnindex];
            if (is_active_player(next)) {
                curplayer = next;
                break;
            }
        }

        state = STATE_ROLL;
        hasrolled = false;
        gotsix = false;
        selectedpiece = -1;
        dicevalue = 1;
        timeclock.start_turn(curplayer);
        robotai.cancel();
        if (last.empty()) {
            special = L"无";
            notice = L"轮到 " + display_player(curplayer) +
                     (robotai.isrobot(curplayer) ? L"，机器人正在准备投骰。" : L"，请点击骰子。");
        } else {
            notice = last + L"\n轮到 " + display_player(curplayer) +
                     (robotai.isrobot(curplayer) ? L"，机器人正在准备投骰。" : L"，请点击骰子。");
        }
        return;
    }

    reduce_skips(curplayer);
    turnindex = (turnindex + 1) % numplayers;
    curplayer = playorder[turnindex];
    state = STATE_ROLL;
    hasrolled = false;
    selectedpiece = -1;
    dicevalue = 1;
    timeclock.start_turn(curplayer);
    if (last.empty()) {
        special = L"无";
        notice = L"轮到 " + player_title(curplayer) + L"，请点击骰子。";
    } else {
        notice = last + L"\n轮到 " + player_title(curplayer) + L"，请点击骰子。";
    }
}

// 减少指定玩家棋子的停回合计数。
void game::reduce_skips(int owner) {
    if (owner < 0 || owner >= (int)players.size()) {
        return;
    }
    for (int i = 0; i < (int)players[owner].pieces.size(); ++i) {
        if (players[owner].pieces[i].skipturns > 0) {
            if (players[owner].pieces[i].skipfresh) {
                players[owner].pieces[i].skipfresh = false;
                continue;
            }
            --players[owner].pieces[i].skipturns;
        }
    }
}

// 处理棋子落点上的特殊效果。
std::wstring game::apply_special(piece& one, int owner) {
    if (one.state != PIECE_TRACK) {
        return L"";
    }
    int pos = one.trackpos;

    if (gameboard.cells[pos].type == CELL_START &&
        gameboard.cells[pos].owner >= 0 &&
        gameboard.cells[pos].owner != owner) {
        if (one.skipturns < 1) {
            one.skipturns = 1;
        }
        one.skipfresh = true;
        special = L"别人起点：停一回合";
        return L" 落到" + player_title(gameboard.cells[pos].owner) + L"的起点，该棋子停一个回合。";
    }

    auto trap = gameboard.trapmap.find(pos);
    if (trap != gameboard.trapmap.end()) {
        ++one.trapcount;
        if (one.trapcount >= 2) {
            ++one.extralaps;
            one.trapcount = 0;
            special = L"黑色陷阱：多跑一圈";
            return L" 进入黑色陷阱，本圈第2次踩中，该棋子需要额外多跑一圈。";
        }
        special = L"黑色陷阱";
        return L" 进入黑色陷阱，本圈已踩中1次。";
    }

    if (gameboard.cells[pos].type == CELL_NORMAL && gameboard.cells[pos].owner == owner) {
        int next = gameboard.next_color_cell(pos, owner);
        if (next >= 0 && next != pos) {
            int from = pos;

            // 如果同色跳跃会碰到或越过本队终点入口，直接进入停车区最里面，
            // 避免终点前一格继续跳到外圈其他颜色位置。
            int endpos = (players[owner].startpos + TRACK_COUNT - 1) % TRACK_COUNT;
            int disttoend = (endpos - pos + TRACK_COUNT) % TRACK_COUNT;
            int disttonext = (next - pos + TRACK_COUNT) % TRACK_COUNT;
            if (one.extralaps <= 0 && disttoend <= disttonext) {
                one.state = PIECE_HOME;
                one.finishpos = FINISH_COUNT - 1;
                one.trapcount = 0;
                jumpactive = false;
                jumpfrom = -1;
                jumpto = -1;
                jumpowner = -1;
                special = L"终点前同色直达停车区";
                return L" 直接落到进终点前一格，改为跳到停车区最里面。";
            }

            one.trackpos = next;
            jumpactive = true;
            jumpfrom = from;
            jumpto = next;
            jumpowner = owner;
            special = L"直接同色飞跃";
            return L" 直接落到自己的颜色格，触发同色飞跃：从第 " +
                   std::to_wstring(from) + L" 格飞到第 " + std::to_wstring(next) + L" 格。";
        }
    }

    jumpactive = false;
    jumpfrom = -1;
    jumpto = -1;
    jumpowner = -1;
    special = L"无";
    return L"";
}

// 旧击退接口保留为空：当前规则为同格不击退，只错位显示。
std::wstring game::check_hit(piece& one, int owner) {
    (void)one;
    (void)owner;
    return L"";
}

// 判断当前玩家是否完成：完成后记录名次并退出后续行动队列。
bool game::check_win() {
    if (!is_active_player(curplayer) || !players[curplayer].allarrived()) {
        return false;
    }

    completed[curplayer] = true;
    rankings.push_back(curplayer);
    int rank = (int)rankings.size(); // rank：当前玩家刚刚获得的名次。
    if (rank == 1) {
        winner = curplayer;
    }
    ranknotice = display_player(curplayer) + L"已完成，当前排名 " + std::to_wstring(rank) + L"。";
    special = L"完成比赛：第" + std::to_wstring(rank) + L"名";
    notice += L" " + ranknotice;
    log_event(ranknotice);
    return true;
}

// 开始日志文件：在result目录下按时间命名。
void game::start_log() {
    close_log();
    std::wstring root = root_path();
    std::wstring folder = root + L"\\result";
    CreateDirectoryW(folder.c_str(), nullptr);

    SYSTEMTIME st;
    GetLocalTime(&st);
    wchar_t name[128];
    swprintf_s(name, L"飞行棋%04d%02d%02d_%02d%02d%02d.txt",
               st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond);
    logpath = folder + L"\\" + name;
    _wfopen_s(&logfile, logpath.c_str(), L"ab");
}

// 关闭日志文件。
void game::close_log() {
    if (logfile != nullptr) {
        fclose(logfile);
        logfile = nullptr;
    }
}

// 写入一条GBK日志。
void game::log_event(const std::wstring& text) {
    if (logfile == nullptr) {
        return;
    }
    SYSTEMTIME st;
    GetLocalTime(&st);
    wchar_t prefix[64];
    swprintf_s(prefix, L"[%02d:%02d:%02d] ", st.wHour, st.wMinute, st.wSecond);
    std::wstring line = std::wstring(prefix) + text + L"\r\n";
    std::string gbk = gbk_text(line);
    fwrite(gbk.data(), 1, gbk.size(), logfile);
    fflush(logfile);
}

// 寻找解决方案根目录。
std::wstring game::root_path() const {
    wchar_t buf[MAX_PATH];
    GetCurrentDirectoryW(MAX_PATH, buf);
    std::wstring cur = buf;
    for (int i = 0; i < 6; ++i) {
        std::wstring sln = cur + L"\\chessgame.sln";
        if (GetFileAttributesW(sln.c_str()) != INVALID_FILE_ATTRIBUTES) {
            return cur;
        }
        size_t pos = cur.find_last_of(L"\\/");
        if (pos == std::wstring::npos) {
            break;
        }
        cur = cur.substr(0, pos);
    }
    return buf;
}

// 宽字符串转GBK字符串，用于日志输出。
std::string game::gbk_text(const std::wstring& text) const {
    if (text.empty()) {
        return std::string();
    }
    int size = WideCharToMultiByte(936, 0, text.c_str(), -1, nullptr, 0, nullptr, nullptr);
    if (size <= 1) {
        return std::string();
    }
    std::string out(size - 1, '\0');
    WideCharToMultiByte(936, 0, text.c_str(), -1, &out[0], size, nullptr, nullptr);
    return out;
}


} // namespace feixingqi
