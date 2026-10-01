<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import Toast from '@/Components/Toast.vue'
import BookCover from '@/Components/BookCover.vue'
import Avatar from '@/Components/Avatar.vue'
import Link from '@/Components/Link.vue'
import { getRequests, getUserHistory, respondToRequest, cancelRequest, completeRequest, submitReview } from '@/api/modules'
import { useToast } from '@/composables/useToast'
import { timeAgo } from '@/utils/format'

const { toast, say } = useToast()

const requests = ref([])
const loading = ref(true)
const direction = ref('incoming')
const status = ref('all')
const busy = ref(null)
const profileHistory = ref(null)
const profileLoading = ref(false)
let profileRequestId = 0

const search = ref('')

const directions = [
  { value: 'incoming', label: 'Received' },
  { value: 'outgoing', label: 'Sent' },
]
const statuses = [
  ['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['completed', 'Completed'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled'],
]
const statusStyle = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-brand-soft text-brand',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
}
const typeLabel = { exchange: 'Exchange', donate: 'Donation', lend: 'Lending' }

const counts = computed(() => ({
  incoming: requests.value.filter((r) => r.direction === 'incoming').length,
  outgoing: requests.value.filter((r) => r.direction === 'outgoing').length,
}))
const waitingForMe = computed(() => requests.value.filter((r) => r.direction === 'incoming' && r.status === 'pending').length)
const matches = (r) => {
  const q = search.value.trim().toLowerCase()
  return !q || r.book.title.toLowerCase().includes(q) || (r.book.author || '').toLowerCase().includes(q) || (r.other_user?.name || '').toLowerCase().includes(q)
}
const visible = computed(() =>
  requests.value
    .filter((r) => r.direction === direction.value && (status.value === 'all' || r.status === status.value) && matches(r))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
)

async function load() {
  loading.value = true
  try {
    requests.value = (await getRequests()).data
  } catch {
    say('Could not load requests. Please try again.')
  } finally {
    loading.value = false
  }
}

const patch = (id, changes) => { requests.value = requests.value.map((r) => (r.id === id ? { ...r, ...changes } : r)) }

async function run(r, fn, changes, okMsg) {
  busy.value = r.id
  try {
    await fn()
    patch(r.id, changes)
    say(okMsg)
  } catch {
    say('Something went wrong. Please try again.')
  } finally {
    busy.value = null
  }
}
const accept = (r) => run(r, () => respondToRequest(r.id, 'accepted'), { status: 'accepted' }, `Accepted. You can now message ${r.other_user.name}.`)
const reject = (r) => run(r, () => respondToRequest(r.id, 'rejected'), { status: 'rejected' }, 'Request declined.')
const cancel = (r) => run(r, () => cancelRequest(r.id), { status: 'cancelled' }, 'Request cancelled.')
const complete = (r) => run(r, () => completeRequest(r.id), { status: 'completed' }, 'Marked as completed. Do not forget to rate!')

const rating = ref(0)
const hover = ref(0)
const comment = ref('')
const rateFor = ref(null)
const rating_busy = ref(false)

async function openProfile(user) {
  const requestId = ++profileRequestId
  profileHistory.value = { profile: { ...user }, stats: null, ratings: [] }
  profileLoading.value = true
  try {
    profileHistory.value = await getUserHistory(user)
  } catch {
    say('Could not load this reader’s profile history.')
  } finally {
    if (requestId === profileRequestId) profileLoading.value = false
  }
}
function closeProfile() {
  profileRequestId++
  profileHistory.value = null
  profileLoading.value = false
}

function openRate(r) { rateFor.value = r; rating.value = 0; hover.value = 0; comment.value = '' }
function closeRate() { if (!rating_busy.value) rateFor.value = null }
async function sendRating() {
  if (!rating.value) return say('Please pick a star rating.')
  rating_busy.value = true
  try {
    await submitReview(rateFor.value.id, { rating: rating.value, comment: comment.value.trim() })
    patch(rateFor.value.id, { reviewed: true })
    say(`Thanks! You rated ${rateFor.value.other_user.name}.`)
    rateFor.value = null
  } catch {
    say('Could not send your rating. Please try again.')
  } finally {
    rating_busy.value = false
  }
}
const onKey = (e) => { if (e.key === 'Escape') closeRate() }

onMounted(() => { window.addEventListener('keydown', onKey); load() })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <AppLayout
    current="Requests"
    title="Requests"
    subtitle="Accept, decline and track exchange, donation and lending requests."
    v-model:search="search"
    search-placeholder="Search book or person"
  >
    <template #actions>
      <span class="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{{ waitingForMe }} waiting for you</span>
    </template>

    <section class="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="inline-flex rounded-xl bg-paper p-1 text-sm">
              <button
                v-for="d in directions"
                :key="d.value"
                type="button"
                class="rounded-lg px-4 py-1.5 transition-colors"
                :class="direction === d.value ? 'bg-white font-medium text-brand shadow-sm' : 'text-neutral-600 hover:text-brand'"
                @click="direction = d.value"
              >
                {{ d.label }} <span class="text-xs text-neutral-400">({{ counts[d.value] }})</span>
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="[v, l] in statuses"
                :key="v"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                :class="status === v ? 'border-brand bg-brand text-white' : 'border-black/10 text-neutral-600 hover:bg-brand-soft'"
                @click="status = v"
              >
                {{ l }}
              </button>
            </div>
          </div>

          <div v-if="loading" class="mt-5 space-y-3 animate-pulse">
            <div v-for="i in 3" :key="i" class="flex gap-4 rounded-xl border border-black/5 p-4">
              <div class="h-28 w-20 rounded-lg bg-neutral-200"></div>
              <div class="flex-1 space-y-2"><div class="h-4 w-40 rounded bg-neutral-200"></div><div class="h-3 w-24 rounded bg-neutral-100"></div><div class="h-3 w-2/3 rounded bg-neutral-100"></div></div>
            </div>
          </div>

          <p v-else-if="!visible.length" class="py-14 text-center text-sm text-neutral-500">
            No {{ status === 'all' ? '' : status + ' ' }}requests here yet.
            <Link v-if="direction === 'outgoing'" href="/dashboard" class="font-medium text-brand underline underline-offset-4">Find a book to request</Link>
          </p>

          <TransitionGroup v-else tag="ul" name="list" class="relative mt-5 space-y-3">
            <li v-for="(r, i) in visible" :key="r.id" class="reveal flex flex-col gap-4 rounded-xl border border-black/5 p-4 transition-shadow hover:shadow-md sm:flex-row" :style="{ '--i': i }">
              <div class="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm"><BookCover :book="r.book" /></div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-display text-base font-semibold">{{ r.book.title }}</h3>
                  <span class="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{{ typeLabel[r.book.availability_type] }}</span>
                  <span :key="r.status" class="animate-pop rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" :class="statusStyle[r.status]">{{ r.status }}</span>
                </div>
                <p class="text-xs text-neutral-500">by {{ r.book.author }}</p>
                <p class="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-neutral-700">
                  <Avatar :src="r.other_user.profile_photo_url || ''" :name="r.other_user.name" size="h-7 w-7 text-[10px]" />
                  <template v-if="r.direction === 'incoming'"><span class="font-medium">{{ r.other_user.name }}</span> ({{ r.other_user.city }}) wants this book.</template>
                  <template v-else>You asked <span class="font-medium">{{ r.other_user.name }}</span> ({{ r.other_user.city }}).</template>
                  <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30" :aria-label="`View ${r.other_user.name}'s profile and reviews`" :title="`View ${r.other_user.name}'s profile`" @click="openProfile(r.other_user)">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
                  </button>
                </p>
                <p v-if="r.message" class="mt-2 rounded-lg bg-paper px-3 py-2 text-sm text-neutral-600">"{{ r.message }}"</p>
                <p class="mt-2 text-xs text-neutral-400">{{ timeAgo(r.created_at) }}</p>
              </div>

              <div class="flex shrink-0 flex-row flex-wrap items-start gap-2 text-sm sm:w-36 sm:flex-col sm:items-stretch">
                <template v-if="r.status === 'pending' && r.direction === 'incoming'">
                  <button type="button" :disabled="busy === r.id" class="rounded-lg bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50" @click="accept(r)">Accept</button>
                  <button type="button" :disabled="busy === r.id" class="rounded-lg border border-black/10 px-4 py-2 font-medium text-neutral-700 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50" @click="reject(r)">Decline</button>
                </template>
                <button v-else-if="r.status === 'pending'" type="button" :disabled="busy === r.id" class="rounded-lg border border-black/10 px-4 py-2 font-medium text-neutral-700 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50" @click="cancel(r)">Cancel request</button>

                <template v-if="r.status === 'accepted'">
                  <Link :href="`/messages?with=${r.other_user.id}`" class="rounded-lg border border-brand px-4 py-2 text-center font-medium text-brand transition-colors hover:bg-brand-soft">Message</Link>
                  <button type="button" :disabled="busy === r.id" class="rounded-lg bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50" @click="complete(r)">Mark completed</button>
                </template>

                <template v-if="r.status === 'completed'">
                  <button v-if="!r.reviewed" type="button" class="rounded-lg bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-dark" @click="openRate(r)">Rate {{ r.other_user.name.split(' ')[0] }}</button>
                  <span v-else class="rounded-lg bg-paper px-4 py-2 text-center text-xs font-medium text-neutral-500">Rated</span>
                </template>
              </div>
            </li>
          </TransitionGroup>
        </section>

    <template #overlay>
      <Transition name="modal">
        <div v-if="profileHistory" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="closeProfile">
          <div role="dialog" aria-modal="true" aria-labelledby="reader-profile-title" class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/5 bg-white p-5 shadow-xl sm:p-7">
            <div class="flex items-start gap-3 border-b border-black/5 pb-4">
              <Avatar :src="profileHistory.profile.profile_photo_url || ''" :name="profileHistory.profile.name" size="h-14 w-14 text-lg" />
              <div class="min-w-0 flex-1">
                <h2 id="reader-profile-title" class="truncate font-display text-lg font-semibold">{{ profileHistory.profile.name }}</h2>
                <p class="truncate text-sm text-neutral-500">{{ profileHistory.profile.city || 'Community reader' }}</p>
                <p class="mt-1 flex items-center gap-1 text-sm text-[#B07D3A]">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {{ Number(profileHistory.profile.reputation_score || 0).toFixed(1) }} reputation
                </p>
              </div>
              <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-neutral-100 hover:text-ink" aria-label="Close profile" @click="closeProfile">×</button>
            </div>

            <div v-if="profileLoading" class="mt-5 grid grid-cols-3 gap-2 animate-pulse">
              <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-neutral-100"></div>
            </div>
            <dl v-else-if="profileHistory.stats" class="mt-5 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-paper p-3"><dd class="font-display text-lg font-semibold text-brand">{{ profileHistory.stats.books_listed }}</dd><dt class="text-[10px] text-neutral-500">Books listed</dt></div>
              <div class="rounded-lg bg-paper p-3"><dd class="font-display text-lg font-semibold text-brand">{{ profileHistory.stats.exchanges_completed }}</dd><dt class="text-[10px] text-neutral-500">Completed</dt></div>
              <div class="rounded-lg bg-paper p-3"><dd class="font-display text-lg font-semibold text-brand">{{ profileHistory.stats.ratings_received }}</dd><dt class="text-[10px] text-neutral-500">Ratings</dt></div>
            </dl>

            <section class="mt-6">
              <h3 class="font-display text-base font-semibold text-brand">Recent reviews</h3>
              <p v-if="!profileLoading && !profileHistory.ratings?.length" class="mt-3 rounded-lg bg-paper p-4 text-sm text-neutral-500">No reviews yet.</p>
              <ul v-else class="mt-3 space-y-3">
                <li v-for="review in profileHistory.ratings" :key="review.id" class="rounded-lg border border-black/5 p-3">
                  <div class="flex items-center justify-between gap-3">
                    <span class="truncate text-xs font-medium">{{ review.rater?.name || 'Reader' }}<template v-if="review.book"> · {{ review.book }}</template></span>
                    <span class="shrink-0 text-xs font-semibold text-[#B07D3A]">★ {{ review.rating }}/5</span>
                  </div>
                  <p v-if="review.comment" class="mt-2 text-sm text-neutral-600">{{ review.comment }}</p>
                  <p class="mt-1 text-[10px] text-neutral-400">{{ timeAgo(review.created_at) }}</p>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </Transition>

      <!-- Rating popup -->
    <Transition name="modal"><div v-if="rateFor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="closeRate">
      <div role="dialog" aria-modal="true" aria-labelledby="rate-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 id="rate-title" class="font-display text-lg font-semibold">Rate {{ rateFor.other_user.name }}</h3>
        <p class="mt-1 text-sm text-neutral-500">How was your experience with "{{ rateFor.book.title }}"?</p>
        <div class="mt-5 flex justify-center gap-1" @mouseleave="hover = 0">
          <button v-for="n in 5" :key="n" type="button" :aria-label="`${n} star${n > 1 ? 's' : ''}`" class="p-1" @mouseenter="hover = n" @click="rating = n">
            <svg class="h-9 w-9 transition-all duration-150 hover:scale-125" :class="n <= (hover || rating) ? 'text-[#B07D3A]' : 'text-neutral-300'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </button>
        </div>
        <textarea v-model="comment" rows="3" maxlength="300" placeholder="Write a short comment (optional)" class="mt-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
        <div class="mt-5 flex justify-end gap-3 text-sm">
          <button type="button" class="rounded-lg border border-black/10 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50" @click="closeRate">Cancel</button>
          <button type="button" :disabled="rating_busy" class="rounded-lg bg-brand px-5 py-2 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50" @click="sendRating">{{ rating_busy ? 'Sending...' : 'Submit rating' }}</button>
        </div>
      </div>
    </div></Transition>

      <Toast :message="toast" />
    </template>
  </AppLayout>
</template>
