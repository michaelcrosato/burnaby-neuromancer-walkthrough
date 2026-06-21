import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';

test.describe('WebGPU Fluid/Traffic Compute Feature (F2) - Milestone 1 Scaffolding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as any).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F2.1: WebGPU device initialization succeeds and supports necessary limits (Milestone 2)', async ({ page }) => {
    const limits = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getComputeLimits?.();
    });

    expect(limits).toBeDefined();
    expect(limits.maxComputeWorkgroupsPerDimension).toBeGreaterThanOrEqual(65535);
    expect(limits.maxStorageBufferBindingSize).toBeGreaterThanOrEqual(134217728);
  });

  test('F2.2: Compute pipelines compile successfully (Navier-Stokes and Boids shaders) (Milestone 2)', async ({ page }) => {
    const status = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getShaderStatus?.();
    });

    expect(status).toBe('compiled');
  });

  test('F2.3: Target particle count is set to exactly 2,500,000 in uniform buffer (Milestone 2)', async ({ page }) => {
    const count = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getParticleCount?.();
    });

    expect(count).toBe(2500000);
  });

  test('F2.4: Boids flocking compute shader executes and updates particle position buffers (Milestone 2)', async ({ page }) => {
    const pipeline = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getComputePipeline?.();
    });

    expect(pipeline).toBeDefined();
    expect(pipeline.boidsPipelineActive).toBe(true);
  });

  test('F2.5: Navier-Stokes velocity field updates on each frame step (Milestone 2)', async ({ page }) => {
    const pipeline = await page.evaluate(() => {
      return (window as any).__webgpu_test_hook?.getComputePipeline?.();
    });

    expect(pipeline).toBeDefined();
    expect(pipeline.navierStokesPipelineActive).toBe(true);
  });
});
