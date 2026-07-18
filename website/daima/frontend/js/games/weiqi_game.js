// weiqi_game.js：十九路围棋的落子、提子、禁入点、简易打劫、数子和机器人。

import {
  qilei_canvas_point,
  qilei_clamp,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
  qilei_random_choice,
} from "./qilei_game_utils.js";

const weiqi_board_size = 19; // weiqi_board_size：围棋棋盘路数。
const weiqi_empty = 0; // weiqi_empty：空交叉点编码。
const weiqi_black = 1; // weiqi_black：玩家黑棋编码。
const weiqi_white = 2; // weiqi_white：机器人白棋编码。
const weiqi_komi = 7.5; // weiqi_komi：终局数子时白方贴目。
const weiqi_neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // weiqi_neighbors：棋子相邻四方向。

// weiqi_initial_state：创建全新的十九路围棋状态。
function weiqi_initial_state() {
  return {
    board: Array(weiqi_board_size * weiqi_board_size).fill(weiqi_empty),
    side: weiqi_black,
    captures: { black: 0, white: 0 },
    passes: 0,
    moves: 0,
    previousBoard: null,
    over: false,
    result: "",
  };
}

// weiqi_valid_state：判断读取到的围棋存档结构是否完整。
function weiqi_valid_state(weiqi_value) {
  return Boolean(weiqi_value && Array.isArray(weiqi_value.board) &&
    weiqi_value.board.length === weiqi_board_size * weiqi_board_size &&
    [weiqi_black, weiqi_white].includes(weiqi_value.side));
}

// weiqi_index：把围棋行列坐标转换为一维下标。
function weiqi_index(weiqi_row, weiqi_col) {
  return weiqi_row * weiqi_board_size + weiqi_col;
}

// weiqi_inside：判断坐标是否位于十九路棋盘内。
function weiqi_inside(weiqi_row, weiqi_col) {
  return weiqi_row >= 0 && weiqi_row < weiqi_board_size && weiqi_col >= 0 && weiqi_col < weiqi_board_size;
}

// weiqi_opponent：返回指定棋色的对方棋色。
function weiqi_opponent(weiqi_stone) {
  return weiqi_stone === weiqi_black ? weiqi_white : weiqi_black;
}

// weiqi_group：遍历一个连通棋块并返回棋子下标和气的下标。
function weiqi_group(weiqi_board, weiqi_start_index) {
  const weiqi_stone = weiqi_board[weiqi_start_index]; // weiqi_stone：正在搜索的棋块颜色。
  const weiqi_stones = new Set([weiqi_start_index]); // weiqi_stones：棋块内的棋子下标集合。
  const weiqi_liberties = new Set(); // weiqi_liberties：棋块所有气的下标集合。
  const weiqi_stack = [weiqi_start_index]; // weiqi_stack：深度优先搜索栈。
  while (weiqi_stack.length) {
    const weiqi_current = weiqi_stack.pop(); // weiqi_current：当前扫描棋子的下标。
    const weiqi_row = Math.floor(weiqi_current / weiqi_board_size); // weiqi_row：当前扫描棋子的行。
    const weiqi_col = weiqi_current % weiqi_board_size; // weiqi_col：当前扫描棋子的列。
    for (const [weiqi_dr, weiqi_dc] of weiqi_neighbors) {
      const weiqi_next_row = weiqi_row + weiqi_dr; // weiqi_next_row：相邻点行号。
      const weiqi_next_col = weiqi_col + weiqi_dc; // weiqi_next_col：相邻点列号。
      if (!weiqi_inside(weiqi_next_row, weiqi_next_col)) continue;
      const weiqi_next_index = weiqi_index(weiqi_next_row, weiqi_next_col); // weiqi_next_index：相邻点一维下标。
      if (weiqi_board[weiqi_next_index] === weiqi_empty) weiqi_liberties.add(weiqi_next_index);
      else if (weiqi_board[weiqi_next_index] === weiqi_stone && !weiqi_stones.has(weiqi_next_index)) {
        weiqi_stones.add(weiqi_next_index);
        weiqi_stack.push(weiqi_next_index);
      }
    }
  }
  return { stones: [...weiqi_stones], liberties: [...weiqi_liberties] };
}

// weiqi_same_board：判断两个棋盘数组是否完全一致，用于阻止立即回到上一局面。
function weiqi_same_board(weiqi_first_board, weiqi_second_board) {
  return Array.isArray(weiqi_first_board) && Array.isArray(weiqi_second_board) &&
    weiqi_first_board.length === weiqi_second_board.length &&
    weiqi_first_board.every((weiqi_value, weiqi_position) => weiqi_value === weiqi_second_board[weiqi_position]);
}

// weiqi_try_move：在副本上试走并返回提子数；自杀和简单劫争返回 null。
function weiqi_try_move(weiqi_state, weiqi_row, weiqi_col, weiqi_stone) {
  const weiqi_move_index = weiqi_index(weiqi_row, weiqi_col); // weiqi_move_index：试走交叉点下标。
  if (!weiqi_inside(weiqi_row, weiqi_col) || weiqi_state.board[weiqi_move_index] !== weiqi_empty) return null;
  const weiqi_board = [...weiqi_state.board]; // weiqi_board：用于规则验证的棋盘副本。
  const weiqi_enemy = weiqi_opponent(weiqi_stone); // weiqi_enemy：本步对方颜色。
  let weiqi_captured = 0; // weiqi_captured：本步提掉的对方棋子数。
  weiqi_board[weiqi_move_index] = weiqi_stone;
  for (const [weiqi_dr, weiqi_dc] of weiqi_neighbors) {
    const weiqi_next_row = weiqi_row + weiqi_dr; // weiqi_next_row：待检查相邻棋块的行。
    const weiqi_next_col = weiqi_col + weiqi_dc; // weiqi_next_col：待检查相邻棋块的列。
    if (!weiqi_inside(weiqi_next_row, weiqi_next_col)) continue;
    const weiqi_next_index = weiqi_index(weiqi_next_row, weiqi_next_col); // weiqi_next_index：相邻棋块起点下标。
    if (weiqi_board[weiqi_next_index] !== weiqi_enemy) continue;
    const weiqi_enemy_group = weiqi_group(weiqi_board, weiqi_next_index); // weiqi_enemy_group：相邻对方棋块及其气。
    if (weiqi_enemy_group.liberties.length === 0) {
      for (const weiqi_captured_index of weiqi_enemy_group.stones) weiqi_board[weiqi_captured_index] = weiqi_empty;
      weiqi_captured += weiqi_enemy_group.stones.length;
    }
  }
  if (weiqi_group(weiqi_board, weiqi_move_index).liberties.length === 0) return null;
  if (weiqi_same_board(weiqi_board, weiqi_state.previousBoard)) return null;
  return { board: weiqi_board, captured: weiqi_captured };
}

// weiqi_estimate_territory：按空区边界颜色粗略统计黑地与白地。
function weiqi_estimate_territory(weiqi_board) {
  const weiqi_seen = new Set(); // weiqi_seen：已经归入某个空区的下标。
  let weiqi_black_territory = 0; // weiqi_black_territory：仅与黑棋接壤的空点数。
  let weiqi_white_territory = 0; // weiqi_white_territory：仅与白棋接壤的空点数。
  for (let weiqi_start = 0; weiqi_start < weiqi_board.length; weiqi_start += 1) {
    if (weiqi_board[weiqi_start] !== weiqi_empty || weiqi_seen.has(weiqi_start)) continue;
    const weiqi_region = []; // weiqi_region：当前连通空区的点。
    const weiqi_border_colors = new Set(); // weiqi_border_colors：当前空区接壤的棋色。
    const weiqi_stack = [weiqi_start]; // weiqi_stack：空区搜索栈。
    let weiqi_touches_edge = false; // weiqi_touches_edge：空区是否延伸到棋盘边缘，早中盘按中性区域处理。
    weiqi_seen.add(weiqi_start);
    while (weiqi_stack.length) {
      const weiqi_current = weiqi_stack.pop(); // weiqi_current：当前空点下标。
      weiqi_region.push(weiqi_current);
      const weiqi_row = Math.floor(weiqi_current / weiqi_board_size); // weiqi_row：当前空点行。
      const weiqi_col = weiqi_current % weiqi_board_size; // weiqi_col：当前空点列。
      if (weiqi_row === 0 || weiqi_row === weiqi_board_size - 1 || weiqi_col === 0 || weiqi_col === weiqi_board_size - 1) weiqi_touches_edge = true;
      for (const [weiqi_dr, weiqi_dc] of weiqi_neighbors) {
        const weiqi_next_row = weiqi_row + weiqi_dr; // weiqi_next_row：相邻点行。
        const weiqi_next_col = weiqi_col + weiqi_dc; // weiqi_next_col：相邻点列。
        if (!weiqi_inside(weiqi_next_row, weiqi_next_col)) continue;
        const weiqi_next_index = weiqi_index(weiqi_next_row, weiqi_next_col); // weiqi_next_index：相邻点下标。
        if (weiqi_board[weiqi_next_index] === weiqi_empty && !weiqi_seen.has(weiqi_next_index)) {
          weiqi_seen.add(weiqi_next_index); weiqi_stack.push(weiqi_next_index);
        } else if (weiqi_board[weiqi_next_index] !== weiqi_empty) {
          weiqi_border_colors.add(weiqi_board[weiqi_next_index]);
        }
      }
    }
    if (!weiqi_touches_edge && weiqi_border_colors.size === 1 && weiqi_border_colors.has(weiqi_black)) weiqi_black_territory += weiqi_region.length;
    if (!weiqi_touches_edge && weiqi_border_colors.size === 1 && weiqi_border_colors.has(weiqi_white)) weiqi_white_territory += weiqi_region.length;
  }
  return { black: weiqi_black_territory, white: weiqi_white_territory };
}

// weiqi_score：根据场上棋子、围地和贴目返回双方本地估算分。
function weiqi_score(weiqi_state) {
  const weiqi_territory = weiqi_estimate_territory(weiqi_state.board); // weiqi_territory：双方围住的空点估算。
  const weiqi_black_stones = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_black).length; // weiqi_black_stones：黑棋在场数。
  const weiqi_white_stones = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_white).length; // weiqi_white_stones：白棋在场数。
  return {
    black: weiqi_black_stones + weiqi_territory.black,
    white: weiqi_white_stones + weiqi_territory.white + weiqi_komi,
    blackTerritory: weiqi_territory.black,
    whiteTerritory: weiqi_territory.white,
  };
}

// weiqi_predict：由棋盘控制、提子和局面阶段给出预测；开局固定 50:50。
function weiqi_predict(weiqi_state) {
  if (weiqi_state.moves === 0) return { black: 50, white: 50, summary: "空棋盘，双方机会均等" };
  const weiqi_scoring = weiqi_score(weiqi_state); // weiqi_scoring：当前本地数子结果。
  const weiqi_black_stones = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_black).length; // weiqi_black_stones：用于预测的黑棋在场数。
  const weiqi_white_stones = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_white).length; // weiqi_white_stones：用于预测的白棋在场数。
  const weiqi_phase = qilei_clamp(weiqi_state.moves / 180, 0, 1); // weiqi_phase：贴目和围地逐步进入预测的对局阶段权重。
  const weiqi_effective_black = weiqi_black_stones + weiqi_scoring.blackTerritory * weiqi_phase + weiqi_state.captures.black * 0.55; // weiqi_effective_black：黑方棋子、围地和提子的平滑评价。
  const weiqi_effective_white = weiqi_white_stones + weiqi_scoring.whiteTerritory * weiqi_phase + weiqi_state.captures.white * 0.55 + weiqi_komi * weiqi_phase; // weiqi_effective_white：白方棋子、围地、提子和渐进贴目的评价。
  const weiqi_scale = Math.max(22, weiqi_state.moves * 0.75); // weiqi_scale：随对局阶段增长的预测稳定尺度。
  const weiqi_black_percent = Math.round(qilei_clamp(50 + (weiqi_effective_black - weiqi_effective_white) / weiqi_scale * 20, 3, 97)); // weiqi_black_percent：黑方预测百分比。
  return {
    black: weiqi_black_percent,
    white: 100 - weiqi_black_percent,
    summary: Math.abs(weiqi_black_percent - 50) < 5 ? "双方控制区域接近" : (weiqi_black_percent > 50 ? "黑方暂时领先" : "白方暂时领先"),
  };
}

// weiqi_robot_move：用提子、气数、星位与邻近性为任意棋色评估候选点。
function weiqi_robot_move(weiqi_state, weiqi_stone) {
  const weiqi_candidates = []; // weiqi_candidates：机器人合法候选落点和评分。
  const weiqi_stars = new Set([weiqi_index(3, 3), weiqi_index(3, 9), weiqi_index(3, 15), weiqi_index(9, 3), weiqi_index(9, 9), weiqi_index(9, 15), weiqi_index(15, 3), weiqi_index(15, 9), weiqi_index(15, 15)]); // weiqi_stars：九个星位下标。
  for (let weiqi_row = 0; weiqi_row < weiqi_board_size; weiqi_row += 1) {
    for (let weiqi_col = 0; weiqi_col < weiqi_board_size; weiqi_col += 1) {
      const weiqi_trial = weiqi_try_move(weiqi_state, weiqi_row, weiqi_col, weiqi_stone); // weiqi_trial：该棋色在此点的合法试走结果。
      if (!weiqi_trial) continue;
      let weiqi_near_stones = 0; // weiqi_near_stones：两格范围内已有棋子数量。
      for (let weiqi_dr = -2; weiqi_dr <= 2; weiqi_dr += 1) {
        for (let weiqi_dc = -2; weiqi_dc <= 2; weiqi_dc += 1) {
          const weiqi_scan_row = weiqi_row + weiqi_dr; // weiqi_scan_row：邻域扫描行。
          const weiqi_scan_col = weiqi_col + weiqi_dc; // weiqi_scan_col：邻域扫描列。
          if (weiqi_inside(weiqi_scan_row, weiqi_scan_col) && weiqi_state.board[weiqi_index(weiqi_scan_row, weiqi_scan_col)] !== weiqi_empty) weiqi_near_stones += 1;
        }
      }
      if (weiqi_state.moves > 18 && weiqi_near_stones === 0) continue;
      const weiqi_new_group = weiqi_group(weiqi_trial.board, weiqi_index(weiqi_row, weiqi_col)); // weiqi_new_group：落子后新棋块及其气。
      const weiqi_edge_distance = Math.min(weiqi_row, weiqi_col, 18 - weiqi_row, 18 - weiqi_col); // weiqi_edge_distance：落点距最近边线的距离。
      const weiqi_score_value = weiqi_trial.captured * 300 + weiqi_new_group.liberties.length * 5 + weiqi_near_stones * 2 + (weiqi_stars.has(weiqi_index(weiqi_row, weiqi_col)) ? 22 : 0) + Math.min(weiqi_edge_distance, 4) * 1.5 + Math.random(); // weiqi_score_value：机器人候选综合分。
      weiqi_candidates.push({ row: weiqi_row, col: weiqi_col, score: weiqi_score_value });
    }
  }
  weiqi_candidates.sort((weiqi_first, weiqi_second) => weiqi_second.score - weiqi_first.score);
  return qilei_random_choice(weiqi_candidates.slice(0, Math.min(4, weiqi_candidates.length)));
}

// weiqi_create_game：创建可交互的围棋页面实例。
export function weiqi_create_game({ boardHost: weiqi_board_host, controlsHost: weiqi_controls_host, savedState: weiqi_saved_state, setting: weiqi_setting, services: weiqi_services }) {
  const { canvas: weiqi_canvas, context: weiqi_context } = qilei_make_canvas(weiqi_board_host, { width: 820, height: 840 }, "十九路围棋棋盘"); // weiqi_canvas/context：对应 C++ 左侧 820×840 绘图区域。
  let weiqi_state = weiqi_valid_state(weiqi_saved_state) ? qilei_deep_copy(weiqi_saved_state) : weiqi_initial_state(); // weiqi_state：当前可持久化围棋状态。
  let weiqi_pending_move = null; // weiqi_pending_move：等待玩家再次点击确认的落点。
  let weiqi_hint_move = null; // weiqi_hint_move：提示按钮推荐落点。
  let weiqi_robot_timer = null; // weiqi_robot_timer：机器人思考延时定时器。
  let weiqi_finished_reported = Boolean(weiqi_state.over); // weiqi_finished_reported：终局是否已经记录。
  let weiqi_destroyed = false; // weiqi_destroyed：离开本局后阻止迟到的引擎响应继续更新页面。
  const weiqi_memory_history = []; // weiqi_memory_history：本页面内用于悔棋的快照。

  // weiqi_is_robot_side：根据公共设置判断黑方或白方是否由机器人控制。
  function weiqi_is_robot_side(weiqi_side) {
    const weiqi_mode = weiqi_setting?.robotMode ?? 2; // weiqi_mode：0 双玩家、1 黑机器人、2 白机器人、3 双机器人。
    return weiqi_mode === 3 || (weiqi_mode === 1 && weiqi_side === weiqi_black) || (weiqi_mode === 2 && weiqi_side === weiqi_white);
  }

  // weiqi_draw：绘制十九路网格、星位、棋子和操作轮廓。
  function weiqi_draw() {
    const weiqi_left = 60; // weiqi_left：C++ 第一条竖线横坐标。
    const weiqi_top = 66; // weiqi_top：C++ 第一条横线纵坐标。
    const weiqi_step = 39; // weiqi_step：C++ 相邻交叉点距离。
    weiqi_context.fillStyle = "rgb(226,196,137)"; weiqi_context.fillRect(0, 0, weiqi_canvas.width, weiqi_canvas.height);
    weiqi_context.fillStyle = "rgb(224,187,116)"; weiqi_context.fillRect(22, 24, 758, 778);
    weiqi_context.strokeStyle = "#473821"; weiqi_context.lineWidth = 1.35;
    for (let weiqi_line = 0; weiqi_line < weiqi_board_size; weiqi_line += 1) {
      const weiqi_x = weiqi_left + weiqi_line * weiqi_step; // weiqi_x：当前竖线横坐标。
      const weiqi_y = weiqi_top + weiqi_line * weiqi_step; // weiqi_y：当前横线纵坐标。
      weiqi_context.beginPath(); weiqi_context.moveTo(weiqi_left, weiqi_y); weiqi_context.lineTo(weiqi_left + 18 * weiqi_step, weiqi_y); weiqi_context.stroke();
      weiqi_context.beginPath(); weiqi_context.moveTo(weiqi_x, weiqi_top); weiqi_context.lineTo(weiqi_x, weiqi_top + 18 * weiqi_step); weiqi_context.stroke();
    }
    for (const weiqi_star_row of [3, 9, 15]) for (const weiqi_star_col of [3, 9, 15]) {
      weiqi_context.beginPath(); weiqi_context.arc(weiqi_left + weiqi_star_col * weiqi_step, weiqi_top + weiqi_star_row * weiqi_step, 4.5, 0, Math.PI * 2); weiqi_context.fillStyle = "#392c1b"; weiqi_context.fill();
    }
    for (let weiqi_row = 0; weiqi_row < weiqi_board_size; weiqi_row += 1) {
      for (let weiqi_col = 0; weiqi_col < weiqi_board_size; weiqi_col += 1) {
        const weiqi_stone = weiqi_state.board[weiqi_index(weiqi_row, weiqi_col)]; // weiqi_stone：当前交叉点棋色。
        if (weiqi_stone === weiqi_empty) continue;
        const weiqi_x = weiqi_left + weiqi_col * weiqi_step; // weiqi_x：棋子中心横坐标。
        const weiqi_y = weiqi_top + weiqi_row * weiqi_step; // weiqi_y：棋子中心纵坐标。
        const weiqi_gradient = weiqi_context.createRadialGradient(weiqi_x - 5, weiqi_y - 6, 1, weiqi_x, weiqi_y, 17); // weiqi_gradient：棋子立体渐变。
        if (weiqi_stone === weiqi_black) { weiqi_gradient.addColorStop(0, "#666"); weiqi_gradient.addColorStop(1, "#101214"); }
        else { weiqi_gradient.addColorStop(0, "#fff"); weiqi_gradient.addColorStop(1, "#d7d2c9"); }
        weiqi_context.beginPath(); weiqi_context.arc(weiqi_x, weiqi_y, 18, 0, Math.PI * 2); weiqi_context.fillStyle = weiqi_gradient; weiqi_context.fill();
      }
    }
    const weiqi_draw_mark = (weiqi_move, weiqi_color, weiqi_dash) => {
      if (!weiqi_move) return;
      weiqi_context.save(); weiqi_context.strokeStyle = weiqi_color; weiqi_context.lineWidth = 3.5; weiqi_context.setLineDash(weiqi_dash);
      weiqi_context.beginPath(); weiqi_context.arc(weiqi_left + weiqi_move.col * weiqi_step, weiqi_top + weiqi_move.row * weiqi_step, 17, 0, Math.PI * 2); weiqi_context.stroke(); weiqi_context.restore();
    }; // weiqi_draw_mark：绘制待确认和推荐点轮廓。
    weiqi_draw_mark(weiqi_hint_move, "#18795d", [6, 4]);
    weiqi_draw_mark(weiqi_pending_move, "#c64237", []);
    weiqi_context.fillStyle = "rgb(70,54,34)";
    weiqi_context.font = "14px 'Microsoft YaHei',sans-serif";
    weiqi_context.textAlign = "center";
    weiqi_context.textBaseline = "middle";
    const weiqi_letters = "ABCDEFGHJKLMNOPQRST"; // weiqi_letters：围棋按规则跳过字母 I 的列标。
    for (let weiqi_axis = 0; weiqi_axis < 19; weiqi_axis += 1) {
      weiqi_context.fillText(weiqi_letters[weiqi_axis], weiqi_left + weiqi_axis * weiqi_step, 820);
      weiqi_context.fillText(String(19 - weiqi_axis), 38, weiqi_top + weiqi_axis * weiqi_step);
    }
  }

  // weiqi_update_panel：刷新双方状态、预测和本次操作文字。
  function weiqi_update_panel(weiqi_status = "") {
    const weiqi_prediction = weiqi_predict(weiqi_state); // weiqi_prediction：当前胜负预测。
    const weiqi_black_count = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_black).length; // weiqi_black_count：黑棋在场数。
    const weiqi_white_count = weiqi_state.board.filter(weiqi_value => weiqi_value === weiqi_white).length; // weiqi_white_count：白棋在场数。
    weiqi_services.update({
      status: weiqi_status || (weiqi_state.over ? weiqi_state.result : (weiqi_is_robot_side(weiqi_state.side) ? "机器人正在思考…" : `等待${weiqi_state.side === weiqi_black ? "黑方" : "白方"}操作`)),
      prediction: { first: weiqi_prediction.black, second: weiqi_prediction.white, firstName: "黑", secondName: "白", summary: weiqi_prediction.summary },
      stats: [
        { label: "黑方状态", value: `场上 ${weiqi_black_count} 子 · 提子 ${weiqi_state.captures.black}` },
        { label: "白方状态", value: `场上 ${weiqi_white_count} 子 · 提子 ${weiqi_state.captures.white}` },
        { label: "对局进度", value: `共 ${weiqi_state.moves} 手 · 连续停一手 ${weiqi_state.passes}` },
      ],
      activeSide: weiqi_state.side === weiqi_black ? 0 : 1,
      moveCount: weiqi_state.moves,
    });
  }

  // weiqi_finish_by_score：两次停一手后本地数子并结束对局。
  function weiqi_finish_by_score() {
    const weiqi_scoring = weiqi_score(weiqi_state); // weiqi_scoring：终局本地数子结果。
    const weiqi_margin_value = Math.abs(weiqi_scoring.black - weiqi_scoring.white).toFixed(1); // weiqi_margin_value：双方分差。
    weiqi_state.over = true;
    if (weiqi_scoring.black > weiqi_scoring.white) weiqi_state.result = `黑胜 ${weiqi_margin_value} 目`;
    else if (weiqi_scoring.white > weiqi_scoring.black) weiqi_state.result = `白胜 ${weiqi_margin_value} 目`;
    else weiqi_state.result = "和棋";
    if (!weiqi_finished_reported) { weiqi_finished_reported = true; weiqi_services.finish(weiqi_state.result); }
  }

  // weiqi_commit_move：执行合法落子、提子、换手并持久化。
  function weiqi_commit_move(weiqi_move, weiqi_stone) {
    const weiqi_trial = weiqi_try_move(weiqi_state, weiqi_move.row, weiqi_move.col, weiqi_stone); // weiqi_trial：本步规则验证结果。
    if (!weiqi_trial || weiqi_state.over) return false;
    weiqi_memory_history.push(qilei_deep_copy(weiqi_state));
    const weiqi_old_board = [...weiqi_state.board]; // weiqi_old_board：执行本步前棋盘，用于下一步打劫判断。
    weiqi_state.board = weiqi_trial.board;
    weiqi_state.previousBoard = weiqi_old_board;
    if (weiqi_stone === weiqi_black) weiqi_state.captures.black += weiqi_trial.captured;
    else weiqi_state.captures.white += weiqi_trial.captured;
    weiqi_state.side = weiqi_opponent(weiqi_stone);
    weiqi_state.passes = 0;
    weiqi_state.moves += 1;
    weiqi_pending_move = null;
    weiqi_hint_move = null;
    weiqi_draw(); weiqi_update_panel(weiqi_trial.captured ? `本手提掉 ${weiqi_trial.captured} 子` : "落子完成"); weiqi_services.save(qilei_deep_copy(weiqi_state)); weiqi_schedule_robot();
    return true;
  }

  // weiqi_pass：当前一方停一手；连续两次则数子结束。
  function weiqi_pass(weiqi_robot = false) {
    if (weiqi_state.over || (!weiqi_robot && weiqi_is_robot_side(weiqi_state.side))) return;
    weiqi_memory_history.push(qilei_deep_copy(weiqi_state));
    weiqi_state.passes += 1;
    weiqi_state.moves += 1;
    weiqi_state.previousBoard = null;
    weiqi_state.side = weiqi_opponent(weiqi_state.side);
    weiqi_pending_move = null;
    if (weiqi_state.passes >= 2) weiqi_finish_by_score();
    weiqi_draw(); weiqi_update_panel(weiqi_state.over ? weiqi_state.result : "本方停一手"); weiqi_services.save(qilei_deep_copy(weiqi_state));
    weiqi_schedule_robot();
  }

  // weiqi_schedule_robot：机器人先显示待确认落点轮廓，停留两秒后再正式落子。
  function weiqi_schedule_robot() {
    window.clearTimeout(weiqi_robot_timer);
    if (weiqi_destroyed || weiqi_state.over || !weiqi_is_robot_side(weiqi_state.side)) return;
    weiqi_update_panel("机器人正在计算气与提子…");
    weiqi_robot_timer = window.setTimeout(async () => {
      const weiqi_robot_stone = weiqi_state.side; // weiqi_robot_stone：本次机器人棋色。
      const weiqi_request_moves = weiqi_state.moves; // weiqi_request_moves：用于丢弃悔棋后的过期 engine 响应。
      let weiqi_move = null; // weiqi_move：外部 engine 或规则兜底选出的落点。
      try {
        const weiqi_response = await weiqi_services.engineMove({ board: qilei_deep_copy(weiqi_state.board), side: weiqi_robot_stone, moveCount: weiqi_state.moves, balanced: weiqi_setting?.robotMode === 3 }); // weiqi_response：Python 后端围棋 engine 返回落点。
        const weiqi_candidate = weiqi_response?.move; // weiqi_candidate：尚未通过网页自杀和打劫规则复核的候选。
        if (weiqi_candidate && weiqi_try_move(weiqi_state, weiqi_candidate.row, weiqi_candidate.col, weiqi_robot_stone)) weiqi_move = weiqi_candidate;
      } catch (_) {
        weiqi_move = null;
      }
      if (weiqi_destroyed || weiqi_state.side !== weiqi_robot_stone || weiqi_state.moves !== weiqi_request_moves || weiqi_state.over) return;
      if (!weiqi_move) weiqi_move = weiqi_robot_move(weiqi_state, weiqi_robot_stone);
      if (!weiqi_move || (weiqi_state.moves > 220 && Math.random() < 0.16)) weiqi_pass(true);
      else {
        weiqi_pending_move = weiqi_move;
        weiqi_hint_move = null;
        weiqi_draw();
        weiqi_update_panel("机器人已选择落点，正在确认落子…");
        weiqi_robot_timer = window.setTimeout(() => weiqi_commit_move(weiqi_move, weiqi_robot_stone), 2000);
      }
    }, 560);
  }

  // weiqi_handle_click：处理玩家选点和第二次点击确认。
  function weiqi_handle_click(weiqi_event) {
    if (weiqi_state.over || weiqi_is_robot_side(weiqi_state.side)) return;
    const weiqi_point = qilei_canvas_point(weiqi_canvas, weiqi_event); // weiqi_point：画布点击坐标。
    const weiqi_step = 39; // weiqi_step：网格间距。
    const weiqi_row = Math.round((weiqi_point.y - 66) / weiqi_step); // weiqi_row：点击行号。
    const weiqi_col = Math.round((weiqi_point.x - 60) / weiqi_step); // weiqi_col：点击列号。
    if (!weiqi_inside(weiqi_row, weiqi_col) || !weiqi_try_move(weiqi_state, weiqi_row, weiqi_col, weiqi_state.side)) { weiqi_services.toast("该点不能落子（占用、自杀或打劫）"); return; }
    if (weiqi_pending_move?.row === weiqi_row && weiqi_pending_move?.col === weiqi_col) {
      weiqi_commit_move(weiqi_pending_move, weiqi_state.side);
    } else {
      weiqi_pending_move = { row: weiqi_row, col: weiqi_col };
      weiqi_hint_move = null;
      const weiqi_letters = "ABCDEFGHJKLMNOPQRST"; // weiqi_letters：围棋横坐标字母（跳过 I）。
      weiqi_draw(); weiqi_update_panel(`已选择 ${weiqi_letters[weiqi_col]}${weiqi_board_size - weiqi_row}，再次点击确认`);
    }
  }

  // weiqi_undo：撤回最近一轮玩家和机器人落子。
  function weiqi_undo() {
    if (!weiqi_memory_history.length) { weiqi_services.toast("当前没有可悔的棋"); return; }
    window.clearTimeout(weiqi_robot_timer);
    let weiqi_previous = weiqi_memory_history.pop(); // weiqi_previous：最近一步之前的状态。
    if (weiqi_previous.side === weiqi_white && weiqi_memory_history.length) weiqi_previous = weiqi_memory_history.pop();
    weiqi_state = weiqi_previous;
    weiqi_state.over = false; weiqi_state.result = ""; weiqi_finished_reported = false; weiqi_pending_move = null;
    weiqi_draw(); weiqi_update_panel("已撤回上一轮"); weiqi_services.save(qilei_deep_copy(weiqi_state));
  }

  // weiqi_hint：为当前非机器人方显示评分最高的合法落点。
  function weiqi_hint() {
    if (weiqi_state.over || weiqi_is_robot_side(weiqi_state.side)) return;
    weiqi_hint_move = weiqi_robot_move(weiqi_state, weiqi_state.side);
    weiqi_draw(); weiqi_update_panel("绿色虚线圈是推荐落点");
  }

  // weiqi_new_game：清除围棋存档并重新开局。
  async function weiqi_new_game() {
    window.clearTimeout(weiqi_robot_timer);
    await weiqi_services.clearSave();
    weiqi_state = weiqi_initial_state(); weiqi_memory_history.length = 0; weiqi_pending_move = null; weiqi_hint_move = null; weiqi_finished_reported = false;
    weiqi_draw(); weiqi_update_panel("新对局已开始，请选择落点"); weiqi_services.save(qilei_deep_copy(weiqi_state)); weiqi_schedule_robot();
  }

  // weiqi_timeout：任一方步时或局时耗尽时立即判负。
  function weiqi_timeout(weiqi_timed_side, weiqi_kind) {
    if (weiqi_state.over || weiqi_destroyed) return;
    window.clearTimeout(weiqi_robot_timer);
    const weiqi_loser = weiqi_timed_side === 0 ? weiqi_black : weiqi_white; // weiqi_loser：耗尽计时的一方棋色。
    weiqi_state.over = true;
    weiqi_state.result = `${weiqi_loser === weiqi_black ? "黑方" : "白方"}${weiqi_kind}耗尽，判负`;
    weiqi_draw();
    weiqi_update_panel(weiqi_state.result);
    weiqi_services.save(qilei_deep_copy(weiqi_state));
    if (!weiqi_finished_reported) {
      weiqi_finished_reported = true;
      weiqi_services.finish(`${weiqi_loser === weiqi_black ? "黑方" : "白方"}超时判负`);
    }
  }

  weiqi_controls_host.append(
    qilei_control_button("悔棋 (U)", weiqi_undo),
    qilei_control_button("重开 (N)", weiqi_new_game, "warning"),
  );
  weiqi_canvas.addEventListener("click", weiqi_handle_click);
  weiqi_draw(); weiqi_update_panel(weiqi_saved_state ? "已读取个人存档" : "请点击落点，再次点击确认"); weiqi_schedule_robot();

  return {
    // getState：返回当前围棋状态供网页统一保存。
    getState: () => qilei_deep_copy(weiqi_state),
    timeout: weiqi_timeout,
    handleShortcut: weiqi_key => {
      if (weiqi_key !== "p") return false;
      weiqi_pass(false);
      return true;
    },
    // destroy：清除机器人定时器并解绑画布事件。
    destroy: () => { weiqi_destroyed = true; window.clearTimeout(weiqi_robot_timer); weiqi_canvas.removeEventListener("click", weiqi_handle_click); },
  };
}
