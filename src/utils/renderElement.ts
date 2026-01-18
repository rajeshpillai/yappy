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
    } else if (el.type === 'triangle') {
        const cx = el.x + el.width / 2;
        const points: [number, number][] = [
            [cx, el.y],                         // Top
            [el.x + el.width, el.y + el.height], // Bottom right
            [el.x, el.y + el.height]            // Bottom left
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'hexagon') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        const points: [number, number][] = [];

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2; // Start at top
            points.push([
                cx + rx * Math.cos(angle),
                cy + ry * Math.sin(angle)
            ]);
        }

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'octagon') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        const points: [number, number][] = [];

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 2; // Start at top
            points.push([
                cx + rx * Math.cos(angle),
                cy + ry * Math.sin(angle)
            ]);
        }

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'parallelogram') {
        const offset = el.width * 0.2; // 20% offset for slant
        const points: [number, number][] = [
            [el.x + offset, el.y],               // Top left
            [el.x + el.width, el.y],             // Top right
            [el.x + el.width - offset, el.y + el.height], // Bottom right
            [el.x, el.y + el.height]             // Bottom left
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
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'capsule') {
        const radius = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
        const path = getRoundedRectPath(el.x, el.y, el.width, el.height, radius);

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'stickyNote') {
        const fold = Math.min(Math.abs(el.width), Math.abs(el.height)) * 0.15;
        const x = el.x, y = el.y, w = el.width, h = el.height;

        // Main body polygon (missing the bottom right corner)
        const mainPoints: [number, number][] = [
            [x, y],
            [x + w, y],
            [x + w, y + h - fold],
            [x + w - fold, y + h],
            [x, y + h]
        ];

        // The fold triangle
        const foldPoints: [number, number][] = [
            [x + w, y + h - fold],
            [x + w - fold, y + h - fold],
            [x + w - fold, y + h]
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(mainPoints, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(foldPoints, { ...options, stroke: 'none', fill: backgroundColor, fillStyle: 'solid', opacity: 0.3 });
            }
            ctx.beginPath();
            ctx.moveTo(mainPoints[0][0], mainPoints[0][1]);
            for (let i = 1; i < mainPoints.length; i++) ctx.lineTo(mainPoints[i][0], mainPoints[i][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(foldPoints[0][0], foldPoints[0][1]);
            ctx.lineTo(foldPoints[1][0], foldPoints[1][1]);
            ctx.lineTo(foldPoints[2][0], foldPoints[2][1]);
            ctx.stroke();
        } else {
            rc.polygon(mainPoints, options);
            rc.polygon(foldPoints, { ...options, fillStyle: 'solid', opacity: 0.3 });
        }
    } else if (el.type === 'callout') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const tailHeight = h * 0.2;
        const rectHeight = h - tailHeight;

        const path = `
            M ${x} ${y} 
            L ${x + w} ${y} 
            L ${x + w} ${y + rectHeight} 
            L ${x + w * 0.7} ${y + rectHeight} 
            L ${x + w * 0.5} ${y + h} 
            L ${x + w * 0.3} ${y + rectHeight} 
            L ${x} ${y + rectHeight} 
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'speechBubble') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const r = Math.min(Math.abs(w), Math.abs(h)) * 0.2; // Border radius
        const tailWidth = w * 0.15;
        const tailHeight = h * 0.2;
        const rectHeight = h - tailHeight;

        // Path with rounded corners and a tail
        const rX = Math.min(Math.abs(w) / 2, r);
        const rY = Math.min(Math.abs(rectHeight) / 2, r);

        const path = `
            M ${x + rX} ${y} 
            L ${x + w - rX} ${y} 
            Q ${x + w} ${y} ${x + w} ${y + rY} 
            L ${x + w} ${y + rectHeight - rY} 
            Q ${x + w} ${y + rectHeight} ${x + w - rX} ${y + rectHeight} 
            L ${x + w * 0.3 + tailWidth} ${y + rectHeight}
            L ${x + w * 0.2} ${y + h}
            L ${x + w * 0.3} ${y + rectHeight}
            L ${x + rX} ${y + rectHeight}
            Q ${x} ${y + rectHeight} ${x} ${y + rectHeight - rY} 
            L ${x} ${y + rY} 
            Q ${x} ${y} ${x + rX} ${y} 
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'burst') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const outerRadius = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
        const innerRadius = outerRadius * 0.7;
        const numPoints = 16;
        const points: [number, number][] = [];

        for (let i = 0; i < numPoints * 2; i++) {
            const angle = (Math.PI / numPoints) * i - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            points.push([
                cx + radius * Math.cos(angle),
                cy + radius * Math.sin(angle)
            ]);
        }

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'miter';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'ribbon') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const earWidth = w * 0.15;
        const earHeight = h * 0.3;

        // Main Rect
        const mainPoints: [number, number][] = [
            [x + earWidth, y],
            [x + w - earWidth, y],
            [x + w - earWidth, y + h - earHeight],
            [x + earWidth, y + h - earHeight]
        ];

        // Left ear
        const leftEar: [number, number][] = [
            [x + earWidth, y + earHeight],
            [x, y + earHeight],
            [x + earWidth / 2, y + earHeight + (h - earHeight) / 2],
            [x, y + h],
            [x + earWidth, y + h]
        ];

        // Right ear
        const rightEar: [number, number][] = [
            [x + w - earWidth, y + earHeight],
            [x + w, y + earHeight],
            [x + w - earWidth / 2, y + earHeight + (h - earHeight) / 2],
            [x + w, y + h],
            [x + w - earWidth, y + h]
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(leftEar, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(rightEar, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(mainPoints, { ...options, stroke: 'none', fill: backgroundColor });
            }
            const drawPoly = (pts: [number, number][]) => {
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
                ctx.closePath();
                ctx.stroke();
            };
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            drawPoly(leftEar);
            drawPoly(rightEar);
            drawPoly(mainPoints);
        } else {
            rc.polygon(leftEar, options);
            rc.polygon(rightEar, options);
            rc.polygon(mainPoints, options);
        }
    } else if (el.type === 'bracketLeft' || el.type === 'bracketRight') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const isLeft = el.type === 'bracketLeft';

        const path = isLeft ? `
            M ${x + w} ${y} 
            Q ${x} ${y} ${x} ${y + h / 2}
            Q ${x} ${y + h} ${x + w} ${y + h}
        ` : `
            M ${x} ${y} 
            Q ${x + w} ${y} ${x + w} ${y + h / 2}
            Q ${x + w} ${y + h} ${x} ${y + h}
        `;

        if (el.renderStyle === 'architectural') {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, { ...options, fill: 'none' });
        }
    } else if (el.type === 'database') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const ellipseHeight = h * 0.2;

        // Path for database cylinder
        const path = `
            M ${x} ${y + ellipseHeight / 2}
            L ${x} ${y + h - ellipseHeight / 2}
            A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x + w} ${y + h - ellipseHeight / 2}
            L ${x + w} ${y + ellipseHeight / 2}
            A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x} ${y + ellipseHeight / 2}
            A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x + w} ${y + ellipseHeight / 2}
        `;

        // The top ellipse is a separate path for clearer rendering in sketch style
        const topEllipse = `
            M ${x} ${y + ellipseHeight / 2}
            A ${w / 2} ${ellipseHeight / 2} 0 1 1 ${x + w} ${y + ellipseHeight / 2}
            A ${w / 2} ${ellipseHeight / 2} 0 1 1 ${x} ${y + ellipseHeight / 2}
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
            ctx.stroke(new Path2D(topEllipse));
        } else {
            rc.path(path, options);
            rc.path(topEllipse, options);
        }
    } else if (el.type === 'document') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const waveHeight = h * 0.1;

        // Path for document (rectangle with wavy bottom)
        const path = `
            M ${x} ${y}
            L ${x + w} ${y}
            L ${x + w} ${y + h - waveHeight}
            Q ${x + w * 0.75} ${y + h - waveHeight * 2} ${x + w * 0.5} ${y + h - waveHeight}
            T ${x} ${y + h - waveHeight}
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'predefinedProcess') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const sideBarWidth = w * 0.1;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.rectangle(x, y, w, h, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            ctx.beginPath();
            ctx.moveTo(x + sideBarWidth, y);
            ctx.lineTo(x + sideBarWidth, y + h);
            ctx.moveTo(x + w - sideBarWidth, y);
            ctx.lineTo(x + w - sideBarWidth, y + h);
            ctx.stroke();
        } else {
            rc.rectangle(x, y, w, h, options);
            rc.line(x + sideBarWidth, y, x + sideBarWidth, y + h, options);
            rc.line(x + w - sideBarWidth, y, x + w - sideBarWidth, y + h, options);
        }
    } else if (el.type === 'internalStorage') {
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;
        const lineOffset = Math.min(w, h) * 0.15;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.rectangle(x, y, w, h, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            ctx.beginPath();
            ctx.moveTo(x + lineOffset, y);
            ctx.lineTo(x + lineOffset, y + h);
            ctx.moveTo(x, y + lineOffset);
            ctx.lineTo(x + w, y + lineOffset);
            ctx.stroke();
        } else {
            rc.rectangle(x, y, w, h, options);
            rc.line(x + lineOffset, y, x + lineOffset, y + h, options);
            rc.line(x, y + lineOffset, x + w, y + lineOffset, options);
        }
    } else if (el.type === 'star') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const outerRadius = Math.min(el.width, el.height) / 2;
        const innerRadius = outerRadius * 0.4;
        const points: [number, number][] = [];

        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            points.push([
                cx + radius * Math.cos(angle),
                cy + radius * Math.sin(angle)
            ]);
        }

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'cloud') {
        // Cloud shape using overlapping circles (simplified)
        const cy = el.y + el.height / 2;
        const w = el.width;
        const h = el.height;

        // SVG path for cloud shape
        const r1 = w * 0.2;  // Left circle
        const r2 = w * 0.25; // Top circle
        const r3 = w * 0.2;  // Right circle
        const r4 = w * 0.3;  // Bottom circle

        const path = `
            M ${el.x + r1} ${cy}
            A ${r1} ${r1} 0 0 1 ${el.x + w * 0.3} ${el.y + r2}
            A ${r2} ${r2} 0 0 1 ${el.x + w * 0.7} ${el.y + r2}
            A ${r3} ${r3} 0 0 1 ${el.x + w - r3} ${cy}
            A ${r4} ${r4} 0 0 1 ${el.x + w * 0.6} ${el.y + h - r4 * 0.5}
            A ${r4} ${r4} 0 0 1 ${el.x + w * 0.3} ${el.y + h - r4 * 0.5}
            A ${r4} ${r4} 0 0 1 ${el.x + r1} ${cy}
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'heart') {
        const cx = el.x + el.width / 2;
        const w = el.width;
        const h = el.height;

        // Heart shape using bezier curves
        const path = `
            M ${cx} ${el.y + h * 0.3}
            C ${cx} ${el.y + h * 0.15} ${el.x + w * 0.3} ${el.y} ${el.x + w * 0.5} ${el.y + h * 0.15}
            C ${el.x + w * 0.7} ${el.y} ${el.x + w} ${el.y + h * 0.15} ${el.x + w} ${el.y + h * 0.35}
            C ${el.x + w} ${el.y + h * 0.6} ${cx} ${el.y + h * 0.8} ${cx} ${el.y + h}
            C ${cx} ${el.y + h * 0.8} ${el.x} ${el.y + h * 0.6} ${el.x} ${el.y + h * 0.35}
            C ${el.x} ${el.y + h * 0.15} ${el.x + w * 0.3} ${el.y} ${el.x + w * 0.5} ${el.y + h * 0.15}
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'cross') {
        // X shape using two diagonal lines
        const points1: [number, number][] = [
            [el.x, el.y],
            [el.x + el.width, el.y + el.height]
        ];
        const points2: [number, number][] = [
            [el.x + el.width, el.y],
            [el.x, el.y + el.height]
        ];

        if (el.renderStyle === 'architectural') {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(points1[0][0], points1[0][1]);
            ctx.lineTo(points1[1][0], points1[1][1]);
            ctx.moveTo(points2[0][0], points2[0][1]);
            ctx.lineTo(points2[1][0], points2[1][1]);
            ctx.stroke();
        } else {
            rc.line(points1[0][0], points1[0][1], points1[1][0], points1[1][1], options);
            rc.line(points2[0][0], points2[0][1], points2[1][0], points2[1][1], options);
        }
    } else if (el.type === 'checkmark') {
        // Checkmark shape (✓)
        const cy = el.y + el.height / 2;
        const points: [number, number][] = [
            [el.x + el.width * 0.2, cy],
            [el.x + el.width * 0.4, el.y + el.height * 0.7],
            [el.x + el.width * 0.9, el.y + el.height * 0.2]
        ];

        if (el.renderStyle === 'architectural') {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.stroke();
        } else {
            rc.linearPath(points, options);
        }
    } else if (el.type === 'arrowLeft' || el.type === 'arrowRight' || el.type === 'arrowUp' || el.type === 'arrowDown') {
        // Directional arrow shapes
        let points: [number, number][] = [];
        const arrowHeadSize = Math.min(el.width, el.height) * 0.4;

        if (el.type === 'arrowRight') {
            points = [
                [el.x, el.y + el.height * 0.3],
                [el.x + el.width - arrowHeadSize, el.y + el.height * 0.3],
                [el.x + el.width - arrowHeadSize, el.y],
                [el.x + el.width, el.y + el.height / 2],
                [el.x + el.width - arrowHeadSize, el.y + el.height],
                [el.x + el.width - arrowHeadSize, el.y + el.height * 0.7],
                [el.x, el.y + el.height * 0.7]
            ];
        } else if (el.type === 'arrowLeft') {
            points = [
                [el.x + el.width, el.y + el.height * 0.3],
                [el.x + arrowHeadSize, el.y + el.height * 0.3],
                [el.x + arrowHeadSize, el.y],
                [el.x, el.y + el.height / 2],
                [el.x + arrowHeadSize, el.y + el.height],
                [el.x + arrowHeadSize, el.y + el.height * 0.7],
                [el.x + el.width, el.y + el.height * 0.7]
            ];
        } else if (el.type === 'arrowDown') {
            points = [
                [el.x + el.width * 0.3, el.y],
                [el.x + el.width * 0.3, el.y + el.height - arrowHeadSize],
                [el.x, el.y + el.height - arrowHeadSize],
                [el.x + el.width / 2, el.y + el.height],
                [el.x + el.width, el.y + el.height - arrowHeadSize],
                [el.x + el.width * 0.7, el.y + el.height - arrowHeadSize],
                [el.x + el.width * 0.7, el.y]
            ];
        } else { // arrowUp
            points = [
                [el.x + el.width * 0.3, el.y + el.height],
                [el.x + el.width * 0.3, el.y + arrowHeadSize],
                [el.x, el.y + arrowHeadSize],
                [el.x + el.width / 2, el.y],
                [el.x + el.width, el.y + arrowHeadSize],
                [el.x + el.width * 0.7, el.y + arrowHeadSize],
                [el.x + el.width * 0.7, el.y + el.height]
            ];
        }

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(points, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill();
            }
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'line' || el.type === 'arrow') {
        const endX = el.x + el.width;
        const endY = el.y + el.height;

        if (el.curveType === 'bezier') {
            // Bezier Curve Logic
            const w = el.width;
            const h = el.height;
            let cp1: { x: number; y: number };
            let cp2: { x: number; y: number };

            // Determine Start/End points (handle anti-diagonal lines)
            let start = { x: el.x, y: el.y };
            let end = { x: endX, y: endY };
            if (el.points && el.points.length >= 2) {
                start = { x: el.x + el.points[0].x, y: el.y + el.points[0].y };
                end = { x: el.x + el.points[el.points.length - 1].x, y: el.y + el.points[el.points.length - 1].y };
            }

            if (el.controlPoints && el.controlPoints.length > 0) {
                // Use stored control points
                // For quadratic bezier (one control point), we might need to adapt if we want cubic.
                // But RoughJS uses SVG paths passed as strings.
                // If we have 1 control point, we can duplicate it or use Q command.
                // Let's assume index 0 is the main control point.
                cp1 = el.controlPoints[0];

                // If we have a second control point, use it. Otherwise reuse cp1 for cubic bezier
                // or assume quadratic. Canvas doesn't support 'Q' in path string for RoughJS? 
                // RoughJS supports standard SVG path data.
                if (el.controlPoints.length > 1) {
                    cp2 = el.controlPoints[1];
                    // Cubic Bezier support can be added if needed, but usually filtered by lines 910 check
                    // Assuming fallback to quadratic logic is not needed if length > 1
                    // Wait, the original code had an else block for length > 1? 
                    // No, original code was: if (length > 1) { cp2 = ... } else { ... use Q ... }
                    // So I need to replicate that structure.
                } else {
                    // Quadratic feel using Cubic C command:
                    // CP1 = start + 2/3 * (control - start)
                    // CP2 = end + 2/3 * (control - end)
                    // OR just reuse for simple testing, but might look sharp.
                    // Let's try to use the single control point as a quadratic handle
                    // Since we are building a string "M .. C ..", we need 2 control points for C
                    // or use "Q" command if supported.

                    // Let's use Q command for quadratic bezier if only 1 point
                    const path = `M ${start.x} ${start.y} Q ${cp1.x} ${cp1.y}, ${end.x} ${end.y}`;
                    rc.path(path, options);

                    // Draw arrows and return
                    if (el.startArrowhead) {
                        const angle = Math.atan2(start.y - cp1.y, start.x - cp1.x);
                        drawArrowhead(rc, start.x, start.y, angle, el.startArrowhead, options);
                    }
                    if (el.endArrowhead) {
                        const angle = Math.atan2(end.y - cp1.y, end.x - cp1.x);
                        drawArrowhead(rc, end.x, end.y, angle, el.endArrowhead, options);
                    }
                    return;
                }

            } else {
                // Default Heuristics (existing logic)
                cp1 = { x: start.x, y: start.y };
                cp2 = { x: end.x, y: end.y };

                // Simple heuristic: if width > height, assume horizontal flow
                if (Math.abs(w) > Math.abs(h)) {
                    cp1 = { x: start.x + w / 2, y: start.y };
                    cp2 = { x: end.x - w / 2, y: end.y };
                } else {
                    cp1 = { x: start.x, y: start.y + h / 2 };
                    cp2 = { x: end.x, y: end.y - h / 2 };
                }
            }

            const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
            rc.path(path, options);

            // Start Arrowhead (at p0, angle from cp1 -> p0)
            if (el.startArrowhead) {
                const angle = Math.atan2(start.y - cp1.y, start.x - cp1.x);
                drawArrowhead(rc, start.x, start.y, angle, el.startArrowhead, options);
            }

            // End Arrowhead (at p3, angle from cp2 -> p3)
            if (el.endArrowhead) {
                const angle = Math.atan2(end.y - cp2.y, end.x - cp2.x);
                drawArrowhead(rc, end.x, end.y, angle, el.endArrowhead, options);
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
        const fontWeight = el.fontWeight ? 'bold ' : '';
        const fontStyle = el.fontStyle ? 'italic ' : '';
        ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;

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
    } else if (el.type === 'marker' && el.points && el.points.length > 0) {
        // Marker: Smooth quadratic Bézier curves with thicker strokes
        const absPoints = el.points.map(p => ({ ...p, x: el.x + p.x, y: el.y + p.y }));

        if (absPoints.length < 6) {
            // For very few points, draw a circle
            ctx.beginPath();
            ctx.arc(absPoints[0].x, absPoints[0].y, el.strokeWidth * 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = strokeColor;
            ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity * 0.5;
            ctx.fill();
        } else {
            // Draw smooth quadratic Bézier curves using the midpoint technique
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth * 4; // Significantly thicker for highlighter
            ctx.lineJoin = 'round';
            ctx.lineCap = 'square'; // Chisel tip effect
            ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity * 0.5; // Semi-transparent "highlighter" feel
            ctx.globalCompositeOperation = 'multiply'; // Highlighters darker when they overlap

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
    } else if (el.type === 'server') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            const slotH = h * 0.05;
            const slotW = w * 0.7;
            const slotX = x + (w - slotW) / 2;
            ctx.fillStyle = strokeColor;
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(slotX, y + h - (i + 1) * slotH * 2 - slotH, slotW, slotH);
            }
        } else {
            rc.rectangle(x, y, w, h, options);
            const slotW = w * 0.7;
            const slotH = h * 0.05;
            const slotX = x + (w - slotW) / 2;
            for (let i = 0; i < 3; i++) {
                rc.rectangle(slotX, y + h - (i + 1) * slotH * 2 - slotH, slotW, slotH, { ...options, fillStyle: 'solid', fill: strokeColor });
            }
        }
    } else if (el.type === 'loadBalancer') {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        const w = el.width, h = el.height;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.beginPath();
                ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            const arrowLen = w * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx - arrowLen, cy);
            ctx.lineTo(cx + arrowLen, cy);
            ctx.stroke();
            // Simple architectural arrowheads
            ctx.beginPath();
            ctx.moveTo(cx + arrowLen - 5, cy - 5); ctx.lineTo(cx + arrowLen, cy); ctx.lineTo(cx + arrowLen - 5, cy + 5);
            ctx.moveTo(cx - arrowLen + 5, cy - 5); ctx.lineTo(cx - arrowLen, cy); ctx.lineTo(cx - arrowLen + 5, cy + 5);
            ctx.stroke();
        } else {
            rc.ellipse(cx, cy, w, h, options);
            const arrowLen = w * 0.3;
            rc.line(cx - arrowLen, cy, cx + arrowLen, cy, options);
            drawArrowhead(rc, cx + arrowLen, cy, 0, 'arrow', options);
            drawArrowhead(rc, cx - arrowLen, cy, Math.PI, 'arrow', options);
        }
    } else if (el.type === 'firewall') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            const rows = 4, cols = 3;
            const rowH = h / rows;
            const colW = w / cols;
            ctx.beginPath();
            for (let i = 1; i < rows; i++) {
                ctx.moveTo(x, y + i * rowH); ctx.lineTo(x + w, y + i * rowH);
            }
            for (let i = 0; i < rows; i++) {
                const shift = (i % 2 === 0) ? 0 : colW / 2;
                for (let j = 1; j < cols; j++) {
                    const vx = x + j * colW + shift;
                    if (vx < x + w) {
                        ctx.moveTo(vx, y + i * rowH); ctx.lineTo(vx, y + (i + 1) * rowH);
                    }
                }
            }
            ctx.stroke();
        } else {
            rc.rectangle(x, y, w, h, options);
            const rows = 4, cols = 3;
            const rowH = h / rows;
            const colW = w / cols;
            for (let i = 1; i < rows; i++) {
                rc.line(x, y + i * rowH, x + w, y + i * rowH, options);
            }
            for (let i = 0; i < rows; i++) {
                const shift = (i % 2 === 0) ? 0 : colW / 2;
                for (let j = 1; j < cols; j++) {
                    const vx = x + j * colW + shift;
                    if (vx < x + w) rc.line(vx, y + i * rowH, vx, y + (i + 1) * rowH, options);
                }
            }
        }
    } else if (el.type === 'user') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        const headR = Math.min(w, h) * 0.25;
        const cx = x + w / 2;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.beginPath(); ctx.arc(cx, y + headR, headR, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.beginPath(); ctx.arc(cx, y + headR, headR, 0, Math.PI * 2); ctx.stroke();
            const shoulderW = w * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx - shoulderW / 2, y + h);
            ctx.quadraticCurveTo(cx, y + headR * 1.5, cx + shoulderW / 2, y + h);
            ctx.stroke();
        } else {
            rc.circle(cx, y + headR, headR * 2, options);
            const shoulderW = w * 0.8;
            const path = `M ${cx - shoulderW / 2} ${y + h} Q ${cx} ${y + headR * 1.5} ${cx + shoulderW / 2} ${y + h} Z`;
            rc.path(path, options);
        }
    } else if (el.type === 'messageQueue') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            const segments = 4;
            const segW = w / segments;
            ctx.beginPath();
            for (let i = 1; i < segments; i++) {
                ctx.moveTo(x + i * segW, y); ctx.lineTo(x + i * segW, y + h);
            }
            ctx.stroke();
        } else {
            rc.rectangle(x, y, w, h, options);
            const segments = 4;
            const segW = w / segments;
            for (let i = 1; i < segments; i++) {
                rc.line(x + i * segW, y, x + i * segW, y + h, options);
            }
        }
    } else if (el.type === 'lambda') {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        const w = el.width, h = el.height;
        const zapW = w * 0.4, zapH = h * 0.6;
        const zx = cx - zapW / 2, zy = cy - zapH / 2;
        const zapPath = `M ${zx + zapW} ${zy} L ${zx} ${zy + zapH * 0.6} L ${zx + zapW * 0.6} ${zy + zapH * 0.5} L ${zx} ${zy + zapH} L ${zx + zapW} ${zy + zapH * 0.4} L ${zx + zapW * 0.4} ${zy + zapH * 0.5} Z`;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = strokeColor;
            ctx.fill(new Path2D(zapPath));
        } else {
            rc.ellipse(cx, cy, w, h, options);
            rc.path(zapPath, { ...options, fillStyle: 'solid', fill: strokeColor });
        }
    } else if (el.type === 'router') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        const cx = x + w / 2, cy = y + h / 2;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
            const r = Math.min(w, h) * 0.3;
            ctx.beginPath();
            for (let a = 0; a < 4; a++) {
                const angle = (Math.PI / 2) * a + Math.PI / 4;
                ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
            }
            ctx.stroke();
        } else {
            rc.ellipse(cx, cy, w, h, options);
            const r = Math.min(w, h) * 0.3;
            for (let a = 0; a < 4; a++) {
                const angle = (Math.PI / 2) * a + Math.PI / 4;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                rc.line(cx, cy, px, py, options);
                drawArrowhead(rc, px, py, angle, 'arrow', options);
            }
        }
    } else if (el.type === 'browser') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            const headerH = h * 0.15;
            ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();
            ctx.fillStyle = strokeColor;
            const dotR = headerH * 0.2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(x + headerH * (0.5 + i * 0.6), y + headerH / 2, dotR, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            rc.rectangle(x, y, w, h, options);
            const headerH = h * 0.15;
            rc.line(x, y + headerH, x + w, y + headerH, options);
            const dotR = headerH * 0.3;
            for (let i = 0; i < 3; i++) {
                rc.circle(x + headerH * (0.5 + i * 0.6), y + headerH / 2, dotR, { ...options, fillStyle: 'solid', fill: strokeColor });
            }
        }
    }

    // Render containerText (text inside shapes)
    if (el.containerText && (el.type === 'rectangle' || el.type === 'circle' || el.type === 'diamond' ||
        el.type === 'triangle' || el.type === 'hexagon' || el.type === 'octagon' ||
        el.type === 'parallelogram' || el.type === 'star' || el.type === 'cloud' || el.type === 'heart' ||
        el.type === 'arrowLeft' || el.type === 'arrowRight' || el.type === 'arrowUp' || el.type === 'arrowDown' ||
        el.type === 'capsule' || el.type === 'stickyNote' || el.type === 'callout' ||
        el.type === 'burst' || el.type === 'speechBubble' || el.type === 'ribbon' ||
        el.type === 'bracketLeft' || el.type === 'bracketRight' ||
        el.type === 'database' || el.type === 'document' || el.type === 'predefinedProcess' || el.type === 'internalStorage' ||
        el.type === 'server' || el.type === 'loadBalancer' || el.type === 'firewall' || el.type === 'user' || el.type === 'messageQueue' || el.type === 'lambda' || el.type === 'router' || el.type === 'browser')) {
        const fontSize = el.fontSize || 20;
        const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
            el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                'Handlee, cursive';
        const fontWeight = el.fontWeight ? 'bold ' : '';
        const fontStyle = el.fontStyle ? 'italic ' : '';
        ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
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

        const text = el.containerText!;
        // Wrap text if needed
        const words = text.split(' ');
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
        const fontWeight = el.fontWeight ? 'bold ' : '';
        const fontStyle = el.fontStyle ? 'italic ' : '';
        ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
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
