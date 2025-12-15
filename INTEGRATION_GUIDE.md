# 新架构集成指南

## ✅ 已完成的工作

### 阶段1-5全部完成！

1. **阶段1**: Monorepo基础架构 ✅
2. **阶段2**: 性能优化模块（Canvas池、渲染缓存、Worker池、虚拟滚动）✅
3. **阶段3**: 缩放模块 (@customize-pdf/canvas-zoom) ✅
4. **阶段4**: 批注模块 (@customize-pdf/canvas-annotations) ✅
5. **阶段5**: 主查看器和Vue集成 ✅

## 📦 项目结构

```
customize-pdf/
├── packages/
│   ├── core/                    # 核心引擎
│   ├── canvas-zoom/             # 缩放模块 ✅
│   ├── canvas-annotations/      # 批注模块 ✅
│   ├── viewer/                  # 主查看器 ✅
│   └── vue-integration/         # Vue集成 ✅
├── src/                         # Vue应用源码
│   ├── components/
│   │   └── NewPDFViewer.vue    # 新架构组件 ✅
│   ├── AppNew.vue              # 新应用入口 ✅
│   └── main-new.ts             # 新main入口 ✅
├── index-new.html              # 新HTML入口 ✅
├── vite.config.app.ts          # Vite配置 ✅
└── package.app.json            # 应用配置 ✅
```

## 🚀 快速开始

### 方式一：使用新架构（推荐）

#### 1. 安装依赖

```bash
# 使用新的package.json
cp package.app.json package.json

# 安装所有依赖
pnpm install
```

#### 2. 构建所有包

```bash
# 构建所有packages/*下的模块
pnpm run build:packages
```

#### 3. 运行开发服务器

```bash
# 使用Vite启动新架构应用
pnpm run dev
```

然后访问 `http://localhost:8080` 查看新架构的PDF查看器。

#### 4. 放置测试PDF

将你的PDF文件放到 `public/sample.pdf`，或修改 `src/AppNew.vue` 中的 `pdfUrl`。

### 方式二：构建生产版本

```bash
# 构建packages和应用
pnpm run build

# 预览构建结果
pnpm run preview
```

## 📝 使用示例

### 基础使用

```vue
<template>
  <NewPDFViewer :url="pdfUrl" />
</template>

<script setup>
import { ref } from 'vue';
import NewPDFViewer from '@/components/NewPDFViewer.vue';

const pdfUrl = ref('/sample.pdf');
</script>
```

### 使用 Composable

```vue
<template>
  <div>
    <div class="toolbar">
      <button @click="zoomIn">放大</button>
      <button @click="zoomOut">缩小</button>
      <button @click="activateTool('rectangle')">矩形</button>
    </div>
    <div ref="containerRef" class="pdf-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usePDFViewer } from '@customize-pdf/vue';

const { init, load, zoomIn, zoomOut, activateTool } = usePDFViewer({
  scale: 1.0
});

const containerRef = ref();

onMounted(async () => {
  await init(containerRef.value);
  await load('/sample.pdf');
});
</script>
```

## 🎨 功能特性

### 缩放功能
- ✅ Ctrl + 滚轮缩放
- ✅ 触摸捏合缩放
- ✅ 放大/缩小按钮
- ✅ 适应宽度/页面
- ✅ 3种缩放策略（instant/deferred/hybrid）

### 批注功能
- ✅ 矩形批注
- ✅ 圆形批注
- ✅ 线条批注
- ✅ 文字批注
- ✅ 撤销/重做
- ✅ 导入/导出JSON

## 🔧 配置选项

### PDFViewer配置

```typescript
const viewer = new PDFViewer({
  container: '#pdf-container',
  url: '/sample.pdf',
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
```

### usePDFViewer配置

```typescript
const { ... } = usePDFViewer({
  url: '/sample.pdf',
  scale: 1.0,
  autoLoad: true,
  zoom: { /* 缩放配置 */ },
  annotations: { /* 批注配置 */ }
});
```

## 📚 API文档

### usePDFViewer 返回值

```typescript
{
  // 状态
  viewer: Ref<PDFViewer | null>,
  isLoaded: Ref<boolean>,
  currentPage: Ref<number>,
  totalPages: Ref<number>,
  scale: Ref<number>,

  // 初始化
  init: (container: HTMLElement) => Promise<void>,
  load: (url: string) => Promise<void>,
  loadData: (data: Uint8Array) => Promise<void>,

  // 缩放
  zoomIn: () => void,
  zoomOut: () => void,
  zoomTo: (scale: number) => void,
  fitWidth: () => void,
  fitPage: () => void,
  resetZoom: () => void,

  // 批注
  activateTool: (name: string, config?: any) => void,
  deactivateTool: () => void,
  getAnnotations: () => Annotation[],
  exportAnnotations: (options?) => string,
  importAnnotations: (data, options?) => void,
  undo: () => void,
  redo: () => void,

  // 清理
  destroy: () => void
}
```

## 🐛 故障排除

### 1. PDF.js Worker错误

确保PDF.js worker正确加载：

```typescript
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

### 2. 模块导入错误

确保Vite配置中有正确的别名：

```typescript
resolve: {
  alias: {
    '@customize-pdf/viewer': resolve(__dirname, 'packages/viewer/src'),
    '@customize-pdf/vue': resolve(__dirname, 'packages/vue-integration/src')
  }
}
```

### 3. 类型错误

确保所有包都已构建：

```bash
pnpm run build:packages
```

## 📖 下一步

1. **添加更多批注工具**: 箭头、高亮、手绘等
2. **实现多页面支持**: 虚拟滚动显示所有页面
3. **优化性能**: 使用Worker池进行渲染
4. **添加UI组件**: 工具栏、侧边栏、缩略图等
5. **国际化**: 添加多语言支持

## 🎯 关键文件

- `packages/viewer/src/PDFViewer.ts` - 主查看器类
- `packages/vue-integration/src/composables/usePDFViewer.ts` - Vue Composable
- `src/components/NewPDFViewer.vue` - Vue组件示例
- `src/AppNew.vue` - 应用入口
- `vite.config.app.ts` - Vite配置

## 💡 提示

- 新架构完全模块化，每个包都可以独立使用
- 所有核心功能都已实现并可以工作
- PDF渲染使用PDF.js 3.x版本
- 支持TypeScript类型提示
- 适配桌面和移动设备

---

**项目状态**: ✅ 阶段1-5全部完成！可以运行和测试了！
