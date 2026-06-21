import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';

test.describe('Topography Feature (F1) - Milestone 1 Scaffolding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as any).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F1.1: WebGL/WebGPU context initializes without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for core initialization to complete
    await expect(page.locator('[data-testid="webgpu-fallback-checking"]')).not.toBeVisible({ timeout: 5000 });
    
    // Check that we didn't hit fallback error screen
    await expect(page.locator('[data-testid="webgpu-fallback"]')).not.toBeVisible();

    // Verify no WebGPU initialization errors logged
    expect(errors.filter(e => e.includes('WebGPU') || e.includes('GPU') || e.includes('context'))).toHaveLength(0);
  });

  test('F1.2: 3D terrain canvas element is present in the React DOM', async ({ page }) => {
    // Wait for loading screen to clear
    await expect(page.locator('[data-testid="webgpu-fallback-checking"]')).not.toBeVisible({ timeout: 5000 });
    const canvas = page.locator('canvas[data-testid="webgpu-canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('F1.3: Topographic mesh dimensions and vertices count match expected layout (Milestone 2)', async ({ page }) => {
    const topo = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getTopography();
    });

    expect(topo).toBeDefined();
    expect(topo.verticesCount).toBe(256);
    expect(topo.dimensions).toEqual({ width: 16, height: 16 });
  });

  test('F1.4: Mesh bounds are within Burnaby, BC geographic bounding box limits (Milestone 2)', async ({ page }) => {
    const topo = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getTopography();
    });

    expect(topo).toBeDefined();
    expect(topo.bounds).toBeDefined();
    expect(topo.bounds.minLat).toBeCloseTo(49.18);
    expect(topo.bounds.maxLat).toBeCloseTo(49.31);
    expect(topo.bounds.minLng).toBeCloseTo(-123.02);
    expect(topo.bounds.maxLng).toBeCloseTo(-122.89);
  });

  test('F1.5: Elevation data loads correctly with no null/NaN vertices (Milestone 2)', async ({ page }) => {
    const topo = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getTopography();
    });

    expect(topo).toBeDefined();
    expect(Array.isArray(topo.elevationData)).toBe(true);
    expect(topo.elevationData).toHaveLength(256);
    
    const hasNullOrNaN = topo.elevationData.some((val: any) => val === null || val === undefined || isNaN(val));
    expect(hasNullOrNaN).toBe(false);
  });
});
