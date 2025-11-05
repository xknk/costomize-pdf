/* 仅画矩形功能Hook：扩大缩放控制点点击区域+优化选中体验 */
import { eTs, CanvasBaseState, createTempCanvas, getElementRectRelativeToParent, initCtxStyles, getCanvasPos, clearCommonAnnotations, destroyCommon } from './common/common';

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
    originalBgData?: ImageData; // 保存「矩形+控制点」的完整背景
}

// 缩放控制点类型
type ControlPoint = 'none' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'move';

// 光标样式映射表（保持原有逻辑）
const CONTROL_CURSOR_MAP: Record<ControlPoint, string> = {
    none: 'default',
    move: 'grab',
    topLeft: 'nwse-resize',
    topRight: 'nesw-resize',
    bottomLeft: 'nesw-resize',
    bottomRight: 'nwse-resize'
};

// 画矩形专属状态（保持原有逻辑）
interface RectCanvasState extends CanvasBaseState {
    drawedShapes: RectShape[];
    tempRect?: { x: number; y: number; width: number; height: number };
    selectedRectId?: string; // 当前选中的主Canvas矩形ID
    activeControl: ControlPoint; // 当前激活的控制点
    dragStartPos?: { x: number; y: number }; // 拖拽起始位置
    originalImageData?: ImageData; // 保存「不含矩形+控制点」的画布背景
    tempSelectedRect?: RectShape; // 转移到tempCanvas的选中矩形
    tempCanvas: HTMLCanvasElement; // 临时画布
    tempCtx: CanvasRenderingContext2D; // 临时画布上下文
    mainCanvas: HTMLCanvasElement; // 主画布
    currentStyle: { // 样式配置
        strokeStyle: string;
        rectFillStyle: string;
        lineWidth: number;
    };
    cleanupEvents: (() => void)[]; // 事件清理函数列表
    currentCursor: string; // 记录当前光标样式
}

const canvasStates: Record<string, RectCanvasState> = {};
// 关键修改：分离视觉大小和点击范围
const CONTROL_POINT_VISUAL_SIZE = 8; // 控制点视觉大小（蓝色方块，保持8x8不变）
const CONTROL_POINT_HIT_SIZE = 16;   // 控制点点击范围（扩大到16x16，提升选中率）
const CONTROL_POINT_VISUAL_OFFSET = CONTROL_POINT_VISUAL_SIZE / 2; // 视觉偏移（用于绘制）
const CONTROL_POINT_HIT_OFFSET = CONTROL_POINT_HIT_SIZE / 2;       // 点击偏移（用于判断命中）
const MIN_RECT_SIZE = 10; // 矩形最小尺寸

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 检查点是否在矩形内（移动区域）
const isPointInRect = (x: number, y: number, rect: RectShape) => {
    return x >= rect.x && x <= rect.x + rect.width &&
        y >= rect.y && y <= rect.y + rect.height;
};

// 关键修改：扩大控制点点击范围的判断逻辑
const getControlPoint = (x: number, y: number, rect: RectShape): ControlPoint => {
    // 左上角控制点：视觉在(rect.x - 4, rect.y - 4)，点击范围扩大到16x16
    if (Math.abs(x - (rect.x - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - (rect.y - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET) {
        return 'topLeft';
    }
    // 右上角控制点：视觉在(rect.x + width - 4, rect.y - 4)，点击范围16x16
    if (Math.abs(x - (rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - (rect.y - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET) {
        return 'topRight';
    }
    // 左下角控制点：视觉在(rect.x - 4, rect.y + height - 4)，点击范围16x16
    if (Math.abs(x - (rect.x - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - (rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET) {
        return 'bottomLeft';
    }
    // 右下角控制点：视觉在(rect.x + width - 4, rect.y + height - 4)，点击范围16x16
    if (Math.abs(x - (rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET &&
        Math.abs(y - (rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET)) <= CONTROL_POINT_HIT_OFFSET) {
        return 'bottomRight';
    }
    // 在矩形内（可移动）
    if (isPointInRect(x, y, rect)) {
        return 'move';
    }
    return 'none';
};

// 绘制控制点（视觉大小保持8x8不变，仅修改点击范围）
const drawControlPoints = (ctx: CanvasRenderingContext2D, rect: RectShape) => {
    ctx.save();
    ctx.fillStyle = '#409eff'; // 蓝色控制点（视觉不变）
    // 左上角（视觉位置：rect.x - 4, rect.y - 4，大小8x8）
    ctx.fillRect(
        rect.x - CONTROL_POINT_VISUAL_OFFSET,
        rect.y - CONTROL_POINT_VISUAL_OFFSET,
        CONTROL_POINT_VISUAL_SIZE,
        CONTROL_POINT_VISUAL_SIZE
    );
    // 右上角
    ctx.fillRect(
        rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET,
        rect.y - CONTROL_POINT_VISUAL_OFFSET,
        CONTROL_POINT_VISUAL_SIZE,
        CONTROL_POINT_VISUAL_SIZE
    );
    // 左下角
    ctx.fillRect(
        rect.x - CONTROL_POINT_VISUAL_OFFSET,
        rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET,
        CONTROL_POINT_VISUAL_SIZE,
        CONTROL_POINT_VISUAL_SIZE
    );
    // 右下角
    ctx.fillRect(
        rect.x + rect.width - CONTROL_POINT_VISUAL_OFFSET,
        rect.y + rect.height - CONTROL_POINT_VISUAL_OFFSET,
        CONTROL_POINT_VISUAL_SIZE,
        CONTROL_POINT_VISUAL_SIZE
    );
    ctx.restore();
};

// 精准擦除「矩形+控制点」（保持原有逻辑，不受点击范围影响）
const eraseRectWithControls = (mainCtx: CanvasRenderingContext2D, rect: RectShape) => {
    if (!rect.originalBgData) return;
    mainCtx.putImageData(
        rect.originalBgData,
        // 背景范围仍以视觉控制点为基准，避免擦除多余区域
        rect.x - CONTROL_POINT_VISUAL_OFFSET - rect.lineWidth,
        rect.y - CONTROL_POINT_VISUAL_OFFSET - rect.lineWidth
    );
};

// 计算「矩形+控制点」的完整背景范围（以视觉控制点为基准，不扩大）
const getRectWithControlsBgRange = (rect: RectShape) => {
    return {
        x: rect.x - CONTROL_POINT_VISUAL_OFFSET - rect.lineWidth,
        y: rect.y - CONTROL_POINT_VISUAL_OFFSET - rect.lineWidth,
        width: rect.width + 2 * (CONTROL_POINT_VISUAL_OFFSET + rect.lineWidth),
        height: rect.height + 2 * (CONTROL_POINT_VISUAL_OFFSET + rect.lineWidth)
    };
};

// 更新Canvas光标样式（保持原有逻辑）
const updateCanvasCursor = (state: RectCanvasState, targetControl: ControlPoint) => {
    let targetCursor = state.dragStartPos
        ? (targetControl === 'move' ? 'grabbing' : CONTROL_CURSOR_MAP[targetControl])
        : CONTROL_CURSOR_MAP[targetControl];

    if (state.currentCursor === targetCursor) return;

    state.mainCanvas.style.cursor = targetCursor;
    state.tempCanvas.style.cursor = targetCursor;
    state.currentCursor = targetCursor;
};

export const useDrawRect = () => {
    // 初始化画矩形功能（保持原有逻辑）
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
            cleanupEvents,
            selectedRectId: undefined,
            activeControl: 'none',
            tempSelectedRect: undefined,
            currentCursor: 'default'
        };
        const state = canvasStates[canvasId];

        initCtxStyles(mainCtx, currentStyle);
        initCtxStyles(tempCtx, currentStyle);

        // 鼠标按下事件（保持原有逻辑）
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            let selected = false;
            let selectedRect: RectShape | undefined;
            let targetControl: ControlPoint = 'none';

            for (let i = state.drawedShapes.length - 1; i >= 0; i--) {
                const rect = state.drawedShapes[i];
                const control = getControlPoint(x, y, rect);
                if (control !== 'none') {
                    targetControl = control;
                    selectedRect = rect;
                    selected = true;
                    break;
                }
            }

            if (selected && selectedRect) {
                eraseRectWithControls(mainCtx, selectedRect);
                state.originalImageData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.save();
                mainCtx.strokeStyle = selectedRect.strokeStyle;
                mainCtx.fillStyle = selectedRect.fillStyle;
                mainCtx.lineWidth = selectedRect.lineWidth;
                mainCtx.beginPath();
                mainCtx.rect(selectedRect.x, selectedRect.y, selectedRect.width, selectedRect.height);
                mainCtx.fill();
                mainCtx.stroke();
                drawControlPoints(mainCtx, selectedRect);
                mainCtx.restore();

                state.drawedShapes.forEach(r => r.isSelected = false);
                selectedRect.isSelected = true;
                state.selectedRectId = selectedRect.id;
                state.activeControl = targetControl;
                state.dragStartPos = { x, y };
                updateCanvasCursor(state, targetControl);
            } else {
                state.drawedShapes.forEach(r => r.isSelected = false);
                state.selectedRectId = undefined;
                state.activeControl = 'none';
                state.originalImageData = undefined;
                state.mainCanvas.style.cursor = 'crosshair';
                state.tempCanvas.style.cursor = 'crosshair';
                state.currentCursor = 'crosshair';

                state.isDrawing = true;
                state.startX = x;
                state.startY = y;
                state.tempRect = {
                    x: x - CONTROL_POINT_VISUAL_OFFSET,
                    y: y - CONTROL_POINT_VISUAL_OFFSET,
                    width: 0,
                    height: 0
                };
            }
        };
        mainCanvas.addEventListener('mousedown', handleMousedown, { passive: true });
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动事件（保持原有逻辑，仅光标判断依赖修改后的getControlPoint）
        const handleMousemove = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x: currX, y: currY } = getCanvasPos(evt, mainCanvas);

            if (state.isDrawing && state.tempRect) {
                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                const rectX = Math.min(state.startX, currX);
                const rectY = Math.min(state.startY, currY);
                const rectWidth = Math.abs(currX - state.startX);
                const rectHeight = Math.abs(currY - state.startY);

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
                    lineWidth: currentStyle.lineWidth
                });
                state.tempCtx.restore();

                state.tempRect = { x: rectX, y: rectY, width: rectWidth, height: rectHeight };
                return;
            }

            if (!state.isDrawing) {
                let targetControl: ControlPoint = 'none';
                for (let i = state.drawedShapes.length - 1; i >= 0; i--) {
                    const control = getControlPoint(currX, currY, state.drawedShapes[i]);
                    if (control !== 'none') {
                        targetControl = control;
                        break;
                    }
                }
                if (targetControl === 'none' && state.tempSelectedRect) {
                    targetControl = getControlPoint(currX, currY, state.tempSelectedRect);
                }
                updateCanvasCursor(state, targetControl);
            }

            if (state.selectedRectId && state.activeControl !== 'none' && state.dragStartPos && state.originalImageData) {
                const rect = state.drawedShapes.find(r => r.id === state.selectedRectId);
                if (!rect) return;

                const dx = currX - state.dragStartPos.x;
                const dy = currY - state.dragStartPos.y;

                mainCtx.putImageData(state.originalImageData, 0, 0);

                let newX = rect.x;
                let newY = rect.y;
                let newWidth = rect.width;
                let newHeight = rect.height;

                switch (state.activeControl) {
                    case 'move':
                        newX += dx;
                        newY += dy;
                        break;
                    case 'topLeft':
                        newX += dx;
                        newY += dy;
                        newWidth = Math.max(MIN_RECT_SIZE, rect.width - dx);
                        newHeight = Math.max(MIN_RECT_SIZE, rect.height - dy);
                        break;
                    case 'topRight':
                        newY += dy;
                        newWidth = Math.max(MIN_RECT_SIZE, rect.width + dx);
                        newHeight = Math.max(MIN_RECT_SIZE, rect.height - dy);
                        break;
                    case 'bottomLeft':
                        newX += dx;
                        newWidth = Math.max(MIN_RECT_SIZE, rect.width - dx);
                        newHeight = Math.max(MIN_RECT_SIZE, rect.height + dy);
                        break;
                    case 'bottomRight':
                        newWidth = Math.max(MIN_RECT_SIZE, rect.width + dx);
                        newHeight = Math.max(MIN_RECT_SIZE, rect.height + dy);
                        break;
                }

                rect.x = newX;
                rect.y = newY;
                rect.width = newWidth;
                rect.height = newHeight;
                const newBgRange = getRectWithControlsBgRange(rect);
                rect.originalBgData = mainCtx.getImageData(
                    newBgRange.x,
                    newBgRange.y,
                    newBgRange.width,
                    newBgRange.height
                );

                mainCtx.save();
                mainCtx.strokeStyle = rect.strokeStyle;
                mainCtx.fillStyle = rect.fillStyle;
                mainCtx.lineWidth = rect.lineWidth;
                mainCtx.beginPath();
                mainCtx.rect(newX, newY, newWidth, newHeight);
                mainCtx.fill();
                mainCtx.stroke();
                drawControlPoints(mainCtx, rect);
                mainCtx.restore();

                state.dragStartPos = { x: currX, y: currY };
                eraseRectWithControls(mainCtx, rect);
                state.originalImageData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
                mainCtx.save();
                mainCtx.strokeStyle = rect.strokeStyle;
                mainCtx.fillStyle = rect.fillStyle;
                mainCtx.lineWidth = rect.lineWidth;
                mainCtx.beginPath();
                mainCtx.rect(newX, newY, newWidth, newHeight);
                mainCtx.fill();
                mainCtx.stroke();
                drawControlPoints(mainCtx, rect);
                mainCtx.restore();
            }
        };
        document.addEventListener('mousemove', handleMousemove, { passive: true });
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开事件（保持原有逻辑）
        const handleMouseEnd = () => {
            if (state.isDrawing && state.tempRect) {
                const { tempRect } = state;
                const mainCtx = state.mainCanvas.getContext('2d')!;
                const mainCanvas = state.mainCanvas;

                const isRectValid = tempRect.width > 1 && tempRect.height > 1 &&
                    !(tempRect.x + tempRect.width < 0 || tempRect.x > mainCanvas.width ||
                        tempRect.y + tempRect.height < 0 || tempRect.y > mainCanvas.height);

                if (isRectValid) {
                    const finalX = Math.max(CONTROL_POINT_VISUAL_OFFSET, Math.min(tempRect.x, mainCanvas.width - MIN_RECT_SIZE));
                    const finalY = Math.max(CONTROL_POINT_VISUAL_OFFSET, Math.min(tempRect.y, mainCanvas.height - MIN_RECT_SIZE));
                    const finalWidth = Math.min(tempRect.width, mainCanvas.width - finalX - CONTROL_POINT_VISUAL_OFFSET);
                    const finalHeight = Math.min(tempRect.height, mainCanvas.height - finalY - CONTROL_POINT_VISUAL_OFFSET);

                    const finalRect: RectShape = {
                        id: generateId(),
                        type: 'rect',
                        x: finalX,
                        y: finalY,
                        width: finalWidth,
                        height: finalHeight,
                        strokeStyle: currentStyle.strokeStyle,
                        fillStyle: currentStyle.rectFillStyle!,
                        lineWidth: currentStyle.lineWidth,
                        isSelected: false
                    };
                    const bgRange = getRectWithControlsBgRange(finalRect);
                    const originalBgData = mainCtx.getImageData(
                        bgRange.x,
                        bgRange.y,
                        bgRange.width,
                        bgRange.height
                    );

                    mainCtx.save();
                    mainCtx.strokeStyle = currentStyle.strokeStyle;
                    mainCtx.fillStyle = currentStyle.rectFillStyle!;
                    mainCtx.lineWidth = currentStyle.lineWidth;
                    mainCtx.beginPath();
                    mainCtx.rect(finalX, finalY, finalWidth, finalHeight);
                    mainCtx.fill();
                    mainCtx.stroke();
                    mainCtx.restore();

                    state.drawedShapes.push({
                        ...finalRect,
                        originalBgData: originalBgData
                    });
                }

                state.tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                state.isDrawing = false;
                state.tempRect = undefined;
                state.mainCanvas.style.cursor = 'default';
                state.tempCanvas.style.cursor = 'default';
                state.currentCursor = 'default';
            }

            state.activeControl = 'none';
            state.dragStartPos = undefined;
            state.originalImageData = undefined;
            if (!state.isDrawing) {
                const { x, y } = getCanvasPos(e as unknown as eTs, state.mainCanvas);
                let targetControl: ControlPoint = 'none';
                for (let i = state.drawedShapes.length - 1; i >= 0; i--) {
                    const control = getControlPoint(x, y, state.drawedShapes[i]);
                    if (control !== 'none') {
                        targetControl = control;
                        break;
                    }
                }
                if (!targetControl && state.tempSelectedRect) {
                    targetControl = getControlPoint(x, y, state.tempSelectedRect);
                }
                updateCanvasCursor(state, targetControl);
            }
        };
        document.addEventListener('mouseup', handleMouseEnd);
        document.addEventListener('mouseleave', handleMouseEnd);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseEnd);
            document.removeEventListener('mouseleave', handleMouseEnd);
        });

        // 鼠标离开Canvas事件（保持原有逻辑）
        const handleMouseOut = () => {
            if (state.currentCursor !== 'default') {
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

    // 重绘主Canvas所有矩形（保持原有逻辑）
    const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        mainCtx.save();
        state.drawedShapes.forEach((shape: RectShape) => {
            mainCtx.strokeStyle = shape.strokeStyle;
            mainCtx.fillStyle = shape.fillStyle;
            mainCtx.lineWidth = shape.lineWidth;
            mainCtx.beginPath();
            mainCtx.rect(shape.x, shape.y, shape.width, shape.height);
            mainCtx.fill();
            mainCtx.stroke();

            if (shape.isSelected) {
                drawControlPoints(mainCtx, shape);
            }
        });
        mainCtx.restore();
    };

    // 清空所有矩形批注（保持原有逻辑）
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        const mainCtx = mainCanvas.getContext('2d')!;

        state.drawedShapes.forEach(rect => eraseRectWithControls(mainCtx, rect));
        state.drawedShapes = [];
        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempSelectedRect = undefined;
        state.selectedRectId = undefined;
        state.mainCanvas.style.cursor = 'default';
        state.tempCanvas.style.cursor = 'default';
        state.currentCursor = 'default';
    };

    // 销毁画矩形功能（保持原有逻辑）
    const destroy = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (state) {
            state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
            state.mainCanvas.style.cursor = 'default';
            state.tempCanvas.style.cursor = 'default';
            state.cleanupEvents.forEach(cleanup => cleanup());
            delete canvasStates[canvasId];
        }
    };

    // 选中矩形转移到tempCanvas（保持原有逻辑）
    const moveSelectedRectToTemp = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (!state || !state.selectedRectId || state.tempSelectedRect) return;
        const mainCtx = state.mainCanvas.getContext('2d')!;

        const selectedIndex = state.drawedShapes.findIndex(rect => rect.id === state.selectedRectId);
        if (selectedIndex === -1) return;
        const selectedRect = state.drawedShapes.splice(selectedIndex, 1)[0];
        selectedRect.isSelected = false;

        eraseRectWithControls(mainCtx, selectedRect);

        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempCtx.save();
        state.tempCtx.strokeStyle = selectedRect.strokeStyle;
        state.tempCtx.fillStyle = selectedRect.fillStyle;
        state.tempCtx.lineWidth = selectedRect.lineWidth;
        state.tempCtx.beginPath();
        state.tempCtx.rect(selectedRect.x, selectedRect.y, selectedRect.width, selectedRect.height);
        state.tempCtx.fill();
        state.tempCtx.stroke();
        drawControlPoints(state.tempCtx, selectedRect);
        state.tempCtx.restore();

        state.selectedRectId = undefined;
        state.tempSelectedRect = selectedRect;
        const { x, y } = getCanvasPos(e as unknown as eTs, state.mainCanvas);
        const targetControl = getControlPoint(x, y, selectedRect);
        updateCanvasCursor(state, targetControl);
    };

    // 从tempCanvas恢复矩形到主Canvas（保持原有逻辑）
    const restoreTempRectToMain = (canvasId: string) => {
        const state = canvasStates[canvasId];
        if (!state || !state.tempSelectedRect) return;
        const mainCtx = state.mainCanvas.getContext('2d')!;
        const tempRect = state.tempSelectedRect;

        const bgRange = getRectWithControlsBgRange(tempRect);
        tempRect.originalBgData = mainCtx.getImageData(
            bgRange.x,
            bgRange.y,
            bgRange.width,
            bgRange.height
        );

        state.drawedShapes.push(tempRect);
        mainCtx.save();
        mainCtx.strokeStyle = tempRect.strokeStyle;
        mainCtx.fillStyle = tempRect.fillStyle;
        mainCtx.lineWidth = tempRect.lineWidth;
        mainCtx.beginPath();
        mainCtx.rect(tempRect.x, tempRect.y, tempRect.width, tempRect.height);
        mainCtx.fill();
        mainCtx.stroke();
        drawControlPoints(mainCtx, tempRect);
        mainCtx.restore();

        state.tempCtx.clearRect(0, 0, state.tempCanvas.width, state.tempCanvas.height);
        state.tempSelectedRect = undefined;
        const { x, y } = getCanvasPos(e as unknown as eTs, state.mainCanvas);
        let targetControl: ControlPoint = 'none';
        for (let i = state.drawedShapes.length - 1; i >= 0; i--) {
            const control = getControlPoint(x, y, state.drawedShapes[i]);
            if (control !== 'none') {
                targetControl = control;
                break;
            }
        }
        updateCanvasCursor(state, targetControl);
    };

    return {
        initDrawingByMouseMove,   // 初始化画矩形
        redrawAllAnnotations,     // 重绘主Canvas所有矩形
        clearAnnotations,         // 清空所有批注（无控制点残留）
        destroy,                  // 销毁功能
        moveSelectedRectToTemp,   // 选中矩形转移到tempCanvas（含控制点）
        restoreTempRectToMain     // 从tempCanvas恢复矩形（含控制点）
    };
};