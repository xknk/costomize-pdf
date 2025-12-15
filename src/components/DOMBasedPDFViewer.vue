<template>
  <div class="dom-based-pdf-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="handleZoomOut" :disabled="!isLoaded">缩小</button>
        <span class="scale-display">{{ scalePercent }}%</span>
        <button @click="handleZoomIn" :disabled="!isLoaded">放大</button>
        <button @click="handleResetZoom" :disabled="!isLoaded">重置</button>
      </div>

      <div class="toolbar-group">
        <span v-if="isLoaded" class="page-info">总共 {{ totalPages }} 页</span>
        <span v-else>加载中...</span>
      </div>

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

      <div class="toolbar-group">
        <button @click="handleDeleteSelected" :disabled="!selectedAnnotation">删除</button>
        <button @click="handleUndo" :disabled="!canUndo">撤销</button>
        <button @click="handleRedo" :disabled="!canRedo">重做</button>
        <button @click="handleClearAll" :disabled="!isLoaded">清空</button>
        <button @click="handleExport" :disabled="!isLoaded">导出</button>
      </div>
    </div>

    <!-- PDF容器 -->
    <div ref="containerRef" class="pdf-container">
      <div
        class="pages-wrapper"
        v-if="isLoaded"
        ref="pagesWrapperRef"
        :style="pagesWrapperStyle"
      >
        <!-- PDF 页面 -->
        <div
          v-for="pageNum in totalPages"
          :key="pageNum"
          class="page-wrapper"
          :data-page="pageNum"
          :ref="el => setPageRef(el, pageNum)"
        >
          <canvas :ref="el => setPdfCanvasRef(el, pageNum)"></canvas>
          <!-- 绘制层 - 用于捕获鼠标事件 -->
          <div
            class="drawing-layer"
            @mousedown="handleMouseDown($event, pageNum)"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
          ></div>
        </div>

        <!-- DOM 批注层 - 独立于页面 -->
        <div class="annotations-container">
          <!-- 矩形批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'rectangle')"
            :key="annotation.id"
            class="annotation annotation-rectangle"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
          >
            <div class="annotation-border"></div>
            <!-- 调整大小控制点 -->
            <template v-if="selectedAnnotation?.id === annotation.id && activeTool === 'select'">
              <div class="resize-handle nw" @mousedown.stop="handleResizeStart($event, annotation, 'nw')"></div>
              <div class="resize-handle ne" @mousedown.stop="handleResizeStart($event, annotation, 'ne')"></div>
              <div class="resize-handle sw" @mousedown.stop="handleResizeStart($event, annotation, 'sw')"></div>
              <div class="resize-handle se" @mousedown.stop="handleResizeStart($event, annotation, 'se')"></div>
              <div class="resize-handle n" @mousedown.stop="handleResizeStart($event, annotation, 'n')"></div>
              <div class="resize-handle e" @mousedown.stop="handleResizeStart($event, annotation, 'e')"></div>
              <div class="resize-handle s" @mousedown.stop="handleResizeStart($event, annotation, 's')"></div>
              <div class="resize-handle w" @mousedown.stop="handleResizeStart($event, annotation, 'w')"></div>
            </template>
          </div>

          <!-- 圆形批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'circle')"
            :key="annotation.id"
            class="annotation annotation-circle"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
          >
            <div class="annotation-border"></div>
            <!-- 调整大小控制点（圆形只用四个角） -->
            <template v-if="selectedAnnotation?.id === annotation.id && activeTool === 'select'">
              <div class="resize-handle nw" @mousedown.stop="handleResizeStart($event, annotation, 'nw')"></div>
              <div class="resize-handle ne" @mousedown.stop="handleResizeStart($event, annotation, 'ne')"></div>
              <div class="resize-handle sw" @mousedown.stop="handleResizeStart($event, annotation, 'sw')"></div>
              <div class="resize-handle se" @mousedown.stop="handleResizeStart($event, annotation, 'se')"></div>
            </template>
          </div>

          <!-- 线条批注 -->
          <svg
            v-for="annotation in annotations.filter(a => a.type === 'line')"
            :key="annotation.id"
            class="annotation annotation-line"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
          >
            <line
              :x1="0"
              :y1="0"
              :x2="getLineEndX(annotation)"
              :y2="getLineEndY(annotation)"
              stroke="red"
              :stroke-width="selectedAnnotation?.id === annotation.id ? 3 : 2"
            />
          </svg>

          <!-- 文字批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'text')"
            :key="annotation.id"
            class="annotation annotation-text"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
          >
            {{ annotation.text }}
          </div>

          <!-- 临时绘制预览 -->
          <div
            v-if="isDrawing && tempAnnotation"
            class="annotation temp-annotation"
            :class="`annotation-${tempAnnotation.type}`"
            :style="getTempAnnotationStyle()"
          >
            <div v-if="tempAnnotation.type === 'rectangle' || tempAnnotation.type === 'circle'" class="annotation-border dashed"></div>
            <svg v-if="tempAnnotation.type === 'line'" style="width: 100%; height: 100%;">
              <line
                :x1="0"
                :y1="0"
                :x2="tempAnnotation.width"
                :y2="tempAnnotation.height"
                stroke="red"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 文字输入框 -->
    <div
      v-if="showTextInput"
      class="text-input-wrapper"
      :style="textInputStyle"
      @mousedown.stop
      @click.stop
    >
      <input
        ref="textInputRef"
        v-model="textInputValue"
        class="text-input"
        @blur="handleTextInputBlur"
        @keydown.enter.prevent="handleTextInputConfirm"
        @keydown.esc="handleTextInputCancel"
        placeholder="输入文字（回车确认）"
        autocomplete="off"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

// 状态
const containerRef = ref<HTMLElement>();
const pagesWrapperRef = ref<HTMLElement>();
const isLoaded = ref(false);
const totalPages = ref(0);
const scale = ref(1.5);
const activeTool = ref('select');

// Canvas 和页面 refs
const pdfCanvasRefs = new Map<number, HTMLCanvasElement>();
const pageRefs = new Map<number, HTMLElement>();

const setPdfCanvasRef = (el: any, pageNum: number) => {
  if (el) pdfCanvasRefs.set(pageNum, el);
};

const setPageRef = (el: any, pageNum: number) => {
  if (el) pageRefs.set(pageNum, el);
};

// 批注数据
interface Annotation {
  id: string;
  type: string;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}

const annotations = ref<Annotation[]>([]);
const history = ref<Annotation[][]>([]);
const historyIndex = ref(-1);
const selectedAnnotation = ref<Annotation | null>(null);

// 绘制状态
const isDrawing = ref(false);
const isDragging = ref(false);
const startPos = ref({ x: 0, y: 0 });
const tempAnnotation = ref<any>(null);

// 拖拽优化：记录拖拽时的临时偏移和目标页
const dragOffset = ref({ x: 0, y: 0 });
const dragTargetPage = ref<number | null>(null);

// 调整大小状态
const isResizing = ref(false);
const resizeHandle = ref<string | null>(null);
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeOriginalAnnotation = ref<Annotation | null>(null);

// 绘制优化：使用 RAF 节流
let drawingRafId: number | null = null;

// 文字输入
const showTextInput = ref(false);
const textInputRef = ref<HTMLInputElement>();
const textInputValue = ref('');
const textInputPos = ref({ x: 0, y: 0, pageNum: 0 });

const scalePercent = computed(() => Math.round(scale.value * 100));
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

// 缩放样式：使用 CSS transform 实现无感缩放
const pagesWrapperStyle = computed(() => ({
  transform: `scale(${scale.value / 1.5})`, // 基于初始 scale=1.5
  transformOrigin: 'top center',
  transition: 'transform 0.2s ease-out'
}));

const tools = [
  { name: 'rectangle', label: '矩形' },
  { name: 'circle', label: '圆形' },
  { name: 'line', label: '线条' },
  { name: 'text', label: '文字' }
];

let pdfDoc: any = null;

// 获取页面在容器中的绝对位置（使用 offset，不受 CSS transform 影响）
const getPageAbsolutePosition = (pageNum: number) => {
  const pageEl = pageRefs.get(pageNum);
  if (!pageEl) return { left: 0, top: 0 };

  // 使用 offsetLeft/offsetTop，它们返回元素在文档流中的原始位置
  // 不受 CSS transform 影响，这样批注和页面在同一个坐标系中
  return {
    left: pageEl.offsetLeft,
    top: pageEl.offsetTop
  };
};

// 获取批注样式（不需要手动缩放，CSS transform 会自动处理）
const getAnnotationStyle = (annotation: Annotation) => {
  // 判断是否是正在拖拽的批注（通过 ID 比较，避免引用问题）
  const isBeingDragged = isDragging.value && selectedAnnotation.value?.id === annotation.id;

  let pageNum = annotation.pageNum;
  let x = annotation.x;
  let y = annotation.y;

  // 如果正在拖拽，使用临时的页码和偏移
  if (isBeingDragged && dragTargetPage.value !== null) {
    pageNum = dragTargetPage.value;
    x = annotation.x + dragOffset.value.x;
    y = annotation.y + dragOffset.value.y;
  }

  const pagePos = getPageAbsolutePosition(pageNum);

  // 批注坐标是标准坐标（基于 scale=1.5）
  // 由于 annotations-container 在 pages-wrapper 内部，会被 CSS transform 统一缩放
  // 所以这里不需要手动乘以 scaleRatio
  const style: any = {
    left: `${pagePos.left + x}px`,
    top: `${pagePos.top + y}px`,
    // 禁用过渡动画，实现无感缩放和拖拽
    transition: 'none',
    // 确保拖拽时有更高的 z-index
    zIndex: isBeingDragged ? 10000 : 'auto'
  };

  if (annotation.type === 'rectangle' || annotation.type === 'circle') {
    style.width = `${Math.abs(annotation.width)}px`;
    style.height = `${Math.abs(annotation.height)}px`;
  } else if (annotation.type === 'line') {
    style.width = `${Math.abs(annotation.width)}px`;
    style.height = `${Math.abs(annotation.height)}px`;
  }

  return style;
};

const getLineEndX = (annotation: Annotation) => {
  return annotation.width;
};

const getLineEndY = (annotation: Annotation) => {
  return annotation.height;
};

const getTempAnnotationStyle = () => {
  if (!tempAnnotation.value) return {};

  const pagePos = getPageAbsolutePosition(tempAnnotation.value.pageNum);

  const width = tempAnnotation.value.width;
  const height = tempAnnotation.value.height;

  // 起点固定，使用 transform 来翻转
  const scaleX = width < 0 ? -1 : 1;
  const scaleY = height < 0 ? -1 : 1;

  // 起点位置永远不变，使用标准坐标（CSS transform 会自动缩放）
  const style: any = {
    left: `${pagePos.left + tempAnnotation.value.x}px`,
    top: `${pagePos.top + tempAnnotation.value.y}px`,
    width: `${Math.abs(width)}px`,
    height: `${Math.abs(height)}px`,
    transformOrigin: 'top left',
    transform: `scale(${scaleX}, ${scaleY})`
  };

  return style;
};

const textInputStyle = computed(() => {
  if (!showTextInput.value) return {};

  // 文字输入框在 pages-wrapper 外部，需要计算在视口中的实际位置
  const pageEl = pageRefs.get(textInputPos.value.pageNum);
  if (!pageEl || !containerRef.value) return {};

  const pageRect = pageEl.getBoundingClientRect();
  const containerRect = containerRef.value.getBoundingClientRect();

  // textInputPos 是标准坐标，需要转换为缩放后的显示坐标
  const scaleRatio = scale.value / 1.5;
  const displayX = textInputPos.value.x * scaleRatio;
  const displayY = textInputPos.value.y * scaleRatio;

  return {
    left: `${pageRect.left - containerRect.left + displayX}px`,
    top: `${pageRect.top - containerRect.top + displayY - 40}px`
  };
});

// 渲染 PDF
const renderPagePDF = async (pageNum: number) => {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: scale.value });

  const canvas = pdfCanvasRefs.get(pageNum);
  if (!canvas) return;

  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
};

const renderAllPages = async () => {
  for (let pageNum = 1; pageNum <= totalPages.value; pageNum++) {
    await renderPagePDF(pageNum);
  }
};

// 添加到历史
const addToHistory = () => {
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(JSON.parse(JSON.stringify(annotations.value)));
  historyIndex.value++;
};

// 鼠标事件（优化版本：使用全局监听，检查按钮状态）
const handleMouseDown = (e: MouseEvent, pageNum: number) => {
  if (activeTool.value === 'select') return;
  if (e.button !== 0) return; // 只响应左键

  const pageEl = pageRefs.get(pageNum);
  if (!pageEl) return;

  e.preventDefault();
  e.stopPropagation();

  const rect = pageEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 缩放比例：将当前缩放下的坐标转换为标准坐标（基于 scale=1.5）
  const scaleRatio = scale.value / 1.5;
  const x = mouseX / scaleRatio;
  const y = mouseY / scaleRatio;

  if (activeTool.value === 'text') {
    textInputPos.value = { x, y, pageNum };
    textInputValue.value = '';
    showTextInput.value = true;
    nextTick(() => {
      textInputRef.value?.focus();
    });
    return;
  }

  isDrawing.value = true;
  startPos.value = { x, y };
  tempAnnotation.value = {
    type: activeTool.value,
    pageNum,
    x,
    y,
    width: 0,
    height: 0
  };

  // 添加全局监听器
  document.addEventListener('mousemove', handleDrawingMouseMove);
  document.addEventListener('mouseup', handleDrawingMouseUp);
  document.addEventListener('mouseleave', handleDrawingMouseUp);
};

const handleDrawingMouseMove = (e: MouseEvent) => {
  // 检查左键是否按下
  if (e.buttons !== 1) {
    handleDrawingMouseUp();
    return;
  }

  if (!isDrawing.value || !tempAnnotation.value) return;

  e.preventDefault();

  // 使用 requestAnimationFrame 节流，避免每次 mousemove 都更新
  if (drawingRafId !== null) {
    return; // 如果已经有待处理的更新，跳过本次
  }

  drawingRafId = requestAnimationFrame(() => {
    drawingRafId = null;

    if (!isDrawing.value || !tempAnnotation.value) return;

    const pageEl = pageRefs.get(tempAnnotation.value.pageNum);
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 转换为标准坐标
    const scaleRatio = scale.value / 1.5;
    const x = mouseX / scaleRatio;
    const y = mouseY / scaleRatio;

    tempAnnotation.value.width = x - startPos.value.x;
    tempAnnotation.value.height = y - startPos.value.y;
  });
};

const handleDrawingMouseUp = () => {
  // 清理 RAF 请求
  if (drawingRafId !== null) {
    cancelAnimationFrame(drawingRafId);
    drawingRafId = null;
  }

  if (!isDrawing.value || !tempAnnotation.value) {
    // 清理事件监听器
    document.removeEventListener('mousemove', handleDrawingMouseMove);
    document.removeEventListener('mouseup', handleDrawingMouseUp);
    document.removeEventListener('mouseleave', handleDrawingMouseUp);
    return;
  }

  if (Math.abs(tempAnnotation.value.width) > 5 || Math.abs(tempAnnotation.value.height) > 5) {
    const annotation: Annotation = {
      id: Date.now().toString(),
      type: tempAnnotation.value.type,
      pageNum: tempAnnotation.value.pageNum,
      x: tempAnnotation.value.width < 0 ? tempAnnotation.value.x + tempAnnotation.value.width : tempAnnotation.value.x,
      y: tempAnnotation.value.height < 0 ? tempAnnotation.value.y + tempAnnotation.value.height : tempAnnotation.value.y,
      width: Math.abs(tempAnnotation.value.width),
      height: Math.abs(tempAnnotation.value.height)
    };
    annotations.value.push(annotation);
    addToHistory();
  }

  isDrawing.value = false;
  tempAnnotation.value = null;

  // 清理事件监听器
  document.removeEventListener('mousemove', handleDrawingMouseMove);
  document.removeEventListener('mouseup', handleDrawingMouseUp);
  document.removeEventListener('mouseleave', handleDrawingMouseUp);
};

// 保留原有的 handleMouseMove 和 handleMouseUp 用于 drawing-layer 的初始绑定
const handleMouseMove = (e: MouseEvent) => {
  // 这个函数现在主要用于兼容，实际逻辑在 handleDrawingMouseMove 中
};

const handleMouseUp = () => {
  // 这个函数现在主要用于兼容，实际逻辑在 handleDrawingMouseUp 中
};

// 批注拖拽（性能优化版本 + 缩放适配）
const handleAnnotationMouseDown = (e: MouseEvent, annotation: Annotation) => {
  if (activeTool.value !== 'select') return;
  if (e.button !== 0) return; // 只响应左键
  if (isResizing.value) return; // 正在调整大小时不触发拖拽

  e.preventDefault();
  e.stopPropagation();

  selectedAnnotation.value = annotation;
  isDragging.value = true;

  // 重置拖拽偏移
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = annotation.pageNum;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const pagePos = getPageAbsolutePosition(annotation.pageNum);
  const scaleRatio = scale.value / 1.5;

  // 计算鼠标点击位置相对于批注左上角的偏移量
  // 批注在 wrapper 内的标准位置
  const annotationStandardLeft = pagePos.left + annotation.x;
  const annotationStandardTop = pagePos.top + annotation.y;

  // 由于 wrapper 有 CSS transform: scale(scaleRatio)，批注的实际显示位置需要乘以 scaleRatio
  const annotationDisplayLeft = annotationStandardLeft * scaleRatio;
  const annotationDisplayTop = annotationStandardTop * scaleRatio;

  // 鼠标在 wrapper 坐标系中的位置（相对于 wrapper 的 content box）
  const mouseXInWrapper = e.clientX - wrapperRect.left;
  const mouseYInWrapper = e.clientY - wrapperRect.top;

  // 偏移量（显示坐标系）
  startPos.value = {
    x: mouseXInWrapper - annotationDisplayLeft,
    y: mouseYInWrapper - annotationDisplayTop
  };

  // 添加事件监听
  document.addEventListener('mousemove', handleAnnotationDrag);
  document.addEventListener('mouseup', handleAnnotationDragEnd);
  // 额外添加 mouseleave 确保一定会清理
  document.addEventListener('mouseleave', handleAnnotationDragEnd);
};

const handleAnnotationDrag = (e: MouseEvent) => {
  // 检查鼠标左键是否按下
  if (e.buttons !== 1) {
    handleAnnotationDragEnd();
    return;
  }

  if (!isDragging.value || !selectedAnnotation.value) return;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  e.preventDefault();

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / 1.5;

  // 鼠标在 wrapper 坐标系中的位置（视口坐标，受 transform 影响）
  const mouseXInWrapper = e.clientX - wrapperRect.left;
  const mouseYInWrapper = e.clientY - wrapperRect.top;

  // 检测鼠标当前在哪个页面上
  let targetPageNum = selectedAnnotation.value.pageNum;
  for (let i = 1; i <= totalPages.value; i++) {
    const pageEl = pageRefs.get(i);
    if (!pageEl) continue;
    const pageRect = pageEl.getBoundingClientRect();
    if (e.clientY >= pageRect.top && e.clientY <= pageRect.bottom) {
      targetPageNum = i;
      break;
    }
  }

  // 更新目标页码
  dragTargetPage.value = targetPageNum;

  // 计算批注在目标页面上的新位置
  const pagePos = getPageAbsolutePosition(targetPageNum);

  // 鼠标位置减去偏移，得到批注在 wrapper 中的显示位置
  const newAnnotationDisplayLeft = mouseXInWrapper - startPos.value.x;
  const newAnnotationDisplayTop = mouseYInWrapper - startPos.value.y;

  // 转换为标准坐标系：先减去页面位置，再除以 scaleRatio
  const newAnnotationStandardLeft = newAnnotationDisplayLeft / scaleRatio;
  const newAnnotationStandardTop = newAnnotationDisplayTop / scaleRatio;

  // 批注在页面中的标准坐标
  const newAnnotationX = newAnnotationStandardLeft - pagePos.left;
  const newAnnotationY = newAnnotationStandardTop - pagePos.top;

  // 只更新拖拽偏移量，不修改原始 annotation 数据（性能优化）
  dragOffset.value = {
    x: newAnnotationX - selectedAnnotation.value.x,
    y: newAnnotationY - selectedAnnotation.value.y
  };
};

const handleAnnotationDragEnd = () => {
  if (!isDragging.value) return;

  // 拖拽结束时，将临时偏移应用到实际 annotation 数据
  if (selectedAnnotation.value && dragTargetPage.value !== null) {
    const targetId = selectedAnnotation.value.id;

    // 查找所有具有相同 ID 的批注（防止重复）
    const sameIdAnnotations = annotations.value.filter(a => a.id === targetId);

    if (sameIdAnnotations.length > 1) {
      // 如果有重复，先删除所有重复的
      console.warn(`发现重复的批注 ID: ${targetId}，数量: ${sameIdAnnotations.length}`);
      annotations.value = annotations.value.filter(a => a.id !== targetId);
      // 添加回一个（使用第一个）
      annotations.value.push(sameIdAnnotations[0]);
    }

    // 找到并更新批注
    const annotationIndex = annotations.value.findIndex(a => a.id === targetId);
    if (annotationIndex !== -1) {
      annotations.value[annotationIndex].pageNum = dragTargetPage.value;
      annotations.value[annotationIndex].x += dragOffset.value.x;
      annotations.value[annotationIndex].y += dragOffset.value.y;
      // 更新 selectedAnnotation 引用，指向数组中的对象
      selectedAnnotation.value = annotations.value[annotationIndex];
      addToHistory();
    }
  }

  // 重置拖拽状态
  isDragging.value = false;
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = null;

  // 清理所有事件监听器
  document.removeEventListener('mousemove', handleAnnotationDrag);
  document.removeEventListener('mouseup', handleAnnotationDragEnd);
  document.removeEventListener('mouseleave', handleAnnotationDragEnd);
};

// 调整大小功能
const handleResizeStart = (e: MouseEvent, annotation: Annotation, handle: string) => {
  if (e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();

  isResizing.value = true;
  resizeHandle.value = handle;
  selectedAnnotation.value = annotation;

  // 保存原始批注数据
  resizeOriginalAnnotation.value = JSON.parse(JSON.stringify(annotation));

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / 1.5;

  resizeStartPos.value = {
    x: (e.clientX - wrapperRect.left) / scaleRatio,
    y: (e.clientY - wrapperRect.top) / scaleRatio
  };

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  document.addEventListener('mouseleave', handleResizeEnd);
};

const handleResizeMove = (e: MouseEvent) => {
  if (e.buttons !== 1) {
    handleResizeEnd();
    return;
  }

  if (!isResizing.value || !selectedAnnotation.value || !resizeOriginalAnnotation.value) return;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  e.preventDefault();

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / 1.5;

  // 转换为标准坐标
  const mouseX = (e.clientX - wrapperRect.left) / scaleRatio;
  const mouseY = (e.clientY - wrapperRect.top) / scaleRatio;

  const dx = mouseX - resizeStartPos.value.x;
  const dy = mouseY - resizeStartPos.value.y;

  const original = resizeOriginalAnnotation.value;
  const pagePos = getPageAbsolutePosition(original.pageNum);

  // 找到批注在数组中的索引
  const annotationIndex = annotations.value.findIndex(a => a.id === selectedAnnotation.value!.id);
  if (annotationIndex === -1) return;

  const isCircle = annotations.value[annotationIndex].type === 'circle';

  // 根据不同的 handle 调整不同的属性
  switch (resizeHandle.value) {
    case 'se': // 东南角：改变 width 和 height
      if (isCircle) {
        // 圆形保持宽高相同，取较大值
        const size = Math.max(10, Math.max(original.width + dx, original.height + dy));
        annotations.value[annotationIndex].width = size;
        annotations.value[annotationIndex].height = size;
      } else {
        annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
        annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
      }
      break;

    case 'sw': // 西南角：改变 x, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width - dx, original.height + dy));
          annotations.value[annotationIndex].x = original.x + original.width - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          const newWidth = Math.max(10, original.width - dx);
          annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
          annotations.value[annotationIndex].width = newWidth;
          annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
        }
      }
      break;

    case 'ne': // 东北角：改变 y, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width + dx, original.height - dy));
          annotations.value[annotationIndex].y = original.y + original.height - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
          const newHeight = Math.max(10, original.height - dy);
          annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
          annotations.value[annotationIndex].height = newHeight;
        }
      }
      break;

    case 'nw': // 西北角：改变 x, y, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width - dx, original.height - dy));
          annotations.value[annotationIndex].x = original.x + original.width - size;
          annotations.value[annotationIndex].y = original.y + original.height - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          const newWidth = Math.max(10, original.width - dx);
          const newHeight = Math.max(10, original.height - dy);
          annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
          annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
          annotations.value[annotationIndex].width = newWidth;
          annotations.value[annotationIndex].height = newHeight;
        }
      }
      break;

    case 'e': // 东边：只改变 width
      annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
      break;

    case 'w': // 西边：改变 x 和 width
      {
        const newWidth = Math.max(10, original.width - dx);
        annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
        annotations.value[annotationIndex].width = newWidth;
      }
      break;

    case 's': // 南边：只改变 height
      annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
      break;

    case 'n': // 北边：改变 y 和 height
      {
        const newHeight = Math.max(10, original.height - dy);
        annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
        annotations.value[annotationIndex].height = newHeight;
      }
      break;
  }

  // 更新选中的批注引用
  selectedAnnotation.value = annotations.value[annotationIndex];
};

const handleResizeEnd = () => {
  if (!isResizing.value) return;

  if (selectedAnnotation.value) {
    addToHistory();
  }

  isResizing.value = false;
  resizeHandle.value = null;
  resizeOriginalAnnotation.value = null;

  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.removeEventListener('mouseleave', handleResizeEnd);
};

// 文字输入
const handleTextInputConfirm = () => {
  if (textInputValue.value.trim()) {
    const newText = textInputValue.value.trim();
    const newPageNum = textInputPos.value.pageNum;
    const newX = textInputPos.value.x;
    const newY = textInputPos.value.y;

    // 检查是否已经有相同位置和文字的批注（防止重复添加）
    const isDuplicate = annotations.value.some(a =>
      a.type === 'text' &&
      a.text === newText &&
      a.pageNum === newPageNum &&
      Math.abs(a.x - newX) < 5 &&
      Math.abs(a.y - newY) < 5
    );

    if (!isDuplicate) {
      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        pageNum: newPageNum,
        x: newX,
        y: newY,
        width: 0,
        height: 20,
        text: newText
      };
      annotations.value.push(annotation);
      addToHistory();
    } else {
      console.warn('检测到重复的文字批注，已跳过添加');
    }
  }
  showTextInput.value = false;
  textInputValue.value = '';
};

const handleTextInputBlur = () => {
  setTimeout(() => {
    handleTextInputConfirm();
  }, 100);
};

const handleTextInputCancel = () => {
  showTextInput.value = false;
};

// 工具栏操作（无感缩放：只改变 scale，通过 CSS transform 应用）
const handleZoomIn = () => {
  scale.value = Math.min(scale.value + 0.2, 3.0);
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleZoomOut = () => {
  scale.value = Math.max(scale.value - 0.2, 0.5);
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleResetZoom = () => {
  scale.value = 1.5;
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleActivateTool = (toolName: string) => {
  activeTool.value = toolName;

  // 切换工具时，关闭文字输入框（防止重复添加）
  if (showTextInput.value) {
    showTextInput.value = false;
    textInputValue.value = '';
  }

  if (toolName !== 'select') {
    selectedAnnotation.value = null;
  }
};

const handleDeleteSelected = () => {
  if (selectedAnnotation.value) {
    annotations.value = annotations.value.filter(a => a.id !== selectedAnnotation.value!.id);
    selectedAnnotation.value = null;
    addToHistory();
  }
};

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
  }
};

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
  }
};

const handleClearAll = () => {
  if (confirm('确定清空所有批注吗？')) {
    annotations.value = [];
    selectedAnnotation.value = null;
    addToHistory();
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
.dom-based-pdf-viewer {
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
  overflow: auto;
  background: #525659;
  position: relative;
}

.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  position: relative;
  min-height: 100%;
}

.page-wrapper {
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  background: white;
}

canvas {
  display: block;
}

.drawing-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

/* 批注容器 - 绝对定位层 */
.annotations-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

/* 批注基础样式 */
.annotation {
  position: absolute;
  pointer-events: auto;
  transition: all 0.1s;
}

.annotation.selected {
  z-index: 1001;
}

.annotation-rectangle .annotation-border,
.annotation-circle .annotation-border {
  width: 100%;
  height: 100%;
  border: 2px solid #ff0000;
  box-sizing: border-box;
}

.annotation-circle .annotation-border {
  border-radius: 50%;
}

.annotation.selected .annotation-border {
  border-color: #0066ff;
  border-width: 3px;
  box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
}

.annotation-border.dashed {
  border-style: dashed;
}

.annotation-line {
  overflow: visible;
}

.annotation-text {
  color: #ff0000;
  font-size: 16px;
  font-family: Arial, sans-serif;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #ff0000;
  border-radius: 4px;
  white-space: nowrap;
  cursor: move;
}

.annotation-text.selected {
  border-color: #0066ff;
  border-width: 3px;
  color: #0066ff;
  box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
}

.temp-annotation {
  opacity: 0.7;
}

/* 文字输入框 */
.text-input-wrapper {
  position: absolute;
  z-index: 10000;
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
}

.text-input:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 调整大小控制点 */
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #0066ff;
  border: 1px solid white;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  z-index: 10;
  pointer-events: auto;
}

.resize-handle:hover {
  width: 10px;
  height: 10px;
  background: #0052cc;
}

/* 四个角 */
.resize-handle.nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

/* 四条边 */
.resize-handle.n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-handle.e {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-handle.s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-handle.w {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: w-resize;
}
</style>
