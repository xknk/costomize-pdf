/**
 * 线条批注工具
 */
import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData } from '../../types';
export declare class LineTool extends BaseTool {
    protected startDrawing(point: Point): void;
    protected updateDrawing(point: Point): void;
    protected finishDrawing(point: Point): void;
    protected createAnnotationData(startPoint: Point, endPoint: Point): AnnotationData;
    private drawPreview;
}
//# sourceMappingURL=LineTool.d.ts.map