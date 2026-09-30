<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/Layouts/AppLayout.vue'
import Toast from '@/Components/Toast.vue'
import Avatar from '@/Components/Avatar.vue'
import { app } from '@/stores/app'
import { imageUrl } from '@/bookApi'
import { getConversations, getMessages, sendMessage, startConversation } from '@/api/modules'
import { useToast } from '@/composables/useToast'
import { initials, timeAgo, clock } from '@/utils/format'

const route = useRoute()
const { toast, say } = useToast()

const convos = ref([])
const loadingList = ref(true)
const activeId = ref(null)
const messages = ref([])
const loadingMsgs = ref(false)
const draft = ref('')
const sending = ref(false)
const search = ref('')
const scroller = ref(null)

const active = computed(() => convos.value.find((c) => c.id === activeId.value) || null)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return convos.value.filter((c) => !q || c.user.name.toLowerCase().includes(q) || (c.book || '').toLowerCase().includes(q))
})
const photoOf = (u) => imageUrl(u?.avatar_url ?? u?.avatar ?? u?.profile_photo_url) || ''
const totalUnread = computed(() => convos.value.reduce((n, c) => n + (c.unread || 0), 0))

const toBottom = async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function openConvo(c) {
  activeId.value = c.id
  loadingMsgs.value = true
  messages.value = []
  try {
    messages.value = (await getMessages(c.id)).data
    c.unread = 0
    app.setConvoUnread(c.id, 0)
  } catch {
    say('Could not load messages.')
  } finally {
    loadingMsgs.value = false
    toBottom()
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || !active.value || sending.value) return
  sending.value = true
  draft.value = ''
  try {
    const res = await sendMessage(active.value.id, text)
    messages.value.push(res.data)
    active.value.last_message = res.data
    toBottom()
  } catch {
    draft.value = text
    say('Message not sent. Please try again.')
  } finally {
    sending.value = false
  }
}

// Notun message ashlo kina 8 sec por por check (list + khola thread)
let poll = null
async function pollNow() {
  if (document.visibilityState !== 'visible') return
  try {
    const fresh = (await getConversations()).data
    fresh.forEach((f) => { if (f.id === activeId.value) f.unread = 0 })
    convos.value = fresh
    fresh.forEach((f) => app.setConvoUnread(f.id, f.unread))
    if (activeId.value) {
      const latest = (await getMessages(activeId.value)).data
      if (latest.length !== messages.value.length) { messages.value = latest; toBottom() }
    }
  } catch { /* ignore */ }
}
onBeforeUnmount(() => clearInterval(poll))

onMounted(async () => {
  poll = setInterval(pollNow, 8000)
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
      try { c = (await startConversation(withId)).data; convos.value.unshift(c) } catch { /* ignore */ }
    }
    if (c) openConvo(c)
  }
})
</script>

<template>
  <AppLayout
    current="Messages"
    title="Messages"
    subtitle="Chat with other readers to plan the handover."
    v-model:search="search"
    search-placeholder="Search people or books"
  >
    <template #actions>
      <span class="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{{ totalUnread }} unread</span>
    </template>

    <section class="grid h-[calc(100vh-10.5rem)] min-h-[30rem] overflow-hidden rounded-2xl border border-black/5 bg-white md:grid-cols-[20rem_minmax(0,1fr)] shadow-sm">
          <!-- Conversation list -->
          <div class="min-h-0 flex-col border-black/5 md:flex md:border-r" :class="activeId ? 'hidden' : 'flex'">
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
                    <span class="shrink-0 text-[10px] text-neutral-400">{{ timeAgo(c.last_message?.at) }}</span>
                  </span>
                  <span class="flex items-center justify-between gap-2">
                    <span class="truncate text-xs" :class="c.unread ? 'font-medium text-ink' : 'text-neutral-500'">{{ c.last_message?.text || 'Say hello!' }}</span>
                    <span v-if="c.unread" class="flex h-4 min-w-4 shrink-0 animate-pop items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{{ c.unread }}</span>
                  </span>
                </span>
              </button>
              </template>
            </div>
          </div>

          <!-- Thread -->
          <div class="min-h-0 min-w-0 flex-col md:flex" :class="activeId ? 'flex' : 'hidden'">
            <template v-if="active">
              <div class="flex items-center gap-3 border-b border-black/5 px-4 py-3">
                <button type="button" class="rounded-lg p-1.5 text-neutral-500 hover:bg-brand-soft md:hidden" aria-label="Back to conversations" @click="activeId = null">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <Avatar :src="photoOf(active.user)" :name="active.user.name" size="h-9 w-9 text-sm" />
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ active.user.name }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ active.user.city }}<template v-if="active.book"> · about "{{ active.book }}"</template></p>
                </div>
              </div>

              <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper/60 p-4">
                <p v-if="loadingMsgs" class="py-10 text-center text-sm text-neutral-400">Loading messages...</p>
                <p v-else-if="!messages.length" class="py-10 text-center text-sm text-neutral-500">No messages yet. Say hello to {{ active.user.name.split(' ')[0] }}!</p>
                <div v-for="m in messages" :key="m.id" class="flex animate-scale-in" :class="m.from === 'me' ? 'justify-end' : 'justify-start'">
                  <div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm" :class="m.from === 'me' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-black/5 bg-white text-ink'">
                    <p class="whitespace-pre-wrap break-words">{{ m.text }}</p>
                    <p class="mt-1 text-[10px]" :class="m.from === 'me' ? 'text-white/70' : 'text-neutral-400'">{{ clock(m.at) }}</p>
                  </div>
                </div>
              </div>

              <form class="flex items-center gap-2 border-t border-black/5 p-3" @submit.prevent="send">
                <input v-model="draft" type="text" placeholder="Type a message" aria-label="Message" maxlength="1000" class="min-w-0 flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                <button type="submit" :disabled="!draft.trim() || sending" class="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50">Send</button>
              </form>
            </template>

            <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </span>
              <h3 class="mt-4 font-display text-lg font-semibold">Select a conversation</h3>
              <p class="mt-1 max-w-xs text-sm text-neutral-500">Pick someone from the list to plan your book handover.</p>
            </div>
          </div>
        </section>
      
    <template #overlay><Toast :message="toast" /></template>
  </AppLayout>
</template>