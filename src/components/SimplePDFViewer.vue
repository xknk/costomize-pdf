<template>
  <div class="simple-pdf-viewer">
    <div class="toolbar">
      <span v-if="isLoaded">页面: {{ currentPage }} / {{ totalPages }}</span>
      <span v-else>加载中...</span>
    </div>
    <div ref="containerRef" class="pdf-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

const containerRef = ref<HTMLElement>();
const isLoaded = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);

onMounted(async () => {
  try {
    console.log('开始加载 PDF:', props.url);

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument(props.url);
    const pdf = await loadingTask.promise;

    console.log('PDF 加载成功，总页数:', pdf.numPages);
    totalPages.value = pdf.numPages;

    // 渲染第一页
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    // 创建 canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // 渲染到 canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // 添加到容器
    if (containerRef.value) {
      containerRef.value.appendChild(canvas);
    }

    isLoaded.value = true;
    console.log('PDF 渲染完成');
  } catch (error) {
    console.error('PDF 加载失败:', error);
  }
});
</script>

<style scoped>
.simple-pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.toolbar {
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #ddd;
}

.pdf-container {
  flex: 1;
  overflow: auto;
  background: #e0e0e0;
  display: flex;
  justify-content: center;
  padding: 20px;
}
</style>
