import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../stores/auth'
import { USE_MOCK } from '../config'
import { app } from '../stores/app'

const routes = [
  { path: '/', component: () => import('../Pages/Landing.vue') },
  { path: '/dashboard', component: () => import('../Pages/Dashboard.vue'), meta: { auth: true } },
  { path: '/wishlist', component: () => import('../Pages/Wishlist.vue'), meta: { auth: true } },
  { path: '/my-books', component: () => import('../Pages/MyBooks.vue'), meta: { auth: true } },
  { path: '/admin', component: () => import('../Pages/Admin/Dashboard.vue'), meta: { auth: true, admin: true } },
  { path: '/profile', component: () => import('../Pages/Profile/Edit.vue'), meta: { auth: true } },

  {
    path: '/login',
    redirect: (to) => ({ path: '/', query: { auth: 'login', ...(to.query.redirect ? { redirect: to.query.redirect } : {}) } }),
  },
  {
    path: '/register',
    redirect: (to) => ({
      path: '/',
      query: {
        auth: 'register',
        ...(to.query.email ? { email: to.query.email } : {}),
        ...(to.query.redirect ? { redirect: to.query.redirect } : {}),
      },
    }),
  },
  { path: '/forgot-password', component: () => import('../Pages/Auth/ForgotPassword.vue'), meta: { guest: true } },
  { path: '/reset-password/:token', component: () => import('../Pages/Auth/ResetPassword.vue'), meta: { guest: true }, props: true },

  { path: '/logout', beforeEnter: async () => { await auth.logout(); app.stop(); return '/' } },

  { path: '/requests', component: () => import('../Pages/Requests.vue'), meta: { auth: true } },
  { path: '/messages', component: () => import('../Pages/Messages.vue'), meta: { auth: true } },
  { path: '/notifications', component: () => import('../Pages/Notifications.vue'), meta: { auth: true } },
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