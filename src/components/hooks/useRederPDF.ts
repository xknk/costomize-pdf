/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-11-05 16:42:57
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useRederPDF.ts
 */
import { ref } from "vue"; // 移除未使用的API（defineComponent/reactive等）
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// 1. 修正导入：引入统一绘制Hook（非useOption，而是之前的useDraw）
import { useDraw, DrawMode, DrawCustomStyle } from './useOption/useOption';

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// 2. 新增：存储每一页的绘制状态（隔离多页Canvas）
interface PageDrawState {
    canvasId: string; // 页Canvas的纯ID（不含#）
    canvas: HTMLCanvasElement; // 页Canvas元素
    ctx: CanvasRenderingContext2D; // 页Canvas上下文
    redrawOriginalContent: () => Promise<void>; // 该页PDF重绘回调（用于清空批注时恢复）
}

export const useRederPdf = () => {
    // 3. 初始化统一绘制Hook
    const drawHook = useDraw();
    let pdfDoc: any = null;
    const pdfUrl = ref<string>("");
    const pagesCount = ref<number>(0);
    // 4. 新增：管理所有页的绘制状态（避免多页冲突）
    const pageDrawStateMap = new Map<string, PageDrawState>(); // key: canvasId, value: 页绘制状态
    // 5. 新增：记录当前全局绘制模式（所有页统一模式）
    let currentGlobalDrawMode: DrawMode = 'rect';


    /**
     * @description: 获取pdfUrl（原有逻辑不变）
     * @param {string} url
     * @return {*}
     */
    const getPdfUrlFunc = async (url: string) => {
        // 先销毁之前的绘制资源（避免PDF重新加载时冲突）
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
     * @description: 渲染PDF + 初始化每一页的绘制功能（核心修改）
     * @param {number} scale // 放大倍数
     * @param {DrawMode} defaultMode // 绘制默认模式（所有页统一）
     * @param {DrawCustomStyle} customStyle // 绘制自定义样式（所有页统一）
     * @return {*}
     */
    const rederPdfFunc = async (
        scale: number,
        defaultMode: DrawMode = 'rect',
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

            // 计算PDF页视口（原有逻辑不变）
            const originalViewport = page.getViewport({ scale });
            let actualScale = scale;
            if (containerWidth && containerWidth < originalViewport.width) {
                actualScale = scale * (containerWidth / originalViewport.width);
            }
            const viewport = page.getViewport({ scale: actualScale });

            // 6. 处理页Canvas：区分「选择器（含#）」和「纯ID（不含#）」
            const canvasId = `annotation-canvas_${i - 1}`; // 纯ID（给绘制Hook用）
            const canvasSelector = `#${canvasId}`; // 选择器（用于querySelector）
            const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
            if (!canvas) throw new Error(`第${i}页Canvas不存在（ID: ${canvasId}）`);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error(`第${i}页Canvas获取上下文失败`);

            // 设置Canvas尺寸（原有逻辑不变）
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };

            // 7. 渲染当前页PDF（原有逻辑不变）
            await page.render(renderContext).promise;

            // 8. 定义该页的「PDF重绘回调」（清空批注时恢复PDF）
            const redrawOriginalContent = async () => {
                // 重新渲染当前页PDF（覆盖批注，恢复原始内容）
                await page.render(renderContext).promise;
            };

            // 9. 初始化当前页的绘制功能（调用统一Hook）
            drawHook.init(
                canvasId,        // 纯Canvas ID（唯一标识）
                canvas,          // 当前页Canvas元素
                ctx,             // 当前页Canvas上下文
                defaultMode,     // 默认绘制模式
                customStyle      // 自定义样式
            );

            // 10. 记录当前页的绘制状态（用于后续模式切换/清空）
            pageDrawStateMap.set(canvasId, {
                canvasId,
                canvas,
                ctx,
                redrawOriginalContent,
            });
        }
    };


    /**
     * @description: 统一切换所有页的绘制模式（对外暴露）
     * @param {DrawMode} mode 目标模式（line/rect）
     * @param {DrawCustomStyle} customStyle 可选：切换模式时同步更新样式
     * @return {*}
     */
    const setGlobalDrawMode = (mode: DrawMode, customStyle?: DrawCustomStyle) => {
        if (pageDrawStateMap.size === 0) {
            console.warn("请先渲染PDF，再切换绘制模式");
            return;
        }
        currentGlobalDrawMode = mode;
        // 遍历所有页，调用修正后的 switchMode（参数顺序：mode, customStyle, canvasId, canvas, ctx）
        pageDrawStateMap.forEach((pageState) => {
            drawHook.switchMode(
                mode,                  // 第1个参数：目标模式
                customStyle,           // 第2个参数：自定义样式（可选）
                pageState.canvasId,    // 第3个参数：页Canvas ID（多页必传）
                pageState.canvas,      // 第4个参数：页Canvas元素（多页必传）
                pageState.ctx          // 第5个参数：页Canvas上下文（多页必传）
            );
        });
    };


    /**
     * @description: 清空所有页的批注（对外暴露）
     * @return {*}
     */
    const clearAllAnnotations = () => {
        if (pageDrawStateMap.size === 0) return;
        // 遍历所有页，清空批注（并恢复PDF）
        pageDrawStateMap.forEach((pageState) => {
            drawHook.clearAnnotations(
                pageState.canvasId,
                pageState.canvas,
                pageState.redrawOriginalContent // 清空后恢复PDF
            );
        });
    };


    /**
     * @description: 销毁所有页的绘制资源（避免内存泄漏）
     * @return {*}
     */
    const destroyAllDrawState = () => {
        // 销毁绘制Hook资源
        drawHook.destroy();
        // 清空页绘制状态
        pageDrawStateMap.clear();
        // 释放PDF URL
        if (pdfUrl.value) {
            URL.revokeObjectURL(pdfUrl.value);
            pdfUrl.value = "";
        }
        pagesCount.value = 0;
        pdfDoc = null;
    };


    /**
     * @description: 页面滚动（原有逻辑不变）
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
    // 11. 对外暴露API（包含绘制相关方法）
    return {
        getPdfUrlFunc,
        rederPdfFunc,
        setGlobalDrawMode,  // 新增：统一切换绘制模式
        clearAllAnnotations,// 新增：清空所有页批注
        destroyAllDrawState,// 新增：销毁绘制资源
        setPageFunc,
        pdfUrl,
        pagesCount,
        currentGlobalDrawMode, // 新增：暴露当前绘制模式（供组件显示
        getJosn,
    };
};