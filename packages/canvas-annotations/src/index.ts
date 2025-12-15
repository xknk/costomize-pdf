/**
 * @customize-pdf/canvas-annotations
 *
 * 独立的Canvas批注模块
 * 支持多种批注工具和完整的管理系统
 */

// 核心管理器
export { AnnotationManager } from './AnnotationManager';
export type { AnnotationManagerConfig } from './AnnotationManager';

// 工具
export { BaseTool } from './tools/base/BaseTool';
export type { ToolState, ToolCallbacks } from './tools/base/BaseTool';

export { RectangleTool } from './tools/shapes/RectangleTool';
export { CircleTool } from './tools/shapes/CircleTool';
export { LineTool } from './tools/shapes/LineTool';
export { TextTool } from './tools/text/TextTool';

// 渲染器
export { AnnotationRenderer } from './renderer/AnnotationRenderer';

// 历史管理
export { UndoManager } from './history/UndoManager';

// 序列化
export { Serializer } from './serialization/Serializer';

// 模型工具
export * from './models/Annotation';

// 类型定义
export type {
  Annotation,
  AnnotationType,
  AnnotationStyle,
  AnnotationData,
  RectangleData,
  CircleData,
  LineData,
  ArrowData,
  TextData,
  HighlightData,
  FreehandData,
  Point,
  Rect,
  ToolConfig,
  AnnotationEvent,
  AnnotationEventType,
  AnnotationEventListener,
  HistoryAction,
  HistoryActionType,
  SerializationFormat,
  ExportOptions,
  ImportOptions
} from './types';
