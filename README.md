# Petualangan Nusantara

Permainan petualangan 3D di browser (Bahasa Indonesia). Jelajahi desa yang luas, pulau, sawah, dan gunung, mancing di kolam atau pantai, hias rumahmu, bantu warga, belanja di pasar, pecahkan teka-teki kuil, dan temukan pusaka.

## Cara main

Buka `index.html` lewat server lokal (modul ES tidak jalan jika file dibuka langsung sebagai `file://`):

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

- **HP:** tuas virtual di kiri (dorong ke atas = jalan lurus menjauh dari kamera), tombol **Aksi** dan **Lari** di kanan. Geser satu jari di sisi kanan layar untuk memutar kamera. Tombol **Pandangan** untuk ganti ke pandangan mata karakter.
- **Komputer:** WASD atau panah untuk jalan, **Shift** untuk lari, **Spasi** atau **E** untuk aksi, **Q/R** untuk putar kamera, **V** untuk ganti pandangan, seret mouse, **I** untuk tas.

## Wilayah

**Desa** yang lebih luas (rumah, langgar, pasar, balai desa, lapangan beringin, kolam, dan kandang), Hutan, Pantai, Gua, plus **Sawah** (lewat jembatan kayu) dan **Gunung** (lewat jalan batu, ada reruntuhan kuil).

## Misi

1. **Pak Kades** — kumpulkan 10 koin.
2. **Bu Sari** — temukan keranjang di hutan, lalu kembalikan.
3. **Nelayan Udin** — antar ikan ke Warung Desa.
4. **Penjaga Gua** — kalahkan 5 slime, lalu ambil harta karun.
5. **Pak Tani** — temukan cangkul di pojok sawah, lalu kembalikan.
6. **Mbak Rina** — antarkan bekal ke Mbah Karya di kuil gunung.
7. **Mbah Karya** — sentuh tiga batu sesuai urutan prasasti (hijau, kuning, merah).
8. **Kak Andi** — kalahkan 4 roh batu, lalu ambil Pusaka Nusantara di altar.
9. **Bu Yanti** — giring ayam yang kabur kembali ke kandang.
10. **Pak Hasan** — antarkan tiga surat ke kotak rumah di desa.

Misi sampingan (tidak dibutuhkan untuk layar selamat):

11. **Pak Dedi** — mancing 3 ikan di kolam desa atau dermaga pantai.
12. **Pak Kades** — hias rumahmu dengan setidaknya satu perabot.

## Mancing dan rumah

- **Mancing:** dekat ke dermaga kecil di kolam desa atau dermaga pantai, lalu tekan Aksi. Lempar pancing, tunggu umpan disambar, kemudian tarik saat penanda berada di zona hijau. Ada 8 jenis ikan dengan kelangkaan berbeda. Hasil bisa dijual ke **Pak Dedi** atau di **Toko Pasar**. **Pancing kuat** (dibeli di toko) mempersingkat menunggu dan memudahkan ikan langka. Catatan jenis ikan ada di Tas.
- **Rumah:** masuk lewat pintu rumah berpapan **RUMAHMU** di selatan desa (dekat jalan ke pantai). Di dalam, buka **Hias rumah** untuk membeli, meletakkan, memutar, dan mengangkat perabot (kursi, meja, lemari, kasur, tanaman pot, lampu, lukisan batik, karpet, dan piala ikan). Sentuhan dan papan ketik didukung (E letakkan, F putar, X angkat). Piala ikan baru bisa dibeli setelah menangkap ikan langka (gurame atau kakap).

Progres tersimpan otomatis di `localStorage` (kunci `petualangan-nusantara-v3`; data lama dari v2 dan v1 ikut dipindahkan tanpa menghapus progres). Tidak ada iklan atau pembayaran.

Di **pasar** ada toko (sepatu lari, topi, jamu nyawa, lentera malam, pancing kuat, dan perabot rumah). Peta mini di sudut kiri menandai pemain, wilayah, rumah, tempat mancing, dan NPC misi. Hewan desa (ayam, kucing, kambing, sapi, burung, ikan, kupu-kupu, dan kunang-kunang) bergerak di sekitar pulau.

Tombol **Efek** mengatur suara (dibuat lewat Web Audio, tanpa berkas audio) dan getar. Ada siklus siang-malam, hujan atau angin sesekali, dan getaran saat koin, misi selesai, atau terkena slime/roh.

Three.js r170 ikut dalam folder (`three.module.js`), tanpa CDN saat permainan dijalankan.
