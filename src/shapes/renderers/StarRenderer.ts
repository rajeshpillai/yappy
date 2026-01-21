import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * StarRenderer - Handles star shapes with parametric point control
 * 
 * Features:
 * - Configurable number of points (starPoints property)
 * - Adjustable sharpness (shapeRatio property)
 * - Both architectural and sketch modes
 */
export class StarRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;
        const points = this.calculateStarPoints(element);

        // Fill
        if (options.fill && options.fill !== 'transparent' && options.fill !== 'none' && element.fillStyle !== 'dots') {
            rc.polygon(points, { ...options, stroke: 'none', fill: options.fill });
        }

        // Stroke
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.lineJoin = options.strokeLineJoin;
        ctx.stroke();
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const points = this.calculateStarPoints(element);

        rc.polygon(points, {
            seed: options.seed,
            roughness: options.roughness,
            bowing: options.bowing,
            stroke: options.stroke,
            strokeWidth: options.strokeWidth,
            fill: options.fill,
            fillStyle: options.fillStyle,
            fillWeight: options.fillWeight,
            hachureGap: options.hachureGap,
            strokeLineDash: options.strokeLineDash,
            hachureAngle: -41 + (options.seed % 360),
        });
    }

    /**
     * Calculate star points based on element properties
     */
    private calculateStarPoints(element: any): [number, number][] {
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        const outerRadius = Math.min(element.width, element.height) / 2;

        // Parametric sharpness (default 0.38)
        const ratio = (element.shapeRatio !== undefined ? element.shapeRatio : 38) / 100;
        const innerRadius = outerRadius * ratio;
        const numPoints = element.starPoints || 5;

        const points: [number, number][] = [];

        for (let i = 0; i < numPoints * 2; i++) {
            const angle = (Math.PI / numPoints) * i - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            points.push([
                cx + radius * Math.cos(angle),
                cy + radius * Math.sin(angle)
            ]);
        }

        return points;
    }
}
