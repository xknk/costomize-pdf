/**
 * 批注工具基类
 *
 * 所有批注工具的抽象基类
 * 定义工具的生命周期和交互接口
 */

import type { Annotation, AnnotationData, ToolConfig, Point } from '../../types';
import { createAnnotation } from '../../models/Annotation';

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
export abstract class BaseTool {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected canvasId: string;
  protected config: ToolConfig;
  protected callbacks: ToolCallbacks;

  protected state: ToolState = 'idle';
  protected currentAnnotation: Annotation | null = null;
  protected startPoint: Point | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    canvasId: string,
    config: ToolConfig = {},
    callbacks: ToolCallbacks = {}
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.canvasId = canvasId;
    this.config = {
      strokeStyle: '#ff0000',
      fillStyle: 'transparent',
      lineWidth: 2,
      opacity: 1,
      ...config
    };
    this.callbacks = callbacks;

    this.bind();
  }

  /**
   * 绑定事件监听
   */
  protected bind(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);

    // 触摸事件支持
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * 解绑事件监听
   */
  protected unbind(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);

    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * 获取鼠标/触摸位置（相对于Canvas）
   */
  protected getPosition(event: MouseEvent | TouchEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  /**
   * 鼠标按下
   */
  protected handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    const point = this.getPosition(event);
    this.onStart(point);
  };

  /**
   * 鼠标移动
   */
  protected handleMouseMove = (event: MouseEvent): void => {
    if (this.state !== 'drawing') return;
    event.preventDefault();
    const point = this.getPosition(event);
    this.onMove(point);
  };

  /**
   * 鼠标释放
   */
  protected handleMouseUp = (event: MouseEvent): void => {
    if (this.state !== 'drawing') return;
    event.preventDefault();
    const point = this.getPosition(event);
    this.onEnd(point);
  };

  /**
   * 鼠标离开
   */
  protected handleMouseLeave = (_event: MouseEvent): void => {
    if (this.state === 'drawing') {
      this.onCancel();
    }
  };

  /**
   * 触摸开始
   */
  protected handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const point = this.getPosition(event);
    this.onStart(point);
  };

  /**
   * 触摸移动
   */
  protected handleTouchMove = (event: TouchEvent): void => {
    if (this.state !== 'drawing') return;
    event.preventDefault();
    const point = this.getPosition(event);
    this.onMove(point);
  };

  /**
   * 触摸结束
   */
  protected handleTouchEnd = (event: TouchEvent): void => {
    if (this.state !== 'drawing') return;
    event.preventDefault();
    const point = this.getPosition(event);
    this.onEnd(point);
  };

  /**
   * 开始绘制
   */
  protected onStart(point: Point): void {
    this.state = 'drawing';
    this.startPoint = point;
    this.startDrawing(point);
  }

  /**
   * 绘制过程
   */
  protected onMove(point: Point): void {
    if (!this.startPoint) return;
    this.updateDrawing(point);
  }

  /**
   * 结束绘制
   */
  protected onEnd(point: Point): void {
    if (!this.startPoint) return;
    this.finishDrawing(point);
    this.state = 'idle';
    this.startPoint = null;
  }

  /**
   * 取消绘制
   */
  protected onCancel(): void {
    this.state = 'idle';
    this.startPoint = null;
    this.currentAnnotation = null;
    this.callbacks.onCancel?.();
  }

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
  protected abstract createAnnotationData(
    startPoint: Point,
    endPoint: Point
  ): AnnotationData;

  /**
   * 创建批注
   */
  protected createAnnotationObject(data: AnnotationData): Annotation {
    return createAnnotation(data.type, this.canvasId, data, this.config);
  }

  /**
   * 触发创建回调
   */
  protected triggerCreate(annotation: Annotation): void {
    this.callbacks.onCreate?.(annotation);
  }

  /**
   * 触发更新回调
   */
  protected triggerUpdate(annotation: Annotation): void {
    this.callbacks.onUpdate?.(annotation);
  }

  /**
   * 触发完成回调
   */
  protected triggerComplete(annotation: Annotation): void {
    this.callbacks.onComplete?.(annotation);
  }

  /**
   * 应用样式
   */
  protected applyStyle(): void {
    this.ctx.strokeStyle = this.config.strokeStyle || '#ff0000';
    this.ctx.fillStyle = this.config.fillStyle || 'transparent';
    this.ctx.lineWidth = this.config.lineWidth || 2;
    this.ctx.globalAlpha = this.config.opacity ?? 1;

    if (this.config.lineDash) {
      this.ctx.setLineDash(this.config.lineDash);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  /**
   * 销毁工具
   */
  public destroy(): void {
    this.unbind();
    this.currentAnnotation = null;
    this.startPoint = null;
  }

  /**
   * 获取当前状态
   */
  public getState(): ToolState {
    return this.state;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ToolConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
