import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useUIStore } from './store/useUIStore';
import { WebGPUManager, WebGPUStatus } from './utils/WebGPUManager';
import { WebGPUPipeline } from './utils/WebGPUPipeline';
import { HUD } from './components/HUD';

const Viewport = React.lazy(() => import('./components/Viewport'));

export default function App() {
  const [webGpuStatus, setWebGpuStatus] = useState<WebGPUStatus>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const isAudioActiveRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const setAudioData = useUIStore((s) => s.setAudioData);

  const cleanupAudio = () => {
    isAudioActiveRef.current = false;
    isInitializingRef.current = false;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // Already stopped or not started
      }
      try {
        oscillatorRef.current.disconnect();
      } catch {
        // Ignored
      }
      oscillatorRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch {
        // Ignored
      }
      streamRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // Ignored
      }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignored
      }
      audioContextRef.current = null;
    }

    setMicActive(false);
    setMicLoading(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;
    const manager = WebGPUManager.getInstance();

    async function initWebGPU() {
      try {
        await manager.initialize();
        if (manager.getStatus() === 'supported') {
          await WebGPUPipeline.getInstance().initialize(manager.getDevice());
          if (active) {
            setWebGpuStatus('supported');
            setErrorMessage('');
          }
        } else {
          if (active) {
            setWebGpuStatus('unsupported');
            setErrorMessage(manager.getErrorMessage());
          }
        }
      } catch (err: any) {
        console.error('[App] WebGPU initialization failed:', err);
        if (active) {
          setWebGpuStatus('unsupported');
          setErrorMessage(err instanceof Error ? err.message : String(err));
        }
      }
    }

    initWebGPU();

    manager.onDeviceLost(async () => {
      console.warn('[App] WebGPU device lost detected. Recovering...');
      WebGPUPipeline.getInstance().destroy();
      try {
        await manager.initialize();
        if (manager.getStatus() === 'supported') {
          await WebGPUPipeline.getInstance().initialize(manager.getDevice());
          if (active) {
            setWebGpuStatus('supported');
            setErrorMessage('');
          }
        } else {
          if (active) {
            setWebGpuStatus('unsupported');
            setErrorMessage(manager.getErrorMessage());
          }
        }
      } catch (err: any) {
        console.error('[App] WebGPU recovery failed:', err);
        if (active) {
          setWebGpuStatus('unsupported');
          setErrorMessage(err instanceof Error ? err.message : String(err));
        }
      }
    });

    let frameId: number;
    function loop() {
      WebGPUPipeline.getInstance().step();
      frameId = requestAnimationFrame(loop);
    }
    frameId = requestAnimationFrame(loop);

    return () => {
      isMountedRef.current = false;
      active = false;
      cancelAnimationFrame(frameId);
      cleanupAudio();
      WebGPUPipeline.getInstance().destroy();
    };
  }, []);

  async function enableMicrophone() {
    if (isAudioActiveRef.current || isInitializingRef.current) return;
    isInitializingRef.current = true;
    setMicLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch {
            // Ignored
          }
        }
        return;
      }
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      ctx.createMediaStreamSource(stream).connect(analyser);

      await ctx.resume();
      if (!isMountedRef.current) {
        cleanupAudio();
        return;
      }

      isAudioActiveRef.current = true;
      isInitializingRef.current = false;
      setMicActive(true);
      setMicLoading(false);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const sampleRate = ctx.sampleRate;
      const fftSize = analyser.fftSize;
      const binWidth = sampleRate / fftSize;
      const binCount = analyser.frequencyBinCount;
      const bassStart = Math.max(0, Math.min(binCount - 1, Math.floor(20 / binWidth)));
      const bassEnd = Math.max(bassStart + 1, Math.min(binCount, Math.ceil(250 / binWidth)));
      const trebleStart = Math.max(0, Math.min(binCount - 1, Math.floor(4000 / binWidth)));
      const trebleEnd = Math.max(trebleStart + 1, Math.min(binCount, Math.ceil(16000 / binWidth)));

      function update() {
        if (!isAudioActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const bass = Math.max(0.0, Math.min(1.0, Math.max(...Array.from(dataArray.slice(bassStart, bassEnd))) / 255));
        const treble = Math.max(0.0, Math.min(1.0, Math.max(...Array.from(dataArray.slice(trebleStart, trebleEnd))) / 255));
        setAudioData(bass, treble, Array.from(dataArray));
        animationFrameId.current = requestAnimationFrame(update);
      }
      update();
    } catch (e) {
      console.warn('Microphone permission denied. Falling back to silent 60Hz oscillator.', e);
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.connect(analyser);
        oscillatorRef.current = osc;
        osc.start();

        if (!isMountedRef.current) {
          if (audioContextRef.current) {
            try {
              audioContextRef.current.close();
            } catch {
              // Ignored
            }
          }
          return;
        }

        isAudioActiveRef.current = true;
        isInitializingRef.current = false;
        setMicActive(true);
        setMicLoading(false);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const sampleRate = ctx.sampleRate;
        const fftSize = analyser.fftSize;
        const binWidth = sampleRate / fftSize;
        const binCount = analyser.frequencyBinCount;
        const bassStart = Math.max(0, Math.min(binCount - 1, Math.floor(20 / binWidth)));
        const bassEnd = Math.max(bassStart + 1, Math.min(binCount, Math.ceil(250 / binWidth)));
        const trebleStart = Math.max(0, Math.min(binCount - 1, Math.floor(4000 / binWidth)));
        const trebleEnd = Math.max(trebleStart + 1, Math.min(binCount, Math.ceil(16000 / binWidth)));

        function update() {
          if (!isAudioActiveRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const bass = Math.max(0.0, Math.min(1.0, Math.max(...Array.from(dataArray.slice(bassStart, bassEnd))) / 255));
          const treble = Math.max(0.0, Math.min(1.0, Math.max(...Array.from(dataArray.slice(trebleStart, trebleEnd))) / 255));
          setAudioData(bass, treble, Array.from(dataArray));
          animationFrameId.current = requestAnimationFrame(update);
        }
        update();
      } catch (err) {
        console.error('Failed to initialize fallback oscillator:', err);
        isInitializingRef.current = false;
        setMicLoading(false);
      }
    }
  }

  async function toggleMicrophone() {
    if (micActive) {
      cleanupAudio();
    } else {
      await enableMicrophone();
    }
  }

  if (webGpuStatus === 'checking') {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-950 text-white font-mono" data-testid="webgpu-fallback-checking">
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-400 font-semibold tracking-wider animate-pulse">INITIALIZING NEUROMANCER CORE...</p>
        </div>
      </div>
    );
  }

  if (webGpuStatus === 'unsupported') {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-950 text-white p-4 font-mono" data-testid="webgpu-fallback">
        <div className="max-w-md p-8 rounded-2xl bg-red-950/20 border border-red-500/30 backdrop-blur-xl shadow-2xl text-center">
          <div className="text-red-500 text-5xl mb-4 font-sans font-bold">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 tracking-wide uppercase mb-2">WebGPU Initialization Failed</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Suspense fallback={
          <div className="flex items-center justify-center w-full h-full bg-slate-950 text-white font-mono">
            <p className="text-cyan-400 font-semibold tracking-wider animate-pulse">LOADING 3D SCENE...</p>
          </div>
        }>
          <Viewport />
        </Suspense>
      </div>
      <HUD
        micActive={micActive}
        micLoading={micLoading}
        toggleMicrophone={toggleMicrophone}
      />
    </div>
  );
}
