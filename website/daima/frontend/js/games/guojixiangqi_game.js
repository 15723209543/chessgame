// guojixiangqi_game.js：标准国际象棋走法、将军判断、升变选择、机器人和胜负预测。

import {
  qilei_canvas_point,
  qilei_clamp,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
} from "./qilei_game_utils.js";

const guojixiangqi_white = "w"; // guojixiangqi_white：玩家白方编码。
const guojixiangqi_black = "b"; // guojixiangqi_black：机器人黑方编码。
const guojixiangqi_symbols = { wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙", bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟" }; // guojixiangqi_symbols：棋子编码到显示字符的映射。
const guojixiangqi_values = { K: 0, Q: 900, R: 500, B: 330, N: 320, P: 100 }; // guojixiangqi_values：机器人和预测使用的基础材力分。
const guojixiangqi_white_roster = ["wK", "wQ", "wR", "wR", "wB", "wB", "wN", "wN", ...Array(8).fill("wP")]; // guojixiangqi_white_roster：白方初始十六枚棋子顺序。
const guojixiangqi_black_roster = ["bK", "bQ", "bR", "bR", "bB", "bB", "bN", "bN", ...Array(8).fill("bP")]; // guojixiangqi_black_roster：黑方初始十六枚棋子顺序。

// guojixiangqi_roster_state：返回右栏棋子列表并标记已被吃掉的棋子。
function guojixiangqi_roster_state(guojixiangqi_board, guojixiangqi_roster) {
  const guojixiangqi_remaining = {}; // guojixiangqi_remaining：棋盘上各棋子编码的剩余数量。
  for (const guojixiangqi_piece of guojixiangqi_board) {
    if (guojixiangqi_piece) guojixiangqi_remaining[guojixiangqi_piece] = (guojixiangqi_remaining[guojixiangqi_piece] || 0) + 1;
  }
  return guojixiangqi_roster.map(guojixiangqi_piece => {
    const guojixiangqi_alive = (guojixiangqi_remaining[guojixiangqi_piece] || 0) > 0; // guojixiangqi_alive：当前同类型棋子是否仍有存活名额。
    if (guojixiangqi_alive) guojixiangqi_remaining[guojixiangqi_piece] -= 1;
    return { text: guojixiangqi_symbols[guojixiangqi_piece], captured: !guojixiangqi_alive };
  });
}

// guojixiangqi_initial_board：创建国际象棋标准初始局面。
function guojixiangqi_initial_board() {
  return [
    "bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR",
    ...Array(8).fill("bP"),
    ...Array(32).fill(null),
    ...Array(8).fill("wP"),
    "wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR",
  ];
}

// guojixiangqi_initial_state：创建一局全新的国际象棋状态。
function guojixiangqi_initial_state() {
  return { board: guojixiangqi_initial_board(), side: guojixiangqi_white, moves: 0, over: false, winner: "", lastMove: null };
}

// guojixiangqi_valid_state：判断服务器存档是否包含合法尺寸的棋盘和行动方。
function guojixiangqi_valid_state(guojixiangqi_value) {
  return Boolean(guojixiangqi_value && Array.isArray(guojixiangqi_value.board) && guojixiangqi_value.board.length === 64 && [guojixiangqi_white, guojixiangqi_black].includes(guojixiangqi_value.side));
}

// guojixiangqi_index：把八乘八行列坐标转换为一维下标。
function guojixiangqi_index(guojixiangqi_row, guojixiangqi_col) {
  return guojixiangqi_row * 8 + guojixiangqi_col;
}

// guojixiangqi_inside：判断坐标是否位于八乘八棋盘内。
function guojixiangqi_inside(guojixiangqi_row, guojixiangqi_col) {
  return guojixiangqi_row >= 0 && guojixiangqi_row < 8 && guojixiangqi_col >= 0 && guojixiangqi_col < 8;
}

// guojixiangqi_opponent：返回指定阵营的对方编码。
function guojixiangqi_opponent(guojixiangqi_side) {
  return guojixiangqi_side === guojixiangqi_white ? guojixiangqi_black : guojixiangqi_white;
}

// guojixiangqi_piece_side：读取棋子所属阵营；空格返回空字符串。
function guojixiangqi_piece_side(guojixiangqi_piece) {
  return guojixiangqi_piece ? guojixiangqi_piece[0] : "";
}

// guojixiangqi_piece_type：读取棋子类型字母；空格返回空字符串。
function guojixiangqi_piece_type(guojixiangqi_piece) {
  return guojixiangqi_piece ? guojixiangqi_piece[1] : "";
}

// guojixiangqi_push_slider_moves：沿直线追加车、象或后的伪合法着法。
function guojixiangqi_push_slider_moves(guojixiangqi_board, guojixiangqi_row, guojixiangqi_col, guojixiangqi_side, guojixiangqi_directions, guojixiangqi_moves) {
  for (const [guojixiangqi_dr, guojixiangqi_dc] of guojixiangqi_directions) {
    let guojixiangqi_next_row = guojixiangqi_row + guojixiangqi_dr; // guojixiangqi_next_row：直线扫描行。
    let guojixiangqi_next_col = guojixiangqi_col + guojixiangqi_dc; // guojixiangqi_next_col：直线扫描列。
    while (guojixiangqi_inside(guojixiangqi_next_row, guojixiangqi_next_col)) {
      const guojixiangqi_target = guojixiangqi_board[guojixiangqi_index(guojixiangqi_next_row, guojixiangqi_next_col)]; // guojixiangqi_target：扫描位置棋子。
      if (!guojixiangqi_target) guojixiangqi_moves.push({ from: guojixiangqi_index(guojixiangqi_row, guojixiangqi_col), to: guojixiangqi_index(guojixiangqi_next_row, guojixiangqi_next_col) });
      else {
        if (guojixiangqi_piece_side(guojixiangqi_target) !== guojixiangqi_side && guojixiangqi_piece_type(guojixiangqi_target) !== "K") guojixiangqi_moves.push({ from: guojixiangqi_index(guojixiangqi_row, guojixiangqi_col), to: guojixiangqi_index(guojixiangqi_next_row, guojixiangqi_next_col) });
        break;
      }
      guojixiangqi_next_row += guojixiangqi_dr;
      guojixiangqi_next_col += guojixiangqi_dc;
    }
  }
}

// guojixiangqi_pseudo_moves_for_piece：生成一枚棋子的伪合法着法，不检查己方王是否受将。
function guojixiangqi_pseudo_moves_for_piece(guojixiangqi_board, guojixiangqi_from) {
  const guojixiangqi_piece = guojixiangqi_board[guojixiangqi_from]; // guojixiangqi_piece：待生成着法的棋子。
  if (!guojixiangqi_piece) return [];
  const guojixiangqi_side = guojixiangqi_piece_side(guojixiangqi_piece); // guojixiangqi_side：棋子所属阵营。
  const guojixiangqi_type = guojixiangqi_piece_type(guojixiangqi_piece); // guojixiangqi_type：棋子类型。
  const guojixiangqi_row = Math.floor(guojixiangqi_from / 8); // guojixiangqi_row：棋子所在行。
  const guojixiangqi_col = guojixiangqi_from % 8; // guojixiangqi_col：棋子所在列。
  const guojixiangqi_moves = []; // guojixiangqi_moves：本棋子的伪合法着法数组。
  const guojixiangqi_add_target = (guojixiangqi_target_row, guojixiangqi_target_col) => {
    if (!guojixiangqi_inside(guojixiangqi_target_row, guojixiangqi_target_col)) return;
    const guojixiangqi_target = guojixiangqi_board[guojixiangqi_index(guojixiangqi_target_row, guojixiangqi_target_col)]; // guojixiangqi_target：目标格棋子。
    if (!guojixiangqi_target || (guojixiangqi_piece_side(guojixiangqi_target) !== guojixiangqi_side && guojixiangqi_piece_type(guojixiangqi_target) !== "K")) guojixiangqi_moves.push({ from: guojixiangqi_from, to: guojixiangqi_index(guojixiangqi_target_row, guojixiangqi_target_col) });
  }; // guojixiangqi_add_target：向数组追加可占据目标格。

  if (guojixiangqi_type === "P") {
    const guojixiangqi_direction = guojixiangqi_side === guojixiangqi_white ? -1 : 1; // guojixiangqi_direction：兵的前进方向。
    const guojixiangqi_start_row = guojixiangqi_side === guojixiangqi_white ? 6 : 1; // guojixiangqi_start_row：兵可走两格的初始行。
    const guojixiangqi_one_row = guojixiangqi_row + guojixiangqi_direction; // guojixiangqi_one_row：兵前方一格行号。
    if (guojixiangqi_inside(guojixiangqi_one_row, guojixiangqi_col) && !guojixiangqi_board[guojixiangqi_index(guojixiangqi_one_row, guojixiangqi_col)]) {
      guojixiangqi_moves.push({ from: guojixiangqi_from, to: guojixiangqi_index(guojixiangqi_one_row, guojixiangqi_col) });
      const guojixiangqi_two_row = guojixiangqi_row + guojixiangqi_direction * 2; // guojixiangqi_two_row：兵前方两格行号。
      if (guojixiangqi_row === guojixiangqi_start_row && !guojixiangqi_board[guojixiangqi_index(guojixiangqi_two_row, guojixiangqi_col)]) guojixiangqi_moves.push({ from: guojixiangqi_from, to: guojixiangqi_index(guojixiangqi_two_row, guojixiangqi_col) });
    }
    for (const guojixiangqi_dc of [-1, 1]) {
      const guojixiangqi_capture_col = guojixiangqi_col + guojixiangqi_dc; // guojixiangqi_capture_col：兵斜吃目标列。
      if (!guojixiangqi_inside(guojixiangqi_one_row, guojixiangqi_capture_col)) continue;
      const guojixiangqi_target = guojixiangqi_board[guojixiangqi_index(guojixiangqi_one_row, guojixiangqi_capture_col)]; // guojixiangqi_target：兵斜前方棋子。
      if (guojixiangqi_target && guojixiangqi_piece_side(guojixiangqi_target) !== guojixiangqi_side && guojixiangqi_piece_type(guojixiangqi_target) !== "K") guojixiangqi_moves.push({ from: guojixiangqi_from, to: guojixiangqi_index(guojixiangqi_one_row, guojixiangqi_capture_col) });
    }
  } else if (guojixiangqi_type === "N") {
    for (const [guojixiangqi_dr, guojixiangqi_dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) guojixiangqi_add_target(guojixiangqi_row + guojixiangqi_dr, guojixiangqi_col + guojixiangqi_dc);
  } else if (guojixiangqi_type === "B") {
    guojixiangqi_push_slider_moves(guojixiangqi_board, guojixiangqi_row, guojixiangqi_col, guojixiangqi_side, [[1, 1], [1, -1], [-1, 1], [-1, -1]], guojixiangqi_moves);
  } else if (guojixiangqi_type === "R") {
    guojixiangqi_push_slider_moves(guojixiangqi_board, guojixiangqi_row, guojixiangqi_col, guojixiangqi_side, [[1, 0], [-1, 0], [0, 1], [0, -1]], guojixiangqi_moves);
  } else if (guojixiangqi_type === "Q") {
    guojixiangqi_push_slider_moves(guojixiangqi_board, guojixiangqi_row, guojixiangqi_col, guojixiangqi_side, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], guojixiangqi_moves);
  } else if (guojixiangqi_type === "K") {
    for (let guojixiangqi_dr = -1; guojixiangqi_dr <= 1; guojixiangqi_dr += 1) for (let guojixiangqi_dc = -1; guojixiangqi_dc <= 1; guojixiangqi_dc += 1) if (guojixiangqi_dr || guojixiangqi_dc) guojixiangqi_add_target(guojixiangqi_row + guojixiangqi_dr, guojixiangqi_col + guojixiangqi_dc);
  }
  return guojixiangqi_moves;
}

// guojixiangqi_square_attacked：判断指定格是否受到某方棋子攻击。
function guojixiangqi_square_attacked(guojixiangqi_board, guojixiangqi_square, guojixiangqi_by_side) {
  const guojixiangqi_target_row = Math.floor(guojixiangqi_square / 8); // guojixiangqi_target_row：被检测格行号。
  const guojixiangqi_target_col = guojixiangqi_square % 8; // guojixiangqi_target_col：被检测格列号。
  for (let guojixiangqi_from = 0; guojixiangqi_from < 64; guojixiangqi_from += 1) {
    const guojixiangqi_piece = guojixiangqi_board[guojixiangqi_from]; // guojixiangqi_piece：当前攻击来源棋子。
    if (!guojixiangqi_piece || guojixiangqi_piece_side(guojixiangqi_piece) !== guojixiangqi_by_side) continue;
    const guojixiangqi_row = Math.floor(guojixiangqi_from / 8); // guojixiangqi_row：攻击棋子行号。
    const guojixiangqi_col = guojixiangqi_from % 8; // guojixiangqi_col：攻击棋子列号。
    const guojixiangqi_type = guojixiangqi_piece_type(guojixiangqi_piece); // guojixiangqi_type：攻击棋子类型。
    if (guojixiangqi_type === "P") {
      const guojixiangqi_direction = guojixiangqi_by_side === guojixiangqi_white ? -1 : 1; // guojixiangqi_direction：攻击兵方向。
      if (guojixiangqi_target_row === guojixiangqi_row + guojixiangqi_direction && Math.abs(guojixiangqi_target_col - guojixiangqi_col) === 1) return true;
      continue;
    }
    if (guojixiangqi_type === "N" && [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].some(([guojixiangqi_dr, guojixiangqi_dc]) => guojixiangqi_row + guojixiangqi_dr === guojixiangqi_target_row && guojixiangqi_col + guojixiangqi_dc === guojixiangqi_target_col)) return true;
    if (guojixiangqi_type === "K" && Math.max(Math.abs(guojixiangqi_row - guojixiangqi_target_row), Math.abs(guojixiangqi_col - guojixiangqi_target_col)) === 1) return true;
    const guojixiangqi_dr = Math.sign(guojixiangqi_target_row - guojixiangqi_row); // guojixiangqi_dr：从攻击棋子到目标的单位行方向。
    const guojixiangqi_dc = Math.sign(guojixiangqi_target_col - guojixiangqi_col); // guojixiangqi_dc：从攻击棋子到目标的单位列方向。
    const guojixiangqi_straight = guojixiangqi_row === guojixiangqi_target_row || guojixiangqi_col === guojixiangqi_target_col; // guojixiangqi_straight：目标是否同一行或列。
    const guojixiangqi_diagonal = Math.abs(guojixiangqi_row - guojixiangqi_target_row) === Math.abs(guojixiangqi_col - guojixiangqi_target_col); // guojixiangqi_diagonal：目标是否同一斜线。
    const guojixiangqi_allowed = guojixiangqi_type === "Q" || (guojixiangqi_type === "R" && guojixiangqi_straight) || (guojixiangqi_type === "B" && guojixiangqi_diagonal); // guojixiangqi_allowed：该滑行棋子能否沿目标方向攻击。
    if (!guojixiangqi_allowed || (!guojixiangqi_straight && !guojixiangqi_diagonal)) continue;
    let guojixiangqi_scan_row = guojixiangqi_row + guojixiangqi_dr; // guojixiangqi_scan_row：射线扫描行。
    let guojixiangqi_scan_col = guojixiangqi_col + guojixiangqi_dc; // guojixiangqi_scan_col：射线扫描列。
    let guojixiangqi_clear = true; // guojixiangqi_clear：攻击射线中间是否无阻挡。
    while (guojixiangqi_scan_row !== guojixiangqi_target_row || guojixiangqi_scan_col !== guojixiangqi_target_col) {
      if (guojixiangqi_board[guojixiangqi_index(guojixiangqi_scan_row, guojixiangqi_scan_col)]) { guojixiangqi_clear = false; break; }
      guojixiangqi_scan_row += guojixiangqi_dr; guojixiangqi_scan_col += guojixiangqi_dc;
    }
    if (guojixiangqi_clear) return true;
  }
  return false;
}

// guojixiangqi_in_check：判断指定阵营的王是否正在被将军。
function guojixiangqi_in_check(guojixiangqi_board, guojixiangqi_side) {
  const guojixiangqi_king_index = guojixiangqi_board.indexOf(`${guojixiangqi_side}K`); // guojixiangqi_king_index：指定阵营王的下标。
  return guojixiangqi_king_index < 0 || guojixiangqi_square_attacked(guojixiangqi_board, guojixiangqi_king_index, guojixiangqi_opponent(guojixiangqi_side));
}

// guojixiangqi_apply_to_board：在棋盘副本上执行一步并处理升变。
function guojixiangqi_apply_to_board(guojixiangqi_board, guojixiangqi_move, guojixiangqi_promotion = "Q") {
  const guojixiangqi_next_board = [...guojixiangqi_board]; // guojixiangqi_next_board：执行着法后的棋盘副本。
  const guojixiangqi_piece = guojixiangqi_next_board[guojixiangqi_move.from]; // guojixiangqi_piece：被移动棋子。
  guojixiangqi_next_board[guojixiangqi_move.to] = guojixiangqi_piece;
  guojixiangqi_next_board[guojixiangqi_move.from] = null;
  const guojixiangqi_target_row = Math.floor(guojixiangqi_move.to / 8); // guojixiangqi_target_row：着法目标行。
  if (guojixiangqi_piece_type(guojixiangqi_piece) === "P" && (guojixiangqi_target_row === 0 || guojixiangqi_target_row === 7)) guojixiangqi_next_board[guojixiangqi_move.to] = `${guojixiangqi_piece_side(guojixiangqi_piece)}${guojixiangqi_promotion}`;
  return guojixiangqi_next_board;
}

// guojixiangqi_legal_moves：生成指定阵营所有不会令己方王受将的合法着法。
function guojixiangqi_legal_moves(guojixiangqi_board, guojixiangqi_side) {
  const guojixiangqi_moves = []; // guojixiangqi_moves：指定阵营全部合法着法。
  for (let guojixiangqi_from = 0; guojixiangqi_from < 64; guojixiangqi_from += 1) {
    if (guojixiangqi_piece_side(guojixiangqi_board[guojixiangqi_from]) !== guojixiangqi_side) continue;
    for (const guojixiangqi_move of guojixiangqi_pseudo_moves_for_piece(guojixiangqi_board, guojixiangqi_from)) {
      const guojixiangqi_next_board = guojixiangqi_apply_to_board(guojixiangqi_board, guojixiangqi_move); // guojixiangqi_next_board：用于将军验证的局面。
      if (!guojixiangqi_in_check(guojixiangqi_next_board, guojixiangqi_side)) guojixiangqi_moves.push(guojixiangqi_move);
    }
  }
  return guojixiangqi_moves;
}

// guojixiangqi_material_score：返回黑方材力减去白方材力的评价分。
function guojixiangqi_material_score(guojixiangqi_board) {
  let guojixiangqi_score = 0; // guojixiangqi_score：黑白材力差。
  for (const guojixiangqi_piece of guojixiangqi_board) {
    if (!guojixiangqi_piece) continue;
    const guojixiangqi_value = guojixiangqi_values[guojixiangqi_piece_type(guojixiangqi_piece)]; // guojixiangqi_value：当前棋子材力。
    guojixiangqi_score += guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_black ? guojixiangqi_value : -guojixiangqi_value;
  }
  return guojixiangqi_score;
}

// guojixiangqi_position_score：为机器人加入中心控制、升变和将军奖励。
function guojixiangqi_position_score(guojixiangqi_board) {
  let guojixiangqi_score = guojixiangqi_material_score(guojixiangqi_board); // guojixiangqi_score：含位置因素的黑方评价。
  for (let guojixiangqi_square = 0; guojixiangqi_square < 64; guojixiangqi_square += 1) {
    const guojixiangqi_piece = guojixiangqi_board[guojixiangqi_square]; // guojixiangqi_piece：当前位置棋子。
    if (!guojixiangqi_piece) continue;
    const guojixiangqi_row = Math.floor(guojixiangqi_square / 8); // guojixiangqi_row：棋子行号。
    const guojixiangqi_col = guojixiangqi_square % 8; // guojixiangqi_col：棋子列号。
    const guojixiangqi_center_bonus = Math.max(0, 5 - Math.abs(3.5 - guojixiangqi_row) - Math.abs(3.5 - guojixiangqi_col)) * 3; // guojixiangqi_center_bonus：靠近中心的位置奖励。
    guojixiangqi_score += guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_black ? guojixiangqi_center_bonus : -guojixiangqi_center_bonus;
  }
  if (guojixiangqi_in_check(guojixiangqi_board, guojixiangqi_white)) guojixiangqi_score += 28;
  if (guojixiangqi_in_check(guojixiangqi_board, guojixiangqi_black)) guojixiangqi_score -= 28;
  return guojixiangqi_score;
}

// guojixiangqi_robot_move：使用两层极小化搜索为任意棋色选择着法。
function guojixiangqi_robot_move(guojixiangqi_board, guojixiangqi_side) {
  const guojixiangqi_moves = guojixiangqi_legal_moves(guojixiangqi_board, guojixiangqi_side); // guojixiangqi_moves：当前机器人全部合法着法。
  let guojixiangqi_best_move = null; // guojixiangqi_best_move：当前评分最高着法。
  let guojixiangqi_best_score = guojixiangqi_side === guojixiangqi_black ? -Infinity : Infinity; // guojixiangqi_best_score：黑方取最高、白方取最低的最坏应对分。
  for (const guojixiangqi_move of guojixiangqi_moves) {
    const guojixiangqi_after_move = guojixiangqi_apply_to_board(guojixiangqi_board, guojixiangqi_move, "Q"); // guojixiangqi_after_move：机器人走棋后局面。
    const guojixiangqi_opponent_side = guojixiangqi_opponent(guojixiangqi_side); // guojixiangqi_opponent_side：对手棋色。
    const guojixiangqi_replies = guojixiangqi_legal_moves(guojixiangqi_after_move, guojixiangqi_opponent_side); // guojixiangqi_replies：对手全部合法回应。
    let guojixiangqi_worst_reply = guojixiangqi_position_score(guojixiangqi_after_move); // guojixiangqi_worst_reply：对手最强回应后的黑方视角评价。
    if (guojixiangqi_replies.length) {
      guojixiangqi_worst_reply = guojixiangqi_side === guojixiangqi_black ? Infinity : -Infinity;
      for (const guojixiangqi_reply of guojixiangqi_replies) {
        const guojixiangqi_reply_score = guojixiangqi_position_score(guojixiangqi_apply_to_board(guojixiangqi_after_move, guojixiangqi_reply, "Q")); // guojixiangqi_reply_score：回应后的黑方视角分。
        guojixiangqi_worst_reply = guojixiangqi_side === guojixiangqi_black ? Math.min(guojixiangqi_worst_reply, guojixiangqi_reply_score) : Math.max(guojixiangqi_worst_reply, guojixiangqi_reply_score);
      }
    }
    const guojixiangqi_randomized_score = guojixiangqi_worst_reply + Math.random() * 0.2; // guojixiangqi_randomized_score：防止完全相同局面每次走法僵化的微小扰动。
    const guojixiangqi_better = guojixiangqi_side === guojixiangqi_black ? guojixiangqi_randomized_score > guojixiangqi_best_score : guojixiangqi_randomized_score < guojixiangqi_best_score; // guojixiangqi_better：当前候选是否更符合本方目标。
    if (guojixiangqi_better) { guojixiangqi_best_score = guojixiangqi_randomized_score; guojixiangqi_best_move = guojixiangqi_move; }
  }
  return guojixiangqi_best_move;
}

// guojixiangqi_predict：用材力、位置和将军状态计算预测；标准开局固定 50:50。
function guojixiangqi_predict(guojixiangqi_state) {
  if (guojixiangqi_state.moves === 0) return { white: 50, black: 50, summary: "标准开局，双方机会均等" };
  if (guojixiangqi_state.over) {
    if (guojixiangqi_state.winner === guojixiangqi_white) return { white: 100, black: 0, summary: "白方将死黑王" };
    if (guojixiangqi_state.winner === guojixiangqi_black) return { white: 0, black: 100, summary: "黑方将死白王" };
    return { white: 50, black: 50, summary: "无合法着法，和棋" };
  }
  const guojixiangqi_black_score = guojixiangqi_position_score(guojixiangqi_state.board); // guojixiangqi_black_score：黑方相对白方的综合分。
  const guojixiangqi_white_percent = Math.round(qilei_clamp(50 - guojixiangqi_black_score / 28, 3, 97)); // guojixiangqi_white_percent：白方预测百分比。
  return { white: guojixiangqi_white_percent, black: 100 - guojixiangqi_white_percent, summary: Math.abs(guojixiangqi_white_percent - 50) < 5 ? "局势基本均衡" : (guojixiangqi_white_percent > 50 ? "白方局面占优" : "黑方局面占优") };
}

// guojixiangqi_create_game：创建可交互的国际象棋页面实例。
export function guojixiangqi_create_game({ boardHost: guojixiangqi_board_host, controlsHost: guojixiangqi_controls_host, savedState: guojixiangqi_saved_state, setting: guojixiangqi_setting, services: guojixiangqi_services }) {
  const { canvas: guojixiangqi_canvas, context: guojixiangqi_context } = qilei_make_canvas(guojixiangqi_board_host, { width: 790, height: 810 }, "国际象棋棋盘"); // guojixiangqi_canvas/context：对应 C++ 左侧 790×810 绘图区域。
  let guojixiangqi_state = guojixiangqi_valid_state(guojixiangqi_saved_state) ? qilei_deep_copy(guojixiangqi_saved_state) : guojixiangqi_initial_state(); // guojixiangqi_state：当前可保存棋局状态。
  let guojixiangqi_selected = null; // guojixiangqi_selected：玩家当前选中的白棋下标。
  let guojixiangqi_pending_move = null; // guojixiangqi_pending_move：等待再次点击确认的目标着法。
  let guojixiangqi_pending_promotion = null; // guojixiangqi_pending_promotion：等待右侧选择升变棋子的着法。
  let guojixiangqi_hint_move = null; // guojixiangqi_hint_move：提示按钮显示的推荐着法。
  let guojixiangqi_robot_timer = null; // guojixiangqi_robot_timer：机器人思考延时定时器。
  let guojixiangqi_finished_reported = Boolean(guojixiangqi_state.over); // guojixiangqi_finished_reported：终局是否已经写入历史。
  let guojixiangqi_destroyed = false; // guojixiangqi_destroyed：离开本局后阻止迟到的引擎响应继续更新页面。
  const guojixiangqi_memory_history = []; // guojixiangqi_memory_history：当前页面用于悔棋的快照数组。

  // guojixiangqi_is_robot_side：根据公共设置判断指定棋色是否由机器人控制。
  function guojixiangqi_is_robot_side(guojixiangqi_side) {
    const guojixiangqi_mode = guojixiangqi_setting?.robotMode ?? 2; // guojixiangqi_mode：0 双玩家、1 白机器人、2 黑机器人、3 双机器人。
    return guojixiangqi_mode === 3 || (guojixiangqi_mode === 1 && guojixiangqi_side === guojixiangqi_white) || (guojixiangqi_mode === 2 && guojixiangqi_side === guojixiangqi_black);
  }

  // guojixiangqi_draw：绘制棋盘、棋子、选中格、合法目标和待确认轮廓。
  function guojixiangqi_draw() {
    const guojixiangqi_left = 48; // guojixiangqi_left：C++ 棋盘左边界。
    const guojixiangqi_top = 48; // guojixiangqi_top：C++ 棋盘上边界。
    const guojixiangqi_square_size = 88; // guojixiangqi_square_size：C++ 每个棋盘格像素尺寸。
    guojixiangqi_context.fillStyle = "rgb(237,232,219)";
    guojixiangqi_context.fillRect(0, 0, guojixiangqi_canvas.width, guojixiangqi_canvas.height);
    const guojixiangqi_legal_targets = guojixiangqi_selected === null ? [] : guojixiangqi_legal_moves(guojixiangqi_state.board, guojixiangqi_white).filter(guojixiangqi_move => guojixiangqi_move.from === guojixiangqi_selected).map(guojixiangqi_move => guojixiangqi_move.to); // guojixiangqi_legal_targets：选中棋子的全部合法目标。
    for (let guojixiangqi_row = 0; guojixiangqi_row < 8; guojixiangqi_row += 1) for (let guojixiangqi_col = 0; guojixiangqi_col < 8; guojixiangqi_col += 1) {
      const guojixiangqi_square = guojixiangqi_index(guojixiangqi_row, guojixiangqi_col); // guojixiangqi_square：当前格一维下标。
      const guojixiangqi_x = guojixiangqi_left + guojixiangqi_col * guojixiangqi_square_size; // guojixiangqi_x：当前格左坐标。
      const guojixiangqi_y = guojixiangqi_top + guojixiangqi_row * guojixiangqi_square_size; // guojixiangqi_y：当前格上坐标。
      guojixiangqi_context.fillStyle = (guojixiangqi_row + guojixiangqi_col) % 2 ? "rgb(143,101,72)" : "rgb(238,221,187)";
      guojixiangqi_context.fillRect(guojixiangqi_x, guojixiangqi_y, guojixiangqi_square_size, guojixiangqi_square_size);
      if (guojixiangqi_state.lastMove && (guojixiangqi_state.lastMove.from === guojixiangqi_square || guojixiangqi_state.lastMove.to === guojixiangqi_square)) { guojixiangqi_context.fillStyle = "rgba(223,183,68,.32)"; guojixiangqi_context.fillRect(guojixiangqi_x, guojixiangqi_y, guojixiangqi_square_size, guojixiangqi_square_size); }
      if (guojixiangqi_selected === guojixiangqi_square) { guojixiangqi_context.strokeStyle = "#28785f"; guojixiangqi_context.lineWidth = 6; guojixiangqi_context.strokeRect(guojixiangqi_x + 3, guojixiangqi_y + 3, guojixiangqi_square_size - 6, guojixiangqi_square_size - 6); }
      if (guojixiangqi_legal_targets.includes(guojixiangqi_square)) { guojixiangqi_context.beginPath(); guojixiangqi_context.arc(guojixiangqi_x + guojixiangqi_square_size / 2, guojixiangqi_y + guojixiangqi_square_size / 2, guojixiangqi_state.board[guojixiangqi_square] ? 34 : 9, 0, Math.PI * 2); guojixiangqi_context.fillStyle = "rgba(31,113,87,.35)"; guojixiangqi_context.fill(); }
    }
    const guojixiangqi_mark_move = (guojixiangqi_move, guojixiangqi_color, guojixiangqi_dash) => {
      if (!guojixiangqi_move) return;
      const guojixiangqi_row = Math.floor(guojixiangqi_move.to / 8); // guojixiangqi_row：标记目标行。
      const guojixiangqi_col = guojixiangqi_move.to % 8; // guojixiangqi_col：标记目标列。
      guojixiangqi_context.save(); guojixiangqi_context.strokeStyle = guojixiangqi_color; guojixiangqi_context.lineWidth = 5; guojixiangqi_context.setLineDash(guojixiangqi_dash); guojixiangqi_context.strokeRect(guojixiangqi_left + guojixiangqi_col * guojixiangqi_square_size + 6, guojixiangqi_top + guojixiangqi_row * guojixiangqi_square_size + 6, guojixiangqi_square_size - 12, guojixiangqi_square_size - 12); guojixiangqi_context.restore();
    }; // guojixiangqi_mark_move：绘制提示或待确认目标框。
    guojixiangqi_mark_move(guojixiangqi_hint_move, "#28785f", [9, 6]);
    guojixiangqi_mark_move(guojixiangqi_pending_move, "#c34036", []);
    guojixiangqi_context.textAlign = "center"; guojixiangqi_context.textBaseline = "middle"; guojixiangqi_context.font = "64px 'Segoe UI Symbol','Arial Unicode MS',serif";
    for (let guojixiangqi_square = 0; guojixiangqi_square < 64; guojixiangqi_square += 1) {
      const guojixiangqi_piece = guojixiangqi_state.board[guojixiangqi_square]; // guojixiangqi_piece：当前格棋子编码。
      if (!guojixiangqi_piece) continue;
      const guojixiangqi_row = Math.floor(guojixiangqi_square / 8); // guojixiangqi_row：棋子行。
      const guojixiangqi_col = guojixiangqi_square % 8; // guojixiangqi_col：棋子列。
      guojixiangqi_context.fillStyle = guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_white ? "#fffaf0" : "#18212a";
      guojixiangqi_context.strokeStyle = guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_white ? "#755b46" : "#efe2c2"; guojixiangqi_context.lineWidth = 1.1;
      guojixiangqi_context.strokeText(guojixiangqi_symbols[guojixiangqi_piece], guojixiangqi_left + (guojixiangqi_col + .5) * guojixiangqi_square_size, guojixiangqi_top + (guojixiangqi_row + .53) * guojixiangqi_square_size);
      guojixiangqi_context.fillText(guojixiangqi_symbols[guojixiangqi_piece], guojixiangqi_left + (guojixiangqi_col + .5) * guojixiangqi_square_size, guojixiangqi_top + (guojixiangqi_row + .53) * guojixiangqi_square_size);
    }
    guojixiangqi_context.fillStyle = "rgb(92,78,64)";
    guojixiangqi_context.font = "16px 'Microsoft YaHei',sans-serif";
    for (let guojixiangqi_col = 0; guojixiangqi_col < 8; guojixiangqi_col += 1) guojixiangqi_context.fillText(String.fromCharCode(97 + guojixiangqi_col), guojixiangqi_left + (guojixiangqi_col + .5) * guojixiangqi_square_size, 776);
  }

  // guojixiangqi_update_panel：刷新右侧双方棋子、吃子、回合和预测信息。
  function guojixiangqi_update_panel(guojixiangqi_status = "") {
    const guojixiangqi_prediction = guojixiangqi_predict(guojixiangqi_state); // guojixiangqi_prediction：当前局势预测。
    const guojixiangqi_white_count = guojixiangqi_state.board.filter(guojixiangqi_piece => guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_white).length; // guojixiangqi_white_count：白方场上棋子数。
    const guojixiangqi_black_count = guojixiangqi_state.board.filter(guojixiangqi_piece => guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_black).length; // guojixiangqi_black_count：黑方场上棋子数。
    guojixiangqi_services.update({
      status: guojixiangqi_status || (guojixiangqi_state.over ? "本局已经结束" : (guojixiangqi_is_robot_side(guojixiangqi_state.side) ? "机器人正在思考…" : `请选择${guojixiangqi_state.side === guojixiangqi_white ? "白" : "黑"}棋和目标格`)),
      prediction: { first: guojixiangqi_prediction.white, second: guojixiangqi_prediction.black, firstName: "白", secondName: "黑", summary: guojixiangqi_prediction.summary },
      stats: [
        { label: "白方状态", value: `场上 ${guojixiangqi_white_count} 子 · 吃子 ${16 - guojixiangqi_black_count}`, pieces: guojixiangqi_roster_state(guojixiangqi_state.board, guojixiangqi_white_roster) },
        { label: "黑方状态", value: `场上 ${guojixiangqi_black_count} 子 · 吃子 ${16 - guojixiangqi_white_count}`, pieces: guojixiangqi_roster_state(guojixiangqi_state.board, guojixiangqi_black_roster) },
        { label: "对局进度", value: `第 ${Math.floor(guojixiangqi_state.moves / 2) + 1} 回合 · ${guojixiangqi_state.side === guojixiangqi_white ? "白方" : "黑方"}行动` },
      ],
      activeSide: guojixiangqi_state.side === guojixiangqi_white ? 0 : 1,
      moveCount: guojixiangqi_state.moves,
    });
  }

  // guojixiangqi_check_end：检查将死或逼和并记录终局。
  function guojixiangqi_check_end() {
    const guojixiangqi_moves = guojixiangqi_legal_moves(guojixiangqi_state.board, guojixiangqi_state.side); // guojixiangqi_moves：当前行动方全部合法着法。
    if (guojixiangqi_moves.length) return;
    guojixiangqi_state.over = true;
    guojixiangqi_state.winner = guojixiangqi_in_check(guojixiangqi_state.board, guojixiangqi_state.side) ? guojixiangqi_opponent(guojixiangqi_state.side) : "draw";
    if (!guojixiangqi_finished_reported) {
      guojixiangqi_finished_reported = true;
      const guojixiangqi_result = guojixiangqi_state.winner === guojixiangqi_white ? "白方将死获胜" : (guojixiangqi_state.winner === guojixiangqi_black ? "黑方将死获胜" : "逼和"); // guojixiangqi_result：写入历史的终局文字。
      guojixiangqi_services.finish(guojixiangqi_result);
    }
  }

  // guojixiangqi_commit_move：执行一步国际象棋着法并切换行动方。
  function guojixiangqi_commit_move(guojixiangqi_move, guojixiangqi_promotion = "Q") {
    if (!guojixiangqi_move || guojixiangqi_state.over) return;
    guojixiangqi_memory_history.push(qilei_deep_copy(guojixiangqi_state));
    guojixiangqi_state.board = guojixiangqi_apply_to_board(guojixiangqi_state.board, guojixiangqi_move, guojixiangqi_promotion);
    guojixiangqi_state.lastMove = { ...guojixiangqi_move };
    guojixiangqi_state.moves += 1;
    guojixiangqi_state.side = guojixiangqi_opponent(guojixiangqi_state.side);
    guojixiangqi_selected = null; guojixiangqi_pending_move = null; guojixiangqi_pending_promotion = null; guojixiangqi_hint_move = null;
    guojixiangqi_check_end(); guojixiangqi_render_controls(); guojixiangqi_draw(); guojixiangqi_update_panel(guojixiangqi_in_check(guojixiangqi_state.board, guojixiangqi_state.side) ? "将军！" : "走棋完成"); guojixiangqi_services.save(qilei_deep_copy(guojixiangqi_state)); guojixiangqi_schedule_robot();
  }

  // guojixiangqi_render_controls：绘制常规按钮或升变棋子选择按钮。
  function guojixiangqi_render_controls() {
    guojixiangqi_controls_host.replaceChildren();
    if (guojixiangqi_pending_promotion) {
      const guojixiangqi_label = document.createElement("p"); // guojixiangqi_label：升变选择区域说明。
      guojixiangqi_label.className = "control-label"; guojixiangqi_label.textContent = "小兵升变：请选择棋子";
      guojixiangqi_controls_host.append(guojixiangqi_label);
      for (const [guojixiangqi_type, guojixiangqi_name] of [["Q", "后"], ["R", "车"], ["B", "象"], ["N", "马"]]) guojixiangqi_controls_host.append(qilei_control_button(guojixiangqi_name, () => guojixiangqi_commit_move(guojixiangqi_pending_promotion, guojixiangqi_type), "primary"));
      return;
    }
    guojixiangqi_controls_host.append(
      qilei_control_button("悔棋 (U)", guojixiangqi_undo),
      qilei_control_button("重开 (N)", guojixiangqi_new_game, "warning"),
    );
  }

  // guojixiangqi_schedule_robot：让机器人依次展示“选棋子、选落点、确认”三个与玩家一致的阶段。
  function guojixiangqi_schedule_robot() {
    window.clearTimeout(guojixiangqi_robot_timer);
    if (guojixiangqi_destroyed || guojixiangqi_state.over || !guojixiangqi_is_robot_side(guojixiangqi_state.side)) return;
    const guojixiangqi_checking = guojixiangqi_in_check(guojixiangqi_state.board, guojixiangqi_state.side); // guojixiangqi_checking：当前机器人是否必须先处理将军。
    guojixiangqi_update_panel(guojixiangqi_checking ? "将军！机器人正在计算应对…" : "机器人正在计算最佳应对…");
    guojixiangqi_robot_timer = window.setTimeout(async () => {
      const guojixiangqi_request_side = guojixiangqi_state.side; // guojixiangqi_request_side：发起 engine 请求时的行动方。
      const guojixiangqi_request_moves = guojixiangqi_state.moves; // guojixiangqi_request_moves：用于忽略悔棋后的过期响应。
      let guojixiangqi_move = null; // guojixiangqi_move：外部 engine 或规则兜底选出的着法。
      try {
        const guojixiangqi_response = await guojixiangqi_services.engineMove({ board: qilei_deep_copy(guojixiangqi_state.board), side: guojixiangqi_state.side, moveCount: guojixiangqi_state.moves, balanced: guojixiangqi_setting?.robotMode === 3 }); // guojixiangqi_response：Python 后端 engine 返回坐标和升变。
        const guojixiangqi_candidate = guojixiangqi_response?.move; // guojixiangqi_candidate：尚未经过网页合法着法复核的候选。
        if (guojixiangqi_legal_moves(guojixiangqi_state.board, guojixiangqi_state.side).some(guojixiangqi_legal => guojixiangqi_legal.from === guojixiangqi_candidate?.from && guojixiangqi_legal.to === guojixiangqi_candidate?.to)) guojixiangqi_move = guojixiangqi_candidate;
      } catch (_) {
        guojixiangqi_move = null;
      }
      if (guojixiangqi_destroyed || guojixiangqi_state.side !== guojixiangqi_request_side || guojixiangqi_state.moves !== guojixiangqi_request_moves || guojixiangqi_state.over) return;
      if (!guojixiangqi_move) guojixiangqi_move = guojixiangqi_robot_move(guojixiangqi_state.board, guojixiangqi_state.side);
      if (!guojixiangqi_move) return;
      guojixiangqi_selected = guojixiangqi_move.from;
      guojixiangqi_pending_move = null;
      guojixiangqi_draw();
      guojixiangqi_update_panel(`${guojixiangqi_checking ? "将军！" : ""}机器人已选择棋子，正在确认目标格…`);
      guojixiangqi_robot_timer = window.setTimeout(() => {
        guojixiangqi_pending_move = guojixiangqi_move;
        guojixiangqi_draw();
        guojixiangqi_update_panel(`${guojixiangqi_checking ? "将军！" : ""}机器人已选择目标格，正在确认走棋…`);
        guojixiangqi_robot_timer = window.setTimeout(() => guojixiangqi_commit_move(guojixiangqi_move, guojixiangqi_move.promotion || "Q"), 2000);
      }, 2000);
    }, 500);
  }

  // guojixiangqi_handle_click：处理选棋、选目标与再次点击目标确认。
  function guojixiangqi_handle_click(guojixiangqi_event) {
    if (guojixiangqi_state.over || guojixiangqi_is_robot_side(guojixiangqi_state.side) || guojixiangqi_pending_promotion) return;
    const guojixiangqi_point = qilei_canvas_point(guojixiangqi_canvas, guojixiangqi_event); // guojixiangqi_point：画布点击坐标。
    const guojixiangqi_row = Math.floor((guojixiangqi_point.y - 48) / 88); // guojixiangqi_row：按 C++ 棋盘上边界换算行号。
    const guojixiangqi_col = Math.floor((guojixiangqi_point.x - 48) / 88); // guojixiangqi_col：按 C++ 棋盘左边界换算列号。
    if (guojixiangqi_row < 0 || guojixiangqi_row > 7 || guojixiangqi_col < 0 || guojixiangqi_col > 7) return;
    const guojixiangqi_square = guojixiangqi_index(guojixiangqi_row, guojixiangqi_col); // guojixiangqi_square：点击格下标。
    const guojixiangqi_piece = guojixiangqi_state.board[guojixiangqi_square]; // guojixiangqi_piece：点击格棋子。
    if (guojixiangqi_piece_side(guojixiangqi_piece) === guojixiangqi_state.side) {
      guojixiangqi_selected = guojixiangqi_square; guojixiangqi_pending_move = null; guojixiangqi_hint_move = null; guojixiangqi_draw(); guojixiangqi_update_panel(`已选择${guojixiangqi_state.side === guojixiangqi_white ? "白" : "黑"}棋，请选择合法目标格`); return;
    }
    if (guojixiangqi_selected === null) return;
    const guojixiangqi_move = guojixiangqi_legal_moves(guojixiangqi_state.board, guojixiangqi_state.side).find(guojixiangqi_candidate => guojixiangqi_candidate.from === guojixiangqi_selected && guojixiangqi_candidate.to === guojixiangqi_square); // guojixiangqi_move：点击目标对应的合法着法。
    if (!guojixiangqi_move) { guojixiangqi_services.toast("该目标不符合国际象棋规则"); return; }
    if (!guojixiangqi_pending_move || guojixiangqi_pending_move.to !== guojixiangqi_square) {
      guojixiangqi_pending_move = guojixiangqi_move; guojixiangqi_draw(); guojixiangqi_update_panel(`已选择 ${String.fromCharCode(97 + guojixiangqi_col)}${8 - guojixiangqi_row}，再次点击确认`); return;
    }
    const guojixiangqi_moving_piece = guojixiangqi_state.board[guojixiangqi_move.from]; // guojixiangqi_moving_piece：准备执行的棋子。
    if (guojixiangqi_piece_type(guojixiangqi_moving_piece) === "P" && (guojixiangqi_row === 0 || guojixiangqi_row === 7)) {
      guojixiangqi_pending_promotion = guojixiangqi_move;
      guojixiangqi_render_controls(); guojixiangqi_update_panel("小兵到达底线，请在右侧选择升变棋子");
    } else {
      guojixiangqi_commit_move(guojixiangqi_move);
      guojixiangqi_schedule_robot();
    }
  }

  // guojixiangqi_undo：撤回最近一轮白方和机器人走棋。
  function guojixiangqi_undo() {
    if (!guojixiangqi_memory_history.length) { guojixiangqi_services.toast("当前没有可悔的棋"); return; }
    window.clearTimeout(guojixiangqi_robot_timer);
    let guojixiangqi_previous = guojixiangqi_memory_history.pop(); // guojixiangqi_previous：最近一步前的棋局快照。
    if (guojixiangqi_previous.side === guojixiangqi_black && guojixiangqi_memory_history.length) guojixiangqi_previous = guojixiangqi_memory_history.pop();
    guojixiangqi_state = guojixiangqi_previous; guojixiangqi_state.over = false; guojixiangqi_state.winner = ""; guojixiangqi_finished_reported = false; guojixiangqi_selected = null; guojixiangqi_pending_move = null; guojixiangqi_pending_promotion = null;
    guojixiangqi_render_controls(); guojixiangqi_draw(); guojixiangqi_update_panel("已撤回上一轮"); guojixiangqi_services.save(qilei_deep_copy(guojixiangqi_state));
  }

  // guojixiangqi_hint：为当前非机器人方推荐合法着法。
  function guojixiangqi_hint() {
    if (guojixiangqi_state.over || guojixiangqi_is_robot_side(guojixiangqi_state.side)) return;
    guojixiangqi_hint_move = guojixiangqi_robot_move(guojixiangqi_state.board, guojixiangqi_state.side);
    guojixiangqi_draw(); guojixiangqi_update_panel("绿色虚线框是推荐目标格");
  }

  // guojixiangqi_new_game：清除国际象棋存档并恢复标准初始局面。
  async function guojixiangqi_new_game() {
    window.clearTimeout(guojixiangqi_robot_timer);
    await guojixiangqi_services.clearSave();
    guojixiangqi_state = guojixiangqi_initial_state(); guojixiangqi_memory_history.length = 0; guojixiangqi_selected = null; guojixiangqi_pending_move = null; guojixiangqi_pending_promotion = null; guojixiangqi_hint_move = null; guojixiangqi_finished_reported = false;
    guojixiangqi_render_controls(); guojixiangqi_draw(); guojixiangqi_update_panel("新对局已开始，白方先行"); guojixiangqi_services.save(qilei_deep_copy(guojixiangqi_state)); guojixiangqi_schedule_robot();
  }

  // guojixiangqi_timeout：任一方步时或局时耗尽时立即判负。
  function guojixiangqi_timeout(guojixiangqi_timed_side, guojixiangqi_kind) {
    if (guojixiangqi_state.over || guojixiangqi_destroyed) return;
    window.clearTimeout(guojixiangqi_robot_timer);
    const guojixiangqi_loser = guojixiangqi_timed_side === 0 ? guojixiangqi_white : guojixiangqi_black; // guojixiangqi_loser：耗尽计时的一方。
    guojixiangqi_state.over = true;
    guojixiangqi_state.winner = guojixiangqi_loser === guojixiangqi_white ? guojixiangqi_black : guojixiangqi_white;
    guojixiangqi_render_controls();
    guojixiangqi_draw();
    guojixiangqi_update_panel(`${guojixiangqi_loser === guojixiangqi_white ? "白方" : "黑方"}${guojixiangqi_kind}耗尽，判负`);
    guojixiangqi_services.save(qilei_deep_copy(guojixiangqi_state));
    if (!guojixiangqi_finished_reported) {
      guojixiangqi_finished_reported = true;
      guojixiangqi_services.finish(`${guojixiangqi_loser === guojixiangqi_white ? "白方" : "黑方"}超时判负`);
    }
  }

  guojixiangqi_render_controls();
  guojixiangqi_canvas.addEventListener("click", guojixiangqi_handle_click);
  guojixiangqi_draw(); guojixiangqi_update_panel(guojixiangqi_saved_state ? "已读取个人存档" : "白方先行，请选择棋子"); guojixiangqi_schedule_robot();

  return {
    // getState：返回当前国际象棋状态供网站统一保存。
    getState: () => qilei_deep_copy(guojixiangqi_state),
    timeout: guojixiangqi_timeout,
    // destroy：清除机器人计时器并解绑棋盘点击。
    destroy: () => { guojixiangqi_destroyed = true; window.clearTimeout(guojixiangqi_robot_timer); guojixiangqi_canvas.removeEventListener("click", guojixiangqi_handle_click); },
  };
}
