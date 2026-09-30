<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Head from '@/Components/Head.vue'
import Link from '@/Components/Link.vue'
import BookCover from '../Components/BookCover.vue'
import Sidebar from '../Components/Sidebar.vue'
import Header from '../Components/Header.vue' // N tu Header import
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
    elRef.value.scrollBy({ left: direction * 250, behavior: 'smooth' })
  }
}

async function toggleBell() {
  bellOpen.value = !bellOpen.value
  if (!bellOpen.value && unread.value) {
    try { await markNotificationsRead() } catch { /* ignore */ }
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
    const full = await getBook(b.id)
    if (selected.value?.id === b.id) selected.value = { ...b, ...full }
  } catch {}
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
  <div class="flex h-screen overflow-hidden bg-[#FDFBF7] font-sans text-ink">
    <!-- Sidebar -->
    <Sidebar currentRoute="Home" />

    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
      <!-- Reusable Header Component (Now available across all pages when you use <Header> there too) -->
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
        @toggle-bell="toggleBell"
      />

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col gap-4 p-5 pb-24 md:pb-6">
        
        <!-- Search Results View -->
        <section v-if="filtering" class="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-display text-sm font-semibold text-brand">
              Search results <span class="ml-2 text-xs font-normal text-neutral-500">{{ list.total }} found</span>
            </h2>
            <button type="button" class="text-xs font-medium text-brand underline underline-offset-4 hover:text-brand-dark" @click="clearFilters">Clear filters</button>
          </div>
          <div v-if="loading" class="mt-3 grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <div v-for="i in 6" :key="i"><div class="aspect-[3/4] rounded-lg bg-neutral-200"></div><div class="mt-2 h-3 w-20 rounded bg-neutral-200"></div></div>
          </div>
          <p v-else-if="!list.data.length" class="py-6 text-center text-xs text-neutral-500">No books match your search.</p>
          <div v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <button v-for="b in list.data" :key="b.id" type="button" class="group text-left" @click="open(b)">
              <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm transition-transform group-hover:-translate-y-1">
                <BookCover :book="b" />
                <span class="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
              </div>
              <p class="mt-1 truncate text-xs font-medium">{{ b.title }}</p>
              <p class="truncate text-[10px] text-neutral-500">{{ b.author }}</p>
            </button>
          </div>
        </section>

        <!-- Hero Section (3 Rows neatly arranged) -->
        <template v-else>
          <!-- Row 1: Top Authors -->
          <section class="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-sm font-bold text-brand">Top authors</h2>
              <div v-if="totalAuthorPages > 1" class="flex items-center gap-2 text-[11px] text-neutral-400">
                <span>{{ authorPage }} / {{ totalAuthorPages }}</span>
                <button :disabled="authorPage === 1" @click="authorPage--" class="hover:text-brand disabled:opacity-40">Prev</button>
                <button :disabled="authorPage === totalAuthorPages" @click="authorPage++" class="hover:text-brand disabled:opacity-40">Next</button>
              </div>
            </div>
            <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
              <button v-for="author in paginatedAuthors" :key="author.name" type="button" class="group flex flex-col items-center text-center focus:outline-none" @click="openAuthor(author)">
                <div class="w-10 h-10 mx-auto rounded-full overflow-hidden bg-brand-soft border border-black/5 flex items-center justify-center font-semibold text-xs text-brand group-hover:border-brand shadow-sm">
                  <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="w-full h-full object-cover pointer-events-none" />
                  <span v-else>{{ initials(author.name) }}</span>
                </div>
                <span class="mt-1 text-[10px] truncate w-full text-neutral-700 group-hover:text-brand">{{ author.name }}</span>
              </button>
            </div>
          </section>

          <!-- Row 2: Top Books -->
          <section class="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-sm font-bold text-brand">Top Books</h2>
              <div class="flex items-center gap-2 text-[11px] text-neutral-400">
                <button @click="scrollContainer(topBooksRef, -1)" class="hover:text-brand">Prev</button>
                <button @click="scrollContainer(topBooksRef, 1)" class="hover:text-brand">Next</button>
              </div>
            </div>
            <div ref="topBooksRef" class="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button v-for="b in topBooks" :key="b.id" class="w-28 sm:w-32 shrink-0 text-left group" @click="open(b)">
                <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm transition-transform group-hover:-translate-y-1">
                  <BookCover :book="b" />
                  <span class="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
                </div>
                <p class="mt-1 truncate text-xs font-medium">{{ b.title }}</p>
                <p class="truncate text-[10px] text-neutral-500">{{ b.author || b.genre }}</p>
              </button>
              <p v-if="!topLoading && !topBooks.length" class="py-2 text-xs text-neutral-500">No top books yet.</p>
            </div>
          </section>

          <!-- Row 3: Recommended for you -->
          <section class="rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-sm font-bold text-brand">Recommended for you</h2>
              <div class="flex items-center gap-2 text-[11px] text-neutral-400">
                <button @click="scrollContainer(recommendedRef, -1)" class="hover:text-brand">Prev</button>
                <button @click="scrollContainer(recommendedRef, 1)" class="hover:text-brand">Next</button>
              </div>
            </div>
            <div ref="recommendedRef" class="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button v-for="b in matches" :key="b.id" class="w-28 sm:w-32 shrink-0 text-left group" @click="open(b)">
                <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm transition-transform group-hover:-translate-y-1">
                  <BookCover :book="b" />
                  <span class="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
                </div>
                <p class="mt-1 truncate text-xs font-medium">{{ b.title }}</p>
                <p class="truncate text-[10px] text-neutral-500">{{ b.author }}</p>
              </button>
              <p v-if="!matchesLoading && !matches.length" class="py-2 text-xs text-neutral-500">No recommendations yet.</p>
            </div>
          </section>
        </template>
      </main>
    </div>

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
              <button v-for="b in selectedAuthor.bestselling" :key="b.id" class="text-left p-2 rounded-xl border hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                <div class="aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100 mb-1"><BookCover :book="b" /></div>
                <p class="text-xs font-medium truncate">{{ b.title }}</p>
              </button>
            </div>
          </div>

          <div v-if="selectedAuthor.otherBooks?.length > 0">
            <h4 class="text-sm font-semibold text-brand mb-2">Other Books</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button v-for="b in selectedAuthor.otherBooks" :key="b.id" class="text-left p-2 rounded-xl border hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                <div class="aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100 mb-1"><BookCover :book="b" /></div>
                <p class="text-xs font-medium truncate">{{ b.title }}</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Book pop-up modal -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="selected = null">
      <div role="dialog" aria-modal="true" aria-labelledby="book-title" class="grid max-h-[90vh] w-full max-w-2xl gap-6 overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 sm:grid-cols-[180px_1fr]">
        <div class="mx-auto aspect-[3/4] w-40 sm:w-56"><BookCover :book="selected" /></div>
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
            <button :disabled="sending" class="flex-1 rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60" @click="send">{{ sending ? 'Sending…' : action[selected.availability_type] }}</button>
            <button class="rounded-xl border px-4 text-sm hover:bg-brand-soft" :class="wished.has(selected.id) ? 'border-brand text-brand' : ''" @click="wish(selected)">{{ wished.has(selected.id) ? 'Saved' : 'Save to wishlist' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" role="status" class="fixed bottom-20 left-1/2 md:bottom-6 -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm text-white shadow-lg">{{ toast }}</div>
  </div>
</template>