// feixingqi_game.js：按 C++ 左侧六边形地图、右侧设置/操作区实现二至六人飞行棋。

import {
  qilei_clamp,
  qilei_canvas_point,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
} from "./qilei_game_utils.js";

const feixingqi_max_players = 6; // feixingqi_max_players：C++ 支持的最大玩家数量。
const feixingqi_track_count = 60; // feixingqi_track_count：六边形公共跑道格数。
const feixingqi_finish_count = 6; // feixingqi_finish_count：每名玩家的终点列格数。
const feixingqi_complete_position = feixingqi_track_count + feixingqi_finish_count; // feixingqi_complete_position：棋子进入停车区后的完成位置。
const feixingqi_colors = ["#dc3e3e", "#3772d2", "#36a858", "#e4b22d", "#9753cc", "#ef8038"]; // feixingqi_colors：六支队伍的 C++ 主色。
const feixingqi_names = ["红队", "蓝队", "绿队", "黄队", "紫队", "橙队"]; // feixingqi_names：六支队伍名称。

// feixingqi_initial_state：创建直接显示在左右分区游戏窗口中的初始设置状态。
function feixingqi_initial_state() {
  return {
    version: 2,
    phase: "setup",
    settings: { playerCount: 4, pieceCount: 4, robotCount: 3, stepSeconds: 30, totalSeconds: 600 },
    players: [],
    side: 0,
    dice: 0,
    rolled: false,
    selectedPiece: -1,
    moves: 0,
    over: false,
    winner: -1,
    stepRemaining: 30,
    totalRemaining: [],
    drawValues: [],
    drawn: 0,
    turnOrder: [],
    eliminated: [],
    eliminationOrder: [],
    eliminatedFinished: [],
    completed: [],
    rankings: [],
    jumpActive: false,
    jumpFrom: -1,
    jumpTo: -1,
    jumpOwner: -1,
  };
}

// feixingqi_valid_state：只接受新版二至六人六边形飞行棋存档。
function feixingqi_valid_state(feixingqi_value) {
  return Boolean(
    feixingqi_value
    && feixingqi_value.version === 2
    && feixingqi_value.settings
    && Number.isInteger(feixingqi_value.settings.playerCount)
    && feixingqi_value.settings.playerCount >= 2
    && feixingqi_value.settings.playerCount <= feixingqi_max_players
    && Array.isArray(feixingqi_value.players),
  );
}

// feixingqi_restore_state：读取新版存档，并把旧版四人环道存档无损升级到新版左右分区结构。
function feixingqi_restore_state(feixingqi_value) {
  if (feixingqi_valid_state(feixingqi_value)) {
    const feixingqi_restored = qilei_deep_copy(feixingqi_value); // feixingqi_restored：补齐旧网页存档计时字段后的当前状态。
    feixingqi_restored.stepRemaining = Number.isFinite(feixingqi_restored.stepRemaining) ? feixingqi_restored.stepRemaining : feixingqi_restored.settings.stepSeconds;
    feixingqi_restored.totalRemaining = Array.isArray(feixingqi_restored.totalRemaining) && feixingqi_restored.totalRemaining.length === feixingqi_restored.settings.playerCount
      ? feixingqi_restored.totalRemaining
      : Array(feixingqi_restored.settings.playerCount).fill(feixingqi_restored.settings.totalSeconds);
    feixingqi_restored.drawValues = Array.isArray(feixingqi_restored.drawValues)
      ? feixingqi_restored.drawValues
      : Array(feixingqi_restored.settings.playerCount).fill(0);
    feixingqi_restored.drawn = Number.isInteger(feixingqi_restored.drawn) ? feixingqi_restored.drawn : 0;
    feixingqi_restored.turnOrder = Array.isArray(feixingqi_restored.turnOrder) ? feixingqi_restored.turnOrder : [];
    feixingqi_restored.eliminated = Array.isArray(feixingqi_restored.eliminated) && feixingqi_restored.eliminated.length === feixingqi_restored.settings.playerCount
      ? feixingqi_restored.eliminated
      : Array(feixingqi_restored.settings.playerCount).fill(false);
    feixingqi_restored.eliminationOrder = Array.isArray(feixingqi_restored.eliminationOrder) ? feixingqi_restored.eliminationOrder : [];
    feixingqi_restored.eliminatedFinished = Array.isArray(feixingqi_restored.eliminatedFinished) && feixingqi_restored.eliminatedFinished.length === feixingqi_restored.settings.playerCount
      ? feixingqi_restored.eliminatedFinished
      : Array(feixingqi_restored.settings.playerCount).fill(0);
    feixingqi_restored.completed = Array.isArray(feixingqi_restored.completed) && feixingqi_restored.completed.length === feixingqi_restored.settings.playerCount
      ? feixingqi_restored.completed
      : Array(feixingqi_restored.settings.playerCount).fill(false);
    feixingqi_restored.rankings = Array.isArray(feixingqi_restored.rankings) ? feixingqi_restored.rankings : [];
    feixingqi_restored.jumpActive = Boolean(feixingqi_restored.jumpActive);
    feixingqi_restored.jumpFrom = Number.isInteger(feixingqi_restored.jumpFrom) ? feixingqi_restored.jumpFrom : -1;
    feixingqi_restored.jumpTo = Number.isInteger(feixingqi_restored.jumpTo) ? feixingqi_restored.jumpTo : -1;
    feixingqi_restored.jumpOwner = Number.isInteger(feixingqi_restored.jumpOwner) ? feixingqi_restored.jumpOwner : -1;
    const feixingqi_start_cells = new Set(Array.from(
      { length: feixingqi_restored.settings.playerCount },
      (_, feixingqi_owner) => feixingqi_start_cell(feixingqi_owner, feixingqi_restored.settings.playerCount),
    )); // feixingqi_start_cells：读取旧存档时用于排除飞跃的全部队伍起点。
    if (feixingqi_start_cells.has(feixingqi_restored.jumpFrom)) {
      feixingqi_restored.jumpActive = false;
      feixingqi_restored.jumpFrom = -1;
      feixingqi_restored.jumpTo = -1;
      feixingqi_restored.jumpOwner = -1;
    }
    return feixingqi_restored;
  }
  if (feixingqi_value && Array.isArray(feixingqi_value.players) && feixingqi_value.players.length >= 2 && feixingqi_value.players.length <= feixingqi_max_players) {
    const feixingqi_player_count = feixingqi_value.players.length; // feixingqi_player_count：旧存档玩家数量。
    const feixingqi_piece_count = Math.max(2, Math.min(6, feixingqi_value.players[0]?.length || 4)); // feixingqi_piece_count：旧存档每队棋子数量。
    return {
      version: 2,
      phase: feixingqi_value.over ? "over" : (feixingqi_value.rolled ? "select" : "roll"),
      settings: { playerCount: feixingqi_player_count, pieceCount: feixingqi_piece_count, robotCount: Math.max(0, feixingqi_player_count - 1), stepSeconds: 30, totalSeconds: 600 },
      players: qilei_deep_copy(feixingqi_value.players),
      side: Number.isInteger(feixingqi_value.side) ? feixingqi_value.side : 0,
      dice: Number(feixingqi_value.dice) || 0,
      rolled: Boolean(feixingqi_value.rolled),
      selectedPiece: -1,
      moves: Number(feixingqi_value.moves) || 0,
      over: Boolean(feixingqi_value.over),
      winner: Number.isInteger(feixingqi_value.winner) ? feixingqi_value.winner : -1,
      stepRemaining: 30,
      totalRemaining: Array(feixingqi_player_count).fill(600),
      drawValues: Array(feixingqi_player_count).fill(0),
      drawn: feixingqi_player_count,
      turnOrder: Array.from({ length: feixingqi_player_count }, (_, feixingqi_owner) => feixingqi_owner),
      eliminated: Array(feixingqi_player_count).fill(false),
      eliminationOrder: [],
      eliminatedFinished: Array(feixingqi_player_count).fill(0),
      completed: Array(feixingqi_player_count).fill(false),
      rankings: [],
      jumpActive: false,
      jumpFrom: -1,
      jumpTo: -1,
      jumpOwner: -1,
    };
  }
  return feixingqi_initial_state();
}

// feixingqi_start_cell：返回指定队伍在六十格跑道上的起点。
function feixingqi_start_cell(feixingqi_owner, feixingqi_player_count) {
  return Math.floor(feixingqi_owner * feixingqi_track_count / feixingqi_player_count);
}

// feixingqi_public_cell：把一枚棋子的相对跑道进度转换为公共格号。
function feixingqi_public_cell(feixingqi_owner, feixingqi_position, feixingqi_player_count) {
  return (feixingqi_start_cell(feixingqi_owner, feixingqi_player_count) + feixingqi_position) % feixingqi_track_count;
}

// feixingqi_progress_score：计算一名玩家全部棋子的累计推进分。
function feixingqi_progress_score(feixingqi_pieces) {
  return feixingqi_pieces.reduce(
    (feixingqi_total, feixingqi_position) => feixingqi_total + Math.max(0, feixingqi_position),
    0,
  );
}

// feixingqi_is_robot：判断指定编号是否属于设置中靠后的机器人队伍。
function feixingqi_is_robot(feixingqi_state, feixingqi_owner) {
  return feixingqi_owner >= feixingqi_state.settings.playerCount - feixingqi_state.settings.robotCount;
}

// feixingqi_can_move：判断指定棋子能否按当前骰子移动。
function feixingqi_can_move(feixingqi_state, feixingqi_owner, feixingqi_piece_index) {
  if (feixingqi_state.eliminated?.[feixingqi_owner] || feixingqi_state.completed?.[feixingqi_owner]) return false;
  const feixingqi_position = feixingqi_state.players[feixingqi_owner]?.[feixingqi_piece_index]; // feixingqi_position：待判断棋子的相对进度。
  if (!feixingqi_state.rolled || !Number.isInteger(feixingqi_position)) return false;
  if (feixingqi_position < 0) return feixingqi_state.dice === 6;
  if (feixingqi_position >= feixingqi_complete_position) return false;
  return feixingqi_position + feixingqi_state.dice <= feixingqi_complete_position;
}

// feixingqi_active_owners：返回仍在对局中的队伍编号。
function feixingqi_active_owners(feixingqi_state) {
  return Array.from({ length: feixingqi_state.settings.playerCount }, (_, feixingqi_owner) => feixingqi_owner)
    .filter(feixingqi_owner => !feixingqi_state.eliminated?.[feixingqi_owner] && !feixingqi_state.completed?.[feixingqi_owner]);
}

// feixingqi_next_active_owner：从当前队伍之后寻找下一支仍在对局中的队伍。
function feixingqi_next_active_owner(feixingqi_state, feixingqi_owner) {
  for (let feixingqi_offset = 1; feixingqi_offset <= feixingqi_state.settings.playerCount; feixingqi_offset += 1) {
    const feixingqi_candidate = (feixingqi_owner + feixingqi_offset) % feixingqi_state.settings.playerCount; // feixingqi_candidate：按行动顺序检查的候选队伍。
    if (!feixingqi_state.eliminated?.[feixingqi_candidate] && !feixingqi_state.completed?.[feixingqi_candidate]) return feixingqi_candidate;
  }
  return feixingqi_owner;
}

// feixingqi_rank_of：返回正常完成玩家或最后剩余玩家的当前名次。
function feixingqi_rank_of(feixingqi_state, feixingqi_owner) {
  const feixingqi_index = (feixingqi_state.rankings || []).indexOf(feixingqi_owner); // feixingqi_index：玩家在正常排名数组中的位置。
  return feixingqi_index >= 0 ? feixingqi_index + 1 : 0;
}

// feixingqi_eliminated_ranking：按判负时完成比例排序，比例相同时后判负者靠前。
function feixingqi_eliminated_ranking(feixingqi_state) {
  return [...(feixingqi_state.eliminationOrder || [])].sort((feixingqi_left, feixingqi_right) => {
    const feixingqi_left_finished = feixingqi_state.eliminatedFinished?.[feixingqi_left] || 0; // feixingqi_left_finished：左侧判负玩家的固定完成数。
    const feixingqi_right_finished = feixingqi_state.eliminatedFinished?.[feixingqi_right] || 0; // feixingqi_right_finished：右侧判负玩家的固定完成数。
    if (feixingqi_left_finished !== feixingqi_right_finished) return feixingqi_right_finished - feixingqi_left_finished;
    return feixingqi_state.eliminationOrder.indexOf(feixingqi_right) - feixingqi_state.eliminationOrder.indexOf(feixingqi_left);
  });
}

// feixingqi_eliminated_rank：返回一名超时出局玩家当前占用的末尾名次。
function feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner) {
  const feixingqi_order = feixingqi_eliminated_ranking(feixingqi_state); // feixingqi_order：当前末尾名次顺序。
  const feixingqi_index = feixingqi_order.indexOf(feixingqi_owner); // feixingqi_index：玩家在末尾名次顺序中的位置。
  return feixingqi_index < 0 ? 0 : feixingqi_state.settings.playerCount - feixingqi_order.length + 1 + feixingqi_index;
}

// feixingqi_movable_pieces：返回一名玩家当前全部可移动棋子下标。
function feixingqi_movable_pieces(feixingqi_state, feixingqi_owner = feixingqi_state.side) {
  return (feixingqi_state.players[feixingqi_owner] || [])
    .map((_, feixingqi_piece_index) => feixingqi_piece_index)
    .filter(feixingqi_piece_index => feixingqi_can_move(feixingqi_state, feixingqi_owner, feixingqi_piece_index));
}

// feixingqi_predict：用第一名玩家与其余玩家最高进度生成两侧胜负预测。
function feixingqi_predict(feixingqi_state) {
  if (feixingqi_state.moves === 0) return { first: 50, second: 50, summary: "开局各队机会均等" };
  if (feixingqi_state.over) return feixingqi_state.winner === 0
    ? { first: 100, second: 0, summary: "红队率先完成全部棋子" }
    : { first: 0, second: 100, summary: `${feixingqi_names[feixingqi_state.winner]}率先完成` };
  const feixingqi_first_score = feixingqi_progress_score(feixingqi_state.players[0] || []); // feixingqi_first_score：红队累计推进分。
  const feixingqi_other_score = Math.max(0, ...feixingqi_state.players.slice(1).map(feixingqi_progress_score)); // feixingqi_other_score：其余队伍最高推进分。
  const feixingqi_first_percent = Math.round(qilei_clamp(50 + (feixingqi_first_score - feixingqi_other_score) * .28, 5, 95)); // feixingqi_first_percent：红队预测百分比。
  return {
    first: feixingqi_first_percent,
    second: 100 - feixingqi_first_percent,
    summary: Math.abs(feixingqi_first_percent - 50) < 6 ? "各队进度接近" : (feixingqi_first_percent > 50 ? "红队暂时领先" : "其他队伍暂时领先"),
  };
}

// feixingqi_create_game：创建始终保持左侧地图、右侧设置或操作区的飞行棋实例。
export function feixingqi_create_game({ boardHost: feixingqi_board_host, controlsHost: feixingqi_controls_host, savedState: feixingqi_saved_state, services: feixingqi_services }) {
  const { canvas: feixingqi_canvas, context: feixingqi_context } = qilei_make_canvas(feixingqi_board_host, { width: 1000, height: 950 }, "六边形飞行棋地图"); // feixingqi_canvas/context：对应 C++ 左侧 1000×950 地图区。
  let feixingqi_state = feixingqi_restore_state(feixingqi_saved_state); // feixingqi_state：当前可持久化飞行棋状态，旧存档会先升级。
  let feixingqi_robot_timer = null; // feixingqi_robot_timer：机器人投骰和走棋等待计时器。
  let feixingqi_clock_timer = null; // feixingqi_clock_timer：飞行棋多玩家步时和局时刷新计时器。
  let feixingqi_panel_status = ""; // feixingqi_panel_status：右侧本次操作区域当前显示文字。
  let feixingqi_finished_reported = Boolean(feixingqi_state.over); // feixingqi_finished_reported：本局结果是否已写入历史。
  let feixingqi_setup_focus = 0; // feixingqi_setup_focus：键盘上下键当前选中的设置行。
  let feixingqi_dice_rolling = false; // feixingqi_dice_rolling：抽签或正式投骰动画是否正在播放。
  let feixingqi_dice_preview = 1; // feixingqi_dice_preview：动画当前帧显示的一至六点骰面。
  let feixingqi_dice_animation_id = 0; // feixingqi_dice_animation_id：使离开页面后的旧动画立即失效。
  let feixingqi_destroyed = false; // feixingqi_destroyed：游戏实例是否已经离开网页。
  const feixingqi_memory_history = []; // feixingqi_memory_history：网页会话内的返回上一步快照。
  const feixingqi_workspace = feixingqi_board_host.closest(".game-workspace"); // feixingqi_workspace：控制飞行棋设置/游戏阶段样式的窗口元素。

  // feixingqi_make_node：创建右侧原版信息栏使用的安全 DOM 节点。
  function feixingqi_make_node(feixingqi_tag, feixingqi_class_name = "", feixingqi_text = "") {
    const feixingqi_node = document.createElement(feixingqi_tag); // feixingqi_node：刚创建并准备写入右侧面板的节点。
    feixingqi_node.className = feixingqi_class_name;
    feixingqi_node.textContent = feixingqi_text;
    return feixingqi_node;
  }

  // feixingqi_draw_dice：按照本地 C++ 骰子框绘制白色骰面和黑色点数。
  function feixingqi_draw_dice(feixingqi_dice_canvas, feixingqi_value, feixingqi_active) {
    const feixingqi_dice_context = feixingqi_dice_canvas.getContext("2d"); // feixingqi_dice_context：骰子专用画布上下文。
    const feixingqi_safe_value = qilei_clamp(Number(feixingqi_value) || 1, 1, 6); // feixingqi_safe_value：显示范围限定在一至六点。
    feixingqi_dice_context.clearRect(0, 0, 96, 96);
    feixingqi_dice_context.fillStyle = feixingqi_active ? "rgb(237,243,251)" : "rgb(230,234,241)";
    feixingqi_dice_context.fillRect(0, 0, 96, 96);
    feixingqi_dice_context.fillStyle = "#ffffff";
    feixingqi_dice_context.strokeStyle = feixingqi_active ? "rgb(49,112,174)" : "rgb(92,104,124)";
    feixingqi_dice_context.lineWidth = 3;
    feixingqi_dice_context.fillRect(13, 13, 70, 70);
    feixingqi_dice_context.strokeRect(13, 13, 70, 70);
    const feixingqi_pip_map = {
      1: [[48, 48]],
      2: [[31, 31], [65, 65]],
      3: [[31, 31], [48, 48], [65, 65]],
      4: [[31, 31], [65, 31], [31, 65], [65, 65]],
      5: [[31, 31], [65, 31], [48, 48], [31, 65], [65, 65]],
      6: [[31, 28], [31, 48], [31, 68], [65, 28], [65, 48], [65, 68]],
    }; // feixingqi_pip_map：每个点数对应的骰点中心坐标。
    feixingqi_dice_context.fillStyle = "#171b22";
    for (const [feixingqi_pip_x, feixingqi_pip_y] of feixingqi_pip_map[feixingqi_safe_value]) {
      feixingqi_dice_context.beginPath();
      feixingqi_dice_context.arc(feixingqi_pip_x, feixingqi_pip_y, 5, 0, Math.PI * 2);
      feixingqi_dice_context.fill();
    }
  }

  // feixingqi_make_dice_control：创建与本地窗口一致的骰子框，并让点击和空格触发同一操作。
  function feixingqi_make_dice_control(feixingqi_value, feixingqi_label, feixingqi_active, feixingqi_action) {
    const feixingqi_dice_button = document.createElement("button"); // feixingqi_dice_button：右下角完整骰子控件。
    feixingqi_dice_button.type = "button";
    feixingqi_dice_button.className = `feixingqi-dice-control${feixingqi_dice_rolling ? " is-rolling" : ""}`;
    feixingqi_dice_button.disabled = !feixingqi_active;
    const feixingqi_dice_canvas = document.createElement("canvas"); // feixingqi_dice_canvas：真实绘制骰面的局部画布。
    feixingqi_dice_canvas.width = 96;
    feixingqi_dice_canvas.height = 96;
    feixingqi_dice_canvas.setAttribute("aria-hidden", "true");
    const feixingqi_dice_text = feixingqi_make_node("span", "", feixingqi_label); // feixingqi_dice_text：骰子状态说明。
    feixingqi_dice_button.append(feixingqi_dice_canvas, feixingqi_dice_text);
    if (feixingqi_active) feixingqi_dice_button.addEventListener("click", feixingqi_action);
    window.requestAnimationFrame(() => feixingqi_draw_dice(feixingqi_dice_canvas, feixingqi_value, feixingqi_active));
    return feixingqi_dice_button;
  }

  // feixingqi_wait：等待指定毫秒，用于复刻 C++ 每四十五毫秒更新一次的骰面动画。
  function feixingqi_wait(feixingqi_milliseconds) {
    return new Promise(feixingqi_resolve => window.setTimeout(feixingqi_resolve, feixingqi_milliseconds));
  }

  // feixingqi_stop_dice_animation：返回设置、悔棋或离开页面时终止未完成的骰子动画。
  function feixingqi_stop_dice_animation() {
    feixingqi_dice_animation_id += 1;
    feixingqi_dice_rolling = false;
  }

  // feixingqi_animate_dice：完全按照本地 C++ 的十二帧、每帧四十五毫秒滚动骰面。
  async function feixingqi_animate_dice(feixingqi_status) {
    if (feixingqi_dice_rolling || feixingqi_destroyed) return null;
    const feixingqi_animation_id = ++feixingqi_dice_animation_id; // feixingqi_animation_id：本次动画唯一编号。
    feixingqi_dice_rolling = true;
    feixingqi_panel_status = feixingqi_status;
    for (let feixingqi_frame = 0; feixingqi_frame < 12; feixingqi_frame += 1) {
      if (feixingqi_destroyed || feixingqi_animation_id !== feixingqi_dice_animation_id) return null;
      feixingqi_dice_preview = 1 + Math.floor(Math.random() * 6);
      feixingqi_render_controls();
      await feixingqi_wait(45);
    }
    if (feixingqi_destroyed || feixingqi_animation_id !== feixingqi_dice_animation_id) return null;
    feixingqi_dice_rolling = false;
    return feixingqi_dice_preview;
  }

  // feixingqi_format_time：把秒数格式化为 C++ 信息栏中的 mm:ss。
  function feixingqi_format_time(feixingqi_seconds) {
    const feixingqi_safe_seconds = Math.max(0, Math.floor(feixingqi_seconds || 0)); // feixingqi_safe_seconds：防止负数进入计时文字。
    return `${String(Math.floor(feixingqi_safe_seconds / 60)).padStart(2, "0")}:${String(feixingqi_safe_seconds % 60).padStart(2, "0")}`;
  }

  // feixingqi_reset_step_clock：换手后恢复当前玩家的整步时长。
  function feixingqi_reset_step_clock() {
    feixingqi_state.stepRemaining = feixingqi_state.settings.stepSeconds;
  }

  // feixingqi_start_clock：只在正式对局中扣除当前玩家自己的步时和局时。
  function feixingqi_start_clock() {
    window.clearInterval(feixingqi_clock_timer);
    feixingqi_clock_timer = window.setInterval(() => {
      if (document.hidden || !["roll", "select"].includes(feixingqi_state.phase) || feixingqi_state.over || !feixingqi_state.players.length) return;
      feixingqi_state.stepRemaining = Math.max(0, (feixingqi_state.stepRemaining ?? feixingqi_state.settings.stepSeconds) - 1);
      if (!Array.isArray(feixingqi_state.totalRemaining)) feixingqi_state.totalRemaining = Array(feixingqi_state.settings.playerCount).fill(feixingqi_state.settings.totalSeconds);
      feixingqi_state.totalRemaining[feixingqi_state.side] = Math.max(0, (feixingqi_state.totalRemaining[feixingqi_state.side] ?? feixingqi_state.settings.totalSeconds) - 1);
      const feixingqi_step_node = feixingqi_controls_host.querySelector(".feixingqi-step-clock"); // feixingqi_step_node：只更新文字而不重建按钮的步时节点。
      if (feixingqi_step_node) feixingqi_step_node.textContent = `本步剩余时间：${feixingqi_format_time(feixingqi_state.stepRemaining)} / 每步 ${feixingqi_state.settings.stepSeconds}秒`;
      feixingqi_controls_host.querySelectorAll(".feixingqi-player-clock").forEach(feixingqi_node => {
        const feixingqi_owner = Number(feixingqi_node.dataset.owner); // feixingqi_owner：当前局时文字对应的玩家编号。
        if (!Number.isInteger(feixingqi_owner) || !feixingqi_state.players[feixingqi_owner]) return;
        const feixingqi_live_finished = feixingqi_state.players[feixingqi_owner].filter(feixingqi_position => feixingqi_position >= feixingqi_complete_position).length; // feixingqi_live_finished：仍在场玩家的当前完成棋子数。
        const feixingqi_rank = feixingqi_state.eliminated?.[feixingqi_owner]
          ? feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner)
          : feixingqi_rank_of(feixingqi_state, feixingqi_owner); // feixingqi_rank：完成或出局玩家的固定显示名次。
        if (feixingqi_state.eliminated?.[feixingqi_owner]) {
          feixingqi_node.textContent = `${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""} 第${feixingqi_rank}名 超时出局 完成${feixingqi_state.eliminatedFinished?.[feixingqi_owner] || 0}/${feixingqi_state.settings.pieceCount}`;
        } else if (feixingqi_rank > 0) {
          feixingqi_node.textContent = `${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""} 第${feixingqi_rank}名 ${feixingqi_state.completed?.[feixingqi_owner] ? "已完成" : "最后剩余"}`;
        } else {
          feixingqi_node.textContent = `${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""} 剩余${feixingqi_format_time(feixingqi_state.totalRemaining[feixingqi_owner])} 完成 ${feixingqi_live_finished}/${feixingqi_state.settings.pieceCount}`;
        }
      });
      if (feixingqi_state.stepRemaining === 0 || feixingqi_state.totalRemaining[feixingqi_state.side] === 0) {
        const feixingqi_timeout_kind = feixingqi_state.totalRemaining[feixingqi_state.side] === 0 ? "局时" : "步时"; // feixingqi_timeout_kind：触发判负的计时种类。
        feixingqi_lose_by_time(feixingqi_state.side, feixingqi_timeout_kind);
      }
    }, 1000);
  }

  // feixingqi_track_points：按 C++ 正六边形六条边生成六十个格子中心。
  function feixingqi_track_points() {
    const feixingqi_center_x = 500; // feixingqi_center_x：地图中心横坐标。
    const feixingqi_center_y = 475; // feixingqi_center_y：地图中心纵坐标。
    const feixingqi_radius = 350; // feixingqi_radius：C++ 公共跑道正六边形半径。
    const feixingqi_vertices = Array.from({ length: 6 }, (_, feixingqi_index) => {
      const feixingqi_angle = -Math.PI / 2 + feixingqi_index * Math.PI / 3; // feixingqi_angle：六边形顶点角度。
      return { x: feixingqi_center_x + Math.cos(feixingqi_angle) * feixingqi_radius, y: feixingqi_center_y + Math.sin(feixingqi_angle) * feixingqi_radius };
    });
    const feixingqi_points = []; // feixingqi_points：六十个公共跑道格中心。
    for (let feixingqi_side = 0; feixingqi_side < 6; feixingqi_side += 1) {
      const feixingqi_next = (feixingqi_side + 1) % 6; // feixingqi_next：当前边的下一顶点。
      for (let feixingqi_step = 0; feixingqi_step < 10; feixingqi_step += 1) {
        const feixingqi_ratio = (feixingqi_step + .5) / 10; // feixingqi_ratio：当前格在一条边上的插值比例。
        feixingqi_points.push({
          x: feixingqi_vertices[feixingqi_side].x * (1 - feixingqi_ratio) + feixingqi_vertices[feixingqi_next].x * feixingqi_ratio,
          y: feixingqi_vertices[feixingqi_side].y * (1 - feixingqi_ratio) + feixingqi_vertices[feixingqi_next].y * feixingqi_ratio,
        });
      }
    }
    return feixingqi_points;
  }

  // feixingqi_hex：绘制一个指定中心和半径的六边形格。
  function feixingqi_hex(feixingqi_x, feixingqi_y, feixingqi_radius, feixingqi_fill, feixingqi_stroke, feixingqi_width = 1) {
    feixingqi_context.beginPath();
    for (let feixingqi_index = 0; feixingqi_index < 6; feixingqi_index += 1) {
      const feixingqi_angle = -Math.PI / 2 + feixingqi_index * Math.PI / 3; // feixingqi_angle：当前六边形顶点角度。
      const feixingqi_point_x = feixingqi_x + Math.cos(feixingqi_angle) * feixingqi_radius; // feixingqi_point_x：当前顶点横坐标。
      const feixingqi_point_y = feixingqi_y + Math.sin(feixingqi_angle) * feixingqi_radius; // feixingqi_point_y：当前顶点纵坐标。
      if (feixingqi_index === 0) feixingqi_context.moveTo(feixingqi_point_x, feixingqi_point_y);
      else feixingqi_context.lineTo(feixingqi_point_x, feixingqi_point_y);
    }
    feixingqi_context.closePath();
    feixingqi_context.fillStyle = feixingqi_fill;
    feixingqi_context.fill();
    feixingqi_context.strokeStyle = feixingqi_stroke;
    feixingqi_context.lineWidth = feixingqi_width;
    feixingqi_context.stroke();
  }

  // feixingqi_base_center：返回指定队伍位于地图外圈的基地中心。
  function feixingqi_base_center(feixingqi_owner, feixingqi_points) {
    const feixingqi_start = feixingqi_points[feixingqi_start_cell(feixingqi_owner, feixingqi_state.settings.playerCount)]; // feixingqi_start：当前队伍起点格。
    const feixingqi_dx = feixingqi_start.x - 500; // feixingqi_dx：起点相对地图中心横向量。
    const feixingqi_dy = feixingqi_start.y - 475; // feixingqi_dy：起点相对地图中心纵向量。
    const feixingqi_length = Math.max(1, Math.hypot(feixingqi_dx, feixingqi_dy)); // feixingqi_length：方向向量长度。
    return { x: 500 + feixingqi_dx / feixingqi_length * 395, y: 475 + feixingqi_dy / feixingqi_length * 395 };
  }

  // feixingqi_finish_point：返回某队终点列指定格的中心。
  function feixingqi_finish_point(feixingqi_owner, feixingqi_finish_index, feixingqi_points) {
    const feixingqi_start = feixingqi_start_cell(feixingqi_owner, feixingqi_state.settings.playerCount); // feixingqi_start：队伍起点格号。
    const feixingqi_end = feixingqi_points[(feixingqi_start + feixingqi_track_count - 1) % feixingqi_track_count]; // feixingqi_end：进入终点列前的最后跑道格。
    const feixingqi_ratio = (feixingqi_finish_index + 1) / (feixingqi_finish_count + 1); // feixingqi_ratio：终点格到地图中心的推进比例。
    return { x: feixingqi_end.x * (1 - feixingqi_ratio) + 500 * feixingqi_ratio, y: feixingqi_end.y * (1 - feixingqi_ratio) + 475 * feixingqi_ratio };
  }

  // feixingqi_piece_base_point：根据棋子基地、跑道、终点列或停车区状态返回未偏移坐标。
  function feixingqi_piece_base_point(feixingqi_owner, feixingqi_piece_index, feixingqi_points) {
    const feixingqi_position = feixingqi_state.players[feixingqi_owner][feixingqi_piece_index]; // feixingqi_position：棋子的相对进度编码。
    if (feixingqi_position < 0) {
      const feixingqi_base = feixingqi_base_center(feixingqi_owner, feixingqi_points); // feixingqi_base：当前队伍基地中心。
      const feixingqi_columns = feixingqi_state.settings.pieceCount <= 4 ? 2 : 3; // feixingqi_columns：基地棋子排列列数。
      const feixingqi_row = Math.floor(feixingqi_piece_index / feixingqi_columns); // feixingqi_row：棋子在基地中的行。
      const feixingqi_col = feixingqi_piece_index % feixingqi_columns; // feixingqi_col：棋子在基地中的列。
      return { x: feixingqi_base.x + (feixingqi_col - (feixingqi_columns - 1) / 2) * 28, y: feixingqi_base.y + (feixingqi_row - .5) * 28 + 8 };
    }
    if (feixingqi_position < feixingqi_track_count) {
      return feixingqi_points[feixingqi_public_cell(feixingqi_owner, feixingqi_position, feixingqi_state.settings.playerCount)];
    }
    if (feixingqi_position < feixingqi_complete_position) {
      return feixingqi_finish_point(feixingqi_owner, feixingqi_position - feixingqi_track_count, feixingqi_points);
    }
    const feixingqi_angle = -Math.PI / 2 + feixingqi_owner * Math.PI * 2 / feixingqi_state.settings.playerCount; // feixingqi_angle：停车区内当前队伍方向。
    return { x: 500 + Math.cos(feixingqi_angle) * (40 + feixingqi_piece_index * 4), y: 475 + Math.sin(feixingqi_angle) * (40 + feixingqi_piece_index * 4) };
  }

  // feixingqi_piece_point：同一公共格有多枚棋子时沿小圆分开放置，避免完全重叠。
  function feixingqi_piece_point(feixingqi_owner, feixingqi_piece_index, feixingqi_points) {
    const feixingqi_base_point = feixingqi_piece_base_point(feixingqi_owner, feixingqi_piece_index, feixingqi_points); // feixingqi_base_point：当前棋子的逻辑格中心。
    const feixingqi_position = feixingqi_state.players[feixingqi_owner][feixingqi_piece_index]; // feixingqi_position：当前棋子的相对进度。
    if (feixingqi_position < 0 || feixingqi_position >= feixingqi_track_count) return feixingqi_base_point;
    const feixingqi_public = feixingqi_public_cell(feixingqi_owner, feixingqi_position, feixingqi_state.settings.playerCount); // feixingqi_public：当前棋子的公共跑道格。
    const feixingqi_group = []; // feixingqi_group：与当前棋子占用同一公共格的全部棋子。
    for (let feixingqi_group_owner = 0; feixingqi_group_owner < feixingqi_state.players.length; feixingqi_group_owner += 1) {
      if (feixingqi_state.eliminated?.[feixingqi_group_owner]) continue;
      for (let feixingqi_group_piece = 0; feixingqi_group_piece < feixingqi_state.players[feixingqi_group_owner].length; feixingqi_group_piece += 1) {
        const feixingqi_group_position = feixingqi_state.players[feixingqi_group_owner][feixingqi_group_piece]; // feixingqi_group_position：待比较棋子的相对进度。
        if (feixingqi_group_position >= 0 && feixingqi_group_position < feixingqi_track_count
          && feixingqi_public_cell(feixingqi_group_owner, feixingqi_group_position, feixingqi_state.settings.playerCount) === feixingqi_public) {
          feixingqi_group.push([feixingqi_group_owner, feixingqi_group_piece]);
        }
      }
    }
    if (feixingqi_group.length < 2) return feixingqi_base_point;
    const feixingqi_group_index = feixingqi_group.findIndex(([feixingqi_group_owner, feixingqi_group_piece]) => feixingqi_group_owner === feixingqi_owner && feixingqi_group_piece === feixingqi_piece_index); // feixingqi_group_index：当前棋子在同格排列中的稳定下标。
    const feixingqi_angle = -Math.PI / 2 + feixingqi_group_index * Math.PI * 2 / feixingqi_group.length; // feixingqi_angle：当前棋子的偏移方向。
    const feixingqi_offset = feixingqi_group.length > 3 ? 11 : 8; // feixingqi_offset：根据同格棋子数调整分离半径。
    return { x: feixingqi_base_point.x + Math.cos(feixingqi_angle) * feixingqi_offset, y: feixingqi_base_point.y + Math.sin(feixingqi_angle) * feixingqi_offset };
  }

  // feixingqi_draw_jump_path：用当前队伍颜色绘制最近一次同色飞跃的虚线路径和端点。
  function feixingqi_draw_jump_path(feixingqi_points) {
    if (!feixingqi_state.jumpActive || feixingqi_state.jumpFrom < 0 || feixingqi_state.jumpTo < 0 || feixingqi_state.jumpOwner < 0) return;
    const feixingqi_start_cells = new Set(Array.from(
      { length: feixingqi_state.settings.playerCount },
      (_, feixingqi_owner) => feixingqi_start_cell(feixingqi_owner, feixingqi_state.settings.playerCount),
    )); // feixingqi_start_cells：禁止绘制飞跃虚线的全部队伍起点。
    if (feixingqi_start_cells.has(feixingqi_state.jumpFrom)) return;
    const feixingqi_from = feixingqi_points[feixingqi_state.jumpFrom]; // feixingqi_from：飞跃起始公共格中心。
    const feixingqi_to = feixingqi_points[feixingqi_state.jumpTo]; // feixingqi_to：飞跃结束公共格中心。
    if (!feixingqi_from || !feixingqi_to) return;
    const feixingqi_color = feixingqi_colors[feixingqi_state.jumpOwner]; // feixingqi_color：飞跃玩家主色。
    feixingqi_context.save();
    feixingqi_context.setLineDash([12, 8]);
    feixingqi_context.strokeStyle = feixingqi_color;
    feixingqi_context.lineWidth = 4;
    feixingqi_context.beginPath();
    feixingqi_context.moveTo(feixingqi_from.x, feixingqi_from.y);
    feixingqi_context.lineTo(feixingqi_to.x, feixingqi_to.y);
    feixingqi_context.stroke();
    feixingqi_context.setLineDash([]);
    for (const [feixingqi_point, feixingqi_radius] of [[feixingqi_from, 10], [feixingqi_to, 12]]) {
      feixingqi_context.beginPath();
      feixingqi_context.arc(feixingqi_point.x, feixingqi_point.y, feixingqi_radius, 0, Math.PI * 2);
      feixingqi_context.fillStyle = "#ffffff";
      feixingqi_context.fill();
      feixingqi_context.strokeStyle = feixingqi_color;
      feixingqi_context.lineWidth = 3;
      feixingqi_context.stroke();
    }
    feixingqi_context.restore();
  }

  // feixingqi_draw：绘制 C++ 六边形地图、六十格跑道、基地、终点列、停车区和棋子。
  function feixingqi_draw() {
    const feixingqi_points = feixingqi_track_points(); // feixingqi_points：本次绘制使用的六十格坐标。
    const feixingqi_player_count = feixingqi_state.settings.playerCount; // feixingqi_player_count：当前设置玩家人数。
    feixingqi_context.fillStyle = "rgb(236,240,246)";
    feixingqi_context.fillRect(0, 0, 1000, 950);
    feixingqi_context.fillStyle = "rgb(226,232,241)";
    feixingqi_context.fillRect(20, 20, 960, 910);
    feixingqi_context.strokeStyle = "rgb(188,197,211)";
    feixingqi_context.strokeRect(20, 20, 960, 910);
    feixingqi_hex(500, 475, 405, "rgb(247,249,252)", "rgb(72,84,104)", 3);
    feixingqi_hex(500, 475, 66, "rgb(255,248,226)", "rgb(122,100,57)", 2);
    feixingqi_context.fillStyle = "rgb(96,76,38)";
    feixingqi_context.font = "18px 'Microsoft YaHei'";
    feixingqi_context.textAlign = "center";
    feixingqi_context.textBaseline = "middle";
    feixingqi_context.fillText("停车区", 500, 475);
    const feixingqi_start_cells = new Set(Array.from({ length: feixingqi_player_count }, (_, feixingqi_owner) => feixingqi_start_cell(feixingqi_owner, feixingqi_player_count))); // feixingqi_start_cells：当前人数下的所有起点格。
    const feixingqi_trap_cells = new Set(); // feixingqi_trap_cells：每条边避开起点后的黑色陷阱格。
    for (let feixingqi_side = 0; feixingqi_side < 6; feixingqi_side += 1) {
      const feixingqi_trap = [5, 4, 6, 3, 7].map(feixingqi_offset => feixingqi_side * 10 + feixingqi_offset).find(feixingqi_cell => !feixingqi_start_cells.has(feixingqi_cell)); // feixingqi_trap：当前边最终选择的陷阱格。
      if (Number.isInteger(feixingqi_trap)) feixingqi_trap_cells.add(feixingqi_trap);
    }
    for (let feixingqi_owner = 0; feixingqi_owner < feixingqi_player_count; feixingqi_owner += 1) {
      for (let feixingqi_finish_index = 0; feixingqi_finish_index < feixingqi_finish_count; feixingqi_finish_index += 1) {
        const feixingqi_point = feixingqi_finish_point(feixingqi_owner, feixingqi_finish_index, feixingqi_points); // feixingqi_point：一个终点列格坐标。
        feixingqi_hex(feixingqi_point.x, feixingqi_point.y, 15, `${feixingqi_colors[feixingqi_owner]}88`, feixingqi_colors[feixingqi_owner]);
      }
    }
    for (let feixingqi_cell = 0; feixingqi_cell < feixingqi_track_count; feixingqi_cell += 1) {
      const feixingqi_start_owner = Array.from({ length: feixingqi_player_count }, (_, feixingqi_owner) => feixingqi_start_cell(feixingqi_owner, feixingqi_player_count)).indexOf(feixingqi_cell); // feixingqi_start_owner：当前格是否为某队起点。
      const feixingqi_normal_owner = feixingqi_cell % feixingqi_player_count; // feixingqi_normal_owner：普通格使用的循环队伍颜色。
      const feixingqi_fill = feixingqi_start_owner >= 0 ? `${feixingqi_colors[feixingqi_start_owner]}bf` : (feixingqi_trap_cells.has(feixingqi_cell) ? "#ebeef4" : `${feixingqi_colors[feixingqi_normal_owner]}38`); // feixingqi_fill：普通格、陷阱格或起点格填充色。
      feixingqi_hex(feixingqi_points[feixingqi_cell].x, feixingqi_points[feixingqi_cell].y, 18, feixingqi_fill, feixingqi_start_owner >= 0 ? feixingqi_colors[feixingqi_start_owner] : "#626a7c", feixingqi_start_owner >= 0 ? 2 : 1);
      if (feixingqi_trap_cells.has(feixingqi_cell)) {
        feixingqi_context.fillStyle = "#161820";
        feixingqi_context.beginPath();
        feixingqi_context.arc(feixingqi_points[feixingqi_cell].x, feixingqi_points[feixingqi_cell].y, 11, 0, Math.PI * 2);
        feixingqi_context.fill();
        feixingqi_context.fillStyle = "#ffffff";
        feixingqi_context.font = "11px 'Microsoft YaHei'";
        feixingqi_context.fillText("陷", feixingqi_points[feixingqi_cell].x, feixingqi_points[feixingqi_cell].y);
      } else if (feixingqi_start_owner >= 0) {
        feixingqi_context.fillStyle = "#ffffff";
        feixingqi_context.font = "13px 'Microsoft YaHei'";
        feixingqi_context.fillText("起", feixingqi_points[feixingqi_cell].x, feixingqi_points[feixingqi_cell].y);
      }
    }
    for (let feixingqi_owner = 0; feixingqi_owner < feixingqi_player_count; feixingqi_owner += 1) {
      const feixingqi_base = feixingqi_base_center(feixingqi_owner, feixingqi_points); // feixingqi_base：当前队伍基地中心。
      feixingqi_hex(feixingqi_base.x, feixingqi_base.y, 50, `${feixingqi_colors[feixingqi_owner]}33`, feixingqi_colors[feixingqi_owner], 2);
      feixingqi_context.fillStyle = feixingqi_colors[feixingqi_owner];
      feixingqi_context.font = "17px 'Microsoft YaHei'";
      feixingqi_context.fillText(feixingqi_names[feixingqi_owner], feixingqi_base.x, feixingqi_base.y - 62);
    }
    feixingqi_draw_jump_path(feixingqi_points);
    if (feixingqi_state.phase !== "setup") {
      const feixingqi_movable = feixingqi_state.phase === "select"
        ? new Set(feixingqi_movable_pieces(feixingqi_state))
        : new Set(); // feixingqi_movable：当前玩家可走棋子的编号集合。
      for (let feixingqi_owner = 0; feixingqi_owner < feixingqi_state.players.length; feixingqi_owner += 1) {
        if (feixingqi_state.eliminated?.[feixingqi_owner]) continue;
        for (let feixingqi_piece_index = 0; feixingqi_piece_index < feixingqi_state.players[feixingqi_owner].length; feixingqi_piece_index += 1) {
          const feixingqi_point = feixingqi_piece_point(feixingqi_owner, feixingqi_piece_index, feixingqi_points); // feixingqi_point：当前棋子绘制中心。
          const feixingqi_current_piece = feixingqi_owner === feixingqi_state.side; // feixingqi_current_piece：棋子是否属于当前行动队伍。
          const feixingqi_selected = feixingqi_current_piece && feixingqi_state.selectedPiece === feixingqi_piece_index; // feixingqi_selected：棋子是否已经进入二次确认状态。
          const feixingqi_can_choose = feixingqi_current_piece && feixingqi_movable.has(feixingqi_piece_index); // feixingqi_can_choose：棋子是否应显示本地 C++ 金色可走圈。
          if (feixingqi_can_choose) {
            feixingqi_context.beginPath();
            feixingqi_context.arc(feixingqi_point.x, feixingqi_point.y, feixingqi_selected ? 23 : 20, 0, Math.PI * 2);
            feixingqi_context.strokeStyle = feixingqi_selected ? "rgb(224,92,44)" : "rgb(244,183,64)";
            feixingqi_context.lineWidth = feixingqi_selected ? 5 : 4;
            feixingqi_context.stroke();
          }
          feixingqi_context.beginPath();
          feixingqi_context.arc(feixingqi_point.x, feixingqi_point.y, 13, 0, Math.PI * 2);
          feixingqi_context.fillStyle = feixingqi_colors[feixingqi_owner];
          feixingqi_context.fill();
          feixingqi_context.strokeStyle = "#ffffff";
          feixingqi_context.lineWidth = 2;
          feixingqi_context.stroke();
          feixingqi_context.fillStyle = "#ffffff";
          feixingqi_context.font = "bold 12px sans-serif";
          feixingqi_context.fillText(String(feixingqi_piece_index + 1), feixingqi_point.x, feixingqi_point.y + .5);
        }
      }
    }
    feixingqi_canvas.style.cursor = feixingqi_state.phase === "select"
      && !feixingqi_is_robot(feixingqi_state, feixingqi_state.side)
      && !feixingqi_dice_rolling
      ? "pointer"
      : "default";
  }

  // feixingqi_setup_rows：返回飞行棋右侧设置行的固定定义。
  function feixingqi_setup_rows() {
    return [
      { key: "playerCount", label: "玩家人数", min: 2, max: 6, step: 1, text: feixingqi_value => `${feixingqi_value} 人` },
      { key: "pieceCount", label: "所有玩家棋子数量", min: 2, max: 6, step: 1, text: feixingqi_value => `${feixingqi_value} 枚` },
      { key: "robotCount", label: "机器人数量", min: 0, max: feixingqi_state.settings.playerCount, step: 1, text: feixingqi_value => `${feixingqi_value} 个` },
      { key: "stepSeconds", label: "每步时长", values: [10, 15, 30], text: feixingqi_value => `${feixingqi_value} 秒` },
      { key: "totalSeconds", label: "单方时长", values: [300, 600, 900, 1800], text: feixingqi_value => `${feixingqi_value / 60} 分钟` },
    ];
  }

  // feixingqi_adjust_setup：按设置行边界调整人数、棋子、机器人或计时。
  function feixingqi_adjust_setup(feixingqi_row, feixingqi_delta) {
    const feixingqi_definition = feixingqi_setup_rows()[feixingqi_row]; // feixingqi_definition：当前设置行定义。
    const feixingqi_old_value = feixingqi_state.settings[feixingqi_definition.key]; // feixingqi_old_value：调整前的数值。
    let feixingqi_new_value = feixingqi_old_value; // feixingqi_new_value：边界处理后的新数值。
    if (feixingqi_definition.values) {
      const feixingqi_index = feixingqi_definition.values.indexOf(feixingqi_old_value); // feixingqi_index：当前值在离散选项中的下标。
      feixingqi_new_value = feixingqi_definition.values[qilei_clamp(feixingqi_index + feixingqi_delta, 0, feixingqi_definition.values.length - 1)];
    } else {
      feixingqi_new_value = qilei_clamp(feixingqi_old_value + feixingqi_delta * feixingqi_definition.step, feixingqi_definition.min, feixingqi_definition.max);
    }
    feixingqi_state.settings[feixingqi_definition.key] = feixingqi_new_value;
    if (feixingqi_definition.key === "playerCount") feixingqi_state.settings.robotCount = Math.min(feixingqi_state.settings.robotCount, feixingqi_new_value);
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel(`${feixingqi_definition.label}已调整为 ${feixingqi_definition.text(feixingqi_new_value)}`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
  }

  // feixingqi_start_game：应用右侧设置并创建二至六支队伍，随后进入与 C++ 一致的抽签阶段。
  function feixingqi_start_game() {
    feixingqi_state.players = Array.from(
      { length: feixingqi_state.settings.playerCount },
      () => Array(feixingqi_state.settings.pieceCount).fill(-1),
    );
    feixingqi_state.phase = "lot";
    feixingqi_state.side = 0;
    feixingqi_state.dice = 0;
    feixingqi_state.rolled = false;
    feixingqi_state.selectedPiece = -1;
    feixingqi_state.moves = 0;
    feixingqi_state.over = false;
    feixingqi_state.winner = -1;
    feixingqi_state.stepRemaining = feixingqi_state.settings.stepSeconds;
    feixingqi_state.totalRemaining = Array(feixingqi_state.settings.playerCount).fill(feixingqi_state.settings.totalSeconds);
    feixingqi_state.drawValues = Array(feixingqi_state.settings.playerCount).fill(0);
    feixingqi_state.drawn = 0;
    feixingqi_state.turnOrder = [];
    feixingqi_state.eliminated = Array(feixingqi_state.settings.playerCount).fill(false);
    feixingqi_state.eliminationOrder = [];
    feixingqi_state.eliminatedFinished = Array(feixingqi_state.settings.playerCount).fill(0);
    feixingqi_state.completed = Array(feixingqi_state.settings.playerCount).fill(false);
    feixingqi_state.rankings = [];
    feixingqi_state.jumpActive = false;
    feixingqi_state.jumpFrom = -1;
    feixingqi_state.jumpTo = -1;
    feixingqi_state.jumpOwner = -1;
    feixingqi_memory_history.length = 0;
    feixingqi_finished_reported = false;
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel(`${feixingqi_names[0]}开始抽签`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_update_panel：刷新设置阶段或正式游戏阶段的状态、进度和预测。
  function feixingqi_update_panel(feixingqi_status = "") {
    const feixingqi_setup = feixingqi_state.phase === "setup"; // feixingqi_setup：当前是否仍在 C++ 右侧设置阶段。
    feixingqi_workspace.dataset.phase = feixingqi_setup ? "setup" : "play";
    const feixingqi_prediction = feixingqi_predict(feixingqi_state); // feixingqi_prediction：当前局面预测。
    const feixingqi_progress = feixingqi_state.players.map((feixingqi_pieces, feixingqi_owner) => {
      const feixingqi_finished = feixingqi_pieces.filter(feixingqi_position => feixingqi_position >= feixingqi_complete_position).length; // feixingqi_finished：当前队伍完成棋子数。
      return `${feixingqi_names[feixingqi_owner]} ${feixingqi_finished}/${feixingqi_state.settings.pieceCount}`;
    });
    const feixingqi_lot = feixingqi_state.phase === "lot"; // feixingqi_lot：当前是否处于正式计时开始前的抽签顺序阶段。
    feixingqi_panel_status = feixingqi_status || (feixingqi_setup
      ? "请选择游戏人数、棋子数量、机器人和计时设置。"
      : (feixingqi_lot
        ? (feixingqi_state.drawn < feixingqi_state.settings.playerCount ? `${feixingqi_names[feixingqi_state.drawn]}等待抽签` : "抽签完成，请进入游戏")
        : (feixingqi_state.over ? `${feixingqi_names[feixingqi_state.winner]}获得第一名` : `${feixingqi_names[feixingqi_state.side]}${feixingqi_state.rolled ? "选择棋子" : "等待投骰"}`)));
    feixingqi_services.update({
      status: feixingqi_panel_status,
      prediction: { first: feixingqi_prediction.first, second: feixingqi_prediction.second, firstName: "红队", secondName: "其余", summary: feixingqi_prediction.summary },
      stats: feixingqi_setup ? [] : [
        { label: "当前操作", value: `${feixingqi_names[feixingqi_state.side]} · ${feixingqi_is_robot(feixingqi_state, feixingqi_state.side) ? "机器人" : "人工"} · 骰子 ${feixingqi_state.dice || "未投"}` },
        { label: "各队完成进度", value: feixingqi_progress.join("　") },
      ],
      moveCount: feixingqi_state.moves,
    });
    feixingqi_render_controls();
  }

  // feixingqi_render_controls：按 C++ 的 480×910 右侧面板重建设置页或游戏信息页。
  function feixingqi_render_controls() {
    feixingqi_controls_host.replaceChildren();
    const feixingqi_panel = feixingqi_make_node("section", "feixingqi-local-panel"); // feixingqi_panel：完整替代网页通用信息栏的飞行棋原版面板。
    feixingqi_panel.classList.toggle("is-over", feixingqi_state.over);
    const feixingqi_title = feixingqi_make_node("h3", "feixingqi-local-title", feixingqi_state.phase === "setup" ? "游戏设置" : (feixingqi_state.phase === "lot" ? "抽签顺序" : (feixingqi_state.over ? "游戏结束" : "游戏信息"))); // feixingqi_title：右侧原版标题。
    feixingqi_panel.append(feixingqi_title);
    if (feixingqi_state.phase === "setup") {
      feixingqi_panel.append(feixingqi_make_node("p", "feixingqi-setup-help", "上下选择设置项，左右调整当前项；机器人安排在编号靠后的队伍。"));
      const feixingqi_setup_panel = document.createElement("div"); // feixingqi_setup_panel：C++ 飞行棋右侧五项设置容器。
      feixingqi_setup_panel.className = "internal-setup-panel feixingqi-setup-panel";
      feixingqi_setup_rows().forEach((feixingqi_row, feixingqi_row_index) => {
        const feixingqi_row_node = document.createElement("div"); // feixingqi_row_node：一项设置的左右调整行。
        feixingqi_row_node.className = `internal-setup-row${feixingqi_row_index === feixingqi_setup_focus ? " keyboard-selected" : ""}`;
        const feixingqi_label = document.createElement("span"); // feixingqi_label：当前设置项名称。
        feixingqi_label.textContent = feixingqi_row.label;
        const feixingqi_minus = document.createElement("button"); // feixingqi_minus：减少当前设置的按钮。
        feixingqi_minus.type = "button";
        feixingqi_minus.textContent = "−";
        feixingqi_minus.addEventListener("click", () => feixingqi_adjust_setup(feixingqi_row_index, -1));
        const feixingqi_value = document.createElement("b"); // feixingqi_value：当前设置数值文字。
        feixingqi_value.textContent = feixingqi_row.text(feixingqi_state.settings[feixingqi_row.key]);
        const feixingqi_plus = document.createElement("button"); // feixingqi_plus：增加当前设置的按钮。
        feixingqi_plus.type = "button";
        feixingqi_plus.textContent = "+";
        feixingqi_plus.addEventListener("click", () => feixingqi_adjust_setup(feixingqi_row_index, 1));
        feixingqi_row_node.append(feixingqi_label, feixingqi_minus, feixingqi_value, feixingqi_plus);
        feixingqi_setup_panel.append(feixingqi_row_node);
      });
      const feixingqi_start = document.createElement("button"); // feixingqi_start：应用设置并进入正式游戏的按钮。
      feixingqi_start.type = "button";
      feixingqi_start.className = "internal-start-button";
      feixingqi_start.textContent = "开始抽签";
      feixingqi_start.addEventListener("click", feixingqi_start_game);
      feixingqi_setup_panel.append(feixingqi_start);
      const feixingqi_home = feixingqi_make_node("button", "feixingqi-home-button", "返回主界面"); // feixingqi_home：设置页返回棋类大厅按钮。
      feixingqi_home.type = "button";
      feixingqi_home.addEventListener("click", () => document.getElementById("back-lobby")?.click());
      feixingqi_setup_panel.append(feixingqi_home, feixingqi_make_node("p", "feixingqi-panel-notice", feixingqi_panel_status || "请选择游戏人数、棋子数量、机器人和计时设置。"));
      feixingqi_panel.append(feixingqi_setup_panel);
      feixingqi_controls_host.append(feixingqi_panel);
      return;
    }
    if (feixingqi_state.phase === "lot") {
      const feixingqi_lot_operation = feixingqi_make_node("section", "feixingqi-lot-operation"); // feixingqi_lot_operation：抽签阶段当前队伍和骰子结果区域。
      if (feixingqi_state.drawn < feixingqi_state.settings.playerCount) {
        const feixingqi_owner = feixingqi_state.drawn; // feixingqi_owner：当前等待抽签的队伍编号。
        feixingqi_lot_operation.append(
          feixingqi_make_node("b", "", `当前抽签：${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""}`),
          feixingqi_make_node("p", "", feixingqi_panel_status || "点击骰子取得本队顺序"),
        );
      } else {
        feixingqi_lot_operation.append(
          feixingqi_make_node("b", "", "全部队伍已经完成抽签"),
          feixingqi_make_node("p", "", "请核对顺序后进入游戏，正式计时将从此时开始。"),
        );
      }
      const feixingqi_lot_list = feixingqi_make_node("div", "feixingqi-lot-list"); // feixingqi_lot_list：逐队显示抽签点数的列表。
      for (let feixingqi_owner = 0; feixingqi_owner < feixingqi_state.settings.playerCount; feixingqi_owner += 1) {
        const feixingqi_value = feixingqi_state.drawValues[feixingqi_owner] || 0; // feixingqi_value：当前队伍已经取得的抽签点数。
        const feixingqi_row = feixingqi_make_node("div", "feixingqi-lot-row");
        const feixingqi_color = feixingqi_make_node("i", "");
        feixingqi_color.style.background = feixingqi_colors[feixingqi_owner];
        feixingqi_row.append(
          feixingqi_color,
          feixingqi_make_node("span", "", feixingqi_names[feixingqi_owner]),
          feixingqi_make_node("b", "", feixingqi_value ? `${feixingqi_value} 点` : "等待"),
        );
        feixingqi_lot_list.append(feixingqi_row);
      }
      if (feixingqi_state.turnOrder.length) {
        feixingqi_lot_list.append(feixingqi_make_node("p", "feixingqi-lot-order", `行动顺序：${feixingqi_state.turnOrder.map(feixingqi_owner => feixingqi_names[feixingqi_owner]).join(" → ")}`));
      }
      const feixingqi_lot_actions = feixingqi_make_node("div", "feixingqi-lot-actions"); // feixingqi_lot_actions：本地抽签页底部返回按钮、进入按钮和骰子框。
      if (feixingqi_state.drawn >= feixingqi_state.settings.playerCount) {
        feixingqi_lot_actions.append(qilei_control_button("进入游戏", feixingqi_enter_play, "primary"));
      }
      feixingqi_lot_actions.append(qilei_control_button("返回上一步", feixingqi_back_setup));
      const feixingqi_lot_owner = Math.min(feixingqi_state.drawn, feixingqi_state.settings.playerCount - 1); // feixingqi_lot_owner：骰子框当前对应的抽签队伍。
      const feixingqi_lot_active = !feixingqi_dice_rolling && feixingqi_state.drawn < feixingqi_state.settings.playerCount && !feixingqi_is_robot(feixingqi_state, feixingqi_state.drawn); // feixingqi_lot_active：人工抽签且动画停止时骰子才允许操作。
      const feixingqi_lot_value = feixingqi_dice_rolling ? feixingqi_dice_preview : (feixingqi_state.drawValues[feixingqi_lot_owner] || 1); // feixingqi_lot_value：动画当前帧或最近一次抽签点数。
      const feixingqi_lot_label = feixingqi_dice_rolling ? "骰子滚动中" : (feixingqi_lot_active ? "点击骰子" : (feixingqi_state.drawn >= feixingqi_state.settings.playerCount ? "骰子结果" : "骰子等待")); // feixingqi_lot_label：抽签骰子当前状态说明。
      feixingqi_lot_actions.append(feixingqi_make_dice_control(feixingqi_lot_value, feixingqi_lot_label, feixingqi_lot_active, () => feixingqi_lot_roll(false)));
      feixingqi_panel.append(feixingqi_lot_operation, feixingqi_lot_list, feixingqi_lot_actions);
      feixingqi_controls_host.append(feixingqi_panel);
      return;
    }
    const feixingqi_operation = feixingqi_make_node("div", "feixingqi-operation"); // feixingqi_operation：当前玩家、步时和本次阶段提示。
    feixingqi_operation.append(
      feixingqi_make_node("b", "", `当前操作是：${feixingqi_names[feixingqi_state.side]}${feixingqi_is_robot(feixingqi_state, feixingqi_state.side) ? "（机器人）" : ""}`),
      feixingqi_make_node("span", "feixingqi-step-clock", `本步剩余时间：${feixingqi_format_time(feixingqi_state.stepRemaining)} / 每步 ${feixingqi_state.settings.stepSeconds}秒`),
      feixingqi_make_node("span", "feixingqi-operation-stage", feixingqi_panel_status),
    );
    const feixingqi_notice = feixingqi_make_node("div", "feixingqi-output-box", feixingqi_panel_status); // feixingqi_notice：C++ 蓝色输出框。
    let feixingqi_final_ranking = null; // feixingqi_final_ranking：终局时显示完整名次的区域。
    if (feixingqi_state.over) {
      feixingqi_final_ranking = feixingqi_make_node("section", "feixingqi-final-ranking");
      feixingqi_final_ranking.append(feixingqi_make_node("h4", "", "最终排名"));
      (feixingqi_state.rankings || []).forEach((feixingqi_owner, feixingqi_index) => {
        const feixingqi_row = feixingqi_make_node("p", ""); // feixingqi_row：正常完成或最后剩余玩家的一条排名。
        const feixingqi_color = feixingqi_make_node("i", ""); // feixingqi_color：排名条目的队伍色块。
        feixingqi_color.style.background = feixingqi_colors[feixingqi_owner];
        feixingqi_row.append(
          feixingqi_color,
          document.createTextNode(`${feixingqi_index + 1}. ${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""}${feixingqi_state.completed?.[feixingqi_owner] ? "" : "（最后剩余）"}`),
        );
        feixingqi_final_ranking.append(feixingqi_row);
      });
      feixingqi_eliminated_ranking(feixingqi_state).forEach(feixingqi_owner => {
        const feixingqi_row = feixingqi_make_node("p", "is-out"); // feixingqi_row：超时出局玩家的一条末尾排名。
        const feixingqi_color = feixingqi_make_node("i", ""); // feixingqi_color：判负排名条目的队伍色块。
        feixingqi_color.style.background = feixingqi_colors[feixingqi_owner];
        feixingqi_row.append(
          feixingqi_color,
          document.createTextNode(`${feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner)}. ${feixingqi_names[feixingqi_owner]}：超时出局，完成${feixingqi_state.eliminatedFinished?.[feixingqi_owner] || 0}/${feixingqi_state.settings.pieceCount}`),
        );
        feixingqi_final_ranking.append(feixingqi_row);
      });
    }
    const feixingqi_progress_box = feixingqi_make_node("section", "feixingqi-progress"); // feixingqi_progress_box：所有玩家任务进度。
    feixingqi_progress_box.append(feixingqi_make_node("h4", "", "玩家任务进度"));
    feixingqi_state.players.forEach((feixingqi_pieces, feixingqi_owner) => {
      const feixingqi_finished = feixingqi_pieces.filter(feixingqi_position => feixingqi_position >= feixingqi_complete_position).length; // feixingqi_finished：该队已经抵达终点的棋子数量。
      const feixingqi_row = feixingqi_make_node("div", "feixingqi-progress-row"); // feixingqi_row：一名玩家的文字和进度条。
      const feixingqi_color = feixingqi_make_node("i", ""); // feixingqi_color：玩家颜色方块。
      feixingqi_color.style.background = feixingqi_colors[feixingqi_owner];
      const feixingqi_rank = feixingqi_state.eliminated?.[feixingqi_owner]
        ? feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner)
        : feixingqi_rank_of(feixingqi_state, feixingqi_owner); // feixingqi_rank：当前玩家已经确定的正常或判负名次。
      const feixingqi_player_state = feixingqi_state.eliminated?.[feixingqi_owner]
        ? `第${feixingqi_rank}名 超时出局 完成${feixingqi_state.eliminatedFinished?.[feixingqi_owner] || 0}/${feixingqi_state.settings.pieceCount}`
        : (feixingqi_rank > 0
          ? `第${feixingqi_rank}名 ${feixingqi_state.completed?.[feixingqi_owner] ? "已完成" : "最后剩余"}`
          : `剩余${feixingqi_format_time(feixingqi_state.totalRemaining[feixingqi_owner])} 完成 ${feixingqi_finished}/${feixingqi_state.settings.pieceCount}`); // feixingqi_player_state：队伍仍在对局、完成或超时出局的稳定状态。
      const feixingqi_text = feixingqi_make_node("span", "feixingqi-player-clock", `${feixingqi_names[feixingqi_owner]}${feixingqi_is_robot(feixingqi_state, feixingqi_owner) ? "（机器人）" : ""} ${feixingqi_player_state}`); // feixingqi_text：玩家局时与完成数。
      feixingqi_text.dataset.owner = String(feixingqi_owner);
      const feixingqi_track = feixingqi_make_node("div", "feixingqi-progress-track"); // feixingqi_track：玩家任务进度背景。
      const feixingqi_fill = feixingqi_make_node("i", ""); // feixingqi_fill：玩家任务完成比例。
      feixingqi_fill.style.background = feixingqi_colors[feixingqi_owner];
      feixingqi_fill.style.width = `${feixingqi_finished / Math.max(1, feixingqi_state.settings.pieceCount) * 100}%`;
      feixingqi_track.append(feixingqi_fill);
      feixingqi_row.append(feixingqi_color, feixingqi_text, feixingqi_track);
      feixingqi_progress_box.append(feixingqi_row);
    });
    const feixingqi_rules = feixingqi_make_node("section", "feixingqi-rules"); // feixingqi_rules：原版五条规则说明。
    feixingqi_rules.append(
      feixingqi_make_node("h4", "", "游戏规则说明"),
      feixingqi_make_node("p", "", "1. 掷出6可起飞，掷出6可再投一次。"),
      feixingqi_make_node("p", "", "2. 落到本队普通色格，飞到下一同色格。"),
      feixingqi_make_node("p", "", "3. 落到别人起点，该棋子停一个回合。"),
      feixingqi_make_node("p", "", "4. 每条边有黑陷阱，同圈两次踩中多跑一圈。"),
      feixingqi_make_node("p", "", "5. 同格不击退，全部棋子进终点列即胜。"),
    );
    const feixingqi_actions = feixingqi_make_node("div", "feixingqi-actions"); // feixingqi_actions：左侧操作按键和右侧骰子控件。
    feixingqi_actions.append(
      qilei_control_button("悔棋 (U)", feixingqi_undo),
      qilei_control_button("重开 (N)", feixingqi_new_game, "warning"),
    );
    const feixingqi_home = feixingqi_make_node("button", "danger wide", "返回主界面 (Esc)"); // feixingqi_home：返回大厅按钮。
    feixingqi_home.type = "button";
    feixingqi_home.addEventListener("click", () => document.getElementById("back-lobby")?.click());
    feixingqi_actions.append(feixingqi_home);
    const feixingqi_human_turn = !feixingqi_state.over && !feixingqi_is_robot(feixingqi_state, feixingqi_state.side); // feixingqi_human_turn：当前是否允许人工操作。
    const feixingqi_dice_active = !feixingqi_dice_rolling && feixingqi_human_turn && !feixingqi_state.rolled; // feixingqi_dice_active：动画停止且等待人工投骰时启用骰子框。
    const feixingqi_dice_value = feixingqi_dice_rolling ? feixingqi_dice_preview : (feixingqi_state.dice || 1); // feixingqi_dice_value：动画当前帧或最终骰面。
    const feixingqi_dice_label = feixingqi_dice_rolling ? "骰子滚动中" : (feixingqi_dice_active ? "点击骰子" : (feixingqi_state.rolled ? `骰子结果 ${feixingqi_state.dice}` : "骰子等待")); // feixingqi_dice_label：正式游戏骰子当前状态说明。
    feixingqi_actions.append(feixingqi_make_dice_control(feixingqi_dice_value, feixingqi_dice_label, feixingqi_dice_active, () => feixingqi_roll(false)));
    feixingqi_panel.append(feixingqi_operation, feixingqi_notice);
    if (feixingqi_final_ranking) feixingqi_panel.append(feixingqi_final_ranking);
    feixingqi_panel.append(feixingqi_progress_box, feixingqi_rules, feixingqi_actions);
    feixingqi_controls_host.append(feixingqi_panel);
  }

  // feixingqi_roll：投骰并进入人工选择或机器人决策。
  async function feixingqi_roll(feixingqi_robot) {
    if (feixingqi_state.phase !== "roll" || feixingqi_state.rolled || feixingqi_state.over || feixingqi_dice_rolling) return;
    if (!feixingqi_robot && feixingqi_is_robot(feixingqi_state, feixingqi_state.side)) return;
    feixingqi_memory_history.push(qilei_deep_copy(feixingqi_state));
    const feixingqi_value = await feixingqi_animate_dice("骰子转动中。"); // feixingqi_value：十二帧动画结束后的最终点数。
    if (!Number.isInteger(feixingqi_value) || feixingqi_state.phase !== "roll") return;
    feixingqi_state.dice = feixingqi_value;
    feixingqi_state.rolled = true;
    feixingqi_state.phase = "select";
    feixingqi_state.selectedPiece = -1;
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel(`${feixingqi_names[feixingqi_state.side]}投出 ${feixingqi_state.dice} 点`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    const feixingqi_movable = feixingqi_movable_pieces(feixingqi_state); // feixingqi_movable：投骰后全部可走棋子。
    if (!feixingqi_movable.length) {
      feixingqi_robot_timer = window.setTimeout(feixingqi_finish_turn, 500);
    } else if (feixingqi_robot) {
      feixingqi_robot_timer = window.setTimeout(() => {
        const feixingqi_piece_index = feixingqi_choose_robot_piece(feixingqi_movable); // feixingqi_piece_index：机器人准备移动并先展示的棋子编号。
        feixingqi_state.selectedPiece = feixingqi_piece_index;
        feixingqi_draw();
        feixingqi_update_panel(`${feixingqi_names[feixingqi_state.side]}机器人已选择 ${feixingqi_piece_index + 1} 号棋子，正在确认移动`);
        feixingqi_robot_timer = window.setTimeout(() => feixingqi_move_piece(feixingqi_piece_index), 1000);
      }, 650);
    }
  }

  // feixingqi_choose_robot_piece：按 C++ 的“六点起飞、同色飞跃、安全落点、危险落点”层级选择棋子。
  function feixingqi_choose_robot_piece(feixingqi_movable) {
    const feixingqi_start_cells = new Set(Array.from({ length: feixingqi_state.settings.playerCount }, (_, feixingqi_owner) => feixingqi_start_cell(feixingqi_owner, feixingqi_state.settings.playerCount))); // feixingqi_start_cells：所有队伍公共起点格。
    const feixingqi_trap_cells = new Set(); // feixingqi_trap_cells：与棋盘绘制一致的六个陷阱格。
    for (let feixingqi_side_index = 0; feixingqi_side_index < 6; feixingqi_side_index += 1) {
      const feixingqi_trap = [5, 4, 6, 3, 7].map(feixingqi_offset => feixingqi_side_index * 10 + feixingqi_offset).find(feixingqi_cell => !feixingqi_start_cells.has(feixingqi_cell)); // feixingqi_trap：当前边的陷阱格。
      if (Number.isInteger(feixingqi_trap)) feixingqi_trap_cells.add(feixingqi_trap);
    }
    const feixingqi_choices = feixingqi_movable.map(feixingqi_piece_index => {
      const feixingqi_old = feixingqi_state.players[feixingqi_state.side][feixingqi_piece_index]; // feixingqi_old：候选棋子移动前进度。
      const feixingqi_next = feixingqi_old < 0 ? 0 : feixingqi_old + feixingqi_state.dice; // feixingqi_next：候选棋子移动后进度。
      const feixingqi_public = feixingqi_next >= 0 && feixingqi_next < feixingqi_track_count
        ? feixingqi_public_cell(feixingqi_state.side, feixingqi_next, feixingqi_state.settings.playerCount)
        : -1; // feixingqi_public：候选落点的公共跑道格。
      const feixingqi_fly = feixingqi_next > 0 && feixingqi_public >= 0 && feixingqi_public % feixingqi_state.settings.playerCount === feixingqi_state.side; // feixingqi_fly：是否落到本队非起点同色飞跃格。
      const feixingqi_trap = feixingqi_trap_cells.has(feixingqi_public); // feixingqi_trap：是否落入陷阱格。
      const feixingqi_enemy_start = feixingqi_public >= 0 && [...feixingqi_start_cells].some(feixingqi_cell => feixingqi_cell === feixingqi_public && feixingqi_cell !== feixingqi_start_cell(feixingqi_state.side, feixingqi_state.settings.playerCount)); // feixingqi_enemy_start：是否落到其他队伍起点。
      let feixingqi_score = feixingqi_old < 0 ? 30000 : 10000 + feixingqi_next * 120; // feixingqi_score：对应 C++ scorepiece 的基础推进分。
      if (feixingqi_next >= feixingqi_track_count) feixingqi_score = 80000 + (feixingqi_next - feixingqi_track_count) * 2000;
      if (feixingqi_next >= feixingqi_complete_position) feixingqi_score += 100000;
      if (feixingqi_fly) feixingqi_score += 120000;
      if (feixingqi_enemy_start) feixingqi_score -= 60000;
      if (feixingqi_trap) feixingqi_score -= 45000;
      feixingqi_score -= feixingqi_piece_index;
      return { index: feixingqi_piece_index, base: feixingqi_old < 0, fly: feixingqi_fly, trap: feixingqi_trap, enemyStart: feixingqi_enemy_start, score: feixingqi_score };
    }); // feixingqi_choices：所有合法棋子的落点类别与 C++ 权重。
    const feixingqi_best_in = feixingqi_filter => feixingqi_choices
      .filter(feixingqi_filter)
      .sort((feixingqi_left, feixingqi_right) => feixingqi_right.score - feixingqi_left.score)[0]?.index; // feixingqi_best_in：在指定 C++ 决策层级内取最高分棋子。
    if (feixingqi_state.dice === 6) {
      const feixingqi_fly_piece = feixingqi_best_in(feixingqi_choice => feixingqi_choice.fly && !feixingqi_choice.trap); // feixingqi_fly_piece：六点时优先的长飞棋子。
      if (Number.isInteger(feixingqi_fly_piece)) return feixingqi_fly_piece;
      const feixingqi_base_piece = feixingqi_best_in(feixingqi_choice => feixingqi_choice.base); // feixingqi_base_piece：六点时优先起飞的基地棋子。
      if (Number.isInteger(feixingqi_base_piece)) return feixingqi_base_piece;
    }
    const feixingqi_fly_piece = feixingqi_best_in(feixingqi_choice => feixingqi_choice.fly && !feixingqi_choice.trap); // feixingqi_fly_piece：普通点数下的同色飞跃棋子。
    if (Number.isInteger(feixingqi_fly_piece)) return feixingqi_fly_piece;
    const feixingqi_safe_piece = feixingqi_best_in(feixingqi_choice => !feixingqi_choice.enemyStart && !feixingqi_choice.trap); // feixingqi_safe_piece：不落起点和陷阱的安全棋子。
    if (Number.isInteger(feixingqi_safe_piece)) return feixingqi_safe_piece;
    return feixingqi_best_in(() => true) ?? feixingqi_movable[0];
  }

  // feixingqi_select_piece：人工玩家第一次选择预览、第二次选择同一棋子确认移动。
  function feixingqi_select_piece(feixingqi_piece_index) {
    if (!feixingqi_can_move(feixingqi_state, feixingqi_state.side, feixingqi_piece_index)) return;
    if (feixingqi_state.selectedPiece !== feixingqi_piece_index) {
      feixingqi_state.selectedPiece = feixingqi_piece_index;
      feixingqi_draw();
      feixingqi_update_panel(`已选择 ${feixingqi_piece_index + 1} 号棋子，再次点击确认移动`);
      return;
    }
    feixingqi_move_piece(feixingqi_piece_index);
  }

  // feixingqi_lot_roll：为当前队伍掷出抽签点数，机器人和人工使用同一确认流程。
  async function feixingqi_lot_roll(feixingqi_robot) {
    if (feixingqi_state.phase !== "lot" || feixingqi_state.drawn >= feixingqi_state.settings.playerCount || feixingqi_dice_rolling) return;
    const feixingqi_owner = feixingqi_state.drawn; // feixingqi_owner：这一次参加抽签的队伍编号。
    if (!feixingqi_robot && feixingqi_is_robot(feixingqi_state, feixingqi_owner)) return;
    const feixingqi_value = await feixingqi_animate_dice("抽签骰子滚动中。"); // feixingqi_value：抽签动画结束后的最终点数。
    if (!Number.isInteger(feixingqi_value) || feixingqi_state.phase !== "lot" || feixingqi_state.drawn !== feixingqi_owner) return;
    feixingqi_state.drawValues[feixingqi_owner] = feixingqi_value;
    feixingqi_state.drawn += 1;
    if (feixingqi_state.drawn >= feixingqi_state.settings.playerCount) {
      feixingqi_state.turnOrder = Array.from(
        { length: feixingqi_state.settings.playerCount },
        (_, feixingqi_index) => feixingqi_index,
      ).sort((feixingqi_left, feixingqi_right) => feixingqi_state.drawValues[feixingqi_right] - feixingqi_state.drawValues[feixingqi_left] || feixingqi_left - feixingqi_right);
    }
    feixingqi_draw();
    feixingqi_update_panel(`${feixingqi_names[feixingqi_owner]}抽到 ${feixingqi_state.drawValues[feixingqi_owner]} 点`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_enter_play：抽签完成后开始正式对局并从第一名开始独立计时。
  function feixingqi_enter_play() {
    if (feixingqi_state.phase !== "lot" || feixingqi_state.drawn < feixingqi_state.settings.playerCount) return;
    feixingqi_state.side = feixingqi_state.turnOrder[0] ?? 0;
    feixingqi_state.phase = "roll";
    feixingqi_state.stepRemaining = feixingqi_state.settings.stepSeconds;
    feixingqi_state.totalRemaining = Array(feixingqi_state.settings.playerCount).fill(feixingqi_state.settings.totalSeconds);
    feixingqi_draw();
    feixingqi_update_panel(`${feixingqi_names[feixingqi_state.side]}先投骰`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_back_setup：抽签尚未开始正式计时前返回同一窗口内的设置页。
  function feixingqi_back_setup() {
    window.clearTimeout(feixingqi_robot_timer);
    feixingqi_stop_dice_animation();
    feixingqi_state.phase = "setup";
    feixingqi_state.players = [];
    feixingqi_state.drawValues = [];
    feixingqi_state.drawn = 0;
    feixingqi_state.turnOrder = [];
    feixingqi_draw();
    feixingqi_update_panel("已返回游戏设置");
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
  }

  // feixingqi_finish_if_decided：只剩一支未完成队伍时补齐最后名次并结束比赛。
  function feixingqi_finish_if_decided(feixingqi_status) {
    const feixingqi_active = feixingqi_active_owners(feixingqi_state); // feixingqi_active：仍需继续行动的队伍。
    if (feixingqi_active.length > 1) return false;
    if (feixingqi_active.length === 1 && feixingqi_rank_of(feixingqi_state, feixingqi_active[0]) === 0) {
      feixingqi_state.rankings.push(feixingqi_active[0]);
    }
    feixingqi_state.winner = feixingqi_state.rankings[0] ?? -1;
    feixingqi_state.over = true;
    feixingqi_state.phase = "over";
    feixingqi_state.dice = 0;
    feixingqi_state.rolled = false;
    feixingqi_state.selectedPiece = -1;
    window.clearTimeout(feixingqi_robot_timer);
    feixingqi_stop_dice_animation();
    if (!feixingqi_finished_reported) {
      feixingqi_finished_reported = true;
      const feixingqi_result = feixingqi_state.winner >= 0
        ? `${feixingqi_names[feixingqi_state.winner]}获得第一名`
        : "全部名次已经确定"; // feixingqi_result：写入网站历史记录的最终结果。
      feixingqi_services.finish(feixingqi_result);
    }
    feixingqi_panel_status = feixingqi_status || "全部名次已经确定";
    return true;
  }

  // feixingqi_move_piece：移动棋子、执行同色飞跃、换手和判断胜负。
  function feixingqi_move_piece(feixingqi_piece_index) {
    const feixingqi_owner = feixingqi_state.side; // feixingqi_owner：本次行动玩家编号。
    if (!feixingqi_can_move(feixingqi_state, feixingqi_owner, feixingqi_piece_index)) return;
    const feixingqi_old_position = feixingqi_state.players[feixingqi_owner][feixingqi_piece_index]; // feixingqi_old_position：移动前进度。
    let feixingqi_new_position = feixingqi_old_position < 0 ? 0 : feixingqi_old_position + feixingqi_state.dice; // feixingqi_new_position：移动后进度，可能继续执行同色飞跃。
    let feixingqi_flew = false; // feixingqi_flew：本步是否触发同色格飞跃。
    feixingqi_state.jumpActive = false;
    feixingqi_state.jumpFrom = -1;
    feixingqi_state.jumpTo = -1;
    feixingqi_state.jumpOwner = -1;
    if (feixingqi_new_position >= 0 && feixingqi_new_position < feixingqi_track_count) {
      const feixingqi_public_position = feixingqi_public_cell(feixingqi_owner, feixingqi_new_position, feixingqi_state.settings.playerCount); // feixingqi_public_position：移动后的公共跑道格号。
      const feixingqi_jump_position = feixingqi_new_position + feixingqi_state.settings.playerCount; // feixingqi_jump_position：下一同色格对应的相对进度。
      if (feixingqi_new_position > 0 && feixingqi_public_position % feixingqi_state.settings.playerCount === feixingqi_owner && feixingqi_jump_position < feixingqi_track_count) {
        feixingqi_state.jumpActive = true;
        feixingqi_state.jumpFrom = feixingqi_public_position;
        feixingqi_state.jumpTo = feixingqi_public_cell(feixingqi_owner, feixingqi_jump_position, feixingqi_state.settings.playerCount);
        feixingqi_state.jumpOwner = feixingqi_owner;
        feixingqi_new_position = feixingqi_jump_position;
        feixingqi_flew = true;
      }
    }
    feixingqi_state.players[feixingqi_owner][feixingqi_piece_index] = feixingqi_new_position;
    feixingqi_state.moves += 1;
    let feixingqi_rank = 0; // feixingqi_rank：本步完成比赛后取得的名次。
    if (!feixingqi_state.completed?.[feixingqi_owner]
      && feixingqi_state.players[feixingqi_owner].every(feixingqi_position => feixingqi_position >= feixingqi_complete_position)) {
      feixingqi_state.completed[feixingqi_owner] = true;
      feixingqi_state.rankings.push(feixingqi_owner);
      feixingqi_rank = feixingqi_state.rankings.length;
      if (feixingqi_rank === 1) feixingqi_state.winner = feixingqi_owner;
    }
    const feixingqi_decided = feixingqi_rank > 0
      ? feixingqi_finish_if_decided(`${feixingqi_names[feixingqi_owner]}已完成，当前排名第${feixingqi_rank}名`)
      : false; // feixingqi_decided：本步后是否已经能够确定全部名次。
    const feixingqi_extra_turn = feixingqi_state.dice === 6 && !feixingqi_state.over && feixingqi_rank === 0; // feixingqi_extra_turn：投出六点且尚未完成比赛时是否继续行动。
    feixingqi_state.dice = 0;
    feixingqi_state.rolled = false;
    feixingqi_state.selectedPiece = -1;
    if (!feixingqi_extra_turn && !feixingqi_state.over) feixingqi_state.side = feixingqi_next_active_owner(feixingqi_state, feixingqi_state.side);
    if (!feixingqi_state.over) feixingqi_state.phase = "roll";
    feixingqi_reset_step_clock();
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel(feixingqi_decided
      ? "全部名次已经确定"
      : (feixingqi_rank > 0
        ? `${feixingqi_names[feixingqi_owner]}已完成，当前排名第${feixingqi_rank}名`
        : (feixingqi_extra_turn
          ? (feixingqi_flew ? "同色飞跃完成；投出六点，再行动一次" : "投出六点，再行动一次")
          : (feixingqi_flew ? "落到同色格，已飞跃到下一同色格" : "移动完成"))));
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_finish_turn：无棋可走时自动结束当前玩家回合。
  function feixingqi_finish_turn() {
    feixingqi_state.dice = 0;
    feixingqi_state.rolled = false;
    feixingqi_state.selectedPiece = -1;
    feixingqi_state.side = feixingqi_next_active_owner(feixingqi_state, feixingqi_state.side);
    feixingqi_state.phase = "roll";
    feixingqi_reset_step_clock();
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel("没有可移动棋子，自动跳过");
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_schedule_robot：为当前机器人玩家安排自动投骰。
  function feixingqi_schedule_robot() {
    window.clearTimeout(feixingqi_robot_timer);
    if (feixingqi_state.over || feixingqi_state.phase === "setup" || feixingqi_dice_rolling) return;
    if (feixingqi_state.phase === "lot") {
      if (feixingqi_state.drawn >= feixingqi_state.settings.playerCount || !feixingqi_is_robot(feixingqi_state, feixingqi_state.drawn)) return;
      feixingqi_update_panel(`${feixingqi_names[feixingqi_state.drawn]}正在抽签…`);
      feixingqi_robot_timer = window.setTimeout(() => feixingqi_lot_roll(true), 620);
      return;
    }
    if (feixingqi_state.eliminated?.[feixingqi_state.side] || feixingqi_state.completed?.[feixingqi_state.side] || !feixingqi_is_robot(feixingqi_state, feixingqi_state.side)) return;
    feixingqi_update_panel(`${feixingqi_names[feixingqi_state.side]}机器人正在决策…`);
    feixingqi_robot_timer = window.setTimeout(() => feixingqi_roll(true), 520);
  }

  // feixingqi_lose_by_time：步时或局时耗尽时淘汰当前队伍，并继续剩余队伍的对局。
  function feixingqi_lose_by_time(feixingqi_owner, feixingqi_timeout_kind) {
    if (feixingqi_state.over || feixingqi_state.phase === "setup" || feixingqi_state.phase === "lot" || feixingqi_state.eliminated?.[feixingqi_owner]) return;
    window.clearTimeout(feixingqi_robot_timer);
    feixingqi_stop_dice_animation();
    const feixingqi_finished = (feixingqi_state.players[feixingqi_owner] || []).filter(feixingqi_position => feixingqi_position >= feixingqi_complete_position).length; // feixingqi_finished：判负瞬间已经完成的棋子数量。
    feixingqi_state.eliminated[feixingqi_owner] = true;
    feixingqi_state.eliminationOrder.push(feixingqi_owner);
    feixingqi_state.eliminatedFinished[feixingqi_owner] = feixingqi_finished;
    feixingqi_state.dice = 0;
    feixingqi_state.rolled = false;
    feixingqi_state.selectedPiece = -1;
    feixingqi_state.jumpActive = false;
    feixingqi_state.jumpFrom = -1;
    feixingqi_state.jumpTo = -1;
    feixingqi_state.jumpOwner = -1;
    const feixingqi_timeout_status = `${feixingqi_names[feixingqi_owner]}超时出局，当前第${feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner)}名`; // feixingqi_timeout_status：本次超时及动态名次提示。
    if (!feixingqi_finish_if_decided(feixingqi_timeout_status)) {
      feixingqi_state.side = feixingqi_next_active_owner(feixingqi_state, feixingqi_owner);
      feixingqi_state.phase = "roll";
      feixingqi_reset_step_clock();
    }
    feixingqi_draw();
    feixingqi_update_panel(`${feixingqi_names[feixingqi_owner]}${feixingqi_timeout_kind}耗尽，超时出局，当前第${feixingqi_eliminated_rank(feixingqi_state, feixingqi_owner)}名`);
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
    feixingqi_schedule_robot();
  }

  // feixingqi_undo：恢复最近一次投骰前的完整状态。
  function feixingqi_undo() {
    if (feixingqi_dice_rolling) return;
    if (!feixingqi_memory_history.length) {
      feixingqi_services.toast("当前没有可返回的步骤");
      return;
    }
    window.clearTimeout(feixingqi_robot_timer);
    feixingqi_state = feixingqi_memory_history.pop();
    feixingqi_state.over = false;
    feixingqi_finished_reported = false;
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel("已返回上一步");
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
  }

  // feixingqi_new_game：返回飞行棋同一左右窗口内的设置阶段。
  async function feixingqi_new_game() {
    window.clearTimeout(feixingqi_robot_timer);
    feixingqi_stop_dice_animation();
    await feixingqi_services.clearSave();
    feixingqi_state = feixingqi_initial_state();
    feixingqi_memory_history.length = 0;
    feixingqi_finished_reported = false;
    feixingqi_draw();
    feixingqi_render_controls();
    feixingqi_update_panel("请在右侧完成新游戏设置");
    feixingqi_services.save(qilei_deep_copy(feixingqi_state));
  }

  // feixingqi_handle_keyboard：复刻本地设置、抽签、投骰和数字二次确认按键。
  function feixingqi_handle_keyboard(feixingqi_event) {
    if (feixingqi_dice_rolling) return;
    if (feixingqi_event.key === "Escape") {
      feixingqi_event.preventDefault();
      document.getElementById("back-lobby")?.click();
      return;
    }
    if (feixingqi_event.key.toLowerCase() === "n" && feixingqi_state.phase !== "setup") {
      feixingqi_event.preventDefault();
      feixingqi_new_game();
      return;
    }
    if (feixingqi_state.phase === "setup") {
      if (feixingqi_event.key === "ArrowUp" || feixingqi_event.key === "ArrowDown") {
        feixingqi_event.preventDefault();
        const feixingqi_row_count = feixingqi_setup_rows().length; // feixingqi_row_count：设置区固定行数。
        feixingqi_setup_focus = (feixingqi_setup_focus + (feixingqi_event.key === "ArrowDown" ? 1 : feixingqi_row_count - 1)) % feixingqi_row_count;
        feixingqi_render_controls();
      } else if (feixingqi_event.key === "ArrowLeft" || feixingqi_event.key === "ArrowRight") {
        feixingqi_event.preventDefault();
        feixingqi_adjust_setup(feixingqi_setup_focus, feixingqi_event.key === "ArrowRight" ? 1 : -1);
      } else if (feixingqi_event.key === "Enter") {
        feixingqi_event.preventDefault();
        feixingqi_start_game();
      }
      return;
    }
    if (feixingqi_state.phase === "lot") {
      if (feixingqi_event.code === "Space" && feixingqi_state.drawn < feixingqi_state.settings.playerCount && !feixingqi_is_robot(feixingqi_state, feixingqi_state.drawn)) {
        feixingqi_event.preventDefault();
        feixingqi_lot_roll(false);
      } else if (feixingqi_event.key === "Enter" && feixingqi_state.drawn >= feixingqi_state.settings.playerCount) {
        feixingqi_event.preventDefault();
        feixingqi_enter_play();
      } else if (feixingqi_event.key === "Delete" || feixingqi_event.key === "Backspace") {
        feixingqi_event.preventDefault();
        feixingqi_back_setup();
      }
      return;
    }
    if (!["roll", "select"].includes(feixingqi_state.phase) || feixingqi_state.over || feixingqi_is_robot(feixingqi_state, feixingqi_state.side)) return;
    if (feixingqi_event.code === "Space" && !feixingqi_state.rolled) {
      feixingqi_event.preventDefault();
      feixingqi_roll(false);
      return;
    }
    if (feixingqi_event.key === "Delete" || feixingqi_event.key === "Backspace" || feixingqi_event.key.toLowerCase() === "u") {
      feixingqi_event.preventDefault();
      feixingqi_undo();
      return;
    }
    if (feixingqi_state.rolled && /^[0-6]$/.test(feixingqi_event.key)) {
      feixingqi_event.preventDefault();
      const feixingqi_number = Number(feixingqi_event.key); // feixingqi_number：数字键对应的一至六号棋子，零表示跳过。
      if (feixingqi_number === 0) {
        feixingqi_finish_turn();
      } else {
        feixingqi_select_piece(feixingqi_number - 1);
      }
    }
  }

  // feixingqi_handle_board_click：让人工玩家像本地 C++ 一样第一次选棋、第二次确认移动。
  function feixingqi_handle_board_click(feixingqi_event) {
    if (feixingqi_dice_rolling || feixingqi_state.phase !== "select" || feixingqi_state.over || feixingqi_is_robot(feixingqi_state, feixingqi_state.side)) return;
    const feixingqi_click = qilei_canvas_point(feixingqi_canvas, feixingqi_event); // feixingqi_click：换算到一千乘九百五十逻辑画布内的点击坐标。
    const feixingqi_points = feixingqi_track_points(); // feixingqi_points：用于定位当前玩家棋子的地图格中心。
    let feixingqi_hit_piece = -1; // feixingqi_hit_piece：当前命中的可走棋子编号。
    let feixingqi_hit_distance = Number.POSITIVE_INFINITY; // feixingqi_hit_distance：重叠棋子中离操作点最近的距离。
    for (const feixingqi_piece_index of feixingqi_movable_pieces(feixingqi_state)) {
      const feixingqi_piece = feixingqi_piece_point(feixingqi_state.side, feixingqi_piece_index, feixingqi_points); // feixingqi_piece：一枚可走棋子的画布中心。
      const feixingqi_distance = Math.hypot(feixingqi_click.x - feixingqi_piece.x, feixingqi_click.y - feixingqi_piece.y); // feixingqi_distance：操作点到棋子中心的距离。
      if (feixingqi_distance <= 25 && feixingqi_distance < feixingqi_hit_distance) {
        feixingqi_hit_piece = feixingqi_piece_index;
        feixingqi_hit_distance = feixingqi_distance;
      }
    }
    if (feixingqi_hit_piece >= 0) feixingqi_select_piece(feixingqi_hit_piece);
  }

  document.addEventListener("keydown", feixingqi_handle_keyboard);
  feixingqi_canvas.addEventListener("click", feixingqi_handle_board_click);
  feixingqi_draw();
  feixingqi_render_controls();
  feixingqi_update_panel(feixingqi_saved_state ? "已读取个人存档" : "请在右侧完成游戏设置");
  feixingqi_services.save(qilei_deep_copy(feixingqi_state));
  feixingqi_schedule_robot();
  feixingqi_start_clock();

  return {
    getState: () => qilei_deep_copy(feixingqi_state),
    destroy: () => {
      feixingqi_destroyed = true;
      feixingqi_stop_dice_animation();
      window.clearTimeout(feixingqi_robot_timer);
      window.clearInterval(feixingqi_clock_timer);
      document.removeEventListener("keydown", feixingqi_handle_keyboard);
      feixingqi_canvas.removeEventListener("click", feixingqi_handle_board_click);
    },
  };
}
