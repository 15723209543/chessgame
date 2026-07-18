#include "feixingqi_time.h"

namespace feixingqi
{

static const int STEP_CHOICES[] = {10, 15, 30};          // STEP_CHOICES：每步时长选项，单位秒。
static const int TOTAL_CHOICES[] = {300, 600, 900, 1800}; // TOTAL_CHOICES：单方总时长选项，单位秒。

// 构造计时器：默认每步15秒，单方10分钟。
gametime::gametime()
    : stepindex(1), totalindex(1), playercount(0), activeplayer(-1), running(false),
      stepleftms(0), lasttick(0) {
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        playerleftms[i] = 0;
    }
}

// reset：回到默认计时设置并停止计时。
void gametime::reset() {
    stepindex = 1;
    totalindex = 1;
    playercount = 0;
    activeplayer = -1;
    running = false;
    stepleftms = 0;
    lasttick = 0;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        playerleftms[i] = 0;
    }
}

// init_players：按当前设置给所有玩家分配总时长。
void gametime::init_players(int count) {
    playercount = count;
    activeplayer = -1;
    running = false;
    stepleftms = (long long)step_seconds() * 1000;
    lasttick = GetTickCount();
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        playerleftms[i] = i < count ? (long long)total_seconds() * 1000 : 0;
    }
}

// set_step_index：设置每步时长选项。
void gametime::set_step_index(int index) {
    if (index >= 0 && index < 3) {
        stepindex = index;
    }
}

// set_total_index：设置单方总时长选项。
void gametime::set_total_index(int index) {
    if (index >= 0 && index < 4) {
        totalindex = index;
    }
}

// step_seconds：返回当前每步时长秒数。
int gametime::step_seconds() const {
    return STEP_CHOICES[stepindex];
}

// total_seconds：返回当前单方总时长秒数。
int gametime::total_seconds() const {
    return TOTAL_CHOICES[totalindex];
}

// step_left_seconds：返回当前步骤剩余秒数，向上取整。
int gametime::step_left_seconds() const {
    long long value = stepleftms;
    if (value < 0) {
        value = 0;
    }
    return (int)((value + 999) / 1000);
}

// player_left_seconds：返回指定玩家剩余总秒数，向上取整。
int gametime::player_left_seconds(int owner) const {
    if (owner < 0 || owner >= MAX_PLAYERS) {
        return 0;
    }
    long long value = playerleftms[owner];
    if (value < 0) {
        value = 0;
    }
    return (int)((value + 999) / 1000);
}

// step_label：返回每步时长显示文本。
std::wstring gametime::step_label() const {
    return std::to_wstring(step_seconds()) + L"s";
}

// total_label：返回单方总时长显示文本。
std::wstring gametime::total_label() const {
    return std::to_wstring(total_seconds() / 60) + L"min";
}

// format_seconds：把秒数格式化成 mm:ss。
std::wstring gametime::format_seconds(int seconds) const {
    if (seconds < 0) {
        seconds = 0;
    }
    int minute = seconds / 60;
    int second = seconds % 60;
    wchar_t text[32];
    swprintf_s(text, L"%02d:%02d", minute, second);
    return text;
}

// start_turn：开始指定玩家的一步计时，同时保留该玩家总剩余时间。
void gametime::start_turn(int owner) {
    activeplayer = owner;
    stepleftms = (long long)step_seconds() * 1000;
    running = owner >= 0 && owner < playercount;
    lasttick = GetTickCount();
}

// stop：停止计时。
void gametime::stop() {
    running = false;
    activeplayer = -1;
    lasttick = GetTickCount();
}

// resume_now：从快照恢复后重置时间基准，避免把撤销期间的真实时间扣掉。
void gametime::resume_now() {
    lasttick = GetTickCount();
}

// update：按真实经过时间扣除步骤和玩家总时长，超时返回true。
bool gametime::update(int& timeoutplayer) {
    timeoutplayer = -1;
    if (!running || activeplayer < 0 || activeplayer >= playercount) {
        lasttick = GetTickCount();
        return false;
    }

    unsigned long long now = GetTickCount();
    long long elapsed = (long long)(now - lasttick);
    if (elapsed <= 0) {
        return false;
    }
    lasttick = now;
    stepleftms -= elapsed;
    playerleftms[activeplayer] -= elapsed;

    if (stepleftms <= 0 || playerleftms[activeplayer] <= 0) {
        if (stepleftms < 0) {
            stepleftms = 0;
        }
        if (playerleftms[activeplayer] < 0) {
            playerleftms[activeplayer] = 0;
        }
        timeoutplayer = activeplayer;
        running = false;
        return true;
    }
    return false;
}



} // namespace feixingqi