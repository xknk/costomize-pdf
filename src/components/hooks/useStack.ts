export const useStack = () => {
    const undoStack: any = [];
    const redoStack: any = [];
    let isUndo = false; // 是否撤回
    let storeCanvas: any = null; // 存储上一个画布
    // 记录当前状态
    const saveState = (event: any) => {
        if (!isUndo) {
            const state = event.canvas.toJSON();
            undoStack.push({
                state: state,
                canvas: event.canvas,
                page: event.page,
                type: event.type,
            });
            // 清空反撤回栈
            redoStack.length = 0;
        }
    }

    // 撤回操作
    const undo = () => {
        if (undoStack.length > 0) {
            // 取出上一个状态
            isUndo = true; // 设置为撤回状态
            const previousState = undoStack.pop();
            redoStack.push(previousState); // 保存当前状态到反撤回栈
            if (previousState.type === 'modify' || previousState.type === 'remove') {
                const stateToRestore = undoStack[undoStack.length - 1]; // 获取上一个状态
                stateToRestore.canvas.loadFromJSON(stateToRestore.state, () => {
                    stateToRestore.canvas.renderAll();
                    isUndo = false; // 设置为撤回状态
                });
                storeCanvas = stateToRestore.canvas; // 更新存储的画布
            } else if (previousState?.state.objects.length === 1) {
                // 如果只有一个对象，直接清空画布
                previousState.canvas.clear();
                isUndo = false; // 设置为撤回状态
            } else {
                const objects = previousState.state.objects.slice(0, previousState.state.objects.length - 1); // 删除最后一个对象
                const stateToRestore = previousState
                previousState && previousState.canvas.loadFromJSON({ ...stateToRestore.state, objects }, () => {
                    previousState.canvas.renderAll();
                    isUndo = false; // 设置为撤回状态
                });
            }
        }
    }

    // 反撤回操作
    const redo = () => {
        if (redoStack.length > 0) {
            // 取出反撤回栈中的状态
            isUndo = true; // 设置为撤回状态
            const stateToRestore = redoStack.pop();
            // 保存当前状态到撤回栈
            undoStack.push(stateToRestore);
            stateToRestore.canvas.loadFromJSON(stateToRestore.state, () => {
                stateToRestore.canvas.renderAll();
                isUndo = false; // 设置为撤回状态
            });
        }
    }

    return {
        saveState,
        undo,
        redo,
    }
}  