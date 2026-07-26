#include "feixingqi_entry.h"

namespace feixingqi
{
    int feixingqi_run_impl(); // feixingqi_run_impl 是从原飞行棋 main 转换的实现入口。
}

int feixingqi_game::feixingqi_run()
{
    return feixingqi::feixingqi_run_impl();
}
