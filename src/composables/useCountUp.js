// Number ke 0 theke target porjonto animate kore (stats er jonno)
import { ref, watch, onBeforeUnmount } from 'vue'
export function useCountUp(source, ms = 900) {
  const shown = ref(0)
  let raf
  const run = (to) => {
    cancelAnimationFrame(raf)
    const from = shown.value, t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      shown.value = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  watch(source, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => cancelAnimationFrame(raf))
  return shown
}
