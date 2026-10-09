import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard' } },
    { path: '/absensi', component: PlaceholderView, meta: { title: 'Absensi', description: 'Modul absensi akan dibuat pada Tahap 5.' } },
    { path: '/tugas', component: PlaceholderView, meta: { title: 'Tugas', description: 'Pembuatan dan pengumpulan tugas akan dibuat pada Tahap 6.' } },
    { path: '/penilaian', component: PlaceholderView, meta: { title: 'Penilaian', description: 'Penilaian dan umpan balik akan dibuat pada Tahap 7.' } },
    { path: '/siswa', component: PlaceholderView, meta: { title: 'Data Siswa', description: 'Pengelolaan data siswa akan dibuat pada Tahap 4.' } },
    { path: '/kelas', component: PlaceholderView, meta: { title: 'Kelas & Mapel', description: 'Pengelolaan kelas dan mata pelajaran akan dibuat pada Tahap 4.' } },
    { path: '/pengaturan', component: PlaceholderView, meta: { title: 'Pengaturan', description: 'Pengaturan aplikasi akan dilengkapi setelah fondasi backend tersedia.' } },
  ],
})

createApp(App).use(router).mount('#app')
