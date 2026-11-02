/**
 * viruses.js — ViroQuest Virus–Receptor ("Key & Lock") Data for Mode 1
 * Calibrated for Class 12 & 1st-Year College Biology: accurate, visual & punchy!
 */
(function () {
  'use strict';

  const VQ = (window.VQ = window.VQ || {});

  const VIRUS_RECEPTOR_PAIRS = [
    {
      id: 'covid_ace2',
      virusName: 'COVID-19',
      scientificVirus: 'SARS-CoV-2',
      spikeName: 'Crown Spike',
      receptorName: 'ACE2 Lock',
      tissueHint: 'Lung & Nose Cells',
      shapeKey: 'crown',
      symbol: '👑',
      color: '#38BDF8',
      glowColor: '#0284C7',
      quickFact: 'Blocked! COVID\'s Crown Spike couldn\'t unlock the ACE2 lung receptor!',
      scientistNote: 'SARS-CoV-2 Spike RBD binds human ACE2 on lung & nasal cells.',
    },
    {
      id: 'flu_sialic',
      virusName: 'Flu Virus',
      scientificVirus: 'Influenza A',
      spikeName: 'HA Star',
      receptorName: 'Sialic Sugar',
      tissueHint: 'Throat & Airway',
      shapeKey: 'star',
      symbol: '⭐',
      color: '#34D399',
      glowColor: '#059669',
      quickFact: 'Neutralized! Flu\'s HA protein was stopped from grabbing airway sugars!',
      scientistNote: 'Influenza Hemagglutinin (HA) docks onto sialic acid sugars in airways.',
    },
    {
      id: 'hiv_cd4',
      virusName: 'HIV-1',
      scientificVirus: 'Human Immunodeficiency Virus',
      spikeName: 'gp120 Cube',
      receptorName: 'CD4 Lock',
      tissueHint: 'Helper T-Cells',
      shapeKey: 'square',
      symbol: '🟪',
      color: '#C084FC',
      glowColor: '#7C3AED',
      quickFact: 'Saved a T-Cell! Antibody blocked HIV gp120 from docking on CD4!',
      scientistNote: 'HIV-1 gp120 binds CD4 receptors on immune Helper T-lymphocytes.',
    },
    {
      id: 'ebola_npc1',
      virusName: 'Ebola',
      scientificVirus: 'Zaire Ebolavirus',
      spikeName: 'GP Wedge',
      receptorName: 'NPC1 Gate',
      tissueHint: 'Cell Endosome',
      shapeKey: 'triangle',
      symbol: '🔺',
      color: '#FBBF24',
      glowColor: '#D97706',
      quickFact: 'Intercepted! Ebola\'s GP spike couldn\'t open the NPC1 cell gate!',
      scientistNote: 'Cleaved Ebola GP unlocks the NPC1 cholesterol transporter inside endosomes.',
    },
    {
      id: 'adeno_car',
      virusName: 'Adenovirus',
      scientificVirus: 'Human Adenovirus 5',
      spikeName: 'Fiber Hex',
      receptorName: 'CAR Dock',
      tissueHint: 'Eye & Airway Cells',
      shapeKey: 'hex',
      symbol: '⬡',
      color: '#FB7185',
      glowColor: '#E11D48',
      quickFact: 'Deflected! Adenovirus corner fibers bounced right off the CAR dock!',
      scientistNote: 'Adenovirus fiber knobs attach to CAR tight-junction proteins on epithelia.',
    },
  ];

  VQ.VIRUS_RECEPTOR_PAIRS = VIRUS_RECEPTOR_PAIRS;
})();
