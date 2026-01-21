import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";
import { normalizePoints } from "../../utils/geometry";

export class LinearElementRenderer extends ShapeRenderer {

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, element } = context;
        const { x, y } = element;

        const points = this.getPoints(element);
        if (points.length < 2) return;

        ctx.beginPath();

        if (element.curveType === 'elbow') {
            // Use smart elbow routing if available, or simple orthogonal segments
            // For now, assume points are already routed or simple linear fallback
            ctx.moveTo(x + points[0].x, y + points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(x + points[i].x, y + points[i].y);
            }
        } else if (element.curveType === 'bezier' && points.length >= 3) {
            // Bezier logic
            ctx.moveTo(x + points[0].x, y + points[0].y);
            if (points.length === 3) {
                ctx.quadraticCurveTo(x + points[1].x, y + points[1].y, x + points[2].x, y + points[2].y);
            } else {
                // Cubic or multi-segment
                for (let i = 1; i < points.length - 1; i += 2) {
                    if (i + 1 < points.length) {
                        ctx.bezierCurveTo(
                            x + points[i].x, y + points[i].y,
                            x + points[i + 1].x, y + points[i + 1].y,
                            x + points[i + 1].x, y + points[i + 1].y // Simplified/Incorrect for pure cubic
                        );
                        // Better fallback: just lineTo for now unless we have specific cp data
                    }
                }
                // Fallback to polyline for robust rendering
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(x + points[i].x, y + points[i].y);
                }
            }
        } else {
            // Straight lines (polyline)
            ctx.moveTo(x + points[0].x, y + points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(x + points[i].x, y + points[i].y);
            }
        }

        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Render Arrowheads
        this.renderArrowheads(context, points, options, true);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const { x, y } = element;
        const points = this.getPoints(element);
        if (points.length < 2) return;

        // Offset points by element position
        const absPoints = points.map(p => [x + p.x, y + p.y] as [number, number]);

        if (element.curveType === 'bezier') {
            rc.curve(absPoints, options);
        } else {
            // Linear or Elbow treated as polyline
            rc.linearPath(absPoints, options);
        }

        // Render Arrowheads
        this.renderArrowheads(context, points, options, false);
    }

    private getPoints(element: any): { x: number, y: number }[] {
        if (element.points) {
            return normalizePoints(element.points);
        }
        // Fallback: start to end diagonal
        return [{ x: 0, y: 0 }, { x: element.width, y: element.height }];
    }

    private renderArrowheads(context: RenderContext, points: { x: number, y: number }[], options: RenderOptions, isArch: boolean) {
        const { ctx, rc, element } = context;
        const { x, y } = element;

        if (element.type === 'arrow' || element.endArrowhead) {
            const p1 = points[points.length - 2];
            const p2 = points[points.length - 1];
            // Angle of last segment
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const headSize = Math.max(10, (element.strokeWidth || 1) * 5);

            // End point absolute
            const endX = x + p2.x;
            const endY = y + p2.y;

            if (isArch) {
                this.drawArchArrowhead(ctx, endX, endY, angle, headSize, options.strokeColor);
            } else {
                this.drawSketchArrowhead(rc, endX, endY, angle, headSize, options);
            }
        }

        if (element.startArrowhead) {
            const p1 = points[0];
            const p2 = points[1];
            // Angle of first segment (reversed)
            const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
            const headSize = Math.max(10, (element.strokeWidth || 1) * 5);

            const startX = x + p1.x;
            const startY = y + p1.y;

            if (isArch) {
                this.drawArchArrowhead(ctx, startX, startY, angle, headSize, options.strokeColor);
            } else {
                this.drawSketchArrowhead(rc, startX, startY, angle, headSize, options);
            }
        }
    }

    private drawArchArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
    }

    private drawSketchArrowhead(rc: any, x: number, y: number, angle: number, size: number, options: RenderOptions) {
        const x1 = x - size * Math.cos(angle - Math.PI / 6);
        const y1 = y - size * Math.sin(angle - Math.PI / 6);
        const x2 = x - size * Math.cos(angle + Math.PI / 6);
        const y2 = y - size * Math.sin(angle + Math.PI / 6);

        rc.line(x, y, x1, y1, options);
        rc.line(x, y, x2, y2, options);
    }
}
