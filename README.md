# FoodReels

FoodReels is an original, food-first short-video social platform. The React client never ships a hardcoded set of creators, reels, likes, categories, restaurants, recipes, or counts: it loads them from the Express REST API, which persists them in MongoDB.

## Stack

- React, Vite, React Router, Axios, responsive CSS
- Node.js, Express, JWT, bcrypt, CORS, request rate limiting
- MongoDB and Mongoose
- Cloudinary uploads when configured; validated local-disk uploads for development when it is not

## Run locally

Start MongoDB locally, or set an Atlas connection string in `backend/.env`.

Backend:

```bash
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

Frontend, in a separate terminal:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Vite normally opens on `http://localhost:5173`; the API is on `http://localhost:5000`.

## Demo accounts

- Creator: `sayan@example.com` / `demo123`
- Administrator: `admin@foodreels.local` / `demo123`

The seed script clears FoodReels collections before inserting 30 food reels, users, creators, categories, restaurants, hashtags, recipes, comments/replies, likes, follows, saves, and notifications.

If you seeded an earlier version and its demo reels show a poster but do not play, run this safe, non-destructive migration once. It replaces the discontinued demo URLs and adds coordinates to the existing restaurant, recipe, and reel locations:

```bash
cd backend
npm run repair-demo
```

## Cloudinary media storage

Set these values in `backend/.env` to switch uploads from `backend/uploads/` to Cloudinary without changing frontend code:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

With those variables absent, the backend validates and stores uploads locally for development. If a configured Cloudinary upload is temporarily unavailable, the upload endpoint returns a playable local URL instead of discarding the reel. Video accepts MP4, WebM, and MOV up to 150MB; images accept common image files up to 15MB. Cloudinary credentials are server-only and must never be placed in the frontend `.env`.

## Key API areas

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/reels/feed?page=1&limit=6`, `POST /api/reels`, `POST /api/reels/:id/view`
- `POST|DELETE /api/reels/:id/like`, `POST|DELETE /api/reels/:id/save`
- `GET|POST /api/reels/:id/comments`, plus replies, comment likes, edit and delete endpoints
- `GET /api/search?q=`, `GET /api/explore`, `GET /api/categories`, `GET /api/hashtags`
- `GET /api/users/:id`, `/followers`, `/following`, and authenticated saved/liked/profile/notification APIs
- `GET /api/restaurants`, `GET /api/restaurants/nearby?lat=&lng=&radiusKm=`, `GET /api/recipes/:id`, `POST /api/reports`
- Admin-protected `/api/admin/analytics`, `/api/admin/content`, category and restaurant management APIs

## Product behavior

- Full-height vertical reels use `IntersectionObserver` for muted autoplay/pause, view de-duplication, real progress, full-screen, mute, and loading states.
- Likes, saves, follows, comment likes, and recipe saves apply optimistic UI where useful and roll back on errors.
- Feed pagination is API-based and loads additional pages near the end of a one-reel-per-scroll, scroll-snapping viewport.
- Reels can tag a location, restaurant, category, hashtags, original audio, and an optional structured recipe. Recipes and restaurants both include coordinates; the restaurant panel uses the browser's approved location to retrieve and order nearby places by distance.
- Notifications and admin analytics are generated from database relationships/counters, not random or display-only values.
