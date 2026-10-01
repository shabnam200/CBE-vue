<script setup>
// /profile/edit — profile edit page.
// Register er shob field ekhane edit kora jay:
//   Profile Image  -> ba-pashe Photo card
//   Name, Email, Location (City) -> "Personal information"
//   Password       -> "Password" section
import { ref, computed } from 'vue'
import AppShell from '@/Layouts/AppShell.vue'
import DeleteUserForm from './Partials/DeleteUserForm.vue'
import UpdatePasswordForm from './Partials/UpdatePasswordForm.vue'
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm.vue'
import Link from '@/Components/Link.vue'
import Avatar from '@/Components/Avatar.vue'
import Toast from '@/Components/Toast.vue'
import { app } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import { squareResize, toDataUrl } from '@/utils/image'
import { auth } from '@/stores/auth'
import { me as mockMe } from '@/data/mock'

defineProps({ mustVerifyEmail: { type: Boolean }, status: { type: String } })

const user = computed(() => ({ ...mockMe, email: '', ...(auth.user || {}) }))

const { toast, say } = useToast()
const photoBusy = ref(false)
const fileInput = ref(null)

async function onPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) return say('Please choose an image file.')
  if (file.size > 8 * 1024 * 1024) return say('Image is too large (max 8 MB).')
  photoBusy.value = true
  try {
    const small = await squareResize(file) // square crop + resize
    const { synced } = await app.setAvatar(small, await toDataUrl(small))
    say(synced ? 'Profile photo updated.' : 'Photo saved on this device (server upload not available yet).')
  } catch {
    say('Could not use that image. Try another one.')
  } finally {
    photoBusy.value = false
  }
}
async function removePhoto() { await app.clearAvatar(); say('Profile photo removed.') }
</script>

<template>
  <AppShell title="Profile">
    <div class="space-y-6">
      <!-- Page heading -->
      <div class="reveal" style="--i: 0">
        <Link href="/profile" class="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Back to profile
        </Link>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink">Edit profile</h1>
        <p class="mt-0.5 text-sm text-neutral-500">Update your photo, personal details and password.</p>
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <!-- ===== Left: Profile photo ===== -->
        <section class="reveal rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm lg:sticky lg:top-24" style="--i: 1">
          <div class="group relative mx-auto h-28 w-28">
            <Avatar :src="app.avatar.value || ''" :name="user.name" size="h-28 w-28 text-4xl font-display" class="ring-4 ring-brand-soft transition-transform duration-300 group-hover:scale-105" />
            <div v-if="photoBusy" class="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><span class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></span></div>
            <button type="button" class="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow transition-all hover:scale-110 hover:bg-brand-dark" aria-label="Change profile photo" title="Change profile photo" @click="fileInput.click()">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
            <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onPhoto" />
          </div>

          <h2 class="mt-4 truncate font-display text-lg font-semibold text-ink">{{ user.name }}</h2>
          <p class="truncate text-sm text-neutral-500">{{ user.email }}</p>
          <p v-if="user.city" class="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {{ user.city }}
          </p>

          <div class="mt-5 flex flex-col gap-2">
            <button type="button" class="rounded-lg border border-brand/30 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-soft" @click="fileInput.click()">
              {{ app.avatar.value ? 'Change photo' : 'Upload photo' }}
            </button>
            <button v-if="app.avatar.value" type="button" class="rounded-lg px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-rose-50 hover:text-rose-600" @click="removePhoto">Remove photo</button>
          </div>
          <p class="mt-4 text-[11px] leading-relaxed text-neutral-400">JPG or PNG, up to 8 MB. We crop it to a square for you.</p>
        </section>

        <!-- ===== Right: forms ===== -->
        <div class="min-w-0 space-y-6">
          <section class="reveal rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-8" style="--i: 2">
            <UpdateProfileInformationForm :must-verify-email="mustVerifyEmail" :status="status" />
          </section>

          <section class="reveal rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-8" style="--i: 3">
            <UpdatePasswordForm />
          </section>

          <!-- Danger zone -->
          <section class="reveal rounded-2xl border border-rose-200/70 bg-white p-5 shadow-sm sm:p-8" style="--i: 4">
            <DeleteUserForm />
          </section>
        </div>
      </div>
    </div>

    <Toast :message="toast" />
  </AppShell>
</template>