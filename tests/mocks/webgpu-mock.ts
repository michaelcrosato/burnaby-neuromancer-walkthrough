/**
 * Playwright E2E WebGPU Mocking Script
 * 
 * Inject this script during page initialization to mock the WebGPU APIs,
 * allowing E2E tests to run successfully on environments without hardware GPU/WebGPU support.
 */
export function injectWebGPUMock() {
  console.log('=== INJECTING WEBGPU MOCK ===');

  if (!(window as any).GPUBufferUsage) {
    (window as any).GPUBufferUsage = {
      MAP_READ: 1,
      MAP_WRITE: 2,
      COPY_SRC: 4,
      COPY_DST: 8,
      INDEX: 16,
      VERTEX: 32,
      UNIFORM: 64,
      STORAGE: 128,
      INDIRECT: 256,
      QUERY_RESOLVE: 512,
    };
  }

  if (!(window as any).GPUShaderStage) {
    (window as any).GPUShaderStage = {
      VERTEX: 1,
      FRAGMENT: 2,
      COMPUTE: 4,
    };
  }

  // Create mock tracking arrays on window
  (window as any).__mock_buffers = [];
  (window as any).__mock_pipelines = [];
  (window as any).__terrain_override = undefined;

  class MockBuffer {
    size: number;
    usage: number;
    label?: string;
    constructor(descriptor: any) {
      this.size = descriptor.size;
      this.usage = descriptor.usage;
      this.label = descriptor.label;
    }
    destroy() {}
  }

  class MockShaderModule {
    label?: string;
    code: string;
    constructor(descriptor: any) {
      this.label = descriptor.label;
      this.code = descriptor.code;
    }
  }

  class MockBindGroupLayout {
    index: number;
    constructor(index: number) {
      this.index = index;
    }
  }

  class MockComputePipeline {
    label?: string;
    layout?: any;
    compute?: any;
    constructor(descriptor: any) {
      this.label = descriptor.label;
      this.layout = descriptor.layout;
      this.compute = descriptor.compute;
    }
    getBindGroupLayout(index: number) {
      return new MockBindGroupLayout(index);
    }
  }

  class MockBindGroup {
    label?: string;
    layout: any;
    entries: any[];
    constructor(descriptor: any) {
      this.label = descriptor.label;
      this.layout = descriptor.layout;
      this.entries = descriptor.entries;
    }
  }

  class MockComputePassEncoder {
    setPipeline() {}
    setBindGroup() {}
    dispatchWorkgroups() {}
    end() {}
  }

  class MockCommandBuffer {}

  class MockCommandEncoder {
    beginComputePass() {
      return new MockComputePassEncoder();
    }
    finish() {
      return new MockCommandBuffer();
    }
  }

  class MockQueue {
    writeBuffer() {}
    submit() {}
  }

  let resolveDeviceLost: ((info: any) => void) | null = null;

  class MockDevice {
    lost = new Promise<any>((resolve) => {
      resolveDeviceLost = resolve;
    });
    limits = {
      get maxComputeWorkgroupsPerDimension() {
        return (window as any).__webgpu_mock_state.maxComputeWorkgroupsPerDimension;
      },
      get maxStorageBufferBindingSize() {
        return (window as any).__webgpu_mock_state.maxStorageBufferBindingSize;
      }
    };
    queue = new MockQueue();
    createBuffer(descriptor: any) {
      const buf = new MockBuffer(descriptor);
      (window as any).__mock_buffers.push(buf);
      return buf;
    }
    createShaderModule(descriptor: any) {
      if ((window as any).__webgpu_mock_state.pipelineCompileFail) {
        throw new Error('Shader compilation failed');
      }
      return new MockShaderModule(descriptor);
    }
    createComputePipeline(descriptor: any) {
      if ((window as any).__webgpu_mock_state.pipelineCompileFail) {
        throw new Error('Pipeline compilation failed: Shader compilation error');
      }
      const pipeline = new MockComputePipeline(descriptor);
      (window as any).__mock_pipelines.push(pipeline);
      return pipeline;
    }
    createBindGroup(descriptor: any) {
      return new MockBindGroup(descriptor);
    }
    createCommandEncoder() {
      return new MockCommandEncoder();
    }
    destroy() {}
  }

  class MockAdapter {
    async requestDevice() {
      if ((window as any).__webgpu_mock_state.deviceLost) {
        throw new Error('Device lost');
      }
      return new MockDevice();
    }
  }

  class MockGPU {
    async requestAdapter() {
      return new MockAdapter();
    }
  }
  
  (window as any).__webgpu_mock_state = {
    isContextReady: true,
    maxComputeWorkgroupsPerDimension: 65535,
    maxStorageBufferBindingSize: 134217728,
    shaderStatus: 'compiled',
    deviceLost: false,
    pipelineCompileFail: (typeof window !== 'undefined' && window.location.search.includes('fail-compilation=true')) || false,
    triggerDeviceLost: (message: string = 'Device lost context') => {
      if (resolveDeviceLost) {
        resolveDeviceLost({ message, reason: 'destroyed' });
      }
    },
    topography: {} // defined with getter/setter below
  };

  Object.defineProperty((window as any).__webgpu_mock_state, 'particleCount', {
    get() {
      const buffers = (window as any).__mock_buffers || [];
      const particleBuffer = buffers.find((b: any) => b.label && b.label.includes('Particle'));
      if (particleBuffer) {
        return particleBuffer.size / 32;
      }
      return (window as any).__particle_count_override !== undefined ? (window as any).__particle_count_override : 2500000;
    },
    set(val) {
      (window as any).__particle_count_override = val;
      const buffers = (window as any).__mock_buffers || [];
      buffers.forEach((b: any) => {
        if (b.label && b.label.includes('Particle')) {
          b.size = val * 32;
        }
      });
    },
    configurable: true
  });

  Object.defineProperty((window as any).__webgpu_mock_state.topography, 'elevationData', {
    get() {
      if ((window as any).__terrain_override !== undefined) {
        return (window as any).__terrain_override;
      }
      return (window as any).generateBurnabyTerrain ? (window as any).generateBurnabyTerrain() : Array(256).fill(0);
    },
    set(val) {
      (window as any).__terrain_override = val;
    },
    configurable: true
  });

  Object.defineProperty((window as any).__webgpu_mock_state.topography, 'verticesCount', {
    get() { return 256; },
    configurable: true
  });

  Object.defineProperty((window as any).__webgpu_mock_state.topography, 'dimensions', {
    get() { return { width: 16, height: 16 }; },
    configurable: true
  });

  Object.defineProperty((window as any).__webgpu_mock_state.topography, 'bounds', {
    get() { return { minLat: 49.18, maxLat: 49.31, minLng: -123.02, maxLng: -122.89 }; },
    configurable: true
  });

  (window as any).__webgpu_test_hook = {
    isContextReady: () => (window as any).__webgpu_mock_state.isContextReady,
    getComputeLimits: () => ({
      maxComputeWorkgroupsPerDimension: (window as any).__webgpu_mock_state.maxComputeWorkgroupsPerDimension,
      maxStorageBufferBindingSize: (window as any).__webgpu_mock_state.maxStorageBufferBindingSize
    }),
    getShaderStatus: () => (window as any).__webgpu_mock_state.shaderStatus,
    getParticleCount: () => {
      const buffers = (window as any).__mock_buffers || [];
      const particleBuffer = buffers.find((b: any) => b.label && b.label.includes('Particle'));
      if (particleBuffer) {
        return particleBuffer.size / 32;
      }
      return (window as any).__particle_count_override !== undefined ? (window as any).__particle_count_override : 2500000;
    },
    getTopography: () => {
      return {
        verticesCount: 256,
        dimensions: { width: 16, height: 16 },
        bounds: { minLat: 49.18, maxLat: 49.31, minLng: -123.02, maxLng: -122.89 },
        elevationData: (window as any).generateBurnabyTerrain ? (window as any).generateBurnabyTerrain() : Array(256).fill(0)
      };
    },
    getComputePipeline: () => {
      const pipelines = (window as any).__mock_pipelines || [];
      const active = pipelines.length > 0;
      return {
        boidsPipelineActive: active,
        navierStokesPipelineActive: active
      };
    }
  };

  Object.defineProperty(navigator, 'gpu', {
    value: new MockGPU(),
    configurable: true,
    writable: true
  });
  
  console.log('=== WEBGPU MOCK INJECTED SUCCESS ===');
}
