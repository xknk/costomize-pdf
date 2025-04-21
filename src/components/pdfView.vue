<template>
    <div class="pdf-view-box" ref="pageRefs">
        <div class="canvas-parent-box">
            <div class="canvas-wrapper" v-for="(pdf, index) in pagesCount" :key="index">
                <canvas
                    :data-index="index"
                    class="pdf-box"
                    :ref="(el:any) => (canvasRefs['canvas' + index] = el)"
                ></canvas>
            </div>
            <div class="annotation-canvas-parent-box">
                <canvas class="annotation-canvas" :id="`annotation-canvas`"></canvas>
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
    jsonData: {
        type: Object,
        default: () => {},
    },
});
const {
    scale,
    istThumbnail,
    drawConfig,
    url,
    jsonData,
}: {
    scale: { value: number };
    istThumbnail: { value: boolean };
    drawConfig: {
        value: any;
    };
    url: {
        value: string;
    };
    jsonData: any;
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
const { startLine, drawLine, stopDrwa, addText, wheel } = useLine(drawConfig);
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
        wheel,
        jsonData.value
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

    // console.log(jsonData, "jsonData");
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
const addTextFunc = () => {
    // addText();
};
defineExpose({
    setPage: debounce(setPage, 500),
    getJson: getJson,
    getDownUrl: getDownUrl,
    addText: addTextFunc,
});
</script>
<style scoped>
.pdf-view-box {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    overflow-y: auto;
    position: relative;
}
.canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.pdf-box {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    z-index: -1;
}
.annotation-canvas {
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
}
.annotation-canvas-parent-box {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    display: flex;
    justify-content: center;
}
</style>
