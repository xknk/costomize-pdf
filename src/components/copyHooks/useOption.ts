

/*
 * @Author: Robin LEI
 * @Date: 2025-11-04 09:57:30
 * @LastEditTime: 2025-11-04 15:20:13
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\copyHooks\useOption.ts
 * 单canvas模式，创建一个新的canvas，以图片形式插入到canvas，而后进行一系列批注操作，目前构思是把批注工具单独做为工具包使用，所以无法控制canvas渲染，所以暂时先把单canvas模式舍去
 */
interface eTs {
    clientX: number;
    clientY: number;
    target: HTMLCanvasElement;
}

// 图形类型定义（保持不变）
interface LineShape {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeStyle: string;
    lineWidth: number;
}

interface RectShape {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
}

type DrawedShape = LineShape | RectShape;

// 改造：移除tempCanvas/tempCtx，新增临时图形存储（单Canvas核心）
interface CanvasState {
    isDrawing: boolean;
    mode: 'line' | 'rect';
    startX: number;
    startY: number;
    tempShape?: RectShape | LineShape | null; // 临时图形（替代临时Canvas）
    drawedShapes: DrawedShape[]; // 已固定图形列表
    currentStyle: {
        strokeStyle: string;
        rectFillStyle: string; // 矩形透明填充色
        lineWidth: number;
    };
    redrawOriginalContent: () => void; // 原有内容重绘回调（关键：确保原有内容不丢失）
}

export const useOptions = () => {
    const canvasStates: Record<string, CanvasState> = {};

    // 改造1：初始化移除临时Canvas，新增原有内容重绘回调
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        redrawOriginalContent: () => void, // 传入原有内容重绘函数（如PDF/图片绘制）
        defaultMode: 'line' | 'rect' = 'line',
        customStyle: {
            strokeStyle?: string;
            rectFillStyle?: string;
            lineWidth?: number;
        } = {}
    ) => {
        // 醒目样式：确保可见性
        const defaultStyle = {
            strokeStyle: '#ff0000', // 纯红边框
            rectFillStyle: 'rgba(255, 0, 0, 0.5)', // 50%透明红（明显可见）
            lineWidth: 3, // 加粗边框
        };
        const currentStyle = { ...defaultStyle, ...customStyle };

        // 初始化状态（移除tempCanvas相关，新增tempShape和重绘回调）
        canvasStates[canvasId] = {
            isDrawing: false,
            mode: defaultMode,
            startX: 0,
            startY: 0,
            tempShape: null,
            drawedShapes: [],
            currentStyle,
            redrawOriginalContent, // 存储原有内容重绘函数
        };

        // 绑定事件（逻辑不变，触发重绘）
        mainCanvas.addEventListener('mousedown', (e) => {
            handleMouseDown(e as unknown as eTs, canvasId, mainCtx);
        }, { passive: true });
        mainCanvas.addEventListener('mousemove', (e) => {
            handleMouseMove(e as unknown as eTs, canvasId, mainCtx);
        }, { passive: true });
        mainCanvas.addEventListener('mouseup', () => {
            handleMouseUp(canvasId, mainCtx);
        });
        mainCanvas.addEventListener('mouseout', () => {
            handleMouseUp(canvasId, mainCtx);
        });

        // 初始化样式（仅主Canvas）
        initCtxStyles(mainCtx, currentStyle);

        // 初始重绘：确保原有内容显示
        redrawAll(canvasId, mainCtx);
    };

    // 保留：计算元素相对位置（仅用于坐标校准，非必需）
    const getElementRectRelativeToParent = (element: HTMLElement, parent: HTMLElement) => {
        const elRect = element.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        return {
            top: elRect.top - parentRect.top,
            left: elRect.left - parentRect.left,
        };
    };

    // 保留：初始化ctx样式
    const initCtxStyles = (
        ctx: CanvasRenderingContext2D,
        style: { strokeStyle: string; rectFillStyle: string; lineWidth: number }
    ) => {
        ctx.strokeStyle = style.strokeStyle;
        ctx.fillStyle = style.rectFillStyle;
        ctx.lineWidth = style.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over'; // 正常绘制，不覆盖原有内容
    };

    // 保留：切换绘制模式
    const setDrawMode = (canvasId: string, mode: 'line' | 'rect') => {
        const state = canvasStates[canvasId];
        if (state) state.mode = mode;
    };

    // 改造2：鼠标按下初始化临时图形（替代临时Canvas绘制）
    const handleMouseDown = (e: eTs, canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        state.isDrawing = true;
        const mainCanvas = mainCtx.canvas;
        const { x, y } = getCanvasPos(e, mainCanvas);
        state.startX = x;
        state.startY = y;

        // 初始化临时图形（根据模式创建不同类型）
        if (state.mode === 'rect') {
            state.tempShape = {
                type: 'rect',
                x,
                y,
                width: 0,
                height: 0,
                strokeStyle: state.currentStyle.strokeStyle,
                fillStyle: state.currentStyle.rectFillStyle,
                lineWidth: state.currentStyle.lineWidth,
            };
        } else if (state.mode === 'line') {
            state.tempShape = {
                type: 'line',
                x1: x,
                y1: y,
                x2: x,
                y2: y,
                strokeStyle: state.currentStyle.strokeStyle,
                lineWidth: state.currentStyle.lineWidth,
            };
        }
    };

    // 保留：获取Canvas内精准坐标
    const getCanvasPos = (e: eTs, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    // 改造3：鼠标移动更新临时图形，触发全量重绘（单Canvas核心）
    // useOption.ts 中修改 handleMouseMove 中的临时图形更新逻辑
    let lastTempShapeBounds: { x: number; y: number; width: number; height: number } | null = null;

    const handleMouseMove = (e: eTs, canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state.isDrawing || !state.tempShape) return;

        const mainCanvas = mainCtx.canvas;
        const { x: currX, y: currY } = getCanvasPos(e, mainCanvas);

        // 1. 记录上一次临时图形的边界（用于局部清空）
        if (lastTempShapeBounds) {
            mainCtx.clearRect(
                lastTempShapeBounds.x - 2, // 扩大2px，避免残留边框
                lastTempShapeBounds.y - 2,
                lastTempShapeBounds.width + 4,
                lastTempShapeBounds.height + 4
            );
            // 局部重绘：仅恢复该区域的PDF和已固定批注
            state.redrawOriginalContent();
            drawDrawedShapes(mainCtx, state.drawedShapes);
        }

        // 2. 更新临时图形参数（原逻辑不变）
        if (state.mode === 'rect' && state.tempShape.type === 'rect') {
            const rectX = Math.min(state.startX, currX);
            const rectY = Math.min(state.startY, currY);
            state.tempShape.x = rectX;
            state.tempShape.y = rectY;
            state.tempShape.width = Math.abs(currX - state.startX);
            state.tempShape.height = Math.abs(currY - state.startY);
            // 记录当前临时图形边界
            lastTempShapeBounds = {
                x: rectX - 2,
                y: rectY - 2,
                width: state.tempShape.width + 4,
                height: state.tempShape.height + 4
            };
        } else if (state.mode === 'line' && state.tempShape.type === 'line') {
            state.tempShape.x2 = currX;
            state.tempShape.y2 = currY;
            // 线条边界：包含起点和终点的矩形
            lastTempShapeBounds = {
                x: Math.min(state.tempShape.x1, currX) - 2,
                y: Math.min(state.tempShape.y1, currY) - 2,
                width: Math.abs(currX - state.tempShape.x1) + 4,
                height: Math.abs(currY - state.tempShape.y1) + 4
            };
        }

        // 3. 仅绘制临时图形（无需全量重绘）
        drawTempShape(mainCtx, state.tempShape);
    };
    // 改造4：鼠标松开固定图形，清空临时图形
    const handleMouseUp = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state.isDrawing || !state.tempShape) return;

        // 过滤无效图形（避免点一下生成极小图形）
        if (state.tempShape.type === 'rect') {
            if (state.tempShape.width > 1 && state.tempShape.height > 1) {
                state.drawedShapes.push(state.tempShape); // 加入已固定列表
            }
        } else if (state.tempShape.type === 'line') {
            const lineLength = Math.sqrt(
                Math.pow(state.tempShape.x2 - state.tempShape.x1, 2) +
                Math.pow(state.tempShape.y2 - state.tempShape.y1, 2)
            );
            if (lineLength > 1) {
                state.drawedShapes.push(state.tempShape); // 加入已固定列表
            }
        }

        // 清空临时图形
        state.tempShape = null;
        state.isDrawing = false;

        // 重绘最终状态
        redrawAll(canvasId, mainCtx);
        lastTempShapeBounds = null; // 清空边界记录

    };

    // 新增：单Canvas全量重绘函数（核心逻辑）
    // useOption.ts 中修改 redrawAll 函数（核心优化）
    const redrawAll = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        // 用requestAnimationFrame优化重绘频率（60帧/秒，避免高频闪烁）
        requestAnimationFrame(() => {
            const mainCanvas = mainCtx.canvas;
            // 1. 清空Canvas（仅清空一次）
            mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

            // 2. 绘制原有内容（复用离屏Canvas的PDF，耗时极短）
            state.redrawOriginalContent();

            // 3. 绘制已固定图形
            drawDrawedShapes(mainCtx, state.drawedShapes);

            // 4. 绘制临时图形
            if (state.tempShape) {
                drawTempShape(mainCtx, state.tempShape);
            }
        });
    };

    // 新增：绘制已固定图形
    const drawDrawedShapes = (ctx: CanvasRenderingContext2D, shapes: DrawedShape[]) => {
        shapes.forEach((shape) => {
            ctx.save(); // 保存当前样式，避免相互影响
            if (shape.type === 'rect') {
                ctx.strokeStyle = shape.strokeStyle;
                ctx.fillStyle = shape.fillStyle;
                ctx.lineWidth = shape.lineWidth;
                ctx.beginPath();
                ctx.rect(shape.x, shape.y, shape.width, shape.height);
                ctx.fill();
                ctx.stroke();
            } else if (shape.type === 'line') {
                ctx.strokeStyle = shape.strokeStyle;
                ctx.lineWidth = shape.lineWidth;
                ctx.beginPath();
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
            }
            ctx.restore(); // 恢复样式
        });
    };

    // 新增：绘制临时图形
    const drawTempShape = (ctx: CanvasRenderingContext2D, shape: RectShape | LineShape) => {
        ctx.save();
        if (shape.type === 'rect') {
            ctx.strokeStyle = shape.strokeStyle;
            ctx.fillStyle = shape.fillStyle;
            ctx.lineWidth = shape.lineWidth;
            ctx.beginPath();
            ctx.rect(shape.x, shape.y, shape.width, shape.height);
            ctx.fill();
            ctx.stroke();
        } else if (shape.type === 'line') {
            ctx.strokeStyle = shape.strokeStyle;
            ctx.lineWidth = shape.lineWidth;
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
        }
        ctx.restore();
    };

    // 改造5：清空批注（依赖redrawAll恢复原有内容）
    const clearAnnotations = (
        canvasId: string,
        mainCtx: CanvasRenderingContext2D
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        // 清空已固定图形列表
        state.drawedShapes = [];
        // 清空临时图形
        state.tempShape = null;
        // 重绘（恢复原有内容）
        redrawAll(canvasId, mainCtx);
    };

    // 保留：重绘所有批注（用于原有内容刷新后恢复）
    const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
        redrawAll(canvasId, mainCtx); // 直接复用全量重绘函数
    };

    // 改造6：销毁（移除临时Canvas相关清理）
    const destroy = (canvasId: string) => {
        // 仅清理状态，无DOM元素需要移除
        delete canvasStates[canvasId];
    };

    return {
        initDrawingByMouseMove,
        setDrawMode,
        clearAnnotations,
        redrawAllAnnotations,
        destroy,
    };
};