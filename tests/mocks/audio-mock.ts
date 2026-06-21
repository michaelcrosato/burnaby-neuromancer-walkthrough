interface MockAudioState {
  bass: number;
  treble: number;
  mids: number;
  bins: number[] | null;
}

interface AudioMockTrace {
  audioContextCreated: boolean;
  getUserMediaCalled: boolean;
  analyserCreated: boolean;
  getByteFrequencyDataCalls: number;
  getFloatFrequencyDataCalls: number;
  lastFftSize: number;
  lastConstraints: MediaStreamConstraints | null;
}

declare global {
  interface Window {
    __mockAudioState: MockAudioState;
    __audioMockTrace: AudioMockTrace;
    __injectMockFFT: (config: { bass?: number; treble?: number; mids?: number; bins?: number[] }) => void;
  }
}

/**
 * Playwright E2E Web Audio & Mic Mocking Script
 * 
 * Inject this script during page initialization via `page.addInitScript` to mock
 * the Web Audio API and media stream hooks, giving full deterministic control to E2E tests.
 */
export function injectAudioMock() {
  // 1. Initialize Mock State & Telemetry Trace
  window.__mockAudioState = {
    bass: 0.0,
    treble: 0.0,
    mids: 0.0,
    bins: null,
  };

  window.__audioMockTrace = {
    audioContextCreated: false,
    getUserMediaCalled: false,
    analyserCreated: false,
    getByteFrequencyDataCalls: 0,
    getFloatFrequencyDataCalls: 0,
    lastFftSize: 0,
    lastConstraints: null,
  };

  // 2. Global Hook for Dynamic Spectrum Adjustments
  window.__injectMockFFT = (config: {
    bass?: number;
    treble?: number;
    mids?: number;
    bins?: number[];
  }) => {
    const state = window.__mockAudioState;
    if (config.bass !== undefined) state.bass = config.bass;
    if (config.treble !== undefined) state.treble = config.treble;
    if (config.mids !== undefined) state.mids = config.mids;
    if (config.bins !== undefined) state.bins = config.bins;
  };

  // Helper function to fill array with mock values
  function populateMockFrequencies(array: Uint8Array | Float32Array, fftSize: number, isFloat: boolean) {
    const binCount = fftSize / 2;
    const size = Math.min(array.length, binCount);
    const state = window.__mockAudioState;
    const minDb = -100; // AnalyserNode.minDecibels default
    const maxDb = -30;  // AnalyserNode.maxDecibels default
    const dbRange = maxDb - minDb;

    const sampleRate = (window as any).__mockSampleRate || 48000;
    const binWidth = sampleRate / fftSize;

    const bassStart = Math.max(0, Math.min(binCount - 1, Math.floor(20 / binWidth)));
    const bassEnd = Math.max(bassStart + 1, Math.min(binCount, Math.ceil(250 / binWidth)));
    const trebleStart = Math.max(0, Math.min(binCount - 1, Math.floor(4000 / binWidth)));
    const trebleEnd = Math.max(trebleStart + 1, Math.min(binCount, Math.ceil(16000 / binWidth)));

    for (let i = 0; i < size; i++) {
      let normVal: number;

      if (state.bins && state.bins[i] !== undefined) {
        // Direct array override
        normVal = state.bins[i];
      } else {
        // Fallback to frequency ranges
        if (i >= bassStart && i < bassEnd) {
          const factor = (bassEnd - 1 - bassStart) > 0 ? (bassEnd - 1 - i) / (bassEnd - 1 - bassStart) : 1.0;
          normVal = state.bass * factor;
        } else if (i >= trebleStart && i < trebleEnd) {
          const factor = (trebleEnd - 1 - trebleStart) > 0 ? (i - trebleStart) / (trebleEnd - 1 - trebleStart) : 1.0;
          normVal = state.treble * factor;
        } else {
          // Mid range: small background noise
          normVal = state.mids * (0.05 + Math.random() * 0.05);
        }
      }

      // Clamp value safely between 0.0 and 1.0
      normVal = Math.max(0.0, Math.min(1.0, normVal));

      if (isFloat) {
        // Map 0..1 to decibel range (-100dB to -30dB)
        array[i] = minDb + normVal * dbRange;
      } else {
        // Map 0..1 to byte range (0 to 255)
        array[i] = Math.round(normVal * 255);
      }
    }
  }

  // 3. Mock AudioParam Interface
  class MockAudioParam {
    value: number;
    constructor(initialValue = 1.0) {
      this.value = initialValue;
    }
    setValueAtTime(value: number, _time: number) { this.value = value; void _time; return this; }
    linearRampToValueAtTime(value: number, _time: number) { this.value = value; void _time; return this; }
    exponentialRampToValueAtTime(value: number, _time: number) { this.value = value; void _time; return this; }
    setTargetAtTime(target: number, _startTime: number, _timeConstant: number) { this.value = target; void _startTime; void _timeConstant; return this; }
    setValueCurveAtTime(values: Float32Array, _startTime: number, _duration: number) { this.value = values[values.length - 1]; void _startTime; void _duration; return this; }
    cancelScheduledValues(_cancelTime: number) { void _cancelTime; return this; }
    cancelAndHoldAtTime(_cancelTime: number) { void _cancelTime; return this; }
  }

  // 4. Mock AudioNode Base class
  class MockAudioNode {
    numberOfInputs = 1;
    numberOfOutputs = 1;
    channelCount = 2;
    channelCountMode = 'max';
    channelInterpretation = 'speakers';

    connect(destination: AudioNode | AudioParam, _output?: number, _input?: number): AudioNode | AudioParam { void _output; void _input; return destination; }
    disconnect() {}
  }

  // 5. Mock AnalyserNode
  class MockAnalyserNode extends MockAudioNode {
    fftSize = 256;
    minDecibels = -100;
    maxDecibels = -30;
    smoothingTimeConstant = 0.8;

    constructor() {
      super();
      window.__audioMockTrace.analyserCreated = true;
    }

    get frequencyBinCount() {
      return this.fftSize / 2;
    }

    getByteFrequencyData(array: Uint8Array) {
      window.__audioMockTrace.getByteFrequencyDataCalls++;
      window.__audioMockTrace.lastFftSize = this.fftSize;
      populateMockFrequencies(array, this.fftSize, false);
    }

    getFloatFrequencyData(array: Float32Array) {
      window.__audioMockTrace.getFloatFrequencyDataCalls++;
      window.__audioMockTrace.lastFftSize = this.fftSize;
      populateMockFrequencies(array, this.fftSize, true);
    }

    getByteTimeDomainData(array: Uint8Array) {
      // Return flat silence (centered at 128)
      for (let i = 0; i < array.length; i++) array[i] = 128;
    }

    getFloatTimeDomainData(array: Float32Array) {
      // Return flat silence (centered at 0.0)
      for (let i = 0; i < array.length; i++) array[i] = 0.0;
    }
  }

  class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam(1.0);
  }

  class MockBiquadFilterNode extends MockAudioNode {
    frequency = new MockAudioParam(350);
    detune = new MockAudioParam(0);
    Q = new MockAudioParam(1);
    gain = new MockAudioParam(0);
    type = 'lowpass';
  }

  class MockDelayNode extends MockAudioNode {
    delayTime = new MockAudioParam(0);
  }

  class MockOscillatorNode extends MockAudioNode {
    frequency = new MockAudioParam(440);
    detune = new MockAudioParam(0);
    type: OscillatorType = 'sine';
    start() {}
    stop() {}
  }

  class MockAudioBufferSourceNode extends MockAudioNode {
    buffer: AudioBuffer | null = null;
    playbackRate = new MockAudioParam(1.0);
    loop = false;
    loopStart = 0;
    loopEnd = 0;
    start() {}
    stop() {}
  }

  // 6. Mock AudioContext
  class MockAudioContext {
    state = 'suspended';
    get sampleRate() {
      return (window as any).__mockSampleRate || 48000;
    }
    set sampleRate(val: number) {
      (window as any).__mockSampleRate = val;
    }
    currentTime = 0;
    destination = new MockAudioNode();
    listener = {};
    onstatechange: (() => void) | null = null;
    private _timer: ReturnType<typeof setInterval> | undefined;

    constructor() {
      window.__audioMockTrace.audioContextCreated = true;
      this._timer = setInterval(() => {
        if (this.state === 'running') {
          this.currentTime += 0.1;
        }
      }, 100);
    }

    resume() {
      this.state = 'running';
      if (this.onstatechange) this.onstatechange();
      return Promise.resolve();
    }

    suspend() {
      this.state = 'suspended';
      if (this.onstatechange) this.onstatechange();
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      if (this._timer) clearInterval(this._timer);
      if (this.onstatechange) this.onstatechange();
      return Promise.resolve();
    }

    createAnalyser() { return new MockAnalyserNode() as unknown as AnalyserNode; }
    createGain() { return new MockGainNode() as unknown as GainNode; }
    createBiquadFilter() { return new MockBiquadFilterNode() as unknown as BiquadFilterNode; }
    createDelay() { return new MockDelayNode() as unknown as DelayNode; }
    createMediaStreamSource(stream: MediaStream) {
      const node = new MockAudioNode();
      (node as unknown as { stream: MediaStream }).stream = stream;
      return node as unknown as MediaStreamAudioSourceNode;
    }
    createMediaElementSource(element: HTMLMediaElement) {
      const node = new MockAudioNode();
      (node as unknown as { element: HTMLMediaElement }).element = element;
      return node as unknown as MediaElementAudioSourceNode;
    }
    createOscillator() {
      return new MockOscillatorNode() as unknown as OscillatorNode;
    }
    createBufferSource() {
      return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode;
    }
  }

  // Inject AudioContext globals
  (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
  (window as unknown as { webkitAudioContext: typeof MockAudioContext }).webkitAudioContext = MockAudioContext;

  // 7. Mock Media Stream API
  const mockTrack = {
    kind: 'audio',
    enabled: true,
    id: 'mock-audio-track-id',
    label: 'Mock Microphone',
    muted: false,
    readyState: 'live' as const,
    stop: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const mockStream = {
    getTracks: () => [mockTrack as unknown as MediaStreamTrack],
    getAudioTracks: () => [mockTrack as unknown as MediaStreamTrack],
    getVideoTracks: () => [],
    addTrack: () => {},
    removeTrack: () => {},
    clone: () => mockStream,
    active: true,
  };

  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.__audioMockTrace.getUserMediaCalled = true;
      window.__audioMockTrace.lastConstraints = constraints ?? null;
      
      if (constraints && constraints.audio) {
        return mockStream as unknown as MediaStream;
      }
      throw new DOMException("Requested device not found or denied", "NotFoundError");
    };
  }
}
