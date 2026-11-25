'use strict';
/* Takhta Nusantara: intrik istana, sahabat dan seteru, usulan tokoh istana, dan tokoh pergerakan. */

const SCHEMES = {
  rebut: { n: 'merebut takhta', need: [14, 26] },
  racun: { n: 'meracun pewaris', need: [10, 18] },
  bunuh: { n: 'membunuh raja', need: [16, 28] },
  khianat: { n: 'berkhianat kepada Belanda', need: [8, 14] }
};
const itrOf = c => stat(c, 'itr');
const isPlotter = c => c && c.scheme;
function inLine(c){ return c.dyn && c.alive && !c.out && c.id !== P().ruler; }

/* ---------- bulanan ---------- */
function monthlyIntrigue(){
  const f = P(), r = rulerC(); if (!r) return;
  const people = court().filter(c => age(c) >= 18 && c.id !== f.ruler && !c.away);
  const active = people.filter(isPlotter);
  // komplotan baru
  if (active.length < 2 && !(G.flags.takutUntil > G.t)) {
    for (const c of people) {
      if (c.scheme) continue;
      const amb = hasTrait(c, 'ambisius'), low = c.loy < 35, vlow = c.loy < 20;
      let type = null, target = null, p = 0;
      if (inLine(c) && c.g === 'L' && c.id !== f.heir && (amb || low) && (isRegency() || (f.legit ?? 60) < 50 || stat(c, 'mil') >= 6 || age(r) > 60)) { type = 'rebut'; p = amb && low ? 0.03 : 0.012; }
      else if (inLine(c) && f.heir && c.id !== f.heir && (amb || low) && nextAfterHeir() === c.id) { type = 'racun'; target = f.heir; p = 0.015; }
      else if (c.noble && (vlow || (low && amb)) && !G.japan && G.rel.belanda > -60) { type = 'khianat'; p = 0.02; }
      else if (vlow && amb) { type = 'bunuh'; target = f.ruler; p = 0.006; }
      if (c.rival === f.ruler) p *= 1.6;
      if (type && chance(p)) {
        const [a, b] = SCHEMES[type].need;
        c.scheme = { type, target, prog: 0, need: rint(a, b), found: false };
        if (people.filter(isPlotter).length >= 2) break;
      }
    }
  }
  // kemajuan dan peluang terbongkar
  const telik = councilOf('telik');
  for (const c of court().filter(isPlotter)) {
    const s = c.scheme;
    if (!c.alive || c.out) { c.scheme = null; continue; }
    if (s.target && (!CH(s.target) || !CH(s.target).alive)) { c.scheme = null; continue; }
    if (c.loy > 60 && s.type !== 'khianat') { c.scheme = null; continue; }
    s.prog += 1 + itrOf(c) / 5 * (s.found ? 0.4 : 1);
    if (!s.found) {
      const pFind = 0.04 + (telik ? itrOf(telik) * 0.012 : 0) + (hasTrait(r, 'licik') ? 0.03 : 0) - itrOf(c) * 0.005;
      if (chance(Math.max(0.01, pFind))) { s.found = true; G.queue.push({ ev: 'komplotan', ctx: { cid: c.id } }); continue; }
    }
    if (s.prog >= s.need) finishScheme(c);
  }
  // desas-desus bila telik sandi cakap
  if (telik && itrOf(telik) >= 6 && chance(0.05)) {
    const hidden = court().filter(c => isPlotter(c) && !c.scheme.found && c.scheme.prog > c.scheme.need * 0.5);
    if (hidden.length) toast(`${charName(telik)} mendengar desas-desus ada komplotan di istana. Coba selidiki.`);
  }
  // usulan dari tokoh istana
  if (chance(0.05)) { const pet = pickPetition(); if (pet) G.queue.push(pet); }
}
function nextAfterHeir(){
  const f = P(), h = CH(f.heir); if (!h) return null;
  const saved = f.heir; h.out = true; const nxt = defaultHeir(); h.out = false; f.heir = saved;
  return nxt;
}
function finishScheme(c){
  const s = c.scheme, f = P(); c.scheme = null;
  if (s.type === 'racun') {
    const t = CH(s.target); if (!t || !t.alive) return;
    t.alive = false; addLegit(-3);
    log(`${charName(t)} wafat mendadak. Di istana beredar bisik-bisik tentang racun.`, 'buruk');
    notice('Kematian mendadak', `${charName(t)} wafat secara tiba-tiba setelah jamuan makan malam. Tabib istana tidak bisa menjelaskan sebabnya. Sebagian orang berbisik tentang racun.`);
    f.heir = defaultHeir(); c.loy += 10;
    if (chance(0.3)) { c.scheme = { type: 'racun', target: null, prog: 0, need: 99, found: true, done: true }; G.queue.push({ ev: 'komplotan', ctx: { cid: c.id, sesudah: true } }); }
  } else if (s.type === 'bunuh') {
    const r = rulerC(); if (!r) return;
    r.alive = false; log(`${charName(r)} terbunuh di dalam istana.`, 'buruk');
    const rep = []; succession(rep); if (!G.over) notice('Raja terbunuh', `${charName(r)} terbunuh oleh tangan tak dikenal. ${rep.join(' ')}`);
  } else if (s.type === 'khianat') {
    c.out = true; autoCouncilFill();
    const reg = randMine(); if (reg) G.reg[reg].stab = Math.max(0, G.reg[reg].stab - 20);
    f.army = Math.round(f.army * 0.92); addRel('belanda', 5); G.truceUntil = Math.min(G.truceUntil, G.year);
    log(`${charName(c)} membelot ke Belanda dengan membawa rahasia istana.`, 'buruk');
    notice('Pengkhianatan', `${charName(c)} membelot ke pihak Belanda bersama para pengikutnya. Ia membawa rahasia pertahanan dan daftar sekutu kita.`);
  } else if (s.type === 'rebut') {
    G.queue.push({ ev: 'kudeta', ctx: { cid: c.id } });
  }
}

/* ---------- tahunan: sahabat, seteru, tokoh pergerakan ---------- */
function yearlyIntrigue(){
  const f = P(), people = court().filter(c => age(c) >= 16);
  for (const c of people) if (c.itr === undefined) c.itr = rint(2, 8);
  if (people.length >= 3 && chance(0.5)) {
    const a = pick(people), b = pick(people.filter(x => x !== a));
    if (b) {
      if (chance(0.5)) { a.friend = b.id; b.friend = a.id; if (b.id === f.ruler) a.loy += 10; if (a.id === f.ruler) b.loy += 10; log(`${charName(a)} dan ${charName(b)} kini bersahabat.`, 'info'); }
      else { a.rival = b.id; b.rival = a.id; if (b.id === f.ruler) a.loy -= 12; if (a.id === f.ruler) b.loy -= 12; log(`${charName(a)} dan ${charName(b)} kini bermusuhan.`, 'info'); }
    }
  }
  // tokoh pergerakan dari sekolah-sekolah setelah 1908
  if (G.year >= 1908) {
    const schools = myRegions().reduce((s, r) => s + G.reg[r].school, 0);
    const perg = court().filter(c => c.perg).length;
    if (perg < 3 && chance(Math.min(0.5, 0.08 + schools * 0.06 + G.kebangsaan / 300))) {
      const sk = pick(['STOVIA', 'sekolah guru', 'sekolah pamong praja', 'sekolah hukum di Batavia', 'Technische Hoogeschool di Bandung', 'pesantren dan sekolah dagang']);
      const c = newChar({ fac: G.player, cul: D(G.player).culture, g: chance(0.8) ? 'L' : 'P', age: rint(20, 28), noble: true, mil: rint(2, 5), dip: rint(5, 9), adm: rint(4, 8), traits: [pick(['pembaharu', 'cerdik', 'berwibawa'])], loy: rint(45, 70) });
      c.perg = true; c.itr = rint(3, 7); c.school = sk;
      log(`${charName(c)}, lulusan ${sk}, bergabung dengan istana membawa gagasan kebangsaan.`, 'baik');
      toast(`${charName(c)} bergabung dengan istana sebagai tokoh pergerakan.`, true);
    }
  }
}

/* ---------- usulan dari tokoh istana ---------- */
function pickPetition(){
  const f = P(), list = [];
  const pg = councilOf('panglima'), pt = councilOf('patih'), dt = councilOf('duta');
  const neighbors = Object.keys(G.fac).filter(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !G.fac[x].overlord && !atWarWith(x) && !G.allies.includes(x) && (G.rel[x] ?? 0) < -10 && inReachFac(x));
  if (pg && stat(pg, 'mil') >= 6 && f.army + 1000 <= manpower()) list.push({ ev: 'usul', ctx: { cid: pg.id, k: 'rekrut' } });
  if (pg && neighbors.length && !isVassal() && G.fac[neighbors[0]].army < f.army * 0.7) list.push({ ev: 'usul', ctx: { cid: pg.id, k: 'serang', fid: neighbors[0] } });
  if (pt && f.tax < 2 && f.kas < 200) list.push({ ev: 'usul', ctx: { cid: pt.id, k: 'pajak' } });
  if (pt && f.kas > 400) list.push({ ev: 'usul', ctx: { cid: pt.id, k: 'irigasi' } });
  const friendK = Object.keys(G.fac).find(x => x !== G.player && D(x).kind === 'kerajaan' && alive(x) && !G.fac[x].overlord && !G.allies.includes(x) && (G.rel[x] ?? 0) >= 40);
  if (dt && friendK && !isVassal()) list.push({ ev: 'usul', ctx: { cid: dt.id, k: 'sekutu', fid: friendK } });
  for (const c of court().filter(x => x.perg && x.alive && !x.out)) {
    list.push({ ev: 'usul', ctx: { cid: c.id, k: pick(['sekolah', 'koran', 'kongres']) } });
  }
  return list.length ? pick(list) : null;
}
function inReachFac(fid){ return regionsOf(fid).some(inReach); }
const PETITIONS = {
  rekrut: { t: c => `${charName(c)} mengusulkan perekrutan 1.000 prajurit baru. "Musuh bisa datang kapan saja, Paduka."`, yes: 'Setujui (kas -120)', ok: () => P().kas >= 120, fx: () => { addKas(-120); P().army += 1000; return '1.000 prajurit baru bergabung.'; } },
  serang: { t: c => `${charName(c)} mengusulkan menyerang ${D(c._fid).name} yang sedang lemah. "Inilah saatnya, Paduka."`, yes: 'Nyatakan perang', ok: () => !isVassal(), fx: c => { aggression(5); startWar(c._fid); return `Perang dinyatakan terhadap ${D(c._fid).short}.`; } },
  pajak: { t: c => `${charName(c)} melaporkan kas menipis dan mengusulkan pajak dinaikkan satu tingkat.`, yes: 'Naikkan pajak', fx: () => { P().tax = Math.min(2, P().tax + 1); return 'Pajak dinaikkan.'; } },
  irigasi: { t: c => `${charName(c)} mengusulkan membangun saluran irigasi besar di seluruh negeri.`, yes: 'Setujui (kas -300)', ok: () => P().kas >= 300, fx: () => { addKas(-300); addProsAll(5); return 'Saluran irigasi dibangun di seluruh negeri.'; } },
  sekutu: { t: c => `${charName(c)} mengusulkan persekutuan dengan ${D(c._fid).name}. "Mereka bersahabat dengan kita, Paduka."`, yes: 'Ajukan persekutuan', ok: () => !isVassal(), fx: c => { const p = clamp((G.rel[c._fid] - 25) / 60 + 0.2, 0.2, 0.9); if (chance(p)) { G.allies.push(c._fid); addRel(c._fid, 10); return `${D(c._fid).short} kini sekutu kita.`; } return `${D(c._fid).short} belum bersedia.`; } },
  sekolah: { t: c => `${charName(c)} memohon izin mendirikan sekolah rakyat. "Bangsa yang terdidik tidak akan mudah dijajah, Paduka."`, yes: 'Setujui (kas -80)', ok: () => P().kas >= 80, fx: () => { addKas(-80); const r = randMine(x => G.reg[x].school < 2); if (r) G.reg[r].school++; addNat(3); return 'Sekolah rakyat dibuka.'; } },
  koran: { t: c => `${charName(c)} ingin menerbitkan surat kabar berbahasa Melayu yang membela rakyat.`, yes: 'Izinkan', fx: () => { addNat(5); addRel('belanda', -6); return 'Surat kabar itu cepat laris.'; } },
  kongres: { t: c => `${charName(c)} memohon izin menghadiri kongres pergerakan di Batavia bersama para pemuda dari daerah lain.`, yes: 'Restui', fx: () => { addNat(4); addRel('belanda', -3); return 'Utusan istana pulang membawa semangat persatuan.'; } }
};

/* ---------- tindakan pemain ---------- */
const INTRIK = {
  selidiki(){
    if (!spend(0, 5)) return;
    const telik = councilOf('telik'); let n = 0;
    for (const c of court().filter(x => isPlotter(x) && !x.scheme.found)) {
      if (chance(0.35 + (telik ? itrOf(telik) * 0.05 : 0) - itrOf(c) * 0.02)) { c.scheme.found = true; n++; G.queue.push({ ev: 'komplotan', ctx: { cid: c.id } }); }
    }
    done(n ? `Penyelidikan membongkar ${n} komplotan.` : 'Penyelidikan tidak menemukan apa-apa.');
    if (n) runQueue();
  },
  anugerah(id){ const c = CH(+id); if (!c) return; if (!spend(C(80), 4)) return; c.loy = Math.min(100, c.loy + 25); if (c.scheme && c.scheme.type !== 'khianat' && chance(0.5)) c.scheme = null; done(`${charName(c)} menerima gelar dan tanah lungguh.`); },
  asingkan(id){ const c = CH(+id); if (!c) return; if (!spend(0, 6)) return; c.out = true; c.scheme = null; autoCouncilFill(); addLegit(-3); if (c.dyn) for (const x of family()) x.loy -= 6; if (P().heir === c.id) P().heir = defaultHeir(); done(`${charName(c)} diasingkan dari istana.`); }
};

Object.assign(EVENTS, {
  komplotan: {
    title: c => `Komplotan ${SCHEMES[CH(c.cid).scheme ? CH(c.cid).scheme.type : 'racun'].n}`,
    text: c => { const x = CH(c.cid), s = x.scheme || {}; return c.sesudah ? `Bukti baru terungkap: kematian pewaris adalah ulah ${charName(x)}.` : `Telik sandi membongkar rencana ${charName(x)} untuk ${SCHEMES[s.type].n}${s.target ? `, dengan sasaran ${charName(CH(s.target))}` : ''}. Kemajuannya sudah ${Math.round(s.prog / s.need * 100)} persen.`; },
    opts: [
      { t: 'Asingkan dari istana', h: 'Ia keluar dari istana, legitimasi -2', fx: c => { const x = CH(c.cid); x.out = true; x.scheme = null; autoCouncilFill(); addLegit(-2); if (P().heir === x.id) P().heir = defaultHeir(); return `${charName(x)} diasingkan.`; } },
      { t: 'Hukum mati', h: 'Legitimasi -5, kesetiaan istana -8, komplotan lain jera selama setahun', fx: c => { const x = CH(c.cid); x.alive = false; x.scheme = null; autoCouncilFill(); addLegit(-5); for (const y of court()) y.loy -= 8; G.flags.takutUntil = G.t + 365; if (P().heir === x.id) P().heir = defaultHeir(); return `${charName(x)} dihukum mati.`; } },
      { t: 'Ampuni dan beri jabatan', h: 'Kesetiaannya +30, tetapi ia bisa berkomplot lagi', fx: c => { const x = CH(c.cid); x.scheme = null; x.loy = Math.min(100, x.loy + 30); return `${charName(x)} bersumpah setia.`; } },
      { t: 'Biarkan, tetapi awasi', h: 'Komplotan berjalan lebih lambat', fx: () => 'Para pengawas mengikuti setiap langkahnya.' }
    ] },
  kudeta: {
    title: c => `${charName(CH(c.cid))} merebut takhta`,
    text: c => `${charName(CH(c.cid))} mengumpulkan para pengikutnya dan menuntut takhta. Sebagian bangsawan dan prajurit berpihak kepadanya.`,
    opts: [
      { t: 'Hadapi dengan pasukan', h: 'Pertempuran melawan pemberontak', fx: c => { const x = CH(c.cid); const n = Math.round(P().army * 0.35 + 400 + stat(x, 'mil') * 80); const res = fight(P().army * 0.65, P().quality, battleMod(), n, P().quality, 1); P().army = Math.max(0, Math.round(P().army - res.aLoss - n * 0.4)); G.flags.takutUntil = G.t + 365 * 3; if (res.win) { x.alive = false; x.scheme = null; addLegit(4); return `Pemberontakan ${x.n} dipatahkan.`; } return usurp(x); } },
      { t: 'Berunding dan beri jabatan tinggi', h: 'Kas -200, ia mendapat kursi dewan', ok: () => P().kas >= 200, fx: c => { const x = CH(c.cid); addKas(-200); x.loy = 70; x.scheme = null; P().council.panglima = x.id; G.flags.takutUntil = G.t + 365 * 2; return `${x.n} menerima jabatan panglima.`; } },
      { t: 'Turun takhta', h: 'Ia menjadi penguasa baru', fx: c => usurp(CH(c.cid)) }
    ] },
  usul: {
    title: c => `Usulan dari ${charName(CH(c.cid))}`,
    text: c => { const x = CH(c.cid); x._fid = c.fid; return PETITIONS[c.k].t(x) + (x.perg ? ' (tokoh pergerakan)' : ''); },
    opts: [
      { t: 'Setujui', h: 'Kesetiaannya +10', ok: c => { const p = PETITIONS[c.k]; return !p.ok || p.ok(); }, fx: c => { const x = CH(c.cid); x._fid = c.fid; x.loy = Math.min(100, x.loy + 10); return PETITIONS[c.k].fx(x); } },
      { t: 'Tolak', h: 'Kesetiaannya -8', fx: c => { const x = CH(c.cid); x.loy -= 8; return `${charName(x)} kecewa.`; } }
    ] }
});
function usurp(x){
  const f = P(), old = rulerC();
  if (old) { old.out = true; for (const s of Object.keys(f.council)) if (f.council[s] === old.id) f.council[s] = null; }
  x.scheme = null; G.flags.takutUntil = G.t + 365 * 3; const fromDyn = x.dyn; x.dyn = true; x.noble = false;
  f.ruler = x.id; f.regnalN += 1; if (!fromDyn) G.stats.dynRulers = 1;
  for (const s of Object.keys(f.council)) if (f.council[s] === x.id) f.council[s] = null;
  addLegit(-20); autoCouncil(); f.heir = defaultHeir();
  log(`${charName(x)} merebut takhta.`, 'buruk');
  return `${charName(x)} kini memegang takhta.`;
}
