<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Link from '@/Components/Link.vue'
import BookCover from '../Components/BookCover.vue'
import BookCard from '../Components/BookCard.vue'
import Toast from '../Components/Toast.vue'
import BookGallery from '../Components/BookGallery.vue'
import AppLayout from '../Layouts/AppLayout.vue'
import { auth } from '../stores/auth'
import { me as mockMe } from '../data/mock'
import { sendExchangeRequest, toggleWishlist } from '../api'
import { getBooks, getTopBooks, getBook, getMatches, CONDITIONS, AVAILABILITY } from '../bookApi'
import { categories, authors } from '../data/mock'

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

const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const authorPage = ref(1)
const authorsPerPage = 8
const paginatedAuthors = computed(() => {
  const start = (authorPage.value - 1) * authorsPerPage
  return authors.slice(start, start + authorsPerPage)
})
const totalAuthorPages = computed(() => Math.ceil(authors.length / authorsPerPage))

const filtering = computed(() => Boolean(search.value || filters.value.genre || filters.value.condition || filters.value.availability || nearMe.value))
function clearFilters() { search.value = ''; filters.value = { genre: '', condition: '', availability: '' }; nearMe.value = false }

const topBooksRef = ref(null)
const recommendedRef = ref(null)

const scrollContainer = (elRef, direction) => {
  if (elRef.value) {
    elRef.value.scrollBy({ left: direction * 250, behavior: 'smooth' })
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
    title="Discover books"
    subtitle="Find, exchange, borrow or receive books from readers near you."
    v-model:search="search"
    search-placeholder="Search by title or author"
    :filters="filterDefs"
    v-model:filter-values="filters"
    show-near-me
    v-model:near-me="nearMe"
  >
    <!-- Search results -->
    <section v-if="filtering" class="animate-fade-up rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-sm font-semibold text-brand">Search results <span class="ml-2 text-xs font-normal text-neutral-500">{{ list.total }} found</span></h2>
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

    <template v-else>
      <!-- Top authors -->
      <section class="reveal rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm" style="--i: 0">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-display text-sm font-bold text-brand">Top authors</h2>
          <div v-if="totalAuthorPages > 1" class="flex items-center gap-2 text-[11px] text-neutral-400">
            <span>{{ authorPage }} / {{ totalAuthorPages }}</span>
            <button :disabled="authorPage === 1" class="hover:text-brand disabled:opacity-40" @click="authorPage--">Prev</button>
            <button :disabled="authorPage === totalAuthorPages" class="hover:text-brand disabled:opacity-40" @click="authorPage++">Next</button>
          </div>
        </div>
        <div :key="authorPage" class="grid grid-cols-4 gap-2 text-center sm:grid-cols-8">
          <button v-for="(author, i) in paginatedAuthors" :key="author.name" type="button" class="reveal group flex flex-col items-center text-center focus:outline-none" :style="{ '--i': i }" @click="openAuthor(author)">
            <div class="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-brand-soft text-xs font-semibold text-brand shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-110 group-hover:border-brand">
              <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="pointer-events-none h-full w-full object-cover" />
              <span v-else>{{ initials(author.name) }}</span>
            </div>
            <span class="mt-1 w-full truncate text-[10px] text-neutral-700 group-hover:text-brand">{{ author.name }}</span>
          </button>
        </div>
      </section>

      <!-- Top books -->
      <section class="reveal rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm" style="--i: 1">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-display text-sm font-bold text-brand">Top Books</h2>
          <div class="flex items-center gap-2 text-[11px] text-neutral-400">
            <button class="hover:text-brand" @click="scrollContainer(topBooksRef, -1)">Prev</button>
            <button class="hover:text-brand" @click="scrollContainer(topBooksRef, 1)">Next</button>
          </div>
        </div>
        <div ref="topBooksRef" class="no-scrollbar flex gap-3 overflow-x-auto pb-2 pt-1">
          <template v-if="topLoading"><div v-for="i in 6" :key="i" class="w-28 shrink-0 sm:w-32"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div></template>
          <BookCard v-for="(b, i) in topBooks" :key="b.id" class="w-28 shrink-0 sm:w-32" :book="b" :index="i" :sub="b.author || b.genre" :wished="wished.has(b.id)" @open="open" @wish="wish" />
          <p v-if="!topLoading && !topBooks.length" class="py-2 text-xs text-neutral-500">No top books yet.</p>
        </div>
      </section>

      <!-- Recommended -->
      <section class="reveal rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm" style="--i: 2">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-display text-sm font-bold text-brand">Recommended for you</h2>
          <div class="flex items-center gap-2 text-[11px] text-neutral-400">
            <button class="hover:text-brand" @click="scrollContainer(recommendedRef, -1)">Prev</button>
            <button class="hover:text-brand" @click="scrollContainer(recommendedRef, 1)">Next</button>
          </div>
        </div>
        <div ref="recommendedRef" class="no-scrollbar flex gap-3 overflow-x-auto pb-2 pt-1">
          <template v-if="matchesLoading"><div v-for="i in 5" :key="i" class="w-28 shrink-0 sm:w-32"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div></template>
          <BookCard v-for="(b, i) in matches" :key="b.id" class="w-28 shrink-0 sm:w-32" :book="b" :index="i" :wished="wished.has(b.id)" @open="open" @wish="wish" />
          <p v-if="!matchesLoading && !matches.length" class="py-2 text-xs text-neutral-500">No recommendations yet.</p>
        </div>
      </section>
    </template>

    <template #overlay>
      <!-- Author popup -->
      <Transition name="modal">
        <div v-if="selectedAuthor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="selectedAuthor = null">
          <div role="dialog" aria-modal="true" class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
            <div class="flex items-center justify-between border-b pb-4">
              <div class="flex items-center gap-3">
                <img v-if="selectedAuthor.avatar" :src="selectedAuthor.avatar" :alt="selectedAuthor.name" class="h-12 w-12 rounded-full border object-cover" />
                <div v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{{ initials(selectedAuthor.name) }}</div>
                <div><h3 class="font-display text-lg font-semibold">{{ selectedAuthor.name }}</h3><p class="text-xs text-neutral-500">Author Profile</p></div>
              </div>
              <button class="text-2xl leading-none text-neutral-400 transition-colors hover:text-ink" aria-label="Close" @click="selectedAuthor = null">×</button>
            </div>
            <div class="mt-4 space-y-4">
              <div>
                <h4 class="mb-2 text-sm font-semibold text-brand">Bestselling Books</h4>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button v-for="b in selectedAuthor.bestselling" :key="b.id" class="lift rounded-xl border p-2 text-left hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                    <div class="mb-1 aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100"><BookCover :book="b" /></div>
                    <p class="truncate text-xs font-medium">{{ b.title }}</p>
                  </button>
                </div>
              </div>
              <div v-if="selectedAuthor.otherBooks?.length > 0">
                <h4 class="mb-2 text-sm font-semibold text-brand">Other Books</h4>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button v-for="b in selectedAuthor.otherBooks" :key="b.id" class="lift rounded-xl border p-2 text-left hover:bg-brand-soft" @click="selectedAuthor = null; open(b)">
                    <div class="mb-1 aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100"><BookCover :book="b" /></div>
                    <p class="truncate text-xs font-medium">{{ b.title }}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Book popup -->
      <Transition name="modal">
        <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="selected = null">
          <div role="dialog" aria-modal="true" aria-labelledby="book-title" class="grid max-h-[90vh] w-full max-w-2xl gap-6 overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 sm:grid-cols-[200px_1fr]">
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
