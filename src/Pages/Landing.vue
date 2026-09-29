<script setup>
// resources/js/Pages/Landing.vue
import Head from '@/Components/Head.vue'
import Link from '@/Components/Link.vue'
import { useRouter } from 'vue-router'
import { auth } from '@/stores/auth'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BookCover from '../Components/BookCover.vue'
import ApplicationLogo from '../Components/ApplicationLogo.vue'
import { books as mockBooks, categories, testimonials } from '../data/mock'
import { getBooks } from '../bookApi'

const menuOpen = ref(false)
const catalog = ref([...mockBooks]) // mock first, replaced by API books when they load
const email = ref('')
const activeShareTab = ref('exchange')
const libraryIndex = ref(0)
const activeCategoryIndex = ref(0)
const categoryDirection = ref('next')
const categoryPaused = ref(false)
const router = useRouter()
const isAuthenticated = computed(() => Boolean(auth.user))
const year = new Date().getFullYear()

const navLinks = [['Home', '#top'], ['Library', '#library'], ['Books', '#books'], ['Categories', '#categories'], ['How it works', '#how']]

/* ---------- Hero: columns of covers, each shifted a little ---------- */
const heroOffsets = [-40, 20, -90, -20, -70, 10, -50, 30, -80]
const heroCols = computed(() => heroOffsets.map((offset, ci) => ({
  offset,
  items: Array.from({ length: 5 }, (_, k) => ({ key: `${ci}-${k}`, book: catalog.value[(ci * 5 + k) % (catalog.value.length || 1)] })),
})))

/* ---------- Our Library: curved carousel driven by the tabs ---------- */
const ways = [
  { type: 'exchange', title: 'Exchange', text: 'Swap a book you have finished for one you want to read next.' },
  { type: 'donate', title: 'Donate', text: 'Give a book away for free to a reader who will use it.' },
  { type: 'lend', title: 'Lend', text: 'Lend a book to a neighbour and get it back after they finish.' },
]
const activeWay = computed(() => ways.find((w) => w.type === activeShareTab.value))
const libraryBooks = computed(() => catalog.value.filter((b) => b.availability_type === activeShareTab.value))
const activeLibraryBook = computed(() => libraryBooks.value[libraryIndex.value])
const libraryCarouselItems = computed(() => {
  const count = libraryBooks.value.length
  if (!count) return []
  const visibleCount = Math.min(5, count)
  const half = Math.floor(visibleCount / 2)
  return Array.from({ length: visibleCount }, (_, slot) => {
    const offset = slot - half
    const bookIndex = (libraryIndex.value + offset + count) % count
    return { book: libraryBooks.value[bookIndex], bookIndex, offset }
  })
})
const libraryCardStyle = (offset) => ({
  left: `${50 + offset * 22}%`,
  transform: `translate(-50%, -50%) perspective(900px) rotateY(${-offset * 17}deg) scale(${1 - Math.abs(offset) * 0.13})`,
  opacity: 1 - Math.abs(offset) * 0.17,
  zIndex: 10 - Math.abs(offset),
})
watch([activeShareTab, catalog], () => { libraryIndex.value = 0 })
const selectLibraryBook = (index) => { libraryIndex.value = index }
const showPreviousBook = () => {
  libraryIndex.value = (libraryIndex.value - 1 + libraryBooks.value.length) % libraryBooks.value.length
}
const showNextBook = () => {
  libraryIndex.value = (libraryIndex.value + 1) % libraryBooks.value.length
}

/* ---------- Recently listed ---------- */
const featured = computed(() => catalog.value.slice(0, 3))
const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }
const cta = { exchange: 'Request exchange', donate: 'Request this book', lend: 'Request to borrow' }

/* ---------- Categories: animated row ---------- */
const cats = computed(() => {
  const list = catalog.value
  let names = categories.filter((c) => list.some((b) => b.genre === c))
  if (!names.length) names = [...new Set(list.map((b) => b.genre).filter(Boolean))] // API genres differ from mock
  return names.slice(0, 6).map((c) => ({ name: c, cover: list.find((b) => b.genre === c), count: list.filter((b) => b.genre === c).length }))
})
watch(cats, () => { activeCategoryIndex.value = 0 })
const activeCategory = computed(() => cats.value[activeCategoryIndex.value])
const categoryHref = (name) => `${isAuthenticated.value ? '/dashboard' : '/login'}?genre=${encodeURIComponent(name)}`
const showPreviousCategory = () => {
  categoryDirection.value = 'previous'
  activeCategoryIndex.value = (activeCategoryIndex.value - 1 + cats.value.length) % cats.value.length
}
const showNextCategory = () => {
  categoryDirection.value = 'next'
  activeCategoryIndex.value = (activeCategoryIndex.value + 1) % cats.value.length
}
const categoryTick = () => {
  if (!categoryPaused.value && cats.value.length > 1) showNextCategory()
}
const selectCategory = (index) => {
  categoryDirection.value = index < activeCategoryIndex.value ? 'previous' : 'next'
  activeCategoryIndex.value = index
}
let categoryTimer
onMounted(() => {
  categoryTimer = window.setInterval(categoryTick, 3500)
})
onBeforeUnmount(() => window.clearInterval(categoryTimer))

// Real books from GET /api/books. If the request fails (guest not allowed, API down) the mock books stay.
onMounted(async () => {
  try {
    const res = await getBooks({ per_page: 24 })
    if (res.data.length) catalog.value = res.data
  } catch { /* keep mock data */ }
})

/* ---------- How it works ---------- */
const steps = [
  ['List your books', 'Add a photo, the condition, and whether you want to exchange, donate or lend.'],
  ['Send a request', 'Find a book you want and ask its owner. They accept or decline.'],
  ['Chat and rate', 'Once accepted, chat to plan the handover, then rate each other to build trust.'],
]
const perks = [
  { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', title: 'Wishlist alerts', text: 'Save the books you want. You get a notification the moment one is listed.' },
  { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', title: 'Ratings you can trust', text: 'Every completed exchange is rated, so you know who you are dealing with.' },
  { d: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z', title: 'Private chat', text: 'Plan the handover in the app. No need to share your phone number.' },
  { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', title: 'Readers in your city', text: 'Filter by city and find books just a short trip away.' },
]

const initials = (n) => n.split(' ').map((p) => p[0]).join('')
const join = () => router.push({ path: '/register', query: email.value ? { email: email.value } : {} })
</script>

<template>
  <Head title="Book Haven - Community Book Exchange" />
  <div class="min-h-screen overflow-x-clip bg-white font-sans text-ink">

    <!-- Navbar -->
    <header class="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 py-4 sm:px-8">
        <a href="#top" class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <ApplicationLogo class="h-7 w-7 text-brand" /> Book Haven
        </a>
        <div class="hidden items-center gap-9 text-sm font-medium md:flex">
          <a v-for="([t, h], i) in navLinks" :key="t" :href="h" class="transition-colors" :class="i === 0 ? 'text-brand' : 'text-neutral-700 hover:text-brand'">{{ t }}</a>
        </div>
        <div class="col-start-3 flex items-center justify-end gap-3 text-sm font-medium">
          <Link href="/login" class="hidden text-neutral-700 transition-colors hover:text-brand sm:inline">Log in</Link>
          <Link href="/register" class="rounded-lg bg-brand px-4 py-2 text-white shadow-sm transition-colors hover:bg-brand-dark">Join free</Link>
          <button class="rounded-lg p-2 text-neutral-700 hover:bg-brand-soft md:hidden" :aria-expanded="menuOpen" aria-label="Menu" @click="menuOpen = !menuOpen">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" /><path v-else d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </nav>
      <div v-if="menuOpen" class="border-t border-black/5 bg-white px-5 py-3 md:hidden">
        <a v-for="[t, h] in navLinks" :key="t" :href="h" class="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand" @click="menuOpen = false">{{ t }}</a>
        <Link href="/login" class="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand sm:hidden">Log in</Link>
      </div>
    </header>

    <!-- Hero -->
    <section id="top" class="scroll-mt-20">
      <div aria-hidden="true" class="relative flex h-[340px] justify-center gap-2 overflow-hidden pt-6 sm:h-[400px] sm:gap-3 md:h-[440px]">
        <div v-for="(col, ci) in heroCols" :key="ci" class="flex shrink-0 flex-col gap-2 sm:gap-3" :style="{ marginTop: col.offset + 'px' }">
          <div v-for="it in col.items" :key="it.key" class="aspect-[3/4] w-16 overflow-hidden rounded-xl border border-black/5 shadow-sm sm:w-24 sm:rounded-2xl lg:w-28">
            <BookCover :book="it.book" />
          </div>
        </div>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent"></div>
      </div>
      <div class="mx-auto max-w-2xl px-5 pb-24 pt-4 text-center">
        <h1 class="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">Explore the magic of reading</h1>
        <p class="mx-auto mt-5 max-w-md text-sm leading-relaxed text-neutral-500 sm:text-base">Exchange, donate or lend the books you have finished with readers in your city. Ratings show you who to trust.</p>
        <Link href="/register" class="mt-8 inline-block rounded-lg bg-brand px-8 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark">Start Exploring</Link>
      </div>
    </section>

    <!-- Our Library -->
    <section id="library" class="scroll-mt-20 pb-24">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="font-display text-3xl font-medium tracking-tight sm:text-5xl">Our Library</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Choose how you want to pass your books on, or find your next read from a neighbour's shelf.</p>
        <div class="mx-auto mt-8 inline-flex gap-1 rounded-full bg-brand-soft p-1" role="tablist">
          <button v-for="w in ways" :key="w.type" role="tab" :aria-selected="activeShareTab === w.type" class="rounded-full px-5 py-2 text-sm font-medium transition-colors" :class="activeShareTab === w.type ? 'bg-brand text-white shadow-sm' : 'text-brand hover:bg-white/70'" @click="activeShareTab = w.type">{{ w.title }}</button>
        </div>
      </div>
      <div v-if="activeLibraryBook" class="mx-auto mt-10 max-w-5xl px-4 sm:mt-12 sm:px-5">
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-6">
          <button type="button" class="relative z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-12 sm:w-12" aria-label="Previous book" title="Previous book" @click="showPreviousBook">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div class="library-carousel relative h-[220px] overflow-hidden sm:h-[280px] md:h-[340px]" aria-label="Books in this library">
            <button v-for="item in libraryCarouselItems" :key="item.book.id" type="button" class="library-carousel-card absolute top-1/2 aspect-[3/4] w-[36%] max-w-[220px] -translate-y-1/2 overflow-hidden rounded-xl border border-black/10 bg-paper p-1.5 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 sm:rounded-2xl sm:p-2" :style="libraryCardStyle(item.offset)" :aria-label="`Show ${item.book.title}`" :aria-pressed="item.offset === 0" @click="selectLibraryBook(item.bookIndex)">
              <div class="h-full overflow-hidden rounded-md sm:rounded-xl"><BookCover :book="item.book" /></div>
            </button>
          </div>
          <button type="button" class="relative z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-12 sm:w-12" aria-label="Next book" title="Next book" @click="showNextBook">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <div :key="activeLibraryBook.id" class="library-book-details mx-auto mt-6 max-w-lg text-center">
            <p class="text-xs font-semibold uppercase text-brand">{{ activeWay.title }} · {{ libraryIndex + 1 }} of {{ libraryBooks.length }}</p>
            <h3 class="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">{{ activeLibraryBook.title }}</h3>
            <p class="mt-1 text-sm text-neutral-500">by {{ activeLibraryBook.author }}</p>
            <p class="mt-3 text-sm text-neutral-500">{{ activeLibraryBook.genre }} · {{ activeLibraryBook.condition }} · {{ activeLibraryBook.owner.city }}</p>
            <p class="mt-3 text-sm leading-relaxed text-neutral-600">{{ activeWay.text }}</p>
            <Link :href="`/login?book=${activeLibraryBook.id}&action=${activeLibraryBook.availability_type}`" class="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2">
              {{ cta[activeLibraryBook.availability_type] }}
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
            </Link>
        </div>
      </div>
      <p v-else class="mx-auto mt-10 px-5 text-center text-sm text-neutral-500">No books are available for {{ activeWay.title.toLowerCase() }} yet.</p>
      <div class="mx-auto mt-6 max-w-md px-5 text-center">
        <Link href="/login" class="text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-dark">Browse all {{ activeWay.title.toLowerCase() }} books</Link>
      </div>
    </section>

    <!-- Recently listed -->
    <section id="books" class="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
      <div class="relative text-center">
        <h2 class="font-display text-3xl font-medium tracking-tight sm:text-5xl">Recently Listed Books</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Fresh listings from readers in your city. Pick one and send a request.</p>
        <Link href="/login" class="mt-4 inline-block text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-brand sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:text-base">View all</Link>
      </div>
      <div class="mt-12 grid gap-6 md:grid-cols-3">
        <article v-for="b in featured" :key="b.id" class="flex flex-col rounded-3xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg">
          <div class="flex h-64 items-center justify-center rounded-2xl bg-paper">
            <div class="aspect-[3/4] h-48 overflow-hidden rounded-md shadow-lg"><BookCover :book="b" /></div>
          </div>
          <div class="mt-5 flex items-start justify-between gap-3 px-1">
            <h3 class="truncate font-display text-lg font-semibold">{{ b.title }}</h3>
            <span class="shrink-0 pt-0.5 text-sm text-neutral-500">{{ badge[b.availability_type] }}</span>
          </div>
          <p class="mt-1 px-1 text-sm text-neutral-500">by {{ b.author }}</p>
          <p class="mt-2 flex items-center gap-1.5 px-1 text-sm text-neutral-500">
            <svg class="h-4 w-4 text-[#B07D3A]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            {{ b.owner.reputation_score }}<span class="text-neutral-400">· {{ b.condition }}</span>
          </p>
          <Link href="/login" class="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            {{ cta[b.availability_type] }}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z M12 6.5v13" /></svg>
          </Link>
        </article>
      </div>
    </section>

    <!-- Explore by category -->
    <section id="categories" class="scroll-mt-20 pb-24">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="font-display text-3xl font-medium tracking-tight sm:text-5xl">Explore By Category</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Pick a genre and see what your neighbours are sharing.</p>
      </div>
      <div class="mx-auto mt-10 grid max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:gap-5 sm:px-5" role="region" aria-label="Book categories" @mouseenter="categoryPaused = true" @mouseleave="categoryPaused = false" @focusin="categoryPaused = true" @focusout="categoryPaused = false">
        <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-neutral-700 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-12 sm:w-12" aria-label="Previous categories" title="Previous categories" @click="showPreviousCategory">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <Transition :name="'category-' + categoryDirection" mode="out-in">
          <Link v-if="activeCategory" :key="activeCategory.name" :href="categoryHref(activeCategory.name)" class="group mx-auto flex h-[23rem] w-48 flex-col items-center sm:w-64">
            <div class="flex aspect-[5/4] w-full items-center justify-center rounded-2xl bg-paper shadow-sm transition-shadow group-hover:shadow-lg">
              <div class="aspect-[3/4] h-[82%] overflow-hidden rounded shadow-md"><BookCover :book="activeCategory.cover" /></div>
            </div>
            <span class="my-3 w-px flex-1 bg-neutral-300"></span>
            <span class="rounded-full bg-neutral-100 px-6 py-2.5 text-sm font-medium text-neutral-700 transition-colors group-hover:bg-brand-soft group-hover:text-brand">{{ activeCategory.name }}</span>
            <span class="mt-1.5 text-xs text-neutral-400">{{ activeCategory.count }} books</span>
          </Link>
        </Transition>
        <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-neutral-700 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-12 sm:w-12" aria-label="Next categories" title="Next categories" @click="showNextCategory">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
      <div class="mt-2 flex items-center justify-center gap-2" role="group" aria-label="Choose category">
        <button v-for="(c, i) in cats" :key="c.name" type="button" class="h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2" :class="activeCategoryIndex === i ? 'bg-brand' : 'bg-neutral-300 hover:bg-neutral-400'" :aria-label="`Show ${c.name}`" :aria-current="activeCategoryIndex === i ? 'true' : undefined" @click="selectCategory(i)"></button>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
      <h2 class="text-center font-display text-3xl font-medium tracking-tight sm:text-5xl">How It Works</h2>
      <ol class="mt-12 grid gap-6 md:grid-cols-3">
        <li v-for="(s, i) in steps" :key="i" class="rounded-2xl border border-brand/10 bg-brand-soft p-6">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{{ i + 1 }}</span>
          <h3 class="mt-5 font-display text-lg font-semibold">{{ s[0] }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-neutral-700">{{ s[1] }}</p>
        </li>
      </ol>
      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="p in perks" :key="p.title" class="rounded-2xl border border-black/5 bg-white p-5">
          <span class="flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 text-brand">
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="p.d" /></svg>
          </span>
          <h3 class="mt-4 font-medium">{{ p.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-neutral-600">{{ p.text }}</p>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="border-t border-black/5 bg-paper py-20">
      <div class="mx-auto max-w-6xl px-5">
        <h2 class="text-center font-display text-3xl font-medium tracking-tight sm:text-5xl">What Our Readers Say</h2>
        <div class="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <figure v-for="t in testimonials" :key="t.name" class="rounded-2xl border border-black/5 bg-white p-6">
            <div class="flex items-center gap-3">
              <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-sm font-semibold text-white">{{ initials(t.name) }}</span>
              <figcaption>
                <p class="text-sm font-medium">{{ t.name }}</p>
                <p class="text-xs text-neutral-500">{{ t.role }}</p>
              </figcaption>
              <span class="ml-auto text-sm tracking-wider text-[#B07D3A]" aria-label="5 out of 5 stars">★★★★★</span>
            </div>
            <blockquote class="mt-4 text-sm leading-relaxed text-neutral-700">{{ t.text }}</blockquote>
          </figure>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-black text-sm text-white/70">
      <div class="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p class="font-display text-2xl font-medium text-white">Join Our Book Lovers Community</p>
          <form class="mt-6 flex max-w-md items-center gap-2 rounded-2xl bg-white p-2" @submit.prevent="join">
            <input v-model="email" type="email" placeholder="Enter your email" aria-label="Email address" class="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:outline-none focus:ring-0" />
            <button type="submit" class="rounded-xl bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark">Join Now</button>
          </form>
        </div>
        <div>
          <p class="text-base font-medium text-white">Explore</p>
          <ul class="mt-4 space-y-3">
            <li><a href="#books" class="transition-colors hover:text-white">Browse books</a></li>
            <li><a href="#categories" class="transition-colors hover:text-white">Categories</a></li>
            <li><a href="#how" class="transition-colors hover:text-white">How it works</a></li>
          </ul>
        </div>
        <div>
          <p class="text-base font-medium text-white">Share</p>
          <ul class="mt-4 space-y-3">
            <li><a href="#library" class="transition-colors hover:text-white">Exchange a book</a></li>
            <li><a href="#library" class="transition-colors hover:text-white">Donate a book</a></li>
            <li><a href="#library" class="transition-colors hover:text-white">Lend a book</a></li>
          </ul>
        </div>
        <div>
          <p class="text-base font-medium text-white">Account</p>
          <ul class="mt-4 space-y-3">
            <li><Link href="/login" class="transition-colors hover:text-white">Log in</Link></li>
            <li><Link href="/register" class="transition-colors hover:text-white">Join free</Link></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 px-5 py-6 text-center text-xs text-white/50">© {{ year }} Book Haven. Made for readers who love to share.</div>
    </footer>
  </div>
</template>

<style>
html { scroll-behavior: smooth; }
.library-book-details { animation: book-detail-swap 260ms ease both; }
@keyframes book-detail-swap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.library-carousel { perspective: 1000px; }
.library-carousel-card { transition: left 520ms cubic-bezier(.2,.7,.2,1), transform 520ms cubic-bezier(.2,.7,.2,1), opacity 520ms ease, filter 520ms ease; }
.library-carousel-card[aria-pressed="true"] { filter: saturate(1); }
.library-carousel-card[aria-pressed="false"] { filter: saturate(.8); }
.category-next-enter-active, .category-next-leave-active, .category-prev-enter-active, .category-prev-leave-active { transition: opacity 300ms ease, transform 360ms cubic-bezier(.2,.7,.2,1); }
.category-next-enter-from { opacity: 0; transform: translateX(32px); }
.category-next-leave-to { opacity: 0; transform: translateX(-32px); }
.category-prev-enter-from { opacity: 0; transform: translateX(-32px); }
.category-prev-leave-to { opacity: 0; transform: translateX(32px); }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .library-book-details { animation: none; }
  .category-next-enter-active, .category-next-leave-active, .category-prev-enter-active, .category-prev-leave-active, .library-carousel-card { transition: none; }
}
</style>