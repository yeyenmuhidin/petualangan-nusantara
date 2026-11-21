# Petualangan Nusantara

Permainan petualangan 3D di browser (Bahasa Indonesia). Jelajahi pulau kecil, bantu warga desa, kalahkan slime, dan temukan harta karun.

## Cara main

Buka `index.html` lewat server lokal (modul ES tidak jalan jika file dibuka langsung sebagai `file://`):

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

- **HP:** tuas virtual di kiri, tombol **Aksi** di kanan.
- **Komputer:** WASD atau panah untuk jalan, **Spasi** atau **E** untuk aksi, **I** untuk tas.

## Misi

1. **Pak Kades** — kumpulkan 10 koin.
2. **Bu Sari** — temukan keranjang di hutan, lalu kembalikan.
3. **Nelayan Udin** — antar ikan ke Warung Desa.
4. **Penjaga Gua** — kalahkan 5 slime, lalu ambil harta karun.

Progres tersimpan otomatis di `localStorage`. Tidak ada iklan atau pembayaran.

Three.js r170 ikut dalam folder (`three.module.js`), tanpa CDN saat permainan dijalankan.
