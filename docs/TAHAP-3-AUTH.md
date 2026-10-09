# Tahap 3 — Autentikasi dan sesi

Tahap ini menambahkan autentikasi pengguna ke fondasi Tahap 2. Sebelum akun dibuat, login tidak akan berhasil.

## Arsitektur sesi

- Browser mengirim username/password ke `POST /api` action `auth.login`.
- Vercel meneruskan request ke Apps Script menggunakan secret server-side.
- Apps Script memverifikasi password, lalu mengembalikan token sesi sekali kepada proxy.
- Proxy menyimpan token di cookie `HttpOnly; Secure; SameSite=Lax; Path=/api`; token tidak ditampilkan kembali di JSON dan tidak disimpan pada `localStorage`.
- Apps Script hanya menyimpan SHA-256 token di sheet `Sessions`, bersama user ID, role, waktu terbit, waktu kedaluwarsa, dan status.
- Sesi berlaku dua jam. Satu akun memiliki satu sesi aktif; login baru pada perangkat lain akan membatalkan token sebelumnya.
- Setiap action selain `health.check`, `auth.login`, dan `auth.logout` memerlukan sesi yang masih aktif. Module actions tetap `NOT_IMPLEMENTED` pada Tahap 3.

## Password

- Format penyimpanan: `pbkdf2_sha256$iterations$saltHex$derivedKeyBase64Url`.
- PBKDF2 memakai HMAC-SHA256, salt unik 32 byte, 600.000 iterasi.
- Kata sandi tidak disimpan atau dicatat sebagai teks biasa.
- Karena hashing berjalan di Apps Script dan memiliki batas waktu eksekusi, uji login pertama untuk mengukur latensi aktual. Untuk penggunaan produksi, pantau latency/quota. Bila login sering time out, pertimbangkan layanan autentikasi khusus daripada menurunkan work factor tanpa evaluasi.
- Login dibatasi sementara setelah 8 percobaan gagal per username atau 60 percobaan gagal per IP selama 15 menit. Cache rate limit bersifat best-effort, bukan sistem WAF.

## Setup akun pertama

1. Di Apps Script, buka **Project Settings → Script Properties**.
2. Tambahkan:
   - `LMS_BOOTSTRAP_USERNAME` = username admin yang dipilih (3–64 karakter: a-z, 0-9, titik, _ atau -).
   - `LMS_BOOTSTRAP_PASSWORD` = password kuat minimal 12 karakter.
   - `LMS_BOOTSTRAP_ROLE` = `admin` (opsional; default `admin`).
3. Jangan menaruh password pada source code atau commit ke GitHub.
4. Setelah file Tahap 3 disalin ke Apps Script, jalankan `setupDatabase()` satu kali. Ini akan menambahkan sheet `Sessions` tanpa mengubah data sheet yang header-nya cocok.
5. Jalankan `bootstrapUserFromProperties()` sekali. Fungsi membuat hash password lalu menghapus property bootstrap setelah berhasil.
6. Periksa sheet `Users`: username, role, status dan hash terisi; tidak ada plaintext password. Jangan menyalin hash atau password ke chat.
7. Setelah dibuat, login di halaman aplikasi. Jika Anda sebelumnya sudah men-deploy Web App, pilih **Deploy → Manage deployments → Edit → New version → Deploy** agar Apps Script menggunakan kode baru.

## Deploy ulang

1. Pastikan environment variable Vercel `LMS_GAS_WEB_APP_URL` dan `LMS_API_SHARED_SECRET` tetap ada untuk semua environment yang dipakai.
2. Commit kode ke branch `main` lalu tunggu deployment Vercel selesai.
3. Endpoint browser tetap `/api`. Cookie dikelola server; frontend tidak perlu menerima secret atau token.
4. Karena Apps Script Web App dapat berada di versi deployment sebelumnya, langkah **New version** di atas wajib dilakukan setelah memperbarui script.

## Uji penerimaan

- Login dengan akun aktif dan password benar memberi respons sukses dan cookie HttpOnly.
- Password salah memberi pesan generik `INVALID_CREDENTIALS`, bukan membocorkan apakah username terdaftar.
- Request `auth.me` tanpa cookie ditolak dengan `UNAUTHENTICATED`.
- Reload halaman memulihkan sesi melalui cookie.
- Logout mencabut sesi pada sheet dan menghapus cookie.
- Akun nonaktif atau token kedaluwarsa tidak mendapatkan akses.
- Action selain endpoint publik memerlukan sesi; role guard frontend hanya untuk UX, backend tetap sumber otorisasi.
- Rate limit bekerja best-effort setelah banyak kegagalan.
