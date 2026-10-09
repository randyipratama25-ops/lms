<script setup lang="ts">
import { CalendarDays, UsersRound, BookOpen, ArrowUpRight, ArrowRight, Clock3, CircleCheck, CircleAlert, MoreHorizontal } from '@lucide/vue'

const stats = [
  { label: 'Total siswa', value: '684', note: '+12 siswa baru', icon: UsersRound, tone: 'bg-indigo-50 text-indigo-600', trend: 'Data contoh' },
  { label: 'Kehadiran hari ini', value: '94,2%', note: '644 dari 684 siswa', icon: CalendarDays, tone: 'bg-emerald-50 text-emerald-600', trend: 'Data contoh' },
  { label: 'Tugas aktif', value: '28', note: '4 mendekati tenggat', icon: BookOpen, tone: 'bg-amber-50 text-amber-600', trend: 'Data contoh' },
  { label: 'Perlu dinilai', value: '36', note: 'Menunggu penilaian guru', icon: ClipboardCheck, tone: 'bg-violet-50 text-violet-600', trend: 'Data contoh' },
]
const tasks = [
  { subject: 'Matematika', title: 'Latihan Persamaan Linear', className: 'Kelas VIII A', deadline: 'Hari ini, 15.00', status: 'Mendekati tenggat', tone: 'amber' },
  { subject: 'Bahasa Indonesia', title: 'Teks Eksplanasi', className: 'Kelas VII B', deadline: 'Besok, 12.00', status: 'Aktif', tone: 'green' },
  { subject: 'IPA', title: 'Laporan Pengamatan', className: 'Kelas IX A', deadline: '12 Okt 2026', status: 'Aktif', tone: 'green' },
]
const activities = [
  { initials: 'NR', title: 'Nadia Rahma mengumpulkan tugas', detail: 'Matematika · Kelas VIII A', time: '10 menit lalu', tone: 'indigo' },
  { initials: 'BS', title: 'Budi Santoso menyelesaikan kuis', detail: 'IPA · Kelas IX A', time: '35 menit lalu', tone: 'emerald' },
  { initials: 'AF', title: 'Absensi kelas VIII B diperbarui', detail: 'Oleh Ibu Siti Aminah', time: '1 jam lalu', tone: 'amber' },
]
</script>

<template>
  <div class="space-y-7">
    <section class="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-200/40 sm:p-8">
      <div class="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5"></div>
      <div class="pointer-events-none absolute right-28 top-20 h-28 w-28 rounded-full bg-violet-400/20 blur-2xl"></div>
      <div class="relative max-w-2xl">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-50"><span class="h-1.5 w-1.5 rounded-full bg-emerald-300"></span> TAHUN AJARAN 2026/2027</div>
        <h2 class="text-2xl font-extrabold leading-tight tracking-tight sm:text-[32px]">Selamat datang di LMS<br class="hidden sm:block" /> Sekolah/Madrasah 👋</h2>
        <p class="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-[15px]">Kelola aktivitas belajar, pantau kehadiran, dan pastikan setiap tugas berjalan sesuai jadwal.</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <RouterLink to="/absensi" class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">Buka absensi <ArrowRight :size="15" /></RouterLink>
          <RouterLink to="/tugas" class="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15">Lihat tugas <ArrowUpRight :size="15" /></RouterLink>
        </div>
      </div>
      <div class="absolute bottom-0 right-4 hidden opacity-20 md:block lg:right-12"><BookOpen :size="150" :stroke-width="1" /></div>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article v-for="stat in stats" :key="stat.label" class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
        <div class="flex items-start justify-between">
          <div><p class="text-xs font-semibold text-slate-500">{{ stat.label }}</p><p class="mt-3 text-[30px] font-extrabold tracking-tight text-slate-900">{{ stat.value }}</p></div>
          <div :class="['flex h-11 w-11 items-center justify-center rounded-2xl', stat.tone]"><component :is="stat.icon" :size="21" /></div>
        </div>
        <div class="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><span class="text-[11px] text-slate-400">{{ stat.note }}</span><span class="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400">{{ stat.trend }}</span></div>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-6 2xl:grid-cols-[1.45fr_1fr]">
      <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div><h3 class="text-sm font-extrabold text-slate-900">Tugas yang perlu dipantau</h3><p class="mt-1 text-xs text-slate-400">Ringkasan tugas aktif dari berbagai kelas</p></div>
          <RouterLink to="/tugas" class="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">Semua tugas <ArrowRight :size="14" /></RouterLink>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="task in tasks" :key="task.title" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex min-w-0 items-start gap-3">
              <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><BookOpen :size="18" /></div>
              <div class="min-w-0"><p class="text-[10px] font-bold uppercase tracking-wide text-indigo-500">{{ task.subject }}</p><p class="mt-1 truncate text-sm font-bold text-slate-800">{{ task.title }}</p><p class="mt-1 text-xs text-slate-400">{{ task.className }}</p></div>
            </div>
            <div class="flex shrink-0 items-center justify-between gap-4 sm:block sm:text-right"><span :class="['inline-flex rounded-lg px-2.5 py-1.5 text-[10px] font-bold', task.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700']">{{ task.status }}</span><p class="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 sm:justify-end"><Clock3 :size="12" />{{ task.deadline }}</p></div>
          </div>
        </div>
        <div class="bg-slate-50/70 px-6 py-3 text-[10px] text-slate-400">Contoh tampilan — data belum terhubung ke database.</div>
      </div>

      <div class="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-5"><div><h3 class="text-sm font-extrabold text-slate-900">Aktivitas terbaru</h3><p class="mt-1 text-xs text-slate-400">Aktivitas pembelajaran</p></div><button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><MoreHorizontal :size="18" /></button></div>
        <div class="space-y-5 p-5">
          <div v-for="(activity, index) in activities" :key="activity.title" class="flex gap-3">
            <div class="relative"><div :class="['flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-extrabold', activity.tone === 'indigo' ? 'bg-indigo-100 text-indigo-700' : activity.tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700']">{{ activity.initials }}</div><div v-if="index < activities.length - 1" class="absolute left-1/2 top-10 h-6 w-px -translate-x-1/2 bg-slate-100"></div></div>
            <div class="min-w-0 flex-1"><p class="text-xs font-bold leading-5 text-slate-800">{{ activity.title }}</p><p class="mt-0.5 text-[11px] text-slate-400">{{ activity.detail }}</p><p class="mt-2 text-[10px] text-slate-400">{{ activity.time }}</p></div>
          </div>
        </div>
        <div class="mx-5 mb-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3"><div class="flex gap-2"><CircleAlert :size="15" class="mt-0.5 shrink-0 text-slate-400" /><p class="text-[11px] leading-5 text-slate-500">Aktivitas di atas merupakan data ilustrasi untuk pratinjau antarmuka.</p></div></div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5"><div class="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CircleCheck :size="19" /></div><div><p class="text-xs font-bold text-slate-800">Fondasi aplikasi</p><p class="mt-1 text-[11px] leading-5 text-slate-400">Navigasi dan layout dasar sudah disiapkan.</p></div></div>
      <div class="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5"><div class="rounded-xl bg-violet-50 p-2.5 text-violet-600"><UsersRound :size="19" /></div><div><p class="text-xs font-bold text-slate-800">Tiga peran pengguna</p><p class="mt-1 text-[11px] leading-5 text-slate-400">Admin, Guru, dan Siswa akan diaktifkan melalui autentikasi.</p></div></div>
      <div class="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5"><div class="rounded-xl bg-amber-50 p-2.5 text-amber-600"><CalendarDays :size="19" /></div><div><p class="text-xs font-bold text-slate-800">Siap dikembangkan</p><p class="mt-1 text-[11px] leading-5 text-slate-400">Modul berikutnya dapat ditambahkan bertahap.</p></div></div>
    </section>
  </div>
</template>
