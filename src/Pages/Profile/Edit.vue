<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '@/Layouts/AppShell.vue'
import DeleteUserForm from './Partials/DeleteUserForm.vue'
import UpdatePasswordForm from './Partials/UpdatePasswordForm.vue'
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm.vue'
import Link from '@/Components/Link.vue'
import Avatar from '@/Components/Avatar.vue'
import Toast from '@/Components/Toast.vue'
import { app } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import { useCountUp } from '@/composables/useCountUp'
import { squareResize, toDataUrl } from '@/utils/image'
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

const { toast, say } = useToast()
const photoBusy = ref(false)
const fileInput = ref(null)
const stat = (k) => computed(() => summary.value.stats?.[k] ?? 0)
const nBooks = useCountUp(stat('books_listed'))
const nDone = useCountUp(stat('exchanges_completed'))
const nWish = useCountUp(stat('wishlist_items'))

async function onPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) return say('Please choose an image file.')
  if (file.size > 8 * 1024 * 1024) return say('Image is too large (max 8 MB).')
  photoBusy.value = true
  try {
    const small = await squareResize(file) // square crop + resize
    const { synced } = await app.setAvatar(small, await toDataUrl(small))
    say(synced ? 'Profile photo updated.' : 'Photo saved on this device (server upload not available yet).')
  } catch {
    say('Could not use that image. Try another one.')
  } finally {
    photoBusy.value = false
  }
}
async function removePhoto() { await app.clearAvatar(); say('Profile photo removed.') }

onMounted(async () => {
  try { summary.value = (await getProfileSummary()).data } catch { /* page still works without stats */ }
  loading.value = false
})
</script>

<template>
  <AppShell title="Profile" subtitle="Your reputation, ratings and account settings.">
    <!-- Overview -->
    <section class="reveal rounded-2xl border border-black/5 bg-white p-5" style="--i: 0">
      <div class="flex flex-wrap items-center gap-5">
        <div class="group relative shrink-0">
          <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-20 w-20 text-2xl font-display" class="ring-4 ring-brand-soft transition-transform duration-300 group-hover:scale-105" />
          <div v-if="photoBusy" class="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><span class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></span></div>
          <button type="button" class="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow transition-all hover:scale-110 hover:bg-brand-dark" aria-label="Change profile photo" title="Change profile photo" @click="fileInput.click()">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          </button>
          <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onPhoto" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="truncate font-display text-xl font-semibold">{{ user.name }}</h2>
          <p class="truncate text-sm text-neutral-500">{{ user.email }}<template v-if="user.city"> · {{ user.city }}</template></p>
          <p class="mt-1 flex items-center gap-1 text-sm">
            <svg class="h-4 w-4 text-[#B07D3A]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span class="font-medium">{{ average ? average.toFixed(1) : 'New' }}</span>
            <span class="text-neutral-400">reputation</span>
          </p>
          <div class="mt-2 flex flex-wrap gap-3 text-xs">
            <button type="button" class="font-medium text-brand underline-offset-4 hover:underline" @click="fileInput.click()">{{ app.avatar.value ? 'Change photo' : 'Upload photo' }}</button>
            <button v-if="app.avatar.value" type="button" class="text-neutral-500 underline-offset-4 hover:text-rose-600 hover:underline" @click="removePhoto">Remove</button>
          </div>
        </div>
      </div>

      <dl v-if="summary.stats" class="mt-5 grid grid-cols-2 gap-3 border-t border-black/5 pt-5 text-center sm:grid-cols-4">
        <Link href="/my-books" class="lift rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ nBooks }}</dd><dt class="text-xs text-neutral-500">Books listed</dt></Link>
        <Link href="/requests" class="lift rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ nDone }}</dd><dt class="text-xs text-neutral-500">Exchanges done</dt></Link>
        <Link href="/wishlist" class="lift rounded-xl bg-paper p-3 transition-colors hover:bg-brand-soft"><dd class="font-display text-xl font-semibold text-brand">{{ nWish }}</dd><dt class="text-xs text-neutral-500">On wishlist</dt></Link>
        <div class="rounded-xl bg-paper p-3"><dd class="font-display text-xl font-semibold text-brand">{{ fmtDate(summary.stats.joined_at).replace(/^\d+ /, '') }}</dd><dt class="text-xs text-neutral-500">Member since</dt></div>
      </dl>
      <div v-else-if="loading" class="mt-5 grid animate-pulse grid-cols-2 gap-3 border-t border-black/5 pt-5 sm:grid-cols-4"><div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100"></div></div>
    </section>

    <!-- Ratings received -->
    <section class="reveal rounded-2xl border border-black/5 bg-white p-5" style="--i: 1">
      <h2 class="font-display text-lg font-semibold text-brand">Ratings from other readers</h2>
      <p v-if="!loading && !summary.reviews.length" class="mt-4 text-sm text-neutral-500">No ratings yet. Complete an exchange to earn your first one.</p>
      <ul v-else class="mt-4 space-y-3">
        <li v-for="(r, i) in summary.reviews" :key="r.id" class="reveal rounded-xl border border-black/5 p-4" :style="{ '--i': i }">
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
    <section class="reveal rounded-2xl border border-black/5 bg-white p-5 sm:p-8" style="--i: 2"><UpdateProfileInformationForm :must-verify-email="mustVerifyEmail" :status="status" class="max-w-xl" /></section>
    <section class="reveal rounded-2xl border border-black/5 bg-white p-5 sm:p-8" style="--i: 3"><UpdatePasswordForm class="max-w-xl" /></section>
    <section class="reveal rounded-2xl border border-black/5 bg-white p-5 sm:p-8" style="--i: 4"><DeleteUserForm class="max-w-xl" /></section>
    <Toast :message="toast" />
  </AppShell>
</template>
