/**
 * PDF渲染Worker - 在独立线程中渲染PDF页面
 *
 * 使用ImageBitmap传输渲染结果，避免主线程阻塞
 */

// 注意：这个文件将被编译为独立的Worker脚本
import * as pdfjsLib from 'pdfjs-dist';

// Worker消息类型
interface RenderRequest {
  type: 'render';
  taskId: string;
  pdfData: ArrayBuffer;
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
}

interface RenderResponse {
  type: 'render-complete' | 'render-error';
  taskId: string;
  imageBitmap?: ImageBitmap;
  error?: string;
}

// 监听主线程消息
self.addEventListener('message', async (event: MessageEvent<RenderRequest>) => {
  const { type, taskId, pdfData, pageNumber, scale, width, height } = event.data;

  if (type !== 'render') {
    return;
  }

  try {
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    // 获取指定页面
    const page = await pdf.getPage(pageNumber);

    // 计算视口
    const viewport = page.getViewport({ scale });

    // 创建离屏Canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法获取OffscreenCanvas上下文');
    }

    // 渲染PDF
    await page.render({
      canvasContext: ctx as any,
      viewport: viewport
    }).promise;

    // 转换为ImageBitmap（高效传输）
    const imageBitmap = await canvas.transferToImageBitmap();

    // 发送结果到主线程
    const response: RenderResponse = {
      type: 'render-complete',
      taskId,
      imageBitmap
    };

    // 使用options格式传输ImageBitmap
    self.postMessage(response, { transfer: [imageBitmap] });

    // 清理
    await pdf.destroy();

  } catch (error) {
    // 发送错误到主线程
    const response: RenderResponse = {
      type: 'render-error',
      taskId,
      error: error instanceof Error ? error.message : String(error)
    };

    self.postMessage(response);
  }
});

// Worker就绪通知
self.postMessage({ type: 'ready' });

export {};
