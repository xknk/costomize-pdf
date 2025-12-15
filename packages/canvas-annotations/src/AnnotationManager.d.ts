/**
 * 批注管理器
 *
 * 核心功能：
 * - 工具管理和切换
 * - 批注CRUD操作
 * - 事件系统
 * - 撤销/重做
 * - 序列化导入导出
 */
import type { Annotation, ToolConfig, AnnotationEventType, AnnotationEventListener, ExportOptions, ImportOptions } from './types';
import { BaseTool } from './tools/base/BaseTool';
export interface AnnotationManagerConfig {
    canvas: HTMLCanvasElement;
    canvasId: string;
    enableUndo?: boolean;
    maxUndoStack?: number;
}
export declare class AnnotationManager {
    private canvas;
    private ctx;
    private canvasId;
    private annotations;
    private tools;
    private activeTool;
    private activeToolName;
    private renderer;
    private undoManager;
    private serializer;
    private listeners;
    private selectedAnnotation;
    constructor(config: AnnotationManagerConfig);
    /**
     * 注册工具
     */
    registerTool(name: string, ToolClass: new (...args: any[]) => BaseTool): void;
    /**
     * 激活工具
     */
    activateTool(name: string, config?: ToolConfig): void;
    /**
     * 停用工具
     */
    deactivateTool(): void;
    /**
     * 添加批注
     */
    addAnnotation(annotation: Annotation): void;
    /**
     * 更新批注
     */
    updateAnnotation(id: string, updates: Partial<Annotation>): void;
    /**
     * 删除批注
     */
    deleteAnnotation(id: string): void;
    /**
     * 获取批注
     */
    getAnnotation(id: string): Annotation | undefined;
    /**
     * 获取所有批注
     */
    getAnnotations(canvasId?: string): Annotation[];
    /**
     * 选中批注
     */
    selectAnnotation(id: string | null): void;
    /**
     * 撤销
     */
    undo(): void;
    /**
     * 重做
     */
    redo(): void;
    /**
     * 导出批注
     */
    exportAnnotations(options?: ExportOptions): string;
    /**
     * 导入批注
     */
    importAnnotations(data: string | object, options?: ImportOptions): void;
    /**
     * 渲染所有批注
     */
    render(): void;
    /**
     * 监听事件
     */
    on(type: AnnotationEventType, listener: AnnotationEventListener): void;
    /**
     * 移除监听
     */
    off(type: AnnotationEventType, listener: AnnotationEventListener): void;
    /**
     * 触发事件
     */
    private emit;
    /**
     * 处理批注创建
     */
    private handleAnnotationCreate;
    /**
     * 处理批注更新
     */
    private handleAnnotationUpdate;
    /**
     * 处理批注完成
     */
    private handleAnnotationComplete;
    /**
     * 绑定Canvas点击事件（用于选择批注）
     */
    private bindCanvasEvents;
    /**
     * 销毁管理器
     */
    destroy(): void;
}
//# sourceMappingURL=AnnotationManager.d.ts.map