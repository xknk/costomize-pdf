// hooks/useOption/useDrawText.ts
import {
    createTempCanvas,
    getCanvasPos,
    initCtxStyles,
    clearCommonAnnotations,
    destroyCommon,
    generateId,
    CanvasBaseState,
    CanvasBaseStyle,
    eTs
} from './common/common';

// 定义文字形状接口
export interface TextShape {
    id: string;
    type: 'text';
    x: number;  // 文字左上角x坐标
    y: number;  // 文字左上角y坐标
    text: string;  // 文字内容
    fontSize: number;  // 字体大小
    fontFamily: string;  // 字体样式
    color: string;  // 文字颜色
    bold: boolean;  // 是否粗体
    italic: boolean;  // 是否斜体
    width: number;  // 文字框宽度（用于点击检测）
    height: number;  // 文字框高度（用于点击检测）
    timestamp: number;
    canvasId: string;
}

// 控制点类型
type ControlPoint = 'none' | 'move' | 'delete';

// 最小文字尺寸
const MIN_TEXT_WIDTH = 20;
const DELETE_BUTTON_SIZE = 16;  // 删除按钮大小

// 存储所有画布状态
const canvasStates: Record<string, CanvasBaseState & {
    selectedTextId?: string;  // 当前选中的文字ID
    activeControl: ControlPoint;
    dragStartPos?: { x: number; y: number };
    tempSelectedText?: TextShape;
    originalCanvasBg?: ImageData;
    currentCursor: string;
    editingTextarea?: HTMLTextAreaElement;
    isCreatingNew: boolean;
    isDragging: boolean;  // 是否正在拖拽
}> = {};

// 克隆文字
const cloneText = (text: TextShape): TextShape => ({ ...text });

// 测量文字尺寸
const measureText = (ctx: CanvasRenderingContext2D, text: TextShape): { width: number; height: number } => {
    ctx.save();
    ctx.font = `${text.italic ? 'italic ' : ''}${text.bold ? 'bold ' : ''}${text.fontSize}px ${text.fontFamily}`;
    const lines = text.text.split('\n');
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const height = text.fontSize * lines.length * 1.2; // 行高1.2倍
    ctx.restore();
    return { width: maxWidth + 10, height: height + 10 }; // 加padding
};

// 绘制删除按钮
const drawDeleteButton = (
    ctx: CanvasRenderingContext2D,
    text: TextShape,
    style: { controlFillStyle: string; controlStrokeStyle: string }
) => {
    const buttonX = text.x + text.width - DELETE_BUTTON_SIZE / 2;
    const buttonY = text.y - DELETE_BUTTON_SIZE / 2;

    ctx.save();
    // 绘制圆形背景
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, DELETE_BUTTON_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // 绘制X符号
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const offset = DELETE_BUTTON_SIZE / 4;
    ctx.beginPath();
    ctx.moveTo(buttonX - offset, buttonY - offset);
    ctx.lineTo(buttonX + offset, buttonY + offset);
    ctx.moveTo(buttonX + offset, buttonY - offset);
    ctx.lineTo(buttonX - offset, buttonY + offset);
    ctx.stroke();
    ctx.restore();
};

// 绘制文字边框和控制点
const drawTextBorder = (
    ctx: CanvasRenderingContext2D,
    text: TextShape,
    style: { controlFillStyle: string; controlStrokeStyle: string }
) => {
    ctx.save();
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(text.x, text.y, text.width, text.height);
    ctx.restore();

    // 绘制删除按钮
    drawDeleteButton(ctx, text, style);
};

// 获取控制点
const getControlPoint = (x: number, y: number, text: TextShape): ControlPoint => {
    const deleteButtonX = text.x + text.width - DELETE_BUTTON_SIZE / 2;
    const deleteButtonY = text.y - DELETE_BUTTON_SIZE / 2;

    // 检测删除按钮
    const distToDelete = Math.hypot(x - deleteButtonX, y - deleteButtonY);
    if (distToDelete < DELETE_BUTTON_SIZE) {
        return 'delete';
    }

    // 检测文字区域（移动）
    if (x >= text.x && x <= text.x + text.width &&
        y >= text.y && y <= text.y + text.height) {
        return 'move';
    }

    return 'none';
};

// 更新画布光标
const updateCanvasCursor = (state: any, control: ControlPoint) => {
    let cursor = 'default';
    switch (control) {
        case 'move':
            cursor = 'move';
            break;
        case 'delete':
            cursor = 'pointer';
            break;
        default:
            cursor = 'text';
    }
    state.currentCursor = cursor;
    state.mainCanvas.style.cursor = cursor;
};

// 恢复原始背景并重绘其他图形
const restoreOriginalBgAndRedrawOthers = (state: any, excludeId: string) => {
    state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
    state.drawedShapes.forEach((shape: TextShape) => {
        if (shape.id !== excludeId) {
            drawText(state.mainCtx, shape);
        }
    });
};

// 绘制文字
const drawText = (ctx: CanvasRenderingContext2D, text: TextShape) => {
    ctx.save();
    ctx.fillStyle = text.color;
    ctx.font = `${text.italic ? 'italic ' : ''}${text.bold ? 'bold ' : ''}${text.fontSize}px ${text.fontFamily}`;
    ctx.textBaseline = 'top';

    const lines = text.text.split('\n');
    const lineHeight = text.fontSize * 1.2;

    lines.forEach((line, index) => {
        ctx.fillText(line, text.x + 5, text.y + 5 + index * lineHeight);
    });

    ctx.restore();
};

// 重绘所有文字
const redrawAllAnnotations = (canvasId: string, mainCtx: CanvasRenderingContext2D) => {
    const state = canvasStates[canvasId];
    if (!state) return;

    mainCtx.save();
    state.drawedShapes.forEach((shape: TextShape) => {
        drawText(mainCtx, shape);
    });
    mainCtx.restore();
};

// 创建文字输入框
const createTextInput = (
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    initialText: string = '',
    initialStyle: Partial<CanvasBaseStyle> = {},
    onComplete: (text: string) => void,
    onCancel: () => void
) => {
    const container = canvas.parentElement;
    if (!container) return null;

    const textarea = document.createElement('textarea');
    textarea.value = initialText;
    textarea.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        min-width: 200px;
        min-height: 60px;
        padding: 5px;
        font-size: ${initialStyle.fontSize || 16}px;
        font-family: ${initialStyle.fontFamily || 'Arial'};
        color: ${initialStyle.textColor || '#000000'};
        border: 2px solid #4A90E2;
        border-radius: 4px;
        background: white;
        resize: both;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    textarea.placeholder = '输入文字...';

    container.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // 阻止事件冒泡
    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('mousemove', (e) => e.stopPropagation());
    textarea.addEventListener('mouseup', (e) => e.stopPropagation());

    // 处理键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
            cleanup();
            onCancel();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            const text = textarea.value.trim();
            cleanup();
            if (text) {
                onComplete(text);
            } else {
                onCancel();
            }
        }
    };

    // 点击外部完成编辑
    const handleClickOutside = (e: MouseEvent) => {
        if (!textarea.contains(e.target as Node)) {
            const text = textarea.value.trim();
            cleanup();
            if (text) {
                onComplete(text);
            } else {
                onCancel();
            }
        }
    };

    const cleanup = () => {
        textarea.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('mousedown', handleClickOutside);
        if (textarea.parentElement) {
            textarea.parentElement.removeChild(textarea);
        }
    };

    textarea.addEventListener('keydown', handleKeydown);
    setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return textarea;
};

export const useDrawText = () => {
    // 初始化文字批注
    const initDrawingByMouseMove = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        mainCtx: CanvasRenderingContext2D,
        customStyle: Partial<CanvasBaseStyle> = {}
    ) => {
        // 文字默认样式
        const defaultStyle: CanvasBaseStyle = {
            strokeStyle: '#000000',
            lineWidth: 1,
            textColor: '#000000',
            fontSize: 16,
            fontFamily: 'Arial',
            textBold: false,
            textItalic: false,
            controlFillStyle: '#ffffff',
            controlStrokeStyle: '#000000',
            controlSize: 6
        };
        const currentStyle: CanvasBaseStyle = { ...defaultStyle, ...customStyle };

        // 父容器定位处理
        const mainCanvasParent = mainCanvas.parentElement;
        if (!mainCanvasParent) throw new Error('主Canvas必须有直接父容器');
        if (getComputedStyle(mainCanvasParent).position !== 'relative') {
            mainCanvasParent.style.position = 'relative';
            mainCanvasParent.style.overflow = 'visible';
        }

        // 保存已有图形数据
        const existingShapes = canvasStates[canvasId]?.drawedShapes || [];
        const existingBg = canvasStates[canvasId]?.originalCanvasBg;

        // 创建临时Canvas
        const tempCanvas = createTempCanvas(mainCanvas, mainCanvasParent, canvasId);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('浏览器不支持Canvas');

        // 保存原始背景
        const originalCanvasBg = existingBg || mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);

        // 初始化文字专属状态
        const cleanupEvents: (() => void)[] = [];
        canvasStates[canvasId] = {
            canvasId,
            isDrawing: false,
            startX: 0,
            startY: 0,
            drawedShapes: existingShapes,
            selectedTextId: undefined,
            activeControl: 'none',
            dragStartPos: undefined,
            tempSelectedText: undefined,
            tempCanvas,
            tempCtx,
            mainCanvas,
            mainCtx,
            originalCanvasBg,
            currentStyle,
            cleanupEvents,
            currentCursor: 'text',
            editingTextarea: undefined,
            isCreatingNew: false,
            isDragging: false
        };
        const state = canvasStates[canvasId];

        // 初始化样式
        initCtxStyles(mainCtx, state.currentStyle);
        initCtxStyles(tempCtx, state.currentStyle);

        // 重绘已有图形（先清空Canvas并恢复背景，避免在已有图形上重复绘制）
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCtx.putImageData(originalCanvasBg, 0, 0);
        redrawAllAnnotations(canvasId, mainCtx);

        // 渲染选中状态（如果有）
        const renderSelection = () => {
            state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            if (state.selectedTextId) {
                const selectedText = state.drawedShapes.find((s: TextShape) => s.id === state.selectedTextId);
                if (selectedText) {
                    drawTextBorder(state.tempCtx!, selectedText, state.currentStyle);
                }
            }
        };

        // 鼠标按下事件
        const handleMousedown = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 检查是否点击了现有文字
            const texts = [...state.drawedShapes].reverse();
            let clickedText: TextShape | undefined;
            let targetControl: ControlPoint = 'none';

            for (const text of texts) {
                targetControl = getControlPoint(x, y, text);
                if (targetControl !== 'none') {
                    clickedText = text;
                    state.activeControl = targetControl;
                    break;
                }
            }

            if (clickedText) {
                // 点击删除按钮
                if (targetControl === 'delete') {
                    const index = state.drawedShapes.findIndex((s: TextShape) => s.id === clickedText!.id);
                    if (index !== -1) {
                        state.drawedShapes.splice(index, 1);
                        state.selectedTextId = undefined;

                        // 重绘
                        state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                        state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                        redrawAllAnnotations(canvasId, state.mainCtx);
                        state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    }
                    return;
                }

                // 点击移动区域
                if (targetControl === 'move') {
                    // 如果点击的是已选中的文字，开始拖拽
                    if (state.selectedTextId === clickedText.id) {
                        state.isDragging = true;
                        state.tempSelectedText = cloneText(clickedText);
                        state.dragStartPos = { x, y };
                    } else {
                        // 如果点击的是未选中的文字，选中它
                        state.selectedTextId = clickedText.id;
                        state.isDragging = false;

                        // 渲染选中状态
                        renderSelection();
                    }

                    updateCanvasCursor(state, targetControl);
                    return;
                }
            }

            // 点击空白处，取消选中状态
            if (state.selectedTextId && !clickedText) {
                state.selectedTextId = undefined;
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                updateCanvasCursor(state, 'none');
                return;
            }

            // 未点击现有文字，创建新文字
            if (!clickedText) {
                state.isCreatingNew = true;
                state.selectedTextId = undefined;
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                const canvasRect = mainCanvas.getBoundingClientRect();
                const inputX = e.clientX - canvasRect.left;
                const inputY = e.clientY - canvasRect.top;

                state.editingTextarea = createTextInput(
                    mainCanvas,
                    inputX,
                    inputY,
                    '',
                    {
                        fontSize: state.currentStyle.fontSize,
                        fontFamily: state.currentStyle.fontFamily,
                        textColor: state.currentStyle.textColor
                    },
                    (text: string) => {
                        // 完成输入
                        const tempCtx = document.createElement('canvas').getContext('2d')!;
                        const newText: TextShape = {
                            id: generateId(),
                            type: 'text',
                            x,
                            y,
                            text,
                            fontSize: state.currentStyle.fontSize || 16,
                            fontFamily: state.currentStyle.fontFamily || 'Arial',
                            color: state.currentStyle.textColor || '#000000',
                            bold: state.currentStyle.textBold || false,
                            italic: state.currentStyle.textItalic || false,
                            width: 0,
                            height: 0,
                            timestamp: Date.now(),
                            canvasId: state.canvasId
                        };

                        // 测量文字尺寸
                        tempCtx.font = `${newText.italic ? 'italic ' : ''}${newText.bold ? 'bold ' : ''}${newText.fontSize}px ${newText.fontFamily}`;
                        const size = measureText(tempCtx, newText);
                        newText.width = size.width;
                        newText.height = size.height;

                        // 保存文字
                        state.drawedShapes.push(newText);

                        // 重绘
                        state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                        state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                        redrawAllAnnotations(canvasId, state.mainCtx);

                        // 创建完成后自动选中该文字
                        state.selectedTextId = newText.id;
                        renderSelection();

                        state.isCreatingNew = false;
                        state.editingTextarea = undefined;
                    },
                    () => {
                        // 取消输入
                        state.isCreatingNew = false;
                        state.editingTextarea = undefined;
                    }
                ) || undefined;
            }
        };
        mainCanvas.addEventListener('mousedown', handleMousedown);
        cleanupEvents.push(() => mainCanvas.removeEventListener('mousedown', handleMousedown));

        // 鼠标移动事件
        const handleMousemove = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            // 处理文字拖拽（只有在isDragging为true时才拖拽）
            if (state.isDragging && state.tempSelectedText && state.dragStartPos) {
                const dx = x - state.dragStartPos.x;
                const dy = y - state.dragStartPos.y;
                const tempText = { ...state.tempSelectedText };

                tempText.x += dx;
                tempText.y += dy;
                tempText.timestamp = Date.now();

                state.tempSelectedText = tempText;
                state.dragStartPos = { x, y };

                // 主画布：重绘除选中文字外的其他图形
                restoreOriginalBgAndRedrawOthers(state, state.selectedTextId!);

                // 在临时画布上绘制拖拽中的文字
                state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                drawText(state.tempCtx!, tempText);
                drawTextBorder(state.tempCtx!, tempText, state.currentStyle);
                return;
            }

            // 更新光标（根据鼠标位置）
            let targetControl: ControlPoint = 'none';
            if (!state.isCreatingNew && !state.isDragging) {
                const texts = [...state.drawedShapes].reverse();
                for (const text of texts) {
                    const control = getControlPoint(x, y, text);
                    if (control !== 'none') {
                        // 如果是选中的文字，检查是在删除按钮还是移动区域
                        if (state.selectedTextId === text.id) {
                            targetControl = control;
                        } else {
                            // 未选中的文字，只显示move光标
                            targetControl = control === 'delete' ? 'none' : control;
                        }
                        break;
                    }
                }
            }
            updateCanvasCursor(state, targetControl);
        };
        document.addEventListener('mousemove', handleMousemove);
        cleanupEvents.push(() => document.removeEventListener('mousemove', handleMousemove));

        // 鼠标松开事件
        const handleMouseup = () => {
            // 处理拖拽完成
            if (state.isDragging && state.tempSelectedText && state.selectedTextId) {
                // 更新原始文字数据
                const index = state.drawedShapes.findIndex((s: TextShape) => s.id === state.selectedTextId);
                if (index !== -1) {
                    state.drawedShapes[index] = {
                        ...state.tempSelectedText,
                        timestamp: Date.now()
                    };
                }

                // 重绘所有文字
                state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                redrawAllAnnotations(canvasId, state.mainCtx);

                // 保持选中状态，只清空拖拽状态
                state.tempSelectedText = undefined;
                state.isDragging = false;
                state.activeControl = 'none';
                state.dragStartPos = undefined;

                // 渲染选中状态
                renderSelection();
            } else {
                // 没有拖拽，只是重置状态
                state.isDragging = false;
                state.activeControl = 'none';
                state.dragStartPos = undefined;
            }

            // 重置光标
            state.mainCanvas.style.cursor = 'text';
        };
        document.addEventListener('mouseup', handleMouseup);
        document.addEventListener('mouseleave', handleMouseup);
        cleanupEvents.push(() => {
            document.removeEventListener('mouseup', handleMouseup);
            document.removeEventListener('mouseleave', handleMouseup);
        });

        // 双击编辑文字
        const handleDblclick = (e: MouseEvent) => {
            const evt = e as unknown as eTs;
            const { x, y } = getCanvasPos(evt, mainCanvas);

            const texts = [...state.drawedShapes].reverse();
            for (const text of texts) {
                const control = getControlPoint(x, y, text);
                if (control === 'move') {
                    // 取消选中状态，进入编辑模式
                    state.selectedTextId = undefined;
                    state.tempCtx!.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

                    // 找到文字，开始编辑
                    const canvasRect = mainCanvas.getBoundingClientRect();
                    const inputX = e.clientX - canvasRect.left;
                    const inputY = e.clientY - canvasRect.top;

                    state.editingTextarea = createTextInput(
                        mainCanvas,
                        inputX,
                        inputY,
                        text.text,
                        {
                            fontSize: text.fontSize,
                            fontFamily: text.fontFamily,
                            textColor: text.color
                        },
                        (newText: string) => {
                            // 更新文字内容
                            const index = state.drawedShapes.findIndex((s: TextShape) => s.id === text.id);
                            if (index !== -1) {
                                const updatedText = { ...text, text: newText };

                                // 重新测量尺寸
                                const tempCtx = document.createElement('canvas').getContext('2d')!;
                                tempCtx.font = `${updatedText.italic ? 'italic ' : ''}${updatedText.bold ? 'bold ' : ''}${updatedText.fontSize}px ${updatedText.fontFamily}`;
                                const size = measureText(tempCtx, updatedText);
                                updatedText.width = size.width;
                                updatedText.height = size.height;
                                updatedText.timestamp = Date.now();

                                state.drawedShapes[index] = updatedText;

                                // 重绘
                                state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
                                state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
                                redrawAllAnnotations(canvasId, state.mainCtx);

                                // 编辑完成后自动选中该文字
                                state.selectedTextId = text.id;
                                renderSelection();
                            }
                            state.editingTextarea = undefined;
                        },
                        () => {
                            state.editingTextarea = undefined;
                        }
                    ) || undefined;
                    break;
                }
            }
        };
        mainCanvas.addEventListener('dblclick', handleDblclick);
        cleanupEvents.push(() => mainCanvas.removeEventListener('dblclick', handleDblclick));
    };

    // 更新文字样式
    const updateTextStyle = (
        canvasId: string,
        textId: string,
        styleUpdate: Partial<Pick<TextShape, 'color' | 'fontSize' | 'fontFamily' | 'bold' | 'italic'>>
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;

        const index = state.drawedShapes.findIndex((s: TextShape) => s.id === textId);
        if (index !== -1) {
            const text = { ...state.drawedShapes[index], ...styleUpdate };

            // 重新测量尺寸
            const tempCtx = document.createElement('canvas').getContext('2d')!;
            tempCtx.font = `${text.italic ? 'italic ' : ''}${text.bold ? 'bold ' : ''}${text.fontSize}px ${text.fontFamily}`;
            const size = measureText(tempCtx, text);
            text.width = size.width;
            text.height = size.height;
            text.timestamp = Date.now();

            state.drawedShapes[index] = text;

            // 重绘
            state.mainCtx.clearRect(0, 0, state.mainCanvas.width, state.mainCanvas.height);
            state.mainCtx.putImageData(state.originalCanvasBg!, 0, 0);
            redrawAllAnnotations(canvasId, state.mainCtx);
        }
    };

    // 清空文字批注
    const clearAnnotations = (
        canvasId: string,
        mainCanvas: HTMLCanvasElement,
        redrawOriginalContent: () => void
    ) => {
        const state = canvasStates[canvasId];
        if (!state) return;
        clearCommonAnnotations(state, mainCanvas, redrawOriginalContent);
    };

    // 销毁文字批注功能
    const destroy = (canvasId: string, keepShapes: boolean = true) => {
        const state = canvasStates[canvasId];
        if (state) {
            const shapes = state.drawedShapes;
            const bg = state.originalCanvasBg;

            // 清理正在编辑的textarea
            if (state.editingTextarea && state.editingTextarea.parentElement) {
                state.editingTextarea.parentElement.removeChild(state.editingTextarea);
            }

            destroyCommon(canvasId, state);

            if (keepShapes) {
                canvasStates[canvasId] = {
                    ...state,
                    tempCanvas: null,
                    tempCtx: null,
                    cleanupEvents: [],
                    isDrawing: false,
                    drawedShapes: shapes,
                    originalCanvasBg: bg,
                    editingTextarea: undefined,
                    isCreatingNew: false,
                    isDragging: false
                };
            } else {
                delete canvasStates[canvasId];
            }
        }
    };

    // 获取文字数据
    const getShapes = (canvasId?: string): TextShape[] => {
        if (canvasId) {
            const state = canvasStates[canvasId];
            return state ? [...state.drawedShapes] : [];
        }
        return Object.values(canvasStates).flatMap(state => state.drawedShapes);
    };

    // 缩放批注坐标（用于PDF缩放）
    const scaleAnnotations = (canvasId: string, scaleRatio: number) => {
        const state = canvasStates[canvasId];
        if (!state || scaleRatio === 1) return;

        // 只缩放已完成的批注（不缩放正在编辑的）
        state.drawedShapes = state.drawedShapes.map((shape: TextShape) => ({
            ...shape,
            x: shape.x * scaleRatio,
            y: shape.y * scaleRatio,
            width: shape.width * scaleRatio,
            height: shape.height * scaleRatio,
            fontSize: shape.fontSize * scaleRatio
        }));

        // 更新原始背景（在缩放后保存新的背景）
        if (state.originalCanvasBg && state.mainCanvas) {
            state.originalCanvasBg = state.mainCtx.getImageData(
                0, 0, state.mainCanvas.width, state.mainCanvas.height
            );
        }
    };

    return {
        initDrawingByMouseMove,
        redrawAllAnnotations,
        updateTextStyle,
        clearAnnotations,
        destroy,
        getShapes,
        scaleAnnotations
    };
};
