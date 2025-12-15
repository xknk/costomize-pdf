/**
 * 缩放管理器 - 核心控制器
 *
 * 功能：
 * - 整合所有缩放策略
 * - 管理手势识别
 * - 提供统一的API接口
 * - 发送缩放事件
 */
import type { ZoomManagerConfig, ZoomStrategy, ZoomState, ZoomEventType, ZoomEventListener } from './types';
/**
 * 缩放管理器
 */
export declare class ZoomManager {
    private container;
    private element;
    private strategy;
    private transform;
    private currentState;
    private wheelGesture?;
    private pinchGesture?;
    private listeners;
    private config;
    constructor(config: ZoomManagerConfig);
    /**
     * 创建变换策略实例
     */
    private createTransform;
    /**
     * 初始化手势识别
     */
    private initGestures;
    /**
     * 处理滚轮缩放
     */
    private handleWheelZoom;
    /**
     * 处理触摸捏合缩放
     */
    private handlePinchZoom;
    /**
     * 处理双击缩放
     */
    private handleDoubleClick;
    /**
     * 处理重渲染回调
     */
    private handleRerender;
    /**
     * 重渲染完成回调（由外部调用）
     */
    onRerenderComplete(newScale: number): void;
    /**
     * 放大
     */
    zoomIn(centerX?: number, centerY?: number): void;
    /**
     * 缩小
     */
    zoomOut(centerX?: number, centerY?: number): void;
    /**
     * 缩放到指定比例
     */
    zoomTo(scale: number, centerX?: number, centerY?: number): void;
    /**
     * 适应宽度
     */
    fitWidth(): void;
    /**
     * 适应页面
     */
    fitPage(): void;
    /**
     * 重置缩放
     */
    reset(): void;
    /**
     * 切换缩放策略
     */
    setStrategy(strategy: ZoomStrategy): void;
    /**
     * 获取当前缩放状态
     */
    getState(): Readonly<ZoomState>;
    /**
     * 获取当前缩放比例
     */
    getScale(): number;
    /**
     * 监听事件
     */
    on(type: ZoomEventType, listener: ZoomEventListener): void;
    /**
     * 移除事件监听
     */
    off(type: ZoomEventType, listener: ZoomEventListener): void;
    /**
     * 触发事件
     */
    private emit;
    /**
     * 销毁管理器
     */
    destroy(): void;
}
//# sourceMappingURL=ZoomManager.d.ts.map