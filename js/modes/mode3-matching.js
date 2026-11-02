/**
 * mode3-matching.js — ViroQuest Mode 3: "Virus Detective" (Visual Structure & Virology Match)
 * ===========================================================================================
 * Interactive GUI card-connecting challenge for Class 12 & 1st-Year College Students:
 *  - 4 progressive themed rounds:
 *      Round 1: 3D Shapes & Coats
 *      Round 2: How Viruses Travel
 *      Round 3: DNA vs RNA Blueprints
 *      Round 4: Vaccine Hall of Fame
 *  - Supports BOTH Click-to-Connect AND Live Rubber-Band Pointer Dragging across columns!
 *  - Draws glowing SVG Bézier connection cables, procedural Canvas virus portraits,
 *    a helpful Hint system (3 hints), and bite-sized Discovery Facts on every match.
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { shuffle, clamp, formatScore, escHtml } = VQ.utils;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  class Mode3Matching {
    constructor(container, services, callbacks) {
      this.container = container;
      this.audio = services.audio;
      this.storage = services.storage;
      this.callbacks = callbacks || {};

      this.rounds = VQ.MATCHING_ROUNDS;
      this.roundIdx = 0;
      this.score = 0;
      this.combo = 0;
      this.hintsLeft = 3;

      this.timeLeft = 75;
      this.timeMax = 75;
      this._timerId = null;
      this._paused = false;

      // Active round state
      this.selectedSide = null; // 'virus' | 'clue' | null
      this.selectedPairId = null;
      this.matchedIds = []; // array of { id, color }

      // Live rubber-band drag line state
      this._drag = null;

      this._onResize = () => this._redrawConnections();
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);
    }

    start() {
      this.roundIdx = 0;
      this.score = 0;
      this.combo = 0;
      this.hintsLeft = 3;

      this._renderShell();
      this._loadRound(0);

      window.addEventListener('resize', this._onResize);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
    }

    destroy() {
      this._stopTimer();
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);

      const modal = document.getElementById('m3-round-modal');
      if (modal) modal.remove();

      if (this.container) {
        this.container.innerHTML = '';
      }
    }

    // ─── SHELL & HUD ─────────────────────────────────────────────────────────
    _renderShell() {
      this.container.innerHTML = `
        <header class="hud-bar">
          <div class="hud-left">
            <button type="button" class="hud-back-btn" id="m3-btn-back">← Menu</button>
            <span class="hud-mode-title">🕵️ Virus Detective</span>
            <span class="pill pill-purple" id="m3-round-pill">Round 1 / ${this.rounds.length}</span>
          </div>

          <div class="hud-mid">
            <div class="hud-stat stat-timer">
              <span class="hud-stat-label">⏱ Time</span>
              <span class="hud-stat-value" id="m3-timer-val">75s</span>
            </div>
            <div class="hud-stat stat-combo">
              <span class="hud-stat-label">Streak</span>
              <span class="hud-stat-value" id="m3-combo-val">0x</span>
            </div>
            <button type="button" class="hud-icon-btn" id="m3-btn-hint" title="Highlight a matching pair!">
              💡 Hints (<span id="m3-hints-val">3</span>)
            </button>
          </div>

          <div class="hud-right">
            <div class="hud-stat stat-score">
              <span class="hud-stat-label">Score</span>
              <span class="hud-stat-value" id="m3-score-val">0</span>
            </div>
          </div>

          <div class="timer-bar-wrap">
            <div class="timer-bar-fill" id="m3-timer-bar" style="width: 100%"></div>
          </div>
        </header>

        <div class="detective-stage">
          <div class="round-banner">
            <div class="round-banner-left">
              <span class="round-banner-title" id="m3-banner-title"></span>
              <span class="round-banner-desc" id="m3-banner-desc"></span>
            </div>
            <div class="round-banner-right">
              <span class="pill pill-teal" id="m3-progress-pill">0 / 4 Matched</span>
            </div>
          </div>

          <div class="matching-board" id="m3-board">
            <div class="match-col" id="m3-col-viruses"></div>
            <div class="match-spacer" aria-hidden="true"></div>
            <div class="match-col" id="m3-col-clues"></div>
            <svg class="match-svg-layer" id="m3-svg-lines"></svg>
          </div>

          <div class="detective-fact-bar" id="m3-fact-bar">
            <span>🔎 <strong>How to Play:</strong> Click a <strong>Virus Card</strong> on the left and its matching <strong>Clue Card</strong> on the right (or drag a line straight across!).</span>
          </div>
        </div>
      `;

      document.getElementById('m3-btn-back').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        if (this.callbacks.onBack) this.callbacks.onBack();
      });

      document.getElementById('m3-btn-hint').addEventListener('click', () => {
        this._useHint();
      });

      const board = document.getElementById('m3-board');
      board.addEventListener('scroll', () => this._redrawConnections());
    }

    // ─── LOAD A ROUND ────────────────────────────────────────────────────────
    _loadRound(idx) {
      this._stopTimer();
      this.roundIdx = idx;
      const round = this.rounds[idx];

      this.selectedSide = null;
      this.selectedPairId = null;
      this.matchedIds = [];
      this._drag = null;

      this.timeMax = round.timeLimit;
      this.timeLeft = round.timeLimit;

      // Update Banner & HUD
      document.getElementById('m3-round-pill').textContent = 'Round ' + (idx + 1) + ' / ' + this.rounds.length;
      document.getElementById('m3-banner-title').textContent = round.title;
      document.getElementById('m3-banner-desc').textContent = '— ' + round.description;
      this._syncHUD();

      const factBar = document.getElementById('m3-fact-bar');
      factBar.className = 'detective-fact-bar';
      factBar.innerHTML =
        '<span>🔎 <strong>Tip:</strong> Click or drag between any Virus Portrait and its matching Clue! Need a nudge? Use <strong>💡 Hints</strong> above.</span>';

      // Shuffle left and right columns independently
      const leftItems = shuffle(round.pairs);
      const rightItems = shuffle(round.pairs);

      const leftCol = document.getElementById('m3-col-viruses');
      const rightCol = document.getElementById('m3-col-clues');
      leftCol.innerHTML = '';
      rightCol.innerHTML = '';
      document.getElementById('m3-svg-lines').innerHTML = '';

      // Build Left Virus Cards
      leftItems.forEach((pair) => {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.dataset.side = 'virus';
        card.dataset.pairId = pair.id;
        card.innerHTML = `
          <div class="match-virus-thumb">
            <canvas width="46" height="46"></canvas>
          </div>
          <div class="match-card-content">
            <div class="match-card-title">${escHtml(pair.virus.name)}</div>
            <div class="match-card-sub">${escHtml(pair.virus.sub)}</div>
          </div>
          <div class="match-port-dot"></div>
        `;

        const cvs = card.querySelector('canvas');
        const ctx = cvs.getContext('2d');
        const fn = VQ.VIRUS_SILHOUETTES[pair.virus.silhouette] || VQ.VIRUS_SILHOUETTES.spherical;
        fn(ctx, 23, 23, 17, pair.virus.color);

        this._attachCardEvents(card, 'virus', pair);
        leftCol.appendChild(card);
      });

      // Build Right Clue Cards
      rightItems.forEach((pair) => {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.dataset.side = 'clue';
        card.dataset.pairId = pair.id;
        card.innerHTML = `
          <div class="match-port-dot"></div>
          <div class="match-virus-thumb" style="font-size: 1.55rem;">
            ${pair.clue.icon}
          </div>
          <div class="match-card-content">
            <div class="match-card-title">${escHtml(pair.clue.label)}</div>
            <div class="match-card-sub">${escHtml(pair.clue.detail)}</div>
          </div>
        `;

        this._attachCardEvents(card, 'clue', pair);
        rightCol.appendChild(card);
      });

      this._startTimer();
    }

    // ─── CLICK & DRAG-LINE INTERACTION ───────────────────────────────────────
    _attachCardEvents(card, side, pair) {
      card.addEventListener('pointerdown', (e) => {
        if (this._isMatched(pair.id)) return;
        e.preventDefault();

        const dot = card.querySelector('.match-port-dot');
        const pt = this._getDotBoardCoords(dot);

        this._drag = {
          side: side,
          pairId: pair.id,
          color: pair.virus.color,
          startCard: card,
          startX: pt.x,
          startY: pt.y,
          curX: pt.x,
          curY: pt.y,
          moved: false,
          downClientX: e.clientX,
          downClientY: e.clientY,
        };
      });
    }

    _handlePointerMove(e) {
      if (!this._drag) return;
      const dist = Math.hypot(e.clientX - this._drag.downClientX, e.clientY - this._drag.downClientY);
      if (dist > 10) {
        this._drag.moved = true;
      }
      if (!this._drag.moved) return;

      const board = document.getElementById('m3-board');
      if (!board) return;
      const rect = board.getBoundingClientRect();
      this._drag.curX = e.clientX - rect.left + board.scrollLeft;
      this._drag.curY = e.clientY - rect.top + board.scrollTop;
      this._redrawConnections();
    }

    _handlePointerUp(e) {
      if (!this._drag) return;
      const drag = this._drag;
      this._drag = null;

      if (drag.moved) {
        // Did player release over an opposite-column card?
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const targetCard = el && el.closest ? el.closest('.match-card') : null;
        if (
          targetCard &&
          targetCard.dataset.side &&
          targetCard.dataset.side !== drag.side &&
          !this._isMatched(targetCard.dataset.pairId)
        ) {
          this._attemptMatch(
            drag.side === 'virus' ? drag.pairId : targetCard.dataset.pairId,
            drag.side === 'clue' ? drag.pairId : targetCard.dataset.pairId
          );
          this._clearSelection();
          this._redrawConnections();
          return;
        }
        this._redrawConnections();
        return;
      }

      // Otherwise treat as crisp Click!
      this._onCardClicked(drag.side, drag.pairId);
      this._redrawConnections();
    }

    _onCardClicked(side, pairId) {
      if (this._isMatched(pairId)) return;

      // Clicking same selected card toggles off
      if (this.selectedSide === side && this.selectedPairId === pairId) {
        if (this.audio) this.audio.play('click');
        this._clearSelection();
        return;
      }

      // Clicking another card on the same side switches selection
      if (!this.selectedSide || this.selectedSide === side) {
        if (this.audio) this.audio.play('click');
        this.selectedSide = side;
        this.selectedPairId = pairId;
        this._refreshSelectedClasses();
        return;
      }

      // Opposite side clicked -> evaluate match!
      const virusId = side === 'virus' ? pairId : this.selectedPairId;
      const clueId  = side === 'clue'  ? pairId : this.selectedPairId;
      this._clearSelection();
      this._attemptMatch(virusId, clueId);
    }

    _attemptMatch(virusPairId, cluePairId) {
      const round = this.rounds[this.roundIdx];
      const vCard = this._findCard('virus', virusPairId);
      const cCard = this._findCard('clue', cluePairId);

      if (virusPairId === cluePairId) {
        // CORRECT MATCH!
        const pair = round.pairs.find((p) => p.id === virusPairId);
        this.matchedIds.push({ id: pair.id, color: pair.virus.color });

        if (vCard) {
          vCard.classList.remove('hint-glow');
          vCard.classList.add('matched');
        }
        if (cCard) {
          cCard.classList.remove('hint-glow');
          cCard.classList.add('matched');
        }

        this.combo++;
        const mult = Math.min(this.combo, 5);
        const pts = 150 * mult;
        this.score += pts;

        if (this.audio) {
          this.audio.play(this.combo >= 4 ? 'combo' : 'match');
        }

        if (this.storage) {
          this.storage.setProgress('first_match_done', true);
          if (this.combo >= 5)  this.storage.setProgress('combo_5_achieved', true);
          if (this.combo >= 10) this.storage.setProgress('combo_10_achieved', true);
        }

        // Show Discovery Fact!
        const factBar = document.getElementById('m3-fact-bar');
        if (factBar) {
          factBar.className = 'detective-fact-bar highlight';
          factBar.innerHTML =
            '<span>💡 <strong>' +
            escHtml(pair.virus.name) +
            ' Fact:</strong> ' +
            escHtml(pair.fact) +
            ' <strong style="color: var(--color-teal); margin-left: 6px;">+' +
            pts +
            ' pts!</strong></span>';
        }

        this._syncHUD();
        this._redrawConnections();

        if (this.matchedIds.length >= round.pairs.length) {
          this._onRoundCleared();
        }
      } else {
        // MISMATCH
        this.combo = 0;
        if (this.audio) this.audio.play('miss');
        if (vCard) {
          vCard.classList.add('wrong-flash');
          setTimeout(() => vCard.classList.remove('wrong-flash'), 400);
        }
        if (cCard) {
          cCard.classList.add('wrong-flash');
          setTimeout(() => cCard.classList.remove('wrong-flash'), 400);
        }

        const factBar = document.getElementById('m3-fact-bar');
        if (factBar) {
          factBar.className = 'detective-fact-bar';
          factBar.innerHTML =
            '<span style="color: #FCA5A5;">❌ Not quite! Look closely at the virus shape or clue details — or click <strong>💡 Hints</strong> if you want a hand!</span>';
        }
        this._syncHUD();
      }
    }

    _useHint() {
      if (this.hintsLeft <= 0) return;
      const round = this.rounds[this.roundIdx];
      const unmatched = round.pairs.filter((p) => !this._isMatched(p.id));
      if (unmatched.length === 0) return;

      this.hintsLeft--;
      if (this.audio) this.audio.play('scan');
      this._syncHUD();

      const target = unmatched[0];
      const vCard = this._findCard('virus', target.id);
      const cCard = this._findCard('clue', target.id);

      [vCard, cCard].forEach((el) => {
        if (!el) return;
        el.classList.add('hint-glow');
        setTimeout(() => el.classList.remove('hint-glow'), 2400);
      });
    }

    // ─── SVG BÉZIER CONNECTION LINES ─────────────────────────────────────────
    _getDotBoardCoords(dotEl) {
      const board = document.getElementById('m3-board');
      if (!board || !dotEl) return { x: 0, y: 0 };
      const bRect = board.getBoundingClientRect();
      const dRect = dotEl.getBoundingClientRect();
      return {
        x: dRect.left + dRect.width / 2 - bRect.left + board.scrollLeft,
        y: dRect.top + dRect.height / 2 - bRect.top + board.scrollTop,
      };
    }

    _redrawConnections() {
      const svg = document.getElementById('m3-svg-lines');
      const board = document.getElementById('m3-board');
      if (!svg || !board) return;

      svg.setAttribute('width', board.scrollWidth);
      svg.setAttribute('height', board.scrollHeight);
      svg.innerHTML = '';

      const makeBezierPath = (x1, y1, x2, y2, color, dashed) => {
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', dashed ? '3' : '3.5');
        path.setAttribute('stroke-linecap', 'round');
        if (dashed) {
          path.setAttribute('stroke-dasharray', '6 5');
        } else {
          path.setAttribute('opacity', '0.88');
        }
        svg.appendChild(path);
      };

      // Draw permanent matched cables
      this.matchedIds.forEach((m) => {
        const vCard = this._findCard('virus', m.id);
        const cCard = this._findCard('clue', m.id);
        if (!vCard || !cCard) return;
        const p1 = this._getDotBoardCoords(vCard.querySelector('.match-port-dot'));
        const p2 = this._getDotBoardCoords(cCard.querySelector('.match-port-dot'));
        makeBezierPath(p1.x, p1.y, p2.x, p2.y, m.color || '#22C55E', false);
      });

      // Draw live rubber-band line while dragging
      if (this._drag && this._drag.moved) {
        if (this._drag.side === 'virus') {
          makeBezierPath(this._drag.startX, this._drag.startY, this._drag.curX, this._drag.curY, '#A855F7', true);
        } else {
          makeBezierPath(this._drag.curX, this._drag.curY, this._drag.startX, this._drag.startY, '#A855F7', true);
        }
      }
    }

    // ─── TIMER & ROUND TRANSITIONS ───────────────────────────────────────────
    _startTimer() {
      this._stopTimer();
      this._timerId = setInterval(() => {
        if (this._paused) return;
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this._syncTimerDOM();
        if (this.timeLeft <= 0) {
          this._stopTimer();
          this._onTimeUp();
        }
      }, 1000);
    }

    _stopTimer() {
      if (this._timerId) {
        clearInterval(this._timerId);
        this._timerId = null;
      }
    }

    _syncTimerDOM() {
      const valEl = document.getElementById('m3-timer-val');
      const barEl = document.getElementById('m3-timer-bar');
      if (valEl) {
        valEl.textContent = this.timeLeft + 's';
        valEl.classList.toggle('warning', this.timeLeft <= 20 && this.timeLeft > 10);
        valEl.classList.toggle('critical', this.timeLeft <= 10);
      }
      if (barEl) {
        const pct = clamp((this.timeLeft / this.timeMax) * 100, 0, 100);
        barEl.style.width = pct + '%';
        barEl.classList.toggle('warning', this.timeLeft <= 20 && this.timeLeft > 10);
        barEl.classList.toggle('critical', this.timeLeft <= 10);
      }
    }

    _syncHUD() {
      const round = this.rounds[this.roundIdx];
      const scoreEl = document.getElementById('m3-score-val');
      const comboEl = document.getElementById('m3-combo-val');
      const hintsEl = document.getElementById('m3-hints-val');
      const hintBtn = document.getElementById('m3-btn-hint');
      const progPill = document.getElementById('m3-progress-pill');

      if (scoreEl) scoreEl.textContent = formatScore(this.score);
      if (comboEl) comboEl.textContent = this.combo + 'x';
      if (hintsEl) hintsEl.textContent = String(this.hintsLeft);
      if (hintBtn) hintBtn.style.opacity = this.hintsLeft > 0 ? '1' : '0.45';
      if (progPill && round) {
        progPill.textContent = this.matchedIds.length + ' / ' + round.pairs.length + ' Matched';
      }
      this._syncTimerDOM();
    }

    _onRoundCleared() {
      this._stopTimer();
      const timeBonus = this.timeLeft * 8;
      this.score += timeBonus;
      this._syncHUD();

      if (this.audio) this.audio.play('level_up');

      const isFinalRound = this.roundIdx >= this.rounds.length - 1;
      if (isFinalRound && this.storage) {
        this.storage.setProgress('taxonomy_all_done', true);
        this.storage.setProgress('played_mode3', true);
      }

      setTimeout(() => {
        this._showRoundModal({
          emoji: isFinalRound ? '🏆' : '🎉',
          title: isFinalRound ? 'All 4 Cases Solved!' : 'Round ' + (this.roundIdx + 1) + ' Cleared!',
          subtitle: 'Speed Bonus: +' + timeBonus + ' pts (' + this.timeLeft + 's remaining)',
          btnLabel: isFinalRound ? '🏆 Claim Detective Score →' : 'Next Case: Round ' + (this.roundIdx + 2) + ' →',
          onAction: () => {
            if (isFinalRound) {
              if (this.callbacks.onGameOver) this.callbacks.onGameOver(this.score);
            } else {
              this._loadRound(this.roundIdx + 1);
            }
          },
        });
      }, 480);
    }

    _onTimeUp() {
      if (this.audio) this.audio.play('fail');
      if (this.storage) this.storage.setProgress('played_mode3', true);

      this._showRoundModal({
        emoji: '⏰',
        title: "Time's Up!",
        subtitle:
          'You solved ' +
          this.matchedIds.length +
          ' / ' +
          this.rounds[this.roundIdx].pairs.length +
          ' pairs in Round ' +
          (this.roundIdx + 1) +
          '!',
        btnLabel: 'Save Score & View Leaderboard →',
        onAction: () => {
          if (this.callbacks.onGameOver) this.callbacks.onGameOver(this.score);
        },
      });
    }

    _showRoundModal(cfg) {
      const existing = document.getElementById('m3-round-modal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'step-modal-overlay';
      overlay.id = 'm3-round-modal';
      overlay.innerHTML = `
        <div class="step-modal-box">
          <div style="font-size: 3rem; margin-bottom: 8px;">${cfg.emoji}</div>
          <h2 style="font-size: 1.65rem; font-weight: 900; color: var(--text-white); margin-bottom: 6px;">
            ${escHtml(cfg.title)}
          </h2>
          <p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 18px;">
            ${escHtml(cfg.subtitle)}
          </p>
          <div style="background: rgba(0,0,0,0.32); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); font-weight: 700;">Total Score</div>
            <div style="font-family: var(--font-mono); font-size: 2.1rem; font-weight: 900; color: var(--color-teal);">
              ${formatScore(this.score)}
            </div>
          </div>
          <button type="button" class="btn btn-purple btn-lg" id="m3-modal-continue" style="width: 100%;">
            ${escHtml(cfg.btnLabel)}
          </button>
        </div>
      `;

      document.body.appendChild(overlay);
      document.getElementById('m3-modal-continue').addEventListener('click', () => {
        if (this.audio) this.audio.play('click');
        overlay.remove();
        cfg.onAction();
      });
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    _isMatched(pairId) {
      return this.matchedIds.some((m) => m.id === pairId);
    }

    _findCard(side, pairId) {
      return this.container.querySelector('.match-card[data-side="' + side + '"][data-pair-id="' + pairId + '"]');
    }

    _clearSelection() {
      this.selectedSide = null;
      this.selectedPairId = null;
      this._refreshSelectedClasses();
    }

    _refreshSelectedClasses() {
      this.container.querySelectorAll('.match-card').forEach((c) => {
        const isSel = c.dataset.side === this.selectedSide && c.dataset.pairId === this.selectedPairId;
        c.classList.toggle('selected', isSel);
      });
    }
  }

  VQ.Mode3Matching = Mode3Matching;
})();
