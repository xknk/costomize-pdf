/**
 * 批注数据模型
 */
import type { Annotation, AnnotationType, AnnotationData, AnnotationStyle, Point, Rect } from '../types';
/**
 * 生成唯一ID
 */
export declare function generateId(): string;
/**
 * 创建批注对象
 */
export declare function createAnnotation(type: AnnotationType, canvasId: string, data: AnnotationData, style?: AnnotationStyle, options?: Partial<Annotation>): Annotation;
/**
 * 克隆批注对象
 */
export declare function cloneAnnotation(annotation: Annotation): Annotation;
/**
 * 更新批注
 */
export declare function updateAnnotation(annotation: Annotation, updates: Partial<Annotation>): Annotation;
/**
 * 检查点是否在矩形内
 */
export declare function isPointInRect(point: Point, rect: Rect): boolean;
/**
 * 检查点是否在圆内
 */
export declare function isPointInCircle(point: Point, center: Point, radius: number): boolean;
/**
 * 计算点到线段的距离
 */
export declare function distanceToLine(point: Point, lineStart: Point, lineEnd: Point): number;
/**
 * 检查批注是否包含指定点（用于点击检测）
 */
export declare function annotationContainsPoint(annotation: Annotation, point: Point, tolerance?: number): boolean;
/**
 * 获取批注的边界框
 */
export declare function getAnnotationBounds(annotation: Annotation): Rect;
/**
 * 验证批注数据
 */
export declare function validateAnnotation(annotation: Partial<Annotation>): boolean;
//# sourceMappingURL=Annotation.d.ts.map