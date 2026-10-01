<script setup>
// Sidebar + Header + animated content. Shob logged-in page eta use kore.
// Header er props (title, search-placeholder, filters, show-near-me, v-model:search ...) shorasori pass hoy ($attrs).
import { onMounted } from 'vue'
import Head from '@/Components/Head.vue'
import Sidebar from '@/Components/Sidebar.vue'
import Header from '@/Components/Header.vue'
import { app } from '@/stores/app'
import { enableChatUnread } from '@/composables/useChatUnread'

defineOptions({ inheritAttrs: false })
// deferApp=true hole notifications/messages polling ekhane start hobe na; page nijei app.start() call korbe (Dashboard er sequence er jonno)
const props = defineProps({ current: { type: String, required: true }, title: { type: String, default: '' }, deferApp: { type: Boolean, default: false } })
onMounted(() => { if (!props.deferApp) { app.start(); enableChatUnread() } })
</script>

<template>
  <Head :title="`${title || current} - Book Haven`" />
  <div class="flex h-app flex-col overflow-hidden bg-paper md:flex-row font-sans text-ink">
    <Sidebar :current-route="current" />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <Header v-bind="$attrs" :title="title || current">
        <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        <template v-if="$slots['filter-actions']" #filter-actions><slot name="filter-actions" /></template>
        <template v-if="$slots['filter-actions-trailing']" #filter-actions-trailing><slot name="filter-actions-trailing" /></template>
      </Header>
      <main class="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6 animate-fade-up">
        <slot />
      </main>
    </div>
    <slot name="overlay" />
  </div>
</template>