<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { categories } from '@/data/mock.js'
import AppLayout from '@/Layouts/AppLayout.vue'
import BookCover from '@/Components/BookCover.vue'
import Toast from '@/Components/Toast.vue'
import { useToast } from '@/composables/useToast'
import { getWishlist, removeFromWishlist as removeFromWishlistApi } from '@/api/modules'
import { sendExchangeRequest } from '@/api'
import { CONDITIONS } from '@/bookApi'

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
const itemsPerSlide = 4

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

const totalPages = computed(() => Math.ceil(filteredBooks.value.length / itemsPerSlide) || 1)

const paginatedBooks = computed(() => {
  const start = currentSlide.value * itemsPerSlide
  return filteredBooks.value.slice(start, start + itemsPerSlide)
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
    say(`Request sent to ${book.owner?.name || 'the owner'}.`)
  } catch {
    say('Could not send the request. Please try again.')
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
    <template #actions>
      <span class="hidden rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand sm:inline">{{ filteredBooks.length }} saved</span>
      <div class="flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
        <button type="button" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-brand-soft hover:text-brand" @click="prevSlide">Prev</button>
        <span class="px-1 text-xs font-medium text-neutral-400">{{ currentSlide + 1 }} / {{ totalPages }}</span>
        <button type="button" class="rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-brand-soft hover:text-brand" @click="nextSlide">Next</button>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="overflow-hidden rounded-2xl border border-black/5 bg-white"><div class="skeleton h-64"></div><div class="space-y-2 p-4"><div class="skeleton h-3 w-16 rounded"></div><div class="skeleton h-4 w-32 rounded"></div><div class="skeleton h-3 w-24 rounded"></div></div></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredBooks.length === 0" class="animate-fade-up space-y-3 rounded-2xl border border-black/5 bg-white p-16 text-center shadow-sm">
      <div class="text-5xl">📖</div>
      <h3 class="text-lg font-bold text-neutral-800">No wishlist books found</h3>
      <p class="mx-auto max-w-sm text-sm text-neutral-400">Try clearing your filters or search keywords, or save books from the Home page with the heart icon.</p>
    </div>

    <!-- Cards -->
    <TransitionGroup v-else tag="div" name="grid-list" class="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="(book, i) in paginatedBooks" :key="book.id" class="reveal lift group flex flex-col justify-between overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm" :style="{ '--i': i }">
        <div>
          <div class="relative h-64 overflow-hidden bg-neutral-100">
            <div class="h-full w-full transition duration-500 group-hover:scale-105"><BookCover :book="book" /></div>
            <span class="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase text-neutral-800 shadow-sm backdrop-blur-sm">{{ book.availability_type }}</span>
            <span :class="book.available ? 'bg-emerald-600' : 'bg-amber-600'" class="absolute bottom-3 left-3 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">{{ book.available ? 'Available' : 'Requested Out' }}</span>
          </div>
          <div class="space-y-1 p-4">
            <span class="text-xs font-semibold uppercase tracking-wider text-brand">{{ book.genre }}</span>
            <h3 class="truncate text-base font-bold text-neutral-900">{{ book.title }}</h3>
            <p class="text-xs font-medium text-neutral-500">{{ book.author }}</p>
            <p class="pt-1 text-xs text-neutral-400">Condition: <span class="font-semibold text-neutral-700">{{ book.condition }}</span></p>
            <p v-if="book.owner" class="text-[11px] text-neutral-400">Owner: <span class="font-medium text-neutral-600">{{ book.owner.name }}</span> ({{ book.owner.city }})</p>
          </div>
        </div>
        <div class="flex items-center gap-2 p-4 pt-0">
          <button :disabled="!book.available || requesting === book.id" class="flex-1 rounded-xl bg-brand py-2.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark active:scale-[.97] disabled:bg-neutral-200" @click="requestBook(book)">{{ requesting === book.id ? 'Sending...' : 'Request Book' }}</button>
          <button class="rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600" title="Remove from wishlist" aria-label="Remove from wishlist" @click="removeFromWishlist(book.id)">🗑️</button>
        </div>
      </div>
    </TransitionGroup>

    <template #overlay><Toast :message="toast" /></template>
  </AppLayout>
</template>
