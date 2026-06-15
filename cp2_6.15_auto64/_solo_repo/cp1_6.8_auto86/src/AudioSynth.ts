export interface CelestialBodyData {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'nebula';
  spectralType: string;
  mass: number;
  temperature: number;
  description: string;
}

export class AudioSynth {
  private ctx: AudioContext | null = null;
  private currentNodes: AudioNode[] = [];
  private isPlaying = false;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  stop() {
    this.currentNodes.forEach((n) => {
      try { (n as OscillatorNode).stop?.(); } catch {}
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
    });
    this.currentNodes = [];
    this.isPlaying = false;
  }

  play(body: CelestialBodyData) {
    this.stop();
    const ctx = this.ensureCtx();
    this.isPlaying = true;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);
    this.currentNodes.push(masterGain);

    if (body.type === 'star') {
      this.playStar(ctx, masterGain, body);
    } else if (body.type === 'planet') {
      this.playPlanet(ctx, masterGain, body);
    } else {
      this.playNebula(ctx, masterGain, body);
    }
  }

  private playStar(ctx: AudioContext, dest: AudioNode, body: CelestialBodyData) {
    const tempFactor = Math.min(body.temperature / 30000, 1);
    const baseFreq = 120 + tempFactor * 600;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = baseFreq * 1.5;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 0.5;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2 + body.mass * 0.3;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = baseFreq * 0.02;

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const g1 = ctx.createGain(); g1.gain.value = 0.4;
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    const g3 = ctx.createGain(); g3.gain.value = 0.2;

    osc1.connect(g1); g1.connect(dest);
    osc2.connect(g2); g2.connect(dest);
    osc3.connect(g3); g3.connect(dest);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000 + tempFactor * 4000;
    g1.disconnect(); g1.connect(filter); filter.connect(dest);

    [osc1, osc2, osc3, lfo].forEach((o) => { o.start(); this.currentNodes.push(o); });
    [lfoGain, g1, g2, g3, filter].forEach((n) => this.currentNodes.push(n));

    this.scheduleAutoStop(8);
  }

  private playPlanet(ctx: AudioContext, dest: AudioNode, body: CelestialBodyData) {
    const massFactor = Math.min(body.mass / 500, 1);
    const baseFreq = 60 + massFactor * 200;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = baseFreq;

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = baseFreq * 0.5;

    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1 + body.mass * 0.02;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + massFactor * 1200;
    filter.Q.value = 5;

    lfoGain.connect(filter.frequency);

    const g1 = ctx.createGain(); g1.gain.value = 0.25;
    const g2 = ctx.createGain(); g2.gain.value = 0.3;

    osc.connect(filter);
    sub.connect(g2); g2.connect(dest);
    filter.connect(g1); g1.connect(dest);

    [osc, sub, lfo].forEach((o) => { o.start(); this.currentNodes.push(o); });
    [lfoGain, filter, g1, g2].forEach((n) => this.currentNodes.push(n));

    this.scheduleAutoStop(6);
  }

  private playNebula(ctx: AudioContext, dest: AudioNode, body: CelestialBodyData) {
    const tempFactor = Math.min(body.temperature / 10000, 1);
    const baseFreq = 80 + tempFactor * 300;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 1.25;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 0.75;

    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.value = 0.15;
    const lfoGain1 = ctx.createGain();
    lfoGain1.gain.value = 3;
    lfo1.connect(lfoGain1);
    lfoGain1.connect(osc1.frequency);

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.1;
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 2;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(osc2.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500 + tempFactor * 3000;

    const g1 = ctx.createGain(); g1.gain.value = 0.2;
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    const g3 = ctx.createGain(); g3.gain.value = 0.18;

    osc1.connect(g1); g1.connect(filter);
    osc2.connect(g2); g2.connect(filter);
    osc3.connect(g3); g3.connect(dest);
    filter.connect(dest);

    [osc1, osc2, osc3, lfo1, lfo2].forEach((o) => { o.start(); this.currentNodes.push(o); });
    [lfoGain1, lfoGain2, filter, g1, g2, g3].forEach((n) => this.currentNodes.push(n));

    this.scheduleAutoStop(10);
  }

  private scheduleAutoStop(seconds: number) {
    setTimeout(() => {
      if (this.isPlaying) this.stop();
    }, seconds * 1000);
  }

  getIsPlaying() {
    return this.isPlaying;
  }
}
