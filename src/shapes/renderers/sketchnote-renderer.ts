import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";

export class SketchnoteRenderer extends ShapeRenderer {
    protected renderArchitectural(context: RenderContext, cx: number, cy: number): void {
        const { ctx, rc, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);
        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);
        const x = el.x, y = el.y, w = el.width, h = el.height;

        switch (el.type) {
            case 'starPerson': {
                const headRadius = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
                const headX = x + w / 2;
                const headY = y + headRadius;
                const bodyPoints = this.getStarPersonBodyPoints(x, y, w, h, headRadius);

                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    rc.ellipse(headX, headY, headRadius * 2, headRadius * 2, { ...options, stroke: 'none', fill: options.fill });
                    rc.polygon(bodyPoints, { ...options, stroke: 'none', fill: options.fill });
                }
                ctx.beginPath();
                ctx.ellipse(headX, headY, headRadius, headRadius, 0, 0, Math.PI * 2);
                ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
                for (let i = 1; i < bodyPoints.length; i++) ctx.lineTo(bodyPoints[i][0], bodyPoints[i][1]);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke();
                break;
            }
            case 'lightbulb': {
                const bulbR = Math.min(w, h / 1.5) / 2;
                const baseW = w * 0.4;
                const baseH = h * 0.25;
                const baseY = y + h - baseH;
                const bulbPath = this.getLightbulbPath(x, y, w, bulbR, baseW, baseY);

                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(bulbPath));
                    ctx.fillRect(x + w / 2 - baseW / 2, baseY, baseW, baseH);
                }
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke(new Path2D(bulbPath));
                ctx.strokeRect(x + w / 2 - baseW / 2, baseY, baseW, baseH);
                break;
            }
            case 'signpost': {
                const poleW = Math.max(4, w * 0.05);
                const boardH = h * 0.3;
                const boardW = w * 0.9;
                const boardY = y + h * 0.1;
                const poleX = x + w / 2 - poleW / 2;
                const boardX = x + w / 2 - boardW / 2;

                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fillRect(poleX, y, poleW, h);
                    ctx.fillRect(boardX, boardY, boardW, boardH);
                }
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.strokeRect(poleX, y, poleW, h);
                ctx.strokeRect(boardX, boardY, boardW, boardH);
                break;
            }
            case 'burstBlob': {
                const path = this.getBurstBlobPath(el);
                if (options.fill && options.fill !== 'transparent' && options.fill !== 'none') {
                    ctx.fillStyle = options.fill;
                    ctx.fill(new Path2D(path));
                }
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = el.strokeWidth;
                ctx.stroke(new Path2D(path));
                break;
            }
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    protected renderSketch(context: RenderContext, cx: number, cy: number): void {
        const { rc, element: el, isDarkMode } = context;
        const options = RenderPipeline.buildRenderOptions(el, isDarkMode);
        const x = el.x, y = el.y, w = el.width, h = el.height;

        switch (el.type) {
            case 'starPerson': {
                const headRadius = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
                rc.ellipse(x + w / 2, y + headRadius, headRadius * 2, headRadius * 2, options);
                rc.polygon(this.getStarPersonBodyPoints(x, y, w, h, headRadius), options);
                break;
            }
            case 'lightbulb': {
                const bulbR = Math.min(w, h / 1.5) / 2;
                const baseW = w * 0.4;
                const baseH = h * 0.25;
                const baseY = y + h - baseH;
                rc.path(this.getLightbulbPath(x, y, w, bulbR, baseW, baseY), options);
                rc.rectangle(x + w / 2 - baseW / 2, baseY, baseW, baseH, options);
                break;
            }
            case 'signpost': {
                const poleW = Math.max(4, w * 0.05);
                const boardH = h * 0.3;
                const boardW = w * 0.9;
                const boardY = y + h * 0.1;
                rc.rectangle(x + w / 2 - poleW / 2, y, poleW, h, { ...options, fill: 'none' });
                rc.rectangle(x + w / 2 - boardW / 2, boardY, boardW, boardH, options);
                break;
            }
            case 'burstBlob': {
                rc.path(this.getBurstBlobPath(el), options);
                break;
            }
        }

        RenderPipeline.renderText(context, cx, cy);
    }

    private getStarPersonBodyPoints(x: number, y: number, w: number, h: number, headRadius: number): [number, number][] {
        const cx = x + w / 2;
        return [
            [cx, y + headRadius * 2], [x, y + h * 0.4], [cx, y + h * 0.5], [x + w, y + h * 0.4],
            [cx, y + headRadius * 2], [x + w * 0.8, y + h], [cx, y + h * 0.7], [x + w * 0.2, y + h],
            [cx, y + headRadius * 2]
        ];
    }

    private getLightbulbPath(x: number, y: number, w: number, bulbR: number, baseW: number, baseY: number) {
        const cx = x + w / 2;
        return `
            M ${cx - baseW / 2} ${baseY}
            C ${cx - baseW / 2} ${y + bulbR} ${x} ${y + bulbR * 1.5} ${x} ${y + bulbR}
            A ${bulbR} ${bulbR} 0 1 1 ${x + w} ${y + bulbR}
            C ${x + w} ${y + bulbR * 1.5} ${cx + baseW / 2} ${y + bulbR} ${cx + baseW / 2} ${baseY}
            Z
        `;
    }

    private getBurstBlobPath(el: any) {
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const cx = x + w / 2, cy = y + h / 2;
        const rx = w / 2, ry = h / 2;
        const spikes = 12;
        const outerR = Math.min(rx, ry);
        const innerR = outerR * 0.6;
        const seed = el.seed || 1;

        const randomSeeded = (s: number) => {
            let t = s += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };

        let path = "";
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerR : innerR;
            const rnd = randomSeeded(seed + i);
            const rVar = r + (rnd - 0.5) * (outerR * 0.1);
            const angle = (Math.PI * i) / spikes;
            const px = cx + Math.cos(angle) * (w / h) * rVar;
            const py = cy + Math.sin(angle) * rVar;
            path += (i === 0 ? "M " : " L ") + px + " " + py;
        }
        return path + " Z";
    }
}
