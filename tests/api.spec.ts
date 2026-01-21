import { test, expect } from '@playwright/test';
import type { ElementType } from '../src/types';

test.describe('Yappy API', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForFunction(() => window.Yappy !== undefined);
        await page.evaluate(() => window.Yappy.clear()); // Start fresh
    });

    test('should allow programmatic creation of basic shapes', async ({ page }) => {
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

        // Create a Diamond
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

        // Create a Triangle
        const triId = await page.evaluate(() => {
            return window.Yappy.createTriangle(600, 100, 100, 100);
        });
        const triangleExists = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el && el.type === 'triangle';
        }, triId);
        expect(triangleExists).toBeTruthy();

        // Create a Star with custom points
        const starId = await page.evaluate(() => {
            return window.Yappy.createStar(750, 100, 100, 100, 7, { fillStyle: 'dots' });
        });
        const starState = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el ? { points: el.starPoints, fill: el.fillStyle } : null;
        }, starId);
        expect(starState).toEqual({ points: 7, fill: 'dots' });
    });

    test('should create wireframing elements', async ({ page }) => {
        const winId = await page.evaluate(() => {
            return window.Yappy.createBrowserWindow(100, 300, 400, 300, { strokeColor: '#333' });
        });

        const winType = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el?.type;
        }, winId);
        expect(winType).toBe('browserWindow');

        const noteId = await page.evaluate(() => {
            return window.Yappy.createStickyNote(550, 300, 150, 150, "Remember to fix bugs!", { backgroundColor: '#ffffcc' });
        });

        const noteCheck = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el ? { text: el.containerText, bg: el.backgroundColor } : null;
        }, noteId);
        expect(noteCheck).toEqual({ text: "Remember to fix bugs!", bg: '#ffffcc' });
    });

    test('should create generic polymorphic shapes', async ({ page }) => {
        const cloudId = await page.evaluate(() => {
            return window.Yappy.createPolygonalShape('cloud', 50, 600, 200, 100);
        });
        const isCloud = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el?.type === 'cloud';
        }, cloudId);
        expect(isCloud).toBeTruthy();
    });

    test('should handle connector creation and binding', async ({ page }) => {
        // Create two shapes
        const ids = await page.evaluate(() => {
            const id1 = window.Yappy.createRectangle(100, 100, 100, 100);
            const id2 = window.Yappy.createCircle(300, 300, 100, 100); // Should be roughly diagonal
            return [id1, id2];
        });

        // Connect them (Arrow)
        const arrowId = await page.evaluate(([id1, id2]) => {
            return window.Yappy.connect(id1, id2, { type: 'arrow' });
        }, ids);

        expect(arrowId).toBeTruthy();

        // Verify bindings
        const bindingCheck = await page.evaluate(({ arrowId, ids }) => {
            const arrow = window.Yappy.getElement(arrowId);
            const r = window.Yappy.getElement(ids[0]);
            const c = window.Yappy.getElement(ids[1]);
            return {
                startBound: arrow?.startBinding?.elementId === ids[0],
                endBound: arrow?.endBinding?.elementId === ids[1],
                rectBound: r?.boundElements?.some(b => b.id === arrowId),
                circleBound: c?.boundElements?.some(b => b.id === arrowId)
            };
        }, { arrowId, ids });

        expect(bindingCheck.startBound).toBeTruthy();
        expect(bindingCheck.endBound).toBeTruthy();
        expect(bindingCheck.rectBound).toBeTruthy();
        expect(bindingCheck.circleBound).toBeTruthy();
    });

    test('should support organic branches for mindmaps', async ({ page }) => {
        const id = await page.evaluate(() => {
            return window.Yappy.createOrganicBranch(100, 100, 200, 200, { strokeColor: 'brown' });
        });

        const valid = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el && el.type === 'organicBranch' && el.curveType === 'bezier';
        }, id);
        expect(valid).toBeTruthy();
    });

    test('should clear the canvas', async ({ page }) => {
        await page.evaluate(() => {
            window.Yappy.createRectangle(10, 10, 10, 10);
        });

        await page.evaluate(() => {
            window.Yappy.clear();
        });

        const count = await page.evaluate(() => {
            return window.Yappy.state.elements.length;
        });
        expect(count).toBe(0);
    });
});
