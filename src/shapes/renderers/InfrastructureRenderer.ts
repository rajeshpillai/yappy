import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

// Helper for drawing arrowheads in sketch mode
function drawArrowhead(rc: any, x: number, y: number, angle: number, options: any) {
    const headLen = 10;
    const x1 = x - headLen * Math.cos(angle - Math.PI / 6);
    const y1 = y - headLen * Math.sin(angle - Math.PI / 6);
    const x2 = x - headLen * Math.cos(angle + Math.PI / 6);
    const y2 = y - headLen * Math.sin(angle + Math.PI / 6);
    rc.line(x, y, x1, y1, options);
    rc.line(x, y, x2, y2, options);
}

// Helper for architectural arrowheads
function drawArchArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    const headLen = 10;
    const x1 = x - headLen * Math.cos(angle - Math.PI / 6);
    const y1 = y - headLen * Math.sin(angle - Math.PI / 6);
    const x2 = x - headLen * Math.cos(angle + Math.PI / 6);
    const y2 = y - headLen * Math.sin(angle + Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

/**
 * InfrastructureRenderer - Handles composite shapes for system architecture diagrams
 */
export class InfrastructureRenderer extends ShapeRenderer {
    private renderArch: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokeColor: string, strokeWidth: number, fill?: string) => void;
    private renderSketchFn: (rc: any, x: number, y: number, w: number, h: number, options: RenderOptions) => void;

    constructor(
        renderArch: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokeColor: string, strokeWidth: number, fill?: string) => void,
        renderSketchFn: (rc: any, x: number, y: number, w: number, h: number, options: RenderOptions) => void
    ) {
        super();
        this.renderArch = renderArch;
        this.renderSketchFn = renderSketchFn;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, element } = context;
        if (options.fill && options.fill !== 'transparent' && options.fill !== 'none' && element.fillStyle !== 'dots') {
            // Background fill is handled specifically by each shape implementation if needed, 
            // but usually passed as 'fill' argument
        }
        this.renderArch(ctx, element.x, element.y, element.width, element.height, options.strokeColor, options.strokeWidth, options.fill);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        this.renderSketchFn(rc, element.x, element.y, element.width, element.height, options);
    }

    // --- Factory Methods ---

    static server(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.strokeRect(x, y, w, h);
                const slotH = h * 0.05; const slotW = w * 0.7; const slotX = x + (w - slotW) / 2;
                ctx.fillStyle = strokeColor;
                for (let i = 0; i < 3; i++) ctx.fillRect(slotX, y + h - (i + 1) * slotH * 2 - slotH, slotW, slotH);
            },
            (rc, x, y, w, h, options) => {
                rc.rectangle(x, y, w, h, options);
                const slotH = h * 0.05; const slotW = w * 0.7; const slotX = x + (w - slotW) / 2;
                for (let i = 0; i < 3; i++) rc.rectangle(slotX, y + h - (i + 1) * slotH * 2 - slotH, slotW, slotH, { ...options, fillStyle: 'solid', fill: options.stroke });
            }
        );
    }

    static loadBalancer(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                const cx = x + w / 2, cy = y + h / 2;
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
                const arrowLen = w * 0.3;
                ctx.beginPath(); ctx.moveTo(cx - arrowLen, cy); ctx.lineTo(cx + arrowLen, cy); ctx.stroke();
                drawArchArrowhead(ctx, cx + arrowLen, cy, 0);
                drawArchArrowhead(ctx, cx - arrowLen, cy, Math.PI);
            },
            (rc, x, y, w, h, options) => {
                const cx = x + w / 2, cy = y + h / 2;
                rc.ellipse(cx, cy, w, h, options);
                const arrowLen = w * 0.3;
                rc.line(cx - arrowLen, cy, cx + arrowLen, cy, options);
                drawArrowhead(rc, cx + arrowLen, cy, 0, options);
                drawArrowhead(rc, cx - arrowLen, cy, Math.PI, options);
            }
        );
    }

    static firewall(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.strokeRect(x, y, w, h);
                const rows = 4, cols = 3; const rowH = h / rows; const colW = w / cols;
                ctx.beginPath();
                for (let i = 1; i < rows; i++) { ctx.moveTo(x, y + i * rowH); ctx.lineTo(x + w, y + i * rowH); }
                for (let i = 0; i < rows; i++) {
                    const shift = (i % 2 === 0) ? 0 : colW / 2;
                    for (let j = 1; j < cols; j++) {
                        const vx = x + j * colW + shift;
                        if (vx < x + w) { ctx.moveTo(vx, y + i * rowH); ctx.lineTo(vx, y + (i + 1) * rowH); }
                    }
                }
                ctx.stroke();
            },
            (rc, x, y, w, h, options) => {
                rc.rectangle(x, y, w, h, options);
                const rows = 4, cols = 3; const rowH = h / rows; const colW = w / cols;
                for (let i = 1; i < rows; i++) rc.line(x, y + i * rowH, x + w, y + i * rowH, options);
                for (let i = 0; i < rows; i++) {
                    const shift = (i % 2 === 0) ? 0 : colW / 2;
                    for (let j = 1; j < cols; j++) {
                        const vx = x + j * colW + shift;
                        if (vx < x + w) rc.line(vx, y + i * rowH, vx, y + (i + 1) * rowH, options);
                    }
                }
            }
        );
    }

    static user(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                const headR = Math.min(w, h) * 0.25; const cx = x + w / 2;
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx, y + headR, headR, 0, Math.PI * 2); ctx.fill(); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.beginPath(); ctx.arc(cx, y + headR, headR, 0, Math.PI * 2); ctx.stroke();
                const shoulderW = w * 0.8;
                ctx.beginPath(); ctx.moveTo(cx - shoulderW / 2, y + h);
                ctx.quadraticCurveTo(cx, y + headR * 1.5, cx + shoulderW / 2, y + h); ctx.stroke();
            },
            (rc, x, y, w, h, options) => {
                const headR = Math.min(w, h) * 0.25; const cx = x + w / 2;
                rc.circle(cx, y + headR, headR * 2, options);
                const shoulderW = w * 0.8;
                const path = `M ${cx - shoulderW / 2} ${y + h} Q ${cx} ${y + headR * 1.5} ${cx + shoulderW / 2} ${y + h} Z`;
                rc.path(path, options);
            }
        );
    }

    static messageQueue(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.strokeRect(x, y, w, h);
                const segments = 4; const segW = w / segments;
                ctx.beginPath();
                for (let i = 1; i < segments; i++) { ctx.moveTo(x + i * segW, y); ctx.lineTo(x + i * segW, y + h); }
                ctx.stroke();
            },
            (rc, x, y, w, h, options) => {
                rc.rectangle(x, y, w, h, options);
                const segments = 4; const segW = w / segments;
                for (let i = 1; i < segments; i++) rc.line(x + i * segW, y, x + i * segW, y + h, options);
            }
        );
    }

    static lambda(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                const cx = x + w / 2, cy = y + h / 2;
                const zapW = w * 0.4, zapH = h * 0.6;
                const zx = cx - zapW / 2, zy = cy - zapH / 2;
                const zapPath = `M ${zx + zapW} ${zy} L ${zx} ${zy + zapH * 0.6} L ${zx + zapW * 0.6} ${zy + zapH * 0.5} L ${zx} ${zy + zapH} L ${zx + zapW} ${zy + zapH * 0.4} L ${zx + zapW * 0.4} ${zy + zapH * 0.5} Z`;
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = strokeColor; ctx.fill(new Path2D(zapPath));
            },
            (rc, x, y, w, h, options) => {
                const cx = x + w / 2, cy = y + h / 2;
                const zapW = w * 0.4, zapH = h * 0.6;
                const zx = cx - zapW / 2, zy = cy - zapH / 2;
                const zapPath = `M ${zx + zapW} ${zy} L ${zx} ${zy + zapH * 0.6} L ${zx + zapW * 0.6} ${zy + zapH * 0.5} L ${zx} ${zy + zapH} L ${zx + zapW} ${zy + zapH * 0.4} L ${zx + zapW * 0.4} ${zy + zapH * 0.5} Z`;
                rc.ellipse(cx, cy, w, h, options);
                rc.path(zapPath, { ...options, fillStyle: 'solid', fill: options.stroke });
            }
        );
    }

    static router(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                const cx = x + w / 2, cy = y + h / 2;
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke();
                const r = Math.min(w, h) * 0.3;
                ctx.beginPath();
                for (let a = 0; a < 4; a++) {
                    const angle = (Math.PI / 2) * a + Math.PI / 4;
                    ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
                }
                ctx.stroke();
            },
            (rc, x, y, w, h, options) => {
                const cx = x + w / 2, cy = y + h / 2;
                rc.ellipse(cx, cy, w, h, options);
                const r = Math.min(w, h) * 0.3;
                for (let a = 0; a < 4; a++) {
                    const angle = (Math.PI / 2) * a + Math.PI / 4;
                    const px = cx + r * Math.cos(angle);
                    const py = cy + r * Math.sin(angle);
                    rc.line(cx, cy, px, py, options);
                    drawArrowhead(rc, px, py, angle, options);
                }
            }
        );
    }

    static browser(): InfrastructureRenderer {
        return new InfrastructureRenderer(
            (ctx, x, y, w, h, strokeColor, strokeWidth, fill) => {
                if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
                ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
                ctx.strokeRect(x, y, w, h);
                const headerH = h * 0.15;
                ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();
                ctx.fillStyle = strokeColor;
                const dotR = headerH * 0.2;
                for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + headerH * (0.5 + i * 0.6), y + headerH / 2, dotR, 0, Math.PI * 2); ctx.fill(); }
            },
            (rc, x, y, w, h, options) => {
                rc.rectangle(x, y, w, h, options);
                const headerH = h * 0.15;
                rc.line(x, y + headerH, x + w, y + headerH, options);
                const dotR = headerH * 0.3;
                for (let i = 0; i < 3; i++) rc.circle(x + headerH * (0.5 + i * 0.6), y + headerH / 2, dotR, { ...options, fillStyle: 'solid', fill: options.stroke });
            }
        );
    }
}
