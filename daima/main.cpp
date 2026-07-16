#include "qilei_menu.h"
#include "zhongguoxiangqi/zhongguoxiangqi_entry.h"
#include "guojixiangqi/guojixiangqi_entry.h"
#include "weiqi/weiqi_entry.h"
#include "wuziqi/wuziqi_entry.h"
#include "feixingqi/feixingqi_entry.h"
#include "tiaoqi/tiaoqi_entry.h"

// main 是统一程序入口，只负责显示棋类菜单并调度对应游戏对象。
int main()
{
    qilei_menu qilei_main_menu; // qilei_main_menu 是六种棋类的统一欢迎页对象。
    while (true)
    {
        const int qilei_choice = qilei_main_menu.qilei_choose(); // qilei_choice 是玩家本次选中的棋类编号，0 表示退出大厅。
        switch (qilei_choice)
        {
        case 1: zhongguoxiangqi_game().zhongguoxiangqi_run(); break;
        case 2: guojixiangqi_game().guojixiangqi_run(); break;
        case 3: weiqi_game().weiqi_run(); break;
        case 4: wuziqi_game().wuziqi_run(); break;
        case 5: feixingqi_game().feixingqi_run(); break;
        case 6: tiaoqi_game().tiaoqi_run(); break;
        default: return 0;
        }
    }
}
