import { useUIStore } from '../store/useUIStore';

interface HUDProps {
  micActive: boolean;
  micLoading: boolean;
  toggleMicrophone: () => void;
}

export function HUD({ micActive, micLoading, toggleMicrophone }: HUDProps) {
  // Select store values individually to prevent over-rendering on unrelated state changes
  const tectonicVolatility = useUIStore((s) => s.tectonicVolatility);
  const setTectonicVolatility = useUIStore((s) => s.setTectonicVolatility);

  const fluidViscosity = useUIStore((s) => s.fluidViscosity);
  const setFluidViscosity = useUIStore((s) => s.setFluidViscosity);

  const flockingCohesion = useUIStore((s) => s.flockingCohesion);
  const setFlockingCohesion = useUIStore((s) => s.setFlockingCohesion);

  const audioSensitivity = useUIStore((s) => s.audioSensitivity);
  const setAudioSensitivity = useUIStore((s) => s.setAudioSensitivity);

  const gravityInverted = useUIStore((s) => s.gravityInverted);
  const setGravityInverted = useUIStore((s) => s.setGravityInverted);

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 max-w-sm z-10 max-h-[calc(100vh-2rem)] overflow-y-auto p-6 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-md shadow-2xl text-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-sm font-bold tracking-widest text-emerald-400 font-mono">SYSTEM HUD // ACTIVE</h1>
        <button
          data-testid="enable-mic-button"
          onClick={toggleMicrophone}
          disabled={micLoading}
          className="text-[10px] border px-2 py-1 rounded"
        >
          {micLoading ? 'LOADING...' : micActive ? 'MIC ACTIVE' : 'MIC'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-mono">
            <span>TECTONIC</span>
            <span>{(tectonicVolatility * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            data-testid="tectonic-volatility"
            min="0"
            max="1"
            step="0.01"
            value={tectonicVolatility}
            onChange={(e) => setTectonicVolatility(parseFloat(e.target.value))}
            className="w-full h-1 accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono">
            <span>VISCOSITY</span>
            <span>{(fluidViscosity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            data-testid="fluid-viscosity"
            min="0"
            max="1"
            step="0.01"
            value={fluidViscosity}
            onChange={(e) => setFluidViscosity(parseFloat(e.target.value))}
            className="w-full h-1 accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono">
            <span>COHESION</span>
            <span>{(flockingCohesion * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            data-testid="flocking-cohesion"
            min="0"
            max="1"
            step="0.01"
            value={flockingCohesion}
            onChange={(e) => setFlockingCohesion(parseFloat(e.target.value))}
            className="w-full h-1 accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono">
            <span>SENSITIVITY</span>
            <span>{(audioSensitivity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            data-testid="audio-sensitivity"
            min="0"
            max="1"
            step="0.01"
            value={audioSensitivity}
            onChange={(e) => setAudioSensitivity(parseFloat(e.target.value))}
            className="w-full h-1 accent-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono pt-2">
          <span>GRAVITY INVERSION</span>
          <input
            type="checkbox"
            data-testid="gravity-inversion"
            checked={gravityInverted}
            disabled={micActive}
            onChange={(e) => setGravityInverted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
