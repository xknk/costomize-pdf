<template>
    <div class="pdf-view-box" ref="pageRefs">
        <div class="pdf-view-reder-box">
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
            type: "text",
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

// 全局缩放状态
const currentScale = ref<number>(scale.value); // 当前实际的缩放比例（用于CSS transform）
const baseScale = ref<number>(scale.value); // 基础PDF渲染的scale（不变）
const isRerenderingPdf = ref<boolean>(false); // 是否正在重渲染PDF
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

// 获取PDF渲染相关方法
const {
    getPdfUrlFunc,
    rederPdfFunc,
    rerenderPdfOnly, // 用于缩放的重新渲染
    pagesCount,
    setPageFunc,
    getJosn,
    setGlobalDrawMode,
    clearAllAnnotations,
    destroyAllDrawState,
    pageDrawStateMap, // 获取页面状态
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

// 应用CSS transform缩放（即时反馈，丝滑，无闪屏）
const applyScaleTransform = () => {
    const relativeScale = currentScale.value / baseScale.value;

    Object.values(canvasRefs.value).forEach((canvas) => {
        const wrapper = canvas.parentElement;
        if (!wrapper) return;

        // 对主Canvas应用缩放
        canvas.style.transform = `scale(${relativeScale})`;
        canvas.style.transformOrigin = 'top left';

        // 临时Canvas应用相同的transform（激活批注也要跟着缩放）
        const tempCanvas = wrapper.querySelector(`#temp-${canvas.id}`) as HTMLCanvasElement;
        if (tempCanvas) {
            tempCanvas.style.transform = `scale(${relativeScale})`;
            tempCanvas.style.transformOrigin = 'top left';
        }

        // 调整wrapper的底部间距，补偿transform导致的视觉变化
        // 原始高度 * (relativeScale - 1) = 视觉上增加的高度
        const originalHeight = canvas.offsetHeight / relativeScale; // 还原为未缩放时的高度
        const visualHeightIncrease = originalHeight * (relativeScale - 1);

        // 设置margin-bottom来补偿视觉变化，保持瀑布流间距
        wrapper.style.marginBottom = `${16 + visualHeightIncrease}px`;
    });
};

// 移除CSS transform
const removeScaleTransform = () => {
    Object.values(canvasRefs.value).forEach((canvas) => {
        const wrapper = canvas.parentElement;
        if (!wrapper) return;

        canvas.style.transform = '';

        const tempCanvas = wrapper.querySelector(`#temp-${canvas.id}`) as HTMLCanvasElement;
        if (tempCanvas) {
            tempCanvas.style.transform = '';
        }

        // 恢复原始间距
        wrapper.style.marginBottom = '16px';
    });
};

// 智能重渲染高清PDF（避免闪屏）
const rerenderPdfForClearView = async () => {
    if (isRerenderingPdf.value) return;

    const targetScale = currentScale.value;
    const scaleRatio = targetScale / baseScale.value;

    // 如果缩放比例接近1.0，不需要重渲染
    if (Math.abs(scaleRatio - 1.0) < 0.1) {
        console.log('📊 缩放比例接近1.0，跳过重渲染');
        return;
    }

    isRerenderingPdf.value = true;
    console.log(`🎨 开始重渲染高清PDF，scale: ${targetScale.toFixed(2)}`);

    try {
        // 移除CSS transform
        removeScaleTransform();

        // 重新渲染PDF并缩放批注坐标
        await rerenderPdfOnly(targetScale, baseScale.value);

        // 更新基础scale
        baseScale.value = targetScale;

        // 重新获取Canvas引用
        setTimeout(() => {
            getCanvasFunc(null);
            console.log('✅ 高清PDF渲染完成');
        }, 50);
    } catch (error) {
        console.error('❌ PDF重渲染失败:', error);
        // 失败时恢复CSS transform
        applyScaleTransform();
    } finally {
        isRerenderingPdf.value = false;
    }
};

// 防抖的重渲染函数（停止缩放1秒后执行）
const debouncedRerender = debounce(rerenderPdfForClearView, 1000);

// 处理缩放（滚轮或触摸）- 完全实时，无延迟
const handleZoom = (delta: number, event: WheelEvent | TouchEvent) => {
    event.preventDefault();

    // 计算新的缩放比例
    const scaleFactor = delta > 0 ? 0.95 : 1.05; // 5%的缩放步长
    let newScale = currentScale.value * scaleFactor;

    // 限制缩放范围
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    // 如果缩放比例变化太小，直接返回
    if (Math.abs(newScale - currentScale.value) < 0.001) return;

    // 立即更新缩放比例
    currentScale.value = newScale;

    // 立即应用CSS transform（丝滑缩放）
    applyScaleTransform();

    // 停止缩放1秒后，重新渲染高清版本
    debouncedRerender();
};

// 绑定滚轮事件到容器
const bindWheelZoomToContainer = () => {
    const container = pageRefs.value;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
        // 检查是否在canvas区域（可选，也可以改成总是响应）
        const target = e.target as HTMLElement;
        const isCanvas = target.classList.contains('annotation-canvas') ||
                        target.closest('.pdf-view-reder-box');

        if (isCanvas && e.ctrlKey) { // 按住Ctrl键时缩放，避免干扰正常滚动
            handleZoom(e.deltaY, e);
        }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        container.removeEventListener('wheel', handleWheel);
    };
};

// 移动端触摸缩放
let lastTouchDistance = 0;
const bindTouchZoomToContainer = () => {
    const container = pageRefs.value;
    if (!container) return;

    const getDistance = (touch1: Touch, touch2: Touch) => {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
            lastTouchDistance = getDistance(e.touches[0], e.touches[1]);
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance > 0) {
            e.preventDefault();

            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const delta = currentDistance - lastTouchDistance;

            handleZoom(-delta, e); // 负号是因为手势方向相反

            lastTouchDistance = currentDistance;
        }
    };

    const handleTouchEnd = () => {
        lastTouchDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
    };
};

// 初始化函数
const initFunc = async () => {
    if (!url.value) return;

    // 同步初始缩放比例
    currentScale.value = scale.value;
    baseScale.value = scale.value;

    // 加载PDF
    await getPdfUrlFunc(url.value);
    console.log(drawConfig.value);
    // 渲染PDF并应用绘制配置（使用基础缩放比例）
    await rederPdfFunc(baseScale.value, drawConfig.value.type, {
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

    // 应用初始缩放
    if (currentScale.value !== baseScale.value) {
        applyScaleTransform();
    }
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
let cleanupZoomWheel: (() => void) | undefined;
let cleanupZoomTouch: (() => void) | undefined;

onMounted(() => {
    initFunc();

    // 等待DOM渲染完成后绑定缩放事件
    setTimeout(() => {
        cleanupZoomWheel = bindWheelZoomToContainer();
        cleanupZoomTouch = bindTouchZoomToContainer();
        console.log('✅ 智能缩放系统已启用（实时CSS transform + 延迟高清重渲染）');
    }, 500);
});

// 组件卸载时清理资源
onUnmounted(() => {
    destroyAllDrawState();

    // 清理缩放事件监听
    if (cleanupZoomWheel) cleanupZoomWheel();
    if (cleanupZoomTouch) cleanupZoomTouch();
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
    overflow: auto; /* 改为auto，允许横向和纵向滚动 */
    padding: 16px;
    box-sizing: border-box;
}

.pdf-view-reder-box {
    width: fit-content; /* 改为fit-content，根据内容自动调整 */
    min-width: 100%; /* 至少占满容器宽度 */
    display: flex;
    flex-direction: column;
    align-items: center;
}

.canvas-wrapper {
    width: fit-content; /* 改为fit-content，根据canvas实际尺寸 */
    display: flex;
    justify-content: center;
    margin-bottom: 16px; /* 页间距 */
    position: relative;
}

.annotation-canvas {
    display: block;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: crosshair;
    background: white;
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
