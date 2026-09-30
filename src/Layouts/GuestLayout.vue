<script setup>
import ApplicationLogo from '@/Components/ApplicationLogo.vue';
import Link from '@/Components/Link.vue'
</script>

<template>
    <div
        class="flex min-h-screen flex-col items-center bg-gradient-to-br from-paper via-white to-brand-soft pt-6 sm:justify-center sm:pt-0"
    >
        <div class="animate-pop">
            <Link href="/">
                <ApplicationLogo class="h-20 w-20 fill-current text-brand transition-transform duration-500 hover:rotate-6 hover:scale-110" />
            </Link>
        </div>

        <div
            class="mt-6 w-full animate-fade-up overflow-hidden bg-white px-6 py-4 shadow-xl shadow-brand/10 sm:max-w-md sm:rounded-2xl"
        >
            <slot />
        </div>
    </div>
</template>
