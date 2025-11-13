// hooks/useOption/common/common.ts
/* 修正坐标计算，解决偏移问题 */

export interface eTs {
    clientX: number;
    clientY: number;
    target: HTMLCanvasElement;
}

// 扩展样式接口，包含控制点样式和文字样式
export interface CanvasBaseStyle {
    strokeStyle: string;
    lineWidth: number;
    rectFillStyle?: string;
    circleFillStyle?: string;
    controlFillStyle: string;    // 新增：控制点填充色
    controlStrokeStyle: string;  // 新增：控制点边框色
    controlSize: number;         // 新增：控制点大小
    textColor?: string;          // 新增：文字颜色
    fontSize?: number;           // 新增：字体大小
    fontFamily?: string;         // 新增：字体样式
    textBold?: boolean;          // 新增：是否粗体
    textItalic?: boolean;        // 新增：是否斜体
}

// 公共状态类型
export interface CanvasBaseState {
    canvasId: string;
    isDrawing: boolean;
    startX: number;
    startY: number;
    drawedShapes: any[];
    currentStyle: CanvasBaseStyle; // 使用扩展样式接口
    tempCanvas?: HTMLCanvasElement | null;
    tempCtx?: CanvasRenderingContext2D | null;
    mainCanvas: HTMLCanvasElement;
    mainCtx: CanvasRenderingContext2D;
    cleanupEvents: (() => void)[];
}

// 创建临时Canvas
export const createTempCanvas = (
    mainCanvas: HTMLCanvasElement,
    mainParent: HTMLElement,
    canvasId: string
) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.id = `temp-${canvasId}`;
    mainParent.appendChild(tempCanvas);

    // 同步位置和尺寸
    const syncPosAndSize = () => {
        // 使用主Canvas的实际尺寸（物理像素）
        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;

        // CSS显示尺寸与主Canvas完全一致
        tempCanvas.style.width = mainCanvas.style.width || `${mainCanvas.offsetWidth}px`;
        tempCanvas.style.height = mainCanvas.style.height || `${mainCanvas.offsetHeight}px`;

        // 位置完全覆盖主Canvas（相对于父容器）
        tempCanvas.style.top = '0px';
        tempCanvas.style.left = '0px';
    };
    syncPosAndSize();

    // 监听主Canvas的尺寸变化
    window.addEventListener('resize', syncPosAndSize);
    const observer = new ResizeObserver(syncPosAndSize);
    observer.observe(mainCanvas);
    observer.observe(mainParent);

    // 临时Canvas样式
    tempCanvas.style.cssText += `
    position: absolute !important;
    background: transparent !important;
    pointer-events: none !important;
    z-index: 999 !important;
    opacity: 1 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
  `;

    // 销毁时清理同步逻辑
    tempCanvas.addEventListener('destroy', () => {
        window.removeEventListener('resize', syncPosAndSize);
        observer.disconnect();
    });

    return tempCanvas;
};

// 计算元素相对于父容器的位置
export const getElementRectRelativeToParent = (element: HTMLElement, parent: HTMLElement) => {
    const elementRect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    return {
        top: elementRect.top - parentRect.top,
        left: elementRect.left - parentRect.left
    };
};

// 初始化Canvas上下文样式
export const initCtxStyles = (
    ctx: CanvasRenderingContext2D,
    style: CanvasBaseStyle
) => {
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    if (style.rectFillStyle) ctx.fillStyle = style.rectFillStyle;
    if (style.circleFillStyle) ctx.fillStyle = style.circleFillStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
};

// 获取Canvas内坐标（考虑CSS transform缩放）
export const getCanvasPos = (e: eTs, canvas: HTMLCanvasElement, canvasId?: string) => {
    const rect = canvas.getBoundingClientRect();

    // getBoundingClientRect已经考虑了transform，返回的是缩放后的视觉尺寸
    // 所以我们需要将屏幕坐标转换为Canvas内部坐标
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 计算Canvas内坐标（物理像素）
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    return { x: canvasX, y: canvasY };
};

// 公共清空逻辑
export const clearCommonAnnotations = (
    state: CanvasBaseState,
    mainCanvas: HTMLCanvasElement,
    redrawOriginalContent: () => void
) => {
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) return;

    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    redrawOriginalContent();
    state.drawedShapes = [];
    state.tempCtx?.clearRect(0, 0, state.tempCanvas!.width, state.tempCanvas!.height);
};

// 公共销毁逻辑
export const destroyCommon = (canvasId: string, state: CanvasBaseState) => {
    state.cleanupEvents.forEach(cleanup => cleanup());
    if (state.tempCanvas) {
        state.tempCanvas.dispatchEvent(new Event('destroy'));
        state.tempCanvas.parentElement?.removeChild(state.tempCanvas);
    }
};

export const generateId = () => Math.random().toString(36).substr(2, 9);