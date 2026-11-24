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

## Catatan sejarah dan sumber

Penguasa tahun 1830, tokoh istana, dan tahun wafatnya diambil dari daftar penguasa yang terbit, antara lain:

- [Daftar penguasa Kerajaan Bone](https://p2k.stekom.ac.id/ensiklopedia/Daftar_penguasa_Kerajaan_Bone) dan [Bone State](https://en.wikipedia.org/wiki/Bone_State)
- [Alauddin Muhammad Da'ud Syah I](https://en.wikipedia.org/wiki/Alauddin_Muhammad_Da%27ud_Syah_I), [Alauddin Sulaiman Ali Iskandar Syah](https://en.wikipedia.org/wiki/Alauddin_Sulaiman_Ali_Iskandar_Syah), [Alauddin Ibrahim Mansur Syah](https://en.wikipedia.org/wiki/Alauddin_Ibrahim_Mansur_Syah)
- [Hamengkubuwono V](https://en.wikipedia.org/wiki/Hamengkubuwono_V), [Pakubuwono VI](https://en.wikipedia.org/wiki/Pakubuwono_VI)
- [Adam of Banjar](https://en.wikipedia.org/wiki/Adam_of_Banjar), [Tamjidillah II](https://en.wikipedia.org/wiki/Tamjidillah_II_of_Banjar), [Hidayatullah II](https://en.wikipedia.org/wiki/Hidayatullah_II_of_Banjar)
- [Sultanate of Siak Sri Indrapura](https://en.wikipedia.org/wiki/Sultanate_of_Siak_Sri_Indrapura), [List of rulers of Maluku](https://en.wikipedia.org/wiki/List_of_rulers_of_Maluku)
- [Dewa Agung](https://en.wikipedia.org/wiki/Dewa_Agung), [Sisingamangaraja XII](https://en.wikipedia.org/wiki/Sisingamangaraja_XII), [Sultanate of Gowa](https://www.wikiwand.com/en/Sultanate_of_Gowa)

Beberapa sumber saling berbeda soal tahun lahir dan tahun wafat (misalnya Sisingamangaraja XI wafat 1867 menurut sebagian sumber, 1876 menurut sumber lain). Di dalam permainan, tahun lahir yang belum pasti ditandai sebagai perkiraan. Nama raja-raja Bali tahun 1830 belum bisa dipastikan, sehingga kerajaan-kerajaan Bali selain Klungkung memakai gelar tanpa nama pribadi. Jumlah prajurit dan penghasilan awal setiap kerajaan adalah perkiraan.
