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
const authModalOpen = ref(false)
const authMode = ref('login')
const authLoading = ref(false)
const authError = ref('')
const fieldErrors = ref({})
const pendingGenre = ref('')
const loggingOut = ref(false)
const loginForm = ref({ email: '', password: '' })
const registerForm = ref({ name: '', email: '', city: '', password: '', password_confirmation: '', profile_photo: null })
const authCloseBtn = ref(null)
const authDialog = ref(null)
let authLastFocus = null
const catalog = ref([...mockBooks]) // mock first, replaced by API books when they load
const email = ref('')
const isAuthenticated = computed(() => Boolean(auth.user))
const year = new Date().getFullYear()

const navLinks = [['Home', '#top'], ['Library', '#library'], ['Categories', '#categories'], ['How it works', '#how']]

const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }
const availabilityLabel = { exchange: 'Exchange', donate: 'Donate (free)', lend: 'Lend' }
const cta = { exchange: 'Request exchange', donate: 'Request this book', lend: 'Request to borrow' }

const openAuthModal = (mode) => {
  authLastFocus = document.activeElement
  menuOpen.value = false
  authMode.value = mode
  authError.value = ''
  fieldErrors.value = {}
  authModalOpen.value = true
  nextTick(() => authCloseBtn.value?.focus())
}
const goToLogin = () => openAuthModal('login')
const goToRegister = () => openAuthModal('register')
const switchAuthMode = (mode) => {
  authMode.value = mode
  authError.value = ''
  fieldErrors.value = {}
}
const closeAuthModal = () => {
  authModalOpen.value = false
  pendingGenre.value = ''
  nextTick(() => { authLastFocus?.focus?.(); authLastFocus = null })
}
const goToDashboard = () => router.push('/dashboard')
const goToExplore = () => router.push('/dashboard')
async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
    menuOpen.value = false
    await router.push('/')
  } finally {
    loggingOut.value = false
  }
}

const handleProfilePhoto = (event) => {
  registerForm.value.profile_photo = event.target.files?.[0] || null
}

async function submitAuth(request) {
  authLoading.value = true
  authError.value = ''
  fieldErrors.value = {}
  try {
    await request()
    const genre = pendingGenre.value
    const destination = auth.user?.role === 'admin'
      ? '/admin'
      : genre ? { path: '/dashboard', query: { genre } } : '/dashboard'
    closeAuthModal()
    await router.push(destination)
  } catch (error) {
    fieldErrors.value = error?.response?.data?.errors || error?.errors || {}
    authError.value = error?.response?.data?.message || error?.message || 'Could not complete your request. Please try again.'
  } finally {
    authLoading.value = false
  }
}

const handleLogin = () => submitAuth(() => auth.login(loginForm.value))
const handleRegister = () => submitAuth(() => auth.register(registerForm.value))

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

watch([authModalOpen, selectedBook], ([authOpen, book]) => {
  document.body.style.overflow = authOpen || book ? 'hidden' : ''
})

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
function trapAuthFocus(e) {
  const nodes = authDialog.value?.querySelectorAll('button:not([disabled]), input:not([disabled])')
  if (!nodes?.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
const onKey = (e) => {
  if (e.key !== 'Escape') return
  if (authModalOpen.value) closeAuthModal()
  else if (selectedBook.value) closeBook()
}

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
function requestBook() {
  if (!isAuthenticated.value) {
    closeBook()
    openAuthModal('login')
    return
  }
  closeBook()
  router.push('/dashboard')
}

/* ---------- Explore by category: staggered tiles that glide left and right ---------- */
const cats = computed(() => {
  const list = catalog.value.filter(Boolean)
  let names = categories.filter((c) => list.some((b) => b.genre === c))
  if (!names.length) names = [...new Set(list.map((b) => b.genre).filter(Boolean))] // API genres differ from mock
  return names.slice(0, 8).map((c) => ({ name: c, cover: list.find((b) => b.genre === c), count: list.filter((b) => b.genre === c).length }))
})
function openCategory(name) {
  if (!isAuthenticated.value) {
    pendingGenre.value = name
    openAuthModal('login')
    return
  }
  router.push({ path: '/dashboard', query: { genre: name } })
}
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

/* ---------- How it works ---------- */
const journey = [
  { n: 1, title: 'List your books', text: 'Add a photo, the condition, and whether you want to exchange, donate or lend.',
    d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20M12 7v6M9 10h6',
    node: { left: '17%', top: '62.4%' }, box: { left: '3%', top: '9%', width: '27%' }, big: { left: '25%', top: '3%' } },
  { n: 2, title: 'Send a request', text: 'Find a book you want and ask its owner. They accept or decline.',
    d: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13',
    node: { left: '50%', top: '22.6%' }, box: { left: '38%', top: '46%', width: '24%' }, big: { left: '58%', top: '40%' } },
  { n: 3, title: 'Chat and rate', text: 'Once accepted, chat to plan the handover, then rate each other to build trust.',
    d: 'M7.9 20A9 9 0 1 0 4 16.1L2 22ZM9 11.5h.01M12.5 11.5h.01M16 11.5h.01',
    node: { left: '83%', top: '48.8%' }, box: { left: '71%', top: '68%', width: '24%' }, big: { left: '89%', top: '60%' } },
]
const posOf = (o) => ({ left: o.left, top: o.top })
const boxOf = (o) => ({ left: o.left, top: o.top, width: o.width })

/* ---------- Reader stories (numbers come from the data, not hard-coded) ---------- */
const avgRating = computed(() => testimonials.reduce((sum, t) => sum + (t.rating || 5), 0) / (testimonials.length || 1))
const cityCount = computed(() => new Set(catalog.value.map((b) => b?.owner?.city).filter(Boolean)).size)
const readerStats = computed(() => [
  [catalog.value.length, 'Books to share'],
  [avgRating.value.toFixed(1), 'Average rating'],
  [cityCount.value, 'Cities connected'],
])
const perks = [
  { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', title: 'Wishlist alerts', text: 'Save the books you want. You get a notification the moment one is listed.' },
  { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', title: 'Ratings you can trust', text: 'Every completed exchange is rated, so you know who you are dealing with.' },
  { d: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z', title: 'Private chat', text: 'Plan the handover in the app. No need to share your phone number.' },
  { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', title: 'Readers in your city', text: 'Filter by city and find books just a short trip away.' },
]

const initials = (n) => String(n || '?').split(' ').map((p) => p[0]).slice(0, 2).join('')
const join = () => {
  router.push({ path: '/register', query: email.value ? { email: email.value } : {} })
}
</script>

<template>
  <Head title="Book Haven - Community Book Exchange" />
  <div class="min-h-screen overflow-x-clip bg-white font-sans text-ink">

    <!-- Navbar -->
    <header class="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <nav class="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] h-[4.3rem] items-center px-5 sm:px-8">
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
          <template v-else>
            <button type="button" @click="goToDashboard" class="rounded-lg bg-brand px-4 py-2 text-white shadow-sm transition-colors hover:bg-brand-dark">Dashboard</button>
            <button type="button" @click="handleLogout" :disabled="loggingOut" class="rounded-lg border border-black/15 px-4 py-2 text-neutral-700 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-60">{{ loggingOut ? 'Logging out...' : 'Logout' }}</button>
          </template>
          <button class="rounded-lg p-2 text-neutral-700 hover:bg-brand-soft md:hidden" :aria-expanded="menuOpen" aria-label="Menu" @click="menuOpen = !menuOpen">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" /><path v-else d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </nav>
      <div v-if="menuOpen" class="border-t border-black/5 bg-white px-5 py-3 md:hidden">
        <a v-for="[t, h] in navLinks" :key="t" :href="h" class="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand" @click="menuOpen = false">{{ t }}</a>
        <button v-if="!isAuthenticated" type="button" @click="goToLogin" class="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-soft hover:text-brand sm:hidden">Log in</button>
        <button v-if="isAuthenticated" type="button" @click="handleLogout" :disabled="loggingOut" class="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-60">{{ loggingOut ? 'Logging out...' : 'Logout' }}</button>
      </div>
    </header>

    <!-- Hero: full viewport height -->
    <section id="top" class="landing-hero relative isolate flex flex-col justify-center overflow-hidden">
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
    <section v-reveal id="library" class="landing-section">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="leading-[1.05] tracking-tight">
          <!-- <span class="block font-sans text-2xl font-normal sm:text-4xl">Our Library</span> -->
          <span class="block font-display text-3xl font-bold uppercase sm:text-5xl">Our Library</span>
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
    <section v-reveal id="categories" class="landing-section border-y border-black/5 bg-paper">
      <div class="mx-auto max-w-6xl px-5 text-center">
        <h2 class="font-display text-3xl font-medium tracking-tight sm:text-5xl">Explore By Category</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Pick a genre and see what your neighbours are sharing.</p>
      </div>
      <div v-if="cats.length" ref="catViewport" class="cat-viewport mx-auto mt-10 max-w-6xl" role="region" aria-label="Book categories">
        <ul ref="catTrack" class="cat-track" :style="catStyle">
          <li v-for="(c, i) in cats" :key="c.name" class="cat-col">
            <a href="#" @click.prevent="openCategory(c.name)" class="group flex h-full flex-col items-center focus-visible:outline-none" :aria-label="`${c.name}, ${c.count} ${c.count === 1 ? 'book' : 'books'}`">
              <div class="cat-tile" :style="{ width: catWidths[i % catWidths.length], marginTop: catOffsets[i % catOffsets.length] + 'px', background: catTints[i % catTints.length] }">
                <div class="cat-cover"><BookCover :book="c.cover" /></div>
              </div>
              <span class="cat-line" aria-hidden="true"></span>
              <span class="cat-pill">{{ c.name }}</span>
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- How it works: wave path with three steps -->
    <section v-reveal id="how" class="landing-section">
      <div class="mx-auto w-full max-w-6xl px-5">
        <div class="text-center">
          <span class="inline-block rounded-full bg-brand-soft px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand">Simple as 1-2-3</span>
          <h2 class="mt-4 font-display text-3xl font-medium tracking-tight sm:text-5xl">How It Works</h2>
        </div>

        <!-- Desktop: winding path -->
        <div v-reveal class="relative mx-auto mt-8 hidden aspect-[1000/420] w-full max-w-4xl lg:block">
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 1000 420" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="how-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#8B3F4E" stop-opacity=".25" />
                <stop offset=".2" stop-color="#8B3F4E" />
                <stop offset=".85" stop-color="#8B3F4E" />
                <stop offset="1" stop-color="#8B3F4E" stop-opacity=".25" />
              </linearGradient>
            </defs>
            <path d="M0,225 C70,255 110,275 170,272 S380,105 500,105 S630,265 720,260 S790,215 830,215 S940,190 1000,200" stroke="#1F2430" stroke-opacity=".06" stroke-width="10" stroke-linecap="round" />
            <path class="how-path" pathLength="1" d="M0,215 C70,245 110,265 170,262 S380,95 500,95 S630,255 720,250 S790,205 830,205 S940,180 1000,190" stroke="url(#how-grad)" stroke-width="3" stroke-linecap="round" />
          </svg>

          <template v-for="(s, i) in journey" :key="s.n">
            <span aria-hidden="true" class="pointer-events-none absolute select-none font-display text-[8rem] font-bold leading-none text-brand/[0.07]" :style="posOf(s.big)">{{ s.n }}</span>
            <div class="absolute z-10 -translate-x-1/2 -translate-y-1/2" :style="posOf(s.node)">
              <span class="how-node how-hex relative flex h-[4.5rem] w-[4.5rem] items-center justify-center" :style="{ '--n': i }">
                <span class="hex absolute inset-0 bg-brand/15"></span>
                <span class="hex absolute inset-[5px] flex items-center justify-center bg-white text-brand">
                  <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="s.d" /></svg>
                </span>
              </span>
            </div>
            <div class="how-text absolute z-10 text-center" :style="{ ...boxOf(s.box), '--n': i }">
              <h3 class="font-display text-lg font-semibold">{{ s.title }}</h3>
              <p class="mt-1.5 text-sm leading-relaxed text-neutral-500">{{ s.text }}</p>
            </div>
          </template>
        </div>

        <!-- Mobile / tablet: vertical path -->
        <!-- <ol class="relative mx-auto mt-8 max-w-md space-y-8 lg:hidden">
          <span aria-hidden="true" class="absolute bottom-10 left-9 top-10 w-px -translate-x-1/2 border-l-2 border-dashed border-brand/25"></span>
          <li v-for="s in journey" :key="s.n" class="relative flex items-start gap-5">
            <span class="how-hex relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center">
              <span class="hex absolute inset-0 bg-brand/15"></span>
              <span class="hex absolute inset-[5px] flex items-center justify-center bg-white text-brand">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="s.d" /></svg>
              </span>
            </span>
            <div class="relative min-w-0 pt-1">
              <span aria-hidden="true" class="pointer-events-none absolute -top-3 right-0 select-none font-display text-7xl font-bold leading-none text-brand/[0.07]">{{ s.n }}</span>
              <h3 class="relative font-display text-lg font-semibold">{{ s.title }}</h3>
              <p class="relative mt-1 text-sm leading-relaxed text-neutral-500">{{ s.text }}</p>
            </div>
          </li>
        </ol>

        <!-- Perks -->
        <!-- <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="p in perks" :key="p.title" class="flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 transition-shadow hover:shadow-lg">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="p.d" /></svg>
            </span>
            <div class="min-w-0">
              <h3 class="text-sm font-medium">{{ p.title }}</h3>
              <p class="mt-0.5 text-xs leading-relaxed text-neutral-500">{{ p.text }}</p>
            </div>
          </div>
        </div>-->
      </div> 
    </section>  

    <!-- Reader stories -->
    <section v-reveal id="readers" class="landing-section overflow-hidden border-t border-black/5 bg-paper">
      <div class="mx-auto w-full max-w-6xl px-5">
        <div class="text-center">
          <span v-reveal class="inline-block rounded-full bg-brand-soft px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand">Reader stories</span>
          <h2 v-reveal="80" class="mt-4 font-display text-3xl font-medium tracking-tight sm:text-5xl">What Our Readers Say</h2>
          <p v-reveal="160" class="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">Real swaps, donations and loans between neighbours who love books.</p>
          <dl v-reveal="240" class="mx-auto mt-6 inline-flex divide-x divide-black/10 rounded-2xl border border-black/5 bg-white py-3 shadow-sm">
            <div v-for="[v, l] in readerStats" :key="l" class="px-5 text-center sm:px-8">
              <dd class="font-display text-xl font-semibold text-brand sm:text-2xl">{{ v }}</dd>
              <dt class="text-[11px] text-neutral-500 sm:text-xs">{{ l }}</dt>
            </div>
          </dl>
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <figure v-for="(t, i) in testimonials" :key="t.id || t.name" v-reveal="120 + i * 120" :style="{ '--i': i }" :class="i === 0 ? 'md:col-span-2 lg:col-span-1 lg:row-span-2' : ''">
            <div class="t-card relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-shadow duration-300 hover:shadow-xl" :class="i === 0 ? 'justify-between border-brand-dark bg-brand text-white' : 'border-black/5 bg-white'">
              <svg class="pointer-events-none absolute -right-1 -top-2 h-24 w-24" :class="i === 0 ? 'text-white/10' : 'text-brand/[0.07]'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.6 4C5.9 5.6 3 8.9 3 13.2V20h7.4v-7.2H6.6c.1-2.5 1.5-4.3 4-5.6L9.6 4Zm10 0c-3.7 1.6-6.6 4.9-6.6 9.2V20h7.4v-7.2h-3.8c.1-2.5 1.5-4.3 4-5.6L19.6 4Z" /></svg>
              <div class="relative">
                <span class="flex gap-0.5" :class="i === 0 ? 'text-[#F3C77E]' : 'text-[#B07D3A]'" role="img" :aria-label="`${t.rating || 5} out of 5 stars`">
                  <svg v-for="n in 5" :key="n" class="t-star h-4 w-4" :class="n <= (t.rating || 5) ? '' : 'opacity-25'" :style="{ '--s': n }" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </span>
                <blockquote class="mt-4 leading-relaxed" :class="i === 0 ? 'font-display text-xl sm:text-2xl' : 'text-sm text-neutral-700'">{{ t.text ?? t.content }}</blockquote>
                <span v-if="t.book" class="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium" :class="i === 0 ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand'">
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                  {{ t.book }}
                </span>
              </div>
              <figcaption class="relative mt-5 flex items-center gap-3 border-t pt-4" :class="i === 0 ? 'border-white/15' : 'border-black/5'">
                <span class="t-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold" :class="i === 0 ? 'bg-white text-brand' : 'bg-brand text-white'">{{ initials(t.name) }}</span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ t.name }}</span>
                  <span class="block truncate text-xs" :class="i === 0 ? 'text-white/70' : 'text-neutral-500'">{{ t.role }}<template v-if="t.city"> · {{ t.city }}</template></span>
                </span>
              </figcaption>
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
                <button type="button" @click="requestBook" class="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2">
                  {{ cta[selectedBook.availability_type] || 'Send request' }}
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </button>
                <button type="button" class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" @click="closeBook">Close</button>
              </div>
              <p v-if="!isAuthenticated" class="mt-3 text-xs text-neutral-500">You will be asked to log in or create a free account first.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Login and registration popup -->
    <Transition name="lib-modal">
      <div v-if="authModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" @click.self="closeAuthModal">
        <div ref="authDialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" class="lib-modal-panel relative my-auto w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8" :class="authMode === 'register' ? 'max-h-[92vh]' : 'max-h-[85vh]'" @keydown.tab="trapAuthFocus">
          <button ref="authCloseBtn" type="button" class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Close" @click="closeAuthModal">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>

          <div class="pr-10">
            <p class="text-xs font-semibold uppercase tracking-wider text-brand">Book Haven</p>
            <h2 id="auth-dialog-title" class="mt-1 font-display text-2xl font-semibold text-ink">{{ authMode === 'login' ? 'Welcome back' : 'Create your account' }}</h2>
            <p class="mt-1 text-sm text-neutral-500">{{ authMode === 'login' ? 'Log in to continue sharing books.' : 'Join readers sharing books in their communities.' }}</p>
          </div>

          <div class="mt-6 grid grid-cols-2 border-b border-black/10">
            <button type="button" class="border-b-2 pb-3 text-sm font-semibold transition-colors" :class="authMode === 'login' ? 'border-brand text-brand' : 'border-transparent text-neutral-400 hover:text-neutral-700'" @click="switchAuthMode('login')">Log in</button>
            <button type="button" class="border-b-2 pb-3 text-sm font-semibold transition-colors" :class="authMode === 'register' ? 'border-brand text-brand' : 'border-transparent text-neutral-400 hover:text-neutral-700'" @click="switchAuthMode('register')">Register</button>
          </div>

          <form v-if="authMode === 'login'" class="mt-5 space-y-4" @submit.prevent="handleLogin">
            <label class="block text-sm font-medium text-neutral-700">
              Email address
              <input v-model="loginForm.email" type="email" required autocomplete="email" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="you@example.com" />
              <span v-if="fieldErrors.email" class="mt-1 block text-xs text-red-600">{{ fieldErrors.email[0] }}</span>
            </label>
            <label class="block text-sm font-medium text-neutral-700">
              Password
              <input v-model="loginForm.password" type="password" required autocomplete="current-password" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="Your password" />
              <span v-if="fieldErrors.password" class="mt-1 block text-xs text-red-600">{{ fieldErrors.password[0] }}</span>
            </label>
            <p v-if="authError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ authError }}</p>
            <button type="submit" :disabled="authLoading" class="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60">
              {{ authLoading ? 'Logging in...' : 'Log in' }}
            </button>
          </form>

          <form v-else class="mt-5 space-y-4" @submit.prevent="handleRegister">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-medium text-neutral-700">
                Full name
                <input v-model="registerForm.name" type="text" required autocomplete="name" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="Your full name" />
                <span v-if="fieldErrors.name" class="mt-1 block text-xs text-red-600">{{ fieldErrors.name[0] }}</span>
              </label>
              <label class="block text-sm font-medium text-neutral-700">
                Email address
                <input v-model="registerForm.email" type="email" required autocomplete="email" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="you@example.com" />
                <span v-if="fieldErrors.email" class="mt-1 block text-xs text-red-600">{{ fieldErrors.email[0] }}</span>
              </label>
              <label class="block text-sm font-medium text-neutral-700">
                Location
                <input v-model="registerForm.city" type="text" required autocomplete="address-level2" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="City or town" />
                <span v-if="fieldErrors.city" class="mt-1 block text-xs text-red-600">{{ fieldErrors.city[0] }}</span>
              </label>
              <label class="block text-sm font-medium text-neutral-700">
                Profile image <span class="font-normal text-neutral-400">(optional)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="handleProfilePhoto" class="mt-1.5 block w-full text-xs text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-medium file:text-brand hover:file:bg-brand/15" />
                <span v-if="registerForm.profile_photo" class="mt-1 block truncate text-xs text-neutral-500">{{ registerForm.profile_photo.name }}</span>
                <span v-if="fieldErrors.profile_photo" class="mt-1 block text-xs text-red-600">{{ fieldErrors.profile_photo[0] }}</span>
              </label>
              <label class="block text-sm font-medium text-neutral-700">
                Password
                <input v-model="registerForm.password" type="password" required minlength="8" autocomplete="new-password" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="At least 8 characters" />
                <span v-if="fieldErrors.password" class="mt-1 block text-xs text-red-600">{{ fieldErrors.password[0] }}</span>
              </label>
              <label class="block text-sm font-medium text-neutral-700">
                Confirm password
                <input v-model="registerForm.password_confirmation" type="password" required autocomplete="new-password" class="mt-1.5 block w-full rounded-lg border border-black/15 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" placeholder="Enter password again" />
                <span v-if="fieldErrors.password_confirmation" class="mt-1 block text-xs text-red-600">{{ fieldErrors.password_confirmation[0] }}</span>
              </label>
            </div>
            <p v-if="authError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ authError }}</p>
            <button type="submit" :disabled="authLoading" class="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60">
              {{ authLoading ? 'Creating account...' : 'Create account' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
html { scroll-behavior: smooth; }

/* Sticky header = 4.3rem + 1px border. Every section fills the screen below it and stops exactly under it,
   so jumping to a section from the menu never shows a piece of the neighbouring section. */
:root { --hdr: calc(4.3rem + 1px); }
.landing-hero { height: calc(100svh - var(--hdr)); min-height: 34rem; scroll-margin-top: var(--hdr); }
.landing-section { min-height: calc(100svh - var(--hdr)); scroll-margin-top: var(--hdr); padding-block: clamp(3rem, 9vh, 6rem); display: flex; flex-direction: column; justify-content: center; }

.hex { clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%); }
.how-hex { filter: drop-shadow(0 12px 12px rgba(139, 63, 78, .28)); }
.how-path { stroke-dasharray: 1; stroke-dashoffset: 1; }
.reveal.is-in .how-path { animation: how-draw 2.2s cubic-bezier(.4, 0, .2, 1) .3s forwards; }
@keyframes how-draw { to { stroke-dashoffset: 0; } }
.reveal.is-in .how-node { animation: avatar-pop .6s cubic-bezier(.2, .9, .3, 1.3) both; animation-delay: calc(.5s + var(--n, 0) * .55s); }
.reveal.is-in .how-text { animation: how-rise .7s ease both; animation-delay: calc(.7s + var(--n, 0) * .55s); }
@keyframes how-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.reveal:not(.is-in) .how-text, .reveal:not(.is-in) .how-node { opacity: 0; }

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
  .how-path { stroke-dashoffset: 0; animation: none !important; }
  .reveal.is-in .how-node, .reveal.is-in .how-text { animation: none; }
  .hero-track, .lib-track, .lib-bubble, .cat-track, .reveal.is-in .t-card, .reveal.is-in .t-star, .reveal.is-in .t-avatar { animation: none; }
  .reveal, .reveal:not(.is-in) .t-star { opacity: 1; transform: none; transition: none; }
  .lib-card, .cat-tile, .lib-modal-enter-active, .lib-modal-leave-active, .lib-modal-enter-active .lib-modal-panel, .lib-modal-leave-active .lib-modal-panel { transition: none; }
  .lib-viewport, .cat-viewport { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
  .lib-track > [aria-hidden="true"] { display: none; }
}
</style>