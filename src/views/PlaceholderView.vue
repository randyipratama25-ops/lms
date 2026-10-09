<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Construction, ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const title = computed(() => String(route.meta.title || 'Modul'))
const description = computed(() => String(route.meta.description || 'Modul ini akan dikembangkan pada tahap berikutnya.'))
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Construction :size="26" /></div>
    <p class="mt-6 text-[11px] font-bold uppercase tracking-[.15em] text-indigo-500">Dalam roadmap pengembangan</p>
    <h2 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{{ title }}</h2>
    <p class="mt-3 max-w-xl text-sm leading-6 text-slate-500">{{ description }}</p>
    <div class="mt-7 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">Halaman ini sengaja dibuat sebagai placeholder pada Tahap 1. Belum ada data nyata, API, atau operasi CRUD pada modul ini.</div>
    <RouterLink to="/" class="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"><ArrowLeft :size="15" /> Kembali ke dashboard</RouterLink>
  </section>
</template>
