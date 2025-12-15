/**
 * 批注模块类型定义
 */

/**
 * 批注类型
 */
export type AnnotationType =
  | 'rectangle'   // 矩形
  | 'circle'      // 圆形
  | 'line'        // 线条
  | 'arrow'       // 箭头
  | 'text'        // 文字
  | 'highlight'   // 高亮
  | 'freehand';   // 手绘

/**
 * 批注样式
 */
export interface AnnotationStyle {
  strokeStyle?: string;      // 描边颜色
  fillStyle?: string;        // 填充颜色
  lineWidth?: number;        // 线宽
  lineDash?: number[];       // 虚线样式
  opacity?: number;          // 不透明度 0-1
  fontSize?: number;         // 字体大小（文字批注）
  fontFamily?: string;       // 字体族（文字批注）
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
  id: string;                // 唯一标识
  type: AnnotationType;      // 批注类型
  canvasId: string;          // 所属Canvas ID
  pageNumber?: number;       // 所属页码（可选）
  data: AnnotationData;      // 批注数据
  style: AnnotationStyle;    // 样式
  createdAt: number;         // 创建时间戳
  updatedAt: number;         // 更新时间戳
  author?: string;           // 作者
  selected?: boolean;        // 是否选中
  locked?: boolean;          // 是否锁定
  zIndex?: number;           // 层级
}

/**
 * 批注数据（根据类型不同而不同）
 */
export type AnnotationData =
  | RectangleData
  | CircleData
  | LineData
  | ArrowData
  | TextData
  | HighlightData
  | FreehandData;

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
  headSize?: number;  // 箭头大小
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
  rects: Rect[];  // 支持跨行高亮
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
export type AnnotationEventType =
  | 'annotation-created'     // 批注创建
  | 'annotation-updated'     // 批注更新
  | 'annotation-deleted'     // 批注删除
  | 'annotation-selected'    // 批注选中
  | 'annotation-deselected'  // 批注取消选中
  | 'tool-activated'         // 工具激活
  | 'tool-deactivated';      // 工具停用

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
  previousState?: Annotation;  // 更新操作的旧状态
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
  pretty?: boolean;           // 是否格式化输出
  includeMetadata?: boolean;  // 是否包含元数据
}

/**
 * 导入选项
 */
export interface ImportOptions {
  merge?: boolean;            // 是否合并现有批注
  validate?: boolean;         // 是否验证数据
}
