# Movies.map

React frontend for Movies.map (Vite + React + JavaScript). Browse movies and TV via TMDB, and sign in with the NOVI Dynamic API to use watchlists.

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start local development server (must run on port **5173** for NOVI CORS)
- `npm run build` — production build
- `npm run preview` — preview production build

## Environment variables

Create a `.env` file in the project root (already gitignored):

```
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_NOVI_BASE_URL=https://novi-backend-api-wgsgz.ondigitalocean.app
VITE_NOVI_PROJECT_ID=your_novi_project_id
```

Restart the dev server after changing `.env`.

## NOVI Dynamic API setup

1. Open [NOVI Dynamic API](https://novi-backend-api-wgsgz.ondigitalocean.app/).
2. Enter your Project ID and upload [`novi/movies-map.json`](novi/movies-map.json).
3. Open Swagger UI and confirm `POST /api/login` works with a demo account.

**Note:** NOVI student databases are wiped daily. Re-upload the JSON config after a wipe to restore seed users and collections.

### Demo accounts (after uploading the JSON)

| Email | Password | Role |
| --- | --- | --- |
| `admin@movies.map` | `admin123` | admin |
| `demo@movies.map` | `demo1234` | user |

You can also create a new account from the app’s **Create account** modal.
