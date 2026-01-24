import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');
        await page.evaluate(() => {
            if (window.Yappy) {
                window.Yappy.clear();
            }
        });
    });

    test('should toggle panels with Alt+\\', async ({ page }) => {
        // Initially some panels might be open or closed, let's normalize
        await page.evaluate(() => {
            window.Yappy.state.showPropertyPanel = false;
            window.Yappy.state.showLayerPanel = false;
        });

        await page.keyboard.press('Alt+\\');
        const propVisible = await page.evaluate(() => window.Yappy.state.showPropertyPanel);
        const layerVisible = await page.evaluate(() => window.Yappy.state.showLayerPanel);
        expect(propVisible).toBe(true);
        expect(layerVisible).toBe(true);

        await page.keyboard.press('Alt+\\');
        const propVisible2 = await page.evaluate(() => window.Yappy.state.showPropertyPanel);
        const layerVisible2 = await page.evaluate(() => window.Yappy.state.showLayerPanel);
        expect(propVisible2).toBe(false);
        expect(layerVisible2).toBe(false);
    });

    test('should toggle property panel with Alt+Enter', async ({ page }) => {
        await page.evaluate(() => {
            window.Yappy.state.showPropertyPanel = false;
        });

        await page.keyboard.press('Alt+Enter');
        const propVisible = await page.evaluate(() => window.Yappy.state.showPropertyPanel);
        expect(propVisible).toBe(true);
    });

    test('should select specialized tools with Alt+P and Alt+I', async ({ page }) => {
        await page.keyboard.press('Alt+p');
        const toolP = await page.evaluate(() => window.Yappy.state.selectedTool);
        expect(toolP).toBe('laser');

        await page.keyboard.press('Alt+i');
        const toolI = await page.evaluate(() => window.Yappy.state.selectedTool);
        expect(toolI).toBe('ink');
    });

    test('should handle common clipboard and history shortcuts', async ({ page }) => {
        // Create an element
        await page.evaluate(() => {
            window.Yappy.createRectangle(10, 10, 100, 100);
        });

        // Select All
        await page.keyboard.press('Control+a');
        const selectionCount = await page.evaluate(() => window.Yappy.state.selection.length);
        expect(selectionCount).toBe(1);

        // Copy/Paste
        await page.keyboard.press('Control+c');
        await page.keyboard.press('Control+v');
        const elementCount = await page.evaluate(() => window.Yappy.state.elements.length);
        expect(elementCount).toBe(2);

        // Undo
        await page.keyboard.press('Control+z');
        const elementCountUndo = await page.evaluate(() => window.Yappy.state.elements.length);
        expect(elementCountUndo).toBe(1);
    });
});
