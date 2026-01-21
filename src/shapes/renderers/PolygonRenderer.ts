import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * PolygonRenderer - Handles regular polygon shapes
 * 
 * Supports: hexagon (6), septagon (7), octagon (8), pentagon (5)
 * Could be extended to support any n-sided regular polygon
 */
export class PolygonRenderer extends ShapeRenderer {
    private sides: number;

    constructor(sides: number) {
        super();
        this.sides = sides;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, element } = context;
        const points = this.calculatePoints(element);

        // Fill (if gradient wasn't already applied)
        const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
        if (fillVisible && element.fillStyle !== 'dots') {
            ctx.fillStyle = options.fill!;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.fill();
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
        const points = this.calculatePoints(element);

        // Convert to RoughJS format
        const roughPoints: [number, number][] = points.map(p => [p[0], p[1]]);

        rc.polygon(roughPoints, {
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
     * Calculate polygon vertices
     */
    private calculatePoints(element: any): [number, number][] {
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        const rx = element.width / 2;
        const ry = element.height / 2;
        const points: [number, number][] = [];

        for (let i = 0; i < this.sides; i++) {
            const angle = (2 * Math.PI / this.sides) * i - Math.PI / 2; // Start at top
            points.push([
                cx + rx * Math.cos(angle),
                cy + ry * Math.sin(angle)
            ]);
        }

        return points;
    }
}
