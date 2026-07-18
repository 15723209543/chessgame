// app.js：六棋网站大厅、账号界面、历史记录与游戏模块调度入口。

import { qilei_api } from "./qilei_api.js";
import { zhongguoxiangqi_create_game } from "./games/zhongguoxiangqi_game.js";
import { guojixiangqi_create_game } from "./games/guojixiangqi_game.js";
import { weiqi_create_game } from "./games/weiqi_game.js";
import { wuziqi_create_game } from "./games/wuziqi_game.js";
import { feixingqi_create_game } from "./games/feixingqi_game.js";
import { tiaoqi_create_game } from "./games/tiaoqi_game.js";

// qilei_games：大厅中六种棋的固定展示信息和模块入口。
const qilei_games = [
  { id: "xiangqi", name: "中国象棋", mark: "将", icon: "楚", description: "九路十行，体验将帅交锋与机器人对弈。", accent: "#ad493d", soft: "#f2ddd5", create: zhongguoxiangqi_create_game, firstName: "红方", secondName: "黑方", ui: { width: 980, height: 760, boardWidth: 620, theme: "xiangqi" } },
  { id: "chess", name: "国际象棋", mark: "♛", icon: "♞", description: "标准八乘八棋盘，计算材力、中心与王的安全。", accent: "#3d648e", soft: "#dce7f2", create: guojixiangqi_create_game, firstName: "白方", secondName: "黑方", ui: { width: 1120, height: 810, boardWidth: 790, theme: "dark" } },
  { id: "go", name: "围棋", mark: "围", icon: "○", description: "十九路棋盘，包含提子、停一手和本地数子。", accent: "#2a7761", soft: "#d8ebe2", create: weiqi_create_game, firstName: "黑方", secondName: "白方", ui: { width: 1180, height: 840, boardWidth: 820, theme: "dark" } },
  { id: "gomoku", name: "五子棋", mark: "五", icon: "●", description: "十五路连珠，识别活三、冲四与中心控制。", accent: "#b5762c", soft: "#f2e5cf", create: wuziqi_create_game, firstName: "黑方", secondName: "白方", ui: { width: 1120, height: 820, boardWidth: 800, theme: "dark" } },
  { id: "ludo", name: "飞行棋", mark: "飞", icon: "✦", description: "掷骰起飞、环道竞速，和多名机器人争夺第一。", accent: "#76529a", soft: "#e8def1", create: feixingqi_create_game, firstName: "玩家", secondName: "机器人", ui: { width: 1500, height: 950, boardWidth: 1000, theme: "flight" } },
  { id: "checkers", name: "跳棋", mark: "跳", icon: "◇", description: "星形棋盘连续跳跃，把全部棋子送入目标阵营。", accent: "#2d8292", soft: "#d9edf0", create: tiaoqi_create_game, firstName: "红方", secondName: "蓝方", ui: { width: 1320, height: 860, boardWidth: 860, theme: "checkers" } },
];

// qilei_elements：把页面所有带 id 的元素转换为便于访问的驼峰键对象。
const qilei_elements = Object.fromEntries([...document.querySelectorAll("[id]")].map(qilei_item => [qilei_item.id.replace(/-([a-z])/g, (_, qilei_value) => qilei_value.toUpperCase()), qilei_item]));
let qilei_auth_mode = "login"; // qilei_auth_mode：当前账号表单处于登录还是注册模式。
let qilei_current_user = null; // qilei_current_user：当前登录用户公开信息。
let qilei_current_game = null; // qilei_current_game：当前打开的游戏模块实例。
let qilei_current_game_meta = null; // qilei_current_game_meta：当前游戏的大厅固定信息。
let qilei_current_record_id = null; // qilei_current_record_id：当前打开记录在用户历史中的唯一编号。
let qilei_save_timer = null; // qilei_save_timer：合并连续状态写入的延时计时器。
let qilei_last_game_id = localStorage.getItem("chessgame-last-game") || "gomoku"; // qilei_last_game_id：仅用于“继续上次棋类”按钮的本地偏好。
let qilei_pending_game_meta = null; // qilei_pending_game_meta：设置页即将开始的棋类信息。
let qilei_setting_focus = 0; // qilei_setting_focus：设置页键盘当前选中的设置行。
let qilei_current_setting = { stepSeconds: 60, totalSeconds: 600, robotMode: 2, robotLevel: 2 }; // qilei_current_setting：当前设置页选择的计时与机器人参数。
let qilei_lobby_focus = 0; // qilei_lobby_focus：大厅方向键当前选中的棋类卡片下标。
let qilei_clock_timer = null; // qilei_clock_timer：网页游戏右侧步时与局时刷新计时器。
let qilei_clock_state = null; // qilei_clock_state：当前网页棋局双方剩余时间与行动方。
let qilei_saved_games = new Map(); // qilei_saved_games：当前用户六种棋是否存在服务端存档。
let qilei_choice_game_meta = null; // qilei_choice_game_meta：大厅进入方式窗口当前选择的棋类。
let qilei_start_mode = "new"; // qilei_start_mode：本次进入使用新游戏还是读取存档。
let qilei_history_delete_target = null; // qilei_history_delete_target：待删除记录编号；空字符串表示全部删除。
let qilei_admin_password_target = null; // qilei_admin_password_target：管理员准备修改密码的目标用户名。
let qilei_admin_delete_target = null; // qilei_admin_delete_target：管理员准备删除的目标用户名。
let qilei_game_session_id = 0; // qilei_game_session_id：每次离开或重建棋局时递增，用来丢弃旧棋局迟到的异步结果。

// qilei_toast：在页面右下角短暂显示操作提示。
function qilei_toast(qilei_message) {
  qilei_elements.toast.textContent = qilei_message;
  qilei_elements.toast.classList.add("show");
  window.clearTimeout(qilei_toast.timer);
  qilei_toast.timer = window.setTimeout(() => qilei_elements.toast.classList.remove("show"), 2400);
}

// qilei_set_saving：切换侧栏中的数据同步状态文字。
function qilei_set_saving(qilei_saving) {
  qilei_elements.saveIndicator.classList.toggle("saving", qilei_saving);
  qilei_elements.saveIndicator.lastChild.textContent = qilei_saving ? " 正在保存" : " 数据已同步";
}

// qilei_switch_auth_mode：在登录和首次注册表单之间切换。
function qilei_switch_auth_mode(qilei_mode) {
  qilei_auth_mode = qilei_mode;
  const qilei_login = qilei_mode === "login"; // qilei_login：当前是否为登录模式。
  qilei_elements.loginTab.classList.toggle("active", qilei_login);
  qilei_elements.registerTab.classList.toggle("active", !qilei_login);
  qilei_elements.loginTab.setAttribute("aria-selected", String(qilei_login));
  qilei_elements.registerTab.setAttribute("aria-selected", String(!qilei_login));
  qilei_elements.authSubmit.firstChild.textContent = qilei_login ? "登录棋馆 " : "注册并进入 ";
  qilei_elements.password.autocomplete = qilei_login ? "current-password" : "new-password";
  qilei_elements.authError.textContent = "";
}

// qilei_handle_auth：验证纯数字输入并向 Python 后端提交登录或注册。
async function qilei_handle_auth(qilei_event) {
  qilei_event.preventDefault();
  const qilei_username = qilei_elements.username.value.trim(); // qilei_username：用户输入的纯数字用户名。
  const qilei_password = qilei_elements.password.value.trim(); // qilei_password：用户输入的纯数字密码。
  if (!/^\d+$/.test(qilei_username) || !/^\d+$/.test(qilei_password)) { qilei_elements.authError.textContent = "用户名和密码均只能输入数字。"; return; }
  qilei_elements.authSubmit.disabled = true;
  qilei_elements.authError.textContent = "";
  try {
    const qilei_response = qilei_auth_mode === "login" ? await qilei_api.login(qilei_username, qilei_password) : await qilei_api.register(qilei_username, qilei_password); // qilei_response：认证成功后的用户和提示信息。
    qilei_enter_app(qilei_response.user);
    qilei_toast(qilei_response.message);
  } catch (qilei_error) { qilei_elements.authError.textContent = qilei_error.message; }
  finally { qilei_elements.authSubmit.disabled = false; }
}

// qilei_enter_app：保存登录用户并显示网站大厅。
function qilei_enter_app(qilei_user) {
  qilei_current_user = qilei_user;
  qilei_elements.authView.classList.add("hidden");
  qilei_elements.appView.classList.remove("hidden");
  qilei_elements.currentUsername.textContent = qilei_user.username;
  qilei_elements.heroUsername.textContent = qilei_user.username;
  qilei_elements.userAvatar.textContent = qilei_user.username.slice(-1);
  qilei_elements.profileAvatar.textContent = qilei_user.username.slice(-1);
  qilei_elements.profileUsername.textContent = qilei_user.username;
  qilei_elements.profileRole.textContent = qilei_user.is_admin ? "管理员" : "普通用户";
  qilei_elements.adminNav.classList.toggle("hidden", !qilei_user.is_admin);
  qilei_show_view("lobby");
  qilei_refresh_saved_games();
}

// qilei_leave_app：销毁当前棋局并返回账号页面。
function qilei_leave_app() {
  qilei_destroy_current_game();
  qilei_current_user = null;
  qilei_elements.appView.classList.add("hidden");
  qilei_elements.authView.classList.remove("hidden");
  qilei_elements.password.value = "";
  qilei_elements.profilePasswordForm.reset();
  qilei_elements.adminCreateForm.reset();
  qilei_elements.profilePasswordError.textContent = "";
  qilei_elements.adminCreateError.textContent = "";
  qilei_close_admin_password();
  qilei_close_admin_delete();
}

// qilei_show_view：切换大厅、历史、个人中心、管理员或游戏视图并更新页头。
function qilei_show_view(qilei_view_name) {
  for (const qilei_name of ["lobby", "history", "profile", "admin", "setting", "game"]) {
    const qilei_node = qilei_elements[`${qilei_name}View`]; // qilei_node：待显示或隐藏的主视图元素。
    if (qilei_node) qilei_node.classList.toggle("hidden", qilei_name !== qilei_view_name);
  }
  const qilei_easyx_mode = qilei_view_name === "setting" || qilei_view_name === "game"; // qilei_easyx_mode：是否隐藏网站框架并显示 EasyX 等比例舞台。
  document.body.classList.toggle("easyx-mode", qilei_easyx_mode);
  document.querySelectorAll(".nav-button").forEach(qilei_button => qilei_button.classList.toggle("active", qilei_button.dataset.view === qilei_view_name));
  const qilei_titles = { lobby: ["BOARD GAME HALL", "棋类大厅"], history: ["PERSONAL ARCHIVE", "历史记录"], profile: ["PERSONAL CENTER", "个人中心"], admin: ["LOCAL ADMIN", "用户管理"], setting: ["GAME SETTINGS", qilei_pending_game_meta?.name || "对局设置"], game: ["PLAYING NOW", qilei_current_game_meta?.name || "棋类"] }; // qilei_titles：各视图页头英文和中文标题。
  const [qilei_kicker, qilei_title] = qilei_titles[qilei_view_name]; // qilei_kicker/title：当前视图页头文字。
  qilei_elements.pageKicker.textContent = qilei_kicker;
  qilei_elements.pageTitle.textContent = qilei_title;
  if (qilei_view_name === "history") qilei_load_history();
  if (qilei_view_name === "admin") qilei_load_admin();
  if (qilei_view_name === "lobby" && qilei_current_user) qilei_refresh_saved_games();
}

// qilei_setting_rows：根据当前棋类生成和 C++ 公共设置页一致的四行选项。
function qilei_setting_rows() {
  const qilei_meta = qilei_pending_game_meta; // qilei_meta：设置页正在配置的棋类。
  return [
    { key: "stepSeconds", label: "每步时长", values: [30, 60, 90], texts: ["30秒", "60秒", "90秒"] },
    { key: "totalSeconds", label: "单方总时长", values: [300, 600, 900, 1200], texts: ["5分钟", "10分钟", "15分钟", "20分钟"] },
    { key: "robotMode", label: "对战模式", values: [0, 1, 2, 3], texts: ["双方玩家", `${qilei_meta.firstName}机器人`, `${qilei_meta.secondName}机器人`, "双方机器人"] },
    { key: "robotLevel", label: "机器人难度", values: [0, 1, 2], texts: ["入门", "进阶", "大师"] },
  ];
}

// qilei_render_setting：绘制 EasyX 设置页的标题、四行按钮和键盘焦点。
function qilei_render_setting() {
  if (!qilei_pending_game_meta) return;
  qilei_elements.settingTitle.textContent = `${qilei_pending_game_meta.name} · 对局设置`;
  qilei_elements.settingOptions.replaceChildren();
  qilei_setting_rows().forEach((qilei_row, qilei_row_index) => {
    const qilei_group = document.createElement("div"); // qilei_group：一行设置选项。
    qilei_group.className = `easyx-setting-row${qilei_setting_focus === qilei_row_index ? " focused" : ""}`;
    const qilei_label = document.createElement("h4"); // qilei_label：当前设置行标题。
    qilei_label.textContent = qilei_row.label;
    const qilei_buttons = document.createElement("div"); // qilei_buttons：当前设置行的选项按钮容器。
    qilei_row.values.forEach((qilei_value, qilei_index) => {
      const qilei_button = document.createElement("button"); // qilei_button：一个可点击设置选项。
      qilei_button.type = "button";
      qilei_button.textContent = qilei_row.texts[qilei_index];
      qilei_button.className = qilei_current_setting[qilei_row.key] === qilei_value ? "selected" : "";
      qilei_button.addEventListener("click", () => {
        qilei_setting_focus = qilei_row_index;
        qilei_current_setting[qilei_row.key] = qilei_value;
        qilei_render_setting();
      });
      qilei_buttons.append(qilei_button);
    });
    qilei_group.append(qilei_label, qilei_buttons);
    qilei_elements.settingOptions.append(qilei_group);
  });
}

// qilei_show_setting：进入棋类后先显示设置页，不直接创建棋局。
function qilei_show_setting(qilei_game_id) {
  const qilei_meta = qilei_games.find(qilei_item => qilei_item.id === qilei_game_id); // qilei_meta：用户从大厅选择的棋类。
  if (!qilei_meta) return;
  qilei_destroy_current_game();
  qilei_pending_game_meta = qilei_meta;
  qilei_setting_focus = 0;
  qilei_current_setting = { stepSeconds: 60, totalSeconds: 600, robotMode: 2, robotLevel: 2 };
  try {
    const qilei_saved_setting = JSON.parse(localStorage.getItem(`chessgame-setting-${qilei_game_id}`) || "null"); // qilei_saved_setting：该棋类上次使用的网页设置。
    if (qilei_saved_setting) qilei_current_setting = { ...qilei_current_setting, ...qilei_saved_setting };
  } catch (_) {
    qilei_current_setting = { stepSeconds: 60, totalSeconds: 600, robotMode: 2, robotLevel: 2 };
  }
  qilei_render_setting();
  qilei_show_view("setting");
}

// qilei_refresh_saved_games：读取六种棋的个人存档状态并刷新大厅提示。
async function qilei_refresh_saved_games() {
  if (!qilei_current_user) return;
  try {
    // qilei_results：六个存档读取接口的并行结果。
    const qilei_results = await Promise.all(qilei_games.map(async qilei_game => {
      const qilei_response = await qilei_api.gameState(qilei_game.id); // qilei_response：一种棋的存档包装对象。
      return [qilei_game.id, qilei_response.saved || null];
    }));
    qilei_saved_games = new Map(qilei_results);
    qilei_render_game_cards();
  } catch (qilei_error) {
    if (qilei_error.status === 401) qilei_leave_app();
  }
}

// qilei_close_game_choice：关闭大厅的新游戏/读取存档选择窗口。
function qilei_close_game_choice() {
  qilei_elements.gameChoiceDialog.classList.add("hidden");
  qilei_choice_game_meta = null;
}

// qilei_open_game_choice：显示指定棋类的进入方式窗口，并根据真实存档控制读取按钮。
async function qilei_open_game_choice(qilei_game_id) {
  const qilei_meta = qilei_games.find(qilei_item => qilei_item.id === qilei_game_id); // qilei_meta：用户点击的棋类信息。
  if (!qilei_meta) return;
  qilei_choice_game_meta = qilei_meta;
  let qilei_saved = qilei_saved_games.get(qilei_game_id) || null; // qilei_saved：当前缓存的个人存档。
  try {
    const qilei_response = await qilei_api.gameState(qilei_game_id); // qilei_response：再次确认后的最新存档状态。
    qilei_saved = qilei_response.saved || null;
    qilei_saved_games.set(qilei_game_id, qilei_saved);
  } catch (qilei_error) {
    qilei_toast(qilei_error.message);
  }
  qilei_elements.gameChoiceTitle.textContent = `${qilei_meta.name} · 进入方式`;
  qilei_elements.gameChoiceMessage.textContent = qilei_saved
    ? `发现上一次存档（${qilei_format_date(qilei_saved.updated_at)}），请选择进入方式。`
    : "当前没有可读取的存档，只能开始新游戏。";
  qilei_elements.gameChoiceLoad.disabled = !qilei_saved;
  qilei_elements.gameChoiceLoad.classList.toggle("no-save", !qilei_saved);
  qilei_elements.gameChoiceDialog.classList.remove("hidden");
  qilei_elements.gameChoiceNew.focus();
}

// qilei_begin_new_game：清空旧存档并按棋类自身流程开始新游戏。
function qilei_begin_new_game() {
  if (!qilei_choice_game_meta) return;
  const qilei_meta = qilei_choice_game_meta; // qilei_meta：即将创建新局的棋类。
  qilei_close_game_choice();
  qilei_start_mode = "new";
  qilei_pending_game_meta = qilei_meta;
  if (qilei_meta.id === "ludo" || qilei_meta.id === "checkers") {
    qilei_current_setting = { stepSeconds: 30, totalSeconds: 600, robotMode: 2, robotLevel: 2 };
    qilei_start_selected_game();
  } else {
    qilei_show_setting(qilei_meta.id);
  }
}

// qilei_begin_load_game：直接使用上一次个人存档进入游戏。
function qilei_begin_load_game() {
  if (!qilei_choice_game_meta || !qilei_saved_games.get(qilei_choice_game_meta.id)) return;
  const qilei_meta = qilei_choice_game_meta; // qilei_meta：即将读取存档的棋类。
  qilei_close_game_choice();
  qilei_start_mode = "load";
  qilei_pending_game_meta = qilei_meta;
  qilei_current_setting = { stepSeconds: 60, totalSeconds: 600, robotMode: 2, robotLevel: 2 };
  try {
    const qilei_saved_setting = JSON.parse(localStorage.getItem(`chessgame-setting-${qilei_meta.id}`) || "null"); // qilei_saved_setting：存档上次使用的本机计时和机器人设置。
    if (qilei_saved_setting) qilei_current_setting = { ...qilei_current_setting, ...qilei_saved_setting };
  } catch (_) {
    qilei_current_setting = { stepSeconds: 60, totalSeconds: 600, robotMode: 2, robotLevel: 2 };
  }
  qilei_start_selected_game();
}

// qilei_adjust_setting：用方向键移动设置焦点或切换当前选项。
function qilei_adjust_setting(qilei_key) {
  const qilei_rows = qilei_setting_rows(); // qilei_rows：设置页四行定义。
  if (qilei_key === "ArrowUp" || qilei_key === "ArrowDown") {
    qilei_setting_focus = (qilei_setting_focus + (qilei_key === "ArrowDown" ? 1 : qilei_rows.length - 1)) % qilei_rows.length;
  } else {
    const qilei_row = qilei_rows[qilei_setting_focus]; // qilei_row：左右方向键正在调整的设置行。
    const qilei_index = qilei_row.values.indexOf(qilei_current_setting[qilei_row.key]); // qilei_index：当前值在本行的下标。
    const qilei_delta = qilei_key === "ArrowRight" ? 1 : qilei_row.values.length - 1; // qilei_delta：循环切换方向。
    qilei_current_setting[qilei_row.key] = qilei_row.values[(qilei_index + qilei_delta) % qilei_row.values.length];
  }
  qilei_render_setting();
}

// qilei_render_game_cards：按照固定元数据生成六张大厅游戏卡片。
function qilei_render_game_cards() {
  qilei_elements.gameGrid.replaceChildren();
  for (const qilei_game of qilei_games) {
    const qilei_button = document.createElement("button"); // qilei_button：当前游戏大厅卡片。
    qilei_button.type = "button";
    qilei_button.className = "game-card";
    qilei_button.dataset.mark = qilei_game.mark;
    qilei_button.style.setProperty("--accent", qilei_game.accent);
    qilei_button.style.setProperty("--accent-soft", qilei_game.soft);
    const qilei_has_save = Boolean(qilei_saved_games.get(qilei_game.id)); // qilei_has_save：当前棋类是否已有个人存档。
    qilei_button.classList.toggle("has-save", qilei_has_save);
    qilei_button.innerHTML = `<span class="card-top"><i class="game-icon">${qilei_game.icon}</i><i class="arrow">→</i></span><h4>${qilei_game.name}</h4><p>${qilei_game.description}</p><small class="${qilei_has_save ? "save-ready" : "save-empty"}">${qilei_has_save ? "已有存档" : "暂无存档"}</small>`;
    qilei_button.addEventListener("click", () => qilei_open_game_choice(qilei_game.id));
    qilei_elements.gameGrid.append(qilei_button);
  }
  qilei_focus_lobby_card(qilei_lobby_focus, false);
}

// qilei_focus_lobby_card：更新大厅方向键选中卡片并按需把焦点移到卡片。
function qilei_focus_lobby_card(qilei_index, qilei_move_focus = true) {
  const qilei_cards = [...qilei_elements.gameGrid.querySelectorAll(".game-card")]; // qilei_cards：大厅六张棋类卡片。
  if (!qilei_cards.length) return;
  qilei_lobby_focus = (qilei_index + qilei_cards.length) % qilei_cards.length;
  qilei_cards.forEach((qilei_card, qilei_card_index) => qilei_card.classList.toggle("keyboard-selected", qilei_card_index === qilei_lobby_focus));
  if (qilei_move_focus) qilei_cards[qilei_lobby_focus].focus({ preventScroll: true });
}

// qilei_format_clock：把网页计时秒数格式化为 C++ 界面使用的 m:ss。
function qilei_format_clock(qilei_seconds) {
  const qilei_safe_seconds = Math.max(0, Math.floor(qilei_seconds || 0)); // qilei_safe_seconds：避免负数和小数进入显示。
  return `${Math.floor(qilei_safe_seconds / 60)}:${String(qilei_safe_seconds % 60).padStart(2, "0")}`;
}

// qilei_render_clock：只刷新双方状态中的步时和局时文字。
function qilei_render_clock() {
  if (!qilei_clock_state) return;
  document.querySelectorAll(".easyx-stat-clock").forEach((qilei_node, qilei_index) => {
    qilei_node.textContent = `步时 ${qilei_format_clock(qilei_clock_state.stepRemaining[qilei_index] ?? qilei_clock_state.stepRemaining[0])} · 局时 ${qilei_format_clock(qilei_clock_state.totalRemaining[qilei_index] ?? qilei_clock_state.totalRemaining[0])}`;
  });
}

// qilei_start_clock：根据设置启动网页右侧倒计时，不创建任何额外窗口。
function qilei_start_clock() {
  window.clearInterval(qilei_clock_timer);
  qilei_clock_state = {
    stepRemaining: [qilei_current_setting.stepSeconds, qilei_current_setting.stepSeconds],
    totalRemaining: [qilei_current_setting.totalSeconds, qilei_current_setting.totalSeconds],
    activeSide: 0,
    moveCount: -1,
    running: false,
  };
  qilei_clock_timer = window.setInterval(() => {
    if (!qilei_clock_state || !qilei_clock_state.running || document.hidden) return;
    const qilei_timed_side = qilei_clock_state.activeSide; // qilei_timed_side：本秒唯一扣时的行动方。
    qilei_clock_state.stepRemaining[qilei_timed_side] = Math.max(0, qilei_clock_state.stepRemaining[qilei_timed_side] - 1);
    qilei_clock_state.totalRemaining[qilei_timed_side] = Math.max(0, qilei_clock_state.totalRemaining[qilei_timed_side] - 1);
    qilei_render_clock();
    if (qilei_clock_state.stepRemaining[qilei_timed_side] === 0 || qilei_clock_state.totalRemaining[qilei_timed_side] === 0) {
      const qilei_timeout_kind = qilei_clock_state.totalRemaining[qilei_timed_side] === 0 ? "局时" : "步时"; // qilei_timeout_kind：触发判负的计时种类。
      qilei_clock_state.running = false;
      qilei_current_game?.timeout?.(qilei_timed_side, qilei_timeout_kind);
    }
  }, 1000);
}

// qilei_update_game_info：接收游戏模块数据并按 EasyX 顺序刷新操作、双方状态和预测条。
function qilei_update_game_info(qilei_info = {}) {
  if (qilei_info.status) qilei_elements.gameStatus.textContent = qilei_info.status;
  const qilei_raw_prediction = qilei_info.prediction || { first: 50, second: 50, firstName: "先手", secondName: "后手", summary: "双方机会均等" }; // qilei_raw_prediction：模块根据局势计算的原始预测。
  const qilei_prediction = qilei_info.moveCount === 0
    ? { ...qilei_raw_prediction, first: 50, second: 50, summary: "开局双方机会均等" }
    : qilei_raw_prediction; // qilei_prediction：开局强制 50/50，落子后再使用模块算法。
  qilei_elements.predictionText.textContent = `${qilei_prediction.firstName} ${qilei_prediction.first}%  ${qilei_prediction.secondName} ${qilei_prediction.second}%`;
  qilei_elements.predictionFill.style.width = `${qilei_prediction.first}%`;
  qilei_elements.predictionSummary.textContent = qilei_prediction.summary;
  qilei_elements.xiangqiAnalysisTitle.textContent = `局势分析　${qilei_prediction.firstName}方 ${qilei_prediction.first}%　-　${qilei_prediction.secondName}方 ${qilei_prediction.second}%`;
  qilei_elements.xiangqiAnalysisFill.style.width = `${qilei_prediction.first}%`;
  if (qilei_clock_state) {
    const qilei_next_side = Number.isInteger(qilei_info.activeSide) ? qilei_info.activeSide : qilei_clock_state.activeSide; // qilei_next_side：模块明确提供的当前行动方。
    if (Number.isInteger(qilei_info.moveCount) && qilei_info.moveCount !== qilei_clock_state.moveCount) {
      qilei_clock_state.moveCount = qilei_info.moveCount;
      qilei_clock_state.stepRemaining[qilei_next_side] = qilei_current_setting.stepSeconds;
    }
    qilei_clock_state.activeSide = qilei_next_side;
  }
  qilei_elements.gameStats.replaceChildren();
  for (const qilei_stat of qilei_info.stats || []) {
    const qilei_cell = document.createElement("article"); // qilei_cell：一项双方状态信息的容器。
    const qilei_label = document.createElement("h4"); // qilei_label：状态项名称。
    const qilei_value = document.createElement("p"); // qilei_value：状态项具体值。
    qilei_label.textContent = qilei_stat.label;
    qilei_value.textContent = qilei_stat.value;
    qilei_cell.append(qilei_label, qilei_value);
    if (Array.isArray(qilei_stat.pieces)) {
      const qilei_roster = document.createElement("div"); // qilei_roster：仿 C++ 右栏显示的棋子生存/被吃列表。
      qilei_roster.className = "piece-roster";
      for (const qilei_piece of qilei_stat.pieces) {
        const qilei_piece_node = document.createElement("span"); // qilei_piece_node：一枚右栏小棋子。
        qilei_piece_node.textContent = typeof qilei_piece === "string" ? qilei_piece : qilei_piece.text;
        qilei_piece_node.classList.toggle("captured", Boolean(qilei_piece.captured));
        qilei_roster.append(qilei_piece_node);
      }
      qilei_cell.append(qilei_roster);
    }
    if (qilei_clock_state && qilei_elements.gameStats.children.length < 2) {
      const qilei_clock = document.createElement("small"); // qilei_clock：前两方状态对应的步时与局时。
      qilei_clock.className = "easyx-stat-clock";
      qilei_cell.append(qilei_clock);
    }
    qilei_elements.gameStats.append(qilei_cell);
  }
  qilei_render_clock();
}

// qilei_schedule_save：合并短时间内连续变化并把棋局状态写入用户独立文件夹。
function qilei_schedule_save(qilei_state, qilei_session_id = qilei_game_session_id, qilei_game_id = qilei_current_game_meta?.id, qilei_record_id = qilei_current_record_id) {
  window.clearTimeout(qilei_save_timer);
  qilei_set_saving(true);
  qilei_save_timer = window.setTimeout(async () => {
    try {
      if (qilei_session_id !== qilei_game_session_id || !qilei_game_id || !qilei_record_id) return;
      await qilei_api.saveState(qilei_game_id, qilei_record_id, qilei_state);
    }
    catch (qilei_error) { qilei_toast(`保存失败：${qilei_error.message}`); }
    finally { qilei_set_saving(false); }
  }, 260);
}

// qilei_finish_game：把游戏模块报告的结果写入本次历史记录。
async function qilei_finish_game(qilei_result, qilei_session_id = qilei_game_session_id, qilei_game_id = qilei_current_game_meta?.id, qilei_record_id = qilei_current_record_id) {
  try {
    if (qilei_session_id !== qilei_game_session_id || !qilei_game_id || !qilei_record_id) return;
    await qilei_api.finishGame(qilei_game_id, qilei_record_id, qilei_result);
    if (qilei_session_id !== qilei_game_session_id) return;
    qilei_toast("本局结果已写入历史记录");
  } catch (qilei_error) { qilei_toast(qilei_error.message); }
}

// qilei_start_selected_game：确认设置后读取存档并在同一网页内创建 EasyX 风格棋局。
async function qilei_start_selected_game() {
  const qilei_meta = qilei_pending_game_meta; // qilei_meta：设置页已经确认的棋类。
  if (!qilei_meta) return;
  qilei_destroy_current_game();
  const qilei_session_id = qilei_game_session_id; // qilei_session_id：本次棋局固定会话号，防止旧引擎响应写入新页面。
  try {
    localStorage.setItem(`chessgame-setting-${qilei_meta.id}`, JSON.stringify(qilei_current_setting));
    const qilei_response = await qilei_api.startGame(qilei_meta.id, qilei_start_mode); // qilei_response：新局独立文件或读取的上一份单局存档。
    if (qilei_session_id !== qilei_game_session_id) return;
    if (qilei_start_mode === "load" && !qilei_response.saved) {
      qilei_toast("上一次存档已经不存在，请开始新游戏。");
      qilei_show_view("lobby");
      qilei_refresh_saved_games();
      return;
    }
    qilei_current_game_meta = qilei_meta;
    qilei_current_record_id = qilei_response.record.id;
    qilei_last_game_id = qilei_meta.id;
    localStorage.setItem("chessgame-last-game", qilei_meta.id);
    qilei_elements.gameTitle.textContent = qilei_meta.name;
    qilei_elements.gameResumeBadge.textContent = qilei_start_mode === "load" ? "已读取个人存档" : "新对局";
    qilei_elements.gameWorkspace.dataset.game = qilei_meta.id;
    qilei_elements.gameWorkspace.dataset.theme = qilei_meta.ui.theme;
    delete qilei_elements.gameWorkspace.dataset.phase;
    qilei_elements.gameWorkspace.style.setProperty("--easyx-width", String(qilei_meta.ui.width));
    qilei_elements.gameWorkspace.style.setProperty("--easyx-height", String(qilei_meta.ui.height));
    qilei_elements.gameWorkspace.style.setProperty("--easyx-board-width", String(qilei_meta.ui.boardWidth));
    qilei_elements.gameWorkspace.style.setProperty("--easyx-board-percent", `${qilei_meta.ui.boardWidth / qilei_meta.ui.width * 100}%`);
    qilei_elements.gameWorkspace.style.aspectRatio = `${qilei_meta.ui.width} / ${qilei_meta.ui.height}`;
    qilei_elements.gameWorkspace.style.maxWidth = "none";
    qilei_elements.xiangqiAnalysis.classList.toggle("hidden", qilei_meta.id !== "xiangqi");
    qilei_elements.gameBoardHost.replaceChildren();
    qilei_elements.gameControls.replaceChildren();
    qilei_elements.gameEngineLabel.textContent = "";
    if (qilei_meta.id === "ludo" || qilei_meta.id === "checkers") {
      window.clearInterval(qilei_clock_timer);
      qilei_clock_state = null;
    } else {
      qilei_start_clock();
    }
    qilei_update_game_info();
    qilei_current_game = qilei_meta.create({
      boardHost: qilei_elements.gameBoardHost,
      controlsHost: qilei_elements.gameControls,
      savedState: qilei_start_mode === "load" ? qilei_response.saved?.state || null : null,
      setting: { ...qilei_current_setting },
      services: {
        update: qilei_info => {
          if (qilei_session_id === qilei_game_session_id) qilei_update_game_info(qilei_info);
        },
        save: qilei_state => {
          if (qilei_session_id === qilei_game_session_id) qilei_schedule_save(qilei_state, qilei_session_id, qilei_meta.id, qilei_response.record.id);
        },
        finish: qilei_result => qilei_finish_game(qilei_result, qilei_session_id, qilei_meta.id, qilei_response.record.id),
        toast: qilei_message => {
          if (qilei_session_id === qilei_game_session_id) qilei_toast(qilei_message);
        },
        clearSave: () => qilei_session_id === qilei_game_session_id
          ? qilei_api.deleteState(qilei_meta.id, qilei_response.record.id)
          : Promise.resolve(),
        engineMove: async qilei_position => {
          if (qilei_session_id !== qilei_game_session_id) throw new Error("棋局已经切换");
          const qilei_engine_result = await qilei_api.engineMove(qilei_meta.id, qilei_position, qilei_current_setting.robotLevel); // qilei_engine_result：当前会话对应的后端引擎结果。
          if (qilei_session_id !== qilei_game_session_id) throw new Error("棋局已经切换");
          return qilei_engine_result;
        },
      },
    });
    if (qilei_clock_state) qilei_clock_state.running = true;
    qilei_show_view("game");
  } catch (qilei_error) {
    if (qilei_error.status === 401) qilei_leave_app();
    qilei_toast(qilei_error.message);
  }
}

// qilei_destroy_current_game：立即补存当前状态并释放游戏模块资源。
function qilei_destroy_current_game() {
  qilei_game_session_id += 1;
  window.clearTimeout(qilei_save_timer);
  window.clearInterval(qilei_clock_timer);
  qilei_clock_timer = null;
  qilei_clock_state = null;
  if (qilei_current_game?.getState && qilei_current_game_meta && qilei_current_record_id) qilei_api.saveState(qilei_current_game_meta.id, qilei_current_record_id, qilei_current_game.getState()).catch(() => {});
  if (qilei_current_game?.destroy) qilei_current_game.destroy();
  qilei_current_game = null;
  qilei_current_game_meta = null;
  qilei_current_record_id = null;
}

// qilei_format_date：把 ISO 时间转换为本地二十四小时制文字。
function qilei_format_date(qilei_value) {
  if (!qilei_value) return "—";
  const qilei_date = new Date(qilei_value); // qilei_date：待显示的日期对象。
  return Number.isNaN(qilei_date.getTime()) ? qilei_value : qilei_date.toLocaleString("zh-CN", { hour12: false });
}

// qilei_load_history：读取并安全渲染当前用户的全部历史记录和统计。
async function qilei_load_history() {
  try {
    const { history: qilei_history } = await qilei_api.history(); // qilei_history：当前用户最近五百条打开记录。
    qilei_elements.historyBody.replaceChildren();
    qilei_elements.historyTotal.textContent = qilei_history.length;
    const qilei_completed = qilei_history.filter(qilei_item => qilei_item.finished_at).length; // qilei_completed：已经产生结果的对局数量。
    qilei_elements.historyCompleted.textContent = qilei_completed;
    const qilei_counts = {}; // qilei_counts：每种棋被打开的次数。
    qilei_history.forEach(qilei_item => { qilei_counts[qilei_item.game_name] = (qilei_counts[qilei_item.game_name] || 0) + 1; });
    qilei_elements.historyFavorite.textContent = Object.entries(qilei_counts).sort((qilei_first, qilei_second) => qilei_second[1] - qilei_first[1])[0]?.[0] || "—";
    qilei_elements.historyEmpty.classList.toggle("hidden", qilei_history.length !== 0);
    qilei_elements.clearHistory.disabled = qilei_history.length === 0;
    for (const qilei_record of qilei_history) {
      const qilei_row = document.createElement("tr"); // qilei_row：当前历史记录表格行。
      for (const qilei_text of [qilei_record.game_name, qilei_format_date(qilei_record.opened_at), qilei_format_date(qilei_record.finished_at)]) { const qilei_cell = document.createElement("td"); qilei_cell.textContent = qilei_text; qilei_row.append(qilei_cell); }
      const qilei_result_cell = document.createElement("td"); // qilei_result_cell：历史结果单元格。
      const qilei_pill = document.createElement("span"); // qilei_pill：带颜色的结果标签。
      qilei_pill.className = `status-pill${qilei_record.finished_at ? "" : " playing"}`;
      qilei_pill.textContent = qilei_record.result;
      qilei_result_cell.append(qilei_pill);
      qilei_row.append(qilei_result_cell);
      const qilei_action_cell = document.createElement("td"); // qilei_action_cell：当前记录的删除操作单元格。
      const qilei_delete_button = document.createElement("button"); // qilei_delete_button：打开删除确认窗口的按钮。
      qilei_delete_button.type = "button";
      qilei_delete_button.className = "history-delete-button";
      qilei_delete_button.textContent = "删除";
      qilei_delete_button.addEventListener("click", () => qilei_open_history_delete(qilei_record.id, qilei_record.game_name));
      qilei_action_cell.append(qilei_delete_button);
      qilei_row.append(qilei_action_cell);
      qilei_elements.historyBody.append(qilei_row);
    }
  } catch (qilei_error) { qilei_toast(qilei_error.message); }
}

// qilei_open_history_delete：打开单条或全部历史记录的删除确认窗口。
function qilei_open_history_delete(qilei_record_id, qilei_game_name = "") {
  qilei_history_delete_target = qilei_record_id;
  const qilei_delete_all = qilei_record_id === ""; // qilei_delete_all：当前操作是否清空全部历史。
  qilei_elements.historyDeleteTitle.textContent = qilei_delete_all ? "删除全部历史记录" : `删除${qilei_game_name}记录`;
  qilei_elements.historyDeleteMessage.textContent = qilei_delete_all
    ? "确认删除当前用户的全部历史记录？删除后会立即清空该用户 result 文件夹中的全部单局文件。"
    : "确认删除这条历史记录？删除后会立即移除该用户 result 文件夹中的对应单局文件。";
  qilei_elements.historyDeleteDialog.classList.remove("hidden");
  qilei_elements.historyDeleteConfirm.focus();
}

// qilei_close_history_delete：关闭历史记录删除确认窗口。
function qilei_close_history_delete() {
  qilei_elements.historyDeleteDialog.classList.add("hidden");
  qilei_history_delete_target = null;
}

// qilei_confirm_history_delete：调用 Python 接口并刷新页面中的历史统计。
async function qilei_confirm_history_delete() {
  if (qilei_history_delete_target === null) return;
  try {
    if (qilei_history_delete_target === "") {
      await qilei_api.clearHistory();
    } else {
      await qilei_api.deleteHistory(qilei_history_delete_target);
    }
    qilei_close_history_delete();
    await qilei_load_history();
    qilei_toast("对应单局文件已从 data 同步删除");
  } catch (qilei_error) {
    qilei_toast(qilei_error.message);
  }
}

// qilei_handle_profile_password：校验并提交当前用户的密码修改表单。
async function qilei_handle_profile_password(qilei_event) {
  qilei_event.preventDefault();
  const qilei_current_password = qilei_elements.profileCurrentPassword.value.trim(); // qilei_current_password：用户填写的当前密码。
  const qilei_new_password = qilei_elements.profileNewPassword.value.trim(); // qilei_new_password：用户填写的新密码。
  const qilei_confirm_password = qilei_elements.profileConfirmPassword.value.trim(); // qilei_confirm_password：用户再次填写的新密码。
  if (![qilei_current_password, qilei_new_password, qilei_confirm_password].every(qilei_value => /^\d{1,32}$/.test(qilei_value))) {
    qilei_elements.profilePasswordError.textContent = "三项密码均只能输入 1 至 32 位数字。";
    return;
  }
  if (qilei_new_password !== qilei_confirm_password) {
    qilei_elements.profilePasswordError.textContent = "两次输入的新密码不一致。";
    return;
  }
  const qilei_submit = qilei_event.submitter; // qilei_submit：当前个人改密表单的提交按钮。
  if (qilei_submit) qilei_submit.disabled = true;
  qilei_elements.profilePasswordError.textContent = "";
  try {
    const qilei_response = await qilei_api.changePassword(qilei_current_password, qilei_new_password); // qilei_response：后端返回的改密结果。
    qilei_elements.profilePasswordForm.reset();
    qilei_toast(qilei_response.message || "密码修改成功");
  } catch (qilei_error) {
    qilei_elements.profilePasswordError.textContent = qilei_error.message;
  } finally {
    if (qilei_submit) qilei_submit.disabled = false;
  }
}

// qilei_handle_admin_create：让管理员新增纯数字普通用户。
async function qilei_handle_admin_create(qilei_event) {
  qilei_event.preventDefault();
  const qilei_username = qilei_elements.adminCreateUsername.value.trim(); // qilei_username：管理员填写的新用户名。
  const qilei_password = qilei_elements.adminCreatePassword.value.trim(); // qilei_password：管理员填写的初始密码。
  if (!/^\d{1,18}$/.test(qilei_username) || !/^\d{1,32}$/.test(qilei_password)) {
    qilei_elements.adminCreateError.textContent = "用户名为 1 至 18 位数字，密码为 1 至 32 位数字。";
    return;
  }
  const qilei_submit = qilei_event.submitter; // qilei_submit：当前新增用户表单的提交按钮。
  if (qilei_submit) qilei_submit.disabled = true;
  qilei_elements.adminCreateError.textContent = "";
  try {
    const qilei_response = await qilei_api.adminCreateUser(qilei_username, qilei_password); // qilei_response：新增用户接口结果。
    qilei_elements.adminCreateForm.reset();
    await qilei_load_admin();
    qilei_toast(qilei_response.message || "用户新增成功");
  } catch (qilei_error) {
    qilei_elements.adminCreateError.textContent = qilei_error.message;
  } finally {
    if (qilei_submit) qilei_submit.disabled = false;
  }
}

// qilei_open_admin_password：打开指定用户的管理员改密窗口。
function qilei_open_admin_password(qilei_username) {
  qilei_admin_password_target = qilei_username;
  qilei_elements.adminPasswordTitle.textContent = `修改用户 ${qilei_username} 的密码`;
  qilei_elements.adminPasswordInput.value = "";
  qilei_elements.adminPasswordError.textContent = "";
  qilei_elements.adminPasswordDialog.classList.remove("hidden");
  qilei_elements.adminPasswordInput.focus();
}

// qilei_close_admin_password：关闭管理员改密窗口并清除目标。
function qilei_close_admin_password() {
  qilei_admin_password_target = null;
  qilei_elements.adminPasswordDialog.classList.add("hidden");
  qilei_elements.adminPasswordInput.value = "";
  qilei_elements.adminPasswordError.textContent = "";
}

// qilei_confirm_admin_password：提交管理员为指定用户设置的新密码。
async function qilei_confirm_admin_password() {
  if (!qilei_admin_password_target) return;
  const qilei_password = qilei_elements.adminPasswordInput.value.trim(); // qilei_password：管理员设置的新密码。
  if (!/^\d{1,32}$/.test(qilei_password)) {
    qilei_elements.adminPasswordError.textContent = "新密码只能输入 1 至 32 位数字。";
    return;
  }
  qilei_elements.adminPasswordConfirm.disabled = true;
  try {
    const qilei_response = await qilei_api.adminChangePassword(qilei_admin_password_target, qilei_password); // qilei_response：管理员改密接口结果。
    qilei_close_admin_password();
    qilei_toast(qilei_response.message || "用户密码修改成功");
  } catch (qilei_error) {
    qilei_elements.adminPasswordError.textContent = qilei_error.message;
  } finally {
    qilei_elements.adminPasswordConfirm.disabled = false;
  }
}

// qilei_open_admin_delete：打开普通用户删除确认窗口。
function qilei_open_admin_delete(qilei_username) {
  qilei_admin_delete_target = qilei_username;
  qilei_elements.adminDeleteTitle.textContent = `删除用户 ${qilei_username}`;
  qilei_elements.adminDeleteMessage.textContent = `确认删除用户 ${qilei_username}？该用户 data 文件夹中的账号、存档和历史记录会一并删除。`;
  qilei_elements.adminDeleteDialog.classList.remove("hidden");
  qilei_elements.adminDeleteConfirm.focus();
}

// qilei_close_admin_delete：关闭用户删除确认窗口并清除目标。
function qilei_close_admin_delete() {
  qilei_admin_delete_target = null;
  qilei_elements.adminDeleteDialog.classList.add("hidden");
}

// qilei_confirm_admin_delete：删除用户文件夹并刷新管理员列表。
async function qilei_confirm_admin_delete() {
  if (!qilei_admin_delete_target) return;
  qilei_elements.adminDeleteConfirm.disabled = true;
  try {
    const qilei_response = await qilei_api.adminDeleteUser(qilei_admin_delete_target); // qilei_response：删除用户接口结果。
    qilei_close_admin_delete();
    await qilei_load_admin();
    qilei_toast(qilei_response.message || "用户已删除");
  } catch (qilei_error) {
    qilei_toast(qilei_error.message);
  } finally {
    qilei_elements.adminDeleteConfirm.disabled = false;
  }
}

// qilei_load_admin：仅为管理员读取账号概览并安全写入表格。
async function qilei_load_admin() {
  if (!qilei_current_user?.is_admin) return;
  try {
    const { users: qilei_users } = await qilei_api.adminUsers(); // qilei_users：后端汇总的本地账号信息。
    qilei_elements.adminBody.replaceChildren();
    for (const qilei_user of qilei_users) {
      const qilei_row = document.createElement("tr"); // qilei_row：当前账号信息表格行。
      for (const qilei_text of [qilei_user.username, qilei_user.is_admin ? "管理员" : "普通用户", qilei_format_date(qilei_user.created_at), String(qilei_user.opened_games), String(qilei_user.completed_games)]) { const qilei_cell = document.createElement("td"); qilei_cell.textContent = qilei_text; qilei_row.append(qilei_cell); }
      const qilei_action_cell = document.createElement("td"); // qilei_action_cell：当前账号的管理员操作单元格。
      const qilei_actions = document.createElement("div"); // qilei_actions：修改密码和删除按钮容器。
      qilei_actions.className = "admin-actions";
      const qilei_password_button = document.createElement("button"); // qilei_password_button：打开当前账号改密窗口的按钮。
      qilei_password_button.type = "button";
      qilei_password_button.className = "admin-action-button";
      qilei_password_button.textContent = "修改密码";
      qilei_password_button.addEventListener("click", () => qilei_open_admin_password(qilei_user.username));
      const qilei_delete_button = document.createElement("button"); // qilei_delete_button：删除当前普通账号的按钮。
      qilei_delete_button.type = "button";
      qilei_delete_button.className = "admin-action-button danger";
      qilei_delete_button.textContent = "删除";
      qilei_delete_button.disabled = qilei_user.is_admin;
      qilei_delete_button.title = qilei_user.is_admin ? "内置管理员不能删除" : `删除用户 ${qilei_user.username}`;
      qilei_delete_button.addEventListener("click", () => qilei_open_admin_delete(qilei_user.username));
      qilei_actions.append(qilei_password_button, qilei_delete_button);
      qilei_action_cell.append(qilei_actions);
      qilei_row.append(qilei_action_cell);
      qilei_elements.adminBody.append(qilei_row);
    }
  } catch (qilei_error) { qilei_toast(qilei_error.message); }
}

qilei_elements.loginTab.addEventListener("click", () => qilei_switch_auth_mode("login"));
qilei_elements.registerTab.addEventListener("click", () => qilei_switch_auth_mode("register"));
qilei_elements.authForm.addEventListener("submit", qilei_handle_auth);
qilei_elements.logoutButton.addEventListener("click", async () => { try { await qilei_api.logout(); } finally { qilei_leave_app(); } });
qilei_elements.backLobby.addEventListener("click", () => { qilei_destroy_current_game(); qilei_show_view("lobby"); });
qilei_elements.settingBack.addEventListener("click", () => { qilei_pending_game_meta = null; qilei_show_view("lobby"); });
qilei_elements.settingStart.addEventListener("click", qilei_start_selected_game);
qilei_elements.continueButton.addEventListener("click", () => qilei_open_game_choice(qilei_last_game_id));
qilei_elements.gameChoiceNew.addEventListener("click", qilei_begin_new_game);
qilei_elements.gameChoiceLoad.addEventListener("click", qilei_begin_load_game);
qilei_elements.gameChoiceCancel.addEventListener("click", qilei_close_game_choice);
qilei_elements.gameChoiceDialog.addEventListener("click", qilei_event => { if (qilei_event.target === qilei_elements.gameChoiceDialog) qilei_close_game_choice(); });
qilei_elements.gameResign?.addEventListener("click", async () => {
  await qilei_finish_game("用户投降");
  qilei_destroy_current_game();
  qilei_show_view("lobby");
});
qilei_elements.refreshHistory.addEventListener("click", qilei_load_history);
qilei_elements.clearHistory.addEventListener("click", () => qilei_open_history_delete(""));
qilei_elements.historyDeleteConfirm.addEventListener("click", qilei_confirm_history_delete);
qilei_elements.historyDeleteCancel.addEventListener("click", qilei_close_history_delete);
qilei_elements.historyDeleteDialog.addEventListener("click", qilei_event => { if (qilei_event.target === qilei_elements.historyDeleteDialog) qilei_close_history_delete(); });
qilei_elements.profilePasswordForm.addEventListener("submit", qilei_handle_profile_password);
qilei_elements.adminCreateForm.addEventListener("submit", qilei_handle_admin_create);
qilei_elements.adminPasswordConfirm.addEventListener("click", qilei_confirm_admin_password);
qilei_elements.adminPasswordCancel.addEventListener("click", qilei_close_admin_password);
qilei_elements.adminPasswordDialog.addEventListener("click", qilei_event => { if (qilei_event.target === qilei_elements.adminPasswordDialog) qilei_close_admin_password(); });
qilei_elements.adminDeleteConfirm.addEventListener("click", qilei_confirm_admin_delete);
qilei_elements.adminDeleteCancel.addEventListener("click", qilei_close_admin_delete);
qilei_elements.adminDeleteDialog.addEventListener("click", qilei_event => { if (qilei_event.target === qilei_elements.adminDeleteDialog) qilei_close_admin_delete(); });
qilei_elements.refreshAdmin.addEventListener("click", qilei_load_admin);
document.querySelectorAll(".nav-button").forEach(qilei_button => qilei_button.addEventListener("click", () => { qilei_destroy_current_game(); qilei_show_view(qilei_button.dataset.view); }));
document.querySelector(".sidebar-brand").addEventListener("click", qilei_event => { qilei_event.preventDefault(); qilei_destroy_current_game(); qilei_show_view("lobby"); });

// qilei_handle_keyboard：复刻设置页方向键以及游戏内 H/U/N/P/R/Esc 快捷键。
function qilei_handle_keyboard(qilei_event) {
  if (!qilei_elements.gameChoiceDialog.classList.contains("hidden")) {
    if (qilei_event.key === "Escape") {
      qilei_event.preventDefault();
      qilei_close_game_choice();
    }
    return;
  }
  if (!qilei_elements.historyDeleteDialog.classList.contains("hidden")) {
    if (qilei_event.key === "Escape") {
      qilei_event.preventDefault();
      qilei_close_history_delete();
    }
    return;
  }
  if (!qilei_elements.adminPasswordDialog.classList.contains("hidden")) {
    if (qilei_event.key === "Escape") {
      qilei_event.preventDefault();
      qilei_close_admin_password();
    } else if (qilei_event.key === "Enter") {
      qilei_event.preventDefault();
      qilei_confirm_admin_password();
    }
    return;
  }
  if (!qilei_elements.adminDeleteDialog.classList.contains("hidden")) {
    if (qilei_event.key === "Escape") {
      qilei_event.preventDefault();
      qilei_close_admin_delete();
    } else if (qilei_event.key === "Enter") {
      qilei_event.preventDefault();
      qilei_confirm_admin_delete();
    }
    return;
  }
  if (!qilei_elements.settingView.classList.contains("hidden")) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(qilei_event.key)) {
      qilei_event.preventDefault();
      qilei_adjust_setting(qilei_event.key);
    } else if (qilei_event.key === "Enter") {
      qilei_event.preventDefault();
      qilei_start_selected_game();
    } else if (qilei_event.key === "Escape") {
      qilei_event.preventDefault();
      qilei_pending_game_meta = null;
      qilei_show_view("lobby");
    }
    return;
  }
  if (!qilei_elements.appView.classList.contains("hidden") && !qilei_elements.lobbyView.classList.contains("hidden")) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(qilei_event.key)) {
      qilei_event.preventDefault();
      const qilei_delta = qilei_event.key === "ArrowLeft" ? -1 : (qilei_event.key === "ArrowRight" ? 1 : (qilei_event.key === "ArrowUp" ? -3 : 3)); // qilei_delta：三列大厅中方向键对应的卡片偏移。
      qilei_focus_lobby_card(qilei_lobby_focus + qilei_delta);
      return;
    }
    if (qilei_event.key === "Enter") {
      const qilei_card = qilei_elements.gameGrid.querySelectorAll(".game-card")[qilei_lobby_focus]; // qilei_card：回车将要进入的棋类卡片。
      if (qilei_card) { qilei_event.preventDefault(); qilei_card.click(); }
      return;
    }
  }
  if (qilei_elements.gameView.classList.contains("hidden")) return;
  if (qilei_event.key === "Escape") {
    qilei_event.preventDefault();
    qilei_elements.backLobby.click();
    return;
  }
  if (qilei_current_game?.handleShortcut?.(qilei_event.key.toLowerCase())) {
    qilei_event.preventDefault();
    return;
  }
  const qilei_shortcuts = { u: "悔棋", n: "重开" }; // qilei_shortcuts：统一保留的快捷键与按钮文字前缀。
  const qilei_prefix = qilei_shortcuts[qilei_event.key.toLowerCase()]; // qilei_prefix：当前按键需要触发的操作文字。
  if (!qilei_prefix) return;
  qilei_event.preventDefault();
  const qilei_button = [...qilei_elements.gameControls.querySelectorAll("button"), ...qilei_elements.gameSystemControls.querySelectorAll("button")]
    .find(qilei_item => qilei_item.textContent.startsWith(qilei_prefix)); // qilei_button：匹配当前快捷键的可见按钮。
  qilei_button?.click();
}

document.addEventListener("keydown", qilei_handle_keyboard);

// qilei_before_unload：关闭网页时使用 keepalive 请求尽力保存最后状态。
function qilei_before_unload() {
  if (!qilei_current_game?.getState || !qilei_current_game_meta) return;
  fetch(`/api/games/${qilei_current_game_meta.id}/state`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record_id: qilei_current_record_id, state: qilei_current_game.getState() }), keepalive: true }).catch(() => {});
}

window.addEventListener("beforeunload", qilei_before_unload);
qilei_render_game_cards();
qilei_api.session().then(qilei_response => { if (qilei_response.user) qilei_enter_app(qilei_response.user); }).catch(() => {});
