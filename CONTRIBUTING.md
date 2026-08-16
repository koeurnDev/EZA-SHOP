# Contributing to EZA-SHOP

Welcome! This guide helps new developers get up to speed quickly.

---

## Understanding the Codebase

### Three independent services

| Service | Folder | Purpose | Hosting |
|---|---|---|---|
| **Worker API** | `eza-worker/` | All REST API endpoints | Cloudflare Workers |
| **Frontend** | `webapp/` | React Telegram Mini App | Cloudflare Pages |
| **Bot** | `bot/` | Telegram bot + notifications | Render (optional) |

They are **loosely coupled** — the frontend only talks to the Worker API via HTTP.
The bot is optional and only handles Telegram push notifications.

---

## Local Development Setup

### Step 1 — Install dependencies

```bash
# Worker API
cd eza-worker && npm install

# Frontend
cd webapp && npm install

# Bot (optional)
cd bot && npm install
```

### Step 2 — Set up environment files

```bash
# Worker API — copy and fill in your values
cp eza-worker/.dev.vars.example eza-worker/.dev.vars

# Frontend
cp webapp/.env.example webapp/.env
```

Minimum values needed for local dev:

**`eza-worker/.dev.vars`**
```
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
BOT_TOKEN=your_telegram_bot_token
SUPERADMIN_ID=your_telegram_user_id
SESSION_SECRET=any-random-string-32-chars-min
```

**`webapp/.env`**
```
VITE_BACKEND_URL=http://localhost:8787
```

### Step 3 — Run the database migrations

```bash
cd bot
cp .env.example .env   # fill in DATABASE_URL
npm run migrate
```

### Step 4 — Start local servers

```bash
# Terminal 1 — Worker API (port 8787)
cd eza-worker && npm run dev

# Terminal 2 — Frontend (port 5173)
cd webapp && npm run dev
```

Open `http://localhost:5173` in your browser.
Use `X-Debug-Bypass: true` header to skip Telegram auth during local development.

---

## Project Structure Deep Dive

### `eza-worker/src/`

```
index.ts              # App entry — wires all routes together
types.ts              # TypeScript interfaces (Env, Variables, etc.)
│
├── db/
│   ├── schema.ts     # Drizzle table definitions (mirrors SQL schema)
│   └── connection.ts # Creates Neon HTTP connection per request
│
├── middleware/
│   └── auth.ts       # telegramAuth + adminAuth + cors middleware
│
├── routes/
│   ├── products.ts   # GET /api/products, /api/products/:id
│   ├── orders.ts     # POST /api/orders, GET /api/orders
│   ├── orderExtras.ts# status, validate-coupon, receipt
│   ├── user.ts       # profile, user orders
│   ├── wishlist.ts   # get wishlist, toggle
│   ├── reviews.ts    # get reviews, post review
│   ├── faqs.ts       # FAQ list + admin CRUD
│   ├── notifications.ts # broadcasts
│   ├── settings.ts   # init, settings, alive, ping
│   ├── upload.ts     # Cloudinary image upload
│   ├── admin.ts      # dashboard, products, orders (admin)
│   └── adminExtras.ts# customers, coupons, categories, export
│
└── utils/
    ├── auth.ts       # JWT + Telegram auth verification
    └── helpers.ts    # price, delivery, order code helpers
```

### `bot/migrations/`

All SQL migrations run in filename order:

| File | What it does |
|---|---|
| `000_base_schema.sql` | Core tables: products, orders, users, settings |
| `000_wishlist.sql` | Wishlist table |
| `07_flash_sales.sql` | Flash sale columns on products |
| `08_reviews.sql` | Reviews table (if exists) |
| `10_faqs.sql` | FAQs table (if exists) |
| `11_reviews_faqs.sql` | Ensures reviews + faqs exist |

---

## Making Changes

### Adding a new API endpoint

1. Create or edit a route file in `eza-worker/src/routes/`
2. Export the Hono app
3. Register it in `eza-worker/src/index.ts`
4. Run `npm run type-check` — must pass with 0 errors
5. Test locally with `npm run dev`
6. Deploy: `"y" | npx wrangler deploy`

### Adding a database column

1. Create a new migration file in `bot/migrations/` — name it `12_your_change.sql`
2. Run `cd bot && npm run migrate`
3. Update the Drizzle schema in `eza-worker/src/db/schema.ts`
4. Update any affected route handlers

### Adding a frontend component

1. Create component in `webapp/src/components/`
2. Use the existing API client in `webapp/src/api/`
3. Follow existing patterns for auth headers (`X-TG-Data`)

---

## Code Conventions

### TypeScript (Worker)
- All route handlers must be fully typed
- Use `z.object()` (Zod) for all request body validation
- Use `sql` tagged templates for raw queries — never string interpolation
- Return consistent shape: `{ success: true, data }` or `{ success: false, error }`

### JavaScript (Bot + Frontend)
- Bot follows repository pattern: `controllers → services → repositories`
- Frontend uses React Context for global state (ShopContext, TelegramContext)
- API calls go through `webapp/src/api/index.js` (handles auth headers + timeout)

---

## Testing

```bash
# Shared unit tests (discount math, delivery calc)
npm test

# Bot smoke test (DB connection + tables + products)
cd bot && npm run smoke

# Worker type check
cd eza-worker && npm run type-check

# Manual API test (local)
curl -H "X-Debug-Bypass: true" http://localhost:8787/api/products
```

---

## Deployment Checklist

Before deploying to production:

- [ ] `npm run type-check` passes (0 errors)
- [ ] `npm test` passes (all unit tests green)
- [ ] `cd bot && npm run smoke` passes
- [ ] All secrets set in Cloudflare Worker dashboard
- [ ] `VITE_BACKEND_URL` set in Cloudflare Pages environment variables
- [ ] Database migrations applied (`cd bot && npm run migrate`)

---

## Key Concepts

### Authentication Flow
1. User opens Mini App → Telegram injects `window.Telegram.WebApp.initData`
2. Frontend sends `initData` as `X-Telegram-Init-Data` header on every request
3. Worker middleware verifies the signature using `BOT_TOKEN`
4. If `userId === SUPERADMIN_ID` → admin access granted

### Order Flow
1. User adds items to cart → `POST /api/orders`
2. Worker validates stock, calculates totals, saves order
3. User uploads receipt → `POST /api/upload` then `POST /api/orders/receipt`
4. Admin updates status → `PUT /api/admin/orders/:id/status`
5. Telegram notification sent via bot

### Caching
- Worker uses in-memory cache (Cloudflare edge cache) — no Redis needed
- Cache keys: `products:all`, `system:init:data`, etc.
- Bot uses Redis (optional) for heavier caching

---

## Getting Help

- Read `MAINTENANCE.md` for ops/deployment procedures
- Read `PERFORMANCE.md` for DB optimization notes
- Check `bot/migrations/` to understand the full database schema
- Open an issue on GitHub for bugs or questions
