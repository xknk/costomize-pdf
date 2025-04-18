import { fabric } from 'fabric';
import { onMounted, onUnmounted, watch } from "vue"
/*
 * @Author: Robin LEI
 * @Date: 2025-04-14 10:17:46
 * @LastEditTime: 2025-04-15 15:21:02
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useLine.ts
 */
export const useLine = (drawConfig: any) => {
    let isDraw = false // 是否可以开始画线
    let currentObjet: any = null // 临时操作对象
    let longPressTimer: number | null = null; // 判读是否长按
    let fabricCanvas: any
    let downPoint: any
    const startLine = async (event: { page: string, canvas: any }, e: any) => {
        if (!e || !event.canvas) return
        fabricCanvas = event.canvas
        const pointer = event.canvas.getPointer(e.e);
        if (e.target) {
            event.canvas.setActiveObject(e.target);
            event.canvas.renderAll();
        } else if (drawConfig.value.type === "draw") {
            isDraw = true
            currentObjet = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: drawConfig.value.lineColor,
                strokeWidth: drawConfig.value.lineWidth,
                selectable: true
            });
            event.canvas.add(currentObjet);
        } else if (drawConfig.value.type === "text") {
            longPressTimer = setTimeout(() => {
                addText(event, e);
            }, 1000);
            return
        } else if (drawConfig.value.type === "round") {
            isDraw = true
            downPoint = { x: pointer.x, y: pointer.y };
            currentObjet = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 0,
                fill: 'transparent',
                stroke: drawConfig.value.lineColor,
                strokeWidth: drawConfig.value.lineWidth,
                selectable: true
            });
            event.canvas.add(currentObjet);

        } else if (drawConfig.value.type === "rect") {
            isDraw = true
            downPoint = { x: pointer.x, y: pointer.y };
            currentObjet = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 0,
                height: 0,
                fill: 'transparent',
                stroke: drawConfig.value.lineColor,
                strokeWidth: drawConfig.value.lineWidth,
                selectable: true
            });
            event.canvas.add(currentObjet);

        }
    }
    const drawLine = (event: { page: string, canvas: any }, e: any) => {
        longPressTimer && clearTimeout(longPressTimer);
        if (!e || !isDraw) return
        const pointer = event.canvas.getPointer(e.e);
        if (drawConfig.value.type === 'draw') {
            currentObjet.set({ x2: pointer.x, y2: pointer.y });
            event.canvas.requestRenderAll();
        } else if (drawConfig.value.type === "round") {
            const dx = pointer.x - downPoint.x;
            const dy = pointer.y - downPoint.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            currentObjet.set({ radius: radius, left: downPoint.x - radius, top: downPoint.y - radius });
            event.canvas.requestRenderAll();

        } else if (drawConfig.value.type === "rect") {
            const width = pointer.x - downPoint.x;
            const height = pointer.y - downPoint.y;
            currentObjet.set({
                left: downPoint.x + Math.min(0, width),
                top: downPoint.y + Math.min(0, height),
                width: Math.abs(width),
                height: Math.abs(height)
            });
            event.canvas.requestRenderAll();

        }
    }
    const stopDrwa = (event: { page: string, canvas: any }, e: any) => {
        isDraw = false
        longPressTimer && clearTimeout(longPressTimer);
        currentObjet = null
        // event.canvas.discardActiveObject();
        // event.canvas.renderAll();
    }
    const addText = (event: { page: string, canvas: any }, e: any) => {
        const currentIText = new fabric.IText("双击输入文本", {
            left: e.pointer.x,
            top: e.pointer.y,
            fontSize: drawConfig.value.fontSize,
            fill: drawConfig.value.fontColor,
            editable: true,
            lockScalingFlip: true, // 不能通过缩放为负值来翻转对象
            lockUniScaling: true // 对象非均匀缩放被锁定
        });
        event.canvas.add(currentIText)
        event.canvas.requestRenderAll();
    }
    const handleKeyDown = (e: { key: string }) => {
        if (e.key === 'Delete') {
            const activeObject = fabricCanvas.getActiveObject();
            // && activeObject.type === 'i-text' || activeObject.type === 'line'
            if (activeObject) {
                fabricCanvas.remove(activeObject);
                fabricCanvas.renderAll();
            }
        }
    };
    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
    })
    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });
    const getPageLine = (page: string | number) => {
    }
    const getPageCurrenLine = (page: string | number, key: string | number) => {
    }
    return {
        startLine,
        drawLine,
        stopDrwa,
        getPageLine,
        getPageCurrenLine,
        addText
    }
} 