<script setup>
// Sidebar > Profile  ->  /profile  (ei page: user er information + activity overview)
// Edit korte chaile "Edit profile" -> /profile/edit (ager page)
import { ref, computed, onMounted, unref } from 'vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import Link from '@/Components/Link.vue'
import Avatar from '@/Components/Avatar.vue'
import { app } from '@/stores/app'
import { auth } from '@/stores/auth'
import { me as mockMe } from '@/data/mock'
import { getProfileSummary } from '@/api/modules'
import { useCountUp } from '@/composables/useCountUp'
import { metaOf, linkOf } from '@/utils/notify'
import { initials, timeAgo, fmtDate } from '@/utils/format'

const user = computed(() => ({ ...mockMe, email: '', ...(unref(auth.user) || {}) }))
const summary = ref({ stats: null, reviews: [] })
const loading = ref(true)

onMounted(async () => {
  try { summary.value = (await getProfileSummary()).data } catch { /* ignore */ }
  loading.value = false
})

// ---- Reputation ----
const reviews = computed(() => summary.value.reviews || [])
const average = computed(() =>
  reviews.value.length
    ? reviews.value.reduce((n, x) => n + x.rating, 0) / reviews.value.length
    : Number(user.value.reputation_score) || 0,
)
const latestReviews = computed(() => reviews.value.slice(0, 3))

// ---- Stats (count-up animation) ----
const stat = (k) => computed(() => summary.value.stats?.[k] ?? 0)
const nBooks = useCountUp(stat('books_listed'))
const nDone = useCountUp(stat('exchanges_completed'))
const nWish = useCountUp(stat('wishlist_items'))

const joined = computed(() => (summary.value.stats?.joined_at ? fmtDate(summary.value.stats.joined_at) : '—'))
const memberYear = computed(() => (summary.value.stats?.joined_at ? fmtDate(summary.value.stats.joined_at).replace(/^\d+ /, '') : ''))

// ---- Left "Information" panel ----
const info = computed(() => [
  ['Email', user.value.email || '—'],
  ['City', user.value.city || '—'],
  ['Member since', joined.value],
  ['Reputation', average.value ? `${average.value.toFixed(1)} / 5` : 'New'],
  ['Books listed', summary.value.stats?.books_listed ?? 0],
  ['Exchanges done', summary.value.stats?.exchanges_completed ?? 0],
  ['On wishlist', summary.value.stats?.wishlist_items ?? 0],
])

// ---- Recent activity: notification feed theke (request, exchange, message etc.) ----
const activity = computed(() => (app.notes || []).slice(0, 6))

const ICON = {
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  swap: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
}
</script>

<template>
  <AppLayout current="Profile" title="Profile">
    <div class="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <!-- ============ LEFT: user card + information ============ -->
      <div class="space-y-4">
        <section class="reveal rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm" style="--i: 0">
          <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-28 w-28 text-4xl font-display" class="mx-auto ring-4 ring-brand-soft" />
          <h2 class="mt-3 truncate font-display text-lg font-semibold text-ink">{{ user.name }}</h2>
          <p class="mt-0.5 text-xs text-neutral-500">
            {{ user.city || 'Reader' }}<template v-if="memberYear"> · Member since {{ memberYear }}</template>
          </p>
          <p class="mt-2 inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-xs">
            <svg class="h-3.5 w-3.5 text-[#B07D3A]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="ICON.star" /></svg>
            <span class="font-medium">{{ average ? average.toFixed(1) : 'New' }}</span>
            <span class="text-neutral-400">reputation</span>
          </p>
          <Link href="/profile/edit" class="mt-4 flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark">
            Edit profile
          </Link>
        </section>

        <section class="reveal rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style="--i: 1">
          <h3 class="font-display text-base font-semibold text-ink">Information</h3>
          <dl class="mt-3 divide-y divide-black/5 text-sm">
            <div v-for="[k, v] in info" :key="k" class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-neutral-500">{{ k }}</dt>
              <dd class="min-w-0 truncate text-right font-medium text-ink">{{ v }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- ============ RIGHT: stats, reviews, activity ============ -->
      <div class="min-w-0 space-y-4">
        <!-- Stat cards -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/my-books" class="reveal lift rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition-colors hover:bg-brand-soft/40" style="--i: 1">
            <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICON.book" /></svg></span>
            <p class="mt-2 text-xs text-neutral-500">Books listed</p>
            <p class="font-display text-2xl font-semibold text-ink">{{ nBooks }}</p>
          </Link>
          <Link href="/requests" class="reveal lift rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition-colors hover:bg-brand-soft/40" style="--i: 2">
            <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICON.swap" /></svg></span>
            <p class="mt-2 text-xs text-neutral-500">Exchanges done</p>
            <p class="font-display text-2xl font-semibold text-ink">{{ nDone }}</p>
          </Link>
          <Link href="/wishlist" class="reveal lift rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition-colors hover:bg-brand-soft/40" style="--i: 3">
            <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICON.heart" /></svg></span>
            <p class="mt-2 text-xs text-neutral-500">On wishlist</p>
            <p class="font-display text-2xl font-semibold text-ink">{{ nWish }}</p>
          </Link>
          <div class="reveal rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm" style="--i: 4">
            <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-[#B07D3A]"><svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="ICON.star" /></svg></span>
            <p class="mt-2 text-xs text-neutral-500">Reputation</p>
            <p class="font-display text-2xl font-semibold text-ink">{{ average ? average.toFixed(1) : 'New' }}</p>
          </div>
        </div>

        <!-- Latest reviews -->
        <section class="reveal rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style="--i: 5">
          <div class="flex items-center justify-between">
            <h3 class="font-display text-base font-semibold text-ink">Latest reviews</h3>
            <Link href="/profile/edit" class="text-xs font-medium text-brand hover:underline">Full history</Link>
          </div>
          <div v-if="loading" class="mt-3 grid gap-3 sm:grid-cols-3">
            <div v-for="i in 3" :key="i" class="skeleton h-16 rounded-xl"></div>
          </div>
          <p v-else-if="!latestReviews.length" class="mt-3 rounded-xl bg-paper/60 py-6 text-center text-sm text-neutral-500">No ratings yet. Complete an exchange to earn your first one.</p>
          <div v-else class="mt-3 grid gap-3 sm:grid-cols-3">
            <div v-for="r in latestReviews" :key="r.id" class="flex min-w-0 items-center gap-3 rounded-xl border border-black/5 p-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-semibold text-brand">{{ initials(r.from.name) }}</span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink">{{ r.book }}</p>
                <p class="truncate text-[11px] text-neutral-400">{{ r.from.name }} · {{ timeAgo(r.created_at) }}</p>
                <span class="mt-0.5 flex gap-0.5 text-[#B07D3A]" role="img" :aria-label="`${r.rating} out of 5`">
                  <svg v-for="n in 5" :key="n" class="h-3 w-3" :class="n <= r.rating ? '' : 'text-neutral-200'" viewBox="0 0 24 24" fill="currentColor"><path :d="ICON.star" /></svg>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent activity -->
        <section class="reveal rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style="--i: 6">
          <h3 class="font-display text-base font-semibold text-ink">Recent activity</h3>

          <Link href="/my-books" class="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/30 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand-soft/50">
            <span class="text-base leading-none">+</span> List a new book
          </Link>

          <p v-if="!activity.length" class="mt-4 rounded-xl bg-paper/60 py-8 text-center text-sm text-neutral-500">No activity yet. Requests, exchanges and messages will show up here.</p>
          <div v-else class="mt-4">
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:grid-cols-[minmax(0,1fr)_7rem_5rem]">
              <span>Activity</span><span class="hidden sm:block">Type</span><span class="text-right">When</span>
            </div>
            <Link
              v-for="n in activity"
              :key="n.id"
              :href="linkOf(n)"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-black/5 px-1 py-3 text-sm transition-colors hover:bg-paper sm:grid-cols-[minmax(0,1fr)_7rem_5rem]"
            >
              <span class="flex min-w-0 items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="metaOf(n).tone">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="metaOf(n).icon" /></svg>
                </span>
                <span class="truncate" :class="n.is_read ? 'text-neutral-600' : 'font-medium text-ink'">{{ n.message }}</span>
              </span>
              <span class="hidden truncate text-xs text-neutral-500 sm:block">{{ metaOf(n).module }}</span>
              <span class="whitespace-nowrap text-right text-xs text-neutral-400">{{ timeAgo(n.created_at) }}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  </AppLayout>
</template>