<script setup>
// Simple pages (Profile ityadi) er jonno wrapper: AppLayout er upor e.
import AppLayout from '@/Layouts/AppLayout.vue'
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  current: { type: String, default: '' },
})
</script>
<template>
  <AppLayout :current="current || title" :title="title" :subtitle="subtitle">
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    <slot />
  </AppLayout>
</template>
