<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/Layouts/AppLayout.vue'
import Toast from '@/Components/Toast.vue'
import { app } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import { timeAgo } from '@/utils/format'
import { metaOf, linkOf } from '@/utils/notify'

const router = useRouter()
const { toast, say } = useToast()

// Notification er data global store (app) theke ashe, tai Header er badge er sathe sob somoy sync thake
const notes = computed(() => app.notes)
const loading = computed(() => !app.state.loaded)
const filter = ref('all')
const search = ref('')
const filters = ref({ module: '' })
const filterDefs = [{ key: 'module', label: 'All modules', options: ['Wishlist', 'Requests', 'Messages', 'Profile'].map((m) => ({ value: m, label: m })) }]

const unread = computed(() => app.unreadNotes.value)
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return notes.value.filter((n) =>
    (filter.value === 'all' || !n.is_read) &&
    (!filters.value.module || metaOf(n).module === filters.value.module) &&
    (!q || n.message.toLowerCase().includes(q)))
})

onMounted(() => { if (!app.state.loaded) app.refresh() })

async function open(n) {
  app.read(n)
  router.push(linkOf(n)) // click korle oi module er page e chole jay
}
async function readAll() {
  if (!unread.value) return
  try { await app.readAll(); say('All notifications marked as read.') } catch { say('Could not update notifications.') }
}
async function remove(n) {
  try { await app.remove(n) } catch { say('Could not delete the notification.') }
}
</script>

<template>
  <AppLayout
    current="Notifications"
    title="Notifications"
    subtitle="Wishlist alerts, request updates, messages and ratings."
    v-model:search="search"
    search-placeholder="Search notifications"
    :filters="filterDefs"
    v-model:filter-values="filters"
  >
    <template #actions>
      <button type="button" :disabled="!unread" class="rounded-xl border border-black/10 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="readAll">Mark all as read</button>
    </template>

    <section class="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div class="inline-flex rounded-xl bg-paper p-1 text-sm">
        <button type="button" class="rounded-lg px-4 py-1.5 transition-all" :class="filter === 'all' ? 'bg-white font-medium text-brand shadow-sm' : 'text-neutral-600 hover:text-brand'" @click="filter = 'all'">All ({{ notes.length }})</button>
        <button type="button" class="rounded-lg px-4 py-1.5 transition-all" :class="filter === 'unread' ? 'bg-white font-medium text-brand shadow-sm' : 'text-neutral-600 hover:text-brand'" @click="filter = 'unread'">Unread ({{ unread }})</button>
      </div>

      <div v-if="loading" class="mt-5 space-y-3">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 rounded-xl border border-black/5 p-4"><div class="skeleton h-10 w-10 rounded-full"></div><div class="flex-1 space-y-2"><div class="skeleton h-3 w-2/3 rounded"></div><div class="skeleton h-3 w-16 rounded"></div></div></div>
      </div>

      <p v-else-if="!visible.length" class="animate-fade-up py-14 text-center text-sm text-neutral-500">{{ filter === 'unread' ? 'You are all caught up. 🎉' : 'Nothing here yet.' }}</p>

      <TransitionGroup v-else tag="ul" name="list" class="relative mt-5 space-y-2">
        <li v-for="(n, i) in visible" :key="n.id" class="reveal group flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm" :style="{ '--i': i }" :class="n.is_read ? 'border-black/5 hover:bg-paper' : 'border-brand/15 bg-brand-soft/60 hover:bg-brand-soft'">
          <button type="button" class="flex min-w-0 flex-1 items-center gap-4 text-left" @click="open(n)">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110" :class="metaOf(n).tone">
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="metaOf(n).icon" /></svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{{ metaOf(n).module }}</span>
              <span class="block text-sm" :class="n.is_read ? 'text-neutral-600' : 'font-medium text-ink'">{{ n.message }}</span>
              <span class="mt-0.5 block text-xs text-neutral-400">{{ timeAgo(n.created_at) }}</span>
            </span>
            <span v-if="!n.is_read" class="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread"></span>
            <svg class="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button type="button" class="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label="Delete notification" @click="remove(n)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          </button>
        </li>
      </TransitionGroup>
    </section>

    <template #overlay><Toast :message="toast" /></template>
  </AppLayout>
</template>
