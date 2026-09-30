<script setup>
// resources/js/Components/BookCover.vue
import { computed, ref, watch } from 'vue'

const props = defineProps({ book: { type: Object, default: null } })

const palette = [['#8B3F4E', '#F6ECEE'], ['#2F4F4F', '#E6EFEA'], ['#1F2A44', '#E4E9F5'], ['#B07D3A', '#FBF1DE'], ['#4A3B5C', '#EDE8F3']]

const c = computed(() => {
  const n = Number(props.book?.id)
  return palette[Number.isFinite(n) ? Math.abs(n) % palette.length : 0]
})

const resolvedImageUrl = computed(() => {
  const img = props.book?.image_url || props.book?.image
  if (!img) return null
  if (img.startsWith('http')) return img
  return `/storage/${img}`
})

const failed = ref(false)

watch(() => props.book?.id, () => (failed.value = false))
watch(() => props.book?.image_url || props.book?.image, () => (failed.value = false))
</script>

<template>
  <img 
    v-if="resolvedImageUrl && !failed" 
    :src="resolvedImageUrl" 
    :alt="book?.title || 'Book Cover'" 
    loading="lazy" 
    class="h-full w-full rounded-md object-cover" 
    @error="failed = true" 
  />
  <div v-else-if="book" class="flex h-full w-full flex-col justify-between rounded-md p-3 shadow-sm" :style="{ background: c[0], color: c[1] }">
    <span class="font-display text-sm font-semibold leading-tight">{{ book.title }}</span>
    <span class="text-[10px] opacity-80">{{ book.author }}</span>
  </div>
</template>