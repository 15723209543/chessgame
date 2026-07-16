#include "zhongguoxiangqi_entry.h"

namespace zhongguoxiangqi
{
    int zhongguoxiangqi_run_impl(); // zhongguoxiangqi_run_impl 是从原中国象棋 main 转换的实现入口。
}

int zhongguoxiangqi_game::zhongguoxiangqi_run()
{
    return zhongguoxiangqi::zhongguoxiangqi_run_impl();
}
