import * as d from "pdfjs-dist";
import { PDFDocument as p } from "pdf-lib";
class l {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map(), this.onceHandlers = /* @__PURE__ */ new Map();
  }
  /**
   * 注册事件监听器
   */
  on(e, t) {
    const s = e;
    this.handlers.has(s) || this.handlers.set(s, /* @__PURE__ */ new Set()), this.handlers.get(s).add(t);
  }
  /**
   * 注册一次性事件监听器
   */
  once(e, t) {
    const s = e;
    this.onceHandlers.has(s) || this.onceHandlers.set(s, /* @__PURE__ */ new Set()), this.onceHandlers.get(s).add(t);
  }
  /**
   * 移除事件监听器
   */
  off(e, t) {
    var r, i;
    const s = e;
    (r = this.handlers.get(s)) == null || r.delete(t), (i = this.onceHandlers.get(s)) == null || i.delete(t);
  }
  /**
   * 触发事件
   */
  emit(e, t) {
    const s = e, r = this.handlers.get(s);
    r && r.forEach((a) => {
      try {
        a(t);
      } catch (n) {
        console.error(`Error in event handler for "${s}":`, n);
      }
    });
    const i = this.onceHandlers.get(s);
    i && (i.forEach((a) => {
      try {
        a(t);
      } catch (n) {
        console.error(`Error in once handler for "${s}":`, n);
      }
    }), i.clear());
  }
  /**
   * 移除所有监听器
   */
  clear() {
    this.handlers.clear(), this.onceHandlers.clear();
  }
  /**
   * 移除指定事件的所有监听器
   */
  clearEvent(e) {
    const t = e;
    this.handlers.delete(t), this.onceHandlers.delete(t);
  }
  /**
   * 获取事件监听器数量
   */
  getListenerCount(e) {
    var r, i;
    const t = ((r = this.handlers.get(e)) == null ? void 0 : r.size) || 0, s = ((i = this.onceHandlers.get(e)) == null ? void 0 : i.size) || 0;
    return t + s;
  }
}
const w = new l();
class b {
  constructor(e) {
    this.pdfjsDoc = null, this.pdflibDoc = null, this._numPages = 0, this._fingerprint = "", this.eventBus = e || new l();
  }
  /**
   * 加载PDF文档
   */
  async load(e) {
    try {
      e.workerSrc && (d.GlobalWorkerOptions.workerSrc = e.workerSrc);
      let t;
      if (e.url)
        t = d.getDocument(e.url);
      else if (e.data)
        t = d.getDocument({ data: e.data });
      else
        throw new Error("必须提供url或data参数");
      this.pdfjsDoc = await t.promise, this._numPages = this.pdfjsDoc.numPages, this._fingerprint = this.pdfjsDoc.fingerprints[0];
      let s;
      if (e.data)
        s = e.data instanceof Uint8Array ? e.data : new Uint8Array(e.data);
      else if (e.url) {
        const i = await (await fetch(e.url)).arrayBuffer();
        s = new Uint8Array(i);
      } else
        throw new Error("无法获取PDF数据");
      this.pdflibDoc = await p.load(s), this.eventBus.emit("document-loaded", {
        pdfDocument: this,
        numPages: this._numPages
      });
    } catch (t) {
      throw this.eventBus.emit("document-load-error", {
        error: t
      }), t;
    }
  }
  /**
   * 获取页面
   */
  async getPage(e) {
    if (!this.pdfjsDoc)
      throw new Error("PDF文档未加载");
    if (e < 1 || e > this._numPages)
      throw new Error(`页码超出范围: ${e}`);
    const t = await this.pdfjsDoc.getPage(e);
    return new g(t, e, this.eventBus);
  }
  /**
   * 获取所有页面信息
   */
  async getAllPagesInfo() {
    if (!this.pdfjsDoc)
      throw new Error("PDF文档未加载");
    const e = [];
    for (let t = 1; t <= this._numPages; t++) {
      const r = (await this.pdfjsDoc.getPage(t)).getViewport({ scale: 1 });
      e.push({
        pageNumber: t,
        width: r.width,
        height: r.height,
        rotation: r.rotation
      });
    }
    return e;
  }
  /**
   * 销毁文档
   */
  async destroy() {
    this.pdfjsDoc && (await this.pdfjsDoc.destroy(), this.pdfjsDoc = null), this.pdflibDoc = null, this._numPages = 0, this._fingerprint = "", this.eventBus.emit("document-unloaded", void 0);
  }
  /**
   * 获取文档信息
   */
  get numPages() {
    return this._numPages;
  }
  get fingerprint() {
    return this._fingerprint;
  }
  get isLoaded() {
    return this.pdfjsDoc !== null;
  }
  /**
   * 获取底层pdfjs文档（高级用法）
   */
  getPDFJSDocument() {
    return this.pdfjsDoc;
  }
  /**
   * 获取底层pdf-lib文档（高级用法）
   */
  getPDFLibDocument() {
    return this.pdflibDoc;
  }
}
class g {
  constructor(e, t, s) {
    this.pdfjsPage = e, this.pageNumber = t, this.eventBus = s;
  }
  /**
   * 渲染页面到Canvas
   */
  async render(e, t) {
    try {
      const s = this.pdfjsPage.getViewport({ scale: t }), r = e.getContext("2d");
      if (!r)
        throw new Error("无法获取Canvas上下文");
      e.width = s.width, e.height = s.height;
      const i = {
        canvasContext: r,
        viewport: s
      };
      await this.pdfjsPage.render(i).promise, this.eventBus.emit("page-rendered", {
        pageNumber: this.pageNumber,
        canvas: e
      });
    } catch (s) {
      throw this.eventBus.emit("page-render-error", {
        pageNumber: this.pageNumber,
        error: s
      }), s;
    }
  }
  /**
   * 获取视口信息
   */
  getViewport(e) {
    return this.pdfjsPage.getViewport({ scale: e });
  }
  /**
   * 获取底层pdfjs页面
   */
  getPDFJSPage() {
    return this.pdfjsPage;
  }
}
class y {
  constructor(e = {}) {
    this.renderQueue = [], this.activeRenders = /* @__PURE__ */ new Map(), this.maxConcurrentRenders = e.maxConcurrentRenders || 3, this.eventBus = e.eventBus || new l();
  }
  /**
   * 渲染页面（加入队列）
   */
  async renderPage(e, t, s, r = 10) {
    const i = {
      pageNumber: e.pageNumber,
      canvas: t,
      scale: s,
      priority: r,
      timestamp: Date.now(),
      abortController: new AbortController()
    };
    this.cancelPage(e.pageNumber), this.renderQueue.push(i), this.sortQueue(), this.eventBus.emit("render-queue-size-changed", {
      size: this.renderQueue.length
    }), await this.processQueue(e);
  }
  /**
   * 取消页面渲染
   */
  cancelPage(e) {
    var s;
    const t = this.renderQueue.findIndex((r) => r.pageNumber === e);
    t !== -1 && ((s = this.renderQueue[t].abortController) == null || s.abort(), this.renderQueue.splice(t, 1));
  }
  /**
   * 取消所有渲染任务
   */
  cancelAll() {
    this.renderQueue.forEach((e) => {
      var t;
      (t = e.abortController) == null || t.abort();
    }), this.renderQueue = [], this.eventBus.emit("render-queue-size-changed", {
      size: 0
    });
  }
  /**
   * 处理渲染队列
   */
  async processQueue(e) {
    var r;
    for (; this.activeRenders.size >= this.maxConcurrentRenders; )
      await Promise.race(Array.from(this.activeRenders.values()));
    const t = this.renderQueue.shift();
    if (!t || (this.eventBus.emit("render-queue-size-changed", {
      size: this.renderQueue.length
    }), (r = t.abortController) != null && r.signal.aborted))
      return;
    const s = this.executeRender(e, t);
    this.activeRenders.set(t.pageNumber, s);
    try {
      await s;
    } finally {
      this.activeRenders.delete(t.pageNumber);
    }
  }
  /**
   * 执行实际渲染
   */
  async executeRender(e, t) {
    var s;
    try {
      if ((s = t.abortController) != null && s.signal.aborted)
        return;
      await e.render(t.canvas, t.scale);
    } catch (r) {
      if (r instanceof Error && r.name === "AbortError")
        return;
      throw r;
    }
  }
  /**
   * 按优先级和时间排序队列
   * 优先级数字越小越优先，相同优先级则时间越早越优先
   */
  sortQueue() {
    this.renderQueue.sort((e, t) => e.priority !== t.priority ? e.priority - t.priority : e.timestamp - t.timestamp);
  }
  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.renderQueue.length,
      activeRenders: this.activeRenders.size,
      maxConcurrentRenders: this.maxConcurrentRenders
    };
  }
  /**
   * 销毁渲染器
   */
  destroy() {
    this.cancelAll(), this.activeRenders.clear();
  }
}
class m {
  constructor(e = {}) {
    this.pool = [], this.maxPoolSize = e.maxPoolSize || 20, this.maxCanvasSize = e.maxCanvasSize || 16777216;
  }
  /**
   * 从池中获取Canvas
   */
  acquire(e, t) {
    if (e * t > this.maxCanvasSize)
      return console.warn(`Canvas尺寸超过限制 (${e}x${t}), 直接创建新Canvas`), this.createCanvas(e, t);
    const s = this.findReusableCanvas(e, t);
    if (s) {
      s.inUse = !0, s.lastUsed = Date.now(), (s.width !== e || s.height !== t) && (s.canvas.width = e, s.canvas.height = t, s.width = e, s.height = t);
      const i = s.canvas.getContext("2d");
      return i && i.clearRect(0, 0, e, t), s.canvas;
    }
    this.pool.length >= this.maxPoolSize && this.removeOldestCanvas();
    const r = this.createCanvas(e, t);
    return this.pool.push({
      canvas: r,
      width: e,
      height: t,
      lastUsed: Date.now(),
      inUse: !0
    }), r;
  }
  /**
   * 归还Canvas到池中
   */
  release(e) {
    const t = this.pool.find((s) => s.canvas === e);
    t && (t.inUse = !1, t.lastUsed = Date.now());
  }
  /**
   * 查找可复用的Canvas
   */
  findReusableCanvas(e, t) {
    const s = this.pool.find(
      (n) => !n.inUse && n.width === e && n.height === t
    );
    if (s)
      return s;
    const r = e * t, i = 0.1;
    return this.pool.find((n) => {
      if (n.inUse) return !1;
      const o = n.width * n.height;
      return Math.abs(o - r) / r <= i && o >= r;
    }) || null;
  }
  /**
   * 创建新Canvas
   */
  createCanvas(e, t) {
    const s = document.createElement("canvas");
    return s.width = e, s.height = t, s;
  }
  /**
   * 移除最旧的未使用Canvas
   */
  removeOldestCanvas() {
    const e = this.pool.filter((r) => !r.inUse);
    e.length === 0 && (console.warn("Canvas池已满且所有Canvas都在使用中，强制移除最旧的Canvas"), e.push(...this.pool)), e.sort((r, i) => r.lastUsed - i.lastUsed);
    const t = e[0], s = this.pool.indexOf(t);
    s !== -1 && this.pool.splice(s, 1);
  }
  /**
   * 清理所有未使用的Canvas
   */
  cleanup() {
    this.pool = this.pool.filter((e) => e.inUse);
  }
  /**
   * 清理超过指定时间未使用的Canvas
   */
  cleanupOld(e = 6e4) {
    const t = Date.now();
    this.pool = this.pool.filter((s) => s.inUse ? !0 : t - s.lastUsed < e);
  }
  /**
   * 销毁池中所有Canvas
   */
  destroy() {
    this.pool = [];
  }
  /**
   * 获取池状态
   */
  getStatus() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter((e) => e.inUse).length,
      available: this.pool.filter((e) => !e.inUse).length,
      maxPoolSize: this.maxPoolSize
    };
  }
}
const P = new m();
class f {
  // 最大内存占用100MB
  constructor(e = {}) {
    this.cache = /* @__PURE__ */ new Map(), this.accessOrder = [], this.totalCacheSize = 0, this.maxMemorySize = 100 * 1024 * 1024, this.hitCount = 0, this.missCount = 0, this.maxCacheSize = e.maxCacheSize || 50, this.enablePersistence = e.enablePersistence || !1, this._persistenceDBName = e.persistenceDBName || "pdf-render-cache", this.eventBus = e.eventBus || new l();
  }
  /**
   * 生成缓存键
   */
  generateKey(e) {
    const { fingerprint: t, pageNumber: s, scale: r } = e, i = Math.round(r * 100) / 100;
    return `${t}_${s}_${i}`;
  }
  /**
   * 获取缓存
   */
  get(e) {
    const t = this.generateKey(e), s = this.cache.get(t);
    return s ? (s.timestamp = Date.now(), this.updateAccessOrder(t), s.imageData) : null;
  }
  /**
   * 设置缓存
   */
  set(e, t) {
    const s = this.generateKey(e), r = t.width * t.height * 4;
    for (; (this.cache.size >= this.maxCacheSize || this.totalCacheSize + r > this.maxMemorySize) && this.cache.size > 0; )
      this.evictLRU();
    if (this.cache.has(s)) {
      const a = this.cache.get(s);
      this.totalCacheSize -= a.size;
    }
    const i = {
      key: s,
      imageData: t,
      timestamp: Date.now(),
      size: r
    };
    this.cache.set(s, i), this.totalCacheSize += r, this.updateAccessOrder(s), this.eventBus.emit("cache-size-changed", {
      size: this.cache.size
    }), this.enablePersistence;
  }
  /**
   * 检查缓存是否存在
   */
  has(e) {
    const t = this.generateKey(e);
    return this.cache.has(t);
  }
  /**
   * 删除缓存
   */
  delete(e) {
    const t = this.generateKey(e), s = this.cache.get(t);
    s && (this.totalCacheSize -= s.size, this.cache.delete(t), this.removeFromAccessOrder(t), this.eventBus.emit("cache-size-changed", {
      size: this.cache.size
    }));
  }
  /**
   * 淘汰最近最少使用的缓存项（LRU）
   */
  evictLRU() {
    if (this.accessOrder.length === 0)
      return;
    const e = this.accessOrder[0], t = this.cache.get(e);
    t && (this.totalCacheSize -= t.size, this.cache.delete(e), this.accessOrder.shift(), this.eventBus.emit("cache-size-changed", {
      size: this.cache.size
    }));
  }
  /**
   * 更新访问顺序（将键移到最后）
   */
  updateAccessOrder(e) {
    this.removeFromAccessOrder(e), this.accessOrder.push(e);
  }
  /**
   * 从访问顺序中移除
   */
  removeFromAccessOrder(e) {
    const t = this.accessOrder.indexOf(e);
    t !== -1 && this.accessOrder.splice(t, 1);
  }
  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear(), this.accessOrder = [], this.totalCacheSize = 0, this.eventBus.emit("cache-size-changed", {
      size: 0
    });
  }
  /**
   * 清空指定文档的所有缓存
   */
  clearDocument(e) {
    const t = [];
    this.cache.forEach((s, r) => {
      r.startsWith(`${e}_`) && t.push(r);
    }), t.forEach((s) => {
      const r = this.cache.get(s);
      r && (this.totalCacheSize -= r.size, this.cache.delete(s), this.removeFromAccessOrder(s));
    }), this.eventBus.emit("cache-size-changed", {
      size: this.cache.size
    });
  }
  /**
   * 获取缓存状态
   */
  getStatus() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.totalCacheSize,
      maxMemoryUsage: this.maxMemorySize,
      memoryUsageMB: (this.totalCacheSize / 1024 / 1024).toFixed(2),
      maxMemoryUsageMB: (this.maxMemorySize / 1024 / 1024).toFixed(2)
    };
  }
  getHitRate() {
    const e = this.hitCount + this.missCount;
    return e === 0 ? 0 : this.hitCount / e;
  }
  /**
   * 重置统计
   */
  resetStats() {
    this.hitCount = 0, this.missCount = 0;
  }
  /**
   * 销毁缓存
   */
  destroy() {
    this.clear(), this.enablePersistence;
  }
}
const k = new f();
class C {
  constructor(e = {}) {
    this.workers = [], this.taskQueue = [], this.pendingTasks = /* @__PURE__ */ new Map(), this.workerCount = e.workerCount || navigator.hardwareConcurrency || 4, this.maxQueueSize = e.maxQueueSize || 100, this.workerScript = e.workerScript || "./pdf-render.worker.js", this._eventBus = e.eventBus || new l();
  }
  /**
   * 初始化Worker池
   */
  async init() {
    const e = [];
    for (let t = 0; t < this.workerCount; t++)
      e.push(this.createWorker());
    await Promise.all(e), console.log(`✅ Worker池初始化完成，共${this.workerCount}个Worker`);
  }
  /**
   * 创建单个Worker
   */
  createWorker() {
    return new Promise((e, t) => {
      try {
        const s = new Worker(this.workerScript, { type: "module" }), r = {
          worker: s,
          busy: !1,
          taskCount: 0,
          currentTaskId: null
        };
        s.onmessage = (i) => {
          const { type: a, taskId: n, imageBitmap: o, error: h } = i.data;
          if (a === "ready") {
            this.workers.push(r), e();
            return;
          }
          a === "render-complete" && (this.handleTaskComplete(n, o), r.busy = !1, r.taskCount--, r.currentTaskId = null, this.processQueue()), a === "render-error" && (this.handleTaskError(n, new Error(h)), r.busy = !1, r.taskCount--, r.currentTaskId = null, this.processQueue());
        }, s.onerror = (i) => {
          console.error("Worker错误:", i), r.busy = !1, r.currentTaskId && (this.handleTaskError(
            r.currentTaskId,
            new Error("Worker发生错误")
          ), r.currentTaskId = null), t(i);
        };
      } catch (s) {
        t(s);
      }
    });
  }
  /**
   * 提交渲染任务
   */
  async render(e, t, s, r, i) {
    return new Promise((a, n) => {
      if (this.taskQueue.length >= this.maxQueueSize) {
        n(new Error("任务队列已满"));
        return;
      }
      const o = `task_${Date.now()}_${Math.random()}`, h = {
        taskId: o,
        pdfData: e,
        pageNumber: t,
        scale: s,
        width: r,
        height: i,
        resolve: a,
        reject: n
      };
      this.taskQueue.push(h), this.pendingTasks.set(o, h), this.processQueue();
    });
  }
  /**
   * 处理任务队列
   */
  processQueue() {
    if (this.taskQueue.length === 0)
      return;
    const e = this.findIdleWorker();
    if (!e)
      return;
    const t = this.taskQueue.shift();
    t && (this.assignTask(e, t), this.processQueue());
  }
  /**
   * 查找最空闲的Worker
   */
  findIdleWorker() {
    const e = this.workers.find((s) => !s.busy && s.taskCount === 0);
    if (e)
      return e;
    const t = this.workers.reduce((s, r) => r.taskCount < s.taskCount ? r : s, this.workers[0]);
    return t && !t.busy ? t : null;
  }
  /**
   * 分配任务给Worker
   */
  assignTask(e, t) {
    e.busy = !0, e.taskCount++, e.currentTaskId = t.taskId, e.worker.postMessage({
      type: "render",
      taskId: t.taskId,
      pdfData: t.pdfData,
      pageNumber: t.pageNumber,
      scale: t.scale,
      width: t.width,
      height: t.height
    }, [t.pdfData]);
  }
  /**
   * 处理任务完成
   */
  handleTaskComplete(e, t) {
    const s = this.pendingTasks.get(e);
    s && (s.resolve(t), this.pendingTasks.delete(e));
  }
  /**
   * 处理任务错误
   */
  handleTaskError(e, t) {
    const s = this.pendingTasks.get(e);
    s && (s.reject(t), this.pendingTasks.delete(e));
  }
  /**
   * 获取池状态
   */
  getStatus() {
    return {
      workerCount: this.workers.length,
      busyWorkers: this.workers.filter((e) => e.busy).length,
      queueLength: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      maxQueueSize: this.maxQueueSize
    };
  }
  /**
   * 销毁Worker池
   */
  destroy() {
    this.workers.forEach((e) => {
      e.worker.terminate();
    }), this.workers = [], this.taskQueue = [], this.pendingTasks.forEach((e) => {
      e.reject(new Error("Worker池已销毁"));
    }), this.pendingTasks.clear();
  }
}
class z {
  constructor(e) {
    this.pages = [], this.visiblePages = /* @__PURE__ */ new Set(), this.intersectionObserver = null, this.scrollTimeout = null, this.container = e.container, this.pdfDocument = e.pdfDocument, this.pageRenderer = e.pageRenderer, this.eventBus = e.eventBus || new l(), this.scale = e.scale || 1, this.bufferPages = e.bufferPages || 2, this.enableIntersectionObserver = e.enableIntersectionObserver !== !1;
  }
  /**
   * 初始化虚拟滚动
   */
  async init() {
    if (!this.pdfDocument.isLoaded)
      throw new Error("PDF文档未加载");
    const e = await this.pdfDocument.getAllPagesInfo();
    let t = 0;
    this.pages = e.map((s) => {
      const r = {
        pageNumber: s.pageNumber,
        top: t,
        height: s.height * this.scale,
        canvas: null,
        rendered: !1,
        visible: !1
      };
      return t += r.height + 16, r;
    }), this.setContainerHeight(t), this.createCanvasPlaceholders(), this.enableIntersectionObserver && this.setupIntersectionObserver(), this.bindScrollEvent(), this.eventBus.emit("pages-initialized", {
      pagesCount: this.pages.length
    }), this.updateVisiblePages();
  }
  /**
   * 设置容器高度
   */
  setContainerHeight(e) {
    let t = this.container.querySelector(".pdf-virtual-content");
    t || (t = document.createElement("div"), t.className = "pdf-virtual-content", t.style.position = "relative", t.style.width = "100%", this.container.appendChild(t)), t.style.height = `${e}px`;
  }
  /**
   * 创建Canvas占位符
   */
  createCanvasPlaceholders() {
    const e = this.container.querySelector(".pdf-virtual-content");
    this.pages.forEach((t) => {
      const s = document.createElement("div");
      s.className = "pdf-page-wrapper", s.dataset.pageNumber = String(t.pageNumber), s.style.position = "absolute", s.style.top = `${t.top}px`, s.style.width = "100%", s.style.height = `${t.height}px`;
      const r = document.createElement("canvas");
      r.className = "pdf-page-canvas", r.dataset.pageNumber = String(t.pageNumber), r.style.display = "block", r.style.margin = "0 auto", s.appendChild(r), e.appendChild(s), t.canvas = r;
    });
  }
  /**
   * 设置IntersectionObserver
   */
  setupIntersectionObserver() {
    const e = {
      root: this.container,
      rootMargin: `${this.bufferPages * 800}px`,
      // 假设平均页高800px
      threshold: 0
    };
    this.intersectionObserver = new IntersectionObserver((t) => {
      t.forEach((s) => {
        const r = parseInt(
          s.target.dataset.pageNumber || "0"
        ), i = this.pages[r - 1];
        i && (i.visible = s.isIntersecting, s.isIntersecting ? (this.visiblePages.add(r), this.renderPage(r)) : this.visiblePages.delete(r));
      }), this.eventBus.emit("visible-pages-changed", {
        pages: Array.from(this.visiblePages),
        buffer: this.bufferPages
      });
    }, e), this.pages.forEach((t) => {
      t.canvas && this.intersectionObserver.observe(t.canvas.parentElement);
    });
  }
  /**
   * 绑定滚动事件
   */
  bindScrollEvent() {
    const e = () => {
      this.scrollTimeout && clearTimeout(this.scrollTimeout), this.enableIntersectionObserver || this.updateVisiblePages(), this.eventBus.emit("scroll-position-changed", {
        scrollTop: this.container.scrollTop,
        scrollLeft: this.container.scrollLeft
      }), this.scrollTimeout = window.setTimeout(() => {
      }, 150);
    };
    this.container.addEventListener("scroll", e, { passive: !0 });
  }
  /**
   * 更新可见页面（手动计算，不依赖IntersectionObserver）
   */
  updateVisiblePages() {
    const e = this.container.scrollTop, t = this.container.clientHeight, s = e + t, r = this.bufferPages * 800, i = Math.max(0, e - r), a = s + r, n = this.binarySearchPage(i), o = this.binarySearchPage(a);
    this.visiblePages.clear();
    for (let h = n; h <= o && h < this.pages.length; h++) {
      const u = this.pages[h];
      u.visible = !0, this.visiblePages.add(u.pageNumber), this.renderPage(u.pageNumber);
    }
    this.eventBus.emit("visible-pages-changed", {
      pages: Array.from(this.visiblePages),
      buffer: this.bufferPages
    });
  }
  /**
   * 二分查找页面索引
   */
  binarySearchPage(e) {
    let t = 0, s = this.pages.length - 1;
    for (; t < s; ) {
      const r = Math.floor((t + s) / 2), i = this.pages[r];
      i.top + i.height < e ? t = r + 1 : s = r;
    }
    return t;
  }
  /**
   * 渲染页面
   */
  async renderPage(e) {
    const t = this.pages[e - 1];
    if (!(!t || t.rendered || !t.canvas))
      try {
        const s = await this.pdfDocument.getPage(e), i = this.container.scrollTop + this.container.clientHeight / 2, a = t.top + t.height / 2, n = Math.abs(a - i), o = Math.floor(n / 100);
        await this.pageRenderer.renderPage(s, t.canvas, this.scale, o), t.rendered = !0;
      } catch (s) {
        console.error(`渲染页面${e}失败:`, s);
      }
  }
  /**
   * 更新缩放
   */
  updateScale(e) {
    this.scale = e;
    let t = 0;
    this.pages.forEach((s) => {
      if (s.top = t, s.height = s.height * (e / this.scale), s.rendered = !1, s.canvas) {
        const r = s.canvas.parentElement;
        r && (r.style.top = `${s.top}px`, r.style.height = `${s.height}px`);
      }
      t += s.height + 16;
    }), this.setContainerHeight(t), this.updateVisiblePages();
  }
  /**
   * 跳转到指定页面
   */
  scrollToPage(e, t = !0) {
    const s = this.pages[e - 1];
    s && this.container.scrollTo({
      top: s.top,
      behavior: t ? "smooth" : "auto"
    });
  }
  /**
   * 销毁虚拟滚动器
   */
  destroy() {
    this.intersectionObserver && (this.intersectionObserver.disconnect(), this.intersectionObserver = null), this.scrollTimeout && (clearTimeout(this.scrollTimeout), this.scrollTimeout = null), this.pages = [], this.visiblePages.clear();
  }
  /**
   * 获取状态
   */
  getStatus() {
    return {
      totalPages: this.pages.length,
      visiblePages: this.visiblePages.size,
      renderedPages: this.pages.filter((e) => e.rendered).length,
      scale: this.scale,
      bufferPages: this.bufferPages
    };
  }
}
export {
  m as CanvasPool,
  l as EventBus,
  b as PDFDocument,
  g as PDFPage,
  y as PageRenderer,
  f as RenderCache,
  z as VirtualScroller,
  C as WorkerPool,
  P as globalCanvasPool,
  w as globalEventBus,
  k as globalRenderCache
};
//# sourceMappingURL=core.es.js.map
