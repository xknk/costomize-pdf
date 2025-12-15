/**
 * 文字批注工具
 */
import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData } from '../../types';
export declare class TextTool extends BaseTool {
    private inputElement;
    protected startDrawing(point: Point): void;
    protected updateDrawing(_point: Point): void;
    protected finishDrawing(_point: Point): void;
    protected createAnnotationData(startPoint: Point, _endPoint: Point): AnnotationData;
    /**
     * 创建输入元素
     */
    private createInputElement;
    /**
     * 完成文字输入
     */
    private completeTextInput;
    /**
     * 移除输入元素
     */
    private removeInputElement;
    destroy(): void;
}
//# sourceMappingURL=TextTool.d.ts.map