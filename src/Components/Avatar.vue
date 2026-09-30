<script setup>
// User photo thakle photo, na thakle (ba load fail hole) initials
import { ref, watch } from 'vue'
import { initials } from '@/utils/format'
const props = defineProps({ src: { type: String, default: '' }, name: { type: String, default: '' }, size: { type: String, default: 'h-9 w-9 text-xs' } })
const bad = ref(false)
watch(() => props.src, () => (bad.value = false))
</script>
<template>
  <span class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-semibold text-white" :class="size">
    <img v-if="src && !bad" :src="src" :alt="name" class="h-full w-full object-cover" @error="bad = true" />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>
