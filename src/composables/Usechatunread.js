// Firestore chat theke "koyjon er unread message ache" hishab kore.
// App-wide ek-i state — Sidebar (badge) ar Messages page (list) duijon-i eta use kore.
//
//   const chat = useChatUnread()
//   chat.count.value        -> koyjon manush unread message pathiyeche (sidebar badge)
//   chat.isUnread(userId)   -> oi manush er unread ache kina
//   chat.last[userId]       -> { message, image, sender_id, at(ms) } latest message
//   chat.setActive(userId)  -> je chat ekhon khola ache (oitar message auto "read" hoy)
//
// "Read" kora somoy browser e (localStorage) rakha hoy, user wise alada.
import { reactive, ref, computed, watch, unref } from 'vue'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import { auth } from '@/stores/auth'
import { getConversations } from '@/api/modules'

// Duijon er jonno ek-i collection: chat_<chhoto id>_<boro id>
export const chatIdFor = (me, other) => {
  const a = Number(me)
  const b = Number(other)
  return a < b ? `chat_${a}_${b}` : `chat_${b}_${a}`
}

const myId = computed(() => Number(unref(auth.user)?.id) || 0)

const last = reactive({}) // otherId -> latest message
const readAt = reactive({}) // otherId -> last read message time (ms)
const activeId = ref(null)

const unsubs = new Map() // otherId -> unsubscribe fn
let timer = null
let startedFor = 0
let inited = false
// Gate: Dashboard er sequence (authors -> top books -> recommended -> list) shesh na hoa porjonto chat/Firestore start hobe na.
// Dashboard bade onno page e AppLayout nijei enable kore dey.
const enabled = ref(false)
export const enableChatUnread = () => { enabled.value = true }

const storeKey = (id) => `bookhaven:chat-read:${id}`
function loadRead(id) {
  try { Object.assign(readAt, JSON.parse(localStorage.getItem(storeKey(id)) || '{}')) } catch { /* ignore */ }
}
function saveRead() {
  try { localStorage.setItem(storeKey(myId.value), JSON.stringify(readAt)) } catch { /* ignore */ }
}

const isUnread = (otherId) => {
  const m = last[otherId]
  return !!m && m.sender_id !== myId.value && m.at > (readAt[otherId] || 0)
}
const unreadIds = computed(() => Object.keys(last).filter((id) => isUnread(id)))
const count = computed(() => unreadIds.value.length)

function markRead(otherId) {
  const m = last[otherId]
  if (m && m.at > (readAt[otherId] || 0)) {
    readAt[otherId] = m.at
    saveRead()
  }
}

function setActive(otherId) {
  activeId.value = otherId ? Number(otherId) : null
  if (otherId) markRead(otherId)
}

function watchPerson(otherId) {
  if (unsubs.has(otherId)) return
  const q = query(collection(db, chatIdFor(myId.value, otherId)), orderBy('created_at', 'desc'), limit(1))
  unsubs.set(
    otherId,
    onSnapshot(
      q,
      (snap) => {
        const d = snap.docs[0]?.data()
        if (!d) return
        last[otherId] = {
          message: d.message || '',
          image: d.image || null,
          sender_id: Number(d.sender_id),
          at: d.created_at?.toMillis?.() ?? Date.now(),
        }
        // Chat khola thakle notun message sathe sathe "read"
        if (activeId.value === Number(otherId)) markRead(otherId)
      },
      () => { /* permission/network error hole badge dekhabe na, kintu app bhangbe na */ },
    ),
  )
}

// Laravel theke conversation list ene (kar kar sathe chat ache) protyek er latest message watch kori
async function refresh() {
  if (!myId.value) return
  try {
    const res = await getConversations()
    const ids = (res.data || []).map((c) => Number(c.user?.id)).filter(Boolean)
    ids.forEach(watchPerson)
    for (const [id, off] of unsubs) {
      if (!ids.includes(id)) { off(); unsubs.delete(id); delete last[id] }
    }
  } catch { /* ignore */ }
}

function stop() {
  unsubs.forEach((off) => off())
  unsubs.clear()
  clearInterval(timer)
  timer = null
  Object.keys(last).forEach((k) => delete last[k])
  Object.keys(readAt).forEach((k) => delete readAt[k])
  startedFor = 0
}

function start() {
  if (!myId.value || startedFor === myId.value) return
  stop()
  startedFor = myId.value
  loadRead(myId.value)
  refresh()
  timer = setInterval(refresh, 60000) // notun keu prothom bar message korle dhorar jonno
}

function init() {
  if (inited) return
  inited = true
  // Login / logout / user change hole auto restart
  watch([myId, enabled], ([id, on]) => {
    if (!id) { stop(); enabled.value = false } // logout hole abar gate bondho
    else if (on) start()
  }, { immediate: true })
}

export function useChatUnread() {
  init()
  return { last, count, unreadIds, isUnread, markRead, setActive, refresh }
}