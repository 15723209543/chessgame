#pragma once
#include "feixingqi_board.h"
#include "feixingqi_robot.h"
#include "feixingqi_time.h"
#include <cstdio>

namespace feixingqi
{

enum gamestate {
    STATE_SETUP,   // 设置人数和棋子数。
    STATE_LOT,     // 抽签决定出发顺序。
    STATE_ROLL,    // 等待当前玩家投骰子。
    STATE_SELECT,  // 等待当前玩家选择棋子或不走。
    STATE_OVER     // 游戏结束。
};

struct snapshot {
    int numplayers;                       // 快照中的玩家人数。
    int piececounts[MAX_PLAYERS];         // 快照中的每队棋子数量。
    gamestate state;                      // 快照中的游戏状态。
    std::vector<player> players;          // 快照中的玩家和棋子数据。
    std::vector<int> playorder;           // 快照中的行动顺序。
    std::vector<int> drawvalues;          // 快照中的抽签点数。
    int drawn;                            // 快照中已经抽签的人数。
    int turnindex;                        // 快照中当前行动顺序下标。
    int curplayer;                        // 快照中当前玩家编号。
    int dicevalue;                        // 快照中骰子点数。
    bool hasrolled;                       // 快照中是否已经投骰。
    bool gotsix;                          // 快照中是否投出6。
    int selectedpiece;                    // 快照中已选择、等待再次确认的棋子下标。
    int winner;                           // 快照中胜利玩家编号。
    int loser;                            // 快照中超时失败玩家编号。
    bool eliminated[MAX_PLAYERS];         // 快照中已经超时判负的玩家标记。
    int eliminatedfinished[MAX_PLAYERS];  // 快照中玩家判负瞬间的已完成棋子数。
    std::vector<int> eliminationorder;     // 快照中玩家超时判负的先后顺序。
    bool completed[MAX_PLAYERS];          // 快照中已经完成比赛的玩家标记。
    std::vector<int> rankings;            // 快照中按照完成先后保存的玩家排名。
    int setupselect;                      // 快照中设置界面当前选中的行。
    std::wstring notice;                  // 快照中右侧输出信息。
    std::wstring special;                 // 快照中特殊操作说明。
    std::wstring ranknotice;              // 快照中最近一名完成玩家的排名提示。
    bool jumpactive;                      // 快照中是否显示飞跃虚线。
    int jumpfrom;                         // 快照中飞跃起点格。
    int jumpto;                           // 快照中飞跃终点格。
    int jumpowner;                        // 快照中飞跃所属玩家。
    board gameboard;                      // 快照中的棋盘对象。
    gametime timeclock;                   // 快照中的计时器状态。
    robot robotai;                        // 快照中的机器人配置和等待状态。
};

class game {
public:
    int numplayers;                       // 当前玩家人数。
    int piececounts[MAX_PLAYERS];         // 每队棋子数量。
    gamestate state;                      // 当前游戏状态。
    std::vector<player> players;          // 所有玩家数据。
    std::vector<int> playorder;           // 正式游戏中的行动顺序。
    std::vector<int> drawvalues;          // 抽签点数。
    int drawn;                            // 已经完成抽签的人数。
    int turnindex;                        // 当前行动顺序下标。
    int curplayer;                        // 当前操作玩家编号。
    int dicevalue;                        // 当前骰子点数。
    bool hasrolled;                       // 当前回合是否已投骰。
    bool gotsix;                          // 当前投骰是否为6。
    int selectedpiece;                    // 当前已选择的棋子下标；-1表示尚未选择。
    int winner;                           // 获胜玩家编号；-1表示未分胜负。
    int loser;                            // 超时失败玩家编号；-1表示无人超时。
    bool eliminated[MAX_PLAYERS];         // 超时判负玩家标记，判负后清空棋子并跳过行动。
    int eliminatedfinished[MAX_PLAYERS];  // 判负瞬间完成的棋子数量，清除棋子后仍用于进度和排名。
    std::vector<int> eliminationorder;     // 判负先后顺序，用于完成比例相同时确定名次。
    bool completed[MAX_PLAYERS];          // 已完成比赛玩家标记，完成后不再进入行动回合。
    std::vector<int> rankings;            // 玩家完成顺序，数组下标加1就是当前排名。
    int setupselect;                      // 设置界面选中的行：人数、棋子数、机器人、每步和单方时长。
    bool quit;                            // 是否退出主循环。
    std::wstring notice;                  // 右侧输出框文字。
    std::wstring special;                 // 右侧特殊操作文字。
    std::wstring ranknotice;              // 右侧最上方持续显示的最近完成排名。
    bool jumpactive;                      // 是否显示同色飞跃虚线。
    int jumpfrom;                         // 同色飞跃起点格。
    int jumpto;                           // 同色飞跃终点格。
    int jumpowner;                        // 同色飞跃所属玩家。
    board gameboard;                      // 棋盘对象。
    gametime timeclock;                   // 游戏计时器。
    robot robotai;                        // 机器人数量、席位、分阶段动作和决策算法。

    game();
    ~game();
    void init();
    void run();
    void handle_key(int key, int scancode);

private:
    friend class robot;

    std::vector<snapshot> history;        // 返回上一步用的历史快照栈。
    FILE* logfile;                        // 当前日志文件指针。
    std::wstring logpath;                 // 当前日志文件完整路径。

    void reset();
    void save();
    void undo();
    void draw();
    void handle_click(int mx, int my);
    void draw_setup();
    void draw_lot();
    void draw_play();
    void draw_over();
    void draw_panel_base(const std::wstring& title);
    void draw_panel_setup();
    void draw_panel_lot();
    void draw_panel_play();
    void draw_panel_over();
    void draw_back_button();
    void draw_dice_box(bool active);
    void draw_progress(int x, int y);
    void draw_rules(int x, int y);
    void draw_select_marks();
    void draw_jump_path();
    void update_clock();
    void update_robot();
    void lose_by_time(int owner);
    int setup_row_y(int row) const;
    button setup_minus_button(int row) const;
    button setup_plus_button(int row) const;
    std::wstring setup_label(int row) const;
    std::wstring setup_value_text(int row) const;
    void draw_setup_row(int row, int y, const std::wstring& label, const std::wstring& value,
                        bool candecrease, bool canincrease);
    bool change_setup_value(int row, int delta);
    void sync_piececounts(int count);
    bool is_active_player(int owner) const;
    int active_count() const;
    int only_active_player() const;
    int rank_of(int owner) const;
    int eliminated_rank(int owner) const;
    std::vector<int> eliminated_ranking() const;
    std::wstring display_player(int owner) const;
    bool finish_if_decided(const std::wstring& text);
    button back_button() const;
    button dice_button() const;
    button skip_button() const;
    void click_setup(int mx, int my);
    void click_lot(int mx, int my);
    void click_play(int mx, int my);
    void click_over(int mx, int my);
    void start_game();
    void lot_roll(bool animate = true);
    void start_play();
    void roll_dice(bool animate = true);
    bool any_move() const;
    bool can_move(int index) const;
    void move_piece(int index);
    void skip_move();
    void finish_action();
    void next_turn(const std::wstring& last = L"");
    void reduce_skips(int owner);
    std::wstring apply_special(piece& one, int owner);
    std::wstring check_hit(piece& one, int owner);
    bool check_win();
    void start_log();
    void close_log();
    void log_event(const std::wstring& text);
    std::wstring root_path() const;
    std::string gbk_text(const std::wstring& text) const;
};


} // namespace feixingqi