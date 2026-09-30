<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/Components/Sidebar.vue'
import Header from '@/Components/Header.vue'
import Toast from '@/Components/Toast.vue'
import { getAllNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/api/modules'
import { useToast } from '@/composables/useToast'
import { timeAgo } from '@/utils/format'
import { CONDITIONS, AVAILABILITY } from '@/bookApi'
import { categories } from '@/data/mock'

const router = useRouter()
const { toast, say } = useToast()

const notes = ref([])
const loading = ref(true)
const filter = ref('all')

const search = ref('')
const genre = ref('')
const condition = ref('')
const availability = ref('')
const nearMe = ref(false)
const bellOpen = ref(false)
const me = ref({ name: '' })

const meta = {
  wishlist: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', 'bg-brand-soft text-brand'],
  request: ['M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3', 'bg-amber-50 text-amber-700'],
  accepted: ['M20 6L9 17l-5-5', 'bg-emerald-50 text-emerald-700'],
  rejected: ['M18 6L6 18M6 6l12 12', 'bg-rose-50 text-rose-700'],
  review: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', 'bg-amber-50 text-[#B07D3A]'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'bg-sky-50 text-sky-700'],
  system: ['M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z', 'bg-neutral-100 text-neutral-600'],
}
const iconOf = (t) => meta[t] || meta.system

const unread = computed(() => notes.value.filter((n) => !n.is_read).length)
const visible = computed(() => (filter.value === 'unread' ? notes.value.filter((n) => !n.is_read) : notes.value))

onMounted(async () => {
  try {
    notes.value = (await getAllNotifications()).data
  } catch {
    say('Could not load notifications.')
  } finally {
    loading.value = false
  }
})

async function open(n) {
  if (!n.is_read) {
    n.is_read = true
    try { await markNotificationRead(n.id) } catch { n.is_read = false }
  }
  if (n.link) router.push(n.link)
}

async function readAll() {
  if (!unread.value) return
  try {
    await markAllNotificationsRead()
    notes.value = notes.value.map((n) => ({ ...n, is_read: true }))
    say('All notifications marked as read.')
  } catch {
    say('Could not update notifications.')
  }
}

async function remove(n) {
  try {
    await deleteNotification(n.id)
    notes.value = notes.value.filter((x) => x.id !== n.id)
  } catch {
    say('Could not delete the notification.')
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[#FDFBF7] font-sans text-ink">
    <Sidebar currentRoute="Notifications" />

    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
      <Header 
        v-model:search="search"
        v-model:genre="genre"
        v-model:condition="condition"
        v-model:availability="availability"
        v-model:nearMe="nearMe"
        :categories="categories"
        :CONDITIONS="CONDITIONS"
        :AVAILABILITY="AVAILABILITY"
        :unread="unread"
        :notes="notes"
        :bellOpen="bellOpen"
        :me="me"
        @toggle-bell="bellOpen = !bellOpen"
      />

      <main class="flex-1 flex flex-col gap-4 p-5 pb-24 md:pb-6">
        <div class="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div>
            <h1 class="font-display text-xl font-semibold text-brand">Notifications</h1>
            <p class="mt-0.5 text-xs text-neutral-500">Wishlist alerts, request updates and ratings.</p>
          </div>
          <button type="button" :disabled="!unread" class="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="readAll">Mark all as read</button>
        </div>

        <section class="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div class="inline-flex rounded-xl bg-paper p-1 text-sm">
            <button type="button" class="rounded-lg px-4 py-1.5 transition-colors" :class="filter === 'all' ? 'bg-white font-medium text-brand shadow-sm' : 'text-neutral-600 hover:text-brand'" @click="filter = 'all'">All ({{ notes.length }})</button>
            <button type="button" class="rounded-lg px-4 py-1.5 transition-colors" :class="filter === 'unread' ? 'bg-white font-medium text-brand shadow-sm' : 'text-neutral-600 hover:text-brand'" @click="filter = 'unread'">Unread ({{ unread }})</button>
          </div>

          <div v-if="loading" class="mt-5 animate-pulse space-y-3">
            <div v-for="i in 4" :key="i" class="flex items-center gap-4 rounded-xl border border-black/5 p-4"><div class="h-10 w-10 rounded-full bg-neutral-200"></div><div class="flex-1 space-y-2"><div class="h-3 w-2/3 rounded bg-neutral-200"></div><div class="h-3 w-16 rounded bg-neutral-100"></div></div></div>
          </div>

          <p v-else-if="!visible.length" class="py-14 text-center text-sm text-neutral-500">{{ filter === 'unread' ? 'You are all caught up.' : 'Nothing new yet.' }}</p>

          <ul v-else class="mt-5 space-y-2">
            <li v-for="n in visible" :key="n.id" class="group flex items-center gap-3 rounded-xl border p-3 transition-colors" :class="n.is_read ? 'border-black/5 hover:bg-paper' : 'border-brand/15 bg-brand-soft/60 hover:bg-brand-soft'">
              <button type="button" class="flex min-w-0 flex-1 items-center gap-4 text-left" @click="open(n)">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="iconOf(n.type)[1]">
                  <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="iconOf(n.type)[0]" /></svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm" :class="n.is_read ? 'text-neutral-600' : 'font-medium text-ink'">{{ n.message }}</span>
                  <span class="mt-0.5 block text-xs text-neutral-400">{{ timeAgo(n.created_at) }}</span>
                </span>
                <span v-if="!n.is_read" class="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread"></span>
              </button>
              <button type="button" class="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label="Delete notification" @click="remove(n)">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
              </button>
            </li>
          </ul>
        </section>
      </main>
    </div>

    <Toast :message="toast" />
  </div>
</template>