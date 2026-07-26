#pragma once
#include "feixingqi_ui.h"
#include <string>
#include <windows.h>

namespace feixingqi
{

// gametime：管理每步倒计时和每位玩家的总剩余时间。
class gametime {
public:
    int stepindex;                         // 当前选择的每步时长下标。
    int totalindex;                        // 当前选择的单方总时长下标。
    int playercount;                       // 当前参与计时的玩家人数。
    int activeplayer;                      // 当前正在计时的玩家编号。
    bool running;                          // 当前是否处于正式游戏计时中。
    long long stepleftms;                  // 当前步骤剩余毫秒数。
    long long playerleftms[MAX_PLAYERS];   // 每位玩家剩余总毫秒数。
    unsigned long long lasttick;           // 上次扣时的系统时刻。

    gametime();
    void reset();
    void init_players(int count);
    void set_step_index(int index);
    void set_total_index(int index);
    int step_seconds() const;
    int total_seconds() const;
    int step_left_seconds() const;
    int player_left_seconds(int owner) const;
    std::wstring step_label() const;
    std::wstring total_label() const;
    std::wstring format_seconds(int seconds) const;
    void start_turn(int owner);
    void stop();
    void resume_now();
    bool update(int& timeoutplayer);
};


} // namespace feixingqi