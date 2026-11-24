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
    eyebrow: e.hist ? `Peristiwa sejarah, ${G.year}` : `Peristiwa, ${G.year}`,
    title: esc(e.title(ctx)), html: `<p>${e.text(ctx)}</p>`,
    buttons: e.opts.map(o => ({ t: o.t, h: o.h, disabled: o.ok && !o.ok(ctx), fn: () => {
      const res = o.fx(ctx); sanitize(); checkBadges();
      if (res) { toast(res); log(res, 'info'); }
      renderAll(); scheduleSave(); setTimeout(runQueue, 30);
    } }))
  });
}

function endYear(){
  if (!G) return;
  if (G.over) return showEnding();
  if (G.queue.length) return runQueue();
  const y = G.year;
  const inc = incomeBreakdown();
  const report = processYear();
  sanitize(); renderAll(); saveNow();
  const lines = report.map(l => `<li>${esc(l)}</li>`).join('');
  modal({
    eyebrow: 'Laporan tahunan', title: `Tahun ${y} berlalu`,
    html: `<dl class="ledger">
      <div><dt>Pajak dan hasil bumi</dt><dd>${sgn(inc.income)}</dd></div>
      ${inc.tribute ? `<div><dt>Upeti kepada ${esc(facName(P().overlord || 'belanda'))}</dt><dd>${sgn(-inc.tribute)}</dd></div>` : ''}
      <div><dt>Gaji prajurit</dt><dd>${sgn(-inc.upkeep)}</dd></div>
      <div><dt>Belanja istana</dt><dd>${sgn(-inc.court)}</dd></div>
      ${inc.loans ? `<div><dt>Cicilan pinjaman</dt><dd>${sgn(-inc.loans)}</dd></div>` : ''}
      <div class="sum"><dt>Kas sekarang</dt><dd>${fmt(P().kas)} gulden</dd></div></dl>
      <ul class="report">${lines}</ul>`,
    buttons: [{ t: G.queue.length ? `Lanjut ke ${G.year}` : `Mulai tahun ${G.year}`, cls: 'primary', fn: () => runQueue() }]
  });
}

function showEnding(){
  if (!G || !G.over) return;
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

/* ---------- peta ---------- */
let LAYER = 'pemilik', TAB = 'wilayah';
for (const t of MAP.tiles) {
  t.corners = [];
  for (let i = 0; i < 6; i++) { const a = (60 * i - 30) * Math.PI / 180; t.corners.push([+(t.x + HS * Math.cos(a)).toFixed(1), +(t.y + HS * Math.sin(a)).toFixed(1)]); }
  t.pts = t.corners.map(p => p.join(',')).join(' ');
}
const EDGE = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
function hexToRgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t){ const x = hexToRgb(a), y = hexToRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function tileColor(rid, mini){
  const R = G ? G.reg[rid] : { owner: RD(rid).owner0, pros: 50, stab: 60 };
  if (!mini && LAYER === 'makmur') return R.pros < 50 ? mix('#c96a4a', '#e8d9a8', R.pros / 50) : mix('#e8d9a8', '#3f8f5a', (R.pros - 50) / 50);
  if (!mini && LAYER === 'tenteram') return R.stab < 50 ? mix('#b8433a', '#e6d39a', R.stab / 50) : mix('#e6d39a', '#3f7fa8', (R.stab - 50) / 50);
  return FACTION_DEFS[R.owner].color;
}
function mapSVG(mini){
  const own = rid => G ? G.reg[rid].owner : RD(rid).owner0;
  const W = MAP.W, H = MAP.H;
  let tiles = '', coast = '', reg = '', fac = '';
  for (const t of MAP.tiles) {
    tiles += `<polygon points="${t.pts}" fill="${tileColor(t.rid, mini)}" data-r="${t.rid}"/>`;
    t.nb.forEach((n, i) => {
      const [a, b] = EDGE[i], p = `M${t.corners[a]}L${t.corners[b]}`;
      if (!n) coast += p;
      else if (n.rid !== t.rid && (t.c * 100 + t.r) < (n.c * 100 + n.r)) { if (own(n.rid) !== own(t.rid)) fac += p; else reg += p; }
    });
  }
  let extra = '', labels = '';
  if (!mini && G) {
    const mine = new Set(myRegions()), enemies = new Set(G.wars.map(w => w.enemy));
    let mineEdge = '', selEdge = '', hatch = '';
    for (const t of MAP.tiles) {
      const o = G.reg[t.rid].owner;
      if (enemies.has(o)) hatch += `<polygon points="${t.pts}"/>`;
      t.nb.forEach((n, i) => {
        const [a, b] = EDGE[i], p = `M${t.corners[a]}L${t.corners[b]}`;
        if (mine.has(t.rid) && (!n || !mine.has(n.rid))) mineEdge += p;
        if (t.rid === G.sel && (!n || n.rid !== G.sel)) selEdge += p;
      });
    }
    extra = `<g class="hatch" fill="url(#hatch)">${hatch}</g><path class="e-mine" d="${mineEdge}"/><path class="e-sel" d="${selEdge}"/>`;
    const caps = new Set();
    for (const [fid, f] of Object.entries(G.fac)) if (f.cap && G.reg[f.cap] && G.reg[f.cap].owner === fid && fid !== G.player && D(fid).kind !== 'adat') caps.add(f.cap);
    for (const rid of caps) { const R = RD(rid); labels += `<circle class="capdot" cx="${R.lx}" cy="${R.ly}" r="2.4"/><text class="lab fac" x="${R.lx}" y="${R.ly - 5}">${esc(D(G.reg[rid].owner).short)}</text>`; }
    const cap = P().cap;
    if (cap) { const R = RD(cap); labels += `<path class="capstar" d="${star(R.lx, R.ly, 4.5)}"/>${G.sel !== cap ? `<text class="lab mine" x="${R.lx}" y="${R.ly - 6}">${esc(D(G.player).short)}</text>` : ''}`; }
    if (G.sel) { const R = RD(G.sel); labels += `<text class="lab sel" x="${R.lx}" y="${R.ly + (G.sel === cap ? -6 : 3)}">${esc(R.name)}</text>`; }
  }
  let grid = '';
  if (!mini) {
    for (const lon of [95, 100, 105, 110, 115, 120, 125, 130, 135, 140]) { const x = hexXY(lon - 95, 0)[0]; grid += `<line x1="${x}" y1="${PADY - 6}" x2="${x}" y2="${H - PADY + 6}"/><text class="tick" x="${x}" y="${PADY - 10}">${lon}° BT</text>`; }
    for (const lat of [5, 0, -5, -10]) { const y = hexXY(0, 6 - lat)[1]; grid += `<line x1="${PADX - 6}" y1="${y}" x2="${W - PADX + 6}" y2="${y}"/><text class="tick" x="${PADX - 9}" y="${y + 3}" text-anchor="end">${lat === 0 ? '0°' : Math.abs(lat) + '° ' + (lat > 0 ? 'LU' : 'LS')}</text>`; }
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="${mini ? 'minimap' : 'map'}" role="img" aria-label="Peta Nusantara">
    <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="5" fill="#9e2a22" opacity=".55"/></pattern></defs>
    <rect class="sea" width="${W}" height="${H}"/>
    <g class="grid">${grid}</g>
    <g class="tiles">${tiles}</g>
    <path class="e-reg" d="${reg}"/><path class="e-fac" d="${fac}"/><path class="e-coast" d="${coast}"/>
    ${extra}<g class="labels">${labels}</g></svg>`;
}
function star(cx, cy, r){ let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; }

/* ---------- layar awal ---------- */
function showStart(){ document.getElementById('game').hidden = true; document.getElementById('start').hidden = false; renderStart(); window.scrollTo(0, 0); }
function renderStart(){
  const el = document.getElementById('start'); if (el.hidden) return;
  const lv = levelOf(META.xp), [lo, hi] = levelRange(META.xp);
  const pct = hi ? Math.round((META.xp - lo) / (hi - lo) * 100) : 100;
  const sv = bestSave();
  const cards = PLAYABLE_ORDER.map(fid => {
    const d = D(fid), open = isUnlocked(fid);
    const regs = REGION_DEFS.filter(r => r[5] === fid);
    return `<article class="kcard ${open ? '' : 'locked'}" style="--fc:${d.color}">
      <div class="kband"></div>
      <div class="kin">
        <div class="kstatus">${d.overlord ? 'Bawahan Hindia Belanda' : 'Merdeka'}</div>
        <h3>${esc(d.name)}</h3>
        <p>${esc(d.blurb)}</p>
        <dl class="kfacts"><div><dt>Wilayah</dt><dd>${regs.length}</dd></div><div><dt>Prajurit</dt><dd>${fmt(d.army)}</dd></div><div><dt>Kas</dt><dd>${fmt(d.kas)}</dd></div></dl>
        <p class="kbonus"><b>${esc(d.bonus.n)}.</b> ${esc(d.bonus.d)}</p>
        ${open ? `<button class="btn primary" data-a="start:${fid}">Pimpin ${esc(d.short)}</button>` : `<div class="lockmsg">${esc(unlockText(fid))}</div>`}
      </div></article>`;
  }).join('');
  const badges = Object.entries(BADGES).map(([id, b]) => `<li class="badge ${META.badges[id] ? 'got' : ''}" title="${esc(b.d)}"><span class="bg">${esc(b.g)}</span><span class="bn">${esc(b.n)}</span><span class="bd">${esc(b.d)}</span></li>`).join('');
  el.innerHTML = `
    <div class="hero">
      <div class="heromap">${mapSVG(true)}</div>
      <div class="herotext">
        <div class="eyebrow">Gim strategi sejarah, 1830 sampai 1945</div>
        <h1>Takhta Nusantara</h1>
        <p>Pimpin sebuah kerajaan Nusantara di masa ketika Hindia Belanda menancapkan kuasanya dari Sabang sampai Merauke. Jaga wangsamu, kelola tanahmu, dan putuskan kapan harus berunding atau mengangkat senjata.</p>
      </div>
    </div>
    <div class="startgrid">
      <section class="profile">
        <div class="lvl"><span class="lvn">Level ${lv}</span><span class="xp">${fmt(META.xp)} XP${hi ? ` dari ${fmt(hi)}` : ''}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <p class="small">${META.games ? `${META.games} permainan selesai. Skor terbaik ${fmt(META.best)}.` : 'Belum ada permainan yang selesai. Setiap akhir permainan memberi XP sesuai skor, dan setiap lencana baru memberi 60 XP.'}</p>
        ${sv && sv.json ? `<div class="cont"><div><b>Permainan tersimpan</b><br><span class="small">${esc(D(sv.fac).name)}, tahun ${sv.year}</span></div><button class="btn primary" data-a="continue">Lanjutkan</button></div>` : ''}
        <h2 class="h3">Lencana</h2>
        <ul class="badges">${badges}</ul>
      </section>
      <section class="kingdoms">
        <h2 class="h3">Pilih kerajaan</h2>
        <div class="kgrid">${cards}</div>
        <details class="howto"><summary>Cara bermain</summary>
          <ul>
            <li>Satu giliran sama dengan satu tahun. Permainan berakhir pada 1945, atau lebih cepat bila kerajaanmu runtuh.</li>
            <li>Setiap tahun kamu mendapat 2 sampai 5 <b>titah</b>. Membangun, merekrut, menyerang, dan berdiplomasi masing-masing memakai satu titah.</li>
            <li>Klik wilayah di peta. Wilayahmu bisa dibangun, wilayah adat bisa dirangkul, dan wilayah musuh bisa diserang bila dalam jangkauan.</li>
            <li>Jaga <b>legitimasi</b> dan <b>ketenteraman</b>. Bila terlalu rendah, rakyat memberontak dan bangsawan membelot.</li>
            <li>Belanda makin kuat dari tahun ke tahun. Perang gerilya membuat mereka cepat lelah, tetapi merusak kemakmuran.</li>
            <li>Raja menua dan wafat. Didik pewarismu dan nikahkan anak-anak untuk mengikat persekutuan.</li>
            <li>Tokoh dalam permainan ini rekaan. Peristiwa besar seperti Perang Aceh, Politik Etis, dan Sumpah Pemuda diambil dari sejarah.</li>
          </ul></details>
        <p class="small savenote">${CLOUD.db ? 'Kemajuan disimpan di akunmu, jadi level dan lencana ikut terbawa di perangkat lain.' : 'Kemajuan disimpan di peramban ini.'}</p>
      </section>
    </div>`;
}

/* ---------- layar permainan ---------- */
function showGame(){ document.getElementById('start').hidden = true; document.getElementById('game').hidden = false; renderAll(); window.scrollTo(0, 0); setTimeout(runQueue, 120); }
function renderAll(){ if (!G) return; renderTop(); renderMap(); renderPanel(); }

function bar(v, cls){ return `<span class="meter ${cls || ''}"><i style="width:${clamp(v, 0, 100)}%"></i></span>`; }
function renderTop(){
  const f = P(), d = D(G.player), r = rulerC(), inc = incomeBreakdown();
  const status = G.wars.length ? `<span class="chip danger">Berperang dengan ${G.wars.map(w => esc(facName(w.enemy))).join(', ')}</span>` : f.overlord ? `<span class="chip">Bawahan ${esc(facName(f.overlord))}</span>` : `<span class="chip ok">Merdeka</span>`;
  document.getElementById('top').innerHTML = `
    <div class="crest" style="--fc:${d.color}">${esc(d.short.slice(0, 2))}</div>
    <div class="who"><div class="kn">${esc(d.name)}</div><div class="rn">${esc(charName(r))}${isRegency() ? ' (diwakili wali raja)' : ''}</div></div>
    <div class="year"><span class="yl">Tahun</span><span class="yv">${G.year}</span></div>
    <dl class="stats">
      <div><dt>Kas</dt><dd>${fmt(f.kas)} <small class="${inc.net >= 0 ? 'pos' : 'neg'}">${sgn(inc.net)}/th</small></dd></div>
      <div><dt>Prajurit</dt><dd>${fmt(f.army)} <small>mutu ${f.quality.toFixed(2).replace('.', ',')}</small></dd></div>
      <div><dt>Legitimasi</dt><dd>${Math.round(f.legit)} ${bar(f.legit)}</dd></div>
      ${f.overlord ? `<div><dt>Kemandirian</dt><dd>${Math.round(f.indep)} ${bar(f.indep, 'gold')}</dd></div>` : ''}
      ${G.year >= 1908 ? `<div><dt>Kebangsaan</dt><dd>${Math.round(G.kebangsaan)} ${bar(G.kebangsaan, 'red')}</dd></div>` : ''}
      <div><dt>Titah</dt><dd class="pips">${Array.from({ length: G.titahMax }, (_, i) => `<i class="${i < G.titah ? 'on' : ''}"></i>`).join('')}</dd></div>
    </dl>
    <div class="topact">${status}
      <button class="btn ghost" data-a="menu">Menu</button>
      <button class="btn primary" data-a="endyear">${G.over ? 'Lihat akhir kisah' : G.queue.length ? 'Lanjutkan peristiwa' : 'Akhiri tahun'}</button></div>`;
}
function renderMap(){
  document.getElementById('mapbox').innerHTML = mapSVG(false);
  document.querySelectorAll('.layers button').forEach(b => b.setAttribute('aria-pressed', b.dataset.a === 'layer:' + LAYER));
  const leg = document.getElementById('legend');
  if (LAYER === 'pemilik') {
    const shown = new Set(Object.values(G.reg).map(r => r.owner));
    leg.innerHTML = [...shown].filter(f => f !== 'adat').sort((a, b) => (b === G.player) - (a === G.player) || regionsOf(b).length - regionsOf(a).length).slice(0, 14)
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

function actRow(label, desc, cost, a, disabled){
  return `<div class="act"><div><div class="al">${esc(label)}</div><div class="ad">${esc(desc)}</div></div>
    <button class="btn sm" data-a="${a}" ${disabled ? 'disabled' : ''}>${cost != null ? `${fmt(cost)} f` : 'Titah'}</button></div>`;
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
      html += `<div class="acts">
        ${actRow('Kembangkan ekonomi', 'Bangun pasar dan irigasi. Kemakmuran +9.', COST.develop(rid), 'develop:' + rid, R.pros >= 95)}
        ${actRow('Perkuat benteng', `Benteng tingkat ${R.fort + 1}. Pertahanan +30 persen.`, COST.fort(rid), 'fort:' + rid, R.fort >= 3)}
        ${actRow('Dirikan sekolah', 'Ketenteraman +5. Setelah 1901 menumbuhkan kebangsaan.', COST.school(), 'school:' + rid, R.school >= 2)}
        ${actRow('Rekrut 500 prajurit', 'Ketenteraman wilayah -4.', COST.recruit(), 'recruit:' + rid)}
        ${actRow('Bagikan beras', 'Ketenteraman +15, legitimasi +1.', COST.relief(rid), 'relief:' + rid)}
      </div>`;
    } else {
      const reach = inReach(rid);
      const g = garrisonOf(rid);
      html += `<p class="small">Perkiraan kekuatan penjaga: sekitar ${fmt(g.n)} orang. ${reach ? 'Wilayah ini dalam jangkauan pasukanmu.' : 'Wilayah ini di luar jangkauan pasukanmu.'}</p>`;
      if (o === 'adat') {
        html += `<div class="acts">${actRow('Rangkul secara damai', 'Kirim hadiah kepada para pemuka adat. Peluang tergantung diplomasi.', COST.embrace(rid), 'embrace:' + rid, !reach)}
          ${actRow('Kirim ekspedisi', 'Taklukkan dengan pasukan. Membuat Belanda waspada.', null, 'attackOpen:' + rid, !reach || isVassal())}</div>`;
      } else if (atWarWith(o)) {
        html += `<div class="acts">${actRow('Serang wilayah ini', `Kita sedang berperang dengan ${D(o).short}.`, null, 'attackOpen:' + rid, !reach)}</div>`;
      } else if (D(o).kind === 'kerajaan') {
        html += `<p class="small">Hubungan dengan ${esc(D(o).short)}: ${Math.round(G.rel[o] ?? 0)}. Buka tab Diplomasi untuk berunding atau menyatakan perang.</p>`;
      }
    }
    html += `</section>`;
  }
  const f = P();
  const rows = myRegions().sort((a, b) => regionGross(b) - regionGross(a)).map(r => `<tr data-a="sel:${r}" class="${r === G.sel ? 'on' : ''}"><td>${esc(RD(r).name)}${r === f.cap ? ' <span class="cap">ibu kota</span>' : ''}</td><td>${fmt(G.reg[r].pop)}</td><td>${Math.round(G.reg[r].pros)}</td><td>${Math.round(G.reg[r].stab)}</td><td>${fmt(regionGross(r))}</td></tr>`).join('');
  html += `<section class="card">
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
      <p class="small">Panglima menambah kekuatan tempur. Patih menambah penghasilan dan titah. Juru runding memperbesar peluang diplomasi.</p>
      <h3>Kesetiaan bangsawan</h3><ul class="nob">${nob}</ul></section>`;
}

function tabDiplomasi(){
  const f = P();
  const B = G.japan ? 'jepang' : 'belanda';
  const rb = Math.round(G.rel[B] ?? 0);
  let bel = `<section class="card colonial"><div class="rhead"><h2>${esc(D(B).name)}</h2><span class="chip">Hubungan ${rb}</span></div>${bar((rb + 100) / 2, rb < 0 ? 'red' : 'gold')}`;
  if (atWarWith(B)) {
    const w = warWith(B);
    bel += `<p class="small">Perang sedang berlangsung. Kelelahan perang di pihak Belanda: ${Math.round(w.exh)} dari 100. Bila mencapai 100, mereka akan meminta damai.</p><div class="acts">${actRow('Ajukan perundingan damai', 'Belanda baru mau berunding bila kelelahan perang mereka tinggi.', null, 'peace:' + B)}</div>`;
  } else if (f.overlord) {
    bel += `<p class="small">Kerajaan membayar upeti ${G.japan ? '30' : '20'} persen dari penghasilan. Kemandirian: ${Math.round(f.indep)} dari 100.</p>
      <div class="acts">${actRow('Gelar upacara kebesaran', 'Legitimasi +4, kemandirian +6, hubungan -3.', COST.prestige(), 'prestige')}
      ${actRow('Nyatakan lepas dari kekuasaan asing', 'Butuh kemandirian minimal 50. Memicu perang kemerdekaan.', null, 'independenceAsk', f.indep < 50)}</div>`;
  } else if (!G.japan) {
    bel += `<p class="small">${G.year < G.truceUntil ? `Gencatan senjata berlaku hingga ${G.truceUntil}. ` : ''}Hubungan yang buruk, pasukan besar, dan wilayah yang luas membuat Belanda lebih cepat mengirim ekspedisi.</p>
      <div class="acts">${actRow('Kirim hadiah ke Batavia', 'Hubungan naik.', COST.gift(), 'gift:belanda')}
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
  return bel + `<section class="card"><h3>Kerajaan Nusantara</h3><p class="small">Persekutuan butuh hubungan minimal 40. Kerajaan bawahan Belanda tidak bisa diserang.</p><ul class="diplist">${list}</ul></section>`;
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
      <div class="acts">
        ${actRow('Latih pasukan', 'Mutu +0,05 hingga batas latihan.', COST.train(), 'train')}
        ${actRow('Beli senapan selundupan', 'Mutu +0,12. Belanda tidak senang.', COST.rifles(), 'rifles')}
        <div class="act"><div><div class="al">Bubarkan 500 prajurit</div><div class="ad">Menghemat gaji. Tidak memakai titah.</div></div><button class="btn sm ghost" data-a="disband">Bubarkan</button></div>
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
    return { t: `Kerahkan ${Math.round(p * 100)} persen (${fmt(n)} prajurit)`, h: odds, disabled: n < 100 || G.titah < 1, fn: () => { const r = playerAttack(rid, p); if (r) { sanitize(); renderAll(); scheduleSave(); modal({ eyebrow: 'Hasil pertempuran', title: r.win ? 'Kemenangan' : 'Kekalahan', html: `<p>${esc(r.msg)}</p>`, buttons: [{ t: 'Kembali', cls: 'primary' }] }); } } };
  });
  opts.push({ t: 'Batal' });
  modal({ eyebrow: R.owner === 'adat' ? 'Ekspedisi' : 'Serangan', title: `Serang ${esc(RD(rid).name)}`,
    html: `<p>Penjaga ${esc(D(R.owner).short)} di ${esc(RD(rid).name)} diperkirakan sekitar ${fmt(g.n)} orang dengan benteng tingkat ${R.fort} dan medan ${esc(TERRAIN[RD(rid).ter].n.toLowerCase())}. Serangan memakai satu titah.</p>${R.owner === 'adat' && !G.wars.length ? '<p class="small">Menaklukkan wilayah adat membuat Belanda sedikit waspada.</p>' : ''}`,
    buttons: opts });
}
function marryOpen(cid){
  const c = CH(cid);
  const facs = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !atWarWith(x) && (G.rel[x] ?? 0) >= 0);
  const duta = councilOf('duta');
  const buttons = facs.sort((a, b) => G.rel[b] - G.rel[a]).slice(0, 7).map(x => {
    const p = clamp(0.4 + G.rel[x] / 200 + stat(duta, 'dip') * 0.02, 0.15, 0.95);
    return { t: `${D(x).name}`, h: `Hubungan ${Math.round(G.rel[x])}, peluang diterima sekitar ${Math.round(p * 100)} persen. Biaya ${COST.marry()} f dan satu titah.`, disabled: G.titah < 1 || P().kas < COST.marry(), fn: () => ACT.marry(x, cid) };
  });
  buttons.push({ t: 'Batal' });
  modal({ eyebrow: 'Pernikahan politik', title: `Jodohkan ${esc(charName(c))}`,
    html: `<p>${c.g === 'P' ? 'Seorang putri yang menikah ke istana lain akan meninggalkan istana kita, tetapi mengikat hubungan erat.' : 'Seorang pangeran akan membawa istrinya tinggal di istana kita.'} Pernikahan menaikkan hubungan sebesar 25.</p>${facs.length ? '' : '<p class="small">Belum ada kerajaan dengan hubungan yang cukup baik.</p>'}`,
    buttons });
}
function rulerMarryOpen(){
  const facs = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !atWarWith(x) && (G.rel[x] ?? 0) >= 20);
  const buttons = [{ t: 'Pilih putri bangsawan sendiri', h: `Legitimasi +3, kesetiaan bangsawan +6. Biaya ${COST.marryRuler()} f dan satu titah.`, disabled: G.titah < 1 || P().kas < COST.marryRuler(), fn: () => ACT.marryRuler('lokal') }];
  for (const x of facs.slice(0, 5)) buttons.push({ t: `Pinang dari ${D(x).name}`, h: `Hubungan +20. Biaya ${COST.marryRuler()} f dan satu titah.`, disabled: G.titah < 1 || P().kas < COST.marryRuler(), fn: () => ACT.marryRuler('asing', x) });
  buttons.push({ t: 'Batal' });
  modal({ eyebrow: 'Istana', title: 'Carikan pendamping', html: '<p>Pendamping memberi keturunan bagi wangsa dan bisa mempererat hubungan dengan kerajaan lain.</p>', buttons });
}
function confirmBox(title, text, yes, fn){ modal({ title: esc(title), html: `<p>${esc(text)}</p>`, buttons: [{ t: yes, cls: 'primary', fn }, { t: 'Batal' }] }); }
function menuOpen(){
  modal({ eyebrow: 'Menu', title: 'Takhta Nusantara', html: `<p>Permainan tersimpan otomatis setiap akhir tahun.</p>`, buttons: [
    { t: 'Simpan dan kembali ke layar utama', fn: () => { saveNow(); G = null; showStart(); } },
    { t: 'Turun takhta dan akhiri permainan', h: 'Permainan berakhir sekarang dan skor dihitung.', fn: () => confirmBox('Turun takhta?', 'Permainan ini akan berakhir dan tidak bisa dilanjutkan.', 'Ya, akhiri', () => { G.over = { kind: 'turun', text: `${charName(rulerC())} turun takhta pada ${G.year}. Kisah ${D(G.player).name} berakhir di sini.` }; showEnding(); }) },
    { t: 'Tutup' }
  ] });
}

/* ---------- kendali ---------- */
function handleAction(a){
  const [cmd, x, y] = a.split(':');
  switch (cmd) {
    case 'start': newGame(x); sanitize(); saveNow(); showGame(); break;
    case 'continue': { const s = bestSave(); if (s && s.json) { try { G = JSON.parse(s.json); showGame(); } catch (e) { toast('Simpanan rusak dan tidak bisa dibuka.'); } } break; }
    case 'endyear': if (!modalOpen) endYear(); break;
    case 'menu': menuOpen(); break;
    case 'sel': G.sel = x; TAB = 'wilayah'; renderMap(); renderPanel(); break;
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
  if (el && !el.disabled) { handleAction(el.dataset.a); return; }
  const poly = e.target.closest('#mapbox [data-r]');
  if (poly && G) handleAction('sel:' + poly.dataset.r);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-c]'); if (!el || !G) return;
  const [cmd, x] = el.dataset.c.split(':');
  if (cmd === 'edu') { CH(+x).edu = el.value || null; toast('Pendidikan dipilih.'); }
  if (cmd === 'seat') { const id = el.value ? +el.value : null; for (const s of Object.keys(P().council)) if (P().council[s] === id) P().council[s] = null; P().council[x] = id; resetTitahKeep(); }
  if (cmd === 'heir') { P().heir = +el.value; toast('Pewaris takhta ditetapkan.'); }
  renderAll(); scheduleSave();
});
function resetTitahKeep(){ const used = G.titahMax - G.titah; resetTitah(); G.titah = Math.max(0, G.titahMax - used); }
document.addEventListener('pointerover', e => {
  const p = e.target.closest && e.target.closest('#mapbox [data-r]'); const cap = document.getElementById('hover');
  if (!cap || !G) return;
  if (!p) return;
  const rid = p.dataset.r, R = G.reg[rid];
  cap.textContent = `${RD(rid).name} · ${R.owner === G.player ? 'wilayahmu' : D(R.owner).short} · ${fmt(R.pop)} ribu jiwa`;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOpen) {
    const cancel = [...document.querySelectorAll('#modal .opt')].find(b => b.textContent.trim().startsWith('Batal') || b.textContent.trim().startsWith('Tutup'));
    if (cancel) cancel.click();
  }
});

/* ---------- mulai ---------- */
function boot(data){
  mergeMeta(LS.get('tn_meta'));
  let restored = false;
  if (data && data.G) { try { G = JSON.parse(data.G); restored = true; } catch (e) { G = null; } }
  if (restored) showGame(); else showStart();
  initCloud();
}
try { window.claude?.hot?.snapshot?.(() => ({ G: G && !G.over ? JSON.stringify(G) : null })); } catch (e) {}
try {
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
} catch (e) { boot({}); }
