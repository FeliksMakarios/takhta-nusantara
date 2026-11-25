'use strict';
/* Takhta Nusantara: rantai peristiwa sejarah per kerajaan dan pergerakan nasional.
   Setiap pemicu diperiksa sebulan sekali dan hanya muncul sekali. Pilihan pemain
   menyimpan tanda (G.flags) yang membuka atau menutup babak berikutnya. */

const F = k => !!(G.flags && G.flags[k]);
const setF = (k, v) => { G.flags[k] = v === undefined ? G.year : v; };
const atWarBelanda = () => atWarWith('belanda');
const isP = fid => G.player === fid;

/* tokoh sejarah yang muncul di istana pada waktunya */
function spawnHist(spec){
  const c = newChar({ fac: G.player, cul: D(G.player).culture, g: spec.g || 'L', b: spec.b, noble: true, mil: spec.mil, dip: spec.dip, adm: spec.adm, traits: spec.tr || [], loy: spec.loy ?? 70 });
  c.n = spec.n; c.full = spec.full; c.hist = true; if (spec.bp) c.bp = true; if (spec.hd) c.hd = spec.hd + rint(0, 1);
  if (spec.itr !== undefined) c.itr = spec.itr;
  if (spec.perg) c.perg = true;
  log(`${spec.full} bergabung dengan istana.`, 'baik');
  return c;
}
const histChar = n => Object.values(G.chars).find(c => c.fac === G.player && c.alive && !c.out && c.n === n);

const TRIGGERS = [
  /* ---------- Aceh ---------- */
  { id: 'aceh_kohler', who: 'aceh', y: 1873, m: 4, until: 1876, cond: () => atWarBelanda(), ev: 'aceh_kohler' },
  { id: 'aceh_umar_datang', who: 'aceh', y: 1873, until: 1890, cond: () => true, ev: 'aceh_umar_datang' },
  { id: 'aceh_tiro', who: 'aceh', y: 1881, until: 1890, cond: () => atWarBelanda(), ev: 'aceh_tiro' },
  { id: 'aceh_snouck', who: 'aceh', y: 1891, m: 7, until: 1900, cond: () => atWarBelanda() || G.rel.belanda < 0, ev: 'aceh_snouck' },
  { id: 'aceh_umar_siasat', who: 'aceh', y: 1893, m: 9, until: 1898, cond: () => atWarBelanda() && !!histChar('Teuku Umar'), ev: 'aceh_umar_siasat' },
  { id: 'aceh_umar_kembali', who: 'aceh', y: 1896, m: 3, until: 1899, cond: () => F('umar_siasat') && !!histChar('Teuku Umar'), ev: 'aceh_umar_kembali' },
  { id: 'aceh_dhien', who: 'aceh', y: 1899, m: 2, until: 1905, cond: () => !histChar('Teuku Umar') || G.year >= 1899, ev: 'aceh_dhien' },
  /* ---------- Banjar ---------- */
  { id: 'banjar_sengketa', who: 'banjar', y: 1856, until: 1862, cond: () => !!histChar('Tamjidillah') || Object.values(G.chars).some(c => c.full === 'Pangeran Tamjidillah' && c.alive), ev: 'banjar_sengketa' },
  { id: 'banjar_pengaron', who: 'banjar', y: 1859, m: 4, until: 1862, cond: () => !atWarBelanda(), ev: 'banjar_pengaron' },
  { id: 'banjar_khalifah', who: 'banjar', y: 1862, m: 3, until: 1866, cond: () => atWarBelanda(), ev: 'banjar_khalifah' },
  /* ---------- Klungkung (Bali) ---------- */
  { id: 'bali_tawan', who: 'klungkung', y: 1841, m: 5, until: 1846, cond: () => !isVassal(), ev: 'bali_tawan' },
  { id: 'bali_kusamba', who: 'klungkung', y: 1849, m: 5, until: 1852, cond: () => atWarBelanda(), ev: 'bali_kusamba' },
  { id: 'bali_puputan', who: 'klungkung', y: 1906, until: 1945, cond: () => atWarBelanda() && (G.armies || []).some(a => a.owner === 'belanda' && a.siege && a.loc === P().cap), ev: 'bali_puputan' },
  /* ---------- Yogyakarta ---------- */
  { id: 'yogya_gula', who: 'yogya', y: 1880, until: 1900, cond: () => true, ev: 'yogya_gula' },
  { id: 'yogya_leiden', who: 'yogya', y: 1930, until: 1940, cond: () => !!heirC() && age(heirC()) >= 16 && age(heirC()) <= 30, ev: 'yogya_leiden' },
  /* ---------- Surakarta ---------- */
  { id: 'solo_laweyan', who: 'surakarta', y: 1911, m: 10, until: 1915, cond: () => true, ev: 'solo_laweyan' },
  /* ---------- Bone ---------- */
  { id: 'bone_kajuara', who: 'bone', y: 1858, until: 1862, cond: () => G.rel.belanda < 30 && !isVassal(), ev: 'bone_kajuara' },
  { id: 'bone_pawawoi', who: 'bone', y: 1904, until: 1908, cond: () => !isVassal(), ev: 'bone_pawawoi' },
  /* ---------- Tanah Batak ---------- */
  { id: 'batak_nommensen', who: 'batak', y: 1862, until: 1870, cond: () => true, ev: 'batak_nommensen' },
  { id: 'batak_bahalbatu', who: 'batak', y: 1878, m: 2, until: 1885, cond: () => !isVassal() && G.flags.zending_terima !== undefined, ev: 'batak_bahalbatu' },
  /* ---------- Gowa, Siak, Ternate ---------- */
  { id: 'gowa_husain', who: 'gowa', y: 1905, m: 10, until: 1907, cond: () => atWarBelanda(), ev: 'gowa_husain' },
  { id: 'siak_traktat', who: 'siak', y: 1858, m: 2, until: 1860, cond: () => !isVassal(), ev: 'siak_traktat' },
  { id: 'ternate_jailolo', who: 'ternate', y: 1914, m: 4, until: 1916, cond: () => isVassal(), ev: 'ternate_jailolo' },
  /* ---------- pergerakan nasional (semua kerajaan) ---------- */
  { id: 'pkii_1926', y: 1926, m: 11, cond: () => true, ev: 'pkii_1926' },
  { id: 'pni_1927', y: 1927, m: 7, cond: () => true, ev: 'pni_1927' },
  { id: 'menggugat_1930', y: 1930, m: 8, cond: () => G.kebangsaan >= 20, ev: 'menggugat_1930' },
  { id: 'peta_1943', y: 1943, m: 10, cond: () => G.japan, ev: 'peta_1943' },
  { id: 'koiso_1944', y: 1944, m: 9, cond: () => G.japan, ev: 'koiso_1944' },
  { id: 'bpupki_1945', y: 1945, m: 5, cond: () => G.japan, ev: 'bpupki_1945' }
];

/* tokoh sejarah yang bergabung dengan istana pada usia dewasa */
const HIST_SPAWNS = [
  { who: 'aceh', y: 1866, spec: { n: 'Cut Nyak Dhien', full: 'Cut Nyak Dhien', g: 'P', b: 1848, hd: 1908, mil: 8, dip: 6, adm: 5, tr: ['pemberani', 'berwibawa'], loy: 90 } },
  { who: 'aceh', y: 1872, spec: { n: 'Teuku Umar', full: 'Teuku Umar', b: 1854, hd: 1899, mil: 9, dip: 7, adm: 4, tr: ['cakap_perang', 'cerdik'], itr: 8, loy: 75 } },
  { who: 'aceh', y: 1880, spec: { n: 'Muhammad Saman', full: 'Teungku Chik di Tiro (Muhammad Saman)', b: 1836, hd: 1891, mil: 7, dip: 7, adm: 5, tr: ['saleh', 'berwibawa'], loy: 85 } },
  { who: 'banjar', y: 1880, spec: { n: 'Muhammad Seman', full: 'Sultan Muhammad Seman (putra Antasari)', b: 1835, bp: true, hd: 1905, mil: 7, dip: 5, adm: 5, tr: ['pemberani'], loy: 80 } },
  { who: 'yogya', y: 1912, spec: { n: 'Ki Hajar Dewantara', full: 'Raden Mas Soewardi Soerjaningrat (Ki Hajar Dewantara)', b: 1889, hd: 1959, mil: 3, dip: 8, adm: 7, tr: ['pembaharu', 'cerdik'], loy: 60, perg: true } },
  { who: 'surakarta', y: 1911, spec: { n: 'Samanhudi', full: 'Haji Samanhudi', b: 1868, hd: 1956, mil: 3, dip: 7, adm: 7, tr: ['saleh', 'cermat'], loy: 65, perg: true } }
];

function monthlyStories(){
  if (!G.flags) G.flags = {};
  const now = G.year * 12 + G.month + 1;
  for (const t of TRIGGERS) {
    if (G.flags['t_' + t.id]) continue;
    if (t.who && !isP(t.who)) continue;
    if (now < t.y * 12 + (t.m || 1)) continue;
    if (t.until && G.year > t.until) { G.flags['t_' + t.id] = 'lewat'; continue; }
    if (!myRegions().length) continue;
    let ok = false; try { ok = t.cond(); } catch (e) { ok = false; }
    if (!ok) continue;
    G.flags['t_' + t.id] = G.year;
    G.queue.push({ ev: t.ev, ctx: {} });
  }
  for (const h of HIST_SPAWNS) {
    const k = 's_' + h.spec.n;
    if (G.flags[k] || !isP(h.who) || G.year < h.y || G.year > h.spec.hd - 1) continue;
    G.flags[k] = 1; spawnHist(h.spec);
  }
}

Object.assign(EVENTS, {
  /* ---------- Aceh ---------- */
  aceh_kohler: { hist: true, title: () => 'Jenderal Köhler gugur',
    text: () => 'Ekspedisi pertama Belanda mendarat di pantai Aceh dan menyerbu Masjid Raya Baiturrahman. Di halaman masjid, Jenderal J.H.R. Köhler tewas ditembak penembak jitu Aceh. Pasukan Belanda goyah dan mundur ke kapal.',
    opts: [
      { t: 'Kejar mereka sampai ke pantai', h: 'Kelelahan perang Belanda +20, legitimasi +6, prajurit -300', fx: () => { const w = warWith('belanda'); if (w) w.exh += 20; addLegit(6); P().army = Math.max(0, P().army - 300); return 'Ekspedisi pertama Belanda gagal total.'; } },
      { t: 'Perkuat benteng di sekitar Kutaraja', h: 'Benteng ibu kota +1, kelelahan perang Belanda +10', fx: () => { const w = warWith('belanda'); if (w) w.exh += 10; const R = G.reg[P().cap]; if (R) R.fort = Math.min(3, R.fort + 1); return 'Aceh bersiap menghadapi ekspedisi kedua.'; } }
    ] },
  aceh_umar_datang: { title: () => 'Seorang pemuda dari Meulaboh',
    text: () => 'Teuku Umar, pemuda dari keluarga uleebalang di Meulaboh, terkenal berani dan pandai bersiasat. Ia datang menghadap dan menawarkan pengabdiannya.',
    opts: [
      { t: 'Angkat ia sebagai panglima muda', h: 'Teuku Umar masuk dewan sebagai panglima', fx: () => { const c = histChar('Teuku Umar'); if (c) { P().council.panglima = c.id; c.loy = Math.min(100, c.loy + 10); } return 'Teuku Umar kini memimpin sebagian pasukan.'; } },
      { t: 'Terima dengan hormat', h: 'Kesetiaannya +5', fx: () => { const c = histChar('Teuku Umar'); if (c) c.loy += 5; return 'Teuku Umar tinggal di istana.'; } }
    ] },
  aceh_tiro: { hist: true, title: () => 'Seruan Teungku Chik di Tiro',
    text: () => 'Teungku Chik di Tiro, ulama besar dari Pidie, menyerukan perang sabil. Hikayat Prang Sabi dibacakan di meunasah-meunasah, dan para pemuda berbondong-bondong mengangkat senjata.',
    opts: [
      { t: 'Restui dan dukung', h: 'Prajurit +1.500, legitimasi +5, ketenteraman +5', fx: () => { P().army += 1500; addLegit(5); addStabAll(5); return 'Ribuan pejuang bergabung.'; } },
      { t: 'Minta ulama menahan diri', h: 'Legitimasi -6, hubungan dengan Belanda +8', fx: () => { addLegit(-6); addRel('belanda', 8); return 'Para ulama kecewa.'; } }
    ] },
  aceh_snouck: { hist: true, title: () => 'Siasat Snouck Hurgronje',
    text: () => 'Seorang ahli Islam Belanda, Snouck Hurgronje, menyamar dan mempelajari masyarakat Aceh. Ia menasihati Batavia agar memecah belah ulama dan uleebalang, merangkul yang satu dan menumpas yang lain.',
    opts: [
      { t: 'Satukan ulama dan uleebalang', h: 'Kas -150, kesetiaan bangsawan +10', ok: () => P().kas >= 150, fx: () => { addKas(-150); for (const n of nobles()) n.loy += 10; return 'Persatuan di Aceh tetap terjaga.'; } },
      { t: 'Biarkan saja', h: 'Ketenteraman semua wilayah -10, kesetiaan bangsawan -10', fx: () => { addStabAll(-10); for (const n of nobles()) n.loy -= 10; return 'Perpecahan mulai merembes ke kampung-kampung.'; } }
    ] },
  aceh_umar_siasat: { hist: true, title: () => 'Siasat Teuku Umar',
    text: () => 'Teuku Umar datang dengan usul yang berani: ia akan berpura-pura menyerah kepada Belanda, mendapat senjata dan uang mereka, lalu kembali ke pihak Aceh pada saat yang tepat.',
    opts: [
      { t: 'Izinkan siasat itu', h: 'Teuku Umar pergi ke pihak Belanda untuk sementara', fx: () => { setF('umar_siasat'); const c = histChar('Teuku Umar'); if (c) { c.away = true; for (const k of Object.keys(P().council)) if (P().council[k] === c.id) P().council[k] = null; } addLegit(-3); return 'Kabar menyerahnya Teuku Umar mengejutkan rakyat.'; } },
      { t: 'Tolak, terlalu berbahaya', h: 'Kesetiaan Teuku Umar -10', fx: () => { const c = histChar('Teuku Umar'); if (c) c.loy -= 10; return 'Teuku Umar tetap bertempur seperti biasa.'; } }
    ] },
  aceh_umar_kembali: { hist: true, title: () => 'Teuku Umar kembali',
    text: () => 'Teuku Umar dan pasukannya membelot kembali ke pihak Aceh. Mereka membawa ratusan senapan, peluru, dan uang Belanda. Batavia merasa dipermalukan.',
    opts: [{ t: 'Sambut sang panglima', h: 'Prajurit +800, mutu +0,15, kas +400, kelelahan perang Belanda +15', fx: () => { const c = histChar('Teuku Umar'); if (c) c.away = false; P().army += 800; P().quality = Math.min(1.6, P().quality + 0.15); addKas(400); const w = warWith('belanda'); if (w) w.exh += 15; addLegit(8); return 'Siasat Teuku Umar berhasil gemilang.'; } }] },
  aceh_dhien: { hist: true, title: () => 'Cut Nyak Dhien memimpin',
    text: () => 'Teuku Umar gugur di Meulaboh. Istrinya, Cut Nyak Dhien, mengambil alih pimpinan pasukan dan bersumpah melanjutkan perlawanan dari hutan-hutan Aceh.',
    opts: [{ t: 'Dukung perjuangannya', h: 'Legitimasi +5; Cut Nyak Dhien menjadi panglima', fx: () => { const u = histChar('Teuku Umar'); if (u) u.alive = false; const c = histChar('Cut Nyak Dhien'); if (c) P().council.panglima = c.id; addLegit(5); if (G.mode !== 'gerilya' && atWarBelanda()) G.mode = 'gerilya'; return 'Perang gerilya berlanjut.'; } }] },
  /* ---------- Banjar ---------- */
  banjar_sengketa: { hist: true, title: () => 'Sengketa takhta Banjar',
    text: () => 'Residen Belanda mendukung Pangeran Tamjidillah sebagai calon sultan. Padahal rakyat dan para ulama lebih menyukai Pangeran Hidayatullah, yang dianggap lebih saleh dan berhak.',
    opts: [
      { t: 'Tetapkan Hidayatullah sebagai pewaris', h: 'Legitimasi +6, hubungan dengan Belanda -25', fx: () => { const h = Object.values(G.chars).find(c => c.alive && c.full === 'Pangeran Hidayatullah'); if (h) P().heir = h.id; addLegit(6); addRel('belanda', -25); setF('banjar_hidayat'); return 'Rakyat bersorak, Residen murka.'; } },
      { t: 'Ikuti kehendak Belanda', h: 'Hubungan +15, legitimasi -8, ketenteraman -10', fx: () => { const t = Object.values(G.chars).find(c => c.alive && c.full === 'Pangeran Tamjidillah'); if (t) P().heir = t.id; addRel('belanda', 15); addLegit(-8); addStabAll(-10); return 'Desas-desus pemberontakan mulai terdengar.'; } }
    ] },
  banjar_pengaron: { hist: true, title: () => 'Serangan ke tambang Pengaron',
    text: () => 'Pangeran Antasari dan para pengikutnya bersiap menyerang tambang batu bara Belanda di Pengaron. Mereka meminta restu istana.',
    opts: [
      { t: 'Restui serangan itu', h: 'Perang dengan Belanda, legitimasi +8, prajurit +1.200', fx: () => { P().army += 1200; addLegit(8); if (isVassal()) P().overlord = null; startWar('belanda', 'kolonial'); return 'Perang Banjar dimulai.'; } },
      { t: 'Larang dan tahan Antasari', h: 'Hubungan +20, kesetiaan bangsawan -15', fx: () => { addRel('belanda', 20); for (const n of nobles()) n.loy -= 15; const a = Object.values(G.chars).find(c => c.alive && c.full === 'Pangeran Antasari'); if (a) a.loy -= 30; return 'Antasari menyingkir ke pedalaman dengan kecewa.'; } }
    ] },
  banjar_khalifah: { hist: true, title: () => 'Panembahan Amiruddin Khalifatul Mukminin',
    text: () => 'Di tengah perang, rakyat dan para ulama mengangkat Pangeran Antasari dengan gelar Panembahan Amiruddin Khalifatul Mukminin, pemimpin tertinggi perlawanan.',
    opts: [
      { t: 'Akui gelarnya', h: 'Legitimasi +6, Antasari menjadi panglima, kelelahan perang Belanda +10', fx: () => { const a = Object.values(G.chars).find(c => c.alive && c.full === 'Pangeran Antasari'); if (a) { P().council.panglima = a.id; a.loy = 100; } addLegit(6); const w = warWith('belanda'); if (w) w.exh += 10; return 'Perlawanan Banjar menyala di seluruh negeri.'; } },
      { t: 'Gelar itu menyaingi raja', h: 'Legitimasi -4, kesetiaan Antasari -30', fx: () => { addLegit(-4); const a = Object.values(G.chars).find(c => c.alive && c.full === 'Pangeran Antasari'); if (a) a.loy -= 30; return 'Retakan muncul di antara para pejuang.'; } }
    ] },
  /* ---------- Klungkung ---------- */
  bali_tawan: { hist: true, title: () => 'Hak tawan karang',
    text: () => 'Menurut adat Bali, kapal yang karam di pantai menjadi milik raja setempat. Belanda menuntut hak tawan karang dihapus dan meminta Dewa Agung menandatangani perjanjian.',
    opts: [
      { t: 'Tandatangani perjanjian', h: 'Hubungan +20, legitimasi -5', fx: () => { addRel('belanda', 20); addLegit(-5); G.truceUntil = Math.max(G.truceUntil, G.year + 6); return 'Hak tawan karang dihapus di atas kertas.'; } },
      { t: 'Pertahankan adat', h: 'Legitimasi +6, hubungan -25', fx: () => { addLegit(6); addRel('belanda', -25); return 'Belanda mulai menyiapkan ekspedisi.'; } }
    ] },
  bali_kusamba: { hist: true, title: () => 'Serangan malam di Kusamba',
    text: () => 'Pasukan Belanda berkemah di Kusamba, tak jauh dari Klungkung. Dewa Agung Istri Kanya menawarkan diri memimpin serangan malam ke perkemahan musuh.',
    opts: [
      { t: 'Serang malam ini', h: 'Kelelahan perang Belanda +35, legitimasi +8', fx: () => { const w = warWith('belanda'); if (w) w.exh += 35; addLegit(8); for (const a of (G.armies || []).filter(x => x.owner === 'belanda')) a.n = Math.round(a.n * 0.7); return 'Jenderal Michiels tewas. Pasukan Belanda mundur dalam kekacauan.'; } },
      { t: 'Bertahan di istana', h: 'Tidak ada risiko', fx: () => 'Klungkung menunggu serangan berikutnya.' }
    ] },
  bali_puputan: { hist: true, title: () => 'Puputan',
    text: () => `Pasukan Belanda mengepung ${RD(P().cap).name}. Para bangsawan berpakaian putih, siap melakukan puputan: maju bersama hingga titik darah penghabisan daripada menyerah.`,
    opts: [
      { t: 'Puputan', h: 'Kerajaan berakhir dengan terhormat. Akhir permainan', fx: () => { G.over = { kind: 'puputan', text: `${charName(rulerC())} dan seluruh istana maju menyongsong peluru Belanda dalam puputan. ${D(G.player).name} berakhir, tetapi keberaniannya dikenang sepanjang masa.` }; return ''; } },
      { t: 'Menyerah dan menandatangani perjanjian', h: 'Menjadi bawahan Belanda, legitimasi -15', fx: () => { becomeVassal(); addLegit(-15); return 'Istana menyerah.'; } }
    ] },
  /* ---------- Yogyakarta ---------- */
  yogya_gula: { hist: true, title: () => 'Pabrik-pabrik gula',
    text: () => 'Pengusaha Eropa ingin mendirikan pabrik gula di tanah lungguh keraton. Sewanya menggiurkan, tetapi petani harus menanam tebu di sawah mereka.',
    opts: [
      { t: 'Sewakan tanah', h: 'Kas +350, kemakmuran +6, ketenteraman -8', fx: () => { addKas(350); addProsAll(6); addStabAll(-8); return 'Cerobong pabrik gula mulai berasap.'; } },
      { t: 'Lindungi sawah rakyat', h: 'Legitimasi +5', fx: () => { addLegit(5); return 'Rakyat memuji kearifan sultan.'; } }
    ] },
  yogya_leiden: { hist: true, title: () => 'Belajar ke negeri Belanda',
    text: () => `Residen menawarkan agar ${charName(heirC())} bersekolah di Leiden. Banyak yang khawatir ia akan menjadi "orang Belanda", tetapi ada pula yang berharap ia pulang membawa ilmu untuk bangsanya.`,
    opts: [
      { t: 'Kirim ke Leiden', h: 'Pewaris mendapat sifat pembaharu, kebangsaan +6, hubungan +8', fx: () => { const h = heirC(); if (h && !h.tr.includes('pembaharu')) h.tr.push('pembaharu'); if (h) h.dip = Math.min(10, h.dip + 2); addNat(6); addRel('belanda', 8); return 'Sang pewaris berangkat ke Belanda.'; } },
      { t: 'Didik di keraton', h: 'Legitimasi +3', fx: () => { addLegit(3); return 'Pewaris belajar adat dan tata praja di keraton.'; } }
    ] },
  /* ---------- Surakarta ---------- */
  solo_laweyan: { hist: true, title: () => 'Saudagar batik Laweyan',
    text: () => 'Haji Samanhudi dan para saudagar batik di Laweyan mendirikan perkumpulan dagang Islam untuk melawan dominasi pedagang asing. Mereka meminta perlindungan keraton.',
    opts: [
      { t: 'Lindungi perkumpulan itu', h: 'Kebangsaan +10, kas +100, hubungan -8', fx: () => { addNat(10); addKas(100); addRel('belanda', -8); return 'Perkumpulan itu tumbuh menjadi Sarekat Islam.'; } },
      { t: 'Jangan ikut campur', h: 'Hubungan +5', fx: () => { addRel('belanda', 5); return 'Keraton menjaga jarak.'; } }
    ] },
  /* ---------- Bone ---------- */
  bone_kajuara: { hist: true, title: () => 'Keberanian Besse Kajuara',
    text: () => 'Belanda menuntut Bone mengakui kekuasaan mereka. We Tenriawaru Besse Kajuara menolak dengan tegas dan mendesak istana bersiap perang.',
    opts: [
      { t: 'Tolak tuntutan Belanda', h: 'Legitimasi +6, benteng ibu kota +1, hubungan -20', fx: () => { addLegit(6); const R = G.reg[P().cap]; if (R) R.fort = Math.min(3, R.fort + 1); addRel('belanda', -20); return 'Bone menyiapkan pertahanan.'; } },
      { t: 'Berunding', h: 'Hubungan +15, legitimasi -4', fx: () => { addRel('belanda', 15); addLegit(-4); return 'Perundingan menunda perang.'; } }
    ] },
  bone_pawawoi: { hist: true, title: () => 'Tuntutan bea pelabuhan',
    text: () => 'Belanda menuntut agar bea pelabuhan Bone diserahkan kepada mereka. Para bangsawan terbelah: sebagian ingin melawan, sebagian ingin menerima.',
    opts: [
      { t: 'Tolak dan bersiap perang', h: 'Legitimasi +5, hubungan -30, prajurit +800', fx: () => { addLegit(5); addRel('belanda', -30); P().army += 800; return 'Bone memilih melawan.'; } },
      { t: 'Serahkan bea pelabuhan', h: 'Penghasilan berkurang, hubungan +20', fx: () => { addRel('belanda', 20); for (const r of myRegions()) G.reg[r].pros = Math.max(5, G.reg[r].pros - 6); return 'Pelabuhan Bone kini dikelola Belanda.'; } }
    ] },
  /* ---------- Batak ---------- */
  batak_nommensen: { hist: true, title: () => 'Penginjil di Silindung',
    text: () => 'Seorang penginjil Jerman, Ludwig Ingwer Nommensen, datang ke Lembah Silindung. Ia ingin membuka sekolah dan rumah sakit, dan menyebarkan agama Kristen.',
    opts: [
      { t: 'Izinkan', h: 'Sekolah baru di satu wilayah, kebangsaan kelak lebih mudah tumbuh, legitimasi -3', fx: () => { const r = randMine(x => G.reg[x].school < 2); if (r) G.reg[r].school++; addLegit(-3); setF('zending_terima', 1); return 'Sekolah zending dibuka di Silindung.'; } },
      { t: 'Tolak', h: 'Legitimasi +3', fx: () => { addLegit(3); setF('zending_terima', 0); return 'Nommensen pergi ke tempat lain.'; } }
    ] },
  batak_bahalbatu: { hist: true, title: () => 'Perang di Bahal Batu',
    text: () => 'Belanda mendirikan pos di Bahal Batu dan mulai masuk ke Tanah Batak. Sisingamangaraja dihadapkan pada pilihan berat.',
    opts: [
      { t: 'Serang pos Belanda', h: 'Perang dengan Belanda, legitimasi +6', fx: () => { addLegit(6); startWar('belanda', 'kolonial'); return 'Perang Batak dimulai.'; } },
      { t: 'Menarik diri ke pegunungan', h: 'Hubungan +10, ketenteraman -6', fx: () => { addRel('belanda', 10); addStabAll(-6); return 'Belanda memperluas pengaruhnya di lembah.'; } }
    ] },
  /* ---------- Gowa, Siak, Ternate ---------- */
  gowa_husain: { hist: true, title: () => 'Sultan meninggalkan istana',
    text: () => 'Pasukan Belanda mendekati Sungguminasa. Para penasihat mengusulkan agar sultan meninggalkan istana dan memimpin perlawanan dari pedalaman.',
    opts: [
      { t: 'Bergerilya dari pedalaman', h: 'Siasat gerilya, kelelahan perang Belanda +15', fx: () => { G.mode = 'gerilya'; const w = warWith('belanda'); if (w) w.exh += 15; return 'Sultan memimpin perlawanan dari hutan.'; } },
      { t: 'Bertahan di istana', h: 'Benteng ibu kota +1', fx: () => { const R = G.reg[P().cap]; if (R) R.fort = Math.min(3, R.fort + 1); return 'Istana diperkuat.'; } }
    ] },
  siak_traktat: { hist: true, title: () => 'Traktat Siak',
    text: () => 'Belanda menawarkan bantuan mengusir petualang Inggris dari wilayah Siak. Imbalannya, Siak harus menyerahkan Deli dan daerah bawahannya serta mengakui kedaulatan Belanda.',
    opts: [
      { t: 'Tandatangani traktat', h: 'Menjadi bawahan Belanda, kehilangan Deli, kas +300', fx: () => { if (G.reg.deli && G.reg.deli.owner === G.player) setOwner('deli', 'belanda'); becomeVassal(); addKas(300); return 'Siak kini di bawah perlindungan Belanda.'; } },
      { t: 'Tolak', h: 'Legitimasi +5, hubungan -20', fx: () => { addLegit(5); addRel('belanda', -20); return 'Siak memilih berdiri sendiri.'; } }
    ] },
  ternate_jailolo: { hist: true, title: () => 'Pemberontakan Jailolo',
    text: () => 'Rakyat di Jailolo memberontak menolak pajak kepala yang dipungut Belanda. Belanda menuduh istana Ternate berada di balik pemberontakan.',
    opts: [
      { t: 'Bela rakyat Jailolo', h: 'Legitimasi +6, kemandirian +8, hubungan -25', fx: () => { addLegit(6); addIndep(8); addRel('belanda', -25); return 'Batavia murka kepada sultan.'; } },
      { t: 'Bantu Belanda menumpas', h: 'Hubungan +15, legitimasi -8, ketenteraman -10', fx: () => { addRel('belanda', 15); addLegit(-8); addStabAll(-10); return 'Pemberontakan dipadamkan dengan darah.'; } }
    ] },
  /* ---------- pergerakan nasional ---------- */
  pkii_1926: { hist: true, title: () => 'Pemberontakan 1926',
    text: () => 'Pemberontakan bersenjata pecah di Banten dan kemudian di Silungkang. Pemerintah kolonial membalas dengan penangkapan besar-besaran dan pembuangan ke Boven Digoel.',
    opts: [
      { t: 'Lindungi para buronan', h: 'Kebangsaan +6, hubungan -15', fx: () => { addNat(6); addRel('belanda', -15); return 'Beberapa buronan bersembunyi di wilayah kita.'; } },
      { t: 'Serahkan kepada Belanda', h: 'Hubungan +10, kebangsaan -4', fx: () => { addRel('belanda', 10); addNat(-4); return 'Istana menjaga jarak dari pergolakan.'; } }
    ] },
  pni_1927: { hist: true, title: () => 'Partai Nasional Indonesia',
    text: () => 'Di Bandung, Soekarno dan kawan-kawannya mendirikan Partai Nasional Indonesia. Tujuannya terang: Indonesia merdeka. Para pemuda di istanamu ramai membicarakannya.',
    opts: [
      { t: 'Izinkan para pemuda bergabung', h: 'Kebangsaan +10, hubungan -10', fx: () => { addNat(10); addRel('belanda', -10); return 'Cabang PNI berdiri di wilayah kita.'; } },
      { t: 'Larang', h: 'Hubungan +8, kesetiaan tokoh pergerakan -15', fx: () => { addRel('belanda', 8); for (const c of court()) if (c.perg) c.loy -= 15; return 'Para pemuda kecewa kepada istana.'; } }
    ] },
  menggugat_1930: { hist: true, title: () => 'Indonesia Menggugat',
    text: () => 'Soekarno diadili di Bandung. Pidato pembelaannya, Indonesia Menggugat, tersebar luas dan menggetarkan hati banyak orang, termasuk di istanamu.',
    opts: [
      { t: 'Sebarkan salinan pidato itu', h: 'Kebangsaan +8, hubungan -8', fx: () => { addNat(8); addRel('belanda', -8); return 'Salinan pidato beredar dari tangan ke tangan.'; } },
      { t: 'Diam saja', h: 'Tidak ada perubahan', fx: () => 'Istana memilih diam.' }
    ] },
  peta_1943: { hist: true, title: () => 'Pembela Tanah Air',
    text: () => 'Jepang membentuk tentara sukarela Pembela Tanah Air (PETA) dan melatih ribuan pemuda. Kelak, merekalah tulang punggung tentara Indonesia.',
    opts: [
      { t: 'Kirim pemuda untuk dilatih', h: 'Mutu pasukan +0,15, prajurit +1.000, kebangsaan +6', fx: () => { P().quality = Math.min(1.6, P().quality + 0.15); P().army += 1000; addNat(6); return 'Para pemuda pulang sebagai prajurit terlatih.'; } },
      { t: 'Tahan para pemuda', h: 'Tidak ada perubahan', fx: () => 'Para pemuda tetap di kampung.' }
    ] },
  koiso_1944: { hist: true, title: () => 'Janji kemerdekaan',
    text: () => 'Perdana Menteri Jepang, Koiso, menjanjikan kemerdekaan bagi Hindia Timur "di kemudian hari". Bendera Merah Putih boleh dikibarkan berdampingan dengan bendera Jepang.',
    opts: [{ t: 'Kibarkan Merah Putih', h: 'Kebangsaan +8, legitimasi +3', fx: () => { addNat(8); addLegit(3); return 'Merah Putih berkibar di halaman istana.'; } }] },
  bpupki_1945: { hist: true, title: () => 'Badan Penyelidik Usaha Persiapan Kemerdekaan',
    text: () => 'Jepang membentuk BPUPKI untuk menyiapkan dasar negara Indonesia. Pada 1 Juni 1945, Soekarno menyampaikan pidato tentang Pancasila. Istana diundang mengirim wakil.',
    opts: [
      { t: 'Kirim wakil terbaik', h: 'Kebangsaan +10', fx: () => { addNat(10); setF('bpupki_wakil'); return 'Wakil kerajaan ikut merumuskan dasar negara.'; } },
      { t: 'Tidak perlu', h: 'Tidak ada perubahan', fx: () => 'Istana menunggu perkembangan.' }
    ] }
});
