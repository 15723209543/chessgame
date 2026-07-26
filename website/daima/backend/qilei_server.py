"""qilei_server.py：棋类游戏本地网站服务器和 EXE 双击启动入口。"""

from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import unquote, urlparse
import argparse
import json
import mimetypes
import os
import sys
import threading
import webbrowser


# QILEI_CURRENT_DIR：后端源码目录，打包分析和源码启动均从此处导入模块。
QILEI_CURRENT_DIR = Path(__file__).resolve().parent
if str(QILEI_CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(QILEI_CURRENT_DIR))

from qilei_auth import qilei_auth_service, qilei_session_store
from qilei_config import (
    QILEI_ADMIN_USERNAME,
    QILEI_DATA_DIR,
    QILEI_FRONTEND_DIR,
    QILEI_GAME_NAMES,
    QILEI_MAX_JSON_BYTES,
    QILEI_SESSION_COOKIE,
    QILEI_SESSION_SECONDS,
    QILEI_USERS_DIR,
)
from qilei_storage import qilei_json_storage
from qilei_engine import QILEI_ENGINE_SERVICE


class qilei_application:
    """组合认证、会话和用户文件数据服务。"""

    def __init__(self) -> None:
        # qilei_storage：账号、历史和棋局状态的本地 JSON 仓库。
        self.qilei_storage = qilei_json_storage(QILEI_DATA_DIR, QILEI_USERS_DIR)
        # qilei_auth：纯数字账号注册和登录服务。
        self.qilei_auth = qilei_auth_service(self.qilei_storage)
        # qilei_sessions：当前服务器进程的随机登录会话仓库。
        self.qilei_sessions = qilei_session_store()


# QILEI_APP：所有请求线程共享的网站服务对象。
QILEI_APP = qilei_application()


class qilei_handler(SimpleHTTPRequestHandler):
    """提供静态网页和同源 JSON API；do_GET 等名称由 Python HTTP 框架规定。"""

    # server_version：HTTP 响应使用的本地网站服务标识，名称由框架规定。
    server_version = "ChessgameLocal/1.0"

    def log_message(self, qilei_format_text: str, *qilei_args: Any) -> None:
        """按 Python HTTP 框架规定的方法名输出简洁中文访问日志。"""
        sys.stdout.write("[网站] " + (qilei_format_text % qilei_args) + "\n")

    def qilei_json_response(self, qilei_value: Dict[str, Any], qilei_status: int = 200,
                             qilei_cookie: Optional[str] = None) -> None:
        """返回 UTF-8 JSON，并设置禁止缓存和类型嗅探响应头。"""
        # qilei_body：序列化后的 UTF-8 JSON 响应体。
        qilei_body = json.dumps(qilei_value, ensure_ascii=False).encode("utf-8")
        self.send_response(qilei_status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(qilei_body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if qilei_cookie:
            self.send_header("Set-Cookie", qilei_cookie)
        self.end_headers()
        self.wfile.write(qilei_body)

    def qilei_read_json(self) -> Dict[str, Any]:
        """在大小限制内读取并验证请求 JSON 对象。"""
        try:
            # qilei_length：请求头声明的 JSON 字节长度。
            qilei_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as qilei_error:
            raise ValueError("请求长度无效。") from qilei_error
        if qilei_length <= 0 or qilei_length > QILEI_MAX_JSON_BYTES:
            raise ValueError("请求内容为空或过大。")
        try:
            # qilei_value：请求体解析后的 JSON 值。
            qilei_value = json.loads(self.rfile.read(qilei_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as qilei_error:
            raise ValueError("请求不是有效的 JSON。") from qilei_error
        if not isinstance(qilei_value, dict):
            raise ValueError("请求格式不正确。")
        return qilei_value

    def qilei_cookie_token(self) -> Optional[str]:
        """从请求 Cookie 中读取随机会话令牌。"""
        # qilei_cookie：解析浏览器 Cookie 请求头的对象。
        qilei_cookie = SimpleCookie()
        qilei_cookie.load(self.headers.get("Cookie", ""))
        # qilei_morsel：会话 Cookie 的单项对象。
        qilei_morsel = qilei_cookie.get(QILEI_SESSION_COOKIE)
        return qilei_morsel.value if qilei_morsel else None

    def qilei_current_user(self) -> Optional[Dict[str, Any]]:
        """返回当前会话公开用户信息；未登录返回 None。"""
        return QILEI_APP.qilei_sessions.qilei_get(self.qilei_cookie_token())

    def qilei_require_user(self) -> Optional[Dict[str, Any]]:
        """要求请求已登录，失败时直接发送 401 JSON。"""
        # qilei_user：当前会话公开用户信息。
        qilei_user = self.qilei_current_user()
        if not qilei_user:
            self.qilei_json_response({"ok": False, "message": "请先登录。"}, HTTPStatus.UNAUTHORIZED)
        return qilei_user

    def qilei_require_admin(self) -> Optional[Dict[str, Any]]:
        """要求请求来自管理员，失败时直接发送相应 JSON。"""
        # qilei_user：当前登录用户的公开会话信息。
        qilei_user = self.qilei_require_user()
        if qilei_user and not qilei_user.get("is_admin"):
            self.qilei_json_response(
                {"ok": False, "message": "需要管理员权限。"},
                HTTPStatus.FORBIDDEN,
            )
            return None
        return qilei_user

    def qilei_route_parts(self) -> list:
        """把请求路径拆分为已经 URL 解码的非空片段。"""
        return [unquote(qilei_item) for qilei_item in urlparse(self.path).path.split("/") if qilei_item]

    def do_GET(self) -> None:
        """处理会话、历史、管理员、存档读取和静态文件；名称由 HTTP 框架规定。"""
        # qilei_path：不含查询参数的请求路径。
        qilei_path = urlparse(self.path).path
        # qilei_parts：用于匹配动态棋类接口的路径片段。
        qilei_parts = self.qilei_route_parts()
        if qilei_path == "/api/session":
            # qilei_user：可能为空的当前登录用户。
            qilei_user = self.qilei_current_user()
            self.qilei_json_response({"ok": True, "user": qilei_user})
            return
        if qilei_path == "/api/history":
            qilei_user = self.qilei_require_user()
            if qilei_user:
                # qilei_history：按写入顺序保存的用户历史记录。
                qilei_history = QILEI_APP.qilei_storage.qilei_load_history(qilei_user["username"])
                self.qilei_json_response({"ok": True, "history": list(reversed(qilei_history))})
            return
        if qilei_path == "/api/admin/users":
            qilei_user = self.qilei_require_user()
            if qilei_user and qilei_user["is_admin"]:
                self.qilei_json_response({"ok": True, "users": QILEI_APP.qilei_storage.qilei_admin_users()})
            elif qilei_user:
                self.qilei_json_response({"ok": False, "message": "需要管理员权限。"}, HTTPStatus.FORBIDDEN)
            return
        if len(qilei_parts) == 4 and qilei_parts[:2] == ["api", "games"] and qilei_parts[3] == "state":
            qilei_user = self.qilei_require_user()
            # qilei_game_id：网址指定的棋类编号。
            qilei_game_id = qilei_parts[2]
            if qilei_user and qilei_game_id in QILEI_GAME_NAMES:
                # qilei_value：该用户指定棋类的最新存档。
                qilei_value = QILEI_APP.qilei_storage.qilei_load_state(qilei_user["username"], qilei_game_id)
                self.qilei_json_response({"ok": True, "saved": qilei_value})
            elif qilei_user:
                self.qilei_json_response({"ok": False, "message": "未知棋类。"}, HTTPStatus.NOT_FOUND)
            return
        if qilei_path.startswith("/api/"):
            self.qilei_json_response({"ok": False, "message": "接口不存在。"}, HTTPStatus.NOT_FOUND)
            return
        self.qilei_serve_static(qilei_path)

    def do_POST(self) -> None:
        """处理注册、登录、退出、打开游戏和写入终局；名称由 HTTP 框架规定。"""
        # qilei_path：不含查询参数的请求路径。
        qilei_path = urlparse(self.path).path
        # qilei_parts：用于匹配动态棋类接口的路径片段。
        qilei_parts = self.qilei_route_parts()
        try:
            if qilei_path == "/api/register":
                # qilei_body：注册请求 JSON。
                qilei_body = self.qilei_read_json()
                # qilei_user：注册成功后的公开用户信息。
                qilei_user = QILEI_APP.qilei_auth.qilei_register(qilei_body.get("username"), qilei_body.get("password"))
                # qilei_token：为新用户生成的随机会话令牌。
                qilei_token = QILEI_APP.qilei_sessions.qilei_create(qilei_user)
                # qilei_cookie：写入浏览器的安全会话 Cookie。
                qilei_cookie = self.qilei_session_cookie(qilei_token)
                self.qilei_json_response({"ok": True, "user": qilei_user, "message": "注册成功。"}, qilei_cookie=qilei_cookie)
                return
            if qilei_path == "/api/login":
                qilei_body = self.qilei_read_json()
                qilei_user = QILEI_APP.qilei_auth.qilei_login(qilei_body.get("username"), qilei_body.get("password"))
                qilei_token = QILEI_APP.qilei_sessions.qilei_create(qilei_user)
                qilei_cookie = self.qilei_session_cookie(qilei_token)
                self.qilei_json_response({"ok": True, "user": qilei_user, "message": "登录成功。"}, qilei_cookie=qilei_cookie)
                return
            if qilei_path == "/api/logout":
                QILEI_APP.qilei_sessions.qilei_delete(self.qilei_cookie_token())
                self.qilei_json_response({"ok": True}, qilei_cookie=self.qilei_clear_session_cookie())
                return
            if qilei_path == "/api/account/password":
                # qilei_user：正在修改自己密码的当前登录用户。
                qilei_user = self.qilei_require_user()
                if not qilei_user:
                    return
                # qilei_body：当前密码和新密码组成的请求对象。
                qilei_body = self.qilei_read_json()
                QILEI_APP.qilei_auth.qilei_change_password(
                    qilei_user["username"],
                    qilei_body.get("current_password"),
                    qilei_body.get("new_password"),
                )
                self.qilei_json_response({"ok": True, "message": "密码修改成功。"})
                return
            if qilei_path == "/api/admin/users":
                # qilei_admin：新增账号操作要求的当前管理员。
                qilei_admin = self.qilei_require_admin()
                if not qilei_admin:
                    return
                # qilei_body：管理员填写的新增账号用户名和初始密码。
                qilei_body = self.qilei_read_json()
                # qilei_created_user：认证服务创建的普通用户公开信息。
                qilei_created_user = QILEI_APP.qilei_auth.qilei_register(
                    qilei_body.get("username"),
                    qilei_body.get("password"),
                )
                self.qilei_json_response({
                    "ok": True,
                    "user": qilei_created_user,
                    "message": "用户新增成功。",
                })
                return
            if qilei_path.startswith("/api/games/") and qilei_path.endswith("/engine-move") and len(qilei_parts) == 4:
                qilei_user = self.qilei_require_user()
                # qilei_game_id：本次需要外部 engine 决策的棋类编号。
                qilei_game_id = qilei_parts[2]
                if not qilei_user:
                    return
                if qilei_game_id not in ("xiangqi", "chess", "go", "gomoku"):
                    self.qilei_json_response({"ok": False, "message": "该棋类使用内置机器人。"}, HTTPStatus.BAD_REQUEST)
                    return
                # qilei_body：当前完整棋盘和机器人难度。
                qilei_body = self.qilei_read_json()
                # qilei_position：传给对应 engine 的当前局面。
                qilei_position = qilei_body.get("position")
                if not isinstance(qilei_position, dict):
                    raise ValueError("engine 局面格式不正确。")
                # qilei_move：外部 engine 返回的网页坐标。
                qilei_move = QILEI_ENGINE_SERVICE.qilei_move(
                    qilei_game_id,
                    qilei_position,
                    int(qilei_body.get("level", 2)),
                )
                self.qilei_json_response({"ok": True, "move": qilei_move, "source": "engine" if qilei_move else "fallback"})
                return
            if len(qilei_parts) == 4 and qilei_parts[:2] == ["api", "games"] and qilei_parts[3] == "start":
                qilei_user = self.qilei_require_user()
                qilei_game_id = qilei_parts[2]
                if not qilei_user:
                    return
                if qilei_game_id not in QILEI_GAME_NAMES:
                    self.qilei_json_response({"ok": False, "message": "未知棋类。"}, HTTPStatus.NOT_FOUND)
                    return
                # qilei_body：包含新游戏或读取存档模式的请求。
                qilei_body = self.qilei_read_json()
                # qilei_mode：本次进入方式，只允许 new 或 load。
                qilei_mode = str(qilei_body.get("mode", "new"))
                if qilei_mode not in ("new", "load"):
                    raise ValueError("进入方式不正确。")
                # qilei_saved：读取模式使用的最近一份未结束单局存档。
                qilei_saved = QILEI_APP.qilei_storage.qilei_load_state(qilei_user["username"], qilei_game_id) if qilei_mode == "load" else None
                if qilei_mode == "load" and not qilei_saved:
                    self.qilei_json_response({"ok": False, "message": "没有可读取的上一次存档。"}, HTTPStatus.NOT_FOUND)
                    return
                # qilei_record：新游戏创建独立单局文件，读取模式继续原单局文件。
                qilei_record = (
                    qilei_saved["record"]
                    if qilei_saved
                    else QILEI_APP.qilei_storage.qilei_start_game(
                        qilei_user["username"],
                        qilei_game_id,
                        QILEI_GAME_NAMES[qilei_game_id],
                    )
                )
                self.qilei_json_response({"ok": True, "record": qilei_record, "saved": qilei_saved})
                return
            if len(qilei_parts) == 4 and qilei_parts[:2] == ["api", "games"] and qilei_parts[3] == "finish":
                qilei_user = self.qilei_require_user()
                if not qilei_user:
                    return
                qilei_body = self.qilei_read_json()
                # qilei_result：限制为字符串的对局结果文字。
                qilei_result = str(qilei_body.get("result", "对局结束"))
                # qilei_updated：是否找到本次打开记录并成功写入结果。
                qilei_updated = QILEI_APP.qilei_storage.qilei_finish_game(qilei_user["username"], str(qilei_body.get("record_id", "")), qilei_result)
                self.qilei_json_response({"ok": qilei_updated})
                return
        except ValueError as qilei_error:
            self.qilei_json_response({"ok": False, "message": str(qilei_error)}, HTTPStatus.BAD_REQUEST)
            return
        self.qilei_json_response({"ok": False, "message": "接口不存在。"}, HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:
        """处理管理员改密和棋局状态原子保存；名称由 HTTP 框架规定。"""
        # qilei_parts：用于匹配动态存档接口的路径片段。
        qilei_parts = self.qilei_route_parts()
        if len(qilei_parts) == 5 and qilei_parts[:3] == ["api", "admin", "users"] and qilei_parts[4] == "password":
            # qilei_admin：修改其他用户密码所要求的管理员。
            qilei_admin = self.qilei_require_admin()
            if not qilei_admin:
                return
            try:
                # qilei_username：网址中指定的目标用户名。
                qilei_username = qilei_parts[3]
                # qilei_body：管理员填写的新密码请求。
                qilei_body = self.qilei_read_json()
                QILEI_APP.qilei_auth.qilei_admin_change_password(
                    qilei_username,
                    qilei_body.get("password"),
                )
                if qilei_username != qilei_admin["username"]:
                    QILEI_APP.qilei_sessions.qilei_delete_username(qilei_username)
                self.qilei_json_response({"ok": True, "message": "用户密码修改成功。"})
            except ValueError as qilei_error:
                self.qilei_json_response(
                    {"ok": False, "message": str(qilei_error)},
                    HTTPStatus.BAD_REQUEST,
                )
            return
        if len(qilei_parts) == 4 and qilei_parts[:2] == ["api", "games"] and qilei_parts[3] == "state":
            # qilei_user：必须存在的当前登录用户。
            qilei_user = self.qilei_require_user()
            # qilei_game_id：网址指定的棋类编号。
            qilei_game_id = qilei_parts[2]
            if not qilei_user:
                return
            if qilei_game_id not in QILEI_GAME_NAMES:
                self.qilei_json_response({"ok": False, "message": "未知棋类。"}, HTTPStatus.NOT_FOUND)
                return
            try:
                # qilei_body：棋局状态包装请求。
                qilei_body = self.qilei_read_json()
                # qilei_state：游戏模块提供的可序列化状态对象。
                qilei_state = qilei_body.get("state")
                # qilei_record_id：状态所属的独立单局文件编号。
                qilei_record_id = str(qilei_body.get("record_id", ""))
                if not isinstance(qilei_state, dict):
                    raise ValueError("存档格式不正确。")
                if not qilei_record_id:
                    raise ValueError("缺少单局记录编号。")
                # qilei_saved：是否成功写回当前单局文件。
                qilei_saved = QILEI_APP.qilei_storage.qilei_save_state(
                    qilei_user["username"],
                    qilei_game_id,
                    qilei_record_id,
                    qilei_state,
                )
                if qilei_saved:
                    self.qilei_json_response({"ok": True})
                else:
                    self.qilei_json_response({"ok": False, "message": "单局文件不存在。"}, HTTPStatus.NOT_FOUND)
            except ValueError as qilei_error:
                self.qilei_json_response({"ok": False, "message": str(qilei_error)}, HTTPStatus.BAD_REQUEST)
            return
        self.qilei_json_response({"ok": False, "message": "接口不存在。"}, HTTPStatus.NOT_FOUND)

    def do_DELETE(self) -> None:
        """处理用户、历史记录和单种棋存档删除；名称由 HTTP 框架规定。"""
        # qilei_parts：用于匹配动态存档接口的路径片段。
        qilei_parts = self.qilei_route_parts()
        if len(qilei_parts) == 4 and qilei_parts[:3] == ["api", "admin", "users"]:
            # qilei_admin：删除用户操作要求的当前管理员。
            qilei_admin = self.qilei_require_admin()
            if not qilei_admin:
                return
            try:
                # qilei_username：网址中指定的待删除普通用户名。
                qilei_username = qilei_parts[3]
                if qilei_username == QILEI_ADMIN_USERNAME:
                    raise ValueError("内置管理员不能删除。")
                QILEI_APP.qilei_auth.qilei_admin_delete_user(qilei_username)
                QILEI_APP.qilei_sessions.qilei_delete_username(qilei_username)
                self.qilei_json_response({"ok": True, "message": "用户及其全部数据已删除。"})
            except ValueError as qilei_error:
                self.qilei_json_response(
                    {"ok": False, "message": str(qilei_error)},
                    HTTPStatus.BAD_REQUEST,
                )
            return
        if qilei_parts == ["api", "history"]:
            # qilei_user：必须存在的当前登录用户。
            qilei_user = self.qilei_require_user()
            if qilei_user:
                # qilei_deleted_count：从用户 result 文件夹删除的独立单局文件数量。
                qilei_deleted_count = QILEI_APP.qilei_storage.qilei_clear_history(
                    qilei_user["username"]
                )
                self.qilei_json_response({
                    "ok": True,
                    "deleted_count": qilei_deleted_count,
                })
            return
        if len(qilei_parts) == 3 and qilei_parts[:2] == ["api", "history"]:
            # qilei_user：必须存在的当前登录用户。
            qilei_user = self.qilei_require_user()
            if qilei_user:
                # qilei_record_id：网址指定的历史记录唯一编号。
                qilei_record_id = qilei_parts[2]
                # qilei_deleted：目标记录是否存在并已从 result 文件夹删除。
                qilei_deleted = QILEI_APP.qilei_storage.qilei_delete_history_record(
                    qilei_user["username"],
                    qilei_record_id,
                )
                if qilei_deleted:
                    self.qilei_json_response({"ok": True})
                else:
                    self.qilei_json_response(
                        {"ok": False, "message": "历史记录不存在。"},
                        HTTPStatus.NOT_FOUND,
                    )
            return
        if len(qilei_parts) in (4, 5) and qilei_parts[:2] == ["api", "games"] and qilei_parts[3] == "state":
            # qilei_user：必须存在的当前登录用户。
            qilei_user = self.qilei_require_user()
            # qilei_game_id：网址指定的棋类编号。
            qilei_game_id = qilei_parts[2]
            if qilei_user and qilei_game_id in QILEI_GAME_NAMES:
                # qilei_record_id：可选的当前单局编号，避免清空其他局的状态。
                qilei_record_id = qilei_parts[4] if len(qilei_parts) == 5 else ""
                # qilei_deleted：是否找到并清空了目标单局状态。
                qilei_deleted = QILEI_APP.qilei_storage.qilei_delete_state(
                    qilei_user["username"],
                    qilei_game_id,
                    qilei_record_id,
                )
                self.qilei_json_response({"ok": True, "cleared": qilei_deleted})
            elif qilei_user:
                self.qilei_json_response({"ok": False, "message": "未知棋类。"}, HTTPStatus.NOT_FOUND)
            return
        self.qilei_json_response({"ok": False, "message": "接口不存在。"}, HTTPStatus.NOT_FOUND)

    def qilei_session_cookie(self, qilei_token: str) -> str:
        """生成 HttpOnly、同源严格模式且有限期的登录 Cookie。"""
        return (QILEI_SESSION_COOKIE + "=" + qilei_token + "; Path=/; HttpOnly; SameSite=Strict; "
                + "Max-Age=" + str(QILEI_SESSION_SECONDS))

    def qilei_clear_session_cookie(self) -> str:
        """生成立即过期的会话 Cookie。"""
        return QILEI_SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"

    def qilei_serve_static(self, qilei_request_path: str) -> None:
        """在前端目录边界内返回静态文件，其他页面路径回退到首页。"""
        # qilei_relative：去掉网址开头斜杠后的相对路径。
        qilei_relative = qilei_request_path.lstrip("/") or "index.html"
        # qilei_target：解析后的候选静态文件绝对路径。
        qilei_target = (QILEI_FRONTEND_DIR / qilei_relative).resolve()
        # qilei_frontend：前端目录规范绝对路径。
        qilei_frontend = QILEI_FRONTEND_DIR.resolve()
        try:
            # qilei_inside：目标路径是否仍在前端目录内，防止目录穿越。
            qilei_inside = os.path.commonpath([str(qilei_target), str(qilei_frontend)]) == str(qilei_frontend)
        except ValueError:
            qilei_inside = False
        if not qilei_inside or not qilei_target.is_file():
            qilei_target = qilei_frontend / "index.html"
        try:
            # qilei_body：静态文件原始字节内容。
            qilei_body = qilei_target.read_bytes()
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        # qilei_mime：根据文件扩展名判断的响应媒体类型。
        qilei_mime = mimetypes.guess_type(str(qilei_target))[0] or "application/octet-stream"
        if qilei_mime.startswith("text/") or qilei_mime in ("application/javascript", "application/json"):
            qilei_mime += "; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", qilei_mime)
        self.send_header("Content-Length", str(len(qilei_body)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'")
        self.end_headers()
        self.wfile.write(qilei_body)


def qilei_create_server(qilei_host: str, qilei_preferred_port: int) -> ThreadingHTTPServer:
    """从首选端口开始顺序寻找可用的本地端口。"""
    for qilei_port in range(qilei_preferred_port, qilei_preferred_port + 30):
        try:
            return ThreadingHTTPServer((qilei_host, qilei_port), qilei_handler)
        except OSError:
            continue
    raise RuntimeError("无法找到可用的本地端口。")


def qilei_main() -> int:
    """解析启动参数、显示具体网址、打开浏览器并持续提供本地服务。"""
    # qilei_parser：本地启动器命令行参数解析器。
    qilei_parser = argparse.ArgumentParser(description="棋类游戏本地网站")
    qilei_parser.add_argument("--host", default="127.0.0.1")
    qilei_parser.add_argument("--port", type=int, default=8765)
    qilei_parser.add_argument("--no-browser", action="store_true")
    # qilei_options：解析后的启动参数。
    qilei_options = qilei_parser.parse_args()
    if not QILEI_FRONTEND_DIR.is_dir():
        print("网站前端目录不存在：" + str(QILEI_FRONTEND_DIR))
        input("按回车键退出……")
        return 2
    # qilei_server：绑定本机可用端口的多线程 HTTP 服务。
    qilei_server = qilei_create_server(qilei_options.host, qilei_options.port)
    # qilei_host、qilei_port：服务器实际绑定的地址和端口。
    qilei_host, qilei_port = qilei_server.server_address[:2]
    # qilei_url：用户浏览器需要访问的完整本地网址。
    qilei_url = "http://{0}:{1}".format(qilei_host, qilei_port)
    print("=" * 54, flush=True)
    print("  棋类游戏网站已经启动", flush=True)
    print("  访问地址：" + qilei_url, flush=True)
    print("  关闭本窗口即可停止网站", flush=True)
    print("=" * 54, flush=True)
    if not qilei_options.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(qilei_url)).start()
    try:
        qilei_server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        qilei_server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(qilei_main())
