// All sounds are synthesized with WebAudio, so there are no audio files to ship.

const STORAGE_KEY = 'this-is-my-sheep.muted';

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = readMuted();
    this.last = {};
  }

  // Browsers only allow audio after a user gesture; call this from a click handler.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.startAmbience();
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {}
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  suspend(paused) {
    if (!this.ctx) return;
    if (paused) this.ctx.suspend();
    else this.ctx.resume();
  }

  throttle(name, ms) {
    const now = performance.now();
    if (now - (this.last[name] ?? -Infinity) < ms) return false;
    this.last[name] = now;
    return true;
  }

  get ready() {
    return !!this.ctx && !this.muted;
  }

  // --- Building blocks -----------------------------------------------------

  tone({ type = 'sine', freq, freqEnd, dur, gain = 0.2, attack = 0.01, at = 0, filter, filterFreq = 2000, q = 1, vibrato }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter;
      f.frequency.value = filterFreq;
      f.Q.value = q;
      node = node.connect(f);
    }
    node.connect(g).connect(this.master);

    if (vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = vibrato.rate;
      depth.gain.value = vibrato.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noiseBurst({ dur, gain = 0.2, filter = 'bandpass', freq = 1000, q = 1, at = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // --- Sounds --------------------------------------------------------------

  bark() {
    if (!this.ready || !this.throttle('bark', 120)) return;
    const p = 0.9 + Math.random() * 0.2;
    const woof = (at) => {
      this.tone({ type: 'sawtooth', freq: 420 * p, freqEnd: 160 * p, dur: 0.15, gain: 0.3, attack: 0.008, filter: 'lowpass', filterFreq: 1400, at });
      this.noiseBurst({ dur: 0.07, gain: 0.2, freq: 1500, at });
    };
    woof(0);
    if (Math.random() < 0.5) woof(0.17);
  }

  // pitch > 1 for lambs.
  bleat(panic = false, pitch = 1) {
    if (!this.ready || !this.throttle('bleat', panic ? 180 : 400)) return;
    const f = (panic ? 560 : 430) * pitch * (0.85 + Math.random() * 0.3);
    this.tone({
      type: 'sawtooth',
      freq: f,
      freqEnd: f * 0.85,
      dur: panic ? 0.4 : 0.6,
      gain: 0.1,
      attack: 0.04,
      filter: 'bandpass',
      filterFreq: 1300,
      q: 1.2,
      vibrato: { rate: panic ? 34 : 26, depth: f * 0.06 },
    });
  }

  growl() {
    if (!this.ready || !this.throttle('growl', 600)) return;
    this.tone({ type: 'sawtooth', freq: 90, freqEnd: 70, dur: 0.55, gain: 0.2, attack: 0.05, filter: 'lowpass', filterFreq: 500, vibrato: { rate: 24, depth: 14 } });
    this.noiseBurst({ dur: 0.5, gain: 0.06, filter: 'lowpass', freq: 300 });
  }

  // Rises a whole tone with every step of the combo.
  combo(count) {
    if (!this.ready) return;
    const f = 523.25 * 2 ** ((Math.min(count, 10) - 2) / 6);
    this.tone({ type: 'triangle', freq: f, dur: 0.12, gain: 0.1 });
    this.tone({ type: 'triangle', freq: f * 1.5, dur: 0.2, gain: 0.09, at: 0.07 });
  }

  upgrade() {
    if (!this.ready) return;
    [659.25, 880, 1318.5].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.22, gain: 0.12, at: i * 0.07 }));
  }

  whistle() {
    if (!this.ready) return;
    this.tone({ type: 'sine', freq: 1700, freqEnd: 2500, dur: 0.18, gain: 0.08, attack: 0.02 });
    this.tone({ type: 'sine', freq: 2500, freqEnd: 1900, dur: 0.3, gain: 0.08, attack: 0.02, at: 0.2 });
  }

  ding() {
    if (!this.ready || !this.throttle('ding', 200)) return;
    this.tone({ type: 'sine', freq: 1320, dur: 0.9, gain: 0.08, attack: 0.005 });
    this.tone({ type: 'sine', freq: 2640, dur: 0.5, gain: 0.035, attack: 0.005 });
    this.tone({ type: 'sine', freq: 1320, dur: 0.7, gain: 0.05, attack: 0.005, at: 0.18 });
  }

  bonk() {
    if (!this.ready) return;
    this.tone({ type: 'triangle', freq: 220, freqEnd: 90, dur: 0.18, gain: 0.25 });
    this.noiseBurst({ dur: 0.08, gain: 0.2, filter: 'lowpass', freq: 900 });
  }

  snort() {
    if (!this.ready || !this.throttle('snort', 300)) return;
    this.noiseBurst({ dur: 0.18, gain: 0.25, filter: 'bandpass', freq: 700, q: 2 });
    this.noiseBurst({ dur: 0.14, gain: 0.2, filter: 'bandpass', freq: 600, q: 2, at: 0.25 });
  }

  yelp() {
    if (!this.ready || !this.throttle('yelp', 150)) return;
    this.tone({ type: 'triangle', freq: 700, freqEnd: 1500, dur: 0.09, gain: 0.15 });
    this.tone({ type: 'triangle', freq: 1500, freqEnd: 600, dur: 0.2, gain: 0.12, at: 0.08 });
  }

  // pitch < 1 for bigger wolves, > 1 for smaller ones.
  howl(pitch = 1, force = false) {
    if (!this.ready || (!this.throttle(`howl${pitch}`, 5000) && !force)) return;
    const gain = pitch < 1 ? 0.1 : 0.07;
    this.tone({ type: 'sine', freq: 330 * pitch, freqEnd: 560 * pitch, dur: 0.55, gain, attack: 0.2, vibrato: { rate: 5, depth: 8 } });
    this.tone({ type: 'sine', freq: 560 * pitch, freqEnd: 400 * pitch, dur: 1.4, gain, attack: 0.05, at: 0.5, vibrato: { rate: 5, depth: 10 } });
  }

  click() {
    if (!this.ready) return;
    this.tone({ type: 'sine', freq: 900, freqEnd: 500, dur: 0.06, gain: 0.08 });
  }

  pop() {
    if (!this.ready || !this.throttle('pop', 60)) return;
    this.tone({ type: 'sine', freq: 600, freqEnd: 1000, dur: 0.1, gain: 0.08 });
  }

  saved() {
    if (!this.ready) return;
    this.tone({ type: 'triangle', freq: 660, dur: 0.15, gain: 0.12 });
    this.tone({ type: 'triangle', freq: 990, dur: 0.25, gain: 0.12, at: 0.1 });
  }

  lost() {
    if (!this.ready) return;
    this.tone({ type: 'triangle', freq: 440, freqEnd: 180, dur: 0.45, gain: 0.15 });
    this.noiseBurst({ dur: 0.25, gain: 0.15, filter: 'lowpass', freq: 800 });
  }

  waveComplete() {
    if (!this.ready) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.35, gain: 0.13, at: i * 0.11 }));
    [523.25, 659.25, 783.99].forEach((f) => this.tone({ type: 'sine', freq: f, dur: 1.2, gain: 0.06, attack: 0.05, at: 0.5 }));
  }

  gameOver() {
    if (!this.ready) return;
    [392, 349.23, 311.13, 261.63].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.5, gain: 0.13, at: i * 0.24 }));
  }

  // Soft wind plus the odd bird.
  startAmbience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
    lfo.start();

    const chirp = () => {
      if (this.ready && ctx.state === 'running') {
        const base = 2200 + Math.random() * 1200;
        const notes = 2 + ((Math.random() * 3) | 0);
        for (let i = 0; i < notes; i++) {
          this.tone({ type: 'sine', freq: base, freqEnd: base * 1.4, dur: 0.07, gain: 0.02, at: i * 0.11 });
        }
      }
      setTimeout(chirp, 4000 + Math.random() * 7000);
    };
    setTimeout(chirp, 3000);
  }
}
