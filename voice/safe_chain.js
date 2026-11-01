// safe_chain.js - the speaker-safety gate. All sound from the Brot must go through SonicSafe.dest(ctx) and never straight to ctx.destination.
// Added after an earlier sound engine damaged a laptop speaker. Rules: no feedback anywhere (no DelayNode, ConvolverNode, microphone, script node or loop),
// no drones (every synthesised note decays to silence within 1 s, the same pitch at most every 500 ms), notes 200-3000 Hz, then ONE chain before the output:
// 4th-order high-pass 180 Hz, 4th-order low-pass 3.2 kHz, compressor + hard clip, master gain that can never exceed 0.3. Synthesised voices are osc -> gain -> pan -> chain -> out;
// sampled or spoken audio is buffer -> gain -> SonicSafe.dest(ctx), filtered once. Nothing in this file may create a node from FORBIDDEN; a test scans this very source for them and renders the worst case offline.
(function (root) {
  const F_MIN = 200, F_MAX = 3000, VOL_MAX = 0.3, NOTE_MAX_S = 1.0, REPEAT_MS = 500, HP_HZ = 180, LP_HZ = 3200;
  const clampF = f => Math.max(F_MIN, Math.min(F_MAX, +f || F_MIN));
  const FORBIDDEN = ['createDelay', 'createConvolver', 'createMediaStream', 'getUserMedia', 'createScriptProcessor', 'AudioWorklet', 'createMediaElementSource'];

  // identity hard clip at +-1 (a WaveShaper clamps its input to [-1,1] and reads the curve there)
  const clipCurve = (() => { const c = new Float32Array(3); c[0] = -1; c[1] = 0; c[2] = 1; return c; })();

  function chain(ctx, vol, opts) {
    const hp1 = ctx.createBiquadFilter(), hp2 = ctx.createBiquadFilter(), lp1 = ctx.createBiquadFilter(), lp2 = ctx.createBiquadFilter();
    hp1.type = hp2.type = 'highpass'; hp1.frequency.value = hp2.frequency.value = HP_HZ; hp1.Q.value = lp1.Q.value = 0.5412; hp2.Q.value = lp2.Q.value = 1.3066;      // 4th-order Butterworth each
    lp1.type = lp2.type = 'lowpass'; lp1.frequency.value = lp2.frequency.value = LP_HZ;      // 4th-order low-pass too: SAFE-A found 2nd order left 1.8% of the worst case above 4.5 kHz
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -24; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    const clip = ctx.createWaveShaper(); clip.curve = clipCurve;                           // a compressor lets the first ms through; the clip does not
    const m = ctx.createGain(); m.gain.value = 0.0001;
    hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(lim); lim.connect(clip); clip.connect(m); m.connect((opts && opts.out) || ctx.destination);
    const setVol = (v, t, ramp) => { const g = Math.max(0.0001, Math.min(VOL_MAX, +v || 0.0001)); m.gain.cancelScheduledValues(t); m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), t); m.gain.exponentialRampToValueAtTime(g, t + (ramp || 0.3)); return g; };
    setVol(vol === undefined ? 0.15 : vol, ctx.currentTime, 0.3);
    if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) setVol(vol === undefined ? 0.15 : vol, 0, 0.002);      // a render has no speaker to protect from the fade-in; do not swallow its first 0.3 s
    return { input: hp1, master: m, setVol };
  }

  // one note into `dest`. The only place a sound is made. freq clamped, level capped, always decays to 0.0001 and the oscillator is stopped.
  function note(ctx, dest, o) {
    const now = o.at === undefined ? ctx.currentTime : o.at, dur = Math.max(0.03, Math.min(NOTE_MAX_S, o.dur === undefined ? 0.35 : o.dur)), amp = Math.max(0.0002, Math.min(0.2, o.amp === undefined ? 0.12 : o.amp));
    const osc = ctx.createOscillator(), g = ctx.createGain(), pn = ctx.createStereoPanner();
    osc.type = o.type === 'sine' ? 'sine' : 'triangle'; osc.frequency.value = clampF(o.freq); pn.pan.value = Math.max(-1, Math.min(1, +o.pan || 0));
    osc.connect(g); g.connect(pn); pn.connect(dest);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(amp, now + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
    return { end: now + dur + 0.02 };
  }

  // the same (rounded) pitch is refused for REPEAT_MS, so no pitch can be repeated into a drone
  function makeGate() { const last = new Map(); const gate = (f, tMs) => { const k = Math.round(clampF(f)), l = last.get(k); if (l !== undefined && tMs - l < REPEAT_MS) return false; last.set(k, tMs); return true; }; gate.clear = () => last.clear(); return gate; }

  // the safe place to connect to: one chain per context, built on first use. Use in place of ctx.destination (live and OfflineAudioContext renders / WAV exports alike).
  const _dests = new WeakMap();
  function dest(ctx, vol, opts) { let c = _dests.get(ctx); if (!c) { c = chain(ctx, vol, opts); _dests.set(ctx, c); } return c.input; }      // opts.out: feed another node (e.g. a mute gain) instead of ctx.destination
  function tap(ctx) { const c = _dests.get(ctx); if (!c) { dest(ctx); return _dests.get(ctx).master; } return c.master; }      // post-chain node, for a recorder

  root.SonicSafe = { F_MIN, F_MAX, VOL_MAX, NOTE_MAX_S, REPEAT_MS, HP_HZ, LP_HZ, FORBIDDEN, clampF, chain, note, makeGate, dest, tap };
})(typeof window !== 'undefined' ? window : globalThis);
