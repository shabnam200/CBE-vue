// Horizontal row (Top Books, Recommended) er lazy loading:
// shuru te screen e jotogulo fit hoy totogulo, tarpor scroll / Next dile 4 ta kore.
import { ref } from 'vue'

export function useLazyRow(fetchPage, elRef, { cardW = 136, more = 4, onError } = {}) {
  const items = ref([])
  const loading = ref(true)      // prothom load (skeleton)
  const loadingMore = ref(false) // porer batch
  const page = ref(0)
  const lastPage = ref(1)
  let token = 0

  async function loadMore() {
    if (loadingMore.value || (page.value && page.value >= lastPage.value)) return
    const id = ++token
    const first = page.value === 0
    loadingMore.value = true
    try {
      const width = elRef.value?.clientWidth || 800
      const per_page = first ? Math.min(20, Math.max(3, Math.ceil(width / cardW))) : more
      const res = await fetchPage({ page: page.value + 1, per_page })
      if (id !== token) return
      const seen = new Set(items.value.map((b) => b.id))
      items.value = [...items.value, ...res.data.filter((b) => !seen.has(b.id))]
      page.value = res.current_page
      lastPage.value = res.last_page
    } catch {
      if (id === token) onError?.()
    } finally {
      if (id === token) { loading.value = false; loadingMore.value = false }
    }
  }

  // scroll shesh er kache gele porer batch ane
  function onScroll() {
    const el = elRef.value
    if (el && el.scrollLeft + el.clientWidth >= el.scrollWidth - cardW) loadMore()
  }

  function next() {
    elRef.value?.scrollBy({ left: 250, behavior: 'smooth' })
    onScroll()
  }

  return { items, loading, loadingMore, loadMore, onScroll, next }
}
