<!--
 * @Author: Robin LEI
 * @Date: 2025-04-08 10:14:02
 * @LastEditTime: 2025-04-10 11:26:09
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\pdfView.vue
-->
<template>
    <div class="pdf-view-box">
        <div>
            <div class="canvas-wrapper" v-for="(pdf, index) in pagesCount" :key="index">
                <!-- ref="pdfCanvas" -->
                <canvas
                    class="pdf-box"
                    :ref="(el:any) => (canvasRefs['canvas' + index] = el)"
                ></canvas>
                <!-- ref="annotationCanvas" -->
                <canvas
                    class="annotation-canvas"
                    :ref="(el:any) => (annotationcanvasRefs['annotation-canvas' + index] = el)"
                    @mousedown="(e:any)=>startDrawing(e, 'annotation-canvas' + index)"
                    @mousemove="(e:any)=>draw(e, 'annotation-canvas' + index)"
                    @mouseup="(e:any)=>stopDrawing()"
                    @mouseleave="(e:any)=>stopDrawing()"
                    @click="handleCanvasClick"
                ></canvas>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
export default {
    name: "PdfView",
};
</script>
<script setup lang="ts">
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
const props = defineProps({
    scale: {
        type: Number,
        default: 1,
    },
    istThumbnail: {
        type: Boolean,
        default: false,
    },
});
const {
    scale,
    istThumbnail,
}: { scale: { value: number }; istThumbnail: { value: boolean } } = toRefs(props);

onMounted(() => {
    initPdfFunc(examplePdf);
});
const emit = defineEmits(["getThumbnail"]); // 传递缩略图数据
const pdfUrl = ref(""); // PDF转换后得地址

const pdfCanvas = ref<any>(null);
const annotationCanvas = ref<any>(null);
let freehandLines: any = []; // 用于存储手绘路径数据
let pathData = "";
let pdfDoc: any = null;
const examplePdf = "file/vuejs.pdf";

const canvasRefs = ref<any>([]);
const annotationcanvasRefs = ref<any>([]);
const pagesCount = ref(0);
const initPdfFunc = async (url: string) => {
    const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    pdfUrl.value = URL.createObjectURL(blob);
    // renderPdf(1);
    flowRenderPdf();
};

// const renderPdf = async (pageNum: number = 1) => {
//     if (!pdfUrl.value || !pdfCanvas.value) return;
//     const loadingTask = pdfjsLib.getDocument(pdfUrl.value);
//     const pdf = await loadingTask.promise;
//     const page = await pdf.getPage(pageNum);
//     const viewport = page.getViewport({ scale: 2 });
//     pdfCanvas.value.height = viewport.height;
//     pdfCanvas.value.width = viewport.width;
//     const annotCanvas = annotationCanvas.value;
//     annotCanvas.height = viewport.height;
//     annotCanvas.width = viewport.width;
//     // 设置 canvas-wrapper 的尺寸
//     const canvas = pdfCanvas.value;
//     const wrapper = canvas.parentElement;
//     wrapper.style.width = `${viewport.width}px`;
//     wrapper.style.height = `${viewport.height}px`;
//     const renderContext = {
//         canvasContext: pdfCanvas.value.getContext("2d"),
//         viewport: viewport,
//     };
//     await page.render(renderContext).promise;
// };
const flowRenderPdf = async () => {
    if (!pdfUrl.value) return;
    const loadingTask = pdfjsLib.getDocument(pdfUrl.value);
    const pdf = await loadingTask.promise;
    const thumbnailArr: string[] = []; // 缩略图
    const thumbnailInfoArr: { imgUrl: string; pageIndex: number }[] = [];
    pagesCount.value = pdf.numPages;
    for (let i = 1; i <= pagesCount.value; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale.value }); // 设置合适的缩放比例
        const canvas = canvasRefs.value["canvas" + (i - 1)]; // 获取对应的canvas元素
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const annotCanvas = annotationcanvasRefs.value["annotation-canvas" + (i - 1)];
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
        if (istThumbnail.value) {
            const imageUrl = canvas.toDataURL("image/png");
            thumbnailArr.push(imageUrl);
            thumbnailInfoArr.push({
                imgUrl: imageUrl,
                pageIndex: i,
            });
        }
    }
    if (istThumbnail.value) {
        emit("getThumbnail", {
            thumbnail: thumbnailArr,
            thumbnailInfo: thumbnailInfoArr,
        });
    }
};
const annotationMode = ref("draw"); // none, text, draw
const drawColor = ref("#ff0000");
const drawWidth = ref(2);
const isDrawing = ref(false);
const lastX = ref(0);
const lastY = ref(0);
const canvasContainer = ref(null);

// // 处理画布点击事件
const handleCanvasClick = (e: any) => {
    console.log("canvas click", e);
    // if (annotationMode.value !== "text") return;
    // const rect = annotationCanvas.value.getBoundingClientRect();
    // textPosition.value = {
    //     x: e.clientX - rect.left,
    //     y: e.clientY - rect.top,
    // };
    // showTextInput.value = true;
    // // 等待 DOM 更新后聚焦输入框
    // nextTick(() => {
    //     textInput.value?.focus();
    // });
};
const startDrawing = (e: any, refKey: string) => {
    if (annotationMode.value !== "draw") return;
    isDrawing.value = true;
    // const rect = annotationCanvas.value.getBoundingClientRect();
    const rect = annotationcanvasRefs.value[refKey].getBoundingClientRect();
    lastX.value = e.clientX - rect.left;
    lastY.value = e.clientY - rect.top;
    pathData = `M ${lastX.value} ${lastY.value}`;
    freehandLines.push({
        pathData: `M ${lastX.value} ${lastY.value}`,
        strokeStyle: drawColor.value,
        lineWidth: drawWidth.value,
    });
};
const draw = (e: any, refKey: string) => {
    if (!isDrawing.value || annotationMode.value !== "draw") return;
    // const canvas = annotationCanvas.value;
    const canvas = annotationcanvasRefs.value[refKey];
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.strokeStyle = drawColor.value;
    ctx.lineWidth = drawWidth.value;
    ctx.lineCap = "round";
    ctx.moveTo(lastX.value, lastY.value);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX.value = x;
    lastY.value = y;
    pathData += ` L ${x} ${y}`;
    freehandLines[freehandLines.length - 1].pathData = pathData;
    console.log(freehandLines, "freehandLines");
};

const stopDrawing = () => {
    isDrawing.value = false;
};
</script>
<style scoped>
.pdf-view-box {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
}

.canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
canvas {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
}
.pdf-box {
    width: 100%;
    height: 100%;
    z-index: -1;
}
.annotation-canvas {
    /* pointer-events: none;
    cursor: crosshair; */
    z-index: 2;
    width: 100%;
    height: 100%;
    position: absolute;
}
</style>
