// qilei_api.js：网站前端访问 Python 后端的统一接口封装。

// qilei_request：发送同源请求、解析 JSON，并把后端错误转换为 JavaScript 异常。
async function qilei_request(qilei_path, qilei_options = {}) {
  const qilei_settings = { credentials: "same-origin", ...qilei_options }; // qilei_settings：传给 fetch 的完整请求设置。
  qilei_settings.headers = { ...(qilei_options.body ? { "Content-Type": "application/json" } : {}), ...(qilei_options.headers || {}) };
  const qilei_response = await fetch(qilei_path, qilei_settings); // qilei_response：后端返回的 HTTP 响应。
  let qilei_value; // qilei_value：后端响应解析后的 JSON 对象。
  try { qilei_value = await qilei_response.json(); }
  catch { qilei_value = { ok: false, message: "服务器返回格式错误。" }; }
  if (!qilei_response.ok || qilei_value.ok === false) {
    const qilei_error = new Error(qilei_value.message || `请求失败（${qilei_response.status}）`); // qilei_error：携带 HTTP 状态的前端异常。
    qilei_error.status = qilei_response.status;
    throw qilei_error;
  }
  return qilei_value;
}

// qilei_api：登录、注册、用户历史、管理员和六种棋存档接口集合。
export const qilei_api = {
  session: () => qilei_request("/api/session"),
  login: (qilei_username, qilei_password) => qilei_request("/api/login", { method: "POST", body: JSON.stringify({ username: qilei_username, password: qilei_password }) }),
  register: (qilei_username, qilei_password) => qilei_request("/api/register", { method: "POST", body: JSON.stringify({ username: qilei_username, password: qilei_password }) }),
  logout: () => qilei_request("/api/logout", { method: "POST" }),
  history: () => qilei_request("/api/history"),
  deleteHistory: qilei_record_id => qilei_request(`/api/history/${qilei_record_id}`, { method: "DELETE" }),
  clearHistory: () => qilei_request("/api/history", { method: "DELETE" }),
  changePassword: (qilei_current_password, qilei_new_password) => qilei_request("/api/account/password", { method: "POST", body: JSON.stringify({ current_password: qilei_current_password, new_password: qilei_new_password }) }),
  adminUsers: () => qilei_request("/api/admin/users"),
  adminCreateUser: (qilei_username, qilei_password) => qilei_request("/api/admin/users", { method: "POST", body: JSON.stringify({ username: qilei_username, password: qilei_password }) }),
  adminChangePassword: (qilei_username, qilei_password) => qilei_request(`/api/admin/users/${qilei_username}/password`, { method: "PUT", body: JSON.stringify({ password: qilei_password }) }),
  adminDeleteUser: qilei_username => qilei_request(`/api/admin/users/${qilei_username}`, { method: "DELETE" }),
  gameState: qilei_game_id => qilei_request(`/api/games/${qilei_game_id}/state`),
  startGame: (qilei_game_id, qilei_mode) => qilei_request(`/api/games/${qilei_game_id}/start`, { method: "POST", body: JSON.stringify({ mode: qilei_mode }) }),
  engineMove: (qilei_game_id, qilei_position, qilei_level) => qilei_request(`/api/games/${qilei_game_id}/engine-move`, { method: "POST", body: JSON.stringify({ position: qilei_position, level: qilei_level }) }),
  saveState: (qilei_game_id, qilei_record_id, qilei_state) => qilei_request(`/api/games/${qilei_game_id}/state`, { method: "PUT", body: JSON.stringify({ record_id: qilei_record_id, state: qilei_state }) }),
  deleteState: (qilei_game_id, qilei_record_id) => qilei_request(`/api/games/${qilei_game_id}/state/${qilei_record_id}`, { method: "DELETE" }),
  finishGame: (qilei_game_id, qilei_record_id, qilei_result) => qilei_request(`/api/games/${qilei_game_id}/finish`, { method: "POST", body: JSON.stringify({ record_id: qilei_record_id, result: qilei_result }) }),
};
