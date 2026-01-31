#!/usr/bin/env node
/**
 * Generates a large (~250+ element) Yappy infinite-canvas JSON
 * that showcases every feature: all shape types, fill styles,
 * animations, effects, text features, and connectors.
 *
 * Content theme: "Yappy Feature Showcase" — a mind-map of Yappy's own capabilities.
 *
 * Usage:  node scripts/gen-large-sketch.cjs
 * Output: data/large-sketch.json
 */

const fs = require('fs');
const path = require('path');

let seedCounter = 1000;
const seed = () => seedCounter++;

const elements = [];
let idCounter = 0;
const id = (prefix) => `${prefix}-${++idCounter}`;

// ── Helpers ──────────────────────────────────────────────────────

function makeShape(overrides) {
    return {
        strokeColor: '#1e293b',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        angle: 0,
        renderStyle: 'sketch',
        seed: seed(),
        roundness: null,
        locked: false,
        link: null,
        layerId: 'main',
        ...overrides,
    };
}

function makeArrow({ fromId, toId, fromPos, toPos, color, flow, flowSpeed, dashed, strokeWidth, curveType }) {
    const arrowId = id('conn');
    return makeShape({
        id: arrowId,
        type: 'arrow',
        x: 0, y: 0, width: 100, height: 100,
        strokeColor: color || '#64748b',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: strokeWidth || 1.5,
        strokeStyle: dashed ? 'dashed' : 'solid',
        roughness: 0.5,
        opacity: 70,
        points: [0, 0, 100, 100],
        startArrowhead: null,
        endArrowhead: 'arrow',
        curveType: curveType || 'bezier',
        ...(flow ? { flowAnimation: true, flowColor: color || '#64748b', flowSpeed: flowSpeed || 1 } : {}),
        startBinding: { elementId: fromId, focus: 0, gap: 5, position: fromPos || 'bottom' },
        endBinding: { elementId: toId, focus: 0, gap: 5, position: toPos || 'top' },
    });
}

// ── Layers ───────────────────────────────────────────────────────

const layers = [
    { id: 'bg', name: 'Background Decor', visible: true, locked: false, opacity: 0.5, order: -1 },
    { id: 'main', name: 'Main Content', visible: true, locked: false, opacity: 1, order: 0 },
    { id: 'effects', name: 'Effects Demo', visible: true, locked: false, opacity: 1, order: 1 },
];

// ── Background blobs (layer: bg) ────────────────────────────────

const bgColors = ['#dbeafe', '#fce7f3', '#ecfdf5', '#fef3c7', '#ede9fe', '#fef2f2', '#e0f2fe', '#f0fdf4'];
for (let i = 0; i < 12; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    elements.push(makeShape({
        id: id('bg-blob'),
        type: 'circle',
        x: -300 + col * 1600 + (row % 2) * 500,
        y: -200 + row * 1400,
        width: 400 + Math.random() * 300,
        height: 400 + Math.random() * 300,
        strokeColor: 'transparent',
        backgroundColor: bgColors[i % bgColors.length],
        strokeWidth: 0,
        roughness: 0,
        opacity: 20 + Math.floor(Math.random() * 15),
        renderStyle: 'architectural',
        layerId: 'bg',
    }));
}

// ── ROOT NODE ────────────────────────────────────────────────────

const rootId = id('root');
elements.push(makeShape({
    id: rootId,
    type: 'rectangle',
    x: 2400, y: 30, width: 400, height: 100,
    strokeColor: '#1e40af',
    backgroundColor: '#3b82f6',
    strokeWidth: 3,
    roughness: 1.5,
    renderStyle: 'sketch',
    fontSize: 30,
    fontFamily: 'hand-drawn',
    textAlign: 'center',
    containerText: 'Yappy\nFeature Showcase',
    textColor: '#ffffff',
    shadowEnabled: true,
    shadowBlur: 24,
    shadowColor: 'rgba(59,130,246,0.5)',
    shadowOffsetX: 0,
    shadowOffsetY: 8,
}));

// ── MAIN BRANCHES ────────────────────────────────────────────────
// Each branch: { label, color, bgColor, x }   — 800px apart

const branches = [
    { key: 'shapes',      label: 'Basic Shapes',      color: '#dc2626', bg: '#fecaca', x: -200 },
    { key: 'sketchnote',  label: 'Sketchnote',        color: '#ea580c', bg: '#fed7aa', x: 600 },
    { key: 'flowchart',   label: 'Flowchart & UML',   color: '#ca8a04', bg: '#fef08a', x: 1400 },
    { key: 'people',      label: 'People & Status',   color: '#16a34a', bg: '#bbf7d0', x: 2200 },
    { key: 'infra',       label: 'Cloud & Infra',     color: '#0891b2', bg: '#a5f3fc', x: 3000 },
    { key: 'data',        label: 'Data & Metrics',    color: '#7c3aed', bg: '#ddd6fe', x: 3800 },
    { key: 'fills',       label: 'Fill Styles',       color: '#db2777', bg: '#fbcfe8', x: 4600 },
    { key: 'animations',  label: 'Animations',        color: '#0d9488', bg: '#99f6e4', x: 5400 },
];

const branchIds = {};
const branchY = 350;

branches.forEach(b => {
    const bId = id(`branch-${b.key}`);
    branchIds[b.key] = bId;
    elements.push(makeShape({
        id: bId,
        type: 'rectangle',
        x: b.x, y: branchY, width: 220, height: 70,
        strokeColor: b.color,
        backgroundColor: b.bg,
        strokeWidth: 2,
        roughness: 1.5,
        fontSize: 18,
        fontFamily: 'hand-drawn',
        textAlign: 'center',
        containerText: b.label,
        parentId: rootId,
        shadowEnabled: true,
        shadowBlur: 10,
        shadowColor: b.color + '40',
        shadowOffsetX: 0,
        shadowOffsetY: 4,
    }));
    // Arrow from root to branch
    elements.push(makeArrow({
        fromId: rootId,
        toId: bId,
        color: b.color,
        flow: true,
        flowSpeed: 1 + Math.random(),
    }));
});

// ── SUB-BRANCH HELPER (grid layout) ────────────────────────────

function addLeaves(parentKey, parentColor, items, startY, startX, cols) {
    const parentId = branchIds[parentKey];
    const numCols = cols || 4;
    const colSpacing = 200;
    const rowSpacing = 180;
    const leafIds = [];
    items.forEach((item, i) => {
        const leafId = id(`leaf-${parentKey}`);
        leafIds.push(leafId);
        const col = i % numCols;
        const row = Math.floor(i / numCols);
        const baseX = startX !== undefined ? startX : branches.find(b => b.key === parentKey).x - 100;
        const x = baseX + col * colSpacing;
        const y = (startY || 600) + row * rowSpacing;
        const el = makeShape({
            id: leafId,
            type: item.type || 'rectangle',
            x, y,
            width: item.width || 130,
            height: item.height || 90,
            strokeColor: item.strokeColor || parentColor,
            backgroundColor: item.bg || '#ffffff',
            fillStyle: item.fillStyle || 'solid',
            ...(item.fillDensity ? { fillDensity: item.fillDensity } : {}),
            strokeWidth: item.strokeWidth || 2,
            strokeStyle: item.strokeStyle || 'solid',
            roughness: item.roughness ?? 1,
            renderStyle: item.renderStyle || 'sketch',
            fontSize: item.fontSize || 12,
            fontFamily: item.fontFamily || 'hand-drawn',
            textAlign: 'center',
            ...(item.containerText ? { containerText: item.containerText } : {}),
            ...(item.text ? { text: item.text } : {}),
            parentId,
            ...(item.extra || {}),
        });
        elements.push(el);
        elements.push(makeArrow({
            fromId: parentId,
            toId: leafId,
            color: parentColor,
            dashed: true,
        }));
    });
    return leafIds;
}

// ── 1. BASIC SHAPES BRANCH ──────────────────────────────────────

const basicShapeIds = addLeaves('shapes', '#dc2626', [
    { type: 'rectangle', containerText: 'Rectangle', bg: '#fee2e2' },
    { type: 'circle', containerText: 'Circle', bg: '#fef2f2' },
    { type: 'diamond', containerText: 'Diamond', bg: '#fff1f2' },
    { type: 'triangle', containerText: 'Triangle', bg: '#ffe4e6' },
    { type: 'hexagon', containerText: 'Hexagon', bg: '#fecdd3' },
    { type: 'star', containerText: 'Star', bg: '#fda4af', width: 100, height: 100 },
    { type: 'heart', containerText: 'Heart', bg: '#fb7185', width: 100, height: 100 },
    { type: 'cloud', containerText: 'Cloud', bg: '#fecaca', width: 150, height: 90 },
    { type: 'capsule', containerText: 'Capsule', bg: '#fca5a5', width: 140 },
    { type: 'pentagon', containerText: 'Pentagon', bg: '#f87171' },
    { type: 'octagon', containerText: 'Octagon', bg: '#ef4444' },
], 600, -300);

// Second row of basic shapes
addLeaves('shapes', '#dc2626', [
    { type: 'parallelogram', containerText: 'Parallel.', bg: '#fee2e2' },
    { type: 'trapezoid', containerText: 'Trapezoid', bg: '#fef2f2' },
    { type: 'rightTriangle', containerText: 'Right Tri', bg: '#fff1f2' },
    { type: 'septagon', containerText: 'Septagon', bg: '#ffe4e6' },
    { type: 'cross', containerText: 'Cross', bg: '#fecdd3', width: 90, height: 90 },
    { type: 'checkmark', containerText: 'Check', bg: '#fda4af', width: 90, height: 90 },
    { type: 'burst', containerText: 'Burst', bg: '#fb7185', width: 100, height: 100 },
    { type: 'callout', containerText: 'Callout', bg: '#fecaca', width: 150 },
    { type: 'speechBubble', containerText: 'Speech', bg: '#fca5a5', width: 150 },
    { type: 'ribbon', containerText: 'Ribbon', bg: '#f87171', width: 150 },
], 1200, -300);

// ── 2. SKETCHNOTE BRANCH ────────────────────────────────────────

const sketchnoteIds = addLeaves('sketchnote', '#ea580c', [
    { type: 'trophy', containerText: 'Trophy', bg: '#fef08a', strokeColor: '#ca8a04', extra: { spinEnabled: true, spinSpeed: 0.3 } },
    { type: 'clock', containerText: '60 fps', bg: '#ede9fe', strokeColor: '#7c3aed' },
    { type: 'gear', containerText: 'Engine', bg: '#f3f4f6', strokeColor: '#6b7280', extra: { spinEnabled: true, spinSpeed: -0.5 } },
    { type: 'target', containerText: 'Focus', bg: '#fee2e2', strokeColor: '#dc2626' },
    { type: 'rocket', containerText: 'Launch!', bg: '#dbeafe', strokeColor: '#2563eb' },
    { type: 'flag', containerText: 'Done', bg: '#d1fae5', strokeColor: '#059669' },
    { type: 'lightbulb', containerText: 'Ideas', bg: '#fef9c3', strokeColor: '#ca8a04', width: 100, height: 110 },
    { type: 'starPerson', containerText: 'VIP', bg: '#fde68a', strokeColor: '#d97706', width: 100, height: 120 },
    { type: 'signpost', containerText: 'Guide', bg: '#e0f2fe', strokeColor: '#0284c7', width: 100, height: 110 },
    { type: 'burstBlob', containerText: 'Wow!', bg: '#fce7f3', strokeColor: '#db2777', width: 110, height: 100 },
], 600, 500);

addLeaves('sketchnote', '#ea580c', [
    { type: 'scroll', containerText: 'Story', bg: '#fef3c7', strokeColor: '#d97706', width: 110, height: 120 },
    { type: 'wavyDivider', bg: '#fed7aa', strokeColor: '#ea580c', width: 220, height: 40, containerText: '' },
    { type: 'doubleBanner', containerText: 'Banner', bg: '#ffedd5', strokeColor: '#ea580c', width: 160, height: 100 },
], 1200, 550, 3);

// ── 3. FLOWCHART & UML BRANCH ───────────────────────────────────

addLeaves('flowchart', '#ca8a04', [
    { type: 'database', containerText: 'Database', bg: '#fef9c3', width: 110, height: 100 },
    { type: 'document', containerText: 'Document', bg: '#fef08a' },
    { type: 'predefinedProcess', containerText: 'Process', bg: '#fde68a' },
    { type: 'internalStorage', containerText: 'Storage', bg: '#fcd34d' },
    { type: 'cylinder', containerText: 'Cylinder', bg: '#fbbf24', width: 100, height: 110 },
], 600, 1300);

// UML shapes
addLeaves('flowchart', '#ca8a04', [
    { type: 'umlClass', containerText: 'Class', bg: '#fef9c3', renderStyle: 'architectural', roughness: 0 },
    { type: 'umlState', containerText: 'State', bg: '#fef08a', renderStyle: 'architectural', roughness: 0 },
    { type: 'umlActor', containerText: 'Actor', bg: '#fde68a', width: 80, height: 110, renderStyle: 'architectural', roughness: 0 },
    { type: 'umlUseCase', containerText: 'Use Case', bg: '#fcd34d', width: 150, renderStyle: 'architectural', roughness: 0 },
    { type: 'umlNote', containerText: 'Note', bg: '#fbbf24', renderStyle: 'architectural', roughness: 0 },
    { type: 'umlComponent', containerText: 'Component', bg: '#f59e0b', renderStyle: 'architectural', roughness: 0 },
    { type: 'umlPackage', containerText: 'Package', bg: '#d97706', width: 150, renderStyle: 'architectural', roughness: 0 },
    { type: 'umlInterface', containerText: 'Interface', bg: '#b45309', renderStyle: 'architectural', roughness: 0, width: 90, height: 90 },
], 1050, 1250);

// ── 4. PEOPLE & STATUS BRANCH ───────────────────────────────────

addLeaves('people', '#16a34a', [
    { type: 'stickFigure', containerText: 'User', bg: 'transparent', width: 70, height: 110 },
    { type: 'sittingPerson', containerText: 'Sit', bg: 'transparent', width: 80, height: 110 },
    { type: 'presentingPerson', containerText: 'Present', bg: 'transparent', width: 90, height: 110 },
    { type: 'faceHappy', containerText: '', bg: '#fef08a', strokeColor: '#ca8a04', width: 80, height: 80 },
    { type: 'faceSad', containerText: '', bg: '#e2e8f0', strokeColor: '#475569', width: 80, height: 80 },
    { type: 'faceConfused', containerText: '', bg: '#fde68a', strokeColor: '#92400e', width: 80, height: 80 },
    { type: 'handPointRight', containerText: '', bg: 'transparent', width: 90, height: 70 },
    { type: 'thumbsUp', containerText: '', bg: 'transparent', width: 80, height: 90 },
], 600, 2100);

// Status shapes
addLeaves('people', '#16a34a', [
    { type: 'checkbox', containerText: 'ToDo', bg: '#f1f5f9', width: 90, height: 90 },
    { type: 'checkboxChecked', containerText: 'Done', bg: '#d1fae5', width: 90, height: 90 },
    { type: 'numberedBadge', containerText: '42', bg: '#dbeafe', strokeColor: '#2563eb', width: 80, height: 80 },
    { type: 'questionMark', containerText: '', bg: '#fef3c7', strokeColor: '#d97706', width: 70, height: 90 },
    { type: 'exclamationMark', containerText: '', bg: '#fee2e2', strokeColor: '#dc2626', width: 70, height: 90 },
    { type: 'tag', containerText: 'v2.0', bg: '#e0e7ff', strokeColor: '#4f46e5', width: 120, height: 60 },
    { type: 'pin', containerText: '', bg: '#fecaca', strokeColor: '#dc2626', width: 60, height: 80 },
    { type: 'stamp', containerText: 'OK', bg: '#d1fae5', strokeColor: '#059669', width: 90, height: 90 },
], 1050, 2100);

// ── 5. CLOUD & INFRA BRANCH ─────────────────────────────────────

const infraIds = addLeaves('infra', '#0891b2', [
    { type: 'server', containerText: 'Server', bg: '#e2e8f0', strokeColor: '#475569', renderStyle: 'architectural', roughness: 0 },
    { type: 'loadBalancer', containerText: 'LB', bg: '#a5f3fc', renderStyle: 'architectural', roughness: 0 },
    { type: 'firewall', containerText: 'Firewall', bg: '#fed7aa', strokeColor: '#ea580c', renderStyle: 'architectural', roughness: 0 },
    { type: 'messageQueue', containerText: 'Queue', bg: '#c7d2fe', strokeColor: '#4f46e5', renderStyle: 'architectural', roughness: 0 },
    { type: 'lambda', containerText: 'Lambda', bg: '#fef08a', strokeColor: '#ca8a04', renderStyle: 'architectural', roughness: 0, width: 100, height: 100 },
    { type: 'router', containerText: 'Router', bg: '#bbf7d0', strokeColor: '#16a34a', renderStyle: 'architectural', roughness: 0 },
], 600, 2900);

const infraIds2 = addLeaves('infra', '#0891b2', [
    { type: 'kubernetes', containerText: 'K8s', bg: '#bfdbfe', strokeColor: '#2563eb', renderStyle: 'architectural', roughness: 0, width: 100, height: 100 },
    { type: 'container', containerText: 'Docker', bg: '#a5f3fc', strokeColor: '#0891b2', renderStyle: 'architectural', roughness: 0 },
    { type: 'apiGateway', containerText: 'API GW', bg: '#c4b5fd', strokeColor: '#7c3aed', renderStyle: 'architectural', roughness: 0 },
    { type: 'cdn', containerText: 'CDN', bg: '#99f6e4', strokeColor: '#0d9488', renderStyle: 'architectural', roughness: 0 },
    { type: 'storageBlob', containerText: 'Blob', bg: '#e2e8f0', strokeColor: '#475569', renderStyle: 'architectural', roughness: 0 },
    { type: 'eventBus', containerText: 'Events', bg: '#fecdd3', strokeColor: '#e11d48', renderStyle: 'architectural', roughness: 0, width: 140 },
    { type: 'microservice', containerText: 'µSvc', bg: '#bae6fd', strokeColor: '#0284c7', renderStyle: 'architectural', roughness: 0 },
    { type: 'shield', containerText: 'Security', bg: '#d1fae5', strokeColor: '#059669', renderStyle: 'architectural', roughness: 0, width: 100, height: 110 },
], 1050, 2850);

// ── 6. DATA & METRICS BRANCH ────────────────────────────────────

addLeaves('data', '#7c3aed', [
    { type: 'barChart', containerText: 'Revenue', bg: '#ede9fe', renderStyle: 'architectural', roughness: 0, width: 140, height: 110 },
    { type: 'pieChart', containerText: 'Share', bg: '#ddd6fe', renderStyle: 'architectural', roughness: 0, width: 110, height: 110 },
    { type: 'funnel', containerText: 'Pipeline', bg: '#c4b5fd', renderStyle: 'architectural', roughness: 0, width: 120, height: 120 },
    { type: 'gauge', containerText: '95%', bg: '#a78bfa', renderStyle: 'architectural', roughness: 0, width: 110, height: 110 },
    { type: 'trendUp', containerText: 'Growth', bg: '#d1fae5', strokeColor: '#16a34a', renderStyle: 'architectural', roughness: 0 },
    { type: 'trendDown', containerText: 'Churn', bg: '#fee2e2', strokeColor: '#dc2626', renderStyle: 'architectural', roughness: 0 },
    { type: 'table', containerText: 'Data', bg: '#f1f5f9', strokeColor: '#475569', renderStyle: 'architectural', roughness: 0, width: 150, height: 110 },
], 600, 3700);

// Connection/relationship shapes under data
addLeaves('data', '#7c3aed', [
    { type: 'puzzlePiece', containerText: 'Fit', bg: '#ede9fe', width: 100, height: 100 },
    { type: 'chainLink', containerText: 'Link', bg: '#ddd6fe', width: 110, height: 80 },
    { type: 'bridge', containerText: 'Bridge', bg: '#c4b5fd', width: 140, height: 90 },
    { type: 'magnet', containerText: 'Attract', bg: '#a78bfa', width: 90, height: 100 },
    { type: 'scale', containerText: 'Balance', bg: '#8b5cf6', width: 110, height: 100 },
    { type: 'seedling', containerText: 'Grow', bg: '#d1fae5', strokeColor: '#16a34a', width: 80, height: 100 },
    { type: 'tree', containerText: 'Mature', bg: '#bbf7d0', strokeColor: '#059669', width: 100, height: 120 },
    { type: 'mountain', containerText: 'Summit', bg: '#e2e8f0', strokeColor: '#475569', width: 120, height: 100 },
], 1050, 3650);

// ── 7. FILL STYLES BRANCH ───────────────────────────────────────

const fillIds = addLeaves('fills', '#db2777', [
    { type: 'rectangle', containerText: 'Solid', bg: '#ec4899', fillStyle: 'solid' },
    { type: 'rectangle', containerText: 'Hachure', bg: '#f472b6', fillStyle: 'hachure' },
    { type: 'rectangle', containerText: 'Cross-Hatch', bg: '#f9a8d4', fillStyle: 'cross-hatch' },
    { type: 'rectangle', containerText: 'Dots', bg: '#db2777', fillStyle: 'dots', fillDensity: 2 },
    {
        type: 'rectangle', containerText: 'Linear Grad', bg: '#ec4899',
        fillStyle: 'linear', renderStyle: 'architectural', roughness: 0,
        extra: {
            gradientType: 'linear', gradientDirection: 135,
            gradientStops: [
                { offset: 0, color: '#ec4899' },
                { offset: 0.5, color: '#8b5cf6' },
                { offset: 1, color: '#3b82f6' },
            ],
        },
    },
    {
        type: 'circle', containerText: 'Radial Grad', bg: '#3b82f6',
        fillStyle: 'radial', renderStyle: 'architectural', roughness: 0, width: 110, height: 110,
        extra: {
            gradientType: 'radial',
            gradientStops: [
                { offset: 0, color: '#bfdbfe' },
                { offset: 0.7, color: '#3b82f6' },
                { offset: 1, color: '#1e3a8a' },
            ],
            textColor: '#ffffff',
        },
    },
    {
        type: 'rectangle', containerText: 'Conic Grad', bg: '#8b5cf6',
        fillStyle: 'conic', renderStyle: 'architectural', roughness: 0,
        extra: {
            gradientType: 'conic', gradientDirection: 0,
            gradientStops: [
                { offset: 0, color: '#ef4444' },
                { offset: 0.33, color: '#22c55e' },
                { offset: 0.66, color: '#3b82f6' },
                { offset: 1, color: '#ef4444' },
            ],
            textColor: '#ffffff',
        },
    },
], 600, 4500);

// Roughness showcase
addLeaves('fills', '#db2777', [
    { type: 'rectangle', containerText: 'Rough: 0', bg: '#fce7f3', roughness: 0, renderStyle: 'architectural' },
    { type: 'rectangle', containerText: 'Rough: 0.5', bg: '#fbcfe8', roughness: 0.5 },
    { type: 'rectangle', containerText: 'Rough: 1', bg: '#f9a8d4', roughness: 1 },
    { type: 'rectangle', containerText: 'Rough: 2', bg: '#f472b6', roughness: 2 },
    { type: 'rectangle', containerText: 'Rough: 3', bg: '#ec4899', roughness: 3 },
    { type: 'rectangle', containerText: 'Dashed', bg: '#fce7f3', strokeStyle: 'dashed' },
    { type: 'rectangle', containerText: 'Dotted', bg: '#fbcfe8', strokeStyle: 'dotted' },
], 1100, 4500);

// ── 8. ANIMATIONS BRANCH ────────────────────────────────────────

// Orbit demo
const orbitCenterId = id('orbit-center');
elements.push(makeShape({
    id: orbitCenterId,
    type: 'circle',
    x: 5500, y: 600, width: 80, height: 80,
    strokeColor: '#0d9488',
    backgroundColor: '#0d9488',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 13,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Hub',
    textColor: '#ffffff',
    shadowEnabled: true,
    shadowBlur: 20,
    shadowColor: 'rgba(13,148,136,0.5)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
}));

const orbitColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
const orbitLabels = ['Spin', 'Orbit', 'Flow', 'Bounce', 'Fade'];
orbitColors.forEach((c, i) => {
    elements.push(makeShape({
        id: id('orbit-sat'),
        type: 'circle',
        x: 5520, y: 620, width: 50, height: 50,
        strokeColor: c,
        backgroundColor: c + '40',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 10,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: orbitLabels[i],
        orbitEnabled: true,
        orbitCenterId: orbitCenterId,
        orbitRadius: 90 + i * 30,
        orbitSpeed: 1.5 + i * 0.3,
        orbitDirection: i % 2 === 0 ? 1 : -1,
        ...(i === 0 ? { spinEnabled: true, spinSpeed: 1 } : {}),
    }));
});

// Spinning gears
const gearIds = [];
for (let i = 0; i < 3; i++) {
    const gId = id('spin-gear');
    gearIds.push(gId);
    elements.push(makeShape({
        id: gId,
        type: 'gear',
        x: 5300 + i * 140, y: 950, width: 80, height: 80,
        strokeColor: '#475569',
        backgroundColor: '#e2e8f0',
        fillStyle: i === 0 ? 'solid' : i === 1 ? 'hachure' : 'cross-hatch',
        strokeWidth: 2,
        roughness: 1,
        fontSize: 11,
        fontFamily: 'hand-drawn',
        textAlign: 'center',
        containerText: `Gear ${i + 1}`,
        spinEnabled: true,
        spinSpeed: i % 2 === 0 ? 0.5 : -0.5,
    }));
}

// Flow animation arrows chain
let prevFlowId = null;
const flowNodeColors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];
for (let i = 0; i < 5; i++) {
    const nodeId = id('flow-node');
    elements.push(makeShape({
        id: nodeId,
        type: i === 0 ? 'circle' : i === 4 ? 'diamond' : 'rectangle',
        x: 5150 + i * 200, y: 1200,
        width: 100, height: 70,
        strokeColor: flowNodeColors[i],
        backgroundColor: flowNodeColors[i] + '30',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 12,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: `Step ${i + 1}`,
    }));
    if (prevFlowId) {
        elements.push(makeArrow({
            fromId: prevFlowId,
            toId: nodeId,
            color: flowNodeColors[i],
            flow: true,
            flowSpeed: 1.5 + i * 0.2,
            fromPos: 'right',
            toPos: 'left',
            curveType: 'straight',
        }));
    }
    prevFlowId = nodeId;
}

// Arrow from animations branch to orbit center
elements.push(makeArrow({
    fromId: branchIds['animations'],
    toId: orbitCenterId,
    color: '#0d9488',
    flow: true,
    flowSpeed: 1.5,
    dashed: true,
}));

// ── 3D SHAPES SECTION ───────────────────────────────────────────

const shapes3dParentId = id('section-3d');
elements.push(makeShape({
    id: shapes3dParentId,
    type: 'rectangle',
    x: -200, y: 1800, width: 220, height: 70,
    strokeColor: '#475569',
    backgroundColor: '#e2e8f0',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: '3D & Perspective',
    shadowEnabled: true,
    shadowBlur: 12,
    shadowColor: 'rgba(71,85,105,0.3)',
    shadowOffsetX: 0,
    shadowOffsetY: 4,
}));

const shapes3d = [
    { type: 'isometricCube', containerText: 'Iso Cube', bg: '#bfdbfe', width: 110, height: 110 },
    { type: 'solidBlock', containerText: 'Block', bg: '#c7d2fe', width: 110, height: 90 },
    { type: 'cylinder', containerText: 'Cylinder', bg: '#ddd6fe', width: 90, height: 110 },
    { type: 'perspectiveBlock', containerText: 'Perspective', bg: '#e2e8f0', width: 120, height: 90 },
];

shapes3d.forEach((s, i) => {
    const sId = id('shape3d');
    elements.push(makeShape({
        id: sId,
        type: s.type,
        x: -300 + i * 220, y: 2020,
        width: s.width, height: s.height,
        strokeColor: '#475569',
        backgroundColor: s.bg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 12,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: s.containerText,
    }));
    elements.push(makeArrow({
        fromId: shapes3dParentId,
        toId: sId,
        color: '#475569',
        dashed: true,
    }));
});

// ── WIREFRAME SECTION ────────────────────────────────────────────

const wireframeParentId = id('section-wireframe');
elements.push(makeShape({
    id: wireframeParentId,
    type: 'rectangle',
    x: 1100, y: 1800, width: 220, height: 70,
    strokeColor: '#6366f1',
    backgroundColor: '#e0e7ff',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Wireframes',
}));

const wireframes = [
    { type: 'browserWindow', containerText: 'Browser', bg: '#f1f5f9', width: 180, height: 140 },
    { type: 'mobilePhone', containerText: 'Mobile', bg: '#f8fafc', width: 90, height: 160 },
    { type: 'inputField', containerText: 'Input', bg: '#ffffff', width: 160, height: 60 },
    { type: 'ghostButton', containerText: 'Button', bg: '#e0e7ff', width: 140, height: 55 },
];

wireframes.forEach((w, i) => {
    const wId = id('wireframe');
    elements.push(makeShape({
        id: wId,
        type: w.type,
        x: 950 + i * 260, y: 2020,
        width: w.width, height: w.height,
        strokeColor: '#6366f1',
        backgroundColor: w.bg,
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 13,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: w.containerText,
    }));
    elements.push(makeArrow({
        fromId: wireframeParentId,
        toId: wId,
        color: '#6366f1',
        dashed: true,
    }));
});

// ── TEXT FEATURES SECTION ────────────────────────────────────────

const textParentId = id('section-text');
elements.push(makeShape({
    id: textParentId,
    type: 'rectangle',
    x: 2500, y: 1800, width: 220, height: 70,
    strokeColor: '#0f766e',
    backgroundColor: '#ccfbf1',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Text Features',
}));

const textSamples = [
    { containerText: 'Hand-drawn', fontFamily: 'hand-drawn', fontSize: 16, bg: '#f0fdfa' },
    { containerText: 'Sans-serif', fontFamily: 'sans-serif', fontSize: 16, bg: '#f0fdfa' },
    { containerText: 'Monospace', fontFamily: 'monospace', fontSize: 14, bg: '#f0fdfa' },
    { containerText: 'Bold Text', fontFamily: 'sans-serif', fontSize: 16, bg: '#f0fdfa', extra: { fontWeight: 'bold' } },
    { containerText: 'Italic Text', fontFamily: 'sans-serif', fontSize: 16, bg: '#f0fdfa', extra: { fontStyle: 'italic' } },
    { containerText: 'Left Aligned', fontFamily: 'sans-serif', fontSize: 14, bg: '#f0fdfa', extra: { textAlign: 'left' } },
    {
        containerText: 'Highlighted!', fontFamily: 'hand-drawn', fontSize: 16, bg: '#f0fdfa',
        extra: {
            textHighlightEnabled: true,
            textHighlightColor: 'rgba(251, 191, 36, 0.5)',
            textHighlightPadding: 6,
            textHighlightRadius: 3,
        },
    },
];

textSamples.forEach((t, i) => {
    const tId = id('text-sample');
    elements.push(makeShape({
        id: tId,
        type: 'rectangle',
        x: 2400 + (i % 4) * 200, y: 2020 + Math.floor(i / 4) * 180,
        width: 140, height: 80,
        strokeColor: '#0f766e',
        backgroundColor: t.bg,
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        textAlign: 'center',
        containerText: t.containerText,
        ...(t.extra || {}),
    }));
    elements.push(makeArrow({
        fromId: textParentId,
        toId: tId,
        color: '#0f766e',
        dashed: true,
    }));
});

// ── EFFECTS DEMO SECTION (layer: effects) ────────────────────────

// Shadow demo
const shadowParentId = id('section-shadow');
elements.push(makeShape({
    id: shadowParentId,
    type: 'rectangle',
    x: -200, y: 2600, width: 220, height: 70,
    strokeColor: '#1e293b',
    backgroundColor: '#f1f5f9',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Shadows & Effects',
    layerId: 'effects',
}));

const shadowDemos = [
    { shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.3)', label: 'Subtle' },
    { shadowBlur: 15, shadowColor: 'rgba(0,0,0,0.4)', label: 'Medium' },
    { shadowBlur: 30, shadowColor: 'rgba(0,0,0,0.5)', label: 'Heavy' },
    { shadowBlur: 20, shadowColor: 'rgba(59,130,246,0.6)', label: 'Blue Glow' },
    { shadowBlur: 20, shadowColor: 'rgba(239,68,68,0.6)', label: 'Red Glow' },
    { shadowBlur: 20, shadowColor: 'rgba(34,197,94,0.6)', label: 'Green Glow' },
];

shadowDemos.forEach((s, i) => {
    const sId = id('shadow-demo');
    elements.push(makeShape({
        id: sId,
        type: 'rectangle',
        x: -300 + i * 220, y: 2830,
        width: 130, height: 80,
        strokeColor: '#1e293b',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 12,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: s.label,
        shadowEnabled: true,
        shadowBlur: s.shadowBlur,
        shadowColor: s.shadowColor,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        layerId: 'effects',
    }));
    elements.push(makeArrow({
        fromId: shadowParentId,
        toId: sId,
        color: '#1e293b',
        dashed: true,
    }));
});

// Blend mode demos
const blendParentId = id('section-blend');
elements.push(makeShape({
    id: blendParentId,
    type: 'rectangle',
    x: 1500, y: 2600, width: 220, height: 70,
    strokeColor: '#1e293b',
    backgroundColor: '#f1f5f9',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Blend Modes',
    layerId: 'effects',
}));

// Overlapping circles for blend modes
const blendSets = [
    { mode: 'screen', colors: ['#ef4444', '#22c55e', '#3b82f6'], label: 'Screen' },
    { mode: 'multiply', colors: ['#fbbf24', '#ec4899', '#06b6d4'], label: 'Multiply' },
    { mode: 'overlay', colors: ['#8b5cf6', '#f97316', '#14b8a6'], label: 'Overlay' },
];

blendSets.forEach((set, si) => {
    const baseX = 1400 + si * 350;
    set.colors.forEach((c, ci) => {
        elements.push(makeShape({
            id: id('blend'),
            type: 'circle',
            x: baseX + (ci % 2) * 50, y: 2830 + Math.floor(ci / 2) * 40 + (ci === 1 ? 0 : 25),
            width: 90, height: 90,
            strokeColor: 'transparent',
            backgroundColor: c,
            fillStyle: 'solid',
            strokeWidth: 0,
            roughness: 0,
            renderStyle: 'architectural',
            opacity: 75,
            blendMode: set.mode,
            layerId: 'effects',
        }));
    });
    // label
    elements.push(makeShape({
        id: id('blend-label'),
        type: 'text',
        x: baseX + 20, y: 2980,
        width: 110, height: 25,
        strokeColor: '#64748b',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        renderStyle: 'architectural',
        text: set.label,
        fontSize: 14,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        layerId: 'effects',
    }));
});

// Opacity demo
const opacityLevels = [100, 80, 60, 40, 20];
opacityLevels.forEach((op, i) => {
    elements.push(makeShape({
        id: id('opacity'),
        type: 'rectangle',
        x: 3000 + i * 160, y: 2830,
        width: 100, height: 100,
        strokeColor: '#6366f1',
        backgroundColor: '#6366f1',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        opacity: op,
        fontSize: 13,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: `${op}%`,
        textColor: '#ffffff',
        layerId: 'effects',
    }));
});

const opacityLabelId = id('opacity-label');
elements.push(makeShape({
    id: opacityLabelId,
    type: 'text',
    x: 3000, y: 2980,
    width: 700, height: 30,
    strokeColor: '#64748b',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 0,
    renderStyle: 'architectural',
    text: 'Opacity: 100% → 20%',
    fontSize: 15,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    layerId: 'effects',
}));

// ── LARGE GRADIENT BAR (decorative) ──────────────────────────────

elements.push(makeShape({
    id: id('gradient-bar'),
    type: 'rectangle',
    x: -500, y: 3200, width: 6500, height: 50,
    strokeColor: 'transparent',
    backgroundColor: '#3b82f6',
    fillStyle: 'linear',
    gradientType: 'linear',
    gradientDirection: 90,
    gradientStops: [
        { offset: 0, color: '#ef4444' },
        { offset: 0.2, color: '#f59e0b' },
        { offset: 0.4, color: '#22c55e' },
        { offset: 0.6, color: '#3b82f6' },
        { offset: 0.8, color: '#8b5cf6' },
        { offset: 1, color: '#ec4899' },
    ],
    strokeWidth: 0,
    roughness: 0,
    renderStyle: 'architectural',
    opacity: 60,
    fontSize: 15,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Yappy — Infinite Canvas · Sketch & Architectural Modes · 150+ Shape Types · Animations · Effects · Layers',
    textColor: '#ffffff',
}));

// ── SPECIAL SHAPES SECTION ───────────────────────────────────────

const specialParentId = id('section-special');
elements.push(makeShape({
    id: specialParentId,
    type: 'rectangle',
    x: 3800, y: 1800, width: 220, height: 70,
    strokeColor: '#a21caf',
    backgroundColor: '#f5d0fe',
    strokeWidth: 2,
    roughness: 0,
    renderStyle: 'architectural',
    fontSize: 18,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    containerText: 'Special Shapes',
}));

const specialShapes = [
    { type: 'arrowLeft', containerText: 'Left', bg: '#fae8ff', width: 100, height: 60 },
    { type: 'arrowRight', containerText: 'Right', bg: '#f5d0fe', width: 100, height: 60 },
    { type: 'arrowUp', containerText: 'Up', bg: '#e9d5ff', width: 60, height: 100 },
    { type: 'arrowDown', containerText: 'Down', bg: '#d8b4fe', width: 60, height: 100 },
    { type: 'bracketLeft', containerText: '', bg: 'transparent', width: 40, height: 110 },
    { type: 'bracketRight', containerText: '', bg: 'transparent', width: 40, height: 110 },
    { type: 'stateStart', containerText: '', bg: '#1e293b', width: 50, height: 50, strokeColor: '#1e293b' },
    { type: 'stateEnd', containerText: '', bg: '#1e293b', width: 50, height: 50, strokeColor: '#1e293b' },
];

specialShapes.forEach((s, i) => {
    const sId = id('special');
    elements.push(makeShape({
        id: sId,
        type: s.type,
        x: 3700 + (i % 4) * 200, y: 2020 + Math.floor(i / 4) * 200,
        width: s.width, height: s.height,
        strokeColor: s.strokeColor || '#a21caf',
        backgroundColor: s.bg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 12,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: s.containerText,
    }));
    elements.push(makeArrow({
        fromId: specialParentId,
        toId: sId,
        color: '#a21caf',
        dashed: true,
    }));
});

// ── STICKY NOTES ─────────────────────────────────────────────────

const stickyColors = ['#fef08a', '#a5f3fc', '#fecaca', '#bbf7d0', '#c4b5fd', '#fde68a'];
const stickyTexts = [
    'Remember:\nTest with 200+\nelements!',
    'Perf tip:\nAvoid deep\nclones',
    'SolidJS\nFine-grained\nReactivity',
    'Canvas 2D\n+ RoughJS\n= Sketch Mode',
    'Export:\nPNG, SVG\nClipboard',
    'Layers:\nBackground\nForeground\nEffects',
];
stickyColors.forEach((c, i) => {
    elements.push(makeShape({
        id: id('sticky'),
        type: 'stickyNote',
        x: -300 + (i % 3) * 280, y: 3400 + Math.floor(i / 3) * 250,
        width: 180, height: 150,
        strokeColor: '#00000020',
        backgroundColor: c,
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 14,
        fontFamily: 'hand-drawn',
        textAlign: 'left',
        containerText: stickyTexts[i],
        angle: -0.05 + Math.random() * 0.1,
        shadowEnabled: true,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffsetX: 2,
        shadowOffsetY: 3,
    }));
});

// ── FREEHAND LABELS ──────────────────────────────────────────────

const freehandLabels = [
    { text: 'Yappy supports sketch and architectural render styles', x: 1200, y: 3420 },
    { text: 'Infinite canvas with zoom, pan, and viewport culling', x: 1200, y: 3490 },
    { text: 'Connectors with flow animations (marching ants & dots)', x: 1200, y: 3560 },
    { text: 'Drop shadows, blend modes, gradients, and opacity', x: 1200, y: 3630 },
    { text: '60fps render loop with cached metrics and patterns', x: 1200, y: 3700 },
    { text: 'Multi-layer support with independent visibility & opacity', x: 1200, y: 3770 },
];
freehandLabels.forEach((l) => {
    elements.push(makeShape({
        id: id('label'),
        type: 'text',
        x: l.x, y: l.y,
        width: 700, height: 35,
        strokeColor: '#334155',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        renderStyle: 'architectural',
        text: l.text,
        fontSize: 17,
        fontFamily: 'hand-drawn',
        textAlign: 'left',
    }));
});

// ── INTERCONNECTION ARROWS ───────────────────────────────────────
// Cross-branch connections to show relationships

const crossLinks = [
    // Shapes → Fill Styles (shapes use fills)
    { from: branchIds['shapes'], to: branchIds['fills'], color: '#dc2626', fromPos: 'right', toPos: 'left' },
    // Fill Styles → Animations (animated fills)
    { from: branchIds['fills'], to: branchIds['animations'], color: '#db2777', fromPos: 'right', toPos: 'left' },
    // Infra → Data (infra metrics)
    { from: branchIds['infra'], to: branchIds['data'], color: '#0891b2', fromPos: 'right', toPos: 'left' },
    // People → Flowchart (actors in UML)
    { from: branchIds['people'], to: branchIds['flowchart'], color: '#16a34a', fromPos: 'left', toPos: 'right' },
    // Sketchnote → Shapes (sketchnotes are shapes)
    { from: branchIds['sketchnote'], to: branchIds['shapes'], color: '#ea580c', fromPos: 'left', toPos: 'right' },
    // Flowchart → Infra (system design)
    { from: branchIds['flowchart'], to: branchIds['infra'], color: '#ca8a04', fromPos: 'right', toPos: 'left' },
    // Animations → Sketchnote (animated sketchnotes)
    { from: branchIds['animations'], to: branchIds['sketchnote'], color: '#0d9488', fromPos: 'left', toPos: 'right' },
    // Data → People (user metrics)
    { from: branchIds['data'], to: branchIds['people'], color: '#7c3aed', fromPos: 'left', toPos: 'right' },
];
crossLinks.forEach(cl => {
    elements.push(makeArrow({
        fromId: cl.from,
        toId: cl.to,
        color: cl.color,
        flow: false,
        dashed: true,
        fromPos: cl.fromPos || 'right',
        toPos: cl.toPos || 'left',
        strokeWidth: 1,
    }));
});

// Cross-connections between section headers
const sectionCrossLinks = [
    // 3D ↔ Wireframes
    { from: shapes3dParentId, to: wireframeParentId, color: '#475569' },
    // Wireframes ↔ Text Features
    { from: wireframeParentId, to: textParentId, color: '#6366f1' },
    // Shadows ↔ Blend Modes
    { from: shadowParentId, to: blendParentId, color: '#1e293b' },
    // Special Shapes ↔ Animations orbit
    { from: specialParentId, to: orbitCenterId, color: '#a21caf' },
];
sectionCrossLinks.forEach(cl => {
    elements.push(makeArrow({
        fromId: cl.from,
        toId: cl.to,
        color: cl.color,
        flow: false,
        dashed: true,
        fromPos: 'right',
        toPos: 'left',
        strokeWidth: 1,
    }));
});

// Leaf-to-leaf connections showing property relationships
// e.g. Rectangle (basic shape) → Solid fill, Circle → Radial gradient, etc.
const leafCrossLinks = [
    // Rectangle shape → Solid fill (rectangles often use solid fill)
    { from: basicShapeIds[0], to: fillIds[0], color: '#94a3b8', label: 'uses' },
    // Circle shape → Radial gradient fill
    { from: basicShapeIds[1], to: fillIds[5], color: '#94a3b8', label: 'uses' },
    // Star shape → Dots fill
    { from: basicShapeIds[5], to: fillIds[3], color: '#94a3b8', label: 'uses' },
    // Trophy (sketchnote) → Spinning gear (animations share spin)
    { from: sketchnoteIds[0], to: gearIds[0], color: '#ea580c', label: 'spin' },
    // Server (infra) → Kubernetes
    { from: infraIds[0], to: infraIds2[0], color: '#0891b2', label: 'deploys' },
    // Load Balancer → API Gateway
    { from: infraIds[1], to: infraIds2[2], color: '#0891b2', label: 'routes' },
    // Firewall → Shield
    { from: infraIds[2], to: infraIds2[7], color: '#ea580c', label: 'secures' },
];
leafCrossLinks.forEach(cl => {
    elements.push(makeArrow({
        fromId: cl.from,
        toId: cl.to,
        color: cl.color,
        flow: false,
        dashed: true,
        fromPos: 'right',
        toPos: 'left',
        strokeWidth: 1,
        curveType: 'bezier',
    }));
});

// ── DFD Shapes ───────────────────────────────────────────────────

const dfdShapes = [
    { type: 'dfdProcess', containerText: 'Process', bg: '#bfdbfe' },
    { type: 'dfdDataStore', containerText: 'Store', bg: '#a5f3fc' },
    { type: 'externalEntity', containerText: 'External', bg: '#e2e8f0' },
];
dfdShapes.forEach((s, i) => {
    elements.push(makeShape({
        id: id('dfd'),
        type: s.type,
        x: 5000 + i * 220, y: 1800,
        width: 140, height: 90,
        strokeColor: '#0369a1',
        backgroundColor: s.bg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 13,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: s.containerText,
    }));
});

// ── Signal Shapes ────────────────────────────────────────────────

const signalShapes = [
    { type: 'umlSignalSend', containerText: 'Send', bg: '#d1fae5' },
    { type: 'umlSignalReceive', containerText: 'Receive', bg: '#a7f3d0' },
    { type: 'activationBar', containerText: '', bg: '#f1f5f9', width: 40, height: 110 },
    { type: 'umlLifeline', containerText: 'Object', bg: '#f8fafc', width: 120, height: 130 },
];
signalShapes.forEach((s, i) => {
    elements.push(makeShape({
        id: id('signal'),
        type: s.type,
        x: 5000 + i * 200, y: 2050,
        width: s.width || 120, height: s.height || 80,
        strokeColor: '#059669',
        backgroundColor: s.bg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        renderStyle: 'architectural',
        fontSize: 12,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        containerText: s.containerText,
    }));
});

// ── Build the document ───────────────────────────────────────────

const doc = {
    version: 4,
    metadata: {
        name: 'Yappy Feature Showcase',
        updatedAt: new Date().toISOString(),
        docType: 'infinite',
    },
    globalSettings: {
        animationEnabled: true,
    },
    canvasBackgroundColor: '#f8fafc',
    layers,
    slides: [
        {
            id: 'slide-1',
            name: 'Canvas',
            spatialPosition: { x: 0, y: 0 },
            dimensions: { width: 6500, height: 4500 },
            backgroundColor: '#ffffff',
            order: 0,
            transition: {
                type: 'none',
                duration: 500,
                easing: 'easeInOutQuad',
            },
        },
    ],
    elements,
};

const outPath = path.join(__dirname, '..', 'data', 'large-sketch.json');
const json = JSON.stringify(doc, null, 2);
fs.writeFileSync(outPath, json);
console.log(`Generated ${elements.length} elements → data/large-sketch.json (${(json.length / 1024).toFixed(1)} KB)`);
