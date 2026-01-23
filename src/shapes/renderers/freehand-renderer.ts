import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { normalizePoints } from "../../utils/render-element";

export class FreehandRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    private renderCommon(context: RenderContext): void {
        const { ctx, element: el, isDarkMode, layerOpacity } = context;
        if (!el.points || el.points.length === 0) return;

        const absPoints = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));
        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;

        if (el.type === 'fineliner') {
            this.renderFineliner(ctx, absPoints, el.strokeWidth);
        } else if (el.type === 'inkbrush') {
            this.renderInkbrush(ctx, absPoints, el.strokeWidth);
        } else if (el.type === 'marker') {
            this.renderMarker(ctx, absPoints, el.strokeWidth, el.opacity, layerOpacity);
        } else if (el.type === 'ink') {
            this.renderFineliner(ctx, absPoints, el.strokeWidth);
        }

        ctx.restore();
    }

    private renderFineliner(ctx: CanvasRenderingContext2D, pts: any[], width: number) {
        if (pts.length < 6) {
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); ctx.fill();
            return;
        }
        ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 2; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2, midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts.length - 1;
        ctx.quadraticCurveTo(pts[last - 1].x, pts[last - 1].y, pts[last].x, pts[last].y);
        ctx.stroke();
    }

    private renderInkbrush(ctx: CanvasRenderingContext2D, pts: any[], width: number) {
        if (pts.length < 4) {
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); ctx.fill();
            return;
        }
        ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = width * 0.5;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        let i = 1;
        while (i < pts.length - 2) {
            ctx.bezierCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, pts[i + 2].x, pts[i + 2].y);
            i += 3;
        }
        while (i < pts.length) {
            if (i === pts.length - 2) { ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); i += 2; }
            else { ctx.lineTo(pts[i].x, pts[i].y); i++; }
        }
        ctx.stroke();
    }

    private renderMarker(ctx: CanvasRenderingContext2D, pts: any[], width: number, opacity: number | undefined, layerOpacity: number) {
        ctx.globalAlpha = ((opacity ?? 100) / 100) * layerOpacity * 0.5;
        ctx.globalCompositeOperation = 'multiply';
        this.renderFineliner(ctx, pts, width * 4);
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        const pts = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));
        if (pts.length < 2) return;

        // Use similar logic to fineliner for smooth path
        if (pts.length < 6) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            return;
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 2; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2, midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts.length - 1;
        ctx.quadraticCurveTo(pts[last - 1].x, pts[last - 1].y, pts[last].x, pts[last].y);
    }
}
