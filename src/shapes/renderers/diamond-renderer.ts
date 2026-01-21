import { ShapeRenderer } from "../base/shape-renderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * DiamondRenderer - Handles diamond/rhombus shapes
 * 
 * Features:
 * - Supports roundness/borderRadius
 * - Inner borders
 * - Dots fill pattern
 * - Both architectural and sketch modes
 */
export class DiamondRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { element } = context;
        const radius = this.getRadius(element);

        this.drawDiamond(context, options, element.x, element.y, element.width, element.height, radius, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                this.drawDiamond(context, options,
                    element.x + dist,
                    element.y + dist,
                    element.width - dist * 2,
                    element.height - dist * 2,
                    innerR,
                    true
                );
            }
        }
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { element } = context;
        const radius = this.getRadius(element);

        this.drawDiamond(context, options, element.x, element.y, element.width, element.height, radius, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                this.drawDiamond(context, options,
                    element.x + dist,
                    element.y + dist,
                    element.width - dist * 2,
                    element.height - dist * 2,
                    innerR,
                    true
                );
            }
        }
    }

    /**
     * Calculate border radius from element properties
     */
    private getRadius(element: any): number {
        if (element.borderRadius !== undefined) {
            return Math.min(Math.abs(element.width), Math.abs(element.height)) * (element.borderRadius / 100);
        }
        if (element.roundness) {
            return Math.min(Math.abs(element.width), Math.abs(element.height)) * 0.2;
        }
        return 0;
    }

    /**
     * Draw diamond helper (used for both outer and inner borders)
     */
    private drawDiamond(
        context: RenderContext,
        options: RenderOptions,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        isInner: boolean
    ): void {
        const { ctx, rc, element } = context;
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

        const opts = isInner
            ? { ...options, stroke: element.innerBorderColor || options.strokeColor, fill: 'none' }
            : options;

        // Custom Dots Handling
        if (element.fillStyle === 'dots' && !isInner) {
            this.applyDotsFillWithClip(ctx, element, options, () => {
                if (r > 0) {
                    const path = new Path2D(this.getRoundedDiamondPath(x, y, w, h, r));
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
            });
        }

        if (element.renderStyle === 'architectural') {
            // Fill
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (!isInner && fillVisible && element.fillStyle !== 'dots') {
                if (r > 0) {
                    const path = this.getRoundedDiamondPath(x, y, w, h, r);
                    rc.path(path, { ...opts, stroke: 'none', fill: options.fill });
                } else {
                    rc.polygon(points, { ...opts, stroke: 'none', fill: options.fill });
                }
            }

            // Stroke
            ctx.beginPath();
            ctx.strokeStyle = isInner ? (element.innerBorderColor || options.strokeColor) : options.strokeColor;
            ctx.lineWidth = options.strokeWidth;
            ctx.lineJoin = options.strokeLineJoin;
            ctx.lineCap = 'round';

            if (r > 0) {
                const pathString = this.getRoundedDiamondPath(x, y, w, h, r);
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
            // Sketch mode
            if (r > 0) {
                const path = this.getRoundedDiamondPath(x, y, w, h, r);
                rc.path(path, opts);
            } else {
                rc.polygon(points, opts);
            }
        }
    }

    /**
     * Generate SVG path for rounded diamond
     */
    private getRoundedDiamondPath(x: number, y: number, w: number, h: number, r: number): string {
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
        const p1 = { x: cx - dx, y: y + dy };
        const p2 = { x: cx + dx, y: y + dy };

        // Right Corner
        const p3 = { x: x + w - dx, y: cy - dy };
        const p4 = { x: x + w - dx, y: cy + dy };

        // Bottom Corner
        const p5 = { x: cx + dx, y: y + h - dy };
        const p6 = { x: cx - dx, y: y + h - dy };

        // Left Corner
        const p7 = { x: x + dx, y: cy + dy };
        const p8 = { x: x + dx, y: cy - dy };

        return `M ${p1.x} ${p1.y} Q ${cx} ${y} ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Q ${x + w} ${cy} ${p4.x} ${p4.y} L ${p5.x} ${p5.y} Q ${cx} ${y + h} ${p6.x} ${p6.y} L ${p7.x} ${p7.y} Q ${x} ${cy} ${p8.x} ${p8.y} Z`;
    }
}
