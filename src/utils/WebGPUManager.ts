export interface GPULimits {
  maxComputeWorkgroupsPerDimension: number;
  maxStorageBufferBindingSize: number;
}

export type WebGPUStatus = 'checking' | 'supported' | 'unsupported';

export class WebGPUManager {
  private static instance: WebGPUManager | null = null;

  private status: WebGPUStatus = 'checking';
  private errorMessage = '';
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private limits: GPULimits | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private deviceLostCallback: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): WebGPUManager {
    if (!WebGPUManager.instance) {
      WebGPUManager.instance = new WebGPUManager();
    }
    return WebGPUManager.instance;
  }

  public onDeviceLost(callback: () => void) {
    this.deviceLostCallback = callback;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log('[WebGPUManager] Initializing WebGPU detection...');
      if (!navigator.gpu) {
        this.status = 'unsupported';
        this.errorMessage = 'navigator.gpu is undefined. Your browser does not support WebGPU, or WebGPU is disabled.';
        console.error(`[WebGPUManager] Initialization failed: ${this.errorMessage}`);
        this.initialized = true;
        return;
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          this.status = 'unsupported';
          this.errorMessage = 'WebGPU is supported by the browser, but no compatible GPU adapter was found.';
          console.error(`[WebGPUManager] Initialization failed: ${this.errorMessage}`);
          this.initialized = true;
          return;
        }

        const device = await adapter.requestDevice();
        this.adapter = adapter;
        this.device = device;
        this.limits = {
          maxComputeWorkgroupsPerDimension: device.limits?.maxComputeWorkgroupsPerDimension ?? 65535,
          maxStorageBufferBindingSize: device.limits?.maxStorageBufferBindingSize ?? 134217728,
        };
        this.status = 'supported';
        console.log('[WebGPUManager] WebGPU successfully initialized.', this.limits);

        if (device.lost) {
          device.lost.then((info) => {
            console.warn(`[WebGPUManager] WebGPU device lost: ${info.message}`, info.reason);
            if (this.device === device) {
              this.handleDeviceLost();
            }
          });
        }
      } catch (err: unknown) {
        this.status = 'unsupported';
        this.errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[WebGPUManager] Initialization failed with error: ${this.errorMessage}`);
      } finally {
        this.initialized = true;
      }
    })();

    return this.initPromise;
  }

  private handleDeviceLost() {
    this.initialized = false;
    this.initPromise = null;
    this.device = null;
    if (this.deviceLostCallback) {
      this.deviceLostCallback();
    }
  }

  public getStatus(): WebGPUStatus {
    return this.status;
  }

  public getErrorMessage(): string {
    return this.errorMessage;
  }

  public getLimits(): GPULimits | null {
    return this.limits;
  }

  public getDevice(): GPUDevice | null {
    return this.device;
  }

  public getAdapter(): GPUAdapter | null {
    return this.adapter;
  }
}
