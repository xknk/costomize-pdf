/**
 * 撤销/重做管理器
 */
import type { Annotation, HistoryAction } from '../types';
export declare class UndoManager {
    private undoStack;
    private redoStack;
    private maxStackSize;
    constructor(maxStackSize?: number);
    /**
     * 记录创建操作
     */
    recordCreate(annotation: Annotation): void;
    /**
     * 记录更新操作
     */
    recordUpdate(annotation: Annotation, previousState: Annotation): void;
    /**
     * 记录删除操作
     */
    recordDelete(annotation: Annotation): void;
    /**
     * 添加操作到撤销栈
     */
    private pushAction;
    /**
     * 撤销
     */
    undo(): HistoryAction | null;
    /**
     * 重做
     */
    redo(): HistoryAction | null;
    /**
     * 是否可撤销
     */
    canUndo(): boolean;
    /**
     * 是否可重做
     */
    canRedo(): boolean;
    /**
     * 清空历史记录
     */
    clear(): void;
}
//# sourceMappingURL=UndoManager.d.ts.map