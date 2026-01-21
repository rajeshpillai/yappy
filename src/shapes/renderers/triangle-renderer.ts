import { ShapeRenderer } from "../base/shape-renderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * TriangleRenderer - Handles triangle shapes
 * 
 * Features:
 * - Inner borders
 * - Dots fill pattern
 * - Both architectural and sketch modes
 */
export class TriangleRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { element } = context;

        this.drawTriangle(context, options, element.x, element.y, element.width, element.height, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                // Approximate inner triangle by reducing bbox
                this.drawTriangle(context, options,
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

        this.drawTriangle(context, options, element.x, element.y, element.width, element.height, false);

        // Draw inner border if configured
        if (element.drawInnerBorder) {
            const dist = element.innerBorderDistance || 5;
            if (element.width > dist * 2 && element.height > dist * 2) {
                this.drawTriangle(context, options,
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
     * Draw triangle helper (used for both outer and inner borders)
     */
    private drawTriangle(
        context: RenderContext,
        options: RenderOptions,
        x: number,
        y: number,
        w: number,
        h: number,
        isInner: boolean
    ): void {
        const { ctx, rc, element } = context;
        const cx = x + w / 2;
        const points: [number, number][] = [
            [cx, y],              // Top
            [x + w, y + h],       // Bottom right
            [x, y + h]            // Bottom left
        ];

        const opts = isInner
            ? { ...options, stroke: element.innerBorderColor || options.strokeColor, fill: 'none' }
            : options;

        // Custom Dots Handling
        if (element.fillStyle === 'dots' && !isInner) {
            this.applyDotsFillWithClip(ctx, element, options, () => {
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.clip();
            });
        }

        if (element.renderStyle === 'architectural') {
            // Fill
            const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
            if (!isInner && fillVisible && element.fillStyle !== 'dots') {
                rc.polygon(points, { ...opts, stroke: 'none', fill: options.fill });
            }

            // Stroke
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.closePath();
            ctx.strokeStyle = isInner ? (element.innerBorderColor || options.strokeColor) : options.strokeColor;
            ctx.lineWidth = options.strokeWidth;
            ctx.lineJoin = options.strokeLineJoin;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Sketch mode
            rc.polygon(points, opts);
        }
    }
}
