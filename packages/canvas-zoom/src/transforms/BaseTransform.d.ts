/**
 * 缩放策略基类
 *
 * 定义所有缩放策略的通用接口
 */
export interface ZoomState {
    scale: number;
    offsetX: number;
    offsetY: number;
}
export interface ZoomOptions {
    minScale?: number;
    maxScale?: number;
    zoomSpeed?: number;
}
export declare abstract class BaseTransform {
    protected minScale: number;
    protected maxScale: number;
    protected zoomSpeed: number;
    constructor(options?: ZoomOptions);
    /**
     * 应用缩放变换
     */
    abstract applyZoom(element: HTMLElement, state: ZoomState): void;
    /**
     * 重置变换
     */
    abstract resetZoom(element: HTMLElement): void;
    /**
     * 执行缩放（带中心点）
     */
    abstract zoom(element: HTMLElement, currentState: ZoomState, delta: number, centerX?: number, centerY?: number): ZoomState;
    /**
     * 计算新的缩放比例
     */
    protected calculateNewScale(currentScale: number, delta: number): number;
    /**
     * 计算缩放中心点偏移
     */
    protected calculateOffset(currentOffset: number, centerPosition: number, oldScale: number, newScale: number): number;
}
//# sourceMappingURL=BaseTransform.d.ts.map