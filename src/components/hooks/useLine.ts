/*
 * @Author: Robin LEI
 * @Date: 2025-04-14 10:17:46
 * @LastEditTime: 2025-04-14 16:13:09
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useLine.ts
 */
export const useLine = () => {
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
    const startLine = (e: any, dom: any, lineColor: string, lineWidth: string | number, page: string | number) => {
        if (!dom) return
        currenIndex = 0
        isDrawLine = true
        const rect = dom.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        pathDataArr = []
        pathDataArr.push({
            x: lastX,
            y: lastY,
            strokeStyle: lineColor,
            lineWidth: lineWidth
        })
        if (storePathObj[page]) {
            currenPagePathObj = storePathObj[page]
            const indexArr = Object.keys(currenPagePathObj).map(item => +item)
            currenIndex = Math.max(...indexArr)
            currenIndex++
        }
        currenPagePathObj[currenIndex] = pathDataArr
        storePathObj[page] = currenPagePathObj
    }
    const drawLine = (e: any, dom: any, lineColor: string, lineWidth: string | number, page: string | number) => {
        if (!isDrawLine && dom) return
        const canvas = dom;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
        pathDataArr.push({
            x: lastX,
            y: lastY,
            strokeStyle: lineColor,
            lineWidth: lineWidth
        })
        currenPagePathObj[currenIndex] = pathDataArr
        storePathObj[page] = currenPagePathObj
    }
    const stopDrwa = () => {
        isDrawLine = false
        isdrawRound = false
        return {
            storePathObj,
            currenPagePathObj,
            pathDataArr,
        }
    }
    const getPageLine = (page: string | number) => {
        return storePathObj[page]
    }
    const getPageCurrenLine = (page: string | number, key: string | number) => {
        return storePathObj[page][key]
    }
    const startRound = (e: any, dom: any, lineColor: string, lineWidth: string | number, page: string | number) => {
        if (!dom) return
    }
    const drawRound = (e: any, dom: any, lineColor: string, lineWidth: string | number, page: string | number) => {
        if (!isdrawRound && dom) return
    }
    return {
        startLine,
        drawLine,
        stopDrwa,
        getPageLine,
        getPageCurrenLine,
        startRound,
        drawRound
    }
} 