/*
 * @Author: Robin LEI
 * @Date: 2025-04-10 16:34:14
 * @LastEditTime: 2025-04-11 14:55:49
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\components\hooks\useMountObserve.ts
 */
import { onMounted, onUnmounted, ref } from "vue";

export const useMountObserve = (pageRefs: HTMLElement,
    canvasRefs: any, pagesCount: number,
    callback: (arg: string | number) => void) => {
    let canvasIndex: string | number = 0
    let observer: IntersectionObserver | null = null; // 当前可视窗口最大得canvas页码
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
            const canvas = canvasRefs[`canvas${i}`];
            if (canvas) {
                observer.observe(canvas);
            }
        }
    }
    /**
     * @description: 检测当前可视窗口占比最大得canvas
     * @param {IntersectionObserverEntry} entries
     * @return {*}
     */
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
            const ratio = entry.intersectionRatio;
            if (ratio > 0.5) {
                canvasIndex = entry.target.getAttribute("data-index") || 0;
            }
        });
        callback((+canvasIndex + 1))
    };
    initFunc()
    onUnmounted(() => {
        if (observer) {
            observer.disconnect();
        }
    });
}

