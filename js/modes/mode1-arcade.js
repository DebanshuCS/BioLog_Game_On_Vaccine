/**
 * mode1-arcade.js — ViroQuest Mode 1: "Cell Defender" (Host–Virus Lock & Key Arcade)
 * =================================================================================
 * Interactive GUI + Canvas arcade game calibrated for Class 12 & 1st-Year students:
 *  - Incoming viruses carry distinct Spike "Keys" (Crown, Star, Cube, Wedge, Hex).
 *  - Players launch matching Y-shaped Neutralizing Antibodies via:
 *      1) Clicking the GUI Antibody Launcher buttons below the stage,
 *      2) Clicking the Receptor Ports directly on the Host Cell membrane,
 *      3) Dragging an Antibody from a receptor port onto a virus (or vice versa),
 *      4) Pressing number keys [1]–[5]!
 *  - Smooth progressive waves: starts with 2 virus types in Wave 1 and unlocks more!
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { lerp, clamp, randomBetween, randomFrom, formatScore } = VQ.utils;

  const CANVAS_W = 1200;
  const CANVAS_H = 600;
  const CELL_CY  = 575;
  const CELL_RX  = 490;
  const CELL_RY  = 118;

  const MAX_LIVES = 5;
  const BASE_POINTS = 100;
  const VIRUS_R = 30;
  const RECEPTOR_R = 30;

  // Progressive difficulty table (index = wave 1..8+)
  const WAVE_CONFIG = [
    null,
    { pairs: 2, maxActive: 1, speed: 46, spawnSec: 3.4, matchesToClear: 4  }, // Wave 1: super welcoming!
    { pairs: 3, maxActive: 2, speed: 56, spawnSec: 3.0, matchesToClear: 5  }, // Wave 2: unlocks HIV-1
    { pairs: 4, maxActive: 2, speed: 66, spawnSec: 2.7, matchesToClear: 6  }, // Wave 3: unlocks Ebola
    { pairs: 5, maxActive: 3, speed: 76, spawnSec: 2.4, matchesToClear: 7  }, // Wave 4: unlocks Adenovirus
    { pairs: 5, maxActive: 3, speed: 88, spawnSec: 2.1, matchesToClear: 8  }, // Wave 5
    { pairs: 5, maxActive: 4, speed: 102, spawnSec: 1.85, matchesToClear: 10 }, // Wave 6
    { pairs: 5, maxActive: 4, speed: 118, spawnSec: 1.65, matchesToClear: 12 }, // Wave 7+
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // GEOMETRIC SHAPE HELPERS (Drawn both inside Virus Center & on Receptor Dock)
  // ───────────────────────────────────────────────────────────────────────────
  function drawKeyShape(ctx, shapeKey, cx, cy, r, fill, stroke) {
    ctx.save();
    ctx.fillStyle = fill;
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
    }
    ctx.beginPath();

    switch (shapeKey) {
      case 'crown': {
        const w = r * 1.35;
        const h = r * 1.05;
        ctx.moveTo(cx - w / 2, cy + h * 0.45);
        ctx.lineTo(cx - w * 0.58, cy - h * 0.35);
        ctx.lineTo(cx - w * 0.22, cy + h * 0.05);
        ctx.lineTo(cx, cy - h * 0.55);
        ctx.lineTo(cx + w * 0.22, cy + h * 0.05);
        ctx.lineTo(cx + w * 0.58, cy - h * 0.35);
        ctx.lineTo(cx + w / 2, cy + h * 0.45);
        ctx.closePath();
        break;
      }
      case 'star': {
        const spikes = 5;
        let rot = -Math.PI / 2;
        const step = Math.PI / spikes;
        for (let i = 0; i < spikes * 2; i++) {
          const rad = i % 2 === 0 ? r * 1.02 : r * 0.45;
          ctx.lineTo(cx + Math.cos(rot) * rad, cy + Math.sin(rot) * rad);
          rot += step;
        }
        ctx.closePath();
        break;
      }
      case 'square': {
        const s = r * 1.45;
        ctx.roundRect(cx - s / 2, cy - s / 2, s, s, 4);
        break;
      }
      case 'triangle': {
        const tr = r * 1.08;
        ctx.moveTo(cx, cy - tr);
        ctx.lineTo(cx + tr * 0.95, cy + tr * 0.72);
        ctx.lineTo(cx - tr * 0.95, cy + tr * 0.72);
        ctx.closePath();
        break;
      }
      case 'hex':
      default: {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + Math.cos(a) * (r * 0.98);
          const py = cy + Math.sin(a) * (r * 0.98);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
    }

    ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
  }

  let _nextId = 1;

  class Mode1Arcade {
    constructor(canvas, services, callbacks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.audio = services.audio;
      this.storage = services.storage;
      this.callbacks = callbacks || {};

      this.particles = new VQ.ParticleSystem(this.ctx);
      this.pairs = VQ.VIRUS_RECEPTOR_PAIRS;

      this._state = 'idle'; // idle | playing | paused | gameover
      this._raf = null;
      this._lastTime = 0;

      // Gameplay metrics
      this.score = 0;
      this.lives = MAX_LIVES;
      this.combo = 0;
      this.maxCombo = 0;
      this.wave = 1;
      this.waveMatches = 0;
      this.totalMatches = 0;
      this.scientistMode = false;
      this._perfectWave = true;

      // Entities
      this.receptors = [];
      this.viruses = [];
      this.antibodies = []; // flying Y-antibodies!
      this.popups = [];

      // Drag / target interaction state
      this.selectedVirusId = null;
      this.dragState = null; // { fromType: 'receptor'|'virus', id, startX, startY, curX, curY, color }

      // Visual flashes & banners
      this._cellFlash = 0;
      this._cellGlow = 0;
      this._bannerText = '';
      this._bannerSub = '';
      this._bannerTimer = 0;
      this._introHintTimer = 5.5;

      this._scaleX = 1;
      this._scaleY = 1;

      // Bound listeners
      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp   = this._handlePointerUp.bind(this);
      this._onKeyDown     = this._handleKeyDown.bind(this);
    }

    start() {
      this._resetState();
      this._setupReceptors();
      this._buildDockBar();
      this._syncDOMHud();

      this._state = 'playing';
      this._bannerText = '🛡️ WAVE 1 — DEFEND THE CELL!';
      this._bannerSub  = 'Click the matching Antibody Lock below (or press 1–2) to block incoming viruses!';
      this._bannerTimer = 2.6;

      this.canvas.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('keydown', this._onKeyDown);

      // Pause button in Mode 1 HUD
      this._pauseBtn = document.getElementById('mode1-btn-pause');
      if (this._pauseBtn) {
        this._onPauseClick = () => {
          if (this._state === 'playing') this.pause();
          else if (this._state === 'paused') this.resume();
        };
        this._pauseBtn.addEventListener('click', this._onPauseClick);
      }

      this._lastTime = performance.now();
      this._loopBound = this._loop.bind(this);
      this._raf = requestAnimationFrame(this._loopBound);
    }

    pause() {
      if (this._state !== 'playing') return;
      this._state = 'paused';
      if (this._pauseBtn) this._pauseBtn.textContent = '▶ Resume';
      this.draw();
    }

    resume() {
      if (this._state !== 'paused') return;
      this._state = 'playing';
      if (this._pauseBtn) this._pauseBtn.textContent = '⏸ Pause';
      this._lastTime = performance.now();
      this._raf = requestAnimationFrame(this._loopBound);
    }

    destroy() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('keydown', this._onKeyDown);
      if (this._pauseBtn && this._onPauseClick) {
        this._pauseBtn.removeEventListener('click', this._onPauseClick);
      }
      this._state = 'idle';
    }

    _getWaveCfg() {
      const idx = clamp(this.wave, 1, WAVE_CONFIG.length - 1);
      return WAVE_CONFIG[idx];
    }

    _resetState() {
      this.score = 0;
      this.lives = MAX_LIVES;
      this.combo = 0;
      this.maxCombo = 0;
      this.wave = 1;
      this.waveMatches = 0;
      this.totalMatches = 0;
      this._perfectWave = true;

      this.viruses = [];
      this.antibodies = [];
      this.popups = [];
      this.selectedVirusId = null;
      this.dragState = null;

      this._spawnTimer = 0.7;
      this._cellFlash = 0;
      this._cellGlow = 0;
      this._introHintTimer = 6.0;
    }

    _setupReceptors() {
      const count = this.pairs.length;
      this.receptors = this.pairs.map((pair, i) => {
        const t = (i / (count - 1)) * 0.78 + 0.11; // 0.11 .. 0.89 across top arc of cell
        const angle = Math.PI + t * Math.PI;
        const x = CANVAS_W / 2 + Math.cos(angle) * (CELL_RX * 0.94);
        const y = CELL_CY + Math.sin(angle) * (CELL_RY * 0.96);

        return {
          index: i,
          id: pair.id,
          pair: pair,
          x: x,
          y: y,
          pulse: 0,
          shake: 0,
          unlocked: i < this._getWaveCfg().pairs,
        };
      });
    }

    _buildDockBar() {
      const bar = document.getElementById('mode1-dock-bar');
      if (!bar) return;

      bar.innerHTML = '<span class="dock-bar-prompt">🛡️ Launch Antibody:</span>';

      this.receptors.forEach((rec, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'antibody-btn' + (rec.unlocked ? '' : ' locked');
        btn.dataset.recId = rec.id;
        btn.style.setProperty('--dock-color', rec.unlocked ? rec.pair.color : 'rgba(148,163,184,0.2)');

        const unlockWave = idx === 2 ? 2 : idx === 3 ? 3 : idx === 4 ? 4 : 1;
        btn.innerHTML = `
          <span class="ab-key">${idx + 1}</span>
          <span class="ab-shape-badge">${rec.unlocked ? rec.pair.symbol : '🔒'}</span>
          <span class="ab-info">
            <span class="ab-receptor">${rec.unlocked ? rec.pair.receptorName : 'Unlocks Wave ' + unlockWave}</span>
            <span class="ab-virus">${rec.unlocked ? 'Blocks ' + rec.pair.virusName : rec.pair.virusName}</span>
          </span>
        `;

        btn.addEventListener('click', () => {
          if (this._state !== 'playing') return;
          if (!rec.unlocked) return;
          btn.classList.add('firing');
          setTimeout(() => btn.classList.remove('firing'), 160);
          this._activateReceptorDefense(rec);
        });

        bar.appendChild(btn);
      });
    }

    _syncDOMHud() {
      const scoreEl = document.getElementById('mode1-score-val');
      if (scoreEl) scoreEl.textContent = formatScore(this.score);

      const comboEl = document.getElementById('mode1-combo-val');
      if (comboEl) comboEl.textContent = this.combo + 'x';

      const livesEl = document.getElementById('mode1-lives-val');
      if (livesEl) {
        let hearts = '';
        for (let i = 0; i < MAX_LIVES; i++) {
          hearts += i < this.lives ? '❤️' : '🖤';
        }
        livesEl.textContent = hearts;
      }

      const cfg = this._getWaveCfg();
      const waveLbl = document.getElementById('mode1-wave-label');
      if (waveLbl) waveLbl.textContent = 'Wave ' + this.wave;

      const waveFill = document.getElementById('mode1-wave-fill');
      if (waveFill) {
        const pct = clamp((this.waveMatches / cfg.matchesToClear) * 100, 0, 100);
        waveFill.style.width = pct + '%';
      }
    }

    // ─── MAIN LOOP ───────────────────────────────────────────────────────────
    _loop(now) {
      if (this._state !== 'playing') return;
      const dt = Math.min((now - this._lastTime) / 1000, 0.05);
      this._lastTime = now;

      this.update(dt);
      this.draw();

      if (this._state === 'playing') {
        this._raf = requestAnimationFrame(this._loopBound);
      }
    }

    update(dt) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this._scaleX = CANVAS_W / rect.width;
        this._scaleY = CANVAS_H / rect.height;
      }

      this._cellFlash = Math.max(0, this._cellFlash - dt * 2.8);
      this._cellGlow  = Math.max(0, this._cellGlow - dt * 2.4);
      this._bannerTimer = Math.max(0, this._bannerTimer - dt);
      this._introHintTimer = Math.max(0, this._introHintTimer - dt);

      for (const r of this.receptors) {
        r.pulse = Math.max(0, r.pulse - dt * 2.8);
        r.shake = Math.max(0, r.shake - dt * 5.5);
      }

      // Virus Spawner
      const cfg = this._getWaveCfg();
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) {
        const activeCount = this.viruses.filter(v => v.state === 'flying').length;
        if (activeCount < cfg.maxActive) {
          this._spawnVirus();
        }
        this._spawnTimer = cfg.spawnSec * randomBetween(0.82, 1.18);
      }

      // Update Viruses
      for (const v of this.viruses) {
        v.age += dt;
        v.rot += v.rotSpeed * dt;
        if (v.state === 'flying') {
          const step = v.speed * dt;
          v.progress = clamp(v.progress + step / Math.max(1, v.totalDist), 0, 1);
          const wobble = Math.sin(v.age * v.wobbleFreq + v.wobblePhase) * v.wobbleAmp * (1 - v.progress * 0.65);
          v.x = lerp(v.startX, v.endX, v.progress) + wobble;
          v.y = lerp(v.startY, v.endY, v.progress);

          if (v.progress >= 1) {
            this._onVirusInfectedCell(v);
          }
        } else if (v.state === 'popping') {
          v.popAge += dt;
          if (v.popAge >= 0.35) v.dead = true;
        }
      }
      this.viruses = this.viruses.filter(v => !v.dead);

      // Clear selected virus if gone
      if (this.selectedVirusId && !this.viruses.some(v => v.id === this.selectedVirusId && v.state === 'flying')) {
        this.selectedVirusId = null;
      }

      // Update flying Y-Antibody projectiles
      for (const ab of this.antibodies) {
        ab.t = clamp(ab.t + dt * 5.2, 0, 1);
        const tx = ab.targetVirus ? ab.targetVirus.x : ab.endX;
        const ty = ab.targetVirus ? ab.targetVirus.y : ab.endY;
        ab.x = lerp(ab.startX, tx, ab.t);
        ab.y = lerp(ab.startY, ty, ab.t);
        if (ab.t >= 1) {
          ab.done = true;
          if (ab.onArrive) ab.onArrive();
        }
      }
      this.antibodies = this.antibodies.filter(a => !a.done);

      // Update Floating Text Popups
      for (const p of this.popups) {
        p.age += dt;
        p.y += p.vy * dt;
      }
      this.popups = this.popups.filter(p => p.age < p.life);

      this.particles.update(dt);
    }

    _spawnVirus() {
      const cfg = this._getWaveCfg();
      const unlockedReceptors = this.receptors.slice(0, cfg.pairs);
      const targetRec = randomFrom(unlockedReceptors);
      if (!targetRec) return;

      const startX = clamp(targetRec.x + randomBetween(-220, 220), 90, CANVAS_W - 90);
      const startY = -36;
      const endX = targetRec.x;
      const endY = targetRec.y - RECEPTOR_R - 18;

      const v = {
        id: _nextId++,
        pair: targetRec.pair,
        targetRec: targetRec,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        x: startX,
        y: startY,
        totalDist: Math.hypot(endX - startX, endY - startY),
        speed: cfg.speed * randomBetween(0.92, 1.08),
        progress: 0,
        age: 0,
        rot: 0,
        rotSpeed: randomBetween(-0.6, 0.6),
        wobbleAmp: randomBetween(10, 24),
        wobbleFreq: randomBetween(2.2, 3.4),
        wobblePhase: randomBetween(0, Math.PI * 2),
        state: 'flying',
        popAge: 0,
        dead: false,
      };

      this.viruses.push(v);
    }

    // ─── DEFENSE & MATCHING LOGIC ────────────────────────────────────────────
    _activateReceptorDefense(rec, explicitVirus) {
      rec.pulse = 1;

      const flying = this.viruses.filter(v => v.state === 'flying');
      if (flying.length === 0) {
        this._addPopup('Wait for an incoming virus!', rec.x, rec.y - 48, '#94A3B8', 15, 1.0);
        return;
      }

      // Determine which virus the player is trying to neutralize:
      // 1) An explicitly dragged-onto virus, OR
      // 2) A manually targeted virus (selectedVirusId), OR
      // 3) Any flying virus matching this receptor (closest first)
      let candidate = explicitVirus || null;
      if (!candidate && this.selectedVirusId) {
        candidate = flying.find(v => v.id === this.selectedVirusId) || null;
      }

      if (candidate) {
        if (candidate.pair.id === rec.id) {
          this._launchAntibodyAt(rec, candidate);
        } else {
          this._onWrongMatch(rec, 'Wrong Lock! Match ' + candidate.pair.symbol + ' ' + candidate.pair.receptorName);
        }
        return;
      }

      // Otherwise check all flying viruses for a matching shape
      const matching = flying.filter(v => v.pair.id === rec.id);
      if (matching.length > 0) {
        const closest = matching.reduce((a, b) => (a.progress > b.progress ? a : b));
        this._launchAntibodyAt(rec, closest);
      } else {
        this._onWrongMatch(rec, 'Shape Mismatch! Check the virus icon');
      }
    }

    _launchAntibodyAt(rec, virus) {
      // Reserve virus immediately so double-clicks don't waste shots
      virus.state = 'intercepted';
      if (this.selectedVirusId === virus.id) this.selectedVirusId = null;

      if (this.audio) this.audio.play('shoot');

      this.antibodies.push({
        startX: rec.x,
        startY: rec.y - 16,
        endX: virus.x,
        endY: virus.y,
        x: rec.x,
        y: rec.y - 16,
        t: 0,
        color: rec.pair.color,
        targetVirus: virus,
        onArrive: () => this._completeNeutralization(rec, virus),
      });
    }

    _completeNeutralization(rec, virus) {
      virus.state = 'popping';
      virus.popAge = 0;

      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const mult = Math.min(this.combo, 8);
      const pts = BASE_POINTS * mult;
      this.score += pts;
      this.waveMatches++;
      this.totalMatches++;
      this._cellGlow = 1;

      this.particles.burstSuccess(virus.x, virus.y, virus.pair.color);

      const scoreLabel = this.combo >= 2 ? '+' + pts + ' (' + mult + 'x!)' : '+' + pts;
      this._addPopup(scoreLabel, virus.x, virus.y - 26, '#00E5B0', 21, 1.25);

      const factMsg = this.scientistMode ? virus.pair.scientistNote : virus.pair.quickFact;
      this._addPopup(factMsg, clamp(virus.x, 230, CANVAS_W - 230), Math.max(70, virus.y + 24), '#F8FAFC', 14, 1.9);

      if (this.audio) {
        this.audio.play(this.combo >= 5 ? 'combo' : 'match');
      }

      if (this.storage) {
        if (this.combo >= 5)  this.storage.setProgress('combo_5_achieved', true);
        if (this.combo >= 10) this.storage.setProgress('combo_10_achieved', true);
      }

      // Check Wave Advancement
      const cfg = this._getWaveCfg();
      if (this.waveMatches >= cfg.matchesToClear) {
        this._advanceWave();
      }

      this._syncDOMHud();
    }

    _onWrongMatch(rec, message) {
      this.combo = 0;
      rec.shake = 1;
      if (this.audio) this.audio.play('miss');
      this._addPopup(message, clamp(rec.x, 190, CANVAS_W - 190), rec.y - 54, '#FCA5A5', 15, 1.4);
      this._syncDOMHud();
    }

    _onVirusInfectedCell(virus) {
      virus.dead = true;
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this._cellFlash = 1;
      this._perfectWave = false;

      this.particles.burstFail(virus.x, virus.y);
      this._addPopup('Cell Hit! -1 ❤️', virus.x, virus.y - 24, '#EF4444', 19, 1.4);
      if (this.audio) this.audio.play('fail');

      this._syncDOMHud();

      if (this.lives <= 0) {
        this._state = 'gameover';
        if (this.storage) this.storage.setProgress('played_mode1', true);
        setTimeout(() => {
          if (this.callbacks.onGameOver) this.callbacks.onGameOver(this.score);
        }, 450);
      }
    }

    _advanceWave() {
      if (this._perfectWave && this.storage) {
        this.storage.setProgress('perfect_wave', true);
      }
      this._perfectWave = true;
      this.wave++;
      this.waveMatches = 0;

      const cfg = this._getWaveCfg();
      let newlyUnlocked = null;
      this.receptors.forEach((r, idx) => {
        const shouldUnlock = idx < cfg.pairs;
        if (shouldUnlock && !r.unlocked) {
          r.unlocked = true;
          newlyUnlocked = r.pair;
        }
      });

      this._buildDockBar();
      if (this.audio) this.audio.play('level_up');
      this.particles.burstSuccess(CANVAS_W / 2, CANVAS_H / 2, '#FFB547');

      this._bannerText = '🎉 WAVE ' + this.wave + ' UNLOCKED!';
      this._bannerSub  = newlyUnlocked
        ? 'New Pathogen Incoming: ' + newlyUnlocked.symbol + ' ' + newlyUnlocked.virusName + ' → ' + newlyUnlocked.receptorName
        : 'Speed increasing — keep those antibodies flying!';
      this._bannerTimer = 2.8;
    }

    _addPopup(text, x, y, color, size, life) {
      this.popups.push({
        text: text,
        x: x,
        y: y,
        vy: -34,
        color: color || '#FFFFFF',
        size: size || 16,
        age: 0,
        life: life || 1.3,
      });
    }

    // ─── POINTER / DRAG / KEYBOARD CONTROLS ──────────────────────────────────
    _toCanvasCoords(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * this._scaleX,
        y: (e.clientY - rect.top) * this._scaleY,
      };
    }

    _handlePointerDown(e) {
      if (this._state === 'paused') {
        this.resume();
        return;
      }
      if (this._state !== 'playing') return;

      const pt = this._toCanvasCoords(e);

      // Check if player pressed on an unlocked Receptor Port on Canvas
      for (const r of this.receptors) {
        if (!r.unlocked) continue;
        if (Math.hypot(pt.x - r.x, pt.y - r.y) <= RECEPTOR_R * 1.55) {
          this.dragState = {
            fromType: 'receptor',
            receptor: r,
            startX: r.x,
            startY: r.y,
            curX: pt.x,
            curY: pt.y,
            color: r.pair.color,
            moved: false,
          };
          return;
        }
      }

      // Check if player pressed on a flying Virus on Canvas
      for (const v of this.viruses) {
        if (v.state !== 'flying') continue;
        if (Math.hypot(pt.x - v.x, pt.y - v.y) <= VIRUS_R * 1.65) {
          this.dragState = {
            fromType: 'virus',
            virus: v,
            startX: v.x,
            startY: v.y,
            curX: pt.x,
            curY: pt.y,
            color: v.pair.color,
            moved: false,
          };
          return;
        }
      }
    }

    _handlePointerMove(e) {
      if (!this.dragState || this._state !== 'playing') return;
      const pt = this._toCanvasCoords(e);
      if (Math.hypot(pt.x - this.dragState.startX, pt.y - this.dragState.startY) > 12) {
        this.dragState.moved = true;
      }
      this.dragState.curX = pt.x;
      this.dragState.curY = pt.y;
    }

    _handlePointerUp(e) {
      if (!this.dragState || this._state !== 'playing') {
        this.dragState = null;
        return;
      }

      const ds = this.dragState;
      this.dragState = null;
      const pt = this._toCanvasCoords(e);

      if (ds.fromType === 'receptor') {
        if (ds.moved) {
          // Dropped onto a specific virus?
          const hitVirus = this.viruses.find(
            v => v.state === 'flying' && Math.hypot(pt.x - v.x, pt.y - v.y) <= VIRUS_R * 1.9
          );
          if (hitVirus) {
            this._activateReceptorDefense(ds.receptor, hitVirus);
            return;
          }
        }
        // Simple click on receptor port!
        this._activateReceptorDefense(ds.receptor);
      } else if (ds.fromType === 'virus') {
        if (ds.moved) {
          // Dragged virus onto a receptor port!
          const hitRec = this.receptors.find(
            r => r.unlocked && Math.hypot(pt.x - r.x, pt.y - r.y) <= RECEPTOR_R * 1.9
          );
          if (hitRec) {
            this._activateReceptorDefense(hitRec, ds.virus);
            return;
          }
        }
        // Simple click on virus -> Lock-on target reticle!
        if (ds.virus.state === 'flying') {
          this.selectedVirusId = ds.virus.id;
          if (this.audio) this.audio.play('click');
          this._addPopup(
            'Targeted! Now click ' + ds.virus.pair.symbol + ' ' + ds.virus.pair.receptorName + ' below!',
            clamp(ds.virus.x, 220, CANVAS_W - 220),
            Math.max(55, ds.virus.y - 42),
            ds.virus.pair.color,
            14,
            1.6
          );
        }
      }
    }

    _handleKeyDown(e) {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (this._state === 'playing') this.pause();
        else if (this._state === 'paused') this.resume();
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.toggleScientistMode();
        return;
      }

      if (this._state !== 'playing') return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        const rec = this.receptors[num - 1];
        if (rec && rec.unlocked) {
          e.preventDefault();
          const dockBtn = document.querySelector('.antibody-btn[data-rec-id="' + rec.id + '"]');
          if (dockBtn) {
            dockBtn.classList.add('firing');
            setTimeout(() => dockBtn.classList.remove('firing'), 160);
          }
          this._activateReceptorDefense(rec);
        }
      }
    }

    toggleScientistMode() {
      this.scientistMode = !this.scientistMode;
      const stateEl = document.getElementById('sci-mode-state');
      if (stateEl) stateEl.textContent = this.scientistMode ? 'ON' : 'OFF';
      const btn = document.getElementById('scientist-toggle');
      if (btn) btn.classList.toggle('active', this.scientistMode);
      if (this.audio) this.audio.play('click');
    }

    // ─── RENDERING ───────────────────────────────────────────────────────────
    draw() {
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      this._drawBackdrop(ctx);
      this._drawTrajectoryLines(ctx);
      this._drawHostCell(ctx);
      this._drawReceptors(ctx);
      this._drawViruses(ctx);
      this._drawAntibodies(ctx);
      this._drawDragAimLine(ctx);
      this.particles.draw();
      this._drawPopups(ctx);

      if (this._bannerTimer > 0) {
        this._drawWaveBanner(ctx);
      }

      if (this._state === 'paused') {
        this._drawPauseOverlay(ctx);
      }

      ctx.restore();
    }

    _drawBackdrop(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, '#050914');
      bg.addColorStop(0.65, '#091326');
      bg.addColorStop(1, '#0D1D3A');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle biological hex/grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 60; x < CANVAS_W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 60; y < CANVAS_H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // Friendly top helper tip during first few seconds
      if (this._introHintTimer > 0 && this._bannerTimer <= 0) {
        const a = clamp(this._introHintTimer, 0, 1) * 0.9;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(15, 28, 52, 0.85)';
        ctx.strokeStyle = 'rgba(0, 229, 176, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(CANVAS_W / 2 - 280, 16, 560, 36, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 13.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💡 Tip: Match the shape inside each incoming virus to its Receptor Lock below!', CANVAS_W / 2, 39);
        ctx.restore();
      }
    }

    _drawTrajectoryLines(ctx) {
      const dashOffset = -(performance.now() / 45) % 18;
      for (const v of this.viruses) {
        if (v.state !== 'flying') continue;
        ctx.save();
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = dashOffset;
        ctx.strokeStyle = v.pair.color + '55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y + VIRUS_R);
        ctx.lineTo(v.targetRec.x, v.targetRec.y - RECEPTOR_R);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawHostCell(ctx) {
      ctx.save();

      // Lipid bilayer glow
      if (this._cellGlow > 0) {
        ctx.shadowColor = 'rgba(0, 229, 176, ' + (this._cellGlow * 0.8) + ')';
        ctx.shadowBlur = 35 * this._cellGlow;
      } else if (this._cellFlash > 0) {
        ctx.shadowColor = 'rgba(239, 68, 68, ' + (this._cellFlash * 0.9) + ')';
        ctx.shadowBlur = 40 * this._cellFlash;
      }

      const memGrad = ctx.createRadialGradient(
        CANVAS_W / 2, CELL_CY + 30, 30,
        CANVAS_W / 2, CELL_CY, CELL_RX
      );

      if (this._cellFlash > 0.15) {
        memGrad.addColorStop(0, 'rgba(185, 28, 28, 0.55)');
        memGrad.addColorStop(1, 'rgba(127, 29, 29, 0.35)');
      } else {
        memGrad.addColorStop(0, 'rgba(14, 116, 144, 0.36)');
        memGrad.addColorStop(0.7, 'rgba(15, 45, 88, 0.48)');
        memGrad.addColorStop(1, 'rgba(12, 32, 68, 0.65)');
      }

      ctx.beginPath();
      ctx.ellipse(CANVAS_W / 2, CELL_CY, CELL_RX, CELL_RY, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(CANVAS_W / 2 + CELL_RX, CANVAS_H + 20);
      ctx.lineTo(CANVAS_W / 2 - CELL_RX, CANVAS_H + 20);
      ctx.closePath();
      ctx.fillStyle = memGrad;
      ctx.fill();

      // Double-line phospholipid membrane border
      ctx.beginPath();
      ctx.ellipse(CANVAS_W / 2, CELL_CY, CELL_RX, CELL_RY, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = this._cellFlash > 0.15 ? '#F87171' : 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(CANVAS_W / 2, CELL_CY + 6, CELL_RX - 6, CELL_RY - 5, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 176, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Cell Nucleus Label
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.font = '700 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HUMAN HOST CELL MEMBRANE', CANVAS_W / 2, CANVAS_H - 18);

      ctx.restore();
    }

    _drawReceptors(ctx) {
      for (const r of this.receptors) {
        const shakeX = r.shake > 0 ? Math.sin(r.shake * Math.PI * 8) * 6 * r.shake : 0;
        const scale = 1 + r.pulse * 0.22;

        ctx.save();
        ctx.translate(r.x + shakeX, r.y);
        ctx.scale(scale, scale);

        if (!r.unlocked) {
          // Locked receptor slot
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, RECEPTOR_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94A3B8';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', 0, 1);
          ctx.restore();
          continue;
        }

        // Active glowing Receptor Dock
        ctx.shadowColor = r.pair.color;
        ctx.shadowBlur = 14 + r.pulse * 18;

        ctx.fillStyle = '#091326';
        ctx.strokeStyle = r.pair.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, RECEPTOR_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw complementary Key/Lock shape right inside the port
        drawKeyShape(ctx, r.pair.shapeKey, 0, 0, RECEPTOR_R * 0.56, r.pair.color, '#FFFFFF');

        // Key shortcut badge [1]..[5]
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = r.pair.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-11, RECEPTOR_R - 7, 22, 18, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(r.index + 1), 0, RECEPTOR_R + 2);

        // Clean label pill above receptor
        const lbl = r.pair.receptorName;
        ctx.font = '700 12px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(lbl).width + 14;
        ctx.fillStyle = 'rgba(6, 11, 22, 0.85)';
        ctx.beginPath();
        ctx.roundRect(-tw / 2, -RECEPTOR_R - 26, tw, 20, 10);
        ctx.fill();

        ctx.fillStyle = r.pair.color;
        ctx.fillText(lbl, 0, -RECEPTOR_R - 15);

        ctx.restore();
      }
    }

    _drawViruses(ctx) {
      for (const v of this.viruses) {
        ctx.save();
        ctx.translate(v.x, v.y);

        if (v.state === 'popping') {
          const p = v.popAge / 0.35;
          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = v.pair.color;
          ctx.lineWidth = 4 * (1 - p);
          ctx.beginPath();
          ctx.arc(0, 0, VIRUS_R * (1 + p * 1.4), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          continue;
        }

        // Selected target reticle if player clicked this virus
        if (this.selectedVirusId === v.id) {
          ctx.save();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, VIRUS_R + 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Countdown urgency ring around virus
        const rem = clamp(1 - v.progress, 0, 1);
        ctx.strokeStyle = rem < 0.3 ? '#EF4444' : v.pair.color + '88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, VIRUS_R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem);
        ctx.stroke();

        // Rotating outer viral body + spikes
        ctx.save();
        ctx.rotate(v.rot);
        ctx.shadowColor = v.pair.color;
        ctx.shadowBlur = 16;

        // 8 surface spikes
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const sx = Math.cos(a) * VIRUS_R;
          const sy = Math.sin(a) * VIRUS_R;
          const kx = Math.cos(a) * (VIRUS_R + 8);
          const ky = Math.sin(a) * (VIRUS_R + 8);
          ctx.strokeStyle = v.pair.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(kx, ky);
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(kx, ky, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Virus Core Sphere
        const bodyGrad = ctx.createRadialGradient(-8, -8, 3, 0, 0, VIRUS_R);
        bodyGrad.addColorStop(0, '#1E293B');
        bodyGrad.addColorStop(1, '#091122');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = v.pair.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, VIRUS_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Non-rotating crystal-clear Key Shape inside the center of the virus!
        drawKeyShape(ctx, v.pair.shapeKey, 0, 0, VIRUS_R * 0.56, v.pair.color, '#FFFFFF');

        // Readable Virus Name Pill above virus
        const title = this.scientistMode
          ? v.pair.scientificVirus + ' (' + v.pair.spikeName + ')'
          : v.pair.virusName;
        ctx.font = '700 12px Inter, system-ui, sans-serif';
        const w = ctx.measureText(title).width + 16;
        ctx.fillStyle = 'rgba(6, 11, 22, 0.88)';
        ctx.strokeStyle = v.pair.color + '88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -VIRUS_R - 32, w, 21, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 0, -VIRUS_R - 21.5);

        ctx.restore();
      }
    }

    _drawAntibodies(ctx) {
      // Draw glowing Y-shaped antibodies zooming up to neutralize viruses!
      for (const ab of this.antibodies) {
        const angle = Math.atan2(ab.endY - ab.startY, ab.endX - ab.startX) + Math.PI / 2;
        ctx.save();
        ctx.translate(ab.x, ab.y);
        ctx.rotate(angle);
        ctx.shadowColor = ab.color;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Y-shape antibody stem + two Fab arms!
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(0, 0);
        ctx.lineTo(-9, -10);
        ctx.moveTo(0, 0);
        ctx.lineTo(9, -10);
        ctx.stroke();

        ctx.strokeStyle = ab.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawDragAimLine(ctx) {
      if (!this.dragState || !this.dragState.moved) return;
      const ds = this.dragState;
      ctx.save();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.shadowColor = ds.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(ds.startX, ds.startY);
      ctx.lineTo(ds.curX, ds.curY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ds.curX, ds.curY, 10, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.fill();
      ctx.restore();
    }

    _drawPopups(ctx) {
      for (const p of this.popups) {
        const alpha = clamp(1 - p.age / p.life, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '800 ' + p.size + 'px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }
    }

    _drawWaveBanner(ctx) {
      const a = clamp(this._bannerTimer / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8, 15, 30, 0.90)';
      ctx.strokeStyle = '#00E5B0';
      ctx.lineWidth = 2;
      const bw = 580;
      const bh = 86;
      const bx = CANVAS_W / 2 - bw / 2;
      const by = 48;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00E5B0';
      ctx.font = '900 22px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this._bannerText, CANVAS_W / 2, by + 36);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 13.5px Inter, system-ui, sans-serif';
      ctx.fillText(this._bannerSub, CANVAS_W / 2, by + 63);
      ctx.restore();
    }

    _drawPauseOverlay(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(4, 8, 18, 0.78)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 44px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 12);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      ctx.fillText('Click anywhere or press [P] to continue', CANVAS_W / 2, CANVAS_H / 2 + 28);
      ctx.restore();
    }
  }

  VQ.Mode1Arcade = Mode1Arcade;
})();
