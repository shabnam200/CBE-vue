# Book Haven (CBE) — Vue 3 + Tailwind

Laravel/Inertia bad diye ekhon pure frontend: **Vue 3 + Vue Router + Tailwind 3 + Vite + Axios**.
Design/UI ekdom age er moto. Backend chhara mock data diye cholbe.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```

## Friend er API connect korbe kivabe
1. `.env` file e (copy of `.env.example`) likho:
   ```
   VITE_USE_MOCK=false
   VITE_API_URL=http://127.0.0.1:8000/api
   VITE_STORAGE_URL=http://127.0.0.1:8000
   ```
2. Dev server restart koro. Ei ek switch e sob (books, admin, auth) real API te chole jabe.
3. Endpoint name / response shape mile na gele shudhu ei 4 ta file bodlate hobe (page/component e hat dite hobe na):

| File | Ki ache |
|---|---|
| `src/api/auth.js` | login, register, logout, user, forgot/reset password, profile |
| `src/bookApi.js` | books, top, matches, my-books, add/edit/delete book |
| `src/api/index.js` | recommended, exchange request, wishlist, notifications |
| `src/adminApi.js` | admin stats, books, users |

`src/http.js` = axios client (Bearer token + cookie dutoi support kore, 401 hole login e pathay).
`src/config.js` = .env theke config.

## Expected endpoints
**Auth**: `POST /login` `POST /register` (response: `{ token, user }`) · `POST /logout` · `GET /user` · `POST /forgot-password` · `POST /reset-password` · `PUT /user/profile` · `PUT /user/password` · `DELETE /user`

**Books**: `GET /books` (`q, genre, condition, availability_type, city, page, per_page`) · `GET /books/top` · `GET /books/{id}` · `GET /matches` · `GET /books/recommended`
**My books**: `GET /my-books` · `POST /books` (FormData: title, author, genre, condition, availability_type, image) · `POST /books/{id}` (`_method=PUT`) · `DELETE /books/{id}`
**Others**: `POST /exchange-requests` · `POST /wishlists` · `GET /notifications` · `POST /notifications/read-all`
**Admin**: `GET /admin/stats` · `GET|DELETE /admin/books[/{id}]` · `GET /admin/users` · `PUT|DELETE /admin/users/{id}`

Paginated response: Laravel `paginate()` shape (`data, current_page, last_page, total`). Validation error: 422 + `errors` — form gulo e auto dekhabe.
User object e `role: "admin"` thakle `/admin` e dhukte parbe.

## Structure
```
src/
  main.js, App.vue, router/index.js   # routes + login guard
  Pages/                              # Landing, Dashboard, MyBooks, Admin, Auth/*, Profile/*
  Components/, Layouts/               # UI (design same)
  stores/auth.js                      # current user / login / logout
  composables/useForm.js              # form errors + processing state
  api/, bookApi.js, adminApi.js       # sob API call ekhane
  data/                               # mock data
```

## Notes
- Mock mode e login guard off (age jemon login chhara dashboard dekha jeto). Real mode e `/my-books`, `/profile`, `/admin` login lage; `/admin` e `role === 'admin'` lage.
- Wishlist / Requests / Messages / Notifications page ekhono banano hoyni, tai "coming soon" placeholder ache.
- Email-verify ar confirm-password (Laravel session flow) baad deya hoyeche.
- Deploy e SPA fallback lagbe (sob path `index.html` e redirect).
