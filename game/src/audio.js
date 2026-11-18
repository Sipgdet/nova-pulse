// Synthesised sound effects on the Web Audio API: no audio files, no network,
// nothing to load. The context is created lazily on the first call after a user
// gesture (browsers block audio before one); every call is guarded so a missing
// or suspended context never breaks the game.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let lastShoot = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.4;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freqStart, freqEnd, duration, type, volume, delay = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  function noise(duration, volume, lowpass) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
    },
    /** Create (or resume) the context from a user gesture, so later sounds play. */
    unlock() {
      ensure();
    },
    /** Short blip; throttled so rapid fire does not turn into a buzz. */
    shoot() {
      const now = performance.now();
      if (now - lastShoot < 70) return;
      lastShoot = now;
      tone(920, 420, 0.07, 'square', 0.05);
    },
    explode(big) {
      noise(big ? 0.45 : 0.22, big ? 0.5 : 0.28, big ? 900 : 1600);
      tone(big ? 160 : 220, 40, big ? 0.4 : 0.22, 'sine', 0.35);
    },
    playerHit() {
      noise(0.3, 0.4, 1200);
      tone(180, 55, 0.35, 'sawtooth', 0.3);
    },
    powerup() {
      tone(523, 523, 0.09, 'sine', 0.18);
      tone(659, 659, 0.09, 'sine', 0.18, 0.08);
      tone(784, 784, 0.14, 'sine', 0.2, 0.16);
    },
    pulse() {
      tone(220, 38, 0.5, 'sine', 0.4);
      noise(0.35, 0.25, 700);
    },
    waveClear() {
      tone(660, 660, 0.12, 'triangle', 0.2);
      tone(880, 880, 0.2, 'triangle', 0.22, 0.11);
    },
    bossAlarm() {
      tone(220, 220, 0.16, 'square', 0.16);
      tone(220, 220, 0.16, 'square', 0.16, 0.22);
    },
    gameOver() {
      tone(392, 392, 0.22, 'triangle', 0.22);
      tone(311, 311, 0.22, 'triangle', 0.22, 0.2);
      tone(233, 233, 0.22, 'triangle', 0.22, 0.4);
      tone(155, 110, 0.5, 'triangle', 0.24, 0.6);
    },
  };
}
