<script setup>
// resources/js/Components/BookCover.vue
import { computed, ref, watch } from 'vue'

const props = defineProps({
  book: { type: Object, default: null },
  small: { type: Boolean, default: false }, // card e true: choto cached thumbnail use kore
})

const palette = [['#8B3F4E', '#F6ECEE'], ['#2F4F4F', '#E6EFEA'], ['#1F2A44', '#E4E9F5'], ['#B07D3A', '#FBF1DE'], ['#4A3B5C', '#EDE8F3']]

const c = computed(() => {
  const n = Number(props.book?.id)
  return palette[Number.isFinite(n) ? Math.abs(n) % palette.length : 0]
})

// full image url (upstream logic: http hole oi-ta, na hole /storage/ prefix)
const resolvedImageUrl = computed(() => {
  const img = props.book?.image_url || props.book?.image
  if (!img) return null
  if (img.startsWith('http')) return img
  return `/storage/${img}`
})

const failed = ref(false)   // thumb + full dui-ta-i fail korle true -> generated cover
const useFull = ref(false)  // thumb fail korle full image e fallback

// small card e thumb_url (choto, fast); na thakle ba fail korle full image
const src = computed(() => {
  if (props.small && !useFull.value && props.book?.thumb_url) return props.book.thumb_url
  return resolvedImageUrl.value
})

function onErr() {
  if (props.small && !useFull.value && props.book?.thumb_url && resolvedImageUrl.value) {
    useFull.value = true // thumb load hoyni -> full image try koro
  } else {
    failed.value = true // ar kichu nai -> generated cover dekhao
  }
}

watch(() => props.book?.id, () => { failed.value = false; useFull.value = false })
watch(() => [props.book?.image_url, props.book?.image, props.book?.thumb_url], () => {
  failed.value = false
  useFull.value = false
})
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="book?.title || 'Book Cover'"
    loading="lazy"
    decoding="async"
    class="h-full w-full rounded-md object-cover"
    @error="onErr"
  />
  <div v-else-if="book" class="flex h-full w-full flex-col justify-between rounded-md p-3 shadow-sm" :style="{ background: c[0], color: c[1] }">
    <span class="font-display text-sm font-semibold leading-tight">{{ book.title }}</span>
    <span class="text-[10px] opacity-80">{{ book.author }}</span>
  </div>
</template>