import type { DrawingElement } from "../types";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { getShapeGeometry } from "./shapeGeometry";
import { getImage } from "./imageCache";
import { measureContainerText, getFontString } from "./textUtils";

// Helper to normalize points (supports both old Point[] and new packed number[])
export const normalizePoints = (points: any[] | number[] | undefined): { x: number; y: number }[] => {
    if (!points || points.length === 0) return [];
    if (typeof points[0] === 'number') {
        // New format: [x1, y1, x2, y2...]
        const result: { x: number; y: number }[] = [];
        for (let i = 0; i < points.length - 1; i += 2) {
            result.push({ x: points[i] as number, y: points[i + 1] as number });
        }
        return result;
    }
    // Old format: Point[]
    return points as { x: number; y: number }[];
};

// Helper: Calculate cubic bezier point at t
const cubicBezier = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const k = 1 - t;
    return k * k * k * p0 + 3 * k * k * t * p1 + 3 * k * t * t * p2 + t * t * t * p3;
};

// Helper: Calculate cubic bezier tangent angle at t
const cubicBezierAngle = (p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, t: number) => {
    const dx = 3 * (1 - t) * (1 - t) * (p1.x - p0.x) + 6 * (1 - t) * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    const dy = 3 * (1 - t) * (1 - t) * (p1.y - p0.y) + 6 * (1 - t) * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    return Math.atan2(dy, dx);
};

const drawOrganicBranch = (
    ctx: CanvasRenderingContext2D,
    start: { x: number, y: number },
    end: { x: number, y: number },
    cp1: { x: number, y: number },
    cp2: { x: number, y: number },
    color: string,
    width: number,
    text: string = "",
    textColor: string = "#000000",
    font: string = "16px sans-serif"
) => {
    const segments = 20;
    const pointsTop: { x: number, y: number }[] = [];
    const pointsBottom: { x: number, y: number }[] = [];

    // Tapering: Start thick, end thin
    const startWidth = Math.max(width * 8, 4);
    const endWidth = Math.max(width * 2, 2);

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = cubicBezier(start.x, cp1.x, cp2.x, end.x, t);
        const y = cubicBezier(start.y, cp1.y, cp2.y, end.y, t);

        const angle = cubicBezierAngle(start, cp1, cp2, end, t);

        // Linear interpolation of width
        const currentWidth = startWidth + (endWidth - startWidth) * t;
        const halfWidth = currentWidth / 2;

        // Calculate offset points (normal to curve)
        const offsetX = Math.cos(angle + Math.PI / 2) * halfWidth;
        const offsetY = Math.sin(angle + Math.PI / 2) * halfWidth;

        pointsTop.push({ x: x + offsetX, y: y + offsetY });
        pointsBottom.push({ x: x - offsetX, y: y - offsetY });
    }

    // Draw the tapered shape
    ctx.beginPath();
    ctx.moveTo(pointsTop[0].x, pointsTop[0].y);
    for (let i = 1; i < pointsTop.length; i++) {
        ctx.lineTo(pointsTop[i].x, pointsTop[i].y);
    }
    // Connect to bottom end
    ctx.lineTo(pointsBottom[pointsBottom.length - 1].x, pointsBottom[pointsBottom.length - 1].y);
    // Trace back bottom
    for (let i = pointsBottom.length - 2; i >= 0; i--) {
        ctx.lineTo(pointsBottom[i].x, pointsBottom[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = color; // Use stroke color as fill for the "stroke" shape
    ctx.fill();

    // Text on Path
    if (text) {
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Place text near center 
        const centerX = cubicBezier(start.x, cp1.x, cp2.x, end.x, 0.5);
        const centerY = cubicBezier(start.y, cp1.y, cp2.y, end.y, 0.5);
        const angle = cubicBezierAngle(start, cp1, cp2, end, 0.5);

        // Offset text slightly above branch
        const textOffset = -15;

        ctx.translate(centerX, centerY);

        let rawAngle = angle;
        if (rawAngle > Math.PI / 2 || rawAngle < -Math.PI / 2) {
            rawAngle += Math.PI;
        }

        ctx.rotate(rawAngle);
        ctx.fillText(text, 0, textOffset);

        ctx.restore();
    }
};

export const renderElement = (
    rc: RoughCanvas,
    ctx: CanvasRenderingContext2D,
    el: DrawingElement,
    isDarkMode: boolean = false,
    layerOpacity: number = 1
) => {
    // normalizePoints is now external

    ctx.save();
    ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity;

    // Apply Drop Shadow
    if (el.shadowEnabled) {
        ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = el.shadowBlur || 10;
        ctx.shadowOffsetX = el.shadowOffsetX || 5;
        ctx.shadowOffsetY = el.shadowOffsetY || 5;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

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

    // Calculate Fill Density (Inverse of gap)
    const density = el.fillDensity || 1;
    const baseGap = 5; // Standard roughjs gap
    const hachureGap = Math.max(0.5, baseGap / density); // Prevent 0 or infinite density

    // Apply Blend Mode
    if (el.blendMode) {
        if (el.blendMode === 'normal') {
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation;
        }
    }

    // Gradient & Fill Logic
    let fillStyleToUse = fillStyle;
    let fillToUse = backgroundColor;

    // Advanced Gradient Logic
    const useGradient = (fillStyle === 'linear' || fillStyle === 'radial' || fillStyle === 'conic' || (el.gradientType && el.gradientType !== 'linear' && el.gradientType !== 'radial'));
    const hasStops = el.gradientStops && el.gradientStops.length > 0;
    const hasLegacyGradient = el.gradientStart && el.gradientEnd;

    if (useGradient && (hasStops || hasLegacyGradient)) {
        ctx.save();
        // Move to element center to use local coordinates
        ctx.translate(cx, cy);

        const w = el.width;
        const h = el.height;
        const mw = w / 2;
        const mh = h / 2;

        const gType = el.gradientType || fillStyle || 'linear';

        let grad: CanvasGradient;

        if (gType === 'linear') {
            const angleRad = (el.gradientDirection || 45) * (Math.PI / 180);
            const r = Math.sqrt(mw ** 2 + mh ** 2);
            // Local Coordinates centered at 0,0
            const x1 = -Math.cos(angleRad) * r;
            const y1 = -Math.sin(angleRad) * r;
            const x2 = Math.cos(angleRad) * r;
            const y2 = Math.sin(angleRad) * r;
            grad = ctx.createLinearGradient(x1, y1, x2, y2);
        } else if (gType === 'radial') {
            grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2);
        } else if (gType === 'conic') {
            // Conic Gradient centered at 0,0, starting angle matches direction
            const angleRad = (el.gradientDirection || 0) * (Math.PI / 180);
            // Note: createConicGradient might not be in all TS definitions yet, needs cast or newer lib
            // We assume environment supports it (modern browsers do)
            grad = (ctx as any).createConicGradient(angleRad, 0, 0);
        } else {
            // Fallback
            grad = ctx.createLinearGradient(-mw, -mh, mw, mh);
        }

        // Add Stops
        if (hasStops && el.gradientStops) {
            // Sort stops by offset to ensure correct rendering order
            [...el.gradientStops]
                .sort((a, b) => a.offset - b.offset)
                .forEach(stop => {
                    grad.addColorStop(stop.offset, stop.color);
                });
        } else if (hasLegacyGradient && el.gradientStart && el.gradientEnd) {
            grad.addColorStop(0, el.gradientStart);
            grad.addColorStop(1, el.gradientEnd);
        }

        ctx.fillStyle = grad;

        // Unified Gradient Rendering using ShapeGeometry
        const geometry = getShapeGeometry(el);

        if (geometry) {
            const drawGeometry = (geo: any) => {
                if (geo.type === 'rect') {
                    ctx.roundRect(geo.x, geo.y, geo.w, geo.h, geo.r || 0);
                } else if (geo.type === 'ellipse') {
                    ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
                } else if (geo.type === 'points') {
                    if (geo.points.length > 0) {
                        ctx.moveTo(geo.points[0].x, geo.points[0].y);
                        for (let i = 1; i < geo.points.length; i++) ctx.lineTo(geo.points[i].x, geo.points[i].y);
                        ctx.closePath();
                    }
                } else if (geo.type === 'path') {
                    ctx.fill(new Path2D(geo.path)); // Fill immediately for path to handle rules
                } else if (geo.type === 'multi') {
                    geo.shapes.forEach((s: any) => drawGeometry(s));
                }
            };

            ctx.beginPath();
            if (geometry.type !== 'path' && geometry.type !== 'multi') {
                drawGeometry(geometry);
                ctx.fill();
            } else {
                if (geometry.type === 'multi') {
                    drawGeometry(geometry);
                } else {
                    drawGeometry(geometry);
                }
            }
        } else {
            const normalizedPoints = normalizePoints(el.points);
            if (normalizedPoints.length > 0) {
                // Fallback for generic lines/arrows if not caught by geometry
                ctx.beginPath();
                ctx.moveTo(normalizedPoints[0].x - cx, normalizedPoints[0].y - cy);
                for (let i = 1; i < normalizedPoints.length; i++) {
                    ctx.lineTo(normalizedPoints[i].x - cx, normalizedPoints[i].y - cy);
                }
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();

        fillToUse = 'transparent';
        fillStyleToUse = 'solid';
    }
    const options: any = {
        seed: el.seed,
        // For architectural style, we want straight lines without randomness
        roughness: el.renderStyle === 'architectural' ? 0 : el.roughness,
        bowing: el.renderStyle === 'architectural' ? 0 : 1, // Minimize bowing for archi style
        stroke: strokeColor,
        strokeWidth: el.strokeWidth,
        fill: fillToUse,
        fillStyle: fillStyleToUse,
        fillWeight: el.fillDensity ? el.fillDensity / 2 : undefined, // Map density to weight
        hachureGap: hachureGap,
        strokeLineDash: el.strokeStyle === 'dashed' ? [10, 10] : (el.strokeStyle === 'dotted' ? [5, 10] : undefined),
        strokeLineJoin: el.strokeLineJoin || 'round',
        strokeLineCap: (el.strokeLineJoin === 'miter' || el.strokeLineJoin === 'bevel') ? 'butt' : 'round',
        hachureAngle: -41 + (el.seed % 360), // Add some randomness to angle if needed, or keep fixed
    };

    // Custom Deterministic 'Dots' Fill Logic
    let customDotsDraw: (() => void) | null = null;
    let dotColor = backgroundColor;

    if (fillStyle === 'dots') {
        // Disable RoughJS fill so we handle it manually
        options.fill = undefined;
        options.fillStyle = 'solid';

        // Helper to draw deterministic dots
        customDotsDraw = () => {
            if (!dotColor) return;

            // Simple LCG for deterministic seeding
            let currentSeed = (el.seed || 1) >>> 0;
            const nextRandom = () => {
                currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
                return currentSeed / 4294967296;
            };

            // Use density calculated above
            const baseDotGap = 4 * (el.strokeWidth || 1) + 6;
            const gap = Math.max(2, baseDotGap / density);
            const radius = (el.strokeWidth || 1);

            // Cover the bounding box
            // We jitter exact positions to look "rough"
            ctx.save();
            ctx.fillStyle = dotColor;

            // Generate dots
            const cols = Math.ceil(el.width / gap);
            const rows = Math.ceil(el.height / gap);

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    // Jitter
                    const dx = (nextRandom() - 0.5) * gap;
                    const dy = (nextRandom() - 0.5) * gap;

                    // Chance to skip for irregularity (70% fill)
                    if (nextRandom() > 0.8) continue;

                    const x = el.x + i * gap + dx + gap / 2;
                    const y = el.y + j * gap + dy + gap / 2;

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        };
    }

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
        return `M ${x + rX} ${y} L ${x + w - rX} ${y} Q ${x + w} ${y} ${x + w} ${y + rY} L ${x + w} ${y + h - rY} Q ${x + w} ${y + h} ${x + w - rX} ${y + h} L ${x + rX} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rY} L ${x} ${y + rY} Q ${x} ${y} ${x + rX} ${y}`;
    };

    // Helper to generate rounded diamond path
    const getRoundedDiamondPath = (x: number, y: number, w: number, h: number, r: number) => {
        const w2 = w / 2;
        const h2 = h / 2;
        const cx = x + w2;
        const cy = y + h2;

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
        const radius = el.borderRadius !== undefined
            ? Math.min(Math.abs(el.width), Math.abs(el.height)) * (el.borderRadius / 100)
            : (el.roundness ? Math.min(Math.abs(el.width), Math.abs(el.height)) * 0.15 : 0);

        // Helper to draw rect
        const drawRect = (x: number, y: number, w: number, h: number, r: number, isInner = false) => {
            const opts = isInner ? { ...options, stroke: el.innerBorderColor || strokeColor, fill: 'none' } : options;

            // Custom Dots Handling
            if (customDotsDraw && !isInner) {
                ctx.save();
                ctx.beginPath();
                if (r > 0) {
                    const path = new Path2D(getRoundedRectPath(x, y, w, h, r));
                    ctx.clip(path);
                } else {
                    ctx.rect(x, y, w, h);
                    ctx.clip();
                }
                customDotsDraw();
                ctx.restore();
            }

            if (el.renderStyle === 'architectural') {
                // Use options.fill (which respects gradient logic) instead of forced backgroundColor
                const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
                if (!isInner && fillVisible && fillStyle !== 'dots') {
                    if (r > 0) {
                        const path = getRoundedRectPath(x, y, w, h, r);
                        rc.path(path, { ...opts, stroke: 'none', fill: options.fill });
                    } else {
                        rc.rectangle(x, y, w, h, { ...opts, stroke: 'none', fill: options.fill });
                    }
                }

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, w, h, r);
                } else {
                    ctx.rect(x, y, w, h);
                }
                ctx.strokeStyle = isInner ? (el.innerBorderColor || strokeColor) : strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
                ctx.lineCap = 'round';
                ctx.stroke();
            } else {
                if (r > 0) {
                    const path = getRoundedRectPath(x, y, w, h, r);
                    rc.path(path, opts);
                } else {
                    rc.rectangle(x, y, w, h, opts);
                }
            }
        };

        // Draw Outer
        drawRect(el.x, el.y, el.width, el.height, radius);

        // Draw Inner
        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                drawRect(el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, innerR, true);
            }
        }
    } else if (el.type === 'circle') {
        // Helper to draw circle
        const drawCircle = (x: number, y: number, w: number, h: number, isInner = false) => {
            const opts = isInner ? { ...options, stroke: el.innerBorderColor || strokeColor, fill: 'none' } : options;

            // Custom Dots Handling
            if (customDotsDraw && !isInner) {
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
                ctx.clip();
                customDotsDraw();
                ctx.restore();
            }

            if (el.renderStyle === 'architectural') {
                const cx = x + w / 2;
                const cy = y + h / 2;
                const rx = Math.abs(w) / 2;
                const ry = Math.abs(h) / 2;

                // Use options.fill to respect gradient logic
                const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
                if (!isInner && fillVisible && fillStyle !== 'dots') {
                    rc.ellipse(cx, cy, Math.abs(w), Math.abs(h), { ...options, stroke: 'none', fill: options.fill });
                }

                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.strokeStyle = isInner ? (el.innerBorderColor || strokeColor) : strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
            } else {
                rc.ellipse(x + w / 2, y + h / 2, Math.abs(w), Math.abs(h), opts);
            }
        };

        drawCircle(el.x, el.y, el.width, el.height);

        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                drawCircle(el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, true);
            }
        }
    } else if (el.type === 'diamond') {
        const radius = el.borderRadius !== undefined
            ? Math.min(Math.abs(el.width), Math.abs(el.height)) * (el.borderRadius / 100)
            : (el.roundness ? Math.min(Math.abs(el.width), Math.abs(el.height)) * 0.2 : 0);

        // Helper to draw diamond
        const drawDiamond = (x: number, y: number, w: number, h: number, r: number, isInner = false) => {
            const rx = w / 2;
            const ry = h / 2;
            const cx = x + rx;
            const cy = y + ry;
            const points: [number, number][] = [
                [cx, y],
                [x + w, cy],
                [cx, y + h],
                [x, cy]
            ];

            const opts = isInner ? { ...options, stroke: el.innerBorderColor || strokeColor, fill: 'none' } : options;

            // Custom Dots Handling
            if (customDotsDraw && !isInner) {
                ctx.save();
                // Build clipped path
                if (r > 0) {
                    const path = new Path2D(getRoundedDiamondPath(x, y, w, h, r));
                    ctx.clip(path);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(points[0][0], points[0][1]);
                    ctx.lineTo(points[1][0], points[1][1]);
                    ctx.lineTo(points[2][0], points[2][1]);
                    ctx.lineTo(points[3][0], points[3][1]);
                    ctx.closePath();
                    ctx.clip();
                }
                customDotsDraw();
                ctx.restore();
            }

            if (el.renderStyle === 'architectural') {
                const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
                if (!isInner && fillVisible && fillStyle !== 'dots') {
                    if (r > 0) {
                        const path = getRoundedDiamondPath(x, y, w, h, r);
                        rc.path(path, { ...opts, stroke: 'none', fill: options.fill });
                    } else {
                        rc.polygon(points, { ...opts, stroke: 'none', fill: options.fill });
                    }
                }

                ctx.beginPath();
                ctx.strokeStyle = isInner ? (el.innerBorderColor || strokeColor) : strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
                ctx.lineCap = 'round';

                if (r > 0) {
                    const pathString = getRoundedDiamondPath(x, y, w, h, r);
                    const path = new Path2D(pathString);
                    ctx.stroke(path);
                } else {
                    ctx.moveTo(points[0][0], points[0][1]);
                    ctx.lineTo(points[1][0], points[1][1]);
                    ctx.lineTo(points[2][0], points[2][1]);
                    ctx.lineTo(points[3][0], points[3][1]);
                    ctx.closePath();
                    ctx.stroke();
                }
            } else {
                if (r > 0) {
                    const path = getRoundedDiamondPath(x, y, w, h, r);
                    rc.path(path, opts);
                } else {
                    rc.polygon(points, opts);
                }
            }
        };

        // Draw Outer
        drawDiamond(el.x, el.y, el.width, el.height, radius);

        // Draw Inner
        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                drawDiamond(el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, innerR, true);
            }
        }
    } else if (el.type === 'triangle') {
        const drawTriangle = (x: number, y: number, w: number, h: number, isInner = false) => {
            const cx = x + w / 2;
            const points: [number, number][] = [
                [cx, y],                         // Top
                [x + w, y + h], // Bottom right
                [x, y + h]            // Bottom left
            ];

            const opts = isInner ? { ...options, stroke: el.innerBorderColor || strokeColor, fill: 'none' } : options;

            // Custom Dots Handling
            if (customDotsDraw && !isInner) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.clip();
                customDotsDraw();
                ctx.restore();
            }

            if (el.renderStyle === 'architectural') {
                const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
                if (!isInner && fillVisible && fillStyle !== 'dots') {
                    rc.polygon(points, { ...opts, stroke: 'none', fill: options.fill });
                }
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.strokeStyle = isInner ? (el.innerBorderColor || strokeColor) : strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
                ctx.lineCap = 'round';
                ctx.stroke();
            } else {
                rc.polygon(points, opts);
            }
        };

        // Draw Outer
        drawTriangle(el.x, el.y, el.width, el.height);

        // Draw Inner
        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {

                // Approximate inner triangle by reducing bbox
                drawTriangle(el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, true);
            }
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
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
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
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
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
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.lineTo(points[3][0], points[3][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'trapezoid') {
        const offset = el.width * 0.2;
        const points: [number, number][] = [
            [el.x + offset, el.y],
            [el.x + el.width - offset, el.y],
            [el.x + el.width, el.y + el.height],
            [el.x, el.y + el.height]
        ];

        if (el.renderStyle === 'architectural') {
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'rightTriangle') {
        const points: [number, number][] = [
            [el.x, el.y],
            [el.x, el.y + el.height],
            [el.x + el.width, el.y + el.height]
        ];

        if (el.renderStyle === 'architectural') {
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'pentagon' || el.type === 'septagon') {
        const sides = el.type === 'pentagon' ? 5 : 7;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        const points: [number, number][] = [];

        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            points.push([
                cx + rx * Math.cos(angle),
                cy + ry * Math.sin(angle)
            ]);
        }

        if (el.renderStyle === 'architectural') {
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
            }
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'capsule') {
        const radius = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
        const path = getRoundedRectPath(el.x, el.y, el.width, el.height, radius);

        if (el.renderStyle === 'architectural') {
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                ctx.fillStyle = options.fill;
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
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (fillVisible) {
                rc.polygon(mainPoints, { ...options, stroke: 'none', fill: options.fill });
                rc.polygon(foldPoints, { ...options, stroke: 'none', fill: options.fill, fillStyle: 'solid', opacity: 0.3 });
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
        // Parametric Border Radius (default 20%)
        const radiusPercent = el.borderRadius !== undefined ? el.borderRadius : 20;
        const r = Math.min(Math.abs(w), Math.abs(h)) * (radiusPercent / 100);
        const tailWidth = w * 0.15;
        const tailHeight = h * 0.2;
        const rectHeight = h - tailHeight;

        // Parametric Tail Position (default 20%)
        // Valid range 0-100, but practical drawing range needs clamping 
        // to avoid detaching from corners.
        // Let's clamp actual tip position to keep base attached.
        const tailPos = (el.tailPosition !== undefined ? el.tailPosition : 20) / 100;

        // Ensure tail bases don't go beyond corners (consider radius 'r')
        // Tip x position relative to x
        // Base Center = Tip X + 0.1w (slanted right) or just simple logic.
        // Base of tail is some width around tipXRel
        // Base left = tipXRel - tailWidth/2, Base right = tipXRel + tailWidth/2?
        // Current hardcoded logic was:
        // Tip at 0.2 * w (lines 655) ?? 
        // Wait, original logic:
        // L ${x + w * 0.3 + tailWidth} ${y + rectHeight}  <-- Base Right? No 0.3+width
        // L ${x + w * 0.2} ${y + h}                       <-- Tip
        // L ${x + w * 0.3} ${y + rectHeight}              <-- Base Left

        // Original logic analysis:
        // Base Left: 0.3 * w
        // Base Right: 0.3 * w + tailWidth (where tailWidth = 0.15w) -> 0.45w
        // Tip: 0.2 * w
        // So tip was TO THE LEFT of the base? (0.2 < 0.3) Yes, slanted tail.

        // New Parametric Logic:
        // Let user define TIP X position.
        // Base should be near it. 
        // Let's keep the slant or allow straight? Slant moves with position.
        // Let's define Tip X = tailPos * w.
        // Base Center = Tip X + some offset? Or centered?
        // Let's make Base Center = Tip X + 0.1w (slanted right) or just simple logic.

        // Simple robust logic:
        // Tip X = tailPos * w
        // Base Width = 0.15 * w
        // If Tip X is left (<0.5), Base is to the right of tip?
        // Let's try to keep the original aesthetic but fully moveable.
        // Original: Base Left 0.3, Tip 0.2 (diff -0.1). 
        // Let's say Base Center is at Tip X + 0.1w.

        const tipRelX = w * tailPos;
        // const baseLeftRelX removed as unused

        // Re-clamping base to avoid corner radius issues would be complex but better.
        // Simplified Logic: 
        // Base Left: tailPos + 0.1
        // Base Right: tailPos + 0.25 (since tailWidth is 0.15)
        // Tip: tailPos

        // Let's just use simpler relative offsets to match "Tip Position" semantic
        // Tip is at tailPos.
        // Base starts at (tailPos + 0.1) * w and ends at (tailPos + 0.1 + 0.15) * w?
        // That makes the tail always point "back/left".
        // What if tailPos is 0.9? Then base would be > 1.0 (off bubble).
        // Intelligent flipping:
        // If tailPos > 0.5, make base to the LEFT of tip.
        // If tailPos <= 0.5, make base to the RIGHT of tip.

        let baseRelX1, baseRelX2;
        if (tailPos <= 0.5) {
            // Pointing Left/Back (like original)
            // Tip @ tailPos
            // Base @ tailPos + 0.1
            baseRelX1 = tipRelX + (w * 0.1); // Base Left
            baseRelX2 = baseRelX1 + tailWidth; // Base Right
        } else {
            // Pointing Right
            // Tip @ tailPos
            // Base Left @ tailPos - 0.1 - tailWidth
            baseRelX2 = tipRelX - (w * 0.1); // Base Right
            baseRelX1 = baseRelX2 - tailWidth; // Base Left
        }

        // Clamp bases to straight segment (between rX and w-rX)
        // const minBase removed as unused

        // If calculated bases are outside corners, clamp/shift them?
        // For now, let properties 'min/max' handle most safety, but simple Math.max/min here helps
        // Note: Drawing path works with absolute standard coords usually

        // Path with rounded corners and a tail
        const rX = Math.min(Math.abs(w) / 2, r);
        const rY = Math.min(Math.abs(rectHeight) / 2, r);

        const path = `
            M ${x + rX} ${y} 
            L ${x + w - rX} ${y} 
            Q ${x + w} ${y} ${x + w} ${y + rY} 
            L ${x + w} ${y + rectHeight - rY} 
            Q ${x + w} ${y + rectHeight} ${x + w - rX} ${y + rectHeight} 
            L ${x + baseRelX2} ${y + rectHeight}
            L ${x + tipRelX} ${y + h}
            L ${x + baseRelX1} ${y + rectHeight}
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
        // Parametric Sharpness (default 0.7)
        // shapeRatio is percentage of outerRadius. 10% = Very Sharp/Spiky, 90% = Very Dull/Round
        const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 70) / 100;
        const innerRadius = outerRadius * ratio;
        const numPoints = el.burstPoints || 16;
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
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'miter';
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
        // Parametric Sharpness (default 0.38)
        const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 38) / 100;
        const innerRadius = outerRadius * ratio;
        const numPoints = el.starPoints || 5; // Use starPoints property, default to 5
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
            ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
            ctx.stroke();
        } else {
            rc.polygon(points, options);
        }
    } else if (el.type === 'polygon') {
        const sides = el.polygonSides || 6;

        // Helper to draw polygon
        const drawPolygon = (x: number, y: number, w: number, h: number, isInner = false) => {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const radiusX = Math.abs(w) / 2;
            const radiusY = Math.abs(h) / 2;
            const points: [number, number][] = [];

            for (let i = 0; i < sides; i++) {
                const angle = (2 * Math.PI / sides) * i - Math.PI / 2; // Start at top
                points.push([
                    cx + radiusX * Math.cos(angle),
                    cy + radiusY * Math.sin(angle)
                ]);
            }

            const opts = isInner ? { ...options, stroke: el.innerBorderColor || strokeColor, fill: 'none' } : options;

            if (el.renderStyle === 'architectural') {
                if (!isInner && backgroundColor) {
                    rc.polygon(points, { ...opts, stroke: 'none', fill: backgroundColor });
                }
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
                ctx.closePath();
                ctx.strokeStyle = isInner ? (el.innerBorderColor || strokeColor) : strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
                ctx.stroke();
            } else {
                rc.polygon(points, opts);
            }
        };

        // Draw Outer
        drawPolygon(el.x, el.y, el.width, el.height);

        // Draw Inner
        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                drawPolygon(el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, true);
            }
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
    } else if (el.type === 'starPerson') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const headRadius = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
        const cx = x + w / 2;

        // Head
        const headX = cx;
        const headY = y + headRadius;

        // Body points (a 5-limbed star with the top point as the neck)
        const bodyPoints: [number, number][] = [
            [cx, y + headRadius * 2], // Neck
            [x, y + h * 0.4],         // Left Arm
            [cx, y + h * 0.5],         // Middle
            [x + w, y + h * 0.4],     // Right Arm
            [cx, y + headRadius * 2], // Back to neck
            [x + w * 0.8, y + h],     // Right Leg
            [cx, y + h * 0.7],         // Crotch
            [x + w * 0.2, y + h],     // Left Leg
            [cx, y + headRadius * 2], // Back to neck
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.ellipse(headX, headY, headRadius * 2, headRadius * 2, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(bodyPoints, { ...options, stroke: 'none', fill: backgroundColor });
            }
            ctx.beginPath();
            ctx.ellipse(headX, headY, headRadius, headRadius, 0, 0, Math.PI * 2);
            ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
            for (let i = 1; i < bodyPoints.length; i++) ctx.lineTo(bodyPoints[i][0], bodyPoints[i][1]);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();
        } else {
            rc.ellipse(headX, headY, headRadius * 2, headRadius * 2, options);
            rc.polygon(bodyPoints, options);
        }
    } else if (el.type === 'scroll') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const rollH = h * 0.15;

        // Main body path
        const path = `
            M ${x} ${y + rollH}
            L ${x + w} ${y + rollH}
            L ${x + w} ${y + h - rollH}
            L ${x} ${y + h - rollH}
            Z
            M ${x} ${y + rollH}
            C ${x - rollH} ${y + rollH} ${x - rollH} ${y} ${x} ${y}
            L ${x + w} ${y}
            C ${x + w + rollH} ${y} ${x + w + rollH} ${y + rollH} ${x + w} ${y + rollH}
            M ${x} ${y + h - rollH}
            C ${x - rollH} ${y + h - rollH} ${x - rollH} ${y + h} ${x} ${y + h}
            L ${x + w} ${y + h}
            C ${x + w + rollH} ${y + h} ${x + w + rollH} ${y + h - rollH} ${x + w} ${y + h - rollH}
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y + rollH, w, h - 2 * rollH);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, options);
        }
    } else if (el.type === 'wavyDivider') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cy = y + h / 2;
        const segments = Math.max(2, Math.floor(w / 40));
        const segW = w / segments;
        const amplitude = h / 2;

        let path = `M ${x} ${cy}`;
        for (let i = 0; i < segments; i++) {
            const sx = x + i * segW;
            const ex = x + (i + 1) * segW;
            const mx = sx + segW / 2;
            const ay = i % 2 === 0 ? cy - amplitude : cy + amplitude;
            path += ` Q ${mx} ${ay} ${ex} ${cy}`;
        }

        if (el.renderStyle === 'architectural') {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));
        } else {
            rc.path(path, { ...options, fill: 'none' });
        }
    } else if (el.type === 'doubleBanner') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const earW = w * 0.15;
        const earH = h * 0.25;

        // Main front panel
        const mainPts: [number, number][] = [
            [x + earW, y],
            [x + w - earW, y],
            [x + w - earW, y + h - earH],
            [x + earW, y + h - earH]
        ];

        // Left back ear
        const leftEar: [number, number][] = [
            [x + earW, y + earH],
            [x, y + earH],
            [x + earW / 2, y + h / 2],
            [x, y + h],
            [x + earW, y + h]
        ];

        // Right back ear
        const rightEar: [number, number][] = [
            [x + w - earW, y + earH],
            [x + w, y + earH],
            [x + w - earW / 2, y + h / 2],
            [x + w, y + h],
            [x + w - earW, y + h]
        ];

        // Fold triangles (shadows)
        const leftFold: [number, number][] = [
            [x + earW, y + h - earH],
            [x + earW, y + earH],
            [x + earW * 0.6, y + h - earH]
        ];
        const rightFold: [number, number][] = [
            [x + w - earW, y + h - earH],
            [x + w - earW, y + earH],
            [x + w - earW * 0.6, y + h - earH]
        ];

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                rc.polygon(mainPts, { ...options, stroke: 'none', fill: backgroundColor });
                // Darken ears and folds by using a semi-transparent black overlay if there's a background
                rc.polygon(leftEar, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(leftEar, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.1 });
                rc.polygon(rightEar, { ...options, stroke: 'none', fill: backgroundColor });
                rc.polygon(rightEar, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.1 });
                rc.polygon(leftFold, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.3 });
                rc.polygon(rightFold, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.3 });
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
            drawPoly(mainPts);
        } else {
            rc.polygon(leftEar, options);
            rc.polygon(rightEar, options);
            rc.polygon(mainPts, options);
            // Rough shadows
            rc.polygon(leftFold, { ...options, fill: strokeColor, fillStyle: 'solid', opacity: 0.2 });
            rc.polygon(rightFold, { ...options, fill: strokeColor, fillStyle: 'solid', opacity: 0.2 });
            rc.polygon(leftEar, { ...options, fill: '#000000', fillStyle: 'solid', opacity: 0.05 });
            rc.polygon(rightEar, { ...options, fill: '#000000', fillStyle: 'solid', opacity: 0.05 });
        }
    } else if (el.type === 'lightbulb') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cx = x + w / 2;
        const bulbR = Math.min(w, h / 1.5) / 2;
        const baseW = w * 0.4;
        const baseH = h * 0.25;
        const baseY = y + h - baseH;

        // Bulb shape (circle merging into base)
        const bulbPath = `
            M ${cx - baseW / 2} ${baseY}
            C ${cx - baseW / 2} ${y + bulbR} ${x} ${y + bulbR * 1.5} ${x} ${y + bulbR}
            A ${bulbR} ${bulbR} 0 1 1 ${x + w} ${y + bulbR}
            C ${x + w} ${y + bulbR * 1.5} ${cx + baseW / 2} ${y + bulbR} ${cx + baseW / 2} ${baseY}
            Z
        `;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(bulbPath));
                ctx.fillRect(cx - baseW / 2, baseY, baseW, baseH);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(bulbPath));
            // Base threads
            ctx.beginPath();
            ctx.rect(cx - baseW / 2, baseY, baseW, baseH);
            ctx.moveTo(cx - baseW / 2, baseY + baseH / 3); ctx.lineTo(cx + baseW / 2, baseY + baseH / 3);
            ctx.moveTo(cx - baseW / 2, baseY + 2 * baseH / 3); ctx.lineTo(cx + baseW / 2, baseY + 2 * baseH / 3);
            ctx.stroke();
            // Filament
            ctx.beginPath();
            ctx.moveTo(cx - bulbR / 3, y + bulbR);
            ctx.lineTo(cx, y + bulbR / 2);
            ctx.lineTo(cx + bulbR / 3, y + bulbR);
            ctx.stroke();
        } else {
            rc.path(bulbPath, options);
            // Base threads
            const baseX = cx - baseW / 2;
            rc.rectangle(baseX, baseY, baseW, baseH, options);
            rc.line(baseX, baseY + baseH / 3, baseX + baseW, baseY + baseH / 3, options);
            rc.line(baseX, baseY + 2 * baseH / 3, baseX + baseW, baseY + 2 * baseH / 3, options);
            // Filament
            rc.path(`M ${cx - bulbR / 3} ${y + bulbR} L ${cx} ${y + bulbR / 2} L ${cx + bulbR / 3} ${y + bulbR}`, { ...options, fill: 'none' });
        }
    } else if (el.type === 'signpost') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cx = x + w / 2;
        const poleW = Math.max(4, w * 0.05);
        const boardH = h * 0.3;
        const boardW = w * 0.9;
        const boardY = y + h * 0.1;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(cx - poleW / 2, y, poleW, h); // Pole
                ctx.fillRect(cx - boardW / 2, boardY, boardW, boardH); // Board
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(cx - poleW / 2, y, poleW, h);
            ctx.strokeRect(cx - boardW / 2, boardY, boardW, boardH);
            // Nail
            ctx.beginPath(); ctx.arc(cx, boardY + boardH / 2, 2, 0, Math.PI * 2); ctx.stroke();
        } else {
            // Pole
            rc.rectangle(cx - poleW / 2, y, poleW, h, { ...options, fill: 'none' }); // Pole usually barely filled
            // Board
            rc.rectangle(cx - boardW / 2, boardY, boardW, boardH, options);
            // Nail
            rc.circle(cx, boardY + boardH / 2, 4, { ...options, fill: strokeColor, fillStyle: 'solid' });
        }
    } else if (el.type === 'burstBlob') {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        const spikes = 12;
        const outerR = Math.min(rx, ry);
        const innerR = outerR * 0.6;

        const seed = el.seed || 1;
        const randomSeeded = (s: number) => {
            let t = s += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };

        let path = "";
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerR : innerR;
            // Add some randomness for jagged effect
            const rnd = randomSeeded(seed + i); // Deterministic randomness
            const rVar = r + (rnd - 0.5) * (outerR * 0.1);
            const angle = (Math.PI * i) / spikes;
            const px = cx + Math.cos(angle) * w / h * rVar; // Elliptical scaling
            const py = cy + Math.sin(angle) * rVar;
            if (i === 0) path += `M ${px} ${py}`;
            else path += ` L ${px} ${py}`;
        }
        path += " Z";

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
                const pts = normalizePoints(el.points);
                if (pts.length > 0) {
                    start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                    end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
                }
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
            const pts = normalizePoints(el.points);
            const drawPoints: [number, number][] = (pts && pts.length > 0)
                ? pts.map(p => [el.x + p.x, el.y + p.y])
                : [[el.x, el.y], [endX, endY]];

            rc.linearPath(drawPoints, options);

            // Filter out duplicate points for arrowhead calculation
            const cleanDrawPoints = drawPoints.filter((p, i, self) =>
                i === 0 || Math.abs(p[0] - self[i - 1][0]) > 0.1 || Math.abs(p[1] - self[i - 1][1]) > 0.1
            );

            if (el.startArrowhead && cleanDrawPoints.length >= 2) {
                const p0 = cleanDrawPoints[0];
                const p1 = cleanDrawPoints[1];
                const angle = Math.atan2(p0[1] - p1[1], p0[0] - p1[0]);
                drawArrowhead(rc, p0[0], p0[1], angle, el.startArrowhead, options);
            }

            if (el.endArrowhead && cleanDrawPoints.length >= 2) {
                const pn = cleanDrawPoints[cleanDrawPoints.length - 1];
                const pn_1 = cleanDrawPoints[cleanDrawPoints.length - 2];
                const angle = Math.atan2(pn[1] - pn_1[1], pn[0] - pn_1[0]);
                drawArrowhead(rc, pn[0], pn[1], angle, el.endArrowhead, options);
            }

        } else {
            // Straight Line (Default)
            // Use points if available (allows for flipped lines), otherwise use width/height
            // normalizePoints handles undefined/empty by returning [], so we consistently check length
            const pts = normalizePoints(el.points);

            if (pts.length >= 2) {
                const pStart = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                const pEnd = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };

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
        const absPoints = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));

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
        const absPoints = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));

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
        const fontWeight = (el.fontWeight === true || el.fontWeight === 'bold') ? 'bold ' : '';
        const fontStyle = (el.fontStyle === true || el.fontStyle === 'italic') ? 'italic ' : '';
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
        const absPoints = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));

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
    } else if (el.type === 'browserWindow') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        const headerH = Math.min(h * 0.15, 30);
        const dotR = headerH * 0.2;
        const addressH = headerH * 0.6;
        const addressW = w * 0.6;
        const addressX = x + (w - addressW) / 2;
        const addressY = y + (headerH - addressH) / 2;

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();

            // Dots
            ctx.fillStyle = strokeColor;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(x + headerH * (0.4 + i * 0.5), y + headerH / 2, dotR, 0, Math.PI * 2); ctx.fill();
            }
            // Address Bar
            ctx.strokeRect(addressX, addressY, addressW, addressH);
        } else {
            rc.rectangle(x, y, w, h, options);
            rc.line(x, y + headerH, x + w, y + headerH, options);
            for (let i = 0; i < 3; i++) {
                rc.circle(x + headerH * (0.4 + i * 0.5), y + headerH / 2, dotR * 2, { ...options, fillStyle: 'solid', fill: strokeColor });
            }
            rc.rectangle(addressX, addressY, addressW, addressH, options);
        }
    } else if (el.type === 'mobilePhone') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        const r = Math.min(w, h) * 0.15;
        const notchW = w * 0.3;
        const notchH = h * 0.03;
        const homeBarW = w * 0.4;
        const homeBarY = y + h - (h * 0.05);

        const path = getRoundedRectPath(x, y, w, h, r);

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke(new Path2D(path));

            // Notch
            ctx.beginPath();
            ctx.roundRect(x + (w - notchW) / 2, y + 5, notchW, notchH, 5);
            ctx.fillStyle = strokeColor;
            ctx.fill();

            // Home bar
            ctx.beginPath();
            ctx.roundRect(x + (w - homeBarW) / 2, homeBarY, homeBarW, 4, 2);
            ctx.fill();
        } else {
            rc.path(path, options);
            // Notch
            rc.rectangle(x + (w - notchW) / 2, y + 5, notchW, notchH, { ...options, fillStyle: 'solid', fill: strokeColor });
            // Home bar
            rc.line(x + (w - homeBarW) / 2, homeBarY, x + (w + homeBarW) / 2, homeBarY, options);
        }
    } else if (el.type === 'ghostButton') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        const r = Math.min(w, h) * 0.2;
        const path = getRoundedRectPath(x, y, w, h, r);
        const ghostOptions = { ...options, strokeStyle: 'dashed', strokeLineDash: [4, 4] };

        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fill(new Path2D(path));
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.setLineDash([4, 4]);
            ctx.stroke(new Path2D(path));
            ctx.setLineDash([]);
        } else {
            rc.path(path, ghostOptions);
        }
    } else if (el.type === 'inputField') {
        const w = el.width, h = el.height, x = el.x, y = el.y;
        if (el.renderStyle === 'architectural') {
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(x, y, w, h);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(x, y, w, h);
            // Cursor
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 8);
            ctx.lineTo(x + 10, y + h - 8);
            ctx.stroke();
        } else {
            rc.rectangle(x, y, w, h, options);
            // Cursor
            rc.line(x + 10, y + 8, x + 10, y + h - 8, options);
        }
    } else if (el.type === 'organicBranch') {
        const strokeColor = adjustColor(el.strokeColor);
        // Calculate Control Points (similar to Bezier/Arrow logic)
        let start = { x: el.x, y: el.y };
        let end = { x: el.x + el.width, y: el.y + el.height };

        if (el.points && el.points.length >= 2) {
            const pts = normalizePoints(el.points);
            if (pts.length > 0) {
                start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
            }
        }

        // Logic for CP from Canvas (refreshBoundLine typically handles this updates into el.controlPoints?)
        // If el.controlPoints exists, use it. Else calculate default curve.
        let cp1, cp2;
        if (el.controlPoints && el.controlPoints.length === 2) {
            cp1 = { x: el.controlPoints[0].x, y: el.controlPoints[0].y };
            cp2 = { x: el.controlPoints[1].x, y: el.controlPoints[1].y };
        } else {
            // Fallback calculation (Simple S-curve)
            const dx = end.x - start.x;
            cp1 = { x: start.x + dx * 0.5, y: start.y }; // Control point 1
            cp2 = { x: end.x - dx * 0.5, y: end.y };     // Control point 2
        }

        drawOrganicBranch(
            ctx,
            start, end, cp1, cp2,
            strokeColor,
            el.strokeWidth || 1,
            el.containerText || el.text || "", // Pass text
            strokeColor, // Text color matches branch
            getFontString(el) // Font
        );
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
        el.type === 'server' || el.type === 'loadBalancer' || el.type === 'firewall' || el.type === 'user' || el.type === 'messageQueue' || el.type === 'lambda' || el.type === 'router' || el.type === 'browser' ||
        el.type === 'trapezoid' || el.type === 'rightTriangle' || el.type === 'pentagon' || el.type === 'septagon' || el.type === 'starPerson' || el.type === 'scroll' || el.type === 'doubleBanner' ||
        el.type === 'lightbulb' || el.type === 'signpost' || el.type === 'burstBlob' ||
        el.type === 'browserWindow' || el.type === 'mobilePhone' || el.type === 'ghostButton' || el.type === 'inputField')) {

        ctx.save();
        let maxWidth = el.width - 20;
        let startYOffset = 0;

        if (el.type === 'doubleBanner') {
            maxWidth = el.width * 0.65;
            startYOffset = - (el.height * 0.1); // Move up slightly into the main panel
        } else if (el.type === 'starPerson') {
            startYOffset = el.height * 0.15; // Move down into the chest/belly area
        } else if (el.type === 'lightbulb') {
            maxWidth = el.width * 0.7; // Inscribed in bulb
            startYOffset = - (el.height * 0.1); // Move up from base
        } else if (el.type === 'signpost') {
            maxWidth = el.width * 0.8; // Board width
            startYOffset = - (el.height * 0.15); // Move up to board
        } else if (el.type === 'browserWindow') {
            const headerH = Math.min(el.height * 0.15, 30);
            startYOffset = headerH / 2; // Move down below header
        } else if (el.type === 'mobilePhone') {
            startYOffset = - (el.height * 0.05); // Move up slightly from center
        } else if (el.type === 'inputField') {
            ctx.textAlign = 'left';
            const centerX = el.x + 25; // Offset from cursor
            startYOffset = 0;
            // Overriding the render loop logic slightly for inputField alignment
            const metrics = measureContainerText(ctx, el, el.containerText || '', el.width - 30);
            ctx.font = getFontString(el);
            ctx.fillStyle = adjustColor(el.strokeColor);
            ctx.textBaseline = 'middle';
            const startY = el.y + (el.height - metrics.textHeight) / 2 + metrics.lineHeight / 2;
            metrics.lines.forEach((line, index) => {
                const y = startY + index * metrics.lineHeight;
                ctx.fillText(line, centerX, y);
            });
            ctx.restore();
            return; // Exit early as we did custom render
        }

        const metrics = measureContainerText(ctx, el, el.containerText, maxWidth);

        ctx.font = getFontString(el);
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = el.x + el.width / 2;
        const startY = el.y + (el.height - metrics.textHeight) / 2 + metrics.lineHeight / 2 + startYOffset;

        metrics.lines.forEach((line, index) => {
            const y = startY + index * metrics.lineHeight;
            ctx.fillText(line, centerX, y, el.width - 10);
        });

        ctx.restore();
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
