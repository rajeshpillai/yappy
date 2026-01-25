import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { normalizePoints, cubicBezier } from "../../utils/render-element";

export class ConnectorRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        const { ctx, element: el, isDarkMode } = context;
        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);
        const backgroundColor = el.backgroundColor === 'transparent' ? '#ffffff' : RenderPipeline.adjustColor(el.backgroundColor, isDarkMode);

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = backgroundColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = (el.strokeLineJoin as CanvasLineJoin) || 'round';

        if (el.strokeStyle === 'dashed') ctx.setLineDash([8, 8]);
        else if (el.strokeStyle === 'dotted') ctx.setLineDash([2, 4]);

        ctx.beginPath();
        this.definePath(ctx, el);
        ctx.stroke();

        this.renderFlow(context);

        // Draw arrowheads
        const pts = normalizePoints(el.points);
        let start, end;
        if (pts.length >= 2) {
            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
        } else {
            start = { x: el.x, y: el.y };
            end = { x: el.x + el.width, y: el.y + el.height };
        }

        let angle: number;
        if (el.curveType === 'bezier') {
            const cp1 = el.controlPoints?.[0] || { x: start.x, y: start.y };
            const cp2 = el.controlPoints?.[1] || cp1;
            if (el.startArrowhead) {
                const startAngle = Math.atan2(start.y - cp1.y, start.x - cp1.x);
                this.drawArrowheadArchitectural(ctx, start.x, start.y, startAngle, el.startArrowhead);
            }
            if (el.endArrowhead) {
                const endAngle = Math.atan2(end.y - cp2.y, end.x - cp2.x);
                this.drawArrowheadArchitectural(ctx, end.x, end.y, endAngle, el.endArrowhead);
            }
        } else if (el.curveType === 'elbow' && pts.length >= 2) {
            const p0 = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            const p1 = { x: el.x + pts[1].x, y: el.y + pts[1].y };
            const startAngle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
            if (el.startArrowhead) this.drawArrowheadArchitectural(ctx, p0.x, p0.y, startAngle, el.startArrowhead);

            const pn_1 = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
            const pn_2 = { x: el.x + pts[pts.length - 2].x, y: el.y + pts[pts.length - 2].y };
            const endAngle = Math.atan2(pn_1.y - pn_2.y, pn_1.x - pn_2.x);
            if (el.endArrowhead) this.drawArrowheadArchitectural(ctx, pn_1.x, pn_1.y, endAngle, el.endArrowhead);
        } else {
            angle = Math.atan2(end.y - start.y, end.x - start.x);
            if (el.startArrowhead) this.drawArrowheadArchitectural(ctx, start.x, start.y, angle + Math.PI, el.startArrowhead);
            if (el.endArrowhead) this.drawArrowheadArchitectural(ctx, end.x, end.y, angle, el.endArrowhead);
        }

        ctx.restore();
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context, _cx, _cy);
        this.renderFlow(context);
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
        const pts = normalizePoints(el.points);

        let start = { x: el.x, y: el.y };
        let end = { x: endX, y: endY };
        if (pts.length >= 2) {
            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
        }

        if (el.controlPoints && el.controlPoints.length > 0) {
            const cp1 = el.controlPoints[0];
            if (el.controlPoints.length > 1) {
                const cp2 = el.controlPoints[1];
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
            const w = el.width, h = el.height;
            let cp1, cp2;
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
            if (type === 'triangle') {
                rc.polygon([[x, y], [p1.x, p1.y], [p2.x, p2.y]], { ...options, fill: '#ffffff', fillStyle: 'solid' });
            } else {
                rc.line(x, y, p1.x, p1.y, options);
                rc.line(x, y, p2.x, p2.y, options);
            }
        } else if (type === 'circle' || type === 'dot') {
            rc.circle(x, y, headLen, { ...options, fill: type === 'dot' ? options.stroke : '#ffffff', fillStyle: 'solid' });
        } else if (type === 'diamond' || type === 'diamondFilled') {
            const p3 = { x: x - headLen * 2 * Math.cos(angle), y: y - headLen * 2 * Math.sin(angle) };
            const m = { x: x - headLen * Math.cos(angle), y: y - headLen * Math.sin(angle) };
            const d1 = { x: m.x - (headLen / 2) * Math.cos(angle - Math.PI / 2), y: m.y - (headLen / 2) * Math.sin(angle - Math.PI / 2) };
            const d2 = { x: m.x - (headLen / 2) * Math.cos(angle + Math.PI / 2), y: m.y - (headLen / 2) * Math.sin(angle + Math.PI / 2) };
            rc.polygon([[x, y], [d1.x, d1.y], [p3.x, p3.y], [d2.x, d2.y]], { ...options, fill: type === 'diamondFilled' ? options.stroke : '#ffffff', fillStyle: 'solid' });
        } else if (type === 'crowsfoot') {
            const f1 = { x: x - headLen * Math.cos(angle - Math.PI / 4), y: y - headLen * Math.sin(angle - Math.PI / 4) };
            const f2 = { x: x - headLen * Math.cos(angle + Math.PI / 4), y: y - headLen * Math.sin(angle + Math.PI / 4) };
            const f3 = { x: x - headLen * Math.cos(angle), y: y - headLen * Math.sin(angle) };
            rc.line(x, y, f1.x, f1.y, options);
            rc.line(x, y, f2.x, f2.y, options);
            rc.line(x, y, f3.x, f3.y, options);
        } else if (type === 'bar') {
            const barX1 = x + Math.cos(angle + Math.PI / 2) * headLen;
            const barY1 = y + Math.sin(angle + Math.PI / 2) * headLen;
            const barX2 = x + Math.cos(angle - Math.PI / 2) * headLen;
            const barY2 = y + Math.sin(angle - Math.PI / 2) * headLen;
            rc.line(barX1, barY1, barX2, barY2, options);
        }
    }

    private drawArrowheadArchitectural(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, type: string) {
        const headLen = 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.setLineDash([]); // Usually arrowheads are solid even if line is dashed

        if (type === 'triangle' || type === 'arrow') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-headLen * Math.cos(Math.PI / 6), -headLen * Math.sin(Math.PI / 6));
            if (type === 'triangle') {
                ctx.lineTo(-headLen * Math.cos(-Math.PI / 6), -headLen * Math.sin(-Math.PI / 6));
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            } else {
                ctx.moveTo(0, 0);
                ctx.lineTo(-headLen * Math.cos(-Math.PI / 6), -headLen * Math.sin(-Math.PI / 6));
            }
            ctx.stroke();
        } else if (type === 'circle' || type === 'dot') {
            ctx.beginPath();
            ctx.arc(-headLen / 2 * Math.cos(0), 0, headLen / 2, 0, Math.PI * 2);
            if (type === 'dot') {
                ctx.fillStyle = ctx.strokeStyle;
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fill();
            ctx.stroke();
        } else if (type === 'diamond' || type === 'diamondFilled') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-headLen, -headLen / 2);
            ctx.lineTo(-headLen * 2, 0);
            ctx.lineTo(-headLen, headLen / 2);
            ctx.closePath();
            if (type === 'diamondFilled') {
                ctx.fillStyle = ctx.strokeStyle;
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fill();
            ctx.stroke();
        } else if (type === 'crowsfoot') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-headLen * Math.cos(Math.PI / 4), -headLen * Math.sin(Math.PI / 4));
            ctx.moveTo(0, 0);
            ctx.lineTo(-headLen * Math.cos(-Math.PI / 4), -headLen * Math.sin(-Math.PI / 4));
            ctx.moveTo(0, 0);
            ctx.lineTo(-headLen, 0);
            ctx.stroke();
        } else if (type === 'bar') {
            ctx.beginPath();
            ctx.moveTo(0, -headLen);
            ctx.lineTo(0, headLen);
            ctx.stroke();
        }
        ctx.restore();
    }

    private renderFlow(context: RenderContext) {
        const { ctx, element: el, isDarkMode } = context;
        if (!el.flowAnimation) return;

        const time = (window as any).yappyGlobalTime || performance.now();
        const speed = (el.flowSpeed ?? 2) * 50; // Normalize speed
        const offset = (time / 1000 * speed);
        const color = RenderPipeline.adjustColor(el.flowColor || el.strokeColor, isDarkMode);
        const pulseSize = Math.max(2, el.strokeWidth * 1.5);
        const gap = 100 / (el.flowDensity || 3);

        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowBlur = el.flowStyle === 'pulse' ? pulseSize : 0;
        ctx.shadowColor = color;

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
            // Calculate control points - same logic as definePath
            let cp1, cp2;
            if (el.controlPoints && el.controlPoints.length > 0) {
                cp1 = el.controlPoints[0];
                cp2 = el.controlPoints.length > 1 ? el.controlPoints[1] : cp1;
            } else {
                // Calculate implicit control points based on width/height (same as definePath)
                const w = el.width, h = el.height;
                if (Math.abs(w) > Math.abs(h)) {
                    cp1 = { x: start.x + w / 2, y: start.y };
                    cp2 = { x: end.x - w / 2, y: end.y };
                } else {
                    cp1 = { x: start.x, y: start.y + h / 2 };
                    cp2 = { x: end.x, y: end.y - h / 2 };
                }
            }

            // Approximation of length
            const chord = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
            const contNet = Math.sqrt((cp1.x - start.x) ** 2 + (cp1.y - start.y) ** 2) +
                Math.sqrt((cp2.x - cp1.x) ** 2 + (cp2.y - cp1.y) ** 2) +
                Math.sqrt((end.x - cp2.x) ** 2 + (end.y - cp2.y) ** 2);
            const approxLen = (chord + contNet) / 2;

            const steps = Math.ceil(approxLen / 5);
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const d = t * approxLen;
                if ((d + offset) % gap < speed / 10) {
                    const px = cubicBezier(start.x, cp1.x, cp2.x, end.x, t);
                    const py = cubicBezier(start.y, cp1.y, cp2.y, end.y, t);

                    // Simple tangent calculation
                    const tNext = Math.min(1, t + 0.01);
                    const pNextX = cubicBezier(start.x, cp1.x, cp2.x, end.x, tNext);
                    const pNextY = cubicBezier(start.y, cp1.y, cp2.y, end.y, tNext);
                    const angle = Math.atan2(pNextY - py, pNextX - px);

                    this.drawPulse(ctx, px, py, pulseSize, el.flowStyle, angle);
                }
            }
        } else if (el.curveType === 'elbow' && pts.length >= 2) {
            let totalDist = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = { x: el.x + pts[i].x, y: el.y + pts[i].y };
                const p2 = { x: el.x + pts[i + 1].x, y: el.y + pts[i + 1].y };
                const segmentLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

                const steps = Math.ceil(segmentLen / 5);
                for (let j = 0; j <= steps; j++) {
                    const t = j / steps;
                    const d = totalDist + t * segmentLen;
                    if ((d + offset) % gap < speed / 10) {
                        const px = p1.x + (p2.x - p1.x) * t;
                        const py = p1.y + (p2.y - p1.y) * t;
                        this.drawPulse(ctx, px, py, pulseSize, el.flowStyle, angle);
                    }
                }
                totalDist += segmentLen;
            }
        } else {
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const steps = Math.ceil(len / 5);
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const d = t * len;
                if ((d + offset) % gap < speed / 10) {
                    const px = start.x + dx * t;
                    const py = start.y + dy * t;
                    this.drawPulse(ctx, px, py, pulseSize, el.flowStyle, angle);
                }
            }
        }

        ctx.restore();
    }

    private drawPulse(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style?: string, angle: number = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (style === 'dashes') {
            ctx.fillRect(-size, -size / 2, size * 2, size);
        } else if (style === 'pulse') {
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            const alpha = 0.5 + 0.5 * Math.sin(performance.now() / 100);
            ctx.globalAlpha *= alpha;
            ctx.fill();
        } else {
            // Default: dots
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
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
