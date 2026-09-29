// Ekta jaygay sob config. .env file theke ashe (dekho .env.example)
// VITE_USE_MOCK=false korle real backend API use hobe.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
export const API_URL = import.meta.env.VITE_API_URL || '/api'
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || ''
export const TOKEN_KEY = 'token'
