import type { DrawingElement } from "../types";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { ShapeRegistry } from "../shapes/shape-registry";

/**
 * renderElement - Main entry point for rendering
 * 
 * DEPRECATED: This function is now a thin wrapper around ShapeRegistry.
 * All rendering logic has been migrated to dedicated ShapeRenderer classes.
 */
export const renderElement = (
    rc: RoughCanvas,
    ctx: CanvasRenderingContext2D,
    el: DrawingElement,
    isDarkMode: boolean = false,
    layerOpacity: number = 1
) => {
    // Delegate to the unified ShapeRegistry
    const renderer = ShapeRegistry.getRenderer(el.type);

    if (renderer) {
        renderer.render({ ctx, rc, element: el, isDarkMode, layerOpacity });
    } else {
        // Fallback for unknown shapes (should ideally not happen if registry is complete)
        console.warn(`No renderer found for shape type: ${el.type}`);

        // Minimal visual fallback so it's not invisible
        ctx.save();
        ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity;
        const x = el.x;
        const y = el.y;
        const w = el.width;
        const h = el.height;

        ctx.strokeStyle = el.strokeColor || (isDarkMode ? '#ffffff' : '#000000');
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();

        ctx.fillStyle = el.strokeColor || (isDarkMode ? '#ffffff' : '#000000');
        ctx.font = '10px sans-serif';
        ctx.fillText(el.type, x + 2, y + 12);

        ctx.restore();
    }
};
