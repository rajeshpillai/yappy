import { type Component, For, createSignal, onMount, onCleanup } from "solid-js";
import { store, setSelectedTool, addElement, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import { MousePointer2, Square, Circle, Minus, Type, MoveUpRight, Eraser, Hand, Image as ImageIcon, Activity, Diamond, CaseUpper, Zap, Highlighter } from "lucide-solid";
import { generateBlockText } from "../utils/block-alphabet";
import PenToolGroup from "./pen-tool-group";
import ShapeToolGroup from "./shape-tool-group";
import SketchnoteToolGroup from "./sketchnote-tool-group";
import InfraToolGroup from "./infra-tool-group";
import MathToolGroup from "./math-tool-group";
import WireframeToolGroup from "./wireframe-tool-group";
import MindmapToolGroup from "./mindmap-tool-group";
import TechnicalToolGroup from "./technical-tool-group";
import UmlToolGroup from "./uml-tool-group";
import PeopleToolGroup from "./people-tool-group";
import StatusToolGroup from "./status-tool-group";
import CloudInfraToolGroup from "./cloud-infra-tool-group";
import "./toolbar.css";

// Tools that are NOT pens or grouped shapes
const tools: { type: ElementType | 'selection' | 'block-text'; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'pan', icon: Hand, label: 'Pan Tool (H)' },
    { type: 'selection', icon: MousePointer2, label: 'Selection (V or 1)' },
    { type: 'rectangle', icon: Square, label: 'Rectangle (R or 2)' },
    { type: 'circle', icon: Circle, label: 'Circle (O or 3)' },
    { type: 'diamond', icon: Diamond, label: 'Diamond (D)' },
    { type: 'arrow', icon: MoveUpRight, label: 'Arrow (A or 5)' },
    { type: 'line', icon: Minus, label: 'Line (L or 4)' },
    { type: 'bezier', icon: Activity, label: 'Bezier Curve (B or 0)' },
    // Pens are grouped in PenToolGroup
    // New shapes are grouped in ShapeToolGroup
    { type: 'text', icon: Type, label: 'Text (T or 6)' },
    { type: 'block-text', icon: CaseUpper, label: 'Block Text (Sketchnote)' },
    { type: 'image', icon: ImageIcon, label: 'Insert Image (I or 9)' },
    { type: 'eraser', icon: Eraser, label: 'Eraser (E or 7)' },
    { type: 'laser', icon: Zap, label: 'Laser Pointer (Shift+P)' },
    { type: 'ink', icon: Highlighter, label: 'Ink Overlay (Alt+I)' },
];

const Toolbar: Component = () => {
    let fileInputRef: HTMLInputElement | null = null;
    const [position, setPosition] = createSignal({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = createSignal(false);
    const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });

    const onMouseDown = (e: MouseEvent) => {
        // Drag if clicked on the container's padding or gaps, or the handle itself
        const target = e.target as HTMLElement;
        if (target.classList.contains('toolbar-container') || target.closest('.drag-handle')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position().x,
                y: e.clientY - position().y
            });
            e.preventDefault();
        }
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging()) return;
        setPosition({
            x: e.clientX - dragStart().x,
            y: e.clientY - dragStart().y
        });
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    onMount(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        onCleanup(() => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        });
    });

    const handleToolClick = (type: ElementType | 'selection' | 'block-text') => {
        if (type === 'image') {
            fileInputRef?.click();
        } else if (type === 'block-text') {
            const text = prompt("Enter text to generate (A-Z):");
            if (text) {
                // Determine center of view
                const cx = (window.innerWidth / 2) - store.viewState.panX;
                const cy = (window.innerHeight / 2) - store.viewState.panY;

                const newElements = generateBlockText(
                    text,
                    cx - (text.length * 30), // Simple centering offset
                    cy,
                    80, // fontSize
                    '#000000'
                );

                // Batch add
                setStore('elements', [...store.elements, ...newElements]);

                // Select them
                setStore('selection', newElements.map(e => e.id));

                setSelectedTool('selection');
            }
        } else {
            setSelectedTool(type as ElementType);
        }
    };

    const handleRightClick = (e: MouseEvent) => {
        e.preventDefault();
        setStore("showPropertyPanel", true);
        setStore("isPropertyPanelMinimized", false);
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
        <div
            class="toolbar-container"
            classList={{ dragging: isDragging() }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={onMouseDown}
            style={{
                transform: `translateX(-50%) translate(${position().x}px, ${position().y}px)`
            }}
        >
            <div class="drag-handle" title="Drag to move toolbar">
                <div class="drag-dots"></div>
            </div>
            <input
                type="file"
                ref={el => fileInputRef = el}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />
            {/* Pan, Selection */}
            <For each={tools.slice(0, 2)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        onContextMenu={handleRightClick}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>

            {/* Pen Tool Group (Pencil, Calligraphy, Fine Liner, Ink Brush) */}
            <PenToolGroup />

            {/* Rectangle, Circle, Diamond */}
            <For each={tools.slice(2, diamondIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        onContextMenu={handleRightClick}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>

            {/* Shape Tool Group (Triangle, Hexagon, Star, Hearts, Arrows, etc.) */}
            <ShapeToolGroup />

            {/* Mindmap Tool Group (Organic Branch, Central Topic) */}
            <MindmapToolGroup />

            {/* Sketchnote Essentials Group (Star Person, Scroll, Divider, Banner) */}
            <SketchnoteToolGroup />

            {/* People & Expressions Group (Stick Figure, Faces, Hands) */}
            <PeopleToolGroup />

            {/* Status & Annotation Group (Checkbox, Badge, Tag, Pin, etc.) */}
            <StatusToolGroup />

            {/* Cloud & Container Infrastructure (Kubernetes, Container, API Gateway, etc.) */}
            <CloudInfraToolGroup />

            {/* Infrastructure Tool Group (Server, LB, Cloud, User, etc.) */}
            <InfraToolGroup />

            {/* Wireframing Essentials (Browser Window, Mobile, Input, Button) */}
            <WireframeToolGroup />

            {/* Geometric & Math Tool Group (Trapezoid, Pentagon, etc.) */}
            <MathToolGroup />

            {/* Technical Diagramming Group (DFD, Isometric Cube, Cylinder) */}
            <TechnicalToolGroup />

            {/* UML Tool Group (Class, Actor, UseCase) */}
            <UmlToolGroup />

            {/* Arrow, Line, Bezier */}
            <For each={tools.slice(diamondIndex + 1, bezierIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        onContextMenu={handleRightClick}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                    </button>
                )}
            </For>


            {/* Text, Image, Eraser */}
            <For each={tools.slice(bezierIndex + 1)}>
                {(tool) => (
                    <button
                        class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                        onClick={() => handleToolClick(tool.type)}
                        onContextMenu={handleRightClick}
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
