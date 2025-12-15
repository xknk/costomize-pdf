/**
 * 核心类型定义
 */
export type Scale = number | 'auto' | 'page-fit' | 'page-width';
export interface Point {
    x: number;
    y: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface CoreConfig {
    workerSrc?: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
}
export * from '../document/PDFDocument';
export * from '../renderer/PageRenderer';
export * from '../events/EventBus';
//# sourceMappingURL=index.d.ts.map