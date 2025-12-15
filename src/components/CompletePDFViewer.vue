<template>
  <div class="complete-pdf-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 缩放控制 -->
      <div class="toolbar-group">
        <button @click="handleZoomOut" :disabled="!isLoaded">缩小</button>
        <span class="scale-display">{{ scalePercent }}%</span>
        <button @click="handleZoomIn" :disabled="!isLoaded">放大</button>
        <button @click="handleResetZoom" :disabled="!isLoaded">重置</button>
      </div>

      <!-- 页面信息 -->
      <div class="toolbar-group">
        <span v-if="isLoaded" class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <span v-else>加载中...</span>
      </div>

      <!-- 批注工具 -->
      <div class="toolbar-group">
        <button
          v-for="tool in tools"
          :key="tool.name"
          @click="handleActivateTool(tool.name)"
          :class="{ active: activeTool === tool.name }"
          :disabled="!isLoaded"
        >
          {{ tool.label }}
        </button>
        <button @click="handleDeactivateTool" :disabled="!isLoaded || !activeTool">
          取消
        </button>
      </div>

      <!-- 批注操作 -->
      <div class="toolbar-group">
        <button @click="handleUndo" :disabled="!isLoaded || !canUndo">撤销</button>
        <button @click="handleRedo" :disabled="!isLoaded || !canRedo">重做</button>
        <button @click="handleClearAll" :disabled="!isLoaded">清空</button>
        <button @click="handleExport" :disabled="!isLoaded">导出</button>
      </div>
    </div>

    <!-- PDF容器 -->
    <div ref="containerRef" class="pdf-container">
      <div class="canvas-wrapper" v-if="isLoaded">
        <canvas ref="pdfCanvasRef"></canvas>
        <canvas ref="annotationCanvasRef" class="annotation-layer"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

// 状态
const containerRef = ref<HTMLElement>();
const pdfCanvasRef = ref<HTMLCanvasElement>();
const annotationCanvasRef = ref<HTMLCanvasElement>();
const isLoaded = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.5);
const activeTool = ref<string | null>(null);

// 批注数据
interface Annotation {
  id: string;
  type: string;
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  text?: string;
}

const annotations = ref<Annotation[]>([]);
const history = ref<Annotation[][]>([]);
const historyIndex = ref(-1);
const isDrawing = ref(false);
const currentAnnotation = ref<Annotation | null>(null);

const scalePercent = computed(() => Math.round(scale.value * 100));
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

const tools = [
  { name: 'rectangle', label: '矩形' },
  { name: 'circle', label: '圆形' },
  { name: 'line', label: '线条' },
  { name: 'text', label: '文字' }
];

let pdfDoc: any = null;

// 渲染 PDF
const renderPDF = async (pageNum: number, newScale: number) => {
  if (!pdfDoc || !pdfCanvasRef.value || !annotationCanvasRef.value) return;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: newScale });

  // 设置 PDF canvas
  const pdfCanvas = pdfCanvasRef.value;
  const pdfContext = pdfCanvas.getContext('2d')!;
  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;

  // 设置批注 canvas（与 PDF canvas 相同大小）
  const annotationCanvas = annotationCanvasRef.value;
  annotationCanvas.height = viewport.height;
  annotationCanvas.width = viewport.width;

  // 渲染 PDF
  await page.render({
    canvasContext: pdfContext,
    viewport: viewport
  }).promise;

  // 重新渲染批注
  renderAnnotations();
};

// 渲染批注
const renderAnnotations = () => {
  if (!annotationCanvasRef.value) return;

  const canvas = annotationCanvasRef.value;
  const ctx = canvas.getContext('2d')!;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制所有批注
  annotations.value.forEach(annotation => {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();

    switch (annotation.type) {
      case 'rectangle':
        if (annotation.endX !== undefined && annotation.endY !== undefined) {
          const width = annotation.endX - annotation.startX;
          const height = annotation.endY - annotation.startY;
          ctx.rect(annotation.startX, annotation.startY, width, height);
        }
        break;

      case 'circle':
        if (annotation.endX !== undefined && annotation.endY !== undefined) {
          const radius = Math.sqrt(
            Math.pow(annotation.endX - annotation.startX, 2) +
            Math.pow(annotation.endY - annotation.startY, 2)
          );
          ctx.arc(annotation.startX, annotation.startY, radius, 0, 2 * Math.PI);
        }
        break;

      case 'line':
        if (annotation.endX !== undefined && annotation.endY !== undefined) {
          ctx.moveTo(annotation.startX, annotation.startY);
          ctx.lineTo(annotation.endX, annotation.endY);
        }
        break;

      case 'text':
        if (annotation.text) {
          ctx.font = '16px Arial';
          ctx.fillStyle = '#ff0000';
          ctx.fillText(annotation.text, annotation.startX, annotation.startY);
        }
        break;
    }

    ctx.stroke();
  });
};

// 添加批注到历史
const addToHistory = () => {
  // 删除当前位置之后的历史
  history.value = history.value.slice(0, historyIndex.value + 1);
  // 添加当前状态
  history.value.push([...annotations.value]);
  historyIndex.value++;
};

// 鼠标事件处理
const handleMouseDown = (e: MouseEvent) => {
  if (!activeTool.value || !annotationCanvasRef.value) return;

  const canvas = annotationCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (activeTool.value === 'text') {
    const text = prompt('请输入文字：');
    if (text) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        startX: x,
        startY: y,
        text
      };
      annotations.value.push(annotation);
      addToHistory();
      renderAnnotations();
    }
  } else {
    isDrawing.value = true;
    currentAnnotation.value = {
      id: Date.now().toString(),
      type: activeTool.value,
      startX: x,
      startY: y
    };
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDrawing.value || !currentAnnotation.value || !annotationCanvasRef.value) return;

  const canvas = annotationCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentAnnotation.value.endX = x;
  currentAnnotation.value.endY = y;

  // 临时渲染
  renderAnnotations();

  // 绘制当前批注
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();

  switch (currentAnnotation.value.type) {
    case 'rectangle':
      const width = x - currentAnnotation.value.startX;
      const height = y - currentAnnotation.value.startY;
      ctx.rect(currentAnnotation.value.startX, currentAnnotation.value.startY, width, height);
      break;

    case 'circle':
      const radius = Math.sqrt(
        Math.pow(x - currentAnnotation.value.startX, 2) +
        Math.pow(y - currentAnnotation.value.startY, 2)
      );
      ctx.arc(currentAnnotation.value.startX, currentAnnotation.value.startY, radius, 0, 2 * Math.PI);
      break;

    case 'line':
      ctx.moveTo(currentAnnotation.value.startX, currentAnnotation.value.startY);
      ctx.lineTo(x, y);
      break;
  }

  ctx.stroke();
  ctx.setLineDash([]);
};

const handleMouseUp = () => {
  if (!isDrawing.value || !currentAnnotation.value) return;

  if (currentAnnotation.value.endX !== undefined && currentAnnotation.value.endY !== undefined) {
    annotations.value.push({ ...currentAnnotation.value });
    addToHistory();
    renderAnnotations();
  }

  isDrawing.value = false;
  currentAnnotation.value = null;
};

// 工具栏处理
const handleZoomIn = async () => {
  scale.value = Math.min(scale.value + 0.2, 3.0);
  await renderPDF(currentPage.value, scale.value);
};

const handleZoomOut = async () => {
  scale.value = Math.max(scale.value - 0.2, 0.5);
  await renderPDF(currentPage.value, scale.value);
};

const handleResetZoom = async () => {
  scale.value = 1.5;
  await renderPDF(currentPage.value, scale.value);
};

const handleActivateTool = (toolName: string) => {
  activeTool.value = toolName;
};

const handleDeactivateTool = () => {
  activeTool.value = null;
};

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    annotations.value = [...history.value[historyIndex.value]];
    renderAnnotations();
  }
};

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    annotations.value = [...history.value[historyIndex.value]];
    renderAnnotations();
  }
};

const handleClearAll = () => {
  if (confirm('确定要清空所有批注吗？')) {
    annotations.value = [];
    addToHistory();
    renderAnnotations();
  }
};

const handleExport = () => {
  const data = JSON.stringify(annotations.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'annotations.json';
  a.click();
  URL.revokeObjectURL(url);
};

// 初始化
onMounted(async () => {
  try {
    console.log('开始加载 PDF:', props.url);

    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    console.log('PDF 加载成功，总页数:', pdfDoc.numPages);
    totalPages.value = pdfDoc.numPages;

    // 先设置 isLoaded，让 canvas 元素被创建
    isLoaded.value = true;

    // 等待 DOM 更新
    await nextTick();

    console.log('Canvas refs:', pdfCanvasRef.value, annotationCanvasRef.value);

    // 现在渲染 PDF
    await renderPDF(1, scale.value);

    // 初始化历史
    history.value = [[]];
    historyIndex.value = 0;

    // 绑定批注事件
    if (annotationCanvasRef.value) {
      annotationCanvasRef.value.addEventListener('mousedown', handleMouseDown);
      annotationCanvasRef.value.addEventListener('mousemove', handleMouseMove);
      annotationCanvasRef.value.addEventListener('mouseup', handleMouseUp);
    }

    console.log('PDF 渲染完成');
  } catch (error) {
    console.error('PDF 加载失败:', error);
  }
});
</script>

<style scoped>
.complete-pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #ddd;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.scale-display,
.page-info {
  padding: 6px 12px;
  background: #f8f8f8;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}

.pdf-container {
  flex: 1;
  overflow: auto;
  background: #e0e0e0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.canvas-wrapper {
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

canvas {
  display: block;
}

.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
}
</style>
