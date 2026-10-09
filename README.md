# LMS Sekolah/Madrasah — Tahap 0–1

Fondasi frontend untuk LMS sekolah/madrasah berbasis Vue 3, Vite, TypeScript, Tailwind CSS, dan Vue Router.

## Status

- [x] Kerangka Vue + Vite + TypeScript
- [x] Styling Tailwind CSS
- [x] Navigasi responsif
- [x] Dashboard dengan data ilustrasi
- [x] Placeholder modul absensi, tugas, penilaian, data siswa, kelas/mapel, dan pengaturan
- [ ] Backend Google Apps Script
- [ ] Database Google Sheets
- [ ] Login dan sesi nyata
- [ ] Operasi CRUD nyata

## Menjalankan lokal

Persyaratan: Node.js LTS yang didukung dan npm.

```bash
npm install
npm run dev
```

## Pemeriksaan

```bash
npm run type-check
npm run build
```

## Catatan

Dashboard masih memakai data contoh. Login, API, autentikasi, otorisasi server, operasi CRUD, dan integrasi Google Sheets belum diimplementasikan. Jangan gunakan untuk mengelola data siswa nyata sebelum kontrol keamanan selesai.

Tahap berikutnya: Google Spreadsheet, Google Apps Script, dan kontrak API `health.check`.