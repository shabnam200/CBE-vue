 import './css/app.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from './stores/auth'

// Android/Samsung/in-app browser e dvh bhul hoy -> asol dekha-jay-emon height ta --app-h e rakhi (AppLayout etai use kore)
const setAppH = () => {
  const vv = window.visualViewport
  const h = vv && vv.scale <= 1.01 ? vv.height : window.innerHeight // zoom korle layout chhoto kori na
  document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`)
}
setAppH()
window.addEventListener('resize', setAppH)
window.addEventListener('orientationchange', setAppH)
window.visualViewport?.addEventListener('resize', setAppH)

// v-reveal: element screen e ashle fade-up animation chole (scroll reveal)
const reveal = {
  mounted(el, { value }) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.style.opacity = '0'
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      el.style.opacity = ''
      el.style.animationDelay = `${value || 0}ms`
      el.classList.add('animate-fade-up')
      io.disconnect()
    }, { threshold: 0.12 })
    io.observe(el)
    el._io = io
  },
  unmounted(el) { el._io?.disconnect() },
}

// App ekhoni mount hobe — /me er jonno wait korbe na (user cbe_user e cached thake).
// Fresh user background e ashe; token expired hole http.js er 401 interceptor login e pathabe.
createApp(App).directive('reveal', reveal).use(router).mount('#app')
auth.init()