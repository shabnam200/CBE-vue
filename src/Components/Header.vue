<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

defineProps({
  search: { type: String, default: '' },
  genre: { type: String, default: '' },
  condition: { type: String, default: '' },
  availability: { type: String, default: '' },
  nearMe: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  CONDITIONS: { type: Array, default: () => [] },
  AVAILABILITY: { type: Array, default: () => [] },
  unread: { type: Number, default: 0 },
  notes: { type: Array, default: () => [] },
  bellOpen: { type: Boolean, default: false },
  me: { type: Object, default: () => ({ name: '' }) }
})

defineEmits([
  'update:search', 
  'update:genre', 
  'update:condition', 
  'update:availability', 
  'update:nearMe', 
  'toggle-bell'
])

// Define which pages/routes need book searching and filtering options
// e.g., 'dashboard', 'home', 'explore' etc. (tomar route name onujayi ekhane add/change kore nite paro)
const showBookFilters = computed(() => {
  const currentRouteName = route.name ? route.name.toLowerCase() : ''
  const currentPath = route.path ? route.path.toLowerCase() : ''
  
  // Je page gula te book search dorkar, sekhaner name/path ekhane thakbe
  const allowedRoutes = ['dashboard', 'home', 'explore', 'books']
  
  return allowedRoutes.some(r => currentRouteName.includes(r) || currentPath.includes(r))
})
</script>

<template>
  <header class="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white/95 backdrop-blur border-b border-black/5 shadow-sm">
    
    <!-- Left & Middle: Conditional Search & Filters (Automatically hidden on Requests, Messages, etc.) -->
    <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">
      <template v-if="showBookFilters">
        <!-- Book Search Input -->
        <input 
          :value="search" 
          @input="$emit('update:search', $event.target.value)" 
          type="search" 
          placeholder="Search by title or author" 
          aria-label="Search books" 
          class="min-w-0 w-44 rounded-lg border border-black/10 px-3 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand" 
        />
        
        <!-- Genre Filter -->
        <select 
          :value="genre" 
          @change="$emit('update:genre', $event.target.value)" 
          aria-label="Genre" 
          class="rounded-lg border border-black/10 px-2 py-1.5 text-xs bg-white focus:border-brand focus:outline-none"
        >
          <option value="">All genres</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
        
        <!-- Condition Filter -->
        <select 
          :value="condition" 
          @change="$emit('update:condition', $event.target.value)" 
          aria-label="Condition" 
          class="rounded-lg border border-black/10 px-2 py-1.5 text-xs bg-white focus:border-brand focus:outline-none"
        >
          <option value="">Any condition</option>
          <option v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        
        <!-- Availability Filter -->
        <select 
          :value="availability" 
          @change="$emit('update:availability', $event.target.value)" 
          aria-label="Availability" 
          class="rounded-lg border border-black/10 px-2 py-1.5 text-xs bg-white focus:border-brand focus:outline-none"
        >
          <option value="">Exchange / donate / lend</option>
          <option v-for="a in AVAILABILITY" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </template>

      <!-- Jekhane search dorkar nai (e.g. Requests, Messages), sekhane empty ba page title/spacer thakbe -->
      <div v-else class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {{ route.name ? route.name.replace('-', ' ') : 'Overview' }}
      </div>

      <!-- Near Me Button: Shob page-ei fixed thakbe -->
      <label class="flex cursor-pointer items-center gap-1.5 text-xs bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-black/5 ml-auto sm:ml-0">
        <input 
          :checked="nearMe" 
          @change="$emit('update:nearMe', $event.target.checked)" 
          type="checkbox" 
          class="peer sr-only" 
        />
        <span class="relative h-4 w-7 rounded-full bg-neutral-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-3"></span>
        Near me<span v-if="me.city" class="hidden text-neutral-500 sm:inline">({{ me.city }})</span>
      </label>
    </div>

    <!-- Right Side: Notification Bell & Functionable Profile Logo (Fixed everywhere) -->
    <div class="flex items-center gap-3">
      <!-- Notification Bell -->
      <div class="relative">
        <button class="relative rounded-lg border border-black/10 p-2 hover:bg-brand-soft transition-colors" aria-label="Notifications" @click="$emit('toggle-bell')">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span v-if="unread" class="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">{{ unread }}</span>
        </button>
        <div v-if="bellOpen" class="fixed inset-0 z-20" @click="$emit('toggle-bell')"></div>
        <div v-if="bellOpen" class="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-black/10 bg-white p-2 shadow-xl">
          <p v-if="!notes.length" class="p-3 text-xs text-neutral-500">Nothing new yet.</p>
          <p v-for="n in notes" :key="n.id" class="rounded-lg p-2 text-xs" :class="n.is_read ? 'text-neutral-500' : 'bg-brand-soft'">{{ n.message }}</p>
        </div>
      </div>

      <!-- Functionable Profile Logo -->
      <button 
        type="button" 
        class="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 transition-colors shadow-sm"
        @click="router.push('/profile')"
        title="View Profile"
      >
        <span class="h-2 w-2 rounded-full bg-brand"></span>
        <span>{{ me.name || 'Profile' }}</span>
      </button>
    </div>
  </header>
</template>