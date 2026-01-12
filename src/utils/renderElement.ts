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

    // Helper to draw arrowheads
    const drawArrowhead = (rc: any, x: number, y: number, angle: number, type: string, options: any) => {
        const headLen = 15;
        if (type === 'arrow') {
            const p1 = { x: x - headLen * Math.cos(angle - Math.PI / 6), y: y - headLen * Math.sin(angle - Math.PI / 6) };
            const p2 = { x: x - headLen * Math.cos(angle + Math.PI / 6), y: y - headLen * Math.sin(angle + Math.PI / 6) };
            rc.line(x, y, p1.x, p1.y, options);
            rc.line(x, y, p2.x, p2.y, options);
        } else if (type === 'triangle') {
            const p1 = { x: x - headLen * Math.cos(angle - Math.PI / 6), y: y - headLen * Math.sin(angle - Math.PI / 6) };
            const p2 = { x: x - headLen * Math.cos(angle + Math.PI / 6), y: y - headLen * Math.sin(angle + Math.PI / 6) };
            rc.polygon([[x, y], [p1.x, p1.y], [p2.x, p2.y]], { ...options, fill: options.stroke, fillStyle: 'solid' });
        } else if (type === 'dot') {
            rc.circle(x - (headLen / 2) * Math.cos(angle), y - (headLen / 2) * Math.sin(angle), headLen, { ...options, fill: options.stroke, fillStyle: 'solid' });
        }
    };

    if (el.type === 'rectangle') {
        rc.rectangle(el.x, el.y, el.width, el.height, options);
    } else if (el.type === 'circle') {
        rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width), Math.abs(el.height), options);
    } else if (el.type === 'diamond') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        rc.polygon([
            [cx, el.y],
            [el.x + el.width, cy],
            [cx, el.y + el.height],
            [el.x, cy]
        ], options);
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

            // Start Arrowhead (at p0, angle from cp1 -> p0)
            if (el.startArrowhead) {
                const angle = Math.atan2(el.y - cp1.y, el.x - cp1.x);
                drawArrowhead(rc, el.x, el.y, angle, el.startArrowhead, options);
            }

            // End Arrowhead (at p3, angle from cp2 -> p3)
            if (el.endArrowhead) {
                const angle = Math.atan2(endY - cp2.y, endX - cp2.x);
                drawArrowhead(rc, endX, endY, angle, el.endArrowhead, options);
            }

        } else if (el.curveType === 'elbow') {
            const drawPoints: [number, number][] = (el.points && el.points.length > 0)
                ? el.points.map(p => [el.x + p.x, el.y + p.y])
                : [[el.x, el.y], [endX, endY]];

            rc.linearPath(drawPoints, options);

            if (el.startArrowhead && drawPoints.length >= 2) {
                const p0 = drawPoints[0];
                const p1 = drawPoints[1];
                const angle = Math.atan2(p0[1] - p1[1], p0[0] - p1[0]);
                drawArrowhead(rc, p0[0], p0[1], angle, el.startArrowhead, options);
            }

            if (el.endArrowhead && drawPoints.length >= 2) {
                const pn = drawPoints[drawPoints.length - 1];
                const pn_1 = drawPoints[drawPoints.length - 2];
                const angle = Math.atan2(pn[1] - pn_1[1], pn[0] - pn_1[0]);
                drawArrowhead(rc, pn[0], pn[1], angle, el.endArrowhead, options);
            }

        } else {
            // Straight Line (Default)
            rc.line(el.x, el.y, endX, endY, options);

            const angle = Math.atan2(el.height, el.width);

            // Start Arrowhead (at start, pointing backwards)
            if (el.startArrowhead) {
                drawArrowhead(rc, el.x, el.y, angle + Math.PI, el.startArrowhead, options);
            }

            // End Arrowhead
            if (el.endArrowhead) {
                drawArrowhead(rc, endX, endY, angle, el.endArrowhead, options);
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
        const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
            el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                'Handlee, cursive';
        ctx.font = `${fontSize}px ${fontFamily}`;

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

    // Render containerText (text inside shapes)
    if (el.containerText && (el.type === 'rectangle' || el.type === 'circle' || el.type === 'diamond')) {
        const fontSize = el.fontSize || 20;
        const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
            el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                'Handlee, cursive';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate available width for text (with padding)
        const padding = 10;
        let maxWidth = el.width - padding * 2;

        // Adjust for circles and diamonds (inscribed area is smaller)
        if (el.type === 'circle' || el.type === 'diamond') {
            maxWidth = maxWidth * 0.7; // ~70% for inscribed square
        }

        // Wrap text if needed
        const words = el.containerText.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Render lines centered
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const centerX = el.x + el.width / 2;
        const startY = el.y + (el.height - totalHeight) / 2 + lineHeight / 2;

        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            ctx.fillText(line, centerX, y, maxWidth);
        });

        // Reset text alignment
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    // Render containerText for lines and arrows (at midpoint)
    if (el.containerText && (el.type === 'line' || el.type === 'arrow')) {
        const fontSize = el.fontSize || 16;
        const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
            el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                'Handlee, cursive';
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate position based on labelPosition (default: middle)
        const startX = el.x;
        const startY = el.y;
        const endX = el.x + el.width;
        const endY = el.y + el.height;

        const position = el.labelPosition || 'middle'; // Default to middle for backward compatibility
        let labelX: number, labelY: number;

        switch (position) {
            case 'start':
                labelX = startX;
                labelY = startY;
                break;
            case 'end':
                labelX = endX;
                labelY = endY;
                break;
            case 'middle':
            default:
                labelX = (startX + endX) / 2;
                labelY = (startY + endY) / 2;
                break;
        }

        // Add background for better readability
        const metrics = ctx.measureText(el.containerText);
        const padding = 4;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = fontSize + padding * 2;

        ctx.save();
        ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(labelX - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight);
        ctx.restore();

        // Render text
        ctx.fillStyle = strokeColor;
        ctx.fillText(el.containerText, labelX, labelY);

        // Reset text alignment
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
};
