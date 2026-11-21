# Petualangan Nusantara

Permainan petualangan 3D di browser (Bahasa Indonesia). Jelajahi pulau, sawah, dan gunung, bantu warga, pecahkan teka-teki kuil, dan temukan pusaka.

## Cara main

Buka `index.html` lewat server lokal (modul ES tidak jalan jika file dibuka langsung sebagai `file://`):

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

- **HP:** tuas virtual di kiri (dorong ke atas = jalan lurus menjauh dari kamera), tombol **Aksi** di kanan. Geser satu jari di sisi kanan layar untuk memutar kamera. Tombol **Pandangan** untuk ganti ke pandangan mata karakter.
- **Komputer:** WASD atau panah untuk jalan, **Spasi** atau **E** untuk aksi, **Q/R** untuk putar kamera, **V** untuk ganti pandangan, seret mouse, **I** untuk tas.

## Wilayah

Desa, Hutan, Pantai, Gua, plus wilayah baru di utara: **Sawah** (lewat jembatan kayu) dan **Gunung** (lewat jalan batu, ada reruntuhan kuil).

## Misi

1. **Pak Kades** — kumpulkan 10 koin.
2. **Bu Sari** — temukan keranjang di hutan, lalu kembalikan.
3. **Nelayan Udin** — antar ikan ke Warung Desa.
4. **Penjaga Gua** — kalahkan 5 slime, lalu ambil harta karun.
5. **Pak Tani** — temukan cangkul di pojok sawah, lalu kembalikan.
6. **Mbak Rina** — antarkan bekal ke Mbah Karya di kuil gunung.
7. **Mbah Karya** — sentuh tiga batu sesuai urutan prasasti (hijau, kuning, merah).
8. **Kak Andi** — kalahkan 4 roh batu, lalu ambil Pusaka Nusantara di altar.

Progres tersimpan otomatis di `localStorage` (kunci `petualangan-nusantara-v2`; data lama dari v1 ikut dipindahkan). Tidak ada iklan atau pembayaran.

Three.js r170 ikut dalam folder (`three.module.js`), tanpa CDN saat permainan dijalankan.
