<template>
  <div class="test-pdf-viewer">
    <div class="toolbar">
      <button @click="handleZoomIn" :disabled="!isLoaded">放大</button>
      <span>{{ scalePercent }}%</span>
      <button @click="handleZoomOut" :disabled="!isLoaded">缩小</button>
      <span v-if="isLoaded">页面: {{ currentPage }} / {{ totalPages }}</span>
      <span v-else>加载中...</span>
    </div>
    <div ref="containerRef" class="pdf-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

const containerRef = ref<HTMLElement>();
const canvasRef = ref<HTMLCanvasElement>();
const isLoaded = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.0);

const scalePercent = computed(() => Math.round(scale.value * 100));

let pdfDoc: any = null;

const renderPage = async (pageNum: number, newScale: number) => {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: newScale });

  if (!canvasRef.value) {
    canvasRef.value = document.createElement('canvas');
    containerRef.value?.appendChild(canvasRef.value);
  }

  const canvas = canvasRef.value;
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
};

const handleZoomIn = async () => {
  scale.value = Math.min(scale.value + 0.1, 3.0);
  await renderPage(currentPage.value, scale.value);
};

const handleZoomOut = async () => {
  scale.value = Math.max(scale.value - 0.1, 0.5);
  await renderPage(currentPage.value, scale.value);
};

onMounted(async () => {
  try {
    console.log('开始加载 PDF:', props.url);

    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    console.log('PDF 加载成功，总页数:', pdfDoc.numPages);
    totalPages.value = pdfDoc.numPages;

    await renderPage(1, scale.value);

    isLoaded.value = true;
    console.log('PDF 渲染完成');
  } catch (error) {
    console.error('PDF 加载失败:', error);
  }
});
</script>

<style scoped>
.test-pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #ddd;
}

button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #f0f0f0;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
</style>
