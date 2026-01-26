import { ShapeRenderer } from "../base/shape-renderer";
import type { RenderContext } from "../base/types";
import { RenderPipeline } from "../base/render-pipeline";

export class UmlGeneralRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, cx: number, cy: number): void {
        const { ctx, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;

        ctx.beginPath();
        if (el.type === 'umlActor') {
            this.drawActorPath(ctx, x, y, w, h);
        } else if (el.type === 'umlUseCase' || el.type === 'umlInterface') {
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else if (el.type === 'umlPackage') {
            this.drawPackagePath(ctx, x, y, w, h);
        } else if (el.type === 'umlNote') {
            this.drawNotePath(ctx, x, y, w, h);
        }

        ctx.fillStyle = options.fill || 'transparent';
        if (options.fill && options.fill !== 'none') ctx.fill();
        ctx.lineWidth = el.strokeWidth;
        ctx.strokeStyle = options.stroke || '#000000';
        ctx.stroke();

        // Inner details (Note dog-ear fold)
        if (el.type === 'umlNote') {
            const fold = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x + w - fold, y);
            ctx.lineTo(x + w - fold, y + fold);
            ctx.lineTo(x + w, y + fold);
            ctx.stroke();
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    protected renderSketch(context: RenderContext, cx: number, cy: number): void {
        const { rc, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);
        const w = el.width;
        const h = el.height;
        const x = el.x;
        const y = el.y;

        if (el.type === 'umlActor') {
            // Stick figure
            // Head
            const headR = w * 0.15;
            rc.circle(x + w / 2, y + headR, headR * 2, options);
            // Body
            rc.line(x + w / 2, y + headR * 2, x + w / 2, y + h * 0.6, options);
            // Arms
            rc.line(x, y + h * 0.3, x + w, y + h * 0.3, options);
            // Legs
            rc.line(x + w / 2, y + h * 0.6, x, y + h, options);
            rc.line(x + w / 2, y + h * 0.6, x + w, y + h, options);
        } else if (el.type === 'umlUseCase' || el.type === 'umlInterface') {
            rc.ellipse(x + w / 2, y + h / 2, w, h, options);
        } else if (el.type === 'umlPackage') {
            const tabH = h * 0.15;
            const tabW = w * 0.4;
            const path = `M ${x} ${y} L ${x + tabW} ${y} L ${x + tabW} ${y + tabH} L ${x + w} ${y + tabH} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
            rc.path(path, options);
            // Tab line
            rc.line(x, y + tabH, x + tabW, y + tabH, options);
        } else if (el.type === 'umlNote') {
            const fold = Math.min(w, h) * 0.15;
            const path = `M ${x} ${y} L ${x + w - fold} ${y} L ${x + w} ${y + fold} L ${x + w} ${y + h} L ${x} ${y + h} L ${x} ${y} Z`;
            rc.path(path, options);
            // Fold line
            rc.path(`M ${x + w - fold} ${y} L ${x + w - fold} ${y + fold} L ${x + w} ${y + fold}`, options);
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        if (el.type === 'umlActor') {
            this.drawActorPath(ctx, el.x, el.y, el.width, el.height);
        } else if (el.type === 'umlUseCase' || el.type === 'umlInterface') {
            ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
        } else if (el.type === 'umlPackage') {
            this.drawPackagePath(ctx, el.x, el.y, el.width, el.height);
        } else if (el.type === 'umlNote') {
            this.drawNotePath(ctx, el.x, el.y, el.width, el.height);
        }
    }

    private drawActorPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        const headR = w * 0.15;
        // Head
        ctx.moveTo(x + w / 2 + headR, y + headR);
        ctx.arc(x + w / 2, y + headR, headR, 0, Math.PI * 2);
        // Body
        ctx.moveTo(x + w / 2, y + headR * 2);
        ctx.lineTo(x + w / 2, y + h * 0.6);
        // Arms
        ctx.moveTo(x, y + h * 0.3);
        ctx.lineTo(x + w, y + h * 0.3);
        // Legs
        ctx.moveTo(x + w / 2, y + h * 0.6);
        ctx.lineTo(x, y + h);
        ctx.moveTo(x + w / 2, y + h * 0.6);
        ctx.lineTo(x + w, y + h);
    }

    private drawPackagePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        const tabH = h * 0.15;
        const tabW = w * 0.4;
        ctx.moveTo(x, y);
        ctx.lineTo(x + tabW, y);
        ctx.lineTo(x + tabW, y + tabH);
        ctx.lineTo(x + w, y + tabH);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
    }

    private drawNotePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
        const fold = Math.min(w, h) * 0.15;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - fold, y);
        ctx.lineTo(x + w, y + fold);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
    }
}
