import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * RectangleRenderer - Handles rectangle shapes
 * 
 * Features:
 * - Supports roundness/borderRadius
 * - Inner borders (double-border effect)
 * - Dots fill pattern
 * - Both architectural and sketch modes
 */
export class RectangleRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { element } = context;
        const radius = this.getRadius(element);

        this.drawRect(context, options, element.x, element.y, element.width, element.height, radius, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                this.drawRect(context, options,
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

        this.drawRect(context, options, element.x, element.y, element.width, element.height, radius, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                const innerR = Math.max(0, radius - dist);
                this.drawRect(context, options,
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
            return Math.min(Math.abs(element.width), Math.abs(element.height)) * 0.15;
        }
        return 0;
    }

    /**
     * Draw rectangle helper (used for both outer and inner borders)
     */
    private drawRect(
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
        const opts = isInner
            ? { ...options, stroke: element.innerBorderColor || options.strokeColor, fill: 'none' }
            : options;

        // Custom Dots Handling
        if (element.fillStyle === 'dots' && !isInner) {
            this.applyDotsFillWithClip(ctx, element, options, () => {
                ctx.beginPath();
                if (r > 0) {
                    const path = new Path2D(this.getRoundedRectPath(x, y, w, h, r));
                    ctx.clip(path);
                } else {
                    ctx.rect(x, y, w, h);
                    ctx.clip();
                }
            });
        }

        if (element.renderStyle === 'architectural') {
            // Fill
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (!isInner && fillVisible && element.fillStyle !== 'dots') {
                if (r > 0) {
                    const path = this.getRoundedRectPath(x, y, w, h, r);
                    rc.path(path, { ...opts, stroke: 'none', fill: options.fill });
                } else {
                    rc.rectangle(x, y, w, h, { ...opts, stroke: 'none', fill: options.fill });
                }
            }

            // Stroke
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.strokeStyle = isInner ? (element.innerBorderColor || options.strokeColor) : options.strokeColor;
            ctx.lineWidth = options.strokeWidth;
            ctx.lineJoin = options.strokeLineJoin;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Sketch mode
            if (r > 0) {
                const path = this.getRoundedRectPath(x, y, w, h, r);
                rc.path(path, opts);
            } else {
                rc.rectangle(x, y, w, h, opts);
            }
        }
    }

    /**
     * Generate SVG path for rounded rectangle
     */
    private getRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
        const rX = Math.min(Math.abs(w) / 2, r);
        const rY = Math.min(Math.abs(h) / 2, r);
        return `M ${x + rX} ${y} L ${x + w - rX} ${y} Q ${x + w} ${y} ${x + w} ${y + rY} L ${x + w} ${y + h - rY} Q ${x + w} ${y + h} ${x + w - rX} ${y + h} L ${x + rX} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rY} L ${x} ${y + rY} Q ${x} ${y} ${x + rX} ${y}`;
    }
}
