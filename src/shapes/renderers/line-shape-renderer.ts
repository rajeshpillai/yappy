import { ShapeRenderer } from "../base/shape-renderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * LineShapeRenderer - Handles shapes made of line segments
 * 
 * Supports: cross (X), checkmark (✓)
 * These shapes are composed of one or more line segments
 */
export class LineShapeRenderer extends ShapeRenderer {
    private lineSegments: (x: number, y: number, w: number, h: number) => [number, number][][];

    constructor(lineSegments: (x: number, y: number, w: number, h: number) => [number, number][][]) {
        super();
        this.lineSegments = lineSegments;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, element } = context;
        const segments = this.lineSegments(element.x, element.y, element.width, element.height);

        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (const segment of segments) {
            ctx.moveTo(segment[0][0], segment[0][1]);
            for (let i = 1; i < segment.length; i++) {
                ctx.lineTo(segment[i][0], segment[i][1]);
            }
        }
        ctx.stroke();
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const segments = this.lineSegments(element.x, element.y, element.width, element.height);

        for (const segment of segments) {
            for (let i = 0; i < segment.length - 1; i++) {
                rc.line(
                    segment[i][0],
                    segment[i][1],
                    segment[i + 1][0],
                    segment[i + 1][1],
                    {
                        seed: options.seed,
                        roughness: options.roughness,
                        bowing: options.bowing,
                        stroke: options.stroke,
                        strokeWidth: options.strokeWidth,
                        strokeLineDash: options.strokeLineDash,
                    }
                );
            }
        }
    }

    /**
     * Static factory methods for common line shapes
     */
    static cross(): LineShapeRenderer {
        return new LineShapeRenderer((x, y, w, h) => [
            // Diagonal from top-left to bottom-right
            [[x, y], [x + w, y + h]],
            // Diagonal from top-right to bottom-left
            [[x + w, y], [x, y + h]]
        ]);
    }

    static checkmark(): LineShapeRenderer {
        return new LineShapeRenderer((x, y, w, h) => {
            const cy = y + h / 2;
            return [
                // Single checkmark path
                [
                    [x + w * 0.2, cy],
                    [x + w * 0.4, y + h * 0.7],
                    [x + w * 0.9, y + h * 0.2]
                ]
            ];
        });
    }
}
