#pragma once

#include "guojixiangqi_board.h"

#include <string>

// guojixiangqi_analysis_result 保存国际象棋局面评分、双方预测胜率和文字结论。
struct guojixiangqi_analysis_result
{
    int guojixiangqi_white_percent = 50; // guojixiangqi_white_percent 是白方预测胜率百分比。
    int guojixiangqi_black_percent = 50; // guojixiangqi_black_percent 是黑方预测胜率百分比。
    int guojixiangqi_score = 0;          // guojixiangqi_score 是从白方视角计算的厘兵评分。
    std::wstring guojixiangqi_summary;    // guojixiangqi_summary 是面向玩家的局势结论。
};

// guojixiangqi_analyze 根据材力、中心控制、兵推进、双象、将军和对局阶段预测胜负。
guojixiangqi_analysis_result guojixiangqi_analyze(const guojixiangqi_board& guojixiangqi_board_value);
