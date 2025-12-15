/**
 * 混合变换策略 - CSS即时响应 + 超阈值重渲染
 *
 * 特点：
 * - 默认推荐策略
 * - 小范围缩放使用CSS（快速）
 * - 超过阈值触发重渲染（高清）
 * - 平衡性能和清晰度
 */
import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';
export interface HybridTransformOptions extends ZoomOptions {
    rerenderThreshold?: number;
    rerenderDelay?: number;
}
export declare class HybridTransform extends BaseTransform {
    private rerenderThreshold;
    private rerenderDelay;
    private rerenderTimer;
    private baseScale;
    private onRerender?;
    constructor(options?: HybridTransformOptions);
    /**
     * 设置重渲染回调
     */
    setRerenderCallback(callback: (scale: number) => void): void;
    /**
     * 更新基础scale（重渲染完成后调用）
     */
    updateBaseScale(newBaseScale: number): void;
    /**
     * 应用缩放
     */
    applyZoom(element: HTMLElement, state: ZoomState): void;
    /**
     * 触发重渲染
     */
    private triggerRerender;
    /**
     * 重置CSS变换（保持baseScale）
     */
    resetZoom(element: HTMLElement): void;
    /**
     * 执行缩放
     */
    zoom(element: HTMLElement, currentState: ZoomState, delta: number, centerX?: number, centerY?: number): ZoomState;
    /**
     * 销毁
     */
    destroy(): void;
}
//# sourceMappingURL=HybridTransform.d.ts.map