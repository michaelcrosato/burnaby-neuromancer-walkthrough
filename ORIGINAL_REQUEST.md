# Original User Request

## 2026-06-21T00:33:57Z

"Burnaby Neuromancer" is a WebGPU-accelerated, audio-reactive 3D fluid-dynamics and traffic routing ecosystem mapping real-time data over local topography.

Working directory: `C:\Users\micha\.gemini\antigravity\scratch\burnaby_neuromancer`
Integrity mode: development

## Requirements

### R1. Architecture & Scaffolding
Initialize a Vite + React 19 + TypeScript + WebGPU workspace. Strictly separate the React UI layer, Web Worker threads, and raw WGSL compute shaders. Install `three`, `@react-three/fiber`, `zustand`, and `tailwindcss`.

### R2. Topography & Compute (WGSL)
Procedurally generate a mathematically accurate 3D topographic mesh representing the real-world elevation map of Burnaby, BC. Implement a custom WebGPU compute shader executing a Navier-Stokes Eulerian fluid dynamics solver fused with a multi-agent Boids flocking algorithm for exactly 2,500,000 autonomous data-entities routing around the Burnaby terrain at 120 FPS.

### R3. Real-Time Audio DSP Integration
Capture microphone input via Web Audio API. Perform FFT analysis and pipe frequency spectrum to WebGPU uniform buffers. Low-frequency bass drives physical tectonic shifts and gravity inversions; high-frequency treble triggers chromatic aberration, shifting fluid entities from deep bioluminescent cyan to blinding neon magenta based on kinetic velocity.

### R4. Reactive Glassmorphism HUD
A floating, zero-latency React control dashboard using deep CSS glassmorphism. Sliders control Tectonic Volatility, Fluid Viscosity, Flocking Cohesion, and Audio Sensitivity, bound via a Zustand store directly to GPU uniforms to prevent React re-renders from bottlenecking the graphics pipeline.

### R5. Agentic Orchestration & Self-Healing Loop
Autonomously run dependency installation and Vite dev server. Monitor stdout/stderr. Autonomously resolve WebGPU device limits, WGSL memory alignment errors, or TS strict-mode violations by parsing stack traces, rewriting failing modules, and hot-reloading.

### R6. Headless Verification & Hand-off
Navigate to localhost using a browser sub-agent, grant mic permissions, inject simulated 60Hz sine wave audio pulse, simulate dragging "Tectonic Volatility" to max for 5 seconds. Measure frame times via PerformanceObserver to verify particle threshold performance. Save a screenshot to the root directory as `burnaby_neuromancer_verified.png`.

## Acceptance Criteria

### Performance & Compilation
- [ ] Compiles successfully with zero TypeScript strict-mode warnings.
- [ ] Runs Vite dev server and hot-reloads properly.
- [ ] Navier-Stokes and Boids fluid-dynamics computed via WebGPU compute shaders.
- [ ] Target particle count of 2,500,000 data-entities runs on GPU.

### Audio & Interaction
- [ ] Web Audio API successfully captures microphone or simulated input.
- [ ] Tectonic shifts and chromatic aberration react dynamically to FFT frequencies.
- [ ] Floating glassmorphism HUD updates Zustand store which updates GPU uniforms directly.

### Verification
- [ ] Programmatic validation runs in headless browser, measures frame times, and exports `burnaby_neuromancer_verified.png` showing the chaotic fluid reacting to Burnaby terrain.

## 2026-06-21T00:47:51Z

Burnaby Neuromancer is a WebGPU-accelerated, audio-reactive 3D fluid-dynamics and traffic routing ecosystem mapping real-time data over Burnaby topography. It includes a Vite + React + TypeScript web application utilizing WebGPU compute shaders, Web Audio API DSP, and a CSS glassmorphic control HUD, verified via headless browser simulation.

Working directory: C:\Users\micha\.gemini\antigravity\scratch\burnaby_neuromancer
Integrity mode: demo

## Requirements

### R1. Architecture & Scaffold
Initialize a Vite + React 19 + TypeScript + WebGPU workspace at the working directory. Configure the build environment to separate the React UI layer, Web Worker threads, and raw WGSL compute shaders. Install `three`, `@react-three/fiber`, `zustand`, and `tailwindcss`.

### R2. Topography & WebGPU Compute (WGSL)
Procedurally generate a mathematically accurate 3D topographic mesh representing the real-world elevation map of Burnaby, British Columbia. Bypass standard CPU rendering entirely. Write custom WebGPU compute shaders implementing a Navier-Stokes Eulerian fluid dynamics solver fused with a multi-agent Boids flocking algorithm. The GPU must calculate advection, diffusion, and collision avoidance for exactly 2,500,000 autonomous data-entities routing around the Burnaby terrain at 120 FPS.

### R3. Real-Time Audio DSP
Instantiate the Web Audio API to capture device microphone input. Perform real-time FFT analysis and pipe the spectrum data into WebGPU uniform buffers. Low frequencies (bass) must drive tectonic shifts/gravity inversions in the topography, while high frequencies (treble) trigger chromatic aberration, shifting fluid entity color from bioluminescent cyan to neon magenta based on kinetic velocity.

### R4. Glassmorphism HUD & Uniform State
Create a floating, zero-latency React control dashboard overlaid on the canvas using CSS glassmorphism. Include interactive sliders for Tectonic Volatility, Fluid Viscosity, Flocking Cohesion, and Audio Sensitivity. Bind these controls via a Zustand store directly to GPU uniforms, bypassing React re-render performance bottlenecks.

### R5. Agentic Orchestration & Self-Healing
Autonomously run the dev server, monitor for WebGPU limits, WGSL alignment errors, or TS violations, and self-heal compilation/runtime errors.

### R6. Verification & Hand-off
Verify programmatically by navigating a browser to localhost, auto-granting microphone access, injecting a simulated 60Hz audio pulse, simulating a max "Tectonic Volatility" slider state, measuring frame rates via PerformanceObserver (ensuring frame rate is stable under the 2.5M particle load), and saving a high-resolution screenshot as `burnaby_neuromancer_verified.png` in the root directory.

## Acceptance Criteria

### Project Implementation & Environment
- [ ] Vite dev server starts successfully with zero TypeScript compilation warnings or WGSL syntax errors.
- [ ] Core libraries (`three`, `@react-three/fiber`, `zustand`, `tailwindcss`) are installed and functional.

### Graphics & Simulation Performance
- [ ] WebGPU compute shader executes Navier-Stokes + Boids simulation for 2.5 million entities.
- [ ] Topographic mesh accurately represents Burnaby terrain.
- [ ] Frame rate is verified to remain stable under simulation load.

### Audio & UI Interaction
- [ ] Web Audio API reads microphone/simulated input and updates WebGPU uniforms in real-time.
- [ ] Bass inputs visually deform the terrain mesh; treble/velocity shifts particle colors.
- [ ] CSS glassmorphism HUD successfully updates Zustand store parameters which bind directly to WebGPU uniforms without lag.

### Verification Screenshot
- [ ] A verification screenshot named `burnaby_neuromancer_verified.png` is generated and saved to the project root directory showing the simulation running.
