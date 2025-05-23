/*
 * @Author: Robin LEI
 * @Date: 2025-04-22 15:58:56
 * @LastEditTime: 2025-04-27 11:17:54
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useStack.ts
 */
import { ref } from "vue";

export const useStack = () => {
    const undoStack: any = [];
    const redoStack: any = [];
    const queueStack = ref<any>(new Map()); // 存储当前操作的画布
    let isUndo = false; // 是否撤回
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
            storeQueue(event.page, event.canvas); // 存储当前操作的画布
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
                    stateToRestore.canvas.requestRenderAll();
                    isUndo = false; // 设置为撤回状态
                    storeQueue(previousState.page, previousState.canvas); // 存储当前操作的画布

                });
            } else if (previousState?.state.objects.length === 1) {
                // 如果只有一个对象，直接清空画布
                const objects = previousState.canvas.getObjects();
                for (let i = objects.length - 1; i >= 0; i--) {
                    if (!previousState.canvas.backgroundImage || objects[i] !== previousState.canvas.backgroundImage) {
                        previousState.canvas.remove(objects[i]);
                    }
                }
                previousState.canvas.requestRenderAll();
                storeQueue(previousState.page, previousState.canvas); // 存储当前操作的画布
                isUndo = false; // 设置为撤回状态
            } else {
                const objects = previousState.state.objects.slice(0, previousState.state.objects.length - 1); // 删除最后一个对象
                const stateToRestore = previousState
                previousState && previousState.canvas.loadFromJSON({ ...stateToRestore.state, objects }, () => {
                    previousState.canvas.requestRenderAll();
                    isUndo = false; // 设置为撤回状态
                    storeQueue(previousState.page, previousState.canvas); // 存储当前操作的画布
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
                stateToRestore.canvas.requestRenderAll();
                isUndo = false; // 设置为撤回状态
            });
            storeQueue(stateToRestore.page, stateToRestore.canvas); // 存储当前操作的画布
        }
    }
    const storeQueue = (page: number, canvas: any) => {
        const dataArr = canvas.getObjects()
        if (dataArr.length > 0) {
            queueStack.value.set(page + 1, canvas.getObjects()); // 存储当前操作的画布
        } else {
            queueStack.value.delete(page + 1); // 删除当前操作的画布
        }
    }
    return {
        saveState,
        undo,
        redo,
        queueStack: queueStack,
    }
}  