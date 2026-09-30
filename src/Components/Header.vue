<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import ApplicationLogo from './ApplicationLogo.vue'
import Avatar from './Avatar.vue'
import { auth } from '@/stores/auth'
import { app } from '@/stores/app'
import { me as mockMe } from '@/data/mock'
import { metaOf, linkOf } from '@/utils/notify'
import { timeAgo } from '@/utils/format'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  search: { type: String, default: '' },
  searchPlaceholder: { type: String, default: '' },
  filters: { type: Array, default: () => [] },
  filterValues: { type: Object, default: () => ({}) },
  showNearMe: { type: Boolean, default: false },
  nearMe: { type: Boolean, default: false },
})
const emit = defineEmits(['update:search', 'update:filterValues', 'update:nearMe'])

const router = useRouter()
const user = computed(() => ({ ...mockMe, email: '', ...(auth.user || {}) }))
const latest = computed(() => app.notes.slice(0, 6))
const hasFilterRow = computed(() => props.filters.length > 0 || props.showNearMe)

const menu = ref(null)
const toggle = (m) => (menu.value = menu.value === m ? null : m)

const setFilter = (key, value) => emit('update:filterValues', { ...props.filterValues, [key]: value })
const clearFilters = () => {
  emit('update:filterValues', Object.fromEntries(props.filters.map((f) => [f.key, ''])))
  if (props.nearMe) emit('update:nearMe', false)
  if (props.search) emit('update:search', '')
}

async function openNote(n) {
  menu.value = null
  app.read(n)
  router.push(linkOf(n))
}
async function readAll() { try { await app.readAll() } catch {} }

const onKey = (e) => { if (e.key === 'Escape') menu.value = null }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
    <!-- Main Header Bar -->
    <div class="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
      
      <!-- Left: Title & Subtitle -->
      <div class="min-w-0">
        <h1 class="truncate font-display text-base md:text-lg font-bold text-ink leading-tight">{{ title }}</h1>
        <p v-if="subtitle" class="hidden truncate text-xs text-neutral-500 sm:block">{{ subtitle }}</p>
      </div>

      <!-- Center: Clean Search Bar -->
      <div v-if="searchPlaceholder" class="hidden md:flex flex-1 max-w-md mx-4">
        <div class="relative w-full">
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            :value="search"
            type="search"
            :placeholder="searchPlaceholder"
            class="w-full rounded-xl border border-black/10 bg-neutral-50/60 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
            @input="emit('update:search', $event.target.value)"
          />
        </div>
      </div>

      <!-- Right Actions: Notifications & Profile -->
      <div class="flex items-center gap-3">
        <!-- Notification Bell -->
        <div class="relative">
          <button type="button" class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-brand" @click="toggle('bell')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span v-if="app.unreadNotes.value" class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">{{ app.unreadNotes.value }}</span>
          </button>

          <!-- Notification Dropdown -->
          <Transition name="drop">
            <div v-if="menu === 'bell'" class="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div class="flex items-center justify-between border-b border-black/5 px-4 py-3">
                <p class="text-sm font-semibold">Notifications</p>
                <button type="button" @click="readAll" class="text-xs font-medium text-brand hover:underline">Mark all read</button>
              </div>
              <div class="max-h-72 overflow-y-auto p-2">
                <p v-if="!latest.length" class="py-6 text-center text-xs text-neutral-500">No new notifications.</p>
                <button v-for="n in latest" :key="n.id" @click="openNote(n)" class="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-neutral-50">
                  <span class="mt-0.5 text-xs font-medium text-neutral-800">{{ n.message }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Profile Menu -->
        <div class="relative">
          <button type="button" class="flex items-center gap-2 rounded-xl border border-black/10 py-1 pl-1 pr-2 bg-white transition-colors hover:bg-neutral-50" @click="toggle('profile')">
            <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-7 w-7 text-xs" />
            <span class="hidden text-xs font-medium text-neutral-700 sm:block">{{ user.name }}</span>
            <svg class="h-3 w-3 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>

          <Transition name="drop">
            <div v-if="menu === 'profile'" class="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl p-1 text-sm">
              <router-link to="/profile" class="block rounded-lg px-3 py-2 hover:bg-brand-soft" @click="menu = null">Profile & Settings</router-link>
              <router-link to="/my-books" class="block rounded-lg px-3 py-2 hover:bg-brand-soft" @click="menu = null">My Books</router-link>
              <router-link to="/logout" class="block rounded-lg px-3 py-2 text-rose-600 hover:bg-rose-50" @click="menu = null">Log out</router-link>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Mobile Search Bar (Row) -->
    <div v-if="searchPlaceholder" class="px-4 pb-3 md:hidden">
      <input
        :value="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white"
        @input="emit('update:search', $event.target.value)"
      />
    </div>

<!-- Filter Row: Organized & Clean Spacing -->
    <div v-if="hasFilterRow" class="flex flex-wrap items-center gap-2 border-t border-black/5 bg-neutral-50/50 px-4 py-2.5 md:px-6">
      <div v-for="f in filters" :key="f.key" class="relative">
        <select
          :value="filterValues[f.key] || ''"
          class="w-full appearance-none rounded-xl border border-black/10 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-neutral-700 outline-none transition-colors hover:border-brand/40 focus:border-brand cursor-pointer"
          @change="setFilter(f.key, $event.target.value)"
        >
          <option value="">{{ f.label }}</option>
          <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>

      <label v-if="showNearMe" class="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-brand/40">
        <input :checked="nearMe" type="checkbox" class="peer sr-only" @change="emit('update:nearMe', $event.target.checked)" />
        <span class="relative h-4 w-7 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-3"></span>
        Near me
      </label>

      <button v-if="Object.values(filterValues).some(Boolean) || nearMe || search" type="button" class="ml-auto text-xs font-medium text-brand hover:underline" @click="clearFilters">
        Clear filters
      </button>
    </div>
  </header>
</template>