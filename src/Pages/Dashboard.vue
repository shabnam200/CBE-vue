<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Head from '@/Components/Head.vue'
import Link from '@/Components/Link.vue'
import BookCover from '../Components/BookCover.vue'
import Sidebar from '../Components/Sidebar.vue'
import { getMe, sendExchangeRequest, toggleWishlist, getNotifications, markNotificationsRead } from '../api'
import { getBooks, getTopBooks, getBook, getMatches, CONDITIONS, AVAILABILITY } from '../bookApi'
import { categories, authors } from '../data/mock'

const me = ref({ name: '' })
const topBooks = ref([])
const topLoading = ref(true)
const matches = ref([])
const matchesLoading = ref(true)
const condition = ref('')
const availability = ref('')
const list = ref({ data: [], current_page: 1, last_page: 1, total: 0 })
const search = ref('')
const requestedGenre = new URLSearchParams(window.location.search).get('genre')
const genre = ref(categories.includes(requestedGenre) ? requestedGenre : '')
const loading = ref(true)
const selected = ref(null)
const selectedAuthor = ref(null)
const message = ref('')
const sending = ref(false)
const wished = ref(new Set())
const toast = ref('')
const nearMe = ref(false)
const notes = ref([])
const bellOpen = ref(false)
const unread = computed(() => notes.value.filter((n) => !n.is_read).length)
const tabs = [['Home', '/dashboard'], ['Wishlist', '/wishlist'], ['Requests', '/requests'], ['Messages', '/messages'], ['Profile', '/profile']]

const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const authorPage = ref(1)
const authorsPerPage = 8
const paginatedAuthors = computed(() => {
  const start = (authorPage.value - 1) * authorsPerPage
  return authors.slice(start, start + authorsPerPage)
})
const totalAuthorPages = computed(() => Math.ceil(authors.length / authorsPerPage))

const filtering = computed(() => Boolean(search.value || genre.value || condition.value || availability.value || nearMe.value))
function clearFilters() { search.value = ''; genre.value = ''; condition.value = ''; availability.value = ''; nearMe.value = false }

const topBooksRef = ref(null)
const recommendedRef = ref(null)

const scrollContainer = (elRef, direction) => {
  if (elRef.value) {
    elRef.value.scrollBy({ left: direction * 300, behavior: 'smooth' })
  }
}

async function toggleBell() {
  bellOpen.value = !bellOpen.value
  if (!bellOpen.value && unread.value) {
    try { await markNotificationsRead() } catch { /* ignore, UI still updates */ }
    notes.value = notes.value.map((n) => ({ ...n, is_read: true }))
  }
}

const action = { exchange: 'Request exchange', donate: 'Request this book', lend: 'Request to borrow' }
const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }
const say = (t) => { toast.value = t; setTimeout(() => (toast.value = ''), 2500) }

let reqId = 0
async function load(page = 1) {
  const id = ++reqId
  loading.value = true
  try {
    const res = await getBooks({ search: search.value, genre: genre.value, condition: condition.value, availability_type: availability.value, city: nearMe.value ? me.value.city : '', page, per_page: 12 })
    if (id !== reqId) return
    list.value = res
  } catch {
    if (id === reqId) say('Could not load books. Please try again.')
  } finally {
    if (id === reqId) loading.value = false
  }
}
let timer
watch([search, genre, nearMe, condition, availability], () => { clearTimeout(timer); timer = setTimeout(() => load(1), 300) })
const portalEsc = (e) => {
  if (e.key !== 'Escape') return
  selected.value = null
  selectedAuthor.value = null
  if (bellOpen.value) toggleBell()
}
onBeforeUnmount(() => { window.removeEventListener('keydown', portalEsc); clearTimeout(timer) })
onMounted(async () => {
  window.addEventListener('keydown', portalEsc)
  try { me.value = (await getMe()).data } catch {}
  getNotifications().then((r) => (notes.value = r.data)).catch(() => {})
  getTopBooks().then((r) => (topBooks.value = r)).catch(() => say('Could not load top books.')).finally(() => (topLoading.value = false))
  getMatches().then((r) => (matches.value = r)).catch(() => {}).finally(() => (matchesLoading.value = false))
  load()
})

const open = async (b) => {
  selected.value = b
  message.value = ''
  try {
    const full = await getBook(b.id) // owner info + available copies
    if (selected.value?.id === b.id) selected.value = { ...b, ...full }
  } catch { /* list data is enough to show the popup */ }
}
const openAuthor = (author) => {
  selectedAuthor.value = author
}

async function send() {
  sending.value = true
  try {
    await sendExchangeRequest(selected.value.id, message.value)
    say(`Request sent to ${selected.value.owner?.name || 'the owner'}`)
    selected.value = null
  } catch {
    say('Could not send the request. Please try again.')
  } finally {
    sending.value = false
  }
}
async function wish(b) {
  try { await toggleWishlist(b.id, wished.value.has(b.id)) } catch { return say('Could not update your wishlist.') }
  wished.value.has(b.id) ? wished.value.delete(b.id) : wished.value.add(b.id)
  wished.value = new Set(wished.value)
}
</script>

<template>
  <Head title="Dashboard" />
  <div class="flex min-h-screen bg-paper font-sans text-ink">
    <!-- Reusable Sidebar Component with Home Active -->
    <Sidebar currentRoute="Home" />

    <main class="flex min-w-0 flex-1 flex-col gap-5 p-4 pb-24 md:pb-4">
      <div class="order-first flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-3">
        <input v-model="search" type="search" placeholder="Search by title or author" aria-label="Search books" class="min-w-0 flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <select v-model="genre" aria-label="Genre" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand focus:outline-none">
          <option value="">All genres</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
        <select v-model="condition" aria-label="Condition" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand focus:outline-none">
          <option value="">Any condition</option>
          <option v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <select v-model="availability" aria-label="Availability" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand focus:outline-none">
          <option value="">Exchange / donate / lend</option>
          <option v-for="a in AVAILABILITY" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input v-model="nearMe" type="checkbox" class="peer sr-only" />
          <span class="relative h-5 w-9 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40"></span>
          Near me<span v-if="me.city" class="hidden text-neutral-500 sm:inline">({{ me.city }})</span>
        </label>
        <div class="relative">
          <button class="relative rounded-lg border border-black/10 p-2 hover:bg-brand-soft" aria-label="Notifications" @click="toggleBell">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span v-if="unread" class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{{ unread }}</span>
          </button>
          <div v-if="bellOpen" class="fixed inset-0 z-20" @click="toggleBell"></div>
          <div v-if="bellOpen" class="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
            <p v-if="!notes.length" class="p-3 text-sm text-neutral-500">Nothing new yet.</p>
            <p v-for="n in notes" :key="n.id" class="rounded-lg p-3 text-sm" :class="n.is_read ? 'text-neutral-500' : 'bg-brand-soft'">{{ n.message }}</p>
          </div>
        </div>
        <span class="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand">{{ me.name }}</span>
      </div>

      <!-- Search results / All books -->
      <section class="rounded-2xl border border-black/5 bg-white p-5" :class="filtering ? 'order-first' : 'order-last'">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-display text-lg font-semibold text-brand">
            {{ filtering ? 'Search results' : 'All books' }}
            <span v-if="!loading" class="ml-2 text-sm font-normal text-neutral-500">{{ list.total }} found</span>
          </h2>
          <button v-if="filtering" type="button" class="text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-dark" @click="clearFilters">Clear filters</button>
        </div>
        <div v-if="loading" class="mt-4 grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div v-for="i in 6" :key="i"><div class="aspect-[3/4] rounded-lg bg-neutral-200"></div><div class="mt-2 h-3 w-24 rounded bg-neutral-200"></div></div>
        </div>
        <p v-else-if="!list.data.length" class="py-10 text-center text-sm text-neutral-500">No books match your search. Try clearing a filter.</p>
        <div v-else class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <button v-for="b in list.data" :key="b.id" type="button" class="group text-left" @click="open(b)">
            <div class="relative aspect-[3/4] overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm transition-transform group-hover:-translate-y-1">
              <BookCover :book="b" />
              <span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ b.title }}</p>
            <p class="truncate text-xs text-neutral-500">{{ b.author }}</p>
          </button>
        </div>
        <div v-if="list.last_page > 1" class="mt-5 flex items-center justify-center gap-3 text-sm">
          <button type="button" :disabled="list.current_page <= 1 || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(list.current_page - 1)">Previous</button>
          <span class="text-xs text-neutral-500">Page {{ list.current_page }} of {{ list.last_page }}</span>
          <button type="button" :disabled="list.current_page >= list.last_page || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(list.current_page + 1)">Next</button>
        </div>
      </section>

      <!-- Top Authors Section -->
      <section v-show="!filtering" class="rounded-2xl border border-black/5 bg-white p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-brand">Top authors</h2>
          <div v-if="totalAuthorPages > 1" class="flex items-center gap-2 text-sm">
            <button :disabled="authorPage === 1" @click="authorPage--" class="rounded-md border border-black/10 px-2.5 py-1 disabled:opacity-40 hover:bg-brand-soft">Prev</button>
            <span class="text-xs text-neutral-500">{{ authorPage }} / {{ totalAuthorPages }}</span>
            <button :disabled="authorPage === totalAuthorPages" @click="authorPage++" class="rounded-md border border-black/10 px-2.5 py-1 disabled:opacity-40 hover:bg-brand-soft">Next</button>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-4 text-center">
          <button v-for="author in paginatedAuthors" :key="author.name" type="button" class="group cursor-pointer text-center focus:outline-none" @click="openAuthor(author)">
            <div class="aspect-square w-14 sm:w-16 mx-auto rounded-full overflow-hidden border-2 border-transparent group-hover:border-brand transition-all shadow-sm">
              <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="w-full h-full object-cover pointer-events-none" />
              <div v-else class="flex h-full w-full items-center justify-center bg-brand-soft text-sm font-semibold text-brand">{{ initials(author.name) }}</div>
            </div>
            <p class="mt-2 text-[11px] font-medium text-neutral-700 truncate group-hover:text-brand">{{ author.name }}</p>
          </button>
        </div>
      </section>

      <!-- Top Books Section -->
      <section v-show="!filtering" class="rounded-2xl border border-black/5 bg-white p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-brand">Top Books</h2>
          <div class="flex items-center gap-2 text-sm">
            <button @click="scrollContainer(topBooksRef, -1)" class="rounded-md border border-black/10 px-2.5 py-1 hover:bg-brand-soft">Prev</button>
            <button @click="scrollContainer(topBooksRef, 1)" class="rounded-md border border-black/10 px-2.5 py-1 hover:bg-brand-soft">Next</button>
          </div>
        </div>
        <div ref="topBooksRef" class="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button v-for="b in topBooks" :key="b.id" class="w-36 shrink-0 text-left" @click="open(b)">
            <div class="relative aspect-[3/4] overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm transition-transform hover:-translate-y-1">
              <BookCover :book="b" />
              <span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
            </div>
            <p class="mt-2 truncate text-sm font-medium">{{ b.title }}</p>
            <p class="truncate text-xs text-neutral-500">{{ b.author || b.genre }}</p>
          </button>
          <p v-if="!topLoading && !topBooks.length" class="py-6 text-sm text-neutral-500">No top books yet.</p>
          <template v-if="topLoading">
            <div v-for="i in 6" :key="i" class="w-36 shrink-0 animate-pulse">
              <div class="aspect-[3/4] rounded-md bg-neutral-200"></div>
              <div class="mt-2 h-3 w-24 rounded bg-neutral-200"></div>
              <div class="mt-1.5 h-3 w-16 rounded bg-neutral-100"></div>
            </div>
          </template>
        </div>
      </section>

      <!-- Match suggestions -->
      <section v-show="!filtering" class="rounded-2xl border border-black/5 bg-white p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-brand">Matches for your wishlist</h2>
          <div class="flex items-center gap-2 text-sm">
            <button @click="scrollContainer(recommendedRef, -1)" class="rounded-md border border-black/10 px-2.5 py-1 hover:bg-brand-soft">Prev</button>
            <button @click="scrollContainer(recommendedRef, 1)" class="rounded-md border border-black/10 px-2.5 py-1 hover:bg-brand-soft">Next</button>
          </div>
        </div>
        <div ref="recommendedRef" class="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button v-for="b in matches" :key="b.id" class="w-36 shrink-0 text-left" @click="open(b)">
            <div class="aspect-[3/4] overflow-hidden rounded-lg border border-black/10 shadow-sm transition-transform hover:-translate-y-1"><BookCover :book="b" /></div>
            <p class="mt-2 truncate text-sm font-medium">{{ b.title }}</p>
            <p class="truncate text-xs text-neutral-500">{{ b.author }}</p>
          </button>
          <p v-if="!matchesLoading && !matches.length" class="py-6 text-sm text-neutral-500">No matches yet. Save books to your wishlist and matching books will show up here.</p>
          <template v-if="matchesLoading">
            <div v-for="i in 6" :key="i" class="w-36 shrink-0 animate-pulse">
              <div class="aspect-[3/4] rounded-md bg-neutral-200"></div>
              <div class="mt-2 h-3 w-24 rounded bg-neutral-200"></div>
              <div class="mt-1.5 h-3 w-16 rounded bg-neutral-100"></div>
            </div>
          </template>
        </div>
      </section>
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      <Link v-for="[t, h] in tabs" :key="t" :href="h" class="py-3 text-center text-xs" :class="t === 'Home' ? 'font-semibold text-brand' : 'text-neutral-500'">{{ t }}</Link>
    </nav>

    <!-- Author Details Pop-up Modal -->
    <div v-if="selectedAuthor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="selectedAuthor = null">
      <div role="dialog" aria-modal="true" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between border-b pb-4">
          <div class="flex items-center gap-3">
            <img v-if="selectedAuthor.avatar" :src="selectedAuthor.avatar" :alt="selectedAuthor.name" class="h-12 w-12 rounded-full object-cover border" />
            <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{{ initials(selectedAuthor.name) }}</div>
            <div>
              <h3 class="font-display text-lg font-semibold">{{ selectedAuthor.name }}</h3>
              <p class="text-xs text-neutral-500">Author Profile</p>
            </div>
          </div>
          <button class="text-2xl leading-none text-neutral-400 hover:text-ink" aria-label="Close" @click="selectedAuthor = null">×</button>
        </div>

        <div class="mt-4 space-y-4">
          <div>
            <h4 class="text-sm font-semibold text-brand mb-2">Bestselling Books</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button v-for="b in selectedAuthor.bestselling" :key="b.id" class="text-left p-2 rounded-lg border hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                <div class="aspect-[3/4] overflow-hidden rounded bg-neutral-100 mb-1"><BookCover :book="b" /></div>
                <p class="text-xs font-medium truncate">{{ b.title }}</p>
              </button>
            </div>
          </div>

          <div v-if="selectedAuthor.otherBooks.length > 0">
            <h4 class="text-sm font-semibold text-brand mb-2">Other Books</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button v-for="b in selectedAuthor.otherBooks" :key="b.id" class="text-left p-2 rounded-lg border hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                <div class="aspect-[3/4] overflow-hidden rounded bg-neutral-100 mb-1"><BookCover :book="b" /></div>
                <p class="text-xs font-medium truncate">{{ b.title }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Book pop-up -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="selected = null">
      <div role="dialog" aria-modal="true" aria-labelledby="book-title" class="grid max-h-[90vh] w-full max-w-2xl gap-6 overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 sm:grid-cols-[180px_1fr]">
        <div class="mx-auto aspect-[3/4] w-40 sm:w-full"><BookCover :book="selected" /></div>
        <div>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 id="book-title" class="font-display text-xl font-semibold">{{ selected.title }}</h3>
              <p class="text-sm text-neutral-500">by {{ selected.author }}</p>
            </div>
            <button class="text-2xl leading-none text-neutral-400 hover:text-ink" aria-label="Close" @click="selected = null">×</button>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt class="text-neutral-500">Genre</dt><dd>{{ selected.genre }}</dd>
            <dt class="text-neutral-500">Condition</dt><dd>{{ selected.condition }}</dd>
            <dt class="text-neutral-500">Available for</dt><dd class="capitalize">{{ selected.availability_type }}</dd>
            <dt v-if="selected.available_copies != null" class="text-neutral-500">Copies available</dt><dd v-if="selected.available_copies != null">{{ selected.available_copies }}</dd>
            <dt class="text-neutral-500">Owner</dt><dd>{{ selected.owner ? selected.owner.name : 'N/A' }}, {{ selected.owner ? selected.owner.city : 'N/A' }}</dd>
            <dt class="text-neutral-500">Reputation</dt><dd>★ {{ selected.owner ? selected.owner.reputation_score : '5.0' }}</dd>
          </dl>
          <textarea v-model="message" rows="2" placeholder="Add a note for the owner (optional)" class="mt-4 w-full rounded-lg border border-black/10 p-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
          <div class="mt-3 flex gap-3">
            <button :disabled="sending" class="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60" @click="send">{{ sending ? 'Sending…' : action[selected.availability_type] }}</button>
            <button class="rounded-lg border px-4 text-sm hover:bg-brand-soft" :class="wished.has(selected.id) ? 'border-brand text-brand' : ''" @click="wish(selected)">{{ wished.has(selected.id) ? 'Saved' : 'Save to wishlist' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" role="status" class="fixed bottom-20 left-1/2 md:bottom-6 -translate-x-1/2 rounded-lg bg-ink px-5 py-3 text-sm text-white shadow-lg">{{ toast }}</div>
  </div>
</template>