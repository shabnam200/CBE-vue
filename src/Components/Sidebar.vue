<script setup>
import Link from '@/Components/Link.vue'
import ApplicationLogo from './ApplicationLogo.vue'

defineProps({
  currentRoute: {
    type: String,
    default: 'Home'
  }
})

const nav = [
  ['Home', '/dashboard'],
  ['My Books', '/my-books'],
  ['Wishlist', '/wishlist'],
  ['Requests', '/requests'],
  ['Messages', '/messages'],
  ['Notifications', '/notifications'],
  ['Profile', '/profile']
]
</script>

<template>
  <aside class="hidden w-56 shrink-0 md:block">
    <div class="sticky top-0 h-screen flex flex-col border-r border-black/5 bg-white p-4">
      <Link href="/" class="flex items-center gap-2 px-3 py-2 font-display text-base font-bold text-ink whitespace-nowrap">
        <ApplicationLogo class="h-6 w-6 text-brand shrink-0" /> <span class="text-sm font-semibold">Book Haven</span>
      </Link>
      <nav class="mt-6 space-y-1 text-sm flex-1">
        <Link 
          v-for="[t, h] in nav" 
          :key="t" 
          :href="h" 
          class="block rounded-lg px-3 py-2 hover:bg-brand-soft transition-colors" 
          :class="t === currentRoute ? 'bg-brand-soft font-medium text-brand' : ''"
        >
          {{ t }}
        </Link>
      </nav>
    </div>
  </aside>
</template>