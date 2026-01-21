import type { DrawingElement } from "../types";

export interface TextMetrics {
    textWidth: number;
    textHeight: number;
    lines: string[];
    lineHeight: number;
}

export const getFontString = (el: Partial<DrawingElement>) => {
    const fontSize = el.fontSize || 20;
    const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
        el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
            'Handlee, cursive';
    const fontWeight = el.fontWeight ? 'bold ' : '';
    const fontStyle = el.fontStyle ? 'italic ' : '';
    return `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
};

export const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        if (!word) continue;
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
    return lines;
};

export const measureContainerText = (
    ctx: CanvasRenderingContext2D,
    el: Partial<DrawingElement>,
    text: string,
    availableWidth: number
): TextMetrics => {
    const fontSize = el.fontSize || 20;
    ctx.save();
    ctx.font = getFontString(el);

    // For shapes that are inefficient with space (circle, diamond), 
    // we use a smaller inscribed area for wrapping
    let wrapWidth = availableWidth;
    if (el.type === 'circle' || el.type === 'diamond') {
        wrapWidth = availableWidth * 0.707; // sqrt(2)/2 approx
    } else if (el.type === 'doubleBanner') {
        wrapWidth = availableWidth * 0.65; // Stay within the front panel
    } else if (el.type === 'lightbulb') {
        wrapWidth = availableWidth * 0.7; // In bulb
    } else if (el.type === 'signpost') {
        wrapWidth = availableWidth * 0.8; // On board
    } else if (el.type === 'burstBlob') {
        wrapWidth = availableWidth * 0.6; // Inner radius
    }

    const lines = wrapText(ctx, text, wrapWidth);
    const lineHeight = fontSize * 1.2;

    let maxLineWidth = 0;
    lines.forEach(line => {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
    });

    ctx.restore();

    return {
        textWidth: maxLineWidth,
        textHeight: lines.length * lineHeight,
        lines,
        lineHeight
    };
};

export const fitShapeToText = (
    ctx: CanvasRenderingContext2D,
    el: Partial<DrawingElement>,
    text: string
): { width: number, height: number } => {
    if (!text || text.trim() === '') {
        return { width: el.width || 100, height: el.height || 60 };
    }

    const padding = 32;
    const fontSize = el.fontSize || 20;
    const charCount = text.length;

    // Heuristic for initial width guess
    // We want a roughly 2:1 or 3:2 aspect ratio for long text
    const estWidth = Math.sqrt(charCount * fontSize * fontSize * 1.5);
    let targetWrapWidth = Math.max(60, Math.min(500, estWidth));

    let metrics = measureContainerText(ctx, el, text, targetWrapWidth);

    const scaleFactor = (el.type === 'circle' || el.type === 'diamond') ? 0.707 :
        (el.type === 'doubleBanner' ? 0.65 :
            (el.type === 'lightbulb' ? 0.7 :
                (el.type === 'signpost' ? 0.8 :
                    (el.type === 'burstBlob' ? 0.6 : 1))));

    let finalWidth = (metrics.textWidth / scaleFactor) + padding;
    let finalHeight = (metrics.textHeight / scaleFactor) + padding;

    if (el.type === 'circle' || el.type === 'diamond') {
        const size = Math.max(finalWidth, finalHeight);
        return { width: size, height: size };
    }

    // Parallelogram and Trapezoid extra breathing room for the slants
    if (el.type === 'parallelogram' || el.type === 'trapezoid') {
        finalWidth += 40;
    }

    return { width: finalWidth, height: finalHeight };
};
