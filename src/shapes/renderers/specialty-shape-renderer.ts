import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { getShapeGeometry } from "../../utils/shape-geometry";

export class SpecialtyShapeRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, cx: number, cy: number): void {
        const { ctx, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);
        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);
        const backgroundColor = el.backgroundColor === 'transparent' ? undefined : RenderPipeline.adjustColor(el.backgroundColor, isDarkMode);

        const geometry = getShapeGeometry(el);
        if (!geometry) return;

        ctx.save();
        ctx.translate(cx, cy);

        const fillVisible = options.fill && options.fill !== 'transparent' && options.fill !== 'none';
        if (fillVisible && backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.beginPath();
            RenderPipeline.renderGeometry(ctx, geometry);
            ctx.fill();
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';
        ctx.beginPath();
        RenderPipeline.renderGeometry(ctx, geometry);
        ctx.stroke();

        ctx.restore();
        RenderPipeline.renderText(context, cx, cy);
    }

    protected renderSketch(context: RenderContext, cx: number, cy: number): void {
        const { rc, ctx, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);

        const geometry = getShapeGeometry(el);
        if (!geometry) return;

        ctx.save();
        ctx.translate(cx, cy);

        this.renderSketchGeometry(rc, geometry, options);

        ctx.restore();
        RenderPipeline.renderText(context, cx, cy);
    }

    private renderSketchGeometry(rc: any, geo: any, options: any) {
        if (geo.type === 'rect') {
            rc.rectangle(geo.x, geo.y, geo.w, geo.h, options);
        } else if (geo.type === 'ellipse') {
            rc.ellipse(geo.cx, geo.cy, geo.rx * 2, geo.ry * 2, options);
        } else if (geo.type === 'points') {
            // Points are already relative to center in geometry
            const points: [number, number][] = geo.points.map((p: any) => [p.x, p.y]);
            rc.polygon(points, options);
        } else if (geo.type === 'path') {
            rc.path(geo.path, options);
        } else if (geo.type === 'multi') {
            geo.shapes.forEach((s: any) => this.renderSketchGeometry(rc, s, options));
        }
    }



    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        const geometry = getShapeGeometry(el);
        if (!geometry) return;

        // Translate to center as geometry is relative to center
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        RenderPipeline.renderGeometry(ctx, geometry);
    }
}
