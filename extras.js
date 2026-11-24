'use strict';
/* Takhta Nusantara: slot simpanan, tutorial, dan musik gamelan */

/* ---------- slot simpanan ---------- */
const SLOT_IDS = ['auto', '1', '2', '3'];
const slotKey = id => id === 'auto' ? 'tn_save' : 'tn_slot' + id;
const slotDoc = id => id === 'auto' ? 'save' : 'slot' + id;
const slotName = id => id === 'auto' ? 'Simpanan otomatis' : `Slot ${id}`;
if (!CLOUD.slots) CLOUD.slots = {};
function readSlot(id){
  const a = LS.get(slotKey(id)), b = id === 'auto' ? CLOUD.save : CLOUD.slots[id];
  const pickS = (a && b) ? ((b.t || 0) > (a.t || 0) ? b : a) : (a || b || null);
  return pickS && pickS.json ? pickS : null;
}
function writeSlot(id){
  if (!G || G.over) return;
  const s = { t: Date.now(), fac: G.player, year: G.year, date: dateStr(), json: JSON.stringify(G) };
  LS.set(slotKey(id), s);
  if (id === 'auto') CLOUD.save = s; else CLOUD.slots[id] = s;
  cloudWrite(slotDoc(id), s);
}
function deleteSlot(id){
  LS.del(slotKey(id));
  if (id === 'auto') CLOUD.save = null; else delete CLOUD.slots[id];
  cloudWrite(slotDoc(id), { t: Date.now(), empty: true });
}
function loadSlot(id){
  const s = readSlot(id); if (!s) return toast('Slot ini kosong.');
  try {
    const g = JSON.parse(s.json);
    if (!g.v || g.v < 3) { deleteSlot(id); renderStart(); return toast('Simpanan dari versi lama tidak cocok dengan sistem waktu yang baru. Silakan mulai permainan baru.'); }
    G = g; G.speed = 0; ensureDiplo(); ensureArmies(); showGame();
  } catch (e) { toast('Simpanan rusak dan tidak bisa dibuka.'); }
}
function slotLabel(s){ return s ? `${D(s.fac).name}, ${s.date || 'tahun ' + s.year}` : 'Kosong'; }
async function loadCloudSlots(col){
  try {
    const docs = await Promise.all(['1', '2', '3'].map(id => col.doc('slot' + id).get()));
    docs.forEach((d, i) => { if (d.exists) { const v = d.data(); if (v && v.json) CLOUD.slots[String(i + 1)] = v; } });
  } catch (e) { /* tetap memakai simpanan lokal */ }
}
function saveSlotsOpen(){
  modal({ eyebrow: 'Simpan permainan', title: 'Pilih slot simpanan', html: '<p>Simpanan di slot tidak tertimpa oleh simpanan otomatis. Memilih slot yang sudah terisi akan menimpanya.</p>',
    buttons: ['1', '2', '3'].map(id => ({ t: slotName(id), h: slotLabel(readSlot(id)), fn: () => { writeSlot(id); toast(`Permainan disimpan di ${slotName(id)}.`, true); } })).concat([{ t: 'Batal' }]) });
}
function savedListHtml(){
  const rows = SLOT_IDS.map(id => ({ id, s: readSlot(id) })).filter(x => x.s);
  if (!rows.length) return '';
  return `<div class="cont"><b>Permainan tersimpan</b><ul class="slots">${rows.map(({ id, s }) => `<li><div><span class="sn">${esc(slotName(id))}</span><br><span class="small">${esc(slotLabel(s))}</span></div>
    <div class="drow"><button class="btn sm primary" data-a="load:${id}">Lanjutkan</button><button class="btn sm ghost" data-a="delslot:${id}" aria-label="Hapus ${esc(slotName(id))}">Hapus</button></div></li>`).join('')}</ul></div>`;
}

/* ---------- tutorial ---------- */
const TUTORIAL = [
  { sel: '.speed', title: 'Waktu', text: 'Waktu berjalan hari demi hari. Tekan Jalan atau spasi untuk memulai, dan tombol 1 sampai 5 untuk mengatur kecepatan. Permainan berhenti sendiri setiap kali ada peristiwa penting.' },
  { sel: '.stats', title: 'Keadaan kerajaan', text: 'Kas bertambah setiap bulan. Wibawa terkumpul perlahan dan dipakai untuk setiap tindakan. Legitimasi menunjukkan seberapa kuat rakyat dan bangsawan menerima rajamu.' },
  { sel: '#mapbox', title: 'Peta', text: 'Seret untuk menggeser, gulir atau cubit untuk memperbesar, lalu klik wilayah untuk melihat isinya. Wilayahmu bergaris emas dan ibu kotamu bertanda bintang.' },
  { sel: '.zoom', title: 'Tombol peta', text: 'Kerajaanku memperbesar peta ke wilayahmu. Seluruh peta menampilkan Nusantara dari Sabang sampai Merauke.' },
  { sel: '#tabbody', tab: 'wilayah', title: 'Panel wilayah', text: 'Di sini kamu membangun pasar, benteng, dan sekolah, atau merekrut prajurit. Pembangunan butuh waktu berbulan-bulan dan biayanya dicicil setiap hari.' },
  { sel: '.tabs [data-a="tab:militer"]', tab: 'militer', title: 'Pasukan', text: 'Pasukanmu tampil sebagai panji di peta. Klik panjinya, lalu klik wilayah tujuan. Wilayah musuh dikepung dulu, lalu diserbu. Bila dua pasukan yang bermusuhan bertemu, terjadi pertempuran.' },
  { sel: '.tabs [data-a="tab:istana"]', tab: 'istana', title: 'Istana', text: 'Tetapkan pewaris, didik anak-anak, nikahkan mereka, dan isi dewan kerajaan dengan orang yang cakap.' },
  { sel: '.tabs [data-a="tab:diplomasi"]', tab: 'diplomasi', title: 'Diplomasi', text: 'Bersekutu, berdagang, atau berperang dengan kerajaan lain. Awasi juga sikap Hindia Belanda dan kecurigaan para tetangga.' },
  { sel: '.tabs [data-a="tab:kronik"]', tab: 'kronik', title: 'Kronik', text: 'Semua peristiwa penting dalam kerajaanmu tercatat di sini.' },
  { sel: '[data-a="menu"]', title: 'Menu', text: 'Buka menu untuk menyimpan ke slot, mengulang tutorial ini, atau kembali ke layar utama. Selamat memerintah!' }
];
let TUT = null;
function startTutorial(){
  if (!G) return;
  setSpeed(0); TUT = { i: 0, prevTab: TAB };
  showTutStep();
}
function endTutorial(){
  LS.set('tn_tut', 1);
  const el = document.getElementById('tut'); if (el) el.hidden = true;
  if (TUT) { TAB = 'wilayah'; renderPanel(); }
  TUT = null;
}
function showTutStep(){
  const st = TUTORIAL[TUT.i]; if (!st) return endTutorial();
  if (st.tab) { TAB = st.tab; renderPanel(); }
  let el = document.getElementById('tut');
  if (!el) { el = document.createElement('div'); el.id = 'tut'; document.body.appendChild(el); }
  el.hidden = false;
  const target = document.querySelector(st.sel);
  if (target) target.scrollIntoView({ block: 'nearest' });
  const r = target ? target.getBoundingClientRect() : null;
  const pad = 6, vw = window.innerWidth, vh = window.innerHeight;
  const spot = r ? `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px` : 'display:none';
  const cardW = Math.min(340, vw - 32);
  let cx = r ? Math.min(Math.max(16, r.left), vw - cardW - 16) : (vw - cardW) / 2;
  let cy = r ? (r.bottom + 14 + 200 < vh ? r.bottom + 14 : Math.max(16, r.top - 214)) : vh / 3;
  if (r && r.height > vh * 0.5) { cy = Math.min(vh - 230, r.top + 40); cx = Math.min(Math.max(16, r.left + 24), vw - cardW - 16); }
  el.innerHTML = `<div class="tspot" style="${spot}"></div>
    <div class="tcard" role="dialog" aria-modal="true" aria-labelledby="tuttitle" style="left:${cx}px;top:${cy}px;width:${cardW}px">
      <div class="eyebrow">Tutorial ${TUT.i + 1} dari ${TUTORIAL.length}</div>
      <h3 id="tuttitle">${esc(st.title)}</h3><p>${esc(st.text)}</p>
      <div class="drow"><button class="btn sm ghost" data-tut="skip">Lewati</button>${TUT.i ? '<button class="btn sm ghost" data-tut="prev">Kembali</button>' : ''}<button class="btn sm primary" data-tut="next">${TUT.i === TUTORIAL.length - 1 ? 'Selesai' : 'Lanjut'}</button></div>
    </div>`;
  el.querySelector('[data-tut="next"]').focus();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tut]'); if (!b || !TUT) return;
  e.stopPropagation();
  const k = b.dataset.tut;
  if (k === 'skip') return endTutorial();
  TUT.i += k === 'prev' ? -1 : 1;
  if (TUT.i >= TUTORIAL.length) return endTutorial();
  showTutStep();
}, true);
window.addEventListener('resize', () => { if (TUT) showTutStep(); });

/* ---------- musik gamelan (dibuat langsung dengan Web Audio) ---------- */
const MUSIC = {
  ctx: null, out: null, timer: null, on: false, beat: 0, next: 0, melody: [], seleh: 0,
  BEAT: 0.62,
  scale: [1, 1.148, 1.318, 1.514, 1.741], base: 196,
  freq(deg, oct){ const d = ((deg % 5) + 5) % 5, o = Math.floor(deg / 5) + (oct || 0); return this.base * this.scale[d] * Math.pow(2, o); },
  init(){
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const c = this.ctx = new AC();
    this.out = c.createGain(); this.out.gain.value = 0.16;
    const delay = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
    delay.delayTime.value = 0.31; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.out.connect(c.destination); this.out.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(c.destination);
    return true;
  },
  hit(t, f, dur, vol, partial){
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out);
    for (const [mul, v] of [[1, 1], [partial || 2.76, 0.28], [5.4, 0.08]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = f * mul; og.gain.value = v;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
  },
  gong(t){
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
    g.connect(this.out);
    for (const f of [61.7, 63.1, 123.4]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 7.2); }
  },
  newGongan(){
    // balungan: delapan nada, berakhir pada nada seleh
    let d = this.seleh, m = [];
    for (let i = 0; i < 7; i++) { d = Math.max(0, Math.min(7, d + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)])); m.push(d); }
    this.seleh = [0, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
    m.push(this.seleh); this.melody = m;
  },
  schedule(){
    const c = this.ctx;
    while (this.next < c.currentTime + 0.4) {
      const b = this.beat % 16, t = this.next;
      if (b === 0) { this.newGongan(); if (this.beat > 0) this.gong(t); }
      const bal = this.melody[Math.floor(b / 2)];
      if (b % 2 === 1) this.hit(t, this.freq(bal, 0), 1.4, 0.22, 2.76);          // saron: balungan
      this.hit(t, this.freq(this.melody[Math.min(7, Math.floor(b / 2) + (b % 2))], 1), 0.55, 0.07, 2.0); // bonang: mendahului nada berikutnya
      if (b % 4 === 3) this.hit(t, this.freq(bal, -1), 2.6, 0.2, 1.5);           // kenong
      if (b === 5 || b === 9 || b === 13) this.hit(t, this.freq(bal, -2), 3.2, 0.18, 1.33); // kempul
      if (Math.random() < 0.55) this.hit(t + this.BEAT / 2, this.freq(this.melody[Math.floor(b / 2)] + 5, 1), 0.3, 0.025, 2.4); // peking
      this.next += this.BEAT; this.beat++;
    }
  },
  start(){
    if (!this.init()) { toast('Peramban ini tidak mendukung musik.'); return; }
    this.ctx.resume(); this.on = true; LS.set('tn_music', 1);
    this.next = this.ctx.currentTime + 0.1; this.beat = 0; this.seleh = 0;
    clearInterval(this.timer); this.timer = setInterval(() => this.schedule(), 120);
  },
  stop(){ this.on = false; LS.set('tn_music', 0); clearInterval(this.timer); this.timer = null; if (this.ctx) this.ctx.suspend(); },
  toggle(){ if (this.on) this.stop(); else this.start(); if (G) renderTop(); }
};
// bila sebelumnya musik menyala, nyalakan lagi pada sentuhan pertama (peramban melarang suara sebelum ada interaksi)
document.addEventListener('pointerdown', function once(e){ document.removeEventListener('pointerdown', once, true); if (e.target.closest && e.target.closest('[data-a="music"]')) return; if (LS.get('tn_music') === 1 && !MUSIC.on) MUSIC.start(); }, true);

/* ---------- mulai ---------- */
try { window.claude?.hot?.snapshot?.(() => ({ G: G && !G.over ? JSON.stringify(G) : null })); } catch (e) {}
try {
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
} catch (e) { boot({}); }
