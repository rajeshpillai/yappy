
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/dev-arch.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

// Remove existing paper plane if present
data.elements = data.elements.filter((el: any) => el.id !== 'anim-paper-plane');

// Define Paper Plane Element
const paperPlane = {
    id: 'anim-paper-plane',
    type: 'polygon',
    layerId: 'layer-1',
    x: 400, // START AT CENTER-ISH (400, 400)
    y: 400,
    width: 80,
    height: 40,
    points: [ // Smaller text plane
        { x: 0, y: 10 },
        { x: 80, y: 0 },
        { x: 20, y: 40 },
        { x: 20, y: 20 },
    ],
    pointsEncoding: 'flat',
    strokeColor: '#333333',
    backgroundColor: '#ffffff',
    fillStyle: 'solid',
    opacity: 100,
    angle: 0,
    seed: 12345,

    // NEW: Relative Path Animation
    animations: [
        {
            id: 'relative-fly',
            type: 'path',
            // Start at 0,0 (relative to element) -> Fly to 300, -200 (Up and Right)
            pathData: 'M 0 0 Q 150 -300 300 -200',
            orientToPath: true,
            isRelative: true, // THIS IS THE KEY
            trigger: 'on-load',
            duration: 3000,
            delay: 500,
            easing: 'easeInOutQuad'
        }
    ]
};

// Add to elements list
data.elements.push(paperPlane);

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

console.log('Added paper plane with RELATIVE path animation.');
