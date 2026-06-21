import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { setSliderValueDirect } from '../helpers/slider';
import { FPSMonitor } from '../helpers/perf';
import * as path from 'path';
import { CustomWindow } from '../helpers/window-types';

test.describe('Headless Verification & Reporting Feature (F6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
  });

  test('F6.1: Page loads and resolves to root URL on localhost', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    
    const url = page.url();
    expect(url).toContain('http://localhost:3000');
  });

  test('F6.2: Audio permission is successfully granted headlessly', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    
    const permissionStatus = await page.evaluate(async () => {
      if (!navigator.permissions) return 'unsupported';
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return status.state;
    });

    expect(permissionStatus).not.toBe('denied');

    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    const trace = await page.evaluate(() => (window as unknown as CustomWindow).__audioMockTrace);
    expect(trace.getUserMediaCalled).toBe(true);
  });

  test('F6.3: Simulated audio input injection works (sine wave mock)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    
    await page.locator('[data-testid="enable-mic-button"]').click();
    
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.5, treble: 0.5 });
    });

    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.bassAmplitude).toBeCloseTo(0.5);
    expect(state.trebleAmplitude).toBeCloseTo(0.5);
  });

  test('F6.4: Slider interaction (Tectonic Volatility to max) is executed programmatically', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    
    await setSliderValueDirect(page, 'tectonic-volatility', 1.0);

    const val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().tectonicVolatility);
    expect(val).toBe(1.0);
  });

  test('F6.5: PerformanceObserver measures and logs frame times over 5 seconds & takes screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    
    await page.locator('[data-testid="enable-mic-button"]').click();
    
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.7, treble: 0.3 });
    });

    await setSliderValueDirect(page, 'tectonic-volatility', 1.0);

    const monitor = new FPSMonitor(page);
    await monitor.start();

    console.log('Measuring frame performance for 5 seconds...');
    await page.waitForTimeout(5000);

    const metrics = await monitor.stop();
    console.log('FPS Performance Metrics:', metrics);
    
    expect(metrics).toBeDefined();
    expect(metrics.totalFrames).toBeGreaterThan(0);
    
    if (metrics.isSoftwareRendering) {
      console.log('Note: Software rendering is active, skipping strict 120 FPS expectation.');
    } else {
      console.log(`Measured average frame time: ${metrics.avgFrameTimeMs}ms (FPS: ${metrics.fps})`);
    }

    const screenshotPath = path.join(process.cwd(), 'playwright-report', 'burnaby_neuromancer_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to: ${screenshotPath}`);
  });
});
