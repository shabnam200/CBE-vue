// resources/js/adminApi.js
//
// The dashboard only talks to `adminApi`. Flip USE_MOCK to switch between
// dummy data and the real Laravel API. Same idea as USE_MOCK in bookApi.js.

import { http, normalizeBook, apiError } from './bookApi' // reuse the axios client (cookie + Bearer token) you already set up
import { mockUsers, mockBooks, mockExchangeTotals } from './data/adminMock'

import { USE_MOCK } from './config'
export { USE_MOCK }                // .env te VITE_USE_MOCK=false dile real API
const MOCK_PER_PAGE = 6             // small on purpose, so pagination is visible with dummy data

/* ------------------------------------------------------------------ */
/* Mock implementation (in memory, resets on page reload)              */
/* ------------------------------------------------------------------ */
const users = mockUsers.map((u) => ({ ...u, reports: [...u.reports] }))
let books = mockBooks.map((b) => ({ ...b }))

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms))

// Same shape as Laravel's paginate()
function paginate(list, page, perPage = MOCK_PER_PAGE) {
  const total = list.length
  const last = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, page), last)
  const start = (current - 1) * perPage
  const data = list.slice(start, start + perPage)
  return { data, current_page: current, last_page: last, total, from: total ? start + 1 : null, to: total ? start + data.length : null }
}

const mockApi = {
  async getStats() {
    await wait()
    return { users: users.length, books: books.length, ...mockExchangeTotals }
  },

  async getBooks(page = 1) {
    await wait()
    const sorted = [...books].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return paginate(sorted, page)
  },

  async deleteBook(id) {
    await wait(250)
    books = books.filter((b) => b.id !== id)
    return { message: 'Book deleted' }
  },

  async getUsers({ page = 1, q = '' } = {}) {
    await wait()
    const term = q.trim().toLowerCase()
    const list = users
      .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return paginate(list, page)
  },

  async setUserStatus(id, status) {
    await wait(250)
    const u = users.find((x) => x.id === id)
    if (u) u.status = status
    return { message: 'User status updated successfully' }
  },

  async deleteUser(id) {
    await wait(250)
    const u = users.find((x) => x.id === id)
    if (u && u.role === 'admin') throw Object.assign(new Error('Admin accounts cannot be deleted.'), { status: 422 })
    users.splice(users.indexOf(u), 1)
    books = books.filter((b) => b.owner.id !== id)
    return { message: 'User deleted' }
  },
}

/* ------------------------------------------------------------------ */
/* Real implementation (Laravel /api/admin/*), uses `http` from bookApi */
/* ------------------------------------------------------------------ */
// Turn axios errors into a plain Error with .status, so the dashboard can react to 401/403
async function call(promise) {
  try {
    return (await promise).data
  } catch (e) {
    throw Object.assign(new Error(apiError(e)), { status: e?.response?.status })
  }
}

const realApi = {
  getStats: () => call(http.get('/admin/stats')),
  async getBooks(page = 1) {
    const p = await call(http.get('/admin/books', { params: { page } }))
    return { ...p, data: p.data.map(normalizeBook) }
  },
  deleteBook: (id) => call(http.delete(`/admin/books/${id}`)),
  getUsers: ({ page = 1, q = '' } = {}) => call(http.get('/admin/users', { params: { page, ...(q ? { q } : {}) } })),
  setUserStatus: (id, status) => call(http.put(`/admin/users/${id}`, { status })),
  deleteUser: (id) => call(http.delete(`/admin/users/${id}`)),
}

export const adminApi = USE_MOCK ? mockApi : realApi