import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * BoxWithLinesRenderer - Handles rectangle-based shapes with internal dividing lines
 * 
 * Supports: predefinedProcess (rectangle with 2 vertical lines), 
 *           internalStorage (rectangle with 1 vertical + 1 horizontal line)
 */
export class BoxWithLinesRenderer extends ShapeRenderer {
    private drawInternalLines: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokeColor: string, strokeWidth: number) => void;

    constructor(drawInternalLines: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokeColor: string, strokeWidth: number) => void) {
        super();
        this.drawInternalLines = drawInternalLines;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, rc, element } = context;

        // Fill
        if (options.fill && options.fill !== 'transparent' && options.fill !== 'none' && element.fillStyle !== 'dots') {
            rc.rectangle(element.x, element.y, element.width, element.height, { ...options, stroke: 'none', fill: options.fill });
        }

        // Stroke rectangle
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.strokeRect(element.x, element.y, element.width, element.height);

        // Internal lines
        this.drawInternalLines(ctx, element.x, element.y, element.width, element.height, options.strokeColor, options.strokeWidth);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;

        // Main rectangle
        rc.rectangle(element.x, element.y, element.width, element.height, {
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

        // Internal lines (using ctx for cleaner lines even in sketch mode)
        const ctx = context.ctx;
        ctx.save();
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        this.drawInternalLines(ctx, element.x, element.y, element.width, element.height, options.strokeColor, options.strokeWidth);
        ctx.restore();
    }

    /**
     * Static factory methods
     */
    static predefinedProcess(): BoxWithLinesRenderer {
        return new BoxWithLinesRenderer((ctx, x, y, w, h, _strokeColor, _strokeWidth) => {
            const sideBarWidth = w * 0.1;
            ctx.beginPath();
            ctx.moveTo(x + sideBarWidth, y);
            ctx.lineTo(x + sideBarWidth, y + h);
            ctx.moveTo(x + w - sideBarWidth, y);
            ctx.lineTo(x + w - sideBarWidth, y + h);
            ctx.stroke();
        });
    }

    static internalStorage(): BoxWithLinesRenderer {
        return new BoxWithLinesRenderer((ctx, x, y, w, h, _strokeColor, _strokeWidth) => {
            const lineOffset = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + lineOffset, y);
            ctx.lineTo(x + lineOffset, y + h);
            ctx.moveTo(x, y + lineOffset);
            ctx.lineTo(x + w, y + lineOffset);
            ctx.stroke();
        });
    }
}
