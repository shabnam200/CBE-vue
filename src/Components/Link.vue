<script setup>
// Inertia <Link> er replacement. `href` diye e kaj kore, tai purono template bodlate hoyni.
import { computed } from 'vue'
const props = defineProps({ href: { type: String, required: true } })
const external = computed(() => /^(https?:)?\/\/|^mailto:|^tel:/.test(props.href))
</script>
<template>
  <a v-if="external" :href="href"><slot /></a>
  <RouterLink v-else :to="href"><slot /></RouterLink>
</template>
