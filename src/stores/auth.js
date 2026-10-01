// Chhoto global auth store (Pinia lagbe na). `auth.user` diye kono page e current user pabe.
import { reactive, computed } from 'vue'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../config'

const read = () => { try { return JSON.parse(localStorage.getItem('cbe_user')) } catch { return null } }
const state = reactive({ user: read(), ready: false })

const save = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) { state.user = user; localStorage.setItem('cbe_user', JSON.stringify(user)) }
}

export const auth = {
  state,
  get user() { return state.user },
  isLoggedIn: computed(() => Boolean(state.user)),
  isAdmin: computed(() => state.user?.role === 'admin'),

  async login(creds) { save(await authApi.login(creds)) },
  async register(data) { save(await authApi.register(data)) },
  async logout() {
    // Age local session clear kori (UI sathe sathe logged-out hoy), server call background e jay.
    // Server hang/fail korleo user atke thakbe na.
    const token = localStorage.getItem(TOKEN_KEY)
    const req = token ? authApi.logout(token) : Promise.resolve()
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('cbe_user'); state.user = null
    await Promise.race([req.catch(() => {}), new Promise((r) => setTimeout(r, 1500))])
  },
  setUser(user) { save({ user }) },
  // App load e ekbar call hoy: token thakle server theke fresh user ane
  async init() {
    try {
      if (localStorage.getItem(TOKEN_KEY)) { const u = await authApi.fetchUser(); if (u) save({ user: u }) }
    } catch { /* token expired hole interceptor handle korbe */ }
    state.ready = true
  },
}
