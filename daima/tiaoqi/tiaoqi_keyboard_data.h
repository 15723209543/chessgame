#pragma once

namespace tiaoqi
{

// 主键盘数字 0 的键值。
inline constexpr int keyboard_key_digit_0 = 0x30;

// 主键盘数字 9 的键值。
inline constexpr int keyboard_key_digit_9 = 0x39;

// 主键盘字母 A 的键值。
inline constexpr int keyboard_key_letter_a = 0x41;

// 主键盘字母 Z 的键值。
inline constexpr int keyboard_key_letter_z = 0x5a;

// 小键盘数字 0 的键值。
inline constexpr int keyboard_key_numpad_0 = 0x60;

// 小键盘数字 9 的键值。
inline constexpr int keyboard_key_numpad_9 = 0x69;

// ESC 键的键值。
inline constexpr int keyboard_key_escape = 0x1b;

// 回车键的键值。
inline constexpr int keyboard_key_enter = 0x0d;

// Delete 键的键值。
inline constexpr int keyboard_key_delete = 0x2e;

// Insert 键的键值，小键盘 NumLock 关闭时数字 0 会产生这个值。
inline constexpr int keyboard_key_insert = 0x2d;

// End 键的键值，小键盘 NumLock 关闭时数字 1 会产生这个值。
inline constexpr int keyboard_key_end = 0x23;

// PageDown 键的键值，小键盘 NumLock 关闭时数字 3 会产生这个值。
inline constexpr int keyboard_key_pagedown = 0x22;

// Left 键的键值，小键盘 NumLock 关闭时数字 4 会产生这个值。
inline constexpr int keyboard_key_left = 0x25;

// Clear 键的键值，小键盘 NumLock 关闭时数字 5 会产生这个值。
inline constexpr int keyboard_key_clear = 0x0c;

// Right 键的键值，小键盘 NumLock 关闭时数字 6 会产生这个值。
inline constexpr int keyboard_key_right = 0x27;

// Home 键的键值，小键盘 NumLock 关闭时数字 7 会产生这个值。
inline constexpr int keyboard_key_home = 0x24;

// Up 键的键值，小键盘 NumLock 关闭时数字 8 会产生这个值。
inline constexpr int keyboard_key_up = 0x26;

// Down 键的键值，小键盘 NumLock 关闭时数字 2 会产生这个值。
inline constexpr int keyboard_key_down = 0x28;

// PageUp 键的键值，小键盘 NumLock 关闭时数字 9 会产生这个值。
inline constexpr int keyboard_key_pageup = 0x21;

// 棋子编号最小值，按用户要求从 0 开始。
inline constexpr int keyboard_piece_min = 0;

// 棋子编号最大值，一个数字键最多直接选择到 9。
inline constexpr int keyboard_piece_max = 9;

// 落点返回编号，选择落点阶段按 0 返回上一步。
inline constexpr int keyboard_target_back = 0;

// 落点编号最小值，按用户要求从 1 开始。
inline constexpr int keyboard_target_min = 1;

// 落点数字编号数量，前九个落点使用 1 到 9。
inline constexpr int keyboard_target_digit_count = 9;

// 落点字母编号数量，第十个起依次使用 A 到 Z。
inline constexpr int keyboard_target_letter_count = 26;

// 落点编号最大值，支持 1 到 9 和 A 到 Z 共三十五个直接选择项。
inline constexpr int keyboard_target_max = keyboard_target_digit_count + keyboard_target_letter_count;


} // namespace tiaoqi
