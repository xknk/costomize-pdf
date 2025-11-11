/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-11-11 17:07:13
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useRederPDF.ts
 */
import { ref } from "vue";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useDraw, DrawMode, DrawCustomStyle } from './useOption/useOption';

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// 存储每一页的绘制状态（隔离多页Canvas）
interface PageDrawState {
    canvasId: string; // 页Canvas的纯ID（不含#）
    canvas: HTMLCanvasElement; // 页Canvas元素
    ctx: CanvasRenderingContext2D; // 页Canvas上下文
    redrawOriginalContent: () => Promise<void>; // 该页PDF重绘回调
}

export const useRederPdf = () => {
    // 初始化统一绘制Hook
    const drawHook = useDraw();
    let pdfDoc: any = null;
    const pdfUrl = ref<string>("");
    const pagesCount = ref<number>(0);
    // 管理所有页的绘制状态（避免多页冲突）
    const pageDrawStateMap = new Map<string, PageDrawState>(); // key: canvasId
    // 记录当前全局绘制模式（所有页统一模式）
    let currentGlobalDrawMode: DrawMode = 'none';


    /**
     * @description: 获取pdfUrl
     * @param {string} url
     * @return {*}
     */
    const getPdfUrlFunc = async (url: string) => {
        // 先销毁之前的绘制资源
        destroyAllDrawState();

        const existingPdfBytes = await fetch(url).then((res) => {
            if (!res.ok) throw new Error("PDF加载失败");
            return res.arrayBuffer();
        });
        pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        // 释放旧URL，避免内存泄漏
        if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
        pdfUrl.value = URL.createObjectURL(blob);
    };


    /**
     * @description: 渲染PDF + 初始化每一页的绘制功能
     * @param {number} scale 放大倍数
     * @param {DrawMode} defaultMode 绘制默认模式
     * @param {DrawCustomStyle} customStyle 绘制自定义样式
     * @return {*}
     */
    const rederPdfFunc = async (
        scale: number,
        defaultMode: DrawMode = 'none',
        customStyle: DrawCustomStyle = {}
    ) => {
        if (!pdfUrl.value) return;
        // 先清空之前的页绘制状态
        pageDrawStateMap.clear();
        currentGlobalDrawMode = defaultMode;

        const loadingTask = pdfjsLib.getDocument(pdfUrl.value);
        const pdf = await loadingTask.promise;
        pagesCount.value = pdf.numPages;
        const containerEl = document.querySelector('.pdf-view-reder-box');
        if (!containerEl) throw new Error("PDF渲染容器 .pdf-view-reder-box 不存在");

        // 循环渲染每一页PDF
        for (let i = 1; i <= pagesCount.value; i++) {
            const page = await pdf.getPage(i);
            const containerWidth = containerEl.clientWidth;

            // 计算PDF页视口
            const originalViewport = page.getViewport({ scale });
            let actualScale = scale;
            if (containerWidth && containerWidth < originalViewport.width) {
                actualScale = scale * (containerWidth / originalViewport.width);
            }
            const viewport = page.getViewport({ scale: actualScale });

            // 处理页Canvas
            const canvasId = `annotation-canvas_${i - 1}`; // 纯ID
            const canvasSelector = `#${canvasId}`; // 选择器
            const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
            if (!canvas) throw new Error(`第${i}页Canvas不存在（ID: ${canvasId}）`);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error(`第${i}页Canvas获取上下文失败`);

            // 设置Canvas尺寸
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };

            // 渲染当前页PDF
            await page.render(renderContext).promise;

            // 定义该页的「PDF重绘回调」
            const redrawOriginalContent = async () => {
                await page.render(renderContext).promise;
            };
            console.log(defaultMode)
            // 初始化当前页的绘制功能
            drawHook.init(
                canvasId,
                canvas,
                ctx,
                defaultMode,
                customStyle
            );

            // 记录当前页的绘制状态
            pageDrawStateMap.set(canvasId, {
                canvasId,
                canvas,
                ctx,
                redrawOriginalContent,
            });
        }
    };


    /**
     * @description: 统一切换所有页的绘制模式
     * @param {DrawMode} mode 目标模式
     * @param {DrawCustomStyle} customStyle 切换模式时同步更新样式
     * @return {*}
     */
    const setGlobalDrawMode = (mode: DrawMode, customStyle?: DrawCustomStyle) => {
        if (pageDrawStateMap.size === 0) {
            console.warn("请先渲染PDF，再切换绘制模式");
            return;
        }
        currentGlobalDrawMode = mode;
        // 遍历所有页，应用模式和样式
        pageDrawStateMap.forEach((pageState) => {
            drawHook.switchMode(
                mode,
                customStyle,
                pageState.canvasId,
                pageState.canvas,
                pageState.ctx
            );
        });
    };


    /**
     * @description: 清空所有页的批注
     * @return {*}
     */
    const clearAllAnnotations = () => {
        if (pageDrawStateMap.size === 0) return;
        pageDrawStateMap.forEach((pageState) => {
            drawHook.clearAnnotations(
                pageState.canvasId,
                pageState.canvas,
                pageState.redrawOriginalContent
            );
        });
    };


    /**
     * @description: 销毁所有页的绘制资源
     * @return {*}
     */
    const destroyAllDrawState = () => {
        drawHook.destroy();
        pageDrawStateMap.clear();
        if (pdfUrl.value) {
            URL.revokeObjectURL(pdfUrl.value);
            pdfUrl.value = "";
        }
        pagesCount.value = 0;
        pdfDoc = null;
    };


    /**
     * @description: 页面滚动
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

    const getJosn = () => {
        const allShapes = drawHook.getAllShapes();
        return allShapes
    };

    return {
        getPdfUrlFunc,
        rederPdfFunc,
        setGlobalDrawMode,
        clearAllAnnotations,
        destroyAllDrawState,
        setPageFunc,
        pdfUrl,
        pagesCount,
        currentGlobalDrawMode,
        getJosn,
    };
};
