'use strict';
/* Takhta Nusantara: pasukan yang bergerak di peta, pengepungan, dan pertempuran.
   Pasukan pemain dan pasukan musuh yang berperang dengan pemain tampil di peta.
   Perang antarkerajaan lain tetap dihitung tanpa pasukan di peta. */

const ARMY_NAMES = ['Pasukan Utama','Pasukan Kedua','Pasukan Ketiga','Pasukan Keempat','Pasukan Kelima','Pasukan Keenam'];
const armyFmt = n => n >= 1000 ? String(Math.round(n / 100) / 10).replace('.', ',') + ' rb' : String(Math.round(n));
const myArmies = () => (G.armies || []).filter(a => a.owner === G.player);
const armyById = id => (G.armies || []).find(a => a.id === id);

function ensureArmies(){
  if (!G.armies) { G.armies = []; G.armyId = 1; }
  if (!myArmies().length && P().army >= 50 && (P().cap || myRegions()[0])) newArmy(G.player, P().cap || myRegions()[0], P().army);
}
function newArmy(owner, rid, n, name){
  const a = { id: G.armyId++, owner, name: name || armyName(owner), n: Math.round(n), loc: rid, from: null, to: null, total: 0, done: 0, siege: null };
  G.armies.push(a);
  return a;
}
function armyName(owner){
  if (owner === G.player) { const used = new Set(myArmies().map(a => a.name)); return ARMY_NAMES.find(n => !used.has(n)) || `Pasukan ke-${myArmies().length + 1}`; }
  if (owner === 'belanda') return 'Ekspedisi Belanda';
  if (owner === 'jepang') return 'Tentara Jepang';
  return `Pasukan ${D(owner).short}`;
}
/* jumlah prajurit kerajaan (P().army) selalu sama dengan jumlah semua pasukan pemain */
function syncArmies(){
  ensureArmies();
  const f = P(), mine = myArmies();
  const sum = mine.reduce((s, a) => s + a.n, 0), diff = Math.round(f.army - sum);
  if (diff > 0) {
    let home = mine.find(a => a.loc === f.cap && !a.to && !a.siege) || mine.find(a => !a.to && !a.siege && G.reg[a.loc].owner === G.player);
    if (!home && (f.cap || myRegions()[0])) home = newArmy(G.player, f.cap || myRegions()[0], 0);
    if (home) home.n += diff;
  } else if (diff < 0 && sum > 0) {
    for (const a of mine) a.n = Math.max(0, Math.round(a.n + diff * a.n / sum));
  }
  G.armies = G.armies.filter(a => a.n >= 40);
  f.army = myArmies().reduce((s, a) => s + a.n, 0);
}
function setArmyN(a, n){ a.n = Math.max(0, Math.round(n)); if (a.owner === G.player) { P().army = myArmies().reduce((s, x) => s + x.n, 0); } }

/* waktu tempuh: jalan darat sekitar 7 hari per derajat, menyeberang laut ditambah 8 hari */
function travelDays(from, to){
  if (from === to) return 0;
  const d = MAP.dist[from][to] ?? 10;
  return Math.round(4 + d * 7 + (RD(from).isl === RD(to).isl ? 0 : 8));
}
function armyPos(a){
  if (a.to) { const A = RD(a.from), B = RD(a.to), t = a.total ? a.done / a.total : 1; return [A.lx + (B.lx - A.lx) * t, A.ly + (B.ly - A.ly) * t]; }
  const R = RD(a.loc); return [R.lx, R.ly];
}
function isEnemyRegionFor(owner, rid){
  const o = G.reg[rid].owner;
  if (owner === G.player) return o === 'adat' || atWarWith(o);
  return o === G.player;
}
function hostileArmies(a, b){
  if (a.owner === b.owner) return false;
  if (a.owner === G.player) return atWarWith(b.owner);
  if (b.owner === G.player) return atWarWith(a.owner);
  return false;
}
/* alasan bila tujuan tidak sah, atau null bila boleh */
function orderProblem(a, rid){
  if (a.owner !== G.player) return 'Bukan pasukan kita.';
  const o = G.reg[rid].owner;
  if (rid === a.loc && !a.to) return 'Pasukan sudah berada di sana.';
  if (o === G.player || G.allies.includes(o)) return null;
  if (o === 'adat') { if (isVassal()) return 'Kerajaan bawahan tidak boleh mengirim ekspedisi tanpa izin Belanda.'; return inReach(rid) ? null : 'Wilayah itu di luar jangkauan pasukan.'; }
  if (atWarWith(o)) return inReach(rid) ? null : 'Wilayah itu di luar jangkauan pasukan.';
  return `Kita tidak sedang berperang dengan ${D(o).short}. Nyatakan perang dulu di tab Diplomasi.`;
}
function orderMove(a, rid, quiet){
  const why = orderProblem(a, rid);
  if (why) { if (!quiet) toast(why); return false; }
  if (G.reg[rid].owner === 'adat' && !a.to && !quiet) aggression(1);
  if (a.to) { const t = a.total ? a.done / a.total : 1; a.loc = t < 0.5 ? a.from : a.to; } // pasukan yang sedang bergerak dialihkan dari titik terdekat
  a.from = a.loc; a.to = rid; a.total = Math.max(1, travelDays(a.loc, rid)); a.done = 0; a.siege = null;
  if (!quiet) toast(`${a.name} berangkat ke ${RD(rid).name}. Tiba sekitar ${durStr(a.total)} lagi.`);
  return true;
}
function nearestOwnRegion(owner, from){
  const list = owner === G.player ? myRegions() : regionsOf(owner);
  if (!list.length) return null;
  return list.slice().sort((x, y) => (MAP.dist[from][x] ?? 99) - (MAP.dist[from][y] ?? 99))[0];
}
function retreat(a){
  const list = (a.owner === G.player ? myRegions() : regionsOf(a.owner)).filter(r => r !== a.loc && !(G.armies || []).some(o => o.loc === r && !o.to && hostileArmies(a, o)));
  const home = list.sort((x, y) => (MAP.dist[a.loc][x] ?? 99) - (MAP.dist[a.loc][y] ?? 99))[0];
  if (!home && a.owner === G.player) log(`${a.name} tercerai-berai karena tidak ada tempat untuk mundur.`, 'buruk');
  if (!home || a.n < 200) { setArmyN(a, 0); G.armies = G.armies.filter(x => x !== a); return false; }
  a.siege = null; a.from = a.loc; a.to = home; a.total = Math.max(1, travelDays(a.loc, home)); a.done = 0;
  return true;
}

/* ---------- harian ---------- */
function dailyArmies(){
  ensureArmies();
  for (const a of G.armies.slice()) {
    if (!G.armies.includes(a)) continue;
    if (a.to) {
      a.done++;
      if (a.done >= a.total) { a.loc = a.to; a.to = null; a.from = null; a.done = 0; arrive(a); }
    } else if (a.siege) siegeTick(a);
    else if (isEnemyRegionFor(a.owner, a.loc)) startSiege(a);
  }
}
function arrive(a){
  const foe = G.armies.find(o => o !== a && !o.to && o.loc === a.loc && hostileArmies(a, o));
  if (foe) { fieldBattle(a, foe); if (!G.armies.includes(a) || a.to) return; }
  if (isEnemyRegionFor(a.owner, a.loc)) startSiege(a);
  else if (a.owner === G.player) log(`${a.name} tiba di ${RD(a.loc).name}.`, 'info');
}
function sideQuality(owner){ return owner === G.player ? P().quality : (G.fac[owner] ? G.fac[owner].quality : 0.8); }
function warOf(owner, other){ return owner === G.player ? warWith(other) : warWith(owner); }

function fieldBattle(att, def){
  const rid = def.loc, R = G.reg[rid];
  const pAtt = att.owner === G.player, pDef = def.owner === G.player;
  const enemyOwner = pAtt ? def.owner : att.owner, w = warWith(enemyOwner);
  const help = allyHelp(w, 0.3);
  let aN = att.n, aQ = sideQuality(att.owner), aM = pAtt ? battleMod() : 1;
  let dN = def.n, dQ = sideQuality(def.owner), dM = TERRAIN[RD(rid).ter].def * (pDef ? battleMod() : 1);
  if (pDef && R.owner === G.player) dM = battleMod() * defenseMod(rid);
  if (pAtt) { aQ = (aN * aQ + help.n * help.q) / Math.max(1, aN + help.n); aN += help.n; }
  if (pDef) { dQ = (dN * dQ + help.n * help.q) / Math.max(1, dN + help.n); dN += help.n; }
  const res = fight(aN, aQ, aM, dN, dQ, dM);
  setArmyN(att, att.n - res.aLoss * att.n / Math.max(1, aN));
  setArmyN(def, def.n - res.dLoss * def.n / Math.max(1, dN));
  if (pAtt || pDef) spreadAllyLoss(help, 0.3, pAtt ? res.aLoss : res.dLoss, pAtt ? aN : dN);
  const winner = res.win ? att : def, loser = res.win ? def : att;
  const playerWon = winner.owner === G.player;
  if (w) { if (playerWon) w.wins++; else w.losses++; }
  if (playerWon) { G.stats.wins++; addLegit(3); } else { G.stats.losses++; addLegit(-3); }
  if (enemyOwner === 'belanda' && w) { const bl = playerWon ? (res.win ? res.dLoss : res.aLoss) : (res.win ? res.aLoss : res.dLoss); w.exh += bl / 300 + (playerWon ? 12 : 0); }
  const txt = `Pertempuran di ${RD(rid).name}: ${winner.name} (${D(winner.owner).short}) mengalahkan ${loser.name}. Korban ${fmt(res.aLoss + res.dLoss)} orang.`;
  log(txt, playerWon ? 'baik' : 'buruk'); toast(txt, playerWon);
  retreat(loser);
  checkBadges();
}

function siegeNeed(rid){ const R = G.reg[rid]; return Math.round((30 + 30 * R.fort) * TERRAIN[RD(rid).ter].def); }
function startSiege(a){
  a.siege = { rid: a.loc, done: 0, need: siegeNeed(a.loc) };
  if (a.owner === G.player) log(`${a.name} mulai mengepung ${RD(a.loc).name}.`, 'info');
  else { log(`${a.name} mulai mengepung ${RD(a.loc).name}.`, 'buruk'); toast(`${a.name} mengepung ${RD(a.loc).name}! Kirim pasukan untuk mematahkan kepungan.`); }
}
function siegeTick(a){
  const s = a.siege;
  if (s.rid !== a.loc || !isEnemyRegionFor(a.owner, a.loc)) { a.siege = null; return; }
  const foe = G.armies.find(o => o !== a && !o.to && o.loc === a.loc && hostileArmies(a, o));
  if (foe) { fieldBattle(foe, a); return; }
  s.done++;
  if (s.done % 30 === 0) setArmyN(a, a.n * 0.985); // penyakit dan desersi selama pengepungan
  if (s.done < s.need) return;
  const rid = a.loc, R = G.reg[rid], o = R.owner, pAtt = a.owner === G.player;
  let gN, gQ, gM = TERRAIN[RD(rid).ter].def * (1 + 0.25 * R.fort);
  if (o === G.player) { gN = R.pop * 4 + 300; gQ = 0.7; gM *= battleMod() * (G.mode === 'gerilya' ? (D(G.player).bonus.id === 'serambi' ? 1.5 : 1.35) : 1); if (D(G.player).bonus.id === 'puputan' && rid === P().cap) gM *= 1.5; }
  else { const g = garrisonOf(rid); gN = g.n * 0.8; gQ = g.q; }
  const w = pAtt ? warWith(o) : warWith(a.owner);
  const help = pAtt ? allyHelp(w, 0.2) : { list: [], n: 0, q: 1 };
  const aN = a.n + help.n, aQ = (a.n * sideQuality(a.owner) + help.n * help.q) / Math.max(1, aN);
  const res = fight(aN, aQ, pAtt ? battleMod() : 1, gN, gQ, gM);
  setArmyN(a, a.n - res.aLoss * a.n / Math.max(1, aN));
  if (pAtt) spreadAllyLoss(help, 0.2, res.aLoss, aN);
  if (o !== 'adat' && o !== G.player && G.fac[o]) G.fac[o].army = Math.max(0, G.fac[o].army - Math.round(res.dLoss * 0.4));
  if (!res.win) {
    s.done = Math.round(s.need * 0.5);
    if (pAtt) { G.stats.losses++; addLegit(-2); log(`Serbuan ${a.name} ke ${RD(rid).name} gagal. Pengepungan berlanjut.`, 'buruk'); }
    else { if (w) { w.wins++; if (a.owner === 'belanda') w.exh += 10 + res.aLoss / 250; } G.stats.wins++; addLegit(3); log(`Serbuan ${a.name} ke ${RD(rid).name} dipatahkan.`, 'baik'); toast(`Serbuan ${a.name} ke ${RD(rid).name} dipatahkan.`, true); }
    if (a.n < 200) { G.armies = G.armies.filter(x => x !== a); if (a.owner === G.player) syncArmies(); }
    return;
  }
  if (o === G.player && R.fort > 0) {
    R.fort--; s.done = 0; s.need = siegeNeed(rid);
    if (w) w.losses++; G.stats.losses++; addLegit(-2);
    log(`${a.name} meruntuhkan satu tingkat benteng ${RD(rid).name}.`, 'buruk'); toast(`Benteng ${RD(rid).name} runtuh satu tingkat.`);
    return;
  }
  a.siege = null;
  if (pAtt) {
    G.stats.wins++; if (w) w.wins++;
    setOwner(rid, G.player); R.stab = 30; R.occ = 48; G.stats.conquests++;
    aggression(o === 'adat' ? 4 : o === 'belanda' || o === 'jepang' ? 2 : 15);
    addLegit(3);
    if (o === 'belanda' && w) w.exh += 18;
    if (o !== 'belanda' && o !== 'jepang') addRel('belanda', o === 'adat' ? -3 : -10);
    log(`${a.name} merebut ${RD(rid).name} dari ${facName(o)}.`, 'baik'); toast(`${RD(rid).name} berhasil direbut!`, true);
    checkBadges();
  } else {
    if (w) w.losses++; G.stats.losses++; addLegit(-6);
    setOwner(rid, a.owner);
    log(`${a.name} merebut ${RD(rid).name}.`, 'buruk');
    if (!G.over) notice(`${RD(rid).name} jatuh`, `${a.name} berhasil merebut ${RD(rid).name} setelah pengepungan ${s.done} hari.`);
  }
}

/* ---------- pasukan musuh ---------- */
function nearestTarget(from){
  const mine = myRegions(); if (!mine.length) return null;
  return mine.slice().sort((x, y) => (MAP.dist[from][x] ?? 99) - (MAP.dist[from][y] ?? 99))[0];
}
function spawnEnemyArmy(w){
  if (!G.armies) ensureArmies();
  const mine = myRegions(); if (!mine.length) return null;
  const e = w.enemy;
  let base, n;
  if (e === 'belanda') {
    const theirs = regionsOf('belanda'); if (!theirs.length) return null;
    base = theirs.slice().sort((x, y) => Math.min(...mine.map(m => MAP.dist[x][m] ?? 99)) - Math.min(...mine.map(m => MAP.dist[y][m] ?? 99)))[0];
    n = Math.round((expSize() * 0.7 + P().army * 0.5) * w.commit);
  } else {
    const F = G.fac[e]; if (!F || F.army < 600) return null;
    base = F.cap && G.reg[F.cap] && G.reg[F.cap].owner === e ? F.cap : regionsOf(e)[0];
    if (!base) return null;
    n = Math.round(F.army * 0.6); F.army -= n;
  }
  const a = newArmy(e, base, n);
  const target = nearestTarget(base);
  if (target) { a.from = base; a.to = target; a.total = Math.max(1, travelDays(base, target)); a.done = 0; }
  log(`${a.name} (${fmt(n)} prajurit) berangkat dari ${RD(base).name} menuju ${target ? RD(target).name : 'wilayah kita'}.`, 'buruk');
  toast(`${a.name} (${fmt(n)} prajurit) bergerak menuju ${target ? RD(target).name : 'wilayah kita'}.`);
  return a;
}
function clearWarArmies(fid){
  if (!G.armies) return;
  for (const a of G.armies.filter(x => x.owner === fid)) if (G.fac[fid] && fid !== 'belanda') G.fac[fid].army += Math.round(a.n * 0.8);
  G.armies = G.armies.filter(x => x.owner !== fid);
  for (const a of myArmies()) {
    const o = G.reg[a.to || a.loc].owner;
    if (o === fid) { a.siege = null; const home = nearestOwnRegion(G.player, a.loc); if (home) { a.from = a.loc; a.to = home; a.total = Math.max(1, travelDays(a.loc, home)); a.done = 0; } }
  }
}

/* ---------- jalannya perang setiap bulan (menggantikan serangan seketika) ---------- */
function processWars(){
  ensureArmies();
  for (const w of G.wars.slice()) {
    G.stats.monthsAtWar = (G.stats.monthsAtWar || 0) + 1;
    const theirs = G.armies.filter(a => a.owner === w.enemy);
    if (w.enemy === 'belanda') {
      const perYear = w.commit >= 1.75 ? 2 : 1;
      if (theirs.length < 2 && chance(perYear / 12)) spawnEnemyArmy(w);
      w.exh += (9 + (G.mode === 'gerilya' ? 9 : 0) + (w.allies || []).filter(alive).length * 6) / 12;
      w.commit = Math.min(2.4, w.commit + 0.015);
      if (G.over) return;
      const lost = w.losses > (w.lastLosses || 0); w.lastLosses = w.losses;
      if (w.exh >= 100 && !G.queue.some(q => q.ev === 'damaibelanda')) G.queue.push({ ev: 'damaibelanda', ctx: {} });
      else if (lost && (myRegions().length <= 2 || w.losses >= 3) && !G.queue.some(q => q.ev === 'tawaranmenyerah')) G.queue.push({ ev: 'tawaranmenyerah', ctx: {} });
    } else if (w.enemy === 'jepang') {
      // tidak ada pertempuran aktif melawan Jepang
    } else {
      const E = G.fac[w.enemy];
      if (!alive(w.enemy)) { endWar(w.enemy, `Perang dengan ${D(w.enemy).name} berakhir karena musuh tidak lagi berdiri.`); continue; }
      if (!theirs.length && chance(0.3)) spawnEnemyArmy(w);
      for (const al of (w.allies || [])) {
        if (!alive(al) || !chance(0.04)) continue;
        const targets = regionsNear(al, w.enemy); if (!targets.length) continue;
        const rid = pick(targets), R = G.reg[rid], A = G.fac[al];
        const res = fight(A.army * 0.5, A.quality, 1, R.pop * 2 + E.army * 0.3, E.quality, TERRAIN[RD(rid).ter].def * (1 + 0.3 * R.fort));
        A.army = Math.max(0, A.army - res.aLoss); E.army = Math.max(0, E.army - Math.round(res.dLoss * 0.5));
        if (res.win && regionsOf(w.enemy).length > 1) { setOwner(rid, al); R.stab = 30; log(`Sekutu kita, ${D(al).short}, merebut ${RD(rid).name} dari ${D(w.enemy).short}.`, 'baik'); }
      }
      E.army = Math.round(E.army + regionsOf(w.enemy).reduce((s, r) => s + G.reg[r].pop, 0) * 0.033);
      w.exh += 10 / 12;
      if (!G.over && (w.wins >= 2 || w.exh >= 40) && chance(0.04) && !G.queue.some(q => q.ev === 'damaiai')) G.queue.push({ ev: 'damaiai', ctx: { fid: w.enemy } });
    }
  }
  // pasukan musuh yang diam mencari sasaran baru; pasukan di negeri musuh terkena penyakit
  for (const a of G.armies.slice()) {
    if (a.owner !== G.player && !a.to && !a.siege) {
      if (!atWarWith(a.owner)) { G.armies = G.armies.filter(x => x !== a); continue; }
      const t = nearestTarget(a.loc);
      if (t && t !== a.loc) { a.from = a.loc; a.to = t; a.total = Math.max(1, travelDays(a.loc, t)); a.done = 0; }
    }
    if (!a.to && isEnemyRegionFor(a.owner, a.loc)) setArmyN(a, a.n * 0.99);
  }
  G.armies = G.armies.filter(a => a.n >= 40);
}

/* ---------- perintah pemain ---------- */
const ARMY_ACT = {
  split(id){ const a = armyById(id); if (!a || a.n < 400) return toast('Pasukan terlalu kecil untuk dipecah.'); if (a.to) return toast('Pasukan yang sedang bergerak tidak bisa dipecah.'); const half = Math.floor(a.n / 2); a.n -= half; const b = newArmy(G.player, a.loc, half); b.siege = a.siege ? { ...a.siege } : null; done(`${a.name} dipecah. ${b.name} terbentuk dengan ${fmt(half)} prajurit.`); },
  merge(id){ const a = armyById(id); if (!a || a.to) return; const others = myArmies().filter(b => b !== a && !b.to && b.loc === a.loc); if (!others.length) return toast('Tidak ada pasukan lain di wilayah yang sama.'); for (const b of others) { a.n += b.n; } G.armies = G.armies.filter(b => !others.includes(b)); done(`Pasukan di ${RD(a.loc).name} digabung menjadi ${a.name}.`); },
  home(id){ const a = armyById(id); if (!a) return; const cap = P().cap; if (!cap) return; if (!a.to && a.loc === cap) return toast('Pasukan sudah di ibu kota.'); a.from = a.loc; a.to = cap; a.total = Math.max(1, travelDays(a.loc, cap)); a.done = 0; a.siege = null; done(`${a.name} pulang ke ${RD(cap).name}.`); },
  stop(id){ const a = armyById(id); if (!a || !a.to) return; const t = a.total ? a.done / a.total : 0; const near = t < 0.5 ? a.from : a.to; a.to = null; a.from = null; a.loc = near; a.done = 0; done(`${a.name} berhenti di ${RD(near).name}.`); }
};
