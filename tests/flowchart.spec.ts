import { test, expect } from '@playwright/test';

test.describe('Flowchart API', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForFunction(() => window.Yappy !== undefined);
        await page.evaluate(() => window.Yappy.clear()); // Start fresh
    });

    test('should create a connected flowchart', async ({ page }) => {
        // Build the flowchart via API
        const diagram = await page.evaluate(() => {
            const startX = 100;
            const startY = 300;
            const gap = 200;

            const style = {
                strokeColor: '#000',
                backgroundColor: '#fff',
                fillStyle: 'solid' as const,
                fontSize: 16,
                textAlign: 'center' as const
            };

            // 1. Concept
            const node1 = window.Yappy.createRectangle(startX, startY, 150, 80, { ...style, backgroundColor: '#ffe6cc' });
            window.Yappy.createText(startX + 40, startY + 30, "Concept");

            // 2. Planning
            const node2 = window.Yappy.createRectangle(startX + gap, startY, 150, 80, { ...style, backgroundColor: '#d5e8d4' });
            window.Yappy.createText(startX + gap + 40, startY + 30, "Planning");

            // 3. Development
            const node3 = window.Yappy.createRectangle(startX + gap * 2, startY, 150, 80, { ...style, backgroundColor: '#dae8fc' });
            window.Yappy.createText(startX + gap * 2 + 30, startY + 30, "Development");

            // 4. Verification
            const node4 = window.Yappy.createRectangle(startX + gap * 3, startY, 150, 80, { ...style, backgroundColor: '#f8cecc' });
            window.Yappy.createText(startX + gap * 3 + 30, startY + 30, "Verification");

            // Connect them
            const conn1 = window.Yappy.connect(node1, node2, { strokeColor: '#666', curveType: 'bezier' });
            const conn2 = window.Yappy.connect(node2, node3, { strokeColor: '#666', curveType: 'bezier' });
            const conn3 = window.Yappy.connect(node3, node4, { strokeColor: '#666', curveType: 'bezier' });

            return { node1, node2, node3, node4, conn1, conn2, conn3 };
        });

        expect(diagram.node1).toBeTruthy();
        expect(diagram.conn1).toBeTruthy();

        // Verify connection binding
        const connectionDetails = await page.evaluate((id) => {
            const line = window.Yappy.getElement(id);
            return {
                type: line?.type,
                start: line?.startBinding?.elementId,
                end: line?.endBinding?.elementId
            };
        }, diagram.conn1);

        expect(connectionDetails.type).toBe('arrow');
        expect(connectionDetails.start).toBe(diagram.node1);
        expect(connectionDetails.end).toBe(diagram.node2);
    });
});
