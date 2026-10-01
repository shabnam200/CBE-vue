<script>
// Do'ti root (header + filter row) tai attrs auto-fallthrough off
export default { inheritAttrs: false }
</script>

<script setup>
// Reusable page header. Duita part:
//   1) Sticky top bar: [title (optional)] [search] ........ [actions] [bell] [profile]
//   2) Filter pills row (sticky na, scroll korle chole jay): filters + "Near me" toggle
// Props age jemon chilo temni (AppLayout e kono change lagbe na):
//   title / subtitle, search + search-placeholder, filters + v-model:filter-values, show-near-me + v-model:near-me
//   <template #actions> -> page specific button (jemon "Add New Book")
// title na dile search bar puro jaygata nebe (Dashboard e hero banner title dekhay).
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

const pillCls = 'h-10 appearance-none rounded-full border border-black/10 bg-white pl-4 pr-9 text-sm shadow-sm transition-colors hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'
</script>

<template>
  <div class="sticky top-0 z-40 isolate flex-none bg-white shadow-sm">
    <!-- 1) Top bar -->
    <header class="border-b border-black/5 bg-white/90">
    <div class="flex min-h-[4.25rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:px-6">
      <router-link to="/dashboard" class="md:hidden" aria-label="Home"><ApplicationLogo class="h-8 w-8 text-brand" /></router-link>

      <div v-if="title" class="w-40 min-w-0 shrink-0 sm:mr-2">
        <h1 class="truncate font-display text-lg font-semibold leading-tight text-brand animate-fade-in">{{ title }}</h1>
        <p v-if="subtitle" class="hidden truncate text-xs text-neutral-500 lg:block">{{ subtitle }}</p>
      </div>

      <label v-if="searchPlaceholder" class="group relative min-w-0 flex-1 md:max-w-2xl" :class="title ? 'order-last basis-full sm:order-none sm:basis-0' : ''">
        <svg class="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input
          :value="search"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="h-11 w-full rounded-full border border-black/10 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition-colors placeholder:text-neutral-400 hover:border-brand/30 focus:border-brand focus:ring-2 focus:ring-brand/15"
          @input="emit('update:search', $event.target.value)"
        />
      </label>

      <div class="ml-auto flex items-center gap-2">
        <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>

        <!-- Notification bell -->
        <div class="relative">
          <button type="button" class="group relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:bg-brand-soft" :class="menu === 'bell' ? 'bg-brand-soft' : ''" aria-label="Notifications" :aria-expanded="menu === 'bell'" @click="toggle('bell')">
            <svg class="h-[18px] w-[18px] origin-top text-neutral-700 group-hover:animate-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span v-if="app.unreadNotes.value" class="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white animate-pop"></span>
            <span v-if="app.unreadNotes.value" class="sr-only">{{ app.unreadNotes.value }} unread</span>
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
          <button type="button" class="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white pl-1 pr-3 shadow-sm transition-colors hover:bg-brand-soft" :class="menu === 'profile' ? 'bg-brand-soft' : ''" aria-label="Account menu" :aria-expanded="menu === 'profile'" @click="toggle('profile')">
            <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-8 w-8 text-xs" />
            <span class="hidden max-w-[7rem] truncate text-sm font-medium sm:block">{{ user.name }}</span>
            <svg class="hidden h-3.5 w-3.5 text-neutral-400 transition-transform sm:block" :class="menu === 'profile' ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
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
    </header>

    <!-- 2) Filter pills stay with the sticky bar so content never scrolls behind them. -->
    <div v-if="hasFilterRow" class="filter-row relative z-10 flex min-h-[4.25rem] w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap border-b border-black/5 bg-white px-4 py-3 md:px-6">
      <div v-for="f in filters" :key="f.key" class="relative shrink-0">
        <select :value="filterValues[f.key] || ''" :aria-label="f.label" :class="[pillCls, filterValues[f.key] ? 'border-brand/50 font-medium text-brand' : 'text-neutral-700']" @change="setFilter(f.key, $event.target.value)">
          <option value="">{{ f.label }}</option>
          <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </div>

      <label v-if="showNearMe" class="flex h-10 shrink-0 cursor-pointer select-none items-center gap-2.5 rounded-full border border-black/10 bg-white px-4 text-sm shadow-sm transition-colors hover:border-brand/40" :class="nearMe ? 'border-brand/50 font-medium text-brand' : 'text-neutral-700'" :title="user.city ? `Books in ${user.city}` : ''">
        <input :checked="nearMe" type="checkbox" class="peer sr-only" @change="emit('update:nearMe', $event.target.checked)" />
        <span class="relative h-5 w-9 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30"></span>
        Near me
      </label>

      <button v-if="activeFilters || nearMe" type="button" class="shrink-0 px-2 text-sm font-medium text-brand underline-offset-4 hover:underline" @click="clearFilters">Clear filters</button>
      <div v-if="$slots['filter-actions']" class="flex shrink-0 items-center pl-1">
        <slot name="filter-actions" />
      </div>
      <div v-if="$slots['filter-actions-trailing']" class="ml-auto flex shrink-0 items-center pl-2">
        <slot name="filter-actions-trailing" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-row { animation: filter-row-in .4s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes filter-row-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .filter-row { animation: none; }
}
</style>