import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";
import { cubicBezier, cubicBezierAngle, normalizePoints } from "../../utils/geometry";
import { getFontString } from "../../utils/textUtils";

// Helper for rounded rect path
function getRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
    return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y}`;
}

/**
 * WireframeRenderer - Handles UI wireframe elements
 * 
 * Supports: browserWindow, mobilePhone, ghostButton, inputField, organicBranch
 */
export class WireframeRenderer extends ShapeRenderer {
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

    static browserWindow(): WireframeRenderer {
        return new WireframeRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';

            const headerH = Math.min(h * 0.15, 30);
            const dotR = headerH * 0.2;
            const addressH = headerH * 0.6;
            const addressW = w * 0.6;
            const addressX = x + (w - addressW) / 2;
            const addressY = y + (headerH - addressH) / 2;

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fillRect(x, y, w, h);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.strokeRect(x, y, w, h);
                ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();
                ctx.fillStyle = options.strokeColor;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath(); ctx.arc(x + headerH * (0.4 + i * 0.5), y + headerH / 2, dotR, 0, Math.PI * 2); ctx.fill();
                }
                ctx.strokeRect(addressX, addressY, addressW, addressH);
            } else {
                rc.rectangle(x, y, w, h, options);
                rc.line(x, y + headerH, x + w, y + headerH, options);
                for (let i = 0; i < 3; i++) {
                    rc.circle(x + headerH * (0.4 + i * 0.5), y + headerH / 2, dotR * 2, { ...options, fillStyle: 'solid', fill: options.strokeColor });
                }
                rc.rectangle(addressX, addressY, addressW, addressH, options);
            }
        });
    }

    static mobilePhone(): WireframeRenderer {
        return new WireframeRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const r = Math.min(w, h) * 0.15;
            const notchW = w * 0.3;
            const notchH = h * 0.03;
            const homeBarW = w * 0.4;
            const homeBarY = y + h - (h * 0.05);

            const path = getRoundedRectPath(x, y, w, h, r);

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(path));
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.stroke(new Path2D(path));
                ctx.beginPath();
                ctx.roundRect(x + (w - notchW) / 2, y + 5, notchW, notchH, 5);
                ctx.fillStyle = options.strokeColor;
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(x + (w - homeBarW) / 2, homeBarY, homeBarW, 4, 2);
                ctx.fill();
            } else {
                rc.path(path, options);
                rc.rectangle(x + (w - notchW) / 2, y + 5, notchW, notchH, { ...options, fillStyle: 'solid', fill: options.strokeColor });
                rc.line(x + (w - homeBarW) / 2, homeBarY, x + (w + homeBarW) / 2, homeBarY, options);
            }
        });
    }

    static ghostButton(): WireframeRenderer {
        return new WireframeRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';
            const r = Math.min(w, h) * 0.2;
            const path = getRoundedRectPath(x, y, w, h, r);
            const ghostOptions = { ...options, strokeStyle: 'dashed', strokeLineDash: [4, 4] };

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(path));
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.setLineDash([4, 4]);
                ctx.stroke(new Path2D(path));
                ctx.setLineDash([]);
            } else {
                rc.path(path, ghostOptions);
            }
        });
    }

    static inputField(): WireframeRenderer {
        return new WireframeRenderer((context, options) => {
            const { ctx, rc, element } = context;
            const { x, y, width: w, height: h } = element;
            const isArch = element.renderStyle === 'architectural';

            if (isArch) {
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fillRect(x, y, w, h);
                }
                ctx.strokeStyle = options.strokeColor;
                ctx.lineWidth = options.strokeWidth;
                ctx.strokeRect(x, y, w, h);
                ctx.beginPath();
                ctx.moveTo(x + 10, y + 8);
                ctx.lineTo(x + 10, y + h - 8);
                ctx.stroke();
            } else {
                rc.rectangle(x, y, w, h, options);
                rc.line(x + 10, y + 8, x + 10, y + h - 8, options);
            }
        });
    }

    static organicBranch(): WireframeRenderer {
        return new WireframeRenderer((context, options) => {
            const { ctx, element } = context;
            const { x, y, width: w, height: h } = element;
            const strokeColor = options.strokeColor;

            // Calculate Control Points (matching legacy logic)
            let start = { x, y };
            let end = { x: x + w, y: y + h };

            if (element.points && element.points.length >= 2) {
                const pts = normalizePoints(element.points);
                if (pts.length > 0) {
                    start = { x: x + pts[0].x, y: y + pts[0].y };
                    end = { x: x + pts[pts.length - 1].x, y: y + pts[pts.length - 1].y };
                }
            }

            let cp1: { x: number, y: number }, cp2: { x: number, y: number };
            if (element.controlPoints && element.controlPoints.length === 2) {
                cp1 = { x: element.controlPoints[0].x, y: element.controlPoints[0].y };
                cp2 = { x: element.controlPoints[1].x, y: element.controlPoints[1].y };
            } else {
                // Fallback calculation (Simple S-curve)
                const dx = end.x - start.x;
                cp1 = { x: start.x + dx * 0.5, y: start.y }; // Control point 1
                cp2 = { x: end.x - dx * 0.5, y: end.y };     // Control point 2
            }

            // Draw tapered organic branch
            const segments = 20;
            const pointsTop: { x: number, y: number }[] = [];
            const pointsBottom: { x: number, y: number }[] = [];

            // Tapering: Start thick, end thin
            const widthVal = element.strokeWidth || 1;
            const startWidth = Math.max(widthVal * 8, 4);
            const endWidth = Math.max(widthVal * 2, 2);

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const px = cubicBezier(start.x, cp1.x, cp2.x, end.x, t);
                const py = cubicBezier(start.y, cp1.y, cp2.y, end.y, t);

                const angle = cubicBezierAngle(start, cp1, cp2, end, t);

                // Linear interpolation of width
                const currentWidth = startWidth + (endWidth - startWidth) * t;
                const halfWidth = currentWidth / 2;

                // Calculate offset points (normal to curve)
                const offsetX = Math.cos(angle + Math.PI / 2) * halfWidth;
                const offsetY = Math.sin(angle + Math.PI / 2) * halfWidth;

                pointsTop.push({ x: px + offsetX, y: py + offsetY });
                pointsBottom.push({ x: px - offsetX, y: py - offsetY });
            }

            // Draw the tapered shape
            ctx.beginPath();
            if (pointsTop.length > 0) {
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
            }
            ctx.closePath();
            ctx.fillStyle = strokeColor;
            ctx.fill();

            // Text on Path
            const text = element.containerText || element.text || "";
            if (text) {
                ctx.save();
                ctx.font = getFontString(element);
                ctx.fillStyle = strokeColor; // Use stroke color for text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Place text near center 
                const centerX = cubicBezier(start.x, cp1.x, cp2.x, end.x, 0.5);
                const centerY = cubicBezier(start.y, cp1.y, cp2.y, end.y, 0.5);
                const angle = cubicBezierAngle(start, cp1, cp2, end, 0.5);

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
        });
    }
}
