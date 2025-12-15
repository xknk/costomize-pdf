/**
 * 即时变换策略 - 纯CSS Transform
 *
 * 特点：
 * - 永不卡顿，响应极快
 * - 使用CSS transform: scale()
 * - 大倍数时可能模糊
 * - 适合快速交互
 */
import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';
export declare class InstantTransform extends BaseTransform {
    constructor(options?: ZoomOptions);
    /**
     * 应用CSS transform缩放
     */
    applyZoom(element: HTMLElement, state: ZoomState): void;
    /**
     * 重置变换
     */
    resetZoom(element: HTMLElement): void;
    /**
     * 执行缩放（带中心点）
     */
    zoom(element: HTMLElement, currentState: ZoomState, delta: number, centerX?: number, centerY?: number): ZoomState;
}
//# sourceMappingURL=InstantTransform.d.ts.map