"""qilei_config.py：本地棋类网站的固定路径、安全限制与棋类名称。"""

from pathlib import Path
import os
import sys


# QILEI_GAME_NAMES：网址中的棋类编号到中文名称的固定映射。
QILEI_GAME_NAMES = {
    "xiangqi": "中国象棋",
    "chess": "国际象棋",
    "go": "围棋",
    "gomoku": "五子棋",
    "ludo": "飞行棋",
    "checkers": "跳棋",
}
# QILEI_ADMIN_USERNAME：内置管理员纯数字用户名。
QILEI_ADMIN_USERNAME = "000000"
# QILEI_ADMIN_PASSWORD：内置管理员首次校验使用的纯数字密码。
QILEI_ADMIN_PASSWORD = "000000"
# QILEI_SESSION_COOKIE：浏览器保存随机登录令牌的 HttpOnly Cookie 名称。
QILEI_SESSION_COOKIE = "chessgame_session"
# QILEI_SESSION_SECONDS：登录会话无操作前的最长有效秒数。
QILEI_SESSION_SECONDS = 12 * 60 * 60
# QILEI_MAX_JSON_BYTES：单次棋局状态请求允许的最大字节数。
QILEI_MAX_JSON_BYTES = 1024 * 1024


def qilei_website_root() -> Path:
    """返回 website 根目录，同时兼容源码运行和 exe 文件夹中的打包程序。"""
    # qilei_configured：测试或高级用户显式指定的网站根目录。
    qilei_configured = os.environ.get("CHESSGAME_WEB_ROOT")
    if qilei_configured:
        return Path(qilei_configured).expanduser().resolve()
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent.parent
    return Path(__file__).resolve().parents[2]


# QILEI_ROOT_DIR：website 根目录绝对路径。
QILEI_ROOT_DIR = qilei_website_root()
# QILEI_FRONTEND_DIR：HTML、CSS 与 JavaScript 前端目录。
QILEI_FRONTEND_DIR = QILEI_ROOT_DIR / "daima" / "frontend"
# QILEI_DATA_DIR：全部账号与用户数据根目录。
QILEI_DATA_DIR = QILEI_ROOT_DIR / "data"
# QILEI_USERS_DIR：玩家目录直接位于 data 下，因此此路径与 data 根目录一致。
QILEI_USERS_DIR = QILEI_DATA_DIR
