<script setup>
import { computed, ref, watch } from 'vue'
import Link from '@/Components/Link.vue'
import ApplicationLogo from './ApplicationLogo.vue'
import { app } from '@/stores/app'
import { useChatUnread } from '@/composables/useChatUnread'

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
const nav = computed(() => base)
const logoutIcon = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'

const chat = useChatUnread()
const badgeOf = (t) => (t === 'Messages' ? chat.count.value : t === 'Notifications' ? app.unreadNotes.value : 0)
const fmt = (n) => (n > 9 ? '9+' : n)

const STORAGE_KEY = 'bookhaven:sidebar-collapsed'
const collapsed = ref(false)
try { collapsed.value = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* ignore */ }
watch(collapsed, (v) => { try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0') } catch { /* ignore */ } })

const itemCls = 'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] transition-all duration-200'
const labelCls = 'min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-200'
const tipCls = 'pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100'
</script>

<template>
  <aside class="relative z-40 hidden shrink-0 transition-[width] duration-300 ease-out md:block" :class="collapsed ? 'w-[4.5rem]' : 'w-64'">
    <div class="sticky top-0 flex h-screen flex-col border-r border-black/5 bg-white px-3 py-4">
      <!-- Collapse / expand button (sidebar er dhar e aro clearly visible kora holo) -->
      <button
        type="button"
        class="absolute -right-3.5 top-7 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-black/15 bg-white text-neutral-700 shadow-md transition-all hover:bg-brand hover:text-white hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <svg class="h-4 w-4 transition-transform duration-300" :class="collapsed ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>

      <!-- Logo -->
      <Link href="/" class="group relative flex items-center gap-3 overflow-hidden rounded-xl px-1.5 py-1" :class="collapsed ? 'justify-center' : ''">
        <ApplicationLogo class="h-9 w-9 shrink-0 text-brand transition-transform duration-300 group-hover:scale-105" />
        <span class="min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200" :class="collapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100'">
          <span class="block font-display text-xl font-bold leading-none text-ink">Book Haven</span>
          <span class="mt-1 block text-[11px] text-neutral-500">More Books. More Worlds.</span>
        </span>
      </Link>

      <!-- Menu -->
      <nav class="mt-6 space-y-1" aria-label="Main">
        <Link
          v-for="([t, h, d], i) in nav"
          :key="t"
          :href="h"
          :class="[itemCls, 'animate-fade-in', t === currentRoute ? 'bg-brand font-medium text-white shadow-md shadow-brand/25' : 'text-neutral-700 hover:bg-brand-soft hover:text-brand']"
          :style="{ animationDelay: i * 40 + 'ms' }"
        >
          <span class="relative shrink-0">
            <svg class="h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="d" /></svg>
            <span v-if="collapsed && badgeOf(t)" class="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white ring-2 ring-white animate-pop">{{ fmt(badgeOf(t)) }}</span>
          </span>
          <span :class="[labelCls, collapsed ? 'opacity-0' : 'opacity-100']">{{ t }}</span>
          <Transition name="fade">
            <span v-if="!collapsed && badgeOf(t)" class="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold animate-pop" :class="t === currentRoute ? 'bg-white text-brand' : 'bg-brand text-white'" :aria-label="`${badgeOf(t)} unread`">{{ fmt(badgeOf(t)) }}</span>
          </Transition>
          <span v-if="collapsed" role="tooltip" :class="tipCls">{{ t }}<template v-if="badgeOf(t)"> · {{ badgeOf(t) }}</template></span>
        </Link>
      </nav>

      <div class="mt-auto">
        <div v-if="!collapsed" class="mb-4 hidden px-3 [@media(min-height:720px)]:block">
          <svg class="h-16 w-20 text-brand" viewBox="0 0 96 72" fill="none" aria-hidden="true">
            <rect x="28" y="52" width="56" height="10" rx="2" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5" />
            <rect x="34" y="41" width="50" height="10" rx="2" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5" />
            <rect x="30" y="30" width="46" height="10" rx="2" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5" />
            <path d="M20 62C20 46 20 32 26 14" stroke="currentColor" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round" />
            <path d="M21 48c-7-1-10-6-10-10 6 0 10 4 10 10z" fill="currentColor" fill-opacity=".25" />
            <path d="M22 38c6-1 9-6 9-10-6 0-9 4-9 10z" fill="currentColor" fill-opacity=".25" />
            <path d="M25 24c-6-1-8-5-8-9 5 0 8 4 8 9z" fill="currentColor" fill-opacity=".25" />
          </svg>
          <p class="mt-2 font-display text-[13px] leading-snug text-brand">Good stories<br />build better days</p>
          <span class="mt-3 block h-px w-8 bg-brand/30"></span>
        </div>

        <div class="mb-2 border-t border-black/5"></div>
        <Link href="/logout" :class="[itemCls, 'text-neutral-600 hover:bg-brand-soft hover:text-brand']">
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="logoutIcon" /></svg>
          <span :class="[labelCls, collapsed ? 'opacity-0' : 'opacity-100']">Log out</span>
          <span v-if="collapsed" role="tooltip" :class="tipCls">Log out</span>
        </Link>
      </div>
    </div>
  </aside>

  <!-- Mobile bottom nav -->
  <nav class="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-black/5 bg-white/95 backdrop-blur md:hidden" aria-label="Main">
    <Link
      v-for="[t, h, d] in nav"
      :key="t"
      :href="h"
      class="relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors"
      :class="t === currentRoute ? 'text-brand' : 'text-neutral-500'"
    >
      <span class="relative">
        <svg class="h-5 w-5 transition-transform duration-200" :class="t === currentRoute ? '-translate-y-0.5 scale-110' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="d" /></svg>
        <span v-if="badgeOf(t)" class="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white animate-pop">{{ fmt(badgeOf(t)) }}</span>
      </span>
      {{ t }}
    </Link>
  </nav>
</template>