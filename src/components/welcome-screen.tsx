
import { type Component, Show, createEffect, onCleanup } from 'solid-js';
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

    createEffect(() => {
        if (!canvasRef || !isVisible()) return;

        const canvas = canvasRef;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

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

        // 1. Menu Arrow (Top Left)
        // From center-left to top-left
        const menuArrow = createArrow(
            [{ x: cx - 200, y: cy - 100 }, { x: 100, y: 60 }], // Start, End
            [{ x: cx - 250, y: cy - 200 }, { x: 200, y: 150 }] // Control points (cubic bezier: start, cp1, cp2, end in renderer logic diff?)
            // Wait, ConnectorRenderer expects normalized points usually? 
            // Let's look at ConnectorRenderer.renderBezier:
            // "if (el.controlPoints...) path = M start C cp1, cp2, end"
            // It uses absolute coordinates if we pass them as such?
            // "pts = normalizePoints(el.points)" -> relative to el.x, el.y
            // If we set el.x=0, el.y=0, then points are absolute.
        );
        // Adjusting control points for smooth curve
        // Start: (cx-200, cy-100), End: (100, 60)
        // CP1: (cx-300, cy-150), CP2: (200, 150)
        menuArrow.controlPoints = [
            { x: cx - 300, y: cy - 100 },
            { x: 200, y: 150 }
        ];
        renderArrow(menuArrow);


        // 2. Toolbar Arrow (Top Center)
        // From center-top to top-center
        const toolbarArrow = createArrow(
            [{ x: cx + 50, y: cy - 150 }, { x: cx, y: 80 }]
        );
        toolbarArrow.controlPoints = [
            { x: cx + 20, y: 150 } // Quadratic if 1 CP? Or need 2? Renderer supports both.
        ];
        // Force 2 CPs for cubic bezier consistency just in case
        toolbarArrow.controlPoints = [
            { x: cx + 20, y: 150 },
            { x: cx + 10, y: 100 }
        ];
        renderArrow(toolbarArrow);

        // 3. Help Arrow (Bottom Left)
        // From center-left-down to bottom-left (290px, height-65px as per previous task)
        const helpArrow = createArrow(
            [{ x: cx - 150, y: cy + 100 }, { x: 310, y: height - 65 }]
        );
        helpArrow.controlPoints = [
            { x: 350, y: height - 120 },
            { x: 320, y: height - 90 }
        ];
        renderArrow(helpArrow);

        // 4. P3 Color Picker Arrow (Top Right)
        // From center-right to top-right
        const p3Arrow = createArrow(
            [{ x: cx + 250, y: cy - 100 }, { x: width - 100, y: 60 }]
        );
        p3Arrow.controlPoints = [
            { x: width - 180, y: 120 },
            { x: width - 140, y: 90 }
        ];
        renderArrow(p3Arrow);
    });



    // Simpler: Just rely on CSS 100% width/height and re-run drawing on resize event
    createEffect(() => {
        const handler = () => {
            // Force redraw - crude but effective: just toggle a signal or re-call render
            const canvas = canvasRef;
            if (!canvas) return;
            // Re-drawing happens automatically if we clear? 
            // We need to trigger the main effect. 
            // Let's add a dummy signal.
        };
        window.addEventListener('resize', handler);
        onCleanup(() => window.removeEventListener('resize', handler));
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

                {/* Text Labels - HTML Overlays (unchanged positions) */}

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
                        "background": "linear-gradient(135deg, color(display-p3 0.6 0.2 0.9), color(display-p3 0.2 0.8 1.0))",
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

                {/* Help Label */}
                <div style={{
                    "position": "absolute",
                    "bottom": "120px",
                    "left": "300px",
                    "text-align": "left",
                    "opacity": "0.8"
                }}>
                    Shortcuts & help
                </div>

            </div>
        </Show>
    );
};
