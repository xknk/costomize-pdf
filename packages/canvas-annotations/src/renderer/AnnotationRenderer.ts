/**
 * 批注渲染器
 *
 * 负责将批注绘制到Canvas上
 */

import type {
  Annotation,
  RectangleData,
  CircleData,
  LineData,
  ArrowData,
  TextData,
  HighlightData,
  FreehandData
} from '../types';

export class AnnotationRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * 渲染单个批注
   */
  render(annotation: Annotation): void {
    this.ctx.save();

    // 应用全局透明度
    this.ctx.globalAlpha = annotation.style.opacity ?? 1;

    // 根据类型渲染
    switch (annotation.type) {
      case 'rectangle':
        this.renderRectangle(annotation);
        break;
      case 'circle':
        this.renderCircle(annotation);
        break;
      case 'line':
        this.renderLine(annotation);
        break;
      case 'arrow':
        this.renderArrow(annotation);
        break;
      case 'text':
        this.renderText(annotation);
        break;
      case 'highlight':
        this.renderHighlight(annotation);
        break;
      case 'freehand':
        this.renderFreehand(annotation);
        break;
    }

    // 如果选中，绘制选择框
    if (annotation.selected) {
      this.renderSelectionBox(annotation);
    }

    this.ctx.restore();
  }

  /**
   * 渲染多个批注
   */
  renderAll(annotations: Annotation[]): void {
    // 按zIndex排序
    const sorted = [...annotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const annotation of sorted) {
      this.render(annotation);
    }
  }

  /**
   * 渲染矩形
   */
  private renderRectangle(annotation: Annotation): void {
    const data = annotation.data as RectangleData;
    const { style } = annotation;

    this.applyStyle(style);

    // 绘制矩形
    this.ctx.strokeRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);

    if (style.fillStyle && style.fillStyle !== 'transparent') {
      this.ctx.fillRect(data.rect.x, data.rect.y, data.rect.width, data.rect.height);
    }
  }

  /**
   * 渲染圆形
   */
  private renderCircle(annotation: Annotation): void {
    const data = annotation.data as CircleData;
    const { style } = annotation;

    this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.arc(data.center.x, data.center.y, data.radius, 0, 2 * Math.PI);
    this.ctx.stroke();

    if (style.fillStyle && style.fillStyle !== 'transparent') {
      this.ctx.fill();
    }
  }

  /**
   * 渲染线条
   */
  private renderLine(annotation: Annotation): void {
    const data = annotation.data as LineData;
    const { style } = annotation;

    this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(data.start.x, data.start.y);
    this.ctx.lineTo(data.end.x, data.end.y);
    this.ctx.stroke();
  }

  /**
   * 渲染箭头
   */
  private renderArrow(annotation: Annotation): void {
    const data = annotation.data as ArrowData;
    const { style } = annotation;

    this.applyStyle(style);

    // 绘制线条
    this.ctx.beginPath();
    this.ctx.moveTo(data.start.x, data.start.y);
    this.ctx.lineTo(data.end.x, data.end.y);
    this.ctx.stroke();

    // 绘制箭头
    const headSize = data.headSize || 10;
    const dx = data.end.x - data.start.x;
    const dy = data.end.y - data.start.y;
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(data.end.x, data.end.y);
    this.ctx.lineTo(
      data.end.x - headSize * Math.cos(angle - Math.PI / 6),
      data.end.y - headSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(data.end.x, data.end.y);
    this.ctx.lineTo(
      data.end.x - headSize * Math.cos(angle + Math.PI / 6),
      data.end.y - headSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  /**
   * 渲染文字
   */
  private renderText(annotation: Annotation): void {
    const data = annotation.data as TextData;
    const { style } = annotation;

    this.ctx.fillStyle = style.strokeStyle || '#000';
    this.ctx.font = `${style.fontSize || 16}px ${style.fontFamily || 'Arial'}`;

    this.ctx.fillText(
      data.content,
      data.position.x,
      data.position.y,
      data.maxWidth
    );
  }

  /**
   * 渲染高亮
   */
  private renderHighlight(annotation: Annotation): void {
    const data = annotation.data as HighlightData;
    const { style } = annotation;

    this.ctx.fillStyle = style.fillStyle || 'rgba(255, 255, 0, 0.3)';

    for (const rect of data.rects) {
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  /**
   * 渲染手绘
   */
  private renderFreehand(annotation: Annotation): void {
    const data = annotation.data as FreehandData;
    const { style } = annotation;

    if (data.points.length < 2) return;

    this.applyStyle(style);

    this.ctx.beginPath();
    this.ctx.moveTo(data.points[0].x, data.points[0].y);

    for (let i = 1; i < data.points.length; i++) {
      this.ctx.lineTo(data.points[i].x, data.points[i].y);
    }

    this.ctx.stroke();
  }

  /**
   * 渲染选择框
   */
  private renderSelectionBox(annotation: Annotation): void {
    const bounds = this.getAnnotationBounds(annotation);

    this.ctx.strokeStyle = '#0066ff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    const padding = 5;
    this.ctx.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );

    this.ctx.setLineDash([]);
  }

  /**
   * 获取批注边界框
   */
  private getAnnotationBounds(annotation: Annotation): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const { data } = annotation;

    switch (data.type) {
      case 'rectangle':
        return data.rect;

      case 'circle':
        return {
          x: data.center.x - data.radius,
          y: data.center.y - data.radius,
          width: data.radius * 2,
          height: data.radius * 2
        };

      case 'line':
      case 'arrow': {
        const minX = Math.min(data.start.x, data.end.x);
        const minY = Math.min(data.start.y, data.end.y);
        const maxX = Math.max(data.start.x, data.end.x);
        const maxY = Math.max(data.start.y, data.end.y);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }

      case 'text':
        return {
          x: data.position.x,
          y: data.position.y - 20,
          width: 100,
          height: 30
        };

      case 'highlight': {
        if (data.rects.length === 0) {
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        const minX = Math.min(...data.rects.map(r => r.x));
        const minY = Math.min(...data.rects.map(r => r.y));
        const maxX = Math.max(...data.rects.map(r => r.x + r.width));
        const maxY = Math.max(...data.rects.map(r => r.y + r.height));
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }

      case 'freehand': {
        if (data.points.length === 0) {
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        const minX = Math.min(...data.points.map(p => p.x));
        const minY = Math.min(...data.points.map(p => p.y));
        const maxX = Math.max(...data.points.map(p => p.x));
        const maxY = Math.max(...data.points.map(p => p.y));
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }

      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  /**
   * 应用样式
   */
  private applyStyle(style: Annotation['style']): void {
    this.ctx.strokeStyle = style.strokeStyle || '#ff0000';
    this.ctx.fillStyle = style.fillStyle || 'transparent';
    this.ctx.lineWidth = style.lineWidth || 2;

    if (style.lineDash) {
      this.ctx.setLineDash(style.lineDash);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  /**
   * 清空Canvas
   */
  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height);
  }
}
