import type { DrawingElement } from "../../types";
import type { RoughCanvas } from "roughjs/bin/canvas";

/**
 * Context passed to all shape renderers
 */
export interface RenderContext {
    /** Canvas 2D context */
    ctx: CanvasRenderingContext2D;
    /** RoughJS canvas instance */
    rc: RoughCanvas;
    /** The element to render */
    element: DrawingElement;
    /** Dark mode flag for color adjustments */
    isDarkMode: boolean;
    /** Layer opacity multiplier (0-1) */
    layerOpacity: number;
}

/**
 * Common rendering options computed from element properties
 */
export interface RenderOptions {
    strokeColor: string;
    backgroundColor?: string;
    fillStyle: string;
    roughness: number;
    strokeWidth: number;
    strokeLineDash?: number[];
    strokeLineJoin: CanvasLineJoin;
    strokeLineCap: CanvasLineCap;
    hachureGap: number;
    fillWeight?: number;
    seed: number;
    bowing: number;
    fill?: string;
    stroke: string;
}

/**
 * Result of preparing gradient fill
 */
export interface GradientInfo {
    /** The canvas gradient object */
    gradient: CanvasGradient;
    /** Whether gradient was successfully created */
    hasGradient: boolean;
}
