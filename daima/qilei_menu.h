#pragma once

// qilei_menu 封装六种棋类的统一欢迎页与鼠标、键盘导航。
class qilei_menu
{
public:
    // qilei_choose 显示欢迎页并返回 1~6 的棋类编号，返回 0 表示退出。
    int qilei_choose();

private:
    // qilei_draw 绘制当前菜单，qilei_selected 是当前选中项的下标。
    void qilei_draw(int qilei_selected) const;

    // qilei_hit_test 把鼠标坐标转换为菜单下标，未命中时返回 -1。
    int qilei_hit_test(int qilei_x, int qilei_y) const;
};
