/**
 * 矩形批注工具
 */

import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData, RectangleData } from '../../types';

export class RectangleTool extends BaseTool {
  protected startDrawing(point: Point): void {
    // 矩形绘制开始
    const data: RectangleData = {
      type: 'rectangle',
      rect: {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0
      }
    };

    this.currentAnnotation = this.createAnnotationObject(data);
    this.triggerCreate(this.currentAnnotation);
  }

  protected updateDrawing(point: Point): void {
    if (!this.currentAnnotation || !this.startPoint) return;

    // 更新矩形尺寸
    const data = this.currentAnnotation.data as RectangleData;
    data.rect.width = point.x - this.startPoint.x;
    data.rect.height = point.y - this.startPoint.y;

    this.currentAnnotation.updatedAt = Date.now();

    // 临时绘制（预览）
    this.drawPreview();

    this.triggerUpdate(this.currentAnnotation);
  }

  protected finishDrawing(point: Point): void {
    if (!this.currentAnnotation || !this.startPoint) return;

    // 最终确定矩形尺寸
    const data = this.currentAnnotation.data as RectangleData;
    data.rect.width = point.x - this.startPoint.x;
    data.rect.height = point.y - this.startPoint.y;

    // 如果矩形太小，取消
    if (Math.abs(data.rect.width) < 5 || Math.abs(data.rect.height) < 5) {
      this.onCancel();
      return;
    }

    this.currentAnnotation.updatedAt = Date.now();
    this.triggerComplete(this.currentAnnotation);
    this.currentAnnotation = null;
  }

  protected createAnnotationData(startPoint: Point, endPoint: Point): AnnotationData {
    return {
      type: 'rectangle',
      rect: {
        x: startPoint.x,
        y: startPoint.y,
        width: endPoint.x - startPoint.x,
        height: endPoint.y - startPoint.y
      }
    };
  }

  /**
   * 绘制预览
   */
  private drawPreview(): void {
    if (!this.currentAnnotation) return;

    const data = this.currentAnnotation.data as RectangleData;
    this.applyStyle();

    this.ctx.strokeRect(
      data.rect.x,
      data.rect.y,
      data.rect.width,
      data.rect.height
    );

    if (this.config.fillStyle && this.config.fillStyle !== 'transparent') {
      this.ctx.fillRect(
        data.rect.x,
        data.rect.y,
        data.rect.width,
        data.rect.height
      );
    }
  }
}
