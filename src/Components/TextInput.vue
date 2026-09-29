<script setup>
import { onMounted, ref } from 'vue';

const model = defineModel({
    type: String,
    required: true,
});

const input = ref(null);

onMounted(() => {
    if (input.value.hasAttribute('autofocus')) {
        input.value.focus();
    }
});

defineExpose({ focus: () => input.value.focus() });
</script>

<template>
    <input
        class="rounded-lg border-black/10 bg-white text-sm text-ink shadow-none placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        v-model="model"
        ref="input"
    />
</template>