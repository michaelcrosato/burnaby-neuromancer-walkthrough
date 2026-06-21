import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';
import { setSliderValueDirect } from '../helpers/slider';
import { FPSMonitor } from '../helpers/perf';
import * as path from 'path';

test.describe('Tier 4 E2E Scenarios (Real-world Application Scenarios)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
  });

  test('Test 67: Standard Interactive Session (Scenario 1)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });

    // 1. User changes sliders for fluid simulation
    await setSliderValueDirect(page, 'fluid-viscosity', 0.4);
    await setSliderValueDirect(page, 'flocking-cohesion', 0.8);
    
    // 2. User plays music/mic input
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // 3. Simulated mic feed reacts
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.5, treble: 0.3 });
    });
    await page.waitForTimeout(150);

    // 4. Verify states are updated and synchronized
    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.fluidViscosity).toBe(0.4);
    expect(state.flockingCohesion).toBe(0.8);
    expect(state.bassAmplitude).toBeCloseTo(0.5);
    expect(state.trebleAmplitude).toBeCloseTo(0.3);

    // 5. Canvas is visible and rendering
    const canvas = page.locator('canvas[data-testid="webgpu-canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('Test 68: Dynamic Live Music Event (Scenario 2)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });

    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);

    // Sequence of fluctuating audio peaks:
    // Drop 1: Massive Bass
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.95, treble: 0.1 });
    });
    await page.waitForTimeout(100);
    let state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.gravityInverted).toBe(true);
    expect(state.activeColorPalette).toBe('cyan');

    // Peak 2: Intense Treble
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.1, treble: 0.95 });
    });
    await page.waitForTimeout(100);
    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.gravityInverted).toBe(false);
    expect(state.activeColorPalette).toBe('magenta');

    // General Fluctuation
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.8, treble: 0.7 });
    });
    await page.waitForTimeout(100);
    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.gravityInverted).toBe(true);
    expect(state.activeColorPalette).toBe('magenta');
  });

  test('Test 69: Performance Benchmark under Stress (Scenario 3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });

    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // Max out all parameters
    await setSliderValueDirect(page, 'tectonic-volatility', 1.0);
    await setSliderValueDirect(page, 'fluid-viscosity', 1.0);
    await setSliderValueDirect(page, 'flocking-cohesion', 1.0);
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);

    // Inject heavy audio values
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 1.0, treble: 1.0 });
    });
    await page.waitForTimeout(100);

    // Monitor performance under load
    const monitor = new FPSMonitor(page);
    await monitor.start();
    await page.waitForTimeout(1500); // Stress period
    const metrics = await monitor.stop();

    console.log(`Stress Benchmark: Avg Frame Time = ${metrics.avgFrameTimeMs.toFixed(2)}ms (FPS = ${metrics.fps.toFixed(1)})`);
    expect(metrics.totalFrames).toBeGreaterThan(0);
  });

  test('Test 70: Browser Recovery (Scenario 4)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });

    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // 1. Lose device context mid-session
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.deviceLost = true;
      state.isContextReady = false;
    });

    let isReady = await page.evaluate(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() ?? false;
    });
    expect(isReady).toBe(false);

    // 2. Reinitialize / Restore device context
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.deviceLost = false;
      state.isContextReady = true;
    });

    isReady = await page.evaluate(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() ?? false;
    });
    expect(isReady).toBe(true);

    // 3. Verify state and controls resume without failure
    await setSliderValueDirect(page, 'fluid-viscosity', 0.5);
    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.fluidViscosity).toBe(0.5);
  });

  test('Test 71: Full Headless End-to-End Verification (Scenario 5)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });

    // 1. Verify mic permissions are queryable/mocked
    const permissionStatus = await page.evaluate(async () => {
      if (!navigator.permissions) return 'unsupported';
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return status.state;
    });
    expect(permissionStatus).not.toBe('denied');

    // 2. Grant and activate mic
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // 3. Inject 60Hz sine wave (bass amplitude peak at index 0)
    await page.evaluate(() => {
      const mockBins = Array(128).fill(0);
      mockBins[0] = 0.95; // 60Hz peak
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.95, treble: 0.0, bins: mockBins });
    });

    // 4. Drag volatility to max
    await setSliderValueDirect(page, 'tectonic-volatility', 1.0);
    await page.waitForTimeout(100);

    // 5. Measure frame times via PerformanceObserver wrapper for 5 seconds
    const monitor = new FPSMonitor(page);
    await monitor.start();
    await page.waitForTimeout(5000);
    const metrics = await monitor.stop();

    expect(metrics).toBeDefined();
    expect(metrics.totalFrames).toBeGreaterThan(0);
    console.log(`Headless verification metrics: Avg Frame Time = ${metrics.avgFrameTimeMs.toFixed(2)}ms, FPS = ${metrics.fps.toFixed(1)}`);

    // 6. Export verified screenshot
    const screenshotPath = path.join(process.cwd(), 'burnaby_neuromancer_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Headless verification screenshot exported to: ${screenshotPath}`);
  });
});
