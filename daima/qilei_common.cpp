#include "qilei_common.h"

#include <graphics.h>

#include <algorithm>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <vector>

namespace
{
    // qilei_wide_to_utf8 把 Windows 宽字符文本转换为 UTF-8。
    std::string qilei_wide_to_utf8(const std::wstring& qilei_text)
    {
        if (qilei_text.empty())
        {
            return {};
        }
        const int qilei_size = WideCharToMultiByte(CP_UTF8, 0, qilei_text.c_str(), -1, nullptr, 0, nullptr, nullptr); // qilei_size 是转换后缓冲区字节数。
        std::string qilei_result(static_cast<std::size_t>(qilei_size), '\0'); // qilei_result 保存包含结尾空字符的 UTF-8 文本。
        WideCharToMultiByte(CP_UTF8, 0, qilei_text.c_str(), -1, qilei_result.data(), qilei_size, nullptr, nullptr);
        qilei_result.pop_back();
        return qilei_result;
    }

    // qilei_timestamp 生成适合文件名或日志前缀的本地时间。
    std::wstring qilei_timestamp(bool qilei_for_file)
    {
        SYSTEMTIME qilei_now{}; // qilei_now 保存当前本地时间。
        GetLocalTime(&qilei_now);
        wchar_t qilei_buffer[64]{}; // qilei_buffer 是格式化时间的宽字符缓冲区。
        if (qilei_for_file)
        {
            swprintf_s(qilei_buffer, L"%04d%02d%02d_%02d%02d%02d", qilei_now.wYear, qilei_now.wMonth, qilei_now.wDay, qilei_now.wHour, qilei_now.wMinute, qilei_now.wSecond);
        }
        else
        {
            swprintf_s(qilei_buffer, L"%02d:%02d:%02d", qilei_now.wHour, qilei_now.wMinute, qilei_now.wSecond);
        }
        return qilei_buffer;
    }

    // qilei_draw_setting_button 绘制设置页中一个可点击选项。
    void qilei_draw_setting_button(int qilei_left, int qilei_top, int qilei_width, const std::wstring& qilei_text, bool qilei_selected, bool qilei_focused)
    {
        setfillcolor(qilei_selected ? RGB(52, 132, 104) : RGB(255, 255, 255));
        setlinecolor(qilei_focused ? RGB(196, 67, 57) : RGB(201, 203, 199));
        setlinestyle(PS_SOLID, qilei_focused ? 3 : 1);
        fillroundrect(qilei_left, qilei_top, qilei_left + qilei_width, qilei_top + 44, 10, 10);
        setbkmode(TRANSPARENT);
        settextcolor(qilei_selected ? WHITE : RGB(47, 53, 55));
        settextstyle(17, 0, L"Microsoft YaHei");
        RECT qilei_rect = { qilei_left, qilei_top, qilei_left + qilei_width, qilei_top + 44 }; // qilei_rect 是选项文字的绘制区域。
        drawtext(qilei_text.c_str(), &qilei_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
}

void qilei_clock::qilei_reset(const qilei_game_setting& qilei_setting, int qilei_side)
{
    qilei_step_limit = qilei_setting.qilei_step_seconds;
    qilei_step_remaining = qilei_step_limit;
    qilei_total_remaining = { qilei_setting.qilei_total_seconds, qilei_setting.qilei_total_seconds };
    qilei_active_side = qilei_side;
    qilei_last_tick = GetTickCount64();
    qilei_millisecond_debt = 0;
    qilei_running = true;
}

int qilei_clock::qilei_update()
{
    if (!qilei_running)
    {
        return -1;
    }
    const unsigned long long qilei_now = GetTickCount64(); // qilei_now 是当前毫秒时刻。
    const unsigned long long qilei_elapsed = qilei_now - qilei_last_tick; // qilei_elapsed 是从上次更新经过的毫秒。
    qilei_last_tick = qilei_now;
    qilei_millisecond_debt += static_cast<int>(qilei_elapsed);
    const int qilei_seconds = qilei_millisecond_debt / 1000; // qilei_seconds 是本次需要扣除的整秒。
    qilei_millisecond_debt %= 1000;
    if (qilei_seconds <= 0)
    {
        return -1;
    }
    qilei_step_remaining = std::max(0, qilei_step_remaining - qilei_seconds);
    qilei_total_remaining[qilei_active_side] = std::max(0, qilei_total_remaining[qilei_active_side] - qilei_seconds);
    if (qilei_step_remaining == 0 || qilei_total_remaining[qilei_active_side] == 0)
    {
        qilei_running = false;
        return qilei_active_side;
    }
    return -1;
}

void qilei_clock::qilei_switch(int qilei_side)
{
    qilei_update();
    qilei_active_side = qilei_side;
    qilei_step_remaining = qilei_step_limit;
    qilei_last_tick = GetTickCount64();
    qilei_millisecond_debt = 0;
}

void qilei_clock::qilei_stop()
{
    qilei_update();
    qilei_running = false;
}

std::wstring qilei_clock::qilei_format(int qilei_seconds)
{
    std::wstringstream qilei_stream; // qilei_stream 用于格式化分钟与秒数。
    qilei_stream << qilei_seconds / 60 << L":" << std::setw(2) << std::setfill(L'0') << qilei_seconds % 60;
    return qilei_stream.str();
}

bool qilei_result_logger::qilei_open(const std::wstring& qilei_game_name)
{
    if (qilei_stream.is_open()) qilei_stream.close();
    qilei_stream.clear();
    const std::filesystem::path qilei_folder = qilei_project_root() / L"result"; // qilei_folder 是统一结果目录。
    std::error_code qilei_error_code; // qilei_error_code 接收创建目录时的非异常错误。
    std::filesystem::create_directories(qilei_folder, qilei_error_code);
    qilei_file_path = qilei_folder / (qilei_game_name + qilei_timestamp(true) + L".txt");
    qilei_stream.open(qilei_file_path, std::ios::binary | std::ios::out);
    if (!qilei_stream)
    {
        return false;
    }
    const unsigned char qilei_bom[3] = { 0xEF, 0xBB, 0xBF }; // qilei_bom 是 UTF-8 BOM 字节。
    qilei_stream.write(reinterpret_cast<const char*>(qilei_bom), 3);
    qilei_write(L"对局开始：" + qilei_game_name);
    return true;
}

void qilei_result_logger::qilei_write(const std::wstring& qilei_text)
{
    if (qilei_stream)
    {
        qilei_stream << qilei_wide_to_utf8(L"[" + qilei_timestamp(false) + L"] " + qilei_text + L"\r\n");
        qilei_stream.flush();
    }
}

const std::filesystem::path& qilei_result_logger::qilei_path() const
{
    return qilei_file_path;
}

qilei_engine_process::qilei_engine_process() = default;

qilei_engine_process::~qilei_engine_process()
{
    qilei_stop();
}

bool qilei_engine_process::qilei_start(const std::filesystem::path& qilei_executable, const std::wstring& qilei_arguments)
{
    qilei_stop();
    if (!std::filesystem::exists(qilei_executable))
    {
        qilei_last_error = L"机器人文件不存在。";
        return false;
    }

    SECURITY_ATTRIBUTES qilei_security{}; // qilei_security 定义可被子进程继承的管道句柄。
    qilei_security.nLength = sizeof(qilei_security);
    qilei_security.bInheritHandle = TRUE;
    HANDLE qilei_input_read = nullptr; // qilei_input_read 是引擎继承的标准输入读句柄。
    HANDLE qilei_output_write = nullptr; // qilei_output_write 是引擎继承的标准输出写句柄。
    if (!CreatePipe(&qilei_input_read, &qilei_input_write, &qilei_security, 0) ||
        !CreatePipe(&qilei_output_read, &qilei_output_write, &qilei_security, 0))
    {
        qilei_last_error = L"无法创建机器人通信管道。";
        if (qilei_input_read) CloseHandle(qilei_input_read);
        if (qilei_output_write) CloseHandle(qilei_output_write);
        qilei_stop();
        return false;
    }
    SetHandleInformation(qilei_input_write, HANDLE_FLAG_INHERIT, 0);
    SetHandleInformation(qilei_output_read, HANDLE_FLAG_INHERIT, 0);

    STARTUPINFOW qilei_startup{}; // qilei_startup 配置引擎隐藏窗口和标准管道。
    qilei_startup.cb = sizeof(qilei_startup);
    qilei_startup.dwFlags = STARTF_USESTDHANDLES | STARTF_USESHOWWINDOW;
    qilei_startup.wShowWindow = SW_HIDE;
    qilei_startup.hStdInput = qilei_input_read;
    qilei_startup.hStdOutput = qilei_output_write;
    qilei_startup.hStdError = qilei_output_write;

    std::wstring qilei_command = L"\"" + qilei_executable.wstring() + L"\""; // qilei_command 是 CreateProcessW 使用的可修改命令行。
    if (!qilei_arguments.empty()) qilei_command += L" " + qilei_arguments;
    std::vector<wchar_t> qilei_command_buffer(qilei_command.begin(), qilei_command.end()); // qilei_command_buffer 是以空字符结尾的命令行缓冲区。
    qilei_command_buffer.push_back(L'\0');
    const std::wstring qilei_working_directory = qilei_executable.parent_path().wstring(); // qilei_working_directory 是引擎的工作目录。
    const BOOL qilei_created = CreateProcessW(nullptr, qilei_command_buffer.data(), nullptr, nullptr, TRUE,
                                               CREATE_NO_WINDOW, nullptr, qilei_working_directory.c_str(),
                                               &qilei_startup, &qilei_process_info); // qilei_created 表示引擎子进程是否创建成功。
    CloseHandle(qilei_input_read);
    CloseHandle(qilei_output_write);
    if (!qilei_created)
    {
        qilei_last_error = L"启动机器人失败，Windows 错误码：" + std::to_wstring(GetLastError());
        qilei_stop("");
        return false;
    }
    qilei_pending_output.clear();
    qilei_last_error.clear();
    return true;
}

bool qilei_engine_process::qilei_send(const std::string& qilei_command)
{
    if (!qilei_running()) return false;
    const std::string qilei_line = qilei_command + "\n"; // qilei_line 是补全换行符后的协议命令。
    DWORD qilei_written = 0; // qilei_written 是实际写入管道的字节数。
    if (!WriteFile(qilei_input_write, qilei_line.data(), static_cast<DWORD>(qilei_line.size()), &qilei_written, nullptr))
    {
        qilei_last_error = L"向机器人发送命令失败。";
        return false;
    }
    return qilei_written == qilei_line.size();
}

bool qilei_engine_process::qilei_wait_for(const std::string& qilei_marker, unsigned long long qilei_timeout_ms, std::string& qilei_output)
{
    const unsigned long long qilei_deadline = GetTickCount64() + qilei_timeout_ms; // qilei_deadline 是本次等待的超时时刻。
    while (qilei_running() && GetTickCount64() <= qilei_deadline)
    {
        DWORD qilei_available = 0; // qilei_available 是当前可从管道读取的字节数。
        if (PeekNamedPipe(qilei_output_read, nullptr, 0, nullptr, &qilei_available, nullptr) && qilei_available > 0)
        {
            char qilei_buffer[4096]; // qilei_buffer 是单次读取引擎输出的字节缓冲区。
            DWORD qilei_read = 0; // qilei_read 是本次实际读取的字节数。
            const DWORD qilei_count = std::min<DWORD>(qilei_available, sizeof(qilei_buffer)); // qilei_count 是本次计划读取的字节数。
            if (ReadFile(qilei_output_read, qilei_buffer, qilei_count, &qilei_read, nullptr) && qilei_read > 0)
            {
                qilei_pending_output.append(qilei_buffer, qilei_read);
            }
        }
        const std::size_t qilei_position = qilei_pending_output.find(qilei_marker); // qilei_position 是目标标记在缓冲区中的位置。
        if (qilei_position != std::string::npos)
        {
            const std::size_t qilei_end = qilei_position + qilei_marker.size(); // qilei_end 是本次消费输出的末尾位置。
            qilei_output = qilei_pending_output.substr(0, qilei_end);
            qilei_pending_output.erase(0, qilei_end);
            return true;
        }
        Sleep(5);
    }
    qilei_output = qilei_pending_output;
    qilei_pending_output.clear();
    qilei_last_error = L"等待机器人输出超时。";
    return false;
}

void qilei_engine_process::qilei_stop(const std::string& qilei_quit_command)
{
    if (qilei_process_info.hProcess)
    {
        if (!qilei_quit_command.empty()) qilei_send(qilei_quit_command);
        if (WaitForSingleObject(qilei_process_info.hProcess, 500) == WAIT_TIMEOUT)
        {
            TerminateProcess(qilei_process_info.hProcess, 0);
            WaitForSingleObject(qilei_process_info.hProcess, 200);
        }
    }
    if (qilei_input_write) CloseHandle(qilei_input_write);
    if (qilei_output_read) CloseHandle(qilei_output_read);
    if (qilei_process_info.hThread) CloseHandle(qilei_process_info.hThread);
    if (qilei_process_info.hProcess) CloseHandle(qilei_process_info.hProcess);
    qilei_input_write = nullptr;
    qilei_output_read = nullptr;
    qilei_process_info = {};
    qilei_pending_output.clear();
}

bool qilei_engine_process::qilei_running() const
{
    return qilei_process_info.hProcess != nullptr && WaitForSingleObject(qilei_process_info.hProcess, 0) == WAIT_TIMEOUT;
}

const std::wstring& qilei_engine_process::qilei_error() const
{
    return qilei_last_error;
}

bool qilei_choose_setting(const std::wstring& qilei_title, const std::wstring& qilei_first_name,
                          const std::wstring& qilei_second_name, qilei_game_setting& qilei_setting)
{
    const std::array<int, 3> qilei_step_values = { 30, 60, 90 }; // qilei_step_values 是可选步时秒数。
    const std::array<int, 4> qilei_total_values = { 300, 600, 900, 1200 }; // qilei_total_values 是可选总时秒数。
    const std::array<std::wstring, 4> qilei_mode_names = {
        L"双方玩家", qilei_first_name + L"机器人", qilei_second_name + L"机器人", L"双方机器人"
    }; // qilei_mode_names 是四种人机对局模式文字。
    const std::array<std::wstring, 3> qilei_level_names = { L"入门", L"进阶", L"大师" }; // qilei_level_names 是三档机器人难度名称。
    int qilei_step_index = qilei_setting.qilei_step_seconds == 30 ? 0 : (qilei_setting.qilei_step_seconds == 90 ? 2 : 1); // qilei_step_index 是当前步时选项下标。
    int qilei_total_index = qilei_setting.qilei_total_seconds / 300 - 1; // qilei_total_index 是当前总时选项下标。
    qilei_total_index = std::clamp(qilei_total_index, 0, 3);
    int qilei_focus = 0; // qilei_focus 是键盘当前操作的设置行。
    bool qilei_accept = false; // qilei_accept 表示玩家是否确认开始游戏。
    bool qilei_running = true; // qilei_running 表示设置页消息循环是否继续。

    initgraph(900, 720);
    SetWindowTextW(GetHWnd(), qilei_title.c_str());
    BeginBatchDraw();
    while (qilei_running)
    {
        setbkcolor(RGB(244, 241, 233));
        cleardevice();
        setfillcolor(RGB(35, 51, 65));
        solidrectangle(0, 0, 900, 132);
        setbkmode(TRANSPARENT);
        settextcolor(WHITE);
        settextstyle(34, 0, L"Microsoft YaHei");
        RECT qilei_title_rect = { 0, 24, 900, 78 }; // qilei_title_rect 是设置页标题区域。
        drawtext((qilei_title + L" · 对局设置").c_str(), &qilei_title_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        settextcolor(RGB(202, 214, 223));
        settextstyle(16, 0, L"Microsoft YaHei");
        RECT qilei_help_rect = { 0, 80, 900, 112 }; // qilei_help_rect 是设置页键盘操作提示区域。
        drawtext(L"方向键调整 · 鼠标可点击 · Enter 开始 · Esc 返回主界面", &qilei_help_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

        const std::array<std::wstring, 4> qilei_labels = { L"每步时长", L"单方总时长", L"对战模式", L"机器人难度" }; // qilei_labels 是四行设置标题。
        for (int qilei_row = 0; qilei_row < 4; ++qilei_row) // qilei_row 是当前绘制的设置行。
        {
            const int qilei_top = 168 + qilei_row * 112; // qilei_top 是当前设置行的上边界。
            settextcolor(qilei_focus == qilei_row ? RGB(190, 63, 54) : RGB(65, 70, 71));
            settextstyle(19, 0, L"Microsoft YaHei");
            outtextxy(72, qilei_top + 11, qilei_labels[qilei_row].c_str());
            const int qilei_count = qilei_row == 0 || qilei_row == 3 ? 3 : 4; // qilei_count 是本行选项数量。
            for (int qilei_col = 0; qilei_col < qilei_count; ++qilei_col) // qilei_col 是当前绘制的选项列。
            {
                std::wstring qilei_text; // qilei_text 是本选项显示文字。
                bool qilei_selected = false; // qilei_selected 表示本选项是否已选中。
                if (qilei_row == 0) { qilei_text = std::to_wstring(qilei_step_values[qilei_col]) + L"秒"; qilei_selected = qilei_step_index == qilei_col; }
                else if (qilei_row == 1) { qilei_text = std::to_wstring(qilei_total_values[qilei_col] / 60) + L"分钟"; qilei_selected = qilei_total_index == qilei_col; }
                else if (qilei_row == 2) { qilei_text = qilei_mode_names[qilei_col]; qilei_selected = qilei_setting.qilei_robot_mode == qilei_col; }
                else { qilei_text = qilei_level_names[qilei_col]; qilei_selected = qilei_setting.qilei_robot_level == qilei_col; }
                qilei_draw_setting_button(254 + qilei_col * 146, qilei_top, 130, qilei_text, qilei_selected, qilei_focus == qilei_row && qilei_selected);
            }
        }
        setfillcolor(RGB(73, 91, 102));
        setlinecolor(RGB(73, 91, 102));
        fillroundrect(180, 642, 410, 692, 12, 12);
        settextcolor(WHITE);
        settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT qilei_back_rect = { 180, 642, 410, 692 }; // qilei_back_rect 是返回六棋大厅按钮区域。
        drawtext(L"返回主界面", &qilei_back_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

        setfillcolor(RGB(190, 63, 54));
        setlinecolor(RGB(190, 63, 54));
        fillroundrect(490, 642, 720, 692, 12, 12);
        settextcolor(WHITE);
        settextstyle(20, 0, L"Microsoft YaHei", 0, 0, FW_BOLD, false, false, false);
        RECT qilei_start_rect = { 490, 642, 720, 692 }; // qilei_start_rect 是开始游戏按钮区域。
        drawtext(L"开始游戏", &qilei_start_rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
        FlushBatchDraw();

        ExMessage qilei_message = getmessage(EM_MOUSE | EM_KEY); // qilei_message 是设置页当前输入消息。
        if (qilei_message.message == WM_KEYDOWN)
        {
            if (qilei_message.vkcode == VK_UP) qilei_focus = (qilei_focus + 3) % 4;
            else if (qilei_message.vkcode == VK_DOWN) qilei_focus = (qilei_focus + 1) % 4;
            else if (qilei_message.vkcode == VK_LEFT || qilei_message.vkcode == VK_RIGHT)
            {
                const int qilei_delta = qilei_message.vkcode == VK_RIGHT ? 1 : -1; // qilei_delta 是选项下标的增减方向。
                if (qilei_focus == 0) qilei_step_index = (qilei_step_index + qilei_delta + 3) % 3;
                else if (qilei_focus == 1) qilei_total_index = (qilei_total_index + qilei_delta + 4) % 4;
                else if (qilei_focus == 2) qilei_setting.qilei_robot_mode = (qilei_setting.qilei_robot_mode + qilei_delta + 4) % 4;
                else qilei_setting.qilei_robot_level = (qilei_setting.qilei_robot_level + qilei_delta + 3) % 3;
            }
            else if (qilei_message.vkcode == VK_RETURN) { qilei_accept = true; qilei_running = false; }
            else if (qilei_message.vkcode == VK_ESCAPE) qilei_running = false;
        }
        else if (qilei_message.message == WM_LBUTTONDOWN)
        {
            if (qilei_message.x >= 180 && qilei_message.x <= 410 && qilei_message.y >= 642 && qilei_message.y <= 692)
            {
                qilei_running = false;
            }
            else if (qilei_message.x >= 490 && qilei_message.x <= 720 && qilei_message.y >= 642 && qilei_message.y <= 692)
            {
                qilei_accept = true;
                qilei_running = false;
            }
            for (int qilei_row = 0; qilei_row < 4; ++qilei_row) // qilei_row 是鼠标命中检测的设置行。
            {
                const int qilei_top = 168 + qilei_row * 112; // qilei_top 是命中检测行的上边界。
                const int qilei_count = qilei_row == 0 || qilei_row == 3 ? 3 : 4; // qilei_count 是命中检测行的选项数。
                if (qilei_message.y >= qilei_top && qilei_message.y <= qilei_top + 44)
                {
                    for (int qilei_col = 0; qilei_col < qilei_count; ++qilei_col) // qilei_col 是命中检测的选项列。
                    {
                        const int qilei_left = 254 + qilei_col * 146; // qilei_left 是当前选项左边界。
                        if (qilei_message.x >= qilei_left && qilei_message.x <= qilei_left + 130)
                        {
                            qilei_focus = qilei_row;
                            if (qilei_row == 0) qilei_step_index = qilei_col;
                            else if (qilei_row == 1) qilei_total_index = qilei_col;
                            else if (qilei_row == 2) qilei_setting.qilei_robot_mode = qilei_col;
                            else qilei_setting.qilei_robot_level = qilei_col;
                        }
                    }
                }
            }
        }
    }
    EndBatchDraw();
    closegraph();
    qilei_setting.qilei_step_seconds = qilei_step_values[qilei_step_index];
    qilei_setting.qilei_total_seconds = qilei_total_values[qilei_total_index];
    return qilei_accept;
}

std::filesystem::path qilei_project_root()
{
    std::array<std::filesystem::path, 2> qilei_starts{}; // qilei_starts 保存当前目录与可执行文件目录两个搜索起点。
    qilei_starts[0] = std::filesystem::current_path();
    wchar_t qilei_module[MAX_PATH]{}; // qilei_module 保存当前可执行文件路径。
    GetModuleFileNameW(nullptr, qilei_module, MAX_PATH);
    qilei_starts[1] = std::filesystem::path(qilei_module).parent_path();
    for (std::filesystem::path qilei_start : qilei_starts) // qilei_start 是当前使用的搜索起点。
    {
        for (int qilei_level = 0; qilei_level < 8 && !qilei_start.empty(); ++qilei_level) // qilei_level 是向上搜索的目录层数。
        {
            if (std::filesystem::exists(qilei_start / L"chessgame.vcxproj")) return qilei_start;
            const std::filesystem::path qilei_parent = qilei_start.parent_path(); // qilei_parent 是当前目录的父目录。
            if (qilei_parent == qilei_start) break;
            qilei_start = qilei_parent;
        }
    }
    return std::filesystem::current_path();
}

std::filesystem::path qilei_engine_path(const std::wstring& qilei_game_folder, const std::wstring& qilei_file_name)
{
    return qilei_project_root() / L"engines" / qilei_game_folder / qilei_file_name;
}

bool qilei_side_is_robot(const qilei_game_setting& qilei_setting, int qilei_side)
{
    if (qilei_setting.qilei_robot_mode == 3) return true;
    if (qilei_setting.qilei_robot_mode == 1) return qilei_side == 0;
    if (qilei_setting.qilei_robot_mode == 2) return qilei_side == 1;
    return false;
}

int qilei_robot_think_ms(const qilei_game_setting& qilei_setting, int qilei_maximum_ms)
{
    const std::array<int, 3> qilei_level_times = { 350, 1100, qilei_maximum_ms }; // qilei_level_times 是入门、进阶、大师三档目标思考时间。
    const int qilei_level = std::clamp(qilei_setting.qilei_robot_level, 0, 2); // qilei_level 是限制到有效范围的难度下标。
    const int qilei_step_budget = std::max(150, qilei_setting.qilei_step_seconds * 80); // qilei_step_budget 是步时允许的思考时间上限。
    return std::min({ qilei_level_times[qilei_level], qilei_step_budget, qilei_maximum_ms });
}
