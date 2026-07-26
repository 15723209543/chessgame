#include "guojixiangqi_entry.h"
#include "guojixiangqi_game.h"
#include "../qilei_common.h"

int guojixiangqi_game::guojixiangqi_run()
{
    qilei_game_setting guojixiangqi_setting; // guojixiangqi_setting 保存玩家选择的国际象棋计时与人机模式。
    if (!qilei_choose_setting(L"国际象棋", L"白方", L"黑方", guojixiangqi_setting)) return 0;
    guojixiangqi_session guojixiangqi_session_value; // guojixiangqi_session_value 是本次国际象棋对局对象。
    return guojixiangqi_session_value.guojixiangqi_run(guojixiangqi_setting);
}
