/**
 * 延迟变换策略 - 延迟重渲染
 *
 * 特点：
 * - 总是高清，无模糊
 * - 缩放时先用CSS快速响应
 * - 延迟后触发高清重渲染
 * - 有延迟感但画质最好
 */
import { BaseTransform, ZoomState, ZoomOptions } from './BaseTransform';
export interface DeferredTransformOptions extends ZoomOptions {
    rerenderDelay?: number;
}
export declare class DeferredTransform extends BaseTransform {
    private rerenderDelay;
    private rerenderTimer;
    private onRerender?;
    constructor(options?: DeferredTransformOptions);
    /**
     * 设置重渲染回调
     */
    setRerenderCallback(callback: (scale: number) => void): void;
    /**
     * 应用缩放（先CSS，后重渲染）
     */
    applyZoom(element: HTMLElement, state: ZoomState): void;
    /**
     * 触发重渲染
     */
    private triggerRerender;
    /**
     * 重置变换
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
//# sourceMappingURL=DeferredTransform.d.ts.map