import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * StickyNoteRenderer - Renders sticky note with folded corner
 * 
 * A polygon shape with a triangular fold in the bottom-right corner
 */
export class StickyNoteRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;
        const { mainPoints, foldPoints } = this.calculatePoints(element);

        // Fill main body
        const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
        if (fillVisible) {
            rc.polygon(mainPoints, { ...options, stroke: 'none', fill: options.fill });
            // Fold with solid fill style
            rc.polygon(foldPoints, { ...options, stroke: 'none', fill: options.fill, fillStyle: 'solid' });
        }

        // Stroke
        ctx.beginPath();
        ctx.moveTo(mainPoints[0][0], mainPoints[0][1]);
        for (let i = 1; i < mainPoints.length; i++) {
            ctx.lineTo(mainPoints[i][0], mainPoints[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Fold line
        ctx.beginPath();
        ctx.moveTo(foldPoints[1][0], foldPoints[1][1]);
        ctx.lineTo(foldPoints[2][0], foldPoints[2][1]);
        ctx.stroke();
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const { mainPoints, foldPoints } = this.calculatePoints(element);

        // Main body
        rc.polygon(mainPoints, {
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

        // Fold (with solid style for distinct appearance)
        rc.polygon(foldPoints, {
            seed: options.seed,
            roughness: options.roughness,
            bowing: options.bowing,
            stroke: options.stroke,
            strokeWidth: options.strokeWidth,
            fill: options.fill,
            fillStyle: 'solid',
        });
    }

    private calculatePoints(element: any) {
        const fold = Math.min(Math.abs(element.width), Math.abs(element.height)) * 0.15;
        const x = element.x, y = element.y, w = element.width, h = element.height;

        // Main body polygon (missing the bottom right corner)
        const mainPoints: [number, number][] = [
            [x, y],
            [x + w, y],
            [x + w, y + h - fold],
            [x + w - fold, y + h],
            [x, y + h]
        ];

        // The fold triangle
        const foldPoints: [number, number][] = [
            [x + w, y + h - fold],
            [x + w - fold, y + h - fold],
            [x + w - fold, y + h]
        ];

        return { mainPoints, foldPoints };
    }
}
