<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import Link from '@/Components/Link.vue'
import BookCover from '../Components/BookCover.vue'
import BookCard from '../Components/BookCard.vue'
import Toast from '../Components/Toast.vue'
import BookGallery from '../Components/BookGallery.vue'
import ShelfSection from '../Components/ShelfSection.vue'
import heroImg from '../assets/hero-books.jpg'
import AppLayout from '../Layouts/AppLayout.vue'
import { auth } from '../stores/auth'
import { me as mockMe } from '../data/mock'
import { sendExchangeRequest, toggleWishlist } from '../api'
import { getBooks, getTopBooks, getBook, getMatches, getAuthorProfile, CONDITIONS, AVAILABILITY } from '../bookApi'
import { USE_MOCK } from '../config'
import { categories, authors as mockAuthors } from '../data/mock'

const me = computed(() => ({ ...mockMe, ...(auth.user || {}) }))
const topBooks = ref([])
const topLoading = ref(true)
const matches = ref([])
const matchesLoading = ref(true)
const list = ref({ data: [], current_page: 1, last_page: 1, total: 0 })
const search = ref('')
const requestedGenre = new URLSearchParams(window.location.search).get('genre')
// Header er filter gulo ekta object e (Header v-model:filter-values)
const filters = ref({ genre: categories.includes(requestedGenre) ? requestedGenre : '', condition: '', availability: '' })
const filterDefs = [
  { key: 'genre', label: 'All genres', options: categories.map((c) => ({ value: c, label: c })) },
  { key: 'condition', label: 'Any condition', options: CONDITIONS },
  { key: 'availability', label: 'Exchange / donate / lend', options: AVAILABILITY },
]
const loading = ref(true)
const selected = ref(null)
const selectedAuthor = ref(null)
const message = ref('')
const sending = ref(false)
const wished = ref(new Set())
const toast = ref('')
const nearMe = ref(false)
const authors = ref(USE_MOCK ? [...mockAuthors] : [])
const authorsLoading = ref(!USE_MOCK)

const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const authorPage = ref(1)
const authorsPerPage = 8
const paginatedAuthors = computed(() => {
  const start = (authorPage.value - 1) * authorsPerPage
  return authors.value.slice(start, start + authorsPerPage)
})

const totalAuthorPages = computed(() => Math.ceil(authors.value.length / authorsPerPage))
const requestedAuthorProfiles = new Set()

const authorNameKey = (name) => String(name || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

async function loadAuthorProfiles(visibleAuthors) {
  await Promise.all(visibleAuthors.map(async (author) => {
    const key = authorNameKey(author.name)
    if (!key || author.profileLoaded || requestedAuthorProfiles.has(key)) return
    requestedAuthorProfiles.add(key)
    author.profileLoading = true
    try {
      Object.assign(author, await getAuthorProfile(author.name))
    } catch {
      author.profileError = true
    } finally {
      author.profileLoading = false
      author.profileLoaded = true
    }
  }))
}

watch(paginatedAuthors, (visibleAuthors) => loadAuthorProfiles(visibleAuthors), { immediate: true })

const filtering = computed(() => Boolean(search.value || filters.value.genre || filters.value.condition || filters.value.availability || nearMe.value))
function clearFilters() { search.value = ''; filters.value = { genre: '', condition: '', availability: '' }; nearMe.value = false }

// Hero banner
const heroFailed = ref(false)
const exploreNow = () => document.getElementById('top-books')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Section icons (svg path)
const ICONS = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  book: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}
const pagerCls = 'flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-40'

function authorsFromBooks(books) {
  const grouped = new Map()
  books.forEach((book) => {
    const name = book.author?.trim()
    if (!name) return
    const key = name.toLocaleLowerCase()
    if (!grouped.has(key)) grouped.set(key, { name, avatar: '', bestselling: [], otherBooks: [] })
    const author = grouped.get(key)
    if (author.bestselling.length < 3) author.bestselling.push(book)
    else author.otherBooks.push(book)
  })
  return [...grouped.values()].sort((a, b) =>
    (b.bestselling.length + b.otherBooks.length) - (a.bestselling.length + a.otherBooks.length))
}

async function loadAuthors() {
  if (USE_MOCK) return
  try {
    const result = await getBooks({ per_page: 50 })
    authors.value = authorsFromBooks(result.data)
    authorPage.value = 1
  } catch {
    say('Could not load authors. Please try again.')
  } finally {
    authorsLoading.value = false
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
    const res = await getBooks({ search: search.value, genre: filters.value.genre, condition: filters.value.condition, availability_type: filters.value.availability, city: nearMe.value ? me.value.city : '', page, per_page: 12 })
    if (id !== reqId) return
    list.value = res
  } catch {
    if (id === reqId) say('Could not load books. Please try again.')
  } finally {
    if (id === reqId) loading.value = false
  }
}
let timer
watch([search, filters, nearMe], () => { clearTimeout(timer); timer = setTimeout(() => load(1), 300) }, { deep: true })
const portalEsc = (e) => {
  if (e.key !== 'Escape') return
  selected.value = null
  selectedAuthor.value = null
}
onBeforeUnmount(() => { window.removeEventListener('keydown', portalEsc); clearTimeout(timer) })
onMounted(async () => {
  window.addEventListener('keydown', portalEsc)
  loadAuthors()
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
  loadAuthorProfiles([author])
}
const booksByAuthor = (author) => [...(author?.bestselling || []), ...(author?.otherBooks || [])]
async function openAuthorBook(book) {
  selectedAuthor.value = null
  await nextTick()
  await open(book)
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
  const was = wished.value.has(b.id)
  try { await toggleWishlist(b.id, was) } catch { return say('Could not update your wishlist.') }
  say(was ? 'Removed from wishlist' : 'Saved to wishlist')
  wished.value.has(b.id) ? wished.value.delete(b.id) : wished.value.add(b.id)
  wished.value = new Set(wished.value)
}
</script>
<template>
  <AppLayout
    current="Home"
    v-model:search="search"
    search-placeholder="Search by title or author"
    :filters="filterDefs"
    v-model:filter-values="filters"
    show-near-me
    v-model:near-me="nearMe"
  >
    <!-- Hero banner (search/filter korle lukiye jay) -->
    <section v-if="!filtering" class="reveal relative mb-4 overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-r from-[#fbf3e8] via-[#f6e9d8] to-[#efdcc3] shadow-sm" style="--i: 0">
      <img
        v-if="!heroFailed"
        :src="heroImg"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-right sm:block"
        style="-webkit-mask-image: linear-gradient(to right, transparent, #000 38%); mask-image: linear-gradient(to right, transparent, #000 38%)"
        @error="heroFailed = true"
      />
      <div class="relative z-10 max-w-xl px-6 py-7 sm:px-10 sm:py-9">
        <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Discover</p>
        <div class="relative mt-1 inline-block">
          <h1 class="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">Discover books</h1>
          <svg class="absolute -right-8 -top-3 h-6 w-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 11l3-5M11 4l1 5M19 8l-5 3" /></svg>
        </div>
        <p class="mt-2 text-sm text-neutral-600 sm:text-base">Find, exchange, borrow or receive books from readers near you.</p>
        <!-- <button type="button" class="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-dark active:scale-[.98]" @click="exploreNow">
          Explore Now
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button> -->
      </div>
    </section>

    <!-- Search results -->
    <section v-if="filtering" class="animate-fade-up rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-base font-bold text-brand" aria-live="polite">Search results <span class="ml-2 text-xs font-normal text-neutral-500">{{ list.total }} found</span></h2>
        <button type="button" class="text-xs font-medium text-brand underline underline-offset-4 hover:text-brand-dark" @click="clearFilters">Clear filters</button>
      </div>
      <div v-if="loading" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div v-for="i in 6" :key="i"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div>
      </div>
      <div v-else-if="!list.data.length" class="py-10 text-center">
        <p class="text-3xl">🔍</p>
        <p class="mt-2 text-sm font-medium">No books match your search.</p>
        <p class="text-xs text-neutral-500">Try a different title, genre or clear the filters.</p>
      </div>
      <div v-else class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <BookCard v-for="(b, i) in list.data" :key="b.id" :book="b" :index="i" :wished="wished.has(b.id)" @open="open" @wish="wish" />
      </div>
    </section>

    <div v-else class="space-y-4">
      <!-- Top authors -->
      <ShelfSection title="Top authors" :icon="ICONS.users" :scrollable="false" style="--i: 1">
        <template #controls>
          <div v-if="totalAuthorPages > 1" class="flex items-center gap-2 text-xs text-neutral-500">
            <span aria-live="polite">{{ authorPage }} / {{ totalAuthorPages }}</span>
            <button type="button" :class="pagerCls" :disabled="authorPage === 1" aria-label="Previous authors" @click="authorPage--">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" :class="pagerCls" :disabled="authorPage === totalAuthorPages" aria-label="Next authors" @click="authorPage++">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </template>
        <div :key="authorPage" class="grid grid-cols-4 gap-x-2 gap-y-4 text-center sm:grid-cols-8">
          <button v-for="(author, i) in paginatedAuthors" :key="author.name" type="button" class="reveal group flex flex-col items-center text-center focus:outline-none" :style="{ '--i': i }" @click="openAuthor(author)">
            <span class="relative">
              <span class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-brand-soft text-sm font-semibold text-brand shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand group-focus-visible:border-brand group-focus-visible:ring-2 group-focus-visible:ring-brand/30" :class="authorPage === 1 && i === 0 ? 'border-brand ring-2 ring-brand/20' : 'border-black/5'">
                <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="pointer-events-none h-full w-full object-cover" @error="author.avatar = ''" />
                <span v-else>{{ initials(author.name) }}</span>
              </span>
              <!-- #1 author er crown -->
              <svg v-if="authorPage === 1 && i === 0" class="absolute -right-1 -top-2 h-4 w-4 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-label="Top author"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
            </span>
            <span class="mt-2 w-full truncate text-sm text-ink transition-colors group-hover:text-brand">{{ author.name }}</span>
          </button>
        </div>
      </ShelfSection>

      <!-- Top books -->
      <ShelfSection id="top-books" class="scroll-mt-20" title="Top Books" :icon="ICONS.book" :empty="!topLoading && !topBooks.length" style="--i: 2">
        <template v-if="topLoading"><div v-for="i in 6" :key="i" class="w-32 shrink-0 sm:w-36"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div></template>
        <BookCard v-for="(b, i) in topBooks" :key="b.id" class="w-32 shrink-0 sm:w-36" :book="b" :index="i" :sub="b.author || b.genre" :wished="wished.has(b.id)" @open="open" @wish="wish" />
        <template #empty><p class="rounded-xl bg-paper/60 py-8 text-center text-sm text-neutral-500">No top books yet.</p></template>
      </ShelfSection>

      <!-- Recommended -->
      <ShelfSection title="Recommended for you" :icon="ICONS.star" filled :empty="!matchesLoading && !matches.length" style="--i: 3">
        <template v-if="matchesLoading"><div v-for="i in 5" :key="i" class="w-32 shrink-0 sm:w-36"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div></template>
        <BookCard v-for="(b, i) in matches" :key="b.id" class="w-32 shrink-0 sm:w-36" :book="b" :index="i" :wished="wished.has(b.id)" @open="open" @wish="wish" />
        <template #empty>
          <div class="flex flex-col items-center gap-1.5 rounded-xl bg-paper/60 px-4 py-8 text-center">
            <p class="text-sm font-medium text-ink">No recommendations yet</p>
            <p class="max-w-sm text-xs text-neutral-500">Add books to your wishlist and list your own books to get personalised matches.</p>
            <Link href="/my-books" class="mt-2 rounded-full border border-brand/30 px-4 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft">List a book</Link>
          </div>
        </template>
      </ShelfSection>
    </div>

    <template #overlay>
      <!-- Author popup -->
      <Transition name="modal">
        <div v-if="selectedAuthor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="selectedAuthor = null">
          <div role="dialog" aria-modal="true" aria-labelledby="author-title" class="grid h-[min(92dvh,48rem)] w-full max-w-5xl grid-cols-1 grid-rows-[minmax(12rem,0.42fr)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl lg:grid-cols-[minmax(16rem,0.8fr)_1.2fr] lg:grid-rows-1">
            <aside class="relative min-h-0 overflow-hidden bg-[#e9e1d7]">
              <img v-if="selectedAuthor.avatar" :src="selectedAuthor.avatar" :alt="selectedAuthor.name" class="absolute inset-0 h-full w-full object-cover" @error="selectedAuthor.avatar = ''" />
              <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f2e6d5] to-[#d9c7b2] font-display text-7xl font-semibold text-brand/50">{{ initials(selectedAuthor.name) }}</div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Author profile</p>
                <h3 id="author-title" class="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{{ selectedAuthor.name }}</h3>
                <p v-if="selectedAuthor.birth_date || selectedAuthor.death_date" class="mt-2 text-sm text-white/80">
                  {{ selectedAuthor.birth_date || 'Life dates unavailable' }}<template v-if="selectedAuthor.death_date"> – {{ selectedAuthor.death_date }}</template>
                </p>
              </div>
            </aside>

            <section class="relative min-h-0 min-w-0 overflow-y-auto overscroll-contain p-5 sm:p-8">
              <button type="button" class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-ink" aria-label="Close" @click="selectedAuthor = null">×</button>
              <div class="pr-10">
                <p class="text-xs font-semibold uppercase tracking-wider text-brand">Biography</p>
                <p v-if="selectedAuthor.profileLoading && !selectedAuthor.bio" class="mt-3 h-20 animate-pulse rounded-lg bg-neutral-100"></p>
                <p v-else-if="selectedAuthor.bio" class="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-600">{{ selectedAuthor.bio }}</p>
                <p v-else class="mt-3 text-sm leading-6 text-neutral-500">A biography isn’t available from Open Library for this author.</p>
                <a v-if="selectedAuthor.wikipedia" :href="selectedAuthor.wikipedia" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex text-xs font-semibold text-brand underline underline-offset-4 hover:text-brand-dark">More about {{ selectedAuthor.name }}</a>
              </div>

              <div class="mt-7 border-t border-black/10 pt-6">
                <div class="flex items-baseline justify-between gap-3">
                  <h4 class="font-display text-xl font-semibold">Books in the community</h4>
                  <span class="shrink-0 text-xs text-neutral-500">{{ booksByAuthor(selectedAuthor).length }}</span>
                </div>
                <div v-if="booksByAuthor(selectedAuthor).length" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button v-for="b in booksByAuthor(selectedAuthor)" :key="b.id" type="button" class="lift min-w-0 rounded-xl border border-black/10 bg-white p-2 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/40" @click="openAuthorBook(b)">
                    <div class="mb-2 aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100"><BookCover :book="b" /></div>
                    <p class="truncate text-xs font-semibold text-ink">{{ b.title }}</p>
                    <p class="mt-1 truncate text-[10px] capitalize text-neutral-500">{{ b.availability_type }} · {{ b.condition }}</p>
                  </button>
                </div>
                <p v-else class="mt-4 rounded-lg bg-paper px-4 py-6 text-center text-sm text-neutral-500">No books by this author are currently listed.</p>
              </div>
            </section>
          </div>
        </div>
      </Transition>

      <!-- Book popup -->
      <Transition name="modal">
        <div v-if="selected" class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="selected = null">
          <div role="dialog" aria-modal="true" aria-labelledby="book-title" class="grid max-h-[90dvh] min-h-0 w-full max-w-2xl gap-6 overflow-y-auto overscroll-contain rounded-2xl border border-black/5 bg-white p-6 sm:grid-cols-[200px_1fr]">
            <div class="mx-auto w-40 sm:w-full"><BookGallery :book="selected" /></div>
            <div>
              <div class="flex items-start justify-between gap-3">
                <div><h3 id="book-title" class="font-display text-xl font-semibold">{{ selected.title }}</h3><p class="text-sm text-neutral-500">by {{ selected.author }}</p></div>
                <button class="text-2xl leading-none text-neutral-400 transition-colors hover:text-ink" aria-label="Close" @click="selected = null">×</button>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt class="text-neutral-500">Genre</dt><dd>{{ selected.genre }}</dd>
                <dt class="text-neutral-500">Condition</dt><dd>{{ selected.condition }}</dd>
                <dt class="text-neutral-500">Available for</dt><dd class="capitalize">{{ selected.availability_type }}</dd>
                <dt v-if="selected.available_copies != null" class="text-neutral-500">Copies available</dt><dd v-if="selected.available_copies != null">{{ selected.available_copies }}</dd>
                <dt class="text-neutral-500">Owner</dt><dd>{{ selected.owner ? selected.owner.name : 'N/A' }}, {{ selected.owner ? selected.owner.city : 'N/A' }}</dd>
                <dt class="text-neutral-500">Reputation</dt><dd>★ {{ selected.owner ? selected.owner.reputation_score : '5.0' }}</dd>
              </dl>
              <textarea v-model="message" rows="2" placeholder="Add a note for the owner (optional)" class="mt-4 w-full rounded-lg border border-black/10 p-3 text-sm transition-shadow focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
              <div class="mt-3 flex gap-3">
                <button :disabled="sending" class="flex-1 rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-dark active:scale-[.98] disabled:opacity-60" @click="send">{{ sending ? 'Sending…' : action[selected.availability_type] }}</button>
                <button class="rounded-xl border px-4 text-sm transition-colors hover:bg-brand-soft" :class="wished.has(selected.id) ? 'border-brand text-brand' : ''" @click="wish(selected)">{{ wished.has(selected.id) ? 'Saved' : 'Save to wishlist' }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Toast :message="toast" />
    </template>
  </AppLayout>
</template>