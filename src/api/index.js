// ⚠️ সব API call শুধু এই ফাইলে। UI কোনো mock data সরাসরি import করে না।
// Backend ready hole .env te VITE_USE_MOCK=false koro — baki kichu bodlate hobe na.
import { http } from '../http'
import { USE_MOCK } from '../config'
import { auth } from '../stores/auth'
import { books, me, notifications } from '../data/mock'

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms))

// Laravel paginate() এর মতো একই shape
const paginate = (list, page = 1, per_page = 8) => ({
  data: list.slice((page - 1) * per_page, page * per_page),
  current_page: page, last_page: Math.ceil(list.length / per_page) || 1, per_page, total: list.length,
})

export async function getBooks({ search = '', genre = '', city = '', page = 1 } = {}) {
  if (!USE_MOCK) return (await http.get('/books', { params: { search, genre, city, page } })).data
  await wait()
  const q = search.toLowerCase()
  return paginate(books.filter((b) =>
    (!genre || b.genre === genre) && (!city || b.owner.city === city) && (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))), page)
}

export async function getRecommended() {
  if (!USE_MOCK) return (await http.get('/books/recommended')).data // ⚠️ endpoint নাম friend এর সাথে মিলিয়ে নাও
  await wait(); return { data: books.slice(0, 8) }
}

export async function sendExchangeRequest(bookId, message = '') {
  if (!USE_MOCK) return (await http.post('/exchange-requests', { book_id: bookId, message })).data
  await wait(500); return { data: { id: Date.now(), book_id: bookId, status: 'pending' } }
}

// isWished = true hole wishlist theke remove (DELETE), false hole add (POST)
export async function toggleWishlist(bookId, isWished = false) {
  if (!USE_MOCK) {
    return isWished
      ? (await http.delete(`/wishlist/${bookId}`)).data
      : (await http.post('/wishlist', { book_id: bookId })).data
  }
  await wait(200); return { data: { book_id: bookId } }
}

export async function getNotifications() {
  if (!USE_MOCK) return (await http.get('/notifications')).data
  await wait(200); return { data: notifications.map((n) => ({ ...n })) }
}

export async function markNotificationsRead() {
  if (!USE_MOCK) return (await http.patch('/notifications/read-all')).data
  await wait(100); return { data: true }
}

export async function getMe() {
  if (!USE_MOCK) return { data: (await http.get('/me')).data } // backend user object ta shorasori dey
  await wait(100); return { data: auth.user ? { ...me, ...auth.user } : me }
}
