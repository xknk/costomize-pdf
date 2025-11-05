// hooks/useOption/useOption.ts
/* 统一绘制入口Hook：整合画线+画矩形，支持多页模式切换 */
import { useDrawLine, LineShape } from './useDrawLine';
import { useDrawRect, RectShape } from './useDrawRect';

export type DrawMode = 'line' | 'rect';
export type DrawedShape = (LineShape | RectShape) & {
    id: string; // 唯一标识
    timestamp: number; // 时间戳，用于保证顺序
    canvasId: string; // 所属画布ID
};
export interface DrawCustomStyle {
    strokeStyle?: string;
    lineWidth?: number;
    rectFillStyle?: string;
}

export const useDraw = () => {
    const lineHook = useDrawLine();
    const rectHook = useDrawRect();

    // 维护当前页的状态（多页切换时更新）
    let currentMode: DrawMode | null = null;
    let currentCanvasId: string | null = null;
    let mainCanvas: HTMLCanvasElement | null = null;
    let mainCtx: CanvasRenderingContext2D | null = null;

    /**
     * 统一初始化绘制功能
     */
    const init = (
        canvasId: string,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        mode: DrawMode,
        customStyle: DrawCustomStyle = {}
    ) => {
        currentCanvasId = canvasId;
        mainCanvas = canvas;
        mainCtx = ctx;

        if (currentMode) {
            // 初始化时销毁旧模式，但保留图形数据
            currentMode === 'line' ? lineHook.destroy(canvasId) : rectHook.destroy(canvasId);
        }

        currentMode = mode;
        if (mode === 'line') {
            lineHook.initDrawingByMouseMove(canvasId, canvas, ctx, {
                strokeStyle: customStyle.strokeStyle,
                lineWidth: customStyle.lineWidth,
            });
        } else if (mode === 'rect') {
            rectHook.initDrawingByMouseMove(canvasId, canvas, ctx, customStyle);
        }
    };

    /**
     * 切换绘制模式
     */
    const switchMode = (
        mode: DrawMode,
        customStyle?: DrawCustomStyle,
        canvasId?: string,
        canvas?: HTMLCanvasElement,
        ctx?: CanvasRenderingContext2D,
    ) => {
        // 多页场景：更新当前页状态
        if (canvasId && canvas && ctx) {
            currentCanvasId = canvasId;
            mainCanvas = canvas;
            mainCtx = ctx;
        }

        // 校验必要状态
        if (!currentCanvasId || !mainCanvas || !mainCtx) {
            throw new Error('请先调用 init 初始化绘制功能，或传入完整的Canvas信息');
        }

        // 销毁旧模式资源，但保留图形数据
        if (currentMode) {
            currentMode === 'line'
                ? lineHook.destroy(currentCanvasId)
                : rectHook.destroy(currentCanvasId);
        }

        // 初始化新模式
        currentMode = mode;
        if (mode === 'line') {
            lineHook.initDrawingByMouseMove(currentCanvasId, mainCanvas, mainCtx, {
                strokeStyle: customStyle?.strokeStyle,
                lineWidth: customStyle?.lineWidth,
            });
        } else if (mode === 'rect') {
            rectHook.initDrawingByMouseMove(currentCanvasId, mainCanvas, mainCtx, {
                ...customStyle,
            });
        }
    };

    /**
     * 清空批注
     */
    const clearAnnotations = (
        canvasId?: string,
        canvas?: HTMLCanvasElement,
        redrawOriginalContent?: () => void
    ) => {
        const targetCanvasId = canvasId || currentCanvasId;
        const targetCanvas = canvas || mainCanvas;

        if (!targetCanvasId || !targetCanvas) return;

        if (currentMode === 'line') {
            lineHook.clearAnnotations(targetCanvasId, targetCanvas, redrawOriginalContent!);
        } else if (currentMode === 'rect') {
            rectHook.clearAnnotations(targetCanvasId, targetCanvas, redrawOriginalContent!);
        }
    };

    /**
     * 重绘批注
     */
    const redrawAllAnnotations = (canvasId?: string, ctx?: CanvasRenderingContext2D) => {
        const targetCanvasId = canvasId || currentCanvasId;
        const targetCtx = ctx || mainCtx;

        if (!targetCanvasId || !targetCtx) return;

        if (currentMode === 'line') {
            lineHook.redrawAllAnnotations(targetCanvasId, targetCtx);
        } else if (currentMode === 'rect') {
            rectHook.redrawAllAnnotations(targetCanvasId, targetCtx);
        }
    };

    /**
     * 销毁绘制资源
     */
    const destroy = (canvasId?: string, keepShapes: boolean = false) => {
        const targetCanvasId = canvasId || currentCanvasId;
        if (!targetCanvasId) return;

        if (currentMode === 'line') {
            lineHook.destroy(targetCanvasId, keepShapes);
        } else if (currentMode === 'rect') {
            rectHook.destroy(targetCanvasId, keepShapes);
        }

        // 仅销毁当前页时不重置全局状态，销毁所有页时重置
        if (!canvasId) {
            currentMode = null;
            currentCanvasId = null;
            mainCanvas = null;
            mainCtx = null;
        }
    };

    /**
     * 获取指定画布或所有画布上的所有绘制数据
     * @param canvasId 可选，指定画布ID，不指定则返回所有画布数据
     * @returns 按绘制顺序排列的所有图形数据
     */
    const getAllShapes = (canvasId?: string): DrawedShape[] => {
        // 获取线和矩形数据
        const lineShapes = lineHook.getShapes(canvasId);
        const rectShapes = rectHook.getShapes(canvasId);

        // 合并并按时间戳排序（保证绘制顺序）
        const allShapes: DrawedShape[] = [...lineShapes, ...rectShapes]
            .sort((a, b) => a.timestamp - b.timestamp);

        return allShapes;
    };

    /**
     * 加载图形数据到画布
     * @param shapes 要加载的图形数据数组
     * @param canvasId 可选，指定目标画布ID
     */
    const loadShapes = (shapes: DrawedShape[], canvasId?: string) => {
        if (!shapes.length) return;

        // 按时间戳排序确保绘制顺序
        const sortedShapes = [...shapes].sort((a, b) => a.timestamp - b.timestamp);

        // 过滤指定画布的图形
        const targetShapes = canvasId
            ? sortedShapes.filter(shape => shape.canvasId === canvasId)
            : sortedShapes;

        // 分别加载线和矩形
        const lines = targetShapes.filter(shape => shape.type === 'line') as LineShape[];
        const rects = targetShapes.filter(shape => shape.type === 'rect') as RectShape[];

        if (lines.length) {
            lineHook.loadShapes(lines, canvasId || currentCanvasId!);
        }

        if (rects.length) {
            rectHook.loadShapes(rects, canvasId || currentCanvasId!);
        }

        // 重绘所有图形
        if (currentCanvasId && mainCtx) {
            redrawAllAnnotations(canvasId, mainCtx);
        }
    };

    return {
        init,
        switchMode,
        clearAnnotations,
        redrawAllAnnotations,
        destroy,
        getAllShapes,
        loadShapes,
    };
};