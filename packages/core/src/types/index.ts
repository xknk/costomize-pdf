/**
 * 核心类型定义
 */

// 基础类型
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

// 配置类型
export interface CoreConfig {
  workerSrc?: string;
  cMapUrl?: string;
  cMapPacked?: boolean;
}

// 导出所有类型
export * from '../document/PDFDocument';
export * from '../renderer/PageRenderer';
export * from '../events/EventBus';
