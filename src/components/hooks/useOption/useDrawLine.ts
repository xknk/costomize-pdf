/* 仅画线功能Hook：独立处理线段绘制、重绘、销毁 */
import { eTs, CanvasBaseState, createTempCanvas, getElementRectRelativeToParent, initCtxStyles, getCanvasPos, clearCommonAnnotations, destroyCommon } from './common/common';

// 线的类型定义
export interface LineShape {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeStyle: string;
    lineWidth: number;
}

// 画线专属状态（继承公共状态，无矩形相关字段）
interface LineCanvasState extends CanvasBaseState {
    drawedShapes: LineShape[]; // 明确为线的数组
}

const canvasStates: Record<string, LineCanvasState> = {};

// 初始化画线功能
export const useDrawLine = () => {
    // 1. 初始化画线（仅创建临时Canvas，线直接画在主Canvas）
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: {
            strokeStyle?: string;
            lineWidth?: number;
        } = {}
    ) => {
        // 画线默认样式（无填充色）
        const defaultStyle = {
            strokeStyle: '#0066ff', // 蓝色线条
            lineWidth: 2,
        };
        const currentStyle = { ...defaultStyle, ...customStyle };

        // 父容器定位处理
        const mainCanvasParent = mainCanvas.parentElement;
        if (!mainCanvasParent) throw new Error('主Canvas必须有直接父容器');
        if (getComputedStyle(mainCanvasParent).position !== 'relative') {
            mainCanvasParent.style.position = 'relative';
            mainCanvasParent.style.overflow = 'visible';
        }

        // 创建临时Canvas（仅用于兼容公共逻辑，画线不依赖临时Canvas绘制）
        const tempCanvas = createTempCanvas(mainCanvas, mainCanvasParent, canvasId);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('浏览器不支持Canvas');

        // 初始化画线专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: [],
            currentStyle,
            tempCanvas,
            tempCtx,
            mainCanvas,
            cleanupEvents,
        };
        const state = canvasStates[canvasId];

        // 初始化样式
        initCtxStyles(mainCtx, currentStyle);
        initCtxStyles(tempCtx, currentStyle);

        // 2. 绑定画线专属事件
        // 鼠标按下：记录线段起点
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);
            state.isDrawing = true;
            state.startX = x;
            state.startY = y;
        };
        mainCanvas.addEventListener('mousedown', handleMousedown, { passive: true });
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动：实时绘制线段（直接画在主Canvas）
        const handleMousemove = (e: MouseEvent) => {
            if (!state.isDrawing) return;
            const evt = e as unknown as eTs;
            const mainCtx = mainCanvas.getContext('2d')!;
            const { x: currX, y: currY } = getCanvasPos(evt, mainCanvas);

            // 绘制当前线段
            mainCtx.save();
            mainCtx.strokeStyle = state.currentStyle.strokeStyle;
            mainCtx.lineWidth = state.currentStyle.lineWidth;
            mainCtx.beginPath();
            mainCtx.moveTo(state.startX, state.startY);
            mainCtx.lineTo(currX, currY);
            mainCtx.stroke();
            mainCtx.restore();

            // 记录当前点为下一段起点
            state.drawedShapes.push({
                type: 'line',
                x1: state.startX,
                y1: state.startY,
                x2: currX,
                y2: currY,
                strokeStyle: state.currentStyle.strokeStyle,
                lineWidth: state.currentStyle.lineWidth,
            });
            state.startX = currX;
            state.startY = currY;
        };
        document.addEventListener('mousemove', handleMousemove, { passive: true });
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开/离开：结束绘制
        const handleMouseEnd = () => {
            state.isDrawing = false;
        };
        document.addEventListener('mouseup', handleMouseEnd);
        document.addEventListener('mouseleave', handleMouseEnd);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseEnd);
            document.removeEventListener('mouseleave', handleMouseEnd);
        });
    };

    // 3. 重绘所有线段
    const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        mainCtx.save();
        state.drawedShapes.forEach((shape: LineShape) => {
            mainCtx.strokeStyle = shape.strokeStyle;
            mainCtx.lineWidth = shape.lineWidth;
            mainCtx.beginPath();
            mainCtx.moveTo(shape.x1, shape.y1);
            mainCtx.lineTo(shape.x2, shape.y2);
            mainCtx.stroke();
        });
        mainCtx.restore();
    };

    // 4. 清空线段批注
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        clearCommonAnnotations(state, mainCanvas, redrawOriginalContent);
    };

    // 5. 销毁画线功能
    const destroy = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (state) {
            destroyCommon(canvasId, state);
            delete canvasStates[canvasId];
        }
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        clearAnnotations,
        destroy,
    };
};