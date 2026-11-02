/**
 * taxonomy.js — ViroQuest "Virus Detective" Matching Data & Canvas Renderers (Mode 3)
 * Crafted for Class 12 & 1st-Year College Students:
 * Visual 3D shapes, real-world spread routes, DNA vs RNA tricks, and vaccine breakthroughs!
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});
  const { shiftColor } = VQ.utils;

  const MATCHING_ROUNDS = [
    // ── Round 1: 3D Virus Shapes & Coats (4 Visual Pairs) ────────────────────
    {
      id: 'round_shapes',
      title: 'Round 1: 3D Shapes & Coats',
      description: 'Look at each virus portrait and connect it to its signature 3D body plan!',
      timeLimit: 75,
      pairs: [
        {
          id: 'shape_covid',
          virus: { name: 'COVID-19', sub: 'SARS-CoV-2', color: '#38BDF8', silhouette: 'spherical' },
          clue:  { icon: '👑', label: 'Crown Spikes + Fatty Envelope', detail: 'Round lipid coat studded with club-shaped spikes (soap dissolves this coat in 20s!)' },
          fact:  'Corona means "crown"! Washing hands with soap breaks apart COVID-19\'s fatty outer envelope.',
        },
        {
          id: 'shape_rabies',
          virus: { name: 'Rabies Virus', sub: 'Lyssavirus', color: '#A855F7', silhouette: 'helical' },
          clue:  { icon: '🚀', label: 'Bullet-Shaped Spiral Rod', detail: 'Coiled RNA spring packed inside an unmistakable bullet-shaped shell.' },
          fact:  'Rabies is shaped like a tiny microscopic bullet and travels along nerve fibers toward the brain!',
        },
        {
          id: 'shape_adeno',
          virus: { name: 'Adenovirus', sub: 'Common Cold / Vector', color: '#00E5B0', silhouette: 'icosahedral' },
          clue:  { icon: '💎', label: '20-Sided Crystal + Corner Fibers', detail: 'Tough naked icosahedral protein shell with antenna-like landing fibers at every corner.' },
          fact:  'With no fragile fatty coat, naked icosahedral viruses like Adenovirus survive weeks on doorknobs!',
        },
        {
          id: 'shape_ebola',
          virus: { name: 'Ebola Virus', sub: 'Filovirus', color: '#FB7185', silhouette: 'filamentous' },
          clue:  { icon: '🧵', label: 'Long Looping Thread', detail: 'Flexible worm-like filament often curved into a "6" or shepherd\'s hook.' },
          fact:  'Filovirus literally means "thread virus" — Ebola filaments are ~10× longer than typical round viruses!',
        },
      ],
    },

    // ── Round 2: How Do Viruses Spread? (5 Real-World Pairs) ─────────────────
    {
      id: 'round_spread',
      title: 'Round 2: How Viruses Travel',
      description: 'Match each virus to how it spreads from host to host in the real world!',
      timeLimit: 85,
      pairs: [
        {
          id: 'spread_flu',
          virus: { name: 'Influenza (Flu)', sub: 'Airway Virus', color: '#38BDF8', silhouette: 'spherical' },
          clue:  { icon: '💨', label: 'Coughs, Sneezes & Airway Droplets', detail: 'Inhaled droplets dock onto sugar molecules in your nose and throat.' },
          fact:  'A single sneeze can launch up to 40,000 microscopic droplets carrying respiratory viruses!',
        },
        {
          id: 'spread_dengue',
          virus: { name: 'Dengue Virus', sub: 'Breakbone Fever', color: '#FFB547', silhouette: 'spherical' },
          clue:  { icon: '🦟', label: 'Day-Biting Aedes Mosquito', detail: 'Carried between humans by striped mosquitoes that breed in standing water.' },
          fact:  'Dengue doesn\'t spread directly from person to person — stopping Aedes mosquito breeding stops outbreaks!',
        },
        {
          id: 'spread_polio',
          virus: { name: 'Poliovirus', sub: 'Enterovirus', color: '#22C55E', silhouette: 'icosahedral' },
          clue:  { icon: '💧', label: 'Contaminated Water & Food', detail: 'Tough acid-proof shell survives stomach acid to infect the gut.' },
          fact:  'Because Poliovirus has no fatty envelope, it survives stomach acid — clean water + oral vaccine drops defeated it!',
        },
        {
          id: 'spread_rabies',
          virus: { name: 'Rabies Virus', sub: 'Zoonotic Virus', color: '#A855F7', silhouette: 'helical' },
          clue:  { icon: '🐕', label: 'Saliva from Infected Animal Bite', detail: 'Enters muscle nerves at a bite wound; immediate post-bite vaccine is ~100% lifesaving!' },
          fact:  'Rabies moves slowly enough along nerves that getting vaccinated right after a dog/bat bite stops it in time!',
        },
        {
          id: 'spread_hiv',
          virus: { name: 'HIV-1', sub: 'Immune Cell Virus', color: '#EC4899', silhouette: 'spherical' },
          clue:  { icon: '🩸', label: 'Blood & Unprotected Contact', detail: 'Fragile outside the body — NEVER spread by air, food, water, hugs, or mosquitoes.' },
          fact:  'Modern HIV therapy lowers virus levels until it is completely untransmittable (U = U)!',
        },
      ],
    },

    // ── Round 3: DNA vs RNA Genetic Blueprints (5 Biotech Pairs) ─────────────
    {
      id: 'round_genomes',
      title: 'Round 3: DNA vs RNA Blueprints',
      description: 'Viruses break the rules! Match each virus to the type of genetic code it carries.',
      timeLimit: 90,
      pairs: [
        {
          id: 'gen_covid',
          virus: { name: 'COVID-19', sub: 'Coronavirus', color: '#38BDF8', silhouette: 'spherical' },
          clue:  { icon: '📜', label: 'Ready-to-Read Single RNA (+ssRNA)', detail: 'Host ribosomes read its positive RNA strand immediately like normal mRNA!' },
          fact:  'At ~30,000 letters, COVID-19 has one of the largest RNA genomes — and even carries its own spell-check enzyme!',
        },
        {
          id: 'gen_hiv',
          virus: { name: 'HIV-1', sub: 'Retrovirus', color: '#C084FC', silhouette: 'spherical' },
          clue:  { icon: '🔄', label: 'RNA → DNA Copycat (Retrovirus)', detail: 'Uses Reverse Transcriptase to turn RNA backward into DNA and hide in chromosomes!' },
          fact:  'Retroviruses flip Crick\'s Central Dogma backward (RNA → DNA) using the enzyme Reverse Transcriptase!',
        },
        {
          id: 'gen_flu',
          virus: { name: 'Influenza A', sub: 'Orthomyxovirus', color: '#00E5B0', silhouette: 'spherical' },
          clue:  { icon: '🧩', label: '8 Separate RNA Puzzle Pieces', detail: 'Split into 8 RNA segments that can mix-and-swap when two flu strains meet!' },
          fact:  'When bird flu and human flu infect the same cell, they can swap their 8 RNA pieces to create a brand-new strain!',
        },
        {
          id: 'gen_hpv',
          virus: { name: 'HPV', sub: 'Papillomavirus', color: '#FFB547', silhouette: 'icosahedral' },
          clue:  { icon: '⭕', label: 'Small Circular Double-Stranded DNA', detail: 'An 8,000-bp closed ring of dsDNA inside skin and mucosal cells.' },
          fact:  'HPV\'s circular dsDNA looks a lot like a miniature plasmid inside infected epithelial cells!',
        },
        {
          id: 'gen_rota',
          virus: { name: 'Rotavirus', sub: 'Wheel Virus', color: '#FB7185', silhouette: 'icosahedral' },
          clue:  { icon: '🧬', label: 'Double-Stranded RNA (dsRNA)', detail: 'Unusual twin-stranded RNA tucked inside a triple-layered protein wheel!' },
          fact:  'Human cells never naturally make long dsRNA — so our immune sensors treat dsRNA as an instant "Virus Alarm"!',
        },
      ],
    },

    // ── Round 4: Medical & Vaccine Hall of Fame (5 Finale Pairs) ─────────────
    {
      id: 'round_breakthroughs',
      title: 'Round 4: Vaccine Hall of Fame',
      description: 'Final Challenge! Connect each famous virus to its landmark medical story.',
      timeLimit: 85,
      pairs: [
        {
          id: 'fame_smallpox',
          virus: { name: 'Smallpox', sub: 'Variola Brick Virus', color: '#F59E0B', silhouette: 'complex' },
          clue:  { icon: '🌍', label: '100% Eradicated Worldwide!', detail: 'Edward Jenner\'s cowpox discovery led to humanity wiping this disease off Earth in 1980.' },
          fact:  'The word "Vaccine" comes from Latin "vacca" (cow), after Jenner used cowpox to protect against Smallpox in 1796!',
        },
        {
          id: 'fame_hpv',
          virus: { name: 'HPV-16 / 18', sub: 'Papillomavirus', color: '#A855F7', silhouette: 'icosahedral' },
          clue:  { icon: '🎗️', label: 'Prevents >90% of Cervical Cancers', detail: 'Empty L1 protein-shell vaccine stops cancer-causing strains before infection starts.' },
          fact:  'Countries with widespread teen HPV vaccination are on track to virtually eliminate cervical cancer!',
        },
        {
          id: 'fame_hepb',
          virus: { name: 'Hepatitis B', sub: 'Liver Virus', color: '#EF4444', silhouette: 'spherical' },
          clue:  { icon: '🧪', label: 'First Recombinant Yeast Vaccine (1986)', detail: 'Made by putting the viral surface gene into baker\'s yeast — protects the liver!' },
          fact:  'Hepatitis B was the world\'s first genetically engineered human vaccine, brewed safely inside baker\'s yeast!',
        },
        {
          id: 'fame_hsv',
          virus: { name: 'Herpes Simplex', sub: 'Cold Sore Virus', color: '#EC4899', silhouette: 'spherical' },
          clue:  { icon: '😴', label: 'Sleeps Silently in Nerve Cells', detail: 'Goes dormant inside facial nerve ganglia and wakes up during fever or exam stress!' },
          fact:  'Once HSV-1 enters nerve cells, its DNA naps quietly as a circle until stress or sunlight wakes it up!',
        },
        {
          id: 'fame_adeno',
          virus: { name: 'Adenovirus', sub: 'Engineered Shuttle', color: '#00E5B0', silhouette: 'icosahedral' },
          clue:  { icon: '🛠️', label: 'Turned into a Gene-Delivery Shuttle', detail: 'Scientists deleted its replication genes to carry helpful genes & vaccine blueprints!' },
          fact:  'By removing just one key gene (E1), scientists turned a common cold Adenovirus into a safe vaccine delivery van!',
        },
      ],
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // PROCEDURAL CANVAS VIRUS PORTRAIT RENDERERS
  // Signature: fn(ctx, cx, cy, size, color)
  // ───────────────────────────────────────────────────────────────────────────
  const VIRUS_SILHOUETTES = {
    spherical: function (ctx, x, y, size, color) {
      const r = size * 0.54;
      const spikeLen = size * 0.28;
      const spikes = 12;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.25;

      const grad = ctx.createRadialGradient(x - r * 0.28, y - r * 0.28, r * 0.1, x, y, r);
      grad.addColorStop(0, shiftColor(color, 55));
      grad.addColorStop(0.65, color);
      grad.addColorStop(1, shiftColor(color, -45));

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r;
        const kx = x + Math.cos(a) * (r + spikeLen);
        const ky = y + Math.sin(a) * (r + spikeLen);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(kx, ky);
        ctx.strokeStyle = shiftColor(color, 20);
        ctx.lineWidth = Math.max(1.5, size * 0.06);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(2, size * 0.09), 0, Math.PI * 2);
        ctx.fillStyle = shiftColor(color, 45);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fill();
      ctx.restore();
    },

    helical: function (ctx, x, y, size, color) {
      const w = size * 0.62;
      const h = size * 1.25;
      const rx = x - w / 2;
      const ry = y - h / 2;
      const rTop = w * 0.5;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.22;

      ctx.beginPath();
      ctx.arc(x, ry + rTop, rTop, Math.PI, 0);
      ctx.lineTo(rx + w, ry + h - 3);
      ctx.quadraticCurveTo(x, ry + h + 2, rx, ry + h - 3);
      ctx.closePath();

      const grad = ctx.createLinearGradient(rx, ry, rx + w, ry);
      grad.addColorStop(0, shiftColor(color, -30));
      grad.addColorStop(0.45, shiftColor(color, 40));
      grad.addColorStop(1, shiftColor(color, -25));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spiral RNA bands inside bullet
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = Math.max(1.2, size * 0.055);
      for (let i = 0; i < 5; i++) {
        const sy = ry + rTop * 0.8 + i * (h * 0.14);
        ctx.beginPath();
        ctx.moveTo(rx + 3, sy);
        ctx.lineTo(rx + w - 3, sy + 3);
        ctx.stroke();
      }
      ctx.restore();
    },

    icosahedral: function (ctx, x, y, size, color) {
      const r = size * 0.6;
      const verts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        verts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
      }
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.22;

      const shades = [28, -10, -28, -15, 12, 35];
      for (let i = 0; i < 6; i++) {
        const nxt = verts[(i + 1) % 6];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(verts[i].x, verts[i].y);
        ctx.lineTo(nxt.x, nxt.y);
        ctx.closePath();
        ctx.fillStyle = shiftColor(color, shades[i]);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const v = verts[i];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();

        // Corner fiber knob
        const fx = x + (v.x - x) * 1.28;
        const fy = y + (v.y - y) * 1.28;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(fx, fy);
        ctx.strokeStyle = shiftColor(color, 45);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(1.8, size * 0.065), 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
      ctx.restore();
    },

    filamentous: function (ctx, x, y, size, color) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.25;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(4, size * 0.22);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x - size * 0.35, y - size * 0.65);
      ctx.bezierCurveTo(
        x + size * 0.65, y - size * 0.35,
        x - size * 0.65, y + size * 0.25,
        x + size * 0.25, y + size * 0.68
      );
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = shiftColor(color, 55);
      ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.stroke();
      ctx.restore();
    },

    complex: function (ctx, x, y, size, color) {
      const bw = size * 1.25;
      const bh = size * 0.88;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.22;

      ctx.beginPath();
      ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, size * 0.22);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = shiftColor(color, 45);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner dumbbell core
      ctx.fillStyle = shiftColor(color, -45);
      ctx.beginPath();
      ctx.arc(x - size * 0.24, y, size * 0.18, 0, Math.PI * 2);
      ctx.arc(x + size * 0.24, y, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - size * 0.24, y - size * 0.09, size * 0.48, size * 0.18);
      ctx.restore();
    },
  };

  VQ.MATCHING_ROUNDS = MATCHING_ROUNDS;
  VQ.VIRUS_SILHOUETTES = VIRUS_SILHOUETTES;
})();
