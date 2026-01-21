import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * DirectionalArrowRenderer - Handles directional arrow shapes
 * 
 * Supports: arrowLeft, arrowRight, arrowUp, arrowDown
 * These are polygon-based arrows with a shaft and triangular head
 */
export class DirectionalArrowRenderer extends ShapeRenderer {
    private calculatePoints: (x: number, y: number, w: number, h: number) => [number, number][];

    constructor(calculatePoints: (x: number, y: number, w: number, h: number) => [number, number][]) {
        super();
        this.calculatePoints = calculatePoints;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;
        const points = this.calculatePoints(element.x, element.y, element.width, element.height);

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
        ctx.lineJoin = 'round';
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
     * Static factory methods for directional arrows
     */
    static arrowRight(): DirectionalArrowRenderer {
        return new DirectionalArrowRenderer((x, y, w, h) => {
            const arrowHeadSize = Math.min(w, h) * 0.4;
            return [
                [x, y + h * 0.3],
                [x + w - arrowHeadSize, y + h * 0.3],
                [x + w - arrowHeadSize, y],
                [x + w, y + h / 2],
                [x + w - arrowHeadSize, y + h],
                [x + w - arrowHeadSize, y + h * 0.7],
                [x, y + h * 0.7]
            ];
        });
    }

    static arrowLeft(): DirectionalArrowRenderer {
        return new DirectionalArrowRenderer((x, y, w, h) => {
            const arrowHeadSize = Math.min(w, h) * 0.4;
            return [
                [x + w, y + h * 0.3],
                [x + arrowHeadSize, y + h * 0.3],
                [x + arrowHeadSize, y],
                [x, y + h / 2],
                [x + arrowHeadSize, y + h],
                [x + arrowHeadSize, y + h * 0.7],
                [x + w, y + h * 0.7]
            ];
        });
    }

    static arrowDown(): DirectionalArrowRenderer {
        return new DirectionalArrowRenderer((x, y, w, h) => {
            const arrowHeadSize = Math.min(w, h) * 0.4;
            return [
                [x + w * 0.3, y],
                [x + w * 0.3, y + h - arrowHeadSize],
                [x, y + h - arrowHeadSize],
                [x + w / 2, y + h],
                [x + w, y + h - arrowHeadSize],
                [x + w * 0.7, y + h - arrowHeadSize],
                [x + w * 0.7, y]
            ];
        });
    }

    static arrowUp(): DirectionalArrowRenderer {
        return new DirectionalArrowRenderer((x, y, w, h) => {
            const arrowHeadSize = Math.min(w, h) * 0.4;
            return [
                [x + w * 0.3, y + h],
                [x + w * 0.3, y + arrowHeadSize],
                [x, y + arrowHeadSize],
                [x + w / 2, y],
                [x + w, y + arrowHeadSize],
                [x + w * 0.7, y + arrowHeadSize],
                [x + w * 0.7, y + h]
            ];
        });
    }
}
