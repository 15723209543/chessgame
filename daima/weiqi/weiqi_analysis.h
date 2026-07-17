#pragma once

#include "weiqi_board.h"

#include <string>

// weiqi_analysis_result 保存围棋盘面估算、双方预测胜率和文字结论。
struct weiqi_analysis_result
{
    int weiqi_black_percent = 50; // weiqi_black_percent 是黑方预测胜率百分比。
    int weiqi_white_percent = 50; // weiqi_white_percent 是白方预测胜率百分比。
    double weiqi_lead = 0.0;      // weiqi_lead 是黑方估算领先目数，负数表示白方领先。
    std::wstring weiqi_summary;    // weiqi_summary 是面向玩家的局势结论。
};

// weiqi_analyze 根据中国数子法、棋子与提子差、贴目先行补偿和对局阶段预测胜负。
weiqi_analysis_result weiqi_analyze(const weiqi_board& weiqi_board_value);
