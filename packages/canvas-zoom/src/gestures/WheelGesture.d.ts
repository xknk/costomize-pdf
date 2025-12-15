/**
 * 滚轮手势识别
 *
 * 支持：
 * - Ctrl/Cmd + 滚轮缩放
 * - 可配置修饰键
 * - 防抖优化
 */
export interface WheelGestureOptions {
    requireCtrl?: boolean;
    preventDefault?: boolean;
    debounceTime?: number;
}
export type WheelGestureHandler = (delta: number, centerX: number, centerY: number, event: WheelEvent) => void;
export declare class WheelGesture {
    private element;
    private handler;
    private options;
    private debounceTimer;
    constructor(element: HTMLElement, handler: WheelGestureHandler, options?: WheelGestureOptions);
    /**
     * 绑定事件
     */
    private bind;
    /**
     * 处理滚轮事件
     */
    private handleWheel;
    /**
     * 归一化滚轮增量
     */
    private normalizeDelta;
    /**
     * 解绑事件
     */
    destroy(): void;
}
//# sourceMappingURL=WheelGesture.d.ts.map