import { ShapeRenderer } from "../base/shape-renderer";
import type { RenderContext, RenderOptions } from "../base/types";

// Helper for seeded random in burstBlob
function randomSeeded(s: number) {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * SketchnoteRenderer - Handles hand-drawn style shapes
 * 
 * Supports: starPerson, scroll, wavyDivider, doubleBanner, lightbulb, signpost, burstBlob
 */
export class SketchnoteRenderer extends ShapeRenderer {
    private renderFn: (context: RenderContext, options: RenderOptions) => void;

    constructor(renderFn: (context: RenderContext, options: RenderOptions) => void) {
        super();
        this.renderFn = renderFn;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        this.renderFn(context, options);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        this.renderFn(context, options);
    }

    // --- Factory Methods ---

    static starPerson(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';

            const headRadius = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
            const cx = x + w / 2;
            const headX = cx;
            const headY = y + headRadius;

            // Body points (5-limbed star)
            const bodyPoints: [number, number][] = [
                [cx, y + headRadius * 2], // Neck
                [x, y + h * 0.4],         // Left Arm
                [cx, y + h * 0.5],        // Middle
                [x + w, y + h * 0.4],     // Right Arm
                [cx, y + headRadius * 2], // Back to neck
                [x + w * 0.8, y + h],     // Right Leg
                [cx, y + h * 0.7],        // Crotch
                [x + w * 0.2, y + h],     // Left Leg
                [cx, y + headRadius * 2], // Back to neck
            ];

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    // Use mixed mode for filling complex shapes simply
                    rc.ellipse(headX, headY, headRadius * 2, headRadius * 2, { ...options, stroke: 'none', fill: options.fill });
                    rc.polygon(bodyPoints, { ...options, stroke: 'none', fill: options.fill });
                }
                ctx.beginPath();
                ctx.ellipse(headX, headY, headRadius, headRadius, 0, 0, Math.PI * 2);
                ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
                for (let i = 1; i < bodyPoints.length; i++) ctx.lineTo(bodyPoints[i][0], bodyPoints[i][1]);
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke();
            } else {
                rc.ellipse(headX, headY, headRadius * 2, headRadius * 2, options);
                rc.polygon(bodyPoints, options);
            }
        });
    }

    static scroll(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const rollH = h * 0.15;

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

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fillRect(x, y + rollH, w, h - 2 * rollH);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke(new Path2D(path));
            } else {
                rc.path(path, options);
            }
        });
    }

    static wavyDivider(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';

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

            if (isArch) {
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke(new Path2D(path));
            } else {
                rc.path(path, { ...options, fill: 'none' });
            }
        });
    }

    static doubleBanner(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const earW = w * 0.15;
            const earH = h * 0.25;

            const mainPts: [number, number][] = [
                [x + earW, y], [x + w - earW, y],
                [x + w - earW, y + h - earH], [x + earW, y + h - earH]
            ];
            const leftEar: [number, number][] = [
                [x + earW, y + earH], [x, y + earH],
                [x + earW / 2, y + h / 2], [x, y + h], [x + earW, y + h]
            ];
            const rightEar: [number, number][] = [
                [x + w - earW, y + earH], [x + w, y + earH],
                [x + w - earW / 2, y + h / 2], [x + w, y + h], [x + w - earW, y + h]
            ];
            const leftFold: [number, number][] = [
                [x + earW, y + h - earH], [x + earW, y + earH], [x + earW * 0.6, y + h - earH]
            ];
            const rightFold: [number, number][] = [
                [x + w - earW, y + h - earH], [x + w - earW, y + earH], [x + w - earW * 0.6, y + h - earH]
            ];

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    rc.polygon(mainPts, { ...options, stroke: 'none', fill: options.fill });
                    rc.polygon(leftEar, { ...options, stroke: 'none', fill: options.fill });
                    rc.polygon(leftEar, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.1 } as any);
                    rc.polygon(rightEar, { ...options, stroke: 'none', fill: options.fill });
                    rc.polygon(rightEar, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.1 } as any);
                    rc.polygon(leftFold, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.3 } as any);
                    rc.polygon(rightFold, { ...options, stroke: 'none', fill: '#000000', fillStyle: 'solid', opacity: 0.3 } as any);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                const drawPoly = (pts: [number, number][]) => {
                    ctx.beginPath();
                    ctx.moveTo(pts[0][0], pts[0][1]);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
                    ctx.closePath();
                    ctx.stroke();
                };
                drawPoly(leftEar);
                drawPoly(rightEar);
                drawPoly(mainPts);
            } else {
                rc.polygon(leftEar, options);
                rc.polygon(rightEar, options);
                rc.polygon(mainPts, options);
                rc.polygon(leftFold, { ...options, fill: options.strokeColor, fillStyle: 'solid', opacity: 0.2 } as any);
                rc.polygon(rightFold, { ...options, fill: options.strokeColor, fillStyle: 'solid', opacity: 0.2 } as any);
                rc.polygon(leftEar, { ...options, fill: '#000000', fillStyle: 'solid', opacity: 0.05 } as any);
                rc.polygon(rightEar, { ...options, fill: '#000000', fillStyle: 'solid', opacity: 0.05 } as any);
            }
        });
    }

    static lightbulb(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const cx = x + w / 2;
            const bulbR = Math.min(w, h / 1.5) / 2;
            const baseW = w * 0.4;
            const baseH = h * 0.25;
            const baseY = y + h - baseH;

            const bulbPath = `
        M ${cx - baseW / 2} ${baseY}
        C ${cx - baseW / 2} ${y + bulbR} ${x} ${y + bulbR * 1.5} ${x} ${y + bulbR}
        A ${bulbR} ${bulbR} 0 1 1 ${x + w} ${y + bulbR}
        C ${x + w} ${y + bulbR * 1.5} ${cx + baseW / 2} ${y + bulbR} ${cx + baseW / 2} ${baseY}
        Z
      `;

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(bulbPath));
                    ctx.fillRect(cx - baseW / 2, baseY, baseW, baseH);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke(new Path2D(bulbPath));
                ctx.beginPath();
                ctx.rect(cx - baseW / 2, baseY, baseW, baseH);
                ctx.moveTo(cx - baseW / 2, baseY + baseH / 3); ctx.lineTo(cx + baseW / 2, baseY + baseH / 3);
                ctx.moveTo(cx - baseW / 2, baseY + 2 * baseH / 3); ctx.lineTo(cx + baseW / 2, baseY + 2 * baseH / 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - bulbR / 3, y + bulbR);
                ctx.lineTo(cx, y + bulbR / 2);
                ctx.lineTo(cx + bulbR / 3, y + bulbR);
                ctx.stroke();
            } else {
                rc.path(bulbPath, options);
                const baseX = cx - baseW / 2;
                rc.rectangle(baseX, baseY, baseW, baseH, options);
                rc.line(baseX, baseY + baseH / 3, baseX + baseW, baseY + baseH / 3, options);
                rc.line(baseX, baseY + 2 * baseH / 3, baseX + baseW, baseY + 2 * baseH / 3, options);
                rc.path(`M ${cx - bulbR / 3} ${y + bulbR} L ${cx} ${y + bulbR / 2} L ${cx + bulbR / 3} ${y + bulbR}`, { ...options, fill: 'none' });
            }
        });
    }

    static signpost(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const cx = x + w / 2;
            const poleW = Math.max(4, w * 0.05);
            const boardH = h * 0.3;
            const boardW = w * 0.9;
            const boardY = y + h * 0.1;

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fillRect(cx - poleW / 2, y, poleW, h);
                    ctx.fillRect(cx - boardW / 2, boardY, boardW, boardH);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.strokeRect(cx - poleW / 2, y, poleW, h);
                ctx.strokeRect(cx - boardW / 2, boardY, boardW, boardH);
                ctx.beginPath(); ctx.arc(cx, boardY + boardH / 2, 2, 0, Math.PI * 2); ctx.stroke();
            } else {
                rc.rectangle(cx - poleW / 2, y, poleW, h, { ...options, fill: 'none' });
                rc.rectangle(cx - boardW / 2, boardY, boardW, boardH, options);
                rc.circle(cx, boardY + boardH / 2, 4, { ...options, fill: options.strokeColor, fillStyle: 'solid' });
            }
        });
    }

    static burstBlob(): SketchnoteRenderer {
        return new SketchnoteRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const cx = x + w / 2;
            const cy = y + h / 2;
            const rx = w / 2;
            const ry = h / 2;
            const spikes = 12;
            const outerR = Math.min(rx, ry);
            const innerR = outerR * 0.6;
            const seed = element.seed || 1;

            let path = "";
            for (let i = 0; i < spikes * 2; i++) {
                const r = (i % 2 === 0) ? outerR : innerR;
                const rnd = randomSeeded(seed + i);
                const rVar = r + (rnd - 0.5) * (outerR * 0.1);
                const angle = (Math.PI * i) / spikes;
                const px = cx + Math.cos(angle) * w / h * rVar;
                const py = cy + Math.sin(angle) * rVar;
                if (i === 0) path += `M ${px} ${py}`;
                else path += ` L ${px} ${py}`;
            }
            path += " Z";

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(path));
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke(new Path2D(path));
            } else {
                rc.path(path, options);
            }
        });
    }
}
