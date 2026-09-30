// Ekta chhoto toast (upor theke message dekhay, 2.5s por chole jay)
import { ref, onBeforeUnmount } from 'vue'

export function useToast(ms = 2500) {
  const toast = ref('')
  let t
  const say = (m) => { toast.value = m; clearTimeout(t); t = setTimeout(() => (toast.value = ''), ms) }
  onBeforeUnmount(() => clearTimeout(t))
  return { toast, say }
}
