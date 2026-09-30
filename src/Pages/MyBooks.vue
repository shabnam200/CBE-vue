<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import Head from '@/Components/Head.vue'
import Sidebar from '@/Components/Sidebar.vue'
import Header from '@/Components/Header.vue'
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
const preview = ref('')
const blank = () => ({ title: '', author: '', genre: categories[0] || 'Fiction', condition: 'good', availability_type: 'exchange', image: null })
const form = ref(blank())

const deleting = ref(null)
const deleteBusy = ref(false)

const search = ref('')
const genre = ref('')
const condition = ref('')
const availability = ref('')
const nearMe = ref(false)
const notes = ref([])
const bellOpen = ref(false)
const me = ref({ name: '' })
const unreadNotesCount = computed(() => notes.value.filter((n) => !n.is_read).length)

let toastTimer
const say = (t) => { toast.value = t; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toast.value = ''), 2500) }

const revokePreview = () => { if (preview.value.startsWith('blob:')) URL.revokeObjectURL(preview.value) }

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
  preview.value = ''
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
    image: null,
  }
  preview.value = b.image_url || ''
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  revokePreview()
  showModal.value = false
}

function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  revokePreview()
  form.value.image = file
  preview.value = URL.createObjectURL(file)
}

async function save() {
  formError.value = ''
  if (!form.value.title.trim() || !form.value.author.trim()) {
    formError.value = 'Please fill in the title and author.'
    return
  }
  const fd = new FormData()
  ;['title', 'author', 'genre', 'condition', 'availability_type'].forEach((k) => fd.append(k, form.value[k]))
  if (form.value.image) fd.append('image', form.value.image)

  saving.value = true
  try {
    if (editing.value) await updateBook(editing.value.id, fd)
    else await storeBook(fd)
    say(editing.value ? 'Book updated.' : 'Book added.')
    const page = editing.value ? meta.value.current_page : 1
    revokePreview()
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
  <Head title="My Books" />
  <div class="flex h-screen overflow-hidden bg-paper font-sans text-ink">
    <Sidebar currentRoute="My Books" />

    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
      <Header 
        v-model:search="search"
        v-model:genre="genre"
        v-model:condition="condition"
        v-model:availability="availability"
        v-model:nearMe="nearMe"
        :categories="categories"
        :CONDITIONS="CONDITIONS"
        :AVAILABILITY="AVAILABILITY"
        :unread="unreadNotesCount"
        :notes="notes"
        :bellOpen="bellOpen"
        :me="me"
        @toggle-bell="bellOpen = !bellOpen"
      />

      <main class="min-w-0 flex-1 space-y-5 p-5 pb-24 md:pb-6">
        <div class="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div>
            <h1 class="font-display text-xl font-semibold text-brand">My Books</h1>
            <p v-if="!loading && meta.total" class="mt-0.5 text-xs text-neutral-500">{{ meta.total }} listed</p>
          </div>
          <button v-if="myBooks.length" type="button" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark" @click="openAdd">Add New Book</button>
        </div>

        <section class="rounded-2xl border border-black/5 bg-white p-5 sm:p-8 shadow-sm">
          <div v-if="loading" class="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="i in 4" :key="i"><div class="aspect-[3/4] rounded-lg bg-neutral-200"></div><div class="mt-2 h-3 w-24 rounded bg-neutral-200"></div></div>
          </div>

          <div v-else-if="myBooks.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <article v-for="b in myBooks" :key="b.id" class="flex flex-col rounded-xl border border-black/10 bg-white p-3 shadow-sm">
              <div class="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
                <BookCover :book="b" />
                <span class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand shadow-sm">{{ badge[b.availability_type] }}</span>
              </div>
              <p class="mt-2 truncate text-sm font-medium">{{ b.title }}</p>
              <p class="truncate text-xs text-neutral-500">by {{ b.author }}</p>
              <div class="mt-3 flex gap-2">
                <button type="button" class="flex-1 rounded-lg border border-black/10 py-1.5 text-xs font-medium transition-colors hover:bg-brand-soft hover:text-brand" @click="openEdit(b)">Edit</button>
                <button type="button" class="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50" @click="deleting = b">Delete</button>
              </div>
            </article>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <div class="max-w-sm space-y-3">
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </div>
              <h3 class="font-display text-base font-semibold">No books added yet</h3>
              <p class="text-sm text-neutral-500">Share your books with the community or list them for exchange.</p>
              <button type="button" class="mt-2 inline-flex items-center rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark" @click="openAdd">Add Your First Book</button>
            </div>
          </div>

          <div v-if="meta.last_page > 1" class="mt-6 flex items-center justify-center gap-3 text-sm">
            <button type="button" :disabled="meta.current_page <= 1 || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(meta.current_page - 1)">Previous</button>
            <span class="text-xs text-neutral-500">Page {{ meta.current_page }} of {{ meta.last_page }}</span>
            <button type="button" :disabled="meta.current_page >= meta.last_page || loading" class="rounded-lg border border-black/10 px-3 py-1.5 transition-colors hover:bg-brand-soft disabled:opacity-40 disabled:hover:bg-transparent" @click="load(meta.current_page + 1)">Next</button>
          </div>
        </section>
      </main>
    </div>

    <!-- Add / Edit modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="closeModal">
      <div role="dialog" aria-modal="true" aria-labelledby="book-form-title" class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between border-b pb-4">
          <h3 id="book-form-title" class="font-display text-lg font-semibold text-brand">{{ editing ? 'Edit book' : 'Add new book' }}</h3>
          <button type="button" class="text-2xl leading-none text-neutral-400 hover:text-ink" aria-label="Close" @click="closeModal">×</button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="save">
          <div>
            <label for="bk-title" :class="label">Book title *</label>
            <input id="bk-title" v-model="form.title" type="text" required placeholder="Enter book title" :class="field" />
          </div>
          <div>
            <label for="bk-author" :class="label">Author *</label>
            <input id="bk-author" v-model="form.author" type="text" required placeholder="Enter author name" :class="field" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="bk-genre" :class="label">Genre</label>
              <select id="bk-genre" v-model="form.genre" :class="field">
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label for="bk-cond" :class="label">Condition</label>
              <select id="bk-cond" v-model="form.condition" :class="field">
                <option v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
          </div>
          <div>
            <label for="bk-type" :class="label">Available for</label>
            <select id="bk-type" v-model="form.availability_type" :class="field">
              <option v-for="a in AVAILABILITY" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </div>
          <div>
            <label for="bk-image" :class="label">Book photo</label>
            <div class="flex items-center gap-4">
              <div class="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100">
                <img v-if="preview" :src="preview" alt="Selected book photo" class="h-full w-full object-cover" />
                <span v-else class="flex h-full items-center justify-center px-1 text-center text-[10px] text-neutral-400">No photo</span>
              </div>
              <input id="bk-image" type="file" accept="image/*" class="w-full cursor-pointer text-xs text-neutral-500 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand hover:file:bg-brand/20" @change="onFile" />
            </div>
            <p v-if="editing" class="mt-1.5 text-[11px] text-neutral-400">Leave empty to keep the current photo.</p>
          </div>

          <p v-if="formError" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ formError }}</p>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-neutral-100" @click="closeModal">Cancel</button>
            <button type="submit" :disabled="saving" class="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Save book' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleting" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="!deleteBusy && (deleting = null)">
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" class="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
        <h3 id="del-title" class="font-display text-lg font-semibold">Delete this book?</h3>
        <p class="mt-2 text-sm text-neutral-600">"{{ deleting.title }}" will be removed from your list and from the community catalogue. This cannot be undone.</p>
        <div class="mt-5 flex justify-end gap-3">
          <button type="button" :disabled="deleteBusy" class="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60" @click="deleting = null">Cancel</button>
          <button type="button" :disabled="deleteBusy" class="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60" @click="confirmDelete">{{ deleteBusy ? 'Deleting…' : 'Delete' }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast" role="status" class="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-ink px-5 py-3 text-sm text-white shadow-lg md:bottom-6">{{ toast }}</div>
  </div>
</template>