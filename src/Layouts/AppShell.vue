<script setup>
// Sidebar + page header wrapper. Notun module page gulo ei layout e bosano hoyeche,
// jate theme (bg-paper, brand color, rounded cards) sob page e ek thake.
import Head from '@/Components/Head.vue'
import Sidebar from '@/Components/Sidebar.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  current: { type: String, default: '' }, // sidebar e kon item active (na dile title)
})
</script>

<template>
  <Head :title="`${title} - Book Haven`" />
  <div class="flex min-h-screen bg-paper font-sans text-ink">
    <Sidebar :current-route="current || title" />
    <main class="flex min-w-0 flex-1 flex-col gap-5 p-4 pb-24 md:p-6 md:pb-6">
      <header class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-5">
        <div class="min-w-0">
          <h1 class="font-display text-2xl font-semibold text-brand">{{ title }}</h1>
          <p v-if="subtitle" class="mt-0.5 text-sm text-neutral-500">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-3"><slot name="actions" /></div>
      </header>
      <slot />
    </main>
  </div>
</template>
