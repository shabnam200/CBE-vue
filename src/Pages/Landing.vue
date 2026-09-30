<script setup>
// resources/js/Pages/Landing.vue
import Head from '@/Components/Head.vue'
import Link from '@/Components/Link.vue'
import { useRouter } from 'vue-router'
import { auth } from '@/stores/auth'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BookCover from '../Components/BookCover.vue'
import ApplicationLogo from '../Components/ApplicationLogo.vue'
import { books as mockBooks, categories, testimonials } from '../data/mock'
import { getBooks, getBook } from '../bookApi'

const router = useRouter()
const menuOpen = ref(false)
const catalog = ref([...mockBooks]) // mock first, replaced by API books when they load
const email = ref('')
const isAuthenticated = computed(() => Boolean(auth.user))
const year = new Date().getFullYear()

const navLinks = [['Home', '#top'], ['Library', '#library'], ['Categories', '#categories'], ['How it works', '#how']]

const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }
const availabilityLabel = { exchange: 'Exchange', donate: 'Donate (free)', lend: 'Lend' }
const cta = { exchange: 'Request exchange', donate: 'Request this book', lend: 'Request to borrow' }

// Button navigation (vue-router). Real mode e /dashboard e login na thakle guard nijei /login e pathabe.
const goToLogin = () => { menuOpen.value = false; router.push('/login') }
const goToRegister = () => { menuOpen.value = false; router.push('/register') }
const goToDashboard = () => router.push('/dashboard')
const goToExplore = () => router.push('/dashboard')

/* ---------- Hero: every column of covers scrolls forever, neighbouring columns go opposite ways ---------- */
const HERO_COLS = 9
const HERO_ROWS = 8 // one "period" must be taller than the screen, so 8 covers per column
const heroCols = computed(() => {
  const list = catalog.value
  return Array.from({ length: HERO_COLS }, (_, ci) => {
    const dist = Math.abs(ci - Math.floor(HERO_COLS / 2)) // 0 = middle column
    return {
      key: ci,
      dir: ci % 2 === 0 ? 'up' : 'down',
      cls: ['', '', 'hidden sm:block', 'hidden lg:block', 'hidden xl:block'][dist], // fewer columns on small screens
      style: { animationDuration: `${34 + ((ci * 7) % 5) * 5}s`, animationDelay: `-${(ci * 6) % 20}s` },
      items: Array.from({ length: HERO_ROWS }, (_, k) => list[(ci * 5 + k) % (list.length || 1)]),
    }
  })
})

/* ---------- Our Library: books slide by on their own, click one for the details ---------- */
const LIB_MIN = 12 // one copy of the strip must be wider than the screen, so the loop never shows a gap
const libraryBase = computed(() => {
  const list = catalog.value.filter(Boolean)
  if (!list.length) return []
  const base = list.slice(0, 14)
  for (let i = 0; base.length < LIB_MIN; i++) base.push(list[i % list.length])
  return base
})
const libraryStyle = computed(() => ({ '--lib-dur': `${libraryBase.value.length * 4}s` })) // ~4s per card
const cardTilt = (i) => ({ '--r': `${[-5, 3, -2, 5, -4, 2][i % 6]}deg`, '--y': `${[10, -8, 6, -12, 4, -2][i % 6]}px` })
const libraryTopRating = computed(() => catalog.value.reduce((m, b) => Math.max(m, Number(b?.owner?.reputation_score) || 0), 0))

/* ---------- Book details popup ---------- */
const selectedBook = ref(null)
const dialogEl = ref(null)
const closeBtn = ref(null)
let lastFocus = null

const filled = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v != null && v !== ''))
const prettyCondition = (c) => (c ? String(c).replace(/_/g, ' ').replace(/^./, (m) => m.toUpperCase()) : '')

async function openBook(b) {
  lastFocus = document.activeElement
  selectedBook.value = b
  document.body.style.overflow = 'hidden'
  await nextTick()
  closeBtn.value?.focus()
  try {
    const full = await getBook(b.id) // owner, copies available and anything else the list does not carry
    if (selectedBook.value?.id === b.id) selectedBook.value = { ...b, ...filled(full) }
  } catch { /* the card data alone is enough to show the popup */ }
}
function closeBook() {
  selectedBook.value = null
  document.body.style.overflow = ''
  nextTick(() => { lastFocus?.focus?.(); lastFocus = null })
}
function trapFocus(e) {
  const nodes = dialogEl.value?.querySelectorAll('a[href], button:not([disabled])')
  if (!nodes?.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
const onKey = (e) => { if (e.key === 'Escape' && selectedBook.value) closeBook() }

const bookFacts = computed(() => {
  const b = selectedBook.value
  if (!b) return []
  const rating = Number(b.owner?.reputation_score)
  const listed = b.created_at ? new Date(b.created_at) : null
  return [
    ['Genre', b.genre],
    ['Condition', prettyCondition(b.condition)],
    ['Available for', availabilityLabel[b.availability_type]],
    ['Copies available', b.available_copies],
    ['Owner', b.owner?.name],
    ['Location', b.owner?.city],
    ['Owner rating', rating ? `★ ${rating.toFixed(1)}` : ''],
    ['Listed', listed && !Number.isNaN(listed.getTime()) ? listed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''],
  ].filter(([, v]) => v != null && v !== '')
})
const requestHref = computed(() => {
  const b = selectedBook.value
  if (!b) return '/login'
  return isAuthenticated.value ? '/dashboard' : `/login?book=${b.id}&action=${b.availability_type}`
})

/* ---------- Explore by category: staggered tiles that glide left and right ---------- */
const cats = computed(() => {
  const list = catalog.value.filter(Boolean)
  let names = categories.filter((c) => list.some((b) => b.genre === c))
  if (!names.length) names = [...new Set(list.map((b) => b.genre).filter(Boolean))] // API genres differ from mock
  return names.slice(0, 8).map((c) => ({ name: c, cover: list.find((b) => b.genre === c), count: list.filter((b) => b.genre === c).length }))
})
const categoryHref = (name) => `${isAuthenticated.value ? '/dashboard' : '/login'}?genre=${encodeURIComponent(name)}`
const catOffsets = [96, 48, 0, 44, 84, 24, 64, 12] // how far each tile hangs from the top (the staggered look)
const catWidths = ['70%', '80%', '94%', '80%', '70%', '86%', '74%', '82%'] // tile width as a share of its column
const catTints = ['#F6ECEE', '#E6EFEA', '#E4E9F5', '#FBF1DE', '#EDE8F3', '#F3EBE4', '#E8F1F5', '#F5F0E1']

const catViewport = ref(null)
const catTrack = ref(null)
const catPan = ref(0) // how far the row has to travel so every tile passes through the window
const catStyle = computed(() => ({ '--cat-pan': `-${catPan.value}px`, '--cat-dur': `${Math.max(14, Math.round(catPan.value / 24))}s` }))
function measureCats() {
  if (!catViewport.value || !catTrack.value) return
  catPan.value = Math.max(0, Math.round(catTrack.value.offsetWidth - catViewport.value.clientWidth))
}
watch(cats, () => nextTick(measureCats))

/* ---------- Scroll reveal (used by the testimonials) ---------- */
const vReveal = {
  mounted(el, { value }) {
    el.classList.add('reveal')
    if (value) el.style.setProperty('--d', `${value}ms`)
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect() }
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    el._revealIO = io
  },
  unmounted(el) { el._revealIO?.disconnect() },
}

let catObserver
onMounted(async () => {
  window.addEventListener('keydown', onKey)
  measureCats()
  if ('ResizeObserver' in window && catViewport.value) {
    catObserver = new ResizeObserver(measureCats)
    catObserver.observe(catViewport.value)
  }
  document.fonts?.ready?.then(measureCats)

  try {
    const res = await getBooks({ per_page: 24 })
    if (res.data.length) catalog.value = res.data
  } catch { /* keep mock data */ }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  catObserver?.disconnect()
  document.body.style.overflow = ''
})

/* ---------- How it works (Wavy Process Section) ---------- */
const processSteps = [
  {
    step: '1',
    title: 'List your books',
    description: 'Add a photo, the condition, and whether you want to exchange, donate or lend.',
    icon: 'M3 21h18M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'
  },
  {
    step: '2',
    title: 'Send a request',
    description: 'Find a book you want and ask its owner. They accept or decline securely.',
    icon: 'M12 20V10M18 14l-6-6-6 6'
  },
  {
    step: '3',
    title: 'Chat and rate',
    description: 'Once accepted, chat to plan the handover, then rate each other to build trust.',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
  }
]

const initials = (n) => n.split(' ').map((p) => p[0]).join('')
const join = () => {
  router.push({ path: '/register', query: email.value ? { email: email.value } : {} })
}
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
          <template v-if="!isAuthenticated">
            <button type="button" @click="goToLogin" class="hidden text-neutral-700 transition-colors hover:text-brand sm:inline">Log in</button>
            <button type="button" @click="goToRegister" class="rounded-lg bg-brand px-4 py-2 text-white shadow-sm transition-colors hover:bg-brand-dark">Join free</button>
          </template>
          <button v-else type="button" @click="goToDashboard" class="rounded-lg bg-brand px-4 py-2 text-white shadow-sm transition-colors hover:bg-brand-dark">Dashboard</button>
          <button class="rounded-lg p-2 text-neutral-700 hover:bg-brand-soft md:hidden" :aria-expanded="menuOpen" aria-label="Menu" @click="menuOpen = !menuOpen">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" /><path v-else d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </nav>
      <div v-if="menuOpen" class="border-t border-black/5 bg-white px-5 py-3 md:hidden">
        <a v-for="[t, h] in navLinks" :key="t" :href="h" class="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand" @click="menuOpen = false">{{ t }}</a>
        <button v-if="!isAuthenticated" type="button" @click="goToLogin" class="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand sm:hidden">Log in</button>
      </div>
    </header>

    <!-- Hero: full viewport height -->
    <section id="top" class="relative isolate h-[calc(100svh-4.3rem)] min-h-[34rem] max-h-[60rem] scroll-mt-20 overflow-hidden flex flex-col justify-center">
      <div aria-hidden="true" class="absolute inset-0 flex justify-center gap-3 px-2 sm:gap-4">
        <div v-for="col in heroCols" :key="col.key" class="h-full w-[6.2rem] shrink-0 sm:w-28 lg:w-32 xl:w-36" :class="col.cls">
          <div class="hero-track" :class="col.dir === 'up' ? 'hero-up' : 'hero-down'" :style="col.style">
            <template v-for="copy in 2" :key="copy">
              <div v-for="(b, k) in col.items" :key="k" class="pb-3 sm:pb-4">
                <div class="relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/5 bg-paper shadow-md">
                  <BookCover :book="b" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div aria-hidden="true" class="hero-glow pointer-events-none absolute inset-0"></div>
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white to-transparent"></div>
      <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent"></div>

      <div class="relative z-10 mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-5 pb-10 text-center">
        <h1 class="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Explore the magic of reading</h1>
        <p class="mx-auto mt-5 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-base">Exchange, donate or lend the books you have finished with readers in your city. Ratings show you who to trust.</p>
        <button type="button" @click="goToExplore" class="mt-8 inline-block rounded-lg bg-brand px-8 py-3 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2">Start Exploring</button>
      </div>

      <a href="#library" class="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full p-2 text-neutral-500 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Scroll to Our Library">
        <svg class="h-5 w-5 motion-safe:animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </a>
    </section>

    <!-- Our Library: full screen spacing -->
    <section id="library" class="scroll-mt-20 min-h-[calc(100svh-4.3rem)] flex flex-col justify-center py-20">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="leading-[1.05] tracking-tight">
          <span class="block font-sans text-2xl font-normal sm:text-4xl">Our Community</span>
          <span class="block font-display text-3xl font-bold uppercase sm:text-5xl">Library</span>
        </h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">Tap any book to see its details and send a request.</p>
      </div>

      <div v-if="libraryBase.length" class="relative mx-auto mt-6 max-w-[90rem]">
        <span class="lib-bubble lib-bubble-blue" aria-hidden="true">{{ catalog.length }} books to share</span>
        <span class="lib-bubble lib-bubble-orange" aria-hidden="true">{{ libraryTopRating ? '★ ' + libraryTopRating.toFixed(1) + ' top owner' : 'Loved by readers' }}</span>
        <div class="lib-viewport" :class="{ 'is-paused': selectedBook }" role="region" aria-label="Books in our library. Select one to see its details.">
          <div class="lib-track" :style="libraryStyle">
            <template v-for="copy in 2" :key="copy">
              <button v-for="(b, i) in libraryBase" :key="`${copy}-${i}`" type="button" class="lib-card" :style="cardTilt(i)" :tabindex="copy === 2 ? -1 : 0" :aria-hidden="copy === 2 ? 'true' : undefined" :aria-label="`View details: ${b.title} by ${b.author}`" @click="openBook(b)">
                <BookCover :book="b" />
              </button>
            </template>
          </div>
        </div>
      </div>
      <p v-else class="mx-auto mt-10 px-5 text-center text-sm text-neutral-500">No books have been listed yet.</p>
    </section>

    <!-- Explore by category: full screen spacing -->
    <section id="categories" class="scroll-mt-20 min-h-[calc(100svh-4.3rem)] flex flex-col justify-center py-20">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="font-display text-3xl font-medium tracking-tight sm:text-5xl">Explore By Category</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Pick a genre and see what your neighbours are sharing.</p>
      </div>
      <div v-if="cats.length" ref="catViewport" class="cat-viewport mx-auto mt-10 max-w-6xl" role="region" aria-label="Book categories">
        <ul ref="catTrack" class="cat-track" :style="catStyle">
          <li v-for="(c, i) in cats" :key="c.name" class="cat-col">
            <Link :href="categoryHref(c.name)" class="group flex h-full flex-col items-center focus-visible:outline-none" :aria-label="`${c.name}, ${c.count} ${c.count === 1 ? 'book' : 'books'}`">
              <div class="cat-tile" :style="{ width: catWidths[i % catWidths.length], marginTop: catOffsets[i % catOffsets.length] + 'px', background: catTints[i % catTints.length] }">
                <div class="cat-cover"><BookCover :book="c.cover" /></div>
              </div>
              <span class="cat-line" aria-hidden="true"></span>
              <span class="cat-pill">{{ c.name }}</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>

    <!-- How It Works: Wavy Path with Smaller Custom-Colored Cards -->
    <section id="how" class="relative mx-auto max-w-7xl scroll-mt-20 px-5 min-h-[calc(100svh-4.3rem)] flex flex-col justify-center py-24 overflow-hidden bg-brand-soft/20">
      
      <!-- Section Heading -->
      <div class="text-center relative z-10 max-w-2xl mx-auto mb-20">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-soft text-brand text-xs font-semibold uppercase tracking-wider mb-3">
          Workflow
        </div>
        <h2 class="font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">How It Works</h2>
        <p class="mt-4 text-neutral-600 text-sm sm:text-base">Follow these simple steps to start sharing and reading books with people around you.</p>
      </div>

      <!-- Wavy Container -->
      <div class="relative max-w-5xl mx-auto w-full z-10">
        
        <!-- Background Visible Wavy Line for Desktop -->
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none px-6">
          <svg class="w-full text-brand drop-shadow-sm" height="140" viewBox="0 0 1000 140" fill="none" preserveAspectRatio="none">
            <path d="M 50 95 Q 280 15, 500 95 T 950 45" stroke="currentColor" stroke-width="4" stroke-dasharray="10 10" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Cards positioned directly on top of the wavy path (Smaller & Theme-matched Soft Tint Background) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-center">
          
          <div v-for="(item, index) in processSteps" :key="item.step" 
               class="process-card group relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-brand/20 shadow-xl shadow-brand/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-brand flex flex-col items-center text-center max-w-xs mx-auto w-full"
               :class="{
                 'lg:-translate-y-6': index === 0,
                 'lg:translate-y-14': index === 1,
                 'lg:-translate-y-4': index === 2
               }">
            
            <!-- Watermark Step Number -->
            <span class="absolute right-3 top-2 font-display text-5xl font-extrabold text-brand/10 group-hover:text-brand/20 transition-colors duration-300 select-none pointer-events-none" aria-hidden="true">
              {{ item.step }}
            </span>

            <!-- Compact Icon Badge -->
            <div class="relative mb-4">
              <div class="absolute inset-0 rounded-xl bg-brand/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div class="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft border border-brand/30 text-brand shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path :d="item.icon" />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <h3 class="font-display text-base font-semibold text-ink group-hover:text-brand transition-colors duration-300">
              {{ item.title }}
            </h3>
            <p class="mt-1.5 text-xs leading-relaxed text-neutral-600">
              {{ item.description }}
            </p>

            <!-- Bottom Indicator Line -->
            <div class="mt-4 w-6 h-1 rounded-full bg-brand/30 group-hover:w-10 group-hover:bg-brand transition-all duration-300"></div>

          </div>

        </div>
      </div>

    </section>

    <!-- Testimonials: full screen spacing -->
    <section class="overflow-hidden border-t border-black/5 bg-paper min-h-[calc(100svh-4.3rem)] flex flex-col justify-center py-20">
      <div class="mx-auto max-w-6xl px-5">
        <h2 v-reveal class="text-center font-display text-3xl font-medium tracking-tight sm:text-5xl">What Our Readers Say</h2>
        <div class="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <figure v-for="(t, i) in testimonials" :key="t.name" v-reveal="140 + i * 160" :style="{ '--i': i }">
            <div class="t-card relative h-full overflow-hidden rounded-2xl border border-black/5 bg-white p-6 transition-shadow duration-300 hover:shadow-xl">
              <svg class="pointer-events-none absolute -right-1 -top-2 h-24 w-24 text-brand/[0.07]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.6 4C5.9 5.6 3 8.9 3 13.2V20h7.4v-7.2H6.6c.1-2.5 1.5-4.3 4-5.6L9.6 4Zm10 0c-3.7 1.6-6.6 4.9-6.6 9.2V20h7.4v-7.2h-3.8c.1-2.5 1.5-4.3 4-5.6L19.6 4Z" /></svg>
              <div class="relative flex items-center gap-3">
                <span class="t-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-semibold text-white">{{ initials(t.name) }}</span>
                <figcaption class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ t.name }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ t.role }}</p>
                </figcaption>
                <span class="ml-auto flex shrink-0 gap-0.5 text-[#B07D3A]" role="img" aria-label="5 out of 5 stars">
                  <svg v-for="n in 5" :key="n" class="t-star h-4 w-4" :style="{ '--s': n }" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </span>
              </div>
              <blockquote class="relative mt-4 text-sm leading-relaxed text-neutral-700">{{ t.text ?? t.content }}</blockquote>
            </div>
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
            <li><a href="#library" class="transition-colors hover:text-white">Browse books</a></li>
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
            <template v-if="!isAuthenticated">
              <li><button type="button" @click="goToLogin" class="transition-colors hover:text-white text-left">Log in</button></li>
              <li><button type="button" @click="goToRegister" class="transition-colors hover:text-white text-left">Join free</button></li>
            </template>
            <li v-else><button type="button" @click="goToDashboard" class="transition-colors hover:text-white text-left">Go to dashboard</button></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 px-5 py-6 text-center text-xs text-white/50">© {{ year }} Book Haven. Made for readers who love to share.</div>
    </footer>

    <!-- Book details popup -->
    <Transition name="lib-modal">
      <div v-if="selectedBook" class="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-6" @click.self="closeBook">
        <div ref="dialogEl" role="dialog" aria-modal="true" aria-labelledby="book-dialog-title" class="lib-modal-panel relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" @keydown.tab="trapFocus">
          <button ref="closeBtn" type="button" class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow-sm ring-1 ring-black/5 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50" aria-label="Close" @click="closeBook">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div class="grid gap-6 p-6 pt-10 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8 sm:p-8">
            <div class="mx-auto w-40 sm:w-full">
              <div class="aspect-[3/4] overflow-hidden rounded-2xl bg-paper shadow-xl"><BookCover :book="selectedBook" /></div>
            </div>
            <div class="min-w-0">
              <span class="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{{ badge[selectedBook.availability_type] || 'Book' }}</span>
              <h3 id="book-dialog-title" class="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">{{ selectedBook.title }}</h3>
              <p class="mt-1 text-neutral-500">by {{ selectedBook.author }}</p>
              <dl class="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-black/5 pt-5 text-sm">
                <div v-for="[label, value] in bookFacts" :key="label" class="min-w-0">
                  <dt class="text-xs text-neutral-400">{{ label }}</dt>
                  <dd class="mt-0.5 truncate font-medium text-ink">{{ value }}</dd>
                </div>
              </dl>
              <p v-if="selectedBook.description" class="mt-4 text-sm leading-relaxed text-neutral-600">{{ selectedBook.description }}</p>
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <Link :href="requestHref" class="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2">
                  {{ cta[selectedBook.availability_type] || 'Send request' }}
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </Link>
                <button type="button" class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" @click="closeBook">Close</button>
              </div>
              <p v-if="!isAuthenticated" class="mt-3 text-xs text-neutral-500">You will be asked to log in or create a free account first.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
html { scroll-behavior: smooth; }

.hero-track { will-change: transform; animation-timing-function: linear; animation-iteration-count: infinite; }
.hero-up { animation-name: hero-up; }
.hero-down { animation-name: hero-down; }
@keyframes hero-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes hero-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
.hero-glow { background: radial-gradient(ellipse 60% 54% at 50% 50%, #fff 0%, rgba(255, 255, 255, .97) 46%, rgba(255, 255, 255, 0) 100%); }
@media (max-width: 640px) { .hero-glow { background: radial-gradient(ellipse 120% 56% at 50% 50%, #fff 0%, rgba(255, 255, 255, .97) 52%, rgba(255, 255, 255, 0) 100%); } }

.lib-viewport { overflow: hidden; padding: 2.9rem 0 2.4rem;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent); }
.lib-track { display: flex; width: max-content; animation: lib-slide var(--lib-dur, 48s) linear infinite; will-change: transform; }
.lib-viewport:hover .lib-track, .lib-viewport:focus-within .lib-track, .lib-viewport.is-paused .lib-track { animation-play-state: paused; }
@keyframes lib-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.lib-card { --w: clamp(8rem, 12vw, 11.5rem); position: relative; flex: none; width: var(--w); aspect-ratio: 3 / 4; margin-right: 1.25rem; overflow: hidden; border-radius: 22px; background: #fff; cursor: pointer;
  transform: translateY(var(--y)) rotate(var(--r)); box-shadow: 0 18px 34px -14px rgba(31, 36, 48, .38);
  transition: transform 350ms cubic-bezier(.2, .7, .2, 1), box-shadow 350ms ease; }
.lib-card:hover, .lib-card:focus-visible { transform: translateY(calc(var(--y) - 10px)) rotate(var(--r)) scale(1.04); box-shadow: 0 26px 44px -14px rgba(31, 36, 48, .48); }
.lib-card:focus-visible { outline: 2px solid #8B3F4E; outline-offset: 3px; }
.lib-bubble { position: absolute; top: .35rem; z-index: 5; white-space: nowrap; border-radius: 1rem; padding: .4rem .85rem; font-size: .72rem; font-weight: 600; color: #fff; box-shadow: 0 10px 18px -8px rgba(0, 0, 0, .35); animation: bubble-float 4.5s ease-in-out infinite; }
.lib-bubble::after { content: ''; position: absolute; bottom: -5px; width: 12px; height: 12px; background: inherit; border-radius: 0 0 3px 0; transform: rotate(45deg); }
.lib-bubble-blue { left: max(1rem, 12%); --br: -6deg; background: #4F9DB8; }
.lib-bubble-blue::after { left: 18px; }
.lib-bubble-orange { right: max(1rem, 12%); --br: 6deg; background: #F0A03C; animation-delay: -2s; }
.lib-bubble-orange::after { right: 18px; }
@keyframes bubble-float { 0%, 100% { transform: translateY(0) rotate(var(--br)); } 50% { transform: translateY(-6px) rotate(var(--br)); } }

.lib-modal-enter-active, .lib-modal-leave-active { transition: opacity .22s ease; }
.lib-modal-enter-active .lib-modal-panel, .lib-modal-leave-active .lib-modal-panel { transition: transform .3s cubic-bezier(.2, .7, .2, 1), opacity .22s ease; }
.lib-modal-enter-from, .lib-modal-leave-to { opacity: 0; }
.lib-modal-enter-from .lib-modal-panel, .lib-modal-leave-to .lib-modal-panel { opacity: 0; transform: translateY(24px) scale(.98); }

.cat-viewport { --cat-col: 11rem; --cat-gap: 1.25rem; overflow: hidden; padding: 0 0 .5rem;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); }
@media (min-width: 640px) { .cat-viewport { --cat-col: 13rem; --cat-gap: 1.75rem; } }
.cat-track { display: flex; width: max-content; margin: 0 auto; padding: 0 1.25rem; list-style: none; gap: var(--cat-gap);
  animation: cat-pan var(--cat-dur, 24s) ease-in-out infinite alternate; will-change: transform; }
.cat-viewport:hover .cat-track, .cat-viewport:focus-within .cat-track { animation-play-state: paused; }
@keyframes cat-pan { from { transform: translateX(0); } to { transform: translateX(var(--cat-pan, 0px)); } }
.cat-col { flex: none; width: var(--cat-col); height: 24rem; }
@media (min-width: 640px) { .cat-col { height: 27rem; } }
.cat-tile { aspect-ratio: 5 / 4; display: flex; align-items: center; justify-content: center; border-radius: 1.25rem; box-shadow: 0 1px 2px rgba(0, 0, 0, .05);
  transition: transform 350ms cubic-bezier(.2, .7, .2, 1), box-shadow 350ms ease; }
.group:hover .cat-tile, .group:focus-visible .cat-tile { transform: translateY(-6px); box-shadow: 0 18px 30px -14px rgba(31, 36, 48, .35); }
.cat-cover { height: 84%; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 4px; box-shadow: 0 10px 20px -8px rgba(31, 36, 48, .45); }
.cat-line { position: relative; flex: 1; width: 1px; margin: .9rem 0; background: #d4d4d8; }
.cat-line::before { content: ''; position: absolute; top: -1px; left: 50%; width: 6px; height: 6px; border-top: 1px solid #a1a1aa; border-left: 1px solid #a1a1aa; transform: translateX(-50%) rotate(45deg); }
.cat-pill { white-space: nowrap; border-radius: 9999px; background: #f4f4f5; padding: .6rem 1.5rem; font-size: .875rem; font-weight: 500; color: #3f3f46; transition: background-color .25s ease, color .25s ease; }
.group:hover .cat-pill, .group:focus-visible .cat-pill { background: #F6ECEE; color: #8B3F4E; }
.group:focus-visible .cat-pill { outline: 2px solid #8B3F4E; outline-offset: 3px; }

.reveal { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.2, .7, .2, 1) var(--d, 0ms), transform .8s cubic-bezier(.2, .7, .2, 1) var(--d, 0ms); }
.reveal.is-in { opacity: 1; transform: none; }
.reveal:not(.is-in) .t-star { opacity: 0; transform: scale(.3) rotate(-30deg); }
.reveal.is-in .t-star { animation: star-pop .55s cubic-bezier(.2, .9, .3, 1.4) both; animation-delay: calc(var(--d, 0ms) + 450ms + var(--s, 1) * 90ms); }
@keyframes star-pop { from { opacity: 0; transform: scale(.3) rotate(-30deg); } to { opacity: 1; transform: none; } }
.reveal.is-in .t-avatar { animation: avatar-pop .6s cubic-bezier(.2, .9, .3, 1.3) both; animation-delay: calc(var(--d, 0ms) + 250ms); }
@keyframes avatar-pop { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: none; } }
.reveal.is-in .t-card { animation: t-float 8s ease-in-out 1.4s infinite; animation-delay: calc(1.4s + var(--i, 0) * -3s); }
.reveal.is-in .t-card:hover { animation-play-state: paused; }
@keyframes t-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .hero-track, .lib-track, .lib-bubble, .cat-track, .reveal.is-in .t-card, .reveal.is-in .t-star, .reveal.is-in .t-avatar { animation: none; }
  .reveal, .reveal:not(.is-in) .t-star { opacity: 1; transform: none; transition: none; }
  .lib-card, .cat-tile, .lib-modal-enter-active, .lib-modal-leave-active, .lib-modal-enter-active .lib-modal-panel, .lib-modal-leave-active .lib-modal-panel { transition: none; }
  .lib-viewport, .cat-viewport { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .lib-track > [aria-hidden="true"] { display: none; }
}
</style>