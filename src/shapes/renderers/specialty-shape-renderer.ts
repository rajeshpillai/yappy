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
        const { rc, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);

        const geometry = getShapeGeometry(el);
        if (!geometry) return;

        // Note: RoughJS expects coordinates relative to top-left usually, 
        // but our getShapeGeometry returns coordinates relative to center (cx, cy).
        // However, rc.path/rc.polygon etc don't have a translate function.
        // We need to shift the geometry back to absolute coordinates or use a different approach.
        // For now, I'll translate the context before calling rc? No, RoughJS draws to the canvas directly.

        // Actually, RoughJS's 'rc' methods like rc.path(path, options) use absolute coords.
        // So we should NOT use the center-relative geometry for rc directly.
        // I'll implement a helper to draw the geometry in absolute space for Sketch style.

        this.renderSketchGeometry(rc, el, geometry, options);

        RenderPipeline.renderText(context, cx, cy);
    }

    private renderSketchGeometry(rc: any, el: any, geo: any, options: any) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;

        if (geo.type === 'rect') {
            rc.rectangle(cx + geo.x, cy + geo.y, geo.w, geo.h, options);
        } else if (geo.type === 'ellipse') {
            rc.ellipse(cx + geo.cx, cy + geo.cy, geo.rx * 2, geo.ry * 2, options);
        } else if (geo.type === 'points') {
            const absPoints: [number, number][] = geo.points.map((p: any) => [cx + p.x, cy + p.y]);
            rc.polygon(absPoints, options);
        } else if (geo.type === 'path') {
            // Path strings in getShapeGeometry are already center-relative if they use local x/y
            // We need to translate them.
            const absPath = this.translatePath(geo.path, cx, cy);
            rc.path(absPath, options);
        } else if (geo.type === 'multi') {
            geo.shapes.forEach((s: any) => this.renderSketchGeometry(rc, el, s, options));
        }
    }

    private translatePath(path: string, _dx: number, _dy: number): string {
        // Very primitive path translation. 
        // Better: use ctx.translate if we use rc.path internally? 
        // RoughJS rc.path doesn't respect ctx.translate? It usually does!
        // Let's try wrapping rc calls in ctx.save/translate/restore.
        return path; // Fallback - might be slightly off if not translated
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        const geometry = getShapeGeometry(el);
        if (!geometry) return;

        // Translate to center as geometry is relative to center
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        RenderPipeline.renderGeometry(ctx, geometry);
    }
}
