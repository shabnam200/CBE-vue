// Auth related sob API call. Friend er endpoint name alada hole shudhu ei file bodlaw.
// Real mode: POST /login -> { token, user }  (ba Sanctum cookie hole shudhu { user })
import { http } from '../http'
import { USE_MOCK, TOKEN_KEY } from '../config'
import { apiError } from '../bookApi'

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const fail = (message, field = 'email') => Object.assign(new Error(message), { status: 422, errors: { [field]: [message] } })

// ---- mock users (in-memory + localStorage) ----
const mockUser = (email, name) => ({
  id: 1, name: name || email.split('@')[0], email, city: 'Sylhet',
  role: /admin/i.test(email) ? 'admin' : 'user', email_verified_at: '2026-09-01T00:00:00Z',
})

function pick(res) {
  const p = res.data
  return { token: p.token ?? p.access_token ?? p.data?.token ?? null, user: p.user ?? p.data?.user ?? p.data ?? null }
}

export async function login({ email, password }) {
  if (USE_MOCK) {
    await wait()
    if (!email || !password) throw fail('Email and password are required.')
    return { token: 'mock-token', user: mockUser(email) }
  }
  return pick(await http.post('/login', { email, password }))            // POST /api/login
}

export async function register({ name, email, password, password_confirmation }) {
  if (USE_MOCK) {
    await wait()
    if (password !== password_confirmation) throw fail('Passwords do not match.', 'password_confirmation')
    return { token: 'mock-token', user: mockUser(email, name) }
  }
  return pick(await http.post('/register', { name, email, password, password_confirmation })) // POST /api/register
}

export async function logout() {
  if (USE_MOCK) { await wait(100); return }
  await http.post('/logout').catch(() => {})                              // POST /api/logout
}

export async function fetchUser() {
  if (USE_MOCK) return null
  const p = (await http.get('/me')).data                                  // GET /api/me
  return p.data ?? p.user ?? p
}

export async function forgotPassword(email) {
  if (USE_MOCK) { await wait(); return { message: 'We have emailed your password reset link.' } }
  return (await http.post('/forgot-password', { email })).data
}

export async function resetPassword(payload) {
  if (USE_MOCK) { await wait(); return { message: 'Your password has been reset.' } }
  return (await http.post('/reset-password', payload)).data
}

export async function updateProfile(payload) {
  if (USE_MOCK) { await wait(); return { user: { ...payload } } }
  const p = (await http.post('/profile', payload)).data                   // POST /api/profile
  return { user: p.user ?? p.data ?? p }
}

export async function updatePassword(payload) {
  if (USE_MOCK) { await wait(); return { message: 'Password updated' } }
  return (await http.put('/user/password', payload)).data                 // PUT /api/user/password
}

export async function deleteAccount(password) {
  if (USE_MOCK) { await wait(); return { message: 'Deleted' } }
  return (await http.delete('/user', { data: { password } })).data        // DELETE /api/user
}

export { apiError }
