import { useUIStore } from '../store/useUIStore';
import computeShaderSource from '../shaders/compute.wgsl?raw';


export class WebGPUPipeline {
  private static instance: WebGPUPipeline | null = null;
  private device: GPUDevice | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private particleBuffers: GPUBuffer[] = [];
  private paramsBuffer: GPUBuffer | null = null;
  private bindGroups: GPUBindGroup[] = [];
  private currentBufferIndex = 0;
  private unsubscribe: (() => void) | null = null;

  // Caching variables to avoid redundant writes
  private lastTectonicVolatility = -1;
  private lastFluidViscosity = -1;
  private lastFlockingCohesion = -1;
  private lastAudioSensitivity = -1;
  private lastBassAmplitude = -1;
  private lastTrebleAmplitude = -1;
  private lastTectonicOffset = -999999;
  private lastGravityInverted = false;

  public static getInstance(): WebGPUPipeline {
    if (!WebGPUPipeline.instance) {
      WebGPUPipeline.instance = new WebGPUPipeline();
    }
    return WebGPUPipeline.instance;
  }

  private constructor() {}

  public async initialize(device: GPUDevice | null): Promise<void> {
    if (!device) {
      console.error('[WebGPUPipeline] Cannot initialize: device is null');
      throw new Error('Device is null');
    }

    try {
      this.device = device;
      
      // Reset caches
      this.lastTectonicVolatility = -1;
      this.lastFluidViscosity = -1;
      this.lastFlockingCohesion = -1;
      this.lastAudioSensitivity = -1;
      this.lastBassAmplitude = -1;
      this.lastTrebleAmplitude = -1;
      this.lastTectonicOffset = -999999;
      this.lastGravityInverted = false;

      const particleCount = (window as any).__particle_count_override !== undefined ? (window as any).__particle_count_override : 2500000;
      const particleSize = 32; // 32 bytes per particle (position: vec4<f32>, velocity: vec4<f32>)
      const bufferSize = particleCount * particleSize;

      // Create double-buffered (ping-pong) particle storage buffers
      this.particleBuffers = [
        device.createBuffer({
          label: 'Particle Buffer A',
          size: bufferSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
        }),
        device.createBuffer({
          label: 'Particle Buffer B',
          size: bufferSize,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
        }),
      ];

      // Seed initial particle states (position xyz in [-1, 1], velocity xyz in [-0.1, 0.1])
      const initialData = new Float32Array(particleCount * 8);
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 8;
        initialData[idx] = (Math.random() - 0.5) * 2.0;
        initialData[idx + 1] = (Math.random() - 0.5) * 2.0;
        initialData[idx + 2] = (Math.random() - 0.5) * 2.0;
        initialData[idx + 3] = 1.0;
        initialData[idx + 4] = (Math.random() - 0.5) * 0.2;
        initialData[idx + 5] = (Math.random() - 0.5) * 0.2;
        initialData[idx + 6] = (Math.random() - 0.5) * 0.2;
        initialData[idx + 7] = 0.0;
      }
      device.queue.writeBuffer(this.particleBuffers[0], 0, initialData);
      device.queue.writeBuffer(this.particleBuffers[1], 0, initialData);

      // Dynamic parameters uniform buffer (32 bytes aligned)
      this.paramsBuffer = device.createBuffer({
        label: 'Params Uniform Buffer',
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const shaderModule = device.createShaderModule({
        label: 'Compute Shader Module',
        code: computeShaderSource,
      });

      this.computePipeline = device.createComputePipeline({
        label: 'Compute Pipeline',
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      const layout = this.computePipeline.getBindGroupLayout(0);
      this.bindGroups = [
        device.createBindGroup({
          label: 'Bind Group Ping',
          layout: layout,
          entries: [
            { binding: 0, resource: { buffer: this.particleBuffers[0] } },
            { binding: 1, resource: { buffer: this.particleBuffers[1] } },
            { binding: 2, resource: { buffer: this.paramsBuffer } },
          ],
        }),
        device.createBindGroup({
          label: 'Bind Group Pong',
          layout: layout,
          entries: [
            { binding: 0, resource: { buffer: this.particleBuffers[1] } },
            { binding: 1, resource: { buffer: this.particleBuffers[0] } },
            { binding: 2, resource: { buffer: this.paramsBuffer } },
          ],
        }),
      ];

      // Load initial uniform values
      this.updateParamsBuffer();

      // Subscribe to state changes in Zustand store
      this.unsubscribe = useUIStore.subscribe(() => {
        this.updateParamsBuffer();
      });

      console.log('[WebGPUPipeline] Real WebGPU pipeline successfully initialized.');
    } catch (err) {
      console.error('[WebGPUPipeline] Pipeline initialization failed:', err);
      this.destroy();
      throw err;
    }
  }

  private updateParamsBuffer() {
    if (!this.device || !this.paramsBuffer) return;

    const state = useUIStore.getState();

    // Check if parameters actually changed
    const hasChanged = 
      state.tectonicVolatility !== this.lastTectonicVolatility ||
      state.fluidViscosity !== this.lastFluidViscosity ||
      state.flockingCohesion !== this.lastFlockingCohesion ||
      state.audioSensitivity !== this.lastAudioSensitivity ||
      state.bassAmplitude !== this.lastBassAmplitude ||
      state.trebleAmplitude !== this.lastTrebleAmplitude ||
      state.tectonicOffset !== this.lastTectonicOffset ||
      state.gravityInverted !== this.lastGravityInverted;

    if (!hasChanged) return;

    this.lastTectonicVolatility = state.tectonicVolatility;
    this.lastFluidViscosity = state.fluidViscosity;
    this.lastFlockingCohesion = state.flockingCohesion;
    this.lastAudioSensitivity = state.audioSensitivity;
    this.lastBassAmplitude = state.bassAmplitude;
    this.lastTrebleAmplitude = state.trebleAmplitude;
    this.lastTectonicOffset = state.tectonicOffset;
    this.lastGravityInverted = state.gravityInverted;

    const buffer = new ArrayBuffer(32);
    const f32View = new Float32Array(buffer);
    const u32View = new Uint32Array(buffer);

    f32View[0] = state.tectonicVolatility;
    f32View[1] = state.fluidViscosity;
    f32View[2] = state.flockingCohesion;
    f32View[3] = state.audioSensitivity;
    f32View[4] = state.bassAmplitude;
    f32View[5] = state.trebleAmplitude;
    f32View[6] = state.tectonicOffset;

    u32View[7] = state.gravityInverted ? 1 : 0;

    this.device.queue.writeBuffer(this.paramsBuffer, 0, buffer);
  }

  public step(): void {
    if (!this.device || !this.computePipeline || this.bindGroups.length < 2) return;

    const particleCount = (window as any).__particle_count_override !== undefined ? (window as any).__particle_count_override : 2500000;
    const workgroupSize = 256;
    let workgroupCount = Math.ceil(particleCount / workgroupSize);

    // Zero-particle workgroup dispatch safety check
    if (workgroupCount <= 0) return;

    // Clamp compute pass dispatch workgroup counts to prevent runtime validation errors on massive counts
    const maxWorkgroups = this.device.limits?.maxComputeWorkgroupsPerDimension ?? 65535;
    if (workgroupCount > maxWorkgroups) {
      workgroupCount = maxWorkgroups;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.bindGroups[this.currentBufferIndex]);
    computePass.dispatchWorkgroups(workgroupCount);
    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    // Swap buffers (ping-pong)
    this.currentBufferIndex = 1 - this.currentBufferIndex;
  }

  public getParticleBuffer(): GPUBuffer | null {
    if (this.particleBuffers.length === 0) return null;
    return this.particleBuffers[this.currentBufferIndex];
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.particleBuffers[0]) {
      this.particleBuffers[0].destroy();
    }
    if (this.particleBuffers[1]) {
      this.particleBuffers[1].destroy();
    }
    if (this.paramsBuffer) {
      this.paramsBuffer.destroy();
    }
    this.particleBuffers = [];
    this.paramsBuffer = null;
    this.computePipeline = null;
    this.bindGroups = [];
    this.device = null;
    WebGPUPipeline.instance = null;
  }
}
