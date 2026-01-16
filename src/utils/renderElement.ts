import type { DrawingElement } from "../types";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getImage } from "./imageCache";
import { pointsToSvgPath } from "./pencilOptimizer";

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
        // For architectural style, we want straight lines without randomness
        roughness: el.renderStyle === 'architectural' ? 0 : el.roughness,
        bowing: el.renderStyle === 'architectural' ? 0 : 1, // Minimize bowing for archi style
        stroke: strokeColor,
        strokeWidth: el.strokeWidth,
        fill: backgroundColor,
        fillStyle: fillStyle,
        strokeLineDash: el.strokeStyle === 'dashed' ? [10, 10] : (el.strokeStyle === 'dotted' ? [5, 10] : undefined),
        strokeLineJoin: 'round',
        strokeLineCap: 'round',
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


    // Helper to generate rounded rectangle path
    const getRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
        const rX = Math.min(Math.abs(w) / 2, r);
        const rY = Math.min(Math.abs(h) / 2, r);
        // Ensure positive width/height for path generation (handle negative w/h by swapping if needed, 
        // but typically we draw from top-left. Let's assume normalized x,y,w,h or handle sign)
        // For simplicity, we assume normalized input or rely on M/L commands handling it.
        // But arc commands in SVG are sensitive.
        // Let's rely on standard "rect with corner radius" logic.
        return `M ${x + rX} ${y} L ${x + w - rX} ${y} Q ${x + w} ${y} ${x + w} ${y + rY} L ${x + w} ${y + h - rY} Q ${x + w} ${y + h} ${x + w - rX} ${y + h} L ${x + rX} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rY} L ${x} ${y + rY} Q ${x} ${y} ${x + rX} ${y}`;
    };

    // Helper to generate rounded diamond path
    const getRoundedDiamondPath = (x: number, y: number, w: number, h: number, r: number) => {
        const w2 = w / 2;
        const h2 = h / 2;
        const cx = x + w2;
        const cy = y + h2;

        // Corner radius needs to be scaled relative to side lengths
        // Simple approach: shrink the diamond vertices towards center and use quadratic curves
        // Vertex 0: Top (cx, y)
        // Vertex 1: Right (x+w, cy)
        // Vertex 2: Bottom (cx, y+h)
        // Vertex 3: Left (x, cy)

        // A diamond is just a polygon. To round it, we cut the corners.
        // The "radius" effectively shortens the side.
        const len = Math.hypot(w2, h2);
        const validR = Math.min(r, len / 2);
        const ratio = validR / len;

        const dx = w2 * ratio;
        const dy = h2 * ratio;

        // Top Corner
        const p1 = { x: cx - dx, y: y + dy }; // Left of Top
        const p2 = { x: cx + dx, y: y + dy }; // Right of Top

        // Right Corner
        const p3 = { x: x + w - dx, y: cy - dy }; // Top of Right
        const p4 = { x: x + w - dx, y: cy + dy }; // Bottom of Right

        // Bottom Corner
        const p5 = { x: cx + dx, y: y + h - dy }; // Right of Bottom
        const p6 = { x: cx - dx, y: y + h - dy }; // Left of Bottom

        // Left Corner
        const p7 = { x: x + dx, y: cy + dy }; // Bottom of Left
        const p8 = { x: x + dx, y: cy - dy }; // Top of Left

        return `M ${p1.x} ${p1.y} Q ${cx} ${y} ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Q ${x + w} ${cy} ${p4.x} ${p4.y} L ${p5.x} ${p5.y} Q ${cx} ${y + h} ${p6.x} ${p6.y} L ${p7.x} ${p7.y} Q ${x} ${cy} ${p8.x} ${p8.y} Z`;
    };

    if (el.type === 'rectangle') {
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                // Fill using RoughJS (sketchy fill) but no stroke
                // 'none' or transparent stroke ensures only fill is drawn
                rc.rectangle(el.x, el.y, el.width, el.height, { ...options, stroke: 'none', fill: backgroundColor });
            }
            // Outline using native Canvas (perfect straight lines)
            ctx.beginPath();
            ctx.rect(el.x, el.y, el.width, el.height);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round'; // Ensure smooth corners
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Sketch Style
            // Check for roundness
            if (el.roundness) {
                const radius = Math.min(Math.abs(el.width), Math.abs(el.height)) * 0.15; // 15% roundness
                const path = getRoundedRectPath(el.x, el.y, el.width, el.height, radius);
                rc.path(path, options);
            } else {
                rc.rectangle(el.x, el.y, el.width, el.height, options);
            }
        }
    } else if (el.type === 'circle') {
        if (el.renderStyle === 'architectural') {
            const rx = Math.abs(el.width) / 2;
            const ry = Math.abs(el.height) / 2;
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;

            if (backgroundColor) {
                rc.ellipse(cx, cy, Math.abs(el.width), Math.abs(el.height), { ...options, stroke: 'none', fill: backgroundColor });
            }

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();
        } else {
            // Circles are already round!
            rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width), Math.abs(el.height), options);
        }
    } else if (el.type === 'diamond') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const points: [number, number][] = [
            [cx, el.y],
            [el.x + el.width, cy],
            [cx, el.y + el.height],
            [el.x, cy]
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.lineTo(points[3][0], points[3][1]);
            ctx.closePath();

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Sketch Style
            if (el.roundness) {
                const radius = Math.min(Math.abs(el.width), Math.abs(el.height)) * 0.2; // 20% roundness for diamond
                const path = getRoundedDiamondPath(el.x, el.y, el.width, el.height, radius);
                rc.path(path, options);
            } else {
                rc.polygon(points, options);
            }
        }
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
            // Use points if available (allows for flipped lines), otherwise use width/height
            if (el.points && el.points.length >= 2) {
                const pStart = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
                const pEnd = { x: el.x + el.points[el.points.length - 1].x, y: el.y + el.points[el.points.length - 1].y };

                rc.line(pStart.x, pStart.y, pEnd.x, pEnd.y, options);

                const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);

                // Start Arrowhead
                if (el.startArrowhead) {
                    drawArrowhead(rc, pStart.x, pStart.y, angle + Math.PI, el.startArrowhead, options);
                }

                // End Arrowhead
                if (el.endArrowhead) {
                    drawArrowhead(rc, pEnd.x, pEnd.y, angle, el.endArrowhead, options);
                }
            } else {
                // Fallback (Simple Unidirectional)
                rc.line(el.x, el.y, endX, endY, options);

                const angle = Math.atan2(el.height, el.width);

                // Start Arrowhead
                if (el.startArrowhead) {
                    drawArrowhead(rc, el.x, el.y, angle + Math.PI, el.startArrowhead, options);
                }

                // End Arrowhead
                if (el.endArrowhead) {
                    drawArrowhead(rc, endX, endY, angle, el.endArrowhead, options);
                }
            }
        }
    } else if (el.type === 'pencil' && el.points && el.points.length > 0) {
        // Use average pressure to scale stroke width if available
        let finalOptions = { ...options };
        const hasPressure = el.points.some(p => p.p !== undefined && p.p > 0);
        if (hasPressure) {
            const avgPressure = el.points.reduce((acc, p) => acc + (p.p || 0.5), 0) / el.points.length;
            finalOptions.strokeWidth = el.strokeWidth * (0.5 + avgPressure); // Scale from 0.5x to 1.5x
        }

        // Generate smooth SVG path from absolute world points to avoid offset
        const absPoints = el.points.map(p => ({ ...p, x: el.x + p.x, y: el.y + p.y }));
        const pathData = pointsToSvgPath(absPoints);
        if (pathData) {
            rc.path(pathData, finalOptions);
        } else {
            // Fallback for very few points
            const points: [number, number][] = el.points.map(p => [el.x + p.x, el.y + p.y]);
            rc.linearPath(points, finalOptions);
        }
    } else if (el.type === 'calligraphy' && el.points && el.points.length > 0) {
        // Calligraphy: Draw with variable stroke width based on per-point pressure
        const absPoints = el.points.map(p => ({ ...p, x: el.x + p.x, y: el.y + p.y }));

        if (absPoints.length < 2) {
            // Single dot
            ctx.beginPath();
            ctx.arc(absPoints[0].x, absPoints[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
        } else {
            // Draw variable-width stroke using filled circles along the path
            ctx.fillStyle = strokeColor;
            ctx.beginPath();

            const minWidth = el.strokeWidth * 0.3;
            const maxWidth = el.strokeWidth * 1.5;

            for (let i = 0; i < absPoints.length; i++) {
                const p = absPoints[i];
                const pressure = p.p ?? 0.5;
                const width = minWidth + (maxWidth - minWidth) * pressure;

                ctx.moveTo(p.x + width / 2, p.y);
                ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
            }

            ctx.fill();

            // Also draw the smooth path for continuity
            const pathData = pointsToSvgPath(absPoints);
            if (pathData) {
                const avgPressure = absPoints.reduce((acc, p) => acc + (p.p || 0.5), 0) / absPoints.length;
                const avgWidth = minWidth + (maxWidth - minWidth) * avgPressure;
                rc.path(pathData, { ...options, strokeWidth: avgWidth * 0.8 });
            }
        }
    } else if (el.type === 'fineliner' && el.points && el.points.length > 0) {
        // Fine liner: Smooth quadratic Bézier curves with round caps
        const absPoints = el.points.map(p => ({ ...p, x: el.x + p.x, y: el.y + p.y }));

        if (absPoints.length < 6) {
            // For very few points, draw a circle
            ctx.beginPath();
            ctx.arc(absPoints[0].x, absPoints[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = strokeColor;
            ctx.fill();
        } else {
            // Draw smooth quadratic Bézier curves using the midpoint technique
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(absPoints[0].x, absPoints[0].y);

            // Draw quadratic curves using midpoints as control points
            for (let i = 1; i < absPoints.length - 2; i++) {
                const midX = (absPoints[i].x + absPoints[i + 1].x) / 2;
                const midY = (absPoints[i].y + absPoints[i + 1].y) / 2;
                ctx.quadraticCurveTo(absPoints[i].x, absPoints[i].y, midX, midY);
            }

            // Connect to the last two points
            const lastIdx = absPoints.length - 1;
            ctx.quadraticCurveTo(
                absPoints[lastIdx - 1].x, absPoints[lastIdx - 1].y,
                absPoints[lastIdx].x, absPoints[lastIdx].y
            );

            ctx.stroke();
            ctx.restore();
        }
    } else if (el.type === 'inkbrush' && el.points && el.points.length > 0) {
        // Ink Brush: Smooth cubic Bézier curves with shadow blur for ink effect
        const absPoints = el.points.map(p => ({ ...p, x: el.x + p.x, y: el.y + p.y }));

        if (absPoints.length < 4) {
            // For very few points, draw a filled circle
            ctx.beginPath();
            ctx.arc(absPoints[0].x, absPoints[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = strokeColor;
            ctx.fill();
        } else {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = el.strokeWidth * 0.5;

            ctx.beginPath();
            ctx.moveTo(absPoints[0].x, absPoints[0].y);

            // Draw cubic Bézier curves using pairs of control points
            let i = 1;
            while (i < absPoints.length - 2) {
                const cp1 = absPoints[i];
                const cp2 = absPoints[i + 1];
                const end = absPoints[i + 2];

                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
                i += 3;
            }

            // Handle remaining points with quadratic or lineTo
            while (i < absPoints.length) {
                if (i === absPoints.length - 2) {
                    // Two points left - quadratic
                    const cp = absPoints[i];
                    const end = absPoints[i + 1];
                    ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
                    i += 2;
                } else {
                    // One point left - lineTo
                    ctx.lineTo(absPoints[i].x, absPoints[i].y);
                    i++;
                }
            }

            ctx.stroke();
            ctx.restore();
        }
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

        const startX = el.x;
        const startY = el.y;
        const endX = el.x + el.width;
        const endY = el.y + el.height;

        const position = el.labelPosition || 'middle';
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
