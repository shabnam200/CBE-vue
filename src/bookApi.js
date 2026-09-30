 // resources/js/bookApi.js
// Book-related calls to the Laravel API (friend's endpoints). Everything else
// (me, wishlist, notifications, requests) still comes from './api'.
import { http } from './http'
import { USE_MOCK, STORAGE_URL } from './config'
import { books as mockBooks } from './data/mock'

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))

// axios client -> ./http.js, config (.env) -> ./config.js
export { http }

/* ------------------------------------------------------------------ *
 * 2. Allowed values (must match the backend validation rules)
 * ------------------------------------------------------------------ */
export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'poor', label: 'Poor' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]
export const AVAILABILITY = [
  { value: 'exchange', label: 'Exchange' },
  { value: 'donate', label: 'Donate (free)' },
  { value: 'lend', label: 'Lend' },
]

/* ------------------------------------------------------------------ *
 * 3. Normalisers: turn whatever the API returns into the shape the UI uses
 * ------------------------------------------------------------------ */
function imageUrl(raw) {
  if (!raw) return null
  if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  const path = raw.startsWith('/') ? raw : raw.startsWith('storage/') ? `/${raw}` : `/storage/${raw}`
  return STORAGE_URL + path
}

export function normalizeBook(b) {
  if (!b) return null
  const owner = b.owner ?? b.user ?? null
  return {
    ...b,
    image_url: imageUrl(b.image_url ?? b.image ?? b.image_path ?? b.cover),
    available_copies: b.available_copies ?? b.copies_available ?? b.copies ?? null,
    owner: owner ? { ...owner, reputation_score: owner.reputation_score ?? owner.rating ?? null } : null,
  }
}

const rowsOf = (res) => {
  const p = res.data
  if (Array.isArray(p)) return p
  if (Array.isArray(p?.data)) return p.data
  if (Array.isArray(p?.data?.data)) return p.data.data
  if (Array.isArray(p?.books)) return p.books
  return []
}

function toPage(res) {
  let p = res.data
  if (p?.data && !Array.isArray(p.data) && Array.isArray(p.data.data)) p = p.data // { success, data: { data: [...] } }
  const rows = rowsOf({ data: p })
  const meta = p?.meta ?? p ?? {}
  return {
    data: rows.map(normalizeBook),
    current_page: meta.current_page ?? 1,
    last_page: meta.last_page ?? 1,
    total: meta.total ?? rows.length,
  }
}

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null && v !== false))

/** Laravel 422 -> first validation message, otherwise a fallback text */
export function apiError(e, fallback = 'Something went wrong. Please try again.') {
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors).flat()[0]
  return e?.response?.data?.message || fallback
}

/* ------------------------------------------------------------------ *
 * 4. Dashboard
 * ------------------------------------------------------------------ */
// 'Like New' (mock) -> 'like_new' (filter value)
const slug = (s) => String(s).toLowerCase().replace(/\s+/g, '_')

// GET /api/books?q=&genre=&condition=&availability_type=&city=&per_page=
export async function getBooks({ search, genre, condition, availability_type, city, page = 1, per_page = 12 } = {}) {
  if (USE_MOCK) {
    await wait()
    const q = (search || '').trim().toLowerCase()
    const filtered = mockBooks.filter((b) =>
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (!genre || b.genre === genre) &&
      (!condition || slug(b.condition) === condition) &&
      (!availability_type || b.availability_type === availability_type) &&
      (!city || b.owner.city === city))
    const start = (page - 1) * per_page
    return {
      data: filtered.slice(start, start + per_page),
      current_page: page,
      last_page: Math.max(1, Math.ceil(filtered.length / per_page)),
      total: filtered.length,
    }
  }
  const res = await http.get('/books', { params: clean({ q: search, genre, condition, availability_type, city, page, per_page }) })
  return toPage(res)
}

// GET /api/books/top
export async function getTopBooks() {
  if (USE_MOCK) {
    await wait()
    const top = ['Atomic Habits', 'The Alchemist', 'Sapiens', 'The Hobbit', 'Deep Work', 'Zero to One']
    return mockBooks.filter((b) => top.includes(b.title))
  }
  return rowsOf(await http.get('/books/top')).map(normalizeBook)
}

// GET /api/books/{id}
export async function getBook(id) {
  if (USE_MOCK) {
    await wait(100)
    return { ...mockBooks.find((b) => b.id === id), available_copies: 1 }
  }
  const p = (await http.get(`/books/${id}`)).data
  return normalizeBook({ ...(p?.data ?? p?.book ?? p), available_copies: p?.available_copies }) // backend { book, available_copies }
}

// GET /api/matches
export async function getMatches() {
  if (USE_MOCK) {
    await wait()
    const match = ['Sapiens', 'The Hobbit', 'Milk and Honey']
    return mockBooks.filter((b) => match.includes(b.title))
  }
  return rowsOf(await http.get('/matches'))
    .map((m) => normalizeBook(m.book ?? m.matched_book ?? m.available_book ?? m))
    .filter(Boolean)
}

/* ------------------------------------------------------------------ *
 * 5. My Books
 * ------------------------------------------------------------------ */

// ---- in-memory mock for My Books (mock mode e ei data reload dile reset hoy) ----
let myMock = mockBooks.filter((b) => b.user_id === 2).map((b) => ({ ...b }))
const paged = (list, page, per = 8) => ({
  data: list.slice((page - 1) * per, page * per),
  current_page: page, last_page: Math.max(1, Math.ceil(list.length / per)), total: list.length,
})
const fromForm = (fd) => Object.fromEntries([...fd.entries()].filter(([k]) => k !== '_method'))
const mockImage = (v) => (v instanceof File ? URL.createObjectURL(v) : null)

// GET /api/my-books
export async function getMyBooks(page = 1) {
  if (USE_MOCK) { await wait(); return paged(myMock, page) }
  return toPage(await http.get('/my-books', { params: { page } }))
}

// POST /api/books  (FormData: title, author, genre, condition, availability_type, image)
export async function storeBook(formData) {
  if (USE_MOCK) {
    await wait()
    const d = fromForm(formData)
    const b = { id: Date.now(), ...d, image_url: mockImage(d.image), user_id: 2, owner: mockBooks[0].owner, created_at: new Date().toISOString() }
    myMock = [b, ...myMock]
    return { data: b }
  }
  return http.post('/books', formData)
}

// POST /api/books/{id} with _method=PUT (Laravel can't read files from a real PUT)
export async function updateBook(id, formData) {
  if (USE_MOCK) {
    await wait()
    const d = fromForm(formData); const img = mockImage(d.image); delete d.image
    myMock = myMock.map((b) => (b.id === id ? { ...b, ...d, ...(img ? { image_url: img } : {}) } : b))
    return { data: myMock.find((b) => b.id === id) }
  }
  formData.append('_method', 'PUT')
  return http.post(`/books/${id}`, formData)
}

// DELETE /api/books/{id}
export async function deleteBook(id) {
  if (USE_MOCK) { await wait(250); myMock = myMock.filter((b) => b.id !== id); return { data: true } }
  return http.delete(`/books/${id}`)
}