<template>
  <div class="pdf-viewer-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="handleZoomOut" :disabled="!isLoaded">缩小</button>
        <span class="scale-display">{{ scalePercent }}%</span>
        <button @click="handleZoomIn" :disabled="!isLoaded">放大</button>
        <button @click="handleFitWidth" :disabled="!isLoaded">适应宽度</button>
        <button @click="handleResetZoom" :disabled="!isLoaded">重置</button>
      </div>

      <div class="toolbar-group">
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      </div>

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

      <div class="toolbar-group">
        <button @click="handleUndo" :disabled="!isLoaded">撤销</button>
        <button @click="handleRedo" :disabled="!isLoaded">重做</button>
        <button @click="handleExport" :disabled="!isLoaded">导出批注</button>
        <button @click="handleImport" :disabled="!isLoaded">导入批注</button>
      </div>
    </div>

    <!-- PDF容器 -->
    <div ref="containerRef" class="pdf-container" v-show="isLoaded">
      <!-- PDF会在这里渲染 -->
    </div>

    <!-- 加载状态 -->
    <div v-if="!isLoaded" class="loading-state">
      <p>正在加载PDF...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePDFViewer } from '@customize-pdf/vue';

const props = defineProps<{
  url?: string;
  data?: Uint8Array;
}>();

// 使用composable
const {
  viewer,
  isLoaded,
  currentPage,
  totalPages,
  scale,
  init,
  load,
  loadData,
  zoomIn,
  zoomOut,
  zoomTo,
  fitWidth,
  resetZoom,
  activateTool,
  deactivateTool,
  getAnnotations,
  exportAnnotations,
  importAnnotations,
  undo,
  redo
} = usePDFViewer({
  scale: 1.0,
  zoom: {
    strategy: 'hybrid',
    minScale: 0.5,
    maxScale: 5.0
  },
  annotations: {
    enabled: true,
    enableUndo: true
  }
});

const containerRef = ref<HTMLElement>();
const activeTool = ref<string | null>(null);

const scalePercent = computed(() => Math.round(scale.value * 100));

const tools = [
  { name: 'rectangle', label: '矩形' },
  { name: 'circle', label: '圆形' },
  { name: 'line', label: '线条' },
  { name: 'text', label: '文字' }
];

// 工具栏处理函数
const handleZoomIn = () => {
  zoomIn();
};

const handleZoomOut = () => {
  zoomOut();
};

const handleFitWidth = () => {
  fitWidth();
};

const handleResetZoom = () => {
  resetZoom();
};

const handleActivateTool = (toolName: string) => {
  activeTool.value = toolName;
  activateTool(toolName, {
    strokeStyle: '#ff0000',
    lineWidth: 2
  });
};

const handleDeactivateTool = () => {
  activeTool.value = null;
  deactivateTool();
};

const handleUndo = () => {
  undo();
};

const handleRedo = () => {
  redo();
};

const handleExport = () => {
  const json = exportAnnotations({ pretty: true });
  console.log('导出的批注:', json);
  // 可以下载或保存
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'annotations.json';
  a.click();
  URL.revokeObjectURL(url);
};

const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      importAnnotations(text);
    }
  };
  input.click();
};

// 初始化
onMounted(async () => {
  if (!containerRef.value) return;

  await init(containerRef.value);

  // 加载PDF
  if (props.url) {
    await load(props.url);
  } else if (props.data) {
    await loadData(props.data);
  }
});
</script>

<style scoped>
.pdf-viewer-container {
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

.scale-display {
  min-width: 60px;
  text-align: center;
  font-weight: 600;
  padding: 6px 12px;
  background: #f8f8f8;
  border-radius: 4px;
}

.page-info {
  padding: 6px 12px;
  background: #f8f8f8;
  border-radius: 4px;
  font-size: 14px;
}

.pdf-container {
  flex: 1;
  overflow: auto;
  background: #e0e0e0;
}

.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #666;
}
</style>
