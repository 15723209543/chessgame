#pragma once

#include "zhongguoxiangqi_analysis.h"
#include "zhongguoxiangqi_board.h"
#include "zhongguoxiangqi_time.h"

namespace zhongguoxiangqi
{

// buttonrect 保存一个按钮的矩形区域。
struct buttonrect
{
    int left;   // left 表示按钮左边界。
    int top;    // top 表示按钮上边界。
    int right;  // right 表示按钮右边界。
    int bottom; // bottom 表示按钮下边界。
};

void drawgame(const gamestate& state, const timestate& timer, const analysisresult& analysis, int selectedid, const std::vector<point>& moves,
              bool pendingvisible, const point& pendingpoint, const buttonrect& undobutton, const buttonrect& backbutton);
bool getboardrowcol(int x, int y, int& row, int& col);
bool isinbutton(int x, int y, const buttonrect& button);


} // namespace zhongguoxiangqi
