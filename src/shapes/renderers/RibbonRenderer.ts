import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * RibbonRenderer - Banner/ribbon shape with folded ears
 * 
 * Composite of 3 polygons: left ear, right ear, main rectangle
 */
export class RibbonRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;
        const { leftEar, rightEar, mainPoints } = this.calculatePoints(element);

        // Fill
        if (options.fill && options.fill !== 'transparent' && options.fill !== 'none' && element.fillStyle !== 'dots') {
            rc.polygon(leftEar, { ...options, stroke: 'none', fill: options.fill });
            rc.polygon(rightEar, { ...options, stroke: 'none', fill: options.fill });
            rc.polygon(mainPoints, { ...options, stroke: 'none', fill: options.fill });
        }

        // Stroke
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
        drawPoly(mainPoints);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const { leftEar, rightEar, mainPoints } = this.calculatePoints(element);

        rc.polygon(leftEar, {
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
        rc.polygon(rightEar, { ...options, seed: options.seed + 1 });
        rc.polygon(mainPoints, { ...options, seed: options.seed + 2 });
    }

    private calculatePoints(element: any) {
        const { x, y, width: w, height: h } = element;
        const earWidth = w * 0.15;
        const earHeight = h * 0.3;

        const mainPoints: [number, number][] = [
            [x + earWidth, y],
            [x + w - earWidth, y],
            [x + w - earWidth, y + h - earHeight],
            [x + earWidth, y + h - earHeight]
        ];

        const leftEar: [number, number][] = [
            [x + earWidth, y + earHeight],
            [x, y + earHeight],
            [x + earWidth / 2, y + earHeight + (h - earHeight) / 2],
            [x, y + h],
            [x + earWidth, y + h]
        ];

        const rightEar: [number, number][] = [
            [x + w - earWidth, y + earHeight],
            [x + w, y + earHeight],
            [x + w - earWidth / 2, y + earHeight + (h - earHeight) / 2],
            [x + w, y + h],
            [x + w - earWidth, y + h]
        ];

        return { leftEar, rightEar, mainPoints };
    }
}
