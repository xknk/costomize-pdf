<template>
    <div class="pdf-view-box" ref="pageRefs">
        <div>
            <div class="canvas-wrapper" v-for="(pdf, index) in pagesCount" :key="index">
                <canvas
                    :data-index="index"
                    class="pdf-box"
                    :ref="(el:any) => (canvasRefs['canvas' + index] = el)"
                ></canvas>
                <canvas
                    class="annotation-canvas"
                    :ref="(el:any) => (annotationCanvasRefs['annotation-canvas' + index] = el)"
                    @mousedown="(e:any)=>startDrawingFunc(e, 'annotation-canvas' + index)"
                    @mousemove="(e:any)=>drawDrawingFunc(e, 'annotation-canvas' + index)"
                    @mouseup="(e:any)=>stopDrawingFunc()"
                    @mouseleave="(e:any)=>stopDrawingFunc()"
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
    onUnmounted,
    watch,
} from "vue";
import { useRederPdf } from "./hooks/useRederPDF";
import { useMountObserve } from "./hooks/useMountObserve";
import { useLine } from "./hooks/useLine.ts";
import { debounce } from "@/utils";
const props = defineProps({
    scale: {
        type: Number,
        default: 1,
    },
    istThumbnail: {
        type: Boolean,
        default: false,
    },
    pageNum: {
        type: Number,
        default: 1,
    },
    drawConfig: {
        type: Object,
        default: {
            type: "none",
            fontSize: "12",
            color: "red",
        },
    },
});
const {
    scale,
    istThumbnail,
    drawConfig,
}: {
    scale: { value: number };
    istThumbnail: { value: boolean };
    drawConfig: {
        value: {
            type: string;
            fontSize: string | number;
            color: string;
        };
    };
} = toRefs(props);
const emit = defineEmits(["getThumbnail", "getPageNum", "mountPdf", "stopDrawing"]); // 传递缩略图数据
const pageRefs = ref<any>(null); // 父级dom
const canvasRefs = ref<any>([]); // pdf渲染Canvas
const annotationCanvasRefs = ref<any>([]); // pdf-lib渲染Canvas
const examplePdf = "file/vuejs.pdf";
const {
    getPdfUrlFunc,
    rederPdfFunc,
    pagesCount,
    thumbnailObj,
    setPageFunc,
} = useRederPdf();
const { startLine, drawLine, stopDrwa, startRound, drawRound } = useLine();
const getCanvasFunc = (event: string | number) => {
    emit("getPageNum", event);
};
/**
 * @description: 初始化事件
 * @return {*}
 */
const initFunc = async () => {
    await getPdfUrlFunc(examplePdf);
    await rederPdfFunc(
        scale.value,
        canvasRefs.value,
        annotationCanvasRefs.value,
        istThumbnail.value
    );
    useMountObserve(
        pageRefs.value,
        canvasRefs.value,
        pagesCount.value,
        debounce(getCanvasFunc, 300)
    );
    emit("getThumbnail", thumbnailObj.value);
    emit("mountPdf", {
        pageRefs: pageRefs.value,
        canvasRefs: canvasRefs.value,
        annotationCanvasRefs: annotationCanvasRefs.value,
        pagesCount: pagesCount.value,
        scale: scale.value,
    });
};

const setPage = (currenPage: number) => {
    setPageFunc(pageRefs.value, canvasRefs.value, currenPage);
};
onMounted(() => {
    initFunc();
});
/**
 * @description: 开始画线
 * @return {*}
 */
const startDrawingFunc = (e: any, rowKey: string, index: number | string) => {
    if (drawConfig.value.type === "draw") {
        startLine(
            e,
            annotationCanvasRefs.value[rowKey],
            drawConfig.value.lineColor,
            drawConfig.value.lineWidth,
            index
        );
    } else {
        startRound(
            e,
            annotationCanvasRefs.value[rowKey],
            drawConfig.value.lineColor,
            drawConfig.value.lineWidth,
            index
        );
        // console.log();
    }
};
/**
 * @description: 画线
 * @return {*}
 */
const drawDrawingFunc = (e: any, rowKey: string, index: number | string) => {
    if (drawConfig.value.type === "draw") {
        drawLine(
            e,
            annotationCanvasRefs.value[rowKey],
            drawConfig.value.lineColor,
            drawConfig.value.lineWidth,
            index
        );
    } else {
        drawRound(
            e,
            annotationCanvasRefs.value[rowKey],
            drawConfig.value.lineColor,
            drawConfig.value.lineWidth,
            index
        );
    }
};
/**
 * @description: 结束画线
 * @return {*}
 */
const stopDrawingFunc = () => {
    const data = stopDrwa();
    emit("stopDrawing", data);
};
defineExpose({
    setPage: debounce(setPage, 500),
});
</script>
<style scoped>
.pdf-view-box {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    overflow-y: auto;
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
    z-index: 2;
    width: 100%;
    height: 100%;
    position: absolute;
}
</style>
