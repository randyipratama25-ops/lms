<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GraduationCap, Eye, EyeOff, ShieldCheck, LockKeyhole } from '@lucide/vue'
import { useAuth } from '../lib/auth'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const { login, busy } = useAuth()
const router = useRouter()
const route = useRoute()

async function submitLogin() {
  errorMessage.value = ''
  try {
    await login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login belum berhasil. Silakan coba kembali.'
  }
}
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
    <div class="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl"></div>
    <section class="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 md:grid-cols-2">
      <div class="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-10 text-white md:flex">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><GraduationCap :size="27" /></div>
          <div><p class="font-extrabold">LMS Sekolah</p><p class="mt-0.5 text-[10px] tracking-[.18em] text-indigo-100">SEKOLAH / MADRASAH</p></div>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-[.18em] text-indigo-200">Satu ruang untuk belajar</p>
          <h1 class="mt-4 text-4xl font-extrabold leading-tight tracking-tight">Belajar lebih teratur, berkolaborasi lebih mudah.</h1>
          <p class="mt-5 max-w-sm text-sm leading-6 text-indigo-100">Akses aktivitas pembelajaran sekolah melalui satu portal yang aman dan mudah digunakan.</p>
        </div>
        <div class="flex items-center gap-2 text-xs text-indigo-100"><ShieldCheck :size="16" /> Akses menggunakan akun sekolah</div>
      </div>
      <div class="p-6 sm:p-10 lg:p-12">
        <div class="mb-8 flex items-center gap-3 md:hidden">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><GraduationCap :size="24" /></div>
          <div><p class="font-extrabold text-slate-900">LMS Sekolah</p><p class="text-[10px] tracking-wide text-slate-400">SEKOLAH / MADRASAH</p></div>
        </div>
        <p class="text-xs font-bold uppercase tracking-[.15em] text-indigo-600">Selamat datang kembali</p>
        <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Masuk ke akun Anda</h2>
        <p class="mt-3 text-sm leading-6 text-slate-500">Gunakan username dan password yang diberikan oleh administrator sekolah.</p>

        <form class="mt-8 space-y-5" @submit.prevent="submitLogin">
          <div>
            <label for="username" class="mb-2 block text-xs font-bold text-slate-700">Username</label>
            <input id="username" v-model.trim="username" name="username" autocomplete="username" required minlength="3" maxlength="64" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" placeholder="Masukkan username" />
          </div>
          <div>
            <label for="password" class="mb-2 block text-xs font-bold text-slate-700">Password</label>
            <div class="relative">
              <input id="password" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required maxlength="128" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" placeholder="Masukkan password" />
              <button type="button" class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-700" :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button>
            </div>
          </div>
          <div v-if="errorMessage" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">{{ errorMessage }}</div>
          <button type="submit" :disabled="busy" class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"><LockKeyhole :size="16" /> {{ busy ? 'Memeriksa akun…' : 'Masuk' }}</button>
        </form>
        <p class="mt-6 text-center text-[11px] leading-5 text-slate-400">Jangan gunakan perangkat umum untuk menyimpan sesi login. Jika lupa password, hubungi administrator sekolah.</p>
      </div>
    </section>
  </main>
</template>
