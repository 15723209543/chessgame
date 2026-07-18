// wuziqi_game.js：十五路五子棋规则、机器人、胜负预测和画布界面。

import {
  qilei_canvas_point,
  qilei_clamp,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
} from "./qilei_game_utils.js";

const wuziqi_board_size = 15; // wuziqi_board_size：五子棋每行和每列的交叉点数量。
const wuziqi_empty = 0; // wuziqi_empty：空交叉点编码。
const wuziqi_black = 1; // wuziqi_black：玩家黑棋编码。
const wuziqi_white = 2; // wuziqi_white：机器人白棋编码。
const wuziqi_directions = [[1, 0], [0, 1], [1, 1], [1, -1]]; // wuziqi_directions：连珠检测的四个方向。

// wuziqi_initial_state：创建一局全新的五子棋状态。
function wuziqi_initial_state() {
  return {
    board: Array(wuziqi_board_size * wuziqi_board_size).fill(wuziqi_empty),
    side: wuziqi_black,
    moves: [],
    over: false,
    winner: wuziqi_empty,
  };
}

// wuziqi_valid_state：判断服务器中的存档能否安全恢复。
function wuziqi_valid_state(wuziqi_value) {
  return Boolean(wuziqi_value && Array.isArray(wuziqi_value.board) &&
    wuziqi_value.board.length === wuziqi_board_size * wuziqi_board_size &&
    [wuziqi_black, wuziqi_white].includes(wuziqi_value.side));
}

// wuziqi_index：把行列坐标转换为一维棋盘下标。
function wuziqi_index(wuziqi_row, wuziqi_col) {
  return wuziqi_row * wuziqi_board_size + wuziqi_col;
}

// wuziqi_inside：判断行列坐标是否位于棋盘内。
function wuziqi_inside(wuziqi_row, wuziqi_col) {
  return wuziqi_row >= 0 && wuziqi_row < wuziqi_board_size && wuziqi_col >= 0 && wuziqi_col < wuziqi_board_size;
}

// wuziqi_line_length：计算指定棋子经过落点在一个方向上的连续长度。
function wuziqi_line_length(wuziqi_board, wuziqi_row, wuziqi_col, wuziqi_stone, wuziqi_dr, wuziqi_dc) {
  let wuziqi_length = 1; // wuziqi_length：当前方向的连续棋子总数。
  for (const wuziqi_sign of [-1, 1]) {
    let wuziqi_next_row = wuziqi_row + wuziqi_dr * wuziqi_sign; // wuziqi_next_row：扫描中的行坐标。
    let wuziqi_next_col = wuziqi_col + wuziqi_dc * wuziqi_sign; // wuziqi_next_col：扫描中的列坐标。
    while (wuziqi_inside(wuziqi_next_row, wuziqi_next_col) && wuziqi_board[wuziqi_index(wuziqi_next_row, wuziqi_next_col)] === wuziqi_stone) {
      wuziqi_length += 1;
      wuziqi_next_row += wuziqi_dr * wuziqi_sign;
      wuziqi_next_col += wuziqi_dc * wuziqi_sign;
    }
  }
  return wuziqi_length;
}

// wuziqi_is_win：判断某一步是否形成五子或更多连珠。
function wuziqi_is_win(wuziqi_board, wuziqi_row, wuziqi_col, wuziqi_stone) {
  return wuziqi_directions.some(([wuziqi_dr, wuziqi_dc]) =>
    wuziqi_line_length(wuziqi_board, wuziqi_row, wuziqi_col, wuziqi_stone, wuziqi_dr, wuziqi_dc) >= 5);
}

// wuziqi_pattern_score：评估指定空点对某一方的进攻价值。
function wuziqi_pattern_score(wuziqi_board, wuziqi_row, wuziqi_col, wuziqi_stone) {
  if (wuziqi_board[wuziqi_index(wuziqi_row, wuziqi_col)] !== wuziqi_empty) return -1;
  wuziqi_board[wuziqi_index(wuziqi_row, wuziqi_col)] = wuziqi_stone;
  let wuziqi_score = 0; // wuziqi_score：落子后四向连型的综合分。
  for (const [wuziqi_dr, wuziqi_dc] of wuziqi_directions) {
    const wuziqi_length = wuziqi_line_length(wuziqi_board, wuziqi_row, wuziqi_col, wuziqi_stone, wuziqi_dr, wuziqi_dc); // wuziqi_length：本方向连续长度。
    const wuziqi_weights = [0, 2, 18, 180, 4000, 100000]; // wuziqi_weights：不同连珠长度对应的启发式分值。
    wuziqi_score += wuziqi_weights[Math.min(wuziqi_length, 5)];
  }
  wuziqi_board[wuziqi_index(wuziqi_row, wuziqi_col)] = wuziqi_empty;
  const wuziqi_center_distance = Math.abs(wuziqi_row - 7) + Math.abs(wuziqi_col - 7); // wuziqi_center_distance：落点到棋盘中心的曼哈顿距离。
  return wuziqi_score + Math.max(0, 14 - wuziqi_center_distance);
}

// wuziqi_candidate_moves：仅返回已有棋子周围两格的候选点，减少机器人计算量。
function wuziqi_candidate_moves(wuziqi_board) {
  const wuziqi_occupied = wuziqi_board.some(wuziqi_value => wuziqi_value !== wuziqi_empty); // wuziqi_occupied：棋盘是否已有落子。
  if (!wuziqi_occupied) return [{ row: 7, col: 7 }];
  const wuziqi_candidates = []; // wuziqi_candidates：机器人可考虑的空点数组。
  for (let wuziqi_row = 0; wuziqi_row < wuziqi_board_size; wuziqi_row += 1) {
    for (let wuziqi_col = 0; wuziqi_col < wuziqi_board_size; wuziqi_col += 1) {
      if (wuziqi_board[wuziqi_index(wuziqi_row, wuziqi_col)] !== wuziqi_empty) continue;
      let wuziqi_near = false; // wuziqi_near：该空点周围两格内是否存在棋子。
      for (let wuziqi_dr = -2; wuziqi_dr <= 2 && !wuziqi_near; wuziqi_dr += 1) {
        for (let wuziqi_dc = -2; wuziqi_dc <= 2; wuziqi_dc += 1) {
          const wuziqi_scan_row = wuziqi_row + wuziqi_dr; // wuziqi_scan_row：邻域扫描行。
          const wuziqi_scan_col = wuziqi_col + wuziqi_dc; // wuziqi_scan_col：邻域扫描列。
          if (wuziqi_inside(wuziqi_scan_row, wuziqi_scan_col) && wuziqi_board[wuziqi_index(wuziqi_scan_row, wuziqi_scan_col)] !== wuziqi_empty) {
            wuziqi_near = true;
            break;
          }
        }
      }
      if (wuziqi_near) wuziqi_candidates.push({ row: wuziqi_row, col: wuziqi_col });
    }
  }
  return wuziqi_candidates;
}

// wuziqi_robot_move：先找必胜和必防，再为任意棋色综合攻防连型选择落点。
function wuziqi_robot_move(wuziqi_board, wuziqi_side) {
  const wuziqi_candidates = wuziqi_candidate_moves(wuziqi_board); // wuziqi_candidates：本回合全部候选点。
  const wuziqi_opponent_side = wuziqi_side === wuziqi_black ? wuziqi_white : wuziqi_black; // wuziqi_opponent_side：当前机器人对手棋色。
  let wuziqi_best_move = null; // wuziqi_best_move：当前最高分候选落点。
  let wuziqi_best_score = -Infinity; // wuziqi_best_score：当前候选最高分。
  for (const wuziqi_move of wuziqi_candidates) {
    const wuziqi_attack = wuziqi_pattern_score(wuziqi_board, wuziqi_move.row, wuziqi_move.col, wuziqi_side); // wuziqi_attack：当前棋色进攻价值。
    const wuziqi_defense = wuziqi_pattern_score(wuziqi_board, wuziqi_move.row, wuziqi_move.col, wuziqi_opponent_side); // wuziqi_defense：阻止对手的价值。
    const wuziqi_score = Math.max(wuziqi_attack * 1.08, wuziqi_defense) + wuziqi_attack * 0.22 + Math.random() * 0.01; // wuziqi_score：攻防综合分。
    if (wuziqi_score > wuziqi_best_score) {
      wuziqi_best_score = wuziqi_score;
      wuziqi_best_move = wuziqi_move;
    }
  }
  return wuziqi_best_move;
}

// wuziqi_predict：根据双方当前最佳连型计算平滑、对称的胜负预测；空棋盘固定为 50:50。
function wuziqi_predict(wuziqi_state) {
  if (wuziqi_state.moves.length === 0) return { black: 50, white: 50, summary: "空棋盘，双方机会均等" };
  if (wuziqi_state.over) {
    if (wuziqi_state.winner === wuziqi_black) return { black: 100, white: 0, summary: "黑方已连成五子" };
    if (wuziqi_state.winner === wuziqi_white) return { black: 0, white: 100, summary: "白方已连成五子" };
    return { black: 50, white: 50, summary: "棋盘下满，双方和棋" };
  }
  let wuziqi_black_best = 0; // wuziqi_black_best：黑方当前最强候选连型分。
  let wuziqi_white_best = 0; // wuziqi_white_best：白方当前最强候选连型分。
  for (const wuziqi_move of wuziqi_candidate_moves(wuziqi_state.board)) {
    wuziqi_black_best = Math.max(wuziqi_black_best, wuziqi_pattern_score(wuziqi_state.board, wuziqi_move.row, wuziqi_move.col, wuziqi_black));
    wuziqi_white_best = Math.max(wuziqi_white_best, wuziqi_pattern_score(wuziqi_state.board, wuziqi_move.row, wuziqi_move.col, wuziqi_white));
  }
  const wuziqi_difference = Math.log1p(wuziqi_black_best) - Math.log1p(wuziqi_white_best); // wuziqi_difference：经对数压缩的双方威胁差。
  const wuziqi_black_percent = Math.round(qilei_clamp(50 + wuziqi_difference * 5.2, 4, 96)); // wuziqi_black_percent：黑方预测百分比。
  return {
    black: wuziqi_black_percent,
    white: 100 - wuziqi_black_percent,
    summary: Math.abs(wuziqi_black_percent - 50) < 5 ? "双方连型接近" : (wuziqi_black_percent > 50 ? "黑方攻势更主动" : "白方防守反击占优"),
  };
}

// wuziqi_create_game：创建可交互的五子棋页面实例。
export function wuziqi_create_game({ boardHost: wuziqi_board_host, controlsHost: wuziqi_controls_host, savedState: wuziqi_saved_state, setting: wuziqi_setting, services: wuziqi_services }) {
  const { canvas: wuziqi_canvas, context: wuziqi_context } = qilei_make_canvas(wuziqi_board_host, { width: 800, height: 820 }, "十五路五子棋棋盘"); // wuziqi_canvas/context：对应 C++ 左侧 800×820 绘图区域。
  let wuziqi_state = wuziqi_valid_state(wuziqi_saved_state) ? qilei_deep_copy(wuziqi_saved_state) : wuziqi_initial_state(); // wuziqi_state：当前可持久化棋局状态。
  let wuziqi_pending_move = null; // wuziqi_pending_move：等待第二次点击确认的玩家落点。
  let wuziqi_hint_move = null; // wuziqi_hint_move：提示按钮给出的推荐落点。
  let wuziqi_robot_timer = null; // wuziqi_robot_timer：机器人思考延时定时器。
  let wuziqi_finished_reported = Boolean(wuziqi_state.over); // wuziqi_finished_reported：本局结果是否已经写入历史。
  let wuziqi_destroyed = false; // wuziqi_destroyed：离开本局后阻止迟到的引擎响应继续更新页面。
  const wuziqi_memory_history = []; // wuziqi_memory_history：当前页面内用于悔棋的状态快照。

  // wuziqi_is_robot_side：根据公共设置判断黑方或白方是否由机器人控制。
  function wuziqi_is_robot_side(wuziqi_side) {
    const wuziqi_mode = wuziqi_setting?.robotMode ?? 2; // wuziqi_mode：0 双玩家、1 黑机器人、2 白机器人、3 双机器人。
    return wuziqi_mode === 3 || (wuziqi_mode === 1 && wuziqi_side === wuziqi_black) || (wuziqi_mode === 2 && wuziqi_side === wuziqi_white);
  }

  // wuziqi_draw：完整重绘棋盘、棋子、待确认轮廓和提示标记。
  function wuziqi_draw() {
    const wuziqi_left = 62; // wuziqi_left：C++ 第一条竖线横坐标。
    const wuziqi_top = 66; // wuziqi_top：C++ 第一条横线纵坐标。
    const wuziqi_step = 49; // wuziqi_step：C++ 相邻交叉点像素间距。
    wuziqi_context.fillStyle = "rgb(235,211,164)";
    wuziqi_context.fillRect(0, 0, wuziqi_canvas.width, wuziqi_canvas.height);
    wuziqi_context.fillStyle = "rgb(224,187,116)";
    wuziqi_context.fillRect(24, 26, 736, 758);
    wuziqi_context.strokeStyle = "#493924";
    wuziqi_context.lineWidth = 1.45;
    for (let wuziqi_line = 0; wuziqi_line < wuziqi_board_size; wuziqi_line += 1) {
      const wuziqi_x = wuziqi_left + wuziqi_line * wuziqi_step; // wuziqi_x：当前竖线横坐标。
      const wuziqi_y = wuziqi_top + wuziqi_line * wuziqi_step; // wuziqi_y：当前横线纵坐标。
      wuziqi_context.beginPath(); wuziqi_context.moveTo(wuziqi_left, wuziqi_y); wuziqi_context.lineTo(wuziqi_left + 14 * wuziqi_step, wuziqi_y); wuziqi_context.stroke();
      wuziqi_context.beginPath(); wuziqi_context.moveTo(wuziqi_x, wuziqi_top); wuziqi_context.lineTo(wuziqi_x, wuziqi_top + 14 * wuziqi_step); wuziqi_context.stroke();
    }
    for (const [wuziqi_star_row, wuziqi_star_col] of [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]]) {
      wuziqi_context.beginPath();
      wuziqi_context.arc(wuziqi_left + wuziqi_star_col * wuziqi_step, wuziqi_top + wuziqi_star_row * wuziqi_step, 5, 0, Math.PI * 2);
      wuziqi_context.fillStyle = "#493924"; wuziqi_context.fill();
    }
    for (let wuziqi_row = 0; wuziqi_row < wuziqi_board_size; wuziqi_row += 1) {
      for (let wuziqi_col = 0; wuziqi_col < wuziqi_board_size; wuziqi_col += 1) {
        const wuziqi_stone = wuziqi_state.board[wuziqi_index(wuziqi_row, wuziqi_col)]; // wuziqi_stone：当前交叉点棋子编码。
        if (wuziqi_stone === wuziqi_empty) continue;
        const wuziqi_x = wuziqi_left + wuziqi_col * wuziqi_step; // wuziqi_x：棋子中心横坐标。
        const wuziqi_y = wuziqi_top + wuziqi_row * wuziqi_step; // wuziqi_y：棋子中心纵坐标。
        const wuziqi_gradient = wuziqi_context.createRadialGradient(wuziqi_x - 7, wuziqi_y - 8, 2, wuziqi_x, wuziqi_y, 22); // wuziqi_gradient：棋子立体渐变。
        if (wuziqi_stone === wuziqi_black) { wuziqi_gradient.addColorStop(0, "#5d5d5d"); wuziqi_gradient.addColorStop(1, "#111418"); }
        else { wuziqi_gradient.addColorStop(0, "#ffffff"); wuziqi_gradient.addColorStop(1, "#d8d2c8"); }
        wuziqi_context.beginPath(); wuziqi_context.arc(wuziqi_x, wuziqi_y, 20, 0, Math.PI * 2); wuziqi_context.fillStyle = wuziqi_gradient; wuziqi_context.fill();
      }
    }
    const wuziqi_draw_mark = (wuziqi_move, wuziqi_color, wuziqi_dash) => {
      if (!wuziqi_move) return;
      wuziqi_context.save(); wuziqi_context.setLineDash(wuziqi_dash); wuziqi_context.strokeStyle = wuziqi_color; wuziqi_context.lineWidth = 4;
      wuziqi_context.beginPath(); wuziqi_context.arc(wuziqi_left + wuziqi_move.col * wuziqi_step, wuziqi_top + wuziqi_move.row * wuziqi_step, 22, 0, Math.PI * 2); wuziqi_context.stroke(); wuziqi_context.restore();
    }; // wuziqi_draw_mark：绘制提示或待确认落点轮廓。
    wuziqi_draw_mark(wuziqi_hint_move, "#2f8368", [7, 5]);
    wuziqi_draw_mark(wuziqi_pending_move, "#b53c32", []);
    wuziqi_context.fillStyle = "rgb(73,57,36)";
    wuziqi_context.font = "14px 'Microsoft YaHei',sans-serif";
    wuziqi_context.textAlign = "center";
    wuziqi_context.textBaseline = "middle";
    for (let wuziqi_axis = 0; wuziqi_axis < 15; wuziqi_axis += 1) {
      wuziqi_context.fillText(String.fromCharCode(65 + wuziqi_axis), wuziqi_left + wuziqi_axis * wuziqi_step, 806);
      wuziqi_context.fillText(String(15 - wuziqi_axis), 40, wuziqi_top + wuziqi_axis * wuziqi_step);
    }
  }

  // wuziqi_update_panel：刷新右侧操作、统计和胜负预测。
  function wuziqi_update_panel(wuziqi_status = "") {
    const wuziqi_prediction = wuziqi_predict(wuziqi_state); // wuziqi_prediction：当前局势预测结果。
    const wuziqi_black_count = wuziqi_state.board.filter(wuziqi_value => wuziqi_value === wuziqi_black).length; // wuziqi_black_count：黑棋在场数量。
    const wuziqi_white_count = wuziqi_state.board.filter(wuziqi_value => wuziqi_value === wuziqi_white).length; // wuziqi_white_count：白棋在场数量。
    wuziqi_services.update({
      status: wuziqi_status || (wuziqi_state.over ? "本局已经结束" : (wuziqi_is_robot_side(wuziqi_state.side) ? "机器人正在思考…" : `等待${wuziqi_state.side === wuziqi_black ? "黑方" : "白方"}操作`)),
      prediction: { first: wuziqi_prediction.black, second: wuziqi_prediction.white, firstName: "黑", secondName: "白", summary: wuziqi_prediction.summary },
      stats: [
        { label: "黑方状态", value: `场上 ${wuziqi_black_count} 子 · 已走 ${Math.ceil(wuziqi_state.moves.length / 2)} 手` },
        { label: "白方状态", value: `场上 ${wuziqi_white_count} 子 · 已走 ${Math.floor(wuziqi_state.moves.length / 2)} 手` },
        { label: "当前回合", value: wuziqi_state.over ? "对局结束" : (wuziqi_state.side === wuziqi_black ? "黑方（你）" : "白方（机器人）") },
      ],
      activeSide: wuziqi_state.side === wuziqi_black ? 0 : 1,
      moveCount: wuziqi_state.moves.length,
    });
  }

  // wuziqi_commit_move：执行一步落子、判断终局并保存状态。
  function wuziqi_commit_move(wuziqi_move, wuziqi_stone, wuziqi_keep_snapshot = true) {
    if (!wuziqi_move || wuziqi_state.over || wuziqi_state.board[wuziqi_index(wuziqi_move.row, wuziqi_move.col)] !== wuziqi_empty) return false;
    if (wuziqi_keep_snapshot) wuziqi_memory_history.push(qilei_deep_copy(wuziqi_state));
    wuziqi_state.board[wuziqi_index(wuziqi_move.row, wuziqi_move.col)] = wuziqi_stone;
    wuziqi_state.moves.push({ row: wuziqi_move.row, col: wuziqi_move.col, stone: wuziqi_stone });
    if (wuziqi_is_win(wuziqi_state.board, wuziqi_move.row, wuziqi_move.col, wuziqi_stone)) {
      wuziqi_state.over = true;
      wuziqi_state.winner = wuziqi_stone;
    } else if (wuziqi_state.moves.length === wuziqi_board_size * wuziqi_board_size) {
      wuziqi_state.over = true;
      wuziqi_state.winner = wuziqi_empty;
    } else {
      wuziqi_state.side = wuziqi_stone === wuziqi_black ? wuziqi_white : wuziqi_black;
    }
    wuziqi_hint_move = null;
    wuziqi_pending_move = null;
    wuziqi_draw();
    wuziqi_update_panel();
    wuziqi_services.save(qilei_deep_copy(wuziqi_state));
    if (wuziqi_state.over && !wuziqi_finished_reported) {
      wuziqi_finished_reported = true;
      const wuziqi_result = wuziqi_state.winner === wuziqi_black ? "黑方胜" : (wuziqi_state.winner === wuziqi_white ? "白方胜" : "和棋"); // wuziqi_result：写入历史记录的终局文字。
      wuziqi_services.finish(wuziqi_result);
    }
    wuziqi_schedule_robot();
    return true;
  }

  // wuziqi_schedule_robot：机器人先显示待确认落点轮廓，停留两秒后再正式落子。
  function wuziqi_schedule_robot() {
    window.clearTimeout(wuziqi_robot_timer);
    if (wuziqi_destroyed || wuziqi_state.over || !wuziqi_is_robot_side(wuziqi_state.side)) return;
    wuziqi_update_panel("机器人正在分析攻防连型…");
    wuziqi_robot_timer = window.setTimeout(async () => {
      const wuziqi_robot_side = wuziqi_state.side; // wuziqi_robot_side：定时器执行时的机器人棋色。
      const wuziqi_request_moves = wuziqi_state.moves.length; // wuziqi_request_moves：用于忽略悔棋后的过期 engine 响应。
      let wuziqi_move = null; // wuziqi_move：外部 engine 或规则兜底选出的落点。
      try {
        const wuziqi_response = await wuziqi_services.engineMove({ board: qilei_deep_copy(wuziqi_state.board), side: wuziqi_robot_side, moveCount: wuziqi_state.moves.length, balanced: wuziqi_setting?.robotMode === 3 }); // wuziqi_response：Python 后端五子棋 engine 返回落点。
        const wuziqi_candidate = wuziqi_response?.move; // wuziqi_candidate：尚未通过网页空点检查的候选。
        if (wuziqi_candidate && wuziqi_inside(wuziqi_candidate.row, wuziqi_candidate.col) && wuziqi_state.board[wuziqi_index(wuziqi_candidate.row, wuziqi_candidate.col)] === wuziqi_empty) wuziqi_move = wuziqi_candidate;
      } catch (_) {
        wuziqi_move = null;
      }
      if (wuziqi_destroyed || wuziqi_state.side !== wuziqi_robot_side || wuziqi_state.moves.length !== wuziqi_request_moves || wuziqi_state.over) return;
      if (!wuziqi_move) wuziqi_move = wuziqi_robot_move(wuziqi_state.board, wuziqi_robot_side);
      if (!wuziqi_move) return;
      wuziqi_pending_move = wuziqi_move;
      wuziqi_hint_move = null;
      wuziqi_draw();
      wuziqi_update_panel("机器人已选择落点，正在确认落子…");
      wuziqi_robot_timer = window.setTimeout(() => wuziqi_commit_move(wuziqi_move, wuziqi_robot_side), 2000);
    }, 520);
  }

  // wuziqi_handle_click：处理玩家两次点击确认落子。
  function wuziqi_handle_click(wuziqi_event) {
    if (wuziqi_state.over || wuziqi_is_robot_side(wuziqi_state.side)) return;
    const wuziqi_point = qilei_canvas_point(wuziqi_canvas, wuziqi_event); // wuziqi_point：点击的画布坐标。
    const wuziqi_step = 49; // wuziqi_step：网格间距。
    const wuziqi_row = Math.round((wuziqi_point.y - 66) / wuziqi_step); // wuziqi_row：点击对应行号。
    const wuziqi_col = Math.round((wuziqi_point.x - 62) / wuziqi_step); // wuziqi_col：点击对应列号。
    if (!wuziqi_inside(wuziqi_row, wuziqi_col) || wuziqi_state.board[wuziqi_index(wuziqi_row, wuziqi_col)] !== wuziqi_empty) return;
    if (wuziqi_pending_move?.row === wuziqi_row && wuziqi_pending_move?.col === wuziqi_col) {
      wuziqi_commit_move(wuziqi_pending_move, wuziqi_state.side);
    } else {
      wuziqi_pending_move = { row: wuziqi_row, col: wuziqi_col };
      wuziqi_hint_move = null;
      wuziqi_draw();
      wuziqi_update_panel(`已选择 ${String.fromCharCode(65 + wuziqi_col)}${wuziqi_board_size - wuziqi_row}，再次点击确认`);
    }
  }

  // wuziqi_undo：撤回玩家和机器人最近一轮走棋。
  function wuziqi_undo() {
    if (!wuziqi_memory_history.length) { wuziqi_services.toast("当前没有可悔的棋"); return; }
    window.clearTimeout(wuziqi_robot_timer);
    let wuziqi_previous = wuziqi_memory_history.pop(); // wuziqi_previous：最近一步之前的状态。
    if (wuziqi_previous.side === wuziqi_white && wuziqi_memory_history.length) wuziqi_previous = wuziqi_memory_history.pop();
    wuziqi_state = wuziqi_previous;
    wuziqi_state.over = false;
    wuziqi_state.winner = wuziqi_empty;
    wuziqi_finished_reported = false;
    wuziqi_pending_move = null;
    wuziqi_draw(); wuziqi_update_panel("已撤回上一轮"); wuziqi_services.save(qilei_deep_copy(wuziqi_state));
  }

  // wuziqi_hint：显示当前非机器人方评分最高的落点轮廓。
  function wuziqi_hint() {
    if (wuziqi_state.over || wuziqi_is_robot_side(wuziqi_state.side)) return;
    wuziqi_hint_move = wuziqi_robot_move(wuziqi_state.board, wuziqi_state.side);
    wuziqi_draw(); wuziqi_update_panel("绿色虚线圈是推荐落点");
  }

  // wuziqi_new_game：清除旧存档并重建空棋盘。
  async function wuziqi_new_game() {
    window.clearTimeout(wuziqi_robot_timer);
    await wuziqi_services.clearSave();
    wuziqi_state = wuziqi_initial_state();
    wuziqi_memory_history.length = 0;
    wuziqi_pending_move = null;
    wuziqi_hint_move = null;
    wuziqi_finished_reported = false;
    wuziqi_draw(); wuziqi_update_panel("新对局已开始，请选择落点"); wuziqi_services.save(qilei_deep_copy(wuziqi_state)); wuziqi_schedule_robot();
  }

  // wuziqi_timeout：任一方步时或局时耗尽时立即判负。
  function wuziqi_timeout(wuziqi_timed_side, wuziqi_kind) {
    if (wuziqi_state.over || wuziqi_destroyed) return;
    window.clearTimeout(wuziqi_robot_timer);
    const wuziqi_loser = wuziqi_timed_side === 0 ? wuziqi_black : wuziqi_white; // wuziqi_loser：耗尽计时的一方棋色。
    wuziqi_state.over = true;
    wuziqi_state.winner = wuziqi_loser === wuziqi_black ? wuziqi_white : wuziqi_black;
    wuziqi_draw();
    wuziqi_update_panel(`${wuziqi_loser === wuziqi_black ? "黑方" : "白方"}${wuziqi_kind}耗尽，判负`);
    wuziqi_services.save(qilei_deep_copy(wuziqi_state));
    if (!wuziqi_finished_reported) {
      wuziqi_finished_reported = true;
      wuziqi_services.finish(`${wuziqi_loser === wuziqi_black ? "黑方" : "白方"}超时判负`);
    }
  }

  wuziqi_controls_host.append(
    qilei_control_button("悔棋 (U)", wuziqi_undo),
    qilei_control_button("重开 (N)", wuziqi_new_game, "warning"),
  );
  wuziqi_canvas.addEventListener("click", wuziqi_handle_click);
  wuziqi_draw();
  wuziqi_update_panel(wuziqi_saved_state ? "已读取个人存档" : "请点击落点，再次点击确认");
  wuziqi_schedule_robot();

  return {
    // getState：供页面退出前读取当前五子棋状态。
    getState: () => qilei_deep_copy(wuziqi_state),
    timeout: wuziqi_timeout,
    // destroy：移除五子棋事件和机器人定时器。
    destroy: () => { wuziqi_destroyed = true; window.clearTimeout(wuziqi_robot_timer); wuziqi_canvas.removeEventListener("click", wuziqi_handle_click); },
  };
}
