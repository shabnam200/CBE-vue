<script setup>
// resources/js/Pages/Admin/Dashboard.vue
import Head from '@/Components/Head.vue'
import { useRouter } from 'vue-router'
import { auth } from '@/stores/auth'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ApplicationLogo from '../../Components/ApplicationLogo.vue'
import { adminApi, USE_MOCK } from '../../adminApi'

/* ---------- Who is looking at this page? (no login/logout here on purpose) ---------- */
const router = useRouter()
const me = computed(() => auth.user ?? (USE_MOCK ? { name: 'Admin', email: 'admin@example.com', role: 'admin' } : null))
const isAdmin = computed(() => USE_MOCK || me.value?.role === 'admin')
const goHome = () => router.push('/')

/* ---------- Helpers ---------- */
const OLD_BOOK_DAYS = 365
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const label = (s) => cap(String(s ?? '').replace(/_/g, ' ')) // 'like_new' -> 'Like new'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date')
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function timeAgo(d) {
  if (!d) return { text: 'Unknown', old: false }
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days >= OLD_BOOK_DAYS) return { text: `${(days / 365).toFixed(1)} years ago`, old: true }
  if (days >= 30) return { text: `${Math.floor(days / 30)} months ago`, old: false }
  if (days <= 0) return { text: 'Today', old: false }
  return { text: plural(days, 'day') + ' ago', old: false }
}

// 401/403 from the real API means "not an admin" -> back to the landing page
function fail(target, e) {
  if (!USE_MOCK && (e.status === 401 || e.status === 403)) return goHome()
  target.error = e.message || 'Something went wrong.'
}

/* ---------- Tabs ---------- */
const tabs = [
  { key: 'overview', label: 'Overview', icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z' },
  { key: 'books', label: 'Books', icon: 'M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm3 12a1 1 0 0 0-1 1 1 1 0 0 0 1 1h8V7a1 1 0 0 0-1-1H7v10.17c.3-.11.65-.17 1-.17Z' },
  { key: 'users', label: 'Members', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.3 0-6 1.8-6 4v3h12v-3c0-2.2-2.7-4-6-4Zm8 0c-.4 0-.8 0-1.2.1 1.4.9 2.2 2.1 2.2 3.9v3h4v-3c0-2-2.2-4-5-4Z' },
]
const tab = ref('overview')
const opened = reactive({ overview: false, books: false, users: false })

function openTab(key) {
  tab.value = key
  history.replaceState(null, '', '#' + key)
  if (!opened[key]) {
    opened[key] = true
    if (key === 'overview') loadOverview()
    if (key === 'books') loadBooks(1)
    if (key === 'users') loadUsers(1)
  }
}

/* ---------- Overview ---------- */
const overview = reactive({ stats: null, books: [], users: [], loading: false, error: '' })

async function loadOverview() {
  overview.loading = true
  overview.error = ''
  try {
    const [stats, b, u] = await Promise.all([adminApi.getStats(), adminApi.getBooks(1), adminApi.getUsers({ page: 1 })])
    overview.stats = stats
    overview.books = b.data.slice(0, 5)
    overview.users = u.data.slice(0, 5)
  } catch (e) { fail(overview, e) } finally { overview.loading = false }
}
const completionRate = computed(() => {
  const s = overview.stats
  return s && s.exchange_requests ? Math.round((s.completed_exchanges / s.exchange_requests) * 100) : 0
})
const statCells = computed(() => {
  const s = overview.stats
  if (!s) return []
  return [
    { label: 'Members', value: s.users },
    { label: 'Books listed', value: s.books },
    { label: 'Exchange requests', value: s.exchange_requests },
  ]
})

/* ---------- Books ---------- */
const books = reactive({ rows: [], meta: null, page: 1, oldOnly: false, summary: 'All listings on the exchange.', loading: false, error: '' })

async function loadBooks(p = 1) {
  books.loading = true
  books.error = ''
  try {
    if (books.oldOnly) {
      // the old-book filter needs every page
      let all = [], pg = 1, last = 1
      do {
        const r = await adminApi.getBooks(pg)
        all = all.concat(r.data)
        last = r.last_page || 1
        pg++
      } while (pg <= last && pg <= 50)
      const old = all.filter((b) => timeAgo(b.created_at).old)
      books.rows = old
      books.meta = null
      books.summary = `${old.length} of ${all.length} books were listed over a year ago.`
    } else {
      const r = await adminApi.getBooks(p)
      books.rows = r.data
      books.meta = r
      books.page = r.current_page
      books.summary = `${r.total} books on the exchange.`
    }
  } catch (e) { fail(books, e) } finally { books.loading = false }
}
watch(() => books.oldOnly, () => loadBooks(1))

async function removeBook(b) {
  const ok = await ask({
    title: 'Delete this book?',
    text: `"${b.title}" will be removed from the exchange, along with any exchange requests for it.`,
    yes: 'Delete book', danger: true,
  })
  if (!ok) return
  try {
    await adminApi.deleteBook(b.id)
    notify('Book deleted')
    opened.overview = false
    loadBooks(books.page)
  } catch (e) { notify(e.message, 'err') }
}

/* ---------- Users ---------- */
const users = reactive({ rows: [], meta: null, page: 1, q: '', summary: 'Review reports and manage accounts.', loading: false, error: '' })

async function loadUsers(p = 1) {
  users.loading = true
  users.error = ''
  try {
    const r = await adminApi.getUsers({ page: p, q: users.q })
    users.rows = r.data
    users.meta = r
    users.page = r.current_page
    users.summary = users.q ? `${plural(r.total, 'member')} match "${users.q}".` : `${plural(r.total, 'member')}. Review reports and manage accounts.`
  } catch (e) { fail(users, e) } finally { users.loading = false }
}
let searchTimer
watch(() => users.q, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadUsers(1), 350) })
onBeforeUnmount(() => clearTimeout(searchTimer))

const statusTone = { approved: 'bg-brand-soft text-brand', active: 'bg-brand-soft text-brand', rejected: 'bg-amber-100 text-amber-800', suspended: 'bg-red-100 text-red-700' }

async function changeStatus(u, status) {
  const ok = await ask({
    title: `${status === 'approved' ? 'Approve' : 'Reject'} ${u.name}?`,
    text: `This member will be marked as ${status}.`,
    yes: status === 'approved' ? 'Approve member' : 'Reject member',
    danger: status !== 'approved',
  })
  if (!ok) return
  try {
    await adminApi.setUserStatus(u.id, status)
    notify(`${u.name} marked as ${status}`)
    loadUsers(users.page)
  } catch (e) { notify(e.message, 'err') }
}

async function removeUser(u) {
  const ok = await ask({
    title: `Delete ${u.name}?`,
    text: 'The account is removed for good, together with their books, requests and messages. This cannot be undone.',
    yes: 'Delete member', danger: true,
  })
  if (!ok) return
  try {
    await adminApi.deleteUser(u.id)
    notify('Member deleted')
    opened.overview = false
    loadUsers(users.page)
  } catch (e) { notify(e.message, 'err') }
}

/* ---------- Reports modal ---------- */
const reportsFor = ref(null)

/* ---------- Confirm dialog ---------- */
const dialog = reactive({ open: false, title: '', text: '', yes: '', danger: false })
let dialogResolve = null
function ask(opts) {
  Object.assign(dialog, { open: true, danger: false, ...opts })
  return new Promise((resolve) => { dialogResolve = resolve })
}
function answer(v) {
  dialog.open = false
  dialogResolve?.(v)
  dialogResolve = null
}

/* ---------- Toasts ---------- */
const toasts = ref([])
let toastId = 0
function notify(message, type = 'ok') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id) }, 4500)
}

/* ---------- Esc closes modals ---------- */
function onKey(e) {
  if (e.key !== 'Escape') return
  if (dialog.open) answer(false)
  else reportsFor.value = null
}

onMounted(() => {
  if (!isAdmin.value) return goHome()
  window.addEventListener('keydown', onKey)
  const fromHash = location.hash.replace('#', '')
  openTab(tabs.some((t) => t.key === fromHash) ? fromHash : 'overview')
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Head title="Admin dashboard - Book Haven" />

  <div v-if="isAdmin" class="min-h-screen bg-neutral-50 font-sans text-ink lg:flex">

    <!-- Sidebar (desktop) -->
    <aside class="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div class="flex items-center gap-2 px-6 py-6 font-display text-lg font-semibold tracking-tight">
        <ApplicationLogo class="h-7 w-7 text-brand" /> Book Haven
      </div>
      <p class="px-6 text-xs text-neutral-500">Admin dashboard</p>

      <nav class="mt-4 flex flex-1 flex-col gap-1 px-3" aria-label="Sections">
        <button v-for="t in tabs" :key="t.key" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors" :class="tab === t.key ? 'bg-brand-soft text-brand' : 'text-neutral-700 hover:bg-neutral-100'" :aria-current="tab === t.key ? 'page' : undefined" @click="openTab(t.key)">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path :d="t.icon" /></svg>{{ t.label }}
        </button>
      </nav>

      <div class="flex items-center gap-3 border-t border-black/5 px-6 py-4">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{{ initials(me?.name) }}</div>
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold">{{ me?.name }}</div>
          <div class="truncate text-xs text-neutral-500">{{ me?.email }}</div>
        </div>
      </div>
    </aside>

    <!-- Mobile header + tabs -->
    <div class="lg:hidden">
      <div class="flex items-center gap-2 border-b border-black/5 bg-white px-5 py-4 font-display text-lg font-semibold tracking-tight">
        <ApplicationLogo class="h-6 w-6 text-brand" /> Book Haven
        <span class="ml-auto text-xs font-normal text-neutral-500">Admin</span>
      </div>
      <nav class="flex gap-1 overflow-x-auto border-b border-black/5 bg-white p-2" aria-label="Sections">
        <button v-for="t in tabs" :key="t.key" class="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium" :class="tab === t.key ? 'bg-brand-soft text-brand' : 'text-neutral-700'" @click="openTab(t.key)">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path :d="t.icon" /></svg>{{ t.label }}
        </button>
      </nav>
    </div>

    <main class="min-w-0 max-w-6xl flex-1 px-4 py-6 sm:px-8 lg:py-8">

      <p v-if="USE_MOCK" class="mb-5 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Showing dummy data. Changes reset when you reload.</p>

      <!-- ================= OVERVIEW ================= -->
      <section v-show="tab === 'overview'" :class="tab === 'overview' ? 'animate-fade-up' : ''">
        <h1 class="font-display text-3xl font-semibold tracking-tight">Overview</h1>
        <p class="mt-1 text-sm text-neutral-500">How the community is doing right now.</p>

        <div class="mt-6 rounded-xl border border-black/5 bg-white transition-shadow hover:shadow-md">
          <p v-if="overview.loading" class="p-5 text-sm text-neutral-500">Loading numbers…</p>
          <p v-else-if="overview.error" class="p-5 text-sm text-red-700">{{ overview.error }} <button class="ml-2 font-semibold underline" @click="loadOverview">Try again</button></p>
          <div v-else-if="overview.stats" class="grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-black/5">
            <div v-for="(c, i) in statCells" :key="c.label" class="p-5" :class="i === 2 ? 'border-t border-black/5 lg:border-t-0' : ''">
              <div class="text-sm text-neutral-500">{{ c.label }}</div>
              <div class="mt-1 font-display text-4xl font-semibold">{{ c.value.toLocaleString() }}</div>
            </div>
            <div class="border-t border-black/5 p-5 lg:border-t-0">
              <div class="text-sm text-neutral-500">Completed exchanges</div>
              <div class="mt-1 font-display text-4xl font-semibold">{{ overview.stats.completed_exchanges.toLocaleString() }}</div>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" role="img" :aria-label="`${completionRate}% of requests completed`">
                <div class="h-full bg-brand" :style="{ width: completionRate + '%' }"></div>
              </div>
              <div class="mt-1 text-xs text-neutral-500">{{ completionRate }}% of all requests</div>
            </div>
          </div>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          <div class="rounded-xl border border-black/5 bg-white">
            <div class="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <h2 class="font-display text-lg font-semibold">Newest books</h2>
              <button class="text-sm font-medium text-brand hover:underline" @click="openTab('books')">See all books</button>
            </div>
            <ul class="divide-y divide-black/5">
              <li v-for="b in overview.books" :key="b.id" class="flex items-center gap-3 px-5 py-3">
                <img v-if="b.image_url" :src="b.image_url" alt="" class="h-12 w-9 shrink-0 rounded border border-black/5 object-cover" />
                <div v-else class="flex h-12 w-9 shrink-0 items-center justify-center rounded border border-black/5 bg-brand-soft font-display font-semibold text-brand">{{ b.title[0] }}</div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">{{ b.title }}</div>
                  <div class="truncate text-xs text-neutral-500">{{ b.author }} - listed by {{ b.owner?.name || 'unknown' }}</div>
                </div>
                <div class="shrink-0 text-xs text-neutral-500">{{ timeAgo(b.created_at).text }}</div>
              </li>
              <li v-if="!overview.loading && !overview.books.length" class="px-5 py-8 text-center text-sm text-neutral-500">No books have been listed yet.</li>
            </ul>
          </div>

          <div class="rounded-xl border border-black/5 bg-white">
            <div class="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <h2 class="font-display text-lg font-semibold">Newest members</h2>
              <button class="text-sm font-medium text-brand hover:underline" @click="openTab('users')">See all members</button>
            </div>
            <ul class="divide-y divide-black/5">
              <li v-for="u in overview.users" :key="u.id" class="flex items-center gap-3 px-5 py-3">
                <img v-if="u.profile_photo_url" :src="u.profile_photo_url" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
                <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{{ initials(u.name) }}</div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium">{{ u.name }}</div>
                  <div class="truncate text-xs text-neutral-500">{{ u.email }}</div>
                </div>
                <span v-if="u.reports?.length" class="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">{{ plural(u.reports.length, 'report') }}</span>
              </li>
              <li v-if="!overview.loading && !overview.users.length" class="px-5 py-8 text-center text-sm text-neutral-500">No members yet.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ================= BOOKS ================= -->
      <section v-show="tab === 'books'" :class="tab === 'books' ? 'animate-fade-up' : ''">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="font-display text-3xl font-semibold tracking-tight">Books</h1>
            <p class="mt-1 text-sm text-neutral-500">{{ books.summary }}</p>
          </div>
          <label class="inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-black/10 bg-white py-2 pl-3 pr-4 text-sm">
            <input v-model="books.oldOnly" type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand" />
            Only books listed over a year ago
          </label>
        </div>

        <div class="mt-5 overflow-hidden rounded-xl border border-black/5 bg-white">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-sm">
              <thead class="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th class="px-4 py-3 font-medium">Book</th>
                  <th class="px-4 py-3 font-medium">Details</th>
                  <th class="px-4 py-3 font-medium">Owner</th>
                  <th class="px-4 py-3 font-medium">Listed</th>
                  <th class="px-4 py-3"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black/5">
                <tr v-if="books.loading"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">Loading books…</td></tr>
                <tr v-else-if="books.error"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">{{ books.error }}<br /><button class="mt-3 rounded-lg border border-black/10 px-3 py-1.5 font-medium text-ink hover:bg-neutral-50" @click="loadBooks(books.page)">Try again</button></td></tr>
                <tr v-else-if="!books.rows.length"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">{{ books.oldOnly ? 'No books are older than a year.' : 'No books have been listed yet.' }}</td></tr>
                <template v-else>
                <tr v-for="b in books.rows" :key="b.id">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <img v-if="b.image_url" :src="b.image_url" alt="" class="h-14 w-10 shrink-0 rounded border border-black/5 object-cover" />
                      <div v-else class="flex h-14 w-10 shrink-0 items-center justify-center rounded border border-black/5 bg-brand-soft font-display font-semibold text-brand">{{ b.title[0] }}</div>
                      <div class="min-w-0">
                        <div class="font-medium">{{ b.title }}</div>
                        <div class="text-xs text-neutral-500">{{ b.author }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1.5">
                      <span v-if="b.genre" class="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium">{{ b.genre }}</span>
                      <span v-if="b.condition" class="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium">{{ label(b.condition) }}</span>
                      <span v-if="b.availability_type" class="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{{ label(b.availability_type) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium">{{ b.owner?.name || 'Unknown' }}</div>
                    <div class="text-xs text-neutral-500">{{ b.owner?.email }}</div>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3">
                    <div :class="timeAgo(b.created_at).old ? 'font-medium text-amber-700' : ''">{{ timeAgo(b.created_at).text }}</div>
                    <div class="text-xs text-neutral-500">{{ fmtDate(b.created_at) }}</div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" @click="removeBook(b)">Delete</button>
                  </td>
                </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-if="books.meta && books.meta.total" class="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 text-sm">
            <span class="text-neutral-500">Showing {{ books.meta.from }}-{{ books.meta.to }} of {{ books.meta.total }}</span>
            <div class="flex items-center gap-2">
              <button class="rounded-lg border border-black/10 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40" :disabled="books.meta.current_page <= 1" @click="loadBooks(books.meta.current_page - 1)">Previous</button>
              <span class="px-1 text-neutral-500">Page {{ books.meta.current_page }} of {{ books.meta.last_page }}</span>
              <button class="rounded-lg border border-black/10 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40" :disabled="books.meta.current_page >= books.meta.last_page" @click="loadBooks(books.meta.current_page + 1)">Next</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= MEMBERS ================= -->
      <section v-show="tab === 'users'" :class="tab === 'users' ? 'animate-fade-up' : ''">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="font-display text-3xl font-semibold tracking-tight">Members</h1>
            <p class="mt-1 text-sm text-neutral-500">{{ users.summary }}</p>
          </div>
          <div class="relative w-full sm:w-72">
            <label for="userSearch" class="sr-only">Search members</label>
            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" stroke-linecap="round" /></svg>
            <input id="userSearch" v-model="users.q" type="search" placeholder="Search by name or email" class="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand focus:ring-brand" />
          </div>
        </div>

        <div class="mt-5 overflow-hidden rounded-xl border border-black/5 bg-white">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-sm">
              <thead class="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th class="px-4 py-3 font-medium">Member</th>
                  <th class="px-4 py-3 font-medium">City</th>
                  <th class="px-4 py-3 font-medium">Reputation</th>
                  <th class="px-4 py-3 font-medium">Reports</th>
                  <th class="px-4 py-3"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black/5">
                <tr v-if="users.loading"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">Loading members…</td></tr>
                <tr v-else-if="users.error"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">{{ users.error }}<br /><button class="mt-3 rounded-lg border border-black/10 px-3 py-1.5 font-medium text-ink hover:bg-neutral-50" @click="loadUsers(users.page)">Try again</button></td></tr>
                <tr v-else-if="!users.rows.length"><td colspan="5" class="px-4 py-10 text-center text-neutral-500">{{ users.q ? 'No members match that search.' : 'No members yet.' }}</td></tr>
                <template v-else>
                <tr v-for="u in users.rows" :key="u.id">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <img v-if="u.profile_photo_url" :src="u.profile_photo_url" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
                      <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{{ initials(u.name) }}</div>
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2 font-medium">
                          {{ u.name }}
                          <span v-if="u.role === 'admin'" class="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">Admin</span>
                          <span v-if="u.status" class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusTone[u.status] || 'bg-neutral-100'">{{ cap(u.status) }}</span>
                        </div>
                        <div class="text-xs text-neutral-500">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">{{ u.city || '-' }}</td>
                  <td class="px-4 py-3">{{ u.reputation_score != null ? Number(u.reputation_score).toFixed(1) : '-' }}</td>
                  <td class="px-4 py-3">
                    <button v-if="u.reports?.length" class="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:underline" @click="reportsFor = u">{{ plural(u.reports.length, 'report') }}</button>
                    <span v-else class="text-neutral-500">None</span>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="u.role !== 'admin'" class="flex justify-end gap-1.5">
                      <button class="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark" @click="changeStatus(u, 'approved')">Approve</button>
                      <button class="rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:brightness-95" @click="changeStatus(u, 'rejected')">Reject</button>
                      <button class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" @click="removeUser(u)">Delete</button>
                    </div>
                  </td>
                </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-if="users.meta && users.meta.total" class="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 text-sm">
            <span class="text-neutral-500">Showing {{ users.meta.from }}-{{ users.meta.to }} of {{ users.meta.total }}</span>
            <div class="flex items-center gap-2">
              <button class="rounded-lg border border-black/10 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40" :disabled="users.meta.current_page <= 1" @click="loadUsers(users.meta.current_page - 1)">Previous</button>
              <span class="px-1 text-neutral-500">Page {{ users.meta.current_page }} of {{ users.meta.last_page }}</span>
              <button class="rounded-lg border border-black/10 px-3 py-1.5 font-medium hover:bg-neutral-50 disabled:opacity-40" :disabled="users.meta.current_page >= users.meta.last_page" @click="loadUsers(users.meta.current_page + 1)">Next</button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Reports modal -->
    <div v-if="reportsFor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" @click.self="reportsFor = null">
      <div class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div class="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div>
            <h3 class="font-display text-xl font-semibold">Reports about {{ reportsFor.name }}</h3>
            <p class="mt-0.5 text-sm text-neutral-500">{{ reportsFor.email }} - {{ plural(reportsFor.reports.length, 'report') }}</p>
          </div>
          <button class="px-1 text-2xl leading-none text-neutral-500 hover:text-ink" aria-label="Close" @click="reportsFor = null">&times;</button>
        </div>
        <div class="space-y-3 overflow-y-auto p-5">
          <div v-for="(r, i) in reportsFor.reports" :key="r.id ?? i" class="rounded-lg border border-black/10 p-4">
            <div class="flex items-center justify-between text-xs text-neutral-500">
              <span class="font-medium text-red-700">Report {{ i + 1 }}</span>
              <span>{{ fmtDate(r.created_at) }}</span>
            </div>
            <p class="mt-2 whitespace-pre-wrap text-sm">{{ r.reason || r.message || 'No reason given.' }}</p>
            <p v-if="r.user_id" class="mt-2 text-xs text-neutral-500">Reported by member #{{ r.user_id }}</p>
          </div>
        </div>
        <div class="border-t border-black/5 px-5 py-3 text-right">
          <button class="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50" @click="reportsFor = null">Close</button>
        </div>
      </div>
    </div>

    <!-- Confirm dialog -->
    <div v-if="dialog.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4" role="alertdialog" aria-modal="true">
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 class="font-display text-xl font-semibold">{{ dialog.title }}</h3>
        <p class="mt-2 text-sm text-neutral-500">{{ dialog.text }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50" @click="answer(false)">Cancel</button>
          <button class="rounded-lg px-4 py-2 text-sm font-medium text-white" :class="dialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'" @click="answer(true)">{{ dialog.yes }}</button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="fixed bottom-4 right-4 z-[70] flex flex-col gap-2" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" class="max-w-xs rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg" :class="t.type === 'ok' ? 'bg-brand' : 'bg-red-600'">{{ t.message }}</div>
    </div>
  </div>
</template>