import { test, expect } from '@playwright/test';

test.describe('Yappy API', () => {
    test('should allow programmatic creation of elements', async ({ page }) => {
        // Navigate to the app (assuming it runs on localhost:5173 by default)
        await page.goto('http://localhost:5173');

        // Wait for the API to be initialized
        await page.waitForFunction(() => window.Yappy !== undefined);

        // Create a rectangle via API
        const rectId = await page.evaluate(() => {
            return window.Yappy.createRectangle(100, 100, 200, 150, {
                strokeColor: '#ff0000',
                backgroundColor: '#00ff00',
                fillStyle: 'solid'
            });
        });

        expect(rectId).toBeTruthy();

        // Verify it exists in state
        const elementExists = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el && el.type === 'rectangle' && el.width === 200;
        }, rectId);

        expect(elementExists).toBeTruthy();

        // Create a Diamond via API
        const diaId = await page.evaluate(() => {
            return window.Yappy.createDiamond(400, 100, 100, 100, {
                backgroundColor: '#0000ff'
            });
        });
        const diamondExists = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el && el.type === 'diamond' && el.width === 100;
        }, diaId);
        expect(diamondExists).toBeTruthy();

        // Verify Diamond Selection (Hit Test)
        // Simulate click on diamond center to select it
        await page.mouse.click(450, 150); // Center of diamond at 400,100 (100x100)

        const isDiaSelected = await page.evaluate((id) => {
            return window.Yappy.state.selection.includes(id as string);
        }, diaId);
        expect(isDiaSelected).toBeTruthy();

        // Create a Text element
        const textId = await page.evaluate(() => {
            return window.Yappy.createText(400, 200, "Hello World from API", { fontSize: 30 });
        });

        expect(textId).toBeTruthy();

        // Verify Text
        const textContent = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el ? el.text : null;
        }, textId);

        expect(textContent).toBe("Hello World from API");

        // Clear Canvas
        await page.evaluate(() => {
            window.Yappy.clear();
        });

        // Verify Empty
        const count = await page.evaluate(() => {
            return window.Yappy.state.elements.length;
        });
        expect(count).toBe(0);
    });
});
