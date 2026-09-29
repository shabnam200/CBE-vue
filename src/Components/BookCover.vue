<script setup>
// image_url থাকলে সেটা; না থাকলে (বা image load fail করলে) title থেকে generated cover
import { computed, ref, watch } from 'vue'
const props = defineProps({ book: { type: Object, default: null } })
const palette = [['#8B3F4E', '#F6ECEE'], ['#2F4F4F', '#E6EFEA'], ['#1F2A44', '#E4E9F5'], ['#B07D3A', '#FBF1DE'], ['#4A3B5C', '#EDE8F3']]
const c = computed(() => {
  const n = Number(props.book?.id)
  return palette[Number.isFinite(n) ? Math.abs(n) % palette.length : 0]
})
const failed = ref(false)
watch(() => props.book?.image_url, () => (failed.value = false))
</script>
<template>
  <img v-if="book?.image_url && !failed" :src="book.image_url" :alt="book.title" loading="lazy" class="h-full w-full rounded-md object-cover" @error="failed = true" />
  <div v-else-if="book" class="flex h-full w-full flex-col justify-between rounded-md p-3 shadow-sm" :style="{ background: c[0], color: c[1] }">
    <span class="font-display text-sm font-semibold leading-tight">{{ book.title }}</span>
    <span class="text-[10px] opacity-80">{{ book.author }}</span>
  </div>
</template>git 