/**
 * 线条批注工具
 */

import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData, LineData } from '../../types';

export class LineTool extends BaseTool {
  protected startDrawing(point: Point): void {
    const data: LineData = {
      type: 'line',
      start: point,
      end: point
    };

    this.currentAnnotation = this.createAnnotationObject(data);
    this.triggerCreate(this.currentAnnotation);
  }

  protected updateDrawing(point: Point): void {
    if (!this.currentAnnotation) return;

    const data = this.currentAnnotation.data as LineData;
    data.end = point;

    this.currentAnnotation.updatedAt = Date.now();
    this.drawPreview();
    this.triggerUpdate(this.currentAnnotation);
  }

  protected finishDrawing(point: Point): void {
    if (!this.currentAnnotation || !this.startPoint) return;

    const data = this.currentAnnotation.data as LineData;
    data.end = point;

    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 5) {
      this.onCancel();
      return;
    }

    this.currentAnnotation.updatedAt = Date.now();
    this.triggerComplete(this.currentAnnotation);
    this.currentAnnotation = null;
  }

  protected createAnnotationData(startPoint: Point, endPoint: Point): AnnotationData {
    return {
      type: 'line',
      start: startPoint,
      end: endPoint
    };
  }

  private drawPreview(): void {
    if (!this.currentAnnotation) return;

    const data = this.currentAnnotation.data as LineData;
    this.applyStyle();

    this.ctx.beginPath();
    this.ctx.moveTo(data.start.x, data.start.y);
    this.ctx.lineTo(data.end.x, data.end.y);
    this.ctx.stroke();
  }
}
