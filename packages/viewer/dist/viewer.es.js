import * as i from "pdfjs-dist";
import { ZoomManager as s } from "@customize-pdf/canvas-zoom";
import { AnnotationManager as c } from "@customize-pdf/canvas-annotations";
typeof window < "u" && (i.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${i.version}/pdf.worker.min.js`);
class d {
  constructor(t) {
    if (this.pdfDocument = null, this.pages = /* @__PURE__ */ new Map(), this.zoomManager = null, this.annotationManager = null, this.currentScale = 1, this.config = t, this.container = typeof t.container == "string" ? document.querySelector(t.container) : t.container, !this.container)
      throw new Error("PDFViewer: 容器元素不存在");
    this.currentScale = t.scale || 1, this.initContainer();
  }
  /**
   * 初始化容器
   */
  initContainer() {
    this.container.style.overflow = "auto", this.container.style.position = "relative";
  }
  /**
   * 加载PDF文档
   */
  async loadDocument(t, n) {
    var o;
    const a = t || this.config.url, e = n || this.config.data;
    if (!a && !e)
      throw new Error("PDFViewer: 必须提供url或data");
    const r = a ? i.getDocument(a) : i.getDocument({ data: e });
    this.pdfDocument = await r.promise, await this.renderPage(1), this.initZoomManager(), ((o = this.config.annotations) == null ? void 0 : o.enabled) !== !1 && this.initAnnotationManager();
  }
  /**
   * 渲染页面
   */
  async renderPage(t) {
    var o;
    if (!this.pdfDocument)
      throw new Error("PDFViewer: 文档未加载");
    const n = await this.pdfDocument.getPage(t), a = n.getViewport({ scale: this.currentScale });
    let e = (o = this.pages.get(t)) == null ? void 0 : o.canvas;
    e || (e = document.createElement("canvas"), e.style.display = "block", e.style.margin = "10px auto", this.container.appendChild(e)), e.width = a.width, e.height = a.height;
    const r = e.getContext("2d");
    await n.render({
      canvasContext: r,
      viewport: a
    }).promise, this.pages.set(t, { pageNumber: t, canvas: e, viewport: a });
  }
  /**
   * 初始化缩放管理器
   */
  initZoomManager() {
    this.pages.get(1) && (this.zoomManager = new s({
      container: this.container,
      strategy: "hybrid",
      initialScale: this.currentScale,
      gestures: {
        wheel: !0,
        pinch: !0
      },
      ...this.config.zoom
    }), this.zoomManager.on("zoom-change", (n) => {
      this.currentScale = n.state.scale;
    }), this.zoomManager.on("rerender-start", async (n) => {
      var a;
      await this.rerenderAllPages(n.state.scale), (a = this.zoomManager) == null || a.onRerenderComplete(n.state.scale);
    }));
  }
  /**
   * 初始化批注管理器
   */
  initAnnotationManager() {
    const t = this.pages.get(1);
    t && (this.annotationManager = new c({
      canvas: t.canvas,
      canvasId: "page-1",
      enableUndo: !0,
      ...this.config.annotations
    }));
  }
  /**
   * 重新渲染所有页面
   */
  async rerenderAllPages(t) {
    this.currentScale = t;
    const n = Array.from(this.pages.keys());
    for (const a of n)
      await this.renderPage(a);
    this.annotationManager && this.annotationManager.render();
  }
  /**
   * 缩放方法
   */
  zoomIn() {
    var t;
    (t = this.zoomManager) == null || t.zoomIn();
  }
  zoomOut() {
    var t;
    (t = this.zoomManager) == null || t.zoomOut();
  }
  zoomTo(t) {
    var n;
    (n = this.zoomManager) == null || n.zoomTo(t);
  }
  fitWidth() {
    var t;
    (t = this.zoomManager) == null || t.fitWidth();
  }
  fitPage() {
    var t;
    (t = this.zoomManager) == null || t.fitPage();
  }
  resetZoom() {
    var t;
    (t = this.zoomManager) == null || t.reset();
  }
  /**
   * 批注方法
   */
  activateTool(t, n) {
    var a;
    (a = this.annotationManager) == null || a.activateTool(t, n);
  }
  deactivateTool() {
    var t;
    (t = this.annotationManager) == null || t.deactivateTool();
  }
  getAnnotations() {
    var t;
    return ((t = this.annotationManager) == null ? void 0 : t.getAnnotations()) || [];
  }
  exportAnnotations(t) {
    var n;
    return ((n = this.annotationManager) == null ? void 0 : n.exportAnnotations(t)) || "{}";
  }
  importAnnotations(t, n) {
    var a;
    (a = this.annotationManager) == null || a.importAnnotations(t, n);
  }
  undo() {
    var t;
    (t = this.annotationManager) == null || t.undo();
  }
  redo() {
    var t;
    (t = this.annotationManager) == null || t.redo();
  }
  /**
   * 文档信息
   */
  getTotalPages() {
    var t;
    return ((t = this.pdfDocument) == null ? void 0 : t.numPages) || 0;
  }
  getCurrentScale() {
    return this.currentScale;
  }
  /**
   * 销毁查看器
   */
  destroy() {
    var t, n;
    (t = this.zoomManager) == null || t.destroy(), (n = this.annotationManager) == null || n.destroy(), this.pages.forEach((a) => {
      a.canvas.remove();
    }), this.pages.clear(), this.pdfDocument = null;
  }
}
export {
  d as PDFViewer
};
//# sourceMappingURL=viewer.es.js.map
