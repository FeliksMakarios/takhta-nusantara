'use strict';
/* Takhta Nusantara: tampilan, penyimpanan, dan kendali */

/* ---------- penyimpanan ---------- */
const META = { xp: 0, badges: {}, games: 0, best: 0 };
const LS = {
  get(k){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} }
};
const CLOUD = { db: null, uid: null, chain: Promise.resolve(), save: null };
function mergeMeta(m){
  if (!m) return;
  META.xp = Math.max(META.xp, m.xp || 0); META.games = Math.max(META.games, m.games || 0); META.best = Math.max(META.best, m.best || 0);
  for (const [k, v] of Object.entries(m.badges || {})) if (!META.badges[k]) META.badges[k] = v;
}
function saveMeta(){ LS.set('tn_meta', META); cloudWrite('profile', { xp: META.xp, games: META.games, best: META.best, badges: { ...META.badges } }); }
function cloudWrite(doc, data){
  if (!CLOUD.db) return;
  CLOUD.chain = CLOUD.chain.then(() => CLOUD.db.collection('data/users/' + CLOUD.uid).doc(doc).set(data)).catch(() => {});
}
function localSave(){ return LS.get('tn_save'); }
function bestSave(){ const a = localSave(), b = CLOUD.save; if (a && b) return (b.t || 0) > (a.t || 0) ? b : a; return a || b || null; }
function saveNow(){
  if (!G || G.over) return;
  const s = { t: Date.now(), fac: G.player, year: G.year, json: JSON.stringify(G) };
  LS.set('tn_save', s); CLOUD.save = s; cloudWrite('save', s);
}
let saveTimer = null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 1500); }
function clearSave(){ LS.del('tn_save'); CLOUD.save = null; cloudWrite('save', { t: Date.now(), empty: true }); }

async function initCloud(){
  try {
    if (!window.claude || !window.claude.use) return;
    const timeout = new Promise(r => setTimeout(() => r(null), 10000));
    const [db, user] = await Promise.race([Promise.all([window.claude.use('db'), window.claude.use('user')]), timeout.then(() => [null, null])]);
    if (!db || !user) return;
    const uid = await user.id(); if (!uid) return;
    const col = db.collection('data/users/' + uid);
    const [p, s] = await Promise.all([col.doc('profile').get(), col.doc('save').get()]);
    CLOUD.db = db; CLOUD.uid = uid;
    if (p.exists) mergeMeta(p.data());
    if (s.exists) { const d = s.data(); if (d && d.json) CLOUD.save = d; }
    LS.set('tn_meta', META);
    if (!G) renderStart();
  } catch (e) { /* tetap jalan dengan penyimpanan lokal */ }
}

/* ---------- level dan kunci ---------- */
function levelOf(xp){ let l = 1; for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; }
function levelRange(xp){ const l = levelOf(xp); return [LEVELS[l - 1] ?? 0, LEVELS[l] ?? null]; }
function isUnlocked(fid){ const u = D(fid).unlock; if (!u) return true; if (u.level) return levelOf(META.xp) >= u.level; if (u.badge) return !!META.badges[u.badge]; return true; }
function unlockText(fid){ const u = D(fid).unlock; if (!u) return ''; if (u.level) return `Terbuka di level ${u.level}`; return `Raih lencana ${BADGES[u.badge].n}`; }

/* ---------- toast ---------- */
function toast(msg, good){
  if (!msg) return;
  const el = document.createElement('div'); el.className = 'toast' + (good ? ' good' : ''); el.textContent = msg;
  const box = document.getElementById('toasts'); box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3900);
}

/* ---------- modal ---------- */
let modalOpen = false;
function modal({ eyebrow, title, html, buttons, wide }){
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="mcard${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mtitle">
    ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
    <h2 id="mtitle">${title}</h2>
    <div class="mbody">${html || ''}</div>
    <div class="mopts">${buttons.map((b, i) => `<button class="opt ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>
      <span class="ot">${esc(b.t)}</span>${b.h ? `<span class="oh">${esc(b.h)}</span>` : ''}</button>`).join('')}</div></div>`;
  m.hidden = false; modalOpen = true;
  m.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
    const b = buttons[+btn.dataset.i];
    closeModal();
    if (b.fn) b.fn();
  }));
  const first = m.querySelector('.opt:not([disabled])'); if (first) first.focus();
}
function closeModal(){ const m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; modalOpen = false; }

function sanitize(){
  for (const R of Object.values(G.reg)) { R.stab = clamp(R.stab, 0, 100); R.pros = clamp(R.pros, 5, 100); R.pop = Math.max(3, R.pop); }
  for (const c of Object.values(G.chars)) c.loy = clamp(c.loy, 0, 100);
  const f = P(); f.army = Math.max(0, Math.round(f.army)); f.kas = Math.max(0, f.kas); f.legit = clamp(f.legit, 0, 100);
  for (const k of Object.keys(G.rel)) G.rel[k] = clamp(G.rel[k], -100, 100);
}

function runQueue(){
  if (modalOpen || !G) return;
  const q = G.queue.shift();
  if (!q) { if (G.over) showEnding(); return; }
  const e = EVENTS[q.ev];
  if (!e) return runQueue();
  const ctx = q.ctx || {};
  if (ctx.rid && G.reg[ctx.rid] && G.reg[ctx.rid].owner !== G.player && ['pemberontakan','panen','paceklik','kolera','bajaklaut','gempa','tambang'].includes(q.ev)) return runQueue();
  if (ctx.cid && (!CH(ctx.cid) || !CH(ctx.cid).alive || CH(ctx.cid).out)) return runQueue();
  modal({
    eyebrow: (e.hist ? 'Peristiwa sejarah, ' : q.ev === 'kabar' ? 'Kabar, ' : 'Peristiwa, ') + dateStr(),
    title: esc(e.title(ctx)), html: `<p>${e.text(ctx)}</p>`,
    buttons: e.opts.map(o => ({ t: o.t, h: o.h, disabled: o.ok && !o.ok(ctx), fn: () => {
      const res = o.fx(ctx); sanitize(); checkBadges();
      if (res) { toast(res); log(res, 'info'); }
      renderAll(); scheduleSave(); setTimeout(runQueue, 30);
    } }))
  });
}

/* ---------- jalannya waktu ---------- */
const SPEEDS = [0, 1500, 600, 250, 90, 35];
let loopTimer = null, pointerHeld = false;
function setSpeed(s){ if (!G || G.over) return; G.speed = s; if (s) G.lastSpeed = s; renderTop(); schedule(); if (!s) scheduleSave(); }
function togglePause(){ if (!G) return; setSpeed(G.speed ? 0 : (G.lastSpeed || 1)); }
function schedule(){ clearTimeout(loopTimer); loopTimer = null; if (!G || !G.speed || G.over) return; loopTimer = setTimeout(step, SPEEDS[G.speed]); }
function panelBusy(){ const a = document.activeElement; return a && a.tagName === 'SELECT' && a.closest('#tabbody'); }
function step(){
  loopTimer = null;
  if (!G || !G.speed || G.over) return;
  if (modalOpen || pointerHeld) { loopTimer = setTimeout(step, 200); return; }
  const ov = G.ownVer, m = G.month, np = G.proj.length;
  advanceDay(); sanitize();
  renderTop();
  if (G.ownVer !== ov || G.month !== m || G.proj.length !== np) { renderMap(); if (!panelBusy()) renderPanel(); }
  else if ((TAB === 'wilayah' || TAB === 'militer') && (G.speed <= 2 || G.t % 7 === 0)) { if (!panelBusy()) renderPanel(); }
  if (G.queue.length || G.over) runQueue();
  schedule();
}
document.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
document.addEventListener('pointerup', () => { setTimeout(() => { pointerHeld = false; }, 0); }, true);
document.addEventListener('pointercancel', () => { pointerHeld = false; }, true);
document.addEventListener('visibilitychange', () => { if (document.hidden && G && G.speed) { setSpeed(0); saveNow(); } });

function showEnding(){
  if (!G || !G.over) return;
  clearTimeout(loopTimer); G.speed = 0;
  const before = PLAYABLE_ORDER.filter(isUnlocked);
  const lvBefore = levelOf(META.xp);
  const score = finalScore();
  if (!G.flags.scored) {
    G.flags.scored = 1;
    if (G.over.kind === 'selesai' && myRegions().length) earn('fajar');
    META.xp += score; META.games += 1; META.best = Math.max(META.best, score); saveMeta(); clearSave();
  }
  const after = PLAYABLE_ORDER.filter(isUnlocked);
  const newly = after.filter(x => !before.includes(x));
  const lv = levelOf(META.xp);
  const badges = G.badgesGame.map(b => `<span class="chip gold">${esc(BADGES[b].n)}</span>`).join(' ');
  modal({
    eyebrow: G.over.kind === 'selesai' ? 'Akhir kisah' : 'Kerajaan runtuh', title: esc(D(G.player).name), wide: true,
    html: `<p>${esc(G.over.text)}</p>
      <dl class="ledger">
        <div><dt>Tahun bertahan</dt><dd>${G.year - START_YEAR}</dd></div>
        <div><dt>Wilayah di akhir</dt><dd>${myRegions().length}</dd></div>
        <div><dt>Pertempuran dimenangkan</dt><dd>${G.stats.wins}</dd></div>
        <div><dt>Semangat kebangsaan</dt><dd>${Math.round(G.kebangsaan)}</dd></div>
        <div class="sum"><dt>Skor dan XP diperoleh</dt><dd>+${fmt(score)}</dd></div></dl>
      ${badges ? `<p class="small">Lencana dalam permainan ini: ${badges}</p>` : ''}
      <p class="small">Level ${lvBefore}${lv > lvBefore ? ` naik menjadi <b>level ${lv}</b>` : ''}. Total XP ${fmt(META.xp)}.</p>
      ${newly.length ? `<p><b>Kerajaan baru terbuka:</b> ${newly.map(x => esc(D(x).name)).join(', ')}.</p>` : ''}`,
    buttons: [{ t: 'Kembali ke layar utama', cls: 'primary', fn: () => { G = null; showStart(); } }]
  });
}

/* ---------- peta (canvas, bisa digeser dan diperbesar) ---------- */
let LAYER = 'pemilik', TAB = 'wilayah';
const EDGE = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
const CORNER = Array.from({ length: 6 }, (_, i) => { const a = (60 * i - 30) * Math.PI / 180; return [HS * Math.cos(a), HS * Math.sin(a)]; });
function hexToRgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t){ const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function tileColor(rid, mini){
  const R = (G && !mini) ? G.reg[rid] : { owner: RD(rid).owner0, pros: 50, stab: 60 };
  if (!mini && LAYER === 'makmur') return R.pros < 50 ? mix('#c96a4a', '#e8d9a8', R.pros / 50) : mix('#e8d9a8', '#3f8f5a', (R.pros - 50) / 50);
  if (!mini && LAYER === 'tenteram') return R.stab < 50 ? mix('#b8433a', '#e6d39a', R.stab / 50) : mix('#e6d39a', '#3f7fa8', (R.stab - 50) / 50);
  return FACTION_DEFS[R.owner].color;
}
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function hexPath(path, t){ path.moveTo(t.x + CORNER[0][0], t.y + CORNER[0][1]); for (let i = 1; i < 6; i++) path.lineTo(t.x + CORNER[i][0], t.y + CORNER[i][1]); path.closePath(); }
function seg(path, t, i){ const [a, b] = EDGE[i]; path.moveTo(t.x + CORNER[a][0], t.y + CORNER[a][1]); path.lineTo(t.x + CORNER[b][0], t.y + CORNER[b][1]); }

/* gambar dasar peta (dipakai juga untuk peta kecil di layar awal) */
function paintTiles(ctx, view, mini){
  const groups = new Map();
  const vis = t => !view || (t.x > view[0] - HS && t.x < view[2] + HS && t.y > view[1] - HS && t.y < view[3] + HS);
  for (const t of MAP.tiles) { if (!vis(t)) continue; const col = tileColor(t.rid, mini); let p = groups.get(col); if (!p) { p = new Path2D(); groups.set(col, p); } hexPath(p, t); }
  const out = new Path2D(); for (const t of MAP.outside) if (vis(t)) hexPath(out, t);
  ctx.fillStyle = cssVar('--luar') || '#9aa0ab'; ctx.fill(out);
  for (const [col, p] of groups) { ctx.fillStyle = col; ctx.fill(p); ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.stroke(p); }
  return vis;
}
function drawMini(canvas){
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d'), k = Math.max(w / MAP.W, h / MAP.H) * 1.02;
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w - MAP.W * k) / 2, dpr * (h - MAP.H * k) / 2);
  ctx.fillStyle = cssVar('--sea'); ctx.fillRect(-100, -100, MAP.W + 200, MAP.H + 200);
  paintTiles(ctx, null, true);
}

const MV = {
  cv: null, ctx: null, k: 1, tx: 0, ty: 0, w: 0, h: 0, dpr: 1, queued: false, hover: null, ptrs: new Map(), drag: null, hatch: null,
  init(){
    if (this.cv) return;
    const box = document.getElementById('mapbox');
    this.cv = document.createElement('canvas'); this.cv.setAttribute('aria-label', 'Peta Nusantara. Seret untuk menggeser, gulir untuk memperbesar.');
    box.prepend(this.cv); this.ctx = this.cv.getContext('2d');
    new ResizeObserver(() => this.resize()).observe(box);
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); this.drag = { x: e.offsetX, y: e.offsetY, moved: false, pinch: this.ptrs.size > 1 ? this.pinchState() : null }; });
    cv.addEventListener('pointermove', e => {
      if (this.ptrs.has(e.pointerId)) {
        const prev = this.ptrs.get(e.pointerId); this.ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
        if (this.ptrs.size > 1) { const s = this.pinchState(), p = this.drag.pinch; if (p) { this.zoomAt(s.cx, s.cy, s.d / p.d); this.tx += s.cx - p.cx; this.ty += s.cy - p.cy; this.clampView(); this.request(); } this.drag.pinch = s; this.drag.moved = true; return; }
        const dx = e.offsetX - prev[0], dy = e.offsetY - prev[1];
        if (!this.drag.moved && Math.hypot(e.offsetX - this.drag.x, e.offsetY - this.drag.y) < 5) return;
        this.drag.moved = true; cv.classList.add('dragging');
        this.tx += dx; this.ty += dy; this.clampView(); this.request();
      } else this.setHover(this.tileAt(e.offsetX, e.offsetY));
    });
    const end = e => {
      const wasClick = this.drag && !this.drag.moved && this.ptrs.size === 1;
      this.ptrs.delete(e.pointerId); cv.classList.remove('dragging');
      if (wasClick && e.type === 'pointerup') { const t = this.tileAt(e.offsetX, e.offsetY); if (t && t.rid && G) handleAction('sel:' + t.rid); }
      if (!this.ptrs.size) this.drag = null; else if (this.drag) this.drag.pinch = this.ptrs.size > 1 ? this.pinchState() : null;
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!this.ptrs.size) this.setHover(null); });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))); }, { passive: false });
  },
  pinchState(){ const [a, b] = [...this.ptrs.values()]; return { d: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2 }; },
  fitK(){ return Math.min(this.w / MAP.W, this.h / MAP.H); },
  resize(){
    const box = this.cv.parentElement, w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    const first = !this.w; this.dpr = window.devicePixelRatio || 1;
    const cx = this.w ? (this.w / 2 - this.tx) / this.k : MAP.W / 2, cy = this.h ? (this.h / 2 - this.ty) / this.k : MAP.H / 2;
    this.w = w; this.h = h; this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(h * this.dpr);
    if (first) { this.k = this.fitK(); this.tx = (w - MAP.W * this.k) / 2; this.ty = (h - MAP.H * this.k) / 2; }
    else { this.tx = w / 2 - cx * this.k; this.ty = h / 2 - cy * this.k; }
    this.clampView(); this.draw();
  },
  zoomAt(sx, sy, f){
    const k0 = this.k, k = clamp(k0 * f, this.fitK() * 0.85, 9);
    this.tx = sx - (sx - this.tx) * k / k0; this.ty = sy - (sy - this.ty) * k / k0; this.k = k;
    this.clampView(); this.request();
  },
  zoomBy(f){ this.zoomAt(this.w / 2, this.h / 2, f); },
  fitAll(){ this.k = this.fitK(); this.tx = (this.w - MAP.W * this.k) / 2; this.ty = (this.h - MAP.H * this.k) / 2; this.request(); },
  focusFaction(){
    if (!G) return; const mine = myRegions(); if (!mine.length) return this.fitAll();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of mine) { const b = RD(r).bb; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
    const pad = 140, k = clamp(Math.min(this.w / (x1 - x0 + pad * 2), this.h / (y1 - y0 + pad * 2)), this.fitK(), 4.5);
    this.k = k; this.tx = this.w / 2 - (x0 + x1) / 2 * k; this.ty = this.h / 2 - (y0 + y1) / 2 * k; this.clampView(); this.request();
  },
  clampView(){
    const mw = MAP.W * this.k, mh = MAP.H * this.k, m = 60;
    this.tx = mw + 2 * m < this.w ? (this.w - mw) / 2 : clamp(this.tx, this.w - mw - m, m);
    this.ty = mh + 2 * m < this.h ? (this.h - mh) / 2 : clamp(this.ty, this.h - mh - m, m);
  },
  tileAt(sx, sy){ return MAP.cellAt((sx - this.tx) / this.k, (sy - this.ty) / this.k); },
  setHover(t){
    const rid = t && t.rid ? t.rid : null;
    if (rid === this.hover) return; this.hover = rid;
    const cap = document.getElementById('hover');
    if (cap && G) cap.textContent = rid ? `${RD(rid).name} · ${G.reg[rid].owner === G.player ? 'wilayahmu' : D(G.reg[rid].owner).short} · ${fmt(G.reg[rid].pop)} ribu jiwa` : (t && t.out ? 'Di luar wilayah permainan' : 'Seret untuk menggeser, gulir untuk memperbesar.');
    this.request();
  },
  request(){ if (this.queued || !this.cv) return; this.queued = true; requestAnimationFrame(() => { this.queued = false; this.draw(); }); },
  hatchPattern(){
    if (!this.hatch) { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.strokeStyle = 'rgba(158,42,34,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-2, 10); x.lineTo(10, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(6, 10); x.lineTo(10, 6); x.stroke(); this.hatch = this.ctx.createPattern(c, 'repeat'); }
    return this.hatch;
  },
  draw(){
    if (!this.cv || !this.w || !G) return;
    const ctx = this.ctx, k = this.k, d = this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.fillStyle = cssVar('--sea'); ctx.fillRect(0, 0, this.w, this.h);
    const view = [-this.tx / k, -this.ty / k, (this.w - this.tx) / k, (this.h - this.ty) / k];
    // garis bujur dan lintang
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath();
    const lons = [95,100,105,110,115,120,125,130,135,140], lats = [5,0,-5,-10];
    for (const lon of lons) { const x = MAP.lonX(lon) * k + this.tx; ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
    for (const lat of lats) { const y = MAP.latY(lat) * k + this.ty; ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.setTransform(d * k, 0, 0, d * k, d * this.tx, d * this.ty);
    const vis = paintTiles(ctx, view, false);
    const mine = new Set(myRegions()), enemies = new Set(G.wars.map(w => w.enemy));
    const own = rid => G.reg[rid].owner;
    const coast = new Path2D(), reg = new Path2D(), fac = new Path2D(), mineP = new Path2D(), sel = new Path2D(), hov = new Path2D(), hatch = new Path2D(), hovFill = new Path2D();
    for (const t of MAP.tiles) {
      if (!vis(t)) continue;
      if (enemies.has(own(t.rid))) hexPath(hatch, t);
      if (t.rid === this.hover) hexPath(hovFill, t);
      for (let i = 0; i < 6; i++) {
        const n = t.nb[i];
        if (!n || n.out) seg(coast, t, i);
        else if (n.rid !== t.rid && (t.c * 1000 + t.r) < (n.c * 1000 + n.r)) seg(own(n.rid) !== own(t.rid) ? fac : reg, t, i);
        if (mine.has(t.rid) && (!n || !mine.has(n.rid))) seg(mineP, t, i);
        if (t.rid === G.sel && (!n || n.rid !== G.sel)) seg(sel, t, i);
      }
    }
    if (enemies.size) { const p = this.hatchPattern(); p.setTransform(new DOMMatrix().scale(1 / k)); ctx.fillStyle = p; ctx.fill(hatch); }
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill(hovFill);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (k > this.fitK() * 1.6) { ctx.strokeStyle = cssVar('--regline'); ctx.lineWidth = 0.8 / k; ctx.stroke(reg); }
    ctx.strokeStyle = cssVar('--coast'); ctx.lineWidth = 1.1 / k; ctx.stroke(coast);
    ctx.strokeStyle = cssVar('--facline'); ctx.lineWidth = 1.5 / k; ctx.stroke(fac);
    ctx.strokeStyle = cssVar('--gold'); ctx.lineWidth = 2.6 / k; ctx.stroke(mineP);
    ctx.strokeStyle = cssVar('--sel'); ctx.lineWidth = 2.2 / k; ctx.setLineDash([5 / k, 3 / k]); ctx.stroke(sel); ctx.setLineDash([]);
    // label di ruang layar supaya tetap tajam
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const S = (x, y) => [x * k + this.tx, y * k + this.ty];
    ctx.font = `600 10px ${cssVar('--f-mono')}`; ctx.fillStyle = cssVar('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const lon of lons) { const x = MAP.lonX(lon) * k + this.tx; if (x > 20 && x < this.w - 20) ctx.fillText(`${lon}° BT`, x, 6); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const lat of lats) { const y = MAP.latY(lat) * k + this.ty; if (y > 20 && y < this.h - 20) ctx.fillText(lat === 0 ? '0°' : `${Math.abs(lat)}° ${lat > 0 ? 'LU' : 'LS'}`, 6, y - 7); }
    const boxes = [];
    const label = (txt, x, y, font, color, force) => {
      ctx.font = font; const w = ctx.measureText(txt).width, b = [x - w / 2 - 2, y - 8, x + w / 2 + 2, y + 8];
      if (x < -50 || x > this.w + 50 || y < -20 || y > this.h + 20) return;
      if (!force && boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return;
      boxes.push(b); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = cssVar('--halo'); ctx.strokeText(txt, x, y); ctx.fillStyle = color; ctx.fillText(txt, x, y);
    };
    const ink = cssVar('--labink'), disp = cssVar('--f-display'), body = cssVar('--f-body');
    for (const p of G.proj) if (p.rid) { const R = RD(p.rid), [x, y] = S(R.lx, R.ly); ctx.beginPath(); ctx.arc(x + 9, y + 7, 3.5, 0, 7); ctx.fillStyle = cssVar('--gold'); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = cssVar('--halo'); ctx.stroke(); }
    const capR = P().cap ? RD(P().cap) : null;
    if (capR) { const [x, y] = S(capR.lx, capR.ly); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 2.6 : 6; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); ctx.fillStyle = cssVar('--gold'); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = cssVar('--halo'); ctx.stroke(); }
    if (G.sel) { const R = RD(G.sel), [x, y] = S(R.lx, R.ly); label(R.name, x, y + 14, `700 12.5px ${body}`, ink, true); }
    for (const [fid, f] of Object.entries(G.fac)) {
      if (!f.cap || !G.reg[f.cap] || G.reg[f.cap].owner !== fid || D(fid).kind === 'adat') continue;
      const R = RD(f.cap), [x, y] = S(R.lx, R.ly);
      if (fid !== G.player) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fillStyle = ink; ctx.fill(); }
      label(D(fid).short, x, y - 11, `${fid === G.player ? 13 : 11.5}px ${disp}`, ink, fid === G.player);
    }
    if (k > this.fitK() * 2.2) for (const R of Object.values(MAP.regions)) { if (R.id === G.sel) continue; const [x, y] = S(R.lx, R.ly); label(R.name, x, y + 12, `600 11px ${body}`, ink, false); }
  }
};

/* ---------- layar awal ---------- */
function showStart(){ document.getElementById('game').hidden = true; document.getElementById('start').hidden = false; renderStart(); window.scrollTo(0, 0); }
function secOpen(id, def){ const s = LS.get('tn_sec') || {}; return s[id] ?? def; }
function kingdomCard(fid){
  const d = D(fid), open = isUnlocked(fid);
  const regs = REGION_DEFS.filter(r => r[5] === fid);
  return `<article class="kcard ${open ? '' : 'locked'}" style="--fc:${d.color}">
    <div class="kband"></div>
    <div class="kin">
      <h4>${esc(d.name)}</h4>
      <p>${esc(d.blurb)}</p>
      <dl class="kfacts"><div><dt>Wilayah</dt><dd>${regs.length}</dd></div><div><dt>Prajurit</dt><dd>${fmt(d.army)}</dd></div><div><dt>Kas</dt><dd>${fmt(d.kas)}</dd></div></dl>
      <p class="kbonus"><b>${esc(d.bonus.n)}.</b> ${esc(d.bonus.d)}</p>
      ${open ? `<button class="btn primary" data-a="start:${fid}">Pimpin ${esc(d.short)}</button>` : `<div class="lockmsg">${esc(unlockText(fid))}</div>`}
    </div></article>`;
}
function renderStart(){
  const el = document.getElementById('start'); if (el.hidden) return;
  const lv = levelOf(META.xp), [lo, hi] = levelRange(META.xp);
  const pct = hi ? Math.round((META.xp - lo) / (hi - lo) * 100) : 100;
  const sv = bestSave();
  const free = PLAYABLE_ORDER.filter(f => !D(f).overlord), vassal = PLAYABLE_ORDER.filter(f => D(f).overlord);
  const badges = Object.entries(BADGES).map(([id, b]) => `<li class="badge ${META.badges[id] ? 'got' : ''}" title="${esc(b.d)}"><span class="bg">${esc(b.g)}</span><span class="bn">${esc(b.n)}</span><span class="bd">${esc(b.d)}</span></li>`).join('');
  el.innerHTML = `
    <div class="hero">
      <canvas class="heromap" aria-hidden="true"></canvas>
      <div class="herotext">
        <div class="eyebrow">Gim strategi sejarah, 1830 sampai 1945</div>
        <h1>Takhta Nusantara</h1>
        <p>Pimpin sebuah kerajaan Nusantara di masa ketika Hindia Belanda menancapkan kuasanya dari Sabang sampai Merauke.</p>
      </div>
    </div>
    <div class="startgrid">
      <aside class="profile">
        <div class="lvl"><span class="lvn">Level ${lv}</span><span class="xp">${fmt(META.xp)} XP${hi ? ` dari ${fmt(hi)}` : ''}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <p class="small">${META.games ? `${META.games} permainan selesai. Skor terbaik ${fmt(META.best)}.` : 'Belum ada permainan yang selesai. Setiap akhir permainan memberi XP sesuai skor, dan setiap lencana baru memberi 60 XP.'}</p>
        ${sv && sv.json ? `<div class="cont"><div><b>Permainan tersimpan</b><br><span class="small">${esc(D(sv.fac).name)}, tahun ${sv.year}</span></div><button class="btn primary" data-a="continue">Lanjutkan</button></div>` : ''}
        <h2 class="sect">Lencana</h2>
        <ul class="badges">${badges}</ul>
      </aside>
      <div class="sections">
        <details class="sec" data-sec="tentang" ${secOpen('tentang', false) ? 'open' : ''}>
          <summary><h2 class="sect">Tentang Takhta Nusantara</h2></summary>
          <div class="secbody prose">
            <p class="lead">Tahun 1830. Asap Perang Jawa baru saja reda. Pangeran Diponegoro diasingkan ke Manado, dan di Batavia, Gubernur Jenderal van den Bosch menyiapkan Tanam Paksa yang akan mengubah wajah Nusantara.</p>
            <p>Di luar Jawa, ratusan kerajaan masih berdiri. Kesultanan Aceh menguasai jalur lada di ujung Sumatra. Para arumpone Bone memimpin armada Bugis yang berlayar sampai Singapura. Dewa Agung Klungkung masih dihormati sebagai raja tertinggi Bali. Sultan-sultan Ternate dan Tidore mewarisi kejayaan rempah yang dulu diperebutkan bangsa-bangsa Eropa.</p>
            <p>Satu abad ke depan, satu per satu kerajaan itu akan diuji. Ada yang memilih berunding, ada yang bertempur sampai titik darah penghabisan, ada yang bertahan dengan siasat. Kapal uap, senapan baru, dan perjanjian pendek membuat Belanda makin kuat dari tahun ke tahun. Namun dari sekolah-sekolah dan surau, tumbuh gagasan baru tentang satu bangsa yang kelak bernama Indonesia.</p>
            <p>Dalam <b>Takhta Nusantara</b>, kamu memegang takhta salah satu kerajaan itu dari 1 Januari 1830 sampai 17 Agustus 1945. Bangun negerimu, jaga wangsamu dari perebutan takhta, pilih kawan dan lawan, dan tentukan sendiri bagaimana kerajaanmu menyambut fajar kemerdekaan.</p>
            <p class="small">Peristiwa besar dalam permainan ini diambil dari sejarah. Begitu kamu mengambil keputusan, jalan cerita bisa berbeda dari sejarah yang sebenarnya.</p>
          </div>
        </details>
        <details class="sec" data-sec="cara" ${secOpen('cara', false) ? 'open' : ''}>
          <summary><h2 class="sect">Cara Bermain</h2></summary>
          <div class="secbody rules">
            <section><h3>Tujuan</h3><p>Bertahan hingga 17 Agustus 1945 dengan kerajaan yang masih berdiri. Skor dihitung dari jumlah wilayah, penduduk, kas, legitimasi, semangat kebangsaan, kemenangan, lencana, dan status kerajaan. Kerajaan merdeka mendapat nilai lebih besar daripada kerajaan bawahan.</p></section>
            <section><h3>Waktu</h3><p>Waktu berjalan sendiri, hari demi hari. Pada kecepatan 1x, satu hari berlalu dalam 1,5 detik. Tekan spasi untuk jeda dan tombol 1 sampai 5 untuk mengatur kecepatan. Waktu berhenti sendiri ketika ada peristiwa penting.</p></section>
            <section><h3>Peta</h3><p>Seret peta untuk menggeser, gunakan roda mouse atau cubit untuk memperbesar, lalu klik wilayah untuk melihat isinya. Wilayahmu bergaris emas, ibu kotamu bertanda bintang, dan wilayah musuh yang sedang berperang denganmu diberi arsir merah.</p></section>
            <section><h3>Wibawa</h3><p>Setiap tindakan memakai wibawa, yang terkumpul sedikit demi sedikit setiap bulan. Raja dan patih yang cakap mengelola membuat wibawa bertambah lebih cepat. Wibawa paling banyak 60, jadi gunakan sebelum terbuang.</p></section>
            <section><h3>Pembangunan</h3><p>Pasar dan irigasi, benteng, sekolah, dan perekrutan butuh waktu berbulan-bulan. Biayanya dicicil setiap hari. Bila kas habis, pembangunan tertunda sampai kas terisi lagi. Satu wilayah hanya bisa mengerjakan satu proyek pada satu waktu.</p></section>
            <section><h3>Ekonomi</h3><p>Penghasilan datang setiap bulan dari penduduk, kemakmuran, dan harga hasil bumi yang naik turun mengikuti sejarah. Pajak berat menambah kas tetapi membuat rakyat dan bangsawan gelisah. Kerajaan bawahan wajib menyetor upeti.</p></section>
            <section><h3>Istana dan wangsa</h3><p>Raja menua dan wafat. Tetapkan pewaris, didik anak-anak sejak usia 6 tahun, dan nikahkan mereka untuk mempererat hubungan dengan kerajaan lain. Isi dewan kerajaan dengan orang yang cakap, dan awasi kesetiaan bangsawan agar tidak membelot.</p></section>
            <section><h3>Diplomasi dan perang</h3><p>Kirim hadiah, ajak bersekutu, atau nyatakan perang terhadap kerajaan tetangga. Serangan hanya bisa menjangkau wilayah yang dekat dengan wilayahmu. Wilayah adat bisa dirangkul dengan damai atau ditaklukkan.</p></section>
            <section><h3>Hindia Belanda</h3><p>Belanda makin kuat setiap tahun dan akan mengirim ultimatum. Kamu bisa tunduk, menyerahkan wilayah, atau melawan. Dalam perang, benteng harus dihancurkan dulu sebelum wilayah bisa direbut, dan perang gerilya membuat Belanda cepat lelah. Bila kelelahan perang mereka mencapai 100, mereka meminta damai.</p></section>
            <section><h3>Legitimasi dan ketenteraman</h3><p>Jaga keduanya tetap tinggi. Ketenteraman yang rendah memicu pemberontakan, dan legitimasi yang rendah membuat bangsawan gelisah dan pergantian takhta berbahaya.</p></section>
            <section><h3>Level dan lencana</h3><p>Setiap akhir permainan memberi XP sesuai skor, dan setiap lencana baru memberi 60 XP. Naik level dan raih lencana tertentu untuk membuka kerajaan baru.</p></section>
          </div>
        </details>
        <details class="sec" data-sec="pilih" ${secOpen('pilih', true) ? 'open' : ''}>
          <summary><h2 class="sect">Pilih Kerajaan</h2></summary>
          <div class="secbody">
            <h3 class="grp">Merdeka</h3>
            <p class="small">Bebas berperang dan berdiplomasi, tetapi menjadi sasaran ekspedisi Belanda.</p>
            <div class="kgrid">${free.map(kingdomCard).join('')}</div>
            <h3 class="grp">Bawahan Hindia Belanda</h3>
            <p class="small">Aman dari ekspedisi selama patuh, tetapi wajib membayar upeti dan tidak boleh berperang. Naikkan kemandirian bila ingin lepas.</p>
            <div class="kgrid">${vassal.map(kingdomCard).join('')}</div>
          </div>
        </details>
        <p class="small savenote">${CLOUD.db ? 'Kemajuan disimpan di akunmu, jadi level dan lencana ikut terbawa di perangkat lain.' : 'Kemajuan disimpan di peramban ini.'}</p>
      </div>
    </div>`;
  el.querySelectorAll('details.sec').forEach(dt => dt.addEventListener('toggle', () => { const s = LS.get('tn_sec') || {}; s[dt.dataset.sec] = dt.open; LS.set('tn_sec', s); }));
  requestAnimationFrame(() => drawMini(el.querySelector('.heromap')));
}

/* ---------- layar permainan ---------- */
function showGame(){ document.getElementById('start').hidden = true; document.getElementById('game').hidden = false; window.scrollTo(0, 0); MV.init(); renderAll(); requestAnimationFrame(() => { MV.resize(); MV.focusFaction(); }); setTimeout(runQueue, 120); schedule(); }
function renderAll(){ if (!G) return; renderTop(); renderMap(); renderPanel(); }

function bar(v, cls){ return `<span class="meter ${cls || ''}"><i style="width:${clamp(v, 0, 100)}%"></i></span>`; }
function renderTop(){
  const f = P(), d = D(G.player), r = rulerC(), inc = incomeBreakdown();
  const status = G.wars.length ? `<span class="chip danger">Berperang dengan ${G.wars.map(w => esc(facName(w.enemy))).join(', ')}</span>` : f.overlord ? `<span class="chip">Bawahan ${esc(facName(f.overlord))}</span>` : `<span class="chip ok">Merdeka</span>`;
  const run = G.speed > 0;
  document.getElementById('top').innerHTML = `
    <div class="crest" style="--fc:${d.color}">${esc(d.short.slice(0, 2))}</div>
    <div class="who"><div class="kn">${esc(d.name)}</div><div class="rn">${esc(charName(r))}${isRegency() ? ' (diwakili wali raja)' : ''}</div></div>
    <div class="clock"><span class="yl">${run ? 'Waktu berjalan' : 'Waktu berhenti'}</span><span class="dv">${dateStr()}</span></div>
    <div class="speed" role="group" aria-label="Kecepatan waktu">
      <button class="play ${run ? '' : 'go'}" data-a="pause" aria-label="${run ? 'Jeda' : 'Jalan'}">${run ? 'Jeda' : 'Jalan'}</button>
      ${[1,2,3,4,5].map(n => `<button data-a="speed:${n}" aria-pressed="${G.speed === n}" aria-label="Kecepatan ${n}">${n}x</button>`).join('')}
    </div>
    <dl class="stats">
      <div><dt>Kas</dt><dd>${fmt(f.kas)} <small class="${inc.net >= 0 ? 'pos' : 'neg'}">${sgn(inc.net / 12)}/bln</small></dd></div>
      <div><dt>Prajurit</dt><dd>${fmt(f.army)} <small>mutu ${f.quality.toFixed(2).replace('.', ',')}</small></dd></div>
      <div><dt>Wibawa</dt><dd>${Math.floor(G.wib)} ${bar(G.wib / WIB_MAX * 100, 'gold')} <small>+${String(Math.round(wibRate() * 10) / 10).replace('.', ',')}/bln</small></dd></div>
      <div><dt>Legitimasi</dt><dd>${Math.round(f.legit)} ${bar(f.legit)}</dd></div>
      ${f.overlord ? `<div><dt>Kemandirian</dt><dd>${Math.round(f.indep)} ${bar(f.indep, 'gold')}</dd></div>` : ''}
      ${G.year >= 1908 ? `<div><dt>Kebangsaan</dt><dd>${Math.round(G.kebangsaan)} ${bar(G.kebangsaan, 'red')}</dd></div>` : ''}
    </dl>
    <div class="topact">${status}
      ${G.over ? '<button class="btn primary" data-a="ending">Lihat akhir kisah</button>' : ''}
      <button class="btn ghost" data-a="menu">Menu</button></div>`;
}
function renderMap(){
  MV.request();
  document.querySelectorAll('.layers button').forEach(b => b.setAttribute('aria-pressed', b.dataset.a === 'layer:' + LAYER));
  const leg = document.getElementById('legend');
  if (LAYER === 'pemilik') {
    const shown = new Set(Object.values(G.reg).map(r => r.owner));
    leg.innerHTML = [...shown].filter(f => f !== 'adat').sort((a, b) => (b === G.player) - (a === G.player) || regionsOf(b).length - regionsOf(a).length).slice(0, 12)
      .map(f => `<span class="lg"><i style="background:${D(f).color}"></i>${esc(D(f).short)}</span>`).join('') + `<span class="lg"><i style="background:${D('adat').color}"></i>Wilayah adat</span>`;
  } else {
    leg.innerHTML = `<span class="lg ramp ${LAYER}"><i></i>${LAYER === 'makmur' ? 'Miskin sampai makmur' : 'Bergolak sampai tenteram'}</span>`;
  }
}

function renderPanel(){
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.a === 'tab:' + TAB));
  const body = document.getElementById('tabbody');
  body.innerHTML = ({ wilayah: tabWilayah, istana: tabIstana, diplomasi: tabDiplomasi, militer: tabMiliter, kronik: tabKronik })[TAB]();
}

function actRow(label, desc, cost, a, disabled, meta){
  return `<div class="act"><div><div class="al">${esc(label)}</div><div class="ad">${esc(desc)}</div>${meta ? `<div class="am">${esc(meta)}</div>` : ''}</div>
    <button class="btn sm" data-a="${a}" ${disabled ? 'disabled' : ''}>${cost != null && cost > 0 ? `${fmt(cost)} f` : 'Lakukan'}</button></div>`;
}
const pmeta = (k, rid) => `${durStr(PROJ[k].w(rid) * 7)}, ${PROJ[k].wib} wibawa, biaya dicicil`;
function projBox(pj){
  const left = pj.days - pj.done;
  return `<div class="proj"><div class="pjh"><b>${esc(PROJ[pj.k].n)}</b><span class="small">${pj.stall ? 'Tertunda karena kas kosong' : 'Sisa ' + durStr(left)}</span></div>
    ${bar(pj.done / pj.days * 100, 'gold')}<button class="btn sm ghost" data-a="cancel:${G.proj.indexOf(pj)}">Batalkan</button></div>`;
}
function tabWilayah(){
  const rid = G.sel, R = rid && G.reg[rid], d = rid && RD(rid);
  let html = '';
  if (R) {
    const mine = R.owner === G.player, o = R.owner;
    const forts = `<span class="pips sm">${[0,1,2].map(i => `<i class="${i < R.fort ? 'on' : ''}"></i>`).join('')}</span>`;
    html += `<section class="card">
      <div class="rhead"><h2>${esc(d.name)}</h2><span class="chip" style="--fc:${D(o).color}"><i class="dot"></i>${esc(mine ? 'Wilayahmu' : D(o).short)}</span></div>
      <dl class="facts">
        <div><dt>Penduduk</dt><dd>${fmt(R.pop)} ribu jiwa</dd></div>
        <div><dt>Hasil utama</dt><dd>${esc(COMMODITIES[d.com].n)}</dd></div>
        <div><dt>Medan</dt><dd>${esc(TERRAIN[d.ter].n)}</dd></div>
        <div><dt>Benteng</dt><dd>${forts}</dd></div>
        ${mine ? `<div><dt>Sekolah</dt><dd>${R.school ? R.school + ' buah' : 'Belum ada'}</dd></div><div><dt>Hasil per tahun</dt><dd>${fmt(regionGross(rid))} f</dd></div>` : ''}
        <div class="wide"><dt>Kemakmuran</dt><dd>${Math.round(R.pros)} ${bar(R.pros, 'green')}</dd></div>
        <div class="wide"><dt>Ketenteraman</dt><dd>${Math.round(R.stab)} ${bar(R.stab, 'blue')}</dd></div>
      </dl>`;
    if (mine) {
      const pj = projOf(rid);
      html += `${pj ? projBox(pj) : ''}<div class="acts">
        ${actRow('Kembangkan ekonomi', 'Bangun pasar dan irigasi. Kemakmuran +9.', COST.develop(rid), 'develop:' + rid, pj || R.pros >= 95, pmeta('develop', rid))}
        ${actRow('Perkuat benteng', `Benteng tingkat ${R.fort + 1}. Pertahanan +30 persen.`, COST.fort(rid), 'fort:' + rid, pj || R.fort >= 3, pmeta('fort', rid))}
        ${actRow('Dirikan sekolah', 'Ketenteraman +5. Setelah 1901 menumbuhkan kebangsaan.', COST.school(), 'school:' + rid, pj || R.school >= 2, pmeta('school', rid))}
        ${actRow('Rekrut 500 prajurit', 'Ketenteraman wilayah -4.', COST.recruit(), 'recruit:' + rid, pj, pmeta('recruit', rid))}
        ${actRow('Bagikan beras', 'Ketenteraman +15, legitimasi +1. Langsung terasa.', COST.relief(rid), 'relief:' + rid, false, `Segera, ${WIBAWA.relief} wibawa`)}
      </div>`;
    } else {
      const reach = inReach(rid);
      const g = garrisonOf(rid);
      html += `<p class="small">Perkiraan kekuatan penjaga: sekitar ${fmt(g.n)} orang. ${reach ? 'Wilayah ini dalam jangkauan pasukanmu.' : 'Wilayah ini di luar jangkauan pasukanmu.'}</p>`;
      if (o === 'adat') {
        const pj = projOf(rid);
        html += `${pj ? projBox(pj) : ''}<div class="acts">${actRow('Rangkul secara damai', 'Kirim utusan dan hadiah kepada para pemuka adat. Peluang tergantung diplomasi.', COST.embrace(rid), 'embrace:' + rid, !reach || pj, pmeta('embrace', rid))}
          ${actRow('Kirim ekspedisi', 'Taklukkan dengan pasukan. Membuat Belanda waspada.', null, 'attackOpen:' + rid, !reach || isVassal(), `Segera, ${WIBAWA.attack} wibawa`)}</div>`;
      } else if (atWarWith(o)) {
        html += `<div class="acts">${actRow('Serang wilayah ini', `Kita sedang berperang dengan ${D(o).short}.`, null, 'attackOpen:' + rid, !reach, `Segera, ${WIBAWA.attack} wibawa`)}</div>`;
      } else if (D(o).kind === 'kerajaan') {
        html += `<p class="small">Hubungan dengan ${esc(D(o).short)}: ${Math.round(G.rel[o] ?? 0)}. Buka tab Diplomasi untuk berunding atau menyatakan perang.</p>`;
      }
    }
    html += `</section>`;
  }
  const f = P();
  const rows = myRegions().sort((a, b) => regionGross(b) - regionGross(a)).map(r => `<tr data-a="sel:${r}" class="${r === G.sel ? 'on' : ''}"><td>${esc(RD(r).name)}${r === f.cap ? ' <span class="cap">ibu kota</span>' : ''}</td><td>${fmt(G.reg[r].pop)}</td><td>${Math.round(G.reg[r].pros)}</td><td>${Math.round(G.reg[r].stab)}</td><td>${fmt(regionGross(r))}</td></tr>`).join('');
  const projs = G.proj.map(p => `<li data-a="${p.rid ? 'sel:' + p.rid : 'tab:militer'}"><span>${esc(PROJ[p.k].n)}${p.rid ? ' di ' + esc(RD(p.rid).name) : ''}</span><span class="small">${p.stall ? 'tertunda' : 'sisa ' + durStr(p.days - p.done)}</span>${bar(p.done / p.days * 100, 'gold')}</li>`).join('');
  html += `<section class="card">
    <h3>Pembangunan berjalan</h3>
    ${projs ? `<ul class="projlist">${projs}</ul>` : '<p class="small">Belum ada pembangunan. Pilih wilayahmu di peta untuk memulai.</p>'}
    <h3>Pajak kerajaan</h3>
    <div class="seg">${TAX.map((t, i) => `<button data-a="tax:${i}" aria-pressed="${f.tax === i}">${t.n}</button>`).join('')}</div>
    <p class="small">${['Pajak ringan menaikkan ketenteraman dan kesetiaan bangsawan.','Pajak sedang adalah jalan tengah.','Pajak berat menambah kas tetapi rakyat dan bangsawan gelisah.'][f.tax]}</p>
    <h3>Wilayahmu</h3>
    <div class="tscroll"><table class="tbl"><thead><tr><th>Wilayah</th><th>Penduduk</th><th>Makmur</th><th>Tenteram</th><th>Hasil</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
  return html;
}

function personCard(c, role){
  if (!c) return '';
  return `<div class="person"><div class="pn">${esc(charName(c))}</div><div class="pr">${esc(role)}, ${age(c)} tahun</div>
    <div class="pstats"><span title="Kepemimpinan perang">Perang ${stat(c, 'mil')}</span><span title="Diplomasi">Diplomasi ${stat(c, 'dip')}</span><span title="Tata kelola">Kelola ${stat(c, 'adm')}</span></div>
    ${c.tr.length ? `<div class="traits">${c.tr.map(t => `<span class="chip ${GOOD_TRAITS.includes(t) ? 'ok' : 'warn'}" title="${esc(TRAITS[t].d)}">${esc(TRAITS[t].n)}</span>`).join('')}</div>` : ''}</div>`;
}
function tabIstana(){
  const f = P(), r = rulerC(), sp = CH(r?.sp), h = heirC();
  const fam = family().filter(c => c.id !== f.ruler).sort((a, b) => a.b - b.b);
  const heirOpts = fam.map(c => `<option value="${c.id}" ${h && h.id === c.id ? 'selected' : ''}>${esc(charName(c))} (${age(c)})</option>`).join('');
  const famRows = fam.map(c => {
    const a = age(c);
    const edu = (a >= 6 && a < 16) ? `<label class="small">Pendidikan <select data-c="edu:${c.id}"><option value="">Belum dipilih</option>
      ${[['agama','Pesantren dan agama'],['militer','Keprajuritan'],['praja','Tata praja'],['eropa','Sekolah Belanda']].map(([v, n]) => `<option value="${v}" ${c.edu === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : '';
    const can = a >= 15 && a <= 32 && !c.sp;
    return `<li><div><b>${esc(charName(c))}</b> <span class="small">${c.g === 'L' ? 'laki-laki' : 'perempuan'}, ${a} tahun${c.sp && CH(c.sp)?.alive ? ', menikah' : ''}</span></div>
      ${c.tr.length ? `<div class="traits">${c.tr.map(t => `<span class="chip ${GOOD_TRAITS.includes(t) ? 'ok' : 'warn'}">${esc(TRAITS[t].n)}</span>`).join('')}</div>` : ''}
      ${edu}${can ? `<button class="btn sm ghost" data-a="marryOpen:${c.id}">Jodohkan</button>` : ''}</li>`;
  }).join('');
  const cands = councilCandidates();
  const seat = (k, label, st) => `<div class="seat"><div class="sl">${label}</div><select data-c="seat:${k}"><option value="">Kosong</option>
    ${cands.map(c => `<option value="${c.id}" ${f.council[k] === c.id ? 'selected' : ''}>${esc(charName(c))} (${st} ${stat(c, st === 'Perang' ? 'mil' : st === 'Kelola' ? 'adm' : 'dip')})</option>`).join('')}</select></div>`;
  const nob = nobles().sort((a, b) => a.loy - b.loy).map(c => `<li><span>${esc(charName(c))} <span class="small">${age(c)} tahun</span></span><span class="loy">${Math.round(c.loy)} ${bar(c.loy, c.loy < 25 ? 'red' : 'gold')}</span></li>`).join('');
  return `<section class="card">
      <h3>Penguasa</h3>
      ${personCard(r, 'Penguasa')}
      ${sp && sp.alive ? personCard(sp, 'Pendamping') : (r && age(r) >= 16 ? `<div class="act"><div><div class="al">Penguasa belum memiliki pendamping</div><div class="ad">Tanpa pendamping, wangsa tidak punya keturunan baru.</div></div><button class="btn sm" data-a="rulerMarryOpen">Carikan</button></div>` : '')}
      <h3>Pewaris takhta</h3>
      ${fam.length ? `<select data-c="heir" class="full">${heirOpts}</select>` : '<p class="small">Tidak ada anggota wangsa yang bisa mewarisi takhta.</p>'}
      ${h ? `<p class="small">${esc(charName(h))} akan naik takhta bila penguasa wafat.${age(h) < 16 ? ' Karena belum dewasa, kerajaan akan diperintah wali raja.' : ''}</p>` : ''}
    </section>
    <section class="card"><h3>Wangsa</h3><ul class="fam">${famRows || '<li class="small">Belum ada anggota wangsa lain.</li>'}</ul></section>
    <section class="card"><h3>Dewan kerajaan</h3>
      ${seat('panglima', 'Panglima perang', 'Perang')}${seat('patih', 'Patih (tata kelola)', 'Kelola')}${seat('duta', 'Juru runding', 'Diplomasi')}
      <p class="small">Panglima menambah kekuatan tempur. Patih menambah penghasilan dan wibawa. Juru runding memperbesar peluang diplomasi.</p>
      <h3>Kesetiaan bangsawan</h3><ul class="nob">${nob}</ul></section>`;
}

function tabDiplomasi(){
  const f = P();
  const B = G.japan ? 'jepang' : 'belanda';
  const rb = Math.round(G.rel[B] ?? 0);
  let bel = `<section class="card colonial"><div class="rhead"><h2>${esc(D(B).name)}</h2><span class="chip">Hubungan ${rb}</span></div>${bar((rb + 100) / 2, rb < 0 ? 'red' : 'gold')}`;
  if (atWarWith(B)) {
    const w = warWith(B);
    bel += `<p class="small">Perang sedang berlangsung. Kelelahan perang di pihak Belanda: ${Math.round(w.exh)} dari 100. Bila mencapai 100, mereka akan meminta damai.</p><div class="acts">${actRow('Ajukan perundingan damai', 'Belanda baru mau berunding bila kelelahan perang mereka tinggi.', null, 'peace:' + B, false, `${WIBAWA.peace} wibawa`)}</div>`;
  } else if (f.overlord) {
    bel += `<p class="small">Kerajaan membayar upeti ${G.japan ? '30' : '20'} persen dari penghasilan. Kemandirian: ${Math.round(f.indep)} dari 100.</p>
      <div class="acts">${actRow('Gelar upacara kebesaran', 'Legitimasi +4, kemandirian +6, hubungan -3.', COST.prestige(), 'prestige', false, `${WIBAWA.prestige} wibawa`)}
      ${actRow('Nyatakan lepas dari kekuasaan asing', 'Butuh kemandirian minimal 50. Memicu perang kemerdekaan.', null, 'independenceAsk', f.indep < 50, `${WIBAWA.independence} wibawa`)}</div>`;
  } else if (!G.japan) {
    bel += `<p class="small">${G.year < G.truceUntil ? `Gencatan senjata berlaku hingga ${G.truceUntil}. ` : ''}Hubungan yang buruk, pasukan besar, dan wilayah yang luas membuat Belanda lebih cepat mengirim ekspedisi.</p>
      <div class="acts">${actRow('Kirim hadiah ke Batavia', 'Hubungan naik.', COST.gift(), 'gift:belanda', false, `${WIBAWA.gift} wibawa`)}
      ${actRow('Tanda tangani perjanjian pendek', 'Menjadi bawahan Belanda. Aman dari ekspedisi, tetapi wajib membayar upeti.', null, 'vassalAsk')}</div>`;
  }
  bel += '</section>';
  const list = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x))
    .sort((a, b) => (G.rel[b] ?? 0) - (G.rel[a] ?? 0)).map(x => {
      const rel = Math.round(G.rel[x] ?? 0), war = atWarWith(x), al = G.allies.includes(x), ov = G.fac[x].overlord;
      return `<li class="dip" style="--fc:${D(x).color}">
        <div class="dh"><i class="dot"></i><b>${esc(D(x).name)}</b></div>
        <div class="small">${esc(G.fac[x].rulerName || '')}${ov ? `. Bawahan ${esc(facName(ov))}` : ''}. ${regionsOf(x).length} wilayah, sekitar ${fmt(G.fac[x].army)} prajurit.</div>
        <div class="drow"><span class="chip ${war ? 'danger' : al ? 'ok' : ''}">${war ? 'Perang' : al ? 'Sekutu' : 'Hubungan ' + rel}</span>
        ${war ? `<button class="btn sm" data-a="peace:${x}">Ajukan damai</button>` : `<button class="btn sm ghost" data-a="gift:${x}">Hadiah ${COST.gift()} f</button>${!al ? `<button class="btn sm ghost" data-a="ally:${x}" ${rel < 40 ? 'disabled' : ''}>Bersekutu</button>` : ''}<button class="btn sm ghost danger" data-a="warAsk:${x}" ${isVassal() || ov ? 'disabled' : ''}>Perang</button>`}</div></li>`;
    }).join('');
  return bel + `<section class="card"><h3>Kerajaan Nusantara</h3><p class="small">Hadiah memakai ${WIBAWA.gift} wibawa, ajakan bersekutu ${WIBAWA.ally}, pernyataan perang ${WIBAWA.war}. Persekutuan butuh hubungan minimal 40. Kerajaan bawahan Belanda tidak bisa diserang.</p><ul class="diplist">${list}</ul></section>`;
}

function tabMiliter(){
  const f = P(), mp = manpower(), pg = councilOf('panglima');
  const wars = G.wars.map(w => {
    const targets = regionsOf(w.enemy).filter(inReach);
    return `<div class="war"><div class="rhead"><b>Perang melawan ${esc(D(w.enemy).name)}</b><span class="chip danger">sejak ${w.start}</span></div>
      <p class="small">Menang ${w.wins} kali, kalah ${w.losses} kali.${w.enemy === 'belanda' ? ` Kelelahan perang Belanda ${Math.round(w.exh)} dari 100.` : ''}</p>
      ${targets.length ? `<div class="targets">${targets.map(t => `<button class="btn sm ghost" data-a="attackOpen:${t}">Serang ${esc(RD(t).name)}</button>`).join('')}</div>` : '<p class="small">Tidak ada wilayah musuh dalam jangkauan.</p>'}</div>`;
  }).join('');
  return `<section class="card">
      <h3>Angkatan perang</h3>
      <dl class="facts">
        <div><dt>Prajurit</dt><dd>${fmt(f.army)}</dd></div>
        <div><dt>Batas tenaga</dt><dd>${fmt(mp)}</dd></div>
        <div><dt>Mutu</dt><dd>${f.quality.toFixed(2).replace('.', ',')}</dd></div>
        <div><dt>Gaji per tahun</dt><dd>${fmt(f.army * 0.02)} f</dd></div>
        <div><dt>Panglima</dt><dd>${pg ? esc(pg.n) : 'Kosong'}</dd></div>
        <div><dt>Jangkauan laut</dt><dd>${reachRange()} petak</dd></div>
      </dl>
      <p class="small">Mutu pasukan Belanda saat ini ${G.fac.belanda.quality.toFixed(2).replace('.', ',')}. Ekspedisi mereka berkekuatan sekitar ${fmt(expSize())} serdadu dan terus bertambah.</p>
      <h3>Siasat perang</h3>
      <div class="seg"><button data-a="mode:terbuka" aria-pressed="${G.mode === 'terbuka'}">Pertempuran terbuka</button><button data-a="mode:gerilya" aria-pressed="${G.mode === 'gerilya'}">Perang gerilya</button></div>
      <p class="small">${G.mode === 'gerilya' ? 'Gerilya: pertahanan jauh lebih kuat dan Belanda cepat lelah, tetapi kemakmuran dan ketenteraman menurun selama perang.' : 'Pertempuran terbuka: tidak ada hukuman ekonomi, tetapi pertahanan biasa saja.'}</p>
      ${armyProj() ? projBox(armyProj()) : ''}
      <div class="acts">
        ${actRow('Latih pasukan', 'Mutu +0,05 hingga batas latihan.', COST.train(), 'train', !!armyProj(), pmeta('train'))}
        ${actRow('Beli senapan selundupan', 'Mutu +0,12. Belanda tidak senang.', COST.rifles(), 'rifles', !!armyProj(), pmeta('rifles'))}
        <div class="act"><div><div class="al">Bubarkan 500 prajurit</div><div class="ad">Menghemat gaji. Tidak memakai wibawa.</div></div><button class="btn sm ghost" data-a="disband">Bubarkan</button></div>
      </div></section>
    <section class="card"><h3>Perang</h3>${wars || '<p class="small">Kerajaan sedang damai.</p>'}</section>`;
}
function tabKronik(){
  return `<section class="card"><h3>Kronik kerajaan</h3><ol class="log">${G.log.slice(0, 120).map(l => `<li class="${l.k}"><span class="ly">${l.y}</span><span>${esc(l.t)}</span></li>`).join('')}</ol></section>`;
}

/* ---------- dialog tindakan ---------- */
function attackOpen(rid){
  const f = P(), g = garrisonOf(rid), R = G.reg[rid];
  const dm = TERRAIN[RD(rid).ter].def * (1 + 0.3 * R.fort);
  const opts = [0.25, 0.5, 0.75, 1].map(p => {
    const n = Math.round(f.army * p), ratio = (n * f.quality * battleMod()) / Math.max(1, g.n * g.q * dm);
    const odds = ratio > 1.35 ? 'Peluang besar' : ratio > 1.05 ? 'Peluang cukup' : ratio > 0.85 ? 'Seimbang' : 'Peluang kecil';
    return { t: `Kerahkan ${Math.round(p * 100)} persen (${fmt(n)} prajurit)`, h: odds, disabled: n < 100 || G.wib < WIBAWA.attack, fn: () => { const r = playerAttack(rid, p); if (r) { sanitize(); renderAll(); scheduleSave(); modal({ eyebrow: 'Hasil pertempuran', title: r.win ? 'Kemenangan' : 'Kekalahan', html: `<p>${esc(r.msg)}</p>`, buttons: [{ t: 'Kembali', cls: 'primary' }] }); } } };
  });
  opts.push({ t: 'Batal' });
  modal({ eyebrow: R.owner === 'adat' ? 'Ekspedisi' : 'Serangan', title: `Serang ${esc(RD(rid).name)}`,
    html: `<p>Penjaga ${esc(D(R.owner).short)} di ${esc(RD(rid).name)} diperkirakan sekitar ${fmt(g.n)} orang dengan benteng tingkat ${R.fort} dan medan ${esc(TERRAIN[RD(rid).ter].n.toLowerCase())}. Serangan memakai ${WIBAWA.attack} wibawa dan terjadi saat itu juga.</p>${R.owner === 'adat' && !G.wars.length ? '<p class="small">Menaklukkan wilayah adat membuat Belanda sedikit waspada.</p>' : ''}`,
    buttons: opts });
}
function marryOpen(cid){
  const c = CH(cid);
  const facs = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !atWarWith(x) && (G.rel[x] ?? 0) >= 0);
  const duta = councilOf('duta');
  const buttons = facs.sort((a, b) => G.rel[b] - G.rel[a]).slice(0, 7).map(x => {
    const p = clamp(0.4 + G.rel[x] / 200 + stat(duta, 'dip') * 0.02, 0.15, 0.95);
    return { t: `${D(x).name}`, h: `Hubungan ${Math.round(G.rel[x])}, peluang diterima sekitar ${Math.round(p * 100)} persen. Biaya ${COST.marry()} f dan ${WIBAWA.marry} wibawa.`, disabled: G.wib < WIBAWA.marry || P().kas < COST.marry(), fn: () => ACT.marry(x, cid) };
  });
  buttons.push({ t: 'Batal' });
  modal({ eyebrow: 'Pernikahan politik', title: `Jodohkan ${esc(charName(c))}`,
    html: `<p>${c.g === 'P' ? 'Seorang putri yang menikah ke istana lain akan meninggalkan istana kita, tetapi mengikat hubungan erat.' : 'Seorang pangeran akan membawa istrinya tinggal di istana kita.'} Pernikahan menaikkan hubungan sebesar 25.</p>${facs.length ? '' : '<p class="small">Belum ada kerajaan dengan hubungan yang cukup baik.</p>'}`,
    buttons });
}
function rulerMarryOpen(){
  const facs = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !atWarWith(x) && (G.rel[x] ?? 0) >= 20);
  const buttons = [{ t: 'Pilih putri bangsawan sendiri', h: `Legitimasi +3, kesetiaan bangsawan +6. Biaya ${COST.marryRuler()} f dan ${WIBAWA.marryRuler} wibawa.`, disabled: G.wib < WIBAWA.marryRuler || P().kas < COST.marryRuler(), fn: () => ACT.marryRuler('lokal') }];
  for (const x of facs.slice(0, 5)) buttons.push({ t: `Pinang dari ${D(x).name}`, h: `Hubungan +20. Biaya ${COST.marryRuler()} f dan ${WIBAWA.marryRuler} wibawa.`, disabled: G.wib < WIBAWA.marryRuler || P().kas < COST.marryRuler(), fn: () => ACT.marryRuler('asing', x) });
  buttons.push({ t: 'Batal' });
  modal({ eyebrow: 'Istana', title: 'Carikan pendamping', html: '<p>Pendamping memberi keturunan bagi wangsa dan bisa mempererat hubungan dengan kerajaan lain.</p>', buttons });
}
function confirmBox(title, text, yes, fn){ modal({ title: esc(title), html: `<p>${esc(text)}</p>`, buttons: [{ t: yes, cls: 'primary', fn }, { t: 'Batal' }] }); }
function menuOpen(){
  setSpeed(0); saveNow();
  modal({ eyebrow: 'Menu', title: 'Takhta Nusantara', html: `<p>Waktu dihentikan. Permainan tersimpan otomatis setiap pergantian tahun dan setiap kali waktu dijeda.</p>`, buttons: [
    { t: 'Simpan dan kembali ke layar utama', fn: () => { saveNow(); clearTimeout(loopTimer); G = null; showStart(); } },
    { t: 'Turun takhta dan akhiri permainan', h: 'Permainan berakhir sekarang dan skor dihitung.', fn: () => confirmBox('Turun takhta?', 'Permainan ini akan berakhir dan tidak bisa dilanjutkan.', 'Ya, akhiri', () => { G.over = { kind: 'turun', text: `${charName(rulerC())} turun takhta pada ${G.year}. Kisah ${D(G.player).name} berakhir di sini.` }; showEnding(); }) },
    { t: 'Tutup' }
  ] });
}

/* ---------- kendali ---------- */
function handleAction(a){
  const [cmd, x, y] = a.split(':');
  switch (cmd) {
    case 'start': newGame(x); sanitize(); saveNow(); showGame(); break;
    case 'continue': { const s = bestSave(); if (s && s.json) { try { const g = JSON.parse(s.json); if (!g.v || g.v < 3) { clearSave(); renderStart(); toast('Simpanan dari versi lama tidak cocok dengan sistem waktu yang baru. Silakan mulai permainan baru.'); break; } G = g; G.speed = 0; showGame(); } catch (e) { toast('Simpanan rusak dan tidak bisa dibuka.'); } } break; }
    case 'pause': togglePause(); break;
    case 'speed': setSpeed(+x); break;
    case 'ending': showEnding(); break;
    case 'menu': menuOpen(); break;
    case 'sel': G.sel = x; TAB = 'wilayah'; renderMap(); renderPanel(); break;
    case 'zoom': if (x === 'in') MV.zoomBy(1.4); else if (x === 'out') MV.zoomBy(1 / 1.4); else if (x === 'all') MV.fitAll(); else MV.focusFaction(); break;
    case 'tab': TAB = x; renderPanel(); break;
    case 'layer': LAYER = x; renderMap(); break;
    case 'mode': G.mode = x; renderPanel(); break;
    case 'tax': ACT.tax(+x); break;
    case 'attackOpen': attackOpen(x); break;
    case 'marryOpen': marryOpen(+x); break;
    case 'rulerMarryOpen': rulerMarryOpen(); break;
    case 'warAsk': confirmBox(`Nyatakan perang terhadap ${D(x).short}?`, `Hubungan akan rusak dan Belanda makin curiga. Peluang menang tergantung pasukan dan jangkauan.`, 'Nyatakan perang', () => ACT.war(x)); break;
    case 'vassalAsk': confirmBox('Tunduk kepada Belanda?', 'Kerajaan akan membayar upeti 20 persen dan kehilangan kebebasan berperang, tetapi aman dari ekspedisi.', 'Tanda tangani', () => ACT.vassalSign()); break;
    case 'independenceAsk': confirmBox('Nyatakan lepas?', 'Ini berarti perang dengan penguasa kolonial. Pastikan pasukan dan benteng siap.', 'Nyatakan lepas', () => ACT.independence()); break;
    default: if (ACT[cmd]) ACT[cmd](x, y);
  }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el && !el.disabled) handleAction(el.dataset.a);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]'); if (!el || !G) return;
  const [cmd, x] = el.dataset.c.split(':');
  if (cmd === 'edu') { CH(+x).edu = el.value || null; toast('Pendidikan dipilih.'); }
  if (cmd === 'seat') { const id = el.value ? +el.value : null; for (const s of Object.keys(P().council)) if (P().council[s] === id) P().council[s] = null; P().council[x] = id; }
  if (cmd === 'heir') { P().heir = +el.value; toast('Pewaris takhta ditetapkan.'); }
  renderAll(); scheduleSave();
});
document.addEventListener('keydown', e => {
  const typing = e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  if (G && !modalOpen && !typing && !document.getElementById('game').hidden) {
    if (e.code === 'Space') { e.preventDefault(); togglePause(); return; }
    if (['1','2','3','4','5'].includes(e.key)) { setSpeed(+e.key); return; }
    if (e.key === '+' || e.key === '=') { MV.zoomBy(1.3); return; }
    if (e.key === '-') { MV.zoomBy(1 / 1.3); return; }
  }
  if (e.key === 'Escape' && modalOpen) {
    const cancel = [...document.querySelectorAll('#modal .opt')].find(b => b.textContent.trim().startsWith('Batal') || b.textContent.trim().startsWith('Tutup'));
    if (cancel) cancel.click();
  }
});

/* ---------- mulai ---------- */
function boot(data){
  mergeMeta(LS.get('tn_meta'));
  let restored = false;
  if (data && data.G) { try { G = JSON.parse(data.G); restored = G.v >= 3; if (restored) G.speed = 0; else G = null; } catch (e) { G = null; } }
  if (restored) showGame(); else showStart();
  initCloud();
}
try { window.claude?.hot?.snapshot?.(() => ({ G: G && !G.over ? JSON.stringify(G) : null })); } catch (e) {}
try {
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
} catch (e) { boot({}); }
