function g() {
  return `anno_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
function f(o, t, e, n = {}, i = {}) {
  const a = Date.now();
  return {
    id: i.id || g(),
    type: o,
    canvasId: t,
    pageNumber: i.pageNumber,
    data: e,
    style: {
      strokeStyle: "#ff0000",
      fillStyle: "transparent",
      lineWidth: 2,
      opacity: 1,
      ...n
    },
    createdAt: a,
    updatedAt: a,
    author: i.author,
    selected: !1,
    locked: !1,
    zIndex: i.zIndex || 0,
    ...i
  };
}
function h(o) {
  return JSON.parse(JSON.stringify(o));
}
function C(o, t) {
  return {
    ...o,
    ...t,
    updatedAt: Date.now()
  };
}
function p(o, t) {
  return o.x >= t.x && o.x <= t.x + t.width && o.y >= t.y && o.y <= t.y + t.height;
}
function m(o, t, e) {
  const n = o.x - t.x, i = o.y - t.y;
  return Math.sqrt(n * n + i * i) <= e;
}
function v(o, t, e) {
  const n = e.x - t.x, i = e.y - t.y, a = n * n + i * i;
  if (a === 0) {
    const u = o.x - t.x, x = o.y - t.y;
    return Math.sqrt(u * u + x * x);
  }
  let s = ((o.x - t.x) * n + (o.y - t.y) * i) / a;
  s = Math.max(0, Math.min(1, s));
  const r = t.x + s * n, y = t.y + s * i, l = o.x - r, d = o.y - y;
  return Math.sqrt(l * l + d * d);
}
function w(o, t, e = 5) {
  const { data: n } = o;
  switch (n.type) {
    case "rectangle":
      return p(t, n.rect);
    case "circle":
      return m(t, n.center, n.radius);
    case "line":
    case "arrow":
      return v(t, n.start, n.end) <= e;
    case "text":
      const i = 20;
      return Math.abs(t.x - n.position.x) <= i && Math.abs(t.y - n.position.y) <= i;
    case "highlight":
      return n.rects.some((a) => p(t, a));
    case "freehand":
      return n.points.some((a) => {
        const s = t.x - a.x, r = t.y - a.y;
        return Math.sqrt(s * s + r * r) <= e;
      });
    default:
      return !1;
  }
}
function P(o) {
  const { data: t } = o;
  switch (t.type) {
    case "rectangle":
      return t.rect;
    case "circle":
      return {
        x: t.center.x - t.radius,
        y: t.center.y - t.radius,
        width: t.radius * 2,
        height: t.radius * 2
      };
    case "line":
    case "arrow": {
      const e = Math.min(t.start.x, t.end.x), n = Math.min(t.start.y, t.end.y), i = Math.max(t.start.x, t.end.x), a = Math.max(t.start.y, t.end.y);
      return {
        x: e,
        y: n,
        width: i - e,
        height: a - n
      };
    }
    case "text":
      return {
        x: t.position.x,
        y: t.position.y - 20,
        width: 100,
        height: 30
      };
    case "highlight": {
      if (t.rects.length === 0)
        return { x: 0, y: 0, width: 0, height: 0 };
      const e = Math.min(...t.rects.map((s) => s.x)), n = Math.min(...t.rects.map((s) => s.y)), i = Math.max(...t.rects.map((s) => s.x + s.width)), a = Math.max(...t.rects.map((s) => s.y + s.height));
      return {
        x: e,
        y: n,
        width: i - e,
        height: a - n
      };
    }
    case "freehand": {
      if (t.points.length === 0)
        return { x: 0, y: 0, width: 0, height: 0 };
      const e = Math.min(...t.points.map((s) => s.x)), n = Math.min(...t.points.map((s) => s.y)), i = Math.max(...t.points.map((s) => s.x)), a = Math.max(...t.points.map((s) => s.y));
      return {
        x: e,
        y: n,
        width: i - e,
        height: a - n
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}
function A(o) {
  return !(!o.type || !o.canvasId || !o.data || o.type !== o.data.type);
}
class c {
  constructor(t, e, n = {}, i = {}) {
    this.state = "idle", this.currentAnnotation = null, this.startPoint = null, this.handleMouseDown = (s) => {
      s.preventDefault();
      const r = this.getPosition(s);
      this.onStart(r);
    }, this.handleMouseMove = (s) => {
      if (this.state !== "drawing") return;
      s.preventDefault();
      const r = this.getPosition(s);
      this.onMove(r);
    }, this.handleMouseUp = (s) => {
      if (this.state !== "drawing") return;
      s.preventDefault();
      const r = this.getPosition(s);
      this.onEnd(r);
    }, this.handleMouseLeave = (s) => {
      this.state === "drawing" && this.onCancel();
    }, this.handleTouchStart = (s) => {
      s.preventDefault();
      const r = this.getPosition(s);
      this.onStart(r);
    }, this.handleTouchMove = (s) => {
      if (this.state !== "drawing") return;
      s.preventDefault();
      const r = this.getPosition(s);
      this.onMove(r);
    }, this.handleTouchEnd = (s) => {
      if (this.state !== "drawing") return;
      s.preventDefault();
      const r = this.getPosition(s);
      this.onEnd(r);
    }, this.canvas = t;
    const a = t.getContext("2d");
    if (!a)
      throw new Error("无法获取Canvas 2D上下文");
    this.ctx = a, this.canvasId = e, this.config = {
      strokeStyle: "#ff0000",
      fillStyle: "transparent",
      lineWidth: 2,
      opacity: 1,
      ...n
    }, this.callbacks = i, this.bind();
  }
  /**
   * 绑定事件监听
   */
  bind() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown), this.canvas.addEventListener("mousemove", this.handleMouseMove), this.canvas.addEventListener("mouseup", this.handleMouseUp), this.canvas.addEventListener("mouseleave", this.handleMouseLeave), this.canvas.addEventListener("touchstart", this.handleTouchStart), this.canvas.addEventListener("touchmove", this.handleTouchMove), this.canvas.addEventListener("touchend", this.handleTouchEnd);
  }
  /**
   * 解绑事件监听
   */
  unbind() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown), this.canvas.removeEventListener("mousemove", this.handleMouseMove), this.canvas.removeEventListener("mouseup", this.handleMouseUp), this.canvas.removeEventListener("mouseleave", this.handleMouseLeave), this.canvas.removeEventListener("touchstart", this.handleTouchStart), this.canvas.removeEventListener("touchmove", this.handleTouchMove), this.canvas.removeEventListener("touchend", this.handleTouchEnd);
  }
  /**
   * 获取鼠标/触摸位置（相对于Canvas）
   */
  getPosition(t) {
    const e = this.canvas.getBoundingClientRect();
    let n, i;
    if (t instanceof MouseEvent)
      n = t.clientX, i = t.clientY;
    else {
      const a = t.touches[0] || t.changedTouches[0];
      n = a.clientX, i = a.clientY;
    }
    return {
      x: n - e.left,
      y: i - e.top
    };
  }
  /**
   * 开始绘制
   */
  onStart(t) {
    this.state = "drawing", this.startPoint = t, this.startDrawing(t);
  }
  /**
   * 绘制过程
   */
  onMove(t) {
    this.startPoint && this.updateDrawing(t);
  }
  /**
   * 结束绘制
   */
  onEnd(t) {
    this.startPoint && (this.finishDrawing(t), this.state = "idle", this.startPoint = null);
  }
  /**
   * 取消绘制
   */
  onCancel() {
    var t, e;
    this.state = "idle", this.startPoint = null, this.currentAnnotation = null, (e = (t = this.callbacks).onCancel) == null || e.call(t);
  }
  /**
   * 创建批注
   */
  createAnnotationObject(t) {
    return f(t.type, this.canvasId, t, this.config);
  }
  /**
   * 触发创建回调
   */
  triggerCreate(t) {
    var e, n;
    (n = (e = this.callbacks).onCreate) == null || n.call(e, t);
  }
  /**
   * 触发更新回调
   */
  triggerUpdate(t) {
    var e, n;
    (n = (e = this.callbacks).onUpdate) == null || n.call(e, t);
  }
  /**
   * 触发完成回调
   */
  triggerComplete(t) {
    var e, n;
    (n = (e = this.callbacks).onComplete) == null || n.call(e, t);
  }
  /**
   * 应用样式
   */
  applyStyle() {
    this.ctx.strokeStyle = this.config.strokeStyle || "#ff0000", this.ctx.fillStyle = this.config.fillStyle || "transparent", this.ctx.lineWidth = this.config.lineWidth || 2, this.ctx.globalAlpha = this.config.opacity ?? 1, this.config.lineDash ? this.ctx.setLineDash(this.config.lineDash) : this.ctx.setLineDash([]);
  }
  /**
   * 销毁工具
   */
  destroy() {
    this.unbind(), this.currentAnnotation = null, this.startPoint = null;
  }
  /**
   * 获取当前状态
   */
  getState() {
    return this.state;
  }
  /**
   * 更新配置
   */
  updateConfig(t) {
    this.config = { ...this.config, ...t };
  }
}
class M extends c {
  startDrawing(t) {
    const e = {
      type: "rectangle",
      rect: {
        x: t.x,
        y: t.y,
        width: 0,
        height: 0
      }
    };
    this.currentAnnotation = this.createAnnotationObject(e), this.triggerCreate(this.currentAnnotation);
  }
  updateDrawing(t) {
    if (!this.currentAnnotation || !this.startPoint) return;
    const e = this.currentAnnotation.data;
    e.rect.width = t.x - this.startPoint.x, e.rect.height = t.y - this.startPoint.y, this.currentAnnotation.updatedAt = Date.now(), this.drawPreview(), this.triggerUpdate(this.currentAnnotation);
  }
  finishDrawing(t) {
    if (!this.currentAnnotation || !this.startPoint) return;
    const e = this.currentAnnotation.data;
    if (e.rect.width = t.x - this.startPoint.x, e.rect.height = t.y - this.startPoint.y, Math.abs(e.rect.width) < 5 || Math.abs(e.rect.height) < 5) {
      this.onCancel();
      return;
    }
    this.currentAnnotation.updatedAt = Date.now(), this.triggerComplete(this.currentAnnotation), this.currentAnnotation = null;
  }
  createAnnotationData(t, e) {
    return {
      type: "rectangle",
      rect: {
        x: t.x,
        y: t.y,
        width: e.x - t.x,
        height: e.y - t.y
      }
    };
  }
  /**
   * 绘制预览
   */
  drawPreview() {
    if (!this.currentAnnotation) return;
    const t = this.currentAnnotation.data;
    this.applyStyle(), this.ctx.strokeRect(
      t.rect.x,
      t.rect.y,
      t.rect.width,
      t.rect.height
    ), this.config.fillStyle && this.config.fillStyle !== "transparent" && this.ctx.fillRect(
      t.rect.x,
      t.rect.y,
      t.rect.width,
      t.rect.height
    );
  }
}
class S extends c {
  startDrawing(t) {
    const e = {
      type: "circle",
      center: t,
      radius: 0
    };
    this.currentAnnotation = this.createAnnotationObject(e), this.triggerCreate(this.currentAnnotation);
  }
  updateDrawing(t) {
    if (!this.currentAnnotation || !this.startPoint) return;
    const e = this.currentAnnotation.data, n = t.x - this.startPoint.x, i = t.y - this.startPoint.y;
    e.radius = Math.sqrt(n * n + i * i), this.currentAnnotation.updatedAt = Date.now(), this.drawPreview(), this.triggerUpdate(this.currentAnnotation);
  }
  finishDrawing(t) {
    if (!this.currentAnnotation || !this.startPoint) return;
    const e = this.currentAnnotation.data, n = t.x - this.startPoint.x, i = t.y - this.startPoint.y;
    if (e.radius = Math.sqrt(n * n + i * i), e.radius < 5) {
      this.onCancel();
      return;
    }
    this.currentAnnotation.updatedAt = Date.now(), this.triggerComplete(this.currentAnnotation), this.currentAnnotation = null;
  }
  createAnnotationData(t, e) {
    const n = e.x - t.x, i = e.y - t.y;
    return {
      type: "circle",
      center: t,
      radius: Math.sqrt(n * n + i * i)
    };
  }
  drawPreview() {
    if (!this.currentAnnotation) return;
    const t = this.currentAnnotation.data;
    this.applyStyle(), this.ctx.beginPath(), this.ctx.arc(t.center.x, t.center.y, t.radius, 0, 2 * Math.PI), this.ctx.stroke(), this.config.fillStyle && this.config.fillStyle !== "transparent" && this.ctx.fill();
  }
}
class E extends c {
  startDrawing(t) {
    const e = {
      type: "line",
      start: t,
      end: t
    };
    this.currentAnnotation = this.createAnnotationObject(e), this.triggerCreate(this.currentAnnotation);
  }
  updateDrawing(t) {
    if (!this.currentAnnotation) return;
    const e = this.currentAnnotation.data;
    e.end = t, this.currentAnnotation.updatedAt = Date.now(), this.drawPreview(), this.triggerUpdate(this.currentAnnotation);
  }
  finishDrawing(t) {
    if (!this.currentAnnotation || !this.startPoint) return;
    const e = this.currentAnnotation.data;
    e.end = t;
    const n = t.x - this.startPoint.x, i = t.y - this.startPoint.y;
    if (Math.sqrt(n * n + i * i) < 5) {
      this.onCancel();
      return;
    }
    this.currentAnnotation.updatedAt = Date.now(), this.triggerComplete(this.currentAnnotation), this.currentAnnotation = null;
  }
  createAnnotationData(t, e) {
    return {
      type: "line",
      start: t,
      end: e
    };
  }
  drawPreview() {
    if (!this.currentAnnotation) return;
    const t = this.currentAnnotation.data;
    this.applyStyle(), this.ctx.beginPath(), this.ctx.moveTo(t.start.x, t.start.y), this.ctx.lineTo(t.end.x, t.end.y), this.ctx.stroke();
  }
}
class k extends c {
  constructor() {
    super(...arguments), this.inputElement = null;
  }
  startDrawing(t) {
    this.createInputElement(t);
  }
  updateDrawing(t) {
  }
  finishDrawing(t) {
  }
  createAnnotationData(t, e) {
    return {
      type: "text",
      position: t,
      content: ""
    };
  }
  /**
   * 创建输入元素
   */
  createInputElement(t) {
    var e;
    this.removeInputElement(), this.inputElement = document.createElement("input"), this.inputElement.type = "text", this.inputElement.style.position = "absolute", this.inputElement.style.left = `${t.x + this.canvas.offsetLeft}px`, this.inputElement.style.top = `${t.y + this.canvas.offsetTop}px`, this.inputElement.style.fontSize = `${this.config.fontSize || 16}px`, this.inputElement.style.fontFamily = this.config.fontFamily || "Arial", this.inputElement.style.color = this.config.strokeStyle || "#000", this.inputElement.style.border = "1px solid #ccc", this.inputElement.style.padding = "2px 4px", this.inputElement.style.zIndex = "1000", this.inputElement.addEventListener("keydown", (n) => {
      n.key === "Enter" ? this.completeTextInput(t) : n.key === "Escape" && (this.removeInputElement(), this.onCancel());
    }), this.inputElement.addEventListener("blur", () => {
      this.completeTextInput(t);
    }), (e = this.canvas.parentElement) == null || e.appendChild(this.inputElement), this.inputElement.focus();
  }
  /**
   * 完成文字输入
   */
  completeTextInput(t) {
    if (!this.inputElement) return;
    const e = this.inputElement.value.trim();
    if (this.removeInputElement(), !e) {
      this.onCancel();
      return;
    }
    const n = {
      type: "text",
      position: t,
      content: e
    };
    this.currentAnnotation = this.createAnnotationObject(n), this.triggerCreate(this.currentAnnotation), this.triggerComplete(this.currentAnnotation), this.currentAnnotation = null, this.state = "idle";
  }
  /**
   * 移除输入元素
   */
  removeInputElement() {
    this.inputElement && (this.inputElement.remove(), this.inputElement = null);
  }
  destroy() {
    this.removeInputElement(), super.destroy();
  }
}
class T {
  constructor(t) {
    this.ctx = t;
  }
  /**
   * 渲染单个批注
   */
  render(t) {
    switch (this.ctx.save(), this.ctx.globalAlpha = t.style.opacity ?? 1, t.type) {
      case "rectangle":
        this.renderRectangle(t);
        break;
      case "circle":
        this.renderCircle(t);
        break;
      case "line":
        this.renderLine(t);
        break;
      case "arrow":
        this.renderArrow(t);
        break;
      case "text":
        this.renderText(t);
        break;
      case "highlight":
        this.renderHighlight(t);
        break;
      case "freehand":
        this.renderFreehand(t);
        break;
    }
    t.selected && this.renderSelectionBox(t), this.ctx.restore();
  }
  /**
   * 渲染多个批注
   */
  renderAll(t) {
    const e = [...t].sort((n, i) => (n.zIndex || 0) - (i.zIndex || 0));
    for (const n of e)
      this.render(n);
  }
  /**
   * 渲染矩形
   */
  renderRectangle(t) {
    const e = t.data, { style: n } = t;
    this.applyStyle(n), this.ctx.strokeRect(e.rect.x, e.rect.y, e.rect.width, e.rect.height), n.fillStyle && n.fillStyle !== "transparent" && this.ctx.fillRect(e.rect.x, e.rect.y, e.rect.width, e.rect.height);
  }
  /**
   * 渲染圆形
   */
  renderCircle(t) {
    const e = t.data, { style: n } = t;
    this.applyStyle(n), this.ctx.beginPath(), this.ctx.arc(e.center.x, e.center.y, e.radius, 0, 2 * Math.PI), this.ctx.stroke(), n.fillStyle && n.fillStyle !== "transparent" && this.ctx.fill();
  }
  /**
   * 渲染线条
   */
  renderLine(t) {
    const e = t.data, { style: n } = t;
    this.applyStyle(n), this.ctx.beginPath(), this.ctx.moveTo(e.start.x, e.start.y), this.ctx.lineTo(e.end.x, e.end.y), this.ctx.stroke();
  }
  /**
   * 渲染箭头
   */
  renderArrow(t) {
    const e = t.data, { style: n } = t;
    this.applyStyle(n), this.ctx.beginPath(), this.ctx.moveTo(e.start.x, e.start.y), this.ctx.lineTo(e.end.x, e.end.y), this.ctx.stroke();
    const i = e.headSize || 10, a = e.end.x - e.start.x, s = e.end.y - e.start.y, r = Math.atan2(s, a);
    this.ctx.beginPath(), this.ctx.moveTo(e.end.x, e.end.y), this.ctx.lineTo(
      e.end.x - i * Math.cos(r - Math.PI / 6),
      e.end.y - i * Math.sin(r - Math.PI / 6)
    ), this.ctx.moveTo(e.end.x, e.end.y), this.ctx.lineTo(
      e.end.x - i * Math.cos(r + Math.PI / 6),
      e.end.y - i * Math.sin(r + Math.PI / 6)
    ), this.ctx.stroke();
  }
  /**
   * 渲染文字
   */
  renderText(t) {
    const e = t.data, { style: n } = t;
    this.ctx.fillStyle = n.strokeStyle || "#000", this.ctx.font = `${n.fontSize || 16}px ${n.fontFamily || "Arial"}`, this.ctx.fillText(
      e.content,
      e.position.x,
      e.position.y,
      e.maxWidth
    );
  }
  /**
   * 渲染高亮
   */
  renderHighlight(t) {
    const e = t.data, { style: n } = t;
    this.ctx.fillStyle = n.fillStyle || "rgba(255, 255, 0, 0.3)";
    for (const i of e.rects)
      this.ctx.fillRect(i.x, i.y, i.width, i.height);
  }
  /**
   * 渲染手绘
   */
  renderFreehand(t) {
    const e = t.data, { style: n } = t;
    if (!(e.points.length < 2)) {
      this.applyStyle(n), this.ctx.beginPath(), this.ctx.moveTo(e.points[0].x, e.points[0].y);
      for (let i = 1; i < e.points.length; i++)
        this.ctx.lineTo(e.points[i].x, e.points[i].y);
      this.ctx.stroke();
    }
  }
  /**
   * 渲染选择框
   */
  renderSelectionBox(t) {
    const e = this.getAnnotationBounds(t);
    this.ctx.strokeStyle = "#0066ff", this.ctx.lineWidth = 2, this.ctx.setLineDash([5, 5]);
    const n = 5;
    this.ctx.strokeRect(
      e.x - n,
      e.y - n,
      e.width + n * 2,
      e.height + n * 2
    ), this.ctx.setLineDash([]);
  }
  /**
   * 获取批注边界框
   */
  getAnnotationBounds(t) {
    const { data: e } = t;
    switch (e.type) {
      case "rectangle":
        return e.rect;
      case "circle":
        return {
          x: e.center.x - e.radius,
          y: e.center.y - e.radius,
          width: e.radius * 2,
          height: e.radius * 2
        };
      case "line":
      case "arrow": {
        const n = Math.min(e.start.x, e.end.x), i = Math.min(e.start.y, e.end.y), a = Math.max(e.start.x, e.end.x), s = Math.max(e.start.y, e.end.y);
        return { x: n, y: i, width: a - n, height: s - i };
      }
      case "text":
        return {
          x: e.position.x,
          y: e.position.y - 20,
          width: 100,
          height: 30
        };
      case "highlight": {
        if (e.rects.length === 0)
          return { x: 0, y: 0, width: 0, height: 0 };
        const n = Math.min(...e.rects.map((r) => r.x)), i = Math.min(...e.rects.map((r) => r.y)), a = Math.max(...e.rects.map((r) => r.x + r.width)), s = Math.max(...e.rects.map((r) => r.y + r.height));
        return { x: n, y: i, width: a - n, height: s - i };
      }
      case "freehand": {
        if (e.points.length === 0)
          return { x: 0, y: 0, width: 0, height: 0 };
        const n = Math.min(...e.points.map((r) => r.x)), i = Math.min(...e.points.map((r) => r.y)), a = Math.max(...e.points.map((r) => r.x)), s = Math.max(...e.points.map((r) => r.y));
        return { x: n, y: i, width: a - n, height: s - i };
      }
      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
  /**
   * 应用样式
   */
  applyStyle(t) {
    this.ctx.strokeStyle = t.strokeStyle || "#ff0000", this.ctx.fillStyle = t.fillStyle || "transparent", this.ctx.lineWidth = t.lineWidth || 2, t.lineDash ? this.ctx.setLineDash(t.lineDash) : this.ctx.setLineDash([]);
  }
  /**
   * 清空Canvas
   */
  clear(t, e) {
    this.ctx.clearRect(0, 0, t, e);
  }
}
class D {
  constructor(t = 50) {
    this.undoStack = [], this.redoStack = [], this.maxStackSize = t;
  }
  /**
   * 记录创建操作
   */
  recordCreate(t) {
    const e = {
      type: "create",
      annotation: h(t),
      timestamp: Date.now()
    };
    this.pushAction(e);
  }
  /**
   * 记录更新操作
   */
  recordUpdate(t, e) {
    const n = {
      type: "update",
      annotation: h(t),
      previousState: h(e),
      timestamp: Date.now()
    };
    this.pushAction(n);
  }
  /**
   * 记录删除操作
   */
  recordDelete(t) {
    const e = {
      type: "delete",
      annotation: h(t),
      timestamp: Date.now()
    };
    this.pushAction(e);
  }
  /**
   * 添加操作到撤销栈
   */
  pushAction(t) {
    this.undoStack.push(t), this.undoStack.length > this.maxStackSize && this.undoStack.shift(), this.redoStack = [];
  }
  /**
   * 撤销
   */
  undo() {
    const t = this.undoStack.pop();
    return t ? (this.redoStack.push(t), t) : null;
  }
  /**
   * 重做
   */
  redo() {
    const t = this.redoStack.pop();
    return t ? (this.undoStack.push(t), t) : null;
  }
  /**
   * 是否可撤销
   */
  canUndo() {
    return this.undoStack.length > 0;
  }
  /**
   * 是否可重做
   */
  canRedo() {
    return this.redoStack.length > 0;
  }
  /**
   * 清空历史记录
   */
  clear() {
    this.undoStack = [], this.redoStack = [];
  }
}
class b {
  /**
   * 导出为JSON
   */
  exportJSON(t, e = {}) {
    const n = {
      version: "1.0.0",
      metadata: e.includeMetadata ? {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalCount: t.length
      } : void 0,
      annotations: t
    };
    return e.pretty ? JSON.stringify(n, null, 2) : JSON.stringify(n);
  }
  /**
   * 从JSON导入
   */
  importJSON(t, e = {}) {
    try {
      const n = JSON.parse(t);
      if (!n.annotations || !Array.isArray(n.annotations))
        throw new Error("Invalid JSON format: missing annotations array");
      const i = [];
      for (const a of n.annotations) {
        if (e.validate && !A(a)) {
          console.warn("Invalid annotation skipped:", a);
          continue;
        }
        i.push(a);
      }
      return i;
    } catch (n) {
      throw console.error("Failed to import JSON:", n), n;
    }
  }
}
class I {
  constructor(t) {
    this.annotations = /* @__PURE__ */ new Map(), this.tools = /* @__PURE__ */ new Map(), this.activeTool = null, this.activeToolName = null, this.undoManager = null, this.listeners = /* @__PURE__ */ new Map(), this.selectedAnnotation = null, this.canvas = t.canvas;
    const e = this.canvas.getContext("2d");
    if (!e)
      throw new Error("无法获取Canvas 2D上下文");
    this.ctx = e, this.canvasId = t.canvasId, this.renderer = new T(this.ctx), this.serializer = new b(), t.enableUndo !== !1 && (this.undoManager = new D(t.maxUndoStack)), this.registerTool("rectangle", M), this.registerTool("circle", S), this.registerTool("line", E), this.registerTool("text", k), this.bindCanvasEvents();
  }
  /**
   * 注册工具
   */
  registerTool(t, e) {
    this.tools.set(t, e);
  }
  /**
   * 激活工具
   */
  activateTool(t, e = {}) {
    this.activeTool && (this.activeTool.destroy(), this.emit("tool-deactivated", { toolName: this.activeToolName }));
    const n = this.tools.get(t);
    if (!n)
      throw new Error(`Tool "${t}" not registered`);
    this.activeTool = new n(this.canvas, this.canvasId, e, {
      onCreate: (i) => this.handleAnnotationCreate(i),
      onUpdate: (i) => this.handleAnnotationUpdate(i),
      onComplete: (i) => this.handleAnnotationComplete(i)
    }), this.activeToolName = t, this.emit("tool-activated", { toolName: t });
  }
  /**
   * 停用工具
   */
  deactivateTool() {
    this.activeTool && (this.activeTool.destroy(), this.emit("tool-deactivated", { toolName: this.activeToolName }), this.activeTool = null, this.activeToolName = null);
  }
  /**
   * 添加批注
   */
  addAnnotation(t) {
    this.annotations.set(t.id, t), this.emit("annotation-created", { annotation: t }), this.render();
  }
  /**
   * 更新批注
   */
  updateAnnotation(t, e) {
    const n = this.annotations.get(t);
    if (!n) return;
    const i = { ...n };
    Object.assign(n, e, { updatedAt: Date.now() }), this.undoManager && this.undoManager.recordUpdate(n, i), this.emit("annotation-updated", { annotation: n }), this.render();
  }
  /**
   * 删除批注
   */
  deleteAnnotation(t) {
    const e = this.annotations.get(t);
    e && (this.undoManager && this.undoManager.recordDelete(e), this.annotations.delete(t), this.emit("annotation-deleted", { annotation: e }), this.render());
  }
  /**
   * 获取批注
   */
  getAnnotation(t) {
    return this.annotations.get(t);
  }
  /**
   * 获取所有批注
   */
  getAnnotations(t) {
    const e = Array.from(this.annotations.values());
    return t ? e.filter((n) => n.canvasId === t) : e;
  }
  /**
   * 选中批注
   */
  selectAnnotation(t) {
    if (this.selectedAnnotation && (this.selectedAnnotation.selected = !1, this.emit("annotation-deselected", { annotation: this.selectedAnnotation })), t) {
      const e = this.annotations.get(t);
      e && (e.selected = !0, this.selectedAnnotation = e, this.emit("annotation-selected", { annotation: e }));
    } else
      this.selectedAnnotation = null;
    this.render();
  }
  /**
   * 撤销
   */
  undo() {
    if (!this.undoManager) return;
    const t = this.undoManager.undo();
    if (t) {
      switch (t.type) {
        case "create":
          this.annotations.delete(t.annotation.id);
          break;
        case "update":
          t.previousState && this.annotations.set(t.annotation.id, t.previousState);
          break;
        case "delete":
          this.annotations.set(t.annotation.id, t.annotation);
          break;
      }
      this.render();
    }
  }
  /**
   * 重做
   */
  redo() {
    if (!this.undoManager) return;
    const t = this.undoManager.redo();
    if (t) {
      switch (t.type) {
        case "create":
          this.annotations.set(t.annotation.id, t.annotation);
          break;
        case "update":
          this.annotations.set(t.annotation.id, t.annotation);
          break;
        case "delete":
          this.annotations.delete(t.annotation.id);
          break;
      }
      this.render();
    }
  }
  /**
   * 导出批注
   */
  exportAnnotations(t) {
    const e = this.getAnnotations();
    return this.serializer.exportJSON(e, t);
  }
  /**
   * 导入批注
   */
  importAnnotations(t, e) {
    const n = typeof t == "string" ? t : JSON.stringify(t), i = this.serializer.importJSON(n, e);
    e != null && e.merge || this.annotations.clear();
    for (const a of i)
      this.annotations.set(a.id, a);
    this.render();
  }
  /**
   * 渲染所有批注
   */
  render() {
    this.renderer.clear(this.canvas.width, this.canvas.height), this.renderer.renderAll(this.getAnnotations());
  }
  /**
   * 监听事件
   */
  on(t, e) {
    this.listeners.has(t) || this.listeners.set(t, /* @__PURE__ */ new Set()), this.listeners.get(t).add(e);
  }
  /**
   * 移除监听
   */
  off(t, e) {
    var n;
    (n = this.listeners.get(t)) == null || n.delete(e);
  }
  /**
   * 触发事件
   */
  emit(t, e = {}) {
    var i;
    const n = {
      type: t,
      ...e,
      timestamp: Date.now()
    };
    (i = this.listeners.get(t)) == null || i.forEach((a) => {
      try {
        a(n);
      } catch (s) {
        console.error(`Error in event listener (${t}):`, s);
      }
    });
  }
  /**
   * 处理批注创建
   */
  handleAnnotationCreate(t) {
  }
  /**
   * 处理批注更新
   */
  handleAnnotationUpdate(t) {
    this.render();
  }
  /**
   * 处理批注完成
   */
  handleAnnotationComplete(t) {
    this.addAnnotation(t), this.undoManager && this.undoManager.recordCreate(t);
  }
  /**
   * 绑定Canvas点击事件（用于选择批注）
   */
  bindCanvasEvents() {
    this.canvas.addEventListener("click", (t) => {
      if (this.activeTool) return;
      const e = this.canvas.getBoundingClientRect(), n = {
        x: t.clientX - e.left,
        y: t.clientY - e.top
      }, i = this.getAnnotations().sort((a, s) => (s.zIndex || 0) - (a.zIndex || 0));
      for (const a of i)
        if (w(a, n)) {
          this.selectAnnotation(a.id);
          return;
        }
      this.selectAnnotation(null);
    });
  }
  /**
   * 销毁管理器
   */
  destroy() {
    var t;
    this.deactivateTool(), this.annotations.clear(), this.listeners.clear(), (t = this.undoManager) == null || t.clear();
  }
}
export {
  I as AnnotationManager,
  T as AnnotationRenderer,
  c as BaseTool,
  S as CircleTool,
  E as LineTool,
  M as RectangleTool,
  b as Serializer,
  k as TextTool,
  D as UndoManager,
  w as annotationContainsPoint,
  h as cloneAnnotation,
  f as createAnnotation,
  v as distanceToLine,
  g as generateId,
  P as getAnnotationBounds,
  m as isPointInCircle,
  p as isPointInRect,
  C as updateAnnotation,
  A as validateAnnotation
};
//# sourceMappingURL=canvas-annotations.es.js.map
