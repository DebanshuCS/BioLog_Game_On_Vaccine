/**
 * app.js — ViroQuest Main Application Controller
 * ==============================================
 * Orchestrates screen transitions, audio/storage services, Open Day Demo Mode,
 * High-Contrast accessibility, Leaderboards, Achievements, Modals, and Shortcuts.
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { formatScore, escHtml } = VQ.utils;

  const MODE_META = {
    mode1: {
      storageKey: 'receptor_match',
      title: 'Cell Defender',
      emoji: '🛡️',
    },
    mode2: {
      storageKey: 'vaccine_design',
      title: 'Vaccine Maker Studio',
      emoji: '🧬',
    },
    mode3: {
      storageKey: 'taxonomy',
      title: 'Virus Detective',
      emoji: '🕵️',
    },
  };

  class ViroQuestApp {
    constructor() {
      this.audio = new VQ.AudioManager();
      this.storage = new VQ.StorageManager();

      this.currentScreen = 'menu';
      this.activeController = null;
      this.demoMode = false;
      this.highContrast = Boolean(this.storage.getProgress('high_contrast'));
      this.activeHsTab = 'all';

      this._pendingGameOver = null; // { modeId, storageKey, score, saved }
      this._achQueue = [];
      this._achShowing = false;
      this._achPollTimer = null;
    }

    init() {
      // Restore saved preferences
      if (this.storage.getProgress('muted')) {
        this.audio.setMuted(true);
      }
      if (this.highContrast) {
        document.documentElement.classList.add('high-contrast');
      }

      this._bindMenuControls();
      this._bindMode1StaticButtons();
      this._bindModals();
      this._bindGameOverOverlay();
      this._bindGlobalShortcuts();

      this.refreshMenuData();
      this._syncSettingsUI();

      // Periodic live achievement check (triggers Steam-style badge popups mid-game!)
      this._achPollTimer = setInterval(() => this.checkAchievements(), 1500);

      // Check URL params / hash for Open Day Demo Mode or direct station boot
      const params = new URLSearchParams(window.location.search);
      const isDemoParam = params.get('demo') === 'true' || params.get('demo') === '1';
      const requestedMode = params.get('mode') || window.location.hash.replace('#', '');

      if (isDemoParam) {
        this.setDemoMode(true, false);
      }

      if (requestedMode === '1' || requestedMode === 'mode1') {
        this.launchMode('mode1');
      } else if (requestedMode === '2' || requestedMode === 'mode2') {
        this.launchMode('mode2');
      } else if (requestedMode === '3' || requestedMode === 'mode3') {
        this.launchMode('mode3');
      } else if (isDemoParam) {
        // Open Day Demo Mode auto-starts the visual arcade mode!
        this.launchMode('mode1');
      }
    }

    // ─── SCREEN & MODE ROUTING ───────────────────────────────────────────────
    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach((el) => {
        el.classList.toggle('active', el.id === 'screen-' + screenId);
      });
      this.currentScreen = screenId;

      if (screenId === 'menu') {
        this._destroyActiveMode();
        this.refreshMenuData();
      }
    }

    launchMode(modeId) {
      this._closeAllModals();
      this._hideGameOverOverlay();
      this._destroyActiveMode();

      this.showScreen(modeId);
      const services = { audio: this.audio, storage: this.storage };

      if (modeId === 'mode1') {
        this.storage.setProgress('played_mode1', true);
        const canvas = document.getElementById('canvas-mode1');
        // Reset pause & scientist labels
        const pauseBtn = document.getElementById('mode1-btn-pause');
        if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
        const sciState = document.getElementById('sci-mode-state');
        if (sciState) sciState.textContent = 'OFF';
        const sciBtn = document.getElementById('scientist-toggle');
        if (sciBtn) sciBtn.classList.remove('active');

        this.activeController = new VQ.Mode1Arcade(canvas, services, {
          onBack: () => this.showScreen('menu'),
          onGameOver: (score) => this._presentGameOver('mode1', score, 'Cell Defense Complete!'),
        });
        this.activeController.start();
      } else if (modeId === 'mode2') {
        this.storage.setProgress('played_mode2', true);
        const container = document.getElementById('container-mode2');
        this.activeController = new VQ.Mode2Lab(container, services, {
          onBack: () => this.showScreen('menu'),
          onComplete: (score) => this._presentGameOver('mode2', score, 'Vaccine Candidate Approved!'),
        });
        this.activeController.start();
      } else if (modeId === 'mode3') {
        this.storage.setProgress('played_mode3', true);
        const container = document.getElementById('container-mode3');
        this.activeController = new VQ.Mode3Matching(container, services, {
          onBack: () => this.showScreen('menu'),
          onGameOver: (score) => this._presentGameOver('mode3', score, 'Detective Investigation Complete!'),
        });
        this.activeController.start();
      }

      this.checkAchievements();
    }

    _destroyActiveMode() {
      if (this.activeController) {
        if (typeof this.activeController.destroy === 'function') {
          this.activeController.destroy();
        }
        this.activeController = null;
      }
    }

    // ─── MENU DATA & LEADERBOARDS ────────────────────────────────────────────
    refreshMenuData() {
      this._renderCardHighScores('mode1', 'receptor_match');
      this._renderCardHighScores('mode2', 'vaccine_design');
      this._renderCardHighScores('mode3', 'taxonomy');
      this._renderAchievementsStrip();
    }

    _renderCardHighScores(modeId, storageKey) {
      const box = document.getElementById('hs-preview-' + modeId);
      if (!box) return;
      const scores = this.storage.getHighScores(storageKey).slice(0, 2);

      if (scores.length === 0) {
        box.innerHTML = '<div class="menu-hs-empty">🏆 No scores yet — set the first record!</div>';
        return;
      }

      const medals = ['🥇', '🥈'];
      box.innerHTML = scores
        .map(
          (entry, i) => `
          <div class="menu-hs-row">
            <span class="menu-hs-medal">${medals[i] || '🏅'}</span>
            <span class="menu-hs-name">${escHtml(entry.name)}</span>
            <span class="menu-hs-score">${formatScore(entry.score)}</span>
          </div>
        `
        )
        .join('');
    }

    _renderAchievementsStrip() {
      const strip = document.getElementById('achievements-strip');
      const countLbl = document.getElementById('ach-count-label');
      if (!strip) return;

      const unlocked = this.storage.getAchievements();
      if (countLbl) {
        countLbl.textContent = unlocked.length + ' / ' + VQ.ACHIEVEMENTS.length + ' Badges Unlocked';
      }

      strip.innerHTML = VQ.ACHIEVEMENTS.map((ach) => {
        const isUnlocked = unlocked.indexOf(ach.id) !== -1;
        return `
          <div class="ach-badge ${isUnlocked ? 'ach-badge--unlocked' : 'ach-badge--locked'}"
               title="${escHtml(ach.title + ': ' + ach.description)}">
            <span>${isUnlocked ? ach.icon : '🔒'}</span>
            <span>${escHtml(ach.title)}</span>
          </div>
        `;
      }).join('');
    }

    _renderLeaderboardModal() {
      const container = document.getElementById('hs-modal-content');
      if (!container) return;

      const sections = [
        { key: 'receptor_match', label: '🛡️ Mode 1: Cell Defender' },
        { key: 'vaccine_design', label: '🧬 Mode 2: Vaccine Maker Studio' },
        { key: 'taxonomy',       label: '🕵️ Mode 3: Virus Detective' },
      ];

      const visible =
        this.activeHsTab === 'all' ? sections : sections.filter((s) => s.key === this.activeHsTab);

      const medals = ['🥇', '🥈', '🥉'];
      const rowClasses = ['gold', 'silver', 'bronze'];

      container.innerHTML = visible
        .map((sec) => {
          const scores = this.storage.getHighScores(sec.key);
          if (scores.length === 0) {
            return `
              <div class="hs-section">
                <div class="hs-mode-title">${sec.label}</div>
                <div class="hs-empty">No scores recorded yet — jump in and claim #1!</div>
              </div>
            `;
          }

          const rows = scores
            .map((entry, idx) => {
              const dateStr = entry.date
                ? new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : '';
              return `
                <tr class="${rowClasses[idx] || ''}">
                  <td class="hs-rank">${medals[idx] || '#' + (idx + 1)}</td>
                  <td class="hs-name">${escHtml(entry.name)}</td>
                  <td class="hs-score">${formatScore(entry.score)}</td>
                  <td class="hs-date">${escHtml(dateStr)}</td>
                </tr>
              `;
            })
            .join('');

          return `
            <div class="hs-section">
              <div class="hs-mode-title">${sec.label}</div>
              <table class="hs-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        })
        .join('');
    }

    // ─── GAME OVER / SCORE SAVING OVERLAY ────────────────────────────────────
    _presentGameOver(modeId, rawScore, subtitle) {
      const meta = MODE_META[modeId];
      const score = Math.round(Number(rawScore) || 0);
      if (score > 0) {
        this.storage.setProgress('first_match_done', true);
      }
      this.checkAchievements();

      const existing = this.storage.getHighScores(meta.storageKey);
      const prevBest = existing.length > 0 ? existing[0].score : 0;
      const isNewBest = score > 0 && score > prevBest;

      this._pendingGameOver = {
        modeId: modeId,
        storageKey: meta.storageKey,
        score: score,
        saved: false,
      };

      const overlay = document.getElementById('overlay-gameover');
      const emojiEl = document.getElementById('go-emoji');
      const titleEl = document.getElementById('go-title');
      const subEl = document.getElementById('go-subtitle');
      const bestEl = document.getElementById('go-new-best');
      const scoreEl = document.getElementById('go-score');
      const inputEl = document.getElementById('go-name-input');

      if (emojiEl) emojiEl.textContent = isNewBest ? '🏆' : meta.emoji;
      if (titleEl) titleEl.textContent = meta.title;
      if (subEl) subEl.textContent = subtitle || 'Great job in the lab!';
      if (bestEl) bestEl.hidden = !isNewBest;
      if (scoreEl) scoreEl.textContent = formatScore(score);

      const lastPlayer = this.storage.getProgress('last_player_name') || '';
      if (inputEl) {
        inputEl.value = lastPlayer;
        setTimeout(() => inputEl.focus(), 120);
      }

      if (overlay) overlay.classList.add('active');
    }

    _commitPendingScore() {
      if (!this._pendingGameOver || this._pendingGameOver.saved) return;
      const inputEl = document.getElementById('go-name-input');
      const rawName = inputEl ? inputEl.value.trim() : '';
      const playerName = rawName.slice(0, 12) || 'Visitor';

      this.storage.setProgress('last_player_name', playerName);
      this.storage.addHighScore(this._pendingGameOver.storageKey, playerName, this._pendingGameOver.score);
      this._pendingGameOver.saved = true;
      this.checkAchievements();
    }

    _hideGameOverOverlay() {
      const overlay = document.getElementById('overlay-gameover');
      if (overlay) overlay.classList.remove('active');
      this._pendingGameOver = null;
    }

    // ─── ACHIEVEMENTS & NOTIFICATIONS ────────────────────────────────────────
    checkAchievements() {
      const tryUnlock = (id) => {
        if (this.storage.unlockAchievement(id)) {
          const ach = VQ.ACHIEVEMENTS.find((a) => a.id === id);
          if (ach) this._enqueueAchievementPopup(ach);
        }
      };

      if (this.storage.getProgress('first_match_done')) tryUnlock('first_match');
      if (this.storage.getProgress('combo_5_achieved')) tryUnlock('combo_5');
      if (this.storage.getProgress('combo_10_achieved')) tryUnlock('combo_10');
      if (this.storage.getProgress('perfect_wave')) tryUnlock('perfect_wave');
      if (this.storage.getProgress('vaccine_completed')) tryUnlock('vaccine_complete');
      if (this.storage.getProgress('lab_master_achieved')) tryUnlock('lab_master');
      if (this.storage.getProgress('taxonomy_all_done')) tryUnlock('taxonomy_ace');

      if (
        this.storage.getProgress('played_mode1') &&
        this.storage.getProgress('played_mode2') &&
        this.storage.getProgress('played_mode3')
      ) {
        tryUnlock('open_day_hero');
      }

      if (this.currentScreen === 'menu') {
        this._renderAchievementsStrip();
      }
    }

    _enqueueAchievementPopup(ach) {
      this._achQueue.push(ach);
      if (!this._achShowing) {
        this._showNextAchievement();
      }
    }

    _showNextAchievement() {
      if (this._achQueue.length === 0) {
        this._achShowing = false;
        return;
      }
      this._achShowing = true;
      const ach = this._achQueue.shift();

      const popup = document.getElementById('achievement-popup');
      const iconEl = document.getElementById('ach-popup-icon');
      const titleEl = document.getElementById('ach-popup-title');
      const descEl = document.getElementById('ach-popup-desc');

      if (!popup) {
        this._achShowing = false;
        return;
      }

      if (iconEl) iconEl.textContent = ach.icon;
      if (titleEl) titleEl.textContent = 'Badge Unlocked · ' + ach.title;
      if (descEl) descEl.textContent = ach.description;

      this.audio.play('success');
      popup.classList.remove('ach-hide');
      popup.classList.add('ach-show');

      setTimeout(() => {
        popup.classList.remove('ach-show');
        popup.classList.add('ach-hide');
        setTimeout(() => this._showNextAchievement(), 380);
      }, 3200);
    }

    showToast(message, type) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast toast--' + (type || 'info');
      toast.textContent = message;
      container.appendChild(toast);

      requestAnimationFrame(() => toast.classList.add('toast--visible'));

      setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.classList.add('toast--hiding');
        setTimeout(() => toast.remove(), 260);
      }, 2500);
    }

    // ─── SETTINGS, DEMO MODE, FULLSCREEN ─────────────────────────────────────
    toggleMute() {
      const muted = this.audio.toggleMute();
      this.storage.setProgress('muted', muted);
      if (!muted) this.audio.play('click');
      this._syncSettingsUI();
      this.showToast(muted ? '🔇 Sound Effects Muted' : '🔊 Sound Effects Enabled', 'info');
    }

    setDemoMode(enabled, notify) {
      this.demoMode = Boolean(enabled);
      document.documentElement.classList.toggle('demo-mode', this.demoMode);
      document.body.classList.toggle('has-demo-banner', this.demoMode);

      const banner = document.getElementById('demo-banner');
      if (banner) banner.hidden = !this.demoMode;

      this._syncSettingsUI();
      if (notify !== false) {
        this.showToast(
          this.demoMode
            ? '🖥️ Open Day Exhibition Mode ON (Larger UI + Banner)'
            : '🖥️ Standard Laptop Mode Restored',
          'info'
        );
      }
    }

    toggleHighContrast() {
      this.highContrast = !this.highContrast;
      document.documentElement.classList.toggle('high-contrast', this.highContrast);
      this.storage.setProgress('high_contrast', this.highContrast);
      this.audio.play('click');
      this._syncSettingsUI();
      this.showToast(this.highContrast ? '👁️ High-Contrast Mode ON' : '👁️ Standard Theme Active', 'info');
    }

    toggleFullscreen() {
      this.audio.play('click');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          this.showToast('Press F11 or browser Fullscreen to expand!', 'info');
        });
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    resetAllData() {
      this.storage.resetAll();
      this.highContrast = false;
      document.documentElement.classList.remove('high-contrast');
      this.audio.setMuted(false);
      this._syncSettingsUI();
      this.refreshMenuData();
      this._renderLeaderboardModal();
      this.audio.play('success');
      this.showToast('🗑️ Leaderboards & Badges Reset for Next Visitor Group!', 'success');
    }

    _syncSettingsUI() {
      const muted = this.audio.isMuted();

      const quickSound = document.getElementById('btn-quick-sound');
      if (quickSound) {
        quickSound.textContent = muted ? '🔇 Muted' : '🔊 Sound ON';
        quickSound.classList.toggle('active', !muted);
      }

      const quickDemo = document.getElementById('btn-quick-demo');
      if (quickDemo) {
        quickDemo.textContent = this.demoMode ? '🖥️ Open Day: ON' : '🖥️ Open Day Mode';
        quickDemo.classList.toggle('active', this.demoMode);
      }

      const setMute = document.getElementById('setting-mute');
      if (setMute) {
        setMute.textContent = muted ? '🔇 Muted (Click to Enable)' : '🔊 Sound ON';
        setMute.classList.toggle('active', !muted);
      }

      const setContrast = document.getElementById('setting-contrast');
      if (setContrast) {
        setContrast.textContent = this.highContrast ? 'ON ✓' : 'OFF';
        setContrast.classList.toggle('active', this.highContrast);
      }

      const setDemo = document.getElementById('setting-demo');
      if (setDemo) {
        setDemo.textContent = this.demoMode ? 'ON ✓' : 'OFF';
        setDemo.classList.toggle('active', this.demoMode);
      }
    }

    // ─── DOM EVENT BINDINGS ──────────────────────────────────────────────────
    _bindMenuControls() {
      // Mode cards
      document.querySelectorAll('[data-launch-mode]').forEach((card) => {
        card.addEventListener('click', () => {
          this.audio.play('click');
          this.launchMode(card.dataset.launchMode);
        });
      });

      // Top quick-action utility pills
      const btnSound = document.getElementById('btn-quick-sound');
      if (btnSound) btnSound.addEventListener('click', () => this.toggleMute());

      const btnDemo = document.getElementById('btn-quick-demo');
      if (btnDemo) btnDemo.addEventListener('click', () => this.setDemoMode(!this.demoMode, true));

      const btnFs = document.getElementById('btn-quick-fullscreen');
      if (btnFs) btnFs.addEventListener('click', () => this.toggleFullscreen());

      const btnHow = document.getElementById('btn-quick-howto');
      if (btnHow) btnHow.addEventListener('click', () => this.openModal('modal-howtoplay'));

      const btnExitDemo = document.getElementById('btn-exit-demo');
      if (btnExitDemo) btnExitDemo.addEventListener('click', () => this.setDemoMode(false, true));
    }

    _bindMode1StaticButtons() {
      const backBtn = document.getElementById('mode1-btn-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          this.audio.play('click');
          this.showScreen('menu');
        });
      }

      const sciBtn = document.getElementById('scientist-toggle');
      if (sciBtn) {
        sciBtn.addEventListener('click', () => {
          if (this.activeController && typeof this.activeController.toggleScientistMode === 'function') {
            this.activeController.toggleScientistMode();
          }
        });
      }
    }

    _bindModals() {
      document.querySelectorAll('[data-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.audio.play('click');
          this.openModal(btn.dataset.modal);
        });
      });

      document.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.audio.play('click');
          this._closeAllModals();
        });
      });

      document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this._closeAllModals();
          }
        });
      });

      // Leaderboard Filter Tabs
      document.querySelectorAll('[data-hs-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          this.audio.play('click');
          this.activeHsTab = tabBtn.dataset.hsTab;
          document.querySelectorAll('[data-hs-tab]').forEach((b) => {
            b.classList.toggle('active', b.dataset.hsTab === this.activeHsTab);
          });
          this._renderLeaderboardModal();
        });
      });

      const clearHsBtn = document.getElementById('btn-clear-scores');
      if (clearHsBtn) {
        clearHsBtn.addEventListener('click', () => {
          if (window.confirm('Reset all Open Day high scores and badges on this laptop?')) {
            this.resetAllData();
          }
        });
      }

      // Settings buttons
      const setMute = document.getElementById('setting-mute');
      if (setMute) setMute.addEventListener('click', () => this.toggleMute());

      const setContrast = document.getElementById('setting-contrast');
      if (setContrast) setContrast.addEventListener('click', () => this.toggleHighContrast());

      const setDemo = document.getElementById('setting-demo');
      if (setDemo) setDemo.addEventListener('click', () => this.setDemoMode(!this.demoMode, true));

      const setReset = document.getElementById('setting-reset');
      if (setReset) {
        setReset.addEventListener('click', () => {
          if (window.confirm('Clear all saved scores and achievements for the next visitor group?')) {
            this.resetAllData();
          }
        });
      }
    }

    openModal(modalId) {
      this._closeAllModals();
      if (modalId === 'modal-highscore') {
        this._renderLeaderboardModal();
      }
      const el = document.getElementById(modalId);
      if (el) el.classList.add('open');
    }

    _closeAllModals() {
      document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
    }

    _bindGameOverOverlay() {
      const btnAgain = document.getElementById('btn-go-save-again');
      const btnMenu = document.getElementById('btn-go-save-menu');
      const inputEl = document.getElementById('go-name-input');

      if (btnAgain) {
        btnAgain.addEventListener('click', () => {
          this.audio.play('click');
          const modeId = this._pendingGameOver ? this._pendingGameOver.modeId : 'mode1';
          this._commitPendingScore();
          this._hideGameOverOverlay();
          this.launchMode(modeId);
        });
      }

      if (btnMenu) {
        btnMenu.addEventListener('click', () => {
          this.audio.play('click');
          this._commitPendingScore();
          this._hideGameOverOverlay();
          this.showScreen('menu');
        });
      }

      if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (btnMenu) btnMenu.click();
          }
        });
      }
    }

    _bindGlobalShortcuts() {
      window.addEventListener('keydown', (e) => {
        const tag = ((e.target && e.target.tagName) || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
          if (e.key === 'Escape') {
            e.target.blur();
          }
          return;
        }

        if (e.key === 'Escape') {
          const openModal = document.querySelector('.modal.open');
          if (openModal) {
            this._closeAllModals();
            return;
          }
          if (document.getElementById('overlay-gameover').classList.contains('active')) {
            this._commitPendingScore();
            this._hideGameOverOverlay();
            this.showScreen('menu');
            return;
          }
          if (this.currentScreen !== 'menu') {
            this.showScreen('menu');
          }
          return;
        }

        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.toggleMute();
          return;
        }

        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          this.toggleFullscreen();
          return;
        }

        if (e.key === 'd' || e.key === 'D') {
          if (this.currentScreen === 'menu') {
            e.preventDefault();
            this.setDemoMode(!this.demoMode, true);
          }
          return;
        }

        // Quick launch 1 / 2 / 3 from Main Menu
        if (this.currentScreen === 'menu' && !document.querySelector('.modal.open')) {
          if (e.key === '1') this.launchMode('mode1');
          else if (e.key === '2') this.launchMode('mode2');
          else if (e.key === '3') this.launchMode('mode3');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const app = new ViroQuestApp();
    VQ.app = app;
    app.init();
  });
})();
