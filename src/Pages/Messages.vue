<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, unref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/Layouts/AppLayout.vue'
import Toast from '@/Components/Toast.vue'
import Avatar from '@/Components/Avatar.vue'
import { app } from '@/stores/app'
import { auth } from '@/stores/auth'
import { imageUrl } from '@/bookApi'
import { getConversations, startConversation, getUserHistory } from '@/api/modules'
import { useToast } from '@/composables/useToast'
import { timeAgo, clock } from '@/utils/format'
import { db } from '@/firebase'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { useChatUnread, chatIdFor as pairId } from '@/composables/useChatUnread'

const route = useRoute()
const { toast, say } = useToast()

// Logged-in user er id. (window.Laravel SPA te thake na, tai age sob user er id 0 hoye jachchilo
// ar duijon alada alada collection e likhchilo.)
const myId = computed(() => Number(unref(auth.user)?.id) || 0)
// Duijon er jonno ek-i collection: chat_<chhoto id>_<boro id>
const chatIdFor = (otherId) => pairId(myId.value, otherId)

// Unread / latest message — Sidebar badge er sathe ek-i source (Firestore)
const chat = useChatUnread()
const lastOf = (c) => chat.last[c.user.id] || c.last_message
const lastAt = (c) => {
  const m = chat.last[c.user.id]
  return m ? new Date(m.at) : (c.last_message?.at ?? c.last_message?.created_at)
}
const activityOf = (c) => chat.last[c.user.id]?.at || Date.parse(c.last_message?.at ?? c.last_message?.created_at) || 0
const isUnread = (c) => chat.isUnread(c.user.id)
const isMine = (m) => Number(m.sender_id) === myId.value

const convos = ref([])
const loadingList = ref(true)
const activeId = ref(null)
const messages = ref([])
const loadingMsgs = ref(false)
const draft = ref('')
const sending = ref(false)
const search = ref('')
const scroller = ref(null)

const userHistory = ref(null)
const loadingHistory = ref(false)

const active = computed(() => convos.value.find((c) => c.id === activeId.value) || null)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return convos.value
    .filter((c) => !q || c.user.name.toLowerCase().includes(q) || (c.book || '').toLowerCase().includes(q))
    .sort((a, b) => activityOf(b) - activityOf(a))
})
const photoOf = (u) => imageUrl(u?.avatar_url ?? u?.avatar ?? u?.profile_photo_url) || ''

const toBottom = async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function loadUserHistory(user) {
  if (!user) return
  loadingHistory.value = true
  try {
    const res = await getUserHistory(user)
    userHistory.value = res
  } catch {
    userHistory.value = null
  } finally {
    loadingHistory.value = false
  }
}

let unsubscribeMessages = null

function openConvo(c) {
  activeId.value = c.id
  loadingMsgs.value = true
  messages.value = []
  userHistory.value = null

  if (unsubscribeMessages) unsubscribeMessages()

  try {
    loadUserHistory(c.user)
    c.unread = 0
    app.setConvoUnread(c.id, 0)

    if (!myId.value) { loadingMsgs.value = false; say('Please log in again.'); return }

    const q = query(collection(db, chatIdFor(c.user.id)), orderBy('created_at', 'asc'))
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
      messages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      loadingMsgs.value = false
      toBottom()
    }, (error) => {
      console.error(error)
      loadingMsgs.value = false
      say('Could not load messages.')
    })
  } catch {
    loadingMsgs.value = false
    say('Could not load messages.')
  }
}

const fileInput = ref(null)
const currentAttachedImage = ref(null)

function triggerAttach() {
  if (fileInput.value) fileInput.value.click()
}
// Firestore doc 1MB er beshi hole send fail kore, tai chhobi chhoto kore nei
function compressImage(file, max = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}
async function handleAttach(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  try { currentAttachedImage.value = await compressImage(file) } catch { say('Could not read that image.') }
}

async function send() {
  const text = (draft.value || '').trim()
  const imgData = currentAttachedImage.value
  
  if ((!text && !imgData) || !active.value || sending.value) return
  
  sending.value = true
  try {
    if (!myId.value) throw new Error('Not logged in')

    await addDoc(collection(db, chatIdFor(active.value.user.id)), {
      message: text || '',
      image: imgData || null,
      sender_id: myId.value,
      created_at: serverTimestamp()
    })

    draft.value = ''
    currentAttachedImage.value = null
    toBottom()
  } catch (err) {
    console.error(err)
    say('Message not sent. Please try again.')
  } finally {
    sending.value = false
  }
}

function addEmoji(emoji) {
  draft.value += emoji
}

// Je chat khola ache seta auto "read" hoy (back dile / onno chat khulle update hoy)
watch(active, (c) => chat.setActive(c ? c.user.id : null), { immediate: true })

onBeforeUnmount(() => {
  if (unsubscribeMessages) unsubscribeMessages()
  chat.setActive(null)
})

onMounted(async () => {
  app.markMessagesSeen()
  try {
    convos.value = (await getConversations()).data
  } catch {
    say('Could not load conversations.')
  } finally {
    loadingList.value = false
  }
  const withId = Number(route.query.with)
  if (withId) {
    let c = convos.value.find((x) => x.user.id === withId)
    if (!c) {
      try { c = (await startConversation(withId)).data; convos.value.unshift(c); chat.refresh() } catch { /* ignore */ }
    }
    if (c) openConvo(c)
  }
})
</script>

<template>
  <AppLayout
    current="Messages"
    title="Messages"
    v-model:search="search"
    search-placeholder="Search people or books"
  >
    <template #actions></template>

    <section class="grid h-[calc(100vh-10.5rem)] min-h-[30rem] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm md:grid-cols-[20rem_minmax(0,1fr)_21rem]">
      
      <!-- 1st Column: Conversation list -->
      <div class="min-h-0 flex-col border-black/5 md:flex md:border-r" :class="activeId ? 'hidden md:flex' : 'flex'">
        <div class="border-b border-black/5 p-3">
          <h2 class="font-display text-sm font-semibold text-neutral-800">Chat</h2>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <div v-if="loadingList" class="animate-pulse space-y-3 p-4">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3"><div class="h-10 w-10 rounded-full bg-neutral-200"></div><div class="flex-1 space-y-2"><div class="h-3 w-24 rounded bg-neutral-200"></div><div class="h-3 w-40 rounded bg-neutral-100"></div></div></div>
          </div>
          <p v-else-if="!filtered.length" class="p-6 text-center text-sm text-neutral-500">No conversations found.</p>
          <template v-else>
            <button
              v-for="(c, i) in filtered"
              :key="c.id"
              type="button"
              :style="{ '--i': i }"
              class="reveal flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition-colors hover:bg-brand-soft/60"
              :class="c.id === activeId ? 'bg-brand-soft' : ''"
              @click="openConvo(c)"
            >
              <Avatar :src="photoOf(c.user)" :name="c.user.name" size="h-10 w-10 text-sm" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-medium">{{ c.user.name }}</span>
                  <span class="shrink-0 text-[10px] text-neutral-400">{{ timeAgo(lastAt(c)) }}</span>
                </span>
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-xs" :class="isUnread(c) ? 'font-medium text-ink' : 'text-neutral-500'">{{ lastOf(c)?.message || (lastOf(c)?.image ? '[Image]' : 'Say hello!') }}</span>
                  <span v-if="isUnread(c)" class="h-2.5 w-2.5 shrink-0 animate-pop rounded-full bg-brand" aria-label="New message"></span>
                </span>
              </span>
            </button>
          </template>
        </div>
      </div>

      <!-- 2nd Column: Active Chat Thread -->
      <div class="min-h-0 min-w-0 flex-col border-black/5 md:flex md:border-r" :class="activeId ? 'flex' : 'hidden md:flex'">
        <template v-if="active">
          <div class="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
            <div class="flex items-center gap-3 min-w-0">
              <button type="button" class="rounded-lg p-1.5 text-neutral-500 hover:bg-brand-soft md:hidden" aria-label="Back to conversations" @click="activeId = null">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <Avatar :src="photoOf(active.user)" :name="active.user.name" size="h-9 w-9 text-sm" />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ active.user.name }}</p>
                <p class="truncate text-xs text-neutral-500">Online</p>
              </div>
            </div>
            <div class="flex items-center gap-1 text-neutral-400">
              <button type="button" class="rounded-lg p-2 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Call">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
              <button type="button" class="rounded-lg p-2 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Video Call">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
              <button type="button" class="rounded-lg p-2 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Options">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>

          <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper/60 p-4">
            <p v-if="loadingMsgs" class="py-10 text-center text-sm text-neutral-400">Loading messages...</p>
            <p v-else-if="!messages.length" class="py-10 text-center text-sm text-neutral-500">No messages yet. Say hello to {{ active.user.name.split(' ')[0] }}!</p>
            <div v-for="m in messages" :key="m.id" class="flex animate-scale-in" :class="!isMine(m) ? 'justify-start' : 'justify-end'">
              <div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm" :class="!isMine(m) ? 'rounded-bl-md border border-black/5 bg-white text-ink' : 'rounded-br-md bg-brand text-white'">
                <img v-if="m.image" :src="m.image" alt="Attached Image" class="mb-2 max-h-48 w-full rounded-lg object-cover" />
                <p v-if="m.message" class="whitespace-pre-wrap break-words">{{ m.message }}</p>
                <div class="mt-1 flex items-center justify-end gap-1.5 text-[10px]" :class="!isMine(m) ? 'text-neutral-400' : 'text-white/70'">
                  <span>{{ clock(m.created_at?.toDate?.() ?? new Date()) }}</span>
                  <span v-if="isMine(m)">You</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Image Preview before sending -->
          <div v-if="currentAttachedImage" class="flex items-center gap-2 border-t border-black/5 px-3 pt-2 bg-white">
            <div class="relative inline-block">
              <img :src="currentAttachedImage" alt="Preview" class="h-14 w-14 rounded-lg object-cover border border-black/10" />
              <button type="button" class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white text-xs hover:bg-neutral-900" @click="currentAttachedImage = null">×</button>
            </div>
            <span class="text-xs text-neutral-500">Image attached. Ready to send.</span>
          </div>

          <form class="flex items-center gap-2 border-t border-black/5 p-3 bg-white" @submit.prevent="send">
            <button type="button" class="p-2 text-neutral-400 hover:text-neutral-600" title="Add Emoji" @click="addEmoji('😊')">😊</button>
            <input v-model="draft" type="text" placeholder="Type a message here..." aria-label="Message" maxlength="1000" class="min-w-0 flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAttach" />
            <button type="button" class="p-2 text-neutral-400 hover:text-neutral-600" title="Attach Image" @click="triggerAttach">📎</button>
            
            <button type="submit" :disabled="(!draft.trim() && !currentAttachedImage) || sending" class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-50" aria-label="Send message">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </template>

        <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center bg-white">
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold">Select a conversation</h3>
          <p class="mt-1 max-w-xs text-sm text-neutral-500">Pick someone from the list to plan your book handover.</p>
        </div>
      </div>

      <!-- 3rd Column: User Profile Details with Reputation Score -->
      <div class="hidden min-h-0 flex-col overflow-y-auto bg-white p-4 md:flex">
        <template v-if="active">
          <div class="flex flex-col items-center border-b border-black/5 pb-4 text-center">
            <Avatar :src="photoOf(active.user)" :name="active.user.name" size="h-20 w-20 text-xl" />
            <h3 class="mt-3 font-display text-base font-semibold">{{ active.user.name }}</h3>
            <p class="text-xs text-neutral-500 truncate max-w-full">{{ active.user.email || 'N/A' }} · {{ active.user.city || 'dhaka' }}</p>
            <p class="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
              ⭐ {{ userHistory?.stats?.reputation_score ?? active.user.reputation_score ?? '4.8' }} <span class="text-neutral-400 font-normal">reputation</span>
            </p>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2 text-center">
            <div class="rounded-lg bg-paper p-3 border border-black/5">
              <p class="font-display text-base font-bold text-neutral-800">{{ userHistory?.stats?.books_listed ?? 0 }}</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wide">Books listed</p>
            </div>
            <div class="rounded-lg bg-paper p-3 border border-black/5">
              <p class="font-display text-base font-bold text-neutral-800">{{ userHistory?.stats?.exchanges_completed ?? 0 }}</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wide">Exchanges done</p>
            </div>
            <div class="rounded-lg bg-paper p-3 border border-black/5">
              <p class="font-display text-base font-bold text-neutral-800">3</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wide">On wishlist</p>
            </div>
            <div class="rounded-lg bg-paper p-3 border border-black/5">
              <p class="font-display text-base font-bold text-rose-800">Sept 2026</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wide">Member since</p>
            </div>
          </div>

          <div class="mt-4 border-t border-black/5 pt-4 space-y-2 text-xs">
            <div class="flex justify-between items-center"><span class="text-neutral-400">Active Book:</span> <span class="font-medium text-brand truncate max-w-[140px]">{{ active.book || 'N/A' }}</span></div>
          </div>
        </template>
        <div v-else class="flex flex-1 flex-col items-center justify-center text-center text-xs text-neutral-400">
          <p>Select a chat to view reader profile details.</p>
        </div>
      </div>

    </section>

    <template #overlay><Toast :message="toast" /></template>
  </AppLayout>
</template>