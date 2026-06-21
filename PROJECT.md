# Project: Burnaby Neuromancer

"Burnaby Neuromancer" is a WebGPU-accelerated, audio-reactive 3D fluid-dynamics and traffic routing ecosystem mapping real-time data over local topography.

## Architecture
The application is structured into three clean layers:
1. **React UI Layer**: Floating glassmorphism HUD using Zustand and TailwindCSS for real-time controls. Employs `@react-three/fiber` for rendering the 3D viewport containing the Burnaby terrain and particle simulation.
2. **Web Worker Layer**: Web Workers handling offline/background processing (e.g., audio FFT processing, data simulation) to keep the main thread fluid at 120 FPS.
3. **WebGPU Compute & Render Layer**: Custom WGSL shaders implementing the Eulerian Navier-Stokes fluid-dynamics solver coupled with a 2,500,000 autonomous data-entity flocking algorithm. Employs uniform buffers for HUD configuration parameters and audio FFT data.

```
+-------------------------------------------------------------+
|                        React 19 UI                          |
|  [Zustand Store] --(Direct uniform updates)--> [WebGPU Dev] |
|        |                                             |      |
|  [Mic Input] -> [Web Audio API (FFT)] ---------------/      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      WebGPU Pipelines                       |
|   [Compute: Navier-Stokes Grid + Boids flocking]            |
|   [Render: Terrain Mesh + 2.5M Particles + Postprocess]     |
+-------------------------------------------------------------+
```

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Project Setup & Scaffolding | Initialize Vite + React 19 + TypeScript + Tailwind + WebGPU workspace. | None | DONE |
| M2 | WebGPU Topography & Compute | Generate Burnaby BC terrain mesh. Custom Navier-Stokes + Boids compute shaders for 2.5M particles. | M1 | DONE |
| M3 | Audio DSP Integration | Web Audio API mic input and simulated FFT pulses mapping frequencies to uniforms. | M1, M2 | DONE |
| M4 | Glassmorphism HUD | Float HUD component linked directly to WebGPU uniform buffers via Zustand. | M1, M2, M3 | DONE |
| M5 | Final E2E Test & Verification | Pass 100% E2E test suite (Tiers 1-4) and run Adversarial coverage hardening. | All Milestones | DONE |

## Interface Contracts

### Zustand Store ↔ WebGPU Uniforms
- **Inputs**: `tectonicVolatility`, `fluidViscosity`, `flockingCohesion`, `audioSensitivity`
- **Output**: Writes direct binary representations (Float32Array) to GPUBuffers.
- **Sync mechanism**: Zustand subscription updates WebGPU buffer via `device.queue.writeBuffer()`.

### Web Audio API ↔ WebGPU Compute Shader
- **FFT Data**: Float32Array containing frequency spectrum bins (typically 128 or 256 coefficients).
- **Buffer Layout**: GPUBuffer containing:
  - `bass_amplitude`: float32
  - `treble_amplitude`: float32
  - `frequency_bins`: array<f32, 128>

## Code Layout
```
/
├── .agents/                    # Coordination metadata only (no code/tests)
├── src/
│   ├── assets/                 # Topographic data and textures
│   ├── components/             # React visual components (HUD, Canvas viewport)
│   ├── shaders/                # Raw WGSL shader files
│   │   ├── compute.wgsl        # Navier-Stokes + flocking compute shader
│   │   └── postprocess.wgsl    # Chromatic aberration render shader
│   ├── store/                  # Zustand store for state management
│   ├── workers/                # Web worker for audio analysis or data processing
│   ├── App.tsx                 # Main application structure
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind CSS imports
├── tests/                      # E2E test cases and harness files
├── index.html                  # HTML entry point
├── package.json                # Project dependencies
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite bundler configuration
└── tailwind.config.js          # Tailwind CSS utility configuration
```
