import { ref as n, onUnmounted as V } from "vue";
import { PDFViewer as x } from "@customize-pdf/viewer";
function I(u = {}) {
  const a = n(null), v = n(!1), s = n(1), r = n(0), o = n(u.scale || 1), d = async (e) => {
    a.value && a.value.destroy(), a.value = new x({
      container: e,
      ...u
    }), u.autoLoad && (u.url || u.data) && await c(u.url);
  }, c = async (e) => {
    if (!a.value)
      throw new Error("usePDFViewer: 查看器未初始化，请先调用init()");
    await a.value.loadDocument(e), v.value = !0, r.value = a.value.getTotalPages(), o.value = a.value.getCurrentScale();
  }, g = async (e) => {
    if (!a.value)
      throw new Error("usePDFViewer: 查看器未初始化，请先调用init()");
    await a.value.loadDocument(void 0, e), v.value = !0, r.value = a.value.getTotalPages(), o.value = a.value.getCurrentScale();
  }, m = () => {
    var e, t;
    (e = a.value) == null || e.zoomIn(), o.value = ((t = a.value) == null ? void 0 : t.getCurrentScale()) || o.value;
  }, f = () => {
    var e, t;
    (e = a.value) == null || e.zoomOut(), o.value = ((t = a.value) == null ? void 0 : t.getCurrentScale()) || o.value;
  }, w = (e) => {
    var t;
    (t = a.value) == null || t.zoomTo(e), o.value = e;
  }, P = () => {
    var e, t;
    (e = a.value) == null || e.fitWidth(), o.value = ((t = a.value) == null ? void 0 : t.getCurrentScale()) || o.value;
  }, T = () => {
    var e, t;
    (e = a.value) == null || e.fitPage(), o.value = ((t = a.value) == null ? void 0 : t.getCurrentScale()) || o.value;
  }, C = () => {
    var e, t;
    (e = a.value) == null || e.resetZoom(), o.value = ((t = a.value) == null ? void 0 : t.getCurrentScale()) || o.value;
  }, D = (e, t) => {
    var l;
    (l = a.value) == null || l.activateTool(e, t);
  }, y = () => {
    var e;
    (e = a.value) == null || e.deactivateTool();
  }, z = () => {
    var e;
    return ((e = a.value) == null ? void 0 : e.getAnnotations()) || [];
  }, A = (e) => {
    var t;
    return ((t = a.value) == null ? void 0 : t.exportAnnotations(e)) || "{}";
  }, S = (e, t) => {
    var l;
    (l = a.value) == null || l.importAnnotations(e, t);
  }, h = () => {
    var e;
    (e = a.value) == null || e.undo();
  }, F = () => {
    var e;
    (e = a.value) == null || e.redo();
  }, i = () => {
    a.value && (a.value.destroy(), a.value = null, v.value = !1, s.value = 1, r.value = 0);
  };
  return V(() => {
    i();
  }), {
    viewer: a,
    isLoaded: v,
    currentPage: s,
    totalPages: r,
    scale: o,
    init: d,
    load: c,
    loadData: g,
    zoomIn: m,
    zoomOut: f,
    zoomTo: w,
    fitWidth: P,
    fitPage: T,
    resetZoom: C,
    activateTool: D,
    deactivateTool: y,
    getAnnotations: z,
    exportAnnotations: A,
    importAnnotations: S,
    undo: h,
    redo: F,
    destroy: i
  };
}
export {
  I as usePDFViewer
};
//# sourceMappingURL=vue.es.js.map
