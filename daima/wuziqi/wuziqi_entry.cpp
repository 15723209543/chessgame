#include "wuziqi_entry.h"
#include "wuziqi_game.h"
#include "../qilei_common.h"

int wuziqi_game::wuziqi_run()
{
    qilei_game_setting wuziqi_setting; // wuziqi_setting 保存玩家选择的五子棋计时与人机模式。
    if (!qilei_choose_setting(L"五子棋", L"黑方", L"白方", wuziqi_setting)) return 0;
    wuziqi_session wuziqi_session_value; // wuziqi_session_value 是本次 15 路五子棋对局对象。
    return wuziqi_session_value.wuziqi_run(wuziqi_setting);
}
