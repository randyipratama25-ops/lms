import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import LoginView from './views/LoginView.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import { useAuth } from './lib/auth'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Masuk', public: true } },
    { path: '/', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard' } },
    { path: '/absensi', component: PlaceholderView, meta: { title: 'Absensi', description: 'Modul absensi akan dibuat pada Tahap 5.' } },
    { path: '/tugas', component: PlaceholderView, meta: { title: 'Tugas', description: 'Pembuatan dan pengumpulan tugas akan dibuat pada Tahap 6.' } },
    { path: '/penilaian', component: PlaceholderView, meta: { title: 'Penilaian', description: 'Penilaian dan umpan balik akan dibuat pada Tahap 7.' } },
    { path: '/siswa', component: PlaceholderView, meta: { title: 'Data Siswa', description: 'Pengelolaan data siswa akan dibuat pada Tahap 4.' } },
    { path: '/kelas', component: PlaceholderView, meta: { title: 'Kelas & Mapel', description: 'Pengelolaan kelas dan mata pelajaran akan dibuat pada Tahap 4.' } },
    { path: '/pengaturan', component: PlaceholderView, meta: { title: 'Pengaturan', description: 'Pengaturan aplikasi akan dilengkapi setelah fondasi backend tersedia.' } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (to.meta.public) {
    if (auth.initialized.value && auth.isAuthenticated.value) return { path: '/' }
    if (!auth.initialized.value) {
      try {
        await auth.refreshSession()
        if (auth.isAuthenticated.value) return { path: '/' }
      } catch {
        // API unavailable: keep the public login page accessible.
      }
    }
    return true
  }

  try {
    await auth.refreshSession()
  } catch {
    auth.initialized.value = true
  }

  if (!auth.isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

createApp(App).use(router).mount('#app')
