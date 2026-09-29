<script setup>
import Link from '@/Components/Link.vue'

defineProps({
    href: {
        type: String,
        required: true,
    },
});
</script>

<template>
    <Link
        :href="href"
        class="block w-full px-4 py-2 text-start text-sm leading-5 text-neutral-700 transition duration-150 ease-in-out hover:bg-brand-soft hover:text-brand focus:bg-brand-soft focus:outline-none"
    >
        <slot />
    </Link>
</template>