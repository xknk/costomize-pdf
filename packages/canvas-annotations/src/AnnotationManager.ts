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

import type {
  Annotation,
  ToolConfig,
  AnnotationEvent,
  AnnotationEventType,
  AnnotationEventListener,
  ExportOptions,
  ImportOptions
} from './types';
import { BaseTool } from './tools/base/BaseTool';
import { RectangleTool } from './tools/shapes/RectangleTool';
import { CircleTool } from './tools/shapes/CircleTool';
import { LineTool } from './tools/shapes/LineTool';
import { TextTool } from './tools/text/TextTool';
import { AnnotationRenderer } from './renderer/AnnotationRenderer';
import { UndoManager } from './history/UndoManager';
import { Serializer } from './serialization/Serializer';
import { annotationContainsPoint } from './models/Annotation';

export interface AnnotationManagerConfig {
  canvas: HTMLCanvasElement;
  canvasId: string;
  enableUndo?: boolean;
  maxUndoStack?: number;
}

export class AnnotationManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasId: string;

  // 批注存储
  private annotations: Map<string, Annotation> = new Map();

  // 工具系统
  private tools: Map<string, new (...args: any[]) => BaseTool> = new Map();
  private activeTool: BaseTool | null = null;
  private activeToolName: string | null = null;

  // 渲染器
  private renderer: AnnotationRenderer;

  // 撤销/重做
  private undoManager: UndoManager | null = null;

  // 序列化器
  private serializer: Serializer;

  // 事件系统
  private listeners: Map<AnnotationEventType, Set<AnnotationEventListener>> = new Map();

  // 选中的批注
  private selectedAnnotation: Annotation | null = null;

  constructor(config: AnnotationManagerConfig) {
    this.canvas = config.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.canvasId = config.canvasId;

    this.renderer = new AnnotationRenderer(this.ctx);
    this.serializer = new Serializer();

    if (config.enableUndo !== false) {
      this.undoManager = new UndoManager(config.maxUndoStack);
    }

    // 注册默认工具
    this.registerTool('rectangle', RectangleTool);
    this.registerTool('circle', CircleTool);
    this.registerTool('line', LineTool);
    this.registerTool('text', TextTool);

    this.bindCanvasEvents();
  }

  /**
   * 注册工具
   */
  registerTool(name: string, ToolClass: new (...args: any[]) => BaseTool): void {
    this.tools.set(name, ToolClass);
  }

  /**
   * 激活工具
   */
  activateTool(name: string, config: ToolConfig = {}): void {
    // 停用当前工具
    if (this.activeTool) {
      this.activeTool.destroy();
      this.emit('tool-deactivated', { toolName: this.activeToolName! });
    }

    // 激活新工具
    const ToolClass = this.tools.get(name);
    if (!ToolClass) {
      throw new Error(`Tool "${name}" not registered`);
    }

    this.activeTool = new ToolClass(this.canvas, this.canvasId, config, {
      onCreate: (annotation: Annotation) => this.handleAnnotationCreate(annotation),
      onUpdate: (annotation: Annotation) => this.handleAnnotationUpdate(annotation),
      onComplete: (annotation: Annotation) => this.handleAnnotationComplete(annotation)
    }) as BaseTool;

    this.activeToolName = name;
    this.emit('tool-activated', { toolName: name });
  }

  /**
   * 停用工具
   */
  deactivateTool(): void {
    if (this.activeTool) {
      this.activeTool.destroy();
      this.emit('tool-deactivated', { toolName: this.activeToolName! });
      this.activeTool = null;
      this.activeToolName = null;
    }
  }

  /**
   * 添加批注
   */
  addAnnotation(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
    this.emit('annotation-created', { annotation });
    this.render();
  }

  /**
   * 更新批注
   */
  updateAnnotation(id: string, updates: Partial<Annotation>): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    const previous = { ...annotation };
    Object.assign(annotation, updates, { updatedAt: Date.now() });

    if (this.undoManager) {
      this.undoManager.recordUpdate(annotation, previous);
    }

    this.emit('annotation-updated', { annotation });
    this.render();
  }

  /**
   * 删除批注
   */
  deleteAnnotation(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    if (this.undoManager) {
      this.undoManager.recordDelete(annotation);
    }

    this.annotations.delete(id);
    this.emit('annotation-deleted', { annotation });
    this.render();
  }

  /**
   * 获取批注
   */
  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * 获取所有批注
   */
  getAnnotations(canvasId?: string): Annotation[] {
    const annos = Array.from(this.annotations.values());
    return canvasId ? annos.filter(a => a.canvasId === canvasId) : annos;
  }

  /**
   * 选中批注
   */
  selectAnnotation(id: string | null): void {
    // 取消之前的选中
    if (this.selectedAnnotation) {
      this.selectedAnnotation.selected = false;
      this.emit('annotation-deselected', { annotation: this.selectedAnnotation });
    }

    if (id) {
      const annotation = this.annotations.get(id);
      if (annotation) {
        annotation.selected = true;
        this.selectedAnnotation = annotation;
        this.emit('annotation-selected', { annotation });
      }
    } else {
      this.selectedAnnotation = null;
    }

    this.render();
  }

  /**
   * 撤销
   */
  undo(): void {
    if (!this.undoManager) return;

    const action = this.undoManager.undo();
    if (!action) return;

    switch (action.type) {
      case 'create':
        this.annotations.delete(action.annotation.id);
        break;
      case 'update':
        if (action.previousState) {
          this.annotations.set(action.annotation.id, action.previousState);
        }
        break;
      case 'delete':
        this.annotations.set(action.annotation.id, action.annotation);
        break;
    }

    this.render();
  }

  /**
   * 重做
   */
  redo(): void {
    if (!this.undoManager) return;

    const action = this.undoManager.redo();
    if (!action) return;

    switch (action.type) {
      case 'create':
        this.annotations.set(action.annotation.id, action.annotation);
        break;
      case 'update':
        this.annotations.set(action.annotation.id, action.annotation);
        break;
      case 'delete':
        this.annotations.delete(action.annotation.id);
        break;
    }

    this.render();
  }

  /**
   * 导出批注
   */
  exportAnnotations(options?: ExportOptions): string {
    const annotations = this.getAnnotations();
    return this.serializer.exportJSON(annotations, options);
  }

  /**
   * 导入批注
   */
  importAnnotations(data: string | object, options?: ImportOptions): void {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    const annotations = this.serializer.importJSON(json, options);

    if (!options?.merge) {
      this.annotations.clear();
    }

    for (const annotation of annotations) {
      this.annotations.set(annotation.id, annotation);
    }

    this.render();
  }

  /**
   * 渲染所有批注
   */
  render(): void {
    this.renderer.clear(this.canvas.width, this.canvas.height);
    this.renderer.renderAll(this.getAnnotations());
  }

  /**
   * 监听事件
   */
  on(type: AnnotationEventType, listener: AnnotationEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * 移除监听
   */
  off(type: AnnotationEventType, listener: AnnotationEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * 触发事件
   */
  private emit(
    type: AnnotationEventType,
    data: Partial<AnnotationEvent> = {}
  ): void {
    const event: AnnotationEvent = {
      type,
      ...data,
      timestamp: Date.now()
    };

    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener (${type}):`, error);
      }
    });
  }

  /**
   * 处理批注创建
   */
  private handleAnnotationCreate(_annotation: Annotation): void {
    // 工具创建时的临时处理，实际添加在complete时
  }

  /**
   * 处理批注更新
   */
  private handleAnnotationUpdate(_annotation: Annotation): void {
    this.render();
  }

  /**
   * 处理批注完成
   */
  private handleAnnotationComplete(annotation: Annotation): void {
    this.addAnnotation(annotation);

    if (this.undoManager) {
      this.undoManager.recordCreate(annotation);
    }
  }

  /**
   * 绑定Canvas点击事件（用于选择批注）
   */
  private bindCanvasEvents(): void {
    this.canvas.addEventListener('click', (event) => {
      if (this.activeTool) return; // 工具激活时不处理选择

      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };

      // 从顶层开始查找
      const sorted = this.getAnnotations().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

      for (const annotation of sorted) {
        if (annotationContainsPoint(annotation, point)) {
          this.selectAnnotation(annotation.id);
          return;
        }
      }

      // 未点击任何批注，取消选中
      this.selectAnnotation(null);
    });
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.deactivateTool();
    this.annotations.clear();
    this.listeners.clear();
    this.undoManager?.clear();
  }
}
