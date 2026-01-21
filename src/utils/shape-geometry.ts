import type { DrawingElement } from "../types";

export type ShapeGeometry =
    | { type: 'rect', x: number, y: number, w: number, h: number, r?: number }
    | { type: 'ellipse', cx: number, cy: number, rx: number, ry: number } // centered at 0,0 usually? No, global coords if not transformed, but we use local in gradient block.
    | { type: 'path', path: string }
    | { type: 'points', points: { x: number, y: number }[] }
    | { type: 'multi', shapes: ShapeGeometry[] };

// Helper to normalized rounded rect path
const getRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
    return `M ${x + r} ${y} 
            L ${x + w - r} ${y} 
            Q ${x + w} ${y} ${x + w} ${y + r} 
            L ${x + w} ${y + h - r} 
            Q ${x + w} ${y + h} ${x + w - r} ${y + h} 
            L ${x + r} ${y + h} 
            Q ${x} ${y + h} ${x} ${y + h - r} 
            L ${x} ${y + r} 
            Q ${x} ${y} ${x + r} ${y}`;
};

export const getShapeGeometry = (el: DrawingElement): ShapeGeometry | null => {
    // IMPORTANT: Return coordinates relative to the element's center (cx, cy) 
    // because the gradient block translates context to (cx, cy).
    // So (x, y) should be (-width/2, -height/2) typically.

    const w = el.width;
    const h = el.height;
    const mw = w / 2;
    const mh = h / 2;

    // Base x/y in local space
    const x = -mw;
    const y = -mh;

    switch (el.type) {
        case 'rectangle':
        case 'image':
        case 'text':
            return { type: 'rect', x, y, w, h, r: el.roundness ? 10 : 0 };

        case 'circle':
            return { type: 'ellipse', cx: 0, cy: 0, rx: w / 2, ry: h / 2 };

        case 'triangle':
            return {
                type: 'points', points: [
                    { x: 0, y: -mh },        // Top Center
                    { x: -mw, y: mh },       // Bottom Left
                    { x: mw, y: mh }         // Bottom Right
                ]
            };

        case 'diamond':
            return {
                type: 'points', points: [
                    { x: 0, y: -mh },        // Top
                    { x: mw, y: 0 },         // Right
                    { x: 0, y: mh },         // Bottom
                    { x: -mw, y: 0 }         // Left
                ]
            };

        case 'hexagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'octagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'pentagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'septagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 7; i++) {
                const angle = (Math.PI * 2 / 7) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'star': {
            const outerRadius = Math.min(w, h) / 2;
            const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 38) / 100;
            const innerRadius = outerRadius * ratio;
            const numPoints = el.starPoints || 5;
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < numPoints * 2; i++) {
                const angle = (Math.PI / numPoints) * i - Math.PI / 2;
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'burst': {
            const outerRadius = Math.min(Math.abs(w), Math.abs(h)) / 2;
            const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 70) / 100;
            const innerRadius = outerRadius * ratio;
            const numPoints = el.burstPoints || 16;
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < numPoints * 2; i++) {
                const angle = (Math.PI / numPoints) * i - Math.PI / 2;
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'parallelogram': {
            const offset = w * 0.2;
            return {
                type: 'points', points: [
                    { x: x + offset, y: y },
                    { x: x + w, y: y },
                    { x: x + w - offset, y: y + h },
                    { x: x, y: y + h }
                ]
            };
        }

        case 'trapezoid': {
            const offset = w * 0.2;
            return {
                type: 'points', points: [
                    { x: x + offset, y: y },
                    { x: x + w - offset, y: y },
                    { x: x + w, y: y + h },
                    { x: x, y: y + h }
                ]
            };
        }

        case 'rightTriangle': {
            return {
                type: 'points', points: [
                    { x: x, y: y },
                    { x: x, y: y + h },
                    { x: x + w, y: y + h }
                ]
            };
        }

        case 'capsule': {
            const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
            // Use path relative to center (x=-mw, y=-mh)
            return { type: 'path', path: getRoundedRectPath(x, y, w, h, radius) };
        }

        case 'stickyNote': {
            const fold = Math.min(Math.abs(w), Math.abs(h)) * 0.15;
            // Main body polygon (minus fold corner)
            // Just fill the simplified main shape for gradient? Or strictly matches visual?
            // If we fill main shape only, the fold triangle (rendered later) will just sit on top.
            // But the fold triangle itself might need gradient? 
            // Usually fold is a "backside" color or darker shade. 
            // Let's just return the main polygon. Gradient implies "front face".
            const points = [
                { x: x, y: y },
                { x: x + w, y: y },
                { x: x + w, y: y + h - fold },
                { x: x + w - fold, y: y + h },
                { x: x, y: y + h }
            ];
            return { type: 'points', points };
        }

        case 'callout': {
            const tailHeight = h * 0.2;
            const rectHeight = h - tailHeight;
            const path = `
                M ${x} ${y} 
                L ${x + w} ${y} 
                L ${x + w} ${y + rectHeight} 
                L ${x + w * 0.7} ${y + rectHeight} 
                L ${x + w * 0.5} ${y + h} 
                L ${x + w * 0.3} ${y + rectHeight} 
                L ${x} ${y + rectHeight} 
                Z
            `;
            return { type: 'path', path };
        }

        case 'speechBubble': {
            // Need to match complex logic in renderElement.ts
            // Duplicating logic here is necessary.
            // Using simplified or matching params.
            const radiusPercent = el.borderRadius !== undefined ? el.borderRadius : 20;
            const r = Math.min(Math.abs(w), Math.abs(h)) * (radiusPercent / 100);
            const tailWidth = w * 0.15;
            const tailHeight = h * 0.2;
            const rectHeight = h - tailHeight;
            const tailPos = (el.tailPosition !== undefined ? el.tailPosition : 20) / 100;

            const tipRelX = w * tailPos;
            let baseRelX1, baseRelX2;
            if (tailPos <= 0.5) {
                baseRelX1 = tipRelX + (w * 0.1);
                baseRelX2 = baseRelX1 + tailWidth;
            } else {
                baseRelX2 = tipRelX - (w * 0.1);
                baseRelX1 = baseRelX2 - tailWidth;
            }

            const rX = Math.min(Math.abs(w) / 2, r);
            const rY = Math.min(Math.abs(rectHeight) / 2, r);

            const path = `
                M ${x + rX} ${y} 
                L ${x + w - rX} ${y} 
                Q ${x + w} ${y} ${x + w} ${y + rY} 
                L ${x + w} ${y + rectHeight - rY} 
                Q ${x + w} ${y + rectHeight} ${x + w - rX} ${y + rectHeight} 
                L ${x + baseRelX2} ${y + rectHeight}
                L ${x + tipRelX} ${y + h}
                L ${x + baseRelX1} ${y + rectHeight}
                L ${x + rX} ${y + rectHeight}
                Q ${x} ${y + rectHeight} ${x} ${y + rectHeight - rY} 
                L ${x} ${y + rY} 
                Q ${x} ${y} ${x + rX} ${y} 
                Z
            `;
            return { type: 'path', path };
        }

        case 'cloud': {
            const r1 = w * 0.2;
            const r2 = w * 0.25;
            const r3 = w * 0.2;
            const r4 = w * 0.3;
            // x/y are top-left (-mw, -mh).
            // Logic in renderElement: const cy = el.y + el.height / 2; (Global Center Y)
            // But here our 'y' is -mh (Top).
            // So coordinates should be shifted.
            // renderElement path: M ${el.x+r1} ${cy}...
            // cy in local = 0.
            // el.x in local = x (-mw).
            // el.y in local = y (-mh).

            // Re-mapped:
            const lx = x; // local x (top-left)
            const ly = y; // local y (top-left)
            const lcy = 0; // center y

            const path = `
                M ${lx + r1} ${lcy}
                A ${r1} ${r1} 0 0 1 ${lx + w * 0.3} ${ly + r2}
                A ${r2} ${r2} 0 0 1 ${lx + w * 0.7} ${ly + r2}
                A ${r3} ${r3} 0 0 1 ${lx + w - r3} ${lcy}
                A ${r4} ${r4} 0 0 1 ${lx + w * 0.6} ${ly + h - r4 * 0.5}
                A ${r4} ${r4} 0 0 1 ${lx + w * 0.3} ${ly + h - r4 * 0.5}
                A ${r4} ${r4} 0 0 1 ${lx + r1} ${lcy}
                Z
            `;
            return { type: 'path', path };
        }

        case 'heart': {
            // center x in local is 0.
            // w, h are full width/height.
            // el.x in local is x. el.y is y.
            // cx = 0.
            const path = `
                M 0 ${y + h * 0.3}
                C 0 ${y + h * 0.15} ${x + w * 0.3} ${y} ${x + w * 0.5} ${y + h * 0.15}
                C ${x + w * 0.7} ${y} ${x + w} ${y + h * 0.15} ${x + w} ${y + h * 0.35}
                C ${x + w} ${y + h * 0.6} 0 ${y + h * 0.8} 0 ${y + h}
                C 0 ${y + h * 0.8} ${x} ${y + h * 0.6} ${x} ${y + h * 0.35}
                C ${x} ${y + h * 0.15} ${x + w * 0.3} ${y} ${x + w * 0.5} ${y + h * 0.15}
                Z
            `;
            return { type: 'path', path };
        }

        case 'polygon': {
            const sides = el.polygonSides || 6;
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < sides; i++) {
                const angle = (2 * Math.PI / sides) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points };
        }

        case 'starPerson': {
            const headRadius = Math.min(w, h) * 0.15;
            // In local coords, cx=0, cy=0
            // original logic: cx = x + w/2 => 0
            // y = -mh
            const headY = y + headRadius;

            // Body points
            // Neck at y + headRadius * 2
            const neckY = y + headRadius * 2;
            const points: { x: number, y: number }[] = [
                { x: 0, y: neckY },                    // Neck
                { x: x, y: y + h * 0.4 },              // Left Arm
                { x: 0, y: y + h * 0.5 },              // Middle
                { x: x + w, y: y + h * 0.4 },          // Right Arm
                { x: 0, y: neckY },                    // Back to neck
                { x: x + w * 0.8, y: y + h },          // Right Leg
                { x: 0, y: y + h * 0.7 },              // Crotch
                { x: x + w * 0.2, y: y + h },          // Left Leg
                { x: 0, y: neckY },                    // Back to neck
            ];

            return {
                type: 'multi',
                shapes: [
                    { type: 'ellipse', cx: 0, cy: headY, rx: headRadius, ry: headRadius },
                    { type: 'points', points }
                ]
            };
        }

        case 'lightbulb': {
            const bulbR = Math.min(w, h / 1.5) / 2;
            const baseW = w * 0.4;
            const baseH = h * 0.25;
            const baseY = y + h - baseH;
            // Local cx = 0. x = -mw.
            // bulbPath logic ported:
            const bulbPath = `
                M ${-baseW / 2} ${baseY}
                C ${-baseW / 2} ${y + bulbR} ${x} ${y + bulbR * 1.5} ${x} ${y + bulbR}
                A ${bulbR} ${bulbR} 0 1 1 ${x + w} ${y + bulbR}
                C ${x + w} ${y + bulbR * 1.5} ${baseW / 2} ${y + bulbR} ${baseW / 2} ${baseY}
                Z
            `;
            // Base rect
            const baseRect = { type: 'rect', x: -baseW / 2, y: baseY, w: baseW, h: baseH };
            return {
                type: 'multi',
                shapes: [
                    { type: 'path', path: bulbPath },
                    baseRect as ShapeGeometry
                ]
            };
        }

        case 'signpost': {
            const poleW = Math.max(4, w * 0.05);
            const boardH = h * 0.3;
            const boardW = w * 0.9;
            const boardY = y + h * 0.1;

            return {
                type: 'multi',
                shapes: [
                    { type: 'rect', x: -poleW / 2, y: y, w: poleW, h: h }, // Pole
                    { type: 'rect', x: -boardW / 2, y: boardY, w: boardW, h: boardH } // Board
                ]
            };
        }

        case 'burstBlob': {
            const rx = w / 2;
            const ry = h / 2;
            const spikes = 12;
            const outerR = Math.min(rx, ry);
            const innerR = outerR * 0.6;
            const seed = el.seed || 1;

            // Simple deterministic random for geometry
            const randomSeeded = (s: number) => {
                let t = s += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < spikes * 2; i++) {
                const r = (i % 2 === 0) ? outerR : innerR;
                const rnd = randomSeeded(seed + i);
                const rVar = r + (rnd - 0.5) * (outerR * 0.1);
                const angle = (Math.PI * i) / spikes;
                points.push({
                    x: Math.cos(angle) * w / h * rVar,
                    y: Math.sin(angle) * rVar
                });
            }
            return { type: 'points', points };
        }

        case 'scroll': {
            const rollH = h * 0.15;
            const path = `
                M ${x} ${y + rollH}
                L ${x + w} ${y + rollH}
                L ${x + w} ${y + h - rollH}
                L ${x} ${y + h - rollH}
                Z
                M ${x} ${y + rollH}
                C ${x - rollH} ${y + rollH} ${x - rollH} ${y} ${x} ${y}
                L ${x + w} ${y}
                C ${x + w + rollH} ${y} ${x + w + rollH} ${y + rollH} ${x + w} ${y + rollH}
                M ${x} ${y + h - rollH}
                C ${x - rollH} ${y + h - rollH} ${x - rollH} ${y + h} ${x} ${y + h}
                L ${x + w} ${y + h}
                C ${x + w + rollH} ${y + h} ${x + w + rollH} ${y + h - rollH} ${x + w} ${y + h - rollH}
            `;
            return { type: 'path', path };
        }

        case 'doubleBanner': {
            const earW = w * 0.15;
            const earH = h * 0.25;

            // Main front panel
            const mainPoints = [
                { x: x + earW, y: y },
                { x: x + w - earW, y: y },
                { x: x + w - earW, y: y + h - earH },
                { x: x + earW, y: y + h - earH }
            ];

            // Left back ear
            const leftEar = [
                { x: x + earW, y: y + earH },
                { x: x, y: y + earH },
                { x: x + earW / 2, y: y + h / 2 },
                { x: x, y: y + h },
                { x: x + earW, y: y + h }
            ];

            // Right back ear
            const rightEar = [
                { x: x + w - earW, y: y + earH },
                { x: x + w, y: y + earH },
                { x: x + w - earW / 2, y: y + h / 2 },
                { x: x + w, y: y + h },
                { x: x + w - earW, y: y + h }
            ];

            return {
                type: 'multi',
                shapes: [
                    { type: 'points', points: leftEar },
                    { type: 'points', points: rightEar },
                    { type: 'points', points: mainPoints }
                ]
            };
        }

        case 'document': {
            const waveHeight = h * 0.1;
            const path = `
                M ${x} ${y}
                L ${x + w} ${y}
                L ${x + w} ${y + h - waveHeight}
                Q ${x + w * 0.75} ${y + h - waveHeight * 2} ${x + w * 0.5} ${y + h - waveHeight}
                T ${x} ${y + h - waveHeight}
                Z
            `;
            return { type: 'path', path };
        }
    }

    return null;
};
