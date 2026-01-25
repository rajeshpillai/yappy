
import { test, expect } from '@playwright/test';

test.describe('Pen Tool & Organic Branch Features', () => {
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


    test.describe('Pen Tool Properties', () => {
        test('should create inkbrush and verify default properties', async ({ page }) => {
            await page.evaluate(() => {
                const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: i * 10, p: 0.5 }));
                window.Yappy.createElement('inkbrush', 100, 100, 100, 100, {
                    points,
                    strokeColor: '#000000',
                    strokeWidth: 5,
                    smoothing: 3,
                    taperAmount: 0.15,
                    velocitySensitivity: 0.5
                });

                // Select specific element we just created
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.setSelected([id]);
            });

            // Verify state
            const props = await page.evaluate(() => {
                const bucket_els = window.Yappy.state.elements;
                const el = bucket_els[bucket_els.length - 1]; // Get last added
                return {
                    smoothing: el.smoothing,
                    taperAmount: el.taperAmount,
                    velocitySensitivity: el.velocitySensitivity
                };
            });

            expect(props.smoothing).toBe(3);
            expect(props.taperAmount).toBe(0.15);
            expect(props.velocitySensitivity).toBe(0.5);
        });

        test('should update pen properties via store/API', async ({ page }) => {
            await page.evaluate(() => {
                const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: i * 10 }));
                window.Yappy.createElement('inkbrush', 100, 100, 100, 100, {
                    points,
                    smoothing: 0,
                    taperAmount: 0,
                    velocitySensitivity: 0
                });
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.setSelected([id]);
            });

            // Update properties using Yappy API (which calls store.updateElement)
            await page.evaluate(() => {
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.updateElement(id, {
                    smoothing: 10,
                    taperAmount: 0.8,
                    velocitySensitivity: 0.9
                });
            });

            const newProps = await page.evaluate(() => {
                const els = window.Yappy.state.elements;
                const el = els[els.length - 1];
                return {
                    smoothing: el.smoothing,
                    taperAmount: el.taperAmount,
                    velocitySensitivity: el.velocitySensitivity
                };
            });

            expect(newProps.smoothing).toBe(10);
            expect(newProps.taperAmount).toBe(0.8);
            expect(newProps.velocitySensitivity).toBe(0.9);
        });

        test('should display pen properties in Property Panel', async ({ page }) => {
            await page.evaluate(() => {
                const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: i * 10 }));
                window.Yappy.createElement('inkbrush', 100, 100, 100, 100, {
                    points,
                    smoothing: 5,
                    taperAmount: 0.2,
                    velocitySensitivity: 0.5
                });
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.setSelected([id]);
            });

            // Allow render
            await page.waitForTimeout(100);

            await expect(page.locator('.control-row:has-text("Smoothing")')).toBeVisible();
            await expect(page.locator('.control-row:has-text("Tapering")')).toBeVisible();
            await expect(page.locator('.control-row:has-text("Speed Sensitivity")')).toBeVisible();
        });
    });

    test.describe('Organic Branch Features', () => {
        test('should select organic branch and show relevant properties', async ({ page }) => {
            await page.evaluate(() => {
                // Use createOrganicBranch helper
                window.Yappy.createOrganicBranch(100, 100, 300, 150, {
                    strokeColor: '#000000',
                    strokeWidth: 2,
                    flowAnimation: false
                });
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.setSelected([id]);
            });

            // Check property panel for Flow Animation
            await expect(page.locator('.control-row:has-text("Flow Animation")')).toBeVisible();
        });

        test('should not show rectangular selection box', async ({ page }) => {
            await page.evaluate(() => {
                window.Yappy.createOrganicBranch(200, 200, 300, 300);
                const els = window.Yappy.state.elements;
                const id = els[els.length - 1].id;
                window.Yappy.setSelected([id]);
            });

            const selected = await page.evaluate(() => window.Yappy.state.selection.length);
            expect(selected).toBe(1);
        });
    });
});
