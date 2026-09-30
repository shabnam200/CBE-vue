<script setup>
import { ref, computed, onMounted } from 'vue'
import { categories, me } from '@/data/mock.js'
import Sidebar from '@/Components/Sidebar.vue'
import Toast from '@/Components/Toast.vue'
import { useToast } from '@/composables/useToast'
import { getWishlist, removeFromWishlist as removeFromWishlistApi } from '@/api/modules'
import { sendExchangeRequest } from '@/api'

const { toast, say } = useToast()
const requesting = ref(null)

const wishlistBooks = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedGenre = ref('All genres')
const selectedCondition = ref('Any condition')
const currentSlide = ref(0)
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
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesGenre = selectedGenre.value === 'All genres' || book.genre === selectedGenre.value
    const matchesCondition = selectedCondition.value === 'Any condition' || book.condition === selectedCondition.value
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
  <div class="min-h-screen bg-[#FDFBF7] flex font-sans text-neutral-800">
    <!-- Reusable Sidebar Component with Wishlist Active -->
    <Sidebar currentRoute="Wishlist" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Top Search & Filter Bar -->
      <header class="bg-white border-b border-neutral-100 px-8 py-4 sticky top-0 z-20 flex items-center justify-between gap-4 shadow-xs">
        <div class="flex items-center gap-3 flex-1 max-w-4xl">
          <div class="relative flex-1">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search by title or author" 
              class="w-full bg-[#FDFBF7] border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8B3F4E] transition"
            >
          </div>

          <select v-model="selectedGenre" class="bg-[#FDFBF7] border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none transition">
            <option>All genres</option>
            <option v-for="cat in categories" :key="cat">{{ cat }}</option>
          </select>

          <select v-model="selectedCondition" class="bg-[#FDFBF7] border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none transition">
            <option>Any condition</option>
            <option>Brand New</option>
            <option>Like New</option>
            <option>Good</option>
            <option>Fair</option>
          </select>
        </div>

        <div class="flex items-center gap-4">
          <router-link to="/notifications" aria-label="Notifications" class="w-9 h-9 rounded-full bg-[#FDFBF7] border border-neutral-200 flex items-center justify-center text-neutral-600 relative cursor-pointer hover:bg-neutral-100 transition">
            🔔
            <span class="absolute top-2 right-2 w-2 h-2 bg-[#8B3F4E] rounded-full"></span>
          </router-link>
          <div class="w-9 h-9 rounded-full bg-[#8B3F4E] text-white flex items-center justify-center font-semibold text-xs shadow-sm">
            {{ me.name.substring(0, 2).toUpperCase() }}
          </div>
        </div>
      </header>

      <!-- Wishlist Body Content -->
      <div class="p-8 space-y-6">
        <div class="flex items-center justify-between bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900">Wishlist Books</h1>
            <p class="text-sm text-neutral-500 mt-0.5">Track and request items saved in your collection wishlist seamlessly.</p>
          </div>
          
          <div class="flex items-center gap-3">
            <span class="text-xs px-3 py-1.5 bg-[#FDF2F2] text-[#8B3F4E] rounded-full font-semibold">
              {{ filteredBooks.length }} Items Found
            </span>
            <div class="flex items-center gap-1 bg-[#FDFBF7] border border-neutral-200 rounded-xl p-1">
              <button 
                @click="prevSlide" 
                class="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-white rounded-lg transition shadow-xs"
              >
                Prev
              </button>
              <span class="text-xs text-neutral-400 px-2 font-medium">{{ currentSlide + 1 }} / {{ totalPages }}</span>
              <button 
                @click="nextSlide" 
                class="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-white rounded-lg transition shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-neutral-100 p-16 text-center space-y-3 shadow-xs">
          <div class="text-neutral-400 text-sm">Loading your wishlist items...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredBooks.length === 0" class="bg-white rounded-2xl border border-neutral-100 p-16 text-center space-y-3 shadow-xs">
          <div class="text-5xl">📖</div>
          <h3 class="font-bold text-neutral-800 text-lg">No wishlist books found</h3>
          <p class="text-sm text-neutral-400 max-w-sm mx-auto">Try clearing your filters or search keywords to view available saved items.</p>
        </div>

        <!-- Animated Wishlist Cards Grid -->
        <TransitionGroup 
          v-else
          tag="div" 
          name="card-swap" 
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative"
        >
          <div 
            v-for="book in paginatedBooks" 
            :key="book.id" 
            class="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group transform hover:-translate-y-1"
          >
            <div>
              <!-- Book Image Container -->
              <div class="relative h-64 bg-neutral-100 overflow-hidden">
                <img :src="book.image_url" :alt="book.title" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                
                <!-- Type Tag Badge -->
                <span class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-neutral-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs uppercase">
                  {{ book.availability_type }}
                </span>

                <!-- Availability Badge -->
                <span :class="book.available ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'" class="absolute bottom-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                  {{ book.available ? 'Available' : 'Requested Out' }}
                </span>
              </div>

              <!-- Book Information -->
              <div class="p-4 space-y-1">
                <span class="text-xs text-[#8B3F4E] font-semibold uppercase tracking-wider">{{ book.genre }}</span>
                <h3 class="font-bold text-neutral-900 truncate text-base">{{ book.title }}</h3>
                <p class="text-xs text-neutral-500 font-medium">{{ book.author }}</p>
                <p class="text-xs text-neutral-400 pt-1">Condition: <span class="text-neutral-700 font-semibold">{{ book.condition }}</span></p>
                <p class="text-[11px] text-neutral-400">Owner: <span class="text-neutral-600 font-medium">{{ book.owner.name }}</span> ({{ book.owner.city }})</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="p-4 pt-0 flex items-center gap-2">
              <button 
                :disabled="!book.available || requesting === book.id"
                @click="requestBook(book)"
                class="flex-1 bg-[#8B3F4E] hover:bg-[#6F2F3D] disabled:bg-neutral-200 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-xs"
              >
                {{ requesting === book.id ? 'Sending...' : 'Request Book' }}
              </button>
              <button 
                @click="removeFromWishlist(book.id)"
                class="px-3 py-2.5 border border-neutral-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-neutral-500 text-xs rounded-xl transition shadow-xs"
                title="Remove from wishlist"
              >
                🗑️
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </main>
    <Toast :message="toast" />
  </div>
</template>

<style scoped>
.card-swap-move,
.card-swap-enter-active,
.card-swap-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-swap-enter-from,
.card-swap-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.card-swap-leave-active {
  position: absolute;
  width: 100%;
}
</style>