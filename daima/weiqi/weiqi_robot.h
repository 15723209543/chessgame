#pragma once

#include "weiqi_board.h"
#include "../qilei_common.h"

// weiqi_robot 优先通过 GTP 调用 KataGo 1.16.5，失败时使用局部提子启发式机器人。
class weiqi_robot
{
public:
    // weiqi_start 启动 KataGo Eigen AVX2 GTP 引擎并初始化 19 路与 7.5 贴目。
    bool weiqi_start();

    // weiqi_choose_move 为当前局面选择合法落子或停一手。
    weiqi_move weiqi_choose_move(const weiqi_board& weiqi_board_value, int weiqi_think_ms);

    // weiqi_engine_name 返回当前实际使用的机器人名称。
    std::wstring weiqi_engine_name() const;

private:
    // weiqi_gtp 发送一条 GTP 命令并返回不含协议前缀的应答。
    bool weiqi_gtp(const std::string& weiqi_command, std::string& weiqi_response, unsigned long long weiqi_timeout_ms);

    // weiqi_to_gtp 把内部行列坐标转换为跳过 I 列的 GTP 坐标。
    static std::string weiqi_to_gtp(const weiqi_move& weiqi_move_value);

    // weiqi_from_gtp 把 KataGo GTP 落点转换为内部坐标。
    static weiqi_move weiqi_from_gtp(std::string weiqi_text);

    // weiqi_choose_local 用提子优先、连接与中央性启发式选择后备走法。
    weiqi_move weiqi_choose_local(const weiqi_board& weiqi_board_value) const;

    qilei_engine_process weiqi_engine; // weiqi_engine 是 KataGo 子进程与 GTP 管道。
    bool weiqi_katago_ready = false;    // weiqi_katago_ready 表示 KataGo 是否可以正常生成走法。
};
