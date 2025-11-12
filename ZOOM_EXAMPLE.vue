<!--
  Canvas缩放功能使用示例
  将此代码添加到你的 pdfView.vue 中
-->

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { setupCanvasZoom, getZoomInfo, resetCanvasZoom } from '@/components/hooks/useOption/useZoomWrapper';
import { useDraw } from '@/components/hooks/useOption/useOption';

const canvasRef = ref(null);
const currentZoom = ref(1);  // 显示当前缩放比例

let zoomCleanup = null;

onMounted(() => {
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const canvasId = 'pdf-page-1';  // 使用你的canvasId

  // 初始化批注工具
  const { init } = useDraw();
  init(canvasId, canvas, ctx, 'text', {
    textColor: '#000000',
    fontSize: 16
  });

  // 设置缩放功能
  zoomCleanup = setupCanvasZoom({
    canvasId: canvasId,
    canvas: canvas,
    ctx: ctx,
    redrawCallback: () => {
      // 重绘PDF背景
      redrawPdfBackground(ctx);

      // 重绘所有批注（会自动应用缩放）
      // 批注工具内部会处理重绘
    },
    minScale: 0.5,
    maxScale: 3
  });

  // 监听缩放变化，更新UI显示
  const updateZoomDisplay = () => {
    const zoomState = getZoomInfo(canvasId);
    currentZoom.value = zoomState.scale;
  };

  // 定期更新缩放显示（或者在缩放回调中更新）
  setInterval(updateZoomDisplay, 100);
});

onUnmounted(() => {
  // 清理缩放事件
  zoomCleanup?.();
});

// 重绘PDF背景
const redrawPdfBackground = (ctx) => {
  // 你的PDF背景绘制逻辑
  // 例如：ctx.drawImage(pdfImage, 0, 0);
};

// 重置缩放
const handleResetZoom = () => {
  const canvasId = 'pdf-page-1';
  resetCanvasZoom(canvasId);

  // 重绘
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  redrawPdfBackground(ctx);
};

// 手动缩放按钮
const handleZoomIn = () => {
  const canvasId = 'pdf-page-1';
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();

  // 围绕画布中心缩放
  manualZoom(canvasId, 1, rect.width / 2, rect.height / 2);

  // 重绘
  const ctx = canvas.getContext('2d');
  redrawPdfBackground(ctx);
};

const handleZoomOut = () => {
  const canvasId = 'pdf-page-1';
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();

  manualZoom(canvasId, -1, rect.width / 2, rect.height / 2);

  const ctx = canvas.getContext('2d');
  redrawPdfBackground(ctx);
};
</script>

<template>
  <div class="pdf-container">
    <!-- 缩放控制工具栏 -->
    <div class="zoom-toolbar">
      <button @click="handleZoomOut">缩小 -</button>
      <span>{{ (currentZoom * 100).toFixed(0) }}%</span>
      <button @click="handleZoomIn">放大 +</button>
      <button @click="handleResetZoom">重置</button>
      <span class="tip">提示：使用鼠标滚轮或双指手势缩放</span>
    </div>

    <!-- Canvas画布 -->
    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        width="800"
        height="600"
        class="pdf-canvas"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.pdf-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.zoom-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.zoom-toolbar button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.zoom-toolbar button:hover {
  background: #f0f0f0;
  border-color: #4A90E2;
}

.zoom-toolbar button:active {
  transform: scale(0.95);
}

.zoom-toolbar span {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

.zoom-toolbar .tip {
  margin-left: auto;
  color: #666;
  font-size: 12px;
}

.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-canvas {
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: crosshair;
}
</style>
