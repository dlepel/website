/* =====================================================================
   Lepel Family Timeline — VIEW (dark atlas)
   Drives: card rail (left), Leaflet atlas with accumulating migration
   arrows (right), act-range readout, captions, controls.
   ===================================================================== */
(function () {
  'use strict';
  const T = window.TIMELINE;
  const { TRACKS, ACTS, audioCues, PLACES, ERAS, CARDS, MAP_MIGRATIONS, MAP_FOCUS, CAPTIONS, HISTORY_EVENTS } = T;
  const HS_YEAR_MIN = 1600;
  const HS_YEAR_MAX = 2030;

  /* ---------- elements ---------- */
  const $ = id => document.getElementById(id);
  const stage      = $('stage');
  const audio      = $('audio');
  const splash     = $('splash');
  const beginBtn   = $('begin-btn');
  const captionEl  = $('caption');
  const ditEl      = $('ditname-display');
  const playBtn    = $('play-btn');
  const muteBtn    = $('mute-btn');
  const scrubFill  = $('scrub-fill');
  const scrubKnob  = $('scrub-knob');
  const scrubBar   = $('scrub-bar');
  const timeLabel  = $('time-label');
  const cardIndex  = $('card-index');
  const arNum      = $('ar-num');
  const arTitle    = $('ar-title');
  const arFrom     = $('ar-from');
  const arTo       = $('ar-to');
  const arRange    = document.querySelector('.act-range');
  const legendHost = $('legend');
  const actsNav    = $('acts-nav');
  const cardRail   = $('card-rail');
  const hsLanes    = $('hs-lanes');
  const hsAxis     = $('hs-axis');
  const hsPlayhead = $('hs-playhead');
  const railWindow = document.querySelector('.rail-window');
  const mtCoord    = $('mt-coord');
  const mlList     = $('ml-list');

  const ROMAN = ['I','II','III','IV','V'];

  /* ---------- helpers ---------- */
  function fmtTime(t) {
    if (isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function trackColor(id) { return (TRACKS.find(t => t.id === id) || {}).color || '#d4a04a'; }
  function trackDark(id)  { return (TRACKS.find(t => t.id === id) || {}).dark  || '#5d4d2e'; }
  function trackLabel(id) { return (TRACKS.find(t => t.id === id) || {}).label || 'History'; }

  function currentAct(t) {
    for (let i = ACTS.length - 1; i >= 0; i--) {
      if (t >= ACTS[i].start) return ACTS[i];
    }
    return ACTS[0];
  }

  /* =====================================================================
     LEGEND  (top bar)
     ===================================================================== */
  function buildLegend() {
    TRACKS.forEach(tr => {
      const el = document.createElement('div');
      el.className = 'lg-item';
      el.dataset.track = tr.id;
      el.style.setProperty('--swatch', tr.color);
      el.innerHTML = `<span class="lg-swatch"></span>${tr.label.split('·')[0].trim()}`;
      legendHost.appendChild(el);
    });
  }

  /* =====================================================================
     ACTS NAV
     ===================================================================== */
  function buildActsNav() {
    ACTS.forEach(act => {
      const chip = document.createElement('button');
      chip.className = 'act-chip';
      chip.dataset.actId = act.id;
      chip.innerHTML = `
        <span class="ac-num">${ROMAN[act.id - 1]}</span>
        <span class="ac-body">
          <span class="ac-title">${act.title}</span>
          <span class="ac-years">${act.yearStart}–${act.yearEnd}</span>
        </span>`;
      chip.addEventListener('click', () => {
        audio.currentTime = act.start + 0.1;
        if (audio.paused) audio.play();
      });
      actsNav.appendChild(chip);
    });
  }

  /* =====================================================================
     ACT RANGE READOUT  (only changes on act change)
     ===================================================================== */
  let currentActId = -1;
  function updateActRange(t) {
    const act = currentAct(t);
    if (act.id === currentActId) return;
    currentActId = act.id;
    arNum.textContent   = ROMAN[act.id - 1];
    arTitle.textContent = act.title;
    arFrom.textContent  = act.yearStart;
    arTo.textContent    = act.yearEnd;
    arRange.classList.remove('changing');
    void arRange.offsetWidth;
    arRange.classList.add('changing');
    document.querySelectorAll('.act-chip').forEach(c => {
      c.classList.toggle('current', +c.dataset.actId === act.id);
    });
  }

  /* =====================================================================
     HISTORY STRIP — Track 5 (horizontal, full width)
     Each event is placed by year along [HS_YEAR_MIN, HS_YEAR_MAX].
     Lane assignment is greedy: a 2-tier system (tier-1 / tier-2) plus
     simple overlap packing within each tier.
     ===================================================================== */
  /* HISTORY STRIP — smart label placement
     For each event:
       - measure pixel width (markers = 0, bands = end-start mapped)
       - WIDE ≥ 100px: full label inside band
       - MED  60–99px: short label inside band
       - NARROW < 60px: mini label OUTSIDE on a tail lane, leader line back
     Lanes:
       0,1,2 (inside): three tiers, top→bottom, greedy-packed
       -1   (outside top):  callout labels for narrow events
   */
  const hsNodes = [];     // { ev, node, leader?, callout?, isBand, lane, outside }
  let hsStageW = 0;
  const HS_W_FULL = 100, HS_W_MED = 60;
  function yearToHSx(year) {
    return ((year - HS_YEAR_MIN) / (HS_YEAR_MAX - HS_YEAR_MIN)) * hsStageW;
  }
  function buildHistoryStrip() {
    hsLanes.innerHTML = '';
    hsAxis.innerHTML  = '';
    // sort by start
    const evs = HISTORY_EVENTS.slice().sort((a, b) => a.start - b.start);
    evs.forEach(ev => {
      const isBand = ev.end != null;
      const node = document.createElement('div');
      node.className = isBand ? 'hs-band' : 'hs-marker';
      if (ev.tier === 1) node.classList.add('tier-1');
      node.dataset.evid = ev.label;
      // attach hover tooltip
      const tip = document.createElement('div');
      tip.className = 'hs-tip';
      tip.innerHTML =
        `<div class="tip-title">${ev.label}</div>` +
        `<div class="tip-date">${isBand ? ev.start + '\u2013' + ev.end : ev.start}</div>` +
        (ev.note ? `<div class="tip-note">${ev.note}</div>` : '');
      node.appendChild(tip);
      hsLanes.appendChild(node);
      hsNodes.push({ ev, node, isBand, tip });
    });
  }
  function layoutHistoryStrip() {
    hsStageW = hsLanes.clientWidth || 1;
    // ticks
    hsAxis.innerHTML = '';
    for (let y = 1600; y <= 2030; y += 10) {
      const tick = document.createElement('div');
      tick.className = 'hs-tick' + (y % 50 === 0 ? ' major' : '');
      tick.style.left = yearToHSx(y) + 'px';
      hsAxis.appendChild(tick);
      if (y % 50 === 0) {
        const lab = document.createElement('div');
        lab.className = 'hs-tick-label';
        lab.style.left = yearToHSx(y) + 'px';
        lab.textContent = y;
        hsAxis.appendChild(lab);
      }
    }
    // measure widths, decide labels + lanes
    const items = hsNodes.map(h => {
      const x  = yearToHSx(h.ev.start);
      const x2 = h.isBand ? yearToHSx(h.ev.end) : x;
      const w  = h.isBand ? Math.max(6, x2 - x) : 0;
      // label decision
      let labelText, mode;
      if (h.isBand) {
        if (w >= HS_W_FULL) { labelText = h.ev.short || h.ev.label; mode = 'inside-full'; }
        else if (w >= 28)   { labelText = h.ev.mini || h.ev.short || h.ev.label; mode = 'inside-med'; }
        else { labelText = h.ev.mini || h.ev.short || h.ev.label; mode = h.ev.tier === 1 ? 'callout' : 'hover-only'; }
      } else {
        labelText = h.ev.mini || h.ev.short || h.ev.label;
        mode = h.ev.tier === 1 ? 'callout' : 'hover-only';
      }
      return { h, x, x2, w, labelText, mode };
    });
    // Inside-band greedy lane packing (inside lanes 0..2)
    const insideLanes = [];  // each: lane -> rightmost x used
    const calloutLanes = []; // outside lanes (above strip)
    items.forEach(it => {
      const { h, x, x2, w, labelText, mode } = it;
      h.node.dataset.mode = mode;
      h.node.classList.toggle('callout-mode', mode === 'callout');
      // clear previous leader/callout children
      const oldLead = h.node.querySelector('.hs-leader');
      if (oldLead) oldLead.remove();
      const oldCall = h.node.querySelector('.hs-callout');
      if (oldCall) oldCall.remove();
      const oldInside = h.node.querySelector('.hs-inside-label');
      if (oldInside) oldInside.remove();

      if (h.isBand) {
        h.node.style.setProperty('--x', x + 'px');
        h.node.style.setProperty('--w', w + 'px');
      } else {
        h.node.style.setProperty('--x', x + 'px');
        h.node.style.setProperty('--w', '3px');
      }

        if (mode === 'inside-full' || mode === 'inside-med') {
        // inside lane packing — find first lane whose last-used x + 4px gap is < this.x
        let lane = -1;
        for (let i = 0; i < insideLanes.length; i++) {
          if (insideLanes[i] + 4 <= x) { lane = i; break; }
        }
        if (lane === -1 && insideLanes.length < 3) { lane = insideLanes.length; insideLanes.push(0); }
        if (lane === -1) lane = 0; // fallback overlap
        insideLanes[lane] = x2;
        h.node.style.setProperty('--lane', lane);
        const span = document.createElement('span');
        span.className = 'hs-inside-label';
        span.textContent = labelText;
        h.node.appendChild(span);
      } else if (mode === 'callout') {
        // callout: anchor band/marker at a baseline lane (lane 1 default), label above
        // Choose a callout lane with horizontal packing on the strip's top "antenna" rows
        // Estimate label width — rough: 6.5px per char + 10 padding, min 60
        const approxLabelW = Math.max(48, labelText.length * 6.4 + 14);
        const labelLeft = Math.max(0, x + w / 2 - approxLabelW / 2);
        const labelRight = labelLeft + approxLabelW;
        let lane = -1;
        for (let i = 0; i < calloutLanes.length; i++) {
          if (calloutLanes[i] + 4 <= labelLeft) { lane = i; break; }
        }
        if (lane === -1) { lane = calloutLanes.length; calloutLanes.push(0); }
        calloutLanes[lane] = labelRight;

        // anchor lane inside the strip — bands sit on inside lane 0 if free, else 1
        // simplest: put narrow bands/markers on lane 1 (middle) so leaders go up
        h.node.style.setProperty('--lane', 1);

        const callout = document.createElement('div');
        callout.className = 'hs-callout';
        callout.style.setProperty('--ax', (x + w / 2) + 'px');
        callout.style.setProperty('--cx', (labelLeft + approxLabelW / 2) + 'px');
        callout.style.setProperty('--clane', lane);
        callout.style.setProperty('--clw', approxLabelW + 'px');
        callout.innerHTML = `
          <svg class="hs-leader" preserveAspectRatio="none"></svg>
          <span class="hs-callout-label">${labelText}</span>`;
        // append to lane container, not node, so leader line spans absolute coords
        hsLanes.appendChild(callout);
        h.callout = callout;
        // draw leader path
        const svg = callout.querySelector('.hs-leader');
        // svg covers from anchor to label box; we use viewBox 0..100, simple line
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.innerHTML = `<path d="M 50 100 L 50 60 L ${50 + ((labelLeft + approxLabelW/2) - (x + w/2)) * 0} 0" stroke="rgba(212,160,74,0.6)" stroke-width="1" fill="none"/>`;
      } else {
        // hover-only: no callout label, just anchor on lane 1
        h.node.style.setProperty('--lane', 1);
      }
    });
  }
  // active year derives from audioCues piecewise-linear map (audio → year)
  function timeToYear(t) {
    if (!audioCues || !audioCues.length) return HS_YEAR_MIN;
    if (t <= audioCues[0].t) return audioCues[0].year;
    if (t >= audioCues[audioCues.length - 1].t) return audioCues[audioCues.length - 1].year;
    for (let i = 0; i < audioCues.length - 1; i++) {
      const a = audioCues[i], b = audioCues[i + 1];
      if (t >= a.t && t <= b.t) {
        const k = (t - a.t) / (b.t - a.t);
        return a.year + k * (b.year - a.year);
      }
    }
    return audioCues[0].year;
  }
  function updateHistoryStrip(t) {
    const year = timeToYear(t);
    // playhead position
    hsPlayhead.style.transform = 'translateX(' + (16 + yearToHSx(year)) + 'px)';
    // band/marker states — fully derived
    hsNodes.forEach(({ ev, node, isBand }) => {
      const inside = year >= ev.start - 0.5 && (isBand ? year <= ev.end + 0.5 : year <= ev.start + 0.5);
      const cued   = ev.t != null && Math.abs(t - ev.t) < 4;
      node.classList.toggle('active', inside || cued);
    });
  }

  /* =====================================================================
     CARD RAIL
     ===================================================================== */
  const cardNodes = [];
  function buildCards() {
    cardRail.innerHTML = '';
    CARDS.forEach((c, i) => {
      const node = document.createElement('article');
      node.className = 'card future';
      if (c.kind === 'moment')       node.classList.add('moment');
      if (c.kind === 'convergence')  node.classList.add('moment', 'convergence');
      if (c.kind === 'descendant')   node.classList.add('moment');
      if (c.kind === 'final')        node.classList.add('moment', 'final');
      node.style.setProperty('--c', trackColor(c.track));
      node.dataset.i = i;

      const lineLabel = trackLabel(c.track).split('·')[0].trim();
      const place = PLACES[c.placeKey] || { name: c.place || '', region: '' };
      node.innerHTML = `
        <div class="c-side">
          <div class="c-year">${c.year}</div>
          <div class="c-tag">${lineLabel}</div>
        </div>
        <div class="c-body">
          <div class="card-title">${c.title}</div>
          <div class="card-desc">${c.desc}</div>
          <div class="card-meta">
            <div class="card-place">${place.name}${place.region ? ' · ' + place.region : ''}</div>
            <div class="card-source">${c.source || ''}</div>
          </div>
        </div>`;
      cardRail.appendChild(node);
      cardNodes.push(node);
    });
  }

  // currentCardIndex(t): the highest-index card whose t <= currentTime
  function currentCardIndex(t) {
    let idx = 0;
    for (let i = 0; i < CARDS.length; i++) {
      if (CARDS[i].t <= t + 0.05) idx = i;
      else break;
    }
    return idx;
  }

  let lastCardIdx = -1;
  function updateCards(t) {
    const idx = currentCardIndex(t);
    if (idx !== lastCardIdx) {
      cardNodes.forEach((n, i) => {
        n.classList.remove('past', 'current', 'future');
        if      (i <  idx) n.classList.add('past');
        else if (i === idx) n.classList.add('current');
        else                n.classList.add('future');
      });
      lastCardIdx = idx;
      cardIndex.textContent = pad2(idx + 1) + ' / ' + pad2(CARDS.length);
      const c = CARDS[idx];
      // active legend item
      document.querySelectorAll('.lg-item').forEach(el => {
        el.classList.toggle('active', el.dataset.track === c.track);
      });
    }

    // translate rail so current card sits at focus-y
    const cur = cardNodes[idx];
    if (cur) {
      const focusY = railWindow.clientHeight * 0.32;
      const target = cur.offsetTop + cur.offsetHeight / 2;
      // smooth follow: subtract a small portion based on progress to next card
      const next = cardNodes[idx + 1];
      let glide = 0;
      if (next) {
        const c1 = CARDS[idx], c2 = CARDS[idx + 1];
        const k = Math.max(0, Math.min(1, (t - c1.t) / (c2.t - c1.t)));
        // smooth ease
        const ke = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        glide = ke * (next.offsetTop + next.offsetHeight / 2 - target);
      }
      const y = focusY - (target + glide);
      cardRail.style.transform = `translateY(${y}px)`;
    }
  }

  /* =====================================================================
     ATLAS MAP  (Leaflet, sepia, persistent, accumulating arrows)
     ===================================================================== */
  let map = null;
  let placeMarker = null;
  const drawnArrows = new Set();   // migration.n
  const arrowLayers = new Map();   // n -> { line, label, marker }
  const placeLabels = {};          // placeKey -> Leaflet marker

  function initMap() {
    map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
      worldCopyJump: false,
      minZoom: 2,
      maxZoom: 12,
    });
    // initial view spans Atlantic so all migrations are visible
    map.setView([47, -25], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      noWrap: true,
      crossOrigin: true,
    }).addTo(map);

    // place dots for every named location (faint at first)
    Object.keys(PLACES).forEach(k => {
      const p = PLACES[k];
      const icon = L.divIcon({
        className: '',
        html: '<div class="map-place-marker" style="opacity:.45"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([p.lat, p.lon], { icon, interactive: false }).addTo(map);
      m.bindTooltip(`${p.name}`, { permanent: false, direction: 'top', offset: [0, -10], className: 'map-place-tooltip' });
      placeLabels[k] = m;
    });
  }

  function setActivePlace(placeKey) {
    Object.entries(placeLabels).forEach(([k, m]) => {
      const el = m.getElement();
      if (!el) return;
      const dot = el.querySelector('.map-place-marker');
      if (!dot) return;
      if (k === placeKey) {
        dot.style.opacity = '1';
        dot.classList.add('pulsing');
        m.openTooltip();
      } else {
        dot.classList.remove('pulsing');
        dot.style.opacity = '0.45';
        m.closeTooltip();
      }
    });
  }

  /* Curved polyline between two coords (quadratic-style arc).
     We bend the arc by displacing the midpoint along the perpendicular. */
  function curvedPath(latA, lonA, latB, lonB, bend) {
    const N = 60;
    const dx = lonB - lonA, dy = latB - latA;
    const len = Math.hypot(dx, dy) || 1;
    // perpendicular direction
    const px = -dy / len, py = dx / len;
    // bend amount scales with distance
    const amp = (bend || 0.18) * len;
    const mx = (lonA + lonB) / 2 + px * amp;
    const my = (latA + latB) / 2 + py * amp;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      const lon = a * lonA + b * mx + c * lonB;
      const lat = a * latA + b * my + c * latB;
      pts.push([lat, lon]);
    }
    return pts;
  }
  function pointOnPath(pts, u) {
    const i = Math.max(0, Math.min(pts.length - 1, Math.floor(u * (pts.length - 1))));
    return pts[i];
  }

  // Idempotent migration rendering: layers are created once, then their
  // visual state (stroke-dashoffset, opacity, legend class) is recomputed
  // every frame as a pure function of audio.currentTime.
  const migState = new Map();  // n -> { len, pathEl, head, label, row }
  const MIG_DUR = 2.6;
  function ensureMigrationLayers(mig) {
    const cached = migState.get(mig.n);
    if (cached) return cached;
    const fp = PLACES[mig.from], tp = PLACES[mig.to];
    if (!fp || !tp) return null;
    const color = trackColor(mig.track);
    const pts = curvedPath(fp.lat, fp.lon, tp.lat, tp.lon, 0.22);
    L.polyline(pts, { color, weight: 5, opacity: 0.18, lineCap: 'round', interactive: false }).addTo(map);
    const line = L.polyline(pts, { color, weight: 2.2, opacity: 0.95, lineCap: 'round', interactive: false }).addTo(map);
    const pathEl = line.getElement();
    let len = 600;
    if (pathEl) {
      try { len = pathEl.getTotalLength(); } catch (e) {}
      pathEl.style.strokeDasharray = len + 'px';
      pathEl.style.strokeDashoffset = len + 'px';
      pathEl.style.transition = 'none';
    }
    const tip = pointOnPath(pts, 1);
    const prev = pointOnPath(pts, 0.97);
    const ang = Math.atan2(tip[0] - prev[0], tip[1] - prev[1]) * 180 / Math.PI;
    const headIcon = L.divIcon({
      className: '',
      html: `<svg width="16" height="16" viewBox="-8 -8 16 16" style="transform:rotate(${-ang}deg);opacity:0"><path d="M-5,-4 L5,0 L-5,4 L-2,0 Z" fill="${color}" stroke="${trackDark(mig.track)}" stroke-width="0.8"/></svg>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    const head = L.marker(tip, { icon: headIcon, interactive: false }).addTo(map);
    const mid = pointOnPath(pts, 0.5);
    const labelIcon = L.divIcon({
      className: '',
      html: `<div class="map-arrow-label" style="border-color:${color};color:${color};opacity:0">${mig.n}</div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    const label = L.marker(mid, { icon: labelIcon, interactive: true }).addTo(map)
      .bindTooltip(`<b>${mig.n}.</b> ${mig.label} · ${mig.yearLabel}<br><i style="opacity:.8">${mig.desc}</i>`,
        { direction: 'top', offset: [0, -12], className: 'map-place-tooltip' });
    const row = mlList.querySelector(`[data-n="${mig.n}"]`);
    const s = { len, pathEl, head, label, row };
    migState.set(mig.n, s);
    return s;
  }
  function setOpacity(marker, selector, value) {
    const el = marker.getElement(); if (!el) return;
    const target = el.querySelector(selector); if (!target) return;
    target.style.opacity = value;
  }
  function renderMigrations(t) {
    MAP_MIGRATIONS.forEach(mig => {
      if (t < mig.t) {
        // not yet — if layers were materialized, reset to hidden state
        const cached = migState.get(mig.n);
        if (cached) {
          if (cached.pathEl) cached.pathEl.style.strokeDashoffset = cached.len + 'px';
          setOpacity(cached.head, 'svg', '0');
          setOpacity(cached.label, '.map-arrow-label', '0');
          if (cached.row) cached.row.classList.remove('drawn', 'active');
        }
        return;
      }
      const s = ensureMigrationLayers(mig);
      if (!s) return;
      const u = Math.max(0, Math.min(1, (t - mig.t) / MIG_DUR));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - u, 3);
      if (s.pathEl) s.pathEl.style.strokeDashoffset = ((1 - eased) * s.len).toFixed(2) + 'px';
      const reveal = u >= 1 ? 1 : Math.max(0, (u - 0.75) / 0.25);
      setOpacity(s.head, 'svg', reveal.toFixed(2));
      setOpacity(s.label, '.map-arrow-label', reveal.toFixed(2));
      if (s.row) {
        s.row.classList.toggle('drawn', u > 0);
        s.row.classList.toggle('active', t >= mig.t && t < mig.t + 6);
      }
    });
  }

  function buildMapLegend() {
    mlList.innerHTML = '';
    MAP_MIGRATIONS.forEach(mig => {
      const row = document.createElement('div');
      row.className = 'ml-row';
      row.dataset.n = mig.n;
      row.style.setProperty('--c-line', trackColor(mig.track));
      row.innerHTML = `
        <div class="ml-n">${mig.n}</div>
        <div class="ml-year">${mig.yearLabel}</div>
        <div class="ml-label"><span class="ml-line"></span>${mig.label}</div>`;
      row.title = mig.desc;
      mlList.appendChild(row);
    });
  }

  /* ---- map focus / auto-pan ----
     Pure function of audio.currentTime: the active focus is whichever
     MAP_FOCUS entry has the latest tStart <= t. flyTo is only invoked
     when the active focus changes (forward OR backward), so scrubbing
     reconciles correctly. */
  let activeFocusT = NaN;
  function updateMapFocus(t) {
    let focus = null;
    for (let i = 0; i < MAP_FOCUS.length; i++) {
      if (MAP_FOCUS[i].t <= t + 0.1) focus = MAP_FOCUS[i];
    }
    if (!focus || focus.t === activeFocusT) return;
    activeFocusT = focus.t;
    const p = PLACES[focus.place];
    if (!p || !map) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.setView([p.lat, p.lon], focus.zoom);
    } else {
      map.flyTo([p.lat, p.lon], focus.zoom, { duration: 2.4, easeLinearity: 0.4 });
    }
    setActivePlace(focus.place);
    mtCoord.textContent = `${p.name} · ${focus.desc}`;
  }

  /* =====================================================================
     CAPTIONS + DITNAMES — pure-state, derived from audio.currentTime.
     Each entry implicitly owns the visible window [t, t + dur).
     Each frame we pick the latest active entry and write it to the DOM,
     only if the chosen text actually changed.
     ===================================================================== */
  const CAP_DUR = 8.0;
  const DIT_DUR = 6.5;
  let lastCaptionText = '';
  let lastDitText = '';

  function renderCaptions(t) {
    let active = null;
    for (let i = 0; i < CAPTIONS.length; i++) {
      const c = CAPTIONS[i];
      if (c.kind === 'ditname') continue;
      const dur = c.dur || CAP_DUR;
      if (c.t <= t && t < c.t + dur) active = c;
    }
    // moment / convergence / final cards also surface a caption while current
    const idx = currentCardIndex(t);
    const card = CARDS[idx];
    if (card && (card.kind === 'moment' || card.kind === 'convergence' || card.kind === 'final')) {
      if (t >= card.t && t - card.t < CAP_DUR) {
        const text = card.title + ' — ' + card.desc.split('. ')[0] + '.';
        const cardCap = { t: card.t, text };
        if (!active || cardCap.t > active.t) active = cardCap;
      }
    }
    if (active) {
      if (active.text !== lastCaptionText) {
        captionEl.innerHTML = active.text;
        lastCaptionText = active.text;
      }
      captionEl.classList.add('on');
    } else {
      if (lastCaptionText) { captionEl.classList.remove('on'); lastCaptionText = ''; }
    }
  }

  function renderDitnames(t) {
    let active = null;
    for (let i = 0; i < CAPTIONS.length; i++) {
      const c = CAPTIONS[i];
      if (c.kind !== 'ditname') continue;
      const dur = c.dur || DIT_DUR;
      if (c.t <= t && t < c.t + dur) active = c;
    }
    if (active) {
      if (active.text !== lastDitText) {
        ditEl.textContent = active.text;
        lastDitText = active.text;
      }
      ditEl.classList.add('on');
    } else {
      if (lastDitText) { ditEl.classList.remove('on'); lastDitText = ''; }
    }
  }

  /* =====================================================================
     TRANSCRIPT — narration text from the .srt; synced highlight + clickable.
     Derived purely from audio.currentTime, so it cannot desync.
     ===================================================================== */
  const transcriptPanel = $('transcript-panel');
  const transcriptBody  = $('transcript-body');
  const transcriptBtn   = $('transcript-btn');
  const transcriptClose = $('transcript-close');
  let transcriptCues = [];
  let transcriptOpen = false;
  let lastTranscriptIdx = -1;

  function parseSRT(text) {
    const cues = [];
    text.replace(/\r/g, '').split(/\n\n+/).forEach(block => {
      const lines = block.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) return;
      const m = lines[1].match(/(\d\d):(\d\d):(\d\d)[,.](\d\d\d)\s*-->/);
      if (!m) return;
      const start = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
      cues.push({ start: start, text: lines.slice(2).join(' ').trim() });
    });
    return cues;
  }

  function buildTranscript() {
    fetch('uploads/lineage-transcript.srt')
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(txt => {
        transcriptCues = parseSRT(txt);
        transcriptBody.innerHTML = '';
        transcriptCues.forEach((c, i) => {
          const b = document.createElement('button');
          b.className = 'transcript-line';
          b.dataset.i = i;
          b.innerHTML = '<span class="tl-time">' + fmtTime(c.start) + '</span>' + c.text;
          b.addEventListener('click', () => {
            audio.currentTime = c.start + 0.05;
            if (audio.paused) audio.play();
          });
          transcriptBody.appendChild(b);
        });
      })
      .catch(() => {
        transcriptBody.innerHTML =
          '<p style="font-family:var(--sans);font-size:12px;color:var(--paper-faint)">Transcript unavailable.</p>';
      });
  }

  function renderTranscript(t) {
    if (!transcriptCues.length) return;
    let idx = -1;
    for (let i = 0; i < transcriptCues.length; i++) {
      if (t >= transcriptCues[i].start) idx = i; else break;
    }
    if (idx === lastTranscriptIdx) return;
    lastTranscriptIdx = idx;
    const lines = transcriptBody.children;
    for (let i = 0; i < lines.length; i++) {
      lines[i].classList.toggle('active', i === idx);
    }
    if (transcriptOpen && idx >= 0 && lines[idx]) {
      lines[idx].scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
  }

  function toggleTranscript(open) {
    transcriptOpen = (open === undefined) ? !transcriptOpen : !!open;
    transcriptPanel.classList.toggle('open', transcriptOpen);
    transcriptPanel.setAttribute('aria-hidden', String(!transcriptOpen));
    transcriptBtn.setAttribute('aria-pressed', String(transcriptOpen));
    transcriptBtn.setAttribute('aria-label', transcriptOpen ? 'Hide transcript' : 'Show transcript');
    if (transcriptOpen) {
      lastTranscriptIdx = -1;
      renderTranscript(audio.currentTime || 0);
    }
  }

  /* =====================================================================
     MAIN TICK — render(t) is idempotent.
     Visual state at any moment is purely a function of audio.currentTime.
     A throttled tab, a long pause, or a scrub backward all reconcile on
     the very next render call. We also force a render whenever the tab
     becomes visible again (Page Visibility API) so the catch-up is
     immediate, not deferred to the next rAF tick.
     ===================================================================== */
  let scrubBarW = 0;
  let lastTimeText = '';
  function render(t) {
    const tt = fmtTime(t) + ' / 26:25';
    if (tt !== lastTimeText) {
      lastTimeText = tt;
      timeLabel.textContent = tt;
      const pctI = audio.duration ? Math.round((t / audio.duration) * 100) : 0;
      scrubBar.setAttribute('aria-valuenow', pctI);
      scrubBar.setAttribute('aria-valuetext', fmtTime(t) + ' of 26:25');
    }
    // scrubber + playhead use transform (compositor-only) instead of width/left
    const frac = audio.duration ? (t / audio.duration) : 0;
    scrubFill.style.transform = 'scaleX(' + frac + ')';
    scrubKnob.style.transform = 'translateX(' + (frac * scrubBarW) + 'px)';
    updateActRange(t);
    updateHistoryStrip(t);
    updateCards(t);
    updateMapFocus(t);
    renderMigrations(t);
    renderCaptions(t);
    renderDitnames(t);
    renderTranscript(t);
  }
  let rafId = null;
  function tick() {
    render(audio.currentTime || 0);
    rafId = requestAnimationFrame(tick);
  }
  function startLoop() { if (rafId === null) rafId = requestAnimationFrame(tick); }
  function stopLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    render(audio.currentTime || 0);   // settle on a final, correct frame
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render(audio.currentTime || 0);
  });
  audio.addEventListener('seeked', () => render(audio.currentTime || 0));

  /* =====================================================================
     CONTROLS
     ===================================================================== */
  function wireControls() {
    playBtn.addEventListener('click', () => {
      if (audio.paused) audio.play(); else audio.pause();
    });
    audio.addEventListener('play',  () => {
      playBtn.classList.add('playing');
      playBtn.setAttribute('aria-pressed', 'true');
      startLoop();
    });
    audio.addEventListener('pause', () => {
      playBtn.classList.remove('playing');
      playBtn.setAttribute('aria-pressed', 'false');
      stopLoop();
    });
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteBtn.classList.toggle('muted', audio.muted);
      muteBtn.setAttribute('aria-pressed', String(audio.muted));
    });
    scrubBar.addEventListener('click', e => {
      if (!audio.duration) return;
      const r = scrubBar.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      audio.currentTime = k * audio.duration;
    });
    let scrubbing = false;
    const start = () => { scrubbing = true; };
    const stop  = () => { scrubbing = false; };
    scrubKnob.addEventListener('mousedown', start);
    window.addEventListener('mouseup', stop);
    window.addEventListener('mousemove', e => {
      if (!scrubbing || !audio.duration) return;
      const r = scrubBar.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      audio.currentTime = k * audio.duration;
    });
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (audio.paused) audio.play(); else audio.pause();
      }
      if (e.code === 'ArrowRight') {
        audio.currentTime = Math.min(audio.duration || 1585, audio.currentTime + 5);
      }
      if (e.code === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
      if (e.code === 'Home') {
        e.preventDefault();
        audio.currentTime = 0;
      }
      if (e.code === 'End') {
        e.preventDefault();
        audio.currentTime = Math.max(0, (audio.duration || 1585) - 1);
      }
    });
    window.addEventListener('resize', () => {
      layoutHistoryStrip();
      lastCardIdx = -1;
      scrubBarW = scrubBar.clientWidth;
      updateCards(audio.currentTime || 0);
      if (map) map.invalidateSize();
    });
    scrubBarW = scrubBar.clientWidth;
    transcriptBtn.addEventListener('click', () => toggleTranscript());
    transcriptClose.addEventListener('click', () => toggleTranscript(false));
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  beginBtn.addEventListener('click', () => {
    splash.classList.add('gone');
    setTimeout(() => splash.remove(), 1300);
    audio.play().catch(() => {});
  });

  buildLegend();
  buildActsNav();
  buildHistoryStrip();
  buildCards();
  buildMapLegend();
  buildTranscript();
  initMap();
  wireControls();

  // initial frame
  updateActRange(0);
  updateCards(0);
  layoutHistoryStrip();
  // give Leaflet a tick to lay out
  setTimeout(() => map && map.invalidateSize(), 200);

  // render one static frame; the rAF loop starts on play and stops on pause
  render(audio.currentTime || 0);
})();
