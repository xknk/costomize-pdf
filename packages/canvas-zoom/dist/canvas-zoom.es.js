class c {
  constructor(e = {}) {
    this.minScale = e.minScale || 0.5, this.maxScale = e.maxScale || 5, this.zoomSpeed = e.zoomSpeed || 0.1;
  }
  /**
   * 计算新的缩放比例
   */
  calculateNewScale(e, t) {
    const s = t > 0 ? 1 - this.zoomSpeed : 1 + this.zoomSpeed;
    let i = e * s;
    return i = Math.max(this.minScale, Math.min(this.maxScale, i)), i;
  }
  /**
   * 计算缩放中心点偏移
   */
  calculateOffset(e, t, s, i) {
    const r = i / s;
    return t - (t - e) * r;
  }
}
class d extends c {
  constructor(e) {
    super(e);
  }
  /**
   * 应用CSS transform缩放
   */
  applyZoom(e, t) {
    const { scale: s, offsetX: i, offsetY: r } = t;
    e.style.transform = `translate(${i}px, ${r}px) scale(${s})`, e.style.transformOrigin = "0 0", e.style.willChange = "transform";
  }
  /**
   * 重置变换
   */
  resetZoom(e) {
    e.style.transform = "", e.style.transformOrigin = "", e.style.willChange = "";
  }
  /**
   * 执行缩放（带中心点）
   */
  zoom(e, t, s, i, r) {
    const n = this.calculateNewScale(t.scale, s);
    let o = t.offsetX, a = t.offsetY;
    i !== void 0 && r !== void 0 && (o = this.calculateOffset(
      t.offsetX,
      i,
      t.scale,
      n
    ), a = this.calculateOffset(
      t.offsetY,
      r,
      t.scale,
      n
    ));
    const h = {
      scale: n,
      offsetX: o,
      offsetY: a
    };
    return this.applyZoom(e, h), h;
  }
}
class f extends c {
  constructor(e = {}) {
    super(e), this.rerenderTimer = null, this.rerenderDelay = e.rerenderDelay || 300;
  }
  /**
   * 设置重渲染回调
   */
  setRerenderCallback(e) {
    this.onRerender = e;
  }
  /**
   * 应用缩放（先CSS，后重渲染）
   */
  applyZoom(e, t) {
    const { scale: s, offsetX: i, offsetY: r } = t;
    e.style.transform = `translate(${i}px, ${r}px) scale(${s})`, e.style.transformOrigin = "0 0", this.rerenderTimer !== null && clearTimeout(this.rerenderTimer), this.rerenderTimer = window.setTimeout(() => {
      this.triggerRerender(e, s), this.rerenderTimer = null;
    }, this.rerenderDelay);
  }
  /**
   * 触发重渲染
   */
  triggerRerender(e, t) {
    this.onRerender && this.onRerender(t);
  }
  /**
   * 重置变换
   */
  resetZoom(e) {
    e.style.transform = "", e.style.transformOrigin = "", this.rerenderTimer !== null && (clearTimeout(this.rerenderTimer), this.rerenderTimer = null);
  }
  /**
   * 执行缩放
   */
  zoom(e, t, s, i, r) {
    const n = this.calculateNewScale(t.scale, s);
    let o = t.offsetX, a = t.offsetY;
    i !== void 0 && r !== void 0 && (o = this.calculateOffset(
      t.offsetX,
      i,
      t.scale,
      n
    ), a = this.calculateOffset(
      t.offsetY,
      r,
      t.scale,
      n
    ));
    const h = {
      scale: n,
      offsetX: o,
      offsetY: a
    };
    return this.applyZoom(e, h), h;
  }
  /**
   * 销毁
   */
  destroy() {
    this.rerenderTimer !== null && (clearTimeout(this.rerenderTimer), this.rerenderTimer = null), this.onRerender = void 0;
  }
}
class m extends c {
  constructor(e = {}) {
    super(e), this.rerenderTimer = null, this.baseScale = 1, this.rerenderThreshold = e.rerenderThreshold || 0.3, this.rerenderDelay = e.rerenderDelay || 300;
  }
  /**
   * 设置重渲染回调
   */
  setRerenderCallback(e) {
    this.onRerender = e;
  }
  /**
   * 更新基础scale（重渲染完成后调用）
   */
  updateBaseScale(e) {
    this.baseScale = e;
  }
  /**
   * 应用缩放
   */
  applyZoom(e, t) {
    const { scale: s, offsetX: i, offsetY: r } = t, n = s / this.baseScale;
    e.style.transform = `translate(${i}px, ${r}px) scale(${n})`, e.style.transformOrigin = "0 0", Math.abs(s - this.baseScale) / this.baseScale > this.rerenderThreshold && (this.rerenderTimer !== null && clearTimeout(this.rerenderTimer), this.rerenderTimer = window.setTimeout(() => {
      this.triggerRerender(e, s), this.rerenderTimer = null;
    }, this.rerenderDelay));
  }
  /**
   * 触发重渲染
   */
  triggerRerender(e, t) {
    this.onRerender && this.onRerender(t);
  }
  /**
   * 重置CSS变换（保持baseScale）
   */
  resetZoom(e) {
    e.style.transform = "", e.style.transformOrigin = "", this.rerenderTimer !== null && (clearTimeout(this.rerenderTimer), this.rerenderTimer = null);
  }
  /**
   * 执行缩放
   */
  zoom(e, t, s, i, r) {
    const n = this.calculateNewScale(t.scale, s);
    let o = t.offsetX, a = t.offsetY;
    i !== void 0 && r !== void 0 && (o = this.calculateOffset(
      t.offsetX,
      i,
      t.scale,
      n
    ), a = this.calculateOffset(
      t.offsetY,
      r,
      t.scale,
      n
    ));
    const h = {
      scale: n,
      offsetX: o,
      offsetY: a
    };
    return this.applyZoom(e, h), h;
  }
  /**
   * 销毁
   */
  destroy() {
    this.rerenderTimer !== null && (clearTimeout(this.rerenderTimer), this.rerenderTimer = null), this.onRerender = void 0;
  }
}
class u {
  constructor(e, t, s = {}) {
    this.debounceTimer = null, this.handleWheel = (i) => {
      if (this.options.requireCtrl && !i.ctrlKey && !i.metaKey)
        return;
      this.options.preventDefault && i.preventDefault();
      const r = this.element.getBoundingClientRect(), n = i.clientX - r.left, o = i.clientY - r.top, a = this.normalizeDelta(i);
      this.options.debounceTime > 0 ? (this.debounceTimer !== null && clearTimeout(this.debounceTimer), this.debounceTimer = window.setTimeout(() => {
        this.handler(a, n, o, i), this.debounceTimer = null;
      }, this.options.debounceTime)) : this.handler(a, n, o, i);
    }, this.element = e, this.handler = t, this.options = {
      requireCtrl: s.requireCtrl !== !1,
      preventDefault: s.preventDefault !== !1,
      debounceTime: s.debounceTime || 0
    }, this.bind();
  }
  /**
   * 绑定事件
   */
  bind() {
    this.element.addEventListener("wheel", this.handleWheel, { passive: !1 });
  }
  /**
   * 归一化滚轮增量
   */
  normalizeDelta(e) {
    let t = e.deltaY;
    return e.deltaMode === WheelEvent.DOM_DELTA_LINE ? t *= 40 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t *= 800), t = Math.max(-100, Math.min(100, t)), t;
  }
  /**
   * 解绑事件
   */
  destroy() {
    this.element.removeEventListener("wheel", this.handleWheel), this.debounceTimer !== null && (clearTimeout(this.debounceTimer), this.debounceTimer = null);
  }
}
class S {
  constructor(e, t, s = {}) {
    this.lastDistance = 0, this.isPinching = !1, this.handleTouchStart = (i) => {
      i.touches.length === 2 && (this.options.preventDefault && i.preventDefault(), this.isPinching = !0, this.lastDistance = this.getDistance(i.touches[0], i.touches[1]));
    }, this.handleTouchMove = (i) => {
      if (!this.isPinching || i.touches.length !== 2)
        return;
      this.options.preventDefault && i.preventDefault();
      const r = this.getDistance(i.touches[0], i.touches[1]), n = this.getCenter(i.touches[0], i.touches[1]);
      if (!(Math.abs(r - this.lastDistance) < this.options.minDistance && this.lastDistance > 0)) {
        if (this.lastDistance > 0) {
          const a = r / this.lastDistance;
          this.handler(a, n.x, n.y, i);
        }
        this.lastDistance = r;
      }
    }, this.handleTouchEnd = () => {
      this.isPinching = !1, this.lastDistance = 0;
    }, this.element = e, this.handler = t, this.options = {
      preventDefault: s.preventDefault !== !1,
      minDistance: s.minDistance || 20
    }, this.bind();
  }
  /**
   * 绑定事件
   */
  bind() {
    this.element.addEventListener("touchstart", this.handleTouchStart, { passive: !1 }), this.element.addEventListener("touchmove", this.handleTouchMove, { passive: !1 }), this.element.addEventListener("touchend", this.handleTouchEnd), this.element.addEventListener("touchcancel", this.handleTouchEnd);
  }
  /**
   * 计算两点距离
   */
  getDistance(e, t) {
    const s = t.clientX - e.clientX, i = t.clientY - e.clientY;
    return Math.sqrt(s * s + i * i);
  }
  /**
   * 计算两点中心
   */
  getCenter(e, t) {
    const s = this.element.getBoundingClientRect();
    return {
      x: (e.clientX + t.clientX) / 2 - s.left,
      y: (e.clientY + t.clientY) / 2 - s.top
    };
  }
  /**
   * 解绑事件
   */
  destroy() {
    this.element.removeEventListener("touchstart", this.handleTouchStart), this.element.removeEventListener("touchmove", this.handleTouchMove), this.element.removeEventListener("touchend", this.handleTouchEnd), this.element.removeEventListener("touchcancel", this.handleTouchEnd), this.isPinching = !1, this.lastDistance = 0;
  }
}
class p {
  constructor(e) {
    if (this.listeners = /* @__PURE__ */ new Map(), this.handleWheelZoom = (t, s, i) => {
      this.emit("zoom-start", this.currentState);
      const r = { ...this.currentState };
      this.currentState = this.transform.zoom(
        this.element,
        this.currentState,
        t,
        s,
        i
      ), this.emit("zoom-change", this.currentState, r), this.emit("zoom-end", this.currentState);
    }, this.handlePinchZoom = (t, s, i) => {
      this.emit("zoom-start", this.currentState);
      const r = { ...this.currentState }, n = t > 1 ? -50 : 50;
      this.currentState = this.transform.zoom(
        this.element,
        this.currentState,
        n,
        s,
        i
      ), this.emit("zoom-change", this.currentState, r), this.emit("zoom-end", this.currentState);
    }, this.handleDoubleClick = (t) => {
      const s = this.container.getBoundingClientRect(), i = t.clientX - s.left, r = t.clientY - s.top, n = this.currentState.scale > 1.5 ? 1 : 2;
      this.zoomTo(n, i, r);
    }, this.handleRerender = (t) => {
      this.emit("rerender-start", { ...this.currentState, scale: t });
    }, this.container = typeof e.container == "string" ? document.querySelector(e.container) : e.container, !this.container)
      throw new Error("ZoomManager: 容器元素不存在");
    if (this.element = this.container.firstElementChild, !this.element)
      throw new Error("ZoomManager: 容器内没有可缩放的元素");
    this.config = {
      strategy: e.strategy || "hybrid",
      minScale: e.minScale ?? 0.5,
      maxScale: e.maxScale ?? 5,
      initialScale: e.initialScale ?? 1,
      zoomSpeed: e.zoomSpeed ?? 0.1,
      rerenderThreshold: e.rerenderThreshold ?? 0.3,
      rerenderDelay: e.rerenderDelay ?? 300,
      gestures: e.gestures ?? { wheel: !0, pinch: !0, doubleClick: !1 }
    }, this.strategy = this.config.strategy, this.currentState = {
      scale: this.config.initialScale,
      offsetX: 0,
      offsetY: 0
    }, this.transform = this.createTransform(this.strategy), this.initGestures(), this.transform.applyZoom(this.element, this.currentState);
  }
  /**
   * 创建变换策略实例
   */
  createTransform(e) {
    const t = {
      minScale: this.config.minScale,
      maxScale: this.config.maxScale,
      zoomSpeed: this.config.zoomSpeed
    };
    switch (e) {
      case "instant":
        return new d(t);
      case "deferred": {
        const s = new f({
          ...t,
          rerenderDelay: this.config.rerenderDelay
        });
        return s.setRerenderCallback(this.handleRerender), s;
      }
      case "hybrid": {
        const s = new m({
          ...t,
          rerenderThreshold: this.config.rerenderThreshold,
          rerenderDelay: this.config.rerenderDelay
        });
        return s.setRerenderCallback(this.handleRerender), s;
      }
      default:
        throw new Error(`ZoomManager: 未知的缩放策略 "${e}"`);
    }
  }
  /**
   * 初始化手势识别
   */
  initGestures() {
    const { gestures: e } = this.config;
    if (e.wheel) {
      const t = typeof e.wheel == "object" ? e.wheel : { requireCtrl: !0, preventDefault: !0 };
      this.wheelGesture = new u(
        this.container,
        this.handleWheelZoom,
        t
      );
    }
    if (e.pinch) {
      const t = typeof e.pinch == "object" ? e.pinch : { preventDefault: !0 };
      this.pinchGesture = new S(
        this.container,
        this.handlePinchZoom,
        t
      );
    }
    e.doubleClick && this.container.addEventListener("dblclick", this.handleDoubleClick);
  }
  /**
   * 重渲染完成回调（由外部调用）
   */
  onRerenderComplete(e) {
    this.transform instanceof m ? (this.transform.updateBaseScale(e), this.transform.resetZoom(this.element)) : this.transform instanceof f && this.transform.resetZoom(this.element), this.currentState.scale = e, this.emit("rerender-end", this.currentState);
  }
  /**
   * 放大
   */
  zoomIn(e, t) {
    this.emit("zoom-start", this.currentState);
    const s = { ...this.currentState };
    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      -50,
      // 负值表示放大
      e,
      t
    ), this.emit("zoom-change", this.currentState, s), this.emit("zoom-end", this.currentState);
  }
  /**
   * 缩小
   */
  zoomOut(e, t) {
    this.emit("zoom-start", this.currentState);
    const s = { ...this.currentState };
    this.currentState = this.transform.zoom(
      this.element,
      this.currentState,
      50,
      // 正值表示缩小
      e,
      t
    ), this.emit("zoom-change", this.currentState, s), this.emit("zoom-end", this.currentState);
  }
  /**
   * 缩放到指定比例
   */
  zoomTo(e, t, s) {
    e = Math.max(this.config.minScale, Math.min(this.config.maxScale, e)), this.emit("zoom-start", this.currentState);
    const i = { ...this.currentState }, r = this.currentState.scale;
    let n = this.currentState.offsetX, o = this.currentState.offsetY;
    if (t !== void 0 && s !== void 0) {
      const a = e / r;
      n = t - (t - this.currentState.offsetX) * a, o = s - (s - this.currentState.offsetY) * a;
    }
    this.currentState = {
      scale: e,
      offsetX: n,
      offsetY: o
    }, this.transform.applyZoom(this.element, this.currentState), this.emit("zoom-change", this.currentState, i), this.emit("zoom-end", this.currentState);
  }
  /**
   * 适应宽度
   */
  fitWidth() {
    const e = this.container.clientWidth, t = this.element.offsetWidth;
    if (t === 0) {
      console.warn("ZoomManager: 元素宽度为0，无法计算缩放比例");
      return;
    }
    const s = e / t;
    this.zoomTo(s, 0, 0);
  }
  /**
   * 适应页面
   */
  fitPage() {
    const e = this.container.clientWidth, t = this.container.clientHeight, s = this.element.offsetWidth, i = this.element.offsetHeight;
    if (s === 0 || i === 0) {
      console.warn("ZoomManager: 元素尺寸为0，无法计算缩放比例");
      return;
    }
    const r = e / s, n = t / i, o = Math.min(r, n);
    this.zoomTo(o, 0, 0);
  }
  /**
   * 重置缩放
   */
  reset() {
    this.zoomTo(this.config.initialScale, 0, 0), this.currentState.offsetX = 0, this.currentState.offsetY = 0, this.transform.applyZoom(this.element, this.currentState);
  }
  /**
   * 切换缩放策略
   */
  setStrategy(e) {
    e !== this.strategy && ("destroy" in this.transform && typeof this.transform.destroy == "function" && this.transform.destroy(), this.strategy = e, this.transform = this.createTransform(e), this.transform.applyZoom(this.element, this.currentState));
  }
  /**
   * 获取当前缩放状态
   */
  getState() {
    return { ...this.currentState };
  }
  /**
   * 获取当前缩放比例
   */
  getScale() {
    return this.currentState.scale;
  }
  /**
   * 监听事件
   */
  on(e, t) {
    this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(t);
  }
  /**
   * 移除事件监听
   */
  off(e, t) {
    const s = this.listeners.get(e);
    s && s.delete(t);
  }
  /**
   * 触发事件
   */
  emit(e, t, s) {
    const i = this.listeners.get(e);
    if (!i || i.size === 0)
      return;
    const r = {
      type: e,
      state: { ...t },
      previousState: s ? { ...s } : void 0,
      timestamp: Date.now()
    };
    i.forEach((n) => {
      try {
        n(r);
      } catch (o) {
        console.error(`ZoomManager: 事件监听器执行出错 (${e}):`, o);
      }
    });
  }
  /**
   * 销毁管理器
   */
  destroy() {
    this.wheelGesture && (this.wheelGesture.destroy(), this.wheelGesture = void 0), this.pinchGesture && (this.pinchGesture.destroy(), this.pinchGesture = void 0), this.config.gestures.doubleClick && this.container.removeEventListener("dblclick", this.handleDoubleClick), "destroy" in this.transform && typeof this.transform.destroy == "function" && this.transform.destroy(), this.listeners.clear(), this.transform.resetZoom(this.element);
  }
}
export {
  c as BaseTransform,
  f as DeferredTransform,
  m as HybridTransform,
  d as InstantTransform,
  S as PinchGesture,
  u as WheelGesture,
  p as ZoomManager
};
//# sourceMappingURL=canvas-zoom.es.js.map
