import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../stores/auth'
import { USE_MOCK } from '../config'

// meta.auth  = login lagbe        meta.admin = admin role lagbe
// Mock mode e guard off, jate login chhara e sob page dekha jay (agerr moto).
const routes = [
  { path: '/', component: () => import('../Pages/Landing.vue') },
  { path: '/dashboard', component: () => import('../Pages/Dashboard.vue') },
  { path: '/my-books', component: () => import('../Pages/MyBooks.vue'), meta: { auth: true } },
  { path: '/admin', component: () => import('../Pages/Admin/Dashboard.vue'), meta: { auth: true, admin: true } },
  { path: '/profile', component: () => import('../Pages/Profile/Edit.vue'), meta: { auth: true } },

  { path: '/login', component: () => import('../Pages/Auth/Login.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('../Pages/Auth/Register.vue'), meta: { guest: true } },
  { path: '/forgot-password', component: () => import('../Pages/Auth/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password/:token', component: () => import('../Pages/Auth/ResetPassword.vue'), meta: { guest: true }, props: true },

  { path: '/logout', component: () => import('../Pages/Auth/Login.vue'), beforeEnter: async () => { await auth.logout(); return '/' } },

  // Sidebar e link ache kintu page ekhono banano hoyni
  { path: '/wishlist', component: () => import('../Pages/ComingSoon.vue'), props: { title: 'Wishlist' } },
  { path: '/requests', component: () => import('../Pages/ComingSoon.vue'), props: { title: 'Requests' } },
  { path: '/messages', component: () => import('../Pages/ComingSoon.vue'), props: { title: 'Messages' } },
  { path: '/notifications', component: () => import('../Pages/ComingSoon.vue'), props: { title: 'Notifications' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, _from, saved) => saved || (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
})

router.beforeEach((to) => {
  if (to.meta.guest && auth.isLoggedIn.value) return '/dashboard'
  if (USE_MOCK) return true
  if (to.meta.auth && !auth.isLoggedIn.value) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.admin && !auth.isAdmin.value) return '/dashboard'
  return true
})

export default router
