# Spesifikasi MVP LMS Sekolah/Madrasah

## Stack
- Frontend: Vue 3, Vite, TypeScript, Tailwind CSS v4, Vue Router
- Backend: Google Apps Script
- Database: Google Sheets
- File: Google Drive
- Deployment frontend: Vercel
- Login: username dan password
- Target awal: 300–1.000 siswa

## Role
- Admin: akun, siswa, guru, kelas, mata pelajaran, tahun ajaran, pengaturan.
- Guru: absensi, tugas, melihat pengumpulan, menilai, memberi umpan balik.
- Siswa: melihat tugas, mengumpulkan sebelum tenggat, melihat status dan nilai sendiri.

## Roadmap
0. Perencanaan, spesifikasi, skema data, kontrak API.
1. Frontend shell, dashboard ilustrasi, navigasi responsif.
2. Apps Script, Spreadsheet, repository, health check API.
3. Login, sesi, role checks di backend.
4. CRUD data master akademik.
5. Absensi dan rekap.
6. Tugas, jadwal buka, deadline dan pengumpulan.
7. Penilaian dan umpan balik.
8. Media/Drive dan lampiran.
9. Dashboard berbasis data nyata dan laporan.
10. Pengujian, backup, deployment dan hardening.

## Rancangan Google Sheets
- Users: user_id, username, password_hash, role, status, created_at, updated_at
- Students: student_id, nis, nisn, name, class_id, photo_media_id, status
- Teachers: teacher_id, employee_number, name, email, status
- Classes: class_id, class_name, grade_level, homeroom_teacher_id, academic_year_id
- Subjects: subject_id, subject_name, subject_code
- AcademicYears: academic_year_id, year_label, semester, is_active
- TeachingAssignments: assignment_id, teacher_id, class_id, subject_id
- AttendanceSessions: session_id, class_id, subject_id, teacher_id, session_date
- AttendanceRecords: record_id, session_id, student_id, attendance_status, notes, recorded_at
- Assignments: assignment_id, teacher_id, class_id, subject_id, title, instructions, available_at, due_at, status, max_score
- Submissions: submission_id, assignment_id, student_id, answer_text, submitted_at, status, score, feedback
- Materials: material_id, teacher_id, class_id, subject_id, title, drive_file_id
- Media: media_id, drive_file_id, mime_type, file_size, category, visibility, created_at
- Announcements: announcement_id, title, body, audience, start_at, end_at
- AuditLogs: log_id, actor_id, action, entity_type, entity_id, created_at

Gunakan ID permanen, bukan nomor baris Spreadsheet. Data file disimpan di Drive; Spreadsheet hanya menyimpan metadata dan file ID. Nonaktifkan akun daripada menghapus riwayat akademik.

## Kontrak API awal
POST JSON:
```json
{
  "action": "health.check",
  "data": {}
}
```

Respons:
```json
{
  "success": true,
  "message": "API siap",
  "data": { "status": "ok" },
  "requestId": "req-example"
}
```

Actions rencana:
- System: health.check
- Auth: auth.login, auth.me, auth.logout
- Users: users.list, users.create, users.update, users.deactivate
- Students: students.list, students.create, students.update
- Classes: classes.list, classes.create, classes.update
- Attendance: attendance.session.get, attendance.save, attendance.report
- Assignments: assignments.list, assignments.create, assignments.update
- Submissions: submissions.submit, submissions.list, submissions.grade
- Media: media.upload, media.list, media.update, media.delete
- Reports: reports.attendance, reports.grades

## Aturan penting
- Backend memvalidasi sesi dan role di setiap action terlindungi.
- Jangan menyimpan password plaintext. Gunakan hashing password yang sesuai dan kebijakan reset.
- Deadline diperiksa di server saat submission diterima; frontend disable button bukan kontrol keamanan.
- Gunakan zona waktu konsisten, misalnya Asia/Jakarta, dan ISO 8601 untuk waktu.
- Batasi tipe dan ukuran upload, serta kontrol akses file privat.
- Gunakan LockService/strategi idempotensi untuk operasi tulis yang berpotensi bersamaan.
- Dashboard pada Tahap 1 berisi data ilustrasi; jangan gunakan untuk data siswa nyata sebelum keamanan dan backend selesai.
