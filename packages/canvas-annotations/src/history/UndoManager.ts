/**
 * 撤销/重做管理器
 */

import type { Annotation, HistoryAction } from '../types';
import { cloneAnnotation } from '../models/Annotation';

export class UndoManager {
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private maxStackSize: number;

  constructor(maxStackSize: number = 50) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * 记录创建操作
   */
  recordCreate(annotation: Annotation): void {
    const action: HistoryAction = {
      type: 'create',
      annotation: cloneAnnotation(annotation),
      timestamp: Date.now()
    };

    this.pushAction(action);
  }

  /**
   * 记录更新操作
   */
  recordUpdate(annotation: Annotation, previousState: Annotation): void {
    const action: HistoryAction = {
      type: 'update',
      annotation: cloneAnnotation(annotation),
      previousState: cloneAnnotation(previousState),
      timestamp: Date.now()
    };

    this.pushAction(action);
  }

  /**
   * 记录删除操作
   */
  recordDelete(annotation: Annotation): void {
    const action: HistoryAction = {
      type: 'delete',
      annotation: cloneAnnotation(annotation),
      timestamp: Date.now()
    };

    this.pushAction(action);
  }

  /**
   * 添加操作到撤销栈
   */
  private pushAction(action: HistoryAction): void {
    this.undoStack.push(action);

    // 限制栈大小
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // 清空重做栈
    this.redoStack = [];
  }

  /**
   * 撤销
   */
  undo(): HistoryAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    this.redoStack.push(action);
    return action;
  }

  /**
   * 重做
   */
  redo(): HistoryAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    this.undoStack.push(action);
    return action;
  }

  /**
   * 是否可撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
