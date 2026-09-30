<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppShell from '@/Layouts/AppShell.vue'
import Toast from '@/Components/Toast.vue'
import BookCover from '@/Components/BookCover.vue'
import Link from '@/Components/Link.vue'
import { getRequests, respondToRequest, cancelRequest, completeRequest, submitReview } from '@/api/modules'
import { useToast } from '@/composables/useToast'
import { timeAgo } from '@/utils/format'

const { toast, say } = useToast()

const requests = ref([])
const loading = ref(true)
const direction = ref('incoming')
const status = ref('all')
const busy = ref(null)

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
const visible = computed(() =>
  requests.value
    .filter((r) => r.direction === direction.value && (status.value === 'all' || r.status === status.value))
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

/* ---------- Rating popup ---------- */
const rating = ref(0)
const hover = ref(0)
const comment = ref('')
const rateFor = ref(null)
const rating_busy = ref(false)

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
  <AppShell title="Requests" subtitle="Accept, decline and track exchange, donation and lending requests.">
    <template #actions>
      <span class="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{{ waitingForMe }} waiting for you</span>
    </template>

    <section class="rounded-2xl border border-black/5 bg-white p-5">
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

      <ul v-else class="mt-5 space-y-3">
        <li v-for="r in visible" :key="r.id" class="flex flex-col gap-4 rounded-xl border border-black/5 p-4 sm:flex-row">
          <div class="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 shadow-sm"><BookCover :book="r.book" /></div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate font-display text-base font-semibold">{{ r.book.title }}</h3>
              <span class="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{{ typeLabel[r.book.availability_type] }}</span>
              <span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" :class="statusStyle[r.status]">{{ r.status }}</span>
            </div>
            <p class="text-xs text-neutral-500">by {{ r.book.author }}</p>
            <p class="mt-2 text-sm text-neutral-700">
              <template v-if="r.direction === 'incoming'"><span class="font-medium">{{ r.other_user.name }}</span> ({{ r.other_user.city }}) wants this book.</template>
              <template v-else>You asked <span class="font-medium">{{ r.other_user.name }}</span> ({{ r.other_user.city }}).</template>
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
      </ul>
    </section>

    <!-- Rating popup -->
    <Transition name="toast">
      <div v-if="rateFor" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="closeRate">
        <div role="dialog" aria-modal="true" aria-labelledby="rate-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 id="rate-title" class="font-display text-lg font-semibold">Rate {{ rateFor.other_user.name }}</h3>
          <p class="mt-1 text-sm text-neutral-500">How was your experience with "{{ rateFor.book.title }}"?</p>
          <div class="mt-5 flex justify-center gap-1" @mouseleave="hover = 0">
            <button v-for="n in 5" :key="n" type="button" :aria-label="`${n} star${n > 1 ? 's' : ''}`" class="p-1" @mouseenter="hover = n" @click="rating = n">
              <svg class="h-9 w-9 transition-colors" :class="n <= (hover || rating) ? 'text-[#B07D3A]' : 'text-neutral-300'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </button>
          </div>
          <textarea v-model="comment" rows="3" maxlength="300" placeholder="Write a short comment (optional)" class="mt-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"></textarea>
          <div class="mt-5 flex justify-end gap-3 text-sm">
            <button type="button" class="rounded-lg border border-black/10 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50" @click="closeRate">Cancel</button>
            <button type="button" :disabled="rating_busy" class="rounded-lg bg-brand px-5 py-2 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50" @click="sendRating">{{ rating_busy ? 'Sending...' : 'Submit rating' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <Toast :message="toast" />
  </AppShell>
</template>
