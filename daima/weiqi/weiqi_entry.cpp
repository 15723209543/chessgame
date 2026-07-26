#include "weiqi_entry.h"
#include "weiqi_game.h"
#include "../qilei_common.h"

int weiqi_game::weiqi_run()
{
    qilei_game_setting weiqi_setting; // weiqi_setting 保存玩家选择的围棋计时与人机模式。
    if (!qilei_choose_setting(L"围棋", L"黑方", L"白方", weiqi_setting)) return 0;
    weiqi_session weiqi_session_value; // weiqi_session_value 是本次 19 路围棋对局对象。
    return weiqi_session_value.weiqi_run(weiqi_setting);
}
