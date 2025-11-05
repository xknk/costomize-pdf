import { eTs, CanvasBaseState, createTempCanvas, getElementRectRelativeToParent, initCtxStyles, getCanvasPos, clearCommonAnnotations, destroyCommon } from './common/common';
import { generateId } from './common/common'; // 假设存在此工具函数


// 矩形的类型定义
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
    updateTime: number; // 最后更新时间戳
    timestamp: number; // 创建时间戳，用于排序
    canvasId: string; // 所属画布ID
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
    canvasId: string; // 画布ID
}

const canvasStates: Record<string, RectCanvasState> = {};
// 关键配置：分离视觉大小和点击范围
const CONTROL_POINT_VISUAL_SIZE = 8; // 控制点视觉大小（蓝色方块，保持8x8不变）
const CONTROL_POINT_HIT_SIZE = 16;   // 控制点点击范围（扩大到16x16，提升选中率）
const CONTROL_POINT_VISUAL_OFFSET = CONTROL_POINT_VISUAL_SIZE / 2; // 视觉偏移（用于绘制）
const CONTROL_POINT_HIT_OFFSET = CONTROL_POINT_HIT_SIZE / 2;       // 点击偏移（用于判断命中）
const MIN_RECT_SIZE = 10; // 矩形最小尺寸

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
        updateTime: rect.updateTime,
        timestamp: rect.timestamp,
        canvasId: rect.canvasId
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

    // 遍历最新的drawedShapes，重绘所有矩形（按创建顺序）
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

    // 重绘所有矩形（确保主画布显示最新位置）
    restoreOriginalBgAndRedrawAll(state);

    // 彻底清空临时状态
    state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
    state.tempSelectedRect = undefined;
    state.selectedRectId = undefined;
    state.activeControl = 'none';
    state.dragStartPos = undefined;
};

// 初始化画矩形功能
export const useDrawRect = () => {
    // 初始化画矩形
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
        // 矩形默认样式
        const defaultStyle = {
            strokeStyle: '#ff0000', // 红色边框
            rectFillStyle: 'rgba(255, 0, 0, 0.1)', // 红色半透明填充
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

        // 保存已有图形数据
        const existingShapes = canvasStates[canvasId]?.drawedShapes || [];
        const existingBg = canvasStates[canvasId]?.originalCanvasBg;

        // 创建临时Canvas
        const tempCanvas = createTempCanvas(mainCanvas, mainCanvasParent, canvasId);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('浏览器不支持Canvas');

        // 保存原始背景（不含批注的干净背景）
        const originalCanvasBg = existingBg || mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);


        // 初始化矩形专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            canvasId,
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: existingShapes, // 保留已有图形
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
            currentStyle: {
                strokeStyle: currentStyle.strokeStyle,
                rectFillStyle: currentStyle.rectFillStyle,
                lineWidth: currentStyle.lineWidth,
            },
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
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 检查是否点击了现有矩形
            const rects = [...state.drawedShapes].reverse(); // 逆序检查，优先顶层矩形
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
                // 1. 更新选中状态（原子操作）
                state.selectedRectId = clickedRect.id;
                state.tempSelectedRect = cloneRect(clickedRect);
                state.dragStartPos = { x, y };

                // 2. 主画布：重绘除选中矩形外的其他图形（无延迟）
                restoreOriginalBgAndRedrawOthers(state, clickedRect.id);

                // 3. 临时画布：立即绘制选中矩形+控制点（关键优化：消除首次激活延迟）
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.tempCtx.save();
                state.tempCtx.strokeStyle = clickedRect.strokeStyle;
                state.tempCtx.fillStyle = clickedRect.fillStyle;
                state.tempCtx.lineWidth = clickedRect.lineWidth;
                state.tempCtx.beginPath();
                state.tempCtx.rect(clickedRect.x, clickedRect.y, clickedRect.width, clickedRect.height);
                state.tempCtx.fill();
                state.tempCtx.stroke();
                state.tempCtx.restore();
                drawControlPoints(state.tempCtx, clickedRect);

                // 4. 同步更新光标
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
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.tempRect.width = x - state.startX;
                state.tempRect.height = y - state.startY;

                state.tempCtx.save();
                state.tempCtx.strokeStyle = state.currentStyle.strokeStyle;
                state.tempCtx.fillStyle = state.currentStyle.rectFillStyle;
                state.tempCtx.lineWidth = state.currentStyle.lineWidth;
                state.tempCtx.beginPath();
                state.tempCtx.rect(
                    state.tempRect.x,
                    state.tempRect.y,
                    state.tempRect.width,
                    state.tempRect.height
                );
                state.tempCtx.fill();
                state.tempCtx.stroke();
                state.tempCtx.restore();
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
                tempRect.updateTime = Date.now();
                state.tempSelectedRect = tempRect;
                state.dragStartPos = { x, y };

                // 在临时画布上绘制
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.tempCtx.save();
                state.tempCtx.strokeStyle = tempRect.strokeStyle;
                state.tempCtx.fillStyle = tempRect.fillStyle;
                state.tempCtx.lineWidth = tempRect.lineWidth;
                state.tempCtx.beginPath();
                state.tempCtx.rect(tempRect.x, tempRect.y, tempRect.width, tempRect.height);
                state.tempCtx.fill();
                state.tempCtx.stroke();
                state.tempCtx.restore();

                // 绘制控制点
                drawControlPoints(state.tempCtx, tempRect);
                return;
            }

            // 更新光标（非绘制/拖拽状态）
            let targetControl: ControlPoint = 'none';
            if (!state.isDrawing && !state.tempSelectedRect) {
                // 检查是否悬停在矩形上
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
                // 完成矩形绘制
                let { x, y, width, height } = state.tempRect;

                // 修复矩形偏移问题：正确处理正负尺寸
                const actualX = width < 0 ? x + width : x;
                const actualY = height < 0 ? y + height : y;
                const actualWidth = Math.abs(width);
                const actualHeight = Math.abs(height);

                const newRect: RectShape = {
                    id: generateId(),
                    type: 'rect',
                    x: actualX,
                    y: actualY,
                    width: actualWidth,
                    height: actualHeight,
                    strokeStyle: state.currentStyle.strokeStyle,
                    fillStyle: state.currentStyle.rectFillStyle,
                    lineWidth: state.currentStyle.lineWidth,
                    updateTime: Date.now(),
                    timestamp: Date.now(),
                    canvasId: state.canvasId
                };

                // 确保矩形尺寸有效
                if (actualWidth > MIN_RECT_SIZE && actualHeight > MIN_RECT_SIZE) {
                    state.drawedShapes.push(newRect);
                    // 重绘所有图形
                    restoreOriginalBgAndRedrawAll(state);
                }

                // 清空临时数据
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.isDrawing = false;
                state.tempRect = undefined;
            } else if (state.tempSelectedRect && state.selectedRectId) {
                // 保存拖拽后的矩形
                const index = state.drawedShapes.findIndex(rect => rect.id === state.selectedRectId);
                if (index !== -1) {
                    state.drawedShapes[index] = {
                        ...state.tempSelectedRect,
                        updateTime: Date.now()
                    };
                    // 重绘所有图形
                    restoreOriginalBgAndRedrawAll(state);
                }

                // 清空临时数据
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.selectedRectId = undefined;
                state.tempSelectedRect = undefined;
                state.activeControl = 'none';
                state.dragStartPos = undefined;
            }
        };
        document.addEventListener('mouseup', handleMouseup);
        document.addEventListener('mouseleave', handleMouseup);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseup);
            document.removeEventListener('mouseleave', handleMouseup);
        });
    };

    // 重绘所有矩形
    const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        // 先清除再重绘
        mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
        if (state.originalCanvasBg) {
            mainCtx.putImageData(state.originalCanvasBg, 0, 0);
        }

        // 绘制所有矩形
        mainCtx.save();
        state.drawedShapes.forEach((rect: RectShape) => {
            mainCtx.strokeStyle = rect.strokeStyle;
            mainCtx.fillStyle = rect.fillStyle;
            mainCtx.lineWidth = rect.lineWidth;
            mainCtx.beginPath();
            mainCtx.rect(rect.x, rect.y, rect.width, rect.height);
            mainCtx.fill();
            mainCtx.stroke();
        });
        mainCtx.restore();
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

    // 销毁矩形功能（保留图形数据）
    const destroy = (canvasId: string, keepShapes: boolean = true) => {
        const state = canvasStates[canvasId];
        if (state) {
            // 保存图形数据
            const shapes = state.drawedShapes;
            const bg = state.originalCanvasBg;

            // 销毁资源
            destroyCommon(canvasId, state);

            // 如果需要保留数据，不删除状态而是重置它
            if (keepShapes) {
                canvasStates[canvasId] = {
                    ...state,
                    tempCanvas: null as unknown as HTMLCanvasElement,
                    tempCtx: null as unknown as CanvasRenderingContext2D,
                    cleanupEvents: [],
                    isDrawing: false,
                    drawedShapes: shapes,
                    originalCanvasBg: bg,
                    tempRect: undefined,
                    selectedRectId: undefined,
                    activeControl: 'none',
                    dragStartPos: undefined,
                    tempSelectedRect: undefined
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

        // 返回所有画布的矩形
        return Object.values(canvasStates)
            .flatMap(state => state.drawedShapes);
    };

    // 加载矩形数据
    const loadShapes = (shapes: RectShape[], canvasId: string) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        // 过滤出属于当前画布的矩形
        const canvasShapes = shapes.filter(shape => shape.canvasId === canvasId);

        // 按时间戳排序
        canvasShapes.sort((a, b) => a.timestamp - b.timestamp);

        // 加载矩形
        state.drawedShapes = [...canvasShapes];

        // 重绘
        if (state.mainCanvas && state.mainCtx) {
            redrawAllAnnotations(canvasId, state.mainCtx);
        }
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        clearAnnotations,
        destroy,
        getShapes,
        loadShapes
    };
};