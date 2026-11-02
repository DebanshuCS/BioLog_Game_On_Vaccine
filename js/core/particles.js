/**
 * particles.js — ViroQuest Pool-Based 2D Canvas Particle Engine
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { randomBetween, randomFrom, hexToRgb, clamp } = VQ.utils;

  const MAX_PARTICLES = 260;

  function createBlank() {
    return {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      color: '#ffffff',
      size: 6,
      lifetime: 0.9,
      age: 0,
      gravity: 0,
      shape: 'circle',
    };
  }

  function drawStar(ctx, cx, cy, r) {
    const spikes = 5;
    const inner = r * 0.42;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r : inner;
      ctx.lineTo(cx + Math.cos(rot) * rad, cy + Math.sin(rot) * rad);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  class ParticleSystem {
    constructor(ctx) {
      this.ctx = ctx;
      this._pool = Array.from({ length: MAX_PARTICLES }, createBlank);
    }

    _acquire() {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (!this._pool[i].active) return this._pool[i];
      }
      return this._pool[0];
    }

    emit(x, y, options) {
      const opts = Object.assign({
        color: '#00E5B0',
        count: 14,
        speed: 180,
        size: 6,
        lifetime: 0.85,
        gravity: 70,
        shape: 'circle',
      }, options || {});

      for (let i = 0; i < opts.count; i++) {
        const p = this._acquire();
        const angle = Math.random() * Math.PI * 2;
        const spd = randomBetween(opts.speed * 0.45, opts.speed * 1.35);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.color = Array.isArray(opts.color) ? randomFrom(opts.color) : opts.color;
        p.size = randomBetween(opts.size * 0.65, opts.size * 1.35);
        p.lifetime = randomBetween(opts.lifetime * 0.7, opts.lifetime * 1.25);
        p.age = 0;
        p.gravity = opts.gravity;
        p.shape = opts.shape;
      }
    }

    burstSuccess(x, y, mainColor) {
      this.emit(x, y, {
        color: [mainColor || '#00E5B0', '#FFD740', '#FFFFFF', '#4ADE80'],
        count: 22,
        speed: 230,
        size: 6.5,
        lifetime: 0.85,
        gravity: 65,
        shape: 'star',
      });
      this.emit(x, y, {
        color: ['#FFFFFF', mainColor || '#38BDF8'],
        count: 14,
        speed: 280,
        size: 4,
        lifetime: 0.65,
        gravity: 40,
        shape: 'circle',
      });
    }

    burstFail(x, y) {
      this.emit(x, y, {
        color: ['#EF4444', '#FB7185', '#F59E0B'],
        count: 20,
        speed: 200,
        size: 7,
        lifetime: 0.75,
        gravity: 95,
        shape: 'circle',
      });
    }

    update(dt) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = this._pool[i];
        if (!p.active) continue;
        p.age += dt;
        if (p.age >= p.lifetime) {
          p.active = false;
          continue;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.save();
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = this._pool[i];
        if (!p.active) continue;
        const progress = p.age / p.lifetime;
        const alpha = clamp(1 - progress, 0, 1);
        const rgb = hexToRgb(p.color);
        ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';

        if (p.shape === 'star') {
          drawStar(ctx, p.x, p.y, Math.max(1, p.size * (1 - progress * 0.3)));
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.8, p.size * (1 - progress * 0.35)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  VQ.ParticleSystem = ParticleSystem;
})();
