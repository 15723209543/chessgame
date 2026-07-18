// zhongguoxiangqi_game.js：中国象棋九路十行规则、将军判断、机器人和胜负预测。

import {
  qilei_canvas_point,
  qilei_clamp,
  qilei_control_button,
  qilei_deep_copy,
  qilei_make_canvas,
} from "./qilei_game_utils.js";

const zhongguoxiangqi_red = "r"; // zhongguoxiangqi_red：玩家红方编码。
const zhongguoxiangqi_black = "b"; // zhongguoxiangqi_black：机器人黑方编码。
const zhongguoxiangqi_symbols = { rK: "帅", rA: "仕", rE: "相", rH: "马", rR: "车", rC: "炮", rP: "兵", bK: "将", bA: "士", bE: "象", bH: "马", bR: "车", bC: "炮", bP: "卒" }; // zhongguoxiangqi_symbols：棋子编码到中文棋面字的映射。
const zhongguoxiangqi_values = { K: 0, R: 900, C: 460, H: 430, E: 210, A: 210, P: 100 }; // zhongguoxiangqi_values：机器人和预测使用的基础子力。
const zhongguoxiangqi_red_roster = ["rR", "rH", "rE", "rA", "rK", "rA", "rE", "rH", "rR", "rC", "rC", "rP", "rP", "rP", "rP", "rP"]; // zhongguoxiangqi_red_roster：红方初始十六枚棋子顺序。
const zhongguoxiangqi_black_roster = ["bR", "bH", "bE", "bA", "bK", "bA", "bE", "bH", "bR", "bC", "bC", "bP", "bP", "bP", "bP", "bP"]; // zhongguoxiangqi_black_roster：黑方初始十六枚棋子顺序。

// zhongguoxiangqi_roster_state：生成仿 C++ 右栏的小棋子列表，被吃棋子带删除标记。
function zhongguoxiangqi_roster_state(zhongguoxiangqi_board, zhongguoxiangqi_roster) {
  const zhongguoxiangqi_remaining = {}; // zhongguoxiangqi_remaining：棋盘上各类型仍存活的数量。
  for (const zhongguoxiangqi_piece of zhongguoxiangqi_board) {
    if (zhongguoxiangqi_piece) zhongguoxiangqi_remaining[zhongguoxiangqi_piece] = (zhongguoxiangqi_remaining[zhongguoxiangqi_piece] || 0) + 1;
  }
  return zhongguoxiangqi_roster.map(zhongguoxiangqi_piece => {
    const zhongguoxiangqi_alive = (zhongguoxiangqi_remaining[zhongguoxiangqi_piece] || 0) > 0; // zhongguoxiangqi_alive：这一个同类型棋子是否仍在场。
    if (zhongguoxiangqi_alive) zhongguoxiangqi_remaining[zhongguoxiangqi_piece] -= 1;
    return { text: zhongguoxiangqi_symbols[zhongguoxiangqi_piece], captured: !zhongguoxiangqi_alive };
  });
}

// zhongguoxiangqi_index：把十行九列坐标转换为一维下标。
function zhongguoxiangqi_index(zhongguoxiangqi_row, zhongguoxiangqi_col) {
  return zhongguoxiangqi_row * 9 + zhongguoxiangqi_col;
}

// zhongguoxiangqi_inside：判断行列是否位于中国象棋棋盘内。
function zhongguoxiangqi_inside(zhongguoxiangqi_row, zhongguoxiangqi_col) {
  return zhongguoxiangqi_row >= 0 && zhongguoxiangqi_row < 10 && zhongguoxiangqi_col >= 0 && zhongguoxiangqi_col < 9;
}

// zhongguoxiangqi_initial_board：创建标准中国象棋初始局面。
function zhongguoxiangqi_initial_board() {
  const zhongguoxiangqi_board = Array(90).fill(null); // zhongguoxiangqi_board：待填充棋子的九十个交叉点。
  const zhongguoxiangqi_back_rank = ["R", "H", "E", "A", "K", "A", "E", "H", "R"]; // zhongguoxiangqi_back_rank：双方底线棋子类型顺序。
  for (let zhongguoxiangqi_col = 0; zhongguoxiangqi_col < 9; zhongguoxiangqi_col += 1) {
    zhongguoxiangqi_board[zhongguoxiangqi_index(0, zhongguoxiangqi_col)] = `b${zhongguoxiangqi_back_rank[zhongguoxiangqi_col]}`;
    zhongguoxiangqi_board[zhongguoxiangqi_index(9, zhongguoxiangqi_col)] = `r${zhongguoxiangqi_back_rank[zhongguoxiangqi_col]}`;
  }
  zhongguoxiangqi_board[zhongguoxiangqi_index(2, 1)] = "bC"; zhongguoxiangqi_board[zhongguoxiangqi_index(2, 7)] = "bC";
  zhongguoxiangqi_board[zhongguoxiangqi_index(7, 1)] = "rC"; zhongguoxiangqi_board[zhongguoxiangqi_index(7, 7)] = "rC";
  for (const zhongguoxiangqi_col of [0, 2, 4, 6, 8]) { zhongguoxiangqi_board[zhongguoxiangqi_index(3, zhongguoxiangqi_col)] = "bP"; zhongguoxiangqi_board[zhongguoxiangqi_index(6, zhongguoxiangqi_col)] = "rP"; }
  return zhongguoxiangqi_board;
}

// zhongguoxiangqi_initial_state：创建全新的中国象棋状态。
function zhongguoxiangqi_initial_state() {
  return { board: zhongguoxiangqi_initial_board(), side: zhongguoxiangqi_red, moves: 0, over: false, winner: "", lastMove: null };
}

// zhongguoxiangqi_valid_state：检查中国象棋存档的棋盘尺寸和行动方。
function zhongguoxiangqi_valid_state(zhongguoxiangqi_value) {
  return Boolean(zhongguoxiangqi_value && Array.isArray(zhongguoxiangqi_value.board) && zhongguoxiangqi_value.board.length === 90 && [zhongguoxiangqi_red, zhongguoxiangqi_black].includes(zhongguoxiangqi_value.side));
}

// zhongguoxiangqi_opponent：返回指定阵营的对方阵营。
function zhongguoxiangqi_opponent(zhongguoxiangqi_side) {
  return zhongguoxiangqi_side === zhongguoxiangqi_red ? zhongguoxiangqi_black : zhongguoxiangqi_red;
}

// zhongguoxiangqi_piece_side：返回棋子阵营；空点返回空字符串。
function zhongguoxiangqi_piece_side(zhongguoxiangqi_piece) {
  return zhongguoxiangqi_piece ? zhongguoxiangqi_piece[0] : "";
}

// zhongguoxiangqi_piece_type：返回棋子类型；空点返回空字符串。
function zhongguoxiangqi_piece_type(zhongguoxiangqi_piece) {
  return zhongguoxiangqi_piece ? zhongguoxiangqi_piece[1] : "";
}

// zhongguoxiangqi_in_palace：判断坐标是否位于指定阵营九宫内。
function zhongguoxiangqi_in_palace(zhongguoxiangqi_row, zhongguoxiangqi_col, zhongguoxiangqi_side) {
  return zhongguoxiangqi_col >= 3 && zhongguoxiangqi_col <= 5 && (zhongguoxiangqi_side === zhongguoxiangqi_red ? zhongguoxiangqi_row >= 7 && zhongguoxiangqi_row <= 9 : zhongguoxiangqi_row >= 0 && zhongguoxiangqi_row <= 2);
}

// zhongguoxiangqi_add_target：在不吃己方棋子的前提下追加目标点。
function zhongguoxiangqi_add_target(zhongguoxiangqi_board, zhongguoxiangqi_side, zhongguoxiangqi_from, zhongguoxiangqi_row, zhongguoxiangqi_col, zhongguoxiangqi_moves, zhongguoxiangqi_allow_king = false) {
  if (!zhongguoxiangqi_inside(zhongguoxiangqi_row, zhongguoxiangqi_col)) return;
  const zhongguoxiangqi_target = zhongguoxiangqi_board[zhongguoxiangqi_index(zhongguoxiangqi_row, zhongguoxiangqi_col)]; // zhongguoxiangqi_target：目标交叉点棋子。
  if (!zhongguoxiangqi_target || (zhongguoxiangqi_piece_side(zhongguoxiangqi_target) !== zhongguoxiangqi_side && (zhongguoxiangqi_allow_king || zhongguoxiangqi_piece_type(zhongguoxiangqi_target) !== "K"))) zhongguoxiangqi_moves.push({ from: zhongguoxiangqi_from, to: zhongguoxiangqi_index(zhongguoxiangqi_row, zhongguoxiangqi_col) });
}

// zhongguoxiangqi_pseudo_moves_for_piece：生成一枚棋子的伪合法着法。
function zhongguoxiangqi_pseudo_moves_for_piece(zhongguoxiangqi_board, zhongguoxiangqi_from, zhongguoxiangqi_allow_king = false) {
  const zhongguoxiangqi_piece = zhongguoxiangqi_board[zhongguoxiangqi_from]; // zhongguoxiangqi_piece：待生成着法的棋子。
  if (!zhongguoxiangqi_piece) return [];
  const zhongguoxiangqi_side = zhongguoxiangqi_piece_side(zhongguoxiangqi_piece); // zhongguoxiangqi_side：棋子所属阵营。
  const zhongguoxiangqi_type = zhongguoxiangqi_piece_type(zhongguoxiangqi_piece); // zhongguoxiangqi_type：棋子类型。
  const zhongguoxiangqi_row = Math.floor(zhongguoxiangqi_from / 9); // zhongguoxiangqi_row：棋子当前行。
  const zhongguoxiangqi_col = zhongguoxiangqi_from % 9; // zhongguoxiangqi_col：棋子当前列。
  const zhongguoxiangqi_moves = []; // zhongguoxiangqi_moves：本棋子的伪合法着法。
  const zhongguoxiangqi_add = (zhongguoxiangqi_target_row, zhongguoxiangqi_target_col) => zhongguoxiangqi_add_target(zhongguoxiangqi_board, zhongguoxiangqi_side, zhongguoxiangqi_from, zhongguoxiangqi_target_row, zhongguoxiangqi_target_col, zhongguoxiangqi_moves, zhongguoxiangqi_allow_king); // zhongguoxiangqi_add：追加普通目标的局部函数。

  if (zhongguoxiangqi_type === "K") {
    for (const [zhongguoxiangqi_dr, zhongguoxiangqi_dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const zhongguoxiangqi_target_row = zhongguoxiangqi_row + zhongguoxiangqi_dr; // zhongguoxiangqi_target_row：将帅候选目标行。
      const zhongguoxiangqi_target_col = zhongguoxiangqi_col + zhongguoxiangqi_dc; // zhongguoxiangqi_target_col：将帅候选目标列。
      if (zhongguoxiangqi_in_palace(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col, zhongguoxiangqi_side)) zhongguoxiangqi_add(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col);
    }
    let zhongguoxiangqi_scan_row = zhongguoxiangqi_row + (zhongguoxiangqi_side === zhongguoxiangqi_red ? -1 : 1); // zhongguoxiangqi_scan_row：将帅照面扫描行。
    while (zhongguoxiangqi_inside(zhongguoxiangqi_scan_row, zhongguoxiangqi_col)) {
      const zhongguoxiangqi_target = zhongguoxiangqi_board[zhongguoxiangqi_index(zhongguoxiangqi_scan_row, zhongguoxiangqi_col)]; // zhongguoxiangqi_target：照面方向首枚棋子。
      if (zhongguoxiangqi_target) {
        if (zhongguoxiangqi_piece_type(zhongguoxiangqi_target) === "K" && zhongguoxiangqi_piece_side(zhongguoxiangqi_target) !== zhongguoxiangqi_side && zhongguoxiangqi_allow_king) zhongguoxiangqi_add(zhongguoxiangqi_scan_row, zhongguoxiangqi_col);
        break;
      }
      zhongguoxiangqi_scan_row += zhongguoxiangqi_side === zhongguoxiangqi_red ? -1 : 1;
    }
  } else if (zhongguoxiangqi_type === "A") {
    for (const [zhongguoxiangqi_dr, zhongguoxiangqi_dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (zhongguoxiangqi_in_palace(zhongguoxiangqi_row + zhongguoxiangqi_dr, zhongguoxiangqi_col + zhongguoxiangqi_dc, zhongguoxiangqi_side)) zhongguoxiangqi_add(zhongguoxiangqi_row + zhongguoxiangqi_dr, zhongguoxiangqi_col + zhongguoxiangqi_dc);
  } else if (zhongguoxiangqi_type === "E") {
    for (const [zhongguoxiangqi_dr, zhongguoxiangqi_dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
      const zhongguoxiangqi_target_row = zhongguoxiangqi_row + zhongguoxiangqi_dr; // zhongguoxiangqi_target_row：相的候选目标行。
      const zhongguoxiangqi_target_col = zhongguoxiangqi_col + zhongguoxiangqi_dc; // zhongguoxiangqi_target_col：相的候选目标列。
      const zhongguoxiangqi_stays_side = zhongguoxiangqi_side === zhongguoxiangqi_red ? zhongguoxiangqi_target_row >= 5 : zhongguoxiangqi_target_row <= 4; // zhongguoxiangqi_stays_side：是否未过河。
      if (zhongguoxiangqi_inside(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col) && zhongguoxiangqi_stays_side && !zhongguoxiangqi_board[zhongguoxiangqi_index(zhongguoxiangqi_row + zhongguoxiangqi_dr / 2, zhongguoxiangqi_col + zhongguoxiangqi_dc / 2)]) zhongguoxiangqi_add(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col);
    }
  } else if (zhongguoxiangqi_type === "H") {
    for (const [zhongguoxiangqi_dr, zhongguoxiangqi_dc, zhongguoxiangqi_leg_dr, zhongguoxiangqi_leg_dc] of [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]]) if (!zhongguoxiangqi_board[zhongguoxiangqi_index(zhongguoxiangqi_row + zhongguoxiangqi_leg_dr, zhongguoxiangqi_col + zhongguoxiangqi_leg_dc)]) zhongguoxiangqi_add(zhongguoxiangqi_row + zhongguoxiangqi_dr, zhongguoxiangqi_col + zhongguoxiangqi_dc);
  } else if (zhongguoxiangqi_type === "R" || zhongguoxiangqi_type === "C") {
    for (const [zhongguoxiangqi_dr, zhongguoxiangqi_dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let zhongguoxiangqi_target_row = zhongguoxiangqi_row + zhongguoxiangqi_dr; // zhongguoxiangqi_target_row：车炮射线扫描行。
      let zhongguoxiangqi_target_col = zhongguoxiangqi_col + zhongguoxiangqi_dc; // zhongguoxiangqi_target_col：车炮射线扫描列。
      let zhongguoxiangqi_screen_seen = false; // zhongguoxiangqi_screen_seen：炮射线上是否已经越过炮架。
      while (zhongguoxiangqi_inside(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col)) {
        const zhongguoxiangqi_target = zhongguoxiangqi_board[zhongguoxiangqi_index(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col)]; // zhongguoxiangqi_target：射线当前棋子。
        if (zhongguoxiangqi_type === "R") {
          if (!zhongguoxiangqi_target) zhongguoxiangqi_add(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col);
          else { zhongguoxiangqi_add(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col); break; }
        } else if (!zhongguoxiangqi_screen_seen) {
          if (!zhongguoxiangqi_target) zhongguoxiangqi_add(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col);
          else zhongguoxiangqi_screen_seen = true;
        } else if (zhongguoxiangqi_target) {
          if (zhongguoxiangqi_piece_side(zhongguoxiangqi_target) !== zhongguoxiangqi_side && (zhongguoxiangqi_allow_king || zhongguoxiangqi_piece_type(zhongguoxiangqi_target) !== "K")) zhongguoxiangqi_moves.push({ from: zhongguoxiangqi_from, to: zhongguoxiangqi_index(zhongguoxiangqi_target_row, zhongguoxiangqi_target_col) });
          break;
        }
        zhongguoxiangqi_target_row += zhongguoxiangqi_dr; zhongguoxiangqi_target_col += zhongguoxiangqi_dc;
      }
    }
  } else if (zhongguoxiangqi_type === "P") {
    const zhongguoxiangqi_forward = zhongguoxiangqi_side === zhongguoxiangqi_red ? -1 : 1; // zhongguoxiangqi_forward：兵卒前进方向。
    zhongguoxiangqi_add(zhongguoxiangqi_row + zhongguoxiangqi_forward, zhongguoxiangqi_col);
    const zhongguoxiangqi_crossed = zhongguoxiangqi_side === zhongguoxiangqi_red ? zhongguoxiangqi_row <= 4 : zhongguoxiangqi_row >= 5; // zhongguoxiangqi_crossed：兵卒是否已经过河。
    if (zhongguoxiangqi_crossed) { zhongguoxiangqi_add(zhongguoxiangqi_row, zhongguoxiangqi_col - 1); zhongguoxiangqi_add(zhongguoxiangqi_row, zhongguoxiangqi_col + 1); }
  }
  return zhongguoxiangqi_moves;
}

// zhongguoxiangqi_apply_to_board：在棋盘副本上执行一步着法。
function zhongguoxiangqi_apply_to_board(zhongguoxiangqi_board, zhongguoxiangqi_move) {
  const zhongguoxiangqi_next_board = [...zhongguoxiangqi_board]; // zhongguoxiangqi_next_board：着法完成后的棋盘副本。
  zhongguoxiangqi_next_board[zhongguoxiangqi_move.to] = zhongguoxiangqi_next_board[zhongguoxiangqi_move.from];
  zhongguoxiangqi_next_board[zhongguoxiangqi_move.from] = null;
  return zhongguoxiangqi_next_board;
}

// zhongguoxiangqi_in_check：判断指定阵营的将帅是否正被对方攻击。
function zhongguoxiangqi_in_check(zhongguoxiangqi_board, zhongguoxiangqi_side) {
  const zhongguoxiangqi_king = zhongguoxiangqi_board.indexOf(`${zhongguoxiangqi_side}K`); // zhongguoxiangqi_king：指定阵营将帅下标。
  if (zhongguoxiangqi_king < 0) return true;
  const zhongguoxiangqi_enemy = zhongguoxiangqi_opponent(zhongguoxiangqi_side); // zhongguoxiangqi_enemy：攻击方阵营。
  for (let zhongguoxiangqi_from = 0; zhongguoxiangqi_from < 90; zhongguoxiangqi_from += 1) {
    if (zhongguoxiangqi_piece_side(zhongguoxiangqi_board[zhongguoxiangqi_from]) !== zhongguoxiangqi_enemy) continue;
    if (zhongguoxiangqi_pseudo_moves_for_piece(zhongguoxiangqi_board, zhongguoxiangqi_from, true).some(zhongguoxiangqi_move => zhongguoxiangqi_move.to === zhongguoxiangqi_king)) return true;
  }
  return false;
}

// zhongguoxiangqi_legal_moves：生成指定阵营所有不会令己方将帅受攻击的着法。
function zhongguoxiangqi_legal_moves(zhongguoxiangqi_board, zhongguoxiangqi_side) {
  const zhongguoxiangqi_moves = []; // zhongguoxiangqi_moves：指定阵营全部合法着法。
  for (let zhongguoxiangqi_from = 0; zhongguoxiangqi_from < 90; zhongguoxiangqi_from += 1) {
    if (zhongguoxiangqi_piece_side(zhongguoxiangqi_board[zhongguoxiangqi_from]) !== zhongguoxiangqi_side) continue;
    for (const zhongguoxiangqi_move of zhongguoxiangqi_pseudo_moves_for_piece(zhongguoxiangqi_board, zhongguoxiangqi_from, false)) if (!zhongguoxiangqi_in_check(zhongguoxiangqi_apply_to_board(zhongguoxiangqi_board, zhongguoxiangqi_move), zhongguoxiangqi_side)) zhongguoxiangqi_moves.push(zhongguoxiangqi_move);
  }
  return zhongguoxiangqi_moves;
}

// zhongguoxiangqi_position_score：返回黑方相对红方的子力、过河和将军综合评价。
function zhongguoxiangqi_position_score(zhongguoxiangqi_board) {
  let zhongguoxiangqi_score = 0; // zhongguoxiangqi_score：黑方减红方的综合分。
  for (let zhongguoxiangqi_square = 0; zhongguoxiangqi_square < 90; zhongguoxiangqi_square += 1) {
    const zhongguoxiangqi_piece = zhongguoxiangqi_board[zhongguoxiangqi_square]; // zhongguoxiangqi_piece：当前交叉点棋子。
    if (!zhongguoxiangqi_piece) continue;
    const zhongguoxiangqi_side = zhongguoxiangqi_piece_side(zhongguoxiangqi_piece); // zhongguoxiangqi_side：棋子阵营。
    const zhongguoxiangqi_type = zhongguoxiangqi_piece_type(zhongguoxiangqi_piece); // zhongguoxiangqi_type：棋子类型。
    const zhongguoxiangqi_row = Math.floor(zhongguoxiangqi_square / 9); // zhongguoxiangqi_row：棋子行号。
    let zhongguoxiangqi_value = zhongguoxiangqi_values[zhongguoxiangqi_type]; // zhongguoxiangqi_value：含位置奖励的棋子分。
    if (zhongguoxiangqi_type === "P") zhongguoxiangqi_value += zhongguoxiangqi_side === zhongguoxiangqi_red ? Math.max(0, 6 - zhongguoxiangqi_row) * 18 : Math.max(0, zhongguoxiangqi_row - 3) * 18;
    zhongguoxiangqi_score += zhongguoxiangqi_side === zhongguoxiangqi_black ? zhongguoxiangqi_value : -zhongguoxiangqi_value;
  }
  if (zhongguoxiangqi_in_check(zhongguoxiangqi_board, zhongguoxiangqi_red)) zhongguoxiangqi_score += 65;
  if (zhongguoxiangqi_in_check(zhongguoxiangqi_board, zhongguoxiangqi_black)) zhongguoxiangqi_score -= 65;
  return zhongguoxiangqi_score;
}

// zhongguoxiangqi_robot_move：用两层极小化搜索为任意棋色选择稳健着法。
function zhongguoxiangqi_robot_move(zhongguoxiangqi_board, zhongguoxiangqi_side) {
  let zhongguoxiangqi_best_move = null; // zhongguoxiangqi_best_move：当前评分最高的机器人着法。
  let zhongguoxiangqi_best_score = zhongguoxiangqi_side === zhongguoxiangqi_black ? -Infinity : Infinity; // zhongguoxiangqi_best_score：黑方取最高、红方取最低的最坏应对分。
  for (const zhongguoxiangqi_move of zhongguoxiangqi_legal_moves(zhongguoxiangqi_board, zhongguoxiangqi_side)) {
    const zhongguoxiangqi_after_move = zhongguoxiangqi_apply_to_board(zhongguoxiangqi_board, zhongguoxiangqi_move); // zhongguoxiangqi_after_move：当前机器人走棋后局面。
    const zhongguoxiangqi_opponent_side = zhongguoxiangqi_opponent(zhongguoxiangqi_side); // zhongguoxiangqi_opponent_side：对手棋色。
    const zhongguoxiangqi_replies = zhongguoxiangqi_legal_moves(zhongguoxiangqi_after_move, zhongguoxiangqi_opponent_side); // zhongguoxiangqi_replies：对手全部合法回应。
    let zhongguoxiangqi_worst_reply = zhongguoxiangqi_position_score(zhongguoxiangqi_after_move); // zhongguoxiangqi_worst_reply：对手最强回应后的黑方视角评价。
    if (zhongguoxiangqi_replies.length) {
      zhongguoxiangqi_worst_reply = zhongguoxiangqi_side === zhongguoxiangqi_black ? Infinity : -Infinity;
      for (const zhongguoxiangqi_reply of zhongguoxiangqi_replies) {
        const zhongguoxiangqi_reply_score = zhongguoxiangqi_position_score(zhongguoxiangqi_apply_to_board(zhongguoxiangqi_after_move, zhongguoxiangqi_reply)); // zhongguoxiangqi_reply_score：回应后的黑方视角分。
        zhongguoxiangqi_worst_reply = zhongguoxiangqi_side === zhongguoxiangqi_black ? Math.min(zhongguoxiangqi_worst_reply, zhongguoxiangqi_reply_score) : Math.max(zhongguoxiangqi_worst_reply, zhongguoxiangqi_reply_score);
      }
    }
    const zhongguoxiangqi_score = zhongguoxiangqi_worst_reply + Math.random() * .2; // zhongguoxiangqi_score：含极小随机扰动的候选分。
    const zhongguoxiangqi_better = zhongguoxiangqi_side === zhongguoxiangqi_black ? zhongguoxiangqi_score > zhongguoxiangqi_best_score : zhongguoxiangqi_score < zhongguoxiangqi_best_score; // zhongguoxiangqi_better：当前候选是否更符合本方目标。
    if (zhongguoxiangqi_better) { zhongguoxiangqi_best_score = zhongguoxiangqi_score; zhongguoxiangqi_best_move = zhongguoxiangqi_move; }
  }
  return zhongguoxiangqi_best_move;
}

// zhongguoxiangqi_predict：用局面评价生成预测；标准开局固定为 50:50。
function zhongguoxiangqi_predict(zhongguoxiangqi_state) {
  if (zhongguoxiangqi_state.moves === 0) return { red: 50, black: 50, summary: "标准开局，双方机会均等" };
  if (zhongguoxiangqi_state.over) return zhongguoxiangqi_state.winner === zhongguoxiangqi_red ? { red: 100, black: 0, summary: "红方绝杀获胜" } : { red: 0, black: 100, summary: "黑方绝杀获胜" };
  const zhongguoxiangqi_black_score = zhongguoxiangqi_position_score(zhongguoxiangqi_state.board); // zhongguoxiangqi_black_score：黑方相对红方的局面分。
  const zhongguoxiangqi_red_percent = Math.round(qilei_clamp(50 - zhongguoxiangqi_black_score / 32, 3, 97)); // zhongguoxiangqi_red_percent：红方预测百分比。
  return { red: zhongguoxiangqi_red_percent, black: 100 - zhongguoxiangqi_red_percent, summary: Math.abs(zhongguoxiangqi_red_percent - 50) < 5 ? "局势基本均衡" : (zhongguoxiangqi_red_percent > 50 ? "红方局面占优" : "黑方局面占优") };
}

// zhongguoxiangqi_create_game：创建可交互的中国象棋页面实例。
export function zhongguoxiangqi_create_game({ boardHost: zhongguoxiangqi_board_host, controlsHost: zhongguoxiangqi_controls_host, savedState: zhongguoxiangqi_saved_state, setting: zhongguoxiangqi_setting, services: zhongguoxiangqi_services }) {
  const { canvas: zhongguoxiangqi_canvas, context: zhongguoxiangqi_context } = qilei_make_canvas(zhongguoxiangqi_board_host, { width: 620, height: 760 }, "中国象棋棋盘"); // zhongguoxiangqi_canvas/context：对应 C++ 左侧 620×760 绘图区域。
  let zhongguoxiangqi_state = zhongguoxiangqi_valid_state(zhongguoxiangqi_saved_state) ? qilei_deep_copy(zhongguoxiangqi_saved_state) : zhongguoxiangqi_initial_state(); // zhongguoxiangqi_state：当前可保存棋局状态。
  let zhongguoxiangqi_selected = null; // zhongguoxiangqi_selected：当前选中红棋下标。
  let zhongguoxiangqi_pending_move = null; // zhongguoxiangqi_pending_move：等待再次点击确认的目标着法。
  let zhongguoxiangqi_hint_move = null; // zhongguoxiangqi_hint_move：提示按钮给出的推荐着法。
  let zhongguoxiangqi_robot_timer = null; // zhongguoxiangqi_robot_timer：机器人思考延时计时器。
  let zhongguoxiangqi_finished_reported = Boolean(zhongguoxiangqi_state.over); // zhongguoxiangqi_finished_reported：终局是否已经记录。
  let zhongguoxiangqi_destroyed = false; // zhongguoxiangqi_destroyed：离开本局后阻止迟到的引擎响应继续更新页面。
  const zhongguoxiangqi_memory_history = []; // zhongguoxiangqi_memory_history：当前页面用于悔棋的状态快照。

  // zhongguoxiangqi_is_robot_side：根据公共设置判断红方或黑方是否由机器人控制。
  function zhongguoxiangqi_is_robot_side(zhongguoxiangqi_side) {
    const zhongguoxiangqi_mode = zhongguoxiangqi_setting?.robotMode ?? 2; // zhongguoxiangqi_mode：0 双玩家、1 红机器人、2 黑机器人、3 双机器人。
    return zhongguoxiangqi_mode === 3 || (zhongguoxiangqi_mode === 1 && zhongguoxiangqi_side === zhongguoxiangqi_red) || (zhongguoxiangqi_mode === 2 && zhongguoxiangqi_side === zhongguoxiangqi_black);
  }

  // zhongguoxiangqi_draw：绘制棋盘、楚河汉界、九宫、棋子和操作标记。
  function zhongguoxiangqi_draw() {
    const zhongguoxiangqi_left = 48; // zhongguoxiangqi_left：C++ 第一 路横坐标。
    const zhongguoxiangqi_top = 48; // zhongguoxiangqi_top：C++ 第一行纵坐标。
    const zhongguoxiangqi_step_x = 58; // zhongguoxiangqi_step_x：C++ 相邻路横向距离。
    const zhongguoxiangqi_step_y = 58; // zhongguoxiangqi_step_y：C++ 相邻行纵向距离。
    zhongguoxiangqi_context.fillStyle = "rgb(233,236,225)"; zhongguoxiangqi_context.fillRect(0, 0, 620, 760);
    zhongguoxiangqi_context.fillStyle = "rgb(230,202,145)"; zhongguoxiangqi_context.fillRect(20, 20, 572, 712);
    zhongguoxiangqi_context.strokeStyle = "rgb(169,151,115)"; zhongguoxiangqi_context.lineWidth = 1; zhongguoxiangqi_context.strokeRect(20, 20, 572, 712);
    zhongguoxiangqi_context.strokeStyle = "#574128"; zhongguoxiangqi_context.lineWidth = 1.7;
    for (let zhongguoxiangqi_row = 0; zhongguoxiangqi_row < 10; zhongguoxiangqi_row += 1) { const zhongguoxiangqi_y = zhongguoxiangqi_top + zhongguoxiangqi_row * zhongguoxiangqi_step_y; zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.moveTo(zhongguoxiangqi_left, zhongguoxiangqi_y); zhongguoxiangqi_context.lineTo(zhongguoxiangqi_left + 8 * zhongguoxiangqi_step_x, zhongguoxiangqi_y); zhongguoxiangqi_context.stroke(); }
    for (let zhongguoxiangqi_col = 0; zhongguoxiangqi_col < 9; zhongguoxiangqi_col += 1) {
      const zhongguoxiangqi_x = zhongguoxiangqi_left + zhongguoxiangqi_col * zhongguoxiangqi_step_x; // zhongguoxiangqi_x：当前竖线横坐标。
      zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.moveTo(zhongguoxiangqi_x, zhongguoxiangqi_top); zhongguoxiangqi_context.lineTo(zhongguoxiangqi_x, zhongguoxiangqi_top + 4 * zhongguoxiangqi_step_y); zhongguoxiangqi_context.stroke();
      zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.moveTo(zhongguoxiangqi_x, zhongguoxiangqi_top + 5 * zhongguoxiangqi_step_y); zhongguoxiangqi_context.lineTo(zhongguoxiangqi_x, zhongguoxiangqi_top + 9 * zhongguoxiangqi_step_y); zhongguoxiangqi_context.stroke();
    }
    for (const [zhongguoxiangqi_from_row, zhongguoxiangqi_from_col, zhongguoxiangqi_to_row, zhongguoxiangqi_to_col] of [[0, 3, 2, 5], [0, 5, 2, 3], [7, 3, 9, 5], [7, 5, 9, 3]]) { zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.moveTo(zhongguoxiangqi_left + zhongguoxiangqi_from_col * zhongguoxiangqi_step_x, zhongguoxiangqi_top + zhongguoxiangqi_from_row * zhongguoxiangqi_step_y); zhongguoxiangqi_context.lineTo(zhongguoxiangqi_left + zhongguoxiangqi_to_col * zhongguoxiangqi_step_x, zhongguoxiangqi_top + zhongguoxiangqi_to_row * zhongguoxiangqi_step_y); zhongguoxiangqi_context.stroke(); }
    zhongguoxiangqi_context.fillStyle = "rgb(83,90,69)"; zhongguoxiangqi_context.font = "30px 'Microsoft YaHei',serif"; zhongguoxiangqi_context.textAlign = "center"; zhongguoxiangqi_context.textBaseline = "middle";
    zhongguoxiangqi_context.fillText("楚河", 164, zhongguoxiangqi_top + 4.5 * zhongguoxiangqi_step_y); zhongguoxiangqi_context.fillText("汉界", 396, zhongguoxiangqi_top + 4.5 * zhongguoxiangqi_step_y);
    const zhongguoxiangqi_legal_targets = zhongguoxiangqi_selected === null ? [] : zhongguoxiangqi_legal_moves(zhongguoxiangqi_state.board, zhongguoxiangqi_red).filter(zhongguoxiangqi_move => zhongguoxiangqi_move.from === zhongguoxiangqi_selected).map(zhongguoxiangqi_move => zhongguoxiangqi_move.to); // zhongguoxiangqi_legal_targets：选中棋子的合法目标下标。
    for (const zhongguoxiangqi_target of zhongguoxiangqi_legal_targets) { const zhongguoxiangqi_row = Math.floor(zhongguoxiangqi_target / 9); const zhongguoxiangqi_col = zhongguoxiangqi_target % 9; zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.arc(zhongguoxiangqi_left + zhongguoxiangqi_col * zhongguoxiangqi_step_x, zhongguoxiangqi_top + zhongguoxiangqi_row * zhongguoxiangqi_step_y, 8, 0, Math.PI * 2); zhongguoxiangqi_context.fillStyle = "rgba(28,114,83,.55)"; zhongguoxiangqi_context.fill(); }
    for (let zhongguoxiangqi_square = 0; zhongguoxiangqi_square < 90; zhongguoxiangqi_square += 1) {
      const zhongguoxiangqi_piece = zhongguoxiangqi_state.board[zhongguoxiangqi_square]; // zhongguoxiangqi_piece：当前交叉点棋子。
      if (!zhongguoxiangqi_piece) continue;
      const zhongguoxiangqi_row = Math.floor(zhongguoxiangqi_square / 9); // zhongguoxiangqi_row：棋子行。
      const zhongguoxiangqi_col = zhongguoxiangqi_square % 9; // zhongguoxiangqi_col：棋子列。
      const zhongguoxiangqi_x = zhongguoxiangqi_left + zhongguoxiangqi_col * zhongguoxiangqi_step_x; // zhongguoxiangqi_x：棋子中心横坐标。
      const zhongguoxiangqi_y = zhongguoxiangqi_top + zhongguoxiangqi_row * zhongguoxiangqi_step_y; // zhongguoxiangqi_y：棋子中心纵坐标。
      if (zhongguoxiangqi_selected === zhongguoxiangqi_square) { zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.arc(zhongguoxiangqi_x, zhongguoxiangqi_y, 27, 0, Math.PI * 2); zhongguoxiangqi_context.strokeStyle = "rgb(36,130,94)"; zhongguoxiangqi_context.lineWidth = 4; zhongguoxiangqi_context.stroke(); }
      zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.arc(zhongguoxiangqi_x, zhongguoxiangqi_y, 24, 0, Math.PI * 2); zhongguoxiangqi_context.fillStyle = "rgb(252,247,231)"; zhongguoxiangqi_context.fill(); zhongguoxiangqi_context.strokeStyle = zhongguoxiangqi_piece_side(zhongguoxiangqi_piece) === zhongguoxiangqi_red ? "rgb(174,38,38)" : "rgb(30,30,30)"; zhongguoxiangqi_context.lineWidth = 3; zhongguoxiangqi_context.stroke();
      zhongguoxiangqi_context.fillStyle = zhongguoxiangqi_context.strokeStyle; zhongguoxiangqi_context.font = "30px SimSun,serif"; zhongguoxiangqi_context.fillText(zhongguoxiangqi_symbols[zhongguoxiangqi_piece], zhongguoxiangqi_x, zhongguoxiangqi_y + 1);
    }
    const zhongguoxiangqi_mark_move = (zhongguoxiangqi_move, zhongguoxiangqi_color, zhongguoxiangqi_dash) => { if (!zhongguoxiangqi_move) return; const zhongguoxiangqi_row = Math.floor(zhongguoxiangqi_move.to / 9); const zhongguoxiangqi_col = zhongguoxiangqi_move.to % 9; zhongguoxiangqi_context.save(); zhongguoxiangqi_context.setLineDash(zhongguoxiangqi_dash); zhongguoxiangqi_context.strokeStyle = zhongguoxiangqi_color; zhongguoxiangqi_context.lineWidth = 4; zhongguoxiangqi_context.beginPath(); zhongguoxiangqi_context.arc(zhongguoxiangqi_left + zhongguoxiangqi_col * zhongguoxiangqi_step_x, zhongguoxiangqi_top + zhongguoxiangqi_row * zhongguoxiangqi_step_y, 27, 0, Math.PI * 2); zhongguoxiangqi_context.stroke(); zhongguoxiangqi_context.restore(); }; // zhongguoxiangqi_mark_move：按棋子外圈尺寸绘制推荐或待确认目标轮廓。
    zhongguoxiangqi_mark_move(zhongguoxiangqi_hint_move, "#257c61", [8, 5]); zhongguoxiangqi_mark_move(zhongguoxiangqi_pending_move, "#bc3b32", []);
  }

  // zhongguoxiangqi_update_panel：刷新双方状态、回合和胜负预测。
  function zhongguoxiangqi_update_panel(zhongguoxiangqi_status = "") {
    const zhongguoxiangqi_prediction = zhongguoxiangqi_predict(zhongguoxiangqi_state); // zhongguoxiangqi_prediction：当前局势预测。
    const zhongguoxiangqi_red_count = zhongguoxiangqi_state.board.filter(zhongguoxiangqi_piece => zhongguoxiangqi_piece_side(zhongguoxiangqi_piece) === zhongguoxiangqi_red).length; // zhongguoxiangqi_red_count：红方在场棋子数。
    const zhongguoxiangqi_black_count = zhongguoxiangqi_state.board.filter(zhongguoxiangqi_piece => zhongguoxiangqi_piece_side(zhongguoxiangqi_piece) === zhongguoxiangqi_black).length; // zhongguoxiangqi_black_count：黑方在场棋子数。
    zhongguoxiangqi_services.update({ status: zhongguoxiangqi_status || (zhongguoxiangqi_state.over ? "本局已经结束" : (zhongguoxiangqi_is_robot_side(zhongguoxiangqi_state.side) ? "机器人正在思考…" : `等待${zhongguoxiangqi_state.side === zhongguoxiangqi_red ? "红方" : "黑方"}操作`)), prediction: { first: zhongguoxiangqi_prediction.red, second: zhongguoxiangqi_prediction.black, firstName: "红", secondName: "黑", summary: zhongguoxiangqi_prediction.summary }, stats: [{ label: "红方棋子", value: `场上 ${zhongguoxiangqi_red_count} 子 · 吃子 ${16 - zhongguoxiangqi_black_count}`, pieces: zhongguoxiangqi_roster_state(zhongguoxiangqi_state.board, zhongguoxiangqi_red_roster) }, { label: "黑方棋子", value: `场上 ${zhongguoxiangqi_black_count} 子 · 吃子 ${16 - zhongguoxiangqi_red_count}`, pieces: zhongguoxiangqi_roster_state(zhongguoxiangqi_state.board, zhongguoxiangqi_black_roster) }, { label: "对局进度", value: `第 ${Math.floor(zhongguoxiangqi_state.moves / 2) + 1} 回合 · ${zhongguoxiangqi_state.side === zhongguoxiangqi_red ? "红方" : "黑方"}行动` }], activeSide: zhongguoxiangqi_state.side === zhongguoxiangqi_red ? 0 : 1, moveCount: zhongguoxiangqi_state.moves });
  }

  // zhongguoxiangqi_check_end：检查困毙或将死并写入历史。
  function zhongguoxiangqi_check_end() {
    if (zhongguoxiangqi_legal_moves(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side).length) return;
    zhongguoxiangqi_state.over = true; zhongguoxiangqi_state.winner = zhongguoxiangqi_opponent(zhongguoxiangqi_state.side);
    if (!zhongguoxiangqi_finished_reported) { zhongguoxiangqi_finished_reported = true; zhongguoxiangqi_services.finish(zhongguoxiangqi_state.winner === zhongguoxiangqi_red ? "红方获胜" : "黑方获胜"); }
  }

  // zhongguoxiangqi_commit_move：执行一步、换手、检测终局并保存。
  function zhongguoxiangqi_commit_move(zhongguoxiangqi_move) {
    if (!zhongguoxiangqi_move || zhongguoxiangqi_state.over) return;
    zhongguoxiangqi_memory_history.push(qilei_deep_copy(zhongguoxiangqi_state)); zhongguoxiangqi_state.board = zhongguoxiangqi_apply_to_board(zhongguoxiangqi_state.board, zhongguoxiangqi_move); zhongguoxiangqi_state.lastMove = { ...zhongguoxiangqi_move }; zhongguoxiangqi_state.moves += 1; zhongguoxiangqi_state.side = zhongguoxiangqi_opponent(zhongguoxiangqi_state.side); zhongguoxiangqi_selected = null; zhongguoxiangqi_pending_move = null; zhongguoxiangqi_hint_move = null;
    zhongguoxiangqi_check_end(); zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel(zhongguoxiangqi_in_check(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side) ? "将军！" : "走棋完成"); zhongguoxiangqi_services.save(qilei_deep_copy(zhongguoxiangqi_state)); zhongguoxiangqi_schedule_robot();
  }

  // zhongguoxiangqi_schedule_robot：让机器人依次展示“选棋子、选落点、确认”三个与玩家一致的阶段。
  function zhongguoxiangqi_schedule_robot() {
    window.clearTimeout(zhongguoxiangqi_robot_timer); if (zhongguoxiangqi_destroyed || zhongguoxiangqi_state.over || !zhongguoxiangqi_is_robot_side(zhongguoxiangqi_state.side)) return;
    const zhongguoxiangqi_checking = zhongguoxiangqi_in_check(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side); // zhongguoxiangqi_checking：当前机器人是否必须先处理将军。
    zhongguoxiangqi_update_panel(zhongguoxiangqi_checking ? "将军！机器人正在计算应将…" : "机器人正在分析将军与子力…");
    zhongguoxiangqi_robot_timer = window.setTimeout(async () => {
      const zhongguoxiangqi_request_side = zhongguoxiangqi_state.side; // zhongguoxiangqi_request_side：发起 engine 请求时的行动方。
      const zhongguoxiangqi_request_moves = zhongguoxiangqi_state.moves; // zhongguoxiangqi_request_moves：用于丢弃过期响应的步数。
      let zhongguoxiangqi_move = null; // zhongguoxiangqi_move：外部 engine 或规则兜底选出的着法。
      try {
        const zhongguoxiangqi_response = await zhongguoxiangqi_services.engineMove({ board: qilei_deep_copy(zhongguoxiangqi_state.board), side: zhongguoxiangqi_state.side, moveCount: zhongguoxiangqi_state.moves, balanced: zhongguoxiangqi_setting?.robotMode === 3 }); // zhongguoxiangqi_response：Python 后端 engine 返回坐标。
        const zhongguoxiangqi_candidate = zhongguoxiangqi_response?.move; // zhongguoxiangqi_candidate：尚未通过网页规则复核的候选着法。
        if (zhongguoxiangqi_legal_moves(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side).some(zhongguoxiangqi_legal => zhongguoxiangqi_legal.from === zhongguoxiangqi_candidate?.from && zhongguoxiangqi_legal.to === zhongguoxiangqi_candidate?.to)) zhongguoxiangqi_move = zhongguoxiangqi_candidate;
      } catch (_) {
        zhongguoxiangqi_move = null;
      }
      if (zhongguoxiangqi_destroyed || zhongguoxiangqi_state.side !== zhongguoxiangqi_request_side || zhongguoxiangqi_state.moves !== zhongguoxiangqi_request_moves || zhongguoxiangqi_state.over) return;
      if (!zhongguoxiangqi_move) zhongguoxiangqi_move = zhongguoxiangqi_robot_move(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side);
      if (!zhongguoxiangqi_move) return;
      zhongguoxiangqi_selected = zhongguoxiangqi_move.from;
      zhongguoxiangqi_pending_move = null;
      zhongguoxiangqi_draw();
      zhongguoxiangqi_update_panel(`${zhongguoxiangqi_checking ? "将军！" : ""}机器人已选择棋子，正在确认落点…`);
      zhongguoxiangqi_robot_timer = window.setTimeout(() => {
        zhongguoxiangqi_pending_move = zhongguoxiangqi_move;
        zhongguoxiangqi_draw();
        zhongguoxiangqi_update_panel(`${zhongguoxiangqi_checking ? "将军！" : ""}机器人已选择落点，正在确认走棋…`);
        zhongguoxiangqi_robot_timer = window.setTimeout(() => zhongguoxiangqi_commit_move(zhongguoxiangqi_move), 2000);
      }, 2000);
    }, 500);
  }

  // zhongguoxiangqi_handle_click：处理玩家选棋、选目标与二次确认。
  function zhongguoxiangqi_handle_click(zhongguoxiangqi_event) {
    if (zhongguoxiangqi_state.over || zhongguoxiangqi_is_robot_side(zhongguoxiangqi_state.side)) return;
    const zhongguoxiangqi_point = qilei_canvas_point(zhongguoxiangqi_canvas, zhongguoxiangqi_event); // zhongguoxiangqi_point：点击画布坐标。
    const zhongguoxiangqi_left = 48; const zhongguoxiangqi_top = 48; // zhongguoxiangqi_left/top：棋盘第一交叉点坐标。
    const zhongguoxiangqi_step_x = 58; const zhongguoxiangqi_step_y = 58; // zhongguoxiangqi_step_x/y：网格横纵间距。
    const zhongguoxiangqi_row = Math.round((zhongguoxiangqi_point.y - zhongguoxiangqi_top) / zhongguoxiangqi_step_y); // zhongguoxiangqi_row：点击行号。
    const zhongguoxiangqi_col = Math.round((zhongguoxiangqi_point.x - zhongguoxiangqi_left) / zhongguoxiangqi_step_x); // zhongguoxiangqi_col：点击列号。
    if (!zhongguoxiangqi_inside(zhongguoxiangqi_row, zhongguoxiangqi_col)) return;
    const zhongguoxiangqi_square = zhongguoxiangqi_index(zhongguoxiangqi_row, zhongguoxiangqi_col); // zhongguoxiangqi_square：点击点下标。
    if (zhongguoxiangqi_piece_side(zhongguoxiangqi_state.board[zhongguoxiangqi_square]) === zhongguoxiangqi_state.side) { zhongguoxiangqi_selected = zhongguoxiangqi_square; zhongguoxiangqi_pending_move = null; zhongguoxiangqi_hint_move = null; zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel("已选择棋子，请选择合法目标"); return; }
    if (zhongguoxiangqi_selected === null) return;
    const zhongguoxiangqi_move = zhongguoxiangqi_legal_moves(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side).find(zhongguoxiangqi_candidate => zhongguoxiangqi_candidate.from === zhongguoxiangqi_selected && zhongguoxiangqi_candidate.to === zhongguoxiangqi_square); // zhongguoxiangqi_move：点击目标对应合法着法。
    if (!zhongguoxiangqi_move) { zhongguoxiangqi_services.toast("该目标不符合中国象棋规则"); return; }
    if (!zhongguoxiangqi_pending_move || zhongguoxiangqi_pending_move.to !== zhongguoxiangqi_square) { zhongguoxiangqi_pending_move = zhongguoxiangqi_move; zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel(`已选择第 ${zhongguoxiangqi_col + 1} 路第 ${zhongguoxiangqi_row + 1} 行，再次点击确认`); return; }
    zhongguoxiangqi_commit_move(zhongguoxiangqi_move); zhongguoxiangqi_schedule_robot();
  }

  // zhongguoxiangqi_undo：撤回最近一轮红黑双方着法。
  function zhongguoxiangqi_undo() {
    if (!zhongguoxiangqi_memory_history.length) { zhongguoxiangqi_services.toast("当前没有可悔的棋"); return; }
    window.clearTimeout(zhongguoxiangqi_robot_timer); let zhongguoxiangqi_previous = zhongguoxiangqi_memory_history.pop(); // zhongguoxiangqi_previous：最近一步前的状态。
    if (zhongguoxiangqi_previous.side === zhongguoxiangqi_black && zhongguoxiangqi_memory_history.length) zhongguoxiangqi_previous = zhongguoxiangqi_memory_history.pop();
    zhongguoxiangqi_state = zhongguoxiangqi_previous; zhongguoxiangqi_state.over = false; zhongguoxiangqi_state.winner = ""; zhongguoxiangqi_finished_reported = false; zhongguoxiangqi_selected = null; zhongguoxiangqi_pending_move = null; zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel("已撤回上一轮"); zhongguoxiangqi_services.save(qilei_deep_copy(zhongguoxiangqi_state));
  }

  // zhongguoxiangqi_hint：为当前非机器人方推荐一步合法着法。
  function zhongguoxiangqi_hint() {
    if (zhongguoxiangqi_state.over || zhongguoxiangqi_is_robot_side(zhongguoxiangqi_state.side)) return;
    zhongguoxiangqi_hint_move = zhongguoxiangqi_robot_move(zhongguoxiangqi_state.board, zhongguoxiangqi_state.side);
    zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel("绿色虚线圈是推荐目标");
  }

  // zhongguoxiangqi_new_game：清除存档并恢复中国象棋标准局面。
  async function zhongguoxiangqi_new_game() {
    window.clearTimeout(zhongguoxiangqi_robot_timer); await zhongguoxiangqi_services.clearSave(); zhongguoxiangqi_state = zhongguoxiangqi_initial_state(); zhongguoxiangqi_memory_history.length = 0; zhongguoxiangqi_selected = null; zhongguoxiangqi_pending_move = null; zhongguoxiangqi_hint_move = null; zhongguoxiangqi_finished_reported = false; zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel("新对局已开始，红方先行"); zhongguoxiangqi_services.save(qilei_deep_copy(zhongguoxiangqi_state)); zhongguoxiangqi_schedule_robot();
  }

  // zhongguoxiangqi_timeout：任一方步时或局时耗尽时立即判负。
  function zhongguoxiangqi_timeout(zhongguoxiangqi_timed_side, zhongguoxiangqi_kind) {
    if (zhongguoxiangqi_state.over || zhongguoxiangqi_destroyed) return;
    window.clearTimeout(zhongguoxiangqi_robot_timer);
    const zhongguoxiangqi_loser = zhongguoxiangqi_timed_side === 0 ? zhongguoxiangqi_red : zhongguoxiangqi_black; // zhongguoxiangqi_loser：耗尽计时的一方。
    zhongguoxiangqi_state.over = true;
    zhongguoxiangqi_state.winner = zhongguoxiangqi_opponent(zhongguoxiangqi_loser);
    zhongguoxiangqi_draw();
    zhongguoxiangqi_update_panel(`${zhongguoxiangqi_loser === zhongguoxiangqi_red ? "红方" : "黑方"}${zhongguoxiangqi_kind}耗尽，判负`);
    zhongguoxiangqi_services.save(qilei_deep_copy(zhongguoxiangqi_state));
    if (!zhongguoxiangqi_finished_reported) {
      zhongguoxiangqi_finished_reported = true;
      zhongguoxiangqi_services.finish(`${zhongguoxiangqi_loser === zhongguoxiangqi_red ? "红方" : "黑方"}超时判负`);
    }
  }

  zhongguoxiangqi_controls_host.append(qilei_control_button("悔棋 (U)", zhongguoxiangqi_undo), qilei_control_button("重开 (N)", zhongguoxiangqi_new_game, "warning"));
  zhongguoxiangqi_canvas.addEventListener("click", zhongguoxiangqi_handle_click); zhongguoxiangqi_draw(); zhongguoxiangqi_update_panel(zhongguoxiangqi_saved_state ? "已读取个人存档" : "红方先行，请选择棋子"); zhongguoxiangqi_schedule_robot();
  return { getState: () => qilei_deep_copy(zhongguoxiangqi_state), timeout: zhongguoxiangqi_timeout, destroy: () => { zhongguoxiangqi_destroyed = true; window.clearTimeout(zhongguoxiangqi_robot_timer); zhongguoxiangqi_canvas.removeEventListener("click", zhongguoxiangqi_handle_click); } };
}
