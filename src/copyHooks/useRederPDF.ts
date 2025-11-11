/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-11-04 15:16:47
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useRederPDF.ts
 * 单canvas模式，创建一个新的canvas，以图片形式插入到canvas
 */
import { ref } from "vue";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useOptions } from "./useOption";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// 新增：缓存PDF的离屏Canvas（避免重复渲染PDF）
interface PageRenderData {
    page: any;
    viewport: any;
    renderContext: {
        canvasContext: CanvasRenderingContext2D;
        viewport: any;
    };
    offscreenCanvas: HTMLCanvasElement; // 离屏Canvas（缓存PDF内容）
    offscreenCtx: CanvasRenderingContext2D; // 离屏Canvas上下文
}

export const useRederPdf = () => {
    const { initDrawingByMouseMove, setDrawMode, clearAnnotations } = useOptions();
    let pdfDoc: any = null;
    const pdfUrl = ref<string>("");
    const pagesCount = ref<number>(0);
    const pageRenderDataMap = new Map<string, PageRenderData>();

    /**
     * @description: 获取pdfUrl（逻辑不变）
     * @param {string} url
     * @return {*}
     */
    const getPdfUrlFunc = async (url: string) => {
        try {
            const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
            pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            pdfUrl.value = URL.createObjectURL(blob);
        } catch (err) {
            console.error("获取PDF URL失败：", err);
        }
    };

    /**
     * @description: 渲染PDF+初始化单Canvas批注（修复闪烁）
     * @param {number} scale // 放大倍数
     * @return {*}
     */
    const rederPdfFunc = async (scale: number = 1.0) => {
        if (!pdfUrl.value) return;
        try {
            const loadingTask = pdfjsLib.getDocument(pdfUrl.value);
            const pdf = await loadingTask.promise;
            pagesCount.value = pdf.numPages;
            const containerEl = document.querySelector('.pdf-view-reder-box');
            if (!containerEl) throw new Error("PDF渲染容器 .pdf-view-reder-box 不存在");
            // 循环渲染每一页PDF
            for (let i = 1; i <= pagesCount.value; i++) {
                const page: any = await pdf.getPage(i);
                const containerWidth = containerEl.clientWidth;

                // 1. 计算视口和Canvas尺寸
                const originalViewport = page.getViewport({ scale });
                let actualScale = scale;
                if (containerWidth && containerWidth < originalViewport.width) {
                    actualScale = scale * (containerWidth / originalViewport.width);
                }
                const viewport = page.getViewport({ scale: actualScale });
                const canvasId = `annotation-canvas_${i - 1}`;
                const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
                if (!canvas) throw new Error(`第${i}页Canvas（id: ${canvasId}）不存在`);
                const context = canvas.getContext('2d');
                if (!context) throw new Error(`第${i}页Canvas获取上下文失败`);
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // 2. 创建离屏Canvas（缓存PDF内容，核心修复）
                const offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = viewport.width;
                offscreenCanvas.height = viewport.height;
                const offscreenCtx = offscreenCanvas.getContext('2d');
                if (!offscreenCtx) throw new Error("创建离屏Canvas失败");

                // 3. 先渲染PDF到离屏Canvas（仅渲染一次，后续重绘复用）
                const offscreenRenderContext = {
                    canvasContext: offscreenCtx,
                    viewport: viewport,
                };
                await page.render(offscreenRenderContext).promise;

                // 4. 将离屏Canvas的PDF内容复制到主Canvas（首次显示）
                context.drawImage(offscreenCanvas, 0, 0);

                // 5. 存储渲染数据（包含离屏Canvas）
                const renderContext = { canvasContext: context, viewport };
                pageRenderDataMap.set(canvasId, {
                    page,
                    viewport,
                    renderContext,
                    offscreenCanvas,
                    offscreenCtx,
                });

                // 6. 初始化单Canvas批注（重绘回调改为复用离屏Canvas）
                initDrawingByMouseMove(
                    canvasId,
                    canvas,
                    context,
                    // 修复：重绘PDF时直接复制离屏Canvas（无需重新渲染PDF）
                    () => {
                        const renderData = pageRenderDataMap.get(canvasId);
                        if (renderData) {
                            // 直接复制缓存的PDF内容到主Canvas（耗时<1ms）
                            context.drawImage(renderData.offscreenCanvas, 0, 0);
                        }
                    },
                    'rect',
                    {
                        strokeStyle: '#0088ff',
                        rectFillStyle: 'rgba(68, 138, 255, 0.3)',
                        lineWidth: 2
                    }
                );
                setDrawMode(canvasId, 'rect');
            }
        } catch (err) {
            console.error("PDF渲染或批注初始化失败：", err);
        }
    };

    /**
     * @description: 页面滚动（逻辑不变）
     * @param {HTMLElement|null} pageRefs 滚动容器
     * @param {Record<string, HTMLElement>} canvasRefs Canvas引用
     * @param {number} currenPage 当前页码
     * @return {*}
     */
    const setPageFunc = (pageRefs: HTMLElement | null, canvasRefs: Record<string, HTMLElement>, currenPage: number) => {
        if (!pageRefs || !canvasRefs || !canvasRefs.lowerCanvasEl) return;

        const targetScrollTop = canvasRefs.lowerCanvasEl.offsetHeight * currenPage;
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

    /**
     * @description: 清空某一页的批注
     * @param {string} canvasId 要清空的CanvasId
     * @return {*}
     */
    const clearPageAnnotations = (canvasId: string) => {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                clearAnnotations(canvasId, context);
            }
        }
    };

    return {
        getPdfUrlFunc,
        rederPdfFunc,
        setPageFunc,
        clearPageAnnotations,
        pdfUrl,
        pagesCount,
    };
};