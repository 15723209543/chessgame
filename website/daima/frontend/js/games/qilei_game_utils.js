// qilei_game_utils.js：六种棋共用的画布、按钮与数值工具。

// qilei_clamp：把数值限制在给定的最小值和最大值之间。
export const qilei_clamp = (qilei_value, qilei_minimum, qilei_maximum) =>
  Math.max(qilei_minimum, Math.min(qilei_maximum, qilei_value));

// qilei_deep_copy：复制只包含 JSON 数据的棋局状态，避免悔棋快照互相引用。
export const qilei_deep_copy = qilei_value => JSON.parse(JSON.stringify(qilei_value));

// qilei_canvas_point：把指针或触摸坐标换算为画布内部坐标。
export function qilei_canvas_point(qilei_canvas, qilei_event) {
  const qilei_rect = qilei_canvas.getBoundingClientRect(); // qilei_rect：画布在网页中的显示边界。
  const qilei_source = qilei_event.touches ? qilei_event.touches[0] : qilei_event; // qilei_source：当前指针或触摸点。
  return {
    x: (qilei_source.clientX - qilei_rect.left) * qilei_canvas.width / qilei_rect.width,
    y: (qilei_source.clientY - qilei_rect.top) * qilei_canvas.height / qilei_rect.height,
  };
}

// qilei_make_canvas：在指定容器中创建固定逻辑尺寸、可响应缩放的棋盘画布。
export function qilei_make_canvas(qilei_host, qilei_size = 760, qilei_label = "棋盘") {
  qilei_host.replaceChildren();
  const qilei_canvas = document.createElement("canvas"); // qilei_canvas：承载棋盘绘制与点击输入的画布。
  const qilei_canvas_size = typeof qilei_size === "number" ? { width: qilei_size, height: qilei_size } : qilei_size; // qilei_canvas_size：允许正方形数字或矩形宽高对象。
  qilei_canvas.width = qilei_canvas_size.width;
  qilei_canvas.height = qilei_canvas_size.height;
  qilei_canvas.setAttribute("role", "img");
  qilei_canvas.setAttribute("aria-label", qilei_label);
  qilei_host.append(qilei_canvas);
  return { canvas: qilei_canvas, context: qilei_canvas.getContext("2d") };
}

// qilei_control_button：创建一枚游戏控制按钮并绑定点击动作。
export function qilei_control_button(qilei_text, qilei_action, qilei_class_name = "") {
  const qilei_button = document.createElement("button"); // qilei_button：新建的控制按钮。
  qilei_button.type = "button";
  qilei_button.textContent = qilei_text;
  qilei_button.className = qilei_class_name;
  qilei_button.addEventListener("click", qilei_action);
  return qilei_button;
}

// qilei_random_choice：从候选数组随机选出一项；空数组返回 null。
export function qilei_random_choice(qilei_items) {
  return qilei_items.length ? qilei_items[Math.floor(Math.random() * qilei_items.length)] : null;
}

// qilei_draw_rounded_rect：绘制带可选边框的圆角矩形，兼容没有 roundRect 的浏览器。
export function qilei_draw_rounded_rect(qilei_context, qilei_x, qilei_y, qilei_width, qilei_height, qilei_radius, qilei_fill, qilei_stroke = null) {
  const qilei_radius_value = Math.min(qilei_radius, qilei_width / 2, qilei_height / 2); // qilei_radius_value：不会超过矩形尺寸的圆角半径。
  qilei_context.beginPath();
  qilei_context.moveTo(qilei_x + qilei_radius_value, qilei_y);
  qilei_context.arcTo(qilei_x + qilei_width, qilei_y, qilei_x + qilei_width, qilei_y + qilei_height, qilei_radius_value);
  qilei_context.arcTo(qilei_x + qilei_width, qilei_y + qilei_height, qilei_x, qilei_y + qilei_height, qilei_radius_value);
  qilei_context.arcTo(qilei_x, qilei_y + qilei_height, qilei_x, qilei_y, qilei_radius_value);
  qilei_context.arcTo(qilei_x, qilei_y, qilei_x + qilei_width, qilei_y, qilei_radius_value);
  qilei_context.closePath();
  if (qilei_fill) { qilei_context.fillStyle = qilei_fill; qilei_context.fill(); }
  if (qilei_stroke) { qilei_context.strokeStyle = qilei_stroke; qilei_context.stroke(); }
}
