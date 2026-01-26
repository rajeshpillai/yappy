import type { DrawingElement } from "../types";

export type ShapeGeometry =
    | { type: 'rect', x: number, y: number, w: number, h: number, r?: number }
    | { type: 'ellipse', cx: number, cy: number, rx: number, ry: number }
    | { type: 'path', path: string }
    | { type: 'points', points: { x: number, y: number }[], isClosed?: boolean }
    | { type: 'multi', shapes: ShapeGeometry[] };

const getRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
    return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y}`;
};

export const getShapeGeometry = (el: DrawingElement): ShapeGeometry | null => {
    const w = el.width;
    const h = el.height;
    const mw = w / 2;
    const mh = h / 2;
    const x = -mw;
    const y = -mh;

    switch (el.type) {
        case 'rectangle':
        case 'image':
        case 'text':

        case 'umlClass':
        case 'umlNote':
        case 'umlPackage':
        case 'umlActor': // Approximate as rect for now
            return { type: 'rect', x: x, y: y, w: w, h: h, r: el.roundness ? 10 : 0 };

        case 'umlInterface':
        case 'umlUseCase':

        case 'circle':
            return { type: 'ellipse', cx: 0, cy: 0, rx: w / 2, ry: h / 2 };

        case 'triangle':
            return { type: 'points', points: [{ x: 0, y: -mh }, { x: -mw, y: mh }, { x: mw, y: mh }] };

        case 'diamond':
            return { type: 'points', points: [{ x: 0, y: -mh }, { x: mw, y: 0 }, { x: 0, y: mh }, { x: -mw, y: 0 }] };

        case 'hexagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points: points };
        }

        case 'octagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points: points };
        }

        case 'pentagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points: points };
        }

        case 'septagon': {
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < 7; i++) {
                const angle = (Math.PI * 2 / 7) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points: points };
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
            return { type: 'points', points: points };
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
            return { type: 'points', points: points };
        }

        case 'parallelogram': {
            const offset = w * 0.2;
            return { type: 'points', points: [{ x: x + offset, y: y }, { x: x + w, y: y }, { x: x + w - offset, y: y + h }, { x: x, y: y + h }] };
        }

        case 'trapezoid': {
            const offset = w * 0.2;
            return { type: 'points', points: [{ x: x + offset, y: y }, { x: x + w - offset, y: y }, { x: x + w, y: y + h }, { x: x, y: y + h }] };
        }

        case 'rightTriangle':
            return { type: 'points', points: [{ x: x, y: y }, { x: x, y: y + h }, { x: x + w, y: y + h }] };

        case 'capsule':
            return { type: 'path', path: getRoundedRectPath(x, y, w, h, Math.min(w, h) / 2) };

        case 'stickyNote': {
            const fold = Math.min(w, h) * 0.15;
            return { type: 'points', points: [{ x: x, y: y }, { x: x + w, y: y }, { x: x + w, y: y + h - fold }, { x: x + w - fold, y: y + h }, { x: x, y: y + h }] };
        }

        case 'callout': {
            const tailH = h * 0.2;
            const rectH = h - tailH;
            return { type: 'path', path: `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + rectH} L ${x + w * 0.7} ${y + rectH} L ${0} ${mh} L ${x + w * 0.3} ${y + rectH} L ${x} ${y + rectH} Z` };
        }

        case 'speechBubble': {
            const r = Math.min(w, h) * ((el.borderRadius !== undefined ? el.borderRadius : 20) / 100);
            const tailW = w * 0.15;
            const tailH = h * 0.2;
            const rectH = h - tailH;
            const tailPos = (el.tailPosition !== undefined ? el.tailPosition : 20) / 100;
            const tipX = x + (w * tailPos);
            let bX1, bX2;
            if (tailPos <= 0.5) { bX1 = tipX + (w * 0.1); bX2 = bX1 + tailW; }
            else { bX2 = tipX - (w * 0.1); bX1 = bX2 - tailW; }
            const rX = Math.min(w / 2, r), rY = Math.min(rectH / 2, r);
            return { type: 'path', path: `M ${x + rX} ${y} L ${x + w - rX} ${y} Q ${x + w} ${y} ${x + w} ${y + rY} L ${x + w} ${y + rectH - rY} Q ${x + w} ${y + rectH} ${x + w - rX} ${y + rectH} L ${bX2} ${y + rectH} L ${tipX} ${mh} L ${bX1} ${y + rectH} L ${x + rX} ${y + rectH} Q ${x} ${y + rectH} ${x} ${y + rectH - rY} L ${x} ${y + rY} Q ${x} ${y} ${x + rX} ${y} Z` };
        }

        case 'cloud': {
            const r1 = w * 0.2, r2 = w * 0.25, r3 = w * 0.2, r4 = w * 0.3;
            return { type: 'path', path: `M ${x + r1} 0 A ${r1} ${r1} 0 0 1 ${x + (w * 0.3)} ${y + r2} A ${r2} ${r2} 0 0 1 ${x + (w * 0.7)} ${y + r2} A ${r3} ${r3} 0 0 1 ${x + w - r3} 0 A ${r4} ${r4} 0 0 1 ${x + (w * 0.6)} ${y + h - (r4 * 0.5)} A ${r4} ${r4} 0 0 1 ${x + (w * 0.3)} ${y + h - (r4 * 0.5)} A ${r4} ${r4} 0 0 1 ${x + r1} 0 Z` };
        }

        case 'heart':
            return { type: 'path', path: `M ${0} ${y + (h * 0.3)} C ${0} ${y + (h * 0.15)} ${x + (w * 0.3)} ${y} ${x + (w * 0.5)} ${y + (h * 0.15)} C ${x + (w * 0.7)} ${y} ${x + w} ${y + (h * 0.15)} ${x + w} ${y + (h * 0.35)} C ${x + w} ${y + (h * 0.6)} ${0} ${y + (h * 0.8)} ${0} ${y + h} C ${0} ${y + (h * 0.8)} ${x} ${y + (h * 0.6)} ${x} ${y + (h * 0.35)} C ${x} ${y + (h * 0.15)} ${x + (w * 0.3)} ${y} ${x + (w * 0.5)} ${y + (h * 0.15)} Z` };

        case 'polygon': {
            const sides = el.polygonSides || 6;
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < sides; i++) {
                const angle = (2 * Math.PI / sides) * i - Math.PI / 2;
                points.push({ x: (w / 2) * Math.cos(angle), y: (h / 2) * Math.sin(angle) });
            }
            return { type: 'points', points: points };
        }

        case 'starPerson': {
            const headR = Math.min(w, h) * 0.15;
            const neckY = y + (headR * 2);
            return {
                type: 'multi', shapes: [
                    { type: 'ellipse', cx: 0, cy: y + headR, rx: headR, ry: headR },
                    { type: 'points', points: [{ x: 0, y: neckY }, { x: x, y: y + (h * 0.4) }, { x: 0, y: y + (h * 0.5) }, { x: x + w, y: y + (h * 0.4) }, { x: 0, y: neckY }, { x: x + (w * 0.8), y: y + h }, { x: 0, y: y + (h * 0.7) }, { x: x + (w * 0.2), y: y + h }, { x: 0, y: neckY }] }
                ]
            };
        }

        case 'lightbulb': {
            const bulbR = Math.min(w, h / 1.5) / 2;
            const bW = w * 0.4, bH = h * 0.25, bY = y + h - bH;
            return {
                type: 'multi', shapes: [
                    { type: 'path', path: `M ${-bW / 2} ${bY} C ${-bW / 2} ${y + bulbR} ${x} ${y + (bulbR * 1.5)} ${x} ${y + bulbR} A ${bulbR} ${bulbR} 0 1 1 ${x + w} ${y + bulbR} C ${x + w} ${y + (bulbR * 1.5)} ${bW / 2} ${y + bulbR} ${bW / 2} ${bY} Z` },
                    { type: 'rect', x: -bW / 2, y: bY, w: bW, h: bH }
                ]
            };
        }

        case 'signpost': {
            const poleW = Math.max(4, w * 0.05), bH = h * 0.3, bW = w * 0.9, bY = y + h * 0.1;
            return {
                type: 'multi', shapes: [
                    { type: 'rect', x: -poleW / 2, y: y, w: poleW, h: h },
                    { type: 'rect', x: -bW / 2, y: bY, w: bW, h: bH }
                ]
            };
        }

        case 'burstBlob': {
            const rx = w / 2, ry = h / 2, spikes = 12, outerR = Math.min(rx, ry), innerR = outerR * 0.6, seed = el.seed || 1;
            const randomSeeded = (s: number) => { let t = (s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i < spikes * 2; i++) {
                const r = (i % 2 === 0) ? outerR : innerR;
                const rVar = r + (randomSeeded(seed + i) - 0.5) * (outerR * 0.1);
                const angle = (Math.PI * i) / spikes;
                points.push({ x: Math.cos(angle) * (w / h) * rVar, y: Math.sin(angle) * rVar });
            }
            return { type: 'points', points: points };
        }

        case 'scroll': {
            const rH = h * 0.15;
            return { type: 'path', path: `M ${x} ${y + rH} L ${x + w} ${y + rH} L ${x + w} ${y + h - rH} L ${x} ${y + h - rH} Z M ${x} ${y + rH} C ${x - rH} ${y + rH} ${x - rH} ${y} ${x} ${y} L ${x + w} ${y} C ${x + w + rH} ${y} ${x + w + rH} ${y + rH} ${x + w} ${y + rH} M ${x} ${y + h - rH} C ${x - rH} ${y + h - rH} ${x - rH} ${y + h} ${x} ${y + h} L ${x + w} ${y + h} C ${x + w + rH} ${y + h} ${x + w + rH} ${y + h - rH} ${x + w} ${y + h - rH}` };
        }

        case 'doubleBanner': {
            const eW = w * 0.15, eH = h * 0.25;
            return {
                type: 'multi', shapes: [
                    { type: 'points', points: [{ x: x + eW, y: y + eH }, { x: x, y: y + eH }, { x: x + (eW / 2), y: 0 }, { x: x, y: mh }, { x: x + eW, y: mh }] },
                    { type: 'points', points: [{ x: x + w - eW, y: y + eH }, { x: x + w, y: y + eH }, { x: x + w - (eW / 2), y: 0 }, { x: x + w, y: mh }, { x: x + w - eW, y: mh }] },
                    { type: 'points', points: [{ x: x + eW, y: y }, { x: x + w - eW, y: y }, { x: x + w - eW, y: y + h - eH }, { x: x + eW, y: y + h - eH }] }
                ]
            };
        }

        case 'document': {
            const wH = h * 0.1;
            return { type: 'path', path: `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - wH} Q ${x + (w * 0.75)} ${y + h - (wH * 2)} ${x + (w * 0.5)} ${y + h - wH} T ${x} ${y + h - wH} Z` };
        }

        case 'cross':
            return { type: 'multi', shapes: [{ type: 'points', points: [{ x: x, y: y }, { x: x + w, y: y + h }] }, { type: 'points', points: [{ x: x + w, y: y }, { x: x, y: y + h }] }] };

        case 'checkmark':
            return { type: 'points', points: [{ x: x, y: y + (h * 0.5) }, { x: x + (w * 0.4), y: mh }, { x: x + w, y: y }] };

        case 'wavyDivider': {
            let p = `M ${x} 0`;
            for (let i = 1; i <= 20; i++) {
                p += ` L ${x + (i / 20) * w} ${Math.sin((i / 20) * Math.PI * 4) * (h / 2)}`;
            }
            return { type: 'path', path: p };
        }

        case 'ribbon': {
            const eW = w * 0.15, mH = h * 0.7;
            return { type: 'path', path: `M ${x + eW} ${y} L ${x + w - eW} ${y} L ${x + w - eW} ${y + mH} L ${x + w} ${y + h / 2} L ${x + w - eW} ${y + (h * 0.8)} L ${x + eW} ${y + (h * 0.8)} L ${x} ${y + h / 2} L ${x + eW} ${y + mH} Z` };
        }

        case 'bracketLeft': {
            return {
                type: 'points',
                isClosed: false,
                points: [
                    { x: x + w, y: y },
                    { x: x, y: y + h / 2 },
                    { x: x + w, y: y + h }
                ]
            };
        }

        case 'bracketRight': {
            return {
                type: 'points',
                isClosed: false,
                points: [
                    { x: x, y: y },
                    { x: x + w, y: y + h / 2 },
                    { x: x, y: y + h }
                ]
            };
        }

        case 'arrowLeft': {
            const tH = h * 0.4; // tail height
            const tY = y + (h - tH) / 2;
            const hW = w * 0.4; // head width
            return { type: 'points', points: [{ x: x + hW, y: y }, { x: x + hW, y: tY }, { x: x + w, y: tY }, { x: x + w, y: tY + tH }, { x: x + hW, y: tY + tH }, { x: x + hW, y: y + h }, { x: x, y: y + h / 2 }] };
        }

        case 'arrowRight': {
            const tH = h * 0.4;
            const tY = y + (h - tH) / 2;
            const hW = w * 0.4; // head width
            return { type: 'points', points: [{ x: x + w - hW, y: y }, { x: x + w, y: y + h / 2 }, { x: x + w - hW, y: y + h }, { x: x + w - hW, y: tY + tH }, { x: x, y: tY + tH }, { x: x, y: tY }, { x: x + w - hW, y: tY }] };
        }

        case 'arrowUp': {
            const tW = w * 0.4; // tail width
            const tX = x + (w - tW) / 2;
            const hH = h * 0.4; // head height
            return { type: 'points', points: [{ x: x + w / 2, y: y }, { x: x + w, y: y + hH }, { x: tX + tW, y: y + hH }, { x: tX + tW, y: y + h }, { x: tX, y: y + h }, { x: tX, y: y + hH }, { x: x, y: y + hH }] };
        }

        case 'arrowDown': {
            const tW = w * 0.4;
            const tX = x + (w - tW) / 2;
            const hH = h * 0.4;
            return { type: 'points', points: [{ x: tX, y: y }, { x: tX + tW, y: y }, { x: tX + tW, y: y + h - hH }, { x: x + w, y: y + h - hH }, { x: x + w / 2, y: y + h }, { x: x, y: y + h - hH }, { x: tX, y: y + h - hH }] };
        }

        case 'dfdProcess': {
            const headerH = h * 0.25;
            const r = 10;
            return {
                type: 'multi', shapes: [
                    { type: 'rect', x: x, y: y, w: w, h: h, r: r },
                    { type: 'points', points: [{ x: x, y: y + headerH }, { x: x + w, y: y + headerH }], isClosed: false }
                ]
            };
        }

        case 'dfdDataStore': {
            const labelW = w * 0.2;
            return {
                type: 'multi', shapes: [
                    {
                        type: 'points', isClosed: false, points: [
                            { x: x + w, y: y },
                            { x: x, y: y },
                            { x: x, y: y + h },
                            { x: x + w, y: y + h }
                        ]
                    },
                    {
                        type: 'points', isClosed: false, points: [
                            { x: x + labelW, y: y },
                            { x: x + labelW, y: y + h }
                        ]
                    }
                ]
            };
        }

        case 'isometricCube': {
            // Vertical Ratio (Height of top face) - Default 25%
            const vRatio = (el.shapeRatio !== undefined ? el.shapeRatio : 25) / 100;
            const dy = h * vRatio;

            // Horizontal Ratio (Skew/Rotation) - Default 50%
            const hRatio = (el.sideRatio !== undefined ? el.sideRatio : 50) / 100;
            const spineX = x + w * hRatio;

            // Vertices
            const topY = y;
            const midY = y + dy;
            const bottomY = y + h;
            const sideY = y + h - dy; // Bottom of side faces

            /*
               Points Layout:
               Top Face:
                 Top: (spineX, topY)
                 Right: (x+w, midY)
                 Bottom: (spineX, midY + dy)? No.
                 Let's rethink based on standard isometric projection logic.
                 
                 If spineX is the center vertical axis X.
                 Top Vertex: (spineX, y)
                 Left Corner: (x, y + dy/2?) No, dy is face height.
                 
                 Let's stick to the previous simple logic but skewed.
                 Old logic:
                 Top Face: (midX, y), (x+w, y+dy), (midX, y+2*dy?!), (x, y+dy)
                 Wait, the old logic had midX = 0? That seems buggy in the view_file output.
                 Ah, lines 342: midX = 0; midY = 0; was suspicious in previous view.
                 It probably relied on relative coordinates? No, x and y are absolute.
                 Let's rewrite properly.
            */

            // Revised Logic:
            // 1. Center internal vertex (meeting point of 3 faces): (spineX, y + h * vRatio)
            //    Actually, let's define dy as the offset from top/bottom.

            // Top Vertex of the whole bounds: (spineX, y)
            // Center Vertex (Inner): (spineX, y + h * vRatio)
            // Left Vertex: (x, y + h * vRatio / 2)?
            // Right Vertex: (x + w, y + h * vRatio / 2)?

            // To keep it filling the bounding box (x,y,w,h):
            // Top Vertex: (spineX, y)
            // Bottom Vertex: (spineX, y + h)
            // Left Vertex: (x, y + h * vRatio)  <-- This determines the "slope" of top-left edge
            // Right Vertex: (x + w, y + h * vRatio)

            // Actually, if we want a "cube" look, the side edges should be vertical.
            // So Left Face is: Left Vertex -> Center Vertex -> Bottom Vertex -> Left Bottom?

            // Let's use the standard "Y" shape for the inner lines.
            // Top Vertex: (spineX, y)
            // Center (inner): (spineX, y + h * vRatio)
            // Bottom Vertex: (spineX, y + h)

            // Left Edge X: x
            // Right Edge X: x + w

            // The "Shoulders" (Left and Right corners of top face):
            // They need to be at some Y. 
            // If we want the top face to be 2*dy height. centerY = y + dy.
            // Shoulder Y = y + dy / 2.

            // Let's simplify:
            // Top Face is a quad.
            // Top point: T (spineX, y)
            // Bottom point: C (spineX, y + h * vRatio)
            // Left point: L (x, y + h * vRatio / 2)
            // Right point: R (x + w, y + h * vRatio / 2)

            // This ensures Top Face is contained in top portion.
            // And vertical sides go down.
            // Side Bottom Left: (x, y + h - (h * vRatio / 2))
            // Side Bottom Right: (x+w, y + h - (h * vRatio / 2))

            // Wait, if it's a cube, vertical lines should be parallel.
            // L -> L_bottom
            // R -> R_bottom
            // C -> Bottom Vertex (spineX, y+h)

            // To maximize usage of bounding box:
            // L_bottom.y should be y + h - (difference between C.y and T.y)? No.

            // Let's assume the "Front vertical edge" (C to Bottom) has length L_v.
            // And "Side vertical edges" (L to L_bottom) have length L_v.
            // C.y = y + faceHeight.
            // Bottom.y = y + h.
            // So L_v = h - faceHeight.

            // Then L_bottom.y = L.y + L_v = (y + faceHeight/2) + (h - faceHeight) = y + h - faceHeight/2.

            const faceHeight = h * vRatio;
            const cy = y + faceHeight; // Center Y

            const shoulderY = y + faceHeight / 2;

            return {
                type: 'multi', shapes: [
                    // Top Face
                    {
                        type: 'points', points: [
                            { x: spineX, y: y }, // Top
                            { x: x + w, y: shoulderY }, // Right
                            { x: spineX, y: cy }, // Center
                            { x: x, y: shoulderY } // Left
                        ]
                    },
                    // Left Face
                    {
                        type: 'points', points: [
                            { x: x, y: shoulderY }, // Top Left
                            { x: spineX, y: cy }, // Center
                            { x: spineX, y: y + h }, // Bottom Center
                            { x: x, y: y + h - faceHeight / 2 } // Bottom Left
                        ]
                    },
                    // Right Face
                    {
                        type: 'points', points: [
                            { x: spineX, y: cy }, // Center
                            { x: x + w, y: shoulderY }, // Top Right
                            { x: x + w, y: y + h - faceHeight / 2 }, // Bottom Right
                            { x: spineX, y: y + h } // Bottom Center
                        ]
                    }
                ]
            };
        }

        case 'cylinder': {
            const rx = w / 2;
            const ry = h * 0.15;
            return {
                type: 'multi', shapes: [
                    { type: 'ellipse', cx: 0, cy: y + ry, rx: rx, ry: ry },
                    { type: 'ellipse', cx: 0, cy: y + h - ry, rx: rx, ry: ry },
                    { type: 'points', points: [{ x: x, y: y + ry }, { x: x, y: y + h - ry }], isClosed: false },
                    { type: 'points', points: [{ x: x + w, y: y + ry }, { x: x + w, y: y + h - ry }], isClosed: false }
                ]
            };
        }

        case 'stateStart': {
            return { type: 'ellipse', cx: 0, cy: 0, rx: w / 2, ry: h / 2 };
        }

        case 'stateEnd': {
            return {
                type: 'multi', shapes: [
                    { type: 'ellipse', cx: 0, cy: 0, rx: w / 2, ry: h / 2 },
                    { type: 'ellipse', cx: 0, cy: 0, rx: w / 3, ry: h / 3 }
                ]
            };
        }

        case 'stateSync': {
            return { type: 'rect', x: x, y: y, w: w, h: h, r: 2 };
        }

        case 'activationBar': {
            return { type: 'rect', x: x, y: y, w: w, h: h, r: 0 };
        }

        case 'externalEntity': {
            const shadowOffset = 4;
            return {
                type: 'multi', shapes: [
                    { type: 'rect', x: x + shadowOffset, y: y + shadowOffset, w: w, h: h, r: 0 }, // Shadow
                    { type: 'rect', x: x, y: y, w: w, h: h, r: 0 } // Main box
                ]
            };
        }
    }

    return null;
};
