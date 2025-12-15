# @customize-pdf/canvas-zoom

独立的Canvas缩放模块，支持多种缩放策略和手势识别。

## 特性

- 📦 **独立模块** - 无框架依赖，可独立使用或集成到任何项目
- 🎯 **三种策略** - instant/deferred/hybrid 满足不同场景需求
- 👆 **手势支持** - 滚轮缩放（Ctrl+滚轮）、触摸捏合缩放
- 🎨 **高性能** - 硬件加速的CSS transform
- 📝 **TypeScript** - 完整的类型定义
- 🔧 **易于集成** - 简洁的API设计

## 安装

```bash
pnpm add @customize-pdf/canvas-zoom
```

## 快速开始

### 基础使用

```typescript
import { ZoomManager } from '@customize-pdf/canvas-zoom';

const zoomManager = new ZoomManager({
  container: '#pdf-container',
  strategy: 'hybrid',           // 默认策略
  minScale: 0.5,                // 最小缩放比例
  maxScale: 5.0,                // 最大缩放比例
  gestures: {
    wheel: true,                // 启用滚轮缩放（Ctrl+滚轮）
    pinch: true,                // 启用触摸捏合
    doubleClick: false          // 双击缩放
  }
});

// 监听缩放事件
zoomManager.on('zoom-change', (event) => {
  console.log('当前缩放:', event.state.scale);
});
```

### 三种缩放策略

#### 1. instant - 即时响应（纯CSS）

**特点**：
- ✅ 永不卡顿，响应极快
- ✅ 使用CSS transform: scale()
- ⚠️ 大倍数时可能模糊
- 🎯 适合快速交互

```typescript
const zoomManager = new ZoomManager({
  container: '#container',
  strategy: 'instant'
});
```

#### 2. deferred - 延迟重渲染

**特点**：
- ✅ 总是高清，无模糊
- ✅ 缩放时先用CSS快速响应
- ✅ 延迟后触发高清重渲染
- ⚠️ 有延迟感但画质最好

```typescript
const zoomManager = new ZoomManager({
  container: '#container',
  strategy: 'deferred',
  rerenderDelay: 300           // 重渲染延迟（ms）
});

// 监听重渲染事件
zoomManager.on('rerender-start', (event) => {
  // 执行PDF页面重新渲染
  rerenderPDFPage(event.state.scale);
});

// 重渲染完成后通知
zoomManager.onRerenderComplete(newScale);
```

#### 3. hybrid - 混合策略（推荐）

**特点**：
- ✅ 小范围缩放使用CSS（快速）
- ✅ 超过阈值触发重渲染（高清）
- ✅ 平衡性能和清晰度
- 🎯 **默认推荐策略**

```typescript
const zoomManager = new ZoomManager({
  container: '#container',
  strategy: 'hybrid',
  rerenderThreshold: 0.3,      // 30%变化触发重渲染
  rerenderDelay: 300
});
```

## API参考

### ZoomManager

#### 构造函数

```typescript
new ZoomManager(config: ZoomManagerConfig)
```

#### 配置选项

```typescript
interface ZoomManagerConfig {
  container: HTMLElement | string;  // 容器元素或选择器
  strategy?: 'instant' | 'deferred' | 'hybrid';  // 缩放策略
  minScale?: number;                // 最小缩放比例（默认0.5）
  maxScale?: number;                // 最大缩放比例（默认5.0）
  initialScale?: number;            // 初始缩放比例（默认1.0）
  zoomSpeed?: number;               // 缩放速度（默认0.1）
  rerenderThreshold?: number;       // 重渲染阈值（默认0.3）
  rerenderDelay?: number;           // 重渲染延迟ms（默认300）
  gestures?: {
    wheel?: boolean | {
      requireCtrl?: boolean;        // 是否需要Ctrl键（默认true）
      preventDefault?: boolean;     // 阻止默认行为（默认true）
      debounceTime?: number;        // 防抖时间ms（默认0）
    };
    pinch?: boolean | {
      preventDefault?: boolean;
      minDistance?: number;         // 最小有效距离（默认20）
    };
    doubleClick?: boolean;
  };
}
```

#### 方法

```typescript
// 放大
zoomManager.zoomIn(centerX?: number, centerY?: number): void

// 缩小
zoomManager.zoomOut(centerX?: number, centerY?: number): void

// 缩放到指定比例
zoomManager.zoomTo(scale: number, centerX?: number, centerY?: number): void

// 适应宽度
zoomManager.fitWidth(): void

// 适应页面
zoomManager.fitPage(): void

// 重置缩放
zoomManager.reset(): void

// 切换缩放策略
zoomManager.setStrategy(strategy: 'instant' | 'deferred' | 'hybrid'): void

// 获取当前状态
zoomManager.getState(): Readonly<ZoomState>

// 获取当前缩放比例
zoomManager.getScale(): number

// 监听事件
zoomManager.on(type: ZoomEventType, listener: ZoomEventListener): void

// 移除事件监听
zoomManager.off(type: ZoomEventType, listener: ZoomEventListener): void

// 销毁管理器
zoomManager.destroy(): void
```

#### 事件

```typescript
type ZoomEventType =
  | 'zoom-start'      // 缩放开始
  | 'zoom-change'     // 缩放变化
  | 'zoom-end'        // 缩放结束
  | 'rerender-start'  // 重渲染开始（deferred/hybrid）
  | 'rerender-end';   // 重渲染结束（deferred/hybrid）

interface ZoomEvent {
  type: ZoomEventType;
  state: ZoomState;
  previousState?: ZoomState;
  timestamp: number;
}
```

### 独立使用策略和手势

如果只需要使用策略或手势，可以独立导入：

```typescript
import { InstantTransform, WheelGesture } from '@customize-pdf/canvas-zoom';

// 仅使用缩放策略
const transform = new InstantTransform({
  minScale: 0.5,
  maxScale: 5.0,
  zoomSpeed: 0.1
});

const state = transform.zoom(element, currentState, delta, centerX, centerY);

// 仅使用手势识别
const wheelGesture = new WheelGesture(
  element,
  (delta, centerX, centerY, event) => {
    console.log('滚轮缩放', delta);
  },
  { requireCtrl: true }
);
```

## 使用示例

### 基础缩放

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #container {
      width: 100%;
      height: 600px;
      border: 1px solid #ccc;
      overflow: auto;
      position: relative;
    }
    #content {
      width: 800px;
      height: 1000px;
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="zoomIn">放大</button>
    <button id="zoomOut">缩小</button>
    <button id="fitWidth">适应宽度</button>
    <button id="reset">重置</button>
    <span id="scale">100%</span>
  </div>

  <div id="container">
    <div id="content">
      <!-- 内容 -->
    </div>
  </div>

  <script type="module">
    import { ZoomManager } from '@customize-pdf/canvas-zoom';

    const zoomManager = new ZoomManager({
      container: '#container',
      strategy: 'hybrid'
    });

    // 绑定按钮
    document.getElementById('zoomIn').onclick = () => zoomManager.zoomIn();
    document.getElementById('zoomOut').onclick = () => zoomManager.zoomOut();
    document.getElementById('fitWidth').onclick = () => zoomManager.fitWidth();
    document.getElementById('reset').onclick = () => zoomManager.reset();

    // 显示当前缩放比例
    zoomManager.on('zoom-change', (event) => {
      const percent = Math.round(event.state.scale * 100);
      document.getElementById('scale').textContent = `${percent}%`;
    });
  </script>
</body>
</html>
```

### 与PDF.js集成

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomManager } from '@customize-pdf/canvas-zoom';

// 加载PDF
const loadingTask = pdfjsLib.getDocument(pdfUrl);
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);

// 渲染PDF页面
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

let currentScale = 1.0;

async function renderPage(scale: number) {
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;
}

// 初始渲染
await renderPage(currentScale);

// 创建缩放管理器
const zoomManager = new ZoomManager({
  container: canvas.parentElement,
  strategy: 'hybrid',
  initialScale: currentScale
});

// 监听重渲染事件
zoomManager.on('rerender-start', async (event) => {
  currentScale = event.state.scale;
  await renderPage(currentScale);
  zoomManager.onRerenderComplete(currentScale);
});
```

## 性能建议

1. **选择合适的策略**：
   - 小型Canvas（< 2000x2000）：使用 `instant`
   - 大型Canvas（> 2000x2000）：使用 `hybrid`
   - 需要始终高清：使用 `deferred`

2. **调整重渲染参数**：
   - 增加 `rerenderThreshold`（如0.5）减少重渲染频率
   - 增加 `rerenderDelay`（如500ms）避免频繁渲染

3. **移动端优化**：
   - 启用 `pinch` 手势
   - 适当增加 `minDistance` 避免误触

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

## License

MIT
