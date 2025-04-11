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
});
const {
    scale,
    istThumbnail,
}: {
    scale: { value: number };
    istThumbnail: { value: boolean };
} = toRefs(props);
const emit = defineEmits(["getThumbnail", "getPageNum", "mountPdf"]); // 传递缩略图数据
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
defineExpose({
    setPage: debounce(setPage, 500),
});
onMounted(() => {
    initFunc();
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
