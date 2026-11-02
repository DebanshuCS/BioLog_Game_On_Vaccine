/**
 * mode2-lab.js — ViroQuest Mode 2: "Vaccine Maker Studio" (Interactive Biotech Workbench)
 * =======================================================================================
 * Calibrated for Class 12 Biotechnology & 1st-Year College Students:
 *  Station 0: Pick Target Virus (COVID-19, Seasonal Flu, HPV-16, Ebola)
 *  Station 1: Outer vs Inner Antigen Dissector + Click/Drag Gene into Circular Plasmid
 *  Station 2: Live Circular Plasmid Builder (Promoter, Origin, KanR Safety Marker)
 *  Station 3: Hands-On Wet-Lab Bench (42°C Heat-Shock + Blue-White Agar Picker + UV Gel!)
 *  Station 4: Vaccine Delivery Capsule Selector (mRNA-LNP, Viral Vector, Subunit, VLP)
 *  Station 5: Printable Vaccine Design Certificate + Protection Trial Score!
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { clamp, formatScore, shiftColor, escHtml } = VQ.utils;

  class Mode2Lab {
    constructor(container, services, callbacks) {
      this.container = container;
      this.audio = services.audio;
      this.storage = services.storage;
      this.callbacks = callbacks || {};

      this._raf = null;
      this._animTime = 0;
      this._lastNow = 0;

      this._resetDesign();
    }

    _resetDesign() {
      this.step = 0; // 0..5
      this.maxReachedStep = 0;
      this.virus = null;
      this.antigen = null;
      this.promoter = null;
      this.origin = null;
      this.marker = null;
      this.delivery = null;

      // Station 3 wet-lab interactive state
      this.heatShocked = false;
      this.heatAnim = 0; // 0 -> 1 during heat pulse
      this.colonies = [];
      this.pickedWhiteCount = 0;
      this.blueMistakes = 0;
      this.colonyMsg = 'Pulse 42°C Heat-Shock above first to move your plasmids into E. coli!';
      this.colonyMsgType = '';
      this.gelProgress = 0; // 0 -> 1 animated band migration
      this.gelVerified = false;
    }

    start() {
      this._resetDesign();
      this._renderShell();
      this._renderCurrentStep();
      this._startAnimLoop();
    }

    destroy() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
    }

    // ─── LIVE SCORE & PROTECTION CALCULATION ─────────────────────────────────
    _calcMetrics() {
      let pct = 0;
      if (this.antigen) pct += this.antigen.points; // max 35
      if (this.promoter) pct += this.promoter.points; // max 12
      if (this.origin) pct += this.origin.points; // max 11
      if (this.marker) pct += this.marker.points; // max 12
      if (this.gelVerified) {
        pct += this.blueMistakes === 0 ? 15 : 12; // max 15
      } else if (this.heatShocked) {
        pct += 6;
      }
      if (this.delivery && this.virus) {
        const isOptimal = this.delivery.bestFor.indexOf(this.virus.id) !== -1;
        pct += isOptimal ? 15 : 11; // max 15
      }
      pct = clamp(Math.round(pct), 0, 100);
      const studioScore = pct * 25; // up to 2,500 pts on leaderboard
      return { pct: pct, studioScore: studioScore };
    }

    // ─── TOP HUD + STEPPER SHELL ─────────────────────────────────────────────
    _renderShell() {
      this.container.innerHTML = `
        <header class="hud-bar">
          <div class="hud-left">
            <button type="button" class="hud-back-btn" id="m2-btn-back">← Menu</button>
            <span class="hud-mode-title">🧬 Vaccine Maker Studio</span>
            <span class="pill pill-amber" id="m2-virus-pill" hidden></span>
          </div>

          <div class="hud-mid">
            <div class="hud-wave-box" title="Live Vaccine Protection Readiness">
              <span class="hud-wave-label" id="m2-pct-label">Readiness: 0%</span>
              <div class="hud-wave-track">
                <div class="hud-wave-fill" id="m2-pct-fill" style="width: 0%"></div>
              </div>
            </div>
          </div>

          <div class="hud-right">
            <div class="hud-stat stat-score">
              <span class="hud-stat-label">Lab Score</span>
              <span class="hud-stat-value" id="m2-score-val">0</span>
            </div>
            <button type="button" class="hud-icon-btn" id="m2-btn-restart" title="Start a fresh vaccine">↺ Reset</button>
          </div>
        </header>

        <nav class="studio-stepper-bar" id="m2-stepper" aria-label="Vaccine Design Steps"></nav>

        <div class="studio-body" id="m2-body"></div>
      `;

      document.getElementById('m2-btn-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        if (this.callbacks.onBack) this.callbacks.onBack();
      });

      document.getElementById('m2-btn-restart').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._resetDesign();
        this._renderCurrentStep();
      });
    }

    _updateShellHUD() {
      const { pct, studioScore } = this._calcMetrics();
      const pctLbl = document.getElementById('m2-pct-label');
      const pctFill = document.getElementById('m2-pct-fill');
      const scoreVal = document.getElementById('m2-score-val');
      const virusPill = document.getElementById('m2-virus-pill');

      if (pctLbl) pctLbl.textContent = 'Protection: ' + pct + '%';
      if (pctFill) pctFill.style.width = pct + '%';
      if (scoreVal) scoreVal.textContent = formatScore(studioScore);

      if (virusPill) {
        if (this.virus) {
          virusPill.hidden = false;
          virusPill.textContent = '🦠 Target: ' + this.virus.name;
        } else {
          virusPill.hidden = true;
        }
      }

      // Render Stepper Pills
      const stepper = document.getElementById('m2-stepper');
      if (!stepper) return;

      const steps = VQ.STUDIO_STEPS;
      let html = '';
      steps.forEach((s, idx) => {
        let cls = 'studio-step-pill';
        if (this.step === s.step) cls += ' current';
        else if (s.step < this.step || s.step <= this.maxReachedStep) cls += ' done';

        const clickable = s.step <= this.maxReachedStep && s.step !== this.step;
        html += `
          <button type="button" class="${cls}" data-goto="${s.step}" ${clickable ? '' : 'disabled'}>
            <span class="step-num">${s.step < this.step ? '✓' : idx + 1}</span>
            <span>${s.icon} ${escHtml(s.title.replace(/^\d+\.\s*/, ''))}</span>
          </button>
        `;
        if (idx < steps.length - 1) {
          html += '<span class="studio-step-arrow">▸</span>';
        }
      });

      if (this.step === 5 || this.maxReachedStep === 5) {
        html += '<span class="studio-step-arrow">▸</span>';
        html += `
          <button type="button" class="studio-step-pill ${this.step === 5 ? 'current' : 'done'}" data-goto="5">
            <span class="step-num">🏆</span>
            <span>Certificate</span>
          </button>
        `;
      }

      stepper.innerHTML = html;
      stepper.querySelectorAll('[data-goto]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = parseInt(btn.dataset.goto, 10);
          if (!isNaN(target) && target <= this.maxReachedStep) {
            if (this.audio) this.audio.play('click');
            this._goToStep(target);
          }
        });
      });
    }

    _goToStep(nextStep) {
      this.step = nextStep;
      if (nextStep > this.maxReachedStep) {
        this.maxReachedStep = nextStep;
      }
      this._renderCurrentStep();
    }

    _renderCurrentStep() {
      this._updateShellHUD();
      const body = document.getElementById('m2-body');
      if (!body) return;
      body.scrollTop = 0;

      this._activeCanvasDraw = null;

      switch (this.step) {
        case 0:
          this._renderStep0VirusSelect(body);
          break;
        case 1:
          this._renderStep1Antigen(body);
          break;
        case 2:
          this._renderStep2Plasmid(body);
          break;
        case 3:
          this._renderStep3CloneBench(body);
          break;
        case 4:
          this._renderStep4Delivery(body);
          break;
        case 5:
          this._renderStep5Report(body);
          break;
      }
    }

    // ─── ANIMATION LOOP FOR ACTIVE WORKBENCH CANVAS ──────────────────────────
    _startAnimLoop() {
      this._lastNow = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - this._lastNow) / 1000, 0.05);
        this._lastNow = now;
        this._animTime += dt;

        if (this.heatShocked && this.heatAnim < 1) {
          this.heatAnim = Math.min(1, this.heatAnim + dt * 1.15);
        }

        if (this.pickedWhiteCount >= 2 && this.gelProgress < 1) {
          this.gelProgress = Math.min(1, this.gelProgress + dt * 0.95);
          if (this.gelProgress >= 1 && !this.gelVerified) {
            this.gelVerified = true;
            if (this.audio) this.audio.play('success');
            this._updateShellHUD();
            const nextBtn = document.getElementById('m2-step3-next');
            if (nextBtn) nextBtn.disabled = false;
            const fb = document.getElementById('m2-step3-feedback');
            if (fb) {
              fb.className = 'lab-feedback-box good';
              fb.innerHTML =
                '✅ <strong>UV Gel Confirmed!</strong> Both white colonies show the <strong>2,200 bp plasmid backbone</strong> PLUS your exact <strong>' +
                this.antigen.lengthBp.toLocaleString() +
                ' bp ' +
                escHtml(this.antigen.name) +
                '</strong> band!';
            }
          }
        }

        if (typeof this._activeCanvasDraw === 'function') {
          this._activeCanvasDraw(this._animTime, dt);
        }

        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    }

    // =========================================================================
    // STATION 0: PICK TARGET VIRUS
    // =========================================================================
    _renderStep0VirusSelect(body) {
      const viruses = VQ.TARGET_VIRUSES;
      body.innerHTML = `
        <div class="virus-select-wrap">
          <div class="station-heading">
            <span class="pill pill-amber" style="margin-bottom: 8px;">Step 1 of 5 · Target Selection</span>
            <h2>Choose a Virus to Engineer a Vaccine Against</h2>
            <p>You don't inject the whole dangerous virus! Instead, you'll copy ONE harmless outer protein blueprint so the immune system learns to recognize it safely.</p>
          </div>
          <div class="virus-select-grid" id="m2-virus-grid"></div>
        </div>
      `;

      const grid = document.getElementById('m2-virus-grid');
      viruses.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'virus-target-card';
        card.style.setProperty('--card-accent', v.color);
        card.innerHTML = `
          <span class="pill pill-teal">${escHtml(v.badge)}</span>
          <div class="virus-canvas-thumb">
            <canvas width="76" height="76"></canvas>
          </div>
          <div class="virus-target-name">${escHtml(v.name)}</div>
          <div class="virus-target-sub">${escHtml(v.scientificName)}</div>
          <p class="virus-target-blurb">${escHtml(v.blurb)}</p>
          <button type="button" class="btn btn-amber btn-sm" style="width: 100%; margin-top: 4px;">
            Select ${escHtml(v.name)} →
          </button>
        `;

        const cvs = card.querySelector('canvas');
        const ctx = cvs.getContext('2d');
        const drawFn = VQ.VIRUS_SILHOUETTES[v.silhouette] || VQ.VIRUS_SILHOUETTES.spherical;
        drawFn(ctx, 38, 38, 28, v.color);

        card.addEventListener('click', () => {
          if (this.virus && this.virus.id !== v.id) {
            // Switching virus resets downstream choices cleanly
            this._resetDesign();
          }
          this.virus = v;
          if (this.storage) this.storage.setProgress('first_match_done', true);
          if (this.audio) this.audio.play('match');
          this._goToStep(1);
        });

        grid.appendChild(card);
      });
    }

    // =========================================================================
    // STATION 1: VISUAL ANTIGEN DISSECTOR + DRAG/CLICK INTO PLASMID
    // =========================================================================
    _renderStep1Antigen(body) {
      const v = this.virus;
      body.innerHTML = `
        <div class="studio-split">
          <div class="studio-panel">
            <div class="studio-panel-head">
              <h3>🎯 Pick 1 Viral Gene (Antigen)</h3>
              <span class="pill pill-cyan">Click or Drag →</span>
            </div>
            <div class="studio-panel-body">
              <p style="font-size: 0.83rem; color: var(--text-secondary); line-height: 1.45;">
                <strong>Golden Rule of Vaccines:</strong> Antibodies patrol <em>outside</em> cells. Pick a gene for a protein sitting on the <strong>outer surface</strong> of ${escHtml(v.name)}!
              </p>
              <div id="m2-antigen-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
          </div>

          <div class="studio-visual-stage" id="m2-antigen-dropzone">
            <div style="text-align: center;">
              <span class="pill pill-teal">Interactive Dissector &amp; DNA Drop Zone</span>
              <h3 style="font-size: 1.1rem; color: var(--text-white); margin-top: 6px;">
                ${escHtml(v.name)} Structure → Insert Gene into Plasmid Ring
              </h3>
            </div>

            <canvas id="m2-canvas-step1" width="600" height="270" style="border-radius: 14px; background: rgba(5, 10, 22, 0.72); border: 1px solid rgba(148,163,184,0.16); max-width: 100%;"></canvas>

            <div class="lab-feedback-box" id="m2-step1-feedback">
              👆 Click (or drag) any viral gene card on the left into the circular DNA plasmid ring!
            </div>

            <div class="studio-action-row">
              <button type="button" class="btn btn-ghost btn-sm" id="m2-step1-back">← Change Virus</button>
              <button type="button" class="btn btn-primary" id="m2-step1-next" ${this.antigen ? '' : 'disabled'}>
                Next: Build Plasmid →
              </button>
            </div>
          </div>
        </div>
      `;

      const listEl = document.getElementById('m2-antigen-list');
      const dropZone = document.getElementById('m2-antigen-dropzone');
      const feedbackEl = document.getElementById('m2-step1-feedback');
      const nextBtn = document.getElementById('m2-step1-next');

      const selectAntigen = (ag) => {
        this.antigen = ag;
        if (this.audio) this.audio.play(ag.isGood ? 'match' : 'miss');
        this._updateShellHUD();

        listEl.querySelectorAll('.choice-card').forEach((c) => {
          const isSel = c.dataset.agId === ag.id;
          c.classList.toggle('selected', isSel);
          c.classList.toggle('suboptimal', isSel && !ag.isGood);
        });

        feedbackEl.className = 'lab-feedback-box ' + (ag.isGood ? 'good' : 'warn');
        feedbackEl.innerHTML =
          (ag.isOptimal ? '🌟 ' : ag.isGood ? '👍 ' : '⚠️ ') +
          '<strong>' +
          escHtml(ag.name) +
          ':</strong> ' +
          escHtml(ag.feedback);

        nextBtn.disabled = false;
      };

      v.antigens.forEach((ag) => {
        const card = document.createElement('div');
        const isSel = this.antigen && this.antigen.id === ag.id;
        card.className = 'choice-card' + (isSel ? ' selected' + (!ag.isGood ? ' suboptimal' : '') : '');
        card.dataset.agId = ag.id;
        card.draggable = true;

        const pillClass = ag.location.indexOf('Outer') !== -1 ? 'pill-teal' : 'pill-amber';
        card.innerHTML = `
          <div class="choice-card-top">
            <span class="choice-card-title">🧬 ${escHtml(ag.name)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="pill ${pillClass}">${escHtml(ag.location)}</span>
            <span style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-muted);">${ag.lengthBp.toLocaleString()} bp</span>
          </div>
          <p class="choice-card-desc">${escHtml(ag.summary)}</p>
        `;

        card.addEventListener('click', () => selectAntigen(ag));
        card.addEventListener('dragstart', (e) => {
          card.classList.add('dragging');
          if (e.dataTransfer) e.dataTransfer.setData('text/plain', ag.id);
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));

        listEl.appendChild(card);
      });

      if (this.antigen) {
        feedbackEl.className = 'lab-feedback-box ' + (this.antigen.isGood ? 'good' : 'warn');
        feedbackEl.innerHTML = '<strong>' + escHtml(this.antigen.name) + ':</strong> ' + escHtml(this.antigen.feedback);
      }

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#00E5B0';
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        const agId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
        const found = v.antigens.find((a) => a.id === agId);
        if (found) selectAntigen(found);
      });

      document.getElementById('m2-step1-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._goToStep(0);
      });
      nextBtn.addEventListener('click', () => {
        if (!this.antigen) return;
        if (this.audio) this.audio.play('click');
        this._goToStep(2);
      });

      // Live Canvas Diagram for Station 1
      const cvs = document.getElementById('m2-canvas-step1');
      const ctx = cvs.getContext('2d');
      this._activeCanvasDraw = (t) => {
        ctx.clearRect(0, 0, 600, 270);

        // Left Half: Cutaway Virus Anatomy (x = 155, y = 132)
        const vx = 155;
        const vy = 132;
        const outerChosen = this.antigen && this.antigen.isGood;
        const innerChosen = this.antigen && !this.antigen.isGood;

        // Outer lipid/capsid shell
        ctx.save();
        ctx.beginPath();
        ctx.arc(vx, vy, 58, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.fill();
        ctx.lineWidth = outerChosen ? 4 : 2;
        ctx.strokeStyle = outerChosen ? '#00E5B0' : v.color;
        ctx.stroke();

        // Outer spikes around virus
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + t * 0.25;
          const sx = vx + Math.cos(a) * 58;
          const sy = vy + Math.sin(a) * 58;
          const kx = vx + Math.cos(a) * 78;
          const ky = vy + Math.sin(a) * 78;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(kx, ky);
          ctx.strokeStyle = outerChosen ? '#00E5B0' : v.color;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(kx, ky, outerChosen ? 6.5 : 5, 0, Math.PI * 2);
          ctx.fillStyle = outerChosen ? '#00E5B0' : shiftColor(v.color, 35);
          ctx.fill();
        }

        // Hidden Inner Core + coiled genome
        ctx.beginPath();
        ctx.arc(vx, vy, 31, 0, Math.PI * 2);
        ctx.fillStyle = innerChosen ? 'rgba(245, 158, 11, 0.32)' : 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = innerChosen ? '#FFB547' : '#64748B';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Squiggly RNA/DNA inside core
        ctx.beginPath();
        for (let x = -18; x <= 18; x += 3) {
          const y = Math.sin(x * 0.35 + t * 3) * 7;
          if (x === -18) ctx.moveTo(vx + x, vy + y);
          else ctx.lineTo(vx + x, vy + y);
        }
        ctx.strokeStyle = innerChosen ? '#FFB547' : '#94A3B8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels on Virus
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = outerChosen ? '#00E5B0' : '#E2E8F0';
        ctx.fillText('🌐 ' + v.outerLabel, vx, 30);
        ctx.fillStyle = innerChosen ? '#FFB547' : '#94A3B8';
        ctx.fillText('🔒 ' + v.innerLabel + ' (Inside)', vx, 244);

        // Animated arrow from Virus -> Plasmid
        ctx.beginPath();
        ctx.moveTo(258, 132);
        ctx.lineTo(332, 132);
        ctx.strokeStyle = this.antigen ? '#00E5B0' : 'rgba(148,163,184,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(338, 132);
        ctx.lineTo(326, 125);
        ctx.lineTo(326, 139);
        ctx.closePath();
        ctx.fillStyle = this.antigen ? '#00E5B0' : 'rgba(148,163,184,0.35)';
        ctx.fill();

        ctx.font = '700 10px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('EcoRI / BamHI', 296, 118);
        ctx.fillText('Cut & Paste', 296, 150);

        // Right Half: Circular Plasmid Drop Ring (x = 455, y = 132)
        const px = 455;
        const py = 132;
        const pr = 72;

        // Backbone circle
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 12;
        ctx.stroke();

        // Cloning slot arc (-0.7 rad to +0.7 rad)
        ctx.beginPath();
        ctx.arc(px, py, pr, -0.75, 0.75);
        if (this.antigen) {
          ctx.strokeStyle = this.antigen.isGood ? '#00E5B0' : '#FFB547';
          ctx.lineWidth = 16;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 12;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Center text inside plasmid
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.fillText(this.antigen ? 'Gene Inserted!' : 'Empty Plasmid', px, py - 6);
        ctx.font = '600 11px monospace';
        ctx.fillStyle = this.antigen ? '#00E5B0' : '#94A3B8';
        ctx.fillText(
          this.antigen ? this.antigen.lengthBp + ' bp GOI' : 'Drop Gene Here',
          px,
          py + 13
        );
        ctx.restore();
      };
    }

    // =========================================================================
    // STATION 2: LIVE CIRCULAR PLASMID BUILDER
    // =========================================================================
    _renderStep2Plasmid(body) {
      const parts = VQ.PLASMID_PARTS;
      const allChosen = Boolean(this.promoter && this.origin && this.marker);

      body.innerHTML = `
        <div class="studio-split">
          <div class="studio-panel">
            <div class="studio-panel-head">
              <h3>⭕ Snap Together Plasmid Parts</h3>
              <span class="pill pill-amber" id="m2-parts-count">${(this.promoter ? 1 : 0) + (this.origin ? 1 : 0) + (this.marker ? 1 : 0)} / 3 Parts</span>
            </div>
            <div class="studio-panel-body">
              <div class="builder-group">
                <div class="builder-group-label">⚡ 1. Gene "ON" Switch (Promoter)</div>
                <div class="builder-options-row" id="m2-grp-promoter"></div>
              </div>

              <div class="builder-group">
                <div class="builder-group-label">🔄 2. Bacterial Copy Engine (Origin)</div>
                <div class="builder-options-row" id="m2-grp-origin"></div>
              </div>

              <div class="builder-group">
                <div class="builder-group-label">🛡️ 3. Antibiotic Safety Tag (Marker)</div>
                <div class="builder-options-row" id="m2-grp-marker"></div>
              </div>
            </div>
          </div>

          <div class="studio-visual-stage">
            <div style="text-align: center;">
              <span class="pill pill-teal">Live Recombinant Vector Map</span>
              <h3 style="font-size: 1.08rem; color: var(--text-white); margin-top: 5px;">
                pVQ-${escHtml(this.virus.name.replace(/\s+/g, ''))} Circular DNA Ring
              </h3>
            </div>

            <canvas id="m2-canvas-plasmid" width="540" height="290" style="max-width: 100%;"></canvas>

            <div class="lab-feedback-box" id="m2-step2-feedback">
              Select a <strong>Promoter</strong>, <strong>Origin</strong>, and <strong>Safety Marker</strong> on the left to complete your circular DNA blueprint!
            </div>

            <div class="studio-action-row">
              <button type="button" class="btn btn-ghost btn-sm" id="m2-step2-back">← Back to Antigen</button>
              <button type="button" class="btn btn-primary" id="m2-step2-next" ${allChosen ? '' : 'disabled'}>
                Next: Clone in Lab Bench →
              </button>
            </div>
          </div>
        </div>
      `;

      const feedbackEl = document.getElementById('m2-step2-feedback');
      const nextBtn = document.getElementById('m2-step2-next');
      const countPill = document.getElementById('m2-parts-count');

      const buildGroup = (containerId, items, currentProp) => {
        const wrap = document.getElementById(containerId);
        items.forEach((item) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          const isSel = this[currentProp] && this[currentProp].id === item.id;
          btn.className = 'mini-option-btn' + (isSel ? ' selected' + (!item.isCorrect ? ' warn' : '') : '');
          btn.dataset.itemId = item.id;
          btn.innerHTML = `
            <div style="min-width: 0;">
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-white);">${escHtml(item.name)}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${escHtml(item.desc)}</div>
            </div>
            <span class="pill ${item.isCorrect ? 'pill-teal' : 'pill-amber'}" style="flex-shrink: 0;">${escHtml(item.badge)}</span>
          `;

          btn.addEventListener('click', () => {
            this[currentProp] = item;
            if (this.audio) this.audio.play(item.isCorrect ? 'match' : 'miss');
            this._updateShellHUD();

            wrap.querySelectorAll('.mini-option-btn').forEach((b) => {
              const sel = b.dataset.itemId === item.id;
              b.classList.toggle('selected', sel);
              b.classList.toggle('warn', sel && !item.isCorrect);
            });

            feedbackEl.className = 'lab-feedback-box ' + (item.isCorrect ? 'good' : 'warn');
            feedbackEl.innerHTML =
              (item.isCorrect ? '✅ ' : '⚠️ ') +
              '<strong>' +
              escHtml(item.name) +
              ':</strong> ' +
              escHtml(item.feedback);

            const readyCount = (this.promoter ? 1 : 0) + (this.origin ? 1 : 0) + (this.marker ? 1 : 0);
            countPill.textContent = readyCount + ' / 3 Parts';
            nextBtn.disabled = readyCount < 3;
          });

          wrap.appendChild(btn);
        });
      };

      buildGroup('m2-grp-promoter', parts.promoters, 'promoter');
      buildGroup('m2-grp-origin', parts.origins, 'origin');
      buildGroup('m2-grp-marker', parts.markers, 'marker');

      document.getElementById('m2-step2-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._goToStep(1);
      });
      nextBtn.addEventListener('click', () => {
        if (!(this.promoter && this.origin && this.marker)) return;
        if (this.audio) this.audio.play('click');
        this._goToStep(3);
      });

      const cvs = document.getElementById('m2-canvas-plasmid');
      const ctx = cvs.getContext('2d');
      this._activeCanvasDraw = (t) => {
        this._drawPlasmidMap(ctx, 540, 290, t);
      };
    }

    _drawPlasmidMap(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const r = 98;

      // Subtle outer glow when complete
      const complete = Boolean(this.promoter && this.origin && this.marker);
      if (complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 176, ' + (0.18 + Math.sin(t * 3) * 0.08) + ')';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.restore();
      }

      // Double-stranded circular DNA ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 16;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.stroke();

      const drawSegment = (startDeg, endDeg, color, label, active) => {
        const a1 = (startDeg * Math.PI) / 180;
        const a2 = (endDeg * Math.PI) / 180;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, a1, a2);
        if (active) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 18;
          ctx.lineCap = 'butt';
          ctx.stroke();
        } else {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 14;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Leader tick + external label
        const mid = (a1 + a2) / 2;
        const lx1 = cx + Math.cos(mid) * (r + 12);
        const ly1 = cy + Math.sin(mid) * (r + 12);
        const lx2 = cx + Math.cos(mid) * (r + 30);
        const ly2 = cy + Math.sin(mid) * (r + 30);
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = active ? color : '#64748B';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '700 11.5px Inter, sans-serif';
        ctx.fillStyle = active ? '#F8FAFC' : '#94A3B8';
        ctx.textAlign = Math.cos(mid) >= 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const pad = Math.cos(mid) >= 0 ? 6 : -6;
        ctx.fillText(label, lx2 + pad, ly2);
        ctx.restore();
      };

      // 1. Promoter (-135 to -75 deg, top-left/top)
      drawSegment(
        -140,
        -80,
        this.promoter && !this.promoter.isCorrect ? '#F59E0B' : '#38BDF8',
        this.promoter ? '⚡ ' + this.promoter.name.split(' ')[0] + ' Promoter' : '⚡ [Pick Promoter]',
        Boolean(this.promoter)
      );

      // 2. Antigen Gene (-72 to +32 deg, top-right)
      const shortAgName = this.antigen
        ? this.antigen.name.replace(/\s*Gene.*$/i, '').replace(/\s*\(.*$/, '')
        : 'Antigen';
      drawSegment(
        -72,
        32,
        this.antigen && this.antigen.isGood ? '#00E5B0' : '#F59E0B',
        '🧬 ' + shortAgName,
        true
      );

      // Restriction cut site ticks around Antigen
      [-75, 35].forEach((deg, idx) => {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * (r - 13), cy + Math.sin(rad) * (r - 13));
        ctx.lineTo(cx + Math.cos(rad) * (r + 13), cy + Math.sin(rad) * (r + 13));
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.font = '700 9.5px monospace';
        ctx.fillStyle = '#F472B6';
        ctx.textAlign = 'center';
        ctx.fillText(idx === 0 ? 'EcoRI' : 'BamHI', cx + Math.cos(rad) * (r - 26), cy + Math.sin(rad) * (r - 24));
      });

      // 3. Origin of Replication (60 to 130 deg, bottom-right/bottom)
      drawSegment(
        58,
        125,
        this.origin && !this.origin.isCorrect ? '#F59E0B' : '#A855F7',
        this.origin ? '🔄 ' + this.origin.name.split(' ')[0] + ' Ori' : '🔄 [Pick Origin]',
        Boolean(this.origin)
      );

      // 4. Antibiotic Marker (145 to 208 deg, bottom-left)
      drawSegment(
        145,
        208,
        this.marker && !this.marker.isCorrect ? '#F59E0B' : '#FFB547',
        this.marker ? '🛡️ ' + (this.marker.id === 'kan_r' ? 'KanR Safe' : 'AmpR Tag') : '🛡️ [Pick Marker]',
        Boolean(this.marker)
      );

      // Center Plasmid Summary
      const totalBp =
        2150 +
        (this.antigen ? this.antigen.lengthBp : 0) +
        (this.promoter ? this.promoter.sizeBp : 0) +
        (this.origin ? this.origin.sizeBp : 0) +
        (this.marker ? this.marker.sizeBp : 0);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '800 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('pVQ-' + this.virus.name.split(' ')[0], cx, cy - 8);

      ctx.fillStyle = '#00E5B0';
      ctx.font = '700 11.5px monospace';
      ctx.fillText(totalBp.toLocaleString() + ' bp', cx, cy + 10);

      ctx.fillStyle = complete ? '#86EFAC' : '#94A3B8';
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillText(complete ? '✓ Ready to Clone!' : 'Select 3 Parts', cx, cy + 27);
    }

    // =========================================================================
    // STATION 3: HANDS-ON CLONING & SCREENING LAB BENCH
    // (42°C Heat-Shock + Blue-White Agar Colony Picker + UV Gel Electrophoresis)
    // =========================================================================
    _initColoniesIfNeeded() {
      if (this.colonies.length > 0) return;
      // Fixed clean positions inside circular Petri dish (radius 86 around 105,105)
      const spots = [
        { x: 72,  y: 66,  isWhite: true,  picked: false },
        { x: 138, y: 68,  isWhite: false, picked: false },
        { x: 64,  y: 118, isWhite: false, picked: false },
        { x: 110, y: 104, isWhite: true,  picked: false },
        { x: 150, y: 118, isWhite: true,  picked: false },
        { x: 85,  y: 150, isWhite: true,  picked: false },
        { x: 134, y: 152, isWhite: false, picked: false },
      ];
      this.colonies = spots;
    }

    _renderStep3CloneBench(body) {
      this._initColoniesIfNeeded();

      body.innerHTML = `
        <div class="studio-split">
          <div class="studio-panel">
            <div class="studio-panel-head">
              <h3>🧫 Wet-Lab Cloning Bench</h3>
              <span class="pill pill-teal" id="m2-colony-counter">${this.pickedWhiteCount} / 2 White Clones</span>
            </div>

            <div class="studio-panel-body" style="gap: 14px;">
              <!-- Mini-Bench A: 42°C Heat Shock -->
              <div style="background: rgba(0,0,0,0.28); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <strong style="font-size: 0.85rem; color: var(--text-white);">Step A: 42°C Heat-Shock Transformation</strong>
                  <span class="pill ${this.heatShocked ? 'pill-green' : 'pill-amber'}" id="m2-heat-pill">
                    ${this.heatShocked ? '42°C Done ✓' : '4°C Ice Bath'}
                  </span>
                </div>
                <canvas id="m2-canvas-heat" width="356" height="76" style="width: 100%; border-radius: 8px; background: #070E1C; margin-bottom: 8px;"></canvas>
                <button type="button" class="btn ${this.heatShocked ? 'btn-secondary' : 'btn-amber'} btn-sm" id="m2-btn-heat" style="width: 100%;" ${this.heatShocked ? 'disabled' : ''}>
                  ${this.heatShocked ? '✓ Plasmids Inside E. coli!' : '🔥 1. Pulse 42°C Heat-Shock (Open Cell Pores!)'}
                </button>
              </div>

              <!-- Mini-Bench B: Blue-White Colony Agar Plate -->
              <div style="background: rgba(0,0,0,0.28); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
                  <strong style="font-size: 0.85rem; color: var(--text-white);">Step B: Pick 2 WHITE Colonies</strong>
                  <span style="font-size: 0.73rem; color: var(--text-secondary);">⚪ Gene In · 🔵 Empty</span>
                </div>

                <canvas id="m2-canvas-agar" width="210" height="210" style="cursor: pointer; border-radius: 50%;"></canvas>

                <div id="m2-agar-msg" style="font-size: 0.79rem; text-align: center; color: var(--text-secondary); min-height: 2.2em;">
                  ${escHtml(this.colonyMsg)}
                </div>
              </div>
            </div>
          </div>

          <div class="studio-visual-stage">
            <div style="text-align: center;">
              <span class="pill pill-purple">Step C · DNA Fingerprint Check</span>
              <h3 style="font-size: 1.08rem; color: var(--text-white); margin-top: 5px;">
                🔬 UV Agarose Gel Electrophoresis
              </h3>
              <p style="font-size: 0.81rem; color: var(--text-secondary); margin-top: 2px;">
                Shorter DNA pieces race faster toward the <strong>(+)</strong> bottom electrode!
              </p>
            </div>

            <canvas id="m2-canvas-gel" width="540" height="255" style="border-radius: 14px; background: #050814; border: 1px solid rgba(168,85,247,0.35); max-width: 100%;"></canvas>

            <div class="lab-feedback-box ${this.gelVerified ? 'good' : ''}" id="m2-step3-feedback">
              ${
                this.gelVerified
                  ? '✅ <strong>UV Gel Confirmed!</strong> Both white colonies carry the <strong>' +
                    this.antigen.lengthBp.toLocaleString() +
                    ' bp ' +
                    escHtml(this.antigen.name) +
                    '</strong> insert!'
                  : '🔬 Complete <strong>Step A (Heat-Shock)</strong> and click <strong>2 glowing WHITE colonies</strong> on the Agar plate to run the UV DNA gel!'
              }
            </div>

            <div class="studio-action-row">
              <button type="button" class="btn btn-ghost btn-sm" id="m2-step3-back">← Back to Plasmid</button>
              <button type="button" class="btn btn-primary" id="m2-step3-next" ${this.gelVerified ? '' : 'disabled'}>
                Next: Package Vaccine →
              </button>
            </div>
          </div>
        </div>
      `;

      const heatBtn = document.getElementById('m2-btn-heat');
      const heatPill = document.getElementById('m2-heat-pill');
      const agarCanvas = document.getElementById('m2-canvas-agar');
      const agarMsg = document.getElementById('m2-agar-msg');
      const colonyCounter = document.getElementById('m2-colony-counter');

      heatBtn.addEventListener('click', () => {
        if (this.heatShocked) return;
        this.heatShocked = true;
        this.heatAnim = 0.05;
        if (this.audio) this.audio.play('heat');
        this._updateShellHUD();

        heatBtn.disabled = true;
        heatBtn.className = 'btn btn-secondary btn-sm';
        heatBtn.textContent = '✓ Plasmids Inside E. coli!';
        heatPill.className = 'pill pill-green';
        heatPill.textContent = '42°C Done ✓';

        this.colonyMsg = 'Awesome! Now click 2 glowing WHITE colonies on the Petri dish above!';
        agarMsg.style.color = '#00E5B0';
        agarMsg.textContent = this.colonyMsg;
      });

      agarCanvas.addEventListener('click', (e) => {
        if (!this.heatShocked) {
          if (this.audio) this.audio.play('miss');
          agarMsg.style.color = '#FFB547';
          agarMsg.textContent = '👆 Click "1. Pulse 42°C Heat-Shock" above first so bacteria grow on the plate!';
          return;
        }
        if (this.pickedWhiteCount >= 2) return;

        const rect = agarCanvas.getBoundingClientRect();
        const sx = ((e.clientX - rect.left) / rect.width) * 210;
        const sy = ((e.clientY - rect.top) / rect.height) * 210;

        for (const col of this.colonies) {
          if (Math.hypot(sx - col.x, sy - col.y) <= 18) {
            if (col.picked) return;
            if (!col.isWhite) {
              this.blueMistakes++;
              if (this.audio) this.audio.play('miss');
              this.colonyMsg = '🔵 Blue Colony = Empty Plasmid (unbroken lacZ gene)! Pick a WHITE colony!';
              agarMsg.style.color = '#FCA5A5';
              agarMsg.textContent = this.colonyMsg;
              return;
            }

            col.picked = true;
            this.pickedWhiteCount++;
            colonyCounter.textContent = this.pickedWhiteCount + ' / 2 White Clones';

            if (this.pickedWhiteCount < 2) {
              if (this.audio) this.audio.play('match');
              this.colonyMsg = '⚪ Clone #1 loaded! Pick 1 more WHITE colony to start the UV Gel!';
              agarMsg.style.color = '#00E5B0';
              agarMsg.textContent = this.colonyMsg;
            } else {
              if (this.audio) this.audio.play('scan');
              this.colonyMsg = '⚡ Both White Clones loaded! Scanning DNA bands under UV light...';
              agarMsg.style.color = '#00E5B0';
              agarMsg.textContent = this.colonyMsg;
            }
            return;
          }
        }
      });

      document.getElementById('m2-step3-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._goToStep(2);
      });
      document.getElementById('m2-step3-next').addEventListener('click', () => {
        if (!this.gelVerified) return;
        if (this.audio) this.audio.play('click');
        this._goToStep(4);
      });

      const heatCvs = document.getElementById('m2-canvas-heat');
      const heatCtx = heatCvs.getContext('2d');
      const agarCtx = agarCanvas.getContext('2d');
      const gelCvs = document.getElementById('m2-canvas-gel');
      const gelCtx = gelCvs.getContext('2d');

      this._activeCanvasDraw = (t) => {
        this._drawHeatShock(heatCtx, 356, 76, t);
        this._drawAgarPlate(agarCtx, 210, 210, t);
        this._drawUvGel(gelCtx, 540, 255, t);
      };
    }

    _drawHeatShock(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h);
      const prog = this.heatShocked ? this.heatAnim : 0;

      // Warm glow during 42°C pulse
      if (prog > 0) {
        ctx.fillStyle = 'rgba(245, 158, 11, ' + (0.14 * Math.sin(prog * Math.PI) + 0.06) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      // Draw 2 rod-shaped E. coli bacteria
      [105, 225].forEach((bx, idx) => {
        const by = 38;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx - 38, by - 18, 76, 36, 18);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.fill();
        ctx.setLineDash(prog > 0.1 && prog < 0.9 ? [5, 4] : []);
        ctx.strokeStyle = prog > 0 ? '#00E5B0' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Mini plasmid ring moving from outside -> inside bacterium!
        const startX = bx - 52;
        const endX = bx + (idx === 0 ? -8 : 8);
        const px = startX + (endX - startX) * prog;
        const py = by + Math.sin(t * 3 + idx) * (1 - prog) * 4;

        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFB547';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 8, -0.8, 0.8);
        ctx.strokeStyle = '#00E5B0';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '700 9.5px Inter, sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.textAlign = 'center';
        ctx.fillText('E. coli', bx + 12, by + 4);
        ctx.restore();
      });

      // Thermometer badge on right
      const temp = Math.round(4 + 38 * prog);
      ctx.fillStyle = prog > 0 ? '#FFB547' : '#38BDF8';
      ctx.font = '800 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(temp + '°C', w - 14, 43);
    }

    _drawAgarPlate(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const r = 96;

      // Petri dish rim & nutrient agar
      const grad = ctx.createRadialGradient(cx - 18, cy - 18, 10, cx, cy, r);
      grad.addColorStop(0, '#132840');
      grad.addColorStop(1, '#091526');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.stroke();

      // Subtle agar grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - r + 10, cy);
      ctx.lineTo(cx + r - 10, cy);
      ctx.moveTo(cx, cy - r + 10);
      ctx.lineTo(cx, cy + r - 10);
      ctx.stroke();

      if (!this.heatShocked) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 11.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Kanamycin + X-Gal Plate', cx, cy - 6);
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.fillText('(Waiting for Heat-Shock)', cx, cy + 12);
        return;
      }

      // Draw growing colonies
      const scale = Math.min(1, this.heatAnim * 1.3);
      this.colonies.forEach((col, i) => {
        const cr = (col.isWhite ? 10 : 9.5) * scale;
        if (cr <= 0.5) return;

        ctx.save();
        if (col.isWhite && !col.picked) {
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 8 + Math.sin(t * 4 + i) * 3;
        }
        ctx.beginPath();
        ctx.arc(col.x, col.y, cr, 0, Math.PI * 2);
        ctx.fillStyle = col.isWhite ? '#F8FAFC' : '#2563EB';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = col.picked ? 2.5 : 1.2;
        ctx.strokeStyle = col.picked ? '#00E5B0' : col.isWhite ? '#CBD5E1' : '#60A5FA';
        ctx.stroke();

        // Highlight ring when picked
        if (col.picked) {
          ctx.beginPath();
          ctx.arc(col.x, col.y, cr + 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#00E5B0';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#041310';
          ctx.font = '900 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', col.x, col.y + 0.5);
        }
        ctx.restore();
      });
    }

    _drawUvGel(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h);

      // UV chamber frame
      ctx.fillStyle = '#070B19';
      ctx.fillRect(0, 0, w, h);

      // Subtle purple UV glow
      const uvGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 240);
      uvGrad.addColorStop(0, 'rgba(168, 85, 247, 0.14)');
      uvGrad.addColorStop(1, 'rgba(5, 8, 20, 0)');
      ctx.fillStyle = uvGrad;
      ctx.fillRect(0, 0, w, h);

      const lanes = [
        { x: 108, title: 'DNA Ladder' },
        { x: 204, title: 'Blue (Empty)' },
        { x: 300, title: 'White #1' },
        { x: 396, title: 'White #2' },
      ];

      // Electrode signs
      ctx.font = '800 10.5px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.fillText('(-)', 16, 40);
      ctx.fillStyle = '#F472B6';
      ctx.fillText('(+)', 16, h - 18);

      // Draw sample wells at top
      lanes.forEach((ln, idx) => {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ln.title, ln.x, 22);

        const loaded =
          idx <= 1 ? this.heatShocked : idx === 2 ? this.pickedWhiteCount >= 1 : this.pickedWhiteCount >= 2;

        ctx.fillStyle = loaded ? 'rgba(0, 229, 176, 0.45)' : 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(ln.x - 24, 32, 48, 10, 3);
        ctx.fill();
        ctx.stroke();
      });

      const prog = this.gelProgress;
      if (prog <= 0) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pick 2 White Colonies to run UV Gel Electrophoresis!', w / 2 + 18, h / 2 + 14);
        return;
      }

      // Helper to map bp size -> vertical Y position (smaller bp moves further down!)
      const bpToY = (bp) => {
        const norm = clamp(1 - Math.log10(bp / 400) / Math.log10(6000 / 400), 0.08, 0.94);
        const targetY = 58 + norm * (h - 82);
        return 38 + (targetY - 38) * prog;
      };

      const drawBand = (x, bp, color, thick) => {
        const y = bpToY(bp);
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - 21, y - (thick || 4) / 2, 42, thick || 4, 2);
        ctx.fill();
        ctx.restore();
        return y;
      };

      // Lane 0: Reference Ladder (5000, 3000, 2000, 1000, 500 bp)
      [5000, 3000, 2000, 1000, 500].forEach((bp) => {
        const y = drawBand(lanes[0].x, bp, '#A855F7', 3);
        if (prog > 0.85) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 9.5px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(bp >= 1000 ? bp / 1000 + 'kb' : bp + 'bp', lanes[0].x - 27, y + 3);
        }
      });

      // Lane 1: Blue Colony = Backbone only (~2200 bp), NO insert!
      drawBand(lanes[1].x, 2200, '#60A5FA', 4.5);

      // Lanes 2 & 3: White Colonies = Backbone (~2200 bp) + Viral Antigen Insert!
      const agBp = this.antigen ? this.antigen.lengthBp : 1700;
      drawBand(lanes[2].x, 2200, '#38BDF8', 4);
      drawBand(lanes[2].x, agBp, '#00E5B0', 5.5);

      drawBand(lanes[3].x, 2200, '#38BDF8', 4);
      const insertY = drawBand(lanes[3].x, agBp, '#00E5B0', 5.5);

      if (prog > 0.9) {
        ctx.fillStyle = '#00E5B0';
        ctx.font = '800 10.5px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('← GOI (' + agBp + 'bp)', lanes[3].x + 26, insertY + 3);
      }

      // Scanning laser line while migrating
      if (prog < 1) {
        const scanY = 40 + prog * (h - 55);
        ctx.strokeStyle = 'rgba(0, 229, 176, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(45, scanY);
        ctx.lineTo(w - 20, scanY);
        ctx.stroke();
      }
    }

    // =========================================================================
    // STATION 4: CHOOSE VACCINE DELIVERY CAPSULE
    // =========================================================================
    _renderStep4Delivery(body) {
      const platforms = VQ.DELIVERY_PLATFORMS;
      body.innerHTML = `
        <div class="studio-split">
          <div class="studio-panel">
            <div class="studio-panel-head">
              <h3>💉 Choose Vaccine Delivery Capsule</h3>
              <span class="pill pill-amber">Step 5 of 5</span>
            </div>
            <div class="studio-panel-body" id="m2-delivery-list"></div>
          </div>

          <div class="studio-visual-stage">
            <div style="text-align: center;">
              <span class="pill pill-teal">Formulation &amp; Immune Training Preview</span>
              <h3 style="font-size: 1.08rem; color: var(--text-white); margin-top: 5px;">
                How Your ${escHtml(this.virus.name)} Vaccine Enters the Body
              </h3>
            </div>

            <canvas id="m2-canvas-delivery" width="480" height="245" style="border-radius: 14px; background: rgba(5, 10, 22, 0.72); border: 1px solid rgba(148,163,184,0.16); max-width: 100%;"></canvas>

            <div class="lab-feedback-box" id="m2-step4-feedback">
              👆 Pick a delivery technology on the left to package your <strong>${escHtml(this.antigen.name)}</strong> vaccine!
            </div>

            <div class="studio-action-row">
              <button type="button" class="btn btn-ghost btn-sm" id="m2-step4-back">← Back to Gel</button>
              <button type="button" class="btn btn-amber btn-lg" id="m2-step4-finish" ${this.delivery ? '' : 'disabled'}>
                🎉 Test Vaccine &amp; View Certificate →
              </button>
            </div>
          </div>
        </div>
      `;

      const listEl = document.getElementById('m2-delivery-list');
      const feedbackEl = document.getElementById('m2-step4-feedback');
      const finishBtn = document.getElementById('m2-step4-finish');

      const updateFeedback = (plat) => {
        const isBest = plat.bestFor.indexOf(this.virus.id) !== -1;
        feedbackEl.className = 'lab-feedback-box good';
        feedbackEl.innerHTML =
          (isBest ? '🌟 <strong>Clinical Match!</strong> ' + escHtml(plat.bonusNote) + ' ' : '👍 <strong>Solid Platform!</strong> ') +
          '<em>Advantage:</em> ' +
          escHtml(plat.pros);
      };

      platforms.forEach((plat) => {
        const isSel = this.delivery && this.delivery.id === plat.id;
        const isBest = plat.bestFor.indexOf(this.virus.id) !== -1;
        const card = document.createElement('div');
        card.className = 'choice-card' + (isSel ? ' selected' : '');
        card.dataset.platId = plat.id;
        card.innerHTML = `
          <div class="choice-card-top">
            <span class="choice-card-title">${plat.icon} ${escHtml(plat.name)}</span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="pill pill-purple">${escHtml(plat.tag)}</span>
            ${isBest ? '<span class="pill pill-teal">⭐ Real-World Match</span>' : ''}
          </div>
          <p class="choice-card-desc">${escHtml(plat.summary)}</p>
        `;

        card.addEventListener('click', () => {
          this.delivery = plat;
          if (this.audio) this.audio.play('match');
          this._updateShellHUD();
          listEl.querySelectorAll('.choice-card').forEach((c) => {
            c.classList.toggle('selected', c.dataset.platId === plat.id);
          });
          updateFeedback(plat);
          finishBtn.disabled = false;
        });

        listEl.appendChild(card);
      });

      if (this.delivery) updateFeedback(this.delivery);

      document.getElementById('m2-step4-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._goToStep(3);
      });
      finishBtn.addEventListener('click', () => {
        if (!this.delivery) return;
        if (this.audio) this.audio.play('level_up');
        if (this.storage) {
          this.storage.setProgress('vaccine_completed', true);
          this.storage.setProgress('played_mode2', true);
          const { pct } = this._calcMetrics();
          if (pct >= 90) {
            this.storage.setProgress('lab_master_achieved', true);
          }
        }
        this._goToStep(5);
      });

      const cvs = document.getElementById('m2-canvas-delivery');
      const ctx = cvs.getContext('2d');
      this._activeCanvasDraw = (t) => {
        this._drawDeliveryCapsule(ctx, 480, 245, t);
      };
    }

    _drawDeliveryCapsule(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 - 4;

      if (!this.delivery) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Select a Vaccine Capsule on the left to preview!', cx, cy);
        return;
      }

      const id = this.delivery.id;
      ctx.save();

      if (id === 'mrna_lnp') {
        // Glowing double-ring Lipid Nanoparticle fat droplet with wavy mRNA inside
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + t * 0.35;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 64, cy + Math.sin(a) * 64, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#38BDF8';
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 56, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fill();

        // Wavy mRNA strand inside
        ctx.beginPath();
        for (let x = -34; x <= 34; x += 2) {
          const y = Math.sin(x * 0.22 + t * 4) * 11;
          if (x === -34) ctx.moveTo(cx + x, cy + y);
          else ctx.lineTo(cx + x, cy + y);
        }
        ctx.strokeStyle = '#00E5B0';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Lipid Bubble + mRNA Blueprint', cx, h - 18);
      } else if (id === 'viral_vector') {
        VQ.VIRUS_SILHOUETTES.icosahedral(ctx, cx, cy, 78, '#A855F7');
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Harmless Carrier Adenovirus + Antigen DNA', cx, h - 18);
      } else if (id === 'subunit_alum') {
        // Alum crystal + purified floating spikes
        ctx.beginPath();
        ctx.moveTo(cx, cy - 42);
        ctx.lineTo(cx + 38, cy);
        ctx.lineTo(cx, cy + 42);
        ctx.lineTo(cx - 38, cy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 181, 71, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#FFB547';
        ctx.lineWidth = 3;
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 0.6;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#00E5B0';
          ctx.fill();
        }
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Purified Surface Proteins + Alum Booster Crystal', cx, h - 18);
      } else {
        // Hollow VLP crystal decoy
        VQ.VIRUS_SILHOUETTES.icosahedral(ctx, cx, cy, 80, '#00E5B0');
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#070E1C';
        ctx.fill();
        ctx.fillStyle = '#86EFAC';
        ctx.font = '800 9.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EMPTY', cx, cy + 3);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.fillText('Hollow Virus-Like Shell (Zero Viral DNA Inside!)', cx, h - 18);
      }

      ctx.restore();
    }

    // =========================================================================
    // STATION 5: VACCINE DESIGN CERTIFICATE & VIRTUAL PROTECTION TRIAL
    // =========================================================================
    _renderStep5Report(body) {
      const { pct, studioScore } = this._calcMetrics();
      const stars = pct >= 92 ? '⭐⭐⭐⭐⭐' : pct >= 80 ? '⭐⭐⭐⭐' : pct >= 65 ? '⭐⭐⭐' : '⭐⭐';

      let verdict = '';
      if (pct >= 92) {
        verdict =
          'Outstanding Bio-Engineering! Your outer surface antigen, human/RNA expression switch, allergy-safe KanR plasmid, and delivery capsule triggered powerful neutralizing antibodies!';
      } else if (!this.antigen.isGood) {
        verdict =
          'Good lab work! Tip to reach 95%+: switch your Antigen to an OUTER surface protein so antibodies can grab the intact virus before it enters cells!';
      } else {
        verdict =
          'Strong protective vaccine! Tip to hit 100%: pair an outer surface gene with CMV/T7 promoter, high-copy pUC Ori, KanR safety tag, and the matching clinical delivery capsule!';
      }

      body.innerHTML = `
        <div class="vaccine-report">
          <div class="vaccine-report-card">
            <div class="vaccine-report-header">
              <div class="vaccine-report-title-group">
                <canvas id="m2-cert-canvas" width="88" height="88" style="border-radius: 50%; background: rgba(0,0,0,0.35); border: 1px solid rgba(0,229,176,0.35); flex-shrink: 0;"></canvas>
                <div>
                  <span class="pill pill-teal" style="margin-bottom: 6px;">Official ViroQuest Lab Certificate</span>
                  <h2 style="font-size: 1.5rem; font-weight: 900; color: var(--text-white); line-height: 1.15;">
                    ViroVax-${escHtml(this.virus.name)} Candidate
                  </h2>
                  <div style="font-size: 0.92rem; color: var(--color-amber); margin-top: 4px; font-weight: 700;">
                    ${stars} &nbsp;·&nbsp; Studio Score: ${formatScore(studioScore)} pts
                  </div>
                </div>
              </div>

              <div class="vaccine-report-badge-box">
                <span class="eff-label">Immune Protection</span>
                <span class="eff-val">${pct}%</span>
              </div>
            </div>

            <div class="vaccine-report-grid">
              <div class="report-field">
                <div class="report-field-label">1. Target Virus</div>
                <div class="report-field-value">🦠 ${escHtml(this.virus.name)} (${escHtml(this.virus.scientificName)})</div>
              </div>
              <div class="report-field">
                <div class="report-field-label">2. Chosen Viral Antigen</div>
                <div class="report-field-value">🎯 ${escHtml(this.antigen.name)} (${this.antigen.lengthBp} bp)</div>
              </div>
              <div class="report-field">
                <div class="report-field-label">3. Recombinant Plasmid</div>
                <div class="report-field-value">⭕ ${escHtml(this.promoter.name.split(' ')[0])} + ${escHtml(this.origin.name.split(' ')[0])} + ${escHtml(this.marker.id === 'kan_r' ? 'KanR' : 'AmpR')}</div>
              </div>
              <div class="report-field">
                <div class="report-field-label">4. Delivery Capsule</div>
                <div class="report-field-value">${this.delivery.icon} ${escHtml(this.delivery.name)}</div>
              </div>
              <div class="report-field" style="grid-column: 1 / -1;">
                <div class="report-field-label">Real-World Licensed Vaccine Inspiration</div>
                <div class="report-field-value" style="color: var(--color-teal);">🏥 ${escHtml(this.virus.realVaccine)}</div>
              </div>
            </div>

            <div class="lab-feedback-box ${pct >= 80 ? 'good' : 'warn'}" style="max-width: 100%;">
              🧑‍🔬 <strong>Chief Virologist Review:</strong> ${escHtml(verdict)}
            </div>

            <div class="report-actions">
              <button type="button" class="btn btn-secondary" id="m2-btn-print">🖨️ Print Certificate</button>
              <button type="button" class="btn btn-ghost" id="m2-btn-another">🔄 Design Another</button>
              <button type="button" class="btn btn-primary btn-lg" id="m2-btn-save-score">🏆 Save Score to Leaderboard →</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('m2-btn-print').addEventListener('click', () => {
        window.print();
      });

      document.getElementById('m2-btn-another').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        this._resetDesign();
        this._renderCurrentStep();
      });

      document.getElementById('m2-btn-save-score').addEventListener('click', () => {
        if (this.audio) this.audio.play('success');
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(studioScore);
        }
      });

      // Mini animated canvas showing Y-antibodies neutralizing the virus!
      const certCvs = document.getElementById('m2-cert-canvas');
      const certCtx = certCvs.getContext('2d');
      const drawFn = VQ.VIRUS_SILHOUETTES[this.virus.silhouette] || VQ.VIRUS_SILHOUETTES.spherical;
      this._activeCanvasDraw = (t) => {
        certCtx.clearRect(0, 0, 88, 88);
        drawFn(certCtx, 44, 44, 24, this.virus.color);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + t * 1.1;
          const ax = 44 + Math.cos(a) * 31;
          const ay = 44 + Math.sin(a) * 31;
          certCtx.save();
          certCtx.translate(ax, ay);
          certCtx.rotate(a + Math.PI / 2);
          certCtx.strokeStyle = '#00E5B0';
          certCtx.lineWidth = 2.5;
          certCtx.lineCap = 'round';
          certCtx.beginPath();
          certCtx.moveTo(0, 5);
          certCtx.lineTo(0, -1);
          certCtx.lineTo(-4, -5);
          certCtx.moveTo(0, -1);
          certCtx.lineTo(4, -5);
          certCtx.stroke();
          certCtx.restore();
        }
      };
    }
  }

  VQ.Mode2Lab = Mode2Lab;
})();
