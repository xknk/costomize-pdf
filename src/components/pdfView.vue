<template>
    <div class="pdf-view-box" ref="pageRefs">
        <div class="pdf-view-reder-box" @touchstart="() => {}" @touchmove="() => {}">
            <div class="canvas-wrapper" v-for="(pdf, index) in pagesCount" :key="index">
                <canvas
                    class="annotation-canvas"
                    :id="`annotation-canvas_${index}`"
                    :data-index="index"
                ></canvas>
                <div
                    class="scroll-handle"
                    @touchstart.stop
                    @touchmove.stop
                    @touchend.stop
                ></div>
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
    nextTick,
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
    url,
}: {
    scale: { value: number };
    url: {
        value: string;
    };
} = toRefs(props);
const pageRefs = ref<any>(null); // 父级dom
const currenPage = ref<number | string>(1); // 当前页码
const {
    getPdfUrlFunc,
    rederPdfFunc,
    pagesCount,
    setPageFunc,
    getJosn,
    setGlobalDrawMode,
}: any = useRederPdf();
const getJosnFunc = () => {
    setGlobalDrawMode("line");
    const allShapes = getJosn();
    console.log(allShapes);
};
const getCanvasFunc = (event: string | number) => {};
/**
 * @description: 初始化事件
 * @return {*}
 */
const initFunc = async () => {
    await getPdfUrlFunc(url.value);
    await rederPdfFunc(scale.value);
    useMountObserve(pageRefs.value, pagesCount.value, debounce(getCanvasFunc, 300));
};

const setPage = (pageNum: number) => {
    currenPage.value = pageNum;
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
    overflow-y: auto;
}
.pdf-view-reder-box {
    width: 100%;
}
.canvas-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
}
.scroll-overlay {
    pointer-events: none; /* 允许事件穿透到Canvas */
    /* 定义可滚动区域 */
    &.scrollable {
        pointer-events: auto;
        background: transparent;
    }
}
</style>
