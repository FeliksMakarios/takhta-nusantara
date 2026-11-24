'use strict';
/* Takhta Nusantara: mesin permainan */

/* ---------- alat bantu ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = () => Math.random();
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const fmt = n => Math.round(n).toLocaleString('id-ID');
const sgn = n => { const r = Math.round(n); return (r >= 0 ? '+' : '') + fmt(r); };
function roman(n){ const m=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let s=''; for(const [v,r] of m){ while(n>=v){ s+=r; n-=v; } } return s; }

/* ---------- peta heksagonal (dari map-data.js) ---------- */
const SQ3 = Math.sqrt(3), HS = 6, PADX = 30, PADY = 24;
function hexXY(c, r){ return [PADX + HS*SQ3*(c + 0.5*(r & 1)) + HS*SQ3/2, PADY + HS*1.5*r + HS]; }
const DIRS_EVEN = [[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];
const DIRS_ODD  = [[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]];

const MAP = (() => {
  const COLS = MAPDATA.cols, ROWS = MAPDATA.rows;
  const raw = atob(MAPDATA.cells), cells = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) cells[i] = raw.charCodeAt(i);
  const regions = {};
  for (const d of REGION_DEFS) regions[d[0]] = { id:d[0], name:d[1], isl:d[2], lon:d[3], lat:d[4], owner0:d[5], com:d[6], pop0:d[7], ter:d[8], tiles:[] };
  const idx = MAPDATA.regions;
  const tiles = [], outside = [], grid = new Array(COLS * ROWS).fill(null);
  for (let k = 0; k < cells.length; k++) {
    const v = cells[k]; if (!v) continue;
    const c = k % COLS, r = Math.floor(k / COLS), [x, y] = hexXY(c, r);
    const t = { c, r, x, y, rid: v >= 2 ? idx[v - 2] : null, out: v === 1 };
    if (t.rid && !regions[t.rid]) { t.rid = null; t.out = true; }
    grid[k] = t; (t.out ? outside : tiles).push(t);
  }
  const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? null : grid[r * COLS + c];
  for (const t of tiles.concat(outside)) t.nb = ((t.r & 1) ? DIRS_ODD : DIRS_EVEN).map(([dc, dr]) => at(t.c + dc, t.r + dr));
  const ids = Object.keys(regions), adj = {}, dist = {};
  for (const id of ids) { adj[id] = new Set(); dist[id] = {}; }
  for (const t of tiles) { regions[t.rid].tiles.push(t); for (const n of t.nb) if (n && n.rid && n.rid !== t.rid) adj[t.rid].add(n.rid); }
  const rawD = atob(MAPDATA.dist), RN = idx.length;
  for (let a = 0; a < RN; a++) for (let b = 0; b < RN; b++) {
    if (a === b || !dist[idx[a]] || !regions[idx[b]]) continue;
    dist[idx[a]][idx[b]] = rawD.charCodeAt(a * RN + b) / 10;
  }
  for (const R of Object.values(regions)) {
    if (!R.tiles.length) { console.warn('Wilayah tanpa petak', R.id); R.lx = R.ly = R.cx = R.cy = 0; continue; }
    for (const id of ids) if (dist[R.id][id] === undefined && id !== R.id) dist[R.id][id] = 99;
    R.cx = R.tiles.reduce((s, t) => s + t.x, 0) / R.tiles.length;
    R.cy = R.tiles.reduce((s, t) => s + t.y, 0) / R.tiles.length;
    let bt = R.tiles[0], bd = 1e9;
    for (const t of R.tiles) { const d = (t.x - R.cx) ** 2 + (t.y - R.cy) ** 2; if (d < bd) { bd = d; bt = t; } }
    R.lx = bt.x; R.ly = bt.y;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const t of R.tiles) { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); }
    R.bb = [x0 - HS, y0 - HS, x1 + HS, y1 + HS];
  }
  function cellAt(x, y){
    const r0 = Math.round((y - PADY - HS) / (HS * 1.5));
    let best = null, bd = HS * HS * 1.1;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      const c0 = Math.round((x - PADX - HS * SQ3 / 2) / (HS * SQ3) - 0.5 * (r & 1));
      for (let c = c0 - 1; c <= c0 + 1; c++) { const t = at(c, r); if (!t) continue; const d = (t.x - x) ** 2 + (t.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
    }
    return best;
  }
  const lonX = lon => PADX + ((lon - MAPDATA.lon0) / MAPDATA.dlon) * HS * SQ3 + HS * SQ3 / 2;
  const latY = lat => PADY + ((MAPDATA.lat0 - lat) / (MAPDATA.dlon * SQ3 / 2)) * HS * 1.5 + HS;
  const W = PADX * 2 + HS * SQ3 * (COLS + 1), H = PADY * 2 + HS * 1.5 * ROWS + HS;
  return { tiles, outside, regions, adj, dist, W, H, cellAt, lonX, latY };
})();

/* ---------- keadaan permainan ---------- */
let G = null;
const P = () => G.fac[G.player];
const D = id => FACTION_DEFS[id];
const RD = id => MAP.regions[id];
const regionsOf = fid => Object.keys(G.reg).filter(r => G.reg[r].owner === fid);
const myRegions = () => regionsOf(G.player);
const isVassal = () => !!P().overlord;
const facName = fid => D(fid).short;
const alive = fid => G.fac[fid] && regionsOf(fid).length > 0;
const atWarWith = fid => G.wars.some(w => w.enemy === fid);
const warWith = fid => G.wars.find(w => w.enemy === fid);
const culture = fid => CULTURES[D(fid).culture] || CULTURES.melayu;

function log(text, kind){ G.log.unshift({ y: G.year, t: text, k: kind || 'info' }); if (G.log.length > 300) G.log.length = 300; }

function newChar(o){
  const cul = CULTURES[o.cul] || CULTURES.melayu;
  const g = o.g || (chance(0.5) ? 'L' : 'P');
  const c = {
    id: G.nextId++, n: o.n || pick(g === 'L' ? cul.m : cul.f), g, b: o.b ?? (G.year - (o.age ?? 0)), cul: o.cul,
    fac: o.fac, dyn: !!o.dyn, noble: !!o.noble, par: o.par || null, sp: null, alive: true, out: false,
    mil: o.mil ?? rint(2, 8), dip: o.dip ?? rint(2, 8), adm: o.adm ?? rint(2, 8), tr: [], loy: o.loy ?? rint(35, 75), edu: null, eduDone: false
  };
  if (o.traits) c.tr = o.traits.slice();
  else if ((o.age ?? 0) >= 16 || o.adultTraits) c.tr = [chance(0.65) ? pick(GOOD_TRAITS) : pick(BAD_TRAITS)];
  G.chars[c.id] = c;
  return c;
}
const age = c => G.year - c.b;
const CH = id => (id ? G.chars[id] : null);

function charName(c){
  if (!c) return '';
  const f = G.fac[c.fac], d = D(c.fac), cul = CULTURES[c.cul] || CULTURES.melayu;
  if (f && f.ruler === c.id) {
    if (d.regnal) return `${d.title} ${d.regnal} ${roman(f.regnalN)}`;
    if (c.g === 'P' && d.title === 'Sultan') return `Sultanah ${c.n}`;
    return `${d.title} ${c.n}`;
  }
  if (c.full) return c.full;
  if (c.dyn) return `${c.g === 'L' ? cul.pm : cul.pf} ${c.n}`;
  if (c.noble) return `${c.g === 'L' ? cul.nm : cul.nf} ${c.n}`;
  return c.n;
}
const stat = (c, k) => !c ? 0 : clamp(c[k] + c.tr.reduce((s, t) => s + (TRAITS[t][k] || 0), 0), 0, 12);
const hasTrait = (c, t) => c && c.tr.includes(t);

function newGame(fid){
  G = {
    v: 3, year: START_YEAR, player: fid, fac: {}, reg: {}, chars: {}, nextId: 1, log: [], wars: [], allies: [],
    rel: {}, wib: 0, price: {}, priceAll: 1, flags: {}, queue: [], over: null,
    stats: { wins: 0, losses: 0, marriages: 0, dynRulers: 1, maxKas: 0, conquests: 0, yearsAtWar: 0 },
    badgesGame: [], kebangsaan: 0, mode: 'terbuka', japan: false, sel: null, truceUntil: 0
  };
  for (const c of Object.keys(COMMODITIES)) G.price[c] = 1;
  for (const R of Object.values(MAP.regions)) {
    G.reg[R.id] = { owner: R.owner0, pop: R.pop0, pros: rint(38, 55), stab: rint(55, 70), fort: 0, school: 0, occ: 0 };
  }
  for (const [id, d] of Object.entries(FACTION_DEFS)) {
    const pop = Object.values(MAP.regions).filter(r => r.owner0 === id).reduce((s, r) => s + r.pop0, 0);
    G.fac[id] = {
      id, kas: d.kas ?? 300, army: d.army ?? Math.round(pop * 6), quality: d.quality ?? 0.8, overlord: d.overlord || null,
      ruler: null, heir: null, council: { panglima: null, patih: null, duta: null }, tax: 1, regnalN: d.startRegnal || 1,
      cap: d.capital, indep: d.overlord ? 45 : 100, rulerName: null, legit: 60
    };
  }
  const B = G.fac.belanda; B.army = 12000; B.quality = 1.4; B.kas = 99999;
  for (const r of ['batavia']) G.reg[r].fort = 3;
  for (const r of ['semarang','surabaya','makassar','padang','ambon','manado','palembang']) G.reg[r].fort = 2;
  for (const [id, f] of Object.entries(G.fac)) if (f.cap && G.reg[f.cap] && G.reg[f.cap].owner === id) G.reg[f.cap].fort = Math.max(G.reg[f.cap].fort, 1);
  if (fid === 'gowa') for (const r of regionsOf('gowa')) G.reg[r].fort = 2;
  // nama penguasa faksi lain (hanya untuk tampilan)
  for (const [id, d] of Object.entries(FACTION_DEFS)) if (d.kind === 'kerajaan' && id !== fid) G.fac[id].rulerName = AI_RULERS_1830[id] || aiRulerName(id);
  // hubungan dengan pemain dan antarkerajaan (data 1830)
  const pd = D(fid);
  G.arel = {};
  for (const [a, b, v] of RELATIONS) G.arel[a < b ? a + '|' + b : b + '|' + a] = v;
  G.aiwars = [];
  for (const [id, d] of Object.entries(FACTION_DEFS)) {
    if (id === fid) continue;
    let r = 10;
    if (d.culture && d.culture === pd.culture) r += 15;
    const k = id < fid ? id + '|' + fid : fid + '|' + id;
    if (G.arel[k] !== undefined) r = G.arel[k];
    if (id === 'belanda') r = pd.rel?.belanda ?? 0;
    if (d.kind === 'asing') r = 5;
    if (fid === 'klungkung' && d.culture === 'bali') r += 15;
    G.rel[id] = r;
  }
  initDiplomacy();
  buildCourt(fid);
  G.t = 0; G.month = 0; G.wib = 24; G.proj = []; G.speed = 0; G.ownVer = 0;
  G.sel = P().cap;
  G.flags.h_sambutan = 1; G.queue.push({ ev: 'sambutan', ctx: {} });
  log(`${charName(rulerC())} memulai pemerintahannya atas ${pd.name}.`, 'penting');
}

function aiRulerName(id){
  const d = D(id), cul = CULTURES[d.culture] || CULTURES.melayu;
  if (d.regnal) return `${d.title} ${d.regnal} ${roman(G.fac[id].regnalN)}`;
  if (d.culture === 'bali') return `${d.title} ${d.short}`; // nama raja-raja Bali tahun 1830 belum bisa dipastikan
  return `${d.title || 'Raja'} ${pick(cul.m)}`;
}
function governor(){ let n = GOVERNORS[0][1]; for (const [y, name] of GOVERNORS) if (G.year >= y) n = name; return n; }

/* Istana pemain: tokoh sejarah lebih dulu, lalu dilengkapi tokoh rekaan yang namanya sesuai budaya setempat. */
function buildCourt(fid){
  const pd = D(fid), cul = pd.culture, hist = HIST_CHARS[fid] || [], byKey = {};
  G.hkey = {}; G.hbirths = [];
  for (const h of hist) {
    if (h.born) { G.hbirths.push({ fid, h, y: h.b, m: h.bm || rint(1, 12) }); continue; }
    const c = newChar({ fac: fid, cul, g: h.g, b: h.b, dyn: !h.noble, noble: !!h.noble, mil: h.mil, dip: h.dip, adm: h.adm, traits: h.tr || [], loy: h.noble ? rint(55, 75) : undefined });
    c.n = h.n; if (h.full) c.full = h.full; c.hist = true; if (h.bp) c.bp = true;
    if (h.hd) c.hd = h.hd + rint(-1, 2);
    if (h.key) { byKey[h.key] = c; G.hkey[h.key] = c.id; }
    if (h.ruler) P().ruler = c.id;
    if (h.role) P().council[h.role] = c.id;
    h._c = c;
  }
  for (const h of hist) if (h._c) {
    if (h.par && byKey[h.par]) h._c.par = byKey[h.par].id;
    if (h.spOf && byKey[h.spOf]) { h._c.sp = byKey[h.spOf].id; byKey[h.spOf].sp = h._c.id; h._c.dyn = false; }
    delete h._c;
  }
  let ruler = rulerC();
  if (!ruler) {
    ruler = newChar({ fac: fid, cul, g: 'L', age: rint(28, 42), dyn: true, mil: rint(4, 8), dip: rint(4, 8), adm: rint(4, 8), adultTraits: true });
    ruler.tr = [pick(GOOD_TRAITS)]; if (chance(0.35)) ruler.tr.push(pick(BAD_TRAITS));
    P().ruler = ruler.id;
    const kids = rint(1, 3);
    for (let i = 0; i < kids; i++) { const k = newChar({ fac: fid, cul, age: rint(1, 14), dyn: true, par: ruler.id }); if (i === 0) { k.g = 'L'; k.n = pick(CULTURES[cul].m); } }
  }
  // pendamping untuk penguasa dewasa yang belum punya pasangan
  if (age(ruler) >= 18 && !ruler.sp && !(hist.find(h => h.ruler) || {}).single) {
    const sp = newChar({ fac: fid, cul, g: ruler.g === 'L' ? 'P' : 'L', age: Math.max(16, age(ruler) - rint(2, 9)), adultTraits: true });
    ruler.sp = sp.id; sp.sp = ruler.id;
  }
  if (fid === 'surakarta') ruler.infertile = true; // Pakubuwono VII wafat tanpa keturunan
  while (nobles().length < 4) newChar({ fac: fid, cul, g: chance(0.85) ? 'L' : 'P', age: rint(25, 58), noble: true, adultTraits: true });
  autoCouncil();
  const hh = hist.find(h => h.heir && !h.born);
  P().heir = hh && byKey[hh.key] ? byKey[hh.key].id : (hh ? (Object.values(G.chars).find(c => c.n === hh.n && c.fac === fid) || {}).id : null) || defaultHeir();
}

/* ---------- istana ---------- */
function court(){ return Object.values(G.chars).filter(c => c.fac === G.player && c.alive && !c.out); }
function family(){ return court().filter(c => c.dyn); }
function nobles(){ return court().filter(c => c.noble); }
function councilCandidates(){ const f = P(); return court().filter(c => age(c) >= 16 && c.id !== f.ruler && (c.noble || c.dyn)); }
function rulerC(){ return CH(P().ruler); }
function isRegency(){ const r = rulerC(); return r && age(r) < 16; }

function autoCouncil(){
  const f = P(); const used = new Set();
  for (const [seat, k] of [['panglima','mil'],['patih','adm'],['duta','dip']]) {
    const cur = CH(f.council[seat]);
    if (cur && cur.alive && !cur.out && cur.id !== f.ruler) { used.add(cur.id); continue; }
    const c = councilCandidates().filter(x => !used.has(x.id)).sort((a, b) => stat(b, k) - stat(a, k))[0];
    f.council[seat] = c ? c.id : null; if (c) used.add(c.id);
  }
}
function councilOf(seat){ const c = CH(P().council[seat]); return c && c.alive && !c.out ? c : null; }

function defaultHeir(){
  // urutan: putra penguasa, cucu laki-laki dari putra, kerabat laki-laki lain (tertua), putri, kerabat perempuan
  const r = rulerC(); if (!r) return null;
  const fam = family().filter(c => c.id !== r.id).sort((a, b) => a.b - b.b);
  const kids = fam.filter(c => c.par === r.id);
  const kidIds = new Set(Object.values(G.chars).filter(c => c.par === r.id).map(c => c.id));
  const order = [
    kids.filter(c => c.g === 'L'),
    fam.filter(c => c.g === 'L' && kidIds.has(c.par)),
    fam.filter(c => c.g === 'L'),
    kids.filter(c => c.g === 'P'),
    fam
  ];
  for (const list of order) if (list.length) return list[0].id;
  return null;
}
function heirC(){ const h = CH(P().heir); if (h && h.alive && !h.out && h.dyn) return h; P().heir = defaultHeir(); return CH(P().heir); }

function deathChance(c){
  const a = age(c); let p;
  if (a < 5) p = 0.035; else if (a < 40) p = 0.006; else if (a < 50) p = 0.015; else if (a < 60) p = 0.03; else if (a < 70) p = 0.065; else p = 0.13;
  if (hasTrait(c, 'lemah')) p *= 2.2;
  return p;
}

function succession(report){
  const f = P(), old = rulerC();
  let h = heirC();
  if (!h) {
    const cand = nobles().sort((a, b) => b.loy - a.loy)[0];
    if (!cand) { G.over = { kind: 'punah', text: 'Wangsa kerajaan punah tanpa penerus. Para bangsawan berebut kuasa dan kerajaan tercerai-berai.' }; return; }
    cand.noble = false; cand.dyn = true;
    f.ruler = cand.id; f.regnalN += 1; G.stats.dynRulers = 1;
    addLegit(-25);
    report.push(`Wangsa lama terputus. ${charName(cand)} naik takhta dan mendirikan wangsa baru.`);
    log(`Wangsa lama terputus. ${charName(cand)} naik takhta.`, 'buruk');
  } else {
    f.ruler = h.id; f.regnalN += 1; G.stats.dynRulers += 1;
    if (h.g === 'P') addLegit(-8);
    if (age(h) < 16) { addLegit(-10); report.push(`${charName(h)} naik takhta pada usia ${age(h)} tahun. Pemerintahan dijalankan oleh wali raja.`); }
    else report.push(`${charName(h)} naik takhta menggantikan ${old ? old.n : 'raja terdahulu'}.`);
    log(`${charName(h)} naik takhta.`, 'penting');
  }
  for (const s of Object.keys(f.council)) if (f.council[s] === f.ruler) f.council[s] = null;
  autoCouncil();
  f.heir = defaultHeir();
  for (const r of myRegions()) G.reg[r].stab = clamp(G.reg[r].stab - 6, 0, 100);
}

/* ---------- ekonomi ---------- */
function addKas(n){ P().kas = Math.max(0, P().kas + n); G.stats.maxKas = Math.max(G.stats.maxKas, P().kas); }
function addLegit(n){ P().legit = clamp((P().legit ?? 60) + n, 0, 100); }
function addRel(fid, n){ if (G.rel[fid] !== undefined) G.rel[fid] = clamp(G.rel[fid] + n, -100, 100); }
function addIndep(n){ P().indep = clamp(P().indep + n, 0, 100); }
function addNat(n){ G.kebangsaan = clamp(G.kebangsaan + n, 0, 100); }
function addStabAll(n){ for (const r of myRegions()) G.reg[r].stab = clamp(G.reg[r].stab + n, 0, 100); }
function addProsAll(n){ for (const r of myRegions()) G.reg[r].pros = clamp(G.reg[r].pros + n, 5, 100); }

function comValue(com){ return COMMODITIES[com].v * (G.price[com] || 1) * G.priceAll; }
function regionGross(rid){
  const R = G.reg[rid], d = RD(rid);
  let v = R.pop * 0.28 * (R.pros / 50) * comValue(d.com) * (0.6 + R.stab / 250);
  if (R.occ > 0) v *= 0.6;
  if (R.owner === G.player) {
    const b = D(G.player).bonus.id;
    if (b === 'pelaut' && d.com === 'dagang') v *= 1.2;
    if (b === 'bandar' && ['dagang','lada','gambir','tembakau'].includes(d.com)) v *= 1.15;
    if (b === 'tambang' && ['emas','lada'].includes(d.com)) v *= 1.15;
    if (b === 'rempah' && d.com === 'rempah') v *= 1.25;
  }
  return v;
}
const TAX = [{n:'Ringan', m:0.8, stab:3, loy:4}, {n:'Sedang', m:1, stab:0, loy:0}, {n:'Berat', m:1.25, stab:-4, loy:-5}];
function incomeBreakdown(){
  const f = P(), r = rulerC(), patih = councilOf('patih');
  const gross = myRegions().reduce((s, x) => s + regionGross(x), 0);
  let mult = TAX[f.tax].m * (1 + (stat(r, 'adm') - 5) * 0.03) * (patih ? 1 + (stat(patih, 'adm') - 5) * 0.03 : 0.95);
  if (hasTrait(r, 'boros')) mult *= 0.9;
  let income = gross * mult;
  // Dewa Agung Klungkung menerima persembahan dari raja-raja Bali yang bersahabat
  let homage = 0;
  if (D(G.player).bonus.id === 'puputan') for (const [id, d] of Object.entries(FACTION_DEFS)) if (d.culture === 'bali' && id !== G.player && alive(id) && !G.fac[id].overlord && (G.rel[id] ?? 0) >= 0) homage += 14;
  income += homage;
  const trade = tradeIncome(gross);
  income += trade;
  const tribute = f.overlord ? income * (G.japan ? 0.3 : 0.2) : 0;
  const upkeep = f.army * 0.02;
  const courtCost = 10 + myRegions().length * 3 + gross * 0.12;
  const loans = (G.flags.loanYears > 0) ? 60 : 0;
  return { gross, homage, trade, income, tribute, upkeep, court: courtCost, loans, net: income - tribute - upkeep - courtCost - loans };
}
function manpower(){ return Math.round(myRegions().reduce((s, r) => s + G.reg[r].pop * 8, 0)); }

const WIB_MAX = 60;
function wibRate(){
  const r = rulerC(), patih = councilOf('patih');
  let w = 2;
  if (stat(r, 'adm') >= 7) w += 0.6;
  if (patih && stat(patih, 'adm') >= 7) w += 0.6;
  if (hasTrait(r, 'berwibawa')) w += 0.4;
  if (isRegency()) w -= 0.6;
  return Math.max(1, w);
}
function spend(kas, wib = 6){
  if (G.over) return false;
  if (G.wib < wib) { toast(`Wibawa belum cukup. Dibutuhkan ${wib}, tersedia ${Math.floor(G.wib)}. Wibawa bertambah setiap bulan.`); return false; }
  if (P().kas < kas) { toast(`Kas tidak cukup. Dibutuhkan ${fmt(kas)} gulden.`); return false; }
  G.wib -= wib; P().kas -= kas; return true;
}

/* ---------- jangkauan dan pertempuran ---------- */
function reachRange(){ const b = D(G.player).bonus.id; return (b === 'pelaut' || b === 'rempah') ? 5 : 3; }
function inReach(rid){
  const mine = myRegions(); const rng = reachRange();
  return mine.some(m => m === rid || MAP.dist[m][rid] <= rng);
}
function battleMod(){
  const r = rulerC(), pg = councilOf('panglima');
  let m = (1 + (stat(r, 'mil') - 5) * 0.03) * (pg ? 1 + (stat(pg, 'mil') - 5) * 0.04 : 0.93);
  for (const t of (r ? r.tr : [])) m *= 1 + (TRAITS[t].battle || 0);
  return m;
}
function defenseMod(rid){
  const R = G.reg[rid], d = RD(rid), b = D(G.player).bonus.id;
  let m = TERRAIN[d.ter].def * (1 + 0.3 * R.fort);
  if (G.mode === 'gerilya') m *= (b === 'serambi' ? 1.5 : 1.35);
  if (b === 'puputan' && rid === P().cap) m *= 1.5;
  if (b === 'tanahtinggi' && d.ter === 'pegunungan') m *= 1.2;
  return m;
}
function fight(aN, aQ, aM, dN, dQ, dM){
  const A = Math.max(1, aN * aQ * aM * (0.85 + rand() * 0.3));
  const Dd = Math.max(1, dN * dQ * dM * (0.85 + rand() * 0.3));
  const win = A > Dd, r = win ? A / Dd : Dd / A;
  const lose = clamp(0.22 + 0.1 * r, 0.25, 0.6), wl = clamp(0.2 / r, 0.05, 0.2);
  return { win, ratio: r, aLoss: Math.round(aN * (win ? wl : lose)), dLoss: Math.round(dN * (win ? lose : wl)) };
}
/* pertahanan pemain terhadap serangan */
function defendRegion(rid, eN, eQ, w){
  const f = P(), R = G.reg[rid];
  const militia = R.pop * 3, h = allyHelp(w, 0.3);
  const dN = f.army + militia + h.n;
  const dQ = (f.army * f.quality + militia * 0.65 + h.n * h.q) / Math.max(1, dN);
  const res = fight(eN, eQ, 1, dN, dQ, battleMod() * defenseMod(rid));
  f.army = Math.max(0, f.army - Math.round(res.dLoss * f.army / Math.max(1, dN)));
  for (const a of h.list) G.fac[a].army = Math.max(0, Math.round(G.fac[a].army - res.dLoss * (G.fac[a].army * 0.3) / Math.max(1, dN)));
  return res;
}
function garrisonOf(rid){
  const R = G.reg[rid], o = R.owner;
  if (o === 'adat') return { n: R.pop * 2.5 + 200, q: 0.6 };
  if (o === 'belanda' || o === 'jepang') { const B = G.fac[o]; return { n: 1200 + R.pop * 1.2 + B.army * 0.04, q: B.quality }; }
  const f = G.fac[o]; const cnt = Math.max(1, regionsOf(o).length);
  return { n: R.pop * 2 + f.army * (cnt > 1 ? 0.55 : 0.85), q: f.quality };
}

function setOwner(rid, fid){
  const R = G.reg[rid], prev = R.owner;
  R.owner = fid; G.ownVer = (G.ownVer || 0) + 1;
  if (prev !== 'adat' && G.fac[prev] && G.fac[prev].cap === rid) {
    const rest = regionsOf(prev).sort((a, b) => G.reg[b].pop - G.reg[a].pop);
    G.fac[prev].cap = rest[0] || null;
    if (prev === G.player && rest[0]) { addLegit(-15); log(`Ibu kota jatuh. Istana pindah ke ${RD(rest[0]).name}.`, 'buruk'); }
  }
  if (fid !== 'adat' && G.fac[fid] && !G.fac[fid].cap) G.fac[fid].cap = rid;
  if (prev === G.player && myRegions().length === 0) {
    G.over = { kind: 'runtuh', text: `Wilayah terakhir ${D(G.player).name} jatuh ke tangan ${D(fid).name}. Kerajaan tidak lagi berdiri.` };
  }
}

function playerAttack(rid, pct){
  const f = P(), R = G.reg[rid], owner = R.owner;
  const n = Math.round(f.army * pct);
  if (n < 100) { toast('Pasukan terlalu sedikit untuk menyerang.'); return null; }
  if (!spend(0, WIBAWA.attack)) return null;
  const g = garrisonOf(rid);
  const dm = TERRAIN[RD(rid).ter].def * (1 + 0.3 * R.fort);
  const w = warWith(owner), h = allyHelp(w, 0.2);
  const total = n + h.n, q = (n * f.quality + h.n * h.q) / Math.max(1, total);
  const res = fight(total, q, battleMod(), g.n, g.q, dm);
  f.army = Math.max(0, f.army - Math.round(res.aLoss * n / Math.max(1, total)));
  spreadAllyLoss(h, 0.2, res.aLoss, total);
  if (owner !== 'adat' && G.fac[owner]) G.fac[owner].army = Math.max(0, G.fac[owner].army - Math.round(res.dLoss * 0.6));
  let msg;
  if (res.win) {
    G.stats.wins++; if (w) w.wins++;
    setOwner(rid, G.player); R.stab = 30; R.occ = 48; G.stats.conquests++;
    aggression(owner === 'adat' ? 4 : owner === 'belanda' || owner === 'jepang' ? 2 : 15);
    addLegit(3);
    if (owner === 'belanda' && w) w.exh += 18;
    if (owner !== 'belanda' && owner !== 'jepang') addRel('belanda', owner === 'adat' ? -3 : -10);
    msg = `Kemenangan! ${RD(rid).name} kini menjadi milik kerajaan.${h.n ? ` Pasukan sekutu (${h.list.map(a => D(a).short).join(', ')}) ikut bertempur.` : ''} Pasukan gabungan kehilangan ${fmt(res.aLoss)} orang, musuh kehilangan ${fmt(res.dLoss)}.`;
    log(`Pasukan kerajaan merebut ${RD(rid).name} dari ${facName(owner)}.`, 'baik');
  } else {
    G.stats.losses++; if (w) w.losses++;
    addLegit(-3);
    msg = `Serangan ke ${RD(rid).name} gagal.${h.n ? ` Pasukan sekutu ikut bertempur.` : ''} Pasukan gabungan kehilangan ${fmt(res.aLoss)} orang, musuh kehilangan ${fmt(res.dLoss)}.`;
    log(`Serangan ke ${RD(rid).name} dipukul mundur.`, 'buruk');
  }
  checkBadges();
  return { win: res.win, msg };
}

/* ---------- perang dan damai ---------- */
function startWar(fid, kind, opts){
  opts = opts || {};
  if (atWarWith(fid)) return;
  ensureDiplo();
  const w = { enemy: fid, start: G.year, exh: 0, wins: 0, losses: 0, commit: 1, kind: kind || 'biasa', allies: [] };
  G.wars.push(w);
  G.allies = G.allies.filter(a => a !== fid);
  G.trade = G.trade.filter(a => a !== fid);
  if (fid === 'belanda') G.rel.belanda = Math.min(G.rel.belanda, -60); else addRel(fid, -60);
  log(`Perang pecah melawan ${D(fid).name}.`, 'buruk');
  if (opts.noCall) return;
  const { joined, refused } = callAllies(w);
  const foes = opts.noEnemyAllies ? [] : enemyAlliesJoin(fid);
  const parts = [];
  if (joined.length) parts.push(`Sekutu yang ikut berperang bersama kita: ${joined.map(a => D(a).short).join(', ')}.`);
  if (refused.length) parts.push(`Menolak membantu dan memutus persekutuan: ${refused.map(a => D(a).short).join(', ')}.`);
  if (foes.length) parts.push(`Sekutu ${D(fid).short} ikut menyerang kita: ${foes.map(a => D(a).short).join(', ')}.`);
  for (const a of joined) log(`${D(a).short} ikut berperang bersama kita melawan ${D(fid).short}.`, 'baik');
  if (parts.length && !opts.quiet) notice(`Perang melawan ${D(fid).short}`, parts.join(' '));
  else if (parts.length) log(parts.join(' '), 'penting');
}
function endWar(fid, text){
  const w0 = warWith(fid);
  if (w0) for (const a of (w0.allies || [])) addRel(a, 15);
  G.wars = G.wars.filter(w => w.enemy !== fid);
  if (fid === 'belanda') { G.rel.belanda = Math.max(G.rel.belanda, 0); G.truceUntil = G.year + 15; }
  else addRel(fid, 30);
  log(text || `Perdamaian disepakati dengan ${D(fid).name}.`, 'penting');
}
function expSize(){ return 2500 + (G.year - 1830) * 40; }

function becomeVassal(){
  const f = P(); f.overlord = G.japan ? 'jepang' : 'belanda'; f.indep = 35;
  G.wars = G.wars.filter(w => w.enemy !== 'belanda');
  G.rel.belanda = Math.max(G.rel.belanda, 20);
  log(`${D(G.player).name} menandatangani perjanjian dan menjadi bawahan Hindia Belanda.`, 'buruk');
}

/* ---------- peristiwa sejarah dan ekspedisi Belanda ---------- */
function isIndependent(fid){ const f = G.fac[fid]; return f && !f.overlord && alive(fid) && D(fid).kind === 'kerajaan'; }

function resolveAIExpedition(fid, vassalOnly, report){
  if (!isIndependent(fid) || fid === G.player) return;
  if (G.allies.includes(fid)) { G.queue.push({ ev: 'bantusekutu', ctx: { fid, v: !!vassalOnly } }); return; }
  doAIExpedition(fid, vassalOnly, 0, report);
}
function doAIExpedition(fid, vassalOnly, help, report){
  const pop = regionsOf(fid).reduce((s, r) => s + G.reg[r].pop, 0);
  const X = (pop * 3 + G.fac[fid].army) * G.fac[fid].quality + help;
  const E = expSize() * 1.3 * G.fac.belanda.quality;
  const p = clamp(E / (E + X) + (G.year - 1830) / 300, 0.15, 0.95);
  const push = t => { log(t, 'kabar'); if (report) report.push(t); };
  if (chance(p)) {
    if (vassalOnly || (G.year < 1870 && chance(0.5)) || chance(0.35)) {
      G.fac[fid].overlord = 'belanda';
      push(`${D(fid).name} dipaksa menandatangani perjanjian dan menjadi bawahan Hindia Belanda.`);
    } else {
      for (const r of regionsOf(fid)) setOwner(r, 'belanda');
      push(`Ekspedisi Belanda menaklukkan ${D(fid).name}. Seluruh wilayahnya dianeksasi.`);
    }
    return true;
  }
  G.fac[fid].army = Math.round(G.fac[fid].army * 0.75);
  push(`Ekspedisi Belanda ke ${D(fid).name} dipukul mundur.`);
  return false;
}

/* ---------- kalender ---------- */
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const T0 = Date.UTC(1830, 0, 1);
function dateOf(t){ const d = new Date(T0 + t * 86400000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
function dateStr(t){ const x = dateOf(t ?? G.t); return `${x.d} ${BULAN[x.m]} ${x.y}`; }
const dateKey = (y, m, d) => y * 10000 + m * 100 + (d || 1);
function durStr(days){ if (days >= 360) return `${String(Math.round(days / 365 * 10) / 10).replace('.', ',')} tahun`; if (days >= 45) return `${Math.round(days / 30.4)} bulan`; return `${Math.max(1, Math.round(days))} hari`; }

/* ---------- ekspedisi Belanda (tahun dan bulan) ---------- */
const EXPED = [
  {y:1837,m:8,t:'minang'},{y:1838,m:5,t:'indragiri',v:true},{y:1846,m:6,t:'buleleng'},{y:1848,m:6,t:'buleleng'},{y:1849,m:4,t:'karangasem'},{y:1849,m:5,t:'klungkung'},
  {y:1850,m:3,t:'bulungan',v:true},{y:1855,m:6,t:'sambas',v:true},{y:1856,m:8,r:'lampung'},{y:1858,m:2,t:'siak',v:true},{y:1858,m:9,t:'jambi'},
  {y:1859,m:4,t:'banjar'},{y:1860,m:2,t:'bone'},{y:1873,m:4,t:'aceh'},{y:1875,m:5,t:'sumbawa',v:true},{y:1880,m:6,t:'tidore',v:true},{y:1889,m:3,t:'bacan',v:true},
  {y:1894,m:7,t:'lombok'},{y:1900,m:3,t:'gianyar',v:true},{y:1901,m:5,t:'jambi'},{y:1905,m:7,t:'bone'},{y:1905,m:7,t:'soppeng'},{y:1905,m:10,t:'gowa'},
  {y:1905,m:11,t:'luwu'},{y:1906,m:3,t:'wajo'},{y:1906,m:4,t:'pasir',v:true},{y:1906,m:9,t:'badung'},{y:1906,m:9,t:'tabanan'},{y:1907,m:6,t:'batak'},
  {y:1908,m:4,t:'klungkung'},{y:1909,m:3,t:'kutai',v:true},{y:1909,m:6,t:'bangli',v:true},{y:1911,m:2,t:'riau'},{y:1912,m:5,t:'bima',v:true},{y:1914,m:4,t:'ternate',v:true}
];

function processBelanda(){
  const B = G.fac.belanda; const y = G.year;
  if (G.japan) return;
  B.army += 30; B.quality = Math.min(2.4, 1.4 + (y - 1830) * 0.009);
  // ekspedisi umum ke kerajaan lain
  if (y > 1845 && chance((0.06 + (y - 1845) / 1500) / 12)) {
    const c = Object.keys(G.fac).filter(f => f !== G.player && isIndependent(f));
    if (c.length) resolveAIExpedition(pick(c), chance(0.5));
  }
  // wilayah adat dianeksasi perlahan
  for (const r of Object.keys(G.reg)) {
    if (G.reg[r].owner !== 'adat') continue;
    if (chance((0.015 + (y - 1830) * 0.0012) / 12)) { setOwner(r, 'belanda'); log(`Belanda memperluas kekuasaan ke ${RD(r).name}.`, 'kabar'); }
  }
  // tekanan terhadap pemain
  if (!atWarWith('belanda') && y >= G.truceUntil) {
    if (!isVassal()) {
      let p = 0.012 + Math.max(0, y - 1840) / 1300;
      if (G.rel.belanda < 0) p += 0.05;
      if (G.rel.belanda < -30) p += 0.08;
      if (myRegions().length >= 8) p += 0.05;
      if (y >= 1898 && y <= 1912) p += 0.15;
      if (D(G.player).bonus.id === 'tanahtinggi') p *= 0.6;
      if (y < 1860) p *= 0.5;
      if (G.rel.belanda > 50) p *= 0.4;
      if (!G.queue.some(q => q.ev === 'ultimatum') && chance(p / 12)) G.queue.push({ ev: 'ultimatum', ctx: {} });
    } else if (P().overlord === 'belanda' && chance(0.13 / 12)) {
      G.queue.push({ ev: 'tuntutan', ctx: {} });
    }
  }
}

/* ---------- persekutuan, perdagangan, dan koalisi ---------- */
function initDiplomacy(){
  G.trade = []; G.ae = 0; G.coalition = null; G.aalli = {};
  for (const [a, b] of ALLIANCES_1830) {
    if (a === G.player) G.allies.push(b); else if (b === G.player) G.allies.push(a); else G.aalli[relKey(a, b)] = 1;
  }
}
function ensureDiplo(){ if (!G.trade) G.trade = []; if (G.ae === undefined) G.ae = 0; if (!G.aalli) G.aalli = {}; if (G.coalition === undefined) G.coalition = null; if (!G.aiwars) G.aiwars = []; }
const aiAllied = (a, b) => !!(G.aalli && G.aalli[relKey(a, b)]);
function aiAlliesOf(fid){
  const out = [];
  for (const k of Object.keys(G.aalli || {})) { const [a, b] = k.split('|'); if (a === fid && alive(b)) out.push(b); else if (b === fid && alive(a)) out.push(a); }
  return out;
}
function blocs(){
  const seen = new Set(), out = [];
  const ids = [...new Set(Object.keys(G.aalli || {}).flatMap(k => k.split('|')))].filter(alive);
  for (const id of ids) {
    if (seen.has(id)) continue;
    const comp = [], stack = [id];
    while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); comp.push(x); for (const y of aiAlliesOf(x)) if (!seen.has(y)) stack.push(y); }
    if (comp.length > 1) out.push(comp);
  }
  return out;
}
const TRADE_INFO = {
  belanda: { rate: 0.07, n: 'Kontrak dagang dengan Nederlandsche Handel-Maatschappij', d: 'Penghasilan stabil. Untuk kerajaan bawahan, kemandirian perlahan turun.' },
  inggris: { rate: 0.09, n: 'Berdagang dengan pedagang Inggris di Singapura dan Penang', d: 'Hasil bumi laku dengan harga baik dan senapan 25 persen lebih murah, tetapi Belanda makin curiga.' }
};
function tradeSlots(){ return clamp(1 + Math.floor(myRegions().filter(coastal).length / 2), 1, 5); }
const tradeRate = fid => TRADE_INFO[fid] ? TRADE_INFO[fid].rate : 0.05;
const tradeOk = fid => fid === 'inggris' ? !G.japan : alive(fid);
function tradeIncome(gross){ return (G.trade || []).filter(tradeOk).reduce((s, f) => s + gross * tradeRate(f), 0); }
function allyJoinChance(a, enemy){
  if (enemy === 'belanda' && G.fac[a].overlord) return 0;
  if (aiAllied(a, enemy) || G.fac[a].overlord === enemy) return 0;
  return clamp(((G.rel[a] ?? 0) - 20) / 60 + 0.4 - (enemy === 'belanda' ? 0.25 : 0), 0.05, 0.95);
}
/* sekutu pemain diminta ikut berperang; yang menolak memutus persekutuan */
function callAllies(w){
  const joined = [], refused = [];
  for (const a of G.allies.slice()) {
    if (a === w.enemy || !alive(a) || w.allies.includes(a)) continue;
    if (chance(allyJoinChance(a, w.enemy))) { w.allies.push(a); joined.push(a); }
    else { G.allies = G.allies.filter(x => x !== a); addRel(a, -15); refused.push(a); }
  }
  return { joined, refused };
}
/* sekutu pihak musuh ikut menyerang pemain */
function enemyAlliesJoin(enemy){
  const list = [];
  if (enemy === 'belanda' || enemy === 'jepang') return list;
  for (const a of aiAlliesOf(enemy)) {
    if (a === G.player || atWarWith(a) || G.fac[a].overlord || G.allies.includes(a)) continue;
    if (chance(0.55)) { startWar(a, 'biasa', { noCall: true, quiet: true }); list.push(a); }
  }
  return list;
}
function allyHelp(w, share){
  const list = (w && w.allies || []).filter(a => alive(a) && G.fac[a]);
  const n = list.reduce((s, a) => s + G.fac[a].army * share, 0);
  const q = n ? list.reduce((s, a) => s + G.fac[a].army * share * G.fac[a].quality, 0) / n : 1;
  return { list, n, q };
}
function spreadAllyLoss(h, share, loss, total){
  for (const a of h.list) G.fac[a].army = Math.max(0, Math.round(G.fac[a].army - loss * (G.fac[a].army * share) / Math.max(1, total)));
}
function aggression(n){ G.ae = clamp((G.ae || 0) + n, 0, 150); }
function processDiplomacy(){
  ensureDiplo();
  const M = 1 / 12;
  // perdagangan
  G.trade = G.trade.filter(f => tradeOk(f) && !atWarWith(f));
  if (G.trade.includes('inggris')) addRel('belanda', -0.8);
  if (G.trade.includes('belanda') && isVassal()) addIndep(-0.4);
  for (const f of G.trade) if (f !== 'belanda' && f !== 'inggris') addRel(f, 0.4);
  // persekutuan antarkerajaan lain
  for (const [k, v] of Object.entries(G.arel)) {
    const [a, b] = k.split('|');
    if (a === G.player || b === G.player) continue;
    if (G.aalli[k] && (v < 10 || !alive(a) || !alive(b))) { delete G.aalli[k]; continue; }
    if (!G.aalli[k] && v >= 45 && alive(a) && alive(b) && !G.fac[a].overlord && !G.fac[b].overlord && chance(0.01)) { G.aalli[k] = 1; log(`${D(a).short} dan ${D(b).short} bersekutu.`, 'kabar'); }
    G.arel[k] = v - v * 0.002;
  }
  // kecurigaan tetangga dan koalisi
  G.ae = Math.max(0, G.ae - (G.wars.length ? 0.4 : 0.8));
  if (!G.coalition && G.ae >= 50 && !isVassal()) {
    const mine = myRegions();
    const members = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !G.fac[x].overlord && !G.allies.includes(x) && (G.rel[x] ?? 0) < 30
      && regionsOf(x).some(r => mine.some(m => (MAP.dist[m][r] ?? 99) <= 4)));
    if (members.length >= 2) {
      G.coalition = { members, since: G.year };
      for (const a of members) { addRel(a, -25); for (const b of members) if (a < b) { G.aalli[relKey(a, b)] = 1; G.arel[relKey(a, b)] = Math.max(G.arel[relKey(a, b)] || 0, 45); } }
      notice('Koalisi melawanmu terbentuk', `Penaklukan demi penaklukan membuat para tetangga cemas. ${members.map(m => D(m).name).join(', ')} bersumpah saling membantu melawan ${D(G.player).name}.`);
      log(`Koalisi terbentuk melawan kita: ${members.map(m => D(m).short).join(', ')}.`, 'buruk');
    }
  }
  if (G.coalition) {
    G.coalition.members = G.coalition.members.filter(m => alive(m) && !G.fac[m].overlord);
    if (G.ae < 25 || G.coalition.members.length < 2) { log('Koalisi para tetangga bubar.', 'baik'); G.coalition = null; }
    else if (!G.coalition.members.some(atWarWith) && chance(0.06)) {
      const army = G.coalition.members.reduce((s, m) => s + G.fac[m].army, 0);
      if (army > P().army * 0.7) {
        const [first, ...rest] = G.coalition.members;
        startWar(first, 'koalisi', { quiet: true });
        const w0 = warWith(first);
        for (const m of rest) { startWar(m, 'koalisi', { noCall: true, quiet: true }); const w = warWith(m); if (w && w0) w.allies = w0.allies.slice(); }
        notice('Koalisi menyatakan perang', `${G.coalition.members.map(m => D(m).name).join(', ')} menyerang bersama-sama.${w0 && w0.allies.length ? ` Sekutu kita yang ikut membantu: ${w0.allies.map(a => D(a).short).join(', ')}.` : ''}`);
      }
    }
  }
  // tawaran dari kerajaan lain
  if (chance(0.025)) {
    const cands = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !atWarWith(x));
    const allyC = cands.filter(x => (G.rel[x] ?? 0) >= 55 && !G.allies.includes(x) && !G.fac[x].overlord && !isVassal());
    const tradeC = cands.filter(x => (G.rel[x] ?? 0) >= 30 && !G.trade.includes(x));
    if (allyC.length && chance(0.5)) G.queue.push({ ev: 'tawaransekutu', ctx: { fid: pick(allyC) } });
    else if (tradeC.length && G.trade.length < tradeSlots()) G.queue.push({ ev: 'tawarandagang', ctx: { fid: pick(tradeC) } });
  }
  if (G.trade.length >= 3) earn('niaga');
}

/* ---------- konflik antarkerajaan tetangga ---------- */
const relKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const aiAtWar = (a, b) => (G.aiwars || []).some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
function regionsNear(fromFid, toFid){
  const mine = regionsOf(fromFid), theirs = regionsOf(toFid);
  return theirs.filter(t => mine.some(m => (MAP.dist[m][t] ?? 99) <= 1.5));
}
function processAIConflicts(){
  if (!G.arel) return;
  if (!G.aiwars) G.aiwars = [];
  for (const [k, v] of Object.entries(G.arel)) {
    if (v > -20) continue;
    const [a, b] = k.split('|');
    if (a === G.player || b === G.player || !alive(a) || !alive(b) || G.fac[a].overlord || G.fac[b].overlord || aiAtWar(a, b)) continue;
    if (!regionsNear(a, b).length || !chance(0.0025 + (-v - 20) / 20000)) continue;
    const [att, def] = chance(0.5) ? [a, b] : [b, a];
    if (aiAllied(att, def)) continue;
    G.aiwars.push({ a: att, b: def, start: G.year });
    log(`Perang pecah antara ${D(att).name} dan ${D(def).name}.`, 'kabar');
    if (G.allies.includes(def) && !atWarWith(att)) G.queue.push({ ev: 'panggilansekutu', ctx: { fid: def, enemy: att } });
  }
  for (const w of G.aiwars.slice()) {
    if (!alive(w.a) || !alive(w.b) || G.fac[w.a].overlord || G.fac[w.b].overlord) { G.aiwars.splice(G.aiwars.indexOf(w), 1); continue; }
    if (chance(0.07)) {
      const [att, def] = chance(0.5) ? [w.a, w.b] : [w.b, w.a];
      const targets = regionsNear(att, def); if (!targets.length) continue;
      const rid = pick(targets), R = G.reg[rid], A = G.fac[att], Df = G.fac[def];
      const help = aiAlliesOf(def).filter(x => x !== att && !G.fac[x].overlord).reduce((s, x) => s + G.fac[x].army * 0.25, 0);
      const res = fight(A.army * 0.6, A.quality, 1, R.pop * 2 + Df.army * 0.4 + help, Df.quality, TERRAIN[RD(rid).ter].def * (1 + 0.3 * R.fort));
      A.army = Math.max(0, A.army - res.aLoss); Df.army = Math.max(0, Df.army - Math.round(res.dLoss * 0.5));
      if (res.win && regionsOf(def).length > 1) { setOwner(rid, att); R.stab = 30; log(`${D(att).short} merebut ${RD(rid).name} dari ${D(def).short}.`, 'kabar'); }
    }
    if (chance(0.035)) { G.aiwars.splice(G.aiwars.indexOf(w), 1); G.arel[relKey(w.a, w.b)] = Math.min(0, (G.arel[relKey(w.a, w.b)] || 0) + 25); log(`${D(w.a).short} dan ${D(w.b).short} berdamai.`, 'kabar'); }
  }
}

function notice(title, text){ G.queue.push({ ev: 'kabar', ctx: { title, text } }); }

function processWars(){
  for (const w of G.wars.slice()) {
    G.stats.monthsAtWar = (G.stats.monthsAtWar || 0) + 1;
    if (w.enemy === 'belanda') {
      const B = G.fac.belanda;
      const perYear = w.commit >= 1.75 ? 2 : 1; let lost = false;
      if (chance(perYear / 12)) {
        const mine = myRegions(); if (!mine.length) continue;
        const target = mine.slice().sort((a, b) => nearestHostile(a, 'belanda') - nearestHostile(b, 'belanda') || (a === P().cap) - (b === P().cap))[0];
        const E = Math.round((expSize() * 0.7 + P().army * 0.5) * w.commit);
        const res = defendRegion(target, E, B.quality, w);
        B.army = Math.max(4000, B.army - Math.round(res.aLoss * 0.5));
        w.exh += res.aLoss / 300;
        if (res.win && G.reg[target].fort > 0) {
          G.reg[target].fort--; w.losses++; G.stats.losses++; addLegit(-2); lost = true;
          log(`Pasukan Belanda (${fmt(E)} serdadu) menggempur benteng ${RD(target).name}. Benteng runtuh satu tingkat. Kita kehilangan ${fmt(res.dLoss)} orang.`, 'buruk');
          toast(`Benteng ${RD(target).name} digempur Belanda.`);
        } else if (res.win) {
          setOwner(target, 'belanda'); w.losses++; G.stats.losses++; addLegit(-6); lost = true;
          log(`Belanda merebut ${RD(target).name}.`, 'buruk');
          if (!G.over) notice(`${RD(target).name} jatuh`, `Pasukan Belanda berkekuatan ${fmt(E)} serdadu merebut ${RD(target).name}. Kita kehilangan ${fmt(res.dLoss)} orang dalam pertempuran.`);
        } else {
          w.wins++; G.stats.wins++; w.exh += 14 + res.aLoss / 250; addLegit(4);
          log(`Serangan Belanda (${fmt(E)} serdadu) ke ${RD(target).name} dipatahkan. Musuh kehilangan ${fmt(res.aLoss)} orang.`, 'baik');
          toast(`Serangan Belanda di ${RD(target).name} dipatahkan.`, true);
        }
      }
      w.exh += (9 + (G.mode === 'gerilya' ? 9 : 0) + (w.allies || []).filter(alive).length * 6) / 12;
      w.commit = Math.min(2.4, w.commit + 0.015);
      if (G.over) return;
      if (w.exh >= 100 && !G.queue.some(q => q.ev === 'damaibelanda')) G.queue.push({ ev: 'damaibelanda', ctx: {} });
      else if (lost && (myRegions().length <= 2 || w.losses >= 3) && !G.queue.some(q => q.ev === 'tawaranmenyerah')) G.queue.push({ ev: 'tawaranmenyerah', ctx: {} });
    } else if (w.enemy === 'jepang') {
      // tidak ada pertempuran aktif melawan Jepang
    } else {
      const E = G.fac[w.enemy];
      if (!alive(w.enemy)) { endWar(w.enemy, `Perang dengan ${D(w.enemy).name} berakhir karena musuh tidak lagi berdiri.`); continue; }
      if (E.army > 600 && chance(0.55 / 12)) {
        const mine = myRegions();
        const target = mine.slice().sort((a, b) => nearestHostile(a, w.enemy) - nearestHostile(b, w.enemy))[0];
        const n = Math.round(E.army * 0.6);
        const res = defendRegion(target, n, E.quality, w);
        E.army = Math.max(0, E.army - res.aLoss);
        if (res.win) { setOwner(target, w.enemy); w.losses++; G.stats.losses++; addLegit(-5); log(`${D(w.enemy).short} merebut ${RD(target).name}.`, 'buruk'); if (!G.over) notice(`${RD(target).name} jatuh`, `Pasukan ${D(w.enemy).name} merebut ${RD(target).name}.`); }
        else { w.wins++; G.stats.wins++; addLegit(2); log(`Serangan ${D(w.enemy).short} ke ${RD(target).name} gagal.`, 'baik'); toast(`Serangan ${D(w.enemy).short} ke ${RD(target).name} gagal.`, true); }
      }
      for (const a of (w.allies || [])) {
        if (!alive(a) || !chance(0.04)) continue;
        const targets = regionsNear(a, w.enemy); if (!targets.length) continue;
        const rid = pick(targets), R = G.reg[rid], A = G.fac[a];
        const res = fight(A.army * 0.5, A.quality, 1, R.pop * 2 + E.army * 0.3, E.quality, TERRAIN[RD(rid).ter].def * (1 + 0.3 * R.fort));
        A.army = Math.max(0, A.army - res.aLoss); E.army = Math.max(0, E.army - Math.round(res.dLoss * 0.5));
        if (res.win && regionsOf(w.enemy).length > 1) { setOwner(rid, a); R.stab = 30; log(`Sekutu kita, ${D(a).short}, merebut ${RD(rid).name} dari ${D(w.enemy).short}.`, 'baik'); }
      }
      E.army = Math.round(E.army + regionsOf(w.enemy).reduce((s, r) => s + G.reg[r].pop, 0) * 0.033);
      w.exh += 10 / 12;
      if (!G.over && (w.wins >= 2 || w.exh >= 40) && chance(0.04) && !G.queue.some(q => q.ev === 'damaiai')) G.queue.push({ ev: 'damaiai', ctx: { fid: w.enemy } });
    }
  }
}
function nearestHostile(rid, fid){
  const theirs = regionsOf(fid); if (!theirs.length) return 99;
  return Math.min(...theirs.map(t => MAP.dist[rid][t] ?? 99));
}

/* ---------- jalannya waktu ---------- */
function advanceDay(){
  if (!G || G.over) return;
  const prev = dateOf(G.t); G.t++; const cur = dateOf(G.t);
  G.year = cur.y; G.month = cur.m;
  dailyProjects();
  G.wib = Math.min(WIB_MAX, G.wib + wibRate() * 12 / 365);
  if (cur.y !== prev.y) newYear(prev.y);
  if (cur.m !== prev.m) monthly();
  dateTriggers(cur);
  checkBadges();
}

function monthly(){
  const f = P(), M = 1 / 12;
  const inc = incomeBreakdown();
  addKas(inc.net * M);
  if (inc.net < 0 && f.kas <= 0) {
    addStabAll(-1); f.army = Math.round(f.army * 0.98);
    if (!G.flags.kasWarn || G.t - G.flags.kasWarn > 180) { G.flags.kasWarn = G.t; toast('Kas kosong. Gaji prajurit tertunggak dan sebagian pasukan pulang ke kampung.'); log('Kas kosong. Sebagian pasukan pulang ke kampung.', 'buruk'); }
  }
  const r0 = rulerC();
  for (const rid of myRegions()) {
    const R = G.reg[rid];
    R.pop = R.pop * (1 + 0.006 * M * (R.pros / 50));
    const target = 45 + (f.legit ?? 60) * 0.3 + R.school * 4 + TAX[f.tax].stab * 3 - (R.occ > 0 ? 18 : 0) - (G.wars.length ? 6 : 0) + (G.mode === 'gerilya' && G.wars.length ? -4 : 0);
    R.stab = clamp(R.stab + (target - R.stab) * 0.02 + (rand() - 0.5) * 2, 0, 100);
    if (R.pros > 50) R.pros -= (1 + (R.pros - 50) * 0.03) * M;
    if (G.mode === 'gerilya' && G.wars.length) R.pros = Math.max(5, R.pros - 0.25);
    if (R.occ > 0) R.occ--;
  }
  for (const rid of Object.keys(G.reg)) if (G.reg[rid].owner !== G.player) G.reg[rid].pop *= 1 + 0.007 * M;
  let dl = (50 - (f.legit ?? 60)) * 0.08;
  for (const t of (r0 ? r0.tr : [])) dl += TRAITS[t].legit || 0;
  if (D(G.player).bonus.id === 'serambi' || D(G.player).bonus.id === 'keraton') dl += 1;
  if (isRegency()) dl -= 2;
  addLegit(dl * M);
  if (f.overlord) addIndep((-1.5 + ((f.legit ?? 60) - 50) / 40 + f.army / 4000) * M);

  monthlyCharacters();
  if (G.over) return;

  for (const [id, F] of Object.entries(G.fac)) {
    if (id === G.player || D(id).kind !== 'kerajaan' || !alive(id)) continue;
    const pop = regionsOf(id).reduce((s, r) => s + G.reg[r].pop, 0);
    F.army = Math.round(F.army + (pop * 5 - F.army) * 0.009);
    if (chance(0.04 / 12)) { F.regnalN++; F.rulerName = aiRulerName(id); }
  }
  processAIConflicts();
  processDiplomacy();
  for (const id of Object.keys(G.rel)) { if (id === 'belanda') continue; G.rel[id] += (10 - G.rel[id]) * 0.0025; }
  for (const a of G.allies.slice()) if (!alive(a)) G.allies = G.allies.filter(x => x !== a);

  processWars();
  if (G.over) return;
  processBelanda();

  const unstable = myRegions().filter(r => G.reg[r].stab < 20);
  if (unstable.length && chance(0.04)) G.queue.push({ ev: 'pemberontakan', ctx: { rid: pick(unstable) } });
  const disloyal = nobles().filter(c => c.loy < 15);
  if (disloyal.length && chance(0.03)) G.queue.push({ ev: 'membelot', ctx: { cid: disloyal[0].id } });
  if (chance(0.065)) { const e = pickRandomEvent(); if (e) G.queue.push(e); }
  if (G.year >= 1908) addNat((myRegions().reduce((s, r) => s + G.reg[r].school, 0) * 0.35 + 0.3) * M);
}

function newYear(prevYear){
  const f = P();
  log(`Tahun ${prevYear} ditutup. Kas kerajaan ${fmt(f.kas)} gulden, ${myRegions().length} wilayah, ${fmt(f.army)} prajurit.`, 'penting');
  if (G.flags.loanYears > 0) G.flags.loanYears--;
  G.price.rempah = Math.max(0.6, G.price.rempah - 0.004);
  yearlyCharacters();
  if (typeof saveNow === 'function') saveNow();
}

function dateTriggers(cur){
  const now = dateKey(cur.y, cur.m + 1, cur.d);
  NEWS.forEach((n, i) => { if (!G.flags['n' + i] && now >= dateKey(n.y, n.m, n.d)) { G.flags['n' + i] = 1; n.fn(); } });
  EXPED.forEach((e, i) => {
    if (G.flags['x' + i] || now < dateKey(e.y, e.m)) return;
    G.flags['x' + i] = 1;
    if (e.r) { if (G.reg[e.r].owner === 'adat') { setOwner(e.r, 'belanda'); log(`Belanda menaklukkan ${RD(e.r).name}.`, 'kabar'); } return; }
    if (e.t === G.player) { if (!isVassal() && !atWarWith('belanda') && !G.japan) G.queue.push({ ev: 'ultimatum', ctx: { hist: true } }); return; }
    if (!G.japan) resolveAIExpedition(e.t, e.v);
  });
  for (const h of HISTORY) if (!G.flags['h_' + h.ev] && now >= dateKey(h.y, h.m, h.d) && (!h.cond || h.cond())) { G.flags['h_' + h.ev] = 1; G.queue.push({ ev: h.ev, ctx: {} }); }
}

function monthlyCharacters(){
  const f = P(), M = 1 / 12, report = [];
  let rulerDied = false;
  for (const c of court()) {
    const pd = c.hd ? (G.year < c.hd ? deathChance(c) * M * 0.25 : 0.12) : deathChance(c) * M;
    if (!chance(pd)) continue;
    c.alive = false;
    if (c.id === f.ruler) { rulerDied = true; report.push(`${charName(c)} wafat pada usia ${age(c)} tahun.`); log(`${charName(c)} wafat.`, 'buruk'); }
    else if (c.dyn || c.sp === f.ruler) { log(`${charName(c)} meninggal dunia pada usia ${age(c)} tahun.`, 'info'); toast(`${charName(c)} meninggal dunia.`); }
    else if (c.noble) log(`${charName(c)} meninggal dunia.`, 'info');
    for (const s of Object.keys(f.council)) if (f.council[s] === c.id) f.council[s] = null;
  }
  if (rulerDied) { succession(report); if (!G.over) notice('Pergantian takhta', report.join(' ')); }
  if (G.over) return;
  const r = rulerC();
  // kelahiran: setiap pasangan dalam wangsa bisa punya anak
  for (const c of family()) {
    const sp = CH(c.sp);
    if (!sp || !sp.alive || sp.out || c.infertile || sp.infertile) continue;
    if (c.g === 'P' && c.id !== f.ruler) continue; // anak dari putri yang tinggal di istana dicatat lewat pasangannya
    const mother = c.g === 'P' ? c : sp;
    if (age(mother) < 16 || age(mother) > 42) continue;
    if (!chance((c.id === f.ruler ? 0.26 : 0.18) * M)) continue;
    const k = newChar({ fac: G.player, cul: D(G.player).culture, age: 0, dyn: true, par: c.id });
    log(`Lahir ${k.n}, ${k.g === 'L' ? 'putra' : 'putri'} ${charName(c)}.`, 'baik');
    if (c.id === f.ruler) {
      toast(`Kabar gembira: lahir ${k.g === 'L' ? 'seorang putra' : 'seorang putri'}, ${k.n}.`, true);
      if (!heirC() || (k.g === 'L' && heirC().g === 'P' && heirC().par === r.id)) f.heir = defaultHeir();
    }
  }
  histBirths();
  for (const c of nobles()) {
    const seat = Object.values(f.council).includes(c.id);
    const t = 45 + (f.legit ?? 60) * 0.25 + TAX[f.tax].loy + (seat ? 10 : 0) - (hasTrait(r, 'serakah') ? 10 : 0) - (G.rel.belanda < 0 ? 6 : 0);
    c.loy = clamp(c.loy + (t - c.loy) * 0.025 + (rand() - 0.55) * 2.5, 0, 100);
  }
  autoCouncilFill();
  if (!heirC()) f.heir = defaultHeir();
}

function histBirths(){
  if (!G.hbirths || !G.hbirths.length) return;
  for (const hb of G.hbirths.slice()) {
    if (G.year < hb.y || (G.year === hb.y && G.month + 1 < hb.m)) continue;
    G.hbirths.splice(G.hbirths.indexOf(hb), 1);
    const h = hb.h, par = h.par ? CH(G.hkey[h.par]) : null;
    if (h.par && (!par || !par.alive || par.out)) continue; // sejarah sudah berbelok
    const c = newChar({ fac: G.player, cul: D(G.player).culture, g: h.g, b: G.year, dyn: true, par: par ? par.id : null, mil: h.mil, dip: h.dip, adm: h.adm, traits: [] });
    c.n = h.n; if (h.full) c.full = h.full; c.hist = true; if (h.hd) c.hd = h.hd + rint(-1, 2); c.futureTraits = h.tr || [];
    if (h.key) G.hkey[h.key] = c.id;
    if (h.heir && (!par || par.id === P().ruler)) P().heir = c.id;
    log(`Lahir ${c.full || c.n}, tokoh yang tercatat dalam sejarah.`, 'baik');
    toast(`Lahir ${c.full || c.n}.`, true);
  }
}

function yearlyCharacters(){
  for (const c of family()) {
    if (age(c) >= 16 && !c.eduDone) {
      c.eduDone = true;
      const map = { agama: ['saleh','adm'], militer: ['cakap_perang','mil'], praja: ['cermat','adm'], eropa: ['pembaharu','dip'] };
      if (c.edu && map[c.edu]) {
        c[map[c.edu][1]] = clamp(c[map[c.edu][1]] + 2, 0, 10);
        if (chance(0.7) && !c.tr.includes(map[c.edu][0])) c.tr.push(map[c.edu][0]);
        if (c.edu === 'eropa') addRel('belanda', 6);
      }
      for (const t of (c.futureTraits || [])) if (!c.tr.includes(t)) c.tr.push(t);
      if (!c.tr.length) c.tr.push(chance(0.6) ? pick(GOOD_TRAITS) : pick(BAD_TRAITS));
      log(`${charName(c)} telah dewasa.`, 'info');
    }
  }
  // pernikahan dalam wangsa
  for (const c of family()) {
    if (c.sp && CH(c.sp) && CH(c.sp).alive) continue;
    const a = age(c); if (a < 18 || a > 40) continue;
    const key = c.id === P().ruler || c.id === P().heir;
    if (!chance(key ? 0.6 : 0.3)) continue;
    if (c.g === 'P' && !key) { c.out = true; log(`${charName(c)} menikah dan pindah ke keluarga suaminya.`, 'info'); continue; }
    const sp = newChar({ fac: G.player, cul: D(G.player).culture, g: c.g === 'L' ? 'P' : 'L', age: Math.max(16, a - rint(0, 8)), adultTraits: true });
    c.sp = sp.id; sp.sp = c.id;
    log(`${charName(c)} menikah dengan ${sp.n}.`, 'info');
  }
  if (nobles().length < 5 && chance(0.4)) { const c = newChar({ fac: G.player, cul: D(G.player).culture, age: rint(18, 30), noble: true, adultTraits: true }); log(`${charName(c)} bergabung dengan istana.`, 'info'); }
}

function autoCouncilFill(){ const f = P(); for (const s of Object.keys(f.council)) { const c = CH(f.council[s]); if (!c || !c.alive || c.out) f.council[s] = null; } }

/* ---------- lencana ---------- */
function earn(id){
  if (G.badgesGame.includes(id)) return;
  G.badgesGame.push(id);
  const isNew = !META.badges[id];
  if (isNew) { META.badges[id] = G.year; META.xp += 60; saveMeta(); }
  log(`Lencana diraih: ${BADGES[id].n}.`, 'baik');
  toast(`Lencana ${isNew ? 'baru' : ''} diraih: ${BADGES[id].n}`, true);
}
function checkBadges(){
  if (!G) return;
  const mine = myRegions();
  if (G.year > START_YEAR) earn('tahun1');
  if (G.year >= 1860 && mine.length) earn('generasi');
  if (G.year >= 1900 && mine.length) earn('abad');
  if (P().kas >= 2500) earn('saudagar');
  if (G.stats.wins >= 5) earn('panglima');
  if (G.stats.dynRulers >= 3) earn('dinasti');
  if (mine.length >= 10) earn('pemersatu');
  if (mine.reduce((s, r) => s + (G.reg[r].school > 0 ? 1 : 0), 0) >= 5) earn('pelita');
  if (G.stats.marriages >= 2) earn('besan');
}

/* ---------- akhir permainan dan skor ---------- */
function finalScore(){
  const mine = myRegions(), f = P();
  const pop = mine.reduce((s, r) => s + G.reg[r].pop, 0);
  const years = G.year - START_YEAR;
  if (!mine.length) return Math.round(years * 4 + G.stats.wins * 15 + G.badgesGame.length * 40);
  return Math.round(mine.length * 40 + pop / 40 + Math.min(200, f.kas / 25) + (f.legit ?? 60) + G.kebangsaan * 3 + (f.overlord ? 120 : 300) + G.stats.wins * 15 + G.badgesGame.length * 40 + years * 3);
}
function epilogue(choice){
  const f = P(), mine = myRegions(), n = G.kebangsaan, name = D(G.player).name;
  if (!mine.length) return G.over?.text || `${name} runtuh sebelum fajar kemerdekaan.`;
  if (choice === 'dukung' && n >= 45) return `Kabar proklamasi disambut dengan sukacita. ${charName(rulerC())} mengirim kawat dukungan kepada Soekarno dan Hatta. ${name} melebur ke dalam Republik Indonesia dan dikenang sebagai salah satu kerajaan yang paling awal berdiri di belakang proklamasi.`;
  if (choice === 'dukung') return `${charName(rulerC())} menyatakan dukungan kepada Republik, walau sebagian bangsawan masih ragu. ${name} bergabung dengan Republik Indonesia di tengah gejolak revolusi.`;
  if (!f.overlord && n < 30) return `${name} menunggu dengan hati-hati. Tanpa banyak kaum muda yang tergerak oleh gagasan kebangsaan, istana memilih bertahan sendiri dan harus menghadapi revolusi yang bergolak di sekelilingnya.`;
  return `${name} memilih menunggu perkembangan. Di jalan-jalan, para pemuda sudah lebih dulu mengibarkan Merah Putih, dan istana akhirnya harus menentukan sikap di tengah revolusi.`;
}

/* ---------- peristiwa ---------- */
function randMine(filter){ const m = myRegions().filter(filter || (() => true)); return m.length ? pick(m) : null; }
const coastal = rid => ['pesisir','pulau'].includes(RD(rid).ter);
const isMuslimKingdom = () => ['aceh','bone','banjar','siak','ternate','gowa','yogya','surakarta'].includes(G.player);

const EVENTS = {
  sambutan: { hist: true,
    title: () => `${dateStr()}: ${D(G.player).short} menanti titahmu`,
    text: () => `${charName(rulerC())} kini memegang takhta ${D(G.player).name}. Hindia Belanda baru saja memenangkan Perang Jawa dan bersiap menancapkan kuasanya di seluruh Nusantara. Tujuanmu: bertahan hingga 17 Agustus 1945, menjaga wangsa tetap berkuasa, dan meninggalkan warisan yang dikenang.<br><br><b>Waktu berjalan sendiri</b>, satu minggu demi satu minggu. Tekan tombol <b>Jalan</b> atau spasi untuk memulai, dan atur kecepatannya kapan saja. Permainan berhenti sendiri ketika ada peristiwa penting.<br><br>Setiap tindakan memakai <b>wibawa</b> yang terkumpul perlahan setiap bulan. Pembangunan butuh waktu berbulan-bulan dan biayanya dicicil setiap minggu.${isVassal() ? '<br><br>Kerajaanmu berstatus <b>bawahan Belanda</b>. Kamu wajib membayar upeti. Naikkan <b>kemandirian</b> bila suatu saat ingin lepas.' : ''}`,
    opts: [{ t: 'Mulai memerintah', fx: () => '' }] },

  kabar: { title: c => c.title, text: c => esc(c.text), opts: [{ t: 'Lanjutkan', fx: () => '' }] },

  tawaransekutu: {
    title: c => `${D(c.fid).short} mengajak bersekutu`,
    text: c => `Utusan ${D(c.fid).name} datang membawa surat dan hadiah. Mereka menawarkan persekutuan: saling membantu bila salah satu diserang.`,
    opts: [
      { t: 'Terima persekutuan', h: 'Sekutu ikut membantu dalam perang, dan bisa meminta bantuan kita', ok: c => alive(c.fid) && !isVassal(), fx: c => { if (!G.allies.includes(c.fid)) G.allies.push(c.fid); addRel(c.fid, 10); log(`Persekutuan dengan ${D(c.fid).name} disepakati.`, 'baik'); return `${D(c.fid).short} kini sekutu kita.`; } },
      { t: 'Tolak dengan halus', h: 'Hubungan -5', fx: c => { addRel(c.fid, -5); return 'Utusan pulang dengan tangan kosong.'; } }
    ] },
  tawarandagang: {
    title: c => `${D(c.fid).short} menawarkan perjanjian dagang`,
    text: c => `Para saudagar ${D(c.fid).name} ingin berdagang lebih bebas di pelabuhan kita. Perjanjian dagang menambah penghasilan setiap bulan.`,
    opts: [
      { t: 'Terima', h: 'Penghasilan naik, memakai satu jalur dagang', ok: c => alive(c.fid) && (G.trade || []).length < tradeSlots(), fx: c => { ensureDiplo(); if (!G.trade.includes(c.fid)) G.trade.push(c.fid); addRel(c.fid, 5); checkBadges(); return `Perjanjian dagang dengan ${D(c.fid).short} berlaku.`; } },
      { t: 'Tolak', h: 'Tidak ada perubahan', fx: () => 'Tawaran itu ditolak.' }
    ] },
  panggilansekutu: {
    title: c => `${D(c.fid).short} meminta bantuan`,
    text: c => `${D(c.enemy).name} menyerang sekutu kita, ${D(c.fid).name}. Utusan mereka mengingatkan sumpah persekutuan dan meminta kita ikut berperang.`,
    opts: [
      { t: 'Ikut berperang', h: `Perang dengan penyerang, sekutu bertempur di pihak kita`, ok: c => !isVassal() && alive(c.enemy) && alive(c.fid), fx: c => { startWar(c.enemy, 'biasa', { quiet: true, noEnemyAllies: true }); const w = warWith(c.enemy); if (w && !w.allies.includes(c.fid)) w.allies.push(c.fid); addRel(c.fid, 15); addLegit(3); return `Kita berperang bersama ${D(c.fid).short} melawan ${D(c.enemy).short}.`; } },
      { t: 'Tolak', h: 'Persekutuan putus, hubungan -25 (bawahan Belanda tidak dihukum)', fx: c => { if (isVassal()) return 'Belanda melarang kita ikut berperang. Sekutu kita memaklumi.'; G.allies = G.allies.filter(a => a !== c.fid); addRel(c.fid, -25); addLegit(-3); return `Persekutuan dengan ${D(c.fid).short} berakhir.`; } }
    ] },

  tanampaksa: { hist: true,
    title: () => 'Tanam Paksa diberlakukan',
    text: () => 'Gubernur Jenderal van den Bosch memberlakukan Sistem Tanam Paksa. Residen meminta sebagian sawah kerajaan ditanami kopi, gula, dan nila untuk pasar Eropa. Imbalannya, istana dijanjikan bagian dari hasil penjualan.',
    opts: [
      { t: 'Serahkan sebagian tanah', h: 'Kas +120, hubungan dengan Belanda +15, kemakmuran satu wilayah -12', fx: () => { addKas(120); addRel('belanda', 15); const r = randMine(); if (r) G.reg[r].pros = Math.max(5, G.reg[r].pros - 12); return 'Kas istana bertambah, tetapi petani di desa mulai kelaparan.'; } },
      { t: 'Tolak dengan halus', h: 'Legitimasi +5, hubungan dengan Belanda -15', fx: () => { addLegit(5); addRel('belanda', -15); return 'Rakyat lega, tetapi Residen mencatat penolakanmu.'; } }
    ] },

  ultimatum: {
    title: () => 'Ultimatum dari Batavia',
    text: c => (G.player === 'aceh' && G.year >= 1871 && G.year <= 1875)
      ? 'Setelah Traktat Sumatra, Inggris tidak lagi melindungi Aceh. Komisaris Nieuwenhuyzen menuntut Sultan mengakui kedaulatan Belanda. Kapal perang sudah membuang sauh di lepas pantai Kutaraja.'
      : `Gubernur Jenderal mengirim utusan bersenjata. Ia menuntut ${D(G.player).name} mengakui kedaulatan Belanda dan menandatangani perjanjian pendek. Penolakan akan dibalas dengan ekspedisi militer.`,
    opts: [
      { t: 'Tanda tangani perjanjian', h: 'Menjadi bawahan Belanda, legitimasi -10, aman dari serangan', fx: () => { becomeVassal(); addLegit(-10); return 'Bendera Belanda kini berkibar di samping panji kerajaan.'; } },
      { t: 'Serahkan satu wilayah perbatasan', h: 'Kehilangan wilayah terkecil, hubungan +20, legitimasi -6', ok: () => myRegions().length >= 2, fx: () => { const r = myRegions().filter(x => x !== P().cap).sort((a, b) => G.reg[a].pop - G.reg[b].pop)[0]; setOwner(r, 'belanda'); addRel('belanda', 20); addLegit(-6); G.truceUntil = G.year + 6; return `${RD(r).name} diserahkan kepada Belanda. Untuk sementara, ancaman mereda.`; } },
      { t: 'Tolak dan angkat senjata', h: 'Perang dengan Hindia Belanda, legitimasi +6', fx: () => { startWar('belanda', 'kolonial'); addLegit(6); return 'Genderang perang ditabuh. Seluruh negeri bersiap.'; } }
    ] },

  tuntutan: {
    title: () => 'Tuntutan Residen',
    text: () => 'Residen Belanda datang ke istana dengan daftar tuntutan baru: tambahan upeti dan hak campur tangan dalam urusan pengangkatan pejabat.',
    opts: [
      { t: 'Bayar 150 gulden', h: 'Kas -150, hubungan +8', ok: () => P().kas >= 150, fx: () => { addKas(-150); addRel('belanda', 8); return 'Residen pulang dengan puas.'; } },
      { t: 'Terima campur tangan Residen', h: 'Kemandirian -12, hubungan +12', fx: () => { addIndep(-12); addRel('belanda', 12); return 'Pejabat istana kini harus disetujui Residen.'; } },
      { t: 'Tolak tuntutan', h: 'Kemandirian +6, hubungan -20, legitimasi +3', fx: () => { addIndep(6); addRel('belanda', -20); addLegit(3); if (G.rel.belanda < -35 && myRegions().length > 1) { const r = myRegions().filter(x => x !== P().cap).sort((a, b) => G.reg[a].pop - G.reg[b].pop)[0]; setOwner(r, 'belanda'); return `Belanda membalas dengan mengambil alih ${RD(r).name}.`; } return 'Residen pergi dengan wajah masam.'; } }
    ] },

  damaibelanda: {
    title: () => 'Belanda menawarkan damai',
    text: () => 'Perang yang berlarut menguras kas dan nyawa serdadu Belanda. Parlemen di Den Haag mendesak agar perang dihentikan. Utusan Batavia datang membawa naskah perjanjian damai tanpa tuntutan wilayah.',
    opts: [
      { t: 'Terima perdamaian', h: 'Perang berakhir, kerajaan tetap berdaulat', fx: () => { const w = warWith('belanda'); endWar('belanda', 'Hindia Belanda menandatangani perdamaian.'); addLegit(12); if (w && w.kind === 'merdeka') { P().overlord = null; P().indep = 100; earn('merdeka'); } earn('tegak'); return 'Kemenangan diplomatik yang dikenang turun-temurun.'; } }
    ] },

  tawaranmenyerah: {
    title: () => 'Usul menyerah',
    text: () => 'Wilayah demi wilayah jatuh. Para bangsawan memohon agar raja menerima syarat Belanda sebelum keraton ikut direbut.',
    opts: [
      { t: 'Terima syarat Belanda', h: 'Perang berakhir, menjadi bawahan, legitimasi -12', fx: () => { becomeVassal(); addLegit(-12); return 'Perang usai dengan pahit.'; } },
      { t: 'Bertahan sampai titik darah penghabisan', h: 'Perang berlanjut, legitimasi +4', fx: () => { addLegit(4); return 'Raja menolak menyerah. Rakyat bersumpah setia.'; } }
    ] },

  damaiai: {
    title: c => `${D(c.fid).short} menawarkan damai`,
    text: c => `Utusan ${D(c.fid).name} datang membawa sirih pinang dan tawaran damai. Wilayah yang sudah direbut tetap menjadi milik masing-masing.`,
    opts: [
      { t: 'Terima', h: 'Perang berakhir', fx: c => { endWar(c.fid); return 'Perdamaian dipulihkan.'; } },
      { t: 'Tolak', h: 'Perang berlanjut', fx: () => 'Perang berlanjut.' }
    ] },

  bantusekutu: {
    title: c => `${D(c.fid).short} meminta bantuan`,
    text: c => `Sekutu kita, ${D(c.fid).name}, diserang ekspedisi Belanda. Utusan mereka memohon bala bantuan.`,
    opts: [
      { t: 'Kirim separuh pasukan', h: 'Pasukan ikut bertempur, hubungan dengan Belanda -25', ok: () => P().army >= 500, fx: c => { const n = Math.round(P().army * 0.5); const ok = !doAIExpedition(c.fid, c.v, n * P().quality * battleMod(), null); P().army -= Math.round(n * (ok ? 0.15 : 0.4)); addRel('belanda', -25); addRel(c.fid, 25); if (ok) { G.stats.wins++; return `Bersama ${D(c.fid).short}, kita memukul mundur Belanda.`; } return `Walau dibantu, ${D(c.fid).short} tetap kalah.`; } },
      { t: 'Tolak dengan halus', h: 'Persekutuan putus', fx: c => { G.allies = G.allies.filter(a => a !== c.fid); addRel(c.fid, -30); doAIExpedition(c.fid, c.v, 0, null); return `Persekutuan dengan ${D(c.fid).short} berakhir.`; } }
    ] },

  pemberontakan: {
    title: c => `Pemberontakan di ${RD(c.rid).name}`,
    text: c => `Ketidakpuasan di ${RD(c.rid).name} meledak menjadi pemberontakan. Para pemimpin lokal menolak membayar pajak dan mengangkat senjata.`,
    opts: [
      { t: 'Tumpas dengan pasukan', h: 'Pertempuran melawan pemberontak', fx: c => { const R = G.reg[c.rid]; const res = fight(P().army, P().quality, battleMod(), R.pop * 2.2, 0.6, 1); P().army = Math.max(0, P().army - res.aLoss); if (res.win) { R.stab = 40; return `Pemberontakan dipadamkan. ${fmt(res.aLoss)} prajurit gugur.`; } setOwner(c.rid, 'adat'); addLegit(-6); return `Pasukan kalah. ${RD(c.rid).name} melepaskan diri.`; } },
      { t: 'Berunding dan beri keringanan', h: 'Kas -100, ketenteraman +25, legitimasi -3', ok: () => P().kas >= 100, fx: c => { addKas(-100); G.reg[c.rid].stab += 25; addLegit(-3); return 'Para pemimpin lokal pulang dengan janji keringanan.'; } },
      { t: 'Biarkan wilayah itu lepas', h: 'Kehilangan wilayah', ok: () => myRegions().length > 1, fx: c => { setOwner(c.rid, 'adat'); addLegit(-8); return `${RD(c.rid).name} lepas dari kerajaan.`; } }
    ] },

  membelot: {
    title: c => `${charName(CH(c.cid))} membangkang`,
    text: c => `Mata-mata istana melaporkan bahwa ${charName(CH(c.cid))} sering bertemu utusan Residen Belanda dan mengumpulkan pengikut bersenjata.`,
    opts: [
      { t: 'Tangkap dan asingkan', h: 'Bangsawan disingkirkan, kesetiaan bangsawan lain -6', fx: c => { const x = CH(c.cid); x.out = true; for (const n of nobles()) n.loy -= 6; autoCouncilFill(); return `${x.n} diasingkan ke pulau terpencil.`; } },
      { t: 'Beri tanah lungguh', h: 'Kas -120, kesetiaannya +35', ok: () => P().kas >= 120, fx: c => { addKas(-120); CH(c.cid).loy += 35; return 'Hadiah tanah meredakan amarahnya untuk sementara.'; } },
      { t: 'Abaikan', h: 'Ia bisa membelot ke Belanda', fx: c => { const x = CH(c.cid); x.out = true; autoCouncilFill(); const r = randMine(); if (r) G.reg[r].stab = Math.max(0, G.reg[r].stab - 20); addRel('belanda', -5); return `${x.n} membelot ke Belanda bersama pengikutnya.`; } }
    ] },

  /* peristiwa acak */
  panen: { w: 8, prep: () => { const r = randMine(x => RD(x).com === 'beras' || G.reg[x].pros > 30); return r ? { rid: r } : null; },
    title: c => `Panen raya di ${RD(c.rid).name}`,
    text: c => `Hujan turun tepat waktu dan sawah di ${RD(c.rid).name} menguning lebih awal. Lumbung-lumbung penuh.`,
    opts: [
      { t: 'Simpan di lumbung kerajaan', h: 'Ketenteraman +12', fx: c => { G.reg[c.rid].stab += 12; return 'Rakyat merasa aman menghadapi musim kering.'; } },
      { t: 'Jual ke pedagang pesisir', h: 'Kas +90', fx: () => { addKas(90); return 'Kas kerajaan bertambah.'; } }
    ] },
  paceklik: { w: 7, prep: () => { const r = randMine(); return r ? { rid: r } : null; },
    title: c => `Paceklik di ${RD(c.rid).name}`,
    text: c => `Kemarau panjang membuat panen di ${RD(c.rid).name} gagal. Harga beras melambung dan rakyat mulai kelaparan.`,
    opts: [
      { t: 'Bagikan beras dari lumbung', h: 'Kas -80, ketenteraman tetap terjaga', ok: () => P().kas >= 80, fx: c => { addKas(-80); addLegit(2); return 'Rakyat berterima kasih atas kemurahan raja.'; } },
      { t: 'Biarkan pasar bekerja', h: 'Ketenteraman -18, penduduk -3 persen', fx: c => { G.reg[c.rid].stab -= 18; G.reg[c.rid].pop *= 0.97; addLegit(-3); return 'Banyak keluarga mengungsi mencari makan.'; } }
    ] },
  kolera: { w: 5, prep: () => { const r = randMine(x => G.reg[x].pop > 60); return r ? { rid: r } : null; },
    title: c => `Wabah kolera di ${RD(c.rid).name}`,
    text: c => `Wabah kolera menyebar dari pelabuhan ke desa-desa di ${RD(c.rid).name}. Setiap hari ada yang dikuburkan.`,
    opts: [
      { t: 'Panggil tabib dan pisahkan yang sakit', h: 'Kas -60, korban berkurang', ok: () => P().kas >= 60, fx: c => { addKas(-60); G.reg[c.rid].pop *= 0.98; return 'Wabah berhasil dibendung.'; } },
      { t: 'Gelar doa bersama', h: 'Legitimasi +2, penduduk -6 persen', fx: c => { G.reg[c.rid].pop *= 0.94; addLegit(2); G.reg[c.rid].pros -= 5; return 'Doa menenangkan hati, tetapi wabah terus memakan korban.'; } }
    ] },
  kapalinggris: { w: 6, prep: () => (myRegions().some(coastal) && !G.japan ? {} : null),
    title: () => 'Kapal dagang dari Penang',
    text: () => 'Sebuah kapal dagang Inggris dari Penang berlabuh di pelabuhan kerajaan. Nakhodanya menawarkan senapan dan mesiu, atau sekadar membeli hasil bumi dengan harga baik.',
    opts: [
      { t: 'Beli senapan', h: 'Kas -200, mutu pasukan +0,12, hubungan dengan Belanda -10', ok: () => P().kas >= 200, fx: () => { addKas(-200); P().quality = Math.min(1.6, P().quality + 0.12); addRel('belanda', -10); return 'Senapan baru dibagikan kepada pasukan pengawal.'; } },
      { t: 'Jual hasil bumi', h: 'Kas +110', fx: () => { addKas(110); return 'Transaksi berjalan lancar.'; } },
      { t: 'Usir kapal itu', h: 'Hubungan dengan Belanda +5', fx: () => { addRel('belanda', 5); return 'Kapal itu berlayar pergi.'; } }
    ] },
  ulama: { w: 4, prep: () => (isMuslimKingdom() ? {} : null),
    title: () => 'Seruan para ulama',
    text: () => 'Sekelompok ulama yang baru pulang dari Mekkah menyerukan perlawanan terhadap kafir Belanda. Khutbah mereka membakar semangat pemuda di masjid-masjid.',
    opts: [
      { t: 'Dukung seruan itu', h: 'Pasukan +600, legitimasi +4, hubungan dengan Belanda -15', fx: () => { P().army += 600; addLegit(4); addRel('belanda', -15); return 'Ratusan pemuda menyatakan siap berjuang.'; } },
      { t: 'Redam dengan bijak', h: 'Hubungan dengan Belanda +6, legitimasi -2', fx: () => { addRel('belanda', 6); addLegit(-2); return 'Istana meminta ulama menahan diri.'; } }
    ] },
  pedagang: { w: 5,
    title: () => 'Pedagang meminta hak pajak pasar',
    text: () => 'Seorang saudagar kaya menawarkan uang muka besar bila diberi hak memungut pajak pasar dan pelabuhan selama beberapa tahun.',
    opts: [
      { t: 'Berikan hak itu', h: 'Kas +170, ketenteraman semua wilayah -5', fx: () => { addKas(170); addStabAll(-5); return 'Kas penuh, tetapi pedagang kecil mengeluh.'; } },
      { t: 'Tolak', h: 'Tidak ada perubahan', fx: () => 'Saudagar itu pulang dengan kecewa.' }
    ] },
  bajaklaut: { w: 5, prep: () => { const r = randMine(coastal); return r ? { rid: r } : null; },
    title: c => `Bajak laut di perairan ${RD(c.rid).name}`,
    text: c => `Kapal-kapal bajak laut mengganggu jalur dagang di sekitar ${RD(c.rid).name}. Pedagang enggan singgah.`,
    opts: [
      { t: 'Kirim armada', h: 'Pasukan -300, kemakmuran wilayah pulih', ok: () => P().army >= 400, fx: c => { P().army -= 300; G.reg[c.rid].pros += 6; G.stats.wins++; return 'Sarang bajak laut dihancurkan.'; } },
      { t: 'Bayar uang perlindungan', h: 'Kas -70', ok: () => P().kas >= 70, fx: () => { addKas(-70); return 'Bajak laut menyingkir untuk sementara.'; } },
      { t: 'Abaikan', h: 'Kemakmuran wilayah -12', fx: c => { G.reg[c.rid].pros -= 12; return 'Perdagangan merosot.'; } }
    ] },
  gempa: { w: 3, prep: () => { const r = randMine(); return r ? { rid: r } : null; },
    title: c => `Gunung meletus di ${RD(c.rid).name}`,
    text: c => `Gunung di ${RD(c.rid).name} memuntahkan abu dan lahar. Desa-desa tertimbun dan sawah rusak.`,
    opts: [
      { t: 'Bangun kembali desa-desa', h: 'Kas -100, kemakmuran -6', ok: () => P().kas >= 100, fx: c => { addKas(-100); G.reg[c.rid].pros -= 6; addLegit(2); return 'Pembangunan kembali dimulai.'; } },
      { t: 'Serahkan kepada rakyat', h: 'Kemakmuran -18, ketenteraman -10', fx: c => { G.reg[c.rid].pros -= 18; G.reg[c.rid].stab -= 10; return 'Rakyat membangun sendiri dengan susah payah.'; } }
    ] },
  tambang: { w: 3, prep: () => { const r = randMine(x => ['hutan','pegunungan'].includes(RD(x).ter)); return r ? { rid: r } : null; },
    title: c => `Urat emas ditemukan di ${RD(c.rid).name}`,
    text: c => `Penambang menemukan urat emas di perbukitan ${RD(c.rid).name}. Kabarnya cepat menyebar, termasuk ke telinga Residen.`,
    opts: [
      { t: 'Kelola oleh istana', h: 'Kemakmuran +15, hubungan dengan Belanda -5', fx: c => { G.reg[c.rid].pros += 15; addRel('belanda', -5); return 'Tambang dibuka dan dijaga ketat.'; } },
      { t: 'Jual konsesi kepada Belanda', h: 'Kas +220, hubungan +10, kemandirian -5', fx: () => { addKas(220); addRel('belanda', 10); addIndep(-5); return 'Perusahaan Belanda membuka tambang.'; } }
    ] },
  turki: { w: 2, prep: () => (['aceh','siak','banjar','bone','gowa','ternate'].includes(G.player) && !isVassal() && !G.flags.turki ? {} : null),
    title: () => 'Surat untuk Sultan Utsmani',
    text: () => 'Para penasihat mengusulkan mengirim utusan ke Istanbul, memohon perlindungan Kesultanan Utsmani sebagai sesama negeri Islam.',
    opts: [
      { t: 'Kirim utusan', h: 'Kas -120, legitimasi +6, Belanda menunda serangan', ok: () => P().kas >= 120, fx: () => { addKas(-120); addLegit(6); G.flags.turki = 1; G.truceUntil = Math.max(G.truceUntil, G.year + 4); addRel('belanda', -8); return 'Utusan berangkat. Kabar ini membuat Batavia berhati-hati.'; } },
      { t: 'Tidak perlu', h: 'Tidak ada perubahan', fx: () => 'Usul itu disimpan.' }
    ] },
  perayaan: { w: 5,
    title: () => 'Perayaan besar di istana',
    text: () => `Hari besar tiba. Para bangsawan berharap istana menggelar perayaan meriah dengan arak-arakan, gamelan, dan jamuan untuk rakyat.`,
    opts: [
      { t: 'Gelar perayaan megah', h: 'Kas -90, legitimasi +6, kesetiaan bangsawan +8', ok: () => P().kas >= 90, fx: () => { addKas(-90); addLegit(6); for (const n of nobles()) n.loy += 8; return 'Perayaan berlangsung tujuh hari tujuh malam.'; } },
      { t: 'Perayaan sederhana', h: 'Legitimasi +1', fx: () => { addLegit(1); return 'Rakyat tetap bersukacita.'; } }
    ] },
  korupsi: { w: 4, prep: () => { const p = councilOf('patih'); return p ? { cid: p.id } : null; },
    title: () => 'Bendahara kehilangan uang',
    text: c => `Juru tulis menemukan selisih besar dalam pembukuan kas. Jejaknya mengarah ke orang-orang dekat ${charName(CH(c.cid))}, sang patih.`,
    opts: [
      { t: 'Copot sang patih', h: 'Kas +60 dikembalikan, kesetiaannya -30', fx: c => { addKas(60); const x = CH(c.cid); x.loy -= 30; P().council.patih = null; return `${x.n} dicopot dari jabatannya.`; } },
      { t: 'Tutup perkara ini', h: 'Kas -80', fx: () => { addKas(-80); return 'Uang itu tidak pernah kembali.'; } }
    ] },
  pinjaman: { w: 3, prep: () => (P().kas < 200 && !(G.flags.loanYears > 0) ? {} : null),
    title: () => 'Tawaran pinjaman saudagar',
    text: () => 'Seorang saudagar Hadrami menawarkan pinjaman besar kepada istana. Cicilannya dibayar selama delapan tahun.',
    opts: [
      { t: 'Terima pinjaman', h: 'Kas +400 sekarang, -60 per tahun selama 8 tahun', fx: () => { addKas(400); G.flags.loanYears = 8; return 'Kas istana kembali penuh.'; } },
      { t: 'Tolak', h: 'Tidak ada perubahan', fx: () => 'Istana tetap berhemat.' }
    ] },
  rajasakit: { w: 3, prep: () => (rulerC() && age(rulerC()) > 35 ? {} : null),
    title: () => 'Raja jatuh sakit',
    text: () => `${charName(rulerC())} terserang demam tinggi. Para tabib istana silang pendapat tentang obatnya.`,
    opts: [
      { t: 'Panggil dokter Belanda', h: 'Kas -50, hubungan +5, peluang sembuh tinggi', ok: () => P().kas >= 50, fx: () => { addKas(-50); addRel('belanda', 5); if (chance(0.1)) { rulerC().tr.push('lemah'); return 'Raja sembuh, tetapi tubuhnya melemah.'; } return 'Raja pulih seperti sediakala.'; } },
      { t: 'Percayakan kepada tabib istana', h: 'Peluang sakit berkepanjangan', fx: () => { if (chance(0.35)) { if (!rulerC().tr.includes('lemah')) rulerC().tr.push('lemah'); return 'Raja sembuh, tetapi sering sakit sejak itu.'; } return 'Ramuan tabib berhasil.'; } }
    ] },
  pewarisnakal: { w: 3, prep: () => { const h = heirC(); return h && age(h) >= 14 && age(h) <= 25 ? { cid: h.id } : null; },
    title: c => `Ulah ${charName(CH(c.cid))}`,
    text: c => `${charName(CH(c.cid))} kedapatan berjudi dan berselisih dengan putra seorang bangsawan. Kabar ini menjadi gunjingan di pasar.`,
    opts: [
      { t: 'Hukum dengan tegas', h: 'Pewaris mendapat sifat cermat atau peragu', fx: c => { const x = CH(c.cid); const t = chance(0.6) ? 'cermat' : 'peragu'; if (!x.tr.includes(t)) x.tr.push(t); return `${x.n} kini ${TRAITS[t].n.toLowerCase()}.`; } },
      { t: 'Bayar ganti rugi diam-diam', h: 'Kas -60, legitimasi -2', fx: () => { addKas(-60); addLegit(-2); return 'Perkara selesai tanpa ribut.'; } }
    ] },
  zending: { w: 2, prep: () => (['batak','klungkung','ternate'].includes(G.player) ? {} : null),
    title: () => 'Zending meminta izin',
    text: () => 'Para penginjil dari Eropa meminta izin membuka sekolah dan rumah sakit di wilayah kerajaan.',
    opts: [
      { t: 'Izinkan dengan batasan', h: 'Sekolah baru di satu wilayah, legitimasi -3, hubungan +6', fx: () => { const r = randMine(x => G.reg[x].school < 2); if (r) G.reg[r].school++; addLegit(-3); addRel('belanda', 6); return 'Sekolah zending dibuka.'; } },
      { t: 'Tolak', h: 'Legitimasi +3, hubungan -6', fx: () => { addLegit(3); addRel('belanda', -6); return 'Para penginjil pergi ke tempat lain.'; } }
    ] }
};

/* peristiwa sejarah yang muncul pada tahun tertentu */
/* peristiwa sejarah dengan tanggal (bulan 1 sampai 12) */
const HISTORY = [
  { y: 1831, m: 3, ev: 'tanampaksa', cond: () => ['yogya','surakarta'].includes(G.player) },
  { y: 1860, m: 5, ev: 'maxhavelaar' }, { y: 1870, m: 4, d: 9, ev: 'agraria' }, { y: 1871, m: 11, d: 2, ev: 'traktat', cond: () => G.player === 'aceh' && !isVassal() },
  { y: 1883, m: 8, d: 27, ev: 'krakatau' }, { y: 1901, m: 9, d: 17, ev: 'etis' }, { y: 1908, m: 5, d: 20, ev: 'budiutomo' }, { y: 1912, m: 9, d: 10, ev: 'sarekat' },
  { y: 1918, m: 5, d: 18, ev: 'volksraad' }, { y: 1928, m: 10, d: 28, ev: 'sumpahpemuda' }, { y: 1930, m: 1, ev: 'malaise' }, { y: 1942, m: 3, d: 8, ev: 'jepang' }, { y: 1943, m: 6, ev: 'romusha' },
  { y: 1945, m: 8, d: 17, ev: 'proklamasi' }
];
Object.assign(EVENTS, {
  maxhavelaar: { hist: true, title: () => 'Max Havelaar menggemparkan Belanda',
    text: () => 'Sebuah novel karya Multatuli membongkar kekejaman Tanam Paksa. Di Den Haag, kaum liberal menuntut perubahan kebijakan di tanah jajahan.',
    opts: [
      { t: 'Manfaatkan suasana ini', h: 'Kemandirian +8, hubungan -5', fx: () => { addIndep(8); addRel('belanda', -5); return 'Istana menekan Residen agar melonggarkan tuntutan.'; } },
      { t: 'Diam dan amati', h: 'Hubungan +4', fx: () => { addRel('belanda', 4); return 'Istana memilih menunggu.'; } }
    ] },
  agraria: { hist: true, title: () => 'Undang-Undang Agraria 1870',
    text: () => 'Pemerintah kolonial membuka tanah jajahan bagi modal swasta. Pengusaha perkebunan Eropa datang menawarkan sewa tanah jangka panjang.',
    opts: [
      { t: 'Sewakan tanah kepada pengusaha', h: 'Kas +220, kemakmuran semua wilayah +4, ketenteraman -8, kemandirian -5', fx: () => { addKas(220); addProsAll(4); addStabAll(-8); addIndep(-5); return 'Perkebunan besar mulai berdiri.'; } },
      { t: 'Pertahankan tanah ulayat', h: 'Legitimasi +4, hubungan -6', fx: () => { addLegit(4); addRel('belanda', -6); return 'Tanah tetap di tangan rakyat.'; } }
    ] },
  traktat: { hist: true, title: () => 'Traktat Sumatra',
    text: () => 'Inggris dan Belanda menandatangani Traktat Sumatra. Inggris tidak lagi menghalangi Belanda di Aceh. Perang tampaknya tinggal menunggu waktu.',
    opts: [
      { t: 'Perkuat benteng ibu kota', h: 'Kas -150, benteng ibu kota +1', ok: () => P().kas >= 150, fx: () => { addKas(-150); const R = G.reg[P().cap]; R.fort = Math.min(3, R.fort + 1); return 'Tembok benteng dipertebal.'; } },
      { t: 'Cari sekutu di luar negeri', h: 'Kas -100, legitimasi +5', ok: () => P().kas >= 100, fx: () => { addKas(-100); addLegit(5); G.truceUntil = Math.max(G.truceUntil, G.year + 2); return 'Utusan dikirim ke Singapura dan Istanbul.'; } },
      { t: 'Dekati Batavia', h: 'Hubungan +20', fx: () => { addRel('belanda', 20); return 'Utusan dikirim ke Batavia.'; } }
    ] },
  krakatau: { hist: true, title: () => 'Krakatau meletus',
    text: () => 'Gunung Krakatau di Selat Sunda meletus dahsyat. Gelombang raksasa menyapu pesisir Banten dan Lampung. Abunya menggelapkan langit hingga jauh.',
    opts: [{ t: 'Kirim bantuan untuk korban', h: 'Kas -60, legitimasi +3', ok: () => P().kas >= 60, fx: () => { addKas(-60); addLegit(3); return 'Bantuan kerajaan dikenang rakyat.'; } }, { t: 'Berdoa untuk para korban', h: 'Tidak ada biaya', fx: () => 'Istana menggelar doa bersama.' }] },
  etis: { hist: true, title: () => 'Politik Etis',
    text: () => 'Ratu Wilhelmina mengumumkan Politik Etis: irigasi, perpindahan penduduk, dan pendidikan bagi kaum bumiputra. Sekolah menjadi lebih murah dibangun.',
    opts: [
      { t: 'Kirim putra bangsawan ke sekolah Belanda', h: 'Hubungan +10, kebangsaan +6, legitimasi -2', fx: () => { addRel('belanda', 10); addNat(6); addLegit(-2); return 'Anak-anak bangsawan berangkat ke Batavia dan Bandung.'; } },
      { t: 'Bangun sekolah dan pesantren sendiri', h: 'Kas -80, ketenteraman +5, kebangsaan +8', ok: () => P().kas >= 80, fx: () => { addKas(-80); addStabAll(5); addNat(8); return 'Sekolah-sekolah rakyat dibuka.'; } }
    ] },
  budiutomo: { hist: true, title: () => 'Budi Utomo berdiri',
    text: () => 'Para pelajar STOVIA di Batavia mendirikan Budi Utomo. Gagasan tentang kemajuan bangsa mulai dibicarakan di kalangan priyayi muda. Mulai sekarang, semangat kebangsaan ikut menentukan akhir kisahmu.',
    opts: [
      { t: 'Dukung para pelajar', h: 'Kas -50, kebangsaan +10, hubungan -5', ok: () => P().kas >= 50, fx: () => { addKas(-50); addNat(10); addRel('belanda', -5); return 'Beberapa pelajar menerima beasiswa dari istana.'; } },
      { t: 'Jaga jarak', h: 'Hubungan +5', fx: () => { addRel('belanda', 5); return 'Istana memilih tidak ikut campur.'; } }
    ] },
  sarekat: { hist: true, title: () => 'Sarekat Islam menyebar',
    text: () => 'Sarekat Islam tumbuh pesat dan membuka cabang di banyak kota. Para pedagang dan petani ramai bergabung.',
    opts: [
      { t: 'Izinkan cabang di wilayah kita', h: 'Kebangsaan +10, ketenteraman -5, hubungan -8', fx: () => { addNat(10); addStabAll(-5); addRel('belanda', -8); return 'Rapat-rapat akbar digelar di alun-alun.'; } },
      { t: 'Larang kegiatannya', h: 'Hubungan +8, legitimasi -4', fx: () => { addRel('belanda', 8); addLegit(-4); return 'Para aktivis pindah ke kota lain.'; } }
    ] },
  volksraad: { hist: true, title: () => 'Volksraad dibentuk',
    text: () => 'Pemerintah kolonial membentuk Volksraad, dewan rakyat yang sebagian anggotanya bumiputra. Istana diundang mengirim wakil.',
    opts: [
      { t: 'Kirim wakil', h: 'Hubungan +10, kebangsaan +4', fx: () => { addRel('belanda', 10); addNat(4); return 'Wakil kerajaan duduk di Volksraad.'; } },
      { t: 'Boikot', h: 'Kebangsaan +8, hubungan -10', fx: () => { addNat(8); addRel('belanda', -10); return 'Penolakan istana menjadi berita di surat kabar.'; } }
    ] },
  sumpahpemuda: { hist: true, title: () => 'Sumpah Pemuda',
    text: () => 'Di Batavia, para pemuda dari berbagai daerah bersumpah: satu tanah air, satu bangsa, dan menjunjung bahasa persatuan, bahasa Indonesia. Beberapa pemuda dari kerajaanmu ingin ikut hadir.',
    opts: [
      { t: 'Restui mereka', h: 'Kebangsaan +15, hubungan -10', fx: () => { addNat(15); addRel('belanda', -10); return 'Para pemuda pulang membawa semangat baru.'; } },
      { t: 'Larang mereka pergi', h: 'Kebangsaan -5, hubungan +5', fx: () => { addNat(-5); addRel('belanda', 5); return 'Para pemuda kecewa.'; } }
    ] },
  malaise: { hist: true, title: () => 'Zaman Malaise',
    text: () => 'Krisis ekonomi dunia menghantam. Harga gula, kopi, karet, dan hasil bumi lainnya anjlok. Perkebunan tutup dan pengangguran meluas.',
    opts: [
      { t: 'Potong belanja istana', h: 'Legitimasi -3, kas +80', fx: () => { addLegit(-3); addKas(80); return 'Istana berhemat.'; } },
      { t: 'Naikkan pajak', h: 'Kas +150, ketenteraman -10', fx: () => { addKas(150); addStabAll(-10); return 'Rakyat makin terhimpit.'; } }
    ] },
  jepang: { hist: true, title: () => 'Jepang mendarat',
    text: () => 'Bala tentara Jepang mendarat di Jawa dan Sumatra. Dalam hitungan minggu, Hindia Belanda menyerah di Kalijati. Para pejabat Belanda ditawan dan wilayah mereka kini dikuasai Jepang.',
    opts: [
      { t: 'Sambut dengan hati-hati', h: 'Kebangsaan +8', fx: () => { addNat(8); return 'Istana menunggu dan mengamati.'; } },
      { t: 'Bekerja sama dengan Jepang', h: 'Kas +100, legitimasi -5', fx: () => { addKas(100); addLegit(-5); return 'Istana mendapat janji kerja sama.'; } }
    ] },
  romusha: { hist: true, title: () => 'Tuntutan romusha',
    text: () => 'Pemerintah pendudukan Jepang menuntut tenaga kerja paksa dan setoran beras dari setiap daerah.',
    opts: [
      { t: 'Penuhi tuntutan', h: 'Penduduk -6 persen, ketenteraman -12', fx: () => { for (const r of myRegions()) { G.reg[r].pop *= 0.94; G.reg[r].stab -= 12; } return 'Ribuan orang dikirim bekerja jauh dari rumah.'; } },
      { t: 'Sembunyikan rakyat dan lumbung', h: 'Legitimasi +6, pasukan -25 persen', fx: () => { addLegit(6); P().army = Math.round(P().army * 0.75); addNat(5); return 'Jepang menghukum dengan membubarkan sebagian pasukan.'; } }
    ] },
  proklamasi: { hist: true, title: () => '17 Agustus 1945',
    text: () => 'Dari Pegangsaan Timur 56, Soekarno dan Hatta memproklamasikan kemerdekaan Indonesia. Kabarnya menyebar lewat radio dan mulut ke mulut. Istana harus menentukan sikap.',
    opts: [
      { t: 'Nyatakan dukungan kepada Republik', h: 'Akhir permainan', fx: () => { G.over = { kind: 'selesai', text: epilogue('dukung') }; return ''; } },
      { t: 'Tunggu perkembangan', h: 'Akhir permainan', fx: () => { G.over = { kind: 'selesai', text: epilogue('tunggu') }; return ''; } }
    ] }
});

const NEWS = [
  { y: 1837, m: 8, fn: () => { if (G.reg.minang.owner === 'belanda') news('Perang Padri berakhir. Tuanku Imam Bonjol ditangkap Belanda.'); } },
  { y: 1841, m: 9, fn: () => { if (G.reg.sarawak.owner === 'brunei') { setOwner('sarawak', 'inggris'); news('James Brooke diangkat menjadi Raja Sarawak. Inggris mulai bercokol di Kalimantan Utara.'); } } },
  { y: 1859, m: 4, fn: () => { if (G.reg.larantuka.owner === 'portugis') { setOwner('larantuka', 'belanda'); news('Portugis menyerahkan Flores Timur kepada Belanda.'); } } },
  { y: 1863, m: 6, fn: () => { G.price.tembakau = 1.5; news('Tembakau Deli mulai terkenal di pasar Eropa. Harga tembakau naik.'); } },
  { y: 1869, m: 11, d: 17, fn: () => { G.priceAll *= 1.1; G.fac.belanda.army += 1500; news('Terusan Suez dibuka. Kapal uap mempercepat perdagangan dan pengiriman pasukan dari Eropa.'); } },
  { y: 1878, m: 3, fn: () => { G.price.kopi *= 0.7; news('Penyakit karat daun merusak kebun kopi. Harga kopi jatuh.'); } },
  { y: 1881, m: 11, fn: () => { if (G.reg.sabah.owner === 'brunei') { setOwner('sabah', 'inggris'); news('Kompani Borneo Utara milik Inggris menguasai Sabah.'); } } },
  { y: 1883, m: 8, d: 27, fn: () => { for (const r of ['banten','batavia','lampung']) { G.reg[r].pros = Math.max(5, G.reg[r].pros - 25); G.reg[r].pop *= 0.94; } } },
  { y: 1884, m: 2, fn: () => { G.price.gula *= 0.75; news('Krisis gula melanda. Harga gula turun tajam.'); } },
  { y: 1885, m: 6, fn: () => { for (const r of ['deli','kutai','palembang']) G.reg[r].pros = Math.min(100, G.reg[r].pros + 15); news('Minyak bumi ditemukan di Telaga Said, Langkat. Deli, Kutai, dan Palembang ikut makmur.'); } },
  { y: 1885, m: 3, fn: () => { if (G.player !== 'madura' && alive('madura')) { for (const r of regionsOf('madura')) setOwner(r, 'belanda'); news('Belanda menghapus kerajaan-kerajaan Madura dan memerintah pulau itu secara langsung.'); } } },
  { y: 1891, m: 6, fn: () => { if (G.player !== 'mengwi' && alive('mengwi') && !G.fac.mengwi.overlord) { const to = alive('badung') ? 'badung' : alive('tabanan') ? 'tabanan' : null; if (to) { for (const r of regionsOf('mengwi')) setOwner(r, to); news(`Mengwi runtuh diserang Badung dan Tabanan. Wilayahnya jatuh ke tangan ${D(to).short}.`); } } } },
  { y: 1898, m: 6, fn: () => news('Van Heutsz memperkenalkan perjanjian pendek. Semua kerajaan diminta tunduk pada Belanda.') },
  { y: 1905, m: 1, fn: () => { G.price.hutan = 1.5; news('Perkebunan karet menyebar. Hasil hutan semakin berharga.'); } },
  { y: 1930, m: 1, fn: () => { G.priceAll *= 0.65; } },
  { y: 1936, m: 1, fn: () => { G.priceAll *= 1.35; news('Ekonomi dunia mulai pulih dari zaman Malaise.'); } },
  { y: 1942, m: 3, d: 8, fn: () => {
    G.japan = true;
    for (const r of Object.keys(G.reg)) if (G.reg[r].owner === 'belanda') G.reg[r].owner = 'jepang';
    for (const f of Object.values(G.fac)) if (f.overlord === 'belanda') f.overlord = 'jepang';
    G.wars = G.wars.filter(w => w.enemy !== 'belanda');
    if (G.trade) G.trade = G.trade.filter(f => f !== 'belanda' && f !== 'inggris');
    G.rel.jepang = 0; G.ownVer = (G.ownVer || 0) + 1;
    news('Hindia Belanda menyerah kepada Jepang di Kalijati.');
  } }
];
function news(t){ log(t, 'kabar'); toast(t); }
function pickRandomEvent(){
  const pool = [];
  for (const [id, e] of Object.entries(EVENTS)) {
    if (!e.w) continue;
    const ctx = e.prep ? e.prep() : {};
    if (!ctx) continue;
    for (let i = 0; i < e.w; i++) pool.push({ ev: id, ctx });
  }
  return pool.length ? pick(pool) : null;
}

/* ---------- biaya (naik mengikuti zaman) ---------- */
const infl = () => 1 + (G.year - START_YEAR) / 150;
const C = n => Math.round(n * infl());
const COST = {
  develop: rid => C(50 + G.reg[rid].pros * 2),
  fort: rid => C(120 * (G.reg[rid].fort + 1)),
  school: () => { let c = 100; if (hasTrait(rulerC(), 'pembaharu')) c *= 0.7; if (G.flags.h_etis) c *= 0.7; return C(c); },
  recruit: () => C(50),
  relief: rid => C(40 + G.reg[rid].pop * 0.1),
  embrace: rid => C(80 + G.reg[rid].pop),
  train: () => C(40 + P().army * 0.01),
  rifles: () => Math.round(C(120 + P().army * 0.04) * (G.year >= 1870 ? 1.5 : 1) * ((G.trade || []).includes('inggris') ? 0.75 : 1)),
  gift: () => C(60), marry: () => C(40), marryRuler: () => C(50), prestige: () => C(100)
};

/* ---------- proyek yang butuh waktu ---------- */
function trainCap(){ const pg = councilOf('panglima'); return 1.1 + (pg && stat(pg, 'mil') >= 7 ? 0.1 : 0) + (hasTrait(rulerC(), 'pembaharu') ? 0.05 : 0); }
const PROJ = {
  develop: { n: 'Pembangunan pasar dan irigasi', w: () => 26, wib: 8, cost: rid => COST.develop(rid),
    ok: rid => G.reg[rid].pros < 95 || 'Kemakmuran sudah maksimal.',
    fin: rid => { G.reg[rid].pros = Math.min(100, G.reg[rid].pros + 9); return `Pasar dan irigasi di ${RD(rid).name} selesai. Kemakmuran naik.`; } },
  fort: { n: 'Pembangunan benteng', w: rid => 26 + 13 * G.reg[rid].fort, wib: 10, cost: rid => COST.fort(rid),
    ok: rid => G.reg[rid].fort < 3 || 'Benteng sudah paling kuat.',
    fin: rid => { const R = G.reg[rid]; R.fort = Math.min(3, R.fort + 1); addRel('belanda', -2); return `Benteng ${RD(rid).name} selesai dibangun. Kini tingkat ${R.fort}.`; } },
  school: { n: 'Pembangunan sekolah', w: () => 52, wib: 8, cost: () => COST.school(),
    ok: rid => G.reg[rid].school < 2 || 'Sekolah di wilayah ini sudah lengkap.',
    fin: rid => { const R = G.reg[rid]; R.school++; R.stab = Math.min(100, R.stab + 5); if (G.year >= 1901) addNat(2); return `Sekolah di ${RD(rid).name} dibuka.`; } },
  recruit: { n: 'Perekrutan 500 prajurit', w: () => 13, wib: 4, cost: () => COST.recruit(),
    ok: () => P().army + 500 * (1 + G.proj.filter(p => p.k === 'recruit').length) <= manpower() || 'Tenaga manusia sudah habis. Perluas wilayah atau tingkatkan penduduk.',
    fin: rid => { P().army += 500; const R = G.reg[rid]; R.stab = Math.max(0, R.stab - 4); R.pop = Math.max(5, R.pop - 0.5); return `500 prajurit baru dari ${RD(rid).name} siap bertugas.`; } },
  embrace: { n: 'Utusan kepada pemuka adat', w: () => 9, wib: 8, cost: rid => COST.embrace(rid), foreign: true,
    ok: rid => (G.reg[rid].owner === 'adat' && inReach(rid)) || 'Wilayah ini tidak bisa dirangkul.',
    fin: rid => {
      const R = G.reg[rid]; if (R.owner !== 'adat') return `Utusan ke ${RD(rid).name} pulang karena wilayah itu sudah dikuasai pihak lain.`;
      const duta = councilOf('duta');
      const p = clamp(0.3 + stat(duta, 'dip') * 0.035 + (P().legit ?? 60) / 400 + (D(G.player).bonus.id === 'diplomasi' ? 0.1 : 0), 0.15, 0.9);
      if (chance(p)) { setOwner(rid, G.player); R.stab = 45; addRel('belanda', -3); checkBadges(); return `Para pemuka ${RD(rid).name} bersedia bergabung dengan kerajaan.`; }
      return `Para pemuka ${RD(rid).name} menolak bergabung. Hadiah sudah terlanjur diberikan.`;
    } },
  train: { n: 'Latihan pasukan', army: true, w: () => 13, wib: 6, cost: () => COST.train(),
    ok: () => P().quality < trainCap() || 'Latihan tidak lagi menambah mutu. Coba beli senapan.',
    fin: () => { P().quality = Math.min(trainCap(), P().quality + 0.05); return 'Latihan pasukan selesai. Mutu pasukan naik.'; } },
  rifles: { n: 'Pengiriman senapan', army: true, w: () => 17, wib: 8, cost: () => COST.rifles(),
    ok: () => !myRegions().some(coastal) ? 'Kerajaan tidak punya pelabuhan untuk menerima senapan.' : P().quality >= 1.6 ? 'Mutu pasukan sudah setara pasukan modern.' : true,
    fin: () => { P().quality = Math.min(1.6, P().quality + 0.12); addRel('belanda', -8); return 'Senapan selundupan dari Penang dan Singapura tiba.'; } }
};
const projOf = rid => G.proj.find(p => p.rid === rid);
const armyProj = () => G.proj.find(p => PROJ[p.k].army);
function startProject(k, rid){
  const def = PROJ[k];
  if (def.army ? armyProj() : projOf(rid)) return toast(def.army ? 'Angkatan perang sedang menjalankan program lain.' : 'Wilayah ini sedang mengerjakan proyek lain.');
  const ok = def.ok(rid); if (ok !== true) return toast(ok);
  const days = def.w(rid) * 7;
  if (!spend(0, def.wib)) return;
  G.proj.push({ k, rid: rid || null, days, done: 0, cost: def.cost(rid), paid: 0, stall: false });
  done(`${def.n} dimulai. Perkiraan selesai ${durStr(days)} lagi.`);
}
function cancelProject(i){
  const p = G.proj[i]; if (!p) return;
  G.proj.splice(i, 1);
  done(`${PROJ[p.k].n} dibatalkan. Biaya yang sudah keluar tidak kembali.`);
}
function dailyProjects(){
  for (const p of G.proj.slice()) {
    const def = PROJ[p.k];
    if (p.rid && !def.foreign && G.reg[p.rid].owner !== G.player) { G.proj.splice(G.proj.indexOf(p), 1); log(`${def.n} di ${RD(p.rid).name} terhenti karena wilayah itu jatuh.`, 'buruk'); continue; }
    const pay = p.cost / p.days;
    if (P().kas < pay) { p.stall = true; continue; }
    P().kas -= pay; p.paid += pay; p.done++; p.stall = false;
    if (p.done >= p.days) {
      G.proj.splice(G.proj.indexOf(p), 1);
      const msg = def.fin(p.rid);
      log(msg, 'baik'); toast(msg, true);
    }
  }
}

/* ---------- tindakan pemain ---------- */
const WIBAWA = { relief: 5, gift: 5, ally: 8, trade: 8, callally: 4, war: 10, peace: 5, marry: 8, marryRuler: 8, prestige: 10, independence: 15, attack: 6 };
const ACT = {
  develop(rid){ startProject('develop', rid); },
  fort(rid){ startProject('fort', rid); },
  school(rid){ startProject('school', rid); },
  recruit(rid){ startProject('recruit', rid); },
  embrace(rid){ startProject('embrace', rid); },
  train(){ startProject('train'); },
  rifles(){ startProject('rifles'); },
  cancel(i){ cancelProject(+i); },
  relief(rid){ const R = G.reg[rid]; if (!spend(COST.relief(rid), WIBAWA.relief)) return; R.stab = Math.min(100, R.stab + 15); addLegit(1); done(`Beras dibagikan di ${RD(rid).name}.`); },
  disband(){ const f = P(); if (f.army < 500) return toast('Pasukan terlalu sedikit.'); f.army -= 500; done('500 prajurit dibebaskan pulang ke desa.'); },
  gift(fid){ if (!spend(COST.gift(), WIBAWA.gift)) return; const duta = councilOf('duta'); addRel(fid, 10 + Math.max(0, stat(duta, 'dip') - 5) + (D(G.player).bonus.id === 'diplomasi' ? 4 : 0)); done(`Hadiah dikirim ke ${D(fid).short}.`); },
  ally(fid){
    if (isVassal()) return toast('Belanda melarang kerajaan bawahan membuat persekutuan militer.');
    if (G.fac[fid].overlord) return toast(`${D(fid).short} berada di bawah perlindungan ${facName(G.fac[fid].overlord)} dan tidak bebas bersekutu.`);
    if (G.rel[fid] < 40) return toast('Hubungan belum cukup baik. Butuh minimal 40.');
    if (!spend(0, WIBAWA.ally)) return;
    const duta = councilOf('duta'); const p = clamp((G.rel[fid] - 25) / 60 + stat(duta, 'dip') * 0.02 - (G.ae || 0) / 200, 0.1, 0.9);
    if (chance(p)) { G.allies.push(fid); addRel(fid, 10); log(`Persekutuan dengan ${D(fid).name} disepakati.`, 'baik'); done(`${D(fid).short} kini sekutu kita.`); }
    else { addRel(fid, -5); done(`${D(fid).short} belum bersedia bersekutu.`); } },
  unally(fid){ G.allies = G.allies.filter(a => a !== fid); for (const w of G.wars) w.allies = (w.allies || []).filter(a => a !== fid); addRel(fid, -20); addLegit(-2); log(`Persekutuan dengan ${D(fid).name} diputus.`, 'buruk'); done(`Persekutuan dengan ${D(fid).short} diputus.`); },
  callally(fid){
    const w = G.wars.find(x => x.enemy !== fid && !(x.allies || []).includes(fid)); if (!w) return toast('Tidak ada perang yang bisa dibantu.');
    if (!spend(0, WIBAWA.callally)) return;
    if (chance(allyJoinChance(fid, w.enemy))) { w.allies = w.allies || []; w.allies.push(fid); log(`${D(fid).short} bergabung dalam perang melawan ${D(w.enemy).short}.`, 'baik'); done(`${D(fid).short} ikut berperang melawan ${D(w.enemy).short}.`); }
    else { addRel(fid, -5); done(`${D(fid).short} belum mau ikut berperang.`); } },
  trade(fid){
    ensureDiplo();
    if (G.trade.includes(fid)) return;
    if (G.trade.length >= tradeSlots()) return toast(`Semua jalur dagang sudah terpakai (${tradeSlots()}). Tambah wilayah pesisir untuk membuka jalur baru.`);
    if (fid === 'inggris' && isVassal()) return toast('Belanda melarang kerajaan bawahan berdagang langsung dengan Inggris.');
    if (fid === 'inggris' && !myRegions().some(coastal)) return toast('Kerajaan tidak punya pelabuhan untuk berdagang dengan Inggris.');
    if (fid !== 'inggris' && fid !== 'belanda' && (G.rel[fid] ?? 0) < 20) return toast('Hubungan belum cukup baik. Butuh minimal 20.');
    if (!spend(0, WIBAWA.trade)) return;
    const duta = councilOf('duta');
    const p = (fid === 'inggris' || fid === 'belanda') ? 1 : clamp((G.rel[fid] ?? 0) / 80 + 0.35 + stat(duta, 'dip') * 0.02, 0.1, 0.95);
    if (!chance(p)) { done(`${D(fid).short} belum bersedia membuat perjanjian dagang.`); return; }
    G.trade.push(fid); addRel(fid, 5);
    if (fid === 'inggris') addRel('belanda', -10);
    log(`Perjanjian dagang dengan ${D(fid).name} disepakati.`, 'baik'); checkBadges();
    done(`Perjanjian dagang dengan ${D(fid).short} berlaku.`); },
  untrade(fid){ G.trade = (G.trade || []).filter(x => x !== fid); if (fid !== 'inggris' && fid !== 'belanda') addRel(fid, -10); done(`Perjanjian dagang dengan ${D(fid).short} dihentikan.`); },
  war(fid){ if (isVassal()) return toast('Kerajaan bawahan tidak boleh berperang tanpa izin Belanda.'); if (G.fac[fid].overlord) return toast(`${D(fid).short} berada di bawah perlindungan ${facName(G.fac[fid].overlord)}.`); if (!spend(0, WIBAWA.war)) return; if (G.allies.includes(fid)) addLegit(-12); aggression(5); startWar(fid); addRel('belanda', -6); done(`Perang dinyatakan terhadap ${D(fid).short}.`); },
  peace(fid){ const w = warWith(fid); if (!w) return; if (!spend(0, WIBAWA.peace)) return;
    if (fid === 'belanda') { if (w.exh >= 50 && chance(w.exh / 130)) { G.queue.push({ ev: 'damaibelanda', ctx: {} }); renderAll(); runQueue(); return; } return done('Belanda menolak berunding. Mereka menuntut penyerahan.'); }
    const p = clamp(0.25 + w.wins * 0.15 + w.exh / 150 - w.losses * 0.1, 0.05, 0.9);
    if (chance(p)) { endWar(fid); done(`${D(fid).short} menerima perdamaian.`); } else done(`${D(fid).short} menolak berdamai.`); },
  marry(fid, cid){ const c = CH(cid); if (!c) return; if (!spend(COST.marry(), WIBAWA.marry)) return; const duta = councilOf('duta'); const p = clamp(0.4 + G.rel[fid] / 200 + stat(duta, 'dip') * 0.02, 0.15, 0.95);
    if (!chance(p)) { done(`Pinangan ke ${D(fid).short} ditolak dengan halus.`); return; }
    const cul = D(fid).culture || 'melayu';
    const sp = newChar({ fac: c.g === 'L' ? G.player : fid, cul, g: c.g === 'L' ? 'P' : 'L', age: age(c) - rint(-2, 4), adultTraits: true });
    c.sp = sp.id; sp.sp = c.id;
    if (c.g === 'P') { c.out = true; c.fac = fid; }
    addRel(fid, 25); G.stats.marriages++; checkBadges();
    log(`${charName(c)} menikah dengan keluarga istana ${D(fid).short}.`, 'baik');
    done(`Pernikahan disepakati. Hubungan dengan ${D(fid).short} menguat.`); },
  marryRuler(kind, fid){ const r = rulerC(); if (!spend(COST.marryRuler(), WIBAWA.marryRuler)) return; const cul = kind === 'asing' ? D(fid).culture : D(G.player).culture;
    const sp = newChar({ fac: G.player, cul, g: r.g === 'L' ? 'P' : 'L', age: Math.max(16, age(r) - rint(3, 12)), adultTraits: true });
    r.sp = sp.id; sp.sp = r.id;
    if (kind === 'asing') { addRel(fid, 20); G.stats.marriages++; } else { addLegit(3); for (const n of nobles()) n.loy += 6; }
    checkBadges(); log(`${charName(r)} menikah dengan ${sp.n}.`, 'baik'); done(`${charName(r)} kini memiliki pendamping.`); },
  vassalSign(){ if (!spend(0, 0)) return; becomeVassal(); addLegit(-8); done('Perjanjian ditandatangani.'); },
  prestige(){ if (!spend(COST.prestige(), WIBAWA.prestige)) return; addLegit(4); addIndep(6); addRel('belanda', -3); done('Upacara kebesaran keraton digelar.'); },
  independence(){ if (P().indep < 50) return toast('Kemandirian belum cukup. Butuh minimal 50.'); if (!spend(0, WIBAWA.independence)) return; const ov = P().overlord; P().overlord = null; startWar(ov === 'jepang' ? 'jepang' : 'belanda', 'merdeka'); if (ov === 'jepang') { endWar('jepang', 'Jepang terlalu sibuk dengan perang Pasifik untuk menghukum istana.'); earn('merdeka'); } addLegit(8); done('Istana menyatakan lepas dari kekuasaan asing.'); },
  tax(level){ P().tax = level; renderAll(); }
};
function done(msg){ toast(msg); checkBadges(); renderAll(); scheduleSave(); }
