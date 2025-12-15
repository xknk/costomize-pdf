<template>
  <div class="full-feature-pdf-viewer">
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
        <span v-if="isLoaded" class="page-info">总共 {{ totalPages }} 页</span>
        <span v-else>加载中...</span>
      </div>

      <!-- 批注工具 -->
      <div class="toolbar-group">
        <button
          @click="handleActivateTool('select')"
          :class="{ active: activeTool === 'select' }"
          :disabled="!isLoaded"
        >
          选择
        </button>
        <button
          v-for="tool in tools"
          :key="tool.name"
          @click="handleActivateTool(tool.name)"
          :class="{ active: activeTool === tool.name }"
          :disabled="!isLoaded"
        >
          {{ tool.label }}
        </button>
      </div>

      <!-- 批注操作 -->
      <div class="toolbar-group">
        <button @click="handleDeleteSelected" :disabled="!selectedAnnotation">删除选中</button>
        <button @click="handleUndo" :disabled="!canUndo">撤销</button>
        <button @click="handleRedo" :disabled="!canRedo">重做</button>
        <button @click="handleClearAll" :disabled="!isLoaded">清空</button>
        <button @click="handleExport" :disabled="!isLoaded">导出</button>
      </div>
    </div>

    <!-- PDF容器 -->
    <div ref="containerRef" class="pdf-container" @scroll="handleScroll">
      <div class="pages-wrapper" v-if="isLoaded">
        <div
          v-for="pageNum in totalPages"
          :key="pageNum"
          class="page-wrapper"
          :data-page="pageNum"
        >
          <div class="canvas-container">
            <canvas :ref="el => setPdfCanvasRef(el, pageNum)"></canvas>
            <canvas
              :ref="el => setAnnotationCanvasRef(el, pageNum)"
              class="annotation-layer"
              @mousedown="handleMouseDown($event, pageNum)"
              @mousemove="handleMouseMove($event, pageNum)"
              @mouseup="handleMouseUp($event, pageNum)"
            ></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 文字输入框 - 添加调试信息 -->
    <div
      v-if="showTextInput"
      class="text-input-wrapper"
      :style="{
        left: textInputPos.x + 'px',
        top: textInputPos.y + 'px'
      }"
      @mousedown.stop
      @click.stop
    >
      <input
        ref="textInputRef"
        v-model="textInputValue"
        class="text-input"
        @blur="handleTextInputBlur"
        @keydown="handleTextInputKeydown"
        @mousedown.stop
        @click.stop
        placeholder="输入文字（回车确认，ESC取消）"
        autocomplete="off"
      />
    </div>

    <!-- 调试信息 -->
    <div v-if="showTextInput" class="debug-info">
      输入框已显示
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

// 状态
const containerRef = ref<HTMLElement>();
const isLoaded = ref(false);
const totalPages = ref(0);
const scale = ref(1.5);
const activeTool = ref<string>('select');

// Canvas refs 映射
const pdfCanvasRefs = new Map<number, HTMLCanvasElement>();
const annotationCanvasRefs = new Map<number, HTMLCanvasElement>();

const setPdfCanvasRef = (el: any, pageNum: number) => {
  if (el) pdfCanvasRefs.set(pageNum, el);
};

const setAnnotationCanvasRef = (el: any, pageNum: number) => {
  if (el) annotationCanvasRefs.set(pageNum, el);
};

// 批注数据
interface Annotation {
  id: string;
  type: string;
  pageNum: number;
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
const isDragging = ref(false);
const currentAnnotation = ref<Annotation | null>(null);
const selectedAnnotation = ref<Annotation | null>(null);
const dragStartPos = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });

// 文字输入
const showTextInput = ref(false);
const textInputRef = ref<HTMLInputElement>();
const textInputValue = ref('');
const textInputPos = ref({ x: 0, y: 0 });
const textInputPageNum = ref(0);
const textInputCanvasPos = ref({ x: 0, y: 0 });

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

// 渲染单个页面的 PDF
const renderPagePDF = async (pageNum: number) => {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: scale.value });

  const pdfCanvas = pdfCanvasRefs.get(pageNum);
  const annotationCanvas = annotationCanvasRefs.get(pageNum);

  if (!pdfCanvas || !annotationCanvas) return;

  // 设置 PDF canvas
  const pdfContext = pdfCanvas.getContext('2d')!;
  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;

  // 设置批注 canvas
  annotationCanvas.height = viewport.height;
  annotationCanvas.width = viewport.width;

  // 渲染 PDF
  await page.render({
    canvasContext: pdfContext,
    viewport: viewport
  }).promise;

  // 渲染该页的批注
  renderAnnotationsForPage(pageNum);
};

// 渲染所有页面
const renderAllPages = async () => {
  for (let pageNum = 1; pageNum <= totalPages.value; pageNum++) {
    await renderPagePDF(pageNum);
  }
};

// 渲染单个页面的批注
const renderAnnotationsForPage = (pageNum: number) => {
  const canvas = annotationCanvasRefs.get(pageNum);
  if (!canvas) return;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pageAnnotations = annotations.value.filter(a => a.pageNum === pageNum);

  pageAnnotations.forEach(annotation => {
    const isSelected = selectedAnnotation.value?.id === annotation.id;

    ctx.strokeStyle = isSelected ? '#0066ff' : '#ff0000';
    ctx.lineWidth = isSelected ? 3 : 2;
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
          ctx.fillStyle = isSelected ? '#0066ff' : '#ff0000';
          ctx.fillText(annotation.text, annotation.startX, annotation.startY);

          // 绘制边框
          const metrics = ctx.measureText(annotation.text);
          const textWidth = metrics.width;
          const textHeight = 20;
          ctx.strokeRect(annotation.startX - 2, annotation.startY - textHeight, textWidth + 4, textHeight + 4);
        }
        break;
    }

    ctx.stroke();

    // 绘制选中框
    if (isSelected && annotation.endX !== undefined && annotation.endY !== undefined) {
      const minX = Math.min(annotation.startX, annotation.endX);
      const minY = Math.min(annotation.startY, annotation.endY);
      const maxX = Math.max(annotation.startX, annotation.endX);
      const maxY = Math.max(annotation.startY, annotation.endY);

      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
      ctx.setLineDash([]);
    }
  });
};

// 检测是否点击了某个批注
const detectAnnotationClick = (pageNum: number, x: number, y: number): Annotation | null => {
  const pageAnnotations = annotations.value.filter(a => a.pageNum === pageNum);

  // 从后往前检查（最后绘制的在最上面）
  for (let i = pageAnnotations.length - 1; i >= 0; i--) {
    const annotation = pageAnnotations[i];

    if (annotation.type === 'text' && annotation.text) {
      const canvas = annotationCanvasRefs.get(pageNum);
      if (!canvas) continue;
      const ctx = canvas.getContext('2d')!;
      ctx.font = '16px Arial';
      const metrics = ctx.measureText(annotation.text);
      const textWidth = metrics.width;
      const textHeight = 20;

      if (x >= annotation.startX - 2 && x <= annotation.startX + textWidth + 2 &&
          y >= annotation.startY - textHeight && y <= annotation.startY + 4) {
        return annotation;
      }
    } else if (annotation.endX !== undefined && annotation.endY !== undefined) {
      const minX = Math.min(annotation.startX, annotation.endX);
      const minY = Math.min(annotation.startY, annotation.endY);
      const maxX = Math.max(annotation.startX, annotation.endX);
      const maxY = Math.max(annotation.startY, annotation.endY);

      if (x >= minX - 5 && x <= maxX + 5 && y >= minY - 5 && y <= maxY + 5) {
        return annotation;
      }
    }
  }

  return null;
};

// 添加到历史
const addToHistory = () => {
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(JSON.parse(JSON.stringify(annotations.value)));
  historyIndex.value++;
};

// 鼠标事件
const handleMouseDown = (e: MouseEvent, pageNum: number) => {
  const canvas = annotationCanvasRefs.get(pageNum);
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // 选择模式
  if (activeTool.value === 'select') {
    const clicked = detectAnnotationClick(pageNum, x, y);
    if (clicked) {
      selectedAnnotation.value = clicked;
      isDragging.value = true;
      dragStartPos.value = { x, y };
      dragOffset.value = {
        x: x - clicked.startX,
        y: y - clicked.startY
      };
      renderAnnotationsForPage(pageNum);
    } else {
      selectedAnnotation.value = null;
      renderAnnotationsForPage(pageNum);
    }
    return;
  }

  // 文字工具
  if (activeTool.value === 'text') {
    console.log('=== 文字工具被点击 ===');

    // 设置输入框位置和数据
    textInputPos.value = {
      x: e.clientX,
      y: e.clientY
    };
    textInputCanvasPos.value = { x, y };
    textInputPageNum.value = pageNum;
    textInputValue.value = '';

    // 显示输入框
    showTextInput.value = true;

    console.log('输入框位置', textInputPos.value);
    return;
  }

  // 绘制模式
  isDrawing.value = true;
  currentAnnotation.value = {
    id: Date.now().toString(),
    type: activeTool.value,
    pageNum,
    startX: x,
    startY: y
  };
};

const handleMouseMove = (e: MouseEvent, pageNum: number) => {
  // 拖拽模式 - 支持跨页，显示浮动预览
  if (isDragging.value && selectedAnnotation.value) {
    // 检测鼠标当前在哪个页面
    let currentPageNum = pageNum;
    let currentCanvas = annotationCanvasRefs.get(pageNum);
    let currentRect = currentCanvas?.getBoundingClientRect();

    // 遍历所有页面，找到鼠标所在的页面
    for (let i = 1; i <= totalPages.value; i++) {
      const canvas = annotationCanvasRefs.get(i);
      if (!canvas) continue;
      const rect = canvas.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        currentPageNum = i;
        currentCanvas = canvas;
        currentRect = rect;
        break;
      }
    }

    if (!currentCanvas || !currentRect) return;

    const x = e.clientX - currentRect.left;
    const y = e.clientY - currentRect.top;

    const annotation = selectedAnnotation.value;
    const oldPageNum = annotation.pageNum;

    // 计算移动距离
    const dx = x - dragStartPos.value.x;
    const dy = y - dragStartPos.value.y;

    annotation.startX += dx;
    annotation.startY += dy;
    if (annotation.endX !== undefined) annotation.endX += dx;
    if (annotation.endY !== undefined) annotation.endY += dy;

    // 更新页面
    if (currentPageNum !== oldPageNum) {
      annotation.pageNum = currentPageNum;
      renderAnnotationsForPage(oldPageNum); // 重新渲染旧页面
    }

    dragStartPos.value = { x, y };

    // 重新渲染所有可见页面，确保拖拽时批注在最上层
    renderAnnotationsForPage(currentPageNum);

    // 在当前页面上再次绘制正在拖拽的批注（高亮显示）
    if (currentCanvas) {
      const ctx = currentCanvas.getContext('2d')!;
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0, 102, 255, 0.5)';
      ctx.shadowBlur = 10;
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
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    return;
  }

  const canvas = annotationCanvasRefs.get(pageNum);
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // 绘制模式
  if (!isDrawing.value || !currentAnnotation.value || currentAnnotation.value.pageNum !== pageNum) return;

  currentAnnotation.value.endX = x;
  currentAnnotation.value.endY = y;

  renderAnnotationsForPage(pageNum);

  // 绘制当前批注预览
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

const handleMouseUp = (e: MouseEvent, pageNum: number) => {
  if (isDragging.value) {
    isDragging.value = false;
    addToHistory();
    return;
  }

  if (!isDrawing.value || !currentAnnotation.value) return;

  if (currentAnnotation.value.endX !== undefined && currentAnnotation.value.endY !== undefined) {
    annotations.value.push({ ...currentAnnotation.value });
    addToHistory();
    renderAnnotationsForPage(pageNum);
  }

  isDrawing.value = false;
  currentAnnotation.value = null;
};

// 文字输入处理
let isTextInputJustShown = false; // 标记输入框是否刚显示

const handleTextInputBlur = () => {
  console.log('输入框失焦事件触发', textInputValue.value);

  // 如果输入框刚显示，忽略这次 blur（可能是点击触发的）
  if (isTextInputJustShown) {
    console.log('输入框刚显示，忽略失焦事件');
    isTextInputJustShown = false;
    // 重新聚焦
    setTimeout(() => {
      textInputRef.value?.focus();
    }, 0);
    return;
  }

  console.log('处理输入框失焦');

  if (textInputValue.value.trim()) {
    const annotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      pageNum: textInputPageNum.value,
      startX: textInputCanvasPos.value.x,
      startY: textInputCanvasPos.value.y,
      text: textInputValue.value
    };
    annotations.value.push(annotation);
    addToHistory();
    renderAnnotationsForPage(textInputPageNum.value);
    console.log('文字批注已添加', annotation);
  } else {
    console.log('输入为空，不添加批注');
  }

  showTextInput.value = false;
  isTextInputJustShown = false;
};

const handleTextInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    isTextInputJustShown = false; // 回车时也要重置
    handleTextInputBlur();
  } else if (e.key === 'Escape') {
    // ESC 键取消输入
    showTextInput.value = false;
    isTextInputJustShown = false;
  }
};

// 工具栏操作
const handleZoomIn = async () => {
  scale.value = Math.min(scale.value + 0.2, 3.0);
  await renderAllPages();
};

const handleZoomOut = async () => {
  scale.value = Math.max(scale.value - 0.2, 0.5);
  await renderAllPages();
};

const handleResetZoom = async () => {
  scale.value = 1.5;
  await renderAllPages();
};

const handleActivateTool = (toolName: string) => {
  activeTool.value = toolName;
  if (toolName !== 'select') {
    selectedAnnotation.value = null;
    for (let i = 1; i <= totalPages.value; i++) {
      renderAnnotationsForPage(i);
    }
  }
};

const handleDeleteSelected = () => {
  if (selectedAnnotation.value) {
    const pageNum = selectedAnnotation.value.pageNum;
    annotations.value = annotations.value.filter(a => a.id !== selectedAnnotation.value!.id);
    selectedAnnotation.value = null;
    addToHistory();
    renderAnnotationsForPage(pageNum);
  }
};

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    for (let i = 1; i <= totalPages.value; i++) {
      renderAnnotationsForPage(i);
    }
  }
};

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    for (let i = 1; i <= totalPages.value; i++) {
      renderAnnotationsForPage(i);
    }
  }
};

const handleClearAll = () => {
  if (confirm('确定要清空所有批注吗？')) {
    annotations.value = [];
    selectedAnnotation.value = null;
    addToHistory();
    for (let i = 1; i <= totalPages.value; i++) {
      renderAnnotationsForPage(i);
    }
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

const handleScroll = () => {
  // 可以在这里添加懒加载逻辑
};

// 监听输入框显示状态，自动聚焦
watch(showTextInput, async (newValue) => {
  if (newValue) {
    console.log('showTextInput 变为 true，等待 DOM 更新');
    isTextInputJustShown = true; // 标记输入框刚显示

    // 等待 DOM 更新
    await nextTick();
    console.log('第一次 nextTick 后，输入框元素:', textInputRef.value);

    // 有时需要多次 nextTick
    await nextTick();
    console.log('第二次 nextTick 后，输入框元素:', textInputRef.value);

    // 尝试聚焦
    if (textInputRef.value) {
      textInputRef.value.focus();
      console.log('✅ 输入框已聚焦');

      // 100ms 后重置标记（给用户足够时间开始输入）
      setTimeout(() => {
        isTextInputJustShown = false;
        console.log('重置 isTextInputJustShown');
      }, 200);
    } else {
      console.error('❌ 输入框元素仍然不存在，再尝试延迟聚焦');

      // 最后的保险：使用 setTimeout
      setTimeout(() => {
        if (textInputRef.value) {
          textInputRef.value.focus();
          console.log('✅ 延迟聚焦成功');

          // 聚焦成功后重置标记
          setTimeout(() => {
            isTextInputJustShown = false;
            console.log('重置 isTextInputJustShown');
          }, 200);
        } else {
          console.error('❌ 延迟聚焦失败');
          isTextInputJustShown = false;
        }
      }, 50);
    }
  }
});

// 初始化
onMounted(async () => {
  try {
    console.log('开始加载 PDF:', props.url);

    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    console.log('PDF 加载成功，总页数:', pdfDoc.numPages);
    totalPages.value = pdfDoc.numPages;

    isLoaded.value = true;

    await nextTick();
    await renderAllPages();

    history.value = [[]];
    historyIndex.value = 0;

    console.log('所有页面渲染完成');
  } catch (error) {
    console.error('PDF 加载失败:', error);
  }
});
</script>

<style scoped>
.full-feature-pdf-viewer {
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
  z-index: 10;
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
  overflow-y: auto;
  overflow-x: hidden;
  background: #525659;
  position: relative;
}

.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.page-wrapper {
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.canvas-container {
  position: relative;
  background: white;
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

.text-input-wrapper {
  position: fixed;
  z-index: 99999;
  transform: translate(-50%, -100%);
  margin-top: -15px;
  pointer-events: auto;
}

.text-input {
  padding: 8px 12px;
  border: 3px solid #007bff;
  border-radius: 6px;
  font-size: 16px;
  font-family: Arial, sans-serif;
  min-width: 250px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: block;
}

.text-input:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: #0056b3;
}

.debug-info {
  position: fixed;
  top: 100px;
  right: 20px;
  padding: 10px 15px;
  background: #28a745;
  color: white;
  border-radius: 4px;
  font-weight: bold;
  z-index: 99999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.page-wrapper {
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.canvas-container {
  position: relative;
  background: white;
}

.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
  pointer-events: auto;
}
</style>
