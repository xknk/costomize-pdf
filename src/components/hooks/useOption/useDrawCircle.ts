// hooks/useOption/useDrawCircle.ts
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

// 定义圆形形状接口
export interface CircleShape {
    id: string;
    type: 'circle';
    x: number; // 圆心x坐标
    y: number; // 圆心y坐标
    radius: number; // 半径
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    timestamp: number;
    canvasId: string;
}

// 控制点类型
type ControlPoint = 'none' | 'move' | 'top' | 'right' | 'bottom' | 'left';

// 最小圆半径
const MIN_CIRCLE_RADIUS = 5;

// 存储所有画布状态
const canvasStates: Record<string, CanvasBaseState & {
    tempCircle?: { x: number; y: number; radius: number };
    selectedCircleId?: string;
    activeControl: ControlPoint;
    dragStartPos?: { x: number; y: number };
    tempSelectedCircle?: CircleShape;
    originalCanvasBg?: ImageData;
    currentCursor: string;
}> = {};

// 克隆圆形
const cloneCircle = (circle: CircleShape): CircleShape => ({ ...circle });

// 绘制控制点（使用配置样式）
const drawControlPoints = (
    ctx: CanvasRenderingContext2D,
    circle: CircleShape,
    style: { controlSize: number; controlFillStyle: string; controlStrokeStyle: string }
) => {
    const { controlSize } = style;
    ctx.save();
    ctx.fillStyle = style.controlFillStyle;
    ctx.strokeStyle = style.controlStrokeStyle;
    ctx.lineWidth = 1;

    // 上控制点
    ctx.beginPath();
    ctx.rect(
        circle.x - controlSize / 2,
        circle.y - circle.radius - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 右控制点
    ctx.beginPath();
    ctx.rect(
        circle.x + circle.radius - controlSize / 2,
        circle.y - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 下控制点
    ctx.beginPath();
    ctx.rect(
        circle.x - controlSize / 2,
        circle.y + circle.radius - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 左控制点
    ctx.beginPath();
    ctx.rect(
        circle.x - circle.radius - controlSize / 2,
        circle.y - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    ctx.restore();
};

// 获取控制点
const getControlPoint = (x: number, y: number, circle: CircleShape): ControlPoint => {
    const controlSize = 10; // 检测范围

    // 上控制点检测
    if (
        Math.abs(x - circle.x) < controlSize &&
        Math.abs(y - (circle.y - circle.radius)) < controlSize
    ) {
        return 'top';
    }

    // 右控制点检测
    if (
        Math.abs(x - (circle.x + circle.radius)) < controlSize &&
        Math.abs(y - circle.y) < controlSize
    ) {
        return 'right';
    }

    // 下控制点检测
    if (
        Math.abs(x - circle.x) < controlSize &&
        Math.abs(y - (circle.y + circle.radius)) < controlSize
    ) {
        return 'bottom';
    }

    // 左控制点检测
    if (
        Math.abs(x - (circle.x - circle.radius)) < controlSize &&
        Math.abs(y - circle.y) < controlSize
    ) {
        return 'left';
    }

    // 移动控制点（圆心区域）
    const centerDist = Math.hypot(x - circle.x, y - circle.y);
    if (centerDist < circle.radius / 3) {
        return 'move';
    }

    return 'none';
};

// 更新画布光标
const updateCanvasCursor = (state: any, control: ControlPoint) => {
    let cursor = 'default';
    switch (control) {
        case 'move':
            cursor = 'move';
            break;
        case 'top':
        case 'bottom':
            cursor = 'ns-resize';
            break;
        case 'left':
        case 'right':
            cursor = 'ew-resize';
            break;
        default:
            cursor = 'default';
    }
    state.currentCursor = cursor;
    state.mainCanvas.style.cursor = cursor;
};

// 恢复原始背景并重绘其他图形
const restoreOriginalBgAndRedrawOthers = (state: any, excludeId: string) => {
    state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
    state.drawedShapes.forEach((shape: CircleShape) => {
        if (shape.id !== excludeId) {
            drawCircle(state.mainCtx, shape);
        }
    });
};

// 绘制圆形
const drawCircle = (ctx: CanvasRenderingContext2D, circle: CircleShape) => {
    ctx.save();
    ctx.strokeStyle = circle.strokeStyle;
    ctx.fillStyle = circle.fillStyle;
    ctx.lineWidth = circle.lineWidth;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};

// 重绘所有圆形
const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
    const state = canvasStates[canvasId];
    if (!state) return;

    mainCtx.save();
    state.drawedShapes.forEach((shape: CircleShape) => {
        drawCircle(mainCtx, shape);
    });
    mainCtx.restore();
};

export const useDrawCircle = () => {
    // 初始化画圆功能
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: Partial<CanvasBaseStyle> = {}
    ) => {
        // 圆形默认样式
        const defaultStyle: CanvasBaseStyle = {
            strokeStyle: '#ff0000',
            circleFillStyle: 'rgba(255, 0, 0, 0.1)',
            lineWidth: 2,
            controlFillStyle: '#ffffff',    // 控制点默认样式
            controlStrokeStyle: '#000000',  // 控制点默认样式
            controlSize: 6                  // 控制点默认大小
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

        // 初始化圆形专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            canvasId,
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: existingShapes,
            tempCircle: undefined,
            selectedCircleId: undefined,
            activeControl: 'none',
            dragStartPos: undefined,
            tempSelectedCircle: undefined,
            tempCanvas,
            tempCtx,
            mainCanvas,
            mainCtx,
            originalCanvasBg,
            currentStyle,
            cleanupEvents,
            currentCursor: 'default'
        };
        const state = canvasStates[canvasId];

        // 初始化样式
        initCtxStyles(mainCtx, state.currentStyle);
        initCtxStyles(tempCtx, state.currentStyle);

        // 重绘已有图形
        redrawAllAnnotations(canvasId, mainCtx);

        // 鼠标按下事件
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as { clientX: number; clientY: number; target: HTMLCanvasElement };
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 检查是否点击了现有圆形
            const circles = [...state.drawedShapes].reverse();
            let clickedCircle: CircleShape | undefined;
            let targetControl: ControlPoint = 'none';

            for (const circle of circles) {
                targetControl = getControlPoint(x, y, circle);
                if (targetControl !== 'none') {
                    clickedCircle = circle;
                    state.activeControl = targetControl;
                    break;
                }
            }

            if (clickedCircle) {
                // 更新选中状态
                state.selectedCircleId = clickedCircle.id;
                state.tempSelectedCircle = cloneCircle(clickedCircle);
                state.dragStartPos = { x, y };

                // 主画布：重绘除选中圆形外的其他图形
                restoreOriginalBgAndRedrawOthers(state, clickedCircle.id);

                // 临时画布：先复制背景，再绘制选中圆形+控制点
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const bgX = Math.max(0, clickedCircle.x - clickedCircle.radius - padding);
                const bgY = Math.max(0, clickedCircle.y - clickedCircle.radius - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, clickedCircle.radius * 2 + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, clickedCircle.radius * 2 + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                drawCircle(state.tempCtx!, clickedCircle);
                drawControlPoints(state.tempCtx!, clickedCircle, state.currentStyle);

                // 同步更新光标
                updateCanvasCursor(state, targetControl);
                return;
            }

            // 未点击现有圆形，开始绘制新圆形
            state.isDrawing = true;
            state.startX = x;
            state.startY = y;
            state.tempCircle = { x, y, radius: 0 };
        };
        mainCanvas.addEventListener('mousedown', handleMousedown);
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动事件
        const handleMousemove = (e: MouseEvent) => {
            const evt = e as unknown as { clientX: number; clientY: number; target: HTMLCanvasElement };
            const { x, y } = getCanvasPos(evt, mainCanvas);

            if (state.isDrawing && state.tempCircle) {
                // 绘制临时圆形(圆心为起点,鼠标距离为半径)
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                const radius = Math.hypot(x - state.startX, y - state.startY);
                state.tempCircle.radius = radius;

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const bgX = Math.max(0, state.tempCircle.x - radius - padding);
                const bgY = Math.max(0, state.tempCircle.y - radius - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, radius * 2 + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, radius * 2 + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                state.tempCtx!.save();
                state.tempCtx!.strokeStyle = state.currentStyle.strokeStyle;
                state.tempCtx!.fillStyle = state.currentStyle.circleFillStyle || 'transparent';
                state.tempCtx!.lineWidth = state.currentStyle.lineWidth;
                state.tempCtx!.beginPath();
                state.tempCtx!.arc(
                    state.tempCircle.x,
                    state.tempCircle.y,
                    state.tempCircle.radius,
                    0,
                    Math.PI * 2
                );
                state.tempCtx!.fill();
                state.tempCtx!.stroke();
                state.tempCtx!.restore();
                return;
            }

            // 处理圆形拖拽
            if (state.tempSelectedCircle && state.dragStartPos && state.activeControl !== 'none') {
                const dx = x - state.dragStartPos.x;
                const dy = y - state.dragStartPos.y;
                const tempCircle = { ...state.tempSelectedCircle };

                // 根据控制点类型处理拖拽
                switch (state.activeControl) {
                    case 'move':
                        tempCircle.x += dx;
                        tempCircle.y += dy;
                        break;
                    case 'top':
                        tempCircle.y += dy;
                        tempCircle.radius = Math.max(MIN_CIRCLE_RADIUS, tempCircle.radius - dy);
                        break;
                    case 'bottom':
                        tempCircle.radius = Math.max(MIN_CIRCLE_RADIUS, tempCircle.radius + dy);
                        break;
                    case 'left':
                        tempCircle.x += dx;
                        tempCircle.radius = Math.max(MIN_CIRCLE_RADIUS, tempCircle.radius - dx);
                        break;
                    case 'right':
                        tempCircle.radius = Math.max(MIN_CIRCLE_RADIUS, tempCircle.radius + dx);
                        break;
                }

                // 更新临时圆形
                tempCircle.timestamp = Date.now();
                state.tempSelectedCircle = tempCircle;
                state.dragStartPos = { x, y };

                // 在临时画布上绘制
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const bgX = Math.max(0, tempCircle.x - tempCircle.radius - padding);
                const bgY = Math.max(0, tempCircle.y - tempCircle.radius - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, tempCircle.radius * 2 + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, tempCircle.radius * 2 + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                drawCircle(state.tempCtx!, tempCircle);
                drawControlPoints(state.tempCtx!, tempCircle, state.currentStyle);
                return;
            }

            // 更新光标（非绘制/拖拽状态）
            let targetControl: ControlPoint = 'none';
            if (!state.isDrawing && !state.tempSelectedCircle) {
                const circles = [...state.drawedShapes].reverse();
                for (const circle of circles) {
                    targetControl = getControlPoint(x, y, circle);
                    if (targetControl !== 'none') break;
                }
            }
            updateCanvasCursor(state, targetControl);
        };
        document.addEventListener('mousemove', handleMousemove);
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开事件
        const handleMouseup = () => {
            if (state.isDrawing && state.tempCircle) {
                // 过滤过小的圆
                if (state.tempCircle.radius > MIN_CIRCLE_RADIUS) {
                    // 保存圆形
                    state.drawedShapes.push({
                        id: generateId(),
                        type: 'circle',
                        x: state.tempCircle.x,
                        y: state.tempCircle.y,
                        radius: state.tempCircle.radius,
                        strokeStyle: state.currentStyle.strokeStyle,
                        fillStyle: state.currentStyle.circleFillStyle || 'transparent',
                        lineWidth: state.currentStyle.lineWidth,
                        timestamp: Date.now(),
                        canvasId: state.canvasId
                    });

                    // 重绘所有圆形
                    state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                    state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                    redrawAllAnnotations(canvasId, state.mainCtx);
                }
                state.tempCircle = undefined;
                state.isDrawing = false;
            }

            // 处理选中圆形的更新
            if (state.tempSelectedCircle && state.selectedCircleId) {
                // 更新原始圆形数据
                const index = state.drawedShapes.findIndex(s => s.id === state.selectedCircleId);
                if (index !== -1) {
                    state.drawedShapes[index] = {
                        ...state.tempSelectedCircle,
                        timestamp: Date.now()
                    };
                }

                // 重绘所有圆形
                state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                redrawAllAnnotations(canvasId, state.mainCtx);

                // 清空临时状态
                state.tempSelectedCircle = undefined;
                state.selectedCircleId = undefined;
                state.activeControl = 'none';
                state.dragStartPos = undefined;
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            }

            // 重置光标
            state.mainCanvas.style.cursor = 'default';
        };
        document.addEventListener('mouseup', handleMouseup);
        document.addEventListener('mouseleave', handleMouseup);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseup);
            document.removeEventListener('mouseleave', handleMouseup);
        });
    };

    // 清空圆形批注
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        clearCommonAnnotations(state, mainCanvas, redrawOriginalContent);
    };

    // 销毁画圆功能
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
                    originalCanvasBg: bg
                };
            } else {
                delete canvasStates[canvasId];
            }
        }
    };

    // 获取圆形数据
    const getShapes = (canvasId?: string): CircleShape[] => {
        if (canvasId) {
            const state = canvasStates[canvasId];
            return state ? [...state.drawedShapes] : [];
        }
        return Object.values(canvasStates).flatMap(state => state.drawedShapes);
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        clearAnnotations,
        destroy,
        getShapes
    };
};