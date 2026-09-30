<script setup>
import AppLayout from '@/Layouts/AppLayout.vue'
defineProps({ title: { type: String, default: 'Coming soon' } })
</script>
<template>
  <AppLayout :current="title" :title="title">
    <div class="flex flex-1 items-center justify-center">
      <div class="animate-fade-up text-center">
        <p class="text-4xl">🚧</p>
        <h2 class="mt-2 font-display text-2xl font-semibold">{{ title }}</h2>
        <p class="mt-2 text-sm text-neutral-500">This page is coming soon.</p>
      </div>
    </div>
  </AppLayout>
</template>
