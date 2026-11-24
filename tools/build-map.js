'use strict';
/* Membuat map-data.js dari garis pantai Natural Earth (world-atlas, resolusi 1:10 juta).
   Jalankan: npm install && npm run build-map
   Peta dibagi menjadi petak heksagonal 0,2 derajat. Setiap petak daratan diberikan
   kepada wilayah terdekat yang berada di pulau yang sama. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const topojson = require('topojson-client');

const ROOT = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';this.REGION_DEFS = REGION_DEFS;', ctx);
const REGIONS = ctx.REGION_DEFS.map(d => ({ id: d[0], lon: d[3], lat: d[4] }));

const LON0 = 94.8, LAT0 = 7.4, DLON = 0.2, DLAT = DLON * Math.sqrt(3) / 2;
const COLS = Math.ceil((141.6 - LON0) / DLON), ROWS = Math.ceil((LAT0 + 11.4) / DLAT);
const EAST_LIMIT = 141.0; // perbatasan Papua
const cellLon = (c, r) => LON0 + (c + 0.5 * (r & 1)) * DLON;
const cellLat = r => LAT0 - r * DLAT;

/* --- poligon daratan --- */
const topo = JSON.parse(fs.readFileSync(require.resolve('world-atlas/land-10m.json'), 'utf8'));
const land = topojson.feature(topo, topo.objects.land);
const polys = [];
const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry];
for (const g of geoms) {
  const list = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const rings of list) {
    const outer = rings[0];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of outer) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < LON0 - 1 || x0 > 142 || y1 < -12 || y0 > 8.5) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      const f = outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
      a += f; cx += (outer[j][0] + outer[i][0]) * f; cy += (outer[j][1] + outer[i][1]) * f;
    }
    a /= 2; const area = Math.abs(a);
    polys.push({ rings, bb: [x0, y0, x1, y1], area, cx: cx / (6 * a), cy: cy / (6 * a) });
  }
}
function inRing(x, y, ring){
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function polyAt(x, y){
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i], b = p.bb;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (inRing(x, y, p.rings[0]) && !p.rings.slice(1).some(h => inRing(x, y, h))) return i;
  }
  return -1;
}

/* --- petak daratan --- */
const N = COLS * ROWS;
const cellPoly = new Int32Array(N).fill(-1);
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cellPoly[r * COLS + c] = polyAt(cellLon(c, r), cellLat(r));
function nearestCell(lon, lat){
  const r = Math.round((LAT0 - lat) / DLAT);
  const c = Math.round((lon - LON0) / DLON - 0.5 * (r & 1));
  return [clamp(c, 0, COLS - 1), clamp(r, 0, ROWS - 1)];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// pulau kecil (lebih dari sekitar 10 km persegi) tetap mendapat satu petak
const covered = new Set(cellPoly);
polys.forEach((p, i) => {
  if (covered.has(i) || p.area < 0.0008) return;
  if (p.cx < LON0 || p.cx > 141.6 || p.cy > LAT0 || p.cy < -11.4) return;
  const [c, r] = nearestCell(p.cx, p.cy);
  if (cellPoly[r * COLS + c] === -1) cellPoly[r * COLS + c] = i;
});

/* --- wilayah --- */
const regionPoly = REGIONS.map(R => {
  const i = polyAt(R.lon, R.lat);
  if (i >= 0) return i;
  let best = -1, bd = 1e9;
  for (let k = 0; k < N; k++) {
    if (cellPoly[k] < 0) continue;
    const r = Math.floor(k / COLS), c = k % COLS;
    const d = (cellLon(c, r) - R.lon) ** 2 + (cellLat(r) - R.lat) ** 2;
    if (d < bd) { bd = d; best = cellPoly[k]; }
  }
  return best;
});
const cell = new Uint8Array(N); // 0 laut, 1 luar wilayah permainan, 2+i wilayah i
for (let k = 0; k < N; k++) {
  const pi = cellPoly[k]; if (pi < 0) continue;
  const r = Math.floor(k / COLS), c = k % COLS, lon = cellLon(c, r), lat = cellLat(r);
  if (lon > EAST_LIMIT) { cell[k] = 1; continue; }
  // pulau-pulau kecil di sekitar Semenanjung Malaya (Langkawi dan sekitarnya) bukan bagian permainan
  if (lat > 5.6 && lon > 97.8 && lon < 104.5 && polys[pi].area < 5) { cell[k] = 1; continue; }
  let best = -1, bd = 1e9;
  REGIONS.forEach((R, i) => { if (regionPoly[i] !== pi) return; const d = (R.lon - lon) ** 2 + (R.lat - lat) ** 2; if (d < bd) { bd = d; best = i; } });
  if (best < 0 && polys[pi].area < 5) {
    REGIONS.forEach((R, i) => { const d = (R.lon - lon) ** 2 + (R.lat - lat) ** 2; if (d < bd && d < 2.5 * 2.5) { bd = d; best = i; } });
  }
  cell[k] = best < 0 ? 1 : best + 2;
}
// setiap wilayah minimal punya satu petak
REGIONS.forEach((R, i) => {
  if (cell.includes(i + 2)) return;
  const [c, r] = nearestCell(R.lon, R.lat);
  cell[r * COLS + c] = i + 2;
  console.warn('Wilayah tanpa petak, diberi satu petak:', R.id);
});

/* --- jarak antarwilayah (dalam derajat, dibulatkan 0,1) --- */
function cube(c, r){ const q = c - (r - (r & 1)) / 2; return [q, r, -q - r]; }
const tilesOf = REGIONS.map(() => []);
for (let k = 0; k < N; k++) if (cell[k] >= 2) tilesOf[cell[k] - 2].push(cube(k % COLS, Math.floor(k / COLS)));
const RN = REGIONS.length, dist = new Uint8Array(RN * RN);
for (let a = 0; a < RN; a++) for (let b = a + 1; b < RN; b++) {
  let m = 1e9;
  for (const x of tilesOf[a]) for (const y of tilesOf[b]) {
    const d = (Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2])) / 2;
    if (d < m) m = d;
  }
  const v = Math.min(255, Math.round(m * DLON * 10));
  dist[a * RN + b] = v; dist[b * RN + a] = v;
}

const out = `'use strict';
/* Dibuat otomatis oleh tools/build-map.js dari data Natural Earth. Jangan disunting manual. */
const MAPDATA = ${JSON.stringify({
  lon0: LON0, lat0: LAT0, dlon: DLON, cols: COLS, rows: ROWS,
  regions: REGIONS.map(R => R.id),
  cells: Buffer.from(cell).toString('base64'),
  dist: Buffer.from(dist).toString('base64')
})};
`;
fs.writeFileSync(path.join(ROOT, 'map-data.js'), out);
const landCells = cell.filter(v => v >= 2).length, outside = cell.filter(v => v === 1).length;
console.log(`Petak: ${COLS} x ${ROWS}, daratan wilayah ${landCells}, daratan luar ${outside}, ukuran ${out.length} bita`);
for (const [i, t] of tilesOf.entries()) if (t.length < 2) console.log('  wilayah kecil:', REGIONS[i].id, t.length, 'petak');
