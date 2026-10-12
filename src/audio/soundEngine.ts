export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.85;

  // Engine synth nodes
  private engineGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Tyre scrub / screech synth
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Surface rumble synth
  private rumbleGain: GainNode | null = null;

  // Crowd cheer synth
  private crowdGain: GainNode | null = null;

  private isInitialized: boolean = false;
  private lastGear: number = 1;

  public init(soundEnabled: boolean = true): void {
    if (this.isInitialized) {
      this.setMute(!soundEnabled);
      return;
    }
    this.isMuted = !soundEnabled;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngineSynth();
      this.setupSkidSynth();
      this.setupRumbleSynth();
      this.setupCrowdSynth();
      this.isInitialized = true;
      if (this.isMuted) {
        this.ctx.suspend().catch(() => {});
      }
    } catch (e) {
      console.warn('Web Audio not supported or blocked', e);
    }
  }

  public resume(): void {
    if (this.isMuted) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public stopAll(): void {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.skidGain && this.ctx) {
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx) {
      if (muted) {
        this.ctx.suspend().catch(() => {});
      } else {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  public setVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  private setupEngineSynth(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Master engine gain
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, ctx.currentTime);

    // Distortion/Overdrive waveshaper
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(18) as any;

    // Filter to shape high touring car rasp
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(800, ctx.currentTime);

    // 3 Harmonic Oscillators for rich multi-cylinder V8 / turbo engine roar
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(45, ctx.currentTime);

    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(90, ctx.currentTime);

    this.osc3 = ctx.createOscillator();
    this.osc3.type = 'square';
    this.osc3.frequency.setValueAtTime(22.5, ctx.currentTime);

    const osc3Gain = ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.25, ctx.currentTime);
    this.osc3.connect(osc3Gain);

    this.osc1.connect(shaper);
    this.osc2.connect(shaper);
    osc3Gain.connect(shaper);

    shaper.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);

    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
  }

  private setupSkidSynth(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // White noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(3.0, ctx.currentTime);

    this.skidGain = ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, ctx.currentTime);

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(ctx.destination);

    whiteNoise.start();
  }

  private setupRumbleSynth(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);

    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0, ctx.currentTime);

    osc.connect(filter);
    filter.connect(this.rumbleGain);
    this.rumbleGain.connect(ctx.destination);

    osc.start();
  }

  private setupCrowdSynth(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const crowdNoise = ctx.createBufferSource();
    crowdNoise.buffer = noiseBuffer;
    crowdNoise.loop = true;

    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.setValueAtTime(650, ctx.currentTime);
    crowdFilter.Q.setValueAtTime(1.2, ctx.currentTime);

    this.crowdGain = ctx.createGain();
    this.crowdGain.gain.setValueAtTime(0, ctx.currentTime);

    crowdNoise.connect(crowdFilter);
    crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(ctx.destination);

    crowdNoise.start();
  }

  public update(
    rpm: number,
    throttle: number,
    gear: number,
    isSkidding: boolean,
    isOffRoad: boolean,
    isOnKerb: boolean,
    isWallHit: boolean,
    trackArea: string
  ): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Detect gear shift
    if (gear !== this.lastGear) {
      this.playGearShift();
      this.lastGear = gear;
    }

    // Engine Pitch & Filter
    const baseFreq = 30 + (rpm / 8200) * 110;
    if (this.osc1) this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    if (this.osc2) this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
    if (this.osc3) this.osc3.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    const filterFreq = 600 + (rpm / 8200) * 1800 + throttle * 1200;
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

    // Engine volume: base idle + throttle load
    const targetEngineVol = (0.15 + throttle * 0.45 + (rpm / 8200) * 0.3) * this.sfxVolume;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.05);

    // Tyre Skid Volume
    const targetSkidVol = isSkidding ? 0.35 * this.sfxVolume : 0;
    if (this.skidGain) this.skidGain.gain.setTargetAtTime(targetSkidVol, t, 0.04);

    // Surface Rumble (Off-road gravel / rumble kerb stripes)
    const targetRumbleVol = (isOffRoad || isOnKerb) ? (isOnKerb ? 0.35 : 0.45) * this.sfxVolume : 0;
    if (this.rumbleGain) this.rumbleGain.gain.setTargetAtTime(targetRumbleVol, t, 0.05);

    // Wall Impact Sound
    if (isWallHit) {
      this.playImpactSound();
    }

    // Crowd cheer on Pit Straight
    const isPitArea = trackArea.includes('Pit') || trackArea.includes('Murray');
    const targetCrowdVol = isPitArea ? 0.18 * this.sfxVolume : 0;
    if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(targetCrowdVol, t, 0.2);
  }

  public playGearShift(): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Turbo blow-off valve / transmission hiss
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playImpactSound(): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);

    gain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  public playCountdown(isGo: boolean): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const freq = isGo ? 880 : 440;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.5 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + (isGo ? 0.55 : 0.3));
  }

  public playFinish(): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Arpeggio chime
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.3 * this.sfxVolume, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.42);
    });
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const n = 256;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
