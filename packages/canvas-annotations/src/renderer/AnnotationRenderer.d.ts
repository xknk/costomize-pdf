/**
 * 批注渲染器
 *
 * 负责将批注绘制到Canvas上
 */
import type { Annotation } from '../types';
export declare class AnnotationRenderer {
    private ctx;
    constructor(ctx: CanvasRenderingContext2D);
    /**
     * 渲染单个批注
     */
    render(annotation: Annotation): void;
    /**
     * 渲染多个批注
     */
    renderAll(annotations: Annotation[]): void;
    /**
     * 渲染矩形
     */
    private renderRectangle;
    /**
     * 渲染圆形
     */
    private renderCircle;
    /**
     * 渲染线条
     */
    private renderLine;
    /**
     * 渲染箭头
     */
    private renderArrow;
    /**
     * 渲染文字
     */
    private renderText;
    /**
     * 渲染高亮
     */
    private renderHighlight;
    /**
     * 渲染手绘
     */
    private renderFreehand;
    /**
     * 渲染选择框
     */
    private renderSelectionBox;
    /**
     * 获取批注边界框
     */
    private getAnnotationBounds;
    /**
     * 应用样式
     */
    private applyStyle;
    /**
     * 清空Canvas
     */
    clear(width: number, height: number): void;
}
//# sourceMappingURL=AnnotationRenderer.d.ts.map