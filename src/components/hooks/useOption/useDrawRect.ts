import { eTs, CanvasBaseState, createTempCanvas, getElementRectRelativeToParent, initCtxStyles, getCanvasPos, clearCommonAnnotations, destroyCommon } from './common/common';

// 矩形的类型定义（新增updateTime时间戳，标记最后更新时间）
export interface RectShape {
    id: string; // 唯一标识
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    isSelected?: boolean; // 选中状态标记
    updateTime: number; // 最后更新时间戳（创建/移动/缩放时更新）
}

// 缩放控制点类型
type ControlPoint = 'none' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'move';

// 光标样式映射表
const CONTROL_CURSOR_MAP: Record<ControlPoint, string> = {
    none: 'default',
    move: 'grab',
    topLeft: 'nwse-resize',
    topRight: 'nesw-resize',
    bottomLeft: 'nesw-resize',
    bottomRight: 'nwse-resize'
};

// 画矩形专属状态（保留原始背景）
interface RectCanvasState extends CanvasBaseState {
    drawedShapes: RectShape[];
    tempRect?: { x: number; y: number; width: number; height: number };
    selectedRectId?: string; // 当前选中的矩形ID（持续激活）
    activeControl: ControlPoint; // 当前激活的控制点
    dragStartPos?: { x: number; y: number }; // 拖拽起始位置
    tempSelectedRect?: RectShape; // 临时画布上的激活矩形（保持激活状态）
    tempCanvas: HTMLCanvasElement; // 临时画布
    tempCtx: CanvasRenderingContext2D; // 临时画布上下文
    mainCanvas: HTMLCanvasElement; // 主画布
    mainCtx: CanvasRenderingContext2D; // 主画布上下文
    originalCanvasBg?: ImageData; // 主画布原始背景（不含任何矩形批注）
    currentStyle: { // 样式配置
        strokeStyle: string;
        rectFillStyle: string;
        lineWidth: number;
    };
    cleanupEvents: (() => void)[]; // 事件清理函数列表
    currentCursor: string; // 记录当前光标样式
}

const canvasStates: Record<string, RectCanvasState> = {};
// 关键配置：分离视觉大小和点击范围
const CONTROL_POINT_VISUAL_SIZE = 8; // 控制点视觉大小（蓝色方块，保持8x8不变）
const CONTROL_POINT_HIT_SIZE = 16;   // 控制点点击范围（扩大到16x16，提升选中率）
const CONTROL_POINT_VISUAL_OFFSET = CONTROL_POINT_VISUAL_SIZE / 2; // 视觉偏移（用于绘制）
const CONTROL_POINT_HIT_OFFSET = CONTROL_POINT_HIT_SIZE / 2;       // 点击偏移（用于判断命中）
const MIN_RECT_SIZE = 10; // 矩形最小尺寸

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 手动克隆矩形数据（包含updateTime）
const cloneRect = (rect: RectShape): RectShape => {
    return {
        id: rect.id,
        type: 'rect',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        strokeStyle: rect.strokeStyle,
        fillStyle: rect.fillStyle,
        lineWidth: rect.lineWidth,
        isSelected: rect.isSelected ?? false,
        updateTime: rect.updateTime // 克隆时间戳，保持层级不变
    };
};

// 检查点是否在矩形内（移动区域）- 极致严谨
const isPointInRect = (x: number, y: number, rect: RectShape): boolean => {
    if (typeof rect.x !== 'number' || typeof rect.y !== 'number' ||
        typeof rect.width !== 'number' || typeof rect.height !== 'number') {
        return false;
    }
    return x >= rect.x && x <= rect.x + rect.width &&
        y >= rect.y && y <= rect.y + rect.height;
};

// 扩大控制点点击范围的判断逻辑（终极严谨版）
const getControlPoint = (x: number, y: number, rect: RectShape): ControlPoint => {
    if (typeof rect.x !== 'number' || typeof rect.y !== 'number' ||
        typeof rect.width !== 'number' || typeof rect.height !== 'number' ||
        rect.width <= 0 || rect.height <= 0) {
        return 'none';
    }

    const topLeft = {
        x: rect.x - CONTROL_POINT_VISUAL_OFFSET,
        y: rect.y - CONTROL_POINT_VISUAL_OFFSET
    };
    const topRight = {
        x: rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET,
        y: rect.y - CONTROL_POINT_VISUAL_OFFSET
    };
    const bottomLeft = {
        x: rect.x - CONTROL_POINT_VISUAL_OFFSET,
        y: rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET
    };
    const bottomRight = {
        x: rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET,
        y: rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET
    };

    if (Math.abs(x - topLeft.x) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - topLeft.y) <= CONTROL_POINT_HIT_OFFSET) {
        return 'topLeft';
    }
    if (Math.abs(x - topRight.x) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - topRight.y) <= CONTROL_POINT_HIT_OFFSET) {
        return 'topRight';
    }
    if (Math.abs(x - bottomLeft.x) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - bottomLeft.y) <= CONTROL_POINT_HIT_OFFSET) {
        return 'bottomLeft';
    }
    if (Math.abs(x - bottomRight.x) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - bottomRight.y) <= CONTROL_POINT_HIT_OFFSET) {
        return 'bottomRight';
    }
    if (isPointInRect(x, y, rect)) {
        return 'move';
    }
    return 'none';
};

// 绘制控制点（基于实时位置）
const drawControlPoints = (ctx: CanvasRenderingContext2D, rect: RectShape) => {
    ctx.save();
    ctx.fillStyle = '#409eff';
    ctx.fillRect(rect.x - CONTROL_POINT_VISUAL_OFFSET, rect.y - CONTROL_POINT_VISUAL_OFFSET, CONTROL_POINT_VISUAL_SIZE, CONTROL_POINT_VISUAL_SIZE);
    ctx.fillRect(rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET, rect.y - CONTROL_POINT_VISUAL_OFFSET, CONTROL_POINT_VISUAL_SIZE, CONTROL_POINT_VISUAL_SIZE);
    ctx.fillRect(rect.x - CONTROL_POINT_VISUAL_OFFSET, rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET, CONTROL_POINT_VISUAL_SIZE, CONTROL_POINT_VISUAL_SIZE);
    ctx.fillRect(rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET, rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET, CONTROL_POINT_VISUAL_SIZE, CONTROL_POINT_VISUAL_SIZE);
    ctx.restore();
};

// 更新Canvas光标样式（仅基于实时判定结果）
const updateCanvasCursor = (state: RectCanvasState, targetControl: ControlPoint) => {
    let targetCursor = state.dragStartPos
        ? (targetControl === 'move' ? 'grabbing' : CONTROL_CURSOR_MAP[targetControl])
        : CONTROL_CURSOR_MAP[targetControl];

    if (state.currentCursor === targetCursor) return;

    state.mainCanvas.style.cursor = targetCursor;
    state.tempCanvas.style.cursor = targetCursor;
    state.currentCursor = targetCursor;
};

// 核心：恢复原始背景 + 重绘所有矩形（基于最新drawedShapes）
const restoreOriginalBgAndRedrawAll = (state: RectCanvasState) => {
    if (!state.originalCanvasBg) return;

    const mainCtx = state.mainCtx;
    mainCtx.putImageData(state.originalCanvasBg, 0, 0);

    // 遍历最新的drawedShapes，重绘所有矩形（按创建顺序，视觉上不影响层级，点击层级由时间戳控制）
    state.drawedShapes.forEach(rect => {
        mainCtx.save();
        mainCtx.strokeStyle = rect.strokeStyle;
        mainCtx.fillStyle = rect.fillStyle;
        mainCtx.lineWidth = rect.lineWidth;
        mainCtx.beginPath();
        mainCtx.rect(rect.x, rect.y, rect.width, rect.height);
        mainCtx.fill();
        mainCtx.stroke();
        mainCtx.restore();
    });
};

// 核心：恢复原始背景 + 重绘除指定矩形外的其他矩形（基于最新drawedShapes）
const restoreOriginalBgAndRedrawOthers = (state: RectCanvasState, excludeRectId?: string) => {
    if (!state.originalCanvasBg) return;

    const mainCtx = state.mainCtx;
    mainCtx.putImageData(state.originalCanvasBg, 0, 0);

    state.drawedShapes.forEach(rect => {
        if (rect.id !== excludeRectId) {
            mainCtx.save();
            mainCtx.strokeStyle = rect.strokeStyle;
            mainCtx.fillStyle = rect.fillStyle;
            mainCtx.lineWidth = rect.lineWidth;
            mainCtx.beginPath();
            mainCtx.rect(rect.x, rect.y, rect.width, rect.height);
            mainCtx.fill();
            mainCtx.stroke();
            mainCtx.restore();
        }
    });
};

// 核心：将临时矩形归位到主画布（更新时间戳，保持层级）
const restoreTempSelectedRectToMain = (state: RectCanvasState) => {
    if (!state.tempSelectedRect || !state.originalCanvasBg) {
        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempSelectedRect = undefined;
        state.selectedRectId = undefined;
        state.activeControl = 'none';
        state.dragStartPos = undefined;
        return;
    }

    const tempRect = cloneRect(state.tempSelectedRect);
    const originalRectIndex = state.drawedShapes.findIndex(r => r.id === tempRect.id);

    if (originalRectIndex === -1) {
        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempSelectedRect = undefined;
        state.selectedRectId = undefined;
        state.activeControl = 'none';
        state.dragStartPos = undefined;
        return;
    }

    // 归位时保留更新后的时间戳（移动/缩放后的时间戳已更新）
    const finalRect = { ...tempRect, isSelected: false };
    state.drawedShapes.splice(originalRectIndex, 1, finalRect);
    state.drawedShapes = [...state.drawedShapes]; // 强制刷新数组引用

    // 重绘所有矩形（确保主画布显示最新位置）
    restoreOriginalBgAndRedrawAll(state);

    // 彻底清空临时状态
    state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
    state.tempSelectedRect = undefined;
    state.selectedRectId = undefined;
    state.activeControl = 'none';
    state.dragStartPos = undefined;
};

// 从最新的drawedShapes中查找点击的矩形（按updateTime降序，优先最新更新的矩形）
const findClickedRectInLatestShapes = (state: RectCanvasState, x: number, y: number): { rect?: RectShape; control: ControlPoint } => {
    // 1. 克隆数组 + 按updateTime降序排序（最新更新的排在前面）
    const sortedRects = state.drawedShapes
        .map(cloneRect)
        .sort((a, b) => b.updateTime - a.updateTime); // 降序：时间戳越大越靠前

    let targetRect: RectShape | undefined;
    let targetControl: ControlPoint = 'none';

    // 2. 遍历排序后的数组，优先命中最新更新的矩形
    for (const rect of sortedRects) {
        const control = getControlPoint(x, y, rect);
        if (control !== 'none') {
            targetRect = rect;
            targetControl = control;
            break; // 找到第一个命中的（最新的）就退出
        }
    }

    return { rect: targetRect, control: targetControl };
};

export const useDrawRect = () => {
    // 初始化画矩形功能（新增层级逻辑）
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: {
            strokeStyle?: string;
            rectFillStyle?: string;
            lineWidth?: number;
        } = {}
    ) => {
        const defaultStyle = {
            strokeStyle: '#ff0000',
            rectFillStyle: 'rgba(255, 0, 0, 0.5)',
            lineWidth: 3,
        };
        const currentStyle = { ...defaultStyle, ...customStyle };

        const mainCanvasParent = mainCanvas.parentElement;
        if (!mainCanvasParent) throw new Error('主Canvas必须有直接父容器');
        if (getComputedStyle(mainCanvasParent).position !== 'relative') {
            mainCanvasParent.style.position = 'relative';
            mainCanvasParent.style.overflow = 'visible';
        }

        const tempCanvas = createTempCanvas(mainCanvas, mainCanvasParent, canvasId);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('浏览器不支持Canvas');

        // 保存主画布原始背景（初始化时唯一一次获取）
        const originalCanvasBg = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);

        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            isDrawing: false,
            startX: 0,
            startY: 0,
            tempRect: undefined,
            drawedShapes: [],
            currentStyle,
            tempCanvas,
            tempCtx,
            mainCanvas,
            mainCtx,
            originalCanvasBg,
            cleanupEvents,
            selectedRectId: undefined,
            activeControl: 'none',
            tempSelectedRect: undefined,
            currentCursor: 'default'
        };
        const state = canvasStates[canvasId];

        initCtxStyles(mainCtx, currentStyle);
        initCtxStyles(tempCtx, currentStyle);

        // 鼠标按下事件（保持激活时序，叠加层级判定）
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 1. 强制重置所有状态
            state.activeControl = 'none';
            state.dragStartPos = undefined;
            let clickedRect: RectShape | undefined;
            let targetControl: ControlPoint = 'none';
            let isClickOnActiveRect = false;

            // 2. 优先判断点击当前激活的临时矩形（仅当临时矩形存在时）
            if (state.tempSelectedRect) {
                const clonedTempRect = cloneRect(state.tempSelectedRect);
                targetControl = getControlPoint(x, y, clonedTempRect);
                if (targetControl !== 'none') {
                    clickedRect = clonedTempRect;
                    isClickOnActiveRect = true;
                }
            }

            // 3. 未点击临时矩形：先归位，再从最新数据中查找点击目标（按层级排序）
            if (!isClickOnActiveRect) {
                restoreTempSelectedRectToMain(state);
                const { rect, control } = findClickedRectInLatestShapes(state, x, y);
                if (rect && control !== 'none') {
                    clickedRect = rect;
                    targetControl = control;
                }
            }

            // 4. 处理点击逻辑
            if (clickedRect) {
                if (!isClickOnActiveRect) {
                    // 激活新矩形：基于归位后的最新数据
                    state.selectedRectId = clickedRect.id;
                    restoreOriginalBgAndRedrawOthers(state, clickedRect.id);
                    state.tempSelectedRect = { ...cloneRect(clickedRect), isSelected: true };
                    state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    state.tempCtx.save();
                    state.tempCtx.strokeStyle = clickedRect.strokeStyle;
                    state.tempCtx.fillStyle = clickedRect.fillStyle;
                    state.tempCtx.lineWidth = clickedRect.lineWidth;
                    state.tempCtx.beginPath();
                    state.tempCtx.rect(clickedRect.x, clickedRect.y, clickedRect.width, clickedRect.height);
                    state.tempCtx.fill();
                    state.tempCtx.stroke();
                    drawControlPoints(state.tempCtx, clickedRect);
                    state.tempCtx.restore();
                }

                // 准备拖拽
                state.activeControl = targetControl;
                state.dragStartPos = { x, y };
                updateCanvasCursor(state, targetControl);
            } else {
                // 点击空白区域：彻底归位，准备绘制新矩形
                restoreTempSelectedRectToMain(state);
                state.mainCanvas.style.cursor = 'crosshair';
                state.tempCanvas.style.cursor = 'crosshair';
                state.currentCursor = 'crosshair';
                state.isDrawing = true;
                state.startX = x;
                state.startY = y;
                state.tempRect = { x, y, width: 0, height: 0 };
            }
        };
        mainCanvas.addEventListener('mousedown', handleMousedown, { passive: true });
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动事件（移动/缩放时更新时间戳）
        const handleMousemove = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x: currX, y: currY } = getCanvasPos(evt, mainCanvas);

            // 1. 绘制新矩形逻辑
            if (state.isDrawing && state.tempRect) {
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                const rectX = Math.min(state.startX, currX);
                const rectY = Math.min(state.startY, currY);
                const rectWidth = Math.max(MIN_RECT_SIZE, Math.abs(currX - state.startX));
                const rectHeight = Math.max(MIN_RECT_SIZE, Math.abs(currY - state.startY));

                state.tempCtx.save();
                state.tempCtx.strokeStyle = currentStyle.strokeStyle;
                state.tempCtx.fillStyle = currentStyle.rectFillStyle!;
                state.tempCtx.lineWidth = currentStyle.lineWidth;
                state.tempCtx.beginPath();
                state.tempCtx.rect(rectX, rectY, rectWidth, rectHeight);
                state.tempCtx.fill();
                state.tempCtx.stroke();
                drawControlPoints(state.tempCtx, {
                    id: '',
                    type: 'rect',
                    x: rectX,
                    y: rectY,
                    width: rectWidth,
                    height: rectHeight,
                    strokeStyle: '',
                    fillStyle: '',
                    lineWidth: currentStyle.lineWidth,
                    updateTime: Date.now() // 临时值，不影响最终
                });
                state.tempCtx.restore();

                state.tempRect = { x: rectX, y: rectY, width: rectWidth, height: rectHeight };
                return;
            }

            // 2. 光标更新逻辑（按层级判定）
            if (!state.isDrawing && !state.dragStartPos) {
                let targetControl: ControlPoint = 'none';

                // 优先检查激活的临时矩形
                if (state.tempSelectedRect) {
                    const clonedTempRect = cloneRect(state.tempSelectedRect);
                    targetControl = getControlPoint(currX, currY, clonedTempRect);
                }

                // 无激活矩形：从最新drawedShapes中按层级判定
                if (targetControl === 'none') {
                    const { control } = findClickedRectInLatestShapes(state, currX, currY);
                    targetControl = control;
                }

                updateCanvasCursor(state, targetControl);
                return;
            }

            // 3. 拖拽/缩放逻辑（核心：更新临时矩形的updateTime）
            if (state.tempSelectedRect && state.activeControl !== 'none' && state.dragStartPos) {
                const tempRect = cloneRect(state.tempSelectedRect);
                const dx = currX - state.dragStartPos.x;
                const dy = currY - state.dragStartPos.y;

                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 计算新位置
                let newX = tempRect.x;
                let newY = tempRect.y;
                let newWidth = tempRect.width;
                let newHeight = tempRect.height;

                switch (state.activeControl) {
                    case 'move':
                        newX += dx;
                        newY += dy;
                        break;
                    case 'topLeft':
                        newX += dx;
                        newY += dy;
                        newWidth = Math.max(MIN_RECT_SIZE, tempRect.width - dx);
                        newHeight = Math.max(MIN_RECT_SIZE, tempRect.height - dy);
                        break;
                    case 'topRight':
                        newY += dy;
                        newWidth = Math.max(MIN_RECT_SIZE, tempRect.width + dx);
                        newHeight = Math.max(MIN_RECT_SIZE, tempRect.height - dy);
                        break;
                    case 'bottomLeft':
                        newX += dx;
                        newWidth = Math.max(MIN_RECT_SIZE, tempRect.width - dx);
                        newHeight = Math.max(MIN_RECT_SIZE, tempRect.height + dy);
                        break;
                    case 'bottomRight':
                        newWidth = Math.max(MIN_RECT_SIZE, tempRect.width + dx);
                        newHeight = Math.max(MIN_RECT_SIZE, tempRect.height + dy);
                        break;
                }

                // 关键：更新时间戳为当前时间（标记为最新更新）
                const updatedTempRect = cloneRect({
                    ...tempRect,
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                    updateTime: Date.now() // 移动/缩放时更新时间戳
                });
                state.tempSelectedRect = updatedTempRect;

                // 绘制临时矩形
                state.tempCtx.save();
                state.tempCtx.strokeStyle = updatedTempRect.strokeStyle;
                state.tempCtx.fillStyle = updatedTempRect.fillStyle;
                state.tempCtx.lineWidth = updatedTempRect.lineWidth;
                state.tempCtx.beginPath();
                state.tempCtx.rect(newX, newY, newWidth, newHeight);
                state.tempCtx.fill();
                state.tempCtx.stroke();
                drawControlPoints(state.tempCtx, updatedTempRect);
                state.tempCtx.restore();

                // 更新拖拽起始位置
                state.dragStartPos = { x: currX, y: currY };
            }
        };
        document.addEventListener('mousemove', handleMousemove, { passive: true });
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开事件（移动/缩放后自动归位，保留层级）
        const handleMouseEnd = () => {
            // 1. 强制重置拖拽状态
            const wasDragging = state.activeControl !== 'none' && state.dragStartPos;
            state.activeControl = 'none';
            state.dragStartPos = undefined;

            // 2. 处理绘制新矩形逻辑（创建时初始化时间戳）
            if (state.isDrawing && state.tempRect) {
                const { tempRect } = state;
                const isRectValid = tempRect.width >= MIN_RECT_SIZE && tempRect.height >= MIN_RECT_SIZE &&
                    !(tempRect.x + tempRect.width < 0 || tempRect.x > mainCanvas.width ||
                        tempRect.y + tempRect.height < 0 || tempRect.y > mainCanvas.height);

                if (isRectValid) {
                    const newRect: RectShape = {
                        id: generateId(),
                        type: 'rect',
                        x: tempRect.x,
                        y: tempRect.y,
                        width: tempRect.width,
                        height: tempRect.height,
                        strokeStyle: currentStyle.strokeStyle,
                        fillStyle: currentStyle.rectFillStyle!,
                        lineWidth: currentStyle.lineWidth,
                        isSelected: false,
                        updateTime: Date.now() // 新建矩形时初始化时间戳
                    };
                    state.drawedShapes.push(newRect);
                    state.drawedShapes = [...state.drawedShapes]; // 刷新数组引用
                    restoreOriginalBgAndRedrawAll(state);
                }

                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.isDrawing = false;
                state.tempRect = undefined;

                if (!state.tempSelectedRect) {
                    state.mainCanvas.style.cursor = 'default';
                    state.tempCanvas.style.cursor = 'default';
                    state.currentCursor = 'default';
                }
            }

            // 移动/缩放结束后自动归位，保留层级（时间戳已更新）
            if (wasDragging && state.tempSelectedRect) {
                restoreTempSelectedRectToMain(state);
            }
        };
        document.addEventListener('mouseup', handleMouseEnd);
        document.addEventListener('mouseleave', handleMouseEnd);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseEnd);
            document.removeEventListener('mouseleave', handleMouseEnd);
        });

        // 鼠标离开Canvas事件
        const handleMouseOut = () => {
            if (state.currentCursor !== 'default' && !state.dragStartPos) {
                state.mainCanvas.style.cursor = 'default';
                state.tempCanvas.style.cursor = 'default';
                state.currentCursor = 'default';
            }
        };
        mainCanvas.addEventListener('mouseout', handleMouseOut);
        tempCanvas.addEventListener('mouseout', handleMouseOut);
        cleanupEvents.push(() => {
            mainCanvas.removeEventListener('mouseout', handleMouseOut);
            tempCanvas.removeEventListener('mouseout', handleMouseOut);
        });
    };

    // 重绘所有矩形（基于最新drawedShapes）
    const redrawAllAnnotations = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        restoreOriginalBgAndRedrawAll(state);
    };

    // 清空所有批注（彻底重置）
    const clearAnnotations = (
        canvasId: string,
        redrawOriginalContent?: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        restoreTempSelectedRectToMain(state);
        state.drawedShapes = [];
        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempSelectedRect = undefined;
        state.selectedRectId = undefined;
        state.activeControl = 'none';
        state.dragStartPos = undefined;
        state.currentCursor = 'default';
        state.mainCanvas.style.cursor = 'default';
        state.tempCanvas.style.cursor = 'default';

        if (state.originalCanvasBg) {
            state.mainCtx.putImageData(state.originalCanvasBg, 0, 0);
        }

        if (redrawOriginalContent) redrawOriginalContent();
    };

    // 销毁功能（彻底清理所有资源）
    const destroy = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (state) {
            restoreTempSelectedRectToMain(state);
            state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
            state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
            state.cleanupEvents.forEach(cleanup => cleanup());
            state.mainCanvas.style.cursor = 'default';
            state.tempCanvas.style.cursor = 'default';
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