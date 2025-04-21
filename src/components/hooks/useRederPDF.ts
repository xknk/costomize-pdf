/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-04-21 09:23:17
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
    let fabricCanvasObj = ref<{ [id: string]: any }>({})
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
            const canvas = canvasRefs["canvas" + (i - 1)]; // 获取对应的canvas元素
            if (!canvas) break;
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const fabricCanvas = new fabric.Canvas(`annotation-canvas_${i - 1}`, {
                width: viewport.width,
                height: viewport.height,
                isDrawingMode: false,
                // backgroundColor: 'transparent' 
            })
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
            })) // 鼠标在画布上移动
            fabricCanvas.on('mouse:up', stopDrwa.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            })) // 鼠标在画布上移动
            fabricCanvasObj.value[`annotation-canvas_${i - 1}`] = fabricCanvas
            const dataObj = jsonData[`annotation-canvas_${i - 1}`]
            dataObj && fabricCanvas.loadFromJSON(dataObj, () => {
                // 加载完成后渲染画布
                fabricCanvas.renderAll();
            });
            const wrapper = canvas.parentElement;
            wrapper.style.width = `${viewport.width}px`;
            wrapper.style.height = `${viewport.height}px`;
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
            if (istThumbnail) {
                const imageUrl = canvas.toDataURL("image/png");
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