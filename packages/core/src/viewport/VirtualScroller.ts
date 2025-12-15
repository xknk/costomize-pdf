/**
 * 虚拟滚动器 - 仅渲染可见页面，支持1000+页大文档
 *
 * 设计要点：
 * - 二分查找可见页面范围
 * - 缓冲区机制（上下各2页）
 * - 渲染优先级（中心页最高）
 * - 自动清理离开视口的页面
 * - Intersection Observer优化
 */

import { EventBus } from '../events/EventBus';
import { PDFDocument } from '../document/PDFDocument';
import { PageRenderer } from '../renderer/PageRenderer';

export interface VirtualScrollerConfig {
  container: HTMLElement; // 滚动容器
  pdfDocument: PDFDocument; // PDF文档
  pageRenderer: PageRenderer; // 页面渲染器
  scale?: number; // 缩放比例，默认1
  bufferPages?: number; // 缓冲页数（上下各N页），默认2
  enableIntersectionObserver?: boolean; // 是否使用IntersectionObserver，默认true
  eventBus?: EventBus;
}

export interface PageInfo {
  pageNumber: number;
  top: number; // 页面顶部相对容器的位置
  height: number;
  canvas: HTMLCanvasElement | null;
  rendered: boolean;
  visible: boolean;
}

export class VirtualScroller {
  private container: HTMLElement;
  private pdfDocument: PDFDocument;
  private pageRenderer: PageRenderer;
  private eventBus: EventBus;
  private scale: number;
  private bufferPages: number;
  private enableIntersectionObserver: boolean;

  private pages: PageInfo[] = [];
  private visiblePages: Set<number> = new Set();
  private intersectionObserver: IntersectionObserver | null = null;

  private scrollTimeout: number | null = null;

  constructor(config: VirtualScrollerConfig) {
    this.container = config.container;
    this.pdfDocument = config.pdfDocument;
    this.pageRenderer = config.pageRenderer;
    this.eventBus = config.eventBus || new EventBus();
    this.scale = config.scale || 1;
    this.bufferPages = config.bufferPages || 2;
    this.enableIntersectionObserver = config.enableIntersectionObserver !== false;
  }

  /**
   * 初始化虚拟滚动
   */
  async init(): Promise<void> {
    if (!this.pdfDocument.isLoaded) {
      throw new Error('PDF文档未加载');
    }

    // 获取所有页面信息
    const pagesInfo = await this.pdfDocument.getAllPagesInfo();

    let currentTop = 0;

    // 初始化页面信息数组
    this.pages = pagesInfo.map((info) => {
      const pageInfo: PageInfo = {
        pageNumber: info.pageNumber,
        top: currentTop,
        height: info.height * this.scale,
        canvas: null,
        rendered: false,
        visible: false
      };

      // 累加高度（加上页面间距16px）
      currentTop += pageInfo.height + 16;

      return pageInfo;
    });

    // 设置容器高度（总高度）
    this.setContainerHeight(currentTop);

    // 创建所有Canvas占位符
    this.createCanvasPlaceholders();

    // 设置IntersectionObserver（如果启用）
    if (this.enableIntersectionObserver) {
      this.setupIntersectionObserver();
    }

    // 绑定滚动事件
    this.bindScrollEvent();

    // 触发初始化完成事件
    this.eventBus.emit('pages-initialized', {
      pagesCount: this.pages.length
    });

    // 初始渲染可见页面
    this.updateVisiblePages();
  }

  /**
   * 设置容器高度
   */
  private setContainerHeight(height: number): void {
    // 创建或更新内容容器
    let contentDiv = this.container.querySelector('.pdf-virtual-content') as HTMLElement;

    if (!contentDiv) {
      contentDiv = document.createElement('div');
      contentDiv.className = 'pdf-virtual-content';
      contentDiv.style.position = 'relative';
      contentDiv.style.width = '100%';
      this.container.appendChild(contentDiv);
    }

    contentDiv.style.height = `${height}px`;
  }

  /**
   * 创建Canvas占位符
   */
  private createCanvasPlaceholders(): void {
    const contentDiv = this.container.querySelector('.pdf-virtual-content') as HTMLElement;

    this.pages.forEach((pageInfo) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.dataset.pageNumber = String(pageInfo.pageNumber);
      wrapper.style.position = 'absolute';
      wrapper.style.top = `${pageInfo.top}px`;
      wrapper.style.width = '100%';
      wrapper.style.height = `${pageInfo.height}px`;

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.dataset.pageNumber = String(pageInfo.pageNumber);
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';

      wrapper.appendChild(canvas);
      contentDiv.appendChild(wrapper);

      pageInfo.canvas = canvas;
    });
  }

  /**
   * 设置IntersectionObserver
   */
  private setupIntersectionObserver(): void {
    const options = {
      root: this.container,
      rootMargin: `${this.bufferPages * 800}px`, // 假设平均页高800px
      threshold: 0
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const pageNumber = parseInt(
          (entry.target as HTMLElement).dataset.pageNumber || '0'
        );

        const pageInfo = this.pages[pageNumber - 1];
        if (!pageInfo) return;

        pageInfo.visible = entry.isIntersecting;

        if (entry.isIntersecting) {
          this.visiblePages.add(pageNumber);
          this.renderPage(pageNumber);
        } else {
          this.visiblePages.delete(pageNumber);
          // 可选：清理离开视口的页面
          // this.cleanupPage(pageNumber);
        }
      });

      // 触发可见页面变化事件
      this.eventBus.emit('visible-pages-changed', {
        pages: Array.from(this.visiblePages),
        buffer: this.bufferPages
      });

    }, options);

    // 观察所有Canvas
    this.pages.forEach((pageInfo) => {
      if (pageInfo.canvas) {
        this.intersectionObserver!.observe(pageInfo.canvas.parentElement!);
      }
    });
  }

  /**
   * 绑定滚动事件
   */
  private bindScrollEvent(): void {
    const handleScroll = () => {
      // 清除之前的超时
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // 更新可见页面
      if (!this.enableIntersectionObserver) {
        this.updateVisiblePages();
      }

      // 触发滚动事件
      this.eventBus.emit('scroll-position-changed', {
        scrollTop: this.container.scrollTop,
        scrollLeft: this.container.scrollLeft
      });

      // 设置滚动结束超时
      this.scrollTimeout = window.setTimeout(() => {
        // 滚动结束
      }, 150);
    };

    this.container.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * 更新可见页面（手动计算，不依赖IntersectionObserver）
   */
  private updateVisiblePages(): void {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;
    const viewportBottom = scrollTop + viewportHeight;

    // 计算缓冲区范围
    const bufferHeight = this.bufferPages * 800; // 假设平均页高
    const rangeTop = Math.max(0, scrollTop - bufferHeight);
    const rangeBottom = viewportBottom + bufferHeight;

    // 二分查找第一个可见页
    const startIndex = this.binarySearchPage(rangeTop);
    const endIndex = this.binarySearchPage(rangeBottom);

    // 清空旧的可见页面集合
    this.visiblePages.clear();

    // 添加新的可见页面
    for (let i = startIndex; i <= endIndex && i < this.pages.length; i++) {
      const pageInfo = this.pages[i];
      pageInfo.visible = true;
      this.visiblePages.add(pageInfo.pageNumber);

      // 渲染页面
      this.renderPage(pageInfo.pageNumber);
    }

    // 触发事件
    this.eventBus.emit('visible-pages-changed', {
      pages: Array.from(this.visiblePages),
      buffer: this.bufferPages
    });
  }

  /**
   * 二分查找页面索引
   */
  private binarySearchPage(position: number): number {
    let left = 0;
    let right = this.pages.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const pageInfo = this.pages[mid];

      if (pageInfo.top + pageInfo.height < position) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * 渲染页面
   */
  private async renderPage(pageNumber: number): Promise<void> {
    const pageInfo = this.pages[pageNumber - 1];
    if (!pageInfo || pageInfo.rendered || !pageInfo.canvas) {
      return;
    }

    try {
      // 获取页面
      const page = await this.pdfDocument.getPage(pageNumber);

      // 计算优先级（中心页优先级最高）
      const scrollTop = this.container.scrollTop;
      const viewportCenter = scrollTop + this.container.clientHeight / 2;
      const pageCenter = pageInfo.top + pageInfo.height / 2;
      const distance = Math.abs(pageCenter - viewportCenter);
      const priority = Math.floor(distance / 100); // 距离越小优先级越高

      // 提交渲染任务
      await this.pageRenderer.renderPage(page, pageInfo.canvas, this.scale, priority);

      pageInfo.rendered = true;

    } catch (error) {
      console.error(`渲染页面${pageNumber}失败:`, error);
    }
  }

  /**
   * 更新缩放
   */
  updateScale(newScale: number): void {
    this.scale = newScale;

    // 重新计算所有页面位置
    let currentTop = 0;
    this.pages.forEach((pageInfo) => {
      pageInfo.top = currentTop;
      pageInfo.height = pageInfo.height * (newScale / this.scale);
      pageInfo.rendered = false; // 标记需要重新渲染

      // 更新wrapper位置
      if (pageInfo.canvas) {
        const wrapper = pageInfo.canvas.parentElement;
        if (wrapper) {
          wrapper.style.top = `${pageInfo.top}px`;
          wrapper.style.height = `${pageInfo.height}px`;
        }
      }

      currentTop += pageInfo.height + 16;
    });

    // 更新容器高度
    this.setContainerHeight(currentTop);

    // 重新渲染可见页面
    this.updateVisiblePages();
  }

  /**
   * 跳转到指定页面
   */
  scrollToPage(pageNumber: number, smooth: boolean = true): void {
    const pageInfo = this.pages[pageNumber - 1];
    if (!pageInfo) {
      return;
    }

    this.container.scrollTo({
      top: pageInfo.top,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  /**
   * 销毁虚拟滚动器
   */
  destroy(): void {
    // 断开IntersectionObserver
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // 清除滚动超时
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }

    // 清空数据
    this.pages = [];
    this.visiblePages.clear();
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      totalPages: this.pages.length,
      visiblePages: this.visiblePages.size,
      renderedPages: this.pages.filter(p => p.rendered).length,
      scale: this.scale,
      bufferPages: this.bufferPages
    };
  }
}
