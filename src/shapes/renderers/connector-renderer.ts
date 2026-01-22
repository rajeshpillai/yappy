import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { normalizePoints } from "../../utils/render-element";

export class ConnectorRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context, _cx, _cy);
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context, _cx, _cy);
    }

    private renderCommon(context: RenderContext, _cx: number, _cy: number): void {
        const { element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);

        if (el.curveType === 'bezier') {
            this.renderBezier(context, options);
        } else if (el.curveType === 'elbow') {
            this.renderElbow(context, options);
        } else {
            this.renderStraight(context, options);
        }
    }

    private renderBezier(context: RenderContext, options: any) {
        const { rc, element: el } = context;
        const endX = el.x + el.width;
        const endY = el.y + el.height;
        const w = el.width, h = el.height;

        let start = { x: el.x, y: el.y };
        let end = { x: endX, y: endY };
        const pts = normalizePoints(el.points);
        if (pts.length >= 2) {
            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
        }

        let cp1, cp2;
        if (el.controlPoints && el.controlPoints.length > 0) {
            cp1 = el.controlPoints[0];
            if (el.controlPoints.length > 1) {
                cp2 = el.controlPoints[1];
                const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
                rc.path(path, options);
                if (el.startArrowhead) this.drawArrowhead(rc, start.x, start.y, Math.atan2(start.y - cp1.y, start.x - cp1.x), el.startArrowhead, options);
                if (el.endArrowhead) this.drawArrowhead(rc, end.x, end.y, Math.atan2(end.y - cp2.y, end.x - cp2.x), el.endArrowhead, options);
            } else {
                const path = `M ${start.x} ${start.y} Q ${cp1.x} ${cp1.y}, ${end.x} ${end.y}`;
                rc.path(path, options);
                if (el.startArrowhead) this.drawArrowhead(rc, start.x, start.y, Math.atan2(start.y - cp1.y, start.x - cp1.x), el.startArrowhead, options);
                if (el.endArrowhead) this.drawArrowhead(rc, end.x, end.y, Math.atan2(end.y - cp1.y, end.x - cp1.x), el.endArrowhead, options);
            }
        } else {
            if (Math.abs(w) > Math.abs(h)) {
                cp1 = { x: start.x + w / 2, y: start.y };
                cp2 = { x: end.x - w / 2, y: end.y };
            } else {
                cp1 = { x: start.x, y: start.y + h / 2 };
                cp2 = { x: end.x, y: end.y - h / 2 };
            }
            const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
            rc.path(path, options);
            if (el.startArrowhead) this.drawArrowhead(rc, start.x, start.y, Math.atan2(start.y - cp1.y, start.x - cp1.x), el.startArrowhead, options);
            if (el.endArrowhead) this.drawArrowhead(rc, end.x, end.y, Math.atan2(end.y - cp2.y, end.x - cp2.x), el.endArrowhead, options);
        }
    }

    private renderElbow(context: RenderContext, options: any) {
        const { rc, element: el } = context;
        const pts = normalizePoints(el.points);
        const drawPoints: [number, number][] = (pts && pts.length > 0)
            ? pts.map(p => [el.x + p.x, el.y + p.y])
            : [[el.x, el.y], [el.x + el.width, el.y + el.height]];

        rc.linearPath(drawPoints, options);

        const cleanPoints = drawPoints.filter((p, i, self) =>
            i === 0 || Math.abs(p[0] - self[i - 1][0]) > 0.1 || Math.abs(p[1] - self[i - 1][1]) > 0.1
        );

        if (el.startArrowhead && cleanPoints.length >= 2) {
            const angle = Math.atan2(cleanPoints[0][1] - cleanPoints[1][1], cleanPoints[0][0] - cleanPoints[1][0]);
            this.drawArrowhead(rc, cleanPoints[0][0], cleanPoints[0][1], angle, el.startArrowhead, options);
        }
        if (el.endArrowhead && cleanPoints.length >= 2) {
            const n = cleanPoints.length;
            const angle = Math.atan2(cleanPoints[n - 1][1] - cleanPoints[n - 2][1], cleanPoints[n - 1][0] - cleanPoints[n - 2][0]);
            this.drawArrowhead(rc, cleanPoints[n - 1][0], cleanPoints[n - 1][1], angle, el.endArrowhead, options);
        }
    }

    private renderStraight(context: RenderContext, options: any) {
        const { rc, element: el } = context;
        const pts = normalizePoints(el.points);
        let start, end;
        if (pts.length >= 2) {
            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
        } else {
            start = { x: el.x, y: el.y };
            end = { x: el.x + el.width, y: el.y + el.height };
        }

        rc.line(start.x, start.y, end.x, end.y, options);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        if (el.startArrowhead) this.drawArrowhead(rc, start.x, start.y, angle + Math.PI, el.startArrowhead, options);
        if (el.endArrowhead) this.drawArrowhead(rc, end.x, end.y, angle, el.endArrowhead, options);
    }

    private drawArrowhead(rc: any, x: number, y: number, angle: number, type: string, options: any) {
        const headLen = 12;
        const p1 = { x: x - headLen * Math.cos(angle - Math.PI / 6), y: y - headLen * Math.sin(angle - Math.PI / 6) };
        const p2 = { x: x - headLen * Math.cos(angle + Math.PI / 6), y: y - headLen * Math.sin(angle + Math.PI / 6) };

        if (type === 'triangle' || type === 'arrow') {
            rc.line(x, y, p1.x, p1.y, options);
            rc.line(x, y, p2.x, p2.y, options);
            if (type === 'triangle') rc.line(p1.x, p1.y, p2.x, p2.y, options);
        } else if (type === 'circle' || type === 'dot') {
            rc.circle(x, y, headLen, { ...options, fillStyle: (type === 'dot' ? 'solid' : options.fillStyle) });
        } else if (type === 'bar') {
            const barX1 = x + Math.cos(angle + Math.PI / 2) * headLen;
            const barY1 = y + Math.sin(angle + Math.PI / 2) * headLen;
            const barX2 = x + Math.cos(angle - Math.PI / 2) * headLen;
            const barY2 = y + Math.sin(angle - Math.PI / 2) * headLen;
            rc.line(barX1, barY1, barX2, barY2, options);
        }
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        const pts = normalizePoints(el.points);
        let start, end;
        if (pts.length >= 2) {
            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
        } else {
            start = { x: el.x, y: el.y };
            end = { x: el.x + el.width, y: el.y + el.height };
        }

        if (el.curveType === 'bezier') {
            const w = el.width, h = el.height;
            let cp1, cp2;
            if (el.controlPoints && el.controlPoints.length > 0) {
                cp1 = el.controlPoints[0];
                if (el.controlPoints.length > 1) {
                    cp2 = el.controlPoints[1];
                    ctx.moveTo(start.x, start.y);
                    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
                } else {
                    ctx.moveTo(start.x, start.y);
                    ctx.quadraticCurveTo(cp1.x, cp1.y, end.x, end.y);
                }
            } else {
                if (Math.abs(w) > Math.abs(h)) {
                    cp1 = { x: start.x + w / 2, y: start.y };
                    cp2 = { x: end.x - w / 2, y: end.y };
                } else {
                    cp1 = { x: start.x, y: start.y + h / 2 };
                    cp2 = { x: end.x, y: end.y - h / 2 };
                }
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
            }
        } else if (el.curveType === 'elbow') {
            const drawPoints = (pts && pts.length > 0)
                ? pts.map(p => ({ x: el.x + p.x, y: el.y + p.y }))
                : [start, end];

            ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
            for (let i = 1; i < drawPoints.length; i++) {
                ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
            }
        } else {
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
        }
    }
}
