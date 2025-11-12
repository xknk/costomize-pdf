// hooks/useOption/useZoomWrapper.ts
// 简化的缩放集成包装器

import { useCanvasZoom, ZoomState } from './useCanvasZoom';

export interface ZoomWrapperConfig {
    canvasId: string;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    redrawCallback: () => void;  // 重绘回调函数
    minScale?: number;
    maxScale?: number;
}

/**
 * 快速集成缩放功能的包装器
 * 使用方法：
 * const cleanup = setupCanvasZoom({
 *     canvasId: 'canvas-1',
 *     canvas: canvasElement,
 *     ctx: context,
 *     redrawCallback: () => {
 *         // 你的重绘逻辑
 *     }
 * });
 */
export const setupCanvasZoom = (config: ZoomWrapperConfig): (() => void) => {
    const {
        canvasId,
        canvas,
        ctx,
        redrawCallback,
        minScale = 0.5,
        maxScale = 3
    } = config;

    const {
        initZoom,
        bindWheelZoom,
        bindTouchZoom,
        applyTransform,
        resetTransform,
        getZoomState
    } = useCanvasZoom();

    // 初始化缩放
    initZoom(canvasId, { minScale, maxScale });

    // 增强的重绘回调（自动应用变换）
    const enhancedRedraw = () => {
        // 保存当前状态
        ctx.save();

        try {
            // 应用缩放变换
            applyTransform(canvasId, ctx);

            // 执行用户的重绘逻辑
            redrawCallback();
        } finally {
            // 恢复状态
            ctx.restore();
            resetTransform(ctx);
        }
    };

    // 绑定缩放事件
    const cleanupWheel = bindWheelZoom(canvasId, canvas, () => {
        enhancedRedraw();
    });

    const cleanupTouch = bindTouchZoom(canvasId, canvas, () => {
        enhancedRedraw();
    });

    // 返回清理函数
    return () => {
        cleanupWheel();
        cleanupTouch();
    };
};

/**
 * 获取缩放信息的辅助函数
 */
export const getZoomInfo = (canvasId: string): ZoomState => {
    const { getZoomState } = useCanvasZoom();
    return getZoomState(canvasId);
};

/**
 * 手动触发缩放
 */
export const manualZoom = (canvasId: string, scaleChange: number, centerX?: number, centerY?: number) => {
    const { zoom } = useCanvasZoom();
    zoom(canvasId, scaleChange, centerX, centerY);
};

/**
 * 重置缩放
 */
export const resetCanvasZoom = (canvasId: string) => {
    const { resetZoom } = useCanvasZoom();
    resetZoom(canvasId);
};
