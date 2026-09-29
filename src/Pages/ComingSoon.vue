<script setup>
import Head from '@/Components/Head.vue'
import Sidebar from '@/Components/Sidebar.vue'
defineProps({ title: { type: String, default: 'Coming soon' } })
</script>
<template>
  <Head :title="`${title} - Book Haven`" />
  <div class="flex min-h-screen bg-paper text-ink">
    <Sidebar :current-route="title" />
    <main class="flex flex-1 items-center justify-center p-6">
      <div class="text-center">
        <h1 class="font-display text-2xl font-semibold">{{ title }}</h1>
        <p class="mt-2 text-sm text-neutral-500">This page is coming soon.</p>
      </div>
    </main>
  </div>
</template>
