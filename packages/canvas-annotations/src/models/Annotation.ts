/**
 * 批注数据模型
 */

import type {
  Annotation,
  AnnotationType,
  AnnotationData,
  AnnotationStyle,
  Point,
  Rect
} from '../types';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `anno_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建批注对象
 */
export function createAnnotation(
  type: AnnotationType,
  canvasId: string,
  data: AnnotationData,
  style: AnnotationStyle = {},
  options: Partial<Annotation> = {}
): Annotation {
  const now = Date.now();

  return {
    id: options.id || generateId(),
    type,
    canvasId,
    pageNumber: options.pageNumber,
    data,
    style: {
      strokeStyle: '#ff0000',
      fillStyle: 'transparent',
      lineWidth: 2,
      opacity: 1,
      ...style
    },
    createdAt: now,
    updatedAt: now,
    author: options.author,
    selected: false,
    locked: false,
    zIndex: options.zIndex || 0,
    ...options
  };
}

/**
 * 克隆批注对象
 */
export function cloneAnnotation(annotation: Annotation): Annotation {
  return JSON.parse(JSON.stringify(annotation));
}

/**
 * 更新批注
 */
export function updateAnnotation(
  annotation: Annotation,
  updates: Partial<Annotation>
): Annotation {
  return {
    ...annotation,
    ...updates,
    updatedAt: Date.now()
  };
}

/**
 * 检查点是否在矩形内
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 检查点是否在圆内
 */
export function isPointInCircle(point: Point, center: Point, radius: number): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

/**
 * 计算点到线段的距离
 */
export function distanceToLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // 线段退化为点
    const dpx = point.x - lineStart.x;
    const dpy = point.y - lineStart.y;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  // 计算投影点
  let t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
    lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  const distX = point.x - projX;
  const distY = point.y - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * 检查批注是否包含指定点（用于点击检测）
 */
export function annotationContainsPoint(
  annotation: Annotation,
  point: Point,
  tolerance: number = 5
): boolean {
  const { data } = annotation;

  switch (data.type) {
    case 'rectangle':
      return isPointInRect(point, data.rect);

    case 'circle':
      return isPointInCircle(point, data.center, data.radius);

    case 'line':
    case 'arrow':
      return distanceToLine(point, data.start, data.end) <= tolerance;

    case 'text':
      // 简化处理：检查点是否在文字起始位置附近
      const textTolerance = 20;
      return (
        Math.abs(point.x - data.position.x) <= textTolerance &&
        Math.abs(point.y - data.position.y) <= textTolerance
      );

    case 'highlight':
      return data.rects.some(rect => isPointInRect(point, rect));

    case 'freehand':
      // 检查点是否靠近路径上的任一点
      return data.points.some(p => {
        const dx = point.x - p.x;
        const dy = point.y - p.y;
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
      });

    default:
      return false;
  }
}

/**
 * 获取批注的边界框
 */
export function getAnnotationBounds(annotation: Annotation): Rect {
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
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    case 'text':
      // 简化处理，实际应根据文字内容计算
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
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    case 'freehand': {
      if (data.points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const minX = Math.min(...data.points.map(p => p.x));
      const minY = Math.min(...data.points.map(p => p.y));
      const maxX = Math.max(...data.points.map(p => p.x));
      const maxY = Math.max(...data.points.map(p => p.y));
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * 验证批注数据
 */
export function validateAnnotation(annotation: Partial<Annotation>): boolean {
  if (!annotation.type || !annotation.canvasId || !annotation.data) {
    return false;
  }

  // 验证数据类型匹配
  if (annotation.type !== annotation.data.type) {
    return false;
  }

  return true;
}
