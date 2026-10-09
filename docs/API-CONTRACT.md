# Kontrak API LMS v1

## Transport
- Frontend mengirim JSON ke `POST /api` di origin Vercel yang sama.
- Vercel Function menambahkan shared secret server-side dan meneruskan ke Google Apps Script.
- Apps Script menerima `action`, `data`, dan `internalSecret`; jangan kirim secret dari browser.

## Request
```json
{
  "action": "health.check",
  "data": {}
}
```

## Success response
```json
{
  "success": true,
  "message": "Pemeriksaan API selesai.",
  "data": {
    "service": "lms-sekolah-madrasah",
    "api": "ok",
    "status": "ok",
    "database": {
      "configured": true,
      "accessible": true,
      "spreadsheetName": "LMS Sekolah/Madrasah — Database",
      "sheetCount": 16
    },
    "timezone": "Asia/Jakarta",
    "checkedAt": "2026-10-09T00:00:00.000Z"
  },
  "requestId": "uuid"
}
```

## Error response
```json
{
  "success": false,
  "message": "Backend belum dikonfigurasi di Vercel.",
  "error": {
    "code": "BACKEND_NOT_CONFIGURED",
    "message": "Set LMS_GAS_WEB_APP_URL dan LMS_API_SHARED_SECRET."
  },
  "requestId": "uuid"
}
```

## Actions
| Action | Tahap | Keterangan |
| --- | --- | --- |
| `health.check` | 2 | Pemeriksaan Apps Script dan database |
| `auth.login`, `auth.me`, `auth.logout` | 3 | Autentikasi dan sesi |
| `students.list/create/update` | 4 | Data siswa |
| `classes.list/create/update` | 4 | Data kelas |
| `attendance.session.get`, `attendance.save`, `attendance.report` | 5 | Absensi |
| `assignments.list/create/update` | 6 | Tugas |
| `submissions.submit/list`, `submissions.grade` | 6–7 | Pengumpulan dan penilaian |
| `media.upload/list/update/delete` | 8 | Metadata media dan Google Drive |

Belum diimplementasikan berarti API mengembalikan `NOT_IMPLEMENTED`, bukan data palsu.
