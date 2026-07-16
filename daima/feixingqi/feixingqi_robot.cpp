#include "feixingqi_robot.h"
#include "feixingqi_game.h"
#include <limits>

namespace feixingqi
{

// 构造机器人控制器：默认不启用机器人。
robot::robot()
    : robotcount(0), phase(ROBOT_IDLE), waitingplayer(-1), waitstart(0) {
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        robotflags[i] = false;
    }
}

// reset：清空机器人数量、席位和等待状态。
void robot::reset() {
    robotcount = 0;
    phase = ROBOT_IDLE;
    waitingplayer = -1;
    waitstart = 0;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        robotflags[i] = false;
    }
}

// configure：按玩家总数配置机器人，编号靠后的玩家由机器人控制。
void robot::configure(int playercount, int count) {
    if (playercount < 0) {
        playercount = 0;
    }
    if (playercount > MAX_PLAYERS) {
        playercount = MAX_PLAYERS;
    }
    if (count < 0) {
        count = 0;
    }
    if (count > playercount) {
        count = playercount;
    }

    robotcount = count;
    for (int i = 0; i < MAX_PLAYERS; ++i) {
        robotflags[i] = i < playercount && i >= playercount - robotcount;
    }
    cancel();
}

// setcount：修改机器人数量，并立即重新分配机器人席位。
void robot::setcount(int playercount, int count) {
    configure(playercount, count);
}

// count：返回当前机器人数量。
int robot::count() const {
    return robotcount;
}

// isrobot：判断指定玩家是否由机器人控制。
bool robot::isrobot(int owner) const {
    return owner >= 0 && owner < MAX_PLAYERS && robotflags[owner];
}

// begin：开始正式回合投骰前的短暂准备，同一回合不会重复计时。
void robot::begin(int owner) {
    if (phase == ROBOT_WAIT_ROLL && waitingplayer == owner) {
        return;
    }
    phase = ROBOT_WAIT_ROLL;
    waitingplayer = owner;
    waitstart = GetTickCount();
}

// beginrolling：标记机器人正在播放骰子滚动动画。
void robot::beginrolling(int owner) {
    phase = ROBOT_ROLLING;
    waitingplayer = owner;
    waitstart = GetTickCount();
}

// beginmove：骰子结果出现后开始2秒可走棋子展示时间。
void robot::beginmove(int owner) {
    phase = ROBOT_WAIT_MOVE;
    waitingplayer = owner;
    waitstart = GetTickCount();
}

// beginconfirm：机器人选中棋子后开始短暂展示，随后执行第二次确认。
void robot::beginconfirm(int owner) {
    phase = ROBOT_WAIT_CONFIRM;
    waitingplayer = owner;
    waitstart = GetTickCount();
}

// cancel：取消当前机器人等待状态。
void robot::cancel() {
    phase = ROBOT_IDLE;
    waitingplayer = -1;
    waitstart = 0;
}

// resume：撤销恢复快照后重新计算当前阶段时间，避免机器人立即误触发。
void robot::resume() {
    if (phase != ROBOT_IDLE) {
        waitstart = GetTickCount();
    }
}

// phaseelapsed：判断指定玩家的指定机器人阶段是否达到要求时长。
bool robot::phaseelapsed(int owner, robotphase expected, int milliseconds) const {
    if (phase != expected || waitingplayer != owner) {
        return false;
    }
    return (unsigned long long)(GetTickCount() - (DWORD)waitstart) >= (unsigned long long)milliseconds;
}

// ready：判断机器人是否可以开始投骰。
bool robot::ready(int owner) const {
    return phaseelapsed(owner, ROBOT_WAIT_ROLL, ROBOT_ROLL_WAIT_MILLISECONDS);
}

// moveready：判断骰子结果和可走棋子是否已经展示满2秒。
bool robot::moveready(int owner) const {
    return phaseelapsed(owner, ROBOT_WAIT_MOVE, ROBOT_MOVE_WAIT_MILLISECONDS);
}

// confirmready：判断选中棋子的展示时间是否结束，可以确认移动。
bool robot::confirmready(int owner) const {
    return phaseelapsed(owner, ROBOT_WAIT_CONFIRM, ROBOT_CONFIRM_WAIT_MILLISECONDS);
}

// rolling：判断指定机器人是否正在播放骰子滚动动画。
bool robot::rolling(int owner) const {
    return phase == ROBOT_ROLLING && waitingplayer == owner;
}

// moving：判断指定机器人是否正在等待执行走棋决策。
bool robot::moving(int owner) const {
    return phase == ROBOT_WAIT_MOVE && waitingplayer == owner;
}

// confirming：判断指定机器人是否已经选中棋子、正在等待确认移动。
bool robot::confirming(int owner) const {
    return phase == ROBOT_WAIT_CONFIRM && waitingplayer == owner;
}

// waitleftseconds：返回机器人距离自动行动还剩多少秒，向上取整。
int robot::waitleftseconds() const {
    if (phase == ROBOT_IDLE || phase == ROBOT_ROLLING) {
        return 0;
    }
    unsigned long long elapsed = (unsigned long long)(GetTickCount() - (DWORD)waitstart);
    unsigned long long duration = ROBOT_ROLL_WAIT_MILLISECONDS; // duration：当前等待阶段的总时长。
    if (phase == ROBOT_WAIT_MOVE) {
        duration = ROBOT_MOVE_WAIT_MILLISECONDS;
    } else if (phase == ROBOT_WAIT_CONFIRM) {
        duration = ROBOT_CONFIRM_WAIT_MILLISECONDS;
    }
    if (elapsed >= duration) {
        return 0;
    }
    unsigned long long left = duration - elapsed;
    return (int)((left + 999) / 1000);
}

// analyzechoice：模拟一枚棋子的真实落点，识别飞跃、别人起点和陷阱风险。
robotchoice robot::analyzechoice(const game& app, int index) const {
    robotchoice choice; // choice：返回给决策器的候选棋子分析结果。
    choice.index = index;
    choice.inbase = false;
    choice.fly = false;
    choice.hugefly = false;
    choice.directhome = false;
    choice.enemystart = false;
    choice.trap = false;
    choice.secondtrap = false;
    choice.jumpdistance = 0;
    choice.score = scorepiece(app, index);

    const player& current = app.players[app.curplayer]; // current：当前机器人玩家。
    const piece& one = current.pieces[index]; // one：正在模拟的棋子。
    choice.inbase = one.state == PIECE_BASE;
    if (one.state != PIECE_TRACK) {
        return choice;
    }

    moveresult result = app.gameboard.move(one.trackpos, app.dicevalue, current.startpos);
    int target = -1; // target：应用特殊规则前棋子在公共跑道上的直接落点。
    if (result.enterfinish && one.extralaps > 0) {
        target = (one.trackpos + app.dicevalue) % TRACK_COUNT;
    } else if (!result.enterfinish) {
        target = result.newpos;
    }
    if (target < 0) {
        return choice;
    }

    const cell& targetcell = app.gameboard.cells[target]; // targetcell：直接落点格的数据。
    choice.enemystart = targetcell.type == CELL_START && targetcell.owner >= 0 &&
                        targetcell.owner != app.curplayer;
    choice.trap = targetcell.type == CELL_TRAP;
    choice.secondtrap = choice.trap && one.trapcount >= 1;

    // 只有直接落到自己的普通颜色格才允许飞跃，与实际走棋规则完全一致。
    if (targetcell.type == CELL_NORMAL && targetcell.owner == app.curplayer) {
        int next = app.gameboard.next_color_cell(target, app.curplayer); // next：飞跃后的目标格。
        if (next >= 0 && next != target) {
            int endpos = (current.startpos + TRACK_COUNT - 1) % TRACK_COUNT; // endpos：终点列入口前格。
            int disttoend = (endpos - target + TRACK_COUNT) % TRACK_COUNT; // disttoend：到终点入口的距离。
            int disttonext = (next - target + TRACK_COUNT) % TRACK_COUNT; // disttonext：到下一同色格的距离。
            int normalinterval = app.numplayers > 0 ? app.numplayers : 1; // normalinterval：通常相邻同色格间隔。
            choice.fly = true;
            choice.jumpdistance = disttonext;
            choice.directhome = one.extralaps <= 0 && disttoend <= disttonext;
            choice.hugefly = choice.directhome || disttonext >= normalinterval * 2;
        }
    }
    return choice;
}

// bestchoice：在指定候选类别中选择综合分最高的棋子。
int robot::bestchoice(const std::vector<robotchoice>& choices, robotchoicetype type) const {
    int bestindex = -1; // bestindex：当前类别下评分最高的棋子下标。
    long long bestscore = std::numeric_limits<long long>::lowest(); // bestscore：当前最高分。
    for (int i = 0; i < (int)choices.size(); ++i) {
        const robotchoice& one = choices[i]; // one：本次检查的候选分析。
        bool match = false; // match：候选是否属于要求的类别。
        if (type == ROBOT_CHOICE_HUGE_FLY) {
            match = one.hugefly;
        } else if (type == ROBOT_CHOICE_BASE) {
            match = one.inbase;
        } else if (type == ROBOT_CHOICE_FLY) {
            match = one.fly;
        } else if (type == ROBOT_CHOICE_SAFE) {
            match = !one.enemystart && !one.trap;
        } else {
            match = true;
        }
        if (match && (bestindex < 0 || one.score > bestscore)) {
            bestindex = one.index;
            bestscore = one.score;
        }
    }
    return bestindex;
}

// scorepiece：计算同一决策层级内的收益，完成进度优先，并精细区分危险落点。
long long robot::scorepiece(const game& app, int index) const {
    const player& current = app.players[app.curplayer]; // current：当前机器人玩家。
    const piece& one = current.pieces[index]; // one：正在评分的棋子。
    long long score = 0; // score：同一决策层级内的综合收益分。

    if (one.state == PIECE_BASE) {
        score = 30000;
    } else if (one.state == PIECE_FINISH) {
        int next = one.finishpos + app.dicevalue; // next：移动后的终点列下标。
        score = 80000 + next * 2000;
        if (next >= FINISH_COUNT - 1) {
            score += 100000;
        }
    } else if (one.state == PIECE_TRACK) {
        moveresult result = app.gameboard.move(one.trackpos, app.dicevalue, current.startpos);
        if (result.enterfinish && one.extralaps <= 0) {
            score = 100000 + result.finishpos * 3000;
        } else {
            int target = result.enterfinish ? (one.trackpos + app.dicevalue) % TRACK_COUNT : result.newpos;
            int progress = (target - current.startpos + TRACK_COUNT) % TRACK_COUNT;
            score = 10000 + progress * 120;

            const cell& targetcell = app.gameboard.cells[target];
            if (targetcell.type == CELL_START && targetcell.owner >= 0 &&
                targetcell.owner != app.curplayer) {
                score -= 60000;
            }

            if (targetcell.type == CELL_TRAP) {
                score -= one.trapcount >= 1 ? 120000 : 45000;
            }

            if (targetcell.type == CELL_NORMAL && targetcell.owner == app.curplayer) {
                int next = app.gameboard.next_color_cell(target, app.curplayer);
                if (next >= 0 && next != target) {
                    int endpos = (current.startpos + TRACK_COUNT - 1) % TRACK_COUNT;
                    int disttoend = (endpos - target + TRACK_COUNT) % TRACK_COUNT;
                    int disttonext = (next - target + TRACK_COUNT) % TRACK_COUNT;
                    score += 120000 + disttonext * 1500;
                    if (one.extralaps <= 0 && disttoend <= disttonext) {
                        score += 200000;
                    }
                }
            }

            if (one.extralaps > 0) {
                score -= one.extralaps * 20000;
            }
        }
    }

    // 同分时优先选择编号较小的棋子，使机器人行为稳定且便于复现。
    score -= index;
    return score;
}

// choosepiece：按“6点优先起飞、其他点优先飞跃、危险落点最后考虑”的层级决策。
int robot::choosepiece(const game& app) const {
    if (app.curplayer < 0 || app.curplayer >= (int)app.players.size()) {
        return -1;
    }

    std::vector<robotchoice> choices; // choices：所有当前合法棋子的落点分析。
    for (int i = 0; i < (int)app.players[app.curplayer].pieces.size(); ++i) {
        if (!app.can_move(i)) {
            continue;
        }
        choices.push_back(analyzechoice(app, i));
    }
    if (choices.empty()) {
        return -1;
    }

    // 掷出6时，只允许高收益长距离飞跃抢在起飞前面；普通飞跃不能挤掉新棋子起飞。
    if (app.dicevalue == 6) {
        int hugefly = bestchoice(choices, ROBOT_CHOICE_HUGE_FLY); // hugefly：最佳长距离飞跃棋子。
        if (hugefly >= 0) {
            return hugefly;
        }
        int base = bestchoice(choices, ROBOT_CHOICE_BASE); // base：可以从基地起飞的棋子。
        if (base >= 0) {
            return base;
        }
    }

    // 非6点以及没有棋子可起飞时，任何合法同色飞跃都优先于普通走棋。
    int fly = bestchoice(choices, ROBOT_CHOICE_FLY); // fly：最佳同色飞跃棋子。
    if (fly >= 0) {
        return fly;
    }

    // 没有飞跃时先选安全落点，别人起点和黑色陷阱只在无安全选择时参与比较。
    int safe = bestchoice(choices, ROBOT_CHOICE_SAFE); // safe：最佳安全落点棋子。
    if (safe >= 0) {
        return safe;
    }
    return bestchoice(choices, ROBOT_CHOICE_ANY);
}


} // namespace feixingqi