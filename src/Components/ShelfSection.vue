<script setup>
// Dashboard er section card: icon + title, daan dike prev/next arrow, niche horizontal scroll row.
//   title / icon (svg path) / filled  -> header
//   empty                             -> true hole #empty slot dekhay
//   scrollable=false + #controls      -> nijer pager (jemon Top authors er 1/2)
import { ref, computed, onMounted, onUpdated, onBeforeUnmount } from 'vue'

defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  filled: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  scrollable: { type: Boolean, default: true },
})

const track = ref(null)
const canPrev = ref(false)
const canNext = ref(false)

function update() {
  const el = track.value
  if (!el) { canPrev.value = false; canNext.value = false; return }
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
function scroll(dir) {
  const el = track.value
  if (!el) return
  el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
}

// Scroll kora jay emon side e halka fade, jate bujha jay aro content ache
const maskStyle = computed(() => {
  const left = canPrev.value ? 'transparent 0, #000 2rem' : '#000 0'
  const right = canNext.value ? '#000 calc(100% - 2rem), transparent 100%' : '#000 100%'
  const g = `linear-gradient(to right, ${left}, ${right})`
  return { WebkitMaskImage: g, maskImage: g }
})

let ro
onMounted(() => {
  update()
  if ('ResizeObserver' in window && track.value) {
    ro = new ResizeObserver(update)
    ro.observe(track.value)
  }
})
onUpdated(update)
onBeforeUnmount(() => ro?.disconnect())

const arrowCls =
  'flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40'
</script>

<template>
  <section class="reveal rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 font-display text-base font-bold text-brand">
        <svg v-if="icon" class="h-[18px] w-[18px]" viewBox="0 0 24 24" :fill="filled ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="icon" /></svg>
        {{ title }}
      </h2>

      <slot name="controls">
        <div v-if="scrollable && !empty" class="flex items-center gap-1.5">
          <button type="button" :class="arrowCls" :disabled="!canPrev" aria-label="Scroll left" @click="scroll(-1)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" :class="arrowCls" :disabled="!canNext" aria-label="Scroll right" @click="scroll(1)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </slot>
    </div>

    <div v-if="scrollable" v-show="!empty" ref="track" class="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1" :style="maskStyle" @scroll.passive="update">
      <slot />
    </div>
    <div v-else><slot /></div>

    <slot v-if="empty" name="empty" />
  </section>
</template>