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
            });
            // 清空反撤回栈
            redoStack.length = 0;
        }
        console.log(undoStack, 'undoStack1')
    }

    // 撤回操作
    const undo = () => {
        if (undoStack.length > 1) {
            // 取出上一个状态
            isUndo = true; // 设置为撤回状态
            const previousState = undoStack.pop();
            // 将当前状态保存到反撤回栈
            redoStack.push(previousState);
            // 恢复到上上个状态
            const stateToRestore = undoStack[undoStack.length - 1];
            if (!storeCanvas) {
                storeCanvas = previousState.canvas; // 更新存储的画布
            }
            // storeCanvas && storeCanvas.clear();
            stateToRestore.canvas.loadFromJSON(stateToRestore.state, () => {
                stateToRestore.canvas.renderAll();
                isUndo = false; // 设置为撤回状态
            });
            storeCanvas = stateToRestore.canvas; // 更新存储的画布
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
            // if (!storeCanvas) {
            //     storeCanvas = stateToRestore.canvas; // 更新存储的画布
            // }
            // storeCanvas && storeCanvas.clear();
            stateToRestore.canvas.loadFromJSON(stateToRestore.state, () => {
                stateToRestore.canvas.renderAll();
                isUndo = false; // 设置为撤回状态
            });
            // storeCanvas = stateToRestore.canvas; // 更新存储的画布
        }
    }

    return {
        saveState,
        undo,
        redo,
    }
}  