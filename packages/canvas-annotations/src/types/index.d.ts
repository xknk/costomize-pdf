/**
 * 批注模块类型定义
 */
/**
 * 批注类型
 */
export type AnnotationType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'highlight' | 'freehand';
/**
 * 批注样式
 */
export interface AnnotationStyle {
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
    opacity?: number;
    fontSize?: number;
    fontFamily?: string;
}
/**
 * 坐标点
 */
export interface Point {
    x: number;
    y: number;
}
/**
 * 矩形区域
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * 批注基础接口
 */
export interface Annotation {
    id: string;
    type: AnnotationType;
    canvasId: string;
    pageNumber?: number;
    data: AnnotationData;
    style: AnnotationStyle;
    createdAt: number;
    updatedAt: number;
    author?: string;
    selected?: boolean;
    locked?: boolean;
    zIndex?: number;
}
/**
 * 批注数据（根据类型不同而不同）
 */
export type AnnotationData = RectangleData | CircleData | LineData | ArrowData | TextData | HighlightData | FreehandData;
/**
 * 矩形数据
 */
export interface RectangleData {
    type: 'rectangle';
    rect: Rect;
}
/**
 * 圆形数据
 */
export interface CircleData {
    type: 'circle';
    center: Point;
    radius: number;
}
/**
 * 线条数据
 */
export interface LineData {
    type: 'line';
    start: Point;
    end: Point;
}
/**
 * 箭头数据
 */
export interface ArrowData {
    type: 'arrow';
    start: Point;
    end: Point;
    headSize?: number;
}
/**
 * 文字数据
 */
export interface TextData {
    type: 'text';
    position: Point;
    content: string;
    maxWidth?: number;
}
/**
 * 高亮数据
 */
export interface HighlightData {
    type: 'highlight';
    rects: Rect[];
}
/**
 * 手绘数据
 */
export interface FreehandData {
    type: 'freehand';
    points: Point[];
}
/**
 * 工具配置
 */
export interface ToolConfig extends Partial<AnnotationStyle> {
    [key: string]: any;
}
/**
 * 批注事件类型
 */
export type AnnotationEventType = 'annotation-created' | 'annotation-updated' | 'annotation-deleted' | 'annotation-selected' | 'annotation-deselected' | 'tool-activated' | 'tool-deactivated';
/**
 * 批注事件
 */
export interface AnnotationEvent {
    type: AnnotationEventType;
    annotation?: Annotation;
    annotations?: Annotation[];
    toolName?: string;
    timestamp: number;
}
/**
 * 事件监听器
 */
export type AnnotationEventListener = (event: AnnotationEvent) => void;
/**
 * 历史记录操作类型
 */
export type HistoryActionType = 'create' | 'update' | 'delete';
/**
 * 历史记录
 */
export interface HistoryAction {
    type: HistoryActionType;
    annotation: Annotation;
    previousState?: Annotation;
    timestamp: number;
}
/**
 * 序列化格式
 */
export type SerializationFormat = 'json' | 'xfdf';
/**
 * 导出选项
 */
export interface ExportOptions {
    format?: SerializationFormat;
    pretty?: boolean;
    includeMetadata?: boolean;
}
/**
 * 导入选项
 */
export interface ImportOptions {
    merge?: boolean;
    validate?: boolean;
}
//# sourceMappingURL=index.d.ts.map