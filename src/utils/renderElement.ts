import type { DrawingElement } from "../types";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getImage } from "./imageCache";

export const renderElement = (
    rc: RoughCanvas,
    ctx: CanvasRenderingContext2D,
    el: DrawingElement,
    isDarkMode: boolean = false,
    layerOpacity: number = 1
) => {
    ctx.save();
    ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity;

    // Apply rotation (center based)
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;

    if (el.angle) {
        ctx.translate(cx, cy);
        ctx.rotate(el.angle);
        ctx.translate(-cx, -cy);
    }

    // Color Inversion Helper for Dark Mode
    const adjustColor = (color: string) => {
        if (!isDarkMode) return color;
        if (color === '#000000' || color === 'black') return '#ffffff';
        // Basic inversion for now. Complex colors stay as is.
        return color;
    };

    const strokeColor = adjustColor(el.strokeColor);
    const backgroundColor = el.backgroundColor === 'transparent' ? undefined : adjustColor(el.backgroundColor);
    const fillStyle = el.fillStyle; // Usually 'hachure', 'solid' etc.

    // RoughJS Options
    const options: any = {
        seed: el.seed,
        roughness: el.roughness,
        stroke: strokeColor,
        strokeWidth: el.strokeWidth,
        fill: backgroundColor,
        fillStyle: fillStyle,
        strokeLineDash: el.strokeStyle === 'dashed' ? [10, 10] : (el.strokeStyle === 'dotted' ? [5, 10] : undefined),
    };

    if (el.type === 'rectangle') {
        rc.rectangle(el.x, el.y, el.width, el.height, options);
    } else if (el.type === 'circle') {
        rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width), Math.abs(el.height), options);
    } else if (el.type === 'line' || el.type === 'arrow') {
        const endX = el.x + el.width;
        const endY = el.y + el.height;

        if (el.curveType === 'bezier') {
            // Bezier Curve Logic
            const w = el.width;
            const h = el.height;
            let cp1 = { x: el.x, y: el.y };
            let cp2 = { x: endX, y: endY };

            // Simple heuristic: if width > height, assume horizontal flow
            if (Math.abs(w) > Math.abs(h)) {
                cp1 = { x: el.x + w / 2, y: el.y };
                cp2 = { x: endX - w / 2, y: endY };
            } else {
                cp1 = { x: el.x, y: el.y + h / 2 };
                cp2 = { x: endX, y: endY - h / 2 };
            }

            const path = `M ${el.x} ${el.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endX} ${endY}`;
            rc.path(path, options);

            if (el.type === 'arrow') {
                // Calculate angle for arrowhead based on last control point (cp2)
                const angle = Math.atan2(endY - cp2.y, endX - cp2.x);
                const headLen = 15;
                const p1 = { x: endX - headLen * Math.cos(angle - Math.PI / 6), y: endY - headLen * Math.sin(angle - Math.PI / 6) };
                const p2 = { x: endX - headLen * Math.cos(angle + Math.PI / 6), y: endY - headLen * Math.sin(angle + Math.PI / 6) };

                rc.line(endX, endY, p1.x, p1.y, options);
                rc.line(endX, endY, p2.x, p2.y, options);
            }

        } else {
            // Straight Line (Default)
            rc.line(el.x, el.y, endX, endY, options);

            if (el.type === 'arrow') {
                const angle = Math.atan2(el.height, el.width);
                const headLen = 15;
                const p1 = { x: endX - headLen * Math.cos(angle - Math.PI / 6), y: endY - headLen * Math.sin(angle - Math.PI / 6) };
                const p2 = { x: endX - headLen * Math.cos(angle + Math.PI / 6), y: endY - headLen * Math.sin(angle + Math.PI / 6) };

                rc.line(endX, endY, p1.x, p1.y, options);
                rc.line(endX, endY, p2.x, p2.y, options);
            }
        }
    } else if (el.type === 'pencil' && el.points && el.points.length > 0) {
        const points: [number, number][] = el.points.map(p => [el.x + p.x, el.y + p.y]);
        rc.linearPath(points, options);
    } else if (el.type === 'image' && el.dataURL) {
        const img = getImage(el.dataURL);
        if (img) {
            ctx.drawImage(img, el.x, el.y, el.width, el.height);
        } else {
            // Placeholder while loading?
            ctx.save();
            ctx.fillStyle = "#e5e5e5";
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.fillStyle = "#999";
            ctx.font = "12px sans-serif";
            ctx.fillText("Loading image...", el.x + 10, el.y + 20);
            ctx.restore();
        }
    } else if (el.type === 'text' && el.text) {
        // We do NOT check editingId here. Callsite should handle exclusion if needed.
        // Actually, for export we want to render text always.
        // For Canvas redraw, we skip if editing. 
        // We will pass an "isEditing" flag? Or just render and let Canvas overlay hide it?
        // Canvas overlay is a textarea on TOP of canvas.
        // But usually we hide the canvas text while editing to avoid ghosting.
        // For now, I'll just render text. Canvas.tsx can control calling this.

        const fontSize = el.fontSize || 20;
        ctx.font = `${fontSize}px sans-serif`;

        // Text Stretching logic
        const metrics = ctx.measureText(el.text);
        const actualWidth = metrics.width;
        const scaleX = (el.width && actualWidth) ? (el.width / actualWidth) : 1;

        ctx.fillStyle = strokeColor;

        if (scaleX !== 1) {
            ctx.save();
            ctx.translate(el.x, el.y);
            ctx.scale(scaleX, 1);
            ctx.fillText(el.text, 0, fontSize);
            ctx.restore();
        } else {
            ctx.fillText(el.text, el.x, el.y + fontSize);
        }
    }

    ctx.restore();
};
