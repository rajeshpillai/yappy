import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { normalizePoints } from "../../utils/render-element";

export class PathRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    private renderCommon(context: RenderContext): void {
        const { ctx, element: el, isDarkMode } = context;
        const color = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);

        if (el.type === 'organicBranch') {
            const pts = normalizePoints(el.points);
            const controls = el.controlPoints || [];
            if (pts.length < 2 || controls.length < 2) return;

            const start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            const end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
            const cp1 = controls[0];
            const cp2 = controls[1];

            this.drawOrganicBranch(ctx, start, end, cp1, cp2, color, el.strokeWidth, el.text || "", color);
        }
    }

    private cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number) {
        const k = 1 - t;
        return k * k * k * p0 + 3 * k * k * t * p1 + 3 * k * t * t * p2 + t * t * t * p3;
    };

    private cubicBezierAngle(p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, t: number) {
        const dx = 3 * (1 - t) * (1 - t) * (p1.x - p0.x) + 6 * (1 - t) * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
        const dy = 3 * (1 - t) * (1 - t) * (p1.y - p0.y) + 6 * (1 - t) * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
        return Math.atan2(dy, dx);
    };

    private drawOrganicBranch(
        ctx: CanvasRenderingContext2D,
        start: { x: number, y: number },
        end: { x: number, y: number },
        cp1: { x: number, y: number },
        cp2: { x: number, y: number },
        color: string,
        width: number,
        text: string,
        textColor: string
    ) {
        const segments = 20;
        const pointsTop: { x: number, y: number }[] = [];
        const pointsBottom: { x: number, y: number }[] = [];

        const startWidth = Math.max(width * 8, 4);
        const endWidth = Math.max(width * 2, 2);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = this.cubicBezier(start.x, cp1.x, cp2.x, end.x, t);
            const y = this.cubicBezier(start.y, cp1.y, cp2.y, end.y, t);
            const angle = this.cubicBezierAngle(start, cp1, cp2, end, t);

            const currentWidth = startWidth + (endWidth - startWidth) * t;
            const halfWidth = currentWidth / 2;

            const offsetX = Math.cos(angle + Math.PI / 2) * halfWidth;
            const offsetY = Math.sin(angle + Math.PI / 2) * halfWidth;

            pointsTop.push({ x: x + offsetX, y: y + offsetY });
            pointsBottom.push({ x: x - offsetX, y: y - offsetY });
        }

        ctx.beginPath();
        ctx.moveTo(pointsTop[0].x, pointsTop[0].y);
        for (let i = 1; i < pointsTop.length; i++) ctx.lineTo(pointsTop[i].x, pointsTop[i].y);
        ctx.lineTo(pointsBottom[pointsBottom.length - 1].x, pointsBottom[pointsBottom.length - 1].y);
        for (let i = pointsBottom.length - 2; i >= 0; i--) ctx.lineTo(pointsBottom[i].x, pointsBottom[i].y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (text) {
            ctx.save();
            ctx.font = "16px sans-serif";
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const centerX = this.cubicBezier(start.x, cp1.x, cp2.x, end.x, 0.5);
            const centerY = this.cubicBezier(start.y, cp1.y, cp2.y, end.y, 0.5);
            const angle = this.cubicBezierAngle(start, cp1, cp2, end, 0.5);
            const textOffset = -15;

            ctx.translate(centerX, centerY);
            let rawAngle = angle;
            if (rawAngle > Math.PI / 2 || rawAngle < -Math.PI / 2) rawAngle += Math.PI;
            ctx.rotate(rawAngle);
            ctx.fillText(text, 0, textOffset);
            ctx.restore();
        }
    }
}
