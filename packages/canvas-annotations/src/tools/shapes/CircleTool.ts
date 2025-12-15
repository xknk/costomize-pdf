/**
 * 圆形批注工具
 */

import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData, CircleData } from '../../types';

export class CircleTool extends BaseTool {
  protected startDrawing(point: Point): void {
    const data: CircleData = {
      type: 'circle',
      center: point,
      radius: 0
    };

    this.currentAnnotation = this.createAnnotationObject(data);
    this.triggerCreate(this.currentAnnotation);
  }

  protected updateDrawing(point: Point): void {
    if (!this.currentAnnotation || !this.startPoint) return;

    const data = this.currentAnnotation.data as CircleData;
    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    data.radius = Math.sqrt(dx * dx + dy * dy);

    this.currentAnnotation.updatedAt = Date.now();
    this.drawPreview();
    this.triggerUpdate(this.currentAnnotation);
  }

  protected finishDrawing(point: Point): void {
    if (!this.currentAnnotation || !this.startPoint) return;

    const data = this.currentAnnotation.data as CircleData;
    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    data.radius = Math.sqrt(dx * dx + dy * dy);

    if (data.radius < 5) {
      this.onCancel();
      return;
    }

    this.currentAnnotation.updatedAt = Date.now();
    this.triggerComplete(this.currentAnnotation);
    this.currentAnnotation = null;
  }

  protected createAnnotationData(startPoint: Point, endPoint: Point): AnnotationData {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    return {
      type: 'circle',
      center: startPoint,
      radius: Math.sqrt(dx * dx + dy * dy)
    };
  }

  private drawPreview(): void {
    if (!this.currentAnnotation) return;

    const data = this.currentAnnotation.data as CircleData;
    this.applyStyle();

    this.ctx.beginPath();
    this.ctx.arc(data.center.x, data.center.y, data.radius, 0, 2 * Math.PI);
    this.ctx.stroke();

    if (this.config.fillStyle && this.config.fillStyle !== 'transparent') {
      this.ctx.fill();
    }
  }
}
