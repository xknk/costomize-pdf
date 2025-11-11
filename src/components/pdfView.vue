<template>
    <div class="pdf-view-box" ref="pageRefs">
        <div class="pdf-view-reder-box" @touchstart="() => {}" @touchmove="() => {}">
            <!-- 每页Canvas容器，确保居中布局 -->
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
import { ref, toRefs, defineProps, onMounted, onUnmounted, watch } from "vue";
import { useRederPdf } from "./hooks/useRederPDF";
import { useMountObserve } from "./hooks/useMountObserve";
import { debounce } from "@/utils";

// 定义绘制样式配置接口
interface DrawStyleConfig {
    strokeStyle: string; // 线条颜色
    fillStyle: string; // 填充颜色
    lineWidth: number; // 线条宽度
    controlFillStyle: string; // 控制点填充色
    controlStrokeStyle: string; // 控制点边框色
    controlSize: number; // 控制点大小
}

// 定义组件属性
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
        type: Object as () => {
            type: string;
            strokeStyle: string;
            fillStyle: string;
            lineWidth: number;
            controlFillStyle: string;
            controlStrokeStyle: string;
            controlSize: number;
        },
        default: () => ({
            type: "rect",
            strokeStyle: "#ff0000",
            fillStyle: "rgba(255, 0, 0, 0.1)",
            lineWidth: 2,
            controlFillStyle: "#ffffff",
            controlStrokeStyle: "#000000",
            controlSize: 6,
        }),
    },
    url: {
        type: String,
        default: "",
    },
    jsonData: {
        type: Object,
        default: () => ({}),
    },
});

// 解构属性
const { scale, url, drawConfig, pageNum } = toRefs(props);

// 组件内部状态
const pageRefs = ref<any>(null);
const currenPage = ref<number | string>(pageNum.value);
const canvasRefs = ref<Record<string, HTMLCanvasElement>>({});

// 获取PDF渲染相关方法
const {
    getPdfUrlFunc,
    rederPdfFunc,
    pagesCount,
    setPageFunc,
    getJosn,
    setGlobalDrawMode,
    clearAllAnnotations,
    destroyAllDrawState,
}: any = useRederPdf();

// 获取所有绘制数据
const getJosnFunc = () => {
    const allShapes = getJosn();
    console.log("所有绘制数据:", allShapes);
    return allShapes;
};

// 处理Canvas引用
const getCanvasFunc = (event: any) => {
    for (let i = 0; i < pagesCount.value; i++) {
        const canvas = document.getElementById(
            `annotation-canvas_${i}`
        ) as HTMLCanvasElement;
        if (canvas) {
            canvasRefs.value[`annotation-canvas_${i}`] = canvas;
        }
    }
};

// 初始化函数
const initFunc = async () => {
    if (!url.value) return;

    // 加载PDF
    await getPdfUrlFunc(url.value);
    console.log(drawConfig.value);
    // 渲染PDF并应用绘制配置
    await rederPdfFunc(scale.value, drawConfig.value.type, {
        strokeStyle: drawConfig.value.strokeStyle,
        rectFillStyle: drawConfig.value.fillStyle,
        circleFillStyle: drawConfig.value.fillStyle,
        lineWidth: drawConfig.value.lineWidth,
        controlFillStyle: drawConfig.value.controlFillStyle,
        controlStrokeStyle: drawConfig.value.controlStrokeStyle,
        controlSize: drawConfig.value.controlSize,
    });

    // 监听DOM变化
    useMountObserve(pageRefs.value, pagesCount.value, debounce(getCanvasFunc, 300));

    // 切换到配置的绘制模式
    setGlobalDrawMode(drawConfig.value.type, {
        strokeStyle: drawConfig.value.strokeStyle,
        rectFillStyle: drawConfig.value.fillStyle,
        circleFillStyle: drawConfig.value.fillStyle,
        lineWidth: drawConfig.value.lineWidth,
        controlFillStyle: drawConfig.value.controlFillStyle,
        controlStrokeStyle: drawConfig.value.controlStrokeStyle,
        controlSize: drawConfig.value.controlSize,
    });
};

// 切换页码
const setPage = (pageNum: number) => {
    currenPage.value = pageNum;
    setPageFunc(pageRefs.value, canvasRefs.value, pageNum);
};

// 监听绘制配置变化，实时更新
watch(
    drawConfig,
    (newVal) => {
        if (pagesCount.value > 0) {
            setGlobalDrawMode(newVal.type, {
                strokeStyle: newVal.strokeStyle,
                rectFillStyle: newVal.fillStyle,
                circleFillStyle: newVal.fillStyle,
                lineWidth: newVal.lineWidth,
                controlFillStyle: newVal.controlFillStyle,
                controlStrokeStyle: newVal.controlStrokeStyle,
                controlSize: newVal.controlSize,
            });
        }
    },
    { deep: true }
);

// 监听URL变化，重新加载PDF
watch(url, (newVal) => {
    if (newVal) {
        initFunc();
    }
});

// 监听页码变化
watch(pageNum, (newVal) => {
    setPage(newVal);
});

// 组件挂载时初始化
onMounted(() => {
    initFunc();
});

// 组件卸载时清理资源
onUnmounted(() => {
    destroyAllDrawState();
});

// 对外暴露方法
defineExpose({
    getJosnFunc,
    setPage,
    clearAllAnnotations,
});
</script>

<style scoped>
.pdf-view-box {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    overflow-y: auto;
    padding: 16px;
    box-sizing: border-box;
}

.pdf-view-reder-box {
    width: 100%;
    max-width: 800px; /* 限制最大宽度，优化大屏显示 */
}

.canvas-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 16px; /* 页间距 */
    position: relative;
}

.annotation-canvas {
    max-width: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.scroll-handle {
    height: 40px;
    width: 100%;
}

/* 修复滚动穿透 */
:deep(.scroll-overlay) {
    pointer-events: none;
    &.scrollable {
        pointer-events: auto;
        background: transparent;
    }
}
</style>
