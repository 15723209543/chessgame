#pragma once

#include "wuziqi_board.h"

#include <string>

// wuziqi_analysis_result 保存五子棋连型评分、双方预测胜率和文字结论。
struct wuziqi_analysis_result
{
    int wuziqi_black_percent = 50; // wuziqi_black_percent 是黑方预测胜率百分比。
    int wuziqi_white_percent = 50; // wuziqi_white_percent 是白方预测胜率百分比。
    int wuziqi_score = 0;          // wuziqi_score 是从黑方视角计算的连型分差。
    std::wstring wuziqi_summary;    // wuziqi_summary 是面向玩家的局势结论。
};

// wuziqi_analyze 根据双方活连、眠连、中心控制、对局阶段和终局状态预测胜负。
wuziqi_analysis_result wuziqi_analyze(const wuziqi_board& wuziqi_board_value);
