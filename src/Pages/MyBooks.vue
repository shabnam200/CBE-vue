<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import BookCover from '@/Components/BookCover.vue'
import { categories } from '@/data/mock'
import { getMyBooks, storeBook, updateBook, deleteBook, apiError, CONDITIONS, AVAILABILITY } from '@/bookApi'

const myBooks = ref([])
const meta = ref({ current_page: 1, last_page: 1, total: 0 })
const loading = ref(true)
const toast = ref('')
const badge = { exchange: 'Exchange', donate: 'Free', lend: 'Lend' }

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const photos = ref([]) // [{ id, url, file|null }]  first = cover
const MAX_PHOTOS = 6
const dragging = ref(false)
const blank = () => ({ title: '', author: '', genre: categories[0] || 'Fiction', condition: 'good', availability_type: 'exchange' })
const form = ref(blank())

const deleting = ref(null)
const deleteBusy = ref(false)

const search = ref('')
const filters = ref({ genre: '', availability: '' })
const filterDefs = [
  { key: 'genre', label: 'All genres', options: categories.map((c) => ({ value: c, label: c })) },
  { key: 'availability', label: 'Any availability', options: AVAILABILITY },
]
const visibleBooks = computed(() => {
  const q = search.value.trim().toLowerCase()
  return myBooks.value.filter((b) =>
    (!q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)) &&
    (!filters.value.genre || b.genre === filters.value.genre) &&
    (!filters.value.availability || b.availability_type === filters.value.availability))
})

let toastTimer
const say = (t) => { toast.value = t; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toast.value = ''), 2500) }

const revokePreview = () => photos.value.forEach((p) => p.file && URL.revokeObjectURL(p.url))

async function load(page = 1) {
  loading.value = true
  try {
    const res = await getMyBooks(page)
    myBooks.value = res.data
    meta.value = { current_page: res.current_page, last_page: res.last_page, total: res.total }
  } catch (e) {
    say(apiError(e, 'Could not load your books. Please try again.'))
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  form.value = blank()
  revokePreview()
  photos.value = []
  formError.value = ''
  showModal.value = true
}

function openEdit(b) {
  editing.value = b
  const cond = String(b.condition || '').toLowerCase().replace(/\s+/g, '_')
  form.value = {
    title: b.title || '',
    author: b.author || '',
    genre: b.genre || categories[0] || 'Fiction',
    condition: CONDITIONS.some((c) => c.value === cond) ? cond : 'good',
    availability_type: b.availability_type || 'exchange',
  }
  revokePreview()
  const urls = b.images?.length ? b.images : b.image_url ? [b.image_url] : []
  photos.value = urls.map((url, n) => ({ id: `old-${n}`, url, file: null }))
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  revokePreview()
  showModal.value = false
}

let pid = 0
function addFiles(list) {
  const files = [...(list || [])].filter((f) => f.type.startsWith('image/'))
  if (!files.length) return
  const room = MAX_PHOTOS - photos.value.length
  if (files.length > room) say(`You can add up to ${MAX_PHOTOS} photos.`)
  files.slice(0, Math.max(room, 0)).forEach((file) => photos.value.push({ id: `new-${++pid}`, url: URL.createObjectURL(file), file }))
}
function onFiles(e) { addFiles(e.target.files); e.target.value = '' }
function onDrop(e) { dragging.value = false; addFiles(e.dataTransfer?.files) }
function removePhoto(i) {
  const [p] = photos.value.splice(i, 1)
  if (p?.file) URL.revokeObjectURL(p.url)
}
function makeCover(i) { const [p] = photos.value.splice(i, 1); photos.value.unshift(p) }

async function save() {
  formError.value = ''
  if (!form.value.title.trim() || !form.value.author.trim()) {
    formError.value = 'Please fill in the title and author.'
    return
  }
  const fd = new FormData()
  ;['title', 'author', 'genre', 'condition', 'availability_type'].forEach((k) => fd.append(k, form.value[k]))
  // Multiple photos: images[] = notun file, keep_images[] = ager je gulo rakhbo. `image` = cover (purono backend er jonno)
  const added = photos.value.filter((p) => p.file)
  added.forEach((p) => fd.append('images[]', p.file))
  if (added.length) fd.append('image', added[0].file)
  photos.value.filter((p) => !p.file).forEach((p) => fd.append('keep_images[]', p.url))

  saving.value = true
  try {
    if (editing.value) await updateBook(editing.value.id, fd)
    else await storeBook(fd)
    say(editing.value ? 'Book updated.' : 'Book added.')
    const page = editing.value ? meta.value.current_page : 1
    revokePreview()
    photos.value = []
    showModal.value = false
    await load(page)
  } catch (e) {
    formError.value = apiError(e, 'Could not save the book. Please try again.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleteBusy.value = true
  try {
    await deleteBook(deleting.value.id)
    deleting.value = null
    say('Book deleted.')
    const { current_page } = meta.value
    await load(myBooks.value.length === 1 && current_page > 1 ? current_page - 1 : current_page)
  } catch (e) {
    say(apiError(e, 'Could not delete the book.'))
  } finally {
    deleteBusy.value = false
  }
}

const onEsc = (e) => {
  if (e.key !== 'Escape') return
  if (deleting.value && !deleteBusy.value) deleting.value = null
  else closeModal()
}
onMounted(() => { window.addEventListener('keydown', onEsc); load() })
onBeforeUnmount(() => { window.removeEventListener('keydown', onEsc); clearTimeout(toastTimer); revokePreview() })

const field = 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const label = 'mb-1 block text-xs font-semibold text-neutral-600'
</script>

<template>
  <AppLayout
    current="My Books"
    title="My Books"
    :subtitle="!loading && meta.total ? `${meta.total} listed` : 'Books you share with the community.'"
    v-model:search="search"
    search-placeholder="Search my books"
    :filters="filterDefs"
    v-model:filter-values="filters"
  >
    <template #actions>
      <button type="button" class="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-dark active:scale-95" @click="openAdd">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg><span class="hidden sm:inline">Add New Book</span><span class="sm:hidden">Add</span>
      </button>
    </template>

    <section class="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-8">
      <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div v-for="i in 4" :key="i"><div class="skeleton aspect-[3/4] rounded-lg"></div><div class="skeleton mt-2 h-3 w-24 rounded"></div></div>
      </div>

      <TransitionGroup v-else-if="visibleBooks.length" tag="div" name="grid-list" class="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <article v-for="(b, i) in visibleBooks" :key="b.id" class="reveal lift group flex flex-col rounded-xl border border-black/10 bg-white p-3 shadow-sm" :style="{ '--i': i }">
          <div class="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
            <div class="h-full w-full transition-transform duration-500 group-hover:scale-105"><BookCover :book="b" /></div>
            <span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
            <span v-if="b.images?.length > 1" class="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white"><svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>{{ b.images.length }}</span>
          </div>
          <p class="mt-2 truncate text-sm font-medium">{{ b.title }}</p>
          <p class="truncate text-xs text-neutral-500">by {{ b.author }}</p>
          <div class="mt-3 flex gap-2">
            <button type="button" class="flex-1 rounded-lg border border-black/10 py-1.5 text-xs font-medium transition-colors hover:bg-brand-soft hover:text-brand" @click="openEdit(b)">Edit</button>
            <button type="button" class="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50" @click="deleting = b">Delete</button>
          </div>
        </article>
      </TransitionGroup>

      <div v-else-if="myBooks.length" class="animate-fade-up py-14 text-center">
        <p class="text-3xl">🔍</p><p class="mt-2 text-sm font-medium">No books match your search.</p>
      </div>

      <div v-else class="flex animate-fade-up flex-col items-center justify-center py-16 text-center">
        <div class="max-w-sm space-y-3">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand"><svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></div>
          <h3 class="font-display text-base font-semibold">No books added yet</h3>
          <p class="text-sm text-neutral-500">Share your books with the community or list them for exchange.</p>
          <button type="button" class="mt-2 inline-flex items-center rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-dark active:scale-95" @click="openAdd">Add Your First Book</button>
        </div>
      </div>

      <div v-if="meta.last_page > 1" class="mt-6 flex items-center justify-center gap-3 text-sm">
        <button type="button" :disabled="meta.current_page <= 1 || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(meta.current_page - 1)">Previous</button>
        <span class="text-xs text-neutral-500">Page {{ meta.current_page }} of {{ meta.last_page }}</span>
        <button type="button" :disabled="meta.current_page >= meta.last_page || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(meta.current_page + 1)">Next</button>
      </div>
    </section>

    <template #overlay>
      <!-- Add / Edit modal -->
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="closeModal">
          <div role="dialog" aria-modal="true" aria-labelledby="book-form-title" class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
            <div class="flex items-center justify-between border-b pb-4">
              <h3 id="book-form-title" class="font-display text-lg font-semibold text-brand">{{ editing ? 'Edit book' : 'Add new book' }}</h3>
              <button type="button" class="text-2xl leading-none text-neutral-400 hover:text-ink" aria-label="Close" @click="closeModal">×</button>
            </div>

            <form class="mt-4 space-y-4" @submit.prevent="save">
              <div><label for="bk-title" :class="label">Book title *</label><input id="bk-title" v-model="form.title" type="text" required placeholder="Enter book title" :class="field" /></div>
              <div><label for="bk-author" :class="label">Author *</label><input id="bk-author" v-model="form.author" type="text" required placeholder="Enter author name" :class="field" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label for="bk-genre" :class="label">Genre</label><select id="bk-genre" v-model="form.genre" :class="field"><option v-for="c in categories" :key="c" :value="c">{{ c }}</option></select></div>
                <div><label for="bk-cond" :class="label">Condition</label><select id="bk-cond" v-model="form.condition" :class="field"><option v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</option></select></div>
              </div>
              <div><label for="bk-type" :class="label">Available for</label><select id="bk-type" v-model="form.availability_type" :class="field"><option v-for="a in AVAILABILITY" :key="a.value" :value="a.value">{{ a.label }}</option></select></div>

              <!-- Multiple photos -->
              <div>
                <div class="mb-1 flex items-center justify-between"><label :class="label" class="!mb-0">Book photos</label><span class="text-[11px] text-neutral-400">{{ photos.length }} / {{ MAX_PHOTOS }} · first photo is the cover</span></div>
                <TransitionGroup tag="div" name="grid-list" class="relative grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <div v-for="(p, i) in photos" :key="p.id" class="group relative aspect-[3/4] overflow-hidden rounded-lg border border-black/10 bg-neutral-100">
                    <img :src="p.url" :alt="`Photo ${i + 1}`" class="h-full w-full object-cover" />
                    <span v-if="i === 0" class="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white">Cover</span>
                    <button type="button" class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white transition-colors hover:bg-red-600" :aria-label="`Remove photo ${i + 1}`" @click="removePhoto(i)">×</button>
                    <button v-if="i > 0" type="button" class="absolute inset-x-1 bottom-1 rounded bg-white/90 py-0.5 text-[10px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" @click="makeCover(i)">Make cover</button>
                  </div>
                  <label v-if="photos.length < MAX_PHOTOS" key="add" class="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-1 text-center text-[10px] font-medium transition-colors" :class="dragging ? 'border-brand bg-brand-soft text-brand' : 'border-black/15 text-neutral-500 hover:border-brand hover:bg-brand-soft hover:text-brand'" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    Add photos
                    <input type="file" accept="image/*" multiple class="sr-only" @change="onFiles" />
                  </label>
                </TransitionGroup>
                <p v-if="editing" class="mt-1.5 text-[11px] text-neutral-400">Photos you keep stay on the book. Remove or add more anytime.</p>
              </div>

              <p v-if="formError" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ formError }}</p>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-neutral-100" @click="closeModal">Cancel</button>
                <button type="submit" :disabled="saving" class="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition-all hover:bg-brand-dark active:scale-95 disabled:opacity-60">{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Save book' }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete confirmation -->
      <Transition name="modal">
        <div v-if="deleting" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]" @click.self="!deleteBusy && (deleting = null)">
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" class="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
            <h3 id="del-title" class="font-display text-lg font-semibold">Delete this book?</h3>
            <p class="mt-2 text-sm text-neutral-600">"{{ deleting.title }}" will be removed from your list and from the community catalogue. This cannot be undone.</p>
            <div class="mt-5 flex justify-end gap-3">
              <button type="button" :disabled="deleteBusy" class="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60" @click="deleting = null">Cancel</button>
              <button type="button" :disabled="deleteBusy" class="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" @click="confirmDelete">{{ deleteBusy ? 'Deleting…' : 'Delete' }}</button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade"><div v-if="toast" role="status" class="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-ink px-5 py-3 text-sm text-white shadow-lg md:bottom-6">{{ toast }}</div></Transition>
    </template>
  </AppLayout>
</template>
