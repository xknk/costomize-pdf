import { fabric } from 'fabric';
import { onMounted, onUnmounted, watch } from "vue"
/*
 * @Author: Robin LEI
 * @Date: 2025-04-14 10:17:46
 * @LastEditTime: 2025-07-01 15:11:53
 * @FilePath: \lgeqd:\自己搭建\vue\customize-pdf\src\components\hooks\useLine.ts
 */
export const useLine = (drawConfig: any, saveState: Function) => {
    let isDraw = false // 是否可以开始画线
    let isMoveCanvas = false // 是否可以移动画布
    let currentObjet: any = null // 临时操作对象
    let longPressTimer: number | null = null; // 判读是否长按
    let fabricCanvas: any
    let downPoint: any
    let lastPosX = 0;
    let lastPosY = 0;
    // 初始偏移量
    let offsetX = 0;
    let offsetY = 0;

    // 触摸状态
    let isPinching = false;
    let lastDistance = 0;
    let initialZoom = 0;
    // 新增：触摸开始时的偏移量
    let touchOffsetX = 0;
    let touchOffsetY = 0;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const startLine = async (event: { page: string, canvas: any }, e: any) => {
        if (!e || !event.canvas) return
        fabricCanvas = event.canvas
        const pointer = event.canvas.getPointer(e.e);
        if (e.target) {
            event.canvas.setActiveObject(e.target);
            event.canvas.requestRenderAll();
        } else if (drawConfig.value.type === "draw") {
            isDraw = true
            currentObjet = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: drawConfig.value.lineColor,
                strokeWidth: drawConfig.value.lineWidth,
                selectable: true,
                id: `line_${new Date().getTime()}`,
            });
            event.canvas.add(currentObjet);
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
                selectable: true,
                id: `circle_${new Date().getTime()}`,
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
                selectable: true,
                id: `rect_${new Date().getTime()}`,
            });
            event.canvas.add(currentObjet);
        } else if (drawConfig.value.type === "gesture") {
            const evt = e.e;
            if (evt.which === 1) {
                isMoveCanvas = true
                lastPosX = getClientX(e.e);
                lastPosY = getClientY(e.e);
            } else if (e.e.touches && e.e.touches.length === 1) { // 单指触摸
                isMoveCanvas = true;
                // 计算触摸点与画布的偏移量（关键修复点）
                const clientX = getClientX(e.e);
                const clientY = getClientY(e.e);
                const vpt = event.canvas.viewportTransform;
                touchOffsetX = clientX - (vpt[4] || 0);
                touchOffsetY = clientY - (vpt[5] || 0);
                lastPosX = clientX;
                lastPosY = clientY;
            } else if (e.e.touches && e.e.touches.length === 2) {
                // 处理手势模式 - 移动端（双指缩放）
                isPinching = true;
                const touch1 = e.e.touches[0];
                const touch2 = e.e.touches[1];
                lastDistance = calculateDistance(touch1, touch2);
                initialZoom = event.canvas.getZoom();
            }
        }
    }
    const drawLine = (event: {
        page: string, canvas: any, context: any,
        pdfCanvas: any, offscreenCanvas: any
    }, e: any) => {
        longPressTimer && clearTimeout(longPressTimer);
        if (!e || isDraw) {
            DrwaLine(event, e)
        } else if (isMoveCanvas && isMobile) {
            moveCavnasMobile(event, e);

        } else if (!e || isMoveCanvas) {
            moveCavnas(event, e)
        } else if (isPinching && e.e.touches && e.e.touches.length === 2) {
            // 处理双指缩放
            handlePinchZoom(event, e);
        }
    }
    const DrwaLine = (event: { page: string, canvas: any }, e: any) => {
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
        if (isDraw) {
            saveState({ ...event, type: 'add' })
        }
        isDraw = false
        longPressTimer && clearTimeout(longPressTimer);
        currentObjet = null
        isMoveCanvas = false
        isPinching = false
        touchOffsetX = 0;
        touchOffsetY = 0;
        // event.canvas.discardActiveObject();
        // event.canvas.renderAll();
    }
    const moveCavnas = (event: {
        page: string | number, canvas: any,
    }, e: any) => {
        const evt = e.e;
        const deltaX = evt.clientX - lastPosX;
        const deltaY = evt.clientY - lastPosY;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        const vpt = event.canvas.viewportTransform;
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        event.canvas.requestRenderAll();
    }

    const moveCavnasMobile = (event: {
        page: string | number, canvas: any,
    }, e: any) => {
        if (!isMoveCanvas) return;
        const clientX = getClientX(e.e);
        const clientY = getClientY(e.e);
        // // 使用触摸偏移量计算实际移动距离（关键修复点）
        // const deltaX = clientX - lastPosX;
        // const deltaY = clientY - lastPosY;
        const vpt = event.canvas.viewportTransform;
        vpt[4] = clientX - touchOffsetX; // 使用偏移量修正位置
        vpt[5] = clientY - touchOffsetY;
        lastPosX = clientX;
        lastPosY = clientY;
        event.canvas.requestRenderAll();
    }
    // 处理双指缩放
    const handlePinchZoom = (event: { page: string | number, canvas: any }, e: any) => {
        const touch1 = e.e.touches[0];
        const touch2 = e.e.touches[1];
        const currentDistance = calculateDistance(touch1, touch2);
        // 计算缩放比例
        const scaleRatio = currentDistance / lastDistance;
        const minZoom = 1;
        const maxZoom = 5;
        // 计算新的缩放值
        let zoom = initialZoom * scaleRatio;
        zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        // 计算缩放中心点
        const midPoint = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        // 应用缩放
        event.canvas.zoomToPoint({ x: midPoint.x, y: midPoint.y }, zoom);
        event.canvas.requestRenderAll();
    }

    const scaleCanvas = (event:
        {
            page: string | number,
            canvas: any,
        }, opt: any) => {

        if (!opt || !event.canvas || drawConfig.value.type != 'gesture') return
        const minZoom = 1;
        const maxZoom = 5;
        // // 监听鼠标滚轮事件
        const delta = opt.e.deltaY;
        let zoom = event.canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        event.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        event.canvas.requestRenderAll();
    }



    const addText = (event: { page: string | number, canvas: any }) => {
        if (!event || !event.canvas) return
        const pointer = getPointer(event.canvas.lowerCanvasEl);
        const currentIText = new fabric.IText("双击输入文本", {
            left: pointer.x,
            top: pointer.y,
            fontSize: drawConfig.value.fontSize,
            fill: drawConfig.value.fontColor,
            editable: true,
            lockScalingFlip: true, // 不能通过缩放为负值来翻转对象
            lockUniScaling: true, // 对象非均匀缩放被锁定
            id: `text_${new Date().getTime()}`,
        });
        event.canvas.add(currentIText)
        event.canvas.requestRenderAll();
        saveState({ ...event, type: 'add' })
    }
    const addImage = (event: { page: string | number, canvas: any }, imageUrl: string) => {
        if (!event || !event.canvas) return
        fabricCanvas = event.canvas
        const pointer = getPointer(event.canvas.lowerCanvasEl);
        // 使用 fabric.Image.fromURL 加载图片
        fabric.Image.fromURL(imageUrl, (img: any) => {
            // 设置图片的位置
            img.set({
                left: pointer.x,
                top: pointer.y,
                id: `image_${new Date().getTime()}`,
            });
            // 设置图片的缩放比例
            img.scale(0.5);
            // 将图片添加到画布
            event.canvas.add(img);
            // 渲染画布
            event.canvas.requestRenderAll();
            saveState({ ...event, type: 'add' })
        });
    }
    const handleKeyDown = (e: { key: string }) => {
        if (e.key === 'Delete') {
            const activeObject = fabricCanvas.getActiveObject();
            if (activeObject) {
                fabricCanvas.remove(activeObject);
                fabricCanvas.requestRenderAll();
            }
        }
    };

    const getPointer = (canvasRefs: any) => {
        const rect = canvasRefs.getBoundingClientRect()
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const isTopVisible = rect.top >= 0 && rect.top <= viewportHeight;
        let pointer = {
            x: 0,
            y: 0,
        }
        if (isTopVisible) {
            pointer.x = 30
            pointer.y = 50
        } else {
            pointer.x = 30
            pointer.y = rect.height - 50
        }
        return pointer
    }

    // 辅助函数优化：获取客户端坐标（明确事件类型处理）
    const getClientX = (e: any) => {
        return e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    }
    // 辅助函数优化：获取客户端坐标（明确事件类型处理）
    const getClientY = (e: any) => {
        return e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    }

    // 辅助函数：计算两点之间的距离
    const calculateDistance = (point1: { clientX: number, clientY: number }, point2: { clientX: number, clientY: number }) => {
        const dx = point2.clientX - point1.clientX;
        const dy = point2.clientY - point1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    const setActiveObject = (canvas: any, targetId: string, type = "setActive") => {
        const objects = canvas.getObjects();
        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            if (object.id === targetId) {
                // 将具有指定 ID 的元素设置为活动对象
                type === "setActive" ? canvas.setActiveObject(object) : canvas.remove(object);
                // 重新渲染画布
                canvas.requestRenderAll();
                break;
            }
        }
    }

    const clearActiveObjectAll = (canvasObj: any) => {
        for (let key in canvasObj) {
            const objects = canvasObj[key].getObjects();
            for (let i = objects.length - 1; i >= 0; i--) {
                if (!canvasObj[key].backgroundImage || objects[i] !== canvasObj[key].backgroundImage) {
                    canvasObj[key].remove(objects[i]);
                }
            }
            canvasObj[key].requestRenderAll();
        }
    }

    const resetActiveObject = (canvasObj: any) => {
        const initialVpt = [1, 0, 0, 1, 0, 0];
        for (let key in canvasObj) {
            canvasObj[key].viewportTransform = initialVpt.slice();
            canvasObj[key].requestRenderAll();
        }

    }



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
        addText,
        addImage,
        setActiveObject,
        clearActiveObjectAll,
        scaleCanvas,
        resetActiveObject
    }
} 