#pragma once

#include "tiaoqi_analysis_data.h"
#include "tiaoqi_gamedata.h"

namespace tiaoqi
{

// 这个函数清空局势分析数据。
void analysis_reset();

// 这个函数根据当前棋盘局面重新计算评分和胜率。
void analysis_update(const boarddata& board, const gamestate& state);

// 这个函数返回当前局势分析数据。
const analysisdata& analysis_get_data();


} // namespace tiaoqi