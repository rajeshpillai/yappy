
import { test, expect } from '@playwright/test';

test.describe('Comprehensive Feature Suite', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');
        await page.evaluate(() => {
            if (window.Yappy) {
                window.Yappy.clear();
                window.Yappy.togglePropertyPanel(true);
            }
        });
    });

    test.describe('1. Canvas & Basic Drawing', () => {
        test('should create all basic shape types', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createRectangle(10, 10, 100, 100);
                window.Yappy.createCircle(120, 10, 100, 100);
                window.Yappy.createDiamond(230, 10, 100, 100);
                window.Yappy.createText(340, 10, "Hello");
                window.Yappy.createLine(10, 150, 110, 150, { curveType: 'straight' });
                window.Yappy.createLine(120, 150, 220, 150, { curveType: 'bezier' });
            });

            const count = await page.evaluate(() => window.Yappy.state.elements.length);
            expect(count).toBe(6);
        });

        test('should toggle theme and sync state', async ({ page }) => {
            const initialTheme = await page.evaluate(() => window.Yappy.state.theme);
            await page.click('button[title="Toggle Theme"]');
            const themeAfter = await page.evaluate(() => window.Yappy.state.theme);
            expect(themeAfter).not.toBe(initialTheme);
        });

        test('should snap to grid settings', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.updateGridSettings({ snapToGrid: true, gridSize: 50 });
            });
            const snap = await page.evaluate(() => window.Yappy.state.gridSettings.snapToGrid);
            expect(snap).toBe(true);
        });
    });

    test.describe('2. Element Manipulation', () => {
        test('should selection multiple elements and group them', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createRectangle(0, 0, 100, 100);
                window.Yappy.createRectangle(110, 0, 100, 100);
                const ids = window.Yappy.state.elements.map(e => e.id);
                window.Yappy.setSelected(ids);
            });
            await page.keyboard.press('Control+g');
            const groupIds = await page.evaluate(() => window.Yappy.state.elements.map(e => e.groupIds?.[0]));
            expect(groupIds[0]).toBeDefined();
            expect(groupIds[0]).toBe(groupIds[1]);
        });

        test('should copy and paste elements', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createRectangle(0, 0, 100, 100);
                window.Yappy.setSelected([window.Yappy.state.elements[0].id]);
            });
            await page.focus('canvas');
            await page.keyboard.press('Control+c');
            await page.waitForTimeout(100);
            await page.keyboard.press('Control+v');
            const count = await page.evaluate(() => window.Yappy.state.elements.length);
            expect(count).toBe(2);
        });

        test('should undo/redo deletion', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createRectangle(0, 0, 100, 100);
                window.Yappy.setSelected([window.Yappy.state.elements[0].id]);
            });
            await page.keyboard.press('Delete');
            expect(await page.evaluate(() => window.Yappy.state.elements.length)).toBe(0);
            await page.keyboard.press('Control+z');
            expect(await page.evaluate(() => window.Yappy.state.elements.length)).toBe(1);
        });
    });

    test.describe('3. Property Management', () => {
        test('should change font family for text', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createText(0, 0, "Test Font");
                window.Yappy.setSelected([window.Yappy.state.elements[0].id]);
            });
            // Label is "Font" in properties.ts
            const select = page.locator('.control-row:has-text("Font") select');
            await select.first().selectOption('monospace');
            const font = await page.evaluate(() => window.Yappy.state.elements[0].fontFamily);
            expect(font).toBe('monospace');
        });

        test('should toggle Zen Mode', async ({ page }) => {
            await page.keyboard.press('Alt+\\');
            const propVisible = await page.evaluate(() => window.Yappy.state.showPropertyPanel);
            expect(propVisible).toBe(false);
            await page.keyboard.press('Alt+\\');
            expect(await page.evaluate(() => window.Yappy.state.showPropertyPanel)).toBe(true);
        });
    });

    test.describe('4. Advanced Features', () => {
        test('should add and activate layers', async ({ page }) => {
            await page.click('button[title="Add new layer"]');
            const layerCount = await page.evaluate(() => window.Yappy.state.layers.length);
            expect(layerCount).toBe(2);
            await page.click('.layer-item:has-text("Layer 2")');
            const activeLayerId = await page.evaluate(() => window.Yappy.state.activeLayerId);
            const layers = await page.evaluate(() => window.Yappy.state.layers);
            expect(activeLayerId).toBe(layers[1].id);
        });

        test('should route elbow connectors', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createRectangle(100, 50, 100, 100);
                window.Yappy.createLine(50, 100, 250, 100, { curveType: 'elbow' });
            });
            await page.waitForTimeout(500);
            const points = await page.evaluate(() => window.Yappy.state.elements.find(e => e.type === 'line').points);
            expect(points.length).toBeGreaterThanOrEqual(2);
        });
    });

    test.describe('5. Persistence & UI State', () => {
        test('should open Unified Load/Save Dialog', async ({ page }) => {
            await page.click('button[title="Menu"]');
            await page.click('.menu-item:has-text("Export / Save")');
            await expect(page.locator('.load-export-dialog')).toBeVisible();
        });

        test('should toggle Grid via context menu', async ({ page }) => {
            await page.click('canvas', { button: 'right' });
            await page.click('.context-menu-item:has-text("Show Grid")');
            const gridEnabled = await page.evaluate(() => window.Yappy.state.gridSettings.enabled);
            expect(gridEnabled).toBe(true);
        });
    });
});
