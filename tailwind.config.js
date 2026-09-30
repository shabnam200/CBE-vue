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
                fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
                fadeUp: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                scaleIn: { from: { opacity: 0, transform: 'scale(.96) translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
                dropIn: { from: { opacity: 0, transform: 'translateY(-8px) scale(.97)' }, to: { opacity: 1, transform: 'none' } },
                pop: { '0%': { transform: 'scale(.5)' }, '100%': { transform: 'scale(1)' } },
                ring: { '0%,100%': { transform: 'rotate(0)' }, '10%,30%': { transform: 'rotate(14deg)' }, '20%,40%': { transform: 'rotate(-14deg)' }, '50%': { transform: 'rotate(0)' } },
                pingSoft: { '75%,100%': { transform: 'scale(2.2)', opacity: 0 } },
                shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
            },
            animation: {
                up: 'up 40s linear infinite', down: 'down 40s linear infinite',
                'fade-in': 'fadeIn .4s ease both',
                'fade-up': 'fadeUp .5s cubic-bezier(.22,1,.36,1) both',
                'scale-in': 'scaleIn .25s cubic-bezier(.22,1,.36,1) both',
                'drop-in': 'dropIn .2s cubic-bezier(.22,1,.36,1) both',
                'pop': 'pop .35s cubic-bezier(.34,1.56,.64,1) both',
                'ring': 'ring 1.6s ease-in-out infinite',
                'ping-soft': 'pingSoft 1.8s cubic-bezier(0,0,.2,1) infinite',
                shimmer: 'shimmer 1.4s linear infinite',
            },
        },
    },

    plugins: [forms],
};