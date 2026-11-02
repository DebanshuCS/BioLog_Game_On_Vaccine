/**
 * storage.js — ViroQuest Persistent High Scores & Achievements (localStorage)
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});

  const ACHIEVEMENTS = [
    {
      id: 'first_match',
      title: 'First Defense',
      description: 'Blocked your first virus or started a lab mission!',
      icon: '🛡️',
    },
    {
      id: 'combo_5',
      title: '5x Antibody Streak',
      description: 'Hit 5 matches in a row without a mistake!',
      icon: '🔥',
    },
    {
      id: 'combo_10',
      title: '10x Super Immunity',
      description: 'Reached an unstoppable 10x streak!',
      icon: '⚡',
    },
    {
      id: 'perfect_wave',
      title: 'Spotless Cell',
      description: 'Cleared an Arcade wave without losing any cell health!',
      icon: '✨',
    },
    {
      id: 'vaccine_complete',
      title: 'Vaccine Creator',
      description: 'Designed and tested a complete vaccine in the Studio!',
      icon: '💉',
    },
    {
      id: 'lab_master',
      title: 'Star Bio-Engineer',
      description: 'Scored 90%+ protection in Vaccine Maker Studio!',
      icon: '🧬',
    },
    {
      id: 'taxonomy_ace',
      title: 'Master Virus Detective',
      description: 'Solved all 4 rounds of Virus Detective!',
      icon: '🕵️',
    },
    {
      id: 'open_day_hero',
      title: 'Open Day Champion',
      description: 'Played all 3 ViroQuest game modes!',
      icon: '🎓',
    },
  ];

  const PREFIX = 'viroquest_v2_';
  const MAX_SCORES = 10;

  class StorageManager {
    _get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }

    _set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        // Ignore private browsing quota errors gracefully
      }
    }

    getHighScores(mode) {
      const scores = this._get('scores_' + mode, []);
      return scores
        .filter(function (e) { return e && typeof e.score === 'number'; })
        .sort(function (a, b) { return b.score - a.score; });
    }

    addHighScore(mode, name, score) {
      const cleanName = String(name || '').trim().slice(0, 12) || 'Player';
      const entry = {
        name: cleanName,
        score: Math.round(Number(score) || 0),
        date: new Date().toISOString(),
      };
      const scores = this.getHighScores(mode);
      scores.push(entry);
      scores.sort(function (a, b) { return b.score - a.score; });
      const trimmed = scores.slice(0, MAX_SCORES);
      this._set('scores_' + mode, trimmed);
      return trimmed;
    }

    getAchievements() {
      return this._get('achievements', []);
    }

    unlockAchievement(id) {
      const unlocked = this.getAchievements();
      if (unlocked.indexOf(id) !== -1) return false;
      unlocked.push(id);
      this._set('achievements', unlocked);
      return true;
    }

    getProgress(key) {
      return this._get('progress_' + key, undefined);
    }

    setProgress(key, value) {
      this._set('progress_' + key, value);
    }

    resetAll() {
      try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.indexOf('viroquest_') === 0)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {
        // Ignore
      }
    }
  }

  VQ.ACHIEVEMENTS = ACHIEVEMENTS;
  VQ.StorageManager = StorageManager;
})();
