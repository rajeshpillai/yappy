
import { test, expect } from '@playwright/test';

test.describe('Comprehensive Feature Suite', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
            // Use API directly to avoid flaky hotkey behavior in headless environment
            await page.evaluate(async () => {
                await window.Yappy.copyToClipboard();
                await window.Yappy.pasteFromClipboard();
            });
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
            // Ensure layer panel is open using hotkey since API method isn't exposed
            const panelVisible = await page.evaluate(() => window.Yappy.state.showLayerPanel);
            if (!panelVisible) {
                await page.keyboard.press('Alt+l');
            }
            await page.waitForSelector('.layer-panel');

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

    test.describe('6. Slides & Presentation API', () => {
        test('should duplicate slides programmatically', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.setDocType('slides');
                window.Yappy.addSlide();
            });
            const initialCount = await page.evaluate(() => window.Yappy.state.slides.length);
            await page.evaluate(() => window.Yappy.duplicateSlide(0));
            const afterCount = await page.evaluate(() => window.Yappy.state.slides.length);
            expect(afterCount).toBe(initialCount + 1);
        });

        test('should navigate to first and last slides', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.setDocType('slides');
                window.Yappy.addSlide();
                window.Yappy.addSlide();
            });
            await page.evaluate(() => window.Yappy.goToLastSlide());
            let activeIndex = await page.evaluate(() => window.Yappy.state.activeSlideIndex);
            expect(activeIndex).toBe(2);

            await page.evaluate(() => window.Yappy.goToFirstSlide());
            activeIndex = await page.evaluate(() => window.Yappy.state.activeSlideIndex);
            expect(activeIndex).toBe(0);
        });

        test('should update slide background with full options', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.setDocType('slides');
                window.Yappy.updateSlideBackground(0, {
                    backgroundColor: '#ff0000',
                    fillStyle: 'hachure'
                });
            });
            const slide = await page.evaluate(() => window.Yappy.state.slides[0]);
            expect(slide.backgroundColor).toBe('#ff0000');
            expect(slide.fillStyle).toBe('hachure');
        });

        test('should toggle UI toolbars programmatically', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.toggleMainToolbar(false);
                window.Yappy.toggleUtilityToolbar(false);
            });
            const mainVisible = await page.evaluate(() => window.Yappy.state.showMainToolbar);
            const utilityVisible = await page.evaluate(() => window.Yappy.state.showUtilityToolbar);
            expect(mainVisible).toBe(false);
            expect(utilityVisible).toBe(false);
        });
    });

    test.describe('7. Advanced Gradients & Backgrounds', () => {
        test('should apply radial gradient with focal offset', async ({ page }) => {
            await page.evaluate(() => {
                const id = window.Yappy.createRectangle(100, 100, 200, 200, {
                    fillStyle: 'radial',
                    gradientStart: '#ffffff',
                    gradientEnd: '#000000',
                    gradientDirection: 45
                });
                window.Yappy.setSelected([id]);
            });

            const element = await page.evaluate(() => window.Yappy.state.elements[0]);
            expect(element.fillStyle).toBe('radial');
            expect(element.gradientDirection).toBe(45);
        });

        test('should decouple slide background from fill style', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.setDocType('slides');
                // Set background color without forcing fillStyle to solid
                window.Yappy.updateSlideBackground(0, { backgroundColor: '#00ff00' });
                window.Yappy.updateSlideBackground(0, { fillStyle: 'dots' });
            });

            const slide = await page.evaluate(() => window.Yappy.state.slides[0]);
            expect(slide.backgroundColor).toBe('#00ff00');
            expect(slide.fillStyle).toBe('dots');
        });
    });
});
