/**
 * 双指捏合手势识别
 *
 * 支持：
 * - 双指捏合缩放
 * - 缩放中心点计算
 * - 手势状态管理
 */
export interface PinchGestureOptions {
    preventDefault?: boolean;
    minDistance?: number;
}
export type PinchGestureHandler = (scale: number, centerX: number, centerY: number, event: TouchEvent) => void;
export declare class PinchGesture {
    private element;
    private handler;
    private options;
    private lastDistance;
    private isPinching;
    constructor(element: HTMLElement, handler: PinchGestureHandler, options?: PinchGestureOptions);
    /**
     * 绑定事件
     */
    private bind;
    /**
     * 处理触摸开始
     */
    private handleTouchStart;
    /**
     * 处理触摸移动
     */
    private handleTouchMove;
    /**
     * 处理触摸结束
     */
    private handleTouchEnd;
    /**
     * 计算两点距离
     */
    private getDistance;
    /**
     * 计算两点中心
     */
    private getCenter;
    /**
     * 解绑事件
     */
    destroy(): void;
}
//# sourceMappingURL=PinchGesture.d.ts.map