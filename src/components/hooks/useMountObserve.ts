/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 16:34:14
 * @LastEditTime: 2025-11-04 17:18:20
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useMountObserve.ts
 */
import { onMounted, onUnmounted, ref } from "vue";

export const useMountObserve = (pageRefs: HTMLElement,
    pagesCount: number,
    callback: (arg: string | number) => void) => {
    let canvasIndex: string | number = 0;
    let observer: IntersectionObserver | null = null;

    // 存储每个页面的可见比例
    const intersectionRatios: Record<string, number> = {};

    /**
     * @description: 初始化方法
     * @return {*}
     */
    const initFunc = () => {
        observer = new IntersectionObserver(handleIntersection, {
            root: pageRefs,
            threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        });

        for (let i = 0; i < pagesCount; i++) {
            const canvasId = `#annotation-canvas_` + (i - 1)
            const canvas: any = document.querySelector(canvasId); // 获取对应的canvas元素
            if (canvas) {
                // 设置data-index属性以便识别
                canvas.setAttribute("data-index", i.toString());
                observer.observe(canvas);
                // 初始化所有页面的可见比例为0
                intersectionRatios[i] = 0;
            }
        }
    }

    /**
     * @description: 检测当前可视窗口占比最大得canvas
     * @param {IntersectionObserverEntry} entries
     * @return {*}
     */
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
        // 更新所有可见性变化的页面的比例
        entries.forEach((entry) => {
            const index = entry.target.getAttribute("data-index");
            if (index !== null) {
                intersectionRatios[index] = entry.intersectionRatio;
            }
        });

        // 找出占比最高的页面
        let highestRatio = 0;
        let highestIndex = canvasIndex;

        Object.entries(intersectionRatios).forEach(([index, ratio]) => {
            if (ratio > highestRatio) {
                highestRatio = ratio;
                highestIndex = index;
            }
        });

        // 只有当占比超过阈值时才更新当前页面
        if (highestRatio > 0.5) { // 可调整这个阈值
            canvasIndex = highestIndex;
            callback((+canvasIndex + 1)); // 回调传递当前页面索引（从1开始）
        }
    };
    initFunc();
    onUnmounted(() => {
        if (observer) {
            observer.disconnect();
        }
    });
}