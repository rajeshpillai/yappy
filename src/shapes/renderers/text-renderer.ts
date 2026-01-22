import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";

export class TextRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    private renderCommon(context: RenderContext): void {
        const { ctx, element: el, isDarkMode } = context;
        if (!el.text) return;

        const fontSize = el.fontSize || 20;
        const fontFamily = el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
            el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                'Handlee, cursive';
        const fontWeight = (el.fontWeight === true || el.fontWeight === 'bold') ? 'bold ' : '';
        const fontStyle = (el.fontStyle === true || el.fontStyle === 'italic') ? 'italic ' : '';

        ctx.save();
        ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;

        // Text Stretching logic
        const metrics = ctx.measureText(el.text);
        const actualWidth = metrics.width;
        const scaleX = (el.width && actualWidth) ? (el.width / actualWidth) : 1;

        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);
        ctx.fillStyle = strokeColor;

        if (scaleX !== 1) {
            ctx.translate(el.x, el.y);
            ctx.scale(scaleX, 1);
            ctx.fillText(el.text, 0, fontSize);
        } else {
            ctx.fillText(el.text, el.x, el.y + fontSize);
        }
        ctx.restore();
    }
}
