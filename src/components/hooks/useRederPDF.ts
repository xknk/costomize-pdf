/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 14:45:59
 * @LastEditTime: 2025-04-10 15:21:13
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\Hooks\useRederPDF.ts
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
     * @param {any} annotationcanvasRefs // pdf-lib渲染Canvas
     * @param {boolean} istThumbnail // 是否产生缩略图
     * @return {*}
     */
    const rederPdfFunc = async (scale: number, canvasRefs: any, annotationcanvasRefs: any, istThumbnail: boolean = false) => {
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
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const annotCanvas = annotationcanvasRefs["annotation-canvas" + (i - 1)];
            annotCanvas.height = viewport.height;
            annotCanvas.width = viewport.width;
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
    return {
        getPdfUrlFunc,
        rederPdfFunc,
        thumbnailObj,
        pdfUrl,
        pagesCount
    }
}