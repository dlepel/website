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
  var CANVAS = { w: 1780, h: 2080 };

  var LAYOUT = {
    /* year -> y mapping for the year-driven (ancestral) zone */
    yearTop: 1600, yearBot: 1980,
    yTop:     80,  yBot:    1180,

    /* horizontal column x positions (merging pairs are adjacent) */
    colX: { C: 260, D: 660, B: 1090, A: 1480 },

    /* fixed rows for the trunk zone */
    rowUnion: 1240, rowChild: 1320, rowFinal: 1380, rowDesc: 1440,
    rowSpouseOffsetX: 118,   /* spouse sits this far right of spouseOf */
    rowSpouseOffsetY: 70,    /* and this far below */

    /* node geometry */
    nodeW: 252, nodeH: 60,
    spouseW: 198, spouseH: 50,
    unionR: 32,

    /* line header above each column's earliest node */
    headerDY: 92,

    /* relax: minimum vertical gap between two nodes in the same column */
    minGap: 86,

    /* time ruler zone (anchored, no camera transform) */
    rulerXPad: 120,                /* left/right padding from canvas edge */
    rulerY:    2010,               /* main rule line */
    rulerTickH:    8,
    rulerMajorTickH: 14,
    rulerTickEvery: 25,
    rulerMajorEvery: 100,
    worldLabelY: 1975,             /* baseline of nearest world annotation labels */
    worldLabelStep: 23             /* vertical stacking step — generous */
  };

  var MOTION = {
    appearDur: 0.48,    /* s — node fade + scale in */
    drawDur:   0.85,    /* s — edge draws via stroke-dashoffset */
    pulseDur:  0.90,    /* s — soft arrival pulse */
    worldDur:  0.60,    /* s — world annotation reveal */
    rulerStart: 45,     /* s — ruler begins drawing */
    rulerDur:   12,     /* s — ruler draws over this many seconds */

    /* camera */
    zoomBody:   1.25,   /* scale during the body of the piece — wider view */
    zoomEnd:    1.00,   /* scale at the held closing frame */
    endStart:   1069,    /* s — closing pull-back begins */
    endDone:    1134,    /* s — whole tree framed; held from here */

    /* GEN1: dimmed at opening, lit at the end */
    gen1DimOpacity: 0.22,

    /* map-inset surface window: hold until tStart + tHold, then slide out */
    mapSlideDur: 0.42
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
  function easeInOut(u)   { return u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2; }

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
      } else if (p.id === 'GEN1-D' || p.id === 'GEN1-R') {
        p.y = LAYOUT.rowDesc;
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

    /* ---- spouses: place beside their owner ---- */
    for (var si = 0; si < PEOPLE.length; si++) {
      var sp = PEOPLE[si];
      if (sp.kind !== 'spouse' || !sp.spouseOf) continue;
      var ow = BY_ID[sp.spouseOf];
      if (!ow) continue;
      sp.x = ow.x + LAYOUT.rowSpouseOffsetX;
      sp.y = ow.y + LAYOUT.rowSpouseOffsetY * 0.25;
    }

    /* ---- relax: minimum vertical gap within each line column ---- */
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
      ln.y = firstByYear ? firstByYear.y - LAYOUT.headerDY : LAYOUT.yTop - LAYOUT.headerDY;
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
    var m = 32, top = m, bot = LAYOUT.yBot + 240;  /* leave room under trunk */
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
      var sb = el('text', { 'class': 'tree-node-sub', x: 0, y: 13,
        'text-anchor': 'middle' });
      sb.textContent = p.sub;
      g.appendChild(sb);
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
      gw.style.setProperty('--lc', 'var(--c-gold)');
      /* vertical guide from rule up to label baseline */
      gw.appendChild(el('line', { 'class': 'tree-world-guide',
        x1: w.x, y1: LAYOUT.rulerY - 2, x2: w.x, y2: w._labelY + 6 }));
      /* dot at the rule */
      gw.appendChild(el('circle', { 'class': 'tree-world-dot',
        cx: w.x, cy: LAYOUT.rulerY, r: 3 }));
      /* label */
      var t = el('text', { 'class': 'tree-world-label',
        x: w.x + 6, y: w._labelY, 'text-anchor': 'start' });
      t.textContent = w.label;
      gw.appendChild(t);
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
    if (focusId === 'RULER')    return { x: CANVAS.w / 2, y: LAYOUT.rulerY - 100 };
    if (focusId === 'OVERVIEW') return { x: CANVAS.w / 2, y: CANVAS.h / 2 };
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
    return {
      s: MOTION.zoomBody,
      fx: lerp(ap.x, bp.x, ke2),
      fy: lerp(ap.y, bp.y, ke2)
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

    /* ---- ruler reveal ---- */
    var rulerU = clamp01((t - MOTION.rulerStart) / MOTION.rulerDur);
    var rulerO = reducedMotion ? (t >= MOTION.rulerStart ? 1 : 0) : easeOutQuart(rulerU);
    gRuler.style.opacity = rulerO.toFixed(3);

    /* ---- edges ---- */
    for (var ei = 0; ei < EDGES.length; ei++) {
      var e = EDGES[ei];
      var u = clamp01((t - e.t) / MOTION.drawDur);
      var drawn = reducedMotion ? (t >= e.t ? 1 : 0) : easeOutCubic(u);
      e._el.style.strokeDashoffset = ((1 - drawn) * e.len).toFixed(2);
      e._el.style.opacity = (t >= e.t) ? '1' : '0';
    }

    /* ---- branch highlight (from current beat) ---- */
    var curBeat = currentBeat(t);
    var hlLine = (curBeat && curBeat.highlight) ? curBeat.highlight : null;

    /* ---- nodes ---- */
    for (var ni = 0; ni < PEOPLE.length; ni++) {
      var p = PEOPLE[ni];
      var au = clamp01((t - p.t) / MOTION.appearDur);
      var eased = easeOutCubic(au);
      var scale, op;
      if (p.dimmedUntilLight) {
        /* GEN1: appear at p.t with appearDur, then live at gen1DimOpacity
           until p.tLight, then rise to 1 over a 0.6s window */
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
      p._g.style.opacity = op.toFixed(3);
      p._g.setAttribute('transform',
        'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) +
        ') scale(' + scale.toFixed(4) + ')');

      var pulse = pulseAt(p, t);
      p._halo.style.opacity = (pulse * 0.65).toFixed(3);

      var cl = p._g.classList;
      cl.toggle('is-active', p.id === actId && t >= p.t);
      cl.toggle('is-visible', op > 0.02);
      cl.toggle('is-highlighted', hlLine != null && p.line === hlLine && op > 0.02);
    }

    /* ---- world annotations ---- */
    for (var wi = 0; wi < WORLDS.length; wi++) {
      var w = WORLDS[wi];
      var wu = clamp01((t - w.t) / MOTION.worldDur);
      var wo = reducedMotion ? (t >= w.t ? 1 : 0) : easeOutQuart(wu);
      var ty2 = reducedMotion ? 0 : (1 - wo) * 8;
      w._g.style.opacity = wo.toFixed(3);
      w._g.setAttribute('transform', 'translate(0 ' + ty2.toFixed(2) + ')');
    }

    /* ---- headers ---- */
    for (var hi = 0; hi < LINES.length; hi++) {
      var ln = LINES[hi];
      if (!ln._g) continue;
      var hu = clamp01((t - ln.firstT) / MOTION.appearDur);
      ln._g.style.opacity =
        (reducedMotion ? (t >= ln.firstT ? 1 : 0) : hu).toFixed(3);
    }

    /* ---- map inset state ---- */
    if (mapHost) {
      var ms = mapInsetState(t);
      mapHost.classList.toggle('is-visible', ms.visible);
      mapHost.dataset.migrationId = ms.migration ? ms.migration.id : '';
      mapHost.dataset.line        = ms.migration ? ms.migration.line : '';
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
    CANVAS: CANVAS,
    /* exposed for tests / debugging */
    _people: PEOPLE,
    _edges: EDGES,
    _worlds: WORLDS,
    _migrations: MIGRATIONS,
    _beats: BEATS,
    _layout: layoutTree
  };
})();
