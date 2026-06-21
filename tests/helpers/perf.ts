import { Page } from '@playwright/test';

export interface FPSMetrics {
  fps: number;
  avgFrameTimeMs: number;
  p95FrameTimeMs: number;
  totalFrames: number;
  isSoftwareRendering: boolean;
}

declare global {
  interface Window {
    __fpsMonitor?: {
      frameIntervals: number[];
      lastTime: number;
      active: boolean;
      isSoftwareRendering: boolean;
      loop: (now: number) => void;
    };
  }
}

export class FPSMonitor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Spawns a requestAnimationFrame listener in the page context to monitor frame times.
   */
  async start(): Promise<void> {
    await this.page.evaluate(() => {
      // Determine if WebGPU or rendering is utilizing software adapter
      const gl = document.createElement('canvas').getContext('webgl');
      const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
      const renderer = debugInfo ? (gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : '';
      const isSoftware = /swiftshader/i.test(renderer) || /llvmpipe/i.test(renderer);

      window.__fpsMonitor = {
        frameIntervals: [],
        lastTime: performance.now(),
        active: true,
        isSoftwareRendering: isSoftware,
        loop: function(now: number) {
          if (!this.active) return;
          const interval = now - this.lastTime;
          // Skip first frame interval to avoid init spikes
          if (this.frameIntervals.length > 0 || interval < 100) {
            this.frameIntervals.push(interval);
          }
          this.lastTime = now;
          requestAnimationFrame(this.loop.bind(this));
        }
      };
      requestAnimationFrame(window.__fpsMonitor.loop.bind(window.__fpsMonitor));
    });
  }

  /**
   * Stops the frame monitoring loop and returns summary statistics.
   */
  async stop(): Promise<FPSMetrics> {
    return await this.page.evaluate(() => {
      const monitor = window.__fpsMonitor;
      if (!monitor) {
        throw new Error('FPS Monitor was not started.');
      }
      monitor.active = false;
      
      const intervals = monitor.frameIntervals;
      if (intervals.length === 0) {
        return {
          fps: 0,
          avgFrameTimeMs: 0,
          p95FrameTimeMs: 0,
          totalFrames: 0,
          isSoftwareRendering: monitor.isSoftwareRendering
        };
      }

      const totalFrames = intervals.length;
      const sum = intervals.reduce((a, b) => a + b, 0);
      const avgFrameTimeMs = sum / totalFrames;
      const fps = 1000 / avgFrameTimeMs;

      const sorted = [...intervals].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95FrameTimeMs = sorted[p95Index];

      return {
        fps,
        avgFrameTimeMs,
        p95FrameTimeMs,
        totalFrames,
        isSoftwareRendering: monitor.isSoftwareRendering
      };
    });
  }
}
