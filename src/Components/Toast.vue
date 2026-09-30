<script setup>
defineProps({ message: { type: String, default: '' } })
</script>
<template>
  <Transition name="toast">
    <div v-if="message" role="status" class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg md:bottom-6">{{ message }}</div>
  </Transition>
</template>
<style>
.toast-enter-active, .toast-leave-active { transition: opacity .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
</style>
