# Takhta Nusantara

Gim strategi 2D berbasis peramban. Pemain memimpin sebuah kerajaan Nusantara dari 1830 hingga 1945, di masa Hindia Belanda meluaskan kekuasaannya.

## Cara bermain

Buka `index.html` di peramban, atau kunjungi versi daringnya di GitHub Pages. Tidak perlu memasang apa pun.

Waktu berjalan sendiri, hari demi hari, dari 1 Januari 1830 sampai 17 Agustus 1945. Pada kecepatan 1x satu hari berlalu dalam 1,5 detik. Tekan spasi untuk jeda dan tombol 1 sampai 5 untuk mengatur kecepatan. Peta bisa digeser dengan klik dan tahan, serta diperbesar dengan roda mouse. Setiap tindakan memakai wibawa, dan pembangunan butuh waktu berbulan-bulan dengan biaya yang dicicil.

## Isi repositori

- `index.html`: tampilan dan gaya halaman
- `data.js`: wilayah, kerajaan, nama tokoh, lencana
- `map-data.js`: petak peta (dibuat otomatis, jangan disunting manual)
- `tools/build-map.js`: pembuat `map-data.js` dari garis pantai Natural Earth
- `engine.js`: aturan permainan (ekonomi, tokoh, perang, Belanda, peristiwa)
- `ui.js`: tampilan peta dan panel, penyimpanan kemajuan

Kemajuan pemain (level, lencana, permainan tersimpan) disimpan di peramban masing-masing.

## Catatan sejarah

Peristiwa besar diambil dari sejarah dan disederhanakan. Begitu pemain mengambil keputusan, jalan cerita bisa berbeda dari sejarah yang sebenarnya.

## Membuat ulang peta

Peta dibuat dari data garis pantai [Natural Earth](https://www.naturalearthdata.com/) (paket `world-atlas`). Setelah mengubah titik pusat wilayah di `data.js`, jalankan:

```bash
npm install
npm run build-map
```
