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

        // Text Stretching logic (only for single line text elements without highlight)
        const metrics = ctx.measureText(el.text);
        const actualWidth = metrics.width;
        const scaleX = (el.width && actualWidth && !el.textHighlightEnabled) ? (el.width / actualWidth) : 1;

        const textColorRaw = el.textColor || el.strokeColor;
        const textColor = RenderPipeline.adjustColor(textColorRaw, isDarkMode);

        ctx.textBaseline = 'hanging';

        if (el.textHighlightEnabled) {
            const highlightColor = el.textHighlightColor || 'rgba(255, 255, 0, 0.4)';
            const padding = el.textHighlightPadding ?? 4;
            const radius = el.textHighlightRadius ?? 2;

            ctx.fillStyle = RenderPipeline.adjustColor(highlightColor, isDarkMode);

            const lines = el.text.split('\n');
            const lineHeight = fontSize * 1.2;

            // Baseline adjustment for better visual centering
            const baselineShift = el.fontFamily === 'hand-drawn' ? -2 : 0;

            lines.forEach((line, index) => {
                const lineWidth = ctx.measureText(line).width;
                const yOffset = el.y + index * lineHeight + baselineShift;
                const vPadding = padding / 2;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(
                        el.x - padding,
                        yOffset - vPadding,
                        lineWidth + padding * 2,
                        lineHeight + vPadding * 2,
                        radius
                    );
                } else {
                    ctx.rect(
                        el.x - padding,
                        yOffset - vPadding,
                        lineWidth + padding * 2,
                        lineHeight + vPadding * 2
                    );
                }
                ctx.fill();
            });

            ctx.fillStyle = textColor;
            lines.forEach((line, index) => {
                const yOffset = el.y + index * lineHeight;
                ctx.fillText(line, el.x, yOffset);
            });
        } else {
            ctx.fillStyle = textColor;
            if (scaleX !== 1) {
                ctx.translate(el.x, el.y);
                ctx.scale(scaleX, 1);
                ctx.fillText(el.text, 0, 0);
            } else {
                ctx.fillText(el.text, el.x, el.y);
            }
        }
        ctx.restore();
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        ctx.rect(el.x, el.y, el.width, el.height);
    }
}
