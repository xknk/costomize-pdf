// hooks/useOption/useDrawLine.ts
import {
    createTempCanvas,
    getCanvasPos,
    initCtxStyles,
    clearCommonAnnotations,
    destroyCommon,
    generateId,
    CanvasBaseState,
    CanvasBaseStyle
} from './common/common';

// 定义线条形状接口
export interface LineShape {
    id: string;
    type: 'line';
    points: { x: number; y: number }[]; // 存储所有点
    strokeStyle: string;
    lineWidth: number;
    timestamp: number;
    canvasId: string;
}

// 存储所有画布状态
const canvasStates: Record<string, CanvasBaseState & {
    currentLinePoints: { x: number; y: number }[];
    originalCanvasBg?: ImageData;
}> = {};

// 重绘所有线条
const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
    const state = canvasStates[canvasId];
    if (!state) return;

    mainCtx.save();
    state.drawedShapes.forEach((shape: LineShape) => {
        if (shape.points.length < 2) return;

        mainCtx.strokeStyle = shape.strokeStyle;
        mainCtx.lineWidth = shape.lineWidth;
        mainCtx.beginPath();
        mainCtx.moveTo(shape.points[0].x, shape.points[0].y);

        for (let i = 1; i < shape.points.length; i++) {
            mainCtx.lineTo(shape.points[i].x, shape.points[i].y);
        }

        mainCtx.stroke();
    });
    mainCtx.restore();
};

export const useDrawLine = () => {
    // 初始化自由画笔
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: Partial<CanvasBaseStyle> = {}
    ) => {
        // 线条默认样式
        const defaultStyle: CanvasBaseStyle = {
            strokeStyle: '#0066ff',
            lineWidth: 2,
            controlFillStyle: '#ffffff',    // 控制点样式（备用）
            controlStrokeStyle: '#000000',  // 控制点样式（备用）
            controlSize: 6                  // 控制点大小（备用）
        };
        const currentStyle: CanvasBaseStyle = { ...defaultStyle, ...customStyle };

        // 父容器定位处理
        const mainCanvasParent = mainCanvas.parentElement;
        if (!mainCanvasParent) throw new Error('主Canvas必须有直接父容器');
        if (getComputedStyle(mainCanvasParent).position !== 'relative') {
            mainCanvasParent.style.position = 'relative';
            mainCanvasParent.style.overflow = 'visible';
        }

        // 保存已有图形数据
        const existingShapes = canvasStates[canvasId]?.drawedShapes || [];
        const existingBg = canvasStates[canvasId]?.originalCanvasBg;

        // 创建临时Canvas
        const tempCanvas = createTempCanvas(mainCanvas, mainCanvasParent, canvasId);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('浏览器不支持Canvas');

        // 保存原始背景
        const originalCanvasBg = existingBg || mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);

        // 初始化画笔专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            canvasId,
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: existingShapes,
            currentLinePoints: [],
            tempCanvas,
            tempCtx,
            mainCanvas,
            mainCtx,
            originalCanvasBg,
            currentStyle,
            cleanupEvents
        };
        const state = canvasStates[canvasId];

        // 初始化样式
        initCtxStyles(mainCtx, state.currentStyle);
        initCtxStyles(tempCtx, state.currentStyle);

        // 重绘已有图形
        redrawAllAnnotations(canvasId, mainCtx);

        // 鼠标按下：开始绘制
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as { clientX: number; clientY: number; target: HTMLCanvasElement };
            const { x, y } = getCanvasPos(evt, mainCanvas);

            state.isDrawing = true;
            state.currentLinePoints = [{ x, y }];
        };
        mainCanvas.addEventListener('mousedown', handleMousedown, { passive: true });
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动：记录所有点并实时绘制
        const handleMousemove = (e: MouseEvent) => {
            if (!state.isDrawing) return;

            const evt = e as unknown as { clientX: number; clientY: number; target: HTMLCanvasElement };
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 记录当前点
            state.currentLinePoints.push({ x, y });

            // 在临时画布上绘制当前线
            state.tempCtx!.clearRect(0, 0, state.tempCanvas!.width, state.tempCanvas!.height);

            // 计算绘制区域范围，复制背景
            if (state.currentLinePoints.length > 1) {
                const padding = 20;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                state.currentLinePoints.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
                const bgX = Math.max(0, minX - padding);
                const bgY = Math.max(0, minY - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, maxX - minX + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, maxY - minY + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);
            }

            state.tempCtx!.save();
            state.tempCtx!.strokeStyle = state.currentStyle.strokeStyle;
            state.tempCtx!.lineWidth = state.currentStyle.lineWidth;
            state.tempCtx!.beginPath();

            // 绘制所有点连成的线
            if (state.currentLinePoints.length > 1) {
                state.tempCtx!.moveTo(state.currentLinePoints[0].x, state.currentLinePoints[0].y);
                for (let i = 1; i < state.currentLinePoints.length; i++) {
                    state.tempCtx!.lineTo(state.currentLinePoints[i].x, state.currentLinePoints[i].y);
                }
            }

            state.tempCtx!.stroke();
            state.tempCtx!.restore();
        };
        document.addEventListener('mousemove', handleMousemove, { passive: true });
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开/离开：结束绘制并保存线条
        const handleMouseEnd = () => {
            if (state.isDrawing && state.currentLinePoints.length > 1) {
                // 计算线的总长度，过滤过短的线
                let totalLength = 0;
                for (let i = 1; i < state.currentLinePoints.length; i++) {
                    const dx = state.currentLinePoints[i].x - state.currentLinePoints[i - 1].x;
                    const dy = state.currentLinePoints[i].y - state.currentLinePoints[i - 1].y;
                    totalLength += Math.hypot(dx, dy);
                }

                // 只保存有效长度的线
                if (totalLength > 5) {
                    state.drawedShapes.push({
                        id: generateId(),
                        type: 'line',
                        points: [...state.currentLinePoints],
                        strokeStyle: state.currentStyle.strokeStyle,
                        lineWidth: state.currentStyle.lineWidth,
                        timestamp: Date.now(),
                        canvasId: state.canvasId
                    });

                    // 重绘所有线（包括新绘制的）
                    state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                    state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                    redrawAllAnnotations(canvasId, state.mainCtx);
                }
            }

            // 清空临时数据
            state.tempCtx!.clearRect(0, 0, state.tempCanvas!.width, state.tempCanvas!.height);
            state.currentLinePoints = [];
            state.isDrawing = false;
        };

        document.addEventListener('mouseup', handleMouseEnd);
        document.addEventListener('mouseleave', handleMouseEnd);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseEnd);
            document.removeEventListener('mouseleave', handleMouseEnd);
        });
    };

    // 清空线段批注
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        clearCommonAnnotations(state, mainCanvas, redrawOriginalContent);
    };

    // 销毁画线功能
    const destroy = (canvasId: string, keepShapes: boolean = true) => {
        const state = canvasStates[canvasId];
        if (state) {
            const shapes = state.drawedShapes;
            const bg = state.originalCanvasBg;

            destroyCommon(canvasId, state);

            if (keepShapes) {
                canvasStates[canvasId] = {
                    ...state,
                    tempCanvas: null,
                    tempCtx: null,
                    cleanupEvents: [],
                    isDrawing: false,
                    drawedShapes: shapes,
                    originalCanvasBg: bg,
                    currentLinePoints: []
                };
            } else {
                delete canvasStates[canvasId];
            }
        }
    };

    // 获取线段数据
    const getShapes = (canvasId?: string): LineShape[] => {
        if (canvasId) {
            const state = canvasStates[canvasId];
            return state ? [...state.drawedShapes] : [];
        }

        return Object.values(canvasStates)
            .flatMap(state => state.drawedShapes);
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        clearAnnotations,
        destroy,
        getShapes
    };
};