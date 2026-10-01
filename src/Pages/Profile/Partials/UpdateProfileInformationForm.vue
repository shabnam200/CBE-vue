<script setup>
import InputError from '@/Components/InputError.vue';
import InputLabel from '@/Components/InputLabel.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import TextInput from '@/Components/TextInput.vue';
import { useForm } from '@/composables/useForm'
import { auth } from '@/stores/auth'
import * as authApi from '@/api/auth'

defineProps({
    mustVerifyEmail: {
        type: Boolean,
    },
    status: {
        type: String,
    },
});

const user = auth.user || {};

// Register e jei field gulo chhilo: name, email, location (city).
// (Profile image Photo card e, password alada section e.)
const form = useForm({
    name: user.name || '',
    email: user.email || '',
    city: user.city ?? user.location ?? '',
});

const save = () =>
    form.submit(
        // Register e field er naam "location" chhilo, tai duita-i pathai (backend jeta chay seta nibe)
        (d) => authApi.updateProfile({ ...d, location: d.city }),
        {
            onSuccess: (r) =>
                auth.setUser({
                    ...auth.user,
                    name: form.name,
                    email: form.email,
                    city: form.city,
                    ...(r?.user || {}),
                }),
        },
    );
</script>

<template>
    <section>
        <header>
            <h2 class="font-display text-lg font-semibold text-ink">
                Personal information
            </h2>

            <p class="mt-1 text-sm text-neutral-500">
                The details other readers see when you list or request a book.
            </p>
        </header>

        <form @submit.prevent="save" class="mt-6 space-y-5">
            <div class="grid gap-5 sm:grid-cols-2">
                <div>
                    <InputLabel for="name" value="Full name" />

                    <TextInput
                        id="name"
                        type="text"
                        class="mt-1 block w-full"
                        v-model="form.name"
                        required
                        autofocus
                        autocomplete="name"
                        placeholder="John Doe"
                    />

                    <InputError class="mt-2" :message="form.errors.name" />
                </div>

                <div>
                    <InputLabel for="email" value="Email address" />

                    <TextInput
                        id="email"
                        type="email"
                        class="mt-1 block w-full"
                        v-model="form.email"
                        required
                        autocomplete="username"
                        placeholder="name@example.com"
                    />

                    <InputError class="mt-2" :message="form.errors.email" />
                </div>

                <div class="sm:col-span-2">
                    <InputLabel for="city" value="Location (City)" />

                    <TextInput
                        id="city"
                        type="text"
                        class="mt-1 block w-full"
                        v-model="form.city"
                        required
                        autocomplete="address-level2"
                        placeholder="Sylhet"
                    />

                    <p class="mt-1.5 text-xs text-neutral-400">
                        We use this for the "Near me" filter and to match you with readers in your city.
                    </p>

                    <InputError class="mt-2" :message="form.errors.city || form.errors.location" />
                </div>
            </div>

            <div class="flex items-center gap-4 border-t border-black/5 pt-5">
                <PrimaryButton :disabled="form.processing">Save changes</PrimaryButton>

                <Transition
                    enter-active-class="transition ease-in-out"
                    enter-from-class="opacity-0"
                    leave-active-class="transition ease-in-out"
                    leave-to-class="opacity-0"
                >
                    <p
                        v-if="form.recentlySuccessful"
                        class="text-sm font-medium text-emerald-600"
                    >
                        Saved.
                    </p>
                </Transition>
            </div>
        </form>
    </section>
</template>