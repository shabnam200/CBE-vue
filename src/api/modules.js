// =====================================================================
//  Requests / Messages / Notifications / Wishlist / Profile module API
// =====================================================================
//  Ekhon mock data diye cholche.
//  Real API boshate: prottek function e  "REAL API" er comment kora line gulo
//  uncomment koro, r niche "MOCK" block ta muche dao (ba return er age rakho).
//  Endpoint name / response shape backend er sathe miliye nio.
//  axios client (Bearer token + cookie) = src/http.js
// =====================================================================
import { http } from '../http'
import { USE_MOCK } from '../config'
import { auth } from '../stores/auth'
import { normalizeBook } from '../bookApi'
import { books } from '../data/mock'
import { notifications, initialWishlist } from '../data/mock'
import { requests, conversations, reviews, profileStats } from '../data/moduleMock'


/* ------------------------------------------------------------------ *
 * REAL API helpers (USE_MOCK=false hole ei gulo kaj kore)
 * ------------------------------------------------------------------ */
const myId = () => auth.user?.id

// Laravel paginate() er sob page ekshathe ane
async function allPages(path, params = {}, maxPages = 20) {
  let page = 1, last = 1
  const rows = []
  do {
    const p = (await http.get(path, { params: { ...params, page } })).data
    rows.push(...(Array.isArray(p) ? p : p.data || []))
    last = Array.isArray(p) ? 1 : p.last_page || 1
    page++
  } while (page <= last && page <= maxPages)
  return rows
}

// Backend exchange request -> frontend shape
function mapRequest(r) {
  const outgoing = r.sender_id === myId()
  return {
    id: r.id,
    status: r.status,
    direction: outgoing ? 'outgoing' : 'incoming',
    book: normalizeBook(r.book),
    other_user: (outgoing ? r.receiver : r.sender) || { id: 0, name: 'Unknown', city: '' },
    message: null,
    created_at: r.created_at,
    reviewed: false,
  }
}

const mapMessage = (m) => ({
  id: m.id,
  from: m.sender_id === myId() ? 'me' : 'them',
  text: m.message,
  at: m.created_at,
})

// Backend notification e type nai, message text dekhe type/link bujhi
function mapNotification(n) {
  const t = String(n.message || '').toLowerCase()
  let type = 'system', link = null
  if (t.includes('wishlist')) { type = 'wishlist'; link = '/wishlist' }
  else if (t.includes('sent a request')) { type = 'request'; link = '/requests' }
  else if (t.includes('was accepted')) { type = 'accepted'; link = '/requests' }
  else if (t.includes('was rejected') || t.includes('was cancelled')) { type = 'rejected'; link = '/requests' }
  else if (t.includes('was completed')) { type = 'accepted'; link = '/requests' }
  else if (t.includes('message')) { type = 'message'; link = '/messages' }
  else if (t.includes('rated you')) { type = 'review'; link = '/profile' }
  return { id: n.id, type, message: n.message, is_read: !!n.is_read, created_at: n.created_at, link }
}

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))

// mock state (page reload dile reset hoy)
let _requests = clone(requests)
let _convos = clone(conversations)
let _notes = clone(notifications)
let _wish = clone(initialWishlist)

/* ------------------------------------------------------------------ *
 * REQUESTS
 * ------------------------------------------------------------------ */

// GET /api/exchange-requests  ->  { data: [{ id, direction: 'incoming'|'outgoing', status, book, other_user, message, created_at, reviewed }] }
export async function getRequests() {
  if (!USE_MOCK) {
    const rows = await allPages('/exchange-requests')
    return { data: rows.map(mapRequest) }
  }
  // ---- REAL API ----
  // const res = await http.get('/exchange-requests')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: clone(_requests) }
}

// PUT /api/exchange-requests/{id}  body: { status: 'accepted' | 'rejected' | 'completed' }
export async function respondToRequest(id, status) {
  if (!USE_MOCK) {
    const action = { accepted: 'accept', rejected: 'reject', completed: 'complete', cancelled: 'cancel' }[status]
    return (await http.patch(`/exchange-requests/${id}/${action}`)).data
  }
  // ---- REAL API ----
  // const res = await http.put(`/exchange-requests/${id}`, { status })
  // return res.data
  // ---- MOCK ----
  await wait(300)
  _requests = _requests.map((r) => (r.id === id ? { ...r, status } : r))
  return { data: _requests.find((r) => r.id === id) }
}

export const completeRequest = (id) => respondToRequest(id, 'completed')

// DELETE /api/exchange-requests/{id}   (sender nijer pending request cancel kore)
export async function cancelRequest(id) {
  if (!USE_MOCK) {
    return (await http.patch(`/exchange-requests/${id}/cancel`)).data
  }
  // ---- REAL API ----
  // const res = await http.delete(`/exchange-requests/${id}`)
  // return res.data
  // ---- MOCK ----
  await wait(300)
  _requests = _requests.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
  return { data: true }
}

// POST /api/reviews   body: { exchange_request_id, rating (1-5), comment }
export async function submitReview(requestId, { rating, comment }) {
  if (!USE_MOCK) {
    return (await http.post(`/exchange-requests/${requestId}/rating`, { rating, comment })).data
  }
  // ---- REAL API ----
  // const res = await http.post('/reviews', { exchange_request_id: requestId, rating, comment })
  // return res.data
  // ---- MOCK ----
  await wait(400)
  _requests = _requests.map((r) => (r.id === requestId ? { ...r, reviewed: true } : r))
  return { data: { exchange_request_id: requestId, rating, comment } }
}

/* ------------------------------------------------------------------ *
 * MESSAGES
 * ------------------------------------------------------------------ */
const lastOf = (c) => c.messages[c.messages.length - 1] || null

// GET /api/conversations  ->  { data: [{ id, user: {id,name,city}, book, unread, last_message: {text, at} }] }
export async function getConversations() {
  if (!USE_MOCK) {
    const rows = await allPages('/exchange-requests')
    const list = rows
      .filter((r) => ['accepted', 'completed'].includes(r.status))
      .map(mapRequest)
      .map((r) => ({ id: r.id, user: r.other_user, book: r.book?.title || '', unread: 0, last_message: null }))
    return { data: list }
  }
  // ---- REAL API ----
  // const res = await http.get('/conversations')
  // return res.data
  // ---- MOCK ----
  await wait()
  const list = _convos
    .map((c) => ({ id: c.id, user: c.user, book: c.book, unread: c.unread, last_message: lastOf(c) }))
    .sort((a, b) => new Date(b.last_message?.at || 0) - new Date(a.last_message?.at || 0))
  return { data: clone(list) }
}

// GET /api/conversations/{id}/messages  ->  { data: [{ id, from: 'me'|'them', text, at }] }
export async function getMessages(conversationId) {
  if (!USE_MOCK) {
    const rows = (await http.get(`/exchange-requests/${conversationId}/messages`)).data
    return { data: rows.map(mapMessage) }
  }
  // ---- REAL API ----
  // const res = await http.get(`/conversations/${conversationId}/messages`)
  // return res.data
  // ---- MOCK ----
  await wait(200)
  const c = _convos.find((x) => x.id === conversationId)
  if (c) c.unread = 0
  return { data: clone(c?.messages || []) }
}

// POST /api/conversations/{id}/messages  body: { text }   ->  { data: { id, from: 'me', text, at } }
export async function sendMessage(conversationId, text) {
  if (!USE_MOCK) {
    const m = (await http.post(`/exchange-requests/${conversationId}/messages`, { message: text })).data
    return { data: mapMessage(m) }
  }
  // ---- REAL API ----
  // const res = await http.post(`/conversations/${conversationId}/messages`, { text })
  // return res.data
  // ---- MOCK ----
  await wait(150)
  const c = _convos.find((x) => x.id === conversationId)
  const msg = { id: Date.now(), from: 'me', text, at: new Date().toISOString() }
  c?.messages.push(msg)
  return { data: msg }
}

// POST /api/conversations  body: { user_id }   (kono user er sathe notun chat shuru)
export async function startConversation(userId) {
  if (!USE_MOCK) {
    // Backend e alada "conversation" nai. Chat shudhu accepted request er upor khole.
    throw new Error('No accepted request with this user yet.')
  }
  // ---- REAL API ----
  // const res = await http.post('/conversations', { user_id: userId })
  // return res.data
  // ---- MOCK ----
  await wait(200)
  const existing = _convos.find((c) => c.user.id === userId)
  if (existing) return { data: { id: existing.id, user: existing.user, book: existing.book, unread: 0, last_message: lastOf(existing) } }
  const owner = books.map((b) => b.owner).find((o) => o.id === userId)
  if (!owner) throw new Error('User not found')
  const c = { id: Date.now(), user: owner, book: '', unread: 0, messages: [] }
  _convos.push(c)
  return { data: { id: c.id, user: c.user, book: '', unread: 0, last_message: null } }
}

/* ------------------------------------------------------------------ *
 * NOTIFICATIONS
 * ------------------------------------------------------------------ */

// GET /api/notifications  ->  { data: [{ id, type, message, is_read, created_at, link }] }
export async function getAllNotifications() {
  if (!USE_MOCK) {
    const p = (await http.get('/notifications')).data
    return { data: (p.data || p).map(mapNotification) }
  }
  // ---- REAL API ----
  // const res = await http.get('/notifications')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: clone(_notes) }
}

// POST /api/notifications/{id}/read
export async function markNotificationRead(id) {
  if (!USE_MOCK) {
    return (await http.patch(`/notifications/${id}/read`)).data
  }
  // ---- REAL API ----
  // const res = await http.post(`/notifications/${id}/read`)
  // return res.data
  // ---- MOCK ----
  await wait(100)
  _notes = _notes.map((n) => (n.id === id ? { ...n, is_read: true } : n))
  return { data: true }
}

// POST /api/notifications/read-all
export async function markAllNotificationsRead() {
  if (!USE_MOCK) {
    return (await http.patch('/notifications/read-all')).data
  }
  // ---- REAL API ----
  // const res = await http.post('/notifications/read-all')
  // return res.data
  // ---- MOCK ----
  await wait(150)
  _notes = _notes.map((n) => ({ ...n, is_read: true }))
  return { data: true }
}

// DELETE /api/notifications/{id}
export async function deleteNotification(id) {
  if (!USE_MOCK) {
    // Backend e notification delete er route nai
    throw new Error('Delete is not supported by the backend yet.')
  }
  // ---- REAL API ----
  // const res = await http.delete(`/notifications/${id}`)
  // return res.data
  // ---- MOCK ----
  await wait(150)
  _notes = _notes.filter((n) => n.id !== id)
  return { data: true }
}

/* ------------------------------------------------------------------ *
 * WISHLIST
 * ------------------------------------------------------------------ */

// GET /api/wishlists  ->  { data: [book + { available: boolean }] }
export async function getWishlist() {
  if (!USE_MOCK) {
    const rows = (await http.get('/wishlist')).data
    return { data: rows.filter((w) => w.book).map((w) => ({ ...normalizeBook(w.book), available: true })) }
  }
  // ---- REAL API ----
  // const res = await http.get('/wishlists')
  // return res.data
  // ---- MOCK ----
  await wait(400)
  return { data: clone(_wish) }
}

// DELETE /api/wishlists/{bookId}
export async function removeFromWishlist(bookId) {
  if (!USE_MOCK) {
    return (await http.delete(`/wishlist/${bookId}`)).data
  }
  // ---- REAL API ----
  // const res = await http.delete(`/wishlists/${bookId}`)
  // return res.data
  // ---- MOCK ----
  await wait(200)
  _wish = _wish.filter((b) => b.id !== bookId)
  return { data: true }
}

/* ------------------------------------------------------------------ *
 * PROFILE
 * ------------------------------------------------------------------ */

// GET /api/user/summary  ->  { data: { stats: { books_listed, exchanges_completed, wishlist_items, joined_at }, reviews: [{ id, from, rating, comment, book, created_at }] } }
export async function getProfileSummary() {
  if (!USE_MOCK) {
    const uid = myId()
    const [mine, reqs, wish, ratings] = await Promise.all([
      http.get('/my-books').then((r) => r.data).catch(() => ({ total: 0 })),
      allPages('/exchange-requests').catch(() => []),
      http.get('/wishlist').then((r) => r.data).catch(() => []),
      uid ? http.get(`/users/${uid}/ratings`).then((r) => r.data).catch(() => ({ data: [] })) : { data: [] },
    ])
    return {
      data: {
        stats: {
          books_listed: mine.total ?? (mine.data || []).length,
          exchanges_completed: reqs.filter((r) => r.status === 'completed').length,
          wishlist_items: wish.length,
          joined_at: auth.user?.created_at,
        },
        reviews: (ratings.data || []).map((x) => ({
          id: x.id, from: x.rater?.name || 'Member', rating: x.rating, comment: x.comment, book: '', created_at: x.created_at,
        })),
      },
    }
  }
  // ---- REAL API ----
  // const res = await http.get('/user/summary')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: { stats: { ...profileStats }, reviews: clone(reviews) } }
}

/* ------------------------------------------------------------------ *
 * AVATAR (profile photo)
 * ------------------------------------------------------------------ */
// POST /api/user/avatar  (FormData: avatar)  ->  { avatar_url }   <-- backend e ei route ta add korte hobe
export async function uploadAvatar(file) {
  if (!USE_MOCK) {
    const fd = new FormData()
    fd.append('avatar', file)
    const p = (await http.post('/user/avatar', fd)).data
    return { avatar_url: p.avatar_url ?? p.data?.avatar_url ?? p.user?.avatar_url ?? null }
  }
  await wait(400)
  return { avatar_url: null } // mock: local e save hoy (stores/app.js)
}

// DELETE /api/user/avatar
export async function removeAvatarApi() {
  if (!USE_MOCK) return (await http.delete('/user/avatar')).data
  await wait(200)
  return { data: true }
}
