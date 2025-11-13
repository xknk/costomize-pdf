// hooks/useOption/useDrawRect.ts
import {
    createTempCanvas,
    getCanvasPos,
    initCtxStyles,
    clearCommonAnnotations,
    destroyCommon,
    generateId,
    CanvasBaseState,
    CanvasBaseStyle,
    eTs
} from './common/common';

// 定义矩形形状接口
export interface RectShape {
    id: string;
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    timestamp: number;
    canvasId: string;
}

// 控制点类型
type ControlPoint = 'none' | 'move' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

// 最小矩形尺寸
const MIN_RECT_SIZE = 5;

// 存储所有画布状态
const canvasStates: Record<string, CanvasBaseState & {
    tempRect?: { x: number; y: number; width: number; height: number };
    selectedRectId?: string;
    activeControl: ControlPoint;
    dragStartPos?: { x: number; y: number };
    tempSelectedRect?: RectShape;
    originalCanvasBg?: ImageData;
    currentCursor: string;
}> = {};

// 克隆矩形
const cloneRect = (rect: RectShape): RectShape => ({ ...rect });

// 绘制控制点（使用配置样式）
const drawControlPoints = (
    ctx: CanvasRenderingContext2D,
    rect: RectShape,
    style: { controlSize: number; controlFillStyle: string; controlStrokeStyle: string }
) => {
    const { controlSize } = style;
    ctx.save();
    ctx.fillStyle = style.controlFillStyle;
    ctx.strokeStyle = style.controlStrokeStyle;
    ctx.lineWidth = 1;

    // 左上角
    ctx.beginPath();
    ctx.rect(
        rect.x - controlSize / 2,
        rect.y - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 右上角
    ctx.beginPath();
    ctx.rect(
        rect.x + rect.width - controlSize / 2,
        rect.y - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 左下角
    ctx.beginPath();
    ctx.rect(
        rect.x - controlSize / 2,
        rect.y + rect.height - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    // 右下角
    ctx.beginPath();
    ctx.rect(
        rect.x + rect.width - controlSize / 2,
        rect.y + rect.height - controlSize / 2,
        controlSize,
        controlSize
    );
    ctx.fill();
    ctx.stroke();

    ctx.restore();
};

// 获取控制点
const getControlPoint = (x: number, y: number, rect: RectShape): ControlPoint => {
    const controlSize = 10; // 检测范围

    // 左上角
    if (x > rect.x - controlSize && x < rect.x + controlSize &&
        y > rect.y - controlSize && y < rect.y + controlSize) {
        return 'topLeft';
    }

    // 右上角
    if (x > rect.x + rect.width - controlSize && x < rect.x + rect.width + controlSize &&
        y > rect.y - controlSize && y < rect.y + controlSize) {
        return 'topRight';
    }

    // 左下角
    if (x > rect.x - controlSize && x < rect.x + controlSize &&
        y > rect.y + rect.height - controlSize && y < rect.y + rect.height + controlSize) {
        return 'bottomLeft';
    }

    // 右下角
    if (x > rect.x + rect.width - controlSize && x < rect.x + rect.width + controlSize &&
        y > rect.y + rect.height - controlSize && y < rect.y + rect.height + controlSize) {
        return 'bottomRight';
    }

    // 移动（内部）
    if (x > rect.x && x < rect.x + rect.width &&
        y > rect.y && y < rect.y + rect.height) {
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
        case 'topLeft':
        case 'bottomRight':
            cursor = 'nwse-resize';
            break;
        case 'topRight':
        case 'bottomLeft':
            cursor = 'nesw-resize';
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
    state.drawedShapes.forEach((shape: RectShape) => {
        if (shape.id !== excludeId) {
            drawRect(state.mainCtx, shape);
        }
    });
};

// 绘制矩形
const drawRect = (ctx: CanvasRenderingContext2D, rect: RectShape) => {
    ctx.save();
    ctx.strokeStyle = rect.strokeStyle;
    ctx.fillStyle = rect.fillStyle;
    ctx.lineWidth = rect.lineWidth;
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};

// 重绘所有矩形
const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
    const state = canvasStates[canvasId];
    if (!state) return;

    mainCtx.save();
    state.drawedShapes.forEach((shape: RectShape) => {
        drawRect(mainCtx, shape);
    });
    mainCtx.restore();
};

export const useDrawRect = () => {
    // 初始化画矩形
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: Partial<CanvasBaseStyle> = {}
    ) => {
        // 矩形默认样式
        const defaultStyle: CanvasBaseStyle = {
            strokeStyle: '#ff0000',
            rectFillStyle: 'rgba(255, 0, 0, 0.1)',
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

        // 初始化矩形专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            canvasId,
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: existingShapes,
            tempRect: undefined,
            selectedRectId: undefined,
            activeControl: 'none',
            dragStartPos: undefined,
            tempSelectedRect: undefined,
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

        // 重绘已有图形（先清空Canvas并恢复背景，避免在已有图形上重复绘制）
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCtx.putImageData(originalCanvasBg, 0, 0);
        redrawAllAnnotations(canvasId, mainCtx);

        // 鼠标按下事件
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 检查是否点击了现有矩形
            const rects = [...state.drawedShapes].reverse();
            let clickedRect: RectShape | undefined;
            let targetControl: ControlPoint = 'none';

            for (const rect of rects) {
                targetControl = getControlPoint(x, y, rect);
                if (targetControl !== 'none') {
                    clickedRect = rect;
                    state.activeControl = targetControl;
                    break;
                }
            }

            if (clickedRect) {
                // 更新选中状态
                state.selectedRectId = clickedRect.id;
                state.tempSelectedRect = cloneRect(clickedRect);
                state.dragStartPos = { x, y };

                // 主画布：重绘除选中矩形外的其他图形
                restoreOriginalBgAndRedrawOthers(state, clickedRect.id);

                // 临时画布：先复制背景，再绘制选中矩形+控制点
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const bgX = Math.max(0, clickedRect.x - padding);
                const bgY = Math.max(0, clickedRect.y - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, clickedRect.width + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, clickedRect.height + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                state.tempCtx!.save();
                state.tempCtx!.strokeStyle = clickedRect.strokeStyle;
                state.tempCtx!.fillStyle = clickedRect.fillStyle;
                state.tempCtx!.lineWidth = clickedRect.lineWidth;
                state.tempCtx!.beginPath();
                state.tempCtx!.rect(clickedRect.x, clickedRect.y, clickedRect.width, clickedRect.height);
                state.tempCtx!.fill();
                state.tempCtx!.stroke();
                state.tempCtx!.restore();
                drawControlPoints(state.tempCtx!, clickedRect, state.currentStyle);

                // 同步更新光标
                updateCanvasCursor(state, targetControl);
                return;
            }

            // 未点击现有矩形，开始绘制新矩形
            state.isDrawing = true;
            state.startX = x;
            state.startY = y;
            state.tempRect = { x, y, width: 0, height: 0 };
        };
        mainCanvas.addEventListener('mousedown', handleMousedown);
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动事件
        const handleMousemove = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            if (state.isDrawing && state.tempRect) {
                // 绘制临时矩形
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.tempRect.width = x - state.startX;
                state.tempRect.height = y - state.startY;

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const rectX = Math.min(state.tempRect.x, state.tempRect.x + state.tempRect.width);
                const rectY = Math.min(state.tempRect.y, state.tempRect.y + state.tempRect.height);
                const rectW = Math.abs(state.tempRect.width);
                const rectH = Math.abs(state.tempRect.height);
                const bgX = Math.max(0, rectX - padding);
                const bgY = Math.max(0, rectY - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, rectW + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, rectH + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                state.tempCtx!.save();
                state.tempCtx!.strokeStyle = state.currentStyle.strokeStyle;
                state.tempCtx!.fillStyle = state.currentStyle.rectFillStyle || 'transparent';
                state.tempCtx!.lineWidth = state.currentStyle.lineWidth;
                state.tempCtx!.beginPath();
                state.tempCtx!.rect(
                    state.tempRect.x,
                    state.tempRect.y,
                    state.tempRect.width,
                    state.tempRect.height
                );
                state.tempCtx!.fill();
                state.tempCtx!.stroke();
                state.tempCtx!.restore();
                return;
            }

            // 处理矩形拖拽
            if (state.tempSelectedRect && state.dragStartPos && state.activeControl !== 'none') {
                const dx = x - state.dragStartPos.x;
                const dy = y - state.dragStartPos.y;
                const tempRect = { ...state.tempSelectedRect };

                // 根据控制点类型处理拖拽
                switch (state.activeControl) {
                    case 'move':
                        tempRect.x += dx;
                        tempRect.y += dy;
                        break;
                    case 'topLeft':
                        tempRect.x += dx;
                        tempRect.y += dy;
                        tempRect.width -= dx;
                        tempRect.height -= dy;
                        break;
                    case 'topRight':
                        tempRect.y += dy;
                        tempRect.width += dx;
                        tempRect.height -= dy;
                        break;
                    case 'bottomLeft':
                        tempRect.x += dx;
                        tempRect.width -= dx;
                        tempRect.height += dy;
                        break;
                    case 'bottomRight':
                        tempRect.width += dx;
                        tempRect.height += dy;
                        break;
                }

                // 确保矩形尺寸不为负
                if (tempRect.width < MIN_RECT_SIZE) {
                    tempRect.width = MIN_RECT_SIZE;
                }
                if (tempRect.height < MIN_RECT_SIZE) {
                    tempRect.height = MIN_RECT_SIZE;
                }

                // 更新临时矩形
                tempRect.timestamp = Date.now();
                state.tempSelectedRect = tempRect;
                state.dragStartPos = { x, y };

                // 在临时画布上绘制
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 复制背景区域到临时Canvas，确保半透明色视觉一致
                const padding = 20;
                const bgX = Math.max(0, tempRect.x - padding);
                const bgY = Math.max(0, tempRect.y - padding);
                const bgW = Math.min(state.mainCanvas.width - bgX, tempRect.width + padding * 2);
                const bgH = Math.min(state.mainCanvas.height - bgY, tempRect.height + padding * 2);
                const bgImageData = state.mainCtx.getImageData(bgX, bgY, bgW, bgH);
                state.tempCtx!.putImageData(bgImageData, bgX, bgY);

                state.tempCtx!.save();
                state.tempCtx!.strokeStyle = tempRect.strokeStyle;
                state.tempCtx!.fillStyle = tempRect.fillStyle;
                state.tempCtx!.lineWidth = tempRect.lineWidth;
                state.tempCtx!.beginPath();
                state.tempCtx!.rect(tempRect.x, tempRect.y, tempRect.width, tempRect.height);
                state.tempCtx!.fill();
                state.tempCtx!.stroke();
                state.tempCtx!.restore();

                // 绘制控制点（使用配置样式）
                drawControlPoints(state.tempCtx!, tempRect, state.currentStyle);
                return;
            }

            // 更新光标（非绘制/拖拽状态）
            let targetControl: ControlPoint = 'none';
            if (!state.isDrawing && !state.tempSelectedRect) {
                const rects = [...state.drawedShapes].reverse();
                for (const rect of rects) {
                    targetControl = getControlPoint(x, y, rect);
                    if (targetControl !== 'none') break;
                }
            }
            updateCanvasCursor(state, targetControl);
        };
        document.addEventListener('mousemove', handleMousemove);
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开事件
        const handleMouseup = () => {
            if (state.isDrawing && state.tempRect) {
                // 过滤过小的矩形
                if (Math.abs(state.tempRect.width) > MIN_RECT_SIZE &&
                    Math.abs(state.tempRect.height) > MIN_RECT_SIZE) {
                    // 立即清空临时Canvas，避免视觉叠加
                    state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                    // 标准化矩形坐标（确保宽高为正）
                    const x = state.tempRect.width > 0 ? state.tempRect.x : state.tempRect.x + state.tempRect.width;
                    const y = state.tempRect.height > 0 ? state.tempRect.y : state.tempRect.y + state.tempRect.height;
                    const width = Math.abs(state.tempRect.width);
                    const height = Math.abs(state.tempRect.height);

                    // 保存矩形
                    state.drawedShapes.push({
                        id: generateId(),
                        type: 'rect',
                        x,
                        y,
                        width,
                        height,
                        strokeStyle: state.currentStyle.strokeStyle,
                        fillStyle: state.currentStyle.rectFillStyle || 'transparent',
                        lineWidth: state.currentStyle.lineWidth,
                        timestamp: Date.now(),
                        canvasId: state.canvasId
                    });

                    // 重绘所有矩形
                    state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                    state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                    redrawAllAnnotations(canvasId, state.mainCtx);
                }
                state.tempRect = undefined;
                state.isDrawing = false;
            }

            // 处理选中矩形的更新
            if (state.tempSelectedRect && state.selectedRectId) {
                // 更新原始矩形数据
                const index = state.drawedShapes.findIndex(s => s.id === state.selectedRectId);
                if (index !== -1) {
                    state.drawedShapes[index] = {
                        ...state.tempSelectedRect,
                        timestamp: Date.now()
                    };
                }

                // 重绘所有矩形
                state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                redrawAllAnnotations(canvasId, state.mainCtx);

                // 清空临时状态
                state.tempSelectedRect = undefined;
                state.selectedRectId = undefined;
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

    // 清空矩形批注
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        clearCommonAnnotations(state, mainCanvas, redrawOriginalContent);
    };

    // 销毁画矩形功能
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

    // 获取矩形数据
    const getShapes = (canvasId?: string): RectShape[] => {
        if (canvasId) {
            const state = canvasStates[canvasId];
            return state ? [...state.drawedShapes] : [];
        }
        return Object.values(canvasStates).flatMap(state => state.drawedShapes);
    };

    // 缩放批注坐标（用于PDF缩放）
    const scaleAnnotations = (canvasId: string, scaleRatio: number) => {
        const state = canvasStates[canvasId];
        if (!state || scaleRatio === 1) return;

        // 只缩放已完成的批注（不缩放正在编辑的）
        state.drawedShapes = state.drawedShapes.map((shape: RectShape) => ({
            ...shape,
            x: shape.x * scaleRatio,
            y: shape.y * scaleRatio,
            width: shape.width * scaleRatio,
            height: shape.height * scaleRatio
        }));

        // 更新原始背景（在缩放后保存新的背景）
        if (state.originalCanvasBg && state.mainCanvas) {
            state.originalCanvasBg = state.mainCtx.getImageData(
                0, 0, state.mainCanvas.width, state.mainCanvas.height
            );
        }
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        clearAnnotations,
        destroy,
        getShapes,
        scaleAnnotations
    };
};