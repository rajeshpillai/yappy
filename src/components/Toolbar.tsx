import { type Component, For } from "solid-js";
import { store, setSelectedTool, addElement } from "../store/appStore";
import type { ElementType } from "../types";
import { MousePointer2, Square, Circle, Minus, Type, MoveUpRight, Eraser, Hand, Image as ImageIcon, Spline, Diamond } from "lucide-solid";
import PenToolGroup from "./PenToolGroup";
import ShapeToolGroup from "./ShapeToolGroup";
import InfraToolGroup from "./InfraToolGroup";
import MathToolGroup from "./MathToolGroup";
import "./Toolbar.css";

// Tools that are NOT pens or grouped shapes
const tools: { type: ElementType | 'selection'; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'pan', icon: Hand, label: 'Pan Tool' },
    { type: 'selection', icon: MousePointer2, label: 'Selection' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'diamond', icon: Diamond, label: 'Diamond' },
    { type: 'arrow', icon: MoveUpRight, label: 'Arrow' },
    { type: 'line', icon: Minus, label: 'Line' },
    { type: 'bezier', icon: Spline, label: 'Bezier Curve' },
    // Pens are grouped in PenToolGroup
    // New shapes are grouped in ShapeToolGroup
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'image', icon: ImageIcon, label: 'Insert Image' },
    { type: 'eraser', icon: Eraser, label: 'Eraser' },
];

const Toolbar: Component = () => {
    let fileInputRef: HTMLInputElement | null = null;

    const handleToolClick = (type: ElementType | 'selection') => {
        if (type === 'image') {
            fileInputRef?.click();
        } else {
            setSelectedTool(type as ElementType);
        }
    };

    const handleImageUpload = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataURL = event.target?.result as string;
            if (dataURL) {
                const img = new Image();
                img.src = dataURL;
                img.onload = () => {
                    // Compression Logic
                    const MAX_DIMENSION = 1500;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        const ratio = width / height;
                        if (width > height) {
                            width = MAX_DIMENSION;
                            height = width / ratio;
                        } else {
                            height = MAX_DIMENSION;
                            width = height * ratio;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataURL = canvas.toDataURL('image/webp', 0.8);

                        const VISUAL_MAX = 500;
                        let visualW = width;
                        let visualH = height;

                        if (visualW > VISUAL_MAX || visualH > VISUAL_MAX) {
                            const ratio = visualW / visualH;
                            if (visualW > visualH) {
                                visualW = VISUAL_MAX;
                                visualH = visualW / ratio;
                            } else {
                                visualH = VISUAL_MAX;
                                visualW = visualH * ratio;
                            }
                        }

                        addElement({
                            id: crypto.randomUUID(),
                            type: 'image',
                            x: 100,
                            y: 100,
                            width: visualW,
                            height: visualH,
                            strokeColor: "transparent",
                            backgroundColor: "transparent",
                            fillStyle: "solid",
                            strokeWidth: 0,
                            strokeStyle: "solid",
                            roughness: 0,
                            opacity: 100,
                            angle: 0,
                            renderStyle: "sketch",
                            seed: Math.floor(Math.random() * 2 ** 31),
                            roundness: null,
                            locked: false,
                            link: null,
                            dataURL: compressedDataURL,
                            mimeType: 'image/webp',
                            layerId: store.activeLayerId
                        });
                    }
                };
            }
        };
        reader.readAsDataURL(file);
        (e.target as HTMLInputElement).value = '';
    };

    // Find indices for inserting grouped tools
    const diamondIndex = tools.findIndex(t => t.type === 'diamond');
    const bezierIndex = tools.findIndex(t => t.type === 'bezier');

    return (
        <div class="toolbar-container">
            <input
                type="file"
                ref={el => fileInputRef = el}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />
            {/* Pan, Selection, Rectangle, Circle, Diamond */}
            <For each={tools.slice(0, diamondIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>

            {/* Shape Tool Group (Triangle, Hexagon, Star, Hearts, Arrows, etc.) */}
            <ShapeToolGroup />

            {/* Infrastructure Tool Group (Server, LB, Cloud, User, etc.) */}
            <InfraToolGroup />

            {/* Geometric & Math Tool Group (Trapezoid, Pentagon, etc.) */}
            <MathToolGroup />

            {/* Arrow, Line, Bezier */}
            <For each={tools.slice(diamondIndex + 1, bezierIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>

            {/* Pen Tool Group (Pencil, Calligraphy, Fine Liner, Ink Brush) */}
            <PenToolGroup />

            {/* Text, Image, Eraser */}
            <For each={tools.slice(bezierIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>
        </div>
    );
};

export default Toolbar;
