/**
 * audio.js — ViroQuest Procedural Web Audio Synthesizer
 * Synthesizes clean, pleasant game sound effects with zero external audio files.
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});

  class AudioManager {
    constructor() {
      this._ctx = null;
      this._masterGain = null;
      this.muted = false;
    }

    init() {
      if (this._ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this._ctx = new AudioCtx();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.setValueAtTime(this.muted ? 0 : 0.75, this._ctx.currentTime);
        this._masterGain.connect(this._ctx.destination);
      } catch (e) {
        console.warn('[AudioManager] Audio init skipped:', e);
      }
    }

    async _ensureReady() {
      if (!this._ctx) this.init();
      if (!this._ctx) return false;
      if (this._ctx.state === 'suspended') {
        try {
          await this._ctx.resume();
        } catch (e) {
          return false;
        }
      }
      return this._ctx.state === 'running';
    }

    isMuted() {
      return Boolean(this.muted);
    }

    setMuted(flag) {
      this.muted = Boolean(flag);
      if (this._masterGain && this._ctx) {
        this._masterGain.gain.setValueAtTime(this.muted ? 0 : 0.75, this._ctx.currentTime);
      }
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }

    toggle() {
      return this.toggleMute();
    }

    async play(name) {
      if (this.muted) return;
      const ready = await this._ensureReady();
      if (!ready) return;

      switch (name) {
        case 'click':    this._tone(780, 'sine', 0.045, 0.22); break;
        case 'shoot':    this._sweep(420, 920, 'triangle', 0.12, 0.25); break;
        case 'match':    this._chord([587.33, 880], 'sine', 0.28, 0.28); break;
        case 'combo':    this._arpeggio([523.25, 659.25, 783.99, 1046.5], 0.075, 0.28); break;
        case 'level_up': this._arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.095, 0.34); break;
        case 'success':  this._arpeggio([659.25, 783.99, 1046.5], 0.11, 0.32); break;
        case 'heat':     this._sweep(240, 620, 'sine', 0.45, 0.28); break;
        case 'scan':     this._arpeggio([660, 880, 990, 1320], 0.06, 0.22); break;
        case 'miss':     this._sweep(220, 135, 'triangle', 0.22, 0.3); break;
        case 'fail':     this._arpeggio([392, 349.23, 293.66, 220], 0.14, 0.3); break;
        default:         this._tone(660, 'sine', 0.05, 0.18); break;
      }
    }

    _tone(freq, type, dur, vol) {
      const ctx = this._ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    _sweep(fStart, fEnd, type, dur, vol) {
      const ctx = this._ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(fStart, t);
      osc.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    _chord(freqs, type, dur, vol) {
      freqs.forEach((f, idx) => {
        this._tone(f, type, dur, vol / (idx + 1));
      });
    }

    _arpeggio(notes, stepSec, vol) {
      const ctx = this._ctx;
      const base = ctx.currentTime;
      notes.forEach((freq, i) => {
        const t = base + i * stepSec;
        const dur = i === notes.length - 1 ? 0.34 : stepSec * 1.4;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    }
  }

  VQ.AudioManager = AudioManager;
})();
