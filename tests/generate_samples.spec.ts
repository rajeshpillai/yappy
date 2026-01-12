import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Generate Sample Diagrams', () => {
    test('generate json files', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForFunction(() => window.Yappy !== undefined);

        const outDir = path.resolve(process.cwd(), 'data');

        // Helper to save current state
        const saveState = async (filename: string) => {
            const data = await page.evaluate(() => ({
                elements: window.Yappy.state.elements,
                viewState: window.Yappy.state.viewState,
                layers: window.Yappy.state.layers,
                gridSettings: window.Yappy.state.gridSettings,
                canvasBackgroundColor: window.Yappy.state.canvasBackgroundColor,
                version: 1
            }));
            fs.writeFileSync(path.join(outDir, filename), JSON.stringify(data, null, 2));
            console.log(`Saved ${filename}`);
        };

        // 1. Flowchart: Deployment Pipeline
        await page.evaluate(() => {
            window.Yappy.clear();
            const startX = 100, startY = 100;

            // Nodes
            const n1 = window.Yappy.createRectangle(startX, startY, 140, 60, { backgroundColor: '#e1f5fe', fillStyle: 'solid' });
            window.Yappy.createText(startX + 30, startY + 20, "Push Code");

            const n2 = window.Yappy.createRectangle(startX + 200, startY, 140, 60, { backgroundColor: '#fff9c4', fillStyle: 'solid' });
            window.Yappy.createText(startX + 230, startY + 20, "Build");

            const n3 = window.Yappy.createRectangle(startX + 400, startY, 140, 60, { backgroundColor: '#e8f5e9', fillStyle: 'solid' });
            window.Yappy.createText(startX + 430, startY + 20, "Test");

            const n4 = window.Yappy.createRectangle(startX + 400, startY + 150, 140, 60, { backgroundColor: '#ffebee', fillStyle: 'solid' });
            window.Yappy.createText(startX + 430, startY + 170, "Deploy");

            // Connections
            window.Yappy.connect(n1, n2);
            window.Yappy.connect(n2, n3);
            window.Yappy.connect(n3, n4, { curveType: 'elbow' }); // Elbow for vertical drop
        });
        await saveState('flow-chart.json');

        // 2. Activity Diagram: Feature Implementation
        await page.evaluate(() => {
            window.Yappy.clear();
            const cx = 400;
            let cy = 50;

            // Start
            const start = window.Yappy.createCircle(cx, cy, 30, 30, { backgroundColor: '#000', fillStyle: 'solid' });
            cy += 80;

            // Action
            const a1 = window.Yappy.createRectangle(cx - 70, cy, 140, 50, { roundness: { type: 10 } }); // Rounded rect
            window.Yappy.createText(cx - 40, cy + 15, "Write Code");
            cy += 100;

            // Decision
            const d1 = window.Yappy.createElement('rectangle', cx - 50, cy, 100, 100, { angle: Math.PI / 4, backgroundColor: '#fff' });
            // Keep text unrotated? Hard with current API, let's just place text over
            const dText = window.Yappy.createText(cx - 20, cy + 40, "Pass?");
            cy += 150;

            // End
            const end = window.Yappy.createCircle(cx, cy, 30, 30, { strokeWidth: 4 });

            // Connections
            window.Yappy.connect(start, a1, { type: 'arrow' });
            window.Yappy.connect(a1, d1, { type: 'arrow' });
            window.Yappy.connect(d1, end, { type: 'arrow' }); // Ideally labeled "Yes"
        });
        await saveState('activity-diagram.json');

        // 3. Sequence Diagram: Save Flow
        await page.evaluate(() => {
            window.Yappy.clear();
            const sx = 100;
            const yStart = 50;
            const height = 400;
            const gap = 200;

            // Lifelines
            const l1 = window.Yappy.createRectangle(sx, yStart, 100, 40, { backgroundColor: '#f0f0f0', fillStyle: 'solid' });
            window.Yappy.createText(sx + 30, yStart + 10, "User");
            window.Yappy.createLine(sx + 50, yStart + 40, sx + 50, yStart + height, { strokeStyle: 'dashed' });

            const l2 = window.Yappy.createRectangle(sx + gap, yStart, 100, 40, { backgroundColor: '#f0f0f0', fillStyle: 'solid' });
            window.Yappy.createText(sx + gap + 30, yStart + 10, "App");
            window.Yappy.createLine(sx + gap + 50, yStart + 40, sx + gap + 50, yStart + height, { strokeStyle: 'dashed' });

            const l3 = window.Yappy.createRectangle(sx + gap * 2, yStart, 100, 40, { backgroundColor: '#f0f0f0', fillStyle: 'solid' });
            window.Yappy.createText(sx + gap * 2 + 25, yStart + 10, "Storage");
            window.Yappy.createLine(sx + gap * 2 + 50, yStart + 40, sx + gap * 2 + 50, yStart + height, { strokeStyle: 'dashed' });

            // Messages
            let msgY = yStart + 100;
            window.Yappy.createArrow(sx + 50, msgY, sx + gap + 50, msgY);
            window.Yappy.createText(sx + 80, msgY - 20, "Click Save");

            msgY += 50;
            window.Yappy.createArrow(sx + gap + 50, msgY, sx + gap * 2 + 50, msgY);
            window.Yappy.createText(sx + gap + 80, msgY - 20, "Write JSON");

            msgY += 50;
            window.Yappy.createArrow(sx + gap * 2 + 50, msgY, sx + gap + 50, msgY, { strokeStyle: 'dashed' });
            window.Yappy.createText(sx + gap + 80, msgY - 20, "Ack");

            msgY += 50;
            window.Yappy.createArrow(sx + gap + 50, msgY, sx + 50, msgY, { strokeStyle: 'dashed' });
            window.Yappy.createText(sx + 80, msgY - 20, "Success UI");
        });
        await saveState('sequence-diagram.json');
    });
});
