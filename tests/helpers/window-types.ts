import { UseBoundStore, StoreApi } from 'zustand';
import { UIStore } from '../../src/store/useUIStore';

export interface CustomWindow extends Window {
  __webgpu_test_hook?: {
    isContextReady: () => boolean;
    getComputeLimits?: () => {
      maxComputeWorkgroupsPerDimension: number;
      maxStorageBufferBindingSize: number;
    };
    getShaderStatus?: () => string;
    getParticleCount?: () => number;
    getTopography?: () => {
      verticesCount: number;
      dimensions: { width: number; height: number };
      bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
      elevationData: number[];
    };
    getComputePipeline?: () => {
      boidsPipelineActive: boolean;
      navierStokesPipelineActive: boolean;
    };
  };
  __store: UseBoundStore<StoreApi<UIStore>>;
}
