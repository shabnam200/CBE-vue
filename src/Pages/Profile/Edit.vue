<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/Layouts/AppShell.vue'
import DeleteUserForm from './Partials/DeleteUserForm.vue'
import UpdatePasswordForm from './Partials/UpdatePasswordForm.vue'
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm.vue'
import Link from '@/Components/Link.vue'
import { auth } from '@/stores/auth'
import { me as mockMe } from '@/data/mock'
import { getProfileSummary } from '@/api/modules'
import { initials, timeAgo, fmtDate } from '@/utils/format'

defineProps({ mustVerifyEmail: { type: Boolean }, status: { type: String } })

// Login chhara (mock mode) hole mock user dekhabe
const user = computed(() => ({ ...mockMe, email: 'kenson@example.com', ...(auth.user || {}) }))
const summary = ref({ stats: null, reviews: [] })
const loading = ref(true)

const average = computed(() => {
  const r = summary.value.reviews
  return r.length ? r.reduce((n, x) => n + x.rating, 0) / r.length : Number(user.value.reputation_score) || 0
})

onMounted(async () => {
  try { summary.value = (await getProfileSummary()).data } catch { /* page still works without stats */ }
  loading.value = false
})
</script>

<template>
  <AppShell title="Profile" subtitle="Your reputation, ratings and account settings.">
    <!-- Overview -->
    <section class="rounded-2xl border border-black/5 bg-white p-5">
      <div class="flex flex-wrap items-center gap-5">
        <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xl font-semibold text-white">{{ initials(user.name) }}</span>
        <div class="min-w-0 flex-1">
          <h2 class="truncate font-display text-xl font-semibold">{{ user.name }}</h2>
          <p class="truncate text-sm text-neutral-500">{{ user.email }}<template v-if="user.city"> · {{ user.city }}</template></p>
          <p class="mt-1 flex items-center gap-1 text-sm">
            <svg class="h-4 w-4 text-[#B07D3A]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span class="font-medium">{{ average ? average.toFixed(1) : 'New' }}</span>
            <span class="text-neutral-400">reputation</span>
          </p>
        </div>
      </div>

      <dl v-if="summary.stats" class="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-5 text-center sm:grid-cols-4">
        <Link href="/my-books" class="rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ summary.stats.books_listed }}</dd><dt class="text-xs text-neutral-500">Books listed</dt></Link>
        <Link href="/requests" class="rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ summary.stats.exchanges_completed }}</dd><dt class="text-xs text-neutral-500">Exchanges done</dt></Link>
        <Link href="/wishlist" class="rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ summary.stats.wishlist_items }}</dd><dt class="text-xs text-neutral-500">On wishlist</dt></Link>
        <div class="rounded-xl bg-paper p-3"><dd class="font-display text-xl font-semibold text-brand">{{ fmtDate(summary.stats.joined_at).replace(/^\d+ /, '') }}</dd><dt class="text-xs text-neutral-500">Member since</dt></div>
      </dl>
      <div v-else-if="loading" class="mt-5 grid animate-pulse grid-cols-2 gap-3 border-t border-black/5 pt-5 sm:grid-cols-4"><div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100"></div></div>
    </section>

    <!-- Ratings received -->
    <section class="rounded-2xl border border-black/5 bg-white p-5">
      <h2 class="font-display text-lg font-semibold text-brand">Ratings from other readers</h2>
      <p v-if="!loading && !summary.reviews.length" class="mt-4 text-sm text-neutral-500">No ratings yet. Complete an exchange to earn your first one.</p>
      <ul v-else class="mt-4 space-y-3">
        <li v-for="r in summary.reviews" :key="r.id" class="rounded-xl border border-black/5 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{{ initials(r.from.name) }}</span>
              <div class="min-w-0"><p class="truncate text-sm font-medium">{{ r.from.name }}</p><p class="truncate text-xs text-neutral-400">for "{{ r.book }}" · {{ timeAgo(r.created_at) }}</p></div>
            </div>
            <span class="flex shrink-0 gap-0.5 text-[#B07D3A]" role="img" :aria-label="`${r.rating} out of 5 stars`">
              <svg v-for="n in 5" :key="n" class="h-4 w-4" :class="n <= r.rating ? '' : 'text-neutral-200'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </span>
          </div>
          <p v-if="r.comment" class="mt-3 text-sm text-neutral-600">{{ r.comment }}</p>
        </li>
      </ul>
    </section>

    <!-- Account settings -->
    <section class="rounded-2xl border border-black/5 bg-white p-5 sm:p-8"><UpdateProfileInformationForm :must-verify-email="mustVerifyEmail" :status="status" class="max-w-xl" /></section>
    <section class="rounded-2xl border border-black/5 bg-white p-5 sm:p-8"><UpdatePasswordForm class="max-w-xl" /></section>
    <section class="rounded-2xl border border-black/5 bg-white p-5 sm:p-8"><DeleteUserForm class="max-w-xl" /></section>
  </AppShell>
</template>
