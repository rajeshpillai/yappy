import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * CircleRenderer - Handles circle/ellipse shapes
 * 
 * Features:
 * - Inner borders (double-circle effect)
 * - Dots fill pattern
 * - Both architectural and sketch modes
 */
export class CircleRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { element } = context;

        this.drawCircle(context, options, element.x, element.y, element.width, element.height, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                this.drawCircle(context, options,
                    element.x + dist,
                    element.y + dist,
                    element.width - dist * 2,
                    element.height - dist * 2,
                    true
                );
            }
        }
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { element } = context;

        this.drawCircle(context, options, element.x, element.y, element.width, element.height, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                this.drawCircle(context, options,
                    element.x + dist,
                    element.y + dist,
                    element.width - dist * 2,
                    element.height - dist * 2,
                    true
                );
            }
        }
    }

    /**
     * Draw circle helper (used for both outer and inner borders)
     */
    private drawCircle(
        context: RenderContext,
        options: RenderOptions,
        x: number,
        y: number,
        w: number,
        h: number,
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
                ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
                ctx.clip();
            });
        }

        if (element.renderStyle === 'architectural') {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const rx = Math.abs(w) / 2;
            const ry = Math.abs(h) / 2;

            // Fill
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (!isInner && fillVisible && element.fillStyle !== 'dots') {
                rc.ellipse(cx, cy, Math.abs(w), Math.abs(h), { ...options, stroke: 'none', fill: options.fill });
            }

            // Stroke
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = isInner ? (element.innerBorderColor || options.strokeColor) : options.strokeColor;
            ctx.lineWidth = options.strokeWidth;
            ctx.stroke();
        } else {
            // Sketch mode
            rc.ellipse(x + w / 2, y + h / 2, Math.abs(w), Math.abs(h), opts);
        }
    }
}
