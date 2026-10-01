<script setup>
// Boi er ekadhik chobi: bro main image + niche thumbnail. Ekta chobi thakle sudhu cover.
import { ref, computed, watch } from 'vue'
import BookCover from './BookCover.vue'
const props = defineProps({ book: { type: Object, required: true } })
const idx = ref(0)
const images = computed(() => (props.book.images?.length ? props.book.images : props.book.image_url ? [props.book.image_url] : []))
watch(() => props.book?.id, () => (idx.value = 0))
watch(images, (l) => { if (idx.value >= l.length) idx.value = 0 })
const step = (d) => (idx.value = (idx.value + d + images.value.length) % images.value.length)
</script>
<template>
  <div>
    <div class="group relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm">
      <template v-if="images.length">
        <Transition name="fade" mode="out-in">
          <img :key="images[idx]" :src="images[idx]" :alt="book.title" class="h-full w-full object-cover" />
        </Transition>
        <template v-if="images.length > 1">
          <button type="button" :aria-label="`Previous photo, showing ${idx + 1} of ${images.length}`" class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white/95 p-2 shadow-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" @click="step(-1)"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
          <button type="button" :aria-label="`Next photo, showing ${idx + 1} of ${images.length}`" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white/95 p-2 shadow-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" @click="step(1)"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button>
          <span class="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">{{ idx + 1 }} / {{ images.length }}</span>
        </template>
      </template>
      <BookCover v-else :book="book" />
    </div>
    <div v-if="images.length === 1" class="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
      <span>Owner photos</span>
      <span>1 photo</span>
    </div>
    <div v-else-if="images.length > 1" class="mt-3">
      <div class="mb-1.5 flex items-center justify-between text-[11px]">
        <span class="font-semibold text-neutral-700">Owner photos</span>
        <span class="text-neutral-500">{{ idx + 1 }} of {{ images.length }}</span>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        <button v-for="(src, i) in images" :key="src" type="button" class="h-16 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-opacity" :class="i === idx ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'" :aria-label="`Show owner photo ${i + 1} of ${images.length}`" :aria-pressed="i === idx" @click="idx = i">
          <img :src="src" alt="" class="h-full w-full object-cover" />
        </button>
      </div>
    </div>
  </div>
</template>
