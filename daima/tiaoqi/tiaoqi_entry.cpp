#include "tiaoqi_entry.h"

namespace tiaoqi
{
    int tiaoqi_run_impl(); // tiaoqi_run_impl 是从原跳棋 main 转换的实现入口。
}

int tiaoqi_game::tiaoqi_run()
{
    return tiaoqi::tiaoqi_run_impl();
}
