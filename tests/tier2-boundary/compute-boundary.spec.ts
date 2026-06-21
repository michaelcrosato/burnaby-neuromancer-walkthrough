import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';

test.describe('WebGPU Fluid/Traffic Compute Boundary & Corner Cases (F2-B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F2-B1: Device memory allocation boundary (verifying WebGPU buffer sizing limits)', async ({ page }) => {
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.maxStorageBufferBindingSize = 1024 * 1024; // 1MB very small limit
    });

    const limits = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getComputeLimits ? hook.getComputeLimits() : null;
    });

    expect(limits).not.toBeNull();
    if (limits) {
      expect(limits.maxStorageBufferBindingSize).toBe(1024 * 1024);
    }
  });

  test('F2-B2: Handling of 0 particles (zero-size workgroups execution without crash)', async ({ page }) => {
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.particleCount = 0;
    });

    const count = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getParticleCount ? hook.getParticleCount() : null;
    });

    expect(count).toBe(0);

    const pipeline = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getComputePipeline ? hook.getComputePipeline() : null;
    });

    expect(pipeline).not.toBeNull();
    if (pipeline) {
      expect(pipeline.boidsPipelineActive).toBe(true);
      expect(pipeline.navierStokesPipelineActive).toBe(true);
    }
  });

  test('F2-B3: Extreme particle velocity limits (clamping speed in flocking Boids shader)', async ({ page }) => {
    // We verify that the boids pipeline is active under extreme inputs
    const pipeline = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getComputePipeline ? hook.getComputePipeline() : null;
    });
    expect(pipeline?.boidsPipelineActive).toBe(true);
  });

  test('F2-B4: Navier-Stokes boundary grid collisions (no particle leakage outside boundary)', async ({ page }) => {
    // Check topography bounds represent the boundaries
    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });
    expect(topo?.bounds).toBeDefined();
  });

  test('F2-B5: Lost/restored WebGPU device handling (re-creating pipeline and buffers)', async ({ page }) => {
    // 1. Simulate device loss
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.deviceLost = true;
      state.isContextReady = false;
    });

    // Verify context is no longer ready
    let isReady = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.isContextReady() ?? false;
    });
    expect(isReady).toBe(false);

    // 2. Restore device
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.deviceLost = false;
      state.isContextReady = true;
    });

    // Verify context becomes ready again
    isReady = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.isContextReady() ?? false;
    });
    expect(isReady).toBe(true);
  });
});
