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
            ctx.fillStyle = RenderPipeline.adjustColor(highlightColor, isDarkMode);

            // For now, Text elements are simple single-line or manually wrapped with \n?
            // Let's split by newline if present
            const lines = el.text.split('\n');
            const lineHeight = fontSize * 1.2;

            lines.forEach((line, index) => {
                const lineWidth = ctx.measureText(line).width;
                const hPadding = 4;
                const vPadding = 2;
                const yOffset = el.y + index * lineHeight;

                ctx.fillRect(
                    el.x - hPadding,
                    yOffset + vPadding,
                    lineWidth + hPadding * 2,
                    lineHeight - vPadding * 2
                );
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
}
