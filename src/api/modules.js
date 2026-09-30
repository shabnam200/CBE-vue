// =====================================================================
//  Requests / Messages / Notifications / Wishlist / Profile module API
// =====================================================================
//  Ekhon mock data diye cholche.
//  Real API boshate: prottek function e  "REAL API" er comment kora line gulo
//  uncomment koro, r niche "MOCK" block ta muche dao (ba return er age rakho).
//  Endpoint name / response shape backend er sathe miliye nio.
//  axios client (Bearer token + cookie) = src/http.js
// =====================================================================
import { http } from '../http' // eslint-disable-line no-unused-vars -- real API uncomment korle lagbe
import { books } from '../data/mock'
import { notifications, initialWishlist } from '../data/mock'
import { requests, conversations, reviews, profileStats } from '../data/moduleMock'

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
  // ---- REAL API ----
  // const res = await http.get('/exchange-requests')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: clone(_requests) }
}

// PUT /api/exchange-requests/{id}  body: { status: 'accepted' | 'rejected' | 'completed' }
export async function respondToRequest(id, status) {
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
  // ---- REAL API ----
  // const res = await http.get('/notifications')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: clone(_notes) }
}

// POST /api/notifications/{id}/read
export async function markNotificationRead(id) {
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
  // ---- REAL API ----
  // const res = await http.get('/wishlists')
  // return res.data
  // ---- MOCK ----
  await wait(400)
  return { data: clone(_wish) }
}

// DELETE /api/wishlists/{bookId}
export async function removeFromWishlist(bookId) {
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
  // ---- REAL API ----
  // const res = await http.get('/user/summary')
  // return res.data
  // ---- MOCK ----
  await wait()
  return { data: { stats: { ...profileStats }, reviews: clone(reviews) } }
}
