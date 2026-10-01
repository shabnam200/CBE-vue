// Global app state: notifications, message unread count, profile photo.
// Header, Sidebar, Notifications page shobai ekhan theke pay, tai badge sob jayga e sync thake.
import { reactive, computed } from 'vue'
import { auth } from './auth'
import { getAllNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, getConversations, uploadAvatar, removeAvatarApi } from '../api/modules'
import { imageUrl } from '../bookApi'

const state = reactive({ notes: [], convoUnread: {}, loaded: false, avatarLocal: null, avatarUserId: null })
let timer = null

const avatarKey = () => `cbe_avatar_${auth.user?.id ?? 'guest'}`
const loadLocalAvatar = () => { try { state.avatarLocal = localStorage.getItem(avatarKey()) } catch { state.avatarLocal = null } }

const unreadNotes = computed(() => state.notes.filter((n) => !n.is_read).length)
const msgNoteUnread = computed(() => state.notes.filter((n) => n.type === 'message' && !n.is_read).length)
const convoUnreadTotal = computed(() => Object.values(state.convoUnread).reduce((a, b) => a + b, 0))
// Backend conversation e unread na dile message-type notification diye count kori
const unreadMessages = computed(() => Math.max(convoUnreadTotal.value, msgNoteUnread.value))

const avatar = computed(() => {
  const u = auth.user || {}
  return imageUrl(u.avatar_url ?? u.avatar ?? u.profile_photo_url ?? u.photo) || state.avatarLocal || null
})

export const app = {
  state, unreadNotes, unreadMessages, avatar,
  get notes() { return state.notes },

  async refresh() {
    // Ekta ekta kore (parallel na): age notifications, tarpor requests + messages
    try { state.notes = (await getAllNotifications()).data } catch { /* ignore */ }
    try {
      const c = await getConversations()
      state.convoUnread = Object.fromEntries(c.data.map((x) => [x.id, x.unread || 0]))
    } catch { /* ignore */ }
    state.loaded = true
  },
  start() {
    loadLocalAvatar()
    if (timer) return
    this.refresh()
    timer = setInterval(() => document.visibilityState === 'visible' && this.refresh(), 30000)
  },
  stop() { clearInterval(timer); timer = null; state.notes = []; state.convoUnread = {}; state.loaded = false },

  async read(n) {
    if (n.is_read) return
    n.is_read = true
    try { await markNotificationRead(n.id) } catch { n.is_read = false }
  },
  async readAll() {
    const prev = state.notes.map((n) => n.is_read)
    state.notes.forEach((n) => (n.is_read = true))
    try { await markAllNotificationsRead() } catch { state.notes.forEach((n, i) => (n.is_read = prev[i])); throw new Error('failed') }
  },
  async remove(n) { await deleteNotification(n.id); state.notes = state.notes.filter((x) => x.id !== n.id) },
  setConvoUnread(id, v = 0) { state.convoUnread = { ...state.convoUnread, [id]: v } },
  // Messages page e ashle message notification gulo read kore dei
  markMessagesSeen() { state.notes.filter((n) => n.type === 'message' && !n.is_read).forEach((n) => this.read(n)) },

  async setAvatar(file, dataUrl) {
    // Local e sathe sathe dekhai; backend e route thakle server e-o jay
    try { localStorage.setItem(avatarKey(), dataUrl) } catch { /* quota */ }
    state.avatarLocal = dataUrl
    try {
      const r = await uploadAvatar(file)
      if (r.avatar_url) auth.setUser({ ...auth.user, avatar_url: r.avatar_url })
      return { synced: true }
    } catch { return { synced: false } }
  },
  async clearAvatar() {
    try { localStorage.removeItem(avatarKey()) } catch { /* ignore */ }
    state.avatarLocal = null
    if (auth.user) auth.setUser({ ...auth.user, avatar_url: null, avatar: null, profile_photo_url: null })
    try { await removeAvatarApi() } catch { /* ignore */ }
  },
}