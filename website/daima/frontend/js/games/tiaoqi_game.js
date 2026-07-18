// tiaoqi_game.js：按 C++ 的 1320×860 左棋盘、右设置/操作区实现二至六人星形跳棋。

import {
  qilei_canvas_point,
  qilei_clamp,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
} from "./qilei_game_utils.js";

const tiaoqi_empty = 0; // tiaoqi_empty：空孔编码。
const tiaoqi_max_players = 6; // tiaoqi_max_players：C++ 支持的最大玩家数量。
const tiaoqi_row_lengths = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1]; // tiaoqi_row_lengths：十七行星形棋盘的孔数。
const tiaoqi_board_center_x = 430; // tiaoqi_board_center_x：左侧棋盘中心横坐标。
const tiaoqi_board_top_y = 94; // tiaoqi_board_top_y：C++ 最上方孔位纵坐标。
const tiaoqi_point_space = 40; // tiaoqi_point_space：同行相邻孔位间距。
const tiaoqi_row_space = 34.6410161514; // tiaoqi_row_space：相邻行纵向间距。
const tiaoqi_player_colors = ["#e83f3f", "#3478d7", "#2fa35f", "#ef8a21", "#8c4bd1", "#27a3b6"]; // tiaoqi_player_colors：C++ 固定的红、蓝、绿、橙、紫、青六色。
const tiaoqi_player_names = ["红方", "蓝方", "绿方", "橙方", "紫方", "青方"]; // tiaoqi_player_names：右侧状态中显示的玩家名称。
const tiaoqi_arm_order = [0, 1, 2, 3, 4, 5]; // tiaoqi_arm_order：从顶端开始顺时针的六个阵营编号。
const tiaoqi_player_arm_sets = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: tiaoqi_arm_order,
}; // tiaoqi_player_arm_sets：不同人数时均匀分配的起始阵营。

// tiaoqi_build_points：生成与 C++ 坐标比例一致的 121 个孔位。
function tiaoqi_build_points() {
  const tiaoqi_points_result = []; // tiaoqi_points_result：按行保存的全部孔位。
  for (let tiaoqi_row = 0; tiaoqi_row < tiaoqi_row_lengths.length; tiaoqi_row += 1) {
    const tiaoqi_length = tiaoqi_row_lengths[tiaoqi_row]; // tiaoqi_length：当前行孔位数量。
    for (let tiaoqi_col = 0; tiaoqi_col < tiaoqi_length; tiaoqi_col += 1) {
      tiaoqi_points_result.push({
        row: tiaoqi_row,
        col: tiaoqi_col,
        x: tiaoqi_board_center_x + (tiaoqi_col - (tiaoqi_length - 1) / 2) * tiaoqi_point_space,
        y: tiaoqi_board_top_y + tiaoqi_row * tiaoqi_row_space,
      });
    }
  }
  return tiaoqi_points_result;
}

const tiaoqi_points = tiaoqi_build_points(); // tiaoqi_points：星形棋盘全部固定孔位。

// tiaoqi_row_indices：返回指定棋盘行的全部孔位下标。
function tiaoqi_row_indices(tiaoqi_row) {
  return tiaoqi_points
    .map((tiaoqi_point, tiaoqi_index) => ({ point: tiaoqi_point, index: tiaoqi_index }))
    .filter(tiaoqi_item => tiaoqi_item.point.row === tiaoqi_row)
    .map(tiaoqi_item => tiaoqi_item.index);
}

// tiaoqi_build_camps：生成顶、右上、右下、底、左下、左上六个十孔阵营。
function tiaoqi_build_camps() {
  const tiaoqi_top = tiaoqi_points.map((_, tiaoqi_index) => tiaoqi_index).filter(tiaoqi_index => tiaoqi_points[tiaoqi_index].row <= 3); // tiaoqi_top：顶部十孔阵营。
  const tiaoqi_bottom = tiaoqi_points.map((_, tiaoqi_index) => tiaoqi_index).filter(tiaoqi_index => tiaoqi_points[tiaoqi_index].row >= 13); // tiaoqi_bottom：底部十孔阵营。
  const tiaoqi_upper_left = []; // tiaoqi_upper_left：左上十孔阵营。
  const tiaoqi_upper_right = []; // tiaoqi_upper_right：右上十孔阵营。
  const tiaoqi_lower_left = []; // tiaoqi_lower_left：左下十孔阵营。
  const tiaoqi_lower_right = []; // tiaoqi_lower_right：右下十孔阵营。
  for (let tiaoqi_row = 4; tiaoqi_row <= 7; tiaoqi_row += 1) {
    const tiaoqi_row_points = tiaoqi_row_indices(tiaoqi_row); // tiaoqi_row_points：上半臂当前行孔位。
    const tiaoqi_count = 8 - tiaoqi_row; // tiaoqi_count：当前行属于一个外臂的孔位数。
    tiaoqi_upper_left.push(...tiaoqi_row_points.slice(0, tiaoqi_count));
    tiaoqi_upper_right.push(...tiaoqi_row_points.slice(-tiaoqi_count));
  }
  for (let tiaoqi_row = 9; tiaoqi_row <= 12; tiaoqi_row += 1) {
    const tiaoqi_row_points = tiaoqi_row_indices(tiaoqi_row); // tiaoqi_row_points：下半臂当前行孔位。
    const tiaoqi_count = tiaoqi_row - 8; // tiaoqi_count：当前行属于一个外臂的孔位数。
    tiaoqi_lower_left.push(...tiaoqi_row_points.slice(0, tiaoqi_count));
    tiaoqi_lower_right.push(...tiaoqi_row_points.slice(-tiaoqi_count));
  }
  return [tiaoqi_top, tiaoqi_upper_right, tiaoqi_lower_right, tiaoqi_bottom, tiaoqi_lower_left, tiaoqi_upper_left];
}

const tiaoqi_camps = tiaoqi_build_camps(); // tiaoqi_camps：顺时针排列的六个十孔阵营。

// tiaoqi_distance：计算两个孔位中心的直线距离。
function tiaoqi_distance(tiaoqi_first, tiaoqi_second) {
  return Math.hypot(tiaoqi_first.x - tiaoqi_second.x, tiaoqi_first.y - tiaoqi_second.y);
}

// tiaoqi_build_links：预计算相邻步进和隔一孔跳跃连接。
function tiaoqi_build_links() {
  const tiaoqi_neighbors = tiaoqi_points.map(() => []); // tiaoqi_neighbors：每个孔位的相邻孔。
  const tiaoqi_jumps = tiaoqi_points.map(() => []); // tiaoqi_jumps：每个孔位的中间孔和落点组合。
  for (let tiaoqi_from = 0; tiaoqi_from < tiaoqi_points.length; tiaoqi_from += 1) {
    for (let tiaoqi_to = 0; tiaoqi_to < tiaoqi_points.length; tiaoqi_to += 1) {
      if (tiaoqi_from === tiaoqi_to) continue;
      const tiaoqi_length = tiaoqi_distance(tiaoqi_points[tiaoqi_from], tiaoqi_points[tiaoqi_to]); // tiaoqi_length：候选孔位间距离。
      if (Math.abs(tiaoqi_length - tiaoqi_point_space) < 1.1) tiaoqi_neighbors[tiaoqi_from].push(tiaoqi_to);
      if (Math.abs(tiaoqi_length - tiaoqi_point_space * 2) < 1.2) {
        const tiaoqi_middle_x = (tiaoqi_points[tiaoqi_from].x + tiaoqi_points[tiaoqi_to].x) / 2; // tiaoqi_middle_x：跨越孔横坐标。
        const tiaoqi_middle_y = (tiaoqi_points[tiaoqi_from].y + tiaoqi_points[tiaoqi_to].y) / 2; // tiaoqi_middle_y：跨越孔纵坐标。
        const tiaoqi_middle = tiaoqi_points.findIndex(tiaoqi_point => Math.hypot(tiaoqi_point.x - tiaoqi_middle_x, tiaoqi_point.y - tiaoqi_middle_y) < 1); // tiaoqi_middle：跨越孔下标。
        if (tiaoqi_middle >= 0) tiaoqi_jumps[tiaoqi_from].push({ middle: tiaoqi_middle, to: tiaoqi_to });
      }
    }
  }
  return { neighbors: tiaoqi_neighbors, jumps: tiaoqi_jumps };
}

const tiaoqi_links = tiaoqi_build_links(); // tiaoqi_links：步进和连续跳跃连接表。

// tiaoqi_initial_state：创建同一左右窗口中的设置阶段状态。
function tiaoqi_initial_state() {
  return {
    version: 2,
    phase: "setup",
    settings: { playerCount: 3, pieceCount: 3, robotCount: 0, stepSeconds: 30, totalSeconds: 600 },
    board: Array(tiaoqi_points.length).fill(tiaoqi_empty),
    playerArms: [],
    side: 0,
    moves: 0,
    over: false,
    winner: -1,
    lastMove: null,
    stepRemaining: 30,
    totalRemaining: [],
    eliminated: [],
    eliminationOrder: [],
    eliminationProgress: [],
    completed: [],
    rankings: [],
  };
}

// tiaoqi_valid_state：验证读取内容是否为新版二至六人跳棋存档。
function tiaoqi_valid_state(tiaoqi_value) {
  return Boolean(
    tiaoqi_value
    && tiaoqi_value.version === 2
    && tiaoqi_value.settings
    && tiaoqi_value.settings.playerCount >= 2
    && tiaoqi_value.settings.playerCount <= tiaoqi_max_players
    && Array.isArray(tiaoqi_value.board)
    && tiaoqi_value.board.length === tiaoqi_points.length,
  );
}

// tiaoqi_restore_state：读取新版存档，并把旧版双人十子存档升级到新版多玩家结构。
function tiaoqi_restore_state(tiaoqi_value) {
  if (tiaoqi_valid_state(tiaoqi_value)) {
    const tiaoqi_restored = qilei_deep_copy(tiaoqi_value); // tiaoqi_restored：补齐旧网页存档多玩家计时字段后的状态。
    tiaoqi_restored.stepRemaining = Number.isFinite(tiaoqi_restored.stepRemaining) ? tiaoqi_restored.stepRemaining : tiaoqi_restored.settings.stepSeconds;
    tiaoqi_restored.totalRemaining = Array.isArray(tiaoqi_restored.totalRemaining) && tiaoqi_restored.totalRemaining.length === tiaoqi_restored.settings.playerCount
      ? tiaoqi_restored.totalRemaining
      : Array(tiaoqi_restored.settings.playerCount).fill(tiaoqi_restored.settings.totalSeconds);
    tiaoqi_restored.eliminated = Array.isArray(tiaoqi_restored.eliminated) && tiaoqi_restored.eliminated.length === tiaoqi_restored.settings.playerCount
      ? tiaoqi_restored.eliminated
      : Array(tiaoqi_restored.settings.playerCount).fill(false);
    tiaoqi_restored.eliminationOrder = Array.isArray(tiaoqi_restored.eliminationOrder) ? tiaoqi_restored.eliminationOrder : [];
    tiaoqi_restored.eliminationProgress = Array.isArray(tiaoqi_restored.eliminationProgress) && tiaoqi_restored.eliminationProgress.length === tiaoqi_restored.settings.playerCount
      ? tiaoqi_restored.eliminationProgress
      : Array(tiaoqi_restored.settings.playerCount).fill(0);
    tiaoqi_restored.completed = Array.isArray(tiaoqi_restored.completed) && tiaoqi_restored.completed.length === tiaoqi_restored.settings.playerCount
      ? tiaoqi_restored.completed
      : Array(tiaoqi_restored.settings.playerCount).fill(false);
    tiaoqi_restored.rankings = Array.isArray(tiaoqi_restored.rankings) ? tiaoqi_restored.rankings : [];
    return tiaoqi_restored;
  }
  if (tiaoqi_value && Array.isArray(tiaoqi_value.board) && tiaoqi_value.board.length === tiaoqi_points.length) {
    const tiaoqi_red_count = tiaoqi_value.board.filter(tiaoqi_owner => tiaoqi_owner === 1).length; // tiaoqi_red_count：旧存档红方棋子数量。
    const tiaoqi_blue_count = tiaoqi_value.board.filter(tiaoqi_owner => tiaoqi_owner === 2).length; // tiaoqi_blue_count：旧存档蓝方棋子数量。
    const tiaoqi_piece_count = [3, 6, 10].find(tiaoqi_count => tiaoqi_count >= Math.max(tiaoqi_red_count, tiaoqi_blue_count)) || 10; // tiaoqi_piece_count：与旧棋子数匹配的新设置。
    return {
      version: 2,
      phase: tiaoqi_value.over ? "over" : "play",
      settings: { playerCount: 2, pieceCount: tiaoqi_piece_count, robotCount: 1, stepSeconds: 30, totalSeconds: 600 },
      board: qilei_deep_copy(tiaoqi_value.board),
      playerArms: [3, 0],
      side: tiaoqi_value.side === 2 ? 1 : 0,
      moves: Number(tiaoqi_value.moves) || 0,
      over: Boolean(tiaoqi_value.over),
      winner: tiaoqi_value.winner === 2 ? 1 : (tiaoqi_value.winner === 1 ? 0 : -1),
      lastMove: tiaoqi_value.lastMove || null,
      stepRemaining: 30,
      totalRemaining: [600, 600],
      eliminated: [false, false],
      eliminationOrder: [],
      eliminationProgress: [0, 0],
      completed: [false, false],
      rankings: [],
    };
  }
  return tiaoqi_initial_state();
}

// tiaoqi_jump_targets：广度搜索一次或连续多次跳跃的全部可达空孔。
function tiaoqi_jump_targets(tiaoqi_board, tiaoqi_from) {
  const tiaoqi_targets = new Set(); // tiaoqi_targets：连续跳跃可达落点。
  const tiaoqi_seen = new Set([tiaoqi_from]); // tiaoqi_seen：已经展开的落点。
  const tiaoqi_queue = [tiaoqi_from]; // tiaoqi_queue：等待继续搜索的落点队列。
  while (tiaoqi_queue.length) {
    const tiaoqi_current = tiaoqi_queue.shift(); // tiaoqi_current：本轮搜索起点。
    for (const tiaoqi_jump of tiaoqi_links.jumps[tiaoqi_current]) {
      const tiaoqi_target_occupied = tiaoqi_jump.to === tiaoqi_from ? false : Boolean(tiaoqi_board[tiaoqi_jump.to]); // tiaoqi_target_occupied：把原起点视为空后的落点占用状态。
      if (tiaoqi_board[tiaoqi_jump.middle] && !tiaoqi_target_occupied && !tiaoqi_seen.has(tiaoqi_jump.to)) {
        tiaoqi_seen.add(tiaoqi_jump.to);
        tiaoqi_targets.add(tiaoqi_jump.to);
        tiaoqi_queue.push(tiaoqi_jump.to);
      }
    }
  }
  return [...tiaoqi_targets];
}

// tiaoqi_legal_targets：合并相邻步进和连续跳跃落点。
function tiaoqi_legal_targets(tiaoqi_board, tiaoqi_from) {
  const tiaoqi_targets = new Set(tiaoqi_jump_targets(tiaoqi_board, tiaoqi_from)); // tiaoqi_targets：当前棋子的全部合法目标。
  for (const tiaoqi_to of tiaoqi_links.neighbors[tiaoqi_from]) {
    if (!tiaoqi_board[tiaoqi_to]) tiaoqi_targets.add(tiaoqi_to);
  }
  return [...tiaoqi_targets];
}

// tiaoqi_goal_camp：返回一名玩家起始阵营对面的目标阵营。
function tiaoqi_goal_camp(tiaoqi_state, tiaoqi_player) {
  const tiaoqi_arm = tiaoqi_state.playerArms[tiaoqi_player]; // tiaoqi_arm：该玩家的起始阵营编号。
  return tiaoqi_camps[(tiaoqi_arm + 3) % 6];
}

// tiaoqi_piece_indices：返回指定玩家当前所有棋子孔位。
function tiaoqi_piece_indices(tiaoqi_state, tiaoqi_player) {
  return tiaoqi_state.board
    .map((tiaoqi_owner, tiaoqi_index) => ({ owner: tiaoqi_owner, index: tiaoqi_index }))
    .filter(tiaoqi_item => tiaoqi_item.owner === tiaoqi_player + 1)
    .map(tiaoqi_item => tiaoqi_item.index);
}

// tiaoqi_goal_count：统计一名玩家已经进入目标阵营的棋子数量。
function tiaoqi_goal_count(tiaoqi_state, tiaoqi_player) {
  const tiaoqi_goal = new Set(tiaoqi_goal_camp(tiaoqi_state, tiaoqi_player)); // tiaoqi_goal：目标阵营孔位集合。
  return tiaoqi_piece_indices(tiaoqi_state, tiaoqi_player).filter(tiaoqi_index => tiaoqi_goal.has(tiaoqi_index)).length;
}

// tiaoqi_goal_distance：估算一枚棋子到目标阵营中心的距离。
function tiaoqi_goal_distance(tiaoqi_state, tiaoqi_player, tiaoqi_index) {
  const tiaoqi_goal = tiaoqi_goal_camp(tiaoqi_state, tiaoqi_player); // tiaoqi_goal：当前玩家目标阵营。
  const tiaoqi_goal_x = tiaoqi_goal.reduce((tiaoqi_total, tiaoqi_goal_index) => tiaoqi_total + tiaoqi_points[tiaoqi_goal_index].x, 0) / tiaoqi_goal.length; // tiaoqi_goal_x：目标阵营中心横坐标。
  const tiaoqi_goal_y = tiaoqi_goal.reduce((tiaoqi_total, tiaoqi_goal_index) => tiaoqi_total + tiaoqi_points[tiaoqi_goal_index].y, 0) / tiaoqi_goal.length; // tiaoqi_goal_y：目标阵营中心纵坐标。
  return Math.hypot(tiaoqi_points[tiaoqi_index].x - tiaoqi_goal_x, tiaoqi_points[tiaoqi_index].y - tiaoqi_goal_y);
}

// tiaoqi_total_distance：计算一名玩家全部棋子的目标距离总和。
function tiaoqi_total_distance(tiaoqi_state, tiaoqi_player) {
  return tiaoqi_piece_indices(tiaoqi_state, tiaoqi_player)
    .reduce((tiaoqi_total, tiaoqi_index) => tiaoqi_total + tiaoqi_goal_distance(tiaoqi_state, tiaoqi_player, tiaoqi_index), 0);
}

// tiaoqi_all_moves：枚举指定玩家的全部合法移动。
function tiaoqi_all_moves(tiaoqi_state, tiaoqi_player) {
  const tiaoqi_moves = []; // tiaoqi_moves：全部起点和落点组合。
  for (const tiaoqi_from of tiaoqi_piece_indices(tiaoqi_state, tiaoqi_player)) {
    for (const tiaoqi_to of tiaoqi_legal_targets(tiaoqi_state.board, tiaoqi_from)) {
      tiaoqi_moves.push({ from: tiaoqi_from, to: tiaoqi_to });
    }
  }
  return tiaoqi_moves;
}

// tiaoqi_has_won：判断一名玩家是否把所选数量棋子全部送入目标阵营。
function tiaoqi_has_won(tiaoqi_state, tiaoqi_player) {
  return tiaoqi_goal_count(tiaoqi_state, tiaoqi_player) === tiaoqi_state.settings.pieceCount;
}

// tiaoqi_is_robot：判断指定玩家是否属于设置中靠后的机器人。
function tiaoqi_is_robot(tiaoqi_state, tiaoqi_player) {
  return tiaoqi_player >= tiaoqi_state.settings.playerCount - tiaoqi_state.settings.robotCount;
}

// tiaoqi_active_players：返回仍在对局中的玩家编号。
function tiaoqi_active_players(tiaoqi_state) {
  return Array.from({ length: tiaoqi_state.settings.playerCount }, (_, tiaoqi_player) => tiaoqi_player)
    .filter(tiaoqi_player => !tiaoqi_state.eliminated?.[tiaoqi_player] && !tiaoqi_state.completed?.[tiaoqi_player]);
}

// tiaoqi_next_active_player：寻找行动顺序中的下一名未出局玩家。
function tiaoqi_next_active_player(tiaoqi_state, tiaoqi_player) {
  for (let tiaoqi_offset = 1; tiaoqi_offset <= tiaoqi_state.settings.playerCount; tiaoqi_offset += 1) {
    const tiaoqi_candidate = (tiaoqi_player + tiaoqi_offset) % tiaoqi_state.settings.playerCount; // tiaoqi_candidate：本轮检查的候选玩家。
    if (!tiaoqi_state.eliminated?.[tiaoqi_candidate] && !tiaoqi_state.completed?.[tiaoqi_candidate]) return tiaoqi_candidate;
  }
  return tiaoqi_player;
}

// tiaoqi_rank_of：返回正常完成或最后剩余玩家已经确定的名次。
function tiaoqi_rank_of(tiaoqi_state, tiaoqi_player) {
  const tiaoqi_index = (tiaoqi_state.rankings || []).indexOf(tiaoqi_player); // tiaoqi_index：玩家在正常排名数组中的位置。
  return tiaoqi_index >= 0 ? tiaoqi_index + 1 : 0;
}

// tiaoqi_eliminated_ranking：按判负时完成数排序，完成数相同时后判负者靠前。
function tiaoqi_eliminated_ranking(tiaoqi_state) {
  return [...(tiaoqi_state.eliminationOrder || [])].sort((tiaoqi_left, tiaoqi_right) => {
    const tiaoqi_difference = (tiaoqi_state.eliminationProgress?.[tiaoqi_right] || 0) - (tiaoqi_state.eliminationProgress?.[tiaoqi_left] || 0); // tiaoqi_difference：两名判负玩家的固定完成数差。
    if (tiaoqi_difference !== 0) return tiaoqi_difference;
    return tiaoqi_state.eliminationOrder.indexOf(tiaoqi_right) - tiaoqi_state.eliminationOrder.indexOf(tiaoqi_left);
  });
}

// tiaoqi_eliminated_rank：返回判负玩家在全部玩家中的动态末尾名次。
function tiaoqi_eliminated_rank(tiaoqi_state, tiaoqi_player) {
  const tiaoqi_order = tiaoqi_eliminated_ranking(tiaoqi_state); // tiaoqi_order：当前判负玩家名次顺序。
  const tiaoqi_index = tiaoqi_order.indexOf(tiaoqi_player); // tiaoqi_index：玩家在判负名次顺序中的位置。
  return tiaoqi_index < 0 ? 0 : tiaoqi_state.settings.playerCount - tiaoqi_order.length + 1 + tiaoqi_index;
}

// tiaoqi_predict：根据各玩家目标距离生成当前玩家和其他玩家的胜负预测。
function tiaoqi_predict(tiaoqi_state) {
  if (tiaoqi_state.moves === 0) return { first: 50, second: 50, summary: "开局阵形对称，各方机会均等" };
  if (tiaoqi_state.over) return tiaoqi_state.winner === 0
    ? { first: 100, second: 0, summary: `${tiaoqi_player_names[0]}全部进入目标阵营` }
    : { first: 0, second: 100, summary: `${tiaoqi_player_names[tiaoqi_state.winner]}全部进入目标阵营` };
  if (tiaoqi_state.eliminated?.[0]) return { first: 0, second: 100, summary: `${tiaoqi_player_names[0]}已经出局` };
  const tiaoqi_first_distance = tiaoqi_total_distance(tiaoqi_state, 0); // tiaoqi_first_distance：第一名玩家剩余总距离。
  const tiaoqi_other_players = Array.from({ length: tiaoqi_state.settings.playerCount - 1 }, (_, tiaoqi_index) => tiaoqi_index + 1)
    .filter(tiaoqi_player => !tiaoqi_state.eliminated?.[tiaoqi_player]); // tiaoqi_other_players：仍在对局的其他玩家。
  const tiaoqi_other_distance = Math.min(...tiaoqi_other_players.map(tiaoqi_player => tiaoqi_total_distance(tiaoqi_state, tiaoqi_player))); // tiaoqi_other_distance：其余未出局玩家中的最短剩余距离。
  const tiaoqi_percent = Math.round(qilei_clamp(50 + (tiaoqi_other_distance - tiaoqi_first_distance) * .08, 5, 95)); // tiaoqi_percent：第一名玩家胜率百分比。
  return { first: tiaoqi_percent, second: 100 - tiaoqi_percent, summary: Math.abs(tiaoqi_percent - 50) < 6 ? "各方推进速度接近" : (tiaoqi_percent > 50 ? `${tiaoqi_player_names[0]}暂时领先` : "其他玩家暂时领先") };
}

// tiaoqi_create_game：创建浏览器内同一左右窗口运行的多玩家星形跳棋。
export function tiaoqi_create_game({ boardHost: tiaoqi_board_host, controlsHost: tiaoqi_controls_host, savedState: tiaoqi_saved_state, services: tiaoqi_services }) {
  const { canvas: tiaoqi_canvas, context: tiaoqi_context } = qilei_make_canvas(tiaoqi_board_host, { width: 860, height: 860 }, "多玩家星形跳棋棋盘"); // tiaoqi_canvas/context：对应 C++ 左侧 860×860 绘图区。
  let tiaoqi_state = tiaoqi_restore_state(tiaoqi_saved_state); // tiaoqi_state：当前可持久化跳棋状态，旧存档会先升级。
  let tiaoqi_selected = null; // tiaoqi_selected：当前选中的棋子孔位。
  let tiaoqi_pending_move = null; // tiaoqi_pending_move：等待第二次点击确认的移动。
  let tiaoqi_hint_move = null; // tiaoqi_hint_move：提示按钮推荐的移动。
  let tiaoqi_robot_timer = null; // tiaoqi_robot_timer：机器人行动等待计时器。
  let tiaoqi_clock_timer = null; // tiaoqi_clock_timer：跳棋多玩家步时和局时刷新计时器。
  let tiaoqi_panel_status = ""; // tiaoqi_panel_status：右侧状态提示区当前文字。
  let tiaoqi_finished_reported = Boolean(tiaoqi_state.over); // tiaoqi_finished_reported：终局是否已写入历史。
  let tiaoqi_setup_focus = 0; // tiaoqi_setup_focus：键盘上下键当前选中的设置行。
  let tiaoqi_destroyed = false; // tiaoqi_destroyed：离开当前网页对局后阻止旧计时器继续操作。
  const tiaoqi_memory_history = []; // tiaoqi_memory_history：网页会话内的悔棋快照。
  const tiaoqi_robot_edge_counts = new Map(); // tiaoqi_robot_edge_counts：按 C++ 记录机器人重复走同一条边的次数。
  const tiaoqi_workspace = tiaoqi_board_host.closest(".game-workspace"); // tiaoqi_workspace：控制设置/游戏阶段样式的窗口。

  // tiaoqi_make_node：创建跳棋原版右侧信息栏使用的安全 DOM 节点。
  function tiaoqi_make_node(tiaoqi_tag, tiaoqi_class_name = "", tiaoqi_text = "") {
    const tiaoqi_node = document.createElement(tiaoqi_tag); // tiaoqi_node：刚创建并准备写入面板的节点。
    tiaoqi_node.className = tiaoqi_class_name;
    tiaoqi_node.textContent = tiaoqi_text;
    return tiaoqi_node;
  }

  // tiaoqi_format_time：把秒数格式化为右侧信息栏的 mm:ss。
  function tiaoqi_format_time(tiaoqi_seconds) {
    const tiaoqi_safe_seconds = Math.max(0, Math.floor(tiaoqi_seconds || 0)); // tiaoqi_safe_seconds：避免负数进入计时文字。
    return `${Math.floor(tiaoqi_safe_seconds / 60)}:${String(tiaoqi_safe_seconds % 60).padStart(2, "0")}`;
  }

  // tiaoqi_start_clock：正式对局中只扣除当前行动玩家的步时和局时。
  function tiaoqi_start_clock() {
    window.clearInterval(tiaoqi_clock_timer);
    tiaoqi_clock_timer = window.setInterval(() => {
      if (document.hidden || tiaoqi_state.phase !== "play" || tiaoqi_state.over || !tiaoqi_state.playerArms.length) return;
      tiaoqi_state.stepRemaining = Math.max(0, (tiaoqi_state.stepRemaining ?? tiaoqi_state.settings.stepSeconds) - 1);
      if (!Array.isArray(tiaoqi_state.totalRemaining)) tiaoqi_state.totalRemaining = Array(tiaoqi_state.settings.playerCount).fill(tiaoqi_state.settings.totalSeconds);
      tiaoqi_state.totalRemaining[tiaoqi_state.side] = Math.max(0, (tiaoqi_state.totalRemaining[tiaoqi_state.side] ?? tiaoqi_state.settings.totalSeconds) - 1);
      if (tiaoqi_state.stepRemaining <= 0 || tiaoqi_state.totalRemaining[tiaoqi_state.side] <= 0) {
        const tiaoqi_timeout_kind = tiaoqi_state.totalRemaining[tiaoqi_state.side] <= 0 ? "局时" : "步时"; // tiaoqi_timeout_kind：本次超时属于局时或步时。
        tiaoqi_lose_by_time(tiaoqi_state.side, tiaoqi_timeout_kind);
        return;
      }
      const tiaoqi_step_node = tiaoqi_controls_host.querySelector(".tiaoqi-step-clock"); // tiaoqi_step_node：只更新文字而不重建按钮的步时节点。
      if (tiaoqi_step_node) tiaoqi_step_node.textContent = `本步剩余：${tiaoqi_format_time(tiaoqi_state.stepRemaining)}`;
      tiaoqi_controls_host.querySelectorAll(".tiaoqi-player-detail").forEach(tiaoqi_node => {
        const tiaoqi_player = Number(tiaoqi_node.dataset.player); // tiaoqi_player：当前局时文字对应的玩家编号。
        if (!Number.isInteger(tiaoqi_player)) return;
        if (tiaoqi_state.eliminated?.[tiaoqi_player]) {
          tiaoqi_node.textContent = `超时出局  第${tiaoqi_eliminated_rank(tiaoqi_state, tiaoqi_player)}名  完成${tiaoqi_state.eliminationProgress?.[tiaoqi_player] || 0}/${tiaoqi_state.settings.pieceCount}`;
        } else if (tiaoqi_rank_of(tiaoqi_state, tiaoqi_player) > 0) {
          tiaoqi_node.textContent = `${tiaoqi_state.completed?.[tiaoqi_player] ? "已完成" : "最后剩余"}  第${tiaoqi_rank_of(tiaoqi_state, tiaoqi_player)}名`;
        } else {
          tiaoqi_node.textContent = `完成${tiaoqi_goal_count(tiaoqi_state, tiaoqi_player)}/${tiaoqi_state.settings.pieceCount}  总剩余${tiaoqi_format_time(tiaoqi_state.totalRemaining[tiaoqi_player])}`;
        }
      });
    }, 1000);
  }

  // tiaoqi_setup_rows：返回 C++ 右侧设置区的五项定义。
  function tiaoqi_setup_rows() {
    return [
      { key: "stepSeconds", label: "每步时长", values: [15, 30, 60, 90], text: tiaoqi_value => `${tiaoqi_value} 秒` },
      { key: "totalSeconds", label: "单方总时长", values: [300, 600, 900, 1800], text: tiaoqi_value => `${tiaoqi_value / 60} 分钟` },
      { key: "playerCount", label: "玩家人数", min: 2, max: 6, text: tiaoqi_value => `${tiaoqi_value} 人` },
      { key: "pieceCount", label: "每人棋子数", values: [3, 6, 10], text: tiaoqi_value => `${tiaoqi_value} 枚` },
      { key: "robotCount", label: "机器人数量", min: 0, max: tiaoqi_state.settings.playerCount, text: tiaoqi_value => `${tiaoqi_value} 个` },
    ];
  }

  // tiaoqi_adjust_setup：在允许范围内调整右侧一项设置。
  function tiaoqi_adjust_setup(tiaoqi_row_index, tiaoqi_delta) {
    const tiaoqi_definition = tiaoqi_setup_rows()[tiaoqi_row_index]; // tiaoqi_definition：当前设置行定义。
    const tiaoqi_old_value = tiaoqi_state.settings[tiaoqi_definition.key]; // tiaoqi_old_value：调整前数值。
    let tiaoqi_new_value = tiaoqi_old_value; // tiaoqi_new_value：边界处理后的新数值。
    if (tiaoqi_definition.values) {
      const tiaoqi_value_index = tiaoqi_definition.values.indexOf(tiaoqi_old_value); // tiaoqi_value_index：当前离散值下标。
      tiaoqi_new_value = tiaoqi_definition.values[qilei_clamp(tiaoqi_value_index + tiaoqi_delta, 0, tiaoqi_definition.values.length - 1)];
    } else {
      tiaoqi_new_value = qilei_clamp(tiaoqi_old_value + tiaoqi_delta, tiaoqi_definition.min, tiaoqi_definition.max);
    }
    tiaoqi_state.settings[tiaoqi_definition.key] = tiaoqi_new_value;
    if (tiaoqi_definition.key === "playerCount") tiaoqi_state.settings.robotCount = Math.min(tiaoqi_state.settings.robotCount, tiaoqi_new_value);
    tiaoqi_draw();
    tiaoqi_render_controls();
    tiaoqi_update_panel(`${tiaoqi_definition.label}已调整为 ${tiaoqi_definition.text(tiaoqi_new_value)}`);
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
  }

  // tiaoqi_start_game：应用二至六人设置并把棋子放入各自起始阵营。
  function tiaoqi_start_game() {
    tiaoqi_state.board = Array(tiaoqi_points.length).fill(tiaoqi_empty);
    tiaoqi_state.playerArms = [...tiaoqi_player_arm_sets[tiaoqi_state.settings.playerCount]];
    for (let tiaoqi_player = 0; tiaoqi_player < tiaoqi_state.settings.playerCount; tiaoqi_player += 1) {
      const tiaoqi_start_camp = tiaoqi_camps[tiaoqi_state.playerArms[tiaoqi_player]]; // tiaoqi_start_camp：当前玩家起始阵营。
      for (const tiaoqi_index of tiaoqi_start_camp.slice(0, tiaoqi_state.settings.pieceCount)) {
        tiaoqi_state.board[tiaoqi_index] = tiaoqi_player + 1;
      }
    }
    tiaoqi_state.phase = "play";
    tiaoqi_state.side = 0;
    tiaoqi_state.moves = 0;
    tiaoqi_state.over = false;
    tiaoqi_state.winner = -1;
    tiaoqi_state.lastMove = null;
    tiaoqi_state.stepRemaining = tiaoqi_state.settings.stepSeconds;
    tiaoqi_state.totalRemaining = Array(tiaoqi_state.settings.playerCount).fill(tiaoqi_state.settings.totalSeconds);
    tiaoqi_state.eliminated = Array(tiaoqi_state.settings.playerCount).fill(false);
    tiaoqi_state.eliminationOrder = [];
    tiaoqi_state.eliminationProgress = Array(tiaoqi_state.settings.playerCount).fill(0);
    tiaoqi_state.completed = Array(tiaoqi_state.settings.playerCount).fill(false);
    tiaoqi_state.rankings = [];
    tiaoqi_selected = null;
    tiaoqi_pending_move = null;
    tiaoqi_hint_move = null;
    tiaoqi_memory_history.length = 0;
    tiaoqi_robot_edge_counts.clear();
    tiaoqi_finished_reported = false;
    tiaoqi_draw();
    tiaoqi_render_controls();
    tiaoqi_update_panel(`${tiaoqi_player_names[0]}先行`);
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
    tiaoqi_schedule_robot();
  }

  // tiaoqi_draw_piece：绘制一枚棋子，并只给当前玩家可选择的棋子显示操作编号。
  function tiaoqi_draw_piece(tiaoqi_index, tiaoqi_owner) {
    const tiaoqi_point = tiaoqi_points[tiaoqi_index]; // tiaoqi_point：棋子所在孔位。
    const tiaoqi_color = tiaoqi_player_colors[tiaoqi_owner - 1]; // tiaoqi_color：棋子所属玩家颜色。
    tiaoqi_context.beginPath();
    tiaoqi_context.arc(tiaoqi_point.x, tiaoqi_point.y, 14, 0, Math.PI * 2);
    tiaoqi_context.fillStyle = tiaoqi_color;
    tiaoqi_context.fill();
    tiaoqi_context.strokeStyle = tiaoqi_selected === tiaoqi_index ? "#f6c64f" : "#ffffff";
    tiaoqi_context.lineWidth = tiaoqi_selected === tiaoqi_index ? 4 : 2;
    tiaoqi_context.stroke();
    if (tiaoqi_state.phase === "play" && tiaoqi_owner === tiaoqi_state.side + 1) {
      const tiaoqi_piece_number = tiaoqi_piece_indices(tiaoqi_state, tiaoqi_state.side).indexOf(tiaoqi_index); // tiaoqi_piece_number：当前玩家键盘选择使用的零开始编号。
      tiaoqi_context.fillStyle = "#ffffff";
      tiaoqi_context.font = "bold 11px sans-serif";
      tiaoqi_context.textAlign = "center";
      tiaoqi_context.textBaseline = "middle";
      tiaoqi_context.fillText(String(tiaoqi_piece_number), tiaoqi_point.x, tiaoqi_point.y);
    }
  }

  // tiaoqi_draw：绘制 C++ 星形孔位、六色阵营、棋子与二次确认轮廓。
  function tiaoqi_draw() {
    tiaoqi_context.fillStyle = "rgb(247,249,252)";
    tiaoqi_context.fillRect(0, 0, 860, 860);
    const tiaoqi_targets = tiaoqi_selected === null ? [] : tiaoqi_legal_targets(tiaoqi_state.board, tiaoqi_selected); // tiaoqi_targets：当前选中棋子的合法落点。
    for (let tiaoqi_index = 0; tiaoqi_index < tiaoqi_points.length; tiaoqi_index += 1) {
      const tiaoqi_point = tiaoqi_points[tiaoqi_index]; // tiaoqi_point：当前孔位坐标。
      const tiaoqi_arm = tiaoqi_camps.findIndex(tiaoqi_camp => tiaoqi_camp.includes(tiaoqi_index)); // tiaoqi_arm：当前孔位所属外臂编号。
      tiaoqi_context.beginPath();
      tiaoqi_context.arc(tiaoqi_point.x, tiaoqi_point.y, 10, 0, Math.PI * 2);
      tiaoqi_context.fillStyle = tiaoqi_arm >= 0 ? `${tiaoqi_player_colors[tiaoqi_arm]}2b` : "rgb(225,230,236)";
      tiaoqi_context.fill();
      tiaoqi_context.strokeStyle = tiaoqi_arm >= 0 ? `${tiaoqi_player_colors[tiaoqi_arm]}88` : "rgb(183,194,205)";
      tiaoqi_context.lineWidth = 1.4;
      tiaoqi_context.stroke();
      const tiaoqi_target_number = tiaoqi_targets.indexOf(tiaoqi_index) + 1; // tiaoqi_target_number：当前落点在数字键一至九中的编号。
      if (tiaoqi_target_number > 0 && tiaoqi_target_number <= 9) {
        tiaoqi_context.beginPath();
        tiaoqi_context.arc(tiaoqi_point.x, tiaoqi_point.y, 13, 0, Math.PI * 2);
        tiaoqi_context.fillStyle = "#2d8065";
        tiaoqi_context.fill();
        tiaoqi_context.fillStyle = "#ffffff";
        tiaoqi_context.font = "bold 11px sans-serif";
        tiaoqi_context.textAlign = "center";
        tiaoqi_context.textBaseline = "middle";
        tiaoqi_context.fillText(String(tiaoqi_target_number), tiaoqi_point.x, tiaoqi_point.y);
      }
      if (tiaoqi_state.board[tiaoqi_index]) tiaoqi_draw_piece(tiaoqi_index, tiaoqi_state.board[tiaoqi_index]);
    }
    for (const [tiaoqi_move, tiaoqi_color, tiaoqi_dash] of [[tiaoqi_hint_move, "#287c61", [7, 5]], [tiaoqi_pending_move, "#bf3d35", []]]) {
      if (!tiaoqi_move) continue;
      const tiaoqi_point = tiaoqi_points[tiaoqi_move.to]; // tiaoqi_point：提示或待确认落点。
      tiaoqi_context.save();
      tiaoqi_context.setLineDash(tiaoqi_dash);
      tiaoqi_context.strokeStyle = tiaoqi_color;
      tiaoqi_context.lineWidth = 4;
      tiaoqi_context.beginPath();
      tiaoqi_context.arc(tiaoqi_point.x, tiaoqi_point.y, 20, 0, Math.PI * 2);
      tiaoqi_context.stroke();
      tiaoqi_context.restore();
    }
  }

  // tiaoqi_update_panel：刷新右侧设置提示、各玩家进度与预测。
  function tiaoqi_update_panel(tiaoqi_status = "") {
    const tiaoqi_setup = tiaoqi_state.phase === "setup"; // tiaoqi_setup：当前是否为右侧内嵌设置阶段。
    tiaoqi_workspace.dataset.phase = tiaoqi_setup ? "setup" : (tiaoqi_state.over ? "over" : "play");
    const tiaoqi_prediction = tiaoqi_predict(tiaoqi_state); // tiaoqi_prediction：当前胜负预测。
    const tiaoqi_stats = []; // tiaoqi_stats：正式游戏阶段的玩家状态。
    if (!tiaoqi_setup) {
      for (let tiaoqi_player = 0; tiaoqi_player < tiaoqi_state.settings.playerCount; tiaoqi_player += 1) {
        tiaoqi_stats.push({
          label: `${tiaoqi_player_names[tiaoqi_player]}状态`,
          value: `目标 ${tiaoqi_goal_count(tiaoqi_state, tiaoqi_player)}/${tiaoqi_state.settings.pieceCount} · ${tiaoqi_is_robot(tiaoqi_state, tiaoqi_player) ? "机器人" : "玩家"}`,
        });
      }
    }
    tiaoqi_panel_status = tiaoqi_status || (tiaoqi_setup ? "请在右侧完成游戏设置" : (tiaoqi_state.over ? `${tiaoqi_player_names[tiaoqi_state.winner]}获胜` : `${tiaoqi_player_names[tiaoqi_state.side]}请选择棋子`));
    tiaoqi_services.update({
      status: tiaoqi_status || (tiaoqi_setup ? "请在右侧完成游戏设置" : (tiaoqi_state.over ? `${tiaoqi_player_names[tiaoqi_state.winner]}获胜` : `${tiaoqi_player_names[tiaoqi_state.side]}请选择棋子`)),
      prediction: { first: tiaoqi_prediction.first, second: tiaoqi_prediction.second, firstName: tiaoqi_player_names[0], secondName: "其余", summary: tiaoqi_prediction.summary },
      stats: tiaoqi_stats,
      activeSide: tiaoqi_state.side,
      moveCount: tiaoqi_state.moves,
    });
    tiaoqi_render_controls();
  }

  // tiaoqi_render_controls：按 C++ 的 460×860 右侧信息栏重建设置或对局内容。
  function tiaoqi_render_controls() {
    tiaoqi_controls_host.replaceChildren();
    const tiaoqi_panel = tiaoqi_make_node("section", "tiaoqi-local-panel"); // tiaoqi_panel：完整替代网页通用信息栏的跳棋原版面板。
    tiaoqi_panel.classList.toggle("is-over", tiaoqi_state.over);
    tiaoqi_panel.append(tiaoqi_make_node("h3", "tiaoqi-local-title", "跳棋游戏"));
    if (tiaoqi_state.phase === "setup") {
      const tiaoqi_setup_panel = document.createElement("div"); // tiaoqi_setup_panel：C++ 跳棋右侧五项设置容器。
      tiaoqi_setup_panel.className = "internal-setup-panel tiaoqi-setup-panel";
      tiaoqi_setup_rows().forEach((tiaoqi_row, tiaoqi_row_index) => {
        const tiaoqi_row_node = document.createElement("div"); // tiaoqi_row_node：一项设置的左右调整行。
        tiaoqi_row_node.className = `internal-setup-row${tiaoqi_row_index === tiaoqi_setup_focus ? " keyboard-selected" : ""}`;
        const tiaoqi_label = document.createElement("span"); // tiaoqi_label：设置项名称。
        tiaoqi_label.textContent = tiaoqi_row.label;
        const tiaoqi_minus = document.createElement("button"); // tiaoqi_minus：减少当前设置。
        tiaoqi_minus.type = "button";
        tiaoqi_minus.textContent = "−";
        tiaoqi_minus.addEventListener("click", () => tiaoqi_adjust_setup(tiaoqi_row_index, -1));
        const tiaoqi_value = document.createElement("b"); // tiaoqi_value：当前设置值。
        tiaoqi_value.textContent = tiaoqi_row.text(tiaoqi_state.settings[tiaoqi_row.key]);
        const tiaoqi_plus = document.createElement("button"); // tiaoqi_plus：增加当前设置。
        tiaoqi_plus.type = "button";
        tiaoqi_plus.textContent = "+";
        tiaoqi_plus.addEventListener("click", () => tiaoqi_adjust_setup(tiaoqi_row_index, 1));
        tiaoqi_row_node.append(tiaoqi_label, tiaoqi_minus, tiaoqi_value, tiaoqi_plus);
        tiaoqi_setup_panel.append(tiaoqi_row_node);
      });
      const tiaoqi_start = document.createElement("button"); // tiaoqi_start：应用设置并开始对局。
      tiaoqi_start.type = "button";
      tiaoqi_start.className = "internal-start-button";
      tiaoqi_start.textContent = "开始游戏";
      tiaoqi_start.addEventListener("click", tiaoqi_start_game);
      const tiaoqi_home = tiaoqi_make_node("button", "tiaoqi-home-button", "返回主界面"); // tiaoqi_home：设置页返回棋类大厅按钮。
      tiaoqi_home.type = "button";
      tiaoqi_home.addEventListener("click", () => document.getElementById("back-lobby")?.click());
      tiaoqi_setup_panel.append(tiaoqi_start, tiaoqi_home);
      tiaoqi_panel.append(tiaoqi_make_node("p", "tiaoqi-phase", "阶段：游戏设置"), tiaoqi_make_node("p", "tiaoqi-status-box", tiaoqi_panel_status), tiaoqi_setup_panel);
      tiaoqi_controls_host.append(tiaoqi_panel);
      return;
    }
    const tiaoqi_phase_text = tiaoqi_pending_move ? "确认目标" : (tiaoqi_selected === null ? "选择棋子" : "选择落点"); // tiaoqi_phase_text：当前移动确认阶段名称。
    const tiaoqi_current = tiaoqi_make_node("section", "tiaoqi-current"); // tiaoqi_current：当前玩家、步时和状态文字。
    tiaoqi_current.append(
      tiaoqi_make_node("p", "tiaoqi-phase", `阶段：${tiaoqi_state.over ? "游戏结束" : tiaoqi_phase_text}`),
      tiaoqi_make_node("b", "", `当前是${tiaoqi_state.side + 1}号玩家（${tiaoqi_player_names[tiaoqi_state.side].replace("方", "色")}）`),
      tiaoqi_make_node("span", "tiaoqi-step-clock", `本步剩余：${tiaoqi_format_time(tiaoqi_state.stepRemaining)}`),
      tiaoqi_make_node("p", "tiaoqi-status-box", tiaoqi_panel_status),
    );
    let tiaoqi_final_ranking = null; // tiaoqi_final_ranking：终局时逐行显示的完整名次表。
    if (tiaoqi_state.over) {
      tiaoqi_final_ranking = tiaoqi_make_node("section", "tiaoqi-final-ranking");
      tiaoqi_final_ranking.append(tiaoqi_make_node("h4", "", "最终排名"));
      const tiaoqi_rows = []; // tiaoqi_rows：正常完成和判负玩家合并后的名次条目。
      (tiaoqi_state.rankings || []).forEach((tiaoqi_player, tiaoqi_index) => {
        tiaoqi_rows.push({ player: tiaoqi_player, rank: tiaoqi_index + 1, out: false });
      });
      tiaoqi_eliminated_ranking(tiaoqi_state).forEach(tiaoqi_player => {
        tiaoqi_rows.push({ player: tiaoqi_player, rank: tiaoqi_eliminated_rank(tiaoqi_state, tiaoqi_player), out: true });
      });
      tiaoqi_rows.sort((tiaoqi_left, tiaoqi_right) => tiaoqi_left.rank - tiaoqi_right.rank).forEach(tiaoqi_entry => {
        const tiaoqi_row = tiaoqi_make_node("p", tiaoqi_entry.out ? "is-out" : ""); // tiaoqi_row：一名玩家的最终名次。
        const tiaoqi_color = tiaoqi_make_node("i", ""); // tiaoqi_color：最终名次对应的玩家色块。
        tiaoqi_color.style.background = tiaoqi_player_colors[tiaoqi_entry.player];
        const tiaoqi_suffix = tiaoqi_entry.out
          ? `　超时出局，完成${tiaoqi_state.eliminationProgress?.[tiaoqi_entry.player] || 0}/${tiaoqi_state.settings.pieceCount}`
          : (tiaoqi_state.completed?.[tiaoqi_entry.player] ? "" : "　最后剩余"); // tiaoqi_suffix：名次后的完成或出局说明。
        tiaoqi_row.append(tiaoqi_color, document.createTextNode(`第${tiaoqi_entry.rank}名　玩家${tiaoqi_entry.player + 1}${tiaoqi_suffix}`));
        tiaoqi_final_ranking.append(tiaoqi_row);
      });
    }
    const tiaoqi_progress = tiaoqi_make_node("section", "tiaoqi-progress"); // tiaoqi_progress：每位玩家完成进度列表。
    tiaoqi_progress.append(tiaoqi_make_node("h4", "", "每一位玩家完成进度"));
    for (let tiaoqi_player = 0; tiaoqi_player < tiaoqi_state.settings.playerCount; tiaoqi_player += 1) {
      const tiaoqi_finished = tiaoqi_state.eliminated?.[tiaoqi_player]
        ? (tiaoqi_state.eliminationProgress?.[tiaoqi_player] || 0)
        : tiaoqi_goal_count(tiaoqi_state, tiaoqi_player); // tiaoqi_finished：当前或判负瞬间进入目标阵营的棋子数。
      const tiaoqi_row = tiaoqi_make_node("div", "tiaoqi-progress-row"); // tiaoqi_row：玩家进度文字与横条。
      const tiaoqi_color = tiaoqi_make_node("i", ""); // tiaoqi_color：玩家颜色方块。
      tiaoqi_color.style.background = tiaoqi_player_colors[tiaoqi_player];
      const tiaoqi_text = tiaoqi_make_node("span", "", `玩家${tiaoqi_player + 1}（${tiaoqi_player_names[tiaoqi_player].replace("方", "色")} ${tiaoqi_is_robot(tiaoqi_state, tiaoqi_player) ? "机器人" : "玩家"}）`); // tiaoqi_text：玩家名称与控制类型。
      const tiaoqi_rank = tiaoqi_state.eliminated?.[tiaoqi_player]
        ? tiaoqi_eliminated_rank(tiaoqi_state, tiaoqi_player)
        : tiaoqi_rank_of(tiaoqi_state, tiaoqi_player); // tiaoqi_rank：当前玩家已经确定的名次。
      const tiaoqi_detail_text = tiaoqi_state.eliminated?.[tiaoqi_player]
        ? `超时出局  第${tiaoqi_rank}名  完成${tiaoqi_finished}/${tiaoqi_state.settings.pieceCount}`
        : (tiaoqi_rank > 0
          ? `${tiaoqi_state.completed?.[tiaoqi_player] ? "已完成" : "最后剩余"}  第${tiaoqi_rank}名`
          : `完成${tiaoqi_finished}/${tiaoqi_state.settings.pieceCount}  总剩余${tiaoqi_format_time(tiaoqi_state.totalRemaining[tiaoqi_player])}`); // tiaoqi_detail_text：正常进度、完成排名或固定出局状态。
      const tiaoqi_detail = tiaoqi_make_node("small", "tiaoqi-player-detail", tiaoqi_detail_text); // tiaoqi_detail：任务进度和局时。
      tiaoqi_detail.dataset.player = String(tiaoqi_player);
      const tiaoqi_track = tiaoqi_make_node("div", "tiaoqi-progress-track"); // tiaoqi_track：进度条背景。
      const tiaoqi_fill = tiaoqi_make_node("i", ""); // tiaoqi_fill：任务完成比例。
      tiaoqi_fill.style.background = tiaoqi_player_colors[tiaoqi_player];
      tiaoqi_fill.style.width = `${tiaoqi_finished / Math.max(1, tiaoqi_state.settings.pieceCount) * 100}%`;
      tiaoqi_track.append(tiaoqi_fill);
      tiaoqi_row.append(tiaoqi_color, tiaoqi_text, tiaoqi_detail, tiaoqi_track);
      tiaoqi_progress.append(tiaoqi_row);
    }
    const tiaoqi_analysis = tiaoqi_make_node("section", "tiaoqi-analysis-panel"); // tiaoqi_analysis：多玩家局势分析色条和百分比。
    tiaoqi_analysis.append(tiaoqi_make_node("h4", "", "局势分析"));
    const tiaoqi_analysis_track = tiaoqi_make_node("div", "tiaoqi-analysis-track"); // tiaoqi_analysis_track：各玩家胜率连续色条。
    const tiaoqi_probabilities = Array.from({ length: tiaoqi_state.settings.playerCount }, (_, tiaoqi_player) => {
      if (tiaoqi_state.eliminated?.[tiaoqi_player] || tiaoqi_state.completed?.[tiaoqi_player]) return 0;
      if (tiaoqi_state.moves === 0) return 100 / tiaoqi_state.settings.playerCount;
      return 1 / Math.max(1, tiaoqi_total_distance(tiaoqi_state, tiaoqi_player));
    }); // tiaoqi_probabilities：按目标距离生成并在开局均分的相对概率。
    const tiaoqi_probability_total = Math.max(1, tiaoqi_probabilities.reduce((tiaoqi_sum, tiaoqi_value) => tiaoqi_sum + tiaoqi_value, 0)); // tiaoqi_probability_total：归一化概率分母。
    const tiaoqi_percentages = tiaoqi_probabilities.map(tiaoqi_value => Math.round(tiaoqi_value / tiaoqi_probability_total * 100)); // tiaoqi_percentages：面板显示用整数百分比。
    tiaoqi_percentages[tiaoqi_percentages.length - 1] += 100 - tiaoqi_percentages.reduce((tiaoqi_sum, tiaoqi_value) => tiaoqi_sum + tiaoqi_value, 0);
    tiaoqi_percentages.forEach((tiaoqi_percent, tiaoqi_player) => {
      const tiaoqi_segment = tiaoqi_make_node("i", ""); // tiaoqi_segment：一个玩家的胜率色段。
      tiaoqi_segment.style.background = tiaoqi_player_colors[tiaoqi_player];
      tiaoqi_segment.style.width = `${tiaoqi_percent}%`;
      tiaoqi_analysis_track.append(tiaoqi_segment);
    });
    tiaoqi_analysis.append(tiaoqi_analysis_track, tiaoqi_make_node("p", "", tiaoqi_percentages.map((tiaoqi_percent, tiaoqi_player) => `P${tiaoqi_player + 1} ${tiaoqi_percent}%`).join("  ")));
    const tiaoqi_targets = tiaoqi_selected === null ? [] : tiaoqi_legal_targets(tiaoqi_state.board, tiaoqi_selected).slice(0, 9); // tiaoqi_targets：键盘一至九可选择的合法落点。
    const tiaoqi_numbers_text = tiaoqi_selected === null
      ? `当前棋子编号：${tiaoqi_piece_indices(tiaoqi_state, tiaoqi_state.side).map((_, tiaoqi_index) => tiaoqi_index).join("  ")}`
      : `可走位置编号：${tiaoqi_targets.map((_, tiaoqi_index) => tiaoqi_index + 1).join("  ")}　0 返回`; // tiaoqi_numbers_text：随选棋或选落点阶段切换的键盘编号说明。
    const tiaoqi_numbers = tiaoqi_make_node("p", "tiaoqi-number-info", tiaoqi_numbers_text); // tiaoqi_numbers：当前玩家可用的键盘编号。
    const tiaoqi_actions = tiaoqi_make_node("div", "tiaoqi-actions"); // tiaoqi_actions：底部原版操作按钮。
    tiaoqi_actions.append(
      qilei_control_button("悔棋 (U)", tiaoqi_undo),
      qilei_control_button("重开 (N)", tiaoqi_new_game, "warning"),
    );
    const tiaoqi_home = tiaoqi_make_node("button", "danger", "返回主界面 (Esc)"); // tiaoqi_home：游戏内返回大厅按钮。
    tiaoqi_home.type = "button";
    tiaoqi_home.addEventListener("click", () => document.getElementById("back-lobby")?.click());
    tiaoqi_actions.append(tiaoqi_home);
    tiaoqi_panel.append(tiaoqi_current);
    if (tiaoqi_final_ranking) tiaoqi_panel.append(tiaoqi_final_ranking);
    tiaoqi_panel.append(tiaoqi_progress, tiaoqi_analysis, tiaoqi_numbers, tiaoqi_actions);
    tiaoqi_controls_host.append(tiaoqi_panel);
  }

  // tiaoqi_robot_move：移植 C++ 的推进、离开起始区、进入目标区、反复边和倒退惩罚评分。
  function tiaoqi_robot_move() {
    let tiaoqi_best_move = null; // tiaoqi_best_move：当前评分最高的移动。
    let tiaoqi_best_score = -Infinity; // tiaoqi_best_score：当前最高移动评分。
    for (const tiaoqi_move of tiaoqi_all_moves(tiaoqi_state, tiaoqi_state.side)) {
      const tiaoqi_gain = tiaoqi_goal_distance(tiaoqi_state, tiaoqi_state.side, tiaoqi_move.from) - tiaoqi_goal_distance(tiaoqi_state, tiaoqi_state.side, tiaoqi_move.to); // tiaoqi_gain：本步缩短的目标距离。
      const tiaoqi_goal = tiaoqi_goal_camp(tiaoqi_state, tiaoqi_state.side); // tiaoqi_goal：当前玩家目标阵营。
      const tiaoqi_start = tiaoqi_camps[tiaoqi_state.playerArms[tiaoqi_state.side]]; // tiaoqi_start：当前玩家起始阵营。
      const tiaoqi_from_in_goal = tiaoqi_goal.includes(tiaoqi_move.from); // tiaoqi_from_in_goal：移动前是否已在目标阵营。
      const tiaoqi_to_in_goal = tiaoqi_goal.includes(tiaoqi_move.to); // tiaoqi_to_in_goal：移动后是否进入目标阵营。
      const tiaoqi_from_in_start = tiaoqi_start.includes(tiaoqi_move.from); // tiaoqi_from_in_start：移动前是否仍在起始阵营。
      const tiaoqi_to_in_start = tiaoqi_start.includes(tiaoqi_move.to); // tiaoqi_to_in_start：移动后是否仍在起始阵营。
      const tiaoqi_move_distance = tiaoqi_distance(tiaoqi_points[tiaoqi_move.from], tiaoqi_points[tiaoqi_move.to]); // tiaoqi_move_distance：一步或连续跳的几何距离。
      const tiaoqi_reverse = tiaoqi_state.lastMove?.owner === tiaoqi_state.side && tiaoqi_state.lastMove.from === tiaoqi_move.to && tiaoqi_state.lastMove.to === tiaoqi_move.from; // tiaoqi_reverse：是否立即走回上一回合位置。
      const tiaoqi_edge_key = `${tiaoqi_state.side}:${tiaoqi_move.from}:${tiaoqi_move.to}`; // tiaoqi_edge_key：机器人重复边统计键。
      const tiaoqi_edge_count = tiaoqi_robot_edge_counts.get(tiaoqi_edge_key) || 0; // tiaoqi_edge_count：此前走过同一条边的次数。
      let tiaoqi_score = Math.round(tiaoqi_gain * 120); // tiaoqi_score：以 C++ progressgain 权重为主体的综合评分。
      if (!tiaoqi_from_in_goal && tiaoqi_to_in_goal) tiaoqi_score += 9000;
      if (tiaoqi_from_in_goal && !tiaoqi_to_in_goal) tiaoqi_score -= 60000;
      if (tiaoqi_from_in_start && !tiaoqi_to_in_start) tiaoqi_score += 1400;
      if (!tiaoqi_from_in_start && tiaoqi_to_in_start) tiaoqi_score -= 4200;
      if (tiaoqi_move_distance > tiaoqi_point_space * 1.5) tiaoqi_score += 600 + Math.round(tiaoqi_move_distance * 2);
      if (tiaoqi_gain < 0) tiaoqi_score -= 1800 + Math.round(-tiaoqi_gain * 90);
      if (tiaoqi_reverse) tiaoqi_score -= 60000;
      tiaoqi_score -= tiaoqi_edge_count * 9000;
      tiaoqi_score += Math.random();
      if (tiaoqi_score > tiaoqi_best_score) {
        tiaoqi_best_score = tiaoqi_score;
        tiaoqi_best_move = tiaoqi_move;
      }
    }
    return tiaoqi_best_move;
  }

  // tiaoqi_record_rank：把正常完成或最后剩余的玩家按实际先后写入固定排名。
  function tiaoqi_record_rank(tiaoqi_player) {
    if (!Number.isInteger(tiaoqi_player) || tiaoqi_player < 0 || tiaoqi_rank_of(tiaoqi_state, tiaoqi_player) > 0) return;
    tiaoqi_state.rankings.push(tiaoqi_player);
  }

  // tiaoqi_finish_if_decided：只剩一名仍可行动玩家时补齐最后名次并结束整局。
  function tiaoqi_finish_if_decided() {
    const tiaoqi_active = tiaoqi_active_players(tiaoqi_state); // tiaoqi_active：尚未完成且未判负的玩家。
    if (tiaoqi_active.length > 1) return false;
    if (tiaoqi_active.length === 1) tiaoqi_record_rank(tiaoqi_active[0]);
    tiaoqi_state.over = true;
    tiaoqi_state.phase = "over";
    tiaoqi_state.winner = tiaoqi_state.rankings[0] ?? -1;
    if (!tiaoqi_finished_reported) {
      tiaoqi_finished_reported = true;
      tiaoqi_services.finish(tiaoqi_state.winner >= 0 ? `${tiaoqi_player_names[tiaoqi_state.winner]}获胜` : "对局结束");
    }
    return true;
  }

  // tiaoqi_commit_move：执行确认后的移动并检查胜负和换手。
  function tiaoqi_commit_move(tiaoqi_move) {
    if (!tiaoqi_move || tiaoqi_state.over || tiaoqi_state.phase !== "play") return;
    tiaoqi_memory_history.push(qilei_deep_copy(tiaoqi_state));
    const tiaoqi_owner = tiaoqi_state.board[tiaoqi_move.from]; // tiaoqi_owner：本步棋子所属玩家编码。
    const tiaoqi_player = tiaoqi_owner - 1; // tiaoqi_player：本步玩家下标。
    tiaoqi_state.board[tiaoqi_move.from] = tiaoqi_empty;
    tiaoqi_state.board[tiaoqi_move.to] = tiaoqi_owner;
    tiaoqi_state.lastMove = { ...tiaoqi_move, owner: tiaoqi_player };
    const tiaoqi_edge_key = `${tiaoqi_player}:${tiaoqi_move.from}:${tiaoqi_move.to}`; // tiaoqi_edge_key：本次实际移动的机器人重复边统计键。
    tiaoqi_robot_edge_counts.set(tiaoqi_edge_key, (tiaoqi_robot_edge_counts.get(tiaoqi_edge_key) || 0) + 1);
    tiaoqi_state.moves += 1;
    if (tiaoqi_has_won(tiaoqi_state, tiaoqi_player)) {
      tiaoqi_state.completed[tiaoqi_player] = true;
      tiaoqi_record_rank(tiaoqi_player);
      if (!tiaoqi_finish_if_decided()) {
        tiaoqi_state.side = tiaoqi_next_active_player(tiaoqi_state, tiaoqi_player);
      }
    } else {
      tiaoqi_state.side = tiaoqi_next_active_player(tiaoqi_state, tiaoqi_state.side);
    }
    tiaoqi_state.stepRemaining = tiaoqi_state.settings.stepSeconds;
    tiaoqi_selected = null;
    tiaoqi_pending_move = null;
    tiaoqi_hint_move = null;
    if (!tiaoqi_state.over && !tiaoqi_all_moves(tiaoqi_state, tiaoqi_state.side).length) {
      tiaoqi_eliminate_player(tiaoqi_state.side, "没有合法走法，判负出局");
      return;
    }
    tiaoqi_draw();
    tiaoqi_render_controls();
    tiaoqi_update_panel("移动完成");
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
    tiaoqi_schedule_robot();
  }

  // tiaoqi_schedule_robot：机器人依次展示选棋子、选落点和确认移动阶段。
  function tiaoqi_schedule_robot() {
    window.clearTimeout(tiaoqi_robot_timer);
    if (tiaoqi_destroyed || tiaoqi_state.phase !== "play" || tiaoqi_state.over || tiaoqi_state.eliminated?.[tiaoqi_state.side] || tiaoqi_state.completed?.[tiaoqi_state.side] || !tiaoqi_is_robot(tiaoqi_state, tiaoqi_state.side)) return;
    tiaoqi_update_panel(`${tiaoqi_player_names[tiaoqi_state.side]}机器人正在规划连续跳跃…`);
    tiaoqi_robot_timer = window.setTimeout(() => {
      const tiaoqi_move = tiaoqi_robot_move(); // tiaoqi_move：机器人最终选中的移动。
      if (!tiaoqi_move) {
        tiaoqi_eliminate_player(tiaoqi_state.side, "没有合法走法，判负出局");
        return;
      }
      tiaoqi_selected = tiaoqi_move.from;
      tiaoqi_pending_move = null;
      tiaoqi_draw();
      tiaoqi_update_panel(`${tiaoqi_player_names[tiaoqi_state.side]}机器人已选择棋子…`);
      tiaoqi_robot_timer = window.setTimeout(() => {
        tiaoqi_pending_move = tiaoqi_move;
        tiaoqi_draw();
        tiaoqi_update_panel(`${tiaoqi_player_names[tiaoqi_state.side]}机器人已选择落点，正在确认…`);
        tiaoqi_robot_timer = window.setTimeout(() => tiaoqi_commit_move(tiaoqi_move), 1000);
      }, 1000);
    }, 620);
  }

  // tiaoqi_eliminate_player：判负出局时清除该方棋子并继续剩余玩家。
  function tiaoqi_eliminate_player(tiaoqi_player, tiaoqi_reason) {
    if (tiaoqi_destroyed || tiaoqi_state.phase !== "play" || tiaoqi_state.over || tiaoqi_state.eliminated?.[tiaoqi_player]) return;
    window.clearTimeout(tiaoqi_robot_timer);
    tiaoqi_state.eliminationProgress[tiaoqi_player] = tiaoqi_goal_count(tiaoqi_state, tiaoqi_player);
    tiaoqi_state.eliminated[tiaoqi_player] = true;
    tiaoqi_state.eliminationOrder.push(tiaoqi_player);
    tiaoqi_state.board = tiaoqi_state.board.map(tiaoqi_owner => tiaoqi_owner === tiaoqi_player + 1 ? tiaoqi_empty : tiaoqi_owner);
    tiaoqi_selected = null;
    tiaoqi_pending_move = null;
    tiaoqi_hint_move = null;
    if (!tiaoqi_finish_if_decided()) {
      tiaoqi_state.side = tiaoqi_next_active_player(tiaoqi_state, tiaoqi_player);
      tiaoqi_state.stepRemaining = tiaoqi_state.settings.stepSeconds;
    }
    tiaoqi_draw();
    tiaoqi_update_panel(`${tiaoqi_player_names[tiaoqi_player]}${tiaoqi_reason}`);
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
    tiaoqi_schedule_robot();
  }

  // tiaoqi_lose_by_time：把步时或局时耗尽转换为统一判负流程。
  function tiaoqi_lose_by_time(tiaoqi_player, tiaoqi_timeout_kind) {
    tiaoqi_eliminate_player(tiaoqi_player, `${tiaoqi_timeout_kind}耗尽，判负出局`);
  }

  // tiaoqi_hint：为人工玩家显示当前评分最高移动。
  function tiaoqi_hint() {
    if (tiaoqi_state.phase !== "play" || tiaoqi_state.over || tiaoqi_is_robot(tiaoqi_state, tiaoqi_state.side)) return;
    tiaoqi_hint_move = tiaoqi_robot_move();
    tiaoqi_draw();
    tiaoqi_update_panel(tiaoqi_hint_move ? "绿色虚线圈是建议落点" : "当前没有合法移动");
  }

  // tiaoqi_undo：恢复最近一次移动前的完整状态。
  function tiaoqi_undo() {
    if (!tiaoqi_memory_history.length) {
      tiaoqi_services.toast("当前没有可悔的棋");
      return;
    }
    window.clearTimeout(tiaoqi_robot_timer);
    tiaoqi_state = tiaoqi_memory_history.pop();
    tiaoqi_state.over = false;
    tiaoqi_state.phase = "play";
    tiaoqi_finished_reported = false;
    tiaoqi_selected = null;
    tiaoqi_pending_move = null;
    tiaoqi_hint_move = null;
    tiaoqi_robot_edge_counts.clear();
    tiaoqi_draw();
    tiaoqi_render_controls();
    tiaoqi_update_panel("已返回上一步");
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
  }

  // tiaoqi_new_game：回到跳棋同一左右窗口内的设置阶段。
  async function tiaoqi_new_game() {
    window.clearTimeout(tiaoqi_robot_timer);
    await tiaoqi_services.clearSave();
    tiaoqi_state = tiaoqi_initial_state();
    tiaoqi_memory_history.length = 0;
    tiaoqi_finished_reported = false;
    tiaoqi_selected = null;
    tiaoqi_pending_move = null;
    tiaoqi_hint_move = null;
    tiaoqi_robot_edge_counts.clear();
    tiaoqi_draw();
    tiaoqi_render_controls();
    tiaoqi_update_panel("请在右侧完成新游戏设置");
    tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
  }

  // tiaoqi_handle_pointer：选择己方棋子并通过第二次点击目标轮廓确认移动。
  function tiaoqi_handle_pointer(tiaoqi_event) {
    if (tiaoqi_state.phase !== "play" || tiaoqi_state.over || tiaoqi_is_robot(tiaoqi_state, tiaoqi_state.side)) return;
    const tiaoqi_mouse = qilei_canvas_point(tiaoqi_canvas, tiaoqi_event); // tiaoqi_mouse：画布内部点击坐标。
    let tiaoqi_index = -1; // tiaoqi_index：离点击位置最近的孔位。
    let tiaoqi_nearest = 24; // tiaoqi_nearest：允许命中的最大距离。
    for (let tiaoqi_point_index = 0; tiaoqi_point_index < tiaoqi_points.length; tiaoqi_point_index += 1) {
      const tiaoqi_length = Math.hypot(tiaoqi_points[tiaoqi_point_index].x - tiaoqi_mouse.x, tiaoqi_points[tiaoqi_point_index].y - tiaoqi_mouse.y); // tiaoqi_length：点击点到候选孔位距离。
      if (tiaoqi_length < tiaoqi_nearest) {
        tiaoqi_nearest = tiaoqi_length;
        tiaoqi_index = tiaoqi_point_index;
      }
    }
    if (tiaoqi_index < 0) return;
    if (tiaoqi_state.board[tiaoqi_index] === tiaoqi_state.side + 1) {
      tiaoqi_selected = tiaoqi_index;
      tiaoqi_pending_move = null;
      tiaoqi_hint_move = null;
      tiaoqi_draw();
      tiaoqi_update_panel("已选择棋子，请点击目标孔位");
      return;
    }
    if (tiaoqi_selected === null || tiaoqi_state.board[tiaoqi_index]) return;
    if (!tiaoqi_legal_targets(tiaoqi_state.board, tiaoqi_selected).includes(tiaoqi_index)) return;
    const tiaoqi_candidate = { from: tiaoqi_selected, to: tiaoqi_index }; // tiaoqi_candidate：本次点击形成的候选移动。
    if (tiaoqi_pending_move?.from === tiaoqi_candidate.from && tiaoqi_pending_move?.to === tiaoqi_candidate.to) {
      tiaoqi_commit_move(tiaoqi_candidate);
    } else {
      tiaoqi_pending_move = tiaoqi_candidate;
      tiaoqi_draw();
      tiaoqi_update_panel("红色轮廓是本次操作，再次点击确认");
    }
  }

  // tiaoqi_handle_keyboard：复刻本地设置方向键、数字选棋和数字落点二次确认。
  function tiaoqi_handle_keyboard(tiaoqi_event) {
    if (tiaoqi_event.key === "Escape") {
      tiaoqi_event.preventDefault();
      document.getElementById("back-lobby")?.click();
      return;
    }
    if (tiaoqi_event.key.toLowerCase() === "n" && tiaoqi_state.phase !== "setup") {
      tiaoqi_event.preventDefault();
      tiaoqi_new_game();
      return;
    }
    if (tiaoqi_state.phase === "setup") {
      if (tiaoqi_event.key === "ArrowUp" || tiaoqi_event.key === "ArrowDown") {
        tiaoqi_event.preventDefault();
        const tiaoqi_row_count = tiaoqi_setup_rows().length; // tiaoqi_row_count：跳棋设置区固定行数。
        tiaoqi_setup_focus = (tiaoqi_setup_focus + (tiaoqi_event.key === "ArrowDown" ? 1 : tiaoqi_row_count - 1)) % tiaoqi_row_count;
        tiaoqi_render_controls();
      } else if (tiaoqi_event.key === "ArrowLeft" || tiaoqi_event.key === "ArrowRight") {
        tiaoqi_event.preventDefault();
        tiaoqi_adjust_setup(tiaoqi_setup_focus, tiaoqi_event.key === "ArrowRight" ? 1 : -1);
      } else if (tiaoqi_event.key === "Enter") {
        tiaoqi_event.preventDefault();
        tiaoqi_start_game();
      }
      return;
    }
    if (tiaoqi_state.phase !== "play" || tiaoqi_state.over || tiaoqi_is_robot(tiaoqi_state, tiaoqi_state.side)) return;
    if (tiaoqi_event.key === "Delete" || tiaoqi_event.key === "Backspace" || tiaoqi_event.key.toLowerCase() === "u") {
      tiaoqi_event.preventDefault();
      tiaoqi_undo();
      return;
    }
    if (!/^[0-9]$/.test(tiaoqi_event.key)) return;
    tiaoqi_event.preventDefault();
    const tiaoqi_number = Number(tiaoqi_event.key); // tiaoqi_number：选棋阶段为零起编号，选落点阶段为一至九编号。
    if (tiaoqi_selected === null) {
      const tiaoqi_pieces = tiaoqi_piece_indices(tiaoqi_state, tiaoqi_state.side); // tiaoqi_pieces：当前玩家按稳定顺序排列的棋子孔位。
      if (tiaoqi_number >= tiaoqi_pieces.length) return;
      tiaoqi_selected = tiaoqi_pieces[tiaoqi_number];
      tiaoqi_pending_move = null;
      tiaoqi_hint_move = null;
      tiaoqi_draw();
      tiaoqi_update_panel(`已选择 ${tiaoqi_number} 号棋子，请按落点编号`);
      return;
    }
    if (tiaoqi_number === 0) {
      tiaoqi_selected = null;
      tiaoqi_pending_move = null;
      tiaoqi_draw();
      tiaoqi_update_panel("已返回选择棋子");
      return;
    }
    const tiaoqi_targets = tiaoqi_legal_targets(tiaoqi_state.board, tiaoqi_selected).slice(0, 9); // tiaoqi_targets：一至九号键盘落点。
    const tiaoqi_target = tiaoqi_targets[tiaoqi_number - 1]; // tiaoqi_target：数字键对应的实际孔位。
    if (!Number.isInteger(tiaoqi_target)) return;
    const tiaoqi_candidate = { from: tiaoqi_selected, to: tiaoqi_target }; // tiaoqi_candidate：等待第二次相同数字确认的移动。
    if (tiaoqi_pending_move?.from === tiaoqi_candidate.from && tiaoqi_pending_move?.to === tiaoqi_candidate.to) {
      tiaoqi_commit_move(tiaoqi_candidate);
    } else {
      tiaoqi_pending_move = tiaoqi_candidate;
      tiaoqi_draw();
      tiaoqi_update_panel(`已选择 ${tiaoqi_number} 号落点，再按一次确认`);
    }
  }

  tiaoqi_canvas.addEventListener("pointerdown", tiaoqi_handle_pointer);
  document.addEventListener("keydown", tiaoqi_handle_keyboard);
  tiaoqi_draw();
  tiaoqi_render_controls();
  tiaoqi_update_panel(tiaoqi_saved_state ? "已读取个人存档" : "请在右侧完成游戏设置");
  tiaoqi_services.save(qilei_deep_copy(tiaoqi_state));
  tiaoqi_schedule_robot();
  tiaoqi_start_clock();

  return {
    getState: () => qilei_deep_copy(tiaoqi_state),
    destroy: () => {
      tiaoqi_destroyed = true;
      window.clearTimeout(tiaoqi_robot_timer);
      window.clearInterval(tiaoqi_clock_timer);
      tiaoqi_canvas.removeEventListener("pointerdown", tiaoqi_handle_pointer);
      document.removeEventListener("keydown", tiaoqi_handle_keyboard);
    },
  };
}
