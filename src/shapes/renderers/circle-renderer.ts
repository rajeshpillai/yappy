import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";

export class CircleRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, cx: number, cy: number): void {
        const { ctx, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);

        this.drawCircleArch(ctx, el.x, el.y, el.width, el.height, el.strokeWidth, options.stroke!, options.fill);

        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                this.drawCircleArch(ctx, el.x + dist, el.y + dist, el.width - dist * 2, el.height - dist * 2, el.strokeWidth, el.innerBorderColor || options.stroke!, 'none');
            }
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    protected renderSketch(context: RenderContext, cx: number, cy: number): void {
        const { rc, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);

        rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width), Math.abs(el.height), options);

        if (el.drawInnerBorder) {
            const dist = el.innerBorderDistance || 5;
            if (el.width > dist * 2 && el.height > dist * 2) {
                const innerOpts = { ...options, stroke: el.innerBorderColor || options.stroke, fill: 'none' };
                rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width) - dist * 2, Math.abs(el.height) - dist * 2, innerOpts);
            }
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    private drawCircleArch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokeWidth: number, stroke: string, fill?: string) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = Math.abs(w) / 2;
        const ry = Math.abs(h) / 2;

        if (fill && fill !== 'transparent' && fill !== 'none') {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}
