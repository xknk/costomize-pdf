/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-04-27 09:17:07
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useRederPDF.ts
 */
import {
    defineComponent,
    reactive,
    ref,
    toRef,
    toRefs,
    defineProps,
    defineEmits,
    onMounted,
} from "vue";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { fabric } from 'fabric';
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
interface TsThumbnail {
    thumbnail?: string[],
    thumbnailInfo?: { imgUrl: string; pageIndex: number }[]
}
export const useRederPdf = () => {
    let pdfDoc: any = null;
    const pdfUrl = ref<string>("")
    const pagesCount = ref<number>(0)
    const thumbnailObj = ref<TsThumbnail | null>(null)
    let fabricCanvasObj: any = ({})
    /**
     * @description: 获取pdfUrl
     * @param {string} url
     * @return {*}
     */
    const getPdfUrlFunc = async (url: string) => {
        const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
        pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        pdfUrl.value = URL.createObjectURL(blob);
    }
    /**
     * @description: 渲染pdf与pdf-lib
     * @param {number} scale // 放大倍数
     * @param {any} canvasRefs // pdfCanvas
     * @param {boolean} istThumbnail // 是否产生缩略图
     * @return {*}
     */
    const rederPdfFunc = async (
        scale: number,
        canvasRefs: any,
        istThumbnail: boolean = false,
        startLine: Function,
        drawLine: Function,
        stopDrwa: Function,
        scaleCanvas: Function,
        saveState: Function,
        jsonData: any
    ) => {
        if (!pdfUrl.value) return;
        const loadingTask = pdfjsLib.getDocument(pdfUrl.value);
        const pdf = await loadingTask.promise;
        const thumbnailArr: string[] = []; // 缩略图
        const thumbnailInfoArr: { imgUrl: string; pageIndex: number }[] = [];
        pagesCount.value = pdf.numPages;
        for (let i = 1; i <= pagesCount.value; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale }); // 设置合适的缩放比例
            // 创建离屏 canvas 元素
            const offscreenCanvas = document.createElement('canvas');
            const offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCanvas.width = viewport.width;
            offscreenCanvas.height = viewport.height;

            const fabricCanvas = new fabric.Canvas(`annotation-canvas_${i - 1}`, {
                width: viewport.width,
                height: viewport.height,
                isDrawingMode: false,
            })
            if (!fabricCanvas) {
                break;
            }
            fabricCanvas.selectionColor = 'transparent'
            fabricCanvas.selectionBorderColor = 'transparent'
            // fabricCanvas.skipTargetFind = true // 禁止选中
            fabricCanvas.on('mouse:down', startLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            })) // 鼠标在画布上按下
            fabricCanvas.on('mouse:move', drawLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                offscreenCanvas
            })) // 鼠标在画布上移动
            fabricCanvas.on('mouse:up', stopDrwa.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            })) // 鼠标在画布上移动
            fabricCanvas.on('mouse:wheel', scaleCanvas.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                offscreenCanvas
            })) // 鼠标滚轮事件

            fabricCanvas.on('object:removed', saveState.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                type: 'remove'
            })) // 删除元素
            fabricCanvas.on('object:modified', saveState.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                type: 'modify'
            })) // 更新元素
            fabricCanvasObj[`annotation-canvas_${i - 1}`] = fabricCanvas
            const dataObj = jsonData[`annotation-canvas_${i - 1}`]
            dataObj && fabricCanvas.loadFromJSON(dataObj, () => {
                // 加载完成后渲染画布
                fabricCanvas.renderAll();
            });
            const renderContext: any = {
                canvasContext: offscreenCtx,
                viewport: viewport,
            };
            // await // 渲染页面到离屏 canvas
            await page.render(renderContext).promise
            const bgImage = new fabric.Image(offscreenCanvas, {
                left: 0,
                top: 0,
                width: viewport.width,
                height: viewport.height
            });
            fabricCanvas.setBackgroundImage(bgImage, fabricCanvas.renderAll.bind(fabricCanvas), {
                scaleX: fabricCanvas.width / viewport.width,
                scaleY: fabricCanvas.height / viewport.height
            });
            if (istThumbnail) {
                const imageUrl = offscreenCanvas.toDataURL("image/png");
                thumbnailArr.push(imageUrl);
                thumbnailInfoArr.push({
                    imgUrl: imageUrl,
                    pageIndex: i,
                });
            }
        }
        if (istThumbnail) {
            thumbnailObj.value = {
                thumbnail: thumbnailArr,
                thumbnailInfo: thumbnailInfoArr,
            }
        }
    }
    const setPageFunc = (pageRefs: HTMLElement | null, canvasRefs: Record<string, HTMLElement>, currenPage: number) => {
        if (!pageRefs || !canvasRefs[`canvas${currenPage - 1}`]) return;
        const targetScrollTop = canvasRefs[`canvas${currenPage - 1}`].offsetHeight * (currenPage - 1);
        const startScrollTop = pageRefs.scrollTop;
        const duration = 300; // 动画持续时间，单位毫秒
        const startTime = performance.now();
        const animateScroll = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime < duration) {
                const progress = elapsedTime / duration;
                pageRefs.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * progress;
                requestAnimationFrame(animateScroll);
            } else {
                pageRefs.scrollTop = targetScrollTop;
            }
        };
        requestAnimationFrame(animateScroll);
    };
    return {
        getPdfUrlFunc,
        rederPdfFunc,
        thumbnailObj,
        pdfUrl,
        pagesCount,
        setPageFunc,
        fabricCanvasObj
    }
}