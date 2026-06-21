import { test, expect } from '@playwright/test';
import { injectAudioMock } from './mocks/audio-mock';
import { FPSMonitor } from './helpers/perf';
import { setSliderValueDirect, dragSliderToValue } from './helpers/slider';

test.describe('E2E Scaffolding & Mocks Verification', () => {
  test('audio mock can be injected and configures window properties', async ({ page }) => {
    // 1. Inject the audio mock
    await page.addInitScript(injectAudioMock);
    await page.goto('about:blank');

    // 2. Check window.__mockAudioState is defined
    const mockState = await page.evaluate(() => window.__mockAudioState);
    expect(mockState).toBeDefined();
    expect(mockState.bass).toBe(0);
    expect(mockState.treble).toBe(0);

    // 3. Inject some mock FFT values
    await page.evaluate(() => {
      window.__injectMockFFT({ bass: 0.8, treble: 0.5 });
    });

    const updatedState = await page.evaluate(() => window.__mockAudioState);
    expect(updatedState.bass).toBe(0.8);
    expect(updatedState.treble).toBe(0.5);
  });

  test('FPSMonitor can start and stop capturing frame intervals', async ({ page }) => {
    await page.goto('about:blank');
    const monitor = new FPSMonitor(page);
    await monitor.start();

    // Wait some time to allow requestAnimationFrame to fire
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    await page.waitForTimeout(100);

    const metrics = await monitor.stop();
    expect(metrics).toBeDefined();
    expect(metrics.totalFrames).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.isSoftwareRendering).toBe('boolean');
  });

  test('slider helpers can manipulate DOM range input', async ({ page }) => {
    // Create a dummy slider in DOM
    await page.goto('about:blank');
    await page.evaluate(() => {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = '10';
      slider.setAttribute('data-testid', 'test-slider');
      document.body.appendChild(slider);
    });

    // Use direct DOM set helper
    await setSliderValueDirect(page, 'test-slider', 75);

    const value = await page.locator('[data-testid="test-slider"]').inputValue();
    expect(value).toBe('75');
  });

  test('dragSliderToValue can drag a slider via mouse', async ({ page }) => {
    await page.goto('about:blank');
    await page.evaluate(() => {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = '50';
      slider.style.width = '200px';
      slider.style.display = 'block';
      slider.setAttribute('data-testid', 'drag-slider');
      document.body.appendChild(slider);
    });

    // Drag from 50% (middle, 50) to 75% (150px right, value 75)
    await dragSliderToValue(page, 'drag-slider', 75);

    const value = await page.locator('[data-testid="drag-slider"]').inputValue();
    const numericValue = Number(value);
    // Expect the value to be close to 75
    expect(numericValue).toBeGreaterThan(70);
    expect(numericValue).toBeLessThan(80);
  });
});

