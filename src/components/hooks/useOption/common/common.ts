/* 公共Canvas工具：处理临时Canvas、坐标计算、样式初始化等 */
export interface eTs {
    clientX: number;
    clientY: number;
    target: HTMLCanvasElement;
}

// 公共状态类型（不含绘制特定字段）
export interface CanvasBaseState {
    isDrawing: boolean;
    startX: number;
    startY: number;
    drawedShapes: any[]; // 兼容线/矩形的通用数组
    currentStyle: {
        strokeStyle: string;
        lineWidth: number;
        rectFillStyle?: string; // 矩形专属，可选
    };
    tempCanvas?: HTMLCanvasElement | null;
    tempCtx?: CanvasRenderingContext2D | null;
    mainCanvas: HTMLCanvasElement;
    // 事件清理函数（用于销毁时移除全局事件）
    cleanupEvents: (() => void)[];
}

// 1. 创建临时Canvas（公共逻辑）
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
        const displayWidth = mainCanvas.offsetWidth;
        const displayHeight = mainCanvas.offsetHeight;
        const { top, left } = getElementRectRelativeToParent(mainCanvas, mainParent);

        tempCanvas.width = mainCanvas.width;
        tempCanvas.height = mainCanvas.height;
        tempCanvas.style.width = `${displayWidth}px`;
        tempCanvas.style.height = `${displayHeight}px`;
        tempCanvas.style.top = `${top}px`;
        tempCanvas.style.left = `${left}px`;
    };
    syncPosAndSize();
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

// 2. 计算元素相对于父容器的位置（精准版）
export const getElementRectRelativeToParent = (element: HTMLElement, parent: HTMLElement) => {
    let top = 0, left = 0;
    let el: HTMLElement | null = element;
    while (el && el !== parent) {
        top += el.offsetTop;
        left += el.offsetLeft;
        el = el.offsetParent as HTMLElement | null;
    }
    return { top, left };
};

// 3. 初始化Canvas上下文样式
export const initCtxStyles = (
    ctx: CanvasRenderingContext2D,
    style: CanvasBaseState['currentStyle']
) => {
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    if (style.rectFillStyle) ctx.fillStyle = style.rectFillStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
};

// 4. 获取Canvas内坐标（超边界仍返回有效坐标）
export const getCanvasPos = (e: eTs, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
};

// 5. 公共清空逻辑（清空Canvas+恢复原有内容）
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

// 6. 公共销毁逻辑（清理临时Canvas+全局事件）
export const destroyCommon = (canvasId: string, state: CanvasBaseState) => {
    // 移除全局事件
    state.cleanupEvents.forEach(cleanup => cleanup());
    // 移除临时Canvas
    if (state.tempCanvas) {
        state.tempCanvas.dispatchEvent(new Event('destroy'));
        state.tempCanvas.parentElement?.removeChild(state.tempCanvas);
    }
};