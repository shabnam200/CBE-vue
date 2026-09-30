<script setup>
// Reusable page header. Prottek page nijer moto customize korte pare:
//   title / subtitle          -> page er naam
//   search-placeholder        -> dile search box dekhay (v-model:search)
//   filters + v-model:filter-values -> dropdown filter (page onujayi alada)
//   show-near-me + v-model:near-me  -> "Near me" toggle
//   <template #actions>       -> page specific button (jemon "Add New Book")
// Notification bell + profile menu shob page e ekoi (global store theke ashe).
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
  filters: { type: Array, default: () => [] }, // [{ key, label, options: [{ value, label }] }]
  filterValues: { type: Object, default: () => ({}) },
  showNearMe: { type: Boolean, default: false },
  nearMe: { type: Boolean, default: false },
})
const emit = defineEmits(['update:search', 'update:filterValues', 'update:nearMe'])

const router = useRouter()
const user = computed(() => ({ ...mockMe, email: '', ...(auth.user || {}) }))
const latest = computed(() => app.notes.slice(0, 6))
const hasFilterRow = computed(() => props.filters.length > 0 || props.showNearMe)
const activeFilters = computed(() => props.filters.filter((f) => props.filterValues[f.key]).length)

const menu = ref(null) // 'bell' | 'profile' | null
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
async function readAll() { try { await app.readAll() } catch { /* ignore */ } }

const onKey = (e) => { if (e.key === 'Escape') menu.value = null }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const selectCls = 'rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
    <!-- Row 1: title | search | actions | bell | profile -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
      <router-link to="/dashboard" class="md:hidden" aria-label="Home"><ApplicationLogo class="h-7 w-7 text-brand" /></router-link>

      <div class="min-w-0 flex-1 basis-40">
        <h1 class="truncate font-display text-lg font-semibold leading-tight text-brand animate-fade-in">{{ title }}</h1>
        <p v-if="subtitle" class="hidden truncate text-xs text-neutral-500 sm:block">{{ subtitle }}</p>
      </div>

      <label v-if="searchPlaceholder" class="group relative order-last w-full sm:order-none sm:w-auto">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input
          :value="search"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="w-full rounded-xl border border-black/10 bg-paper/60 py-2 pl-9 pr-3 text-sm outline-none transition-all duration-300 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15 sm:w-56 sm:focus:w-72"
          @input="emit('update:search', $event.target.value)"
        />
      </label>

      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>

      <div class="flex items-center gap-2">
        <!-- Notification bell -->
        <div class="relative">
          <button type="button" class="group relative rounded-xl border border-black/10 p-2 transition-colors hover:bg-brand-soft" :class="menu === 'bell' ? 'bg-brand-soft' : ''" aria-label="Notifications" :aria-expanded="menu === 'bell'" @click="toggle('bell')">
            <svg class="h-[18px] w-[18px] origin-top text-neutral-700 group-hover:animate-ring" :class="app.unreadNotes.value ? 'animate-ring' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span v-if="app.unreadNotes.value" class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white animate-pop">{{ app.unreadNotes.value > 9 ? '9+' : app.unreadNotes.value }}</span>
          </button>

          <div v-if="menu" class="fixed inset-0 z-30" @click="menu = null"></div>
          <Transition name="drop">
            <div v-if="menu === 'bell'" class="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div class="flex items-center justify-between border-b border-black/5 px-4 py-3">
                <p class="text-sm font-semibold">Notifications <span v-if="app.unreadNotes.value" class="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">{{ app.unreadNotes.value }} new</span></p>
                <button type="button" :disabled="!app.unreadNotes.value" class="text-xs font-medium text-brand hover:underline disabled:opacity-40 disabled:no-underline" @click="readAll">Mark all read</button>
              </div>
              <div class="max-h-80 overflow-y-auto p-1.5">
                <p v-if="!latest.length" class="p-6 text-center text-xs text-neutral-500">Nothing new yet.</p>
                <button v-for="(n, i) in latest" :key="n.id" type="button" class="reveal flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-paper" :class="n.is_read ? '' : 'bg-brand-soft/50'" :style="{ '--i': i }" @click="openNote(n)">
                  <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" :class="metaOf(n).tone">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="metaOf(n).icon" /></svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{{ metaOf(n).module }} · {{ timeAgo(n.created_at) }}</span>
                    <span class="mt-0.5 line-clamp-2 block text-xs" :class="n.is_read ? 'text-neutral-500' : 'font-medium text-ink'">{{ n.message }}</span>
                  </span>
                  <span v-if="!n.is_read" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand"></span>
                </button>
              </div>
              <router-link to="/notifications" class="block border-t border-black/5 py-2.5 text-center text-xs font-semibold text-brand transition-colors hover:bg-brand-soft" @click="menu = null">View all notifications</router-link>
            </div>
          </Transition>
        </div>

        <!-- Profile menu -->
        <div class="relative">
          <button type="button" class="flex items-center gap-2 rounded-xl border border-black/10 py-1 pl-1 pr-2.5 transition-colors hover:bg-brand-soft" :class="menu === 'profile' ? 'bg-brand-soft' : ''" aria-label="Account menu" :aria-expanded="menu === 'profile'" @click="toggle('profile')">
            <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-8 w-8 text-xs" />
            <span class="hidden max-w-[7rem] truncate text-xs font-medium sm:block">{{ user.name }}</span>
            <svg class="hidden h-3 w-3 text-neutral-400 transition-transform sm:block" :class="menu === 'profile' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <Transition name="drop">
            <div v-if="menu === 'profile'" class="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div class="flex items-center gap-3 border-b border-black/5 p-4">
                <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-11 w-11 text-sm" />
                <div class="min-w-0"><p class="truncate text-sm font-semibold">{{ user.name }}</p><p class="truncate text-xs text-neutral-500">{{ user.email || user.city }}</p></div>
              </div>
              <div class="p-1.5 text-sm">
                <router-link to="/profile" class="block rounded-lg px-3 py-2 transition-colors hover:bg-brand-soft" @click="menu = null">My profile &amp; photo</router-link>
                <router-link to="/my-books" class="block rounded-lg px-3 py-2 transition-colors hover:bg-brand-soft" @click="menu = null">My books</router-link>
                <router-link to="/logout" class="block rounded-lg px-3 py-2 text-neutral-600 transition-colors hover:bg-rose-50 hover:text-rose-700" @click="menu = null">Log out</router-link>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Row 2: page specific filters -->
    <Transition name="fade">
      <div v-if="hasFilterRow" class="flex flex-wrap items-center gap-2 border-t border-black/5 bg-paper/50 px-4 py-2 md:px-6">
        <select v-for="f in filters" :key="f.key" :value="filterValues[f.key] || ''" :aria-label="f.label" :class="[selectCls, filterValues[f.key] ? 'border-brand/50 text-brand' : '']" @change="setFilter(f.key, $event.target.value)">
          <option value="">{{ f.label }}</option>
          <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <label v-if="showNearMe" class="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs transition-colors hover:border-brand/40">
          <input :checked="nearMe" type="checkbox" class="peer sr-only" @change="emit('update:nearMe', $event.target.checked)" />
          <span class="relative h-4 w-7 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-3"></span>
          Near me<span v-if="user.city" class="hidden text-neutral-500 sm:inline">({{ user.city }})</span>
        </label>
        <Transition name="fade">
          <button v-if="activeFilters || nearMe" type="button" class="ml-auto text-xs font-medium text-brand underline-offset-4 hover:underline" @click="clearFilters">Clear filters</button>
        </Transition>
      </div>
    </Transition>
  </header>
</template>
