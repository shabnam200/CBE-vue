<script setup>
import { computed } from 'vue'
import Link from '@/Components/Link.vue'
import ApplicationLogo from './ApplicationLogo.vue'
import { auth } from '@/stores/auth'

defineProps({ currentRoute: { type: String, default: 'Home' } })

const base = [
  ['Home', '/dashboard', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['My Books', '/my-books', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5'],
  ['Wishlist', '/wishlist', 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  ['Requests', '/requests', 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3'],
  ['Messages', '/messages', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  ['Notifications', '/notifications', 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0'],
  ['Profile', '/profile', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
]
const admin = ['Admin', '/admin', 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3Z']
const nav = computed(() => (auth.isAdmin.value ? [...base, admin] : base))
const logoutIcon = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'
</script>

<template>
  <aside class="hidden w-64 shrink-0 md:block">
    <div class="sticky top-0 flex h-screen flex-col border-r border-black/5 bg-white p-4">
      <Link href="/" class="flex items-center gap-2 whitespace-nowrap px-3 py-2 font-display text-base font-bold text-ink">
        <ApplicationLogo class="h-6 w-6 shrink-0 text-brand" /> <span class="text-sm font-semibold">Book Haven</span>
      </Link>
      <nav class="mt-4 flex-1 space-y-1 text-sm">
        <Link
          v-for="[t, h, d] in nav"
          :key="t"
          :href="h"
          class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-brand-soft"
          :class="t === currentRoute ? 'bg-brand-soft font-medium text-brand' : ''"
        >
          <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="d" /></svg>
          {{ t }}
        </Link>
      </nav>
      <Link href="/logout" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-brand-soft hover:text-brand">
        <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="logoutIcon" /></svg>
        Log out
      </Link>
    </div>
  </aside>

  <nav class="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-black/5 bg-white/95 backdrop-blur md:hidden" aria-label="Main">
    <Link
      v-for="[t, h, d] in nav"
      :key="t"
      :href="h"
      class="flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium"
      :class="t === currentRoute ? 'text-brand' : 'text-neutral-500'"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="d" /></svg>
      {{ t }}
    </Link>
  </nav>
</template>