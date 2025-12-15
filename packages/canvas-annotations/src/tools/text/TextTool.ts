/**
 * 文字批注工具
 */

import { BaseTool } from '../base/BaseTool';
import type { Point, AnnotationData, TextData } from '../../types';

export class TextTool extends BaseTool {
  private inputElement: HTMLInputElement | null = null;

  protected startDrawing(point: Point): void {
    // 创建临时输入框
    this.createInputElement(point);
  }

  protected updateDrawing(_point: Point): void {
    // 文字工具不需要移动更新
  }

  protected finishDrawing(_point: Point): void {
    // 通过输入框完成，不通过鼠标释放
  }

  protected createAnnotationData(startPoint: Point, _endPoint: Point): AnnotationData {
    return {
      type: 'text',
      position: startPoint,
      content: ''
    };
  }

  /**
   * 创建输入元素
   */
  private createInputElement(point: Point): void {
    // 移除已存在的输入框
    this.removeInputElement();

    // 创建输入框
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.left = `${point.x + this.canvas.offsetLeft}px`;
    this.inputElement.style.top = `${point.y + this.canvas.offsetTop}px`;
    this.inputElement.style.fontSize = `${this.config.fontSize || 16}px`;
    this.inputElement.style.fontFamily = this.config.fontFamily || 'Arial';
    this.inputElement.style.color = this.config.strokeStyle || '#000';
    this.inputElement.style.border = '1px solid #ccc';
    this.inputElement.style.padding = '2px 4px';
    this.inputElement.style.zIndex = '1000';

    // 监听确认和取消
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.completeTextInput(point);
      } else if (e.key === 'Escape') {
        this.removeInputElement();
        this.onCancel();
      }
    });

    this.inputElement.addEventListener('blur', () => {
      this.completeTextInput(point);
    });

    // 添加到文档并聚焦
    this.canvas.parentElement?.appendChild(this.inputElement);
    this.inputElement.focus();
  }

  /**
   * 完成文字输入
   */
  private completeTextInput(point: Point): void {
    if (!this.inputElement) return;

    const content = this.inputElement.value.trim();
    this.removeInputElement();

    if (!content) {
      this.onCancel();
      return;
    }

    // 创建文字批注
    const data: TextData = {
      type: 'text',
      position: point,
      content
    };

    this.currentAnnotation = this.createAnnotationObject(data);
    this.triggerCreate(this.currentAnnotation);
    this.triggerComplete(this.currentAnnotation);

    this.currentAnnotation = null;
    this.state = 'idle';
  }

  /**
   * 移除输入元素
   */
  private removeInputElement(): void {
    if (this.inputElement) {
      this.inputElement.remove();
      this.inputElement = null;
    }
  }

  public destroy(): void {
    this.removeInputElement();
    super.destroy();
  }
}
