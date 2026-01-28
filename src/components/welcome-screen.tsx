
import { type Component, Show, createEffect, onCleanup, createSignal } from 'solid-js';
import { store } from '../store/app-store';
import rough from 'roughjs';
import { renderElement } from '../utils/render-element';
import type { DrawingElement, Point } from '../types';

export const WelcomeScreen: Component = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    // No need to instantiate specific renderer manually

    const isVisible = () =>
        store.elements.length === 0 &&
        store.selectedTool === 'selection' &&
        store.appMode !== 'presentation' &&
        !store.zenMode;

    // Reactive window dimensions
    const [windowSize, setWindowSize] = createSignal({ width: window.innerWidth, height: window.innerHeight });

    createEffect(() => {
        const handler = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handler);
        onCleanup(() => window.removeEventListener('resize', handler));
    });

    createEffect(() => {
        if (!canvasRef || !isVisible()) return;

        const canvas = canvasRef;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = windowSize();
        const isMobile = width < 768; // Mobile breakpoint

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const rc = rough.canvas(canvas);
        const cx = width / 2;
        const cy = height / 2;

        // Common styles for the hint arrows
        const baseStyle: Partial<DrawingElement> = {
            id: 'mock',
            type: 'arrow',
            strokeColor: '#9ca3af', // Mid muted gray (Tailwind gray-400)
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 2,
            strokeStyle: 'dashed',
            roughness: 1.5,
            opacity: 100,
            angle: 0,
            renderStyle: 'sketch', // Hand-drawn style
            seed: 1,
            locked: false,
            link: null,
            layerId: 'layer1',
            roundness: null,
            curveType: 'bezier', // Important for the curved look
            startArrowhead: null,
            endArrowhead: 'arrow',
            strokeLineJoin: 'round',
            width: 0, height: 0, x: 0, y: 0 // Will be ignored or recalculated by renderer usually
        };

        // Helper to create a complete mock element
        const createArrow = (points: Point[], controlPoints?: { x: number, y: number }[]): DrawingElement => {
            return {
                ...baseStyle,
                id: crypto.randomUUID(),
                x: 0, y: 0, width: width, height: height, // Full screen canvas coordinates
                points: points,
                controlPoints: controlPoints
            } as DrawingElement;
        };

        const renderArrow = (element: DrawingElement) => {
            // Use the central rendering engine entry point
            renderElement(
                rc,
                ctx,
                element,
                store.globalSettings.theme === 'dark',
                1 // opacity
            );
        };

        // Don't render complex arrows on very small screens to avoid clutter
        if (!isMobile) {
            // 1. Menu Arrow (Top Left)
            // From center-left to top-left
            const menuArrow = createArrow(
                [{ x: cx - 200, y: cy - 100 }, { x: 100, y: 60 }], // Start, End
                [{ x: cx - 250, y: cy - 200 }, { x: 200, y: 150 }] // CP1, CP2
            );
            renderArrow(menuArrow);

            // 2. Toolbar Arrow (Top Center)
            // From center-top to top-center
            const toolbarArrow = createArrow(
                [{ x: cx + 50, y: cy - 150 }, { x: cx, y: 80 }],
                [{ x: cx + 20, y: 150 }, { x: cx + 10, y: 100 }]
            );
            renderArrow(toolbarArrow);

            // 4. P3 Color Picker Arrow (Top Right)
            const p3Arrow = createArrow(
                [{ x: cx + 250, y: cy - 100 }, { x: width - 100, y: 60 }],
                [{ x: width - 180, y: 120 }, { x: width - 140, y: 90 }]
            );
            renderArrow(p3Arrow);
        }

        // 3. Help Arrow (Bottom Left) - Keep on mobile if space allows, but simplified
        // From center-left-down to bottom-left (290px, height-65px)
        const helpTargetX = isMobile ? 60 : 310; // Connect to bottom-left on mobile too? Or hidden?
        const helpTargetY = height - 65;

        // On mobile, the help button might be hidden or moved? 
        // Assuming sticky UI logic holds, let's keep it but adjust source point.
        // Actually, let's keep it simple: Show Help arrow only if width > 400
        if (width > 400) {
            const helpArrow = createArrow(
                [{ x: cx - 150, y: cy + (isMobile ? 50 : 100) }, { x: helpTargetX, y: helpTargetY }],
                [{ x: cx - (isMobile ? 50 : 200), y: cy + (isMobile ? 100 : 150) }, { x: helpTargetX + 20, y: helpTargetY - 30 }]
            );
            renderArrow(helpArrow);
        }
    });

    return (
        <Show when={isVisible()}>
            <div
                style={{
                    "position": "absolute",
                    "inset": "0",
                    "pointer-events": "none",
                    "z-index": "10",
                    "color": "var(--text-secondary, #6b7280)",
                    "font-family": "Virgil, Segoe UI Emoji, sans-serif",
                    "overflow": "hidden"
                }}
            >
                {/* Canvas Layer for Arrows */}
                <canvas
                    ref={canvasRef}
                    style={{ position: "absolute", top: 0, left: 0, width: '100%', height: '100%' }}
                />

                {/* Text Labels - HTML Overlays */}
                <Show when={windowSize().width > 768}>
                    {/* Menu Label */}
                    <div style={{
                        "position": "absolute",
                        "top": "150px",
                        "left": "120px",
                        "transform": "rotate(-5deg)",
                        "opacity": "0.8"
                    }}>
                        Export, preferences, languages...
                    </div>

                    {/* P3 Picker Label */}
                    <div style={{
                        "position": "absolute",
                        "top": "100px",
                        "right": "150px",
                        "transform": "rotate(-5deg)",
                        "opacity": "0.8",
                        "text-align": "right",
                        "max-width": "150px"
                    }}>
                        New! P3 Color Picker
                    </div>

                    {/* Toolbar Label */}
                    <div style={{
                        "position": "absolute",
                        "top": "20%",
                        "left": "60%",
                        "transform": "rotate(5deg)",
                        "opacity": "0.8",
                        "max-width": "200px"
                    }}>
                        Pick a tool & start drawing!
                    </div>

                    {/* Help Label (Keep hidden on mobile for now as we simplified arrow) */}
                    <div style={{
                        "position": "absolute",
                        "bottom": "120px",
                        "left": "300px",
                        "text-align": "left",
                        "opacity": "0.8"
                    }}>
                        Shortcuts & help
                    </div>
                </Show>

                {/* Logo and Tagline Center */}
                <div style={{
                    "position": "absolute",
                    "top": "45%",
                    "left": "50%",
                    "transform": "translate(-50%, -50%)",
                    "text-align": "center",
                    "display": "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                    "gap": "1rem"
                }}>
                    <h1 style={{
                        "font-size": "5rem",
                        "margin": "0",
                        "background": "linear-gradient(135deg, color(display-p3 0 0.5 1), color(display-p3 1 0.2 0.2))",
                        "-webkit-background-clip": "text",
                        "-webkit-text-fill-color": "transparent",
                        "line-height": "1.2"
                    }}>
                        Yappy
                    </h1>
                    <p style={{ "font-size": "1.2rem", "opacity": "0.7" }}>
                        All your data is saved locally in your browser.
                    </p>

                    <div style={{
                        "margin-top": "3rem",
                        "display": "grid",
                        "grid-template-columns": "auto auto",
                        "gap": "1rem 3rem",
                        "text-align": "left",
                        "font-family": "Inter, sans-serif",
                        "font-size": "0.9rem",
                        "opacity": "0.8"
                    }}>
                        <span>Open</span>
                        <strong>Ctrl+O</strong>

                        <span>Smart Palette</span>
                        <strong>Ctrl+K</strong>

                        <span>Help</span>
                        <strong>?</strong>
                    </div>
                </div>

            </div>
        </Show>
    );
};
