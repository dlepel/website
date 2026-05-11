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
  const hsNodes = [];     // { ev, node, x, w, lane }
  let hsStageW = 0;
  function yearToHSx(year) {
    return ((year - HS_YEAR_MIN) / (HS_YEAR_MAX - HS_YEAR_MIN)) * hsStageW;
  }
  function buildHistoryStrip() {
    hsLanes.innerHTML = '';
    hsAxis.innerHTML  = '';
    // sort by start
    const evs = HISTORY_EVENTS.slice().sort((a, b) => a.start - b.start);
    // greedy lane packing per tier
    const laneEnds = [[],[]];   // tier1 lanes, tier2 lanes -> end-year of last event
    evs.forEach(ev => {
      const tier = ev.tier === 1 ? 0 : 1;
      const end = (ev.end != null) ? ev.end : ev.start + 1;
      const lanes = laneEnds[tier];
      let lane = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] + 2 <= ev.start) { lane = i; break; }
      }
      if (lane === -1) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = end;
      // base lane offset: tier-1 at lanes 0..1; tier-2 below
      const laneIdx = tier === 0 ? lane : (lane + 2);

      const node = document.createElement('div');
      const isBand = ev.end != null;
      node.className = isBand ? 'hs-band' : 'hs-marker';
      if (ev.tier === 1) node.classList.add('tier-1');
      node.style.setProperty('--lane', laneIdx);
      node.dataset.label = ev.short || ev.label;
      if (isBand) node.textContent = ev.short || ev.label;
      else        node.setAttribute('data-label', ev.short || ev.label);
      node.title = ev.label + (ev.end != null ? ` (${ev.start}\u2013${ev.end})` : ` (${ev.start})`);
      hsLanes.appendChild(node);
      hsNodes.push({ ev, node, isBand });
    });
  }
  function layoutHistoryStrip() {
    hsStageW = hsLanes.clientWidth || 1;
    // ticks every 50 yr; labels every 50; minor ticks every 10
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
    hsNodes.forEach(({ ev, node, isBand }) => {
      const x = yearToHSx(ev.start);
      if (isBand) {
        const x2 = yearToHSx(ev.end);
        node.style.setProperty('--x', x + 'px');
        node.style.setProperty('--w', Math.max(8, x2 - x) + 'px');
      } else {
        node.style.setProperty('--x', x + 'px');
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
    hsPlayhead.style.left = (16 + yearToHSx(year)) + 'px';
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
    map.flyTo([p.lat, p.lon], focus.zoom, { duration: 2.4, easeLinearity: 0.4 });
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
     MAIN TICK — render(t) is idempotent.
     Visual state at any moment is purely a function of audio.currentTime.
     A throttled tab, a long pause, or a scrub backward all reconcile on
     the very next render call. We also force a render whenever the tab
     becomes visible again (Page Visibility API) so the catch-up is
     immediate, not deferred to the next rAF tick.
     ===================================================================== */
  function render(t) {
    timeLabel.textContent = fmtTime(t) + ' / 26:25';
    const pct = audio.duration ? (t / audio.duration) * 100 : 0;
    scrubFill.style.width = pct + '%';
    scrubKnob.style.left = pct + '%';
    updateActRange(t);
    updateHistoryStrip(t);
    updateCards(t);
    updateMapFocus(t);
    renderMigrations(t);
    renderCaptions(t);
    renderDitnames(t);
  }
  function tick() {
    render(audio.currentTime || 0);
    requestAnimationFrame(tick);
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
    audio.addEventListener('play',  () => playBtn.classList.add('playing'));
    audio.addEventListener('pause', () => playBtn.classList.remove('playing'));
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteBtn.classList.toggle('muted', audio.muted);
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
    });
    window.addEventListener('resize', () => {
      layoutHistoryStrip();
      lastCardIdx = -1;
      updateCards(audio.currentTime || 0);
      if (map) map.invalidateSize();
    });
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
  initMap();
  wireControls();

  // initial frame
  updateActRange(0);
  updateCards(0);
  layoutHistoryStrip();
  // give Leaflet a tick to lay out
  setTimeout(() => map && map.invalidateSize(), 200);

  tick();
})();
