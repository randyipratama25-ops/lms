<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  GraduationCap, LayoutDashboard, CalendarCheck, ClipboardList, BookOpenCheck,
  UsersRound, PanelsTopLeft, Settings2, Bell, Search, Menu, X, ChevronDown,
  CircleHelp, LogOut, Sparkles
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const pageTitle = computed(() => String(route.meta.title || 'Dashboard'))

const mainNav = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Absensi', path: '/absensi', icon: CalendarCheck },
  { label: 'Tugas', path: '/tugas', icon: ClipboardList },
  { label: 'Penilaian', path: '/penilaian', icon: BookOpenCheck },
]
const dataNav = [
  { label: 'Data Siswa', path: '/siswa', icon: UsersRound },
  { label: 'Kelas & Mapel', path: '/kelas', icon: PanelsTopLeft },
]
</script>

<template>
  <div class="min-h-screen bg-[#f7f8fc] text-slate-800">
    <div v-if="sidebarOpen" class="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" @click="sidebarOpen = false"></div>
    <aside :class="['sidebar fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 transition-transform duration-200 lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full']">
      <div class="mb-9 flex items-center justify-between px-2">
        <button class="flex items-center gap-3 text-left" @click="router.push('/')">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <GraduationCap :size="25" :stroke-width="2.2" />
          </div>
          <div>
            <p class="text-[15px] font-extrabold tracking-tight text-slate-900">LMS Sekolah</p>
            <p class="mt-0.5 text-[11px] font-medium tracking-wide text-slate-400">SEKOLAH / MADRASAH</p>
          </div>
        </button>
        <button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" @click="sidebarOpen = false"><X :size="18" /></button>
      </div>

      <div class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Menu utama</div>
      <nav class="space-y-1">
        <RouterLink v-for="item in mainNav" :key="item.path" :to="item.path" class="nav-link" :class="{ 'nav-link-active': route.path === item.path }" @click="sidebarOpen = false">
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
          <span v-if="item.path === '/tugas'" class="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">4</span>
        </RouterLink>
      </nav>

      <div class="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Data akademik</div>
      <nav class="space-y-1">
        <RouterLink v-for="item in dataNav" :key="item.path" :to="item.path" class="nav-link" :class="{ 'nav-link-active': route.path === item.path }" @click="sidebarOpen = false">
          <component :is="item.icon" :size="18" /><span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="mt-auto">
        <div class="mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
          <div class="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><Sparkles :size="16" /></div>
          <p class="text-sm font-bold text-slate-800">Belajar lebih teratur</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">Semua aktivitas belajar dalam satu tempat.</p>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-indigo-100"><div class="h-full w-2/3 rounded-full bg-indigo-500"></div></div>
          <p class="mt-1.5 text-[10px] text-slate-400">Pratinjau tampilan · Tahap 1</p>
        </div>
        <RouterLink to="/pengaturan" class="nav-link" :class="{ 'nav-link-active': route.path === '/pengaturan' }" @click="sidebarOpen = false"><Settings2 :size="18" /><span>Pengaturan</span></RouterLink>
        <div class="mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-4">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">AD</div>
          <div class="min-w-0 flex-1"><p class="truncate text-xs font-bold text-slate-800">Administrator</p><p class="mt-0.5 text-[11px] text-slate-400">Mode pratinjau</p></div>
          <LogOut :size="16" class="text-slate-300" />
        </div>
      </div>
    </aside>

    <div class="min-h-screen lg:pl-[264px]">
      <header class="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl sm:px-7 xl:px-10">
        <div class="flex min-w-0 items-center gap-3">
          <button class="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden" @click="sidebarOpen = true"><Menu :size="19" /></button>
          <div><p class="text-[11px] font-medium text-slate-400">Portal pembelajaran / <span class="text-slate-500">{{ pageTitle }}</span></p><h1 class="mt-1 text-lg font-extrabold tracking-tight text-slate-900">{{ pageTitle }}</h1></div>
        </div>
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="relative hidden md:block"><Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input class="w-52 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-indigo-300 focus:bg-white" placeholder="Cari menu..." /></div>
          <button class="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"><Bell :size="18" /><span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white"></span></button>
          <button class="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 sm:flex"><span class="text-xs font-semibold text-slate-600">Tahun Ajaran 2026/2027</span><ChevronDown :size="14" class="text-slate-400" /></button>
        </div>
      </header>
      <main class="mx-auto max-w-[1600px] p-4 sm:p-7 xl:p-10">
        <RouterView />
        <footer class="mt-10 flex flex-col gap-2 border-t border-slate-200/80 py-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 LMS Sekolah/Madrasah · Fondasi aplikasi</span>
          <span class="flex items-center gap-1.5"><CircleHelp :size="13" /> Data pada dashboard ini masih berupa contoh</span>
        </footer>
      </main>
    </div>
  </div>
</template>
