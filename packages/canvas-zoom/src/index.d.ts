/**
 * @customize-pdf/canvas-zoom
 *
 * 独立的Canvas缩放模块
 * 支持多种缩放策略和手势识别
 */
export { ZoomManager } from './ZoomManager';
export { InstantTransform } from './transforms/InstantTransform';
export { DeferredTransform } from './transforms/DeferredTransform';
export { HybridTransform } from './transforms/HybridTransform';
export { BaseTransform } from './transforms/BaseTransform';
export type { ZoomState as TransformZoomState, ZoomOptions } from './transforms/BaseTransform';
export { WheelGesture } from './gestures/WheelGesture';
export type { WheelGestureOptions, WheelGestureHandler } from './gestures/WheelGesture';
export { PinchGesture } from './gestures/PinchGesture';
export type { PinchGestureOptions, PinchGestureHandler } from './gestures/PinchGesture';
export type { ZoomState, ZoomStrategy, ZoomEventType, ZoomEvent, ZoomEventListener, GestureConfig, ZoomManagerConfig } from './types';
//# sourceMappingURL=index.d.ts.map