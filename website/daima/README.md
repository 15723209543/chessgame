# Chessgame Web Source / 棋类游戏网站源码

本目录保存棋类游戏合集整体版本 **v2.1** 中网站版 **v1.4** 的程序源码。它只包含前端和后端代码，不应保存真实玩家运行数据。

网站源码由两部分组成：

- `frontend/`：页面、样式、六种棋 Canvas 实现与前端调度；
- `backend/`：Python 本地服务器、认证、会话、JSON 存储和外部引擎适配。

---

## 1. 版本与技术栈

| 项目 | 内容 |
| --- | --- |
| 名称 | Chessgame Web Source |
| 当前版本 | **v1.4** |
| 所属整体版本 | **v2.1** |
| 对应本地 C++ 版本 | **v1.3.4** |
| 前端语言 | HTML、CSS、原生 JavaScript ES Modules |
| 后端语言 | Python 3 |
| HTTP 服务 | `ThreadingHTTPServer` |
| 数据格式 | UTF-8 JSON |
| 棋盘绘制 | HTML Canvas |
| 密码算法 | PBKDF2-HMAC-SHA256 |
| 会话 | 随机令牌 + HttpOnly Cookie |
| 外部引擎 | Pikafish、Stockfish、KataGo、Rapfi |
| 数据目录 | 上级 `website/data/` |
| 引擎目录 | 项目根目录 `engines/` |

---

## 2. 目录结构

```text
website/daima/
├── README.md
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── app.js
│       ├── qilei_api.js
│       └── games/
│           ├── qilei_game_utils.js
│           ├── zhongguoxiangqi_game.js
│           ├── guojixiangqi_game.js
│           ├── weiqi_game.js
│           ├── wuziqi_game.js
│           ├── feixingqi_game.js
│           └── tiaoqi_game.js
└── backend/
    ├── __init__.py
    ├── qilei_config.py
    ├── qilei_auth.py
    ├── qilei_storage.py
    ├── qilei_engine.py
    └── qilei_server.py
```

运行数据不属于源码：

```text
website/data/
```

---

## 3. 前端架构

### 3.1 `index.html`

负责：

- 登录与注册页面；
- 左侧导航；
- 六棋大厅；
- 历史记录；
- 个人中心；
- 管理员用户管理；
- 统一设置页；
- 游戏舞台；
- 对话框和 Toast；
- 加载 `app.js`。

### 3.2 `main.css`

负责：

- 深青、米白、金色整体主题；
- 登录页；
- 大厅卡片；
- 侧栏；
- 历史表格；
- 个人中心；
- 管理员页面；
- EasyX 比例舞台；
- 六种棋专项样式；
- 响应式缩放；
- 对话框和提示。

### 3.3 `app.js`

是网站前端总调度入口，负责：

- 登录/注册状态；
- 六棋元数据；
- 大厅和方向键焦点；
- 页面视图切换；
- 设置页；
- 新游戏和读取存档；
- 通用步时与总时；
- 创建和销毁游戏模块；
- 自动保存；
- 结束结果写入；
- 历史记录；
- 个人改密；
- 管理员操作；
- 通用快捷键；
- 页面关闭前补存；
- 防止旧异步结果写入新棋局。

### 3.4 `qilei_api.js`

统一封装 `fetch`：

- 自动携带同源 Cookie；
- 自动设置 JSON 请求头；
- 解析后端 JSON；
- 将非 2xx 和 `ok: false` 转为 JavaScript 异常；
- 提供账号、历史、管理员、存档和引擎接口。

### 3.5 游戏模块

每个游戏模块导出：

```javascript
create_game({
  boardHost,
  controlsHost,
  savedState,
  setting,
  services
})
```

其中：

- `boardHost`：棋盘容器；
- `controlsHost`：操作按钮容器；
- `savedState`：读取的用户存档；
- `setting`：计时和机器人设置；
- `services`：保存、结束、提示、引擎等公共服务。

游戏实例通常返回：

```javascript
{
  getState(),
  timeout(),
  handleShortcut(),
  destroy()
}
```

不同棋类按需要实现其中一部分。

### 3.6 `qilei_game_utils.js`

保存通用前端工具，例如：

- 深复制；
- Canvas 坐标换算；
- 通用按钮；
- 基础数值和对象处理。

---

## 4. 后端模块

### 4.1 `qilei_config.py`

负责固定配置：

- 六种棋 ID 与中文名称；
- 管理员账号；
- Cookie 名称；
- 12 小时会话时长；
- 1 MB JSON 上限；
- website 根目录定位；
- 前端目录；
- data 目录；
- 打包 EXE 与源码运行路径兼容。

可通过环境变量覆盖网站根目录：

```text
CHESSGAME_WEB_ROOT
```

### 4.2 `qilei_auth.py`

负责：

- 用户名和密码纯数字校验；
- PBKDF2-HMAC-SHA256；
- 16 字节随机盐；
- 240000 次迭代；
- 注册；
- 登录；
- 用户自己修改密码；
- 管理员重置密码；
- 管理员删除普通用户；
- 内置管理员初始化；
- 内存会话创建、续期和删除。

### 4.3 `qilei_storage.py`

负责线程安全本地 JSON 数据：

- 每用户独立目录；
- 每账号独立 JSON；
- 每局独立 JSON；
- 历史记录；
- 新建对局；
- 状态保存；
- 最近存档读取；
- 完成结果；
- 删除单条历史；
- 删除全部历史；
- 管理员统计；
- 删除用户目录；
- 旧版 `accounts.json/users` 数据迁移。

JSON 写入流程：

```text
写入同目录 .tmp
      ↓
flush
      ↓
fsync
      ↓
os.replace 原子替换
```

### 4.4 `qilei_engine.py`

负责网站四类棋外部引擎：

| 棋类 ID | 棋类 | 引擎 | 协议 |
| --- | --- | --- | --- |
| `xiangqi` | 中国象棋 | Pikafish | UCI |
| `chess` | 国际象棋 | Stockfish | UCI |
| `go` | 围棋 | KataGo | GTP |
| `gomoku` | 五子棋 | Rapfi | Piskvork |

功能包括：

- 隐藏控制台启动；
- 标准输入/输出管道；
- 超时读取；
- UCI MultiPV；
- 强候选小幅随机；
- FEN/坐标转换；
- 围棋常驻模型；
- 围棋启动预热；
- 串行引擎调度；
- 进程退出清理；
- 失败返回 `None`，供前端后备算法处理。

### 4.5 `qilei_server.py`

负责：

- 多线程本地 HTTP 服务；
- 自动寻找可用端口；
- 自动打开浏览器；
- 静态文件服务；
- 同源 JSON API；
- 会话 Cookie；
- 用户权限；
- 管理员权限；
- 请求大小校验；
- 静态路径边界检查；
- CSP 和安全响应头；
- EXE 双击入口。

---

## 5. 数据结构

### 5.1 用户目录

```text
website/data/
└── 123456/
   ├── user/
   │  └── 123456.json
   └── result/
      ├── 20260718121030_chess_xxx.json
      └── 20260718122510_ludo_xxx.json
```

### 5.2 账号 JSON

典型字段：

```json
{
  "username": "123456",
  "salt": "...",
  "password_hash": "...",
  "created_at": "...",
  "is_admin": false
}
```

### 5.3 单局 JSON

典型字段：

```json
{
  "id": "唯一记录编号",
  "game_id": "chess",
  "game_name": "国际象棋",
  "opened_at": "打开时间",
  "updated_at": "更新时间",
  "finished_at": null,
  "result": "进行中",
  "state": {}
}
```

历史页只读取公开字段，不返回完整棋盘状态。

---

## 6. HTTP API

### 6.1 会话与账号

| 方法 | 路径 | 权限 | 作用 |
| --- | --- | --- | --- |
| GET | `/api/session` | 无 | 读取当前会话 |
| POST | `/api/register` | 无 | 注册 |
| POST | `/api/login` | 无 | 登录 |
| POST | `/api/logout` | 登录 | 退出 |
| POST | `/api/account/password` | 登录 | 用户修改自己的密码 |

### 6.2 管理员

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/admin/users` | 用户列表与统计 |
| POST | `/api/admin/users` | 新增用户 |
| PUT | `/api/admin/users/{username}/password` | 修改用户密码 |
| DELETE | `/api/admin/users/{username}` | 删除普通用户及全部数据 |

### 6.3 历史记录

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/history` | 获取当前用户历史 |
| DELETE | `/api/history/{record_id}` | 删除单局 |
| DELETE | `/api/history` | 删除全部 |

### 6.4 棋局与存档

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| POST | `/api/games/{game_id}/start` | 开始新局或读取存档 |
| GET | `/api/games/{game_id}/state` | 获取最近未结束存档 |
| PUT | `/api/games/{game_id}/state` | 保存当前单局状态 |
| DELETE | `/api/games/{game_id}/state/{record_id}` | 清空当前局可继续状态 |
| POST | `/api/games/{game_id}/finish` | 写入终局结果 |
| POST | `/api/games/{game_id}/engine-move` | 请求外部机器人走法 |

所有棋局、历史和管理员接口都会校验当前会话及权限。

---

## 7. 保存生命周期

### 7.1 开始新游戏

后端创建一份新的单局文件：

```text
opened_at
result = 进行中
state = null
```

### 7.2 读取存档

后端查找：

- 同一用户；
- 同一棋类；
- 未完成；
- `state` 为对象；
- 最近打开的一份记录。

### 7.3 自动保存

前端状态变化后：

```text
延迟 260 ms
      ↓
合并连续变化
      ↓
PUT 当前 record_id
```

### 7.4 退出或刷新

- 离开当前游戏时立即请求保存；
- `beforeunload` 使用 `keepalive` 尽力补存；
- 前端使用会话编号丢弃已切换棋局的迟到异步结果。

### 7.5 游戏完成

前端调用 `finish`：

- 写入结果文字；
- 写入 `finished_at`；
- 保留最终状态和历史文件。

---

## 8. 外部引擎实现

### 8.1 引擎目录

后端通过：

```python
QILEI_ROOT_DIR.parent / "engines"
```

定位项目根目录引擎。

因此标准布局必须是：

```text
project/
├── engines/
└── website/
```

### 8.2 UCI

中国象棋和国际象棋：

- 将网页棋盘转换为 FEN；
- 设置 MultiPV；
- 收集候选和评分；
- 在分数接近候选中保留小幅变化；
- 转换回网页下标。

### 8.3 GTP

围棋：

- 网站启动时后台预热 KataGo；
- 模型进程常驻；
- 每次清盘后重放当前棋盘；
- 设置访问数和最大时间；
- 支持 7.5 目贴目；
- 支持双方机器人根噪声；
- 首次模型加载允许更长等待。

### 8.4 Piskvork

五子棋：

- 启动 15 路；
- 设置回合超时；
- 使用 `BOARD` 重放；
- 解析 `x,y`；
- 双机器人空盘开局可从中心附近高质量点中变化。

### 8.5 回退

后端接口返回空走法时，前端游戏模块会调用浏览器内置机器人，不会直接终止棋局。

---

## 9. 安全限制

后端包含以下保护：

- 纯数字账号；
- 密码摘要；
- 随机盐；
- HttpOnly Cookie；
- SameSite=Strict；
- 12 小时滑动会话；
- 1 MB JSON 上限；
- JSON 对象类型检查；
- 管理员权限检查；
- 用户目录边界检查；
- 静态文件目录穿越检查；
- `nosniff`；
- CSP；
- API `no-store`；
- JSON 原子写入；
- 删除用户时注销其内存会话。

但这仍是本地实验网站：

- 无 HTTPS；
- 无数据库事务；
- 无公网攻击防护；
- 无登录失败速率限制；
- 会话重启丢失；
- 管理员初始密码固定。

不要直接部署到公网。

---

## 10. 本地开发

从项目根目录运行：

```powershell
python website/daima/backend/qilei_server.py --no-browser
```

环境变量指定 website 根目录：

```powershell
$env:CHESSGAME_WEB_ROOT = "D:\project\website"
python website/daima/backend/qilei_server.py
```

语法检查：

```powershell
python -m py_compile website/daima/backend/*.py
```

JavaScript 可使用 Node 检查：

```powershell
node --check website/daima/frontend/js/app.js
node --check website/daima/frontend/js/games/zhongguoxiangqi_game.js
```

---

## 11. 打包 EXE

在项目根目录运行：

```powershell
python -m PyInstaller --noconfirm --clean --onefile --console ^
  --name chessgame_web ^
  --paths website/daima/backend ^
  --distpath website/exe ^
  --workpath .build/pyinstaller ^
  --specpath .build ^
  website/daima/backend/qilei_server.py
```

EXE 仍然需要外部目录：

```text
website/daima/frontend
website/data
engines
```

---

## 12. v1.4 代码重点

- 前后端完全分离；
- 六棋 ES Module；
- 统一应用调度；
- 统一 API 封装；
- 账号与管理员功能；
- 用户自己改密；
- PBKDF2 密码摘要；
- 随机会话 Cookie；
- 每用户双目录；
- 每局独立 JSON；
- 原子保存；
- 旧数据迁移；
- 历史统计和删除；
- 260 ms 自动保存；
- 页面关闭补存；
- 四棋外部引擎；
- 围棋引擎常驻复用；
- 前端后备机器人；
- 异步结果会话隔离；
- CSP、路径边界和请求大小限制；
- PyInstaller 本地启动器。

---

## 13. 编码规范

项目代码采用：

- `qilei_` 前缀；
- 中文注释；
- 语义化变量名；
- 前端模块使用 ES Modules；
- 后端模块按认证、配置、存储、引擎和服务器拆分；
- 用户数据与源码分离；
- 不在源码目录写入运行数据。

---

## 14. 联系方式

```text
15723209543@163.com
```
