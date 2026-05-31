/* =====================================================================
   Lineage V2 — DATA LAYER  (single source of truth)
   --------------------------------------------------------------------
   PEOPLE        — every narrated ancestor as a node with stable canonical
                   ID (A11..GEN1 / B12..GEN1 / C15..GEN1 / D9..GEN1).
   WORLDS        — dated world-event annotations along the time ruler.
   MIGRATIONS    — map ARROWs and the windows the map inset surfaces in.
   BEATS         — the 40-beat narration cue sheet (provisional t).
                   Re-lock Time column to the final ElevenLabs audio by
                   editing only the .t values here. Order and tree cues
                   never change; only the seconds do.
   --------------------------------------------------------------------
   Source files:
     Lineage_Canonical_Timeline_2026-05-25.md      (Part 1, 1B, 2)
     Lineage_Narration_Timestamps_2026-05-25.md    (the 40-beat cue sheet)
   All times in audio-seconds.
   ===================================================================== */
(function () {
  'use strict';

  /* ----- the four lineages (column order: merging pairs adjacent) ----- */
  var LINES = [
    { id: 'C', label: 'Bétourné dit Laviolette', origin: 'Picardy, France',
      color: 'var(--c-betourne)' },
    { id: 'D', label: 'Heppell · Lepel',          origin: 'Rhineland, Prussia',
      color: 'var(--c-heppell)' },
    { id: 'B', label: 'Mongeau dit Clermont',     origin: 'Auvergne, France',
      color: 'var(--c-mongeau)' },
    { id: 'A', label: 'Barbeau dit Boisdoré',     origin: 'Saintonge, France',
      color: 'var(--c-barbeau)' },

    { id: 'E', label: 'Lepage · Noël',         origin: 'Lauzon / Bellechasse, Quebec',
      color: 'var(--c-lepage, #b89967)' }
  ];

  /* =====================================================================
     PEOPLE — canonical Part 1 (full depth) + narrated Part 1B spouses
     Each: { id, line, gen, year, name, sub, parents, kind, t, ...flags }
     kind: 'person' | 'founder' | 'spouse' | 'union' | 'descendant'
     flags: anchor, candidate, dimmedUntil, tLight, napierville, finalUnion
     ===================================================================== */
  var PEOPLE = [

    /* ---- Line A, Barbeau (maternal) ---- */
    { id: 'A11', line: 'A', gen: 11, year: 1660, t: 495.98, kind: 'founder',
      name: 'Pierre Barbeau',
      sub: 'Pons, Saintonge · merchant family', parents: [] },
    { id: 'SP-A11', line: 'A', gen: 11, year: 1660, t: 495.98, kind: 'spouse',
      name: 'Madeleine Babin',
      sub: 'Pons, Saintonge', spouseOf: 'A11' },
    { id: 'A10', line: 'A', gen: 10, year: 1666, t: 780.34, kind: 'person',
      name: 'Jean Barbeau dit Boisdoré',
      sub: 'b. 1666 Pons · soldier of the King 1685',
      parents: ['A11'] },
    { id: 'A9',  line: 'A', gen: 9,  year: 1694, t: 851.48, kind: 'person',
      name: 'Gabriel Barbeau dit Boisdoré',
      sub: 'bap. 1694 Boucherville',
      parents: ['A10'] },
    { id: 'A8',  line: 'A', gen: 8,  year: 1725, t: 864.34, kind: 'person',
      name: 'Jean-Baptiste Barbeau',
      sub: 'bap. 1725 La Prairie',
      parents: ['A9'] },
    { id: 'A7',  line: 'A', gen: 7,  year: 1757, t: 1015.18, kind: 'person',
      name: 'Joseph Barbeau dit Boisdoré',
      sub: 'bap. 1757 Saint-Constant',
      parents: ['A8'] },
    { id: 'A6',  line: 'A', gen: 6,  year: 1804, t: 1428.00, kind: 'person',
      name: 'François Régis Barbeau',
      sub: 'b. 1804 Saint-Constant · m. 1828',
      parents: ['A7'] },
    { id: 'A5',  line: 'A', gen: 5,  year: 1833, t: 1769.58, kind: 'person',
      name: 'Magloire Barbeau',
      sub: 'b. 1833 Saint-Philippe · m. 1865 Napierville',
      parents: ['A6'], napierville: true },
    { id: 'A4',  line: 'A', gen: 4,  year: 1870, t: 1788.78, kind: 'person',
      name: 'Joseph Wilfred Barbeau',
      sub: 'b. 1870 Napierville · Bill C-3 anchor',
      parents: ['A5'], anchor: true, napierville: true },
    { id: 'A3',  line: 'A', gen: 3,  year: 1906, t: 2132.60, kind: 'person',
      name: 'Rouville Ernest Barbeau',
      sub: 'b. 1906 North Adams, MA',
      parents: ['A4'] },
    { id: 'A2',  line: 'A', gen: 2,  year: 1940, t: 2280.90, kind: 'person',
      name: 'Lorraine Irene Barbeau',
      sub: 'b. about 1940 North Adams · mother',
      parents: ['UN-AB'] },

    /* ---- Line B, Clermont / Mongeau (maternal) ---- */
    { id: 'B12', line: 'B', gen: 12, year: 1615, t: 317.74, kind: 'founder',
      name: 'Mathieu Mangot',
      sub: 'near Clermont-Ferrand, Auvergne', parents: [] },
    { id: 'SP-B12', line: 'B', gen: 12, year: 1615, t: 317.74, kind: 'spouse',
      name: 'Marguerite Blandette',
      sub: 'Clermont-Ferrand', spouseOf: 'B12' },
    { id: 'B11', line: 'B', gen: 11, year: 1643, t: 244.86, kind: 'person',
      name: 'Antoine Mangot',
      sub: 'bap. 1643 Saint-Pierre, Clermont-Ferrand',
      parents: ['B12'] },
    { id: 'SP-B11', line: 'B', gen: 11, year: 1643, t: 244.86, kind: 'spouse',
      name: 'Gabrielle Pabiot',
      sub: 'Clermont-Ferrand', spouseOf: 'B11' },
    { id: 'B10', line: 'B', gen: 10, year: 1677, t: 352.42, kind: 'person',
      name: 'Gilbert Mangot (carpenter)',
      sub: 'b. 1677 Clermont-Ferrand',
      parents: ['B11'] },
    { id: 'B9',  line: 'B', gen: 9,  year: 1736, t: 366.12, kind: 'person',
      name: 'Gabriel Mangault',
      sub: 'bap. 23 Mar 1736 Saint-Pierre',
      parents: ['B10'] },
    { id: 'B8',  line: 'B', gen: 8,  year: 1773, t: 949.04, kind: 'person',
      name: 'Jean Baptiste Mongeau',
      sub: 'b. 1773 · the Auvergne–Quebec crossing',
      parents: ['B9'], candidateEdge: true },
    { id: 'B7',  line: 'B', gen: 7,  year: 1797, t: 956.10, kind: 'person',
      name: 'Jean Baptiste Mongeau dit Clermont',
      sub: 'b. 1797 · m. Catherine St-André',
      parents: ['B8'] },
    { id: 'B6',  line: 'B', gen: 6,  year: 1829, t: 1501.76, kind: 'person',
      name: 'Édouard Mongeau dit Clermont',
      sub: 'b. 1829 · m. Marie Louise Bombardier',
      parents: ['B7'] },
    { id: 'B5',  line: 'B', gen: 5,  year: 1859, t: 1971.70, kind: 'person',
      name: 'Évariste Mongeau dit Clermont',
      sub: 'm. 1878 Saint-Édouard de Napierville',
      parents: ['B6'], napierville: true },
    { id: 'B4',  line: 'B', gen: 4,  year: 1880, t: 1967.62, kind: 'person',
      name: 'Henri C. Clermont',
      sub: 'b. 1880 Saint-Liboire · crossed south 1897',
      parents: ['B5'], secondaryAnchor: true },
    { id: 'B3',  line: 'B', gen: 3,  year: 1907, t: 2142.00, kind: 'person',
      name: 'Regina Hermanise Clermont',
      sub: 'b. 1907 Williamstown, MA',
      parents: ['B4'] },

    /* ---- Line C, Bétourné (paternal) ---- */
    { id: 'C15', line: 'C', gen: 15, year: 1560, t: 163.44,  kind: 'founder',
      name: 'François Bétourné',
      sub: 'candidate · m. 1585 Saint-Crépin-Ibouvilliers',
      parents: [], candidate: true },
    { id: 'C14', line: 'C', gen: 14, year: 1575, t: 170.68,  kind: 'person',
      name: 'Jehan Bétourné',
      sub: 'about 1570s · Saint-Crépin-Ibouvilliers, Picardy',
      parents: ['C15'], candidateEdge: true },
    { id: 'C13', line: 'C', gen: 13, year: 1604, t: 178.42,  kind: 'person',
      name: 'Charles Bétourné',
      sub: 'bap. 1604 Picardy · d. 1660 Rouen',
      parents: ['C14'] },
    { id: 'C12', line: 'C', gen: 12, year: 1635, t: 622.32, kind: 'person',
      name: 'Adrien Bétourné dit Laviolette',
      sub: 'bap. 1635 Picardy · Carignan-Salières 1665',
      parents: ['C13'] },
    { id: 'C11', line: 'C', gen: 11, year: 1669, t: 678.12, kind: 'person',
      name: 'Pierre Bétourné',
      sub: 'b. 1669 Quebec · m. 1692 Montreal',
      parents: ['C12'] },
    { id: 'C10', line: 'C', gen: 10, year: 1696, t: 829.16, kind: 'person',
      name: 'Louis Bétourné Sr.',
      sub: 'bap. 1696 Montreal · m. 1722 La Prairie',
      parents: ['C11'] },
    { id: 'C9',  line: 'C', gen: 9,  year: 1728, t: 686.40, kind: 'person',
      name: 'Louis Bétourné',
      sub: 'bap. 1728 Longueuil',
      parents: ['C10'], candidateEdge: true },
    { id: 'C8',  line: 'C', gen: 8,  year: 1762, t: 1358.80, kind: 'person',
      name: 'Joseph Marie Bétourné',
      sub: 'b. 1762 La Prairie',
      parents: ['C9'] },
    { id: 'C7',  line: 'C', gen: 7,  year: 1793, t: 1354.56, kind: 'person',
      name: 'Toussaint Bétourné',
      sub: 'b. 1793 La Prairie',
      parents: ['C8'] },
    { id: 'C6',  line: 'C', gen: 6,  year: 1823, t: 1359.56, kind: 'person',
      name: 'Joseph Bétournay',
      sub: 'b. 1823 Saint-Philippe',
      parents: ['C7'] },
    { id: 'C5',  line: 'C', gen: 5,  year: 1854, t: 1953.22, kind: 'person',
      name: 'Modeste "Morris" Bétournay',
      sub: 'b. 1854 Napierville · crossed south 1887',
      parents: ['C6'], napierville: true },
    { id: 'C4',  line: 'C', gen: 4,  year: 1878, t: 2319.76, kind: 'person',
      name: 'Eugène Bétourney',
      sub: 'b. 1878 Saint-Joachim-de-Shefford',
      parents: ['C5'], secondaryAnchor: true },
    { id: 'C3',  line: 'C', gen: 3,  year: 1914, t: 2225.64, kind: 'person',
      name: 'Rita Marie Betourney',
      sub: 'b. 1914 North Adams, MA',
      parents: ['C4'] },

    /* ---- Line D, Heppell / Lepel (paternal) ---- */
    { id: 'D9',  line: 'D', gen: 9, year: 1690, t: 436.94, kind: 'founder',
      name: 'Philipp Jacob Heppell',
      sub: 'before 1707 · Baumholder, Rhineland', parents: [] },
    { id: 'SP-D9', line: 'D', gen: 9, year: 1690, t: 436.94, kind: 'spouse',
      name: 'Margretha',
      sub: 'Baumholder, Rhineland', spouseOf: 'D9' },
    { id: 'D8',  line: 'D', gen: 8, year: 1707, t: 456.40, kind: 'person',
      name: 'Johann Nicolaus Heppell',
      sub: 'christened 22 Jul 1707 Baumholder',
      parents: ['D9'] },
    { id: 'D7',  line: 'D', gen: 7, year: 1750, t: 1000.24, kind: 'person',
      name: 'John Jacob Jean Heppell',
      sub: 'b. 1750 Salem County, NJ · to Rimouski 1790',
      parents: ['D8'] },
    { id: 'D6',  line: 'D', gen: 6, year: 1801, t: 1233.25, kind: 'person',
      name: 'Bazile Heppell',
      sub: 'b. 1801 Rimouski',
      parents: ['D7'] },
    { id: 'D5',  line: 'D', gen: 5, year: 1845, t: 1688.18, kind: 'person',
      name: 'Napoleon Heppell',
      sub: 'b. 1845 Rimouski',
      parents: ['D6'] },
    { id: 'D4',  line: 'D', gen: 4, year: 1877, t: 1989.38, kind: 'person',
      name: 'Hermenegilde Hepel',
      sub: 'b. 1877 Saint-Ulric · crossed to Fall River 1900',
      parents: ['D5'], secondaryAnchor: true },
    { id: 'D3',  line: 'D', gen: 3, year: 1911, t: 2304.90, kind: 'person',
      name: 'Alcide J. Lepel',
      sub: 'b. 1911 Fall River, MA',
      parents: ['D4'] },
    { id: 'D2',  line: 'D', gen: 2, year: 1939, t: 2324.04, kind: 'person',
      name: 'Ronald Joseph Lepel',
      sub: 'b. 1939 Massachusetts · father',
      parents: ['UN-CD'] },


    /* ---- v3 additions: Lauzon Lepage line (E) and Bitournay/Noël ancestors ---- */
    /* Lepage line: Joseph Marie → Michel × Catherine Huard 1805 → Joseph the pit
       sawyer × Josephte Couture 1846 → Joseph the carpenter b. 1847 → Maria 1883 */
    { id: 'E11', line: 'E', gen: 11, year: 1700, t: 1251.64, kind: 'founder',
      name: 'Joseph Marie Lepage',
      sub: 'early 1700s · Lauzon (St-Joseph-de-la-Pointe-Lévy)',
      parents: [] },
    { id: 'SP-E11', line: 'E', gen: 11, year: 1700, t: 1251.64, kind: 'spouse',
      name: 'Marie Goupil',
      sub: 'early 1700s · Lauzon', spouseOf: 'E11' },
    { id: 'E10', line: 'E', gen: 10, year: 1805, t: 1258.16, kind: 'person',
      name: 'Michel Lepage',
      sub: 'm. 28 May 1805 Lauzon',
      parents: ['E11'] },
    { id: 'SP-E10', line: 'E', gen: 10, year: 1805, t: 1258.16, kind: 'spouse',
      name: 'Catherine Huard',
      sub: 'm. 1805 Lauzon', spouseOf: 'E10' },
    { id: 'E-COUTURE', line: 'E', gen: 10, year: 1808, t: 1302.62, kind: 'founder',
      name: 'Joseph Couture & Marie Josèphe Blais',
      sub: 'm. 1808 St-Henri-de-Lauzon · Maria\'s g-g-grandparents (Couture side)',
      parents: [] },
    { id: 'E9', line: 'E', gen: 9, year: 1812, t: 1293.88, kind: 'person',
      name: 'Joseph Lepage Sr.',
      sub: 'scieur de long · Lauzon · m. 17 Feb 1846 (illiterate)',
      parents: ['E10', 'E-COUTURE'] },
    { id: 'SP-E9', line: 'E', gen: 9, year: 1812, t: 1293.88, kind: 'spouse',
      name: 'Josephte Couture',
      sub: 'm. 1846 Lauzon', spouseOf: 'E9' },
    { id: 'E8', line: 'E', gen: 8, year: 1847, t: 1335.62, kind: 'person',
      name: 'Joseph Lepage Jr. (charpentier)',
      sub: 'charpentier · b. 27 Mar 1847 Lauzon',
      parents: ['E9'] },

    /* Noël line (F): Virginia's parents and Virginia herself */
    { id: 'F-NOEL', line: 'E', gen: 9, year: 1830, t: 1562.80, kind: 'founder',
      name: 'Laurent Noël',
      sub: 'St-Michel de Bellechasse · cabotteur',
      parents: [] },
    { id: 'SP-F-NOEL', line: 'E', gen: 9, year: 1830, t: 1562.80, kind: 'spouse',
      name: 'Marguerite Duquet dit Marquette',
      sub: 'St-Michel de Bellechasse', spouseOf: 'F-NOEL' },
    { id: 'F-VIRGINIE', line: 'E', gen: 8, year: 1855, t: 1588.20, kind: 'person',
      name: 'Virginie Noël',
      sub: 'b. 23 Jul 1855 St-Michel de Bellechasse · orphan at 15',
      parents: ['F-NOEL'] },

    /* 1873 marriage: Joseph Lepage Jr × Virginie Noël */
    { id: 'UN-LEPAGE-NOEL', line: 'E', gen: 0, year: 1873, t: 1635.16, kind: 'union',
      name: 'Joseph Lepage ⚭ Virginie Noël',
      sub: '21 Jan 1873 · Notre-Dame-de-la-Victoire, Lévis',
      parents: ['E8', 'F-VIRGINIE'] },

    /* Maria Lepage (1883), Daniel's paternal great-grandmother */
    { id: 'E7-MARIA', line: 'E', gen: 7, year: 1883, t: 2072.78, kind: 'person',
      name: 'Marie Hélène Cléophée Lepage',
      sub: 'b. 19 Sep 1883 Notre-Dame de Lévis · 12 siblings · Maria Lepage in US',
      parents: ['UN-LEPAGE-NOEL'], anchor: true },

    /* Bitournay branch in Redford NY (these are Joseph Jr's parents) */
    { id: 'C-BITSR', line: 'C', gen: 5, year: 1850, t: 2039.16, kind: 'founder',
      name: 'Joseph Bitournay Sr.',
      sub: 'Redford, Clinton County, NY · before 1880',
      parents: [] },
    { id: 'SP-C-BITSR', line: 'C', gen: 5, year: 1850, t: 2039.16, kind: 'spouse',
      name: 'Elmire Rougier',
      sub: 'Redford, NY · before 1880', spouseOf: 'C-BITSR' },
    { id: 'C-BITJR', line: 'C', gen: 4, year: 1880, t: 2159.84, kind: 'person',
      name: 'Joseph Bitournay Jr. (weaver)',
      sub: 'b. 1880 Redford NY · weaver · m. Maria Lepage 1908',
      parents: ['C-BITSR'] },

    /* 1908 marriage at North Adams: Joseph Bitournay Jr × Maria Lepage */
    { id: 'UN-BIT-LEPAGE', line: 'C', gen: 0, year: 1908, t: 2169.40, kind: 'union',
      name: 'Joseph Bitournay ⚭ Maria Lepage',
      sub: '25 Aug 1908 · Notre Dame du Sacré Coeur, North Adams · Rita\'s parents',
      parents: ['C-BITJR', 'E7-MARIA'] },

    /* ---- Narrated Part 1B spouses (small side-nodes) ---- */
    { id: 'SP-NOYON', line: 'A', gen: 10, year: 1671, t: 825.12, kind: 'spouse',
      name: 'Marie Françoise de Noyon',
      sub: 'm. A10 Jean Barbeau · 1686 Boucherville',
      parents: [], spouseOf: 'A10' },
    { id: 'SP-LAVOIE-PICARD', line: 'D', gen: 99, year: 1656, t: 1182.85, kind: 'spouse',
      name: 'Pierre de la Voye dit Le Picard',
      sub: 'Picardy · crossed 1656 · Lavoie founder',
      parents: [], standalone: true },
    { id: 'SP-AGNES', line: 'D', gen: 7, year: 1769, t: 1178.50, kind: 'spouse',
      name: 'Agnès Lavoie',
      sub: 'm. D7 · 1790 Rimouski',
      parents: ['SP-LAVOIE-PICARD'], spouseOf: 'D7' },
    { id: 'SP-BLAIS', line: 'A', gen: 5, year: 1840, t: 1772.10, kind: 'spouse',
      name: 'Marie Blais',
      sub: 'm. A5 · 1865 Napierville',
      parents: [], spouseOf: 'A5' },
    { id: 'SP-BOULERICE', line: 'B', gen: 5, year: 1859, t: 1846.70, kind: 'spouse',
      name: 'Élise Boulerisse',
      sub: 'm. B5 · 1878 Napierville',
      parents: [], spouseOf: 'B5' },
    { id: 'SP-FORGUES', line: 'A', gen: 6, year: 1810, t: 1327.54, kind: 'spouse',
      name: 'Catherine Forgues',
      sub: 'm. A6 · 1828 St-Constant',
      parents: [], spouseOf: 'A6' },

    /* ---- Unions (the trunk, 4 → 2 → 1) ---- */
    { id: 'UN-AB', line: 'TRUNK', gen: 0, year: 1931, t: 2265.76, kind: 'union',
      name: 'Regina ⚭ Ernest',
      sub: '7 Sep 1931 · Williamstown, MA',
      parents: ['B3', 'A3'] },
    { id: 'UN-CD', line: 'TRUNK', gen: 0, year: 1935, t: 2314.08, kind: 'union',
      name: 'Rita ⚭ Alcide',
      sub: '1935 · Fall River, MA',
      parents: ['C3', 'D3'] },
    { id: 'UN-FINAL', line: 'TRUNK', gen: 0, year: 1962, t: 2494.00, kind: 'union',
      name: 'Ronald ⚭ Lorraine',
      sub: 'about 1962 · North Adams · four lines become one',
      parents: ['D2', 'A2'], finalUnion: true },

    /* ---- GEN1: dimmed at opening (t=60), lit at the end (tLight=850/855) ---- */
    { id: 'GEN1-D', line: 'TRUNK', gen: 1, year: 1965, t: 2521.22, tLight: 2588.77,
      kind: 'descendant',
      name: 'Daniel Lepel',
      sub: 'b. 1965 · North Adams, MA',
      parents: ['UN-FINAL'], dimmedUntilLight: true },
    { id: 'GEN1-R', line: 'TRUNK', gen: 1, year: 1968, t: 2522.58, tLight: 2599.04,
      kind: 'descendant',
      name: 'Renée Lepel Hanson',
      sub: 'b. 1968 · North Adams, MA',
      parents: ['UN-FINAL'], dimmedUntilLight: true }
  ];

  /* =====================================================================
     WORLDS — dated annotations along the time ruler (canonical Part 2)
     Once revealed, they stay. The finished frame shows them all.
     ===================================================================== */
  var WORLDS = [
    /* === France: religious upheaval before the family crossings === */
    { id: 'W1562',         year: 1580, t: 120.00,
      label: 'French Wars of Religion · 1562-1598', pairWith: null,
      band: { from: 1562, to: 1598 } },
    { id: 'W1598',         year: 1598, t: 119.66,
      label: 'Edict of Nantes signed · Henri IV grants religious peace',
      pairWith: null },
    { id: 'W1608',         year: 1608, t: 212.22,
      label: 'Quebec City founded by Champlain', pairWith: null },
    { id: 'W1610',         year: 1610, t: 219.72,
      label: 'Henri IV assassinated · Louis XIII reign begins',
      pairWith: null },

    /* === Thirty Years' War: devastates the Rhineland (Heppell ancestral home) === */
    { id: 'W1618',         year: 1633, t: 388.96,
      label: 'Thirty Years\' War · 1618-1648 · devastates the Rhineland',
      pairWith: 'D9', band: { from: 1618, to: 1648 } },
    { id: 'W1642',         year: 1642, t: 496.57,
      label: 'Montreal founded', pairWith: null },
    { id: 'W1648',         year: 1648, t: 413.86,
      label: 'Peace of Westphalia ends the Thirty Years\' War',
      pairWith: null },
    { id: 'W1661',         year: 1661, t: 576.16,
      label: 'Louis XIV begins personal reign', pairWith: null },

    /* === The crossings: Carignan-Salières and the troupes de la marine === */
    { id: 'W1665',         year: 1665, t: 602.98,
      label: 'Carignan-Salières arrives · 1,200 soldiers',
      pairWith: 'C12' },
    { id: 'W1666',         year: 1666, t: 642.34,
      label: 'Mohawk campaigns', pairWith: null },
    { id: 'W1668',         year: 1668, t: 650.66,
      label: 'Regiment disbanded · ~400 stay', pairWith: null },
    { id: 'W1672',         year: 1675, t: 682.13,
      label: 'Franco-Dutch War · 1672-1678', pairWith: null,
      band: { from: 1672, to: 1678 } },
    { id: 'W1685-edit',    year: 1685, t: 753.70,
      label: 'Revocation of the Edict of Nantes · Protestantism outlawed',
      pairWith: 'A10' },
    { id: 'W1685-denon',   year: 1685, t: 741.82,
      label: 'Denonville · troupes de la marine', pairWith: 'A10' },

    /* === Late 17th to mid-18th century: Quebec consolidates, France wars === */
    { id: 'W1701',         year: 1701, t: 887.40,
      label: 'Great Peace of Montreal with First Nations',
      pairWith: null },
    { id: 'W1701s',        year: 1707, t: 901.04,
      label: 'War of Spanish Succession · Queen Anne\'s War · 1701-1714',
      pairWith: null, band: { from: 1701, to: 1714 } },
    { id: 'W1709',         year: 1709, t: 913.80,
      label: 'Le Grand Hiver · the Great Famine devastates France',
      pairWith: null },
    { id: 'W1713',         year: 1713, t: 924.12,
      label: 'Treaty of Utrecht · Britain gains Acadia and Newfoundland',
      pairWith: null },
    { id: 'W1740',         year: 1744, t: 970.70,
      label: 'War of Austrian Succession · King George\'s War · 1740-1748',
      pairWith: null, band: { from: 1740, to: 1748 } },

    /* === The Conquest: French and Indian War, fall of New France === */
    { id: 'W1755',         year: 1755, t: 1041.22,
      label: 'Acadian Expulsion · Le Grand Dérangement',
      pairWith: null },
    { id: 'W1756',         year: 1759, t: 1055.02,
      label: 'Seven Years\' War · French and Indian War · 1756-1763',
      pairWith: null, band: { from: 1756, to: 1763 } },
    { id: 'W1759',         year: 1759, t: 1070.92,
      label: 'Battle of the Plains of Abraham · Quebec falls',
      pairWith: null },
    { id: 'W1763',         year: 1763, t: 1086.78,
      label: 'Treaty of Paris · New France ceded to Britain',
      pairWith: 'A7' },
    { id: 'W1774',         year: 1774, t: 1126.40,
      label: 'Quebec Act preserves French civil law and Catholic religion',
      pairWith: null },

    /* === Revolutions and the long 19th century === */
    { id: 'W1775',         year: 1779, t: 1146.06,
      label: 'American Revolution · 1775-1783', pairWith: null,
      band: { from: 1775, to: 1783 } },
    { id: 'W1789',         year: 1794, t: 1365.04,
      label: 'French Revolution · 1789-1799', pairWith: null,
      band: { from: 1789, to: 1799 } },
    { id: 'W1803',         year: 1809, t: 1383.70,
      label: 'Napoleonic Wars · 1803-1815', pairWith: null,
      band: { from: 1803, to: 1815 } },
    { id: 'W1837',         year: 1838, t: 1470.52,
      label: 'Lower Canada Rebellion · 1837-1838', pairWith: null },
    { id: 'W1840-1930',    year: 1885, t: 1932.68,
      label: 'French-Canadian mill migration · 1840-1930 · ~900,000',
      pairWith: null, band: { from: 1840, to: 1930 } },

    /* === Confederation, the Franco-Prussian War, the modern era === */
    { id: 'W1867',         year: 1867, t: 1890.70,
      label: 'Canadian Confederation', pairWith: null },
    { id: 'W1870',         year: 1871, t: 1906.24,
      label: 'Franco-Prussian War · German Empire founded · 1870-1871',
      pairWith: null, band: { from: 1870, to: 1871 } },
    { id: 'W1914',         year: 1916, t: 2230.94,
      label: 'World War I · 1914-1918', pairWith: null,
      band: { from: 1914, to: 1918 } },
    { id: 'W1929',         year: 1932, t: 2265.44,
      label: 'Great Depression · 1929-1939', pairWith: null,
      band: { from: 1929, to: 1939 } },
    { id: 'W1939',         year: 1942, t: 2332.06,
      label: 'World War II · 1939-1945', pairWith: null,
      band: { from: 1939, to: 1945 } },
    { id: 'W2025',         year: 2025, t: 2579.42,
      label: 'Bill C-3 takes effect · 15 December 2025',
      pairWith: 'A4' }
  ];

  /* =====================================================================
     MIGRATIONS — map ARROWs. Each opens a map-inset surface window of
     [t, t + tHold]. The inset slides in, holds, slides out.
     ===================================================================== */
  var MIGRATIONS = [
    { id: 'M-adrien',   t: 309,  tHold: 28,
      label: '1665 · Adrien Bétourné · Picardy → Quebec',
      line: 'C', from: [49.42, 1.94],  to: [46.81, -71.21] },
    { id: 'M-jean',     t: 422,  tHold: 28,
      label: '1685 · Jean Barbeau · Pons → Quebec',
      line: 'A', from: [45.58, -0.55], to: [45.59, -73.45] },
    { id: 'M-mongeau',  t: 523,  tHold: 24,
      label: 'After 1736 · Mongeau · Auvergne → Quebec',
      line: 'B', from: [45.78, 3.08],  to: [45.59, -73.45],
      candidate: true },
    { id: 'M-heppell',  t: 546,  tHold: 28,
      label: 'Heppell · Rhineland → New Jersey',
      line: 'D', from: [49.61, 7.34],  to: [39.57, -75.46] },
    { id: 'M-johnjacob', t: 635, tHold: 34,
      label: '1790 · John Jacob Heppell · New Jersey → Rimouski',
      line: 'D', from: [39.57, -75.46], to: [48.45, -68.52] },
    { id: 'M-modeste',  t: 855,  tHold: 28,
      label: '1887 · Modeste Bétournay · Quebec → Massachusetts',
      line: 'C', from: [45.32, -73.41], to: [42.70, -73.11] },
    { id: 'M-henri',    t: 869,  tHold: 28,
      label: '1897 · Henri Clermont · Quebec → Berkshires',
      line: 'B', from: [45.65, -72.78], to: [42.72, -73.20] },
    { id: 'M-hermenegilde', t: 884, tHold: 28,
      label: '1900 · Hermenegilde Hepel · Quebec → Fall River',
      line: 'D', from: [48.78, -67.72], to: [41.70, -71.16] },
    { id: 'M-daniel',   t: 1016,  tHold: 20,
      label: 'Daniel · North Adams → Albany, NY',
      line: 'TRUNK', from: [42.70, -73.11], to: [42.65, -73.76] },

    /* Single-point location pins (no migration arrow) — surface the map as
       each ancestral origin is named in the opening of Act One. */
    { id: 'L-picardy',     t: 124, tHold: 20, line: 'C', isLocation: true,
      label: 'Picardy · Saint-Crépin-Ibouvilliers',
      from: [49.42, 1.94], to: null },
    { id: 'L-rouen',       t: 145, tHold: 16, line: 'C', isLocation: true,
      label: 'Rouen · 1660',
      from: [49.44, 1.10], to: null },
    { id: 'L-auvergne',    t: 164, tHold: 20, line: 'B', isLocation: true,
      label: 'Auvergne · Clermont-Ferrand',
      from: [45.78, 3.08], to: null },
    { id: 'L-rhineland',   t: 214, tHold: 20, line: 'D', isLocation: true,
      label: 'Rhineland · Baumholder',
      from: [49.61, 7.34], to: null },
    { id: 'L-saintonge',   t: 246, tHold: 20, line: 'A', isLocation: true,
      label: 'Saintonge · Pons',
      from: [45.58, -0.55], to: null }
  ];

  /* =====================================================================
     BEATS — the 40-beat cue sheet. Used for caption display and as the
     camera-walk anchor list. Re-lock .t to the final audio later.
     ===================================================================== */
  var BEATS = [
    /* Opening */
    { t: 0.00,    narration: 'Every living person is the survivor of an unbroken line.', focus: null },
    { t: 32.18,   narration: 'Now and then, a few of those branches can still be followed.', focus: null },
    { t: 54.52,   narration: 'Four lines of descent, across four countries and more than four centuries.', focus: 'RULER' },
    { t: 65.56,   narration: 'It begins in 1604, in a village in the north of France.', focus: 'RULER' },
    { t: 93.16,   narration: 'And then, four separate families become one.', focus: 'GEN1-D' },

    /* Act One — European Origins, 1604 to 1685 */
    { t: 168.60,   narration: 'Jehan Bétourné carried his newborn son to the parish church to be baptised.', focus: 'C14' },
    { t: 175.88,   narration: 'The child was named Charles Bétourné.',                                       focus: 'C13' },
    { t: 439.66,   narration: 'Married Marguerite. Died at Rouen in 1660.',                                  focus: 'C13' },
    { t: 308.56,  narration: 'In Clermont-Ferrand, a Catholic family named Mangot worshipped at Saint-Pierre.', focus: 'B12' },
    { t: 314.94,  narration: 'The deepest of them is Mathieu Mangot.',                                      focus: 'B12' },
    { t: 326.90,  narration: 'They were carpenters. The family stayed for four documented generations.',    focus: 'B11' },
    { t: 363.54,  narration: 'Gabriel Mangault baptised 23 March 1736, at five o’clock in the morning.', focus: 'B9' },
    { t: 430.54,  narration: 'In the Rhineland, the Heppells lived as German Lutherans near Baumholder.',   focus: 'D9' },
    { t: 436.20,  narration: 'Philipp Jacob Heppell and Margretha raised their children there.',            focus: 'D9' },
    { t: 456.40,  narration: 'Their son Johann Nicolaus Heppell was baptised 22 July 1707.',                focus: 'D8' },
    { t: 494.32,  narration: 'In Saintonge, Pierre Barbeau and Madeleine Babin were raising a family.',    focus: 'A11' },
    { t: 509.56,  narration: 'In 1666 they had a son named Jean.',                                          focus: 'A10' },
    { t: 525.30,  narration: 'These four European families would all eventually send descendants to one mill town.', focus: null },

    /* Act Two — The Crossings, 1665 to 1763 */
    { t: 601.88,  narration: 'The Carignan-Salières Regiment disembarked at Quebec City.',                  focus: 'W1665' },
    { t: 619.90,  narration: 'Among the soldiers was Adrien Bétourné.',                                     focus: 'C12' },
    { t: 646.04,  narration: 'Campaigns against the Mohawk. Disbanded 1668. Married Marie Deshaies 1669.', focus: 'C12' },
    { t: 730.36,  narration: 'Twenty years later, a second soldier crossed.',                               focus: 'RULER' },
    { t: 752.92,  narration: 'Louis XIV revoked the Edict of Nantes.',                                      focus: 'W1685-edit' },
    { t: 744.72,  narration: 'Troupes de la marine sailed with the marquis de Denonville.',                 focus: 'W1685-denon' },
    { t: 780.34,  narration: 'He was Jean Barbeau, the merchant’s son. Nickname: Boisdoré.',           focus: 'A10' },
    { t: 823.92,  narration: 'Married Marie Françoise de Noyon, 18 November 1686, Boucherville.',           focus: 'A10' },
    { t: 851.48,  narration: 'Through their son Gabriel, baptised 1694; Gabriel’s son Jean-Baptiste, 1725.', focus: 'A9' },
    { t: 1027.68,  narration: 'Pierre de la Voye dit Le Picard had crossed in 1656.',                        focus: 'SP-LAVOIE-PICARD' },
    { t: 935.62,  narration: 'In Auvergne, the Mangot carpenters became Mongeau dit Clermont.',             focus: 'B8' },
    { t: 999.42,  narration: 'The Heppells crossed. John Jacob Jean Heppell born 1750, New Jersey.',       focus: 'D7' },
    { t: 1015.18,  narration: 'Joseph Barbeau dit Boisdoré baptised at Saint-Constant in 1757.',             focus: 'A7' },
    { t: 1080.48,  narration: 'Six years old when the Treaty of Paris handed New France to Britain.',        focus: 'W1763' },

    /* Act Three — Revolution and Migration, 1763 to 1865 */
    { t: 1143.72,  narration: 'In 1775 the American Revolution broke out.',                                  focus: 'W1775' },
    { t: 1024.82,  narration: 'John Jacob Heppell married Agnès Lavoie 1790, Rimouski.',                    focus: 'SP-AGNES' },
    { t: 1224.62,  narration: 'The surname slid from Heppell to Epelle to Hepel.',                           focus: 'D7' },
    { t: 1427.40,  narration: 'François Régis Barbeau born at Saint-Constant in 1804. M. Catherine Forgues 1828.', focus: 'A6' },
    { t: 1488.00,  narration: 'By the early 1800s the old nicknames were fading.',                           focus: 'A7' },

    /* Act Four — Napierville Convergence, 1865 to 1900 */
    { t: 1792.72,  narration: 'At Saint-Édouard de Napierville, three lines were converging.',               focus: 'C5' },
    { t: 1769.58,  narration: 'Magloire Barbeau married Marie Blais, 1865.',                                 focus: 'A5' },
    { t: 1788.52,  narration: 'Joseph Wilfred Barbeau baptised 1870. The documentary anchor for Bill C-3.',  focus: 'A4' },
    { t: 1841.14,  narration: 'Évariste Mongeau dit Clermont married Élise Boulerisse, 1878.',               focus: 'B5' },
    { t: 1929.14,  narration: 'The mills called. Roughly 900,000 French-Canadians left Quebec.',             focus: 'W1840-1930' },

    /* Act Five — Convergence in the Berkshires, 1900 to 2026 */
    { t: 2104.34,  narration: 'All four lines were converging on the Berkshire Hills.',                      focus: null },
    { t: 2267.22,  narration: 'Ernest Barbeau and Regina Clermont married 1931.',                            focus: 'UN-AB' },
    { t: 2216.22,  narration: 'Rita Betourney born 1914. Alcide Lepel born 1911. They married.',             focus: 'UN-CD' },
    { t: 2494.00,  narration: 'Ronald Joseph Lepel married Lorraine Irene Barbeau. The four lines became one.', focus: 'UN-FINAL' },
    { t: 2521.22,  narration: 'Daniel and Renee grew up in North Adams. Daniel moved to Albany.',            focus: 'GEN1-D' },

    /* Closing */
    { t: 2580.30,  narration: 'Bill C-3 took effect, 15 December 2025.',                                     focus: 'W2025' },
    { t: 2603.40,  narration: 'The research reached back four hundred and twenty-two years.',                focus: 'OVERVIEW' },
    { t: 2634.80,  narration: 'Traced the Barbeau line back to a merchant’s house in Pons.',            focus: 'A11', highlight: 'A' },
    { t: 2776.18,  narration: 'This is who they came from. This is how they got here.',                      focus: 'OVERVIEW' }
  ];

  /* =====================================================================
     CONFIG — surfaces the time-axis range so the engine and ruler share
     identical year-to-x math. World annotations and the ruler align.
     ===================================================================== */
  var TIME = { yearMin: 1600, yearMax: 2030 };

  window.LINEAGE_DATA = {
    LINES: LINES,
    PEOPLE: PEOPLE,
    WORLDS: WORLDS,
    MIGRATIONS: MIGRATIONS,
    BEATS: BEATS,
    TIME: TIME
  };
})();
