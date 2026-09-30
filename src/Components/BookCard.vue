<script setup>
// Dashboard er boi card: hover lift, badge, photo count, heart (quick wishlist)
import BookCover from './BookCover.vue'
defineProps({ book: { type: Object, required: true }, wished: { type: Boolean, default: false }, index: { type: Number, default: 0 }, sub: { type: String, default: '' } })
defineEmits(['open', 'wish'])
const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }
</script>
<template>
  <div class="reveal group relative text-left" :style="{ '--i': index }">
    <button type="button" class="block w-full text-left" @click="$emit('open', book)">
      <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg">
        <div class="h-full w-full transition-transform duration-500 group-hover:scale-105"><BookCover :book="book" /></div>
        <span class="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand shadow-sm">{{ badge[book.availability_type] }}</span>
        <span v-if="book.images?.length > 1" class="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-ink/70 px-1.5 py-0.5 text-[9px] font-medium text-white"><svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>{{ book.images.length }}</span>
      </div>
      <p class="mt-1.5 truncate text-xs font-medium">{{ book.title }}</p>
      <p class="truncate text-[10px] text-neutral-500">{{ sub || book.author }}</p>
    </button>
    <button type="button" :aria-label="wished ? 'Remove from wishlist' : 'Save to wishlist'" class="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" :class="wished ? 'sm:opacity-100' : ''" @click.stop="$emit('wish', book)">
      <svg :key="wished" class="h-4 w-4 animate-pop" :class="wished ? 'text-brand' : 'text-neutral-500'" viewBox="0 0 24 24" :fill="wished ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
    </button>
  </div>
</template>
