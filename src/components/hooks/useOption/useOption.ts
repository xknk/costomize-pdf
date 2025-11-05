/* 统一绘制入口Hook：整合画线+画矩形，支持多页模式切换 */
import { useDrawLine, LineShape } from './useDrawLine';
import { useDrawRect, RectShape } from './useDrawRect';

export type DrawMode = 'line' | 'rect';
export type DrawedShape = LineShape | RectShape;
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
     * 统一初始化绘制功能（原有逻辑不变）
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
     * 修正：支持多页的模式切换（新增Canvas参数，适配多页）
     * @param mode - 目标模式（line/rect）
     * @param customStyle - 可选：切换时更新样式
     * @param canvasId - 可选：页Canvas唯一标识（多页时必传）
     * @param canvas - 可选：页Canvas元素（多页时必传）
     * @param ctx - 可选：页Canvas上下文（多页时必传）
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

        // 销毁旧模式资源
        if (currentMode) {
            currentMode === 'line' ? lineHook.destroy(currentCanvasId) : rectHook.destroy(currentCanvasId);
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
     * 修正：清空批注（支持传入Canvas信息，适配多页）
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
     * 重绘批注（支持传入Canvas信息，适配多页）
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
     * 销毁绘制资源（支持传入CanvasId，适配多页）
     */
    const destroy = (canvasId?: string) => {
        const targetCanvasId = canvasId || currentCanvasId;
        if (!targetCanvasId) return;

        if (currentMode === 'line') {
            lineHook.destroy(targetCanvasId);
        } else if (currentMode === 'rect') {
            rectHook.destroy(targetCanvasId);
        }

        // 仅销毁当前页时不重置全局状态，销毁所有页时重置
        if (!canvasId) {
            currentMode = null;
            currentCanvasId = null;
            mainCanvas = null;
            mainCtx = null;
        }
    };

    return {
        init,
        switchMode,    // 修正后的参数签名：支持多页
        clearAnnotations,
        redrawAllAnnotations,
        destroy,
    };
};