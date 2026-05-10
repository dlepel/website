/* =====================================================================
   Lepel Family Timeline — VIEW (dark atlas)
   Drives: card rail (left), Leaflet atlas with accumulating migration
   arrows (right), act-range readout, captions, controls.
   ===================================================================== */
(function () {
  'use strict';
  const T = window.TIMELINE;
  const { TRACKS, ACTS, audioCues, PLACES, ERAS, CARDS, MAP_MIGRATIONS, MAP_FOCUS, CAPTIONS } = T;

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
  const eraTrack   = $('era-track');
  const cardRail   = $('card-rail');
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
     ERA BANDS  (vertical column alongside cards)
     ===================================================================== */
  // Total audio span maps to a virtual pixel column derived from rail height.
  // We compute each era's top/height based on its tStart/tEnd as a fraction.
  let eraNodes = [];
  function buildEras() {
    eraTrack.innerHTML = '';
    eraNodes = ERAS.map(era => {
      const node = document.createElement('div');
      node.className = 'era-band';
      node.dataset.id = era.id;
      node.style.setProperty('--c-band', era.color);
      node.innerHTML = `<span class="era-band-label">${era.label}</span>`;
      eraTrack.appendChild(node);
      return { era, node };
    });
    layoutEras();
  }
  function layoutEras() {
    const total = 1585;
    const H = eraTrack.clientHeight;
    eraNodes.forEach(({ era, node }) => {
      const top = (era.tStart / total) * H;
      const h   = Math.max(28, ((era.tEnd - era.tStart) / total) * H);
      node.style.setProperty('--top', top + 'px');
      node.style.setProperty('--h', h + 'px');
    });
  }
  function updateEras(t) {
    eraNodes.forEach(({ era, node }) => {
      const visible = t >= era.tStart - 4;
      const active  = t >= era.tStart && t <= era.tEnd;
      node.classList.toggle('on', visible);
      node.classList.toggle('active', active);
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

  function drawMigration(mig) {
    if (drawnArrows.has(mig.n)) return;
    drawnArrows.add(mig.n);
    const fp = PLACES[mig.from], tp = PLACES[mig.to];
    if (!fp || !tp) return;
    const color = trackColor(mig.track);

    const pts = curvedPath(fp.lat, fp.lon, tp.lat, tp.lon, 0.22);

    // outer halo
    L.polyline(pts, {
      color, weight: 5, opacity: 0.18, lineCap: 'round', interactive: false,
    }).addTo(map);

    // animated dashed line — draws on by tweening dashOffset
    const line = L.polyline(pts, {
      color, weight: 2.2, opacity: 0.95, dashArray: '6 6', lineCap: 'round',
      className: 'mig-line', interactive: false,
    }).addTo(map);
    // CSS-animatable via path element
    const pathEl = line.getElement();
    if (pathEl) {
      const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 600;
      pathEl.style.strokeDasharray = len;
      pathEl.style.strokeDashoffset = len;
      pathEl.style.transition = 'stroke-dashoffset 2.6s ease-out';
      requestAnimationFrame(() => {
        pathEl.style.strokeDashoffset = '0';
        setTimeout(() => {
          pathEl.style.transition = 'none';
          pathEl.style.strokeDasharray = '6 6';
          pathEl.style.strokeDashoffset = '0';
        }, 2700);
      });
    }

    // arrowhead at the destination end (small triangle marker)
    const tip = pointOnPath(pts, 1);
    const prev = pointOnPath(pts, 0.97);
    const ang = Math.atan2(tip[0] - prev[0], tip[1] - prev[1]) * 180 / Math.PI;
    const headIcon = L.divIcon({
      className: '',
      html: `<svg width="16" height="16" viewBox="-8 -8 16 16" style="transform:rotate(${-ang}deg)">
               <path d="M-5,-4 L5,0 L-5,4 L-2,0 Z" fill="${color}" stroke="${trackDark(mig.track)}" stroke-width="0.8"/>
             </svg>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    L.marker(tip, { icon: headIcon, interactive: false }).addTo(map);

    // numbered label at midpoint
    const mid = pointOnPath(pts, 0.5);
    const labelIcon = L.divIcon({
      className: '',
      html: `<div class="map-arrow-label" style="border-color:${color};color:${color};">${mig.n}</div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    const labelMarker = L.marker(mid, { icon: labelIcon, interactive: true })
      .addTo(map)
      .bindTooltip(`<b>${mig.n}.</b> ${mig.label} · ${mig.yearLabel}<br><i style="opacity:.8">${mig.desc}</i>`,
        { direction: 'top', offset: [0, -12], className: 'map-place-tooltip' });

    arrowLayers.set(mig.n, { line, label: labelMarker });

    // mark legend row drawn
    const row = mlList.querySelector(`[data-n="${mig.n}"]`);
    if (row) {
      row.classList.add('drawn', 'active');
      setTimeout(() => row.classList.remove('active'), 6000);
    }
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

  /* ---- map focus / auto-pan ---- */
  let lastFocusT = -Infinity;
  function updateMapFocus(t) {
    // find latest focus whose t <= currentTime
    let focus = null;
    for (let i = 0; i < MAP_FOCUS.length; i++) {
      if (MAP_FOCUS[i].t <= t + 0.1) focus = MAP_FOCUS[i];
      else break;
    }
    if (!focus || focus.t === lastFocusT) return;
    lastFocusT = focus.t;
    const p = PLACES[focus.place];
    if (!p || !map) return;
    map.flyTo([p.lat, p.lon], focus.zoom, { duration: 2.4, easeLinearity: 0.4 });
    setActivePlace(focus.place);
    mtCoord.textContent = `${p.name} · ${focus.desc}`;
  }

  /* =====================================================================
     CAPTIONS + DITNAMES
     ===================================================================== */
  let captionTimer = null, ditTimer = null;
  function showCaption(text) {
    captionEl.innerHTML = text;
    captionEl.classList.add('on');
    if (captionTimer) clearTimeout(captionTimer);
    captionTimer = setTimeout(() => captionEl.classList.remove('on'), 8500);
  }
  function showDitname(text) {
    ditEl.textContent = text;
    ditEl.classList.add('on');
    if (ditTimer) clearTimeout(ditTimer);
    ditTimer = setTimeout(() => ditEl.classList.remove('on'), 6500);
  }

  /* =====================================================================
     CUE DISPATCHER
     ===================================================================== */
  const firedCue = new Set();
  function fireMigrations(t) {
    MAP_MIGRATIONS.forEach(mig => {
      if (mig.t <= t + 0.05 && !firedCue.has('mig-' + mig.n)) {
        firedCue.add('mig-' + mig.n);
        drawMigration(mig);
      }
    });
  }
  function fireCaptions(t) {
    CAPTIONS.forEach((c, i) => {
      const key = 'cap-' + i;
      if (c.t <= t + 0.05 && !firedCue.has(key)) {
        firedCue.add(key);
        if (c.kind === 'ditname') showDitname(c.text);
        else                       showCaption(c.text);
      }
    });
  }
  function fireCardCaption(t) {
    // when a "moment" or "convergence" card becomes current, surface its caption
    const idx = currentCardIndex(t);
    const c = CARDS[idx];
    if (!c) return;
    const key = 'cardcap-' + idx;
    if (firedCue.has(key)) return;
    if (c.kind === 'moment' || c.kind === 'convergence' || c.kind === 'final') {
      firedCue.add(key);
      showCaption(c.title + ' — ' + c.desc.split('. ')[0] + '.');
    }
  }

  function reconcileBackwards(t) {
    // re-fire-able items: captions, dit names, card captions
    [...firedCue].forEach(key => {
      if (key.startsWith('cap-')) {
        const i = +key.slice(4);
        if (CAPTIONS[i] && CAPTIONS[i].t > t + 0.1) firedCue.delete(key);
      } else if (key.startsWith('cardcap-')) {
        const i = +key.slice(8);
        if (CARDS[i] && CARDS[i].t > t + 0.1) firedCue.delete(key);
      }
      // migrations don’t un-draw — they accumulate as the prompt requires
    });
  }

  /* =====================================================================
     MAIN TICK
     ===================================================================== */
  function tick() {
    const t = audio.currentTime || 0;
    timeLabel.textContent = fmtTime(t) + ' / 26:25';
    const pct = audio.duration ? (t / audio.duration) * 100 : 0;
    scrubFill.style.width = pct + '%';
    scrubKnob.style.left = pct + '%';

    updateActRange(t);
    updateEras(t);
    updateCards(t);
    updateMapFocus(t);
    fireMigrations(t);
    fireCaptions(t);
    fireCardCaption(t);

    requestAnimationFrame(tick);
  }

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
      reconcileBackwards(audio.currentTime);
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
      reconcileBackwards(audio.currentTime);
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
        reconcileBackwards(audio.currentTime);
      }
    });
    window.addEventListener('resize', () => {
      layoutEras();
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
  buildEras();
  buildCards();
  buildMapLegend();
  initMap();
  wireControls();

  // initial frame
  updateActRange(0);
  updateCards(0);
  layoutEras();
  // give Leaflet a tick to lay out
  setTimeout(() => map && map.invalidateSize(), 200);

  tick();
})();
