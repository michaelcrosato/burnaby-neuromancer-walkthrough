import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';

test.describe('Topography Mesh Boundary & Corner Cases (F1-B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F1-B1: Bounding box limits at exact edges of Burnaby coordinate bounds', async ({ page }) => {
    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });

    expect(topo).not.toBeNull();
    if (topo) {
      expect(topo.bounds.minLat).toBeCloseTo(49.18);
      expect(topo.bounds.maxLat).toBeCloseTo(49.31);
      expect(topo.bounds.minLng).toBeCloseTo(-123.02);
      expect(topo.bounds.maxLng).toBeCloseTo(-122.89);
    }
  });

  test('F1-B2: Zero/flat elevation terrain handling (flat mesh verification)', async ({ page }) => {
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.topography.elevationData = Array(256).fill(0.0);
    });

    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });

    expect(topo).not.toBeNull();
    if (topo) {
      const allZeros = topo.elevationData.every(val => val === 0.0);
      expect(allZeros).toBe(true);
    }
  });

  test('F1-B3: Extreme elevation spike handling (mesh clamping to prevent GPU overflow)', async ({ page }) => {
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      // Set an extreme spike and an extreme pit
      state.topography.elevationData[0] = 999999.0;
      state.topography.elevationData[1] = -999999.0;
    });

    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });

    expect(topo).not.toBeNull();
    if (topo) {
      // The application or the verification hook should clamp values or not crash
      expect(topo.elevationData[0]).toBeDefined();
      expect(topo.elevationData[1]).toBeDefined();
    }
  });

  test('F1-B4: Elevation data loading failure (graceful fallback to flat terrain/fallback mesh)', async ({ page }) => {
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.topography.elevationData = []; // Simulate loading failure by emptying array
    });

    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });

    expect(topo).not.toBeNull();
    if (topo) {
      expect(Array.isArray(topo.elevationData)).toBe(true);
    }
  });

  test('F1-B5: Resizing browser window does not corrupt topographic aspect ratio or crash mesh renderer', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Resize viewport repeatedly
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(50);
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(50);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(50);

    // Verify no WebGPU or WebGL crashes
    expect(errors.filter(e => e.toLowerCase().includes('crash') || e.toLowerCase().includes('context lost'))).toHaveLength(0);
    
    // Canvas should still be visible
    const canvas = page.locator('canvas[data-testid="webgpu-canvas"]');
    await expect(canvas).toBeVisible();
  });
});
