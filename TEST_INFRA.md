# Test Infrastructure and Methodology (TEST_INFRA.md)

This document details the E2E testing infrastructure, methodology, feature inventory, test architecture, real-world application scenarios, and coverage thresholds for the Burnaby Neuromancer project.

---

## 1. Test Philosophy

The Burnaby Neuromancer E2E testing framework employs an **opaque-box**, **requirement-driven** testing methodology. Under this model:
* **Opaque-Box Testing**: The E2E tests interact with the application as a black box. The tests evaluate the system from the outside by initiating browser contexts, triggering DOM events, manipulating HUD range sliders via direct inputs/mouse drags, and feeding simulated audio frequency spectra (bass and treble) into the Web Audio processing pipeline.
* **Requirement-Driven Assertions**: Each test case maps directly to concrete features and boundary conditions defined in `PROJECT.md` and `SCOPE.md`. Assertions verify expected behaviors, such as uniform buffer changes via Zustand stores, Web Audio AnalyserNode configurations, CSS glassmorphism styles, viewport layout boundaries (verifying HUD bounds on desktop, mobile, and landscape viewports), and correct rendering fallback states when WebGPU is unavailable or disabled.
* **Non-Intrusive Test Hooks**: The tests use minimal, non-invasive global hooks exposed on the `window` object (such as `window.__store`, `window.__webgpu_test_hook`, and `window.__injectMockFFT`) to perform state verification without polluting production business logic.

---

## 2. Feature Inventory

The following table inventories the primary features mapped against their source files and the corresponding E2E test suites across Tiers 1 to 3:

| # | Feature | Source | Tier 1 (Feature Coverage) | Tier 2 (Boundary & Corner) | Tier 3 (Cross-Feature/Integration) |
|---|---|---|---|---|---|
| **F1** | **Topography Mesh** | `src/components/Viewport.tsx` | `tests/tier1-features/topography.spec.ts` | `tests/tier2-boundary/topography-boundary.spec.ts` | `tests/tier3-integration/integration.spec.ts` |
| **F2** | **WebGPU Fluid/Traffic Compute** | `src/utils/WebGPUManager.ts` | `tests/tier1-features/compute.spec.ts` | `tests/tier2-boundary/compute-boundary.spec.ts` | `tests/tier3-integration/integration.spec.ts` |
| **F3** | **Real-Time Audio DSP** | `src/App.tsx` | `tests/tier1-features/audio.spec.ts` | `tests/tier2-boundary/audio-boundary.spec.ts` | `tests/tier3-integration/integration.spec.ts` |
| **F4** | **Audio-Reactive Visualization** | `src/components/Viewport.tsx` | `tests/tier1-features/reactive.spec.ts` | `tests/tier2-boundary/reactive-boundary.spec.ts` | `tests/tier3-integration/integration.spec.ts` |
| **F5** | **Floating Glassmorphism HUD** | `src/App.tsx` | `tests/tier1-features/hud.spec.ts` | `tests/tier2-boundary/hud-boundary.spec.ts` | `tests/tier3-integration/integration.spec.ts` |
| **F6** | **Headless Verification/Reporting** | `tests/helpers/` & Mocks | `tests/tier1-features/headless.spec.ts` | `tests/tier2-boundary/headless-boundary.spec.ts` | Covered in E2E setup and helper scripts |

---

## 3. Test Architecture

The E2E test architecture is structured to support isolated, headless, WebGPU-capable browser execution using Playwright.

### Directory Layout
The tests and supporting infrastructure are organized as follows:
```
tests/
├── helpers/
│   ├── perf.ts                     # Telemetry class for measuring FPS and frame time averages
│   ├── slider.ts                   # Helpers for direct DOM input updates and mouse slider drags
│   └── window-types.ts             # TypeScript definitions for injected window properties
├── mocks/
│   ├── audio-mock.ts               # Injected mock for AudioContext, AnalyserNode, and getUserMedia
│   └── webgpu-mock.ts              # Injected mock for WebGPU APIs to allow headless checks
├── tier1-features/                 # Normal operation tests for F1 to F6 (Tests 1 to 30)
├── tier2-boundary/                 # Edge cases and error fallbacks for F1 to F6 (Tests 31 to 60)
├── tier3-integration/              # Cross-feature and pairwise integration tests (Tests 61 to 66)
├── tier4-scenarios/                # Real-world acceptance scenario tests (Tests 67 to 71)
├── challenger-verification.spec.ts # Layout responsiveness and failure paths tests
└── infra-checks.spec.ts            # E2E scaffolding and audio/webgpu mock tests
```

### Test Invocation and Configuration
* **Test Runner**: Playwright E2E Test Suite (`@playwright/test`).
* **Command**: `npm run test:e2e` (internally invokes `playwright test`).
* **Browser Hooking & Mocks**:
  * **Audio Mocking**: Playwright injects an audio override script (`tests/mocks/audio-mock.ts`) during page setup. This script mocks `navigator.mediaDevices.getUserMedia` and the `AudioContext` / `AnalyserNode` APIs. It exposes a control hook (`window.__injectMockFFT`) allowing the tests to dynamically set frequency bands (bass/treble) and trace interactions via `window.__audioMockTrace`.
  * **WebGPU Mocking**: If the host runner lacks physical GPU/WebGPU access, the tests inject `tests/mocks/webgpu-mock.ts` to fake the adapter, device, compute limits, and shader modules. This exposes `window.__webgpu_test_hook` for asserting correct configuration inputs.
* **Telemetry & Screen Verification**:
  * **Frame Performance**: An injected requestAnimationFrame loop measures frame-to-frame intervals, calculating average FPS, p95 frame latency, and logging software vs hardware rendering.
  * **Image Export**: Generates verification screenshots (e.g., `burnaby_neuromancer_verified.png`) for visual analysis and attestation.

---

## 4. Real-World Application Scenarios

The Tier 4 tests model multi-step end-to-end sessions reproducing actual user behaviors and stress environments:

| Scenario | Complexity | Features Checked | Scenario Description |
|---|---|---|---|
| **Scenario 1: Standard Interactive Session** | Medium | F3, F5, F4 | User loads the application, activates the microphone, verifies HUD slider inputs (adjusting viscosity, cohesion, volatility), and checks that uniforms update properly in response. |
| **Scenario 2: Dynamic Live Music Event** | High | F3, F4, F5 | Simulates a live music sequence with alternating heavy bass drops and high-frequency synth peaks. Verifies real-time updates to tectonic offsets, chromatic aberration, and particle speeds. |
| **Scenario 3: Stress Benchmark under Load** | High | F2, F4, F5, F6 | Sets all parameters (volatility, cohesion, sensitivity) to maximum with loud bass. Profiles frame latency over 5 seconds to analyze rendering efficiency. |
| **Scenario 4: Browser Recovery** | High | F1, F2, F5 | Triggers a simulated WebGPU device context loss mid-session. Verifies the application's ability to rebuild pipelines, reinitialize uniform buffers, and resume controls gracefully. |
| **Scenario 5: Headless E2E Verification** | Medium | F3, F5, F6 | Simulates a full automated pipeline run: grants mic access, feeds a 60Hz audio tone, increases tectonic volatility to maximum, measures FPS, and exports the final `burnaby_neuromancer_verified.png` verification image. |

---

## 5. Coverage Thresholds

To maintain release readiness, the testing track enforces the following coverage thresholds:
* [x] **Tier 1 (Feature Coverage)**: 100% of core normal-operation test cases executed. (Milestone 2 specific tests are parsed and verified but skipped until WebGPU topography/compute shaders are integrated).
* [x] **Tier 2 (Boundary & Corner Cases)**: 100% boundary check coverage. Verifies clamping limits, silent/loud input safety, denied microphone fallbacks, and window resizes.
* [x] **Tier 3 (Integration Tests)**: Pairwise coverage for all major cross-feature interactions (Zustand HUD to shader uniforms, Audio FFT to reactive visual offsets, particle-terrain mesh collisions).
* [x] **Tier 4 (Acceptance Scenarios)**: 100% pass rate on all 5 real-world user scenarios, including stress performance benchmarking and context loss recovery.
