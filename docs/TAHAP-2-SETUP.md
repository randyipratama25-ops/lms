# Tahap 2 — Backend Google Apps Script dan Google Sheets

Tahap ini menambahkan fondasi API, schema database, dan proxy Vercel. Belum ada login atau CRUD akademik aktif.

## 1. Buat project Google Apps Script

1. Buka https://script.google.com/ dan buat project baru bernama `LMS Sekolah Madrasah API`.
2. Buat file script berikut di editor, lalu salin isi file dengan nama sama dari folder `gas-backend/`:
   - `Code.gs`
   - `Router.gs`
   - `Database.gs`
   - `SpreadsheetRepository.gs`
   - `Validation.gs`
3. Buka **Project Settings**, aktifkan tampilan `appsscript.json`, lalu salin konfigurasi dari `gas-backend/appsscript.json`.
4. Set zona waktu project ke `Asia/Jakarta`.

## 2. Buat database Spreadsheet

1. Di editor Apps Script, pilih fungsi `setupDatabase` dan tekan **Run**.
2. Setujui izin Google Sheets yang diminta.
3. Lihat **Execution log** untuk URL spreadsheet yang dibuat.
4. Buka **Project Settings → Script Properties**, pastikan properti `LMS_SPREADSHEET_ID` dibuat otomatis.

Fungsi setup aman untuk dijalankan ulang selama header sheet yang sudah ada sesuai skema. Jika header berbeda, fungsi berhenti tanpa menimpa data.

## 3. Set shared secret

Buat secret acak panjang (minimal 32 byte entropi) menggunakan password manager atau generator tepercaya. Jangan kirim secret ke chat, jangan commit ke Git, dan jangan gunakan contoh yang mudah ditebak.

Di **Project Settings → Script Properties**, tambahkan:
- `LMS_API_SHARED_SECRET` = secret yang Anda buat.

Simpan secret yang sama sebagai environment variable Vercel pada **Production**, **Preview**, dan **Development** bila lingkungan tersebut dipakai:
- `LMS_API_SHARED_SECRET` = secret yang sama.

Jangan beri prefix `VITE_` pada secret karena nilai tersebut tidak boleh dikirim ke browser.

## 4. Deploy Apps Script sebagai Web App

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. **Execute as:** Me (akun pemilik script).
4. **Who has access:** Anyone, karena proxy Vercel harus bisa memanggil endpoint. POST tetap menolak request tanpa shared secret.
5. Klik Deploy, selesaikan otorisasi, lalu salin URL yang berakhir dengan `/exec`.
6. Jangan bagikan URL dan secret bersama-sama di tempat publik.

Tambahkan URL ke Vercel sebagai environment variable:
- `LMS_GAS_WEB_APP_URL` = URL deployment `https://script.google.com/macros/s/.../exec`.

Jika mengubah kode Apps Script, buat versi baru melalui **Deploy → Manage deployments → Edit → New version** agar deployment Web App memakai kode terbaru.

## 5. Konfigurasi Vercel

Di **Project Settings → Environment Variables**, tambahkan:
- `LMS_GAS_WEB_APP_URL`
- `LMS_API_SHARED_SECRET`

Tandai environment yang dibutuhkan. Kemudian lakukan redeploy. Endpoint proxy:
- `GET /api` — status proxy, tidak memeriksa database.
- `POST /api` — meneruskan action ke Apps Script; secret disisipkan di server.

Tidak perlu membuat variable `VITE_API_BASE_URL` untuk production karena default frontend adalah `/api`.

## 6. Verifikasi

Periksa:
1. Buka `https://DOMAIN-VERCEL/api`: JSON `proxy: ok`.
2. Kirim POST JSON ke `https://DOMAIN-VERCEL/api` dengan body `{"action":"health.check","data":{}}`.
3. Jika database belum disiapkan, health response menunjukkan `setup_required`.
4. Setelah `setupDatabase()` dan secret dikonfigurasi, response harus menunjukkan `status: ok` dan database `accessible: true`.

Contoh curl (ganti domain dengan domain Anda):

```bash
curl -X POST 'https://DOMAIN-VERCEL/api' \
  -H 'Content-Type: application/json' \
  -d '{"action":"health.check","data":{}}'
```

## Keamanan dan batasan tahap ini

- Secret backend hanya dibaca oleh Vercel Function dan Script Properties, tidak pernah disimpan pada frontend.
- Endpoint Apps Script publik untuk transport, tetapi POST mensyaratkan shared secret yang disisipkan oleh proxy.
- Shared secret adalah kontrol internal awal, bukan autentikasi pengguna. Tahap 3 wajib menambahkan login, sesi bertanda tangan/opaque token, expiry, role authorization pada backend, proteksi brute force, dan kebijakan password.
- Belum ada password, data siswa nyata, CRUD, absensi, tugas, upload, atau penilaian pada tahap ini.
- Google Sheets cocok untuk MVP skala kecil-menengah dengan disiplin akses dan pengujian konkurensi; tambahkan LockService pada operasi tulis di modul berikutnya.
