
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/dev-arch.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

// Remove existing paper plane if present
data.elements = data.elements.filter((el: any) => el.id !== 'anim-paper-plane');

// Define Paper Plane Element (Classic Dart Shape)
const paperPlane = {
    id: 'anim-paper-plane',
    type: 'polygon',
    layerId: 'layer-1',
    x: -50, // Start just at element edge so it overlaps canvas by ~50px. Prevents culling.
    y: 0, // Initial Y doesn't matter much as path overrides it, but good to be safe
    width: 160,
    height: 80,
    // Classic Dart Paper Plane Shape
    points: [
        { x: 0, y: 20 },      // Tail Left
        { x: 160, y: 0 },     // Nose (Top Right relative to box)
        { x: 40, y: 80 },     // Wing Tip Bottom
        { x: 40, y: 40 },     // Body Center fold
    ],
    pointsEncoding: 'flat',
    strokeColor: '#333333',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    angle: 0,
    renderStyle: 'sketch',
    seed: 4242,
    locked: true,

    // NEW: True Path Animation using the system we just built
    animations: [
        {
            id: 'plane-fly-path',
            type: 'path',
            // Bezier path: Start(-50,600) -> Control(960, -200) -> End(2200, 400)
            // A looping swoop: Up then down
            pathData: 'M -50 600 Q 960 -200 2200 400',
            orientToPath: true, // This should make the plane nose follow the curve!
            trigger: 'on-load',
            duration: 3500,
            delay: 1000,
            easing: 'easeInOutQuad'
        }
    ]
};

// Add to elements list
data.elements.push(paperPlane);

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

console.log('Added paper plane with REAL path animation.');
