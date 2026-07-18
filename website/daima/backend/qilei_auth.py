"""qilei_auth.py：纯数字账号认证、密码摘要与本地会话管理。"""

from threading import RLock
from typing import Any, Dict, Optional
import hashlib
import hmac
import re
import secrets
import time

from qilei_config import QILEI_ADMIN_PASSWORD, QILEI_ADMIN_USERNAME, QILEI_SESSION_SECONDS
from qilei_storage import qilei_json_storage, qilei_now_text


# QILEI_NUMBER_PATTERN：用户名和密码必须完整匹配的纯数字模式。
QILEI_NUMBER_PATTERN = re.compile(r"^[0-9]+$")


def qilei_password_record(qilei_password: str, qilei_salt_hex: Optional[str] = None) -> Dict[str, str]:
    """用 PBKDF2-HMAC-SHA256 生成密码记录，磁盘不保存明文密码。"""
    # qilei_salt：已有账号读取的盐或注册时新生成的随机盐。
    qilei_salt = bytes.fromhex(qilei_salt_hex) if qilei_salt_hex else secrets.token_bytes(16)
    # qilei_digest：二十四万轮 PBKDF2 生成的密码摘要。
    qilei_digest = hashlib.pbkdf2_hmac("sha256", qilei_password.encode("utf-8"), qilei_salt, 240000)
    return {"salt": qilei_salt.hex(), "password_hash": qilei_digest.hex()}


def qilei_valid_username(qilei_value: Any) -> bool:
    """判断用户名是否为一至十八位纯数字。"""
    return isinstance(qilei_value, str) and 1 <= len(qilei_value) <= 18 and bool(QILEI_NUMBER_PATTERN.fullmatch(qilei_value))


def qilei_valid_password(qilei_value: Any) -> bool:
    """判断密码是否为一至三十二位纯数字。"""
    return isinstance(qilei_value, str) and 1 <= len(qilei_value) <= 32 and bool(QILEI_NUMBER_PATTERN.fullmatch(qilei_value))


class qilei_auth_service:
    """处理用户注册、登录和内置管理员初始化。"""

    def __init__(self, qilei_storage: qilei_json_storage) -> None:
        # qilei_storage：认证服务使用的本地 JSON 仓库。
        self.qilei_storage = qilei_storage
        # qilei_lock：保护账号查重和写入的可重入锁。
        self.qilei_lock = RLock()
        self.qilei_ensure_admin()

    def qilei_ensure_admin(self) -> None:
        """保证管理员 000000 存在并拥有独立用户目录。"""
        with self.qilei_lock:
            # qilei_accounts：当前全部账号记录。
            qilei_accounts = self.qilei_storage.qilei_load_accounts()
            if QILEI_ADMIN_USERNAME not in qilei_accounts:
                # qilei_record：管理员的密码摘要和公开属性。
                qilei_record = qilei_password_record(QILEI_ADMIN_PASSWORD)
                qilei_record.update({"created_at": qilei_now_text(), "is_admin": True})
                qilei_accounts[QILEI_ADMIN_USERNAME] = qilei_record
                self.qilei_storage.qilei_save_accounts(qilei_accounts)
            self.qilei_storage.qilei_create_user_folder(QILEI_ADMIN_USERNAME, True)

    def qilei_register(self, qilei_username: Any, qilei_password: Any) -> Dict[str, Any]:
        """查重并注册纯数字账号，随后创建用户独立文件夹。"""
        if not qilei_valid_username(qilei_username):
            raise ValueError("用户名只能包含数字，长度为 1 至 18 位。")
        if not qilei_valid_password(qilei_password):
            raise ValueError("密码只能包含数字，长度为 1 至 32 位。")
        if qilei_username == QILEI_ADMIN_USERNAME:
            raise ValueError("该用户名已被系统保留。")
        with self.qilei_lock:
            # qilei_accounts：查重时读取的全部账号记录。
            qilei_accounts = self.qilei_storage.qilei_load_accounts()
            if qilei_username in qilei_accounts:
                raise ValueError("用户名已存在，请直接登录。")
            # qilei_record：新用户的密码摘要和公开属性。
            qilei_record = qilei_password_record(qilei_password)
            qilei_record.update({"created_at": qilei_now_text(), "is_admin": False})
            qilei_accounts[qilei_username] = qilei_record
            self.qilei_storage.qilei_save_accounts(qilei_accounts)
            self.qilei_storage.qilei_create_user_folder(qilei_username, False)
            return {"username": qilei_username, "is_admin": False}

    def qilei_login(self, qilei_username: Any, qilei_password: Any) -> Dict[str, Any]:
        """验证账号存在性和密码摘要并返回公开用户信息。"""
        if not qilei_valid_username(qilei_username) or not qilei_valid_password(qilei_password):
            raise ValueError("用户名和密码均只能输入数字。")
        # qilei_accounts：登录校验时读取的全部账号记录。
        qilei_accounts = self.qilei_storage.qilei_load_accounts()
        # qilei_account：用户名对应的账号摘要记录。
        qilei_account = qilei_accounts.get(qilei_username)
        if not qilei_account:
            raise ValueError("账号不存在，请先注册。")
        # qilei_expected：用输入密码和账号盐重新计算的摘要。
        qilei_expected = qilei_password_record(qilei_password, qilei_account.get("salt", ""))["password_hash"]
        if not hmac.compare_digest(qilei_expected, str(qilei_account.get("password_hash", ""))):
            raise ValueError("密码错误。")
        self.qilei_storage.qilei_create_user_folder(qilei_username, bool(qilei_account.get("is_admin")))
        return {"username": qilei_username, "is_admin": bool(qilei_account.get("is_admin"))}

    def qilei_change_password(self, qilei_username: str, qilei_current_password: Any,
                              qilei_new_password: Any) -> None:
        """验证当前密码后，为登录用户更新密码摘要。"""
        if not qilei_valid_password(qilei_current_password) or not qilei_valid_password(qilei_new_password):
            raise ValueError("当前密码和新密码均只能包含 1 至 32 位数字。")
        with self.qilei_lock:
            # qilei_accounts：修改密码时读取的全部独立账号记录。
            qilei_accounts = self.qilei_storage.qilei_load_accounts()
            # qilei_account：当前登录用户名对应的账号摘要。
            qilei_account = qilei_accounts.get(qilei_username)
            if not qilei_account:
                raise ValueError("账号不存在。")
            # qilei_expected：用输入的当前密码重新计算出的摘要。
            qilei_expected = qilei_password_record(
                qilei_current_password,
                str(qilei_account.get("salt", "")),
            )["password_hash"]
            if not hmac.compare_digest(qilei_expected, str(qilei_account.get("password_hash", ""))):
                raise ValueError("当前密码错误。")
            # qilei_new_record：新密码对应的随机盐和密码摘要。
            qilei_new_record = qilei_password_record(qilei_new_password)
            qilei_account.update(qilei_new_record)
            qilei_accounts[qilei_username] = qilei_account
            self.qilei_storage.qilei_save_accounts(qilei_accounts)

    def qilei_admin_change_password(self, qilei_username: Any, qilei_new_password: Any) -> None:
        """由管理员为指定用户重置密码摘要。"""
        if not qilei_valid_username(qilei_username):
            raise ValueError("用户名只能包含数字，长度为 1 至 18 位。")
        if not qilei_valid_password(qilei_new_password):
            raise ValueError("新密码只能包含数字，长度为 1 至 32 位。")
        with self.qilei_lock:
            # qilei_accounts：管理员重置密码时读取的全部账号。
            qilei_accounts = self.qilei_storage.qilei_load_accounts()
            # qilei_account：管理员选中的目标账号。
            qilei_account = qilei_accounts.get(qilei_username)
            if not qilei_account:
                raise ValueError("账号不存在。")
            qilei_account.update(qilei_password_record(qilei_new_password))
            qilei_accounts[qilei_username] = qilei_account
            self.qilei_storage.qilei_save_accounts(qilei_accounts)

    def qilei_admin_delete_user(self, qilei_username: Any) -> None:
        """由管理员删除普通用户及其独立账号和游戏数据文件夹。"""
        if not qilei_valid_username(qilei_username):
            raise ValueError("用户名格式不正确。")
        if qilei_username == QILEI_ADMIN_USERNAME:
            raise ValueError("内置管理员不能删除。")
        with self.qilei_lock:
            # qilei_accounts：删除前用于确认目标存在的全部账号。
            qilei_accounts = self.qilei_storage.qilei_load_accounts()
            if qilei_username not in qilei_accounts:
                raise ValueError("账号不存在。")
            if not self.qilei_storage.qilei_delete_user_folder(qilei_username):
                raise ValueError("用户数据删除失败。")


class qilei_session_store:
    """保存仅在当前服务器进程期间有效的随机登录令牌。"""

    def __init__(self) -> None:
        # qilei_values：随机令牌到用户公开信息和过期时间的映射。
        self.qilei_values: Dict[str, Dict[str, Any]] = {}
        # qilei_lock：保护多线程会话刷新和删除的可重入锁。
        self.qilei_lock = RLock()

    def qilei_create(self, qilei_user: Dict[str, Any]) -> str:
        """为登录用户生成不可预测的随机会话令牌。"""
        # qilei_token：写入 HttpOnly Cookie 的随机令牌。
        qilei_token = secrets.token_urlsafe(32)
        with self.qilei_lock:
            self.qilei_values[qilei_token] = {**qilei_user, "expires_at": time.time() + QILEI_SESSION_SECONDS}
        return qilei_token

    def qilei_get(self, qilei_token: Optional[str]) -> Optional[Dict[str, Any]]:
        """读取并续期有效会话；无效或过期令牌返回 None。"""
        if not qilei_token:
            return None
        with self.qilei_lock:
            # qilei_value：令牌对应的会话记录。
            qilei_value = self.qilei_values.get(qilei_token)
            if not qilei_value:
                return None
            if qilei_value["expires_at"] < time.time():
                self.qilei_values.pop(qilei_token, None)
                return None
            qilei_value["expires_at"] = time.time() + QILEI_SESSION_SECONDS
            return {"username": qilei_value["username"], "is_admin": qilei_value["is_admin"]}

    def qilei_delete(self, qilei_token: Optional[str]) -> None:
        """删除退出登录用户的会话令牌。"""
        if qilei_token:
            with self.qilei_lock:
                self.qilei_values.pop(qilei_token, None)

    def qilei_delete_username(self, qilei_username: str) -> None:
        """删除指定用户名仍保存在服务器内存中的全部登录会话。"""
        with self.qilei_lock:
            # qilei_tokens：所有属于目标用户名的当前会话令牌。
            qilei_tokens = [
                qilei_token for qilei_token, qilei_value in self.qilei_values.items()
                if qilei_value.get("username") == qilei_username
            ]
            for qilei_token in qilei_tokens:
                self.qilei_values.pop(qilei_token, None)
