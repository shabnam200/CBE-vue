<script setup>
import { watchEffect } from 'vue'
const props = defineProps({ title: { type: String, default: '' } })
watchEffect(() => { if (props.title) document.title = props.title })
</script>
<template><span v-if="false" /></template>
