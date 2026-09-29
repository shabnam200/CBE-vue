<script setup>
import { computed } from 'vue';
import Link from '@/Components/Link.vue'

const props = defineProps({
    href: {
        type: String,
        required: true,
    },
    active: {
        type: Boolean,
    },
});

const classes = computed(() =>
    props.active
        ? 'block w-full ps-3 pe-4 py-2 border-l-4 border-brand text-start text-base font-medium text-brand bg-brand-soft focus:outline-none focus:text-brand-dark focus:border-brand-dark transition duration-150 ease-in-out'
        : 'block w-full ps-3 pe-4 py-2 border-l-4 border-transparent text-start text-base font-medium text-neutral-600 hover:text-brand hover:bg-brand-soft/60 hover:border-brand/30 focus:outline-none focus:text-brand focus:bg-brand-soft/60 focus:border-brand/30 transition duration-150 ease-in-out',
);
</script>

<template>
    <Link :href="href" :class="classes">
        <slot />
    </Link>
</template>