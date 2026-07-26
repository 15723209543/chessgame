#include "tiaoqi_keyboard.h"

#include "tiaoqi_analysis.h"
#include "tiaoqi_board.h"
#include "tiaoqi_game.h"
#include "tiaoqi_keyboard_data.h"
#include "tiaoqi_time.h"

#include <algorithm>

namespace tiaoqi
{

// keyboard_skip_char_code 保存已经由按键消息处理过、需要跳过的字符输入编码。
static int keyboard_skip_char_code = -1;

// 这个函数把键盘键值转换为 0 到 9 的数字。
static bool keyboard_key_to_number(int key, int scancode, bool extended, int& number)
{
    if (key >= keyboard_key_digit_0 && key <= keyboard_key_digit_9)
    {
        number = key - keyboard_key_digit_0;
        return true;
    }
    if (key >= keyboard_key_numpad_0 && key <= keyboard_key_numpad_9)
    {
        number = key - keyboard_key_numpad_0;
        return true;
    }

    // NumLock 关闭时，小键盘 0-9 会以 Insert/End/方向键等形式出现。
    // 只有非扩展键才按小键盘数字处理，避免真正方向键被误认为数字。
    if (!extended)
    {
        switch (key)
        {
        case keyboard_key_insert:
            number = 0;
            return true;
        case keyboard_key_end:
            number = 1;
            return true;
        case keyboard_key_down:
            number = 2;
            return true;
        case keyboard_key_pagedown:
            number = 3;
            return true;
        case keyboard_key_left:
            number = 4;
            return true;
        case keyboard_key_clear:
            number = 5;
            return true;
        case keyboard_key_right:
            number = 6;
            return true;
        case keyboard_key_home:
            number = 7;
            return true;
        case keyboard_key_up:
            number = 8;
            return true;
        case keyboard_key_pageup:
            number = 9;
            return true;
        default:
            break;
        }
    }

    number = -1;
    return false;
}

// 这个函数把字符消息转换为 0 到 9 的数字。
static bool keyboard_char_to_number(wchar_t keychar, int& number)
{
    if (keychar >= L'0' && keychar <= L'9')
    {
        number = static_cast<int>(keychar - L'0');
        return true;
    }
    number = -1;
    return false;
}

// 这个函数把主键盘字母键转换为第十至第三十五个落点的输入编码。
static bool keyboard_key_to_letter_code(int key, int& code)
{
    if (key >= keyboard_key_letter_a && key <= keyboard_key_letter_z)
    {
        code = keyboard_target_digit_count + 1 + key - keyboard_key_letter_a;
        return true;
    }
    code = -1;
    return false;
}

// 这个函数把大小写字母字符转换为第十至第三十五个落点的输入编码。
static bool keyboard_char_to_letter_code(wchar_t keychar, int& code)
{
    // uppercase 保存统一转成大写后的字母。
    wchar_t uppercase = keychar;
    if (uppercase >= L'a' && uppercase <= L'z')
    {
        uppercase = static_cast<wchar_t>(uppercase - L'a' + L'A');
    }
    if (uppercase >= L'A' && uppercase <= L'Z')
    {
        code = keyboard_target_digit_count + 1 + static_cast<int>(uppercase - L'A');
        return true;
    }
    code = -1;
    return false;
}

// 这个函数把落点的零开始下标转换为棋盘和提示区共用的 1-9、A-Z 标签。
static std::wstring keyboard_target_label_from_index(int targetindex)
{
    if (targetindex < 0 || targetindex >= keyboard_target_max)
    {
        return L"";
    }
    if (targetindex < keyboard_target_digit_count)
    {
        return std::to_wstring(targetindex + 1);
    }

    // letter 保存第十个落点起使用的大写字母。
    wchar_t letter = static_cast<wchar_t>(L'A' + targetindex - keyboard_target_digit_count);
    return std::wstring(1, letter);
}

// 这个函数返回当前行动玩家下标。
static int keyboard_current_player(const gamestate& state)
{
    if (state.turnorder.empty() || state.currentorderindex < 0 ||
        state.currentorderindex >= static_cast<int>(state.turnorder.size()))
    {
        return -1;
    }
    return state.turnorder[state.currentorderindex];
}

// 这个函数进入下一名玩家回合。
static void keyboard_next_turn(gamestate& state)
{
    if (state.turnorder.empty())
    {
        return;
    }

    state.currentorderindex = (state.currentorderindex + 1) % static_cast<int>(state.turnorder.size());
    state.selectedpiece = -1;
    state.robotpreviewtarget = -1;
    state.movetargets.clear();
    state.phase = phase_select_piece;

    // playerindex 保存新的当前玩家下标。
    int playerindex = keyboard_current_player(state);
    if (playerindex >= 0)
    {
        state.status = L"请玩家" + std::to_wstring(state.players[playerindex].id) +
            L"选择棋子，键盘编号已显示在棋子上。";
    }
    time_start_turn(state);
}

// 这个函数取消键盘选中的棋子并返回棋子选择阶段。
static void keyboard_cancel_target(gamestate& state, loggerdata& logger)
{
    if (state.robotpreviewtarget >= 0)
    {
        state.robotpreviewtarget = -1;
        state.status = L"已取消落点确认，棋子仍保持选中，请重新输入落点编号。";
        logger_write(logger, L"键盘返回上一步：取消待确认落点，保留当前棋子选择");
        return;
    }

    state.selectedpiece = -1;
    state.movetargets.clear();
    state.phase = phase_select_piece;
    state.status = L"已取消棋子选择，请重新选择棋子。";
    logger_write(logger, L"键盘返回上一步：取消当前棋子选择");
}

// 这个函数用键盘编号选择当前玩家的棋子。
static void keyboard_select_piece(const boarddata& board, gamestate& state, loggerdata& logger, int number)
{
    // playerindex 保存当前玩家下标。
    int playerindex = keyboard_current_player(state);
    if (playerindex < 0)
    {
        state.status = L"当前没有行动玩家，键盘操作无效。";
        logger_write(logger, L"键盘无效操作：没有行动玩家");
        return;
    }

    const playerdata& player = state.players[playerindex];
    if (number < keyboard_piece_min || number >= static_cast<int>(player.pieceids.size()))
    {
        state.status = L"当前玩家没有编号为 " + std::to_wstring(number) + L" 的棋子。";
        logger_write(logger, L"键盘无效操作：玩家" + std::to_wstring(player.id) +
            L"选择不存在的棋子编号 " + std::to_wstring(number));
        return;
    }

    // pieceindex 保存键盘编号对应的全局棋子下标。
    int pieceindex = player.pieceids[number];
    state.movetargets = board_get_targets(board, state, pieceindex);
    if (state.movetargets.empty())
    {
        state.selectedpiece = -1;
        state.phase = phase_select_piece;
        state.status = L"编号 " + std::to_wstring(number) + L" 的棋子当前没有可走位置。";
        logger_write(logger, L"键盘选择棋子无效：玩家" + std::to_wstring(player.id) +
            L"的编号" + std::to_wstring(number) + L"棋子无可走位置");
        return;
    }

    state.selectedpiece = pieceindex;
    state.robotpreviewtarget = -1;
    state.phase = phase_select_target;
    state.status = L"已选择编号 " + std::to_wstring(number) +
        L" 的棋子，请按落点编号或字母选择，按 0 返回。";

    logger_write(logger, L"键盘选择棋子：玩家" + std::to_wstring(player.id) +
        L"选择编号" + std::to_wstring(number) + L"棋子，可落点数量 " +
        std::to_wstring(state.movetargets.size()));
}

// 这个函数用数字或字母输入编码选择当前棋子的落点。
static void keyboard_select_target(const boarddata& board, gamestate& state, loggerdata& logger, int code)
{
    if (code == keyboard_target_back)
    {
        keyboard_cancel_target(state, logger);
        return;
    }

    if (state.selectedpiece < 0)
    {
        state.status = L"还没有选中棋子，键盘落点选择无效。";
        logger_write(logger, L"键盘无效操作：未选棋子时选择落点");
        return;
    }

    // targetindex 保存输入编码对应的零开始落点下标。
    int targetindex = code - 1;
    // label 保存提示、日志与棋盘共用的落点标签。
    std::wstring label = keyboard_target_label_from_index(targetindex);
    if (code < keyboard_target_min || code > keyboard_target_max ||
        targetindex >= static_cast<int>(state.movetargets.size()) || label.empty())
    {
        state.status = L"当前没有与本次按键对应的可走位置。";
        logger_write(logger, L"键盘无效操作：选择不存在的落点输入编码 " + std::to_wstring(code));
        return;
    }

    // playerindex 保存当前玩家下标。
    int playerindex = keyboard_current_player(state);
    if (playerindex < 0)
    {
        state.status = L"当前没有行动玩家，键盘操作无效。";
        logger_write(logger, L"键盘无效操作：没有行动玩家");
        return;
    }

    // toid 保存移动后孔位编号。
    int toid = state.movetargets[targetindex];
    if (state.robotpreviewtarget != toid)
    {
        state.robotpreviewtarget = toid;
        state.status = L"已选择落点 " + label +
            L"，请再次按相同编号或字母确认移动；按 0 返回。";
        logger_write(logger, L"键盘选择待确认落点：标签" + label +
            L"，孔位" + std::to_wstring(toid));
        return;
    }

    game_apply_move(board, state, logger, state.selectedpiece, toid,
        L"键盘落点" + label);
}

// 这个函数处理游戏阶段之外的落点输入误触。
static void keyboard_reject_input(gamestate& state, loggerdata& logger, int code)
{
    state.status = L"当前阶段不能用编号或字母走棋，本次按键无效。";
    logger_write(logger, L"键盘无效操作：阶段" + gamedata_phase_text(state.phase) +
        L"按下输入编码 " + std::to_wstring(code));
}

// 这个函数处理一次键盘按键，并在非法按键时保护游戏状态。
void keyboard_handle_key(const boarddata& board, gamestate& state, loggerdata& logger, int key, int scancode, bool extended)
{
    // number 保存键盘数字值。
    int number = -1;
    // code 保存数字或字母统一转换后的输入编码。
    int code = -1;
    // isnumber 表示本次按键是否为数字键。
    bool isnumber = keyboard_key_to_number(key, scancode, extended, number);
    if (isnumber)
    {
        code = number;
    }
    else if (!keyboard_key_to_letter_code(key, code))
    {
        return;
    }

    keyboard_skip_char_code = code;
    if (state.phase == phase_select_piece)
    {
        if (isnumber)
        {
            keyboard_select_piece(board, state, logger, number);
        }
    }
    else if (state.phase == phase_select_target)
    {
        keyboard_select_target(board, state, logger, code);
    }
    else
    {
        keyboard_reject_input(state, logger, code);
    }
}

// 这个函数处理一次键盘字符消息，兼容小键盘数字和大小写落点字母。
void keyboard_handle_char(const boarddata& board, gamestate& state, loggerdata& logger, wchar_t keychar)
{
    // number 保存键盘字符对应的数字。
    int number = -1;
    // code 保存字符统一转换后的输入编码。
    int code = -1;
    // isnumber 表示本次字符是否为数字。
    bool isnumber = keyboard_char_to_number(keychar, number);
    if (isnumber)
    {
        code = number;
    }
    else if (!keyboard_char_to_letter_code(keychar, code))
    {
        return;
    }

    if (keyboard_skip_char_code == code)
    {
        keyboard_skip_char_code = -1;
        return;
    }
    keyboard_skip_char_code = -1;

    if (state.phase == phase_select_piece)
    {
        if (isnumber)
        {
            keyboard_select_piece(board, state, logger, number);
        }
    }
    else if (state.phase == phase_select_target)
    {
        keyboard_select_target(board, state, logger, code);
    }
    else
    {
        keyboard_reject_input(state, logger, code);
    }
}

// 这个函数返回当前玩家全部棋子的全局棋子下标。
std::vector<int> keyboard_get_current_pieceids(const gamestate& state)
{
    // playerindex 保存当前玩家下标。
    int playerindex = keyboard_current_player(state);
    if (playerindex < 0 || playerindex >= static_cast<int>(state.players.size()))
    {
        return {};
    }
    return state.players[playerindex].pieceids;
}

// 这个函数返回棋子在当前玩家手中的键盘编号，非当前玩家棋子返回 -1。
int keyboard_get_piece_number(const gamestate& state, int pieceindex)
{
    // pieceids 保存当前玩家的棋子下标列表。
    std::vector<int> pieceids = keyboard_get_current_pieceids(state);
    for (int index = 0; index < static_cast<int>(pieceids.size()); ++index)
    {
        if (pieceids[index] == pieceindex)
        {
            return index;
        }
    }
    return -1;
}

// 这个函数返回落点的键盘标签，未编号落点返回空字符串。
std::wstring keyboard_get_target_label(const gamestate& state, int pointid)
{
    // limit 保存键盘可以直接选择的落点数量。
    int targetcount = static_cast<int>(state.movetargets.size()); // targetcount 保存当前可落点数量。
    int limit = targetcount < keyboard_target_max ? targetcount : keyboard_target_max;
    for (int index = 0; index < limit; ++index)
    {
        if (state.movetargets[index] == pointid)
        {
            return keyboard_target_label_from_index(index);
        }
    }
    return L"";
}

// 这个函数生成右侧信息栏显示的当前棋子编号文本。
std::wstring keyboard_make_piece_text(const gamestate& state)
{
    // pieceids 保存当前玩家的棋子下标列表。
    std::vector<int> pieceids = keyboard_get_current_pieceids(state);
    if (pieceids.empty())
    {
        return L"";
    }

    // text 保存显示用编号列表。
    std::wstring text;
    for (int index = 0; index < static_cast<int>(pieceids.size()); ++index)
    {
        if (!text.empty())
        {
            text += L"  ";
        }
        text += std::to_wstring(index);
    }
    return text;
}

// 这个函数生成右侧信息栏显示的可走位置编号文本。
std::wstring keyboard_make_target_text(const gamestate& state)
{
    if (state.movetargets.empty())
    {
        return L"";
    }

    // limit 保存键盘可以直接选择的落点数量。
    int targetcount = static_cast<int>(state.movetargets.size()); // targetcount 保存当前可落点数量。
    int limit = targetcount < keyboard_target_max ? targetcount : keyboard_target_max;
    // text 保存显示用编号列表。
    std::wstring text;
    for (int index = 0; index < limit; ++index)
    {
        if (!text.empty())
        {
            text += L"  ";
        }
        text += keyboard_target_label_from_index(index);
    }
    return text;
}


} // namespace tiaoqi
