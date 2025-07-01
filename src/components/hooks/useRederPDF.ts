/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-07-01 15:46:25
 * @FilePath: \lgeqd:\自己搭建\vue\customize-pdf\src\components\hooks\useRederPDF.ts
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
    var defaultOnTouchStartHandler = fabric.Canvas.prototype._onTouchStart;
    fabric.util.object.extend(fabric.Canvas.prototype, {
        _onTouchStart: function (e: any) {
            var target = this.findTarget(e);
            // if allowTouchScrolling is enabled, no object was at the
            // the touch position and we're not in drawing mode, then 
            // let the event skip the fabricjs canvas and do default
            // behavior
            if (this.allowTouchScrolling && !target && !this.isDrawingMode) {
                // returning here should allow the event to propagate and be handled
                // normally by the browser
                return;
            }
            // otherwise call the default behavior
            defaultOnTouchStartHandler.call(this, e);
        }
    });
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
     * @param {boolean} istThumbnail // 是否产生缩略图
     * @return {*}
     */
    const rederPdfFunc = async (
        scale: number,
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

            // 获取实际容器元素
            const containerEl = document.querySelector('.pdf-view-reder-box');
            const containerWidth = containerEl ? containerEl.clientWidth : 0;
            // 原始视口尺寸
            const originalViewport = page.getViewport({ scale });

            // 计算实际缩放比例
            let actualScale = scale;
            if (containerWidth && containerWidth < originalViewport.width) {
                actualScale = scale * (containerWidth / originalViewport.width);
            }

            // 使用调整后的缩放比例创建视口
            const viewport = page.getViewport({ scale: actualScale });

            // 创建离屏 canvas 元素
            const offscreenCanvas = document.createElement('canvas');
            const offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCanvas.width = viewport.width;
            offscreenCanvas.height = viewport.height;

            const canvasId = `annotation-canvas_${i - 1}`;
            const fabricCanvas = new fabric.Canvas(canvasId, {
                width: viewport.width,
                height: viewport.height,
                isDrawingMode: false,
                enableRetinaScaling: false, // 禁用 Retina 
                allowTouchScrolling: false,
            });

            if (!fabricCanvas) {
                break;
            }

            fabricCanvas.selectionColor = 'transparent';
            fabricCanvas.selectionBorderColor = 'transparent';

            // 事件绑定保持不变
            fabricCanvas.on('mouse:down', startLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));
            fabricCanvas.on('touch:start', startLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));

            fabricCanvas.on('mouse:move', drawLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));

            fabricCanvas.on('touch:move', drawLine.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));

            fabricCanvas.on('mouse:up', stopDrwa.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));

            fabricCanvas.on('touch:end', stopDrwa.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));


            fabricCanvas.on('mouse:wheel', scaleCanvas.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
            }));
            fabricCanvas.on('object:removed', saveState.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                type: 'remove'
            }));
            fabricCanvas.on('object:modified', saveState.bind(fabricCanvas, {
                page: i - 1,
                canvas: fabricCanvas,
                type: 'modify'
            }));

            fabricCanvasObj[canvasId] = fabricCanvas;

            const dataObj = jsonData[canvasId];
            dataObj && fabricCanvas.loadFromJSON(dataObj, () => {
                fabricCanvas.renderAll();
            });

            const renderContext: any = {
                canvasContext: offscreenCtx,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

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
            };
        }
    }

    const setPageFunc = (pageRefs: HTMLElement | null, canvasRefs: Record<string, HTMLElement>, currenPage: number) => {
        if (!pageRefs || !canvasRefs) return;
        const targetScrollTop = canvasRefs.lowerCanvasEl.offsetHeight * (currenPage);
        const startScrollTop = pageRefs.scrollTop;
        const duration = 300;
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