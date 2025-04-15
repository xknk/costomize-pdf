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
                    :id="`annotation-canvas_${index}`"
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
import { useLine } from "./hooks/useLine";
import { useSave } from "./hooks/useSave";
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
    url: {
        type: String,
        default: "",
    },
});
const {
    scale,
    istThumbnail,
    drawConfig,
    url,
}: {
    scale: { value: number };
    istThumbnail: { value: boolean };
    drawConfig: {
        value: any;
    };
    url: {
        value: string;
    };
} = toRefs(props);
const emit = defineEmits(["getThumbnail", "getPageNum", "mountPdf", "stopDrawing"]); // 传递缩略图数据
const pageRefs = ref<any>(null); // 父级dom
const canvasRefs = ref<any>([]); // pdf渲染Canvas
const {
    getPdfUrlFunc,
    rederPdfFunc,
    pagesCount,
    thumbnailObj,
    setPageFunc,
    fabricCanvasObj,
}: any = useRederPdf();
const { startLine, drawLine, stopDrwa, addText } = useLine(drawConfig);
const { save, down } = useSave();
const getCanvasFunc = (event: string | number) => {
    emit("getPageNum", event);
};
/**
 * @description: 初始化事件
 * @return {*}
 */
const initFunc = async () => {
    await getPdfUrlFunc(url.value);
    await rederPdfFunc(
        scale.value,
        canvasRefs.value,
        istThumbnail.value,
        startLine,
        drawLine,
        stopDrwa,
        addText
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
        pagesCount: pagesCount.value,
        scale: scale.value,
    });
};

const setPage = (currenPage: number) => {
    setPageFunc(pageRefs.value, canvasRefs.value, currenPage);
};

const getJson = () => {
    const jsonObj = save(fabricCanvasObj.value);
    return jsonObj;
};
const getDownUrl = async () => {
    const newUrl = await down(url.value, fabricCanvasObj.value);
    return newUrl;
};
onMounted(() => {
    initFunc();
});
defineExpose({
    setPage: debounce(setPage, 500),
    getJson: getJson,
    getDownUrl: getDownUrl,
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
    width: 100%;
    height: 100%;
    position: absolute;
}
</style>
