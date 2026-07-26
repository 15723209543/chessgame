#pragma once
#include "feixingqi_ui.h"
#include <vector>
#include <windows.h>

namespace feixingqi
{

class game;

// 正式回合先准备1.5秒，骰子动画约0.54秒，结果展示2秒，选中展示0.6秒，总计不超过5秒。
const int ROBOT_ROLL_WAIT_MILLISECONDS = 1500;
const int ROBOT_MOVE_WAIT_MILLISECONDS = 2000;
const int ROBOT_CONFIRM_WAIT_MILLISECONDS = 600;

enum robotphase {
    ROBOT_IDLE,         // 当前没有机器人动作。
    ROBOT_WAIT_ROLL,    // 正式回合开始，等待投骰。
    ROBOT_ROLLING,      // 正在播放骰子滚动动画。
    ROBOT_WAIT_MOVE,    // 骰子结果已出现，展示可走棋子并等待选择。
    ROBOT_WAIT_CONFIRM  // 已经选择棋子，等待第二步确认移动。
};

// robotchoicetype：机器人按照规则逐层筛选候选棋子的类别。
enum robotchoicetype {
    ROBOT_CHOICE_HUGE_FLY, // 能跨过至少一个通常同色格，或直接飞入停车区。
    ROBOT_CHOICE_BASE,     // 尚未起飞、可以在点数6时起飞的棋子。
    ROBOT_CHOICE_FLY,      // 本步会直接落到己方颜色格并触发飞跃的棋子。
    ROBOT_CHOICE_SAFE,     // 不会落到别人起点或黑色陷阱的棋子。
    ROBOT_CHOICE_ANY       // 没有安全选择时使用的全部合法棋子。
};

// robotchoice：保存一枚候选棋子移动后的完整风险和收益分析。
struct robotchoice {
    int index;             // 候选棋子的数组下标。
    bool inbase;           // 棋子当前是否仍在基地。
    bool fly;              // 本步落点是否触发同色飞跃。
    bool hugefly;          // 本步是否属于高收益长距离飞跃。
    bool directhome;       // 飞跃是否会直接进入停车区最里面。
    bool enemystart;       // 普通落点是否为其他玩家起点。
    bool trap;             // 普通落点是否为黑色陷阱。
    bool secondtrap;       // 本步是否会第二次踩陷阱并被罚跑一圈。
    int jumpdistance;      // 飞跃在公共跑道上前进的额外格数。
    long long score;       // 同一优先级内用于比较的综合分数。
};

// robot：管理机器人席位、等待计时，并根据当前棋盘选择收益最高的棋子。
class robot {
public:
    int robotcount;                         // 当前设置的机器人数量。
    bool robotflags[MAX_PLAYERS];           // 每个玩家编号是否由机器人控制。
    robotphase phase;                       // 当前机器人动作阶段。
    int waitingplayer;                      // 当前执行动作的机器人玩家编号。
    unsigned long long waitstart;           // 当前阶段开始时刻。

    robot();
    void reset();
    void configure(int playercount, int count);
    void setcount(int playercount, int count);
    int count() const;
    bool isrobot(int owner) const;
    void begin(int owner);
    void beginrolling(int owner);
    void beginmove(int owner);
    void beginconfirm(int owner);
    void cancel();
    void resume();
    bool ready(int owner) const;
    bool moveready(int owner) const;
    bool confirmready(int owner) const;
    bool rolling(int owner) const;
    bool moving(int owner) const;
    bool confirming(int owner) const;
    int waitleftseconds() const;
    int choosepiece(const game& app) const;

private:
    bool phaseelapsed(int owner, robotphase expected, int milliseconds) const;
    robotchoice analyzechoice(const game& app, int index) const;
    int bestchoice(const std::vector<robotchoice>& choices, robotchoicetype type) const;
    long long scorepiece(const game& app, int index) const;
};


} // namespace feixingqi