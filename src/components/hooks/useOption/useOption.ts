// components/hooks/useOption/useOption.ts
import { useDrawRect } from './useDrawRect';
import { useDrawCircle } from './useDrawCircle';
import { useDrawLine } from './useDrawLine';
import { useDrawText } from './useDrawText';
import { CanvasBaseStyle } from './common/common';

// 定义绘制模式
export type DrawMode = 'rect' | 'circle' | 'line' | 'text' | 'none';

// 定义自定义样式接口（整合所有形状的样式）
export interface DrawCustomStyle extends Partial<CanvasBaseStyle> {
    rectFillStyle?: string;
    circleFillStyle?: string;
}

// 存储当前激活的绘制工具
const activeTools: Record<string, {
    mode: DrawMode;
    destroy: () => void;
}> = {};

export const useDraw = () => {
    // 初始化绘制工具
    const init = (
        canvasId: string,
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        mode: DrawMode = 'none',
        customStyle: DrawCustomStyle = {}
    ) => {
        // 先销毁该画布上的现有工具
        if (activeTools[canvasId]) {
            activeTools[canvasId].destroy();
        }

        switch (mode) {
            case 'rect':
                const rectTool = useDrawRect();
                rectTool.initDrawingByMouseMove(canvasId, canvas, ctx, customStyle);
                activeTools[canvasId] = {
                    mode,
                    destroy: () => rectTool.destroy(canvasId)
                };
                break;

            case 'circle':
                const circleTool = useDrawCircle();
                circleTool.initDrawingByMouseMove(canvasId, canvas, ctx, customStyle);
                activeTools[canvasId] = {
                    mode,
                    destroy: () => circleTool.destroy(canvasId)
                };
                break;

            case 'line':
                const lineTool = useDrawLine();
                lineTool.initDrawingByMouseMove(canvasId, canvas, ctx, customStyle);
                activeTools[canvasId] = {
                    mode,
                    destroy: () => lineTool.destroy(canvasId)
                };
                break;

            case 'text':
                const textTool = useDrawText();
                textTool.initDrawingByMouseMove(canvasId, canvas, ctx, customStyle);
                activeTools[canvasId] = {
                    mode,
                    destroy: () => textTool.destroy(canvasId)
                };
                break;

            case 'none':
                // 不初始化任何工具
                activeTools[canvasId] = {
                    mode: 'none',
                    destroy: () => { }
                };
                break;
        }
    };

    // 切换绘制模式
    const switchMode = (
        mode: DrawMode,
        customStyle?: DrawCustomStyle,
        canvasId?: string,
        canvas?: HTMLCanvasElement,
        ctx?: CanvasRenderingContext2D
    ) => {
        if (!canvasId || !canvas || !ctx) return;

        init(canvasId, canvas, ctx, mode, customStyle);
    };

    // 清空指定画布的批注
    const clearAnnotations = (
        canvasId: string,
        canvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const tool = activeTools[canvasId];
        switch (tool?.mode) {
            case 'rect':
                useDrawRect().clearAnnotations(canvasId, canvas, redrawOriginalContent);
                break;
            case 'circle':
                useDrawCircle().clearAnnotations(canvasId, canvas, redrawOriginalContent);
                break;
            case 'line':
                useDrawLine().clearAnnotations(canvasId, canvas, redrawOriginalContent);
                break;
            case 'text':
                useDrawText().clearAnnotations(canvasId, canvas, redrawOriginalContent);
                break;
        }
    };

    // 获取所有画布的绘制数据
    const getAllShapes = () => {
        const allShapes: any[] = [];
        Object.keys(activeTools).forEach(canvasId => {
            const { mode } = activeTools[canvasId];
            switch (mode) {
                case 'rect':
                    allShapes.push(...useDrawRect().getShapes(canvasId));
                    break;
                case 'circle':
                    allShapes.push(...useDrawCircle().getShapes(canvasId));
                    break;
                case 'line':
                    allShapes.push(...useDrawLine().getShapes(canvasId));
                    break;
                case 'text':
                    allShapes.push(...useDrawText().getShapes(canvasId));
                    break;
            }
        });
        return allShapes;
    };

    // 销毁所有绘制工具
    const destroy = () => {
        Object.values(activeTools).forEach(tool => tool.destroy());
        Object.keys(activeTools).forEach(key => delete activeTools[key]);
    };

    return {
        init,
        switchMode,
        clearAnnotations,
        getAllShapes,
        destroy
    };
};
