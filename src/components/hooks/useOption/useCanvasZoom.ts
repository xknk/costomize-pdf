// hooks/useOption/useCanvasZoom.ts
// Canvas缩放功能管理

export interface ZoomState {
    scale: number;      // 缩放比例
    offsetX: number;    // X偏移
    offsetY: number;    // Y偏移
    minScale: number;   // 最小缩放
    maxScale: number;   // 最大缩放
}

// 存储每个Canvas的缩放状态
const zoomStates: Record<string, ZoomState> = {};

// 默认缩放配置
const DEFAULT_ZOOM_CONFIG = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: 0.1,
    maxScale: 5
};

export const useCanvasZoom = () => {
    // 初始化缩放状态
    const initZoom = (canvasId: string, config: Partial<ZoomState> = {}) => {
        zoomStates[canvasId] = {
            ...DEFAULT_ZOOM_CONFIG,
            ...config
        };
    };

    // 获取缩放状态
    const getZoomState = (canvasId: string): ZoomState => {
        if (!zoomStates[canvasId]) {
            initZoom(canvasId);
        }
        return zoomStates[canvasId];
    };

    // 设置缩放
    const setScale = (canvasId: string, scale: number, centerX?: number, centerY?: number) => {
        const state = getZoomState(canvasId);

        // 限制缩放范围
        const newScale = Math.max(state.minScale, Math.min(state.maxScale, scale));

        if (centerX !== undefined && centerY !== undefined) {
            // 围绕指定点缩放
            const scaleRatio = newScale / state.scale;
            state.offsetX = centerX - (centerX - state.offsetX) * scaleRatio;
            state.offsetY = centerY - (centerY - state.offsetY) * scaleRatio;
        }

        state.scale = newScale;
    };

    // 缩放增量
    const zoom = (canvasId: string, delta: number, centerX?: number, centerY?: number) => {
        const state = getZoomState(canvasId);
        const scaleFactor = delta > 0 ? 1.1 : 0.9;
        const newScale = state.scale * scaleFactor;
        setScale(canvasId, newScale, centerX, centerY);
    };

    // 设置偏移
    const setOffset = (canvasId: string, offsetX: number, offsetY: number) => {
        const state = getZoomState(canvasId);
        state.offsetX = offsetX;
        state.offsetY = offsetY;
    };

    // 重置缩放
    const resetZoom = (canvasId: string) => {
        const state = getZoomState(canvasId);
        state.scale = 1;
        state.offsetX = 0;
        state.offsetY = 0;
    };

    // 屏幕坐标转换为Canvas逻辑坐标（考虑缩放和偏移）
    const screenToCanvas = (canvasId: string, screenX: number, screenY: number): { x: number; y: number } => {
        const state = getZoomState(canvasId);
        return {
            x: (screenX - state.offsetX) / state.scale,
            y: (screenY - state.offsetY) / state.scale
        };
    };

    // Canvas逻辑坐标转换为屏幕坐标
    const canvasToScreen = (canvasId: string, canvasX: number, canvasY: number): { x: number; y: number } => {
        const state = getZoomState(canvasId);
        return {
            x: canvasX * state.scale + state.offsetX,
            y: canvasY * state.scale + state.offsetY
        };
    };

    // 应用变换到Context
    const applyTransform = (canvasId: string, ctx: CanvasRenderingContext2D) => {
        const state = getZoomState(canvasId);
        ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
    };

    // 重置Context变换
    const resetTransform = (ctx: CanvasRenderingContext2D) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    // 绑定滚轮缩放事件
    const bindWheelZoom = (
        canvasId: string,
        canvas: HTMLCanvasElement,
        callback?: (scale: number) => void
    ): () => void => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 缩放
            zoom(canvasId, e.deltaY > 0 ? -1 : 1, mouseX, mouseY);

            if (callback) {
                callback(getZoomState(canvasId).scale);
            }
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    };

    // 绑定触摸手势缩放（移动端）
    const bindTouchZoom = (
        canvasId: string,
        canvas: HTMLCanvasElement,
        callback?: (scale: number) => void
    ): () => void => {
        let lastDistance = 0;
        let lastCenter = { x: 0, y: 0 };

        const getDistance = (touch1: Touch, touch2: Touch) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const getCenter = (touch1: Touch, touch2: Touch) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
                y: (touch1.clientY + touch2.clientY) / 2 - rect.top
            };
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                lastDistance = getDistance(e.touches[0], e.touches[1]);
                lastCenter = getCenter(e.touches[0], e.touches[1]);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();

                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const currentCenter = getCenter(e.touches[0], e.touches[1]);

                if (lastDistance > 0) {
                    const scaleDelta = currentDistance / lastDistance;
                    const state = getZoomState(canvasId);
                    setScale(canvasId, state.scale * scaleDelta, currentCenter.x, currentCenter.y);

                    if (callback) {
                        callback(state.scale);
                    }
                }

                lastDistance = currentDistance;
                lastCenter = currentCenter;
            }
        };

        const handleTouchEnd = () => {
            lastDistance = 0;
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    };

    // 销毁缩放状态
    const destroy = (canvasId: string) => {
        delete zoomStates[canvasId];
    };

    return {
        initZoom,
        getZoomState,
        setScale,
        zoom,
        setOffset,
        resetZoom,
        screenToCanvas,
        canvasToScreen,
        applyTransform,
        resetTransform,
        bindWheelZoom,
        bindTouchZoom,
        destroy
    };
};
