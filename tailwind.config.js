 import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js}'],

    theme: {
        extend: {
            colors: {
                brand: { DEFAULT: '#8B3F4E', dark: '#6F2F3D', soft: '#F6ECEE' },
                ink: '#1F2430',
                paper: '#F8F5F3',
            },
            fontFamily: {
                display: ['Poppins', 'sans-serif'],
                sans: ['Inter', 'Figtree', ...defaultTheme.fontFamily.sans],
            },
            keyframes: {
                up: { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(-50%)' } },
                down: { '0%': { transform: 'translateY(-50%)' }, '100%': { transform: 'translateY(0)' } },
            },
            animation: { up: 'up 40s linear infinite', down: 'down 40s linear infinite' },
        },
    },

    plugins: [forms],
};