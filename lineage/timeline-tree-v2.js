/* =====================================================================
   Lineage V2 — TREE ENGINE  (rebuilt against the canonical files)
   --------------------------------------------------------------------
   Renders the four-line family tree, the horizontal time ruler, the
   world-event annotation layer, and the map-inset surface state.

   Design contract (do NOT break):
     render(t) is IDEMPOTENT. Every visual property — a node's opacity
     and scale, an edge's stroke-dashoffset, the camera transform, a
     world annotation's reveal, the map inset's surface state — is a
     pure function of audio.currentTime. Nothing accumulates. Scrub
     backward and the tree rewinds and redraws exactly.

   Public interface (window.LINEAGE_TREE):
     build(hostEl, opts)         create the SVG inside hostEl
     render(t)                   reconcile all visual state to time t
     activeId(t)                 id of the currently-narrated node
     currentBeat(t)              the BEAT entry covering time t
     mapInsetState(t)            { visible, migration }
     CANVAS                      { w, h } of the tree coordinate space

   Source data: window.LINEAGE_DATA (timeline-data-v2.js).
   ===================================================================== */
(function () {
  'use strict';

  if (!window.LINEAGE_DATA) {
    console.error('LINEAGE_TREE: window.LINEAGE_DATA is missing — load timeline-data-v2.js first.');
    return;
  }

  var SVG_NS  = 'http://www.w3.org/2000/svg';
  var DATA    = window.LINEAGE_DATA;
  var PEOPLE  = DATA.PEOPLE;
  var WORLDS  = DATA.WORLDS;
  var MIGRATIONS = DATA.MIGRATIONS;
  var BEATS   = DATA.BEATS;
  var LINES   = DATA.LINES;
  var TIME    = DATA.TIME;

  /* =====================================================================
     1. CONFIG  — every magic number lives here
     ===================================================================== */
  var CANVAS = { w: 3480, h: 2330 };

  var LAYOUT = {
    /* year -> y mapping for the year-driven (ancestral) zone */
    yearTop: 1600, yearBot: 1980,
    yTop:     80,  yBot:    1180,

    /* horizontal column x positions (merging pairs are adjacent) */
    colX: { E: 200, C: 900, D: 1600, B: 2300, A: 3000 },

    /* fixed rows for the trunk zone */
    rowUnion: 1240, rowChild: 1320, rowFinal: 1380, rowDesc: 1440,
    rowSpouseOffsetX: 272,   /* spouse offset (equal-size cards) */
    rowSpouseOffsetY: 0,    /* and this far below */

    /* node geometry */
    nodeW: 252, nodeH: 60,
    spouseW: 252, spouseH: 60,
    unionR: 32,

    /* line header above each column's earliest node */
    headerDY: 92,

    /* relax: minimum vertical gap between two nodes in the same column */
    minGap: 86,

    /* time ruler zone (anchored, no camera transform) */
    rulerXPad: 50,                /* left/right padding from canvas edge */
    rulerY:    2260,               /* main rule line */
    rulerTickH:    8,
    rulerMajorTickH: 14,
    rulerTickEvery: 25,
    rulerMajorEvery: 100,
    worldLabelY: 2225,             /* baseline of nearest world annotation labels */
    worldLabelStep: 23             /* vertical stacking step — generous */
  };

  var MOTION = {
    appearDur: 0.48,    /* s — node fade + scale in */
    drawDur:   0.95,    /* s — edge draws via stroke-dashoffset */
    pulseDur:  1.20,    /* s — soft arrival pulse, slightly longer for visibility */
    worldDur:  0.85,    /* s — world annotation reveal (longer for ribbon entry) */
    rulerStart: 45,     /* s — ruler begins drawing */
    rulerDur:   12,     /* s — ruler draws over this many seconds */

    /* camera */
    zoomBody:   1.70,   /* scale during the body of the piece — tighter for readability with wider canvas */
    zoomEnd:    1.00,   /* scale at the held closing frame */
    endStart:   2810.4,   /* s — closing pull-back begins (47:32 audio) */
    endDone:    2844.1,   /* s — whole tree framed; held from here */

    /* camera drift between beats — slow, idempotent, breathes the canvas */
    driftAmpX:  0,     /* px — horizontal sway amplitude */
    driftAmpY:  0,      /* px — vertical sway amplitude */
    driftPerX:  17.0,   /* s — horizontal cycle period */
    driftPerY:  11.0,   /* s — vertical cycle period (intentionally coprime) */

    /* GEN1: dimmed at opening, lit at the end */
    gen1DimOpacity: 0.22,

    /* map-inset surface window: hold until tStart + tHold, then slide out */
    mapSlideDur: 1.2,

    /* world-event SPROUT: each event blooms big on the left vertical axis at
       its year's height, holds readably, then glides down + shrinks to land on
       its dot on the bottom ruler. All pure functions of t (scrub-safe). */
    heroIn:        0.55,
    heroHold:      2.40,
    heroSettle:    1.55,
    heroRestScale: 0.221,
    heroX:         96
  };

  /* =====================================================================
     2. INDEXES + EDGE DERIVATION
     ===================================================================== */
  var BY_ID = {};
  for (var i = 0; i < PEOPLE.length; i++) BY_ID[PEOPLE[i].id] = PEOPLE[i];

  function lineColor(lineId) {
    if (lineId === 'TRUNK') return 'var(--c-gold)';
    for (var i = 0; i < LINES.length; i++) {
      if (LINES[i].id === lineId) return LINES[i].color;
    }
    return 'var(--c-gold)';
  }

  function lineLabel(lineId) {
    for (var i = 0; i < LINES.length; i++) {
      if (LINES[i].id === lineId) return LINES[i].label;
    }
    return '';
  }

  /* one edge per (parent -> node) link; child.t drives draw time */
  var EDGES = [];
  for (var pi = 0; pi < PEOPLE.length; pi++) {
    var p = PEOPLE[pi];
    var parents = p.parents || [];
    for (var pj = 0; pj < parents.length; pj++) {
      var parentId = parents[pj];
      var parent = BY_ID[parentId];
      if (!parent) continue;
      var col = (p.kind === 'union') ? lineColor(parent.line) : lineColor(p.line);
      EDGES.push({
        id: parentId + '~' + p.id,
        from: parentId,
        to: p.id,
        t: p.t,
        color: col,
        candidate: !!p.candidateEdge,
        /* tag union legs so the renderer can find them as a pair */
        unionLeg: (p.kind === 'union')
      });
    }
  }

  /* intro order = chronological by t (for camera walk) */
  var INTRO = PEOPLE.slice().sort(function (a, b) { return a.t - b.t; });

  /* WORLD annotations sorted by year for ruler-stacking pass */
  var WORLDS_SORTED = WORLDS.slice().sort(function (a, b) { return a.year - b.year; });

  /* =====================================================================
     3. MATH + EASING
     ===================================================================== */
  function clamp01(u) { return u < 0 ? 0 : (u > 1 ? 1 : u); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }
  function easeOutQuart(u) { return 1 - Math.pow(1 - u, 4); }
  function easeOutExpo(u)  { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); }
  function easeInOut(u)   { return u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2; }
  /* Smooth sine — used for continuous camera drift between beats */
  function softSin(t, period) { return Math.sin(2 * Math.PI * t / period); }

  function yearToY(year) {
    var k = clamp01((year - LAYOUT.yearTop) / (LAYOUT.yearBot - LAYOUT.yearTop));
    return LAYOUT.yTop + k * (LAYOUT.yBot - LAYOUT.yTop);
  }
  function yearToX(year) {
    var k = clamp01((year - TIME.yearMin) / (TIME.yearMax - TIME.yearMin));
    return LAYOUT.rulerXPad + k * (CANVAS.w - 2 * LAYOUT.rulerXPad);
  }

  /* =====================================================================
     4. LAYOUT — pure, runs once at boot (and on resize)
     ===================================================================== */
  function layoutTree() {
    /* ---- assign provisional x/y by kind ---- */
    for (var i = 0; i < PEOPLE.length; i++) {
      var p = PEOPLE[i];
      if (p.kind === 'union') {
        if (p.id === 'UN-AB' || p.id === 'UN-CD') p.y = LAYOUT.rowUnion;
        else if (p.id === 'UN-FINAL')             p.y = LAYOUT.rowFinal;
      } else if (p.id === 'GEN1-D' || p.id === 'GEN1-R' ||
                 p.id === 'GEN1-JP' || p.id === 'GEN1-CH') {
        p.y = LAYOUT.rowDesc;
      } else if (p.id === 'D2-PAUL' || p.id === 'D2-ROGER') {
        /* Ronald's brothers share the rowChild line; placed left of D2.
           Roger sits furthest left, Paul between Roger and Ronald. */
        p.y = LAYOUT.rowChild;
        p.x = (p.id === 'D2-ROGER') ? 820 : 1100;
      } else if (p.id === 'D2' || p.id === 'A2') {
        /* children of the first two unions */
        p.y = LAYOUT.rowChild;
        p.x = LAYOUT.colX[(p.id === 'D2') ? 'D' : 'A'];
      } else if (p.kind === 'spouse') {
        if (p.spouseOf && BY_ID[p.spouseOf]) {
          var owner = BY_ID[p.spouseOf];
          /* x and y set after the owner is placed; defer */
        } else if (p.standalone) {
          /* SP-LAVOIE-PICARD sits floating between D7 and the D column,
             slightly above D7's row */
          p.x = LAYOUT.colX.D + LAYOUT.rowSpouseOffsetX;
          p.y = yearToY(p.year);
        }
      } else {
        p.x = LAYOUT.colX[p.line];
        p.y = yearToY(p.year);
      }
    }

    /* ---- relax: minimum vertical gap within each line column ----
       MUST run BEFORE spouse placement so spouses follow their owner
       to the relaxed y position. Previously this ran AFTER spouses, which
       left spouses stuck at the owner's PRE-relax y (e.g. Marguerite
       Bétourné appearing at François's row instead of Charles's row). */
    for (var li = 0; li < LINES.length; li++) {
      var col = PEOPLE
        .filter(function (q) { return q.line === LINES[li].id && q.kind !== 'spouse'; })
        .sort(function (a, b) { return a.year - b.year; });
      for (var ci = 1; ci < col.length; ci++) {
        if (col[ci].y - col[ci - 1].y < LAYOUT.minGap) {
          col[ci].y = col[ci - 1].y + LAYOUT.minGap;
        }
      }
    }

    /* ---- spouses: place beside their owner (after relax). Supports
       a second spouse (e.g. Victoire Bouillon, John Jacob's 2nd wife):
       first spouse sits on the RIGHT, second sits on the LEFT. */
    for (var si = 0; si < PEOPLE.length; si++) {
      var sp = PEOPLE[si];
      if (sp.kind !== 'spouse' || !sp.spouseOf) continue;
      var ow = BY_ID[sp.spouseOf];
      if (!ow) continue;
      /* Spouses ALWAYS sit to the RIGHT of their person; a second spouse
         stacks one card-height BELOW the first (never thrown left). */
      sp.x = ow.x + LAYOUT.rowSpouseOffsetX;
      sp.y = ow.y + (sp.secondSpouse ? (LAYOUT.nodeH + 22) : (LAYOUT.rowSpouseOffsetY * 0.25));
    }

    /* ---- trunk x: midpoints (parent-first) ---- */
    function midX(a, b) {
      var pa = BY_ID[a], pb = BY_ID[b];
      return (pa.x + pb.x) / 2;
    }
    BY_ID['UN-AB'].x = midX('B3', 'A3');
    BY_ID['UN-CD'].x = midX('C3', 'D3');
    /* D2 and A2 stay on their lineage column x (already set above);
       UN-FINAL is the midpoint of D2 and A2 */
    BY_ID['UN-FINAL'].x = midX('D2', 'A2');
    BY_ID['GEN1-D'].x = BY_ID['UN-FINAL'].x - 116;
    BY_ID['GEN1-R'].x = BY_ID['UN-FINAL'].x + 116;
    /* Cousin descendants (Paul & Judy's children) — sit at rowDesc, offset
       from the Paul ⚭ Judy union midpoint. */
    if (BY_ID['UN-PAUL-JUDY'] && BY_ID['GEN1-JP'] && BY_ID['GEN1-CH']) {
      /* UN-PAUL-JUDY.x will be set by the generic union pass below using
         midpoint of D2-PAUL and SP-D2-PAUL, but those may not be placed
         in time. Force it explicitly here based on D2-PAUL position. */
      var paul = BY_ID['D2-PAUL'];
      var judy = BY_ID['SP-D2-PAUL'];
      if (paul && judy && typeof paul.x === 'number' && typeof judy.x === 'number') {
        BY_ID['UN-PAUL-JUDY'].x = (paul.x + judy.x) / 2;
        BY_ID['UN-PAUL-JUDY'].y = LAYOUT.rowFinal;
        BY_ID['GEN1-JP'].x = BY_ID['UN-PAUL-JUDY'].x - 116;
        BY_ID['GEN1-CH'].x = BY_ID['UN-PAUL-JUDY'].x + 116;
      }
    }

    /* Generic union positioning: any union not handled above gets x/y from
       its parents' midpoint (used for UN-LEPAGE-NOEL, UN-BIT-LEPAGE, and any
       future merge nodes). */
    for (var ui = 0; ui < PEOPLE.length; ui++) {
      var up = PEOPLE[ui];
      if (up.kind !== 'union') continue;
      if (typeof up.x === 'number' && !isNaN(up.x) &&
          typeof up.y === 'number' && !isNaN(up.y)) continue;
      if (up.parents && up.parents.length >= 2) {
        var upa = BY_ID[up.parents[0]], upb = BY_ID[up.parents[1]];
        if (upa && upb &&
            typeof upa.x === 'number' && typeof upb.x === 'number' &&
            typeof upa.y === 'number' && typeof upb.y === 'number') {
          up.x = (upa.x + upb.x) / 2;
          up.y = Math.max(upa.y, upb.y) + 60;
        }
      }
    }

    /* ---- edge geometry: vertical-biased cubic Bézier ---- */
    for (var ei = 0; ei < EDGES.length; ei++) {
      var e = EDGES[ei];
      var a = BY_ID[e.from], b = BY_ID[e.to];
      if (!a || !b) continue;
      var dy = b.y - a.y;
      var c = Math.max(40, Math.abs(dy) * 0.42);
      e.d = 'M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
            ' C ' + a.x.toFixed(1) + ' ' + (a.y + c).toFixed(1) +
            ' ' + b.x.toFixed(1) + ' ' + (b.y - c).toFixed(1) +
            ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
      e.len = Math.hypot(b.x - a.x, dy) + c * 0.5;  /* fallback length */
    }

    /* ---- line headers ---- */
    for (var hi = 0; hi < LINES.length; hi++) {
      var ln = LINES[hi];
      var col2 = PEOPLE.filter(function (q) { return q.line === ln.id && q.kind !== 'spouse'; });
      var firstByYear = col2.slice().sort(function (a, b) { return a.year - b.year; })[0];
      var firstByT    = col2.slice().sort(function (a, b) { return a.t - b.t; })[0];
      ln.x = LAYOUT.colX[ln.id];
      ln.y = LAYOUT.yTop - LAYOUT.headerDY;
      ln.firstT = firstByT ? firstByT.t : 0;
    }

    /* ---- world annotation x (year-driven) and vertical stacking ---- */
    var occupied = [];   /* per-row occupancy bins for collision relax */
    for (var wi = 0; wi < WORLDS_SORTED.length; wi++) {
      var w = WORLDS_SORTED[wi];
      w.x = yearToX(w.year);
      /* stack: if any prior annotation is within ~120 SVG units of this x,
         bump up one row */
      var row = 0;
      for (var ri = 0; ri < occupied.length; ri++) {
        var clashes = false;
        for (var rj = 0; rj < occupied[ri].length; rj++) {
          if (Math.abs(occupied[ri][rj] - w.x) < 220) { clashes = true; break; }
        }
        if (!clashes) { row = ri; break; }
        row = ri + 1;
      }
      if (!occupied[row]) occupied[row] = [];
      occupied[row].push(w.x);
      w._row = row;
      w._labelY = LAYOUT.worldLabelY - row * LAYOUT.worldLabelStep;
    }

    /* world-event HERO lane assignment (sprout layer): keep simultaneous
       heroes in separate vertical lanes. Deterministic = scrub-safe. */
    var heroSpan = MOTION.heroIn + MOTION.heroHold + MOTION.heroSettle;
    var placedHeroes = [];
    var heroByT = WORLDS_SORTED.slice().sort(function (a, b) { return a.t - b.t; });
    var laneOffsets = [0, 300, -300, 600, -600, 900, -900];
    for (var hwi = 0; hwi < heroByT.length; hwi++) {
      var hw = heroByT[hwi];
      var base = yearToY(hw.year);
      if (base < 250) base = 250; if (base > 1010) base = 1010;
      var ht0 = hw.t, ht1 = hw.t + heroSpan, chosen = base;
      for (var oi = 0; oi < laneOffsets.length; oi++) {
        var cy = base + laneOffsets[oi];
        if (cy < 210 || cy > 1060) continue;
        var clash = false;
        for (var pj = 0; pj < placedHeroes.length; pj++) {
          var ph = placedHeroes[pj];
          if (ht0 < ph.t1 && ph.t0 < ht1 && Math.abs(cy - ph.y) < 280) { clash = true; break; }
        }
        if (!clash) { chosen = cy; break; }
      }
      hw._heroY = chosen;
      placedHeroes.push({ y: chosen, t0: ht0, t1: ht1 });
    }
  }

  /* =====================================================================
     5. BUILD — create the SVG once. Cache element refs on the data.
     ===================================================================== */
  var svg = null, gCamera = null, gRuler = null, built = false;
  var reducedMotion = false, mapHost = null;

  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
    return node;
  }

  function tspanAt(text, x, y) {
    var ts = el('tspan', { x: x, y: y });
    ts.textContent = text;
    return ts;
  }

  function wrapLabel(str, maxChars) {
    if (str.length <= maxChars) return [str];
    var words = str.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (test.length > maxChars && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length <= 2) return lines;
    return [lines[0], lines.slice(1).join(' ')];
  }

  function buildDefs() {
    var defs = el('defs');

    /* soft drop shadow on cards */
    var sh = el('filter', { id: 't-shadow', x: '-40%', y: '-40%',
      width: '180%', height: '180%' });
    sh.appendChild(el('feDropShadow', { dx: '0', dy: '3',
      stdDeviation: '5', 'flood-color': '#000', 'flood-opacity': '0.55' }));
    defs.appendChild(sh);

    /* edge fade gradient: stronger near child, fades upward */
    var lg = el('linearGradient', { id: 't-edge-fade',
      x1: '0', y1: '0', x2: '0', y2: '1' });
    lg.appendChild(el('stop', { offset: '0',   'stop-color': 'currentColor', 'stop-opacity': '0.30' }));
    lg.appendChild(el('stop', { offset: '0.8', 'stop-color': 'currentColor', 'stop-opacity': '0.70' }));
    lg.appendChild(el('stop', { offset: '1',   'stop-color': 'currentColor', 'stop-opacity': '0.85' }));
    defs.appendChild(lg);

    return defs;
  }

  function buildFrame() {
    /* a thin double-rule cartouche around the tree zone */
    var g = el('g', { 'class': 'tree-frame' });
    var m = 24, top = m, bot = LAYOUT.yBot + 330;  /* leave room under trunk + deepest leaves */
    g.appendChild(el('rect', { x: m, y: top,
      width: CANVAS.w - 2*m, height: bot - top,
      fill: 'none', 'class': 'tree-frame-outer' }));
    g.appendChild(el('rect', { x: m + 9, y: top + 9,
      width: CANVAS.w - 2*m - 18, height: bot - top - 18,
      fill: 'none', 'class': 'tree-frame-inner' }));
    /* corner flourishes */
    var cs = [
      [m + 24, top + 44, m + 44, top + 24, m + 64, top + 44],
      [CANVAS.w - m - 64, top + 44, CANVAS.w - m - 44, top + 24, CANVAS.w - m - 24, top + 44],
      [m + 24, bot - 44, m + 44, bot - 24, m + 64, bot - 44],
      [CANVAS.w - m - 64, bot - 44, CANVAS.w - m - 44, bot - 24, CANVAS.w - m - 24, bot - 44]
    ];
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      g.appendChild(el('path', { 'class': 'tree-flourish', fill: 'none',
        d: 'M ' + c[0] + ' ' + c[1] + ' Q ' + c[2] + ' ' + c[3] +
           ' ' + c[4] + ' ' + c[5] }));
    }
    return g;
  }

  function buildHeader(ln) {
    var g = el('g', { 'class': 'tree-header', 'data-line': ln.id });
    g.setAttribute('transform', 'translate(' + ln.x + ' ' + ln.y + ')');
    g.style.setProperty('--lc', ln.color);
    ln._g = g;
    g.appendChild(el('line', { 'class': 'tree-header-rule',
      x1: -90, y1: 22, x2: 90, y2: 22 }));
    var name = el('text', { 'class': 'tree-header-name', x: 0, y: 0,
      'text-anchor': 'middle' });
    name.textContent = ln.label;
    g.appendChild(name);
    var origin = el('text', { 'class': 'tree-header-origin', x: 0, y: 16,
      'text-anchor': 'middle' });
    origin.textContent = ln.origin;
    g.appendChild(origin);
    return g;
  }

  function buildEdge(e) {
    var path = el('path', {
      'class': 'tree-edge' + (e.candidate ? ' tree-edge-candidate' : ''),
      d: e.d, fill: 'none'
    });
    path.style.color = e.color;          /* drives currentColor in the gradient */
    path.style.stroke = e.color;
    e._el = path;
    return path;
  }

  function buildNode(p) {
    var cls = 'tree-node tree-node-' + p.kind;
    if (p.anchor) cls += ' is-anchor';
    if (p.secondaryAnchor) cls += ' is-secondary-anchor';
    if (p.candidate) cls += ' is-candidate';
    if (p.dimmedUntilLight) cls += ' is-gen1';
    var g = el('g', { 'class': cls, 'data-id': p.id, 'data-line': p.line });
    g.style.setProperty('--lc', lineColor(p.line));

    /* arrival pulse halo */
    var halo = el('circle', { 'class': 'tree-node-halo', cx: 0, cy: 0,
      r: ((p.kind === 'union') ? LAYOUT.unionR + 12 : LAYOUT.nodeW / 2 + 8) });
    g.appendChild(halo);
    p._halo = halo;

    if (p.kind === 'union') {
      g.appendChild(el('circle', { 'class': 'tree-union-ring',
        cx: 0, cy: 0, r: LAYOUT.unionR }));
      var glyph = el('text', { 'class': 'tree-union-glyph', x: 0, y: 2,
        'text-anchor': 'middle' });
      glyph.textContent = p.finalUnion ? '∞' : '⚭';
      g.appendChild(glyph);
      var ulabel = el('text', { 'class': 'tree-union-label', x: 0,
        y: LAYOUT.unionR + 18, 'text-anchor': 'middle' });
      ulabel.textContent = p.sub;
      g.appendChild(ulabel);
    } else {
      var w = (p.kind === 'spouse') ? LAYOUT.spouseW : LAYOUT.nodeW;
      var h = (p.kind === 'spouse') ? LAYOUT.spouseH : LAYOUT.nodeH;
      g.appendChild(el('rect', { 'class': 'tree-node-card',
        x: -w/2, y: -h/2, width: w, height: h, rx: 4 }));
      g.appendChild(el('circle', { 'class': 'tree-node-dot',
        cx: -w/2 + 12, cy: -h/2 + 12, r: 4 }));
      var nm = el('text', { 'class': 'tree-node-name', x: 0, y: -4,
        'text-anchor': 'middle' });
      nm.textContent = p.name;
      g.appendChild(nm);
      /* sub line — wrap to 2 lines when too long for the 252px card */
      var subLines = wrapLabel(p.sub || '', 40);
      if (subLines.length <= 1) {
        var sb = el('text', { 'class': 'tree-node-sub', x: 0, y: 13,
          'text-anchor': 'middle' });
        sb.textContent = subLines[0] || '';
        g.appendChild(sb);
      } else {
        var sb = el('text', { 'class': 'tree-node-sub', x: 0, y: 7,
          'text-anchor': 'middle' });
        sb.appendChild(tspanAt(subLines[0], 0, 7));
        sb.appendChild(tspanAt(subLines[1], 0, 19));
        g.appendChild(sb);
      }
      if (p.anchor) {
        var star = el('text', { 'class': 'tree-node-star',
          x: w/2 - 13, y: -h/2 + 17, 'text-anchor': 'middle' });
        star.textContent = '★';
        g.appendChild(star);
      } else if (p.secondaryAnchor) {
        var dot = el('circle', { 'class': 'tree-node-secondary',
          cx: w/2 - 13, cy: -h/2 + 13, r: 3 });
        g.appendChild(dot);
      }
    }
    p._g = g;
    return g;
  }

  function buildRuler() {
    var g = el('g', { 'class': 'tree-ruler' });

    /* the rule line */
    var x1 = yearToX(TIME.yearMin) + 4;
    var x2 = yearToX(TIME.yearMax) - 4;
    var rule = el('line', { 'class': 'tree-ruler-line',
      x1: x1, y1: LAYOUT.rulerY, x2: x2, y2: LAYOUT.rulerY });
    g.appendChild(rule);

    /* ticks every 25 years; major ticks + labels every 100 */
    for (var y = TIME.yearMin; y <= TIME.yearMax; y += LAYOUT.rulerTickEvery) {
      var x = yearToX(y);
      var isMajor = (y % LAYOUT.rulerMajorEvery === 0);
      var h = isMajor ? LAYOUT.rulerMajorTickH : LAYOUT.rulerTickH;
      g.appendChild(el('line', { 'class': 'tree-ruler-tick' + (isMajor ? ' is-major' : ''),
        x1: x, y1: LAYOUT.rulerY, x2: x, y2: LAYOUT.rulerY + h }));
      if (isMajor) {
        var lab = el('text', { 'class': 'tree-ruler-year',
          x: x, y: LAYOUT.rulerY + LAYOUT.rulerMajorTickH + 14, 'text-anchor': 'middle' });
        lab.textContent = String(y);
        g.appendChild(lab);
      }
    }

    /* world annotations: tick + label, line-coloured */
    var gWorlds = el('g', { 'class': 'tree-worlds' });
    for (var i = 0; i < WORLDS_SORTED.length; i++) {
      var w = WORLDS_SORTED[i];
      var gw = el('g', { 'class': 'tree-world', 'data-id': w.id });
      gw.style.setProperty('--lc', 'var(--c-world)');
      /* vertical guide from rule up to label baseline */
      gw.appendChild(el('line', { 'class': 'tree-world-guide',
        x1: w.x, y1: LAYOUT.rulerY - 2, x2: w.x, y2: w._labelY + 6 }));
      /* dot at the rule */
      gw.appendChild(el('circle', { 'class': 'tree-world-dot',
        cx: w.x, cy: LAYOUT.rulerY, r: 3 }));
      /* the label now lives in the HERO sprout layer (below), which settles
         into this slot at (w.x, w._labelY) — so no static label here. */
      /* band? draw a hairline rectangle */
      if (w.band) {
        var bx1 = yearToX(w.band.from);
        var bx2 = yearToX(w.band.to);
        gw.appendChild(el('rect', { 'class': 'tree-world-band',
          x: bx1, y: LAYOUT.rulerY + 2, width: bx2 - bx1, height: 3 }));
      }
      w._g = gw;
      gWorlds.appendChild(gw);
    }
    g.appendChild(gWorlds);

    /* world-event HERO sprout layer — big + readable on the left axis, then
       glides down + shrinks onto its ruler dot. Anchored (no camera). */
    var gHeroes = el('g', { 'class': 'tree-world-heroes' });
    for (var hi2 = 0; hi2 < WORLDS_SORTED.length; hi2++) {
      var hw2 = WORLDS_SORTED[hi2];
      var gh = el('g', { 'class': 'tree-world-hero', 'data-id': hw2.id });
      var lines = wrapLabel(hw2.label, 26);
      var two = lines.length > 1;
      var longest = lines[0].length;
      if (two && lines[1].length > longest) longest = lines[1].length;
      var plateW = Math.max(300, longest * 26 + 76);
      var plateTop = -134, plateBot = two ? 92 : 34;
      var plate = el('rect', { 'class': 'tree-world-hero-plate',
        x: -32, y: plateTop, width: plateW, height: plateBot - plateTop, rx: 10 });
      gh.appendChild(plate);
      var yr = el('text', { 'class': 'tree-world-hero-year',
        x: 0, y: -48, 'text-anchor': 'start' });
      yr.textContent = String(hw2.year);
      gh.appendChild(yr);
      var lab = el('text', { 'class': 'tree-world-hero-label',
        x: 0, y: 0, 'text-anchor': 'start' });
      lab.appendChild(tspanAt(lines[0], 0, 0));
      if (two) lab.appendChild(tspanAt(lines[1], 0, 54));
      gh.appendChild(lab);
      hw2._hero = gh; hw2._heroPlate = plate; hw2._heroYear = yr; hw2._heroLabel = lab;
      gHeroes.appendChild(gh);
    }
    g.appendChild(gHeroes);

    return g;
  }

  function build(host, opts) {
    if (built) return;
    reducedMotion = !!(opts && opts.reducedMotion);
    mapHost = (opts && opts.mapHost) || null;

    layoutTree();

    svg = el('svg', {
      'class': 'tree-canvas',
      viewBox: '0 0 ' + CANVAS.w + ' ' + CANVAS.h,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'A family tree of four ancestral lines — Bétourné, ' +
        'Heppell-Lepel, Mongeau, and Barbeau — converging over 422 years ' +
        'onto Daniel Lepel and his sister Renée.'
    });
    svg.appendChild(buildDefs());

    /* ground wash (no camera) */
    svg.appendChild(el('rect', { 'class': 'tree-ground',
      x: 0, y: 0, width: CANVAS.w, height: CANVAS.h, fill: '#1a160f' }));

    /* the tree camera contains everything that pans/zooms */
    gCamera = el('g', { 'class': 'tree-camera' });
    gCamera.appendChild(buildFrame());

    var gEdges = el('g', { 'class': 'tree-edges' });
    for (var i = 0; i < EDGES.length; i++) gEdges.appendChild(buildEdge(EDGES[i]));
    gCamera.appendChild(gEdges);

    var gHeaders = el('g', { 'class': 'tree-headers' });
    for (var j = 0; j < LINES.length; j++) gHeaders.appendChild(buildHeader(LINES[j]));
    gCamera.appendChild(gHeaders);

    var gNodes = el('g', { 'class': 'tree-nodes' });
    for (var k = 0; k < PEOPLE.length; k++) gNodes.appendChild(buildNode(PEOPLE[k]));
    gCamera.appendChild(gNodes);

    svg.appendChild(gCamera);

    /* the ruler is anchored, not part of the camera */
    gRuler = buildRuler();
    svg.appendChild(gRuler);

    host.appendChild(svg);

    /* measure real edge lengths now that paths are in the DOM */
    for (var ei = 0; ei < EDGES.length; ei++) {
      var ed = EDGES[ei];
      try {
        var L = ed._el.getTotalLength();
        if (L && isFinite(L) && L > 1) ed.len = L;
      } catch (err) { /* stubbed DOM in tests — keep fallback length */ }
      ed._el.style.strokeDasharray = ed.len;
      ed._el.style.strokeDashoffset = ed.len;
    }

    built = true;
    render(0);
  }

  /* =====================================================================
     6. RENDER — pure function of t
     ===================================================================== */

  /* arrival pulse: a 0 -> 1 -> 0 bump over pulseDur after a node's t */
  function pulseAt(node, t) {
    if (reducedMotion) return 0;
    var tt = t - node.t;
    if (tt < 0 || tt > MOTION.pulseDur) return 0;
    var strength = (node.finalUnion || node.anchor) ? 1.0 :
                   (node.kind === 'union' ? 0.85 : 0.55);
    return Math.sin(Math.PI * (tt / MOTION.pulseDur)) * strength;
  }

  function activeId(t) {
    var id = INTRO[0] ? INTRO[0].id : null;
    for (var i = 0; i < INTRO.length; i++) {
      if (INTRO[i].t <= t + 0.04) id = INTRO[i].id; else break;
    }
    return id;
  }

  function currentBeat(t) {
    var beat = BEATS[0];
    for (var i = 0; i < BEATS.length; i++) {
      if (BEATS[i].t <= t + 0.04) beat = BEATS[i]; else break;
    }
    return beat;
  }

  function focusXY(focusId, t) {
    if (!focusId) return { x: CANVAS.w / 2, y: LAYOUT.yBot * 0.55 };
    /* RULER focus now lands on tree mid-height — never the bottom of canvas.
       The previous y=rulerY-100 sent the camera into dead space below
       the lowest tree row. */
    if (focusId === 'RULER')    return { x: CANVAS.w / 2,
                                         y: LAYOUT.yTop + (LAYOUT.yBot - LAYOUT.yTop) * 0.45 };
    if (focusId === 'OVERVIEW') return { x: CANVAS.w / 2, y: CANVAS.h / 2 };
    /* DESCENDANTS: frame all GEN1 cousins (Daniel, Renée, Jon Paul, Christine)
       in the centre. Computes a real centroid + tighter zoom is applied by
       caller via the cameraAt branch. */
    if (focusId === 'DESCENDANTS') {
      var sx = 0, sy = 0, n = 0;
      for (var di = 0; di < PEOPLE.length; di++) {
        var dp = PEOPLE[di];
        if (dp.kind === 'descendant' && typeof dp.x === 'number') {
          sx += dp.x; sy += dp.y; n++;
        }
      }
      if (n > 0) return { x: sx / n, y: sy / n };
      return { x: CANVAS.w / 2, y: LAYOUT.rowDesc || (LAYOUT.yBot * 0.9) };
    }
    var p = BY_ID[focusId];
    if (p) return { x: p.x, y: p.y };
    /* World-event ids: redirect to the paired person if known, otherwise hold
       the camera at the tree's mid-height (NOT at the ruler). This prevents
       the camera from diving to the bottom whenever a world event is the
       current beat focus. */
    for (var i = 0; i < WORLDS.length; i++) {
      if (WORLDS[i].id === focusId) {
        var w = WORLDS[i];
        if (w.pairWith && BY_ID[w.pairWith]) {
          var pp = BY_ID[w.pairWith];
          return { x: pp.x, y: pp.y };
        }
        return { x: CANVAS.w / 2,
                 y: LAYOUT.yTop + (LAYOUT.yBot - LAYOUT.yTop) * 0.55 };
      }
    }
    return { x: CANVAS.w / 2, y: LAYOUT.yBot * 0.55 };
  }

  function cameraAt(t) {
    if (reducedMotion) {
      return { s: 1.0, fx: CANVAS.w / 2, fy: CANVAS.h / 2 };
    }
    /* closing pull-back */
    if (t >= MOTION.endStart) {
      var ke = easeInOut(clamp01((t - MOTION.endStart) /
        (MOTION.endDone - MOTION.endStart)));
      var last = currentBeat(t);
      var lp = focusXY(last.focus, t);
      return {
        s:  lerp(MOTION.zoomBody, MOTION.zoomEnd, ke),
        fx: lerp(lp.x, CANVAS.w / 2, ke),
        fy: lerp(lp.y, CANVAS.h / 2 - 60, ke)
      };
    }
    /* body: HOLD on the current beat's focus for most of its window,
       then transition to the next beat's focus only in the last 1.5 seconds
       before that next beat fires. Per Daniel's spec: camera does not move
       away from the person being discussed until the narrator is done. */
    var i = 0;
    for (var k = 0; k < BEATS.length; k++) {
      if (BEATS[k].t <= t) i = k; else break;
    }
    var a = BEATS[i], b = BEATS[i + 1] || a;
    var ap = focusXY(a.focus, t);
    var bp = focusXY(b.focus, t);
    var TRANSITION = 1.6;   // s — anticipatory glide right before next beat
    var frac;
    if (b === a) {
      frac = 0;
    } else {
      var transStart = b.t - TRANSITION;
      frac = clamp01((t - transStart) / TRANSITION);
    }
    var ke2 = easeInOut(frac);
    var baseFx = lerp(ap.x, bp.x, ke2);
    var baseFy = lerp(ap.y, bp.y, ke2);
    /* Continuous slow drift — sine sway on two coprime periods so the canvas
       never sits perfectly still during a hold. Tapers off during a beat
       transition so it doesn't fight the directed move. */
    var holdMul = 1 - ke2 * 0.6;
    var driftX = MOTION.driftAmpX * softSin(t, MOTION.driftPerX) * holdMul;
    var driftY = MOTION.driftAmpY * softSin(t + 3.7, MOTION.driftPerY) * holdMul;
    /* Apply a tighter zoom for DESCENDANTS so all four cousins are framed
       larger than the body default. */
    var s = MOTION.zoomBody;
    if (a.focus === 'DESCENDANTS' || b.focus === 'DESCENDANTS') {
      /* Cousins span ~1300px horizontally — pull the zoom out so all four
         fit in frame with breathing room. */
      s = lerp(MOTION.zoomBody, 1.35,
               (a.focus === 'DESCENDANTS' ? (1 - ke2) : 0) +
               (b.focus === 'DESCENDANTS' ? ke2 : 0));
    }
    return {
      s: s,
      fx: baseFx + driftX,
      fy: baseFy + driftY
    };
  }

  /* map inset visible iff t is inside any [migration.t, migration.t + migration.tHold] */
  function mapInsetState(t) {
    /* iterate in reverse so a later migration window overrides an earlier
       one that is still in its tail (mill-migration band, ~11:55) */
    for (var i = MIGRATIONS.length - 1; i >= 0; i--) {
      var m = MIGRATIONS[i];
      if (t >= m.t - MOTION.mapSlideDur && t < m.t + m.tHold + MOTION.mapSlideDur) {
        return { visible: t >= m.t && t < m.t + m.tHold, migration: m };
      }
    }
    return { visible: false, migration: null };
  }

  function render(t) {
    if (!built) return;
    t = +t || 0;
    var actId = activeId(t);

    /* ---- camera ---- */
    var cam = cameraAt(t);
    var tx = CANVAS.w / 2 - cam.s * cam.fx;
    var ty = CANVAS.h / 2 - cam.s * cam.fy;
    gCamera.setAttribute('transform',
      'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) +
      ') scale(' + cam.s.toFixed(4) + ')');

    var rulerU = clamp01((t - MOTION.rulerStart) / MOTION.rulerDur);
    var rulerO = reducedMotion ? (t >= MOTION.rulerStart ? 1 : 0) : easeOutQuart(rulerU);
    gRuler.style.opacity = rulerO.toFixed(3);

    /* ---- edges ---- E2: draws via stroke-dashoffset, easeOutExpo for a
       more confident "ink flowing" feel; pulse glow rides the final 25% */
    for (var ei = 0; ei < EDGES.length; ei++) {
      var e = EDGES[ei];
      var u = clamp01((t - e.t) / MOTION.drawDur);
      var drawn = reducedMotion ? (t >= e.t ? 1 : 0) : easeOutExpo(u);
      e._el.style.strokeDashoffset = ((1 - drawn) * e.len).toFixed(2);
      e._el.style.opacity = (t >= e.t) ? '1' : '0';
      /* brief glow as the line completes, fades after ~0.5s */
      var glow = (u > 0.75 && u < 1.2) ? (1 - Math.abs(u - 1) / 0.25) : 0;
      e._el.style.filter = glow > 0
        ? 'drop-shadow(0 0 ' + (4 + glow * 6).toFixed(1) + 'px ' + e.color + ')'
        : '';
    }

    /* ---- branch highlight (from current beat) ---- */
    var curBeat = currentBeat(t);
    var hlLine = (curBeat && curBeat.highlight) ? curBeat.highlight : null;

    /* ---- nodes ---- E3: stronger arrival pulse + tiny scale breathing
       when a node is the current focus */
    for (var ni = 0; ni < PEOPLE.length; ni++) {
      var p = PEOPLE[ni];
      var au = clamp01((t - p.t) / MOTION.appearDur);
      var eased = easeOutCubic(au);
      var scale, op;
      if (p.dimmedUntilLight) {
        var dimO = eased * MOTION.gen1DimOpacity;
        if (t >= p.tLight) {
          var lu = clamp01((t - p.tLight) / 0.6);
          var lit = easeOutCubic(lu);
          op = lerp(MOTION.gen1DimOpacity, 1, lit);
        } else {
          op = reducedMotion ? (t >= p.t ? MOTION.gen1DimOpacity : 0) : dimO;
        }
        scale = reducedMotion ? 1 : (0.94 + 0.06 * eased);
      } else {
        op = reducedMotion ? (t >= p.t ? 1 : 0) : eased;
        scale = reducedMotion ? 1 : (0.94 + 0.06 * eased);
      }

      /* Focus breathing — only on the currently-focused node, very subtle.
         Adds a tiny ~1.5% scale pulse so the "alive" node feels alive. */
      var isFocus = (curBeat && curBeat.focus === p.id);
      if (isFocus && !reducedMotion && op > 0.5) {
        scale *= 1 + 0.015 * (0.5 + 0.5 * softSin(t, 3.2));
      }

      p._g.style.opacity = op.toFixed(3);
      p._g.setAttribute('transform',
        'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) +
        ') scale(' + scale.toFixed(4) + ')');

      /* Halo pulse — stronger now (was 0.65), with extra punch on arrival */
      var pulse = pulseAt(p, t);
      var arrivalBoost = (au > 0.6 && au < 1.35)
        ? (1 - Math.abs(au - 1) / 0.4) : 0;
      var haloAlpha = clamp01(pulse * 0.95 + arrivalBoost * 0.4);
      p._halo.style.opacity = haloAlpha.toFixed(3);

      var cl = p._g.classList;
      cl.toggle('is-active', p.id === actId && t >= p.t);
      cl.toggle('is-visible', op > 0.02);
      cl.toggle('is-highlighted', hlLine != null && p.line === hlLine && op > 0.02);
      cl.toggle('is-focused', isFocus && op > 0.5);
    }

    /* ---- world events: SPROUT hero (big, left axis) -> glide down + shrink
       to land on its bottom-ruler dot. Dot/guide/band appear only once landed. */
    for (var wi = 0; wi < WORLDS.length; wi++) {
      var w = WORLDS[wi];
      if (!w._hero) continue;
      var tIn     = w.t;
      var tSettle = w.t + MOTION.heroIn + MOTION.heroHold;
      var appear  = clamp01((t - tIn) / MOTION.heroIn);
      var heroOp  = reducedMotion ? (t >= tIn ? 1 : 0) : easeOutExpo(appear);
      var sRaw    = reducedMotion ? (t >= tSettle ? 1 : 0)
                                  : clamp01((t - tSettle) / MOTION.heroSettle);
      var s = sRaw * sRaw * (3 - 2 * sRaw);
      if (t < tIn) { heroOp = 0; s = 0; }
      var heroY = (typeof w._heroY === 'number') ? w._heroY : 300;
      var tx = lerp(MOTION.heroX, w.x,       s);
      var ty = lerp(heroY,        w._labelY, s);
      var k  = lerp(1,            MOTION.heroRestScale, s);
      w._hero.style.opacity = heroOp.toFixed(3);
      w._hero.setAttribute('transform',
        'translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ') scale(' + k.toFixed(4) + ')');
      if (w._heroYear)  w._heroYear.style.opacity  = (1 - s).toFixed(3);
      if (w._heroPlate) w._heroPlate.style.opacity = ((1 - s) * 0.92).toFixed(3);
      w._g.style.opacity = (heroOp * s).toFixed(3);
    }

    /* ---- headers ---- */
    for (var hi = 0; hi < LINES.length; hi++) {
      var ln = LINES[hi];
      if (!ln._g) continue;
      var hu = clamp01((t - ln.firstT) / MOTION.appearDur);
      ln._g.style.opacity =
        (reducedMotion ? (t >= ln.firstT ? 1 : 0) : hu).toFixed(3);
    }

    /* ---- map inset state — permanent traveling atlas ---- */
    if (mapHost) {
      var ms = mapInsetState(t);
      mapHost.classList.add('is-visible');           /* always on; the map travels continuously */
      if (ms.migration) {
        mapHost.dataset.migrationId = ms.migration.id;
        mapHost.dataset.line        = ms.migration.line;
      }
      /* between named places, retain the last line accent rather than flashing to default */
    }
  }

  /* =====================================================================
     7. PUBLIC INTERFACE
     ===================================================================== */
  window.LINEAGE_TREE = {
    build: build,
    render: render,
    activeId: activeId,
    currentBeat: currentBeat,
    mapInsetState: mapInsetState,
    focusXY: focusXY,
    CANVAS: CANVAS,
    LAYOUT: LAYOUT,
    /* exposed for tests / debugging */
    _people: PEOPLE,
    _edges: EDGES,
    _worlds: WORLDS,
    _migrations: MIGRATIONS,
    _beats: BEATS,
    _layout: layoutTree
  };
})();
