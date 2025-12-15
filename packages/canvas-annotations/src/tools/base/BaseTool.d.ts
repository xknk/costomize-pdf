/**
 * 批注工具基类
 *
 * 所有批注工具的抽象基类
 * 定义工具的生命周期和交互接口
 */
import type { Annotation, AnnotationData, ToolConfig, Point } from '../../types';
/**
 * 工具状态
 */
export type ToolState = 'idle' | 'drawing' | 'editing';
/**
 * 工具事件回调
 */
export interface ToolCallbacks {
    onCreate?: (annotation: Annotation) => void;
    onUpdate?: (annotation: Annotation) => void;
    onComplete?: (annotation: Annotation) => void;
    onCancel?: () => void;
}
/**
 * 批注工具基类
 */
export declare abstract class BaseTool {
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected canvasId: string;
    protected config: ToolConfig;
    protected callbacks: ToolCallbacks;
    protected state: ToolState;
    protected currentAnnotation: Annotation | null;
    protected startPoint: Point | null;
    constructor(canvas: HTMLCanvasElement, canvasId: string, config?: ToolConfig, callbacks?: ToolCallbacks);
    /**
     * 绑定事件监听
     */
    protected bind(): void;
    /**
     * 解绑事件监听
     */
    protected unbind(): void;
    /**
     * 获取鼠标/触摸位置（相对于Canvas）
     */
    protected getPosition(event: MouseEvent | TouchEvent): Point;
    /**
     * 鼠标按下
     */
    protected handleMouseDown: (event: MouseEvent) => void;
    /**
     * 鼠标移动
     */
    protected handleMouseMove: (event: MouseEvent) => void;
    /**
     * 鼠标释放
     */
    protected handleMouseUp: (event: MouseEvent) => void;
    /**
     * 鼠标离开
     */
    protected handleMouseLeave: (_event: MouseEvent) => void;
    /**
     * 触摸开始
     */
    protected handleTouchStart: (event: TouchEvent) => void;
    /**
     * 触摸移动
     */
    protected handleTouchMove: (event: TouchEvent) => void;
    /**
     * 触摸结束
     */
    protected handleTouchEnd: (event: TouchEvent) => void;
    /**
     * 开始绘制
     */
    protected onStart(point: Point): void;
    /**
     * 绘制过程
     */
    protected onMove(point: Point): void;
    /**
     * 结束绘制
     */
    protected onEnd(point: Point): void;
    /**
     * 取消绘制
     */
    protected onCancel(): void;
    /**
     * 子类实现：开始绘制
     */
    protected abstract startDrawing(point: Point): void;
    /**
     * 子类实现：更新绘制
     */
    protected abstract updateDrawing(point: Point): void;
    /**
     * 子类实现：完成绘制
     */
    protected abstract finishDrawing(point: Point): void;
    /**
     * 子类实现：创建批注数据
     */
    protected abstract createAnnotationData(startPoint: Point, endPoint: Point): AnnotationData;
    /**
     * 创建批注
     */
    protected createAnnotationObject(data: AnnotationData): Annotation;
    /**
     * 触发创建回调
     */
    protected triggerCreate(annotation: Annotation): void;
    /**
     * 触发更新回调
     */
    protected triggerUpdate(annotation: Annotation): void;
    /**
     * 触发完成回调
     */
    protected triggerComplete(annotation: Annotation): void;
    /**
     * 应用样式
     */
    protected applyStyle(): void;
    /**
     * 销毁工具
     */
    destroy(): void;
    /**
     * 获取当前状态
     */
    getState(): ToolState;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<ToolConfig>): void;
}
//# sourceMappingURL=BaseTool.d.ts.map