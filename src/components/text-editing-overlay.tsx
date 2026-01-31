/**
 * Text Editing Overlay
 * Renders the floating textarea for editing text on canvas elements.
 * Handles UML class section positioning, auto-resize, and blur/escape commits.
 * Extracted from canvas.tsx.
 */

import { type Component, createEffect, Show } from "solid-js";
import { store } from "../store/app-store";
import { measureContainerText } from "../utils/text-utils";
import { getElementPreviewBaseState } from "../utils/animation/element-animator";

interface TextEditingOverlayProps {
    editingId: () => string | null;
    setEditingId: (v: string | null) => void;
    editText: () => string;
    setEditText: (v: string) => void;
    editingProperty: () => 'text' | 'containerText' | 'attributesText' | 'methodsText';
    canvasRef?: HTMLCanvasElement;
    onCommitText: () => void;
    onTextInputRef: (ref: HTMLTextAreaElement) => void;
}

const TextEditingOverlay: Component<TextEditingOverlayProps> = (props) => {
    let textInputRef: HTMLTextAreaElement | undefined;

    const activeTextElement = () => {
        const id = props.editingId();
        if (!id) return null;
        return store.elements.find(e => e.id === id);
    };

    const handleTextBlur = () => {
        if (props.editingId()) {
            props.onCommitText();
        }
    };

    // Auto-resize textarea to fit content
    createEffect(() => {
        if (props.editingId() && textInputRef) {
            textInputRef.style.height = 'auto';
            textInputRef.style.height = textInputRef.scrollHeight + 'px';
        }
    });

    return (
        <Show when={props.editingId() && activeTextElement()}>
            {(_) => {
                const el = activeTextElement()!;
                const baseState = getElementPreviewBaseState(el.id);
                const elX = baseState ? baseState.x : el.x;
                const elY = baseState ? baseState.y : el.y;
                const elW = baseState ? baseState.width : el.width;
                const elH = baseState ? baseState.height : el.height;
                const { scale, panX, panY } = store.viewState;

                // Calculate Center based on Editing Property
                let centerX = (elX + elW / 2) * scale + panX;
                let centerY = (elY + elH / 2) * scale + panY;
                let textAlign = 'center';
                let fontSizeVal = el.fontSize || 28;
                let textareaWidth = elW * scale;

                if (el.type === 'umlClass') {
                    const prop = props.editingProperty();
                    if (prop === 'attributesText' || prop === 'methodsText') {
                        textAlign = 'left';
                        fontSizeVal = fontSizeVal * 0.9;

                        // Re-calculate layout to find Y position
                        const ctx = props.canvasRef ? props.canvasRef.getContext("2d") : null;
                        let headerHeight = 30;
                        if (el.containerText && ctx) {
                            const metrics = measureContainerText(ctx, el, el.containerText, el.width - 10);
                            headerHeight = Math.max(30, metrics.textHeight + 20);
                        }

                        let attrOffsetY = headerHeight;
                        let attrHeight = 20;
                        if (el.attributesText && ctx) {
                            const metrics = measureContainerText(ctx, { ...el, fontSize: fontSizeVal }, el.attributesText, el.width - 10);
                            attrHeight = Math.max(20, metrics.textHeight + 10);
                        }

                        if (prop === 'attributesText') {
                            centerY = (elY + attrOffsetY + attrHeight / 2) * scale + panY;
                            centerX = (elX + elW / 2) * scale + panX; // Keep X center but align text left
                        } else if (prop === 'methodsText') {
                            // Methods start after attributes
                            const methodOffsetY = attrOffsetY + attrHeight;
                            centerY = (elY + methodOffsetY + 20) * scale + panY;
                            centerX = (elX + elW / 2) * scale + panX;
                        }
                    }
                }

                const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
                    el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                        'Handlee, cursive';
                const fontWeight = el.fontWeight || 'normal';
                const fontStyle = el.fontStyle || 'normal';

                return (
                    <textarea
                        ref={(el) => {
                            textInputRef = el;
                            props.onTextInputRef(el);
                        }}
                        value={props.editText()}
                        onInput={(e) => props.setEditText(e.currentTarget.value)}
                        onBlur={handleTextBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                props.setEditingId(null);
                                props.setEditText("");
                            }
                        }}
                        style={{
                            position: 'absolute',
                            top: `${centerY}px`,
                            left: `${centerX}px`,
                            transform: 'translate(-50%, -50%)',
                            width: `${Math.max(50, textareaWidth)}px`,
                            'box-sizing': 'border-box',
                            font: `${fontStyle} ${fontWeight} ${fontSizeVal * scale}px ${fontFamily}`,
                            color: el.strokeColor,
                            background: 'transparent',
                            border: '1px dashed #007acc',
                            outline: 'none',
                            margin: 0,
                            padding: '4px',
                            resize: 'none',
                            overflow: 'hidden',
                            'min-height': '1em',
                            'text-align': textAlign as any
                        }}
                    />
                );
            }}
        </Show>
    );
};

export default TextEditingOverlay;
