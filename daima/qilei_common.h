#pragma once

#include <array>
#include <filesystem>
#include <fstream>
#include <string>
#include <windows.h>

// qilei_game_setting 保存新游戏共用的步时、总时、人机模式和机器人难度。
struct qilei_game_setting
{
    int qilei_step_seconds = 60;  // qilei_step_seconds 是每步允许的秒数。
    int qilei_total_seconds = 600; // qilei_total_seconds 是每方拥有的总秒数。
    int qilei_robot_mode = 2;     // qilei_robot_mode 为 0 双人、1 先手机器人、2 后手机器人、3 双机器人。
    int qilei_robot_level = 2;    // qilei_robot_level 为 0 入门、1 进阶、2 大师。
};

// qilei_clock 封装双方每步倒计时和总倒计时。
class qilei_clock
{
public:
    // qilei_reset 根据设置重置计时器并从指定一方开始计时。
    void qilei_reset(const qilei_game_setting& qilei_setting, int qilei_active_side);

    // qilei_update 扣除经过时间，返回超时一方，无超时时返回 -1。
    int qilei_update();

    // qilei_switch 在成功落子后切换行动方并重置步时。
    void qilei_switch(int qilei_active_side);

    // qilei_stop 停止对局计时。
    void qilei_stop();

    // qilei_format 把秒数格式化为 mm:ss。
    static std::wstring qilei_format(int qilei_seconds);

    int qilei_step_remaining = 60;            // qilei_step_remaining 是本步剩余秒数。
    std::array<int, 2> qilei_total_remaining{}; // qilei_total_remaining 是双方剩余总秒数。
    bool qilei_running = false;                // qilei_running 表示计时器是否正在工作。

private:
    int qilei_step_limit = 60;                 // qilei_step_limit 是当前对局的步时上限。
    int qilei_active_side = 0;                 // qilei_active_side 是当前被扣时的一方。
    unsigned long long qilei_last_tick = 0;    // qilei_last_tick 是上一次更新的毫秒时刻。
    int qilei_millisecond_debt = 0;            // qilei_millisecond_debt 累积不足一秒的毫秒。
};

// qilei_result_logger 把新游戏的设置、每步和结果写入统一 result 目录。
class qilei_result_logger
{
public:
    // qilei_open 创建“棋类名字+时间”的 UTF-8 结果文件。
    bool qilei_open(const std::wstring& qilei_game_name);

    // qilei_write 写入一行带时分秒的记录。
    void qilei_write(const std::wstring& qilei_text);

    // qilei_path 返回当前结果文件路径。
    const std::filesystem::path& qilei_path() const;

private:
    std::ofstream qilei_stream;          // qilei_stream 是当前 UTF-8 日志输出流。
    std::filesystem::path qilei_file_path; // qilei_file_path 是当前结果文件的完整路径。
};

// qilei_engine_process 通过 Windows 匿名管道与 UCI、GTP 或 Piskvork 棋类引擎通信。
class qilei_engine_process
{
public:
    qilei_engine_process();
    ~qilei_engine_process();
    qilei_engine_process(const qilei_engine_process&) = delete;
    qilei_engine_process& operator=(const qilei_engine_process&) = delete;

    // qilei_start 启动无窗口引擎进程，qilei_arguments 为命令行参数。
    bool qilei_start(const std::filesystem::path& qilei_executable, const std::wstring& qilei_arguments = L"");

    // qilei_send 向引擎发送一行 ASCII/UTF-8 协议命令。
    bool qilei_send(const std::string& qilei_command);

    // qilei_wait_for 读取直到出现指定标记或超时，并返回本次收到的文本。
    bool qilei_wait_for(const std::string& qilei_marker, unsigned long long qilei_timeout_ms, std::string& qilei_output);

    // qilei_stop 向引擎发送退出命令并释放进程和管道句柄。
    void qilei_stop(const std::string& qilei_quit_command = "quit");

    // qilei_running 返回引擎进程是否已成功启动。
    bool qilei_running() const;

    // qilei_error 返回最近一次启动或通信错误。
    const std::wstring& qilei_error() const;

private:
    HANDLE qilei_input_write = nullptr;  // qilei_input_write 是向引擎标准输入写入的句柄。
    HANDLE qilei_output_read = nullptr;  // qilei_output_read 是从引擎标准输出读取的句柄。
    PROCESS_INFORMATION qilei_process_info{}; // qilei_process_info 保存引擎进程与主线程句柄。
    std::string qilei_pending_output;    // qilei_pending_output 保存还未被上层消费的引擎输出。
    std::wstring qilei_last_error;       // qilei_last_error 保存可向用户显示的错误说明。
};

// qilei_choose_setting 显示新游戏共用的可视化计时与机器人设置页。
bool qilei_choose_setting(const std::wstring& qilei_title,
                          const std::wstring& qilei_first_name,
                          const std::wstring& qilei_second_name,
                          qilei_game_setting& qilei_setting);

// qilei_project_root 从当前目录和程序目录向上定位 chessgame.vcxproj 所在根目录。
std::filesystem::path qilei_project_root();

// qilei_engine_path 组合并返回 engines/棋类/文件名 的完整路径。
std::filesystem::path qilei_engine_path(const std::wstring& qilei_game_folder, const std::wstring& qilei_file_name);

// qilei_side_is_robot 根据公共模式判断指定一方是否由机器人控制。
bool qilei_side_is_robot(const qilei_game_setting& qilei_setting, int qilei_side);

// qilei_robot_think_ms 根据难度和步时返回机器人本步思考毫秒数。
int qilei_robot_think_ms(const qilei_game_setting& qilei_setting, int qilei_maximum_ms);
