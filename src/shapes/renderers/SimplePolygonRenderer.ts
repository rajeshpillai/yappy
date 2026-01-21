import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * Type for point calculation functions
 */
type PointCalculator = (x: number, y: number, w: number, h: number) => [number, number][];

/**
 * SimplePolygonRenderer - Handles shapes defined by fixed point patterns
 * 
 * Supports: parallelogram, trapezoid, rightTriangle
 * These shapes are defined by their corner points relative to bounding box
 */
export class SimplePolygonRenderer extends ShapeRenderer {
    private calculatePoints: PointCalculator;

    constructor(calculatePoints: PointCalculator) {
        super();
        this.calculatePoints = calculatePoints;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;
        const points = this.calculatePoints(element.x, element.y, element.width, element.height);

        // Fill
        const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
        if (fillVisible && element.fillStyle !== 'dots') {
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
        const points = this.calculatePoints(element.x, element.y, element.width, element.height);

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
     * Static factory methods for common shapes
     */
    static parallelogram(): SimplePolygonRenderer {
        return new SimplePolygonRenderer((x, y, w, h) => {
            const offset = w * 0.2;
            return [
                [x + offset, y],
                [x + w, y],
                [x + w - offset, y + h],
                [x, y + h]
            ];
        });
    }

    static trapezoid(): SimplePolygonRenderer {
        return new SimplePolygonRenderer((x, y, w, h) => {
            const offset = w * 0.2;
            return [
                [x + offset, y],
                [x + w - offset, y],
                [x + w, y + h],
                [x, y + h]
            ];
        });
    }

    static rightTriangle(): SimplePolygonRenderer {
        return new SimplePolygonRenderer((x, y, w, h) => [
            [x, y],
            [x, y + h],
            [x + w, y + h]
        ]);
    }
}
