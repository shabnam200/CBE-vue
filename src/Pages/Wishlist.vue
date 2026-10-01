<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { categories } from '@/data/mock.js'
import AppLayout from '@/Layouts/AppLayout.vue'
import BookCover from '@/Components/BookCover.vue'
import Toast from '@/Components/Toast.vue'
import { useToast } from '@/composables/useToast'
import { getWishlist, removeFromWishlist as removeFromWishlistApi } from '@/api/modules'
import { sendExchangeRequest } from '@/api'
import { apiError, CONDITIONS } from '@/bookApi'

const { toast, say } = useToast()
const requesting = ref(null)

const wishlistBooks = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const filters = ref({ genre: '', condition: '' })
const filterDefs = [
  { key: 'genre', label: 'All genres', options: categories.map((c) => ({ value: c, label: c })) },
  { key: 'condition', label: 'Any condition', options: CONDITIONS },
]
const slug = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_')
const currentSlide = ref(0)
watch([searchQuery, filters], () => (currentSlide.value = 0), { deep: true })
const itemsPerPage = 12

const fetchWishlistData = async () => {
  isLoading.value = true
  try {
    wishlistBooks.value = (await getWishlist()).data
  } catch (error) {
    say('Could not load your wishlist. Please try again.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchWishlistData()
})

const filteredBooks = computed(() => {
  return wishlistBooks.value.filter(book => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q || book.title.toLowerCase().includes(q) || (book.author || '').toLowerCase().includes(q)
    const matchesGenre = !filters.value.genre || book.genre === filters.value.genre
    const matchesCondition = !filters.value.condition || slug(book.condition) === filters.value.condition
    return matchesSearch && matchesGenre && matchesCondition
  })
})

const totalPages = computed(() => Math.ceil(filteredBooks.value.length / itemsPerPage) || 1)

const paginatedBooks = computed(() => {
  const start = currentSlide.value * itemsPerPage
  return filteredBooks.value.slice(start, start + itemsPerPage)
})

const nextSlide = () => {
  if (currentSlide.value < totalPages.value - 1) {
    currentSlide.value++
  } else {
    currentSlide.value = 0
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  } else {
    currentSlide.value = totalPages.value - 1
  }
}

const removeFromWishlist = async (id) => {
  try {
    await removeFromWishlistApi(id)
  } catch {
    return say('Could not remove the book. Please try again.')
  }
  wishlistBooks.value = wishlistBooks.value.filter(book => book.id !== id)
  if (currentSlide.value >= totalPages.value && currentSlide.value > 0) {
    currentSlide.value--
  }
  say('Removed from your wishlist.')
}

const requestBook = async (book) => {
  requesting.value = book.id
  try {
    await sendExchangeRequest(book.id)
    book.available = false
    say(`Request sent to ${book.owner?.name || 'the owner'}.`)
  } catch (error) {
    say(apiError(error, 'Could not send the request. Please try again.'))
  } finally {
    requesting.value = null
  }
}
</script>

<template>
  <AppLayout
    current="Wishlist"
    title="Wishlist"
    subtitle="Books you saved. Request them when they are available."
    v-model:search="searchQuery"
    search-placeholder="Search your wishlist"
    :filters="filterDefs"
    v-model:filter-values="filters"
  >
    <template #filter-actions>
      <span class="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{{ filteredBooks.length }} saved</span>
    </template>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <div v-for="i in 6" :key="i"><div class="skeleton aspect-[3/4] rounded-xl"></div><div class="skeleton mt-2 h-3 w-20 rounded"></div></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredBooks.length === 0" class="animate-fade-up space-y-3 rounded-2xl border border-black/5 bg-white p-16 text-center shadow-sm">
      <div class="text-5xl">📖</div>
      <h3 class="text-lg font-bold text-neutral-800">No wishlist books found</h3>
      <p class="mx-auto max-w-sm text-sm text-neutral-400">Try clearing your filters or search keywords, or save books from the Home page with the heart icon.</p>
    </div>

    <!-- Cards -->
    <section v-else class="space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-8">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-display text-base font-semibold text-ink">Saved books</h2>
        <div v-if="totalPages > 1" class="flex items-center gap-2">
          <span class="text-xs tabular-nums text-neutral-500">{{ currentSlide + 1 }} / {{ totalPages }}</span>
          <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-40" :disabled="currentSlide === 0" aria-label="Previous saved books" @click="prevSlide">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-40" :disabled="currentSlide >= totalPages - 1" aria-label="Next saved books" @click="nextSlide">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <TransitionGroup tag="div" name="grid-list" class="relative grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <article v-for="(book, i) in paginatedBooks" :key="book.id" class="reveal lift group min-w-0" :style="{ '--i': Math.min(i, 12) }">
          <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-sm transition-shadow duration-300 group-hover:shadow-lg">
            <div class="h-full w-full transition-transform duration-500 group-hover:scale-105"><BookCover :book="book" /></div>
            <span class="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-brand shadow-sm">{{ book.availability_type }}</span>
            <span :class="book.available ? 'bg-emerald-700' : 'bg-amber-600'" class="absolute bottom-1.5 left-1.5 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">{{ book.available ? 'Available' : 'Requested' }}</span>
          </div>
          <p class="mt-1.5 truncate text-xs font-medium">{{ book.title }}</p>
          <p class="truncate text-[10px] text-neutral-500">{{ book.author }}</p>
          <p class="mt-1 truncate text-[10px] text-neutral-500">{{ book.genre }} · {{ book.condition }}</p>
          <p v-if="book.owner" class="truncate text-[10px] text-neutral-500">{{ book.owner.name }} · {{ book.owner.city }}</p>
          <div class="mt-2 flex gap-2">
            <button :disabled="!book.available || requesting === book.id" class="flex-1 rounded-lg bg-brand py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark active:scale-[.97] disabled:bg-neutral-200" @click="requestBook(book)">{{ requesting === book.id ? 'Sending…' : book.available ? 'Request book' : 'Requested' }}</button>
            <button class="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Remove from wishlist" aria-label="Remove from wishlist" @click="removeFromWishlist(book.id)">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></svg>
            </button>
          </div>
        </article>
      </TransitionGroup>
    </section>

    <template #overlay><Toast :message="toast" /></template>
  </AppLayout>
</template>
