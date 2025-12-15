/**
 * @customize-pdf/canvas-annotations
 *
 * 独立的Canvas批注模块
 * 支持多种批注工具和完整的管理系统
 */
export { AnnotationManager } from './AnnotationManager';
export type { AnnotationManagerConfig } from './AnnotationManager';
export { BaseTool } from './tools/base/BaseTool';
export type { ToolState, ToolCallbacks } from './tools/base/BaseTool';
export { RectangleTool } from './tools/shapes/RectangleTool';
export { CircleTool } from './tools/shapes/CircleTool';
export { LineTool } from './tools/shapes/LineTool';
export { TextTool } from './tools/text/TextTool';
export { AnnotationRenderer } from './renderer/AnnotationRenderer';
export { UndoManager } from './history/UndoManager';
export { Serializer } from './serialization/Serializer';
export * from './models/Annotation';
export type { Annotation, AnnotationType, AnnotationStyle, AnnotationData, RectangleData, CircleData, LineData, ArrowData, TextData, HighlightData, FreehandData, Point, Rect, ToolConfig, AnnotationEvent, AnnotationEventType, AnnotationEventListener, HistoryAction, HistoryActionType, SerializationFormat, ExportOptions, ImportOptions } from './types';
//# sourceMappingURL=index.d.ts.map