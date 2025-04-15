import { fabric } from 'fabric';
import { watch } from "vue"
/*
 * @Author: Robin LEI
 * @Date: 2025-04-14 10:17:46
 * @LastEditTime: 2025-04-15 13:53:26
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useLine.ts
 */
export const useLine = (drawConfig: any) => {
    type pathTS = { x?: number, y?: number, strokeStyle?: string, lineWidth?: number | string }[];
    let lastX: number = 0;
    let lastY: number = 0;
    let pathDataArr: pathTS = []
    let currenPagePathObj: { [index: string | number]: pathTS } = {}
    let storePathObj: { [page: string | number]: { [index: string | number]: pathTS } } = {}
    let isDrawLine = false // 是否可以开始画线
    let isdrawRound = false // 是否可以画圆
    let currenIndex = 0
    let lastRadius = 0
    let currentLine: any = null
    const startLine = async (event: { page: string, canvas: any }, e: any) => {
        if (!e || drawConfig.value.type !== "draw") return
        isDrawLine = true
        // const pencilBrush = await new fabric.PencilBrush(event.canvas);
        // pencilBrush.color = drawConfig.value.lineColor; // 修改笔触颜色
        // pencilBrush.width = drawConfig.value.lineWidth; // 修改笔触粗细
        // event.canvas.freeDrawingBrush = pencilBrush; // 将自定义的笔触设置到 canvas 上
        const pointer = event.canvas.getPointer(e.e);
        currentLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: drawConfig.value.lineColor,
            strokeWidth: drawConfig.value.lineWidth,
            selectable: false
        });
        event.canvas.add(currentLine);
        // const pointer = canvas.getPointer(e.e);
        // currentLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        //     stroke: 'red',
        //     strokeWidth: 2,
        //     selectable: false
        // });
        // canvas.add(currentLine);
        // currenIndex = 0
        // isDrawLine = true
        // const rect = dom.getBoundingClientRect();
        // lastX = e.clientX - rect.left;
        // lastY = e.clientY - rect.top;
        // pathDataArr = []
        // pathDataArr.push({
        //     x: lastX,
        //     y: lastY,
        //     strokeStyle: lineColor,
        //     lineWidth: lineWidth
        // })
        // if (storePathObj[page]) {
        //     currenPagePathObj = storePathObj[page]
        //     const indexArr = Object.keys(currenPagePathObj).map(item => +item)
        //     currenIndex = Math.max(...indexArr)
        //     currenIndex++
        // }
        // currenPagePathObj[currenIndex] = pathDataArr
        // storePathObj[page] = currenPagePathObj
    }
    const drawLine = (event: { page: string, canvas: any }, e: any) => {
        if (!e || !isDrawLine) return
        const pointer = event.canvas.getPointer(e.e);
        currentLine.set({ x2: pointer.x, y2: pointer.y });
        event.canvas.requestRenderAll();
        // console.log(currentLine, 'currentLine')
        // if (!isDrawLine && dom) return
        // const canvas = dom;
        // const ctx = canvas.getContext("2d");
        // const rect = canvas.getBoundingClientRect();
        // const x = e.clientX - rect.left;
        // const y = e.clientY - rect.top;
        // ctx.beginPath();
        // ctx.strokeStyle = lineColor;
        // ctx.lineWidth = lineWidth;
        // ctx.lineCap = "round";
        // ctx.moveTo(lastX, lastY);
        // ctx.lineTo(x, y);
        // ctx.stroke();
        // lastX = x;
        // lastY = y;
        // pathDataArr.push({
        //     x: lastX,
        //     y: lastY,
        //     strokeStyle: lineColor,
        //     lineWidth: lineWidth
        // })
        // currenPagePathObj[currenIndex] = pathDataArr
        // storePathObj[page] = currenPagePathObj
    }
    const stopDrwa = (event: { page: string, canvas: any }, e: any) => {
        isDrawLine = false
        isdrawRound = false
        // event.canvas.isDrawingMode = false
        // return {
        //     storePathObj,
        //     currenPagePathObj,
        //     pathDataArr,
        // }
    }
    const addText = (event: { page: string, canvas: any }, e: any) => {
        const text = new fabric.IText("双击输入文本", {
            left: e.pointer.x,
            top: e.pointer.y,
            fontSize: 20,
            fill: "black",
            editable: true,
        });
        event.canvas.add(text)
    }
    const getPageLine = (page: string | number) => {
        // return storePathObj[page]
    }
    const getPageCurrenLine = (page: string | number, key: string | number) => {
        // return storePathObj[page][key]
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