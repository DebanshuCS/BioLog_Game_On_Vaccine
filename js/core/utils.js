/**
 * utils.js — ViroQuest Core Math, Color & Formatting Utilities
 * Works offline on both file:// and http:// with zero external dependencies.
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#ffffff').replace(/^#/, '');
    const full = clean.length === 3
      ? clean.split('').map(function (c) { return c + c; }).join('')
      : clean;
    const num = parseInt(full, 16);
    if (isNaN(num)) return { r: 255, g: 255, b: 255 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function shiftColor(hex, delta) {
    const rgb = hexToRgb(hex);
    const r = clamp(Math.round(rgb.r + delta), 0, 255);
    const g = clamp(Math.round(rgb.g + delta), 0, 255);
    const b = clamp(Math.round(rgb.b + delta), 0, 255);
    return '#' + [r, g, b].map(function (v) {
      return v.toString(16).padStart(2, '0');
    }).join('');
  }

  function formatScore(n) {
    return Math.round(Number(n) || 0).toLocaleString('en-US');
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  VQ.utils = {
    lerp: lerp,
    clamp: clamp,
    randomBetween: randomBetween,
    randomInt: randomInt,
    randomFrom: randomFrom,
    shuffle: shuffle,
    hexToRgb: hexToRgb,
    shiftColor: shiftColor,
    formatScore: formatScore,
    escHtml: escHtml,
  };
})();
