import { create, UseBoundStore, StoreApi } from 'zustand';

// Zustand store contract matching R4/F4/F5 requirements
export interface UIStore {
  // Config parameters
  tectonicVolatility: number;
  fluidViscosity: number;
  flockingCohesion: number;
  audioSensitivity: number;
  
  // Audio-reactive state variables
  bassAmplitude: number;
  trebleAmplitude: number;
  gravityInverted: boolean;
  tectonicOffset: number;
  chromaticAberrationIntensity: number;
  activeColorPalette: 'cyan' | 'magenta';
  frequencyBins: number[];

  // Setters
  setTectonicVolatility: (val: number) => void;
  setFluidViscosity: (val: number) => void;
  setFlockingCohesion: (val: number) => void;
  setAudioSensitivity: (val: number) => void;
  setGravityInverted: (val: boolean) => void;
  setAudioData: (bass: number, treble: number, bins: number[]) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  tectonicVolatility: 0.5,
  fluidViscosity: 0.2,
  flockingCohesion: 0.7,
  audioSensitivity: 0.8,
  
  bassAmplitude: 0.0,
  trebleAmplitude: 0.0,
  gravityInverted: false,
  tectonicOffset: 0.0,
  chromaticAberrationIntensity: 0.0,
  activeColorPalette: 'cyan',
  frequencyBins: Array(128).fill(0),

  setTectonicVolatility: (val) => set((state) => {
    const sanitized = typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)
      ? state.tectonicVolatility
      : Math.max(0, Math.min(1, val));
    return { tectonicVolatility: sanitized };
  }),
  setFluidViscosity: (val) => set((state) => {
    const sanitized = typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)
      ? state.fluidViscosity
      : Math.max(0, Math.min(1, val));
    return { fluidViscosity: sanitized };
  }),
  setFlockingCohesion: (val) => set((state) => {
    const sanitized = typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)
      ? state.flockingCohesion
      : Math.max(0, Math.min(1, val));
    return { flockingCohesion: sanitized };
  }),
  setAudioSensitivity: (val) => set((state) => {
    const sanitized = typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)
      ? state.audioSensitivity
      : Math.max(0, Math.min(1, val));
    return { audioSensitivity: sanitized };
  }),
  setGravityInverted: (val) => set({ gravityInverted: !!val }),
  setAudioData: (bass, treble, bins) => set((state) => {
    // Tectonic offset scales with bass * audioSensitivity
    const effBass = bass * state.audioSensitivity;
    const tectonicOffset = effBass * 0.9;
    const gravityInverted = effBass > 0.5;

    // Chromatic aberration scales with treble * audioSensitivity
    const effTreble = treble * state.audioSensitivity;
    const chromaticAberrationIntensity = effTreble * 0.9;
    const activeColorPalette = effTreble > 0.5 ? 'magenta' : 'cyan';

    return {
      bassAmplitude: bass,
      trebleAmplitude: treble,
      gravityInverted,
      tectonicOffset,
      chromaticAberrationIntensity,
      activeColorPalette,
      frequencyBins: bins
    };
  })
}));

declare global {
  interface Window {
    __store?: UseBoundStore<StoreApi<UIStore>>;
  }
}

// Expose store globally for E2E verification
if (typeof window !== 'undefined') {
  window.__store = useUIStore;
}
