<template>
    <div class="pdf-view-box">
        <div>
            <div class="canvas-wrapper" v-for="(pdf, index) in pagesCount" :key="index">
                <canvas
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
} from "vue";
import { useRederPdf } from "./hooks/useRederPDF";
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
const emit = defineEmits(["getThumbnail"]); // 传递缩略图数据
const canvasRefs = ref<any>([]); // pdf渲染Canvas
const annotationCanvasRefs = ref<any>([]); // pdf-lib渲染Canvas
const examplePdf = "file/vuejs.pdf";
const { getPdfUrlFunc, rederPdfFunc, pagesCount, thumbnailObj } = useRederPdf();
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
    emit("getThumbnail", thumbnailObj.value);
};
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
