# EZA-SHOP — Telegram Mini App E-Commerce Platform

A full-stack e-commerce platform built as a **Telegram Mini App**, powered by a **Cloudflare Worker API** and a **React frontend**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram App                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   webapp/  (React + Vite)  │  ← Cloudflare Pages
         │   eza-shop.pages.dev       │
         └─────────────┬─────────────┘
                       │ fetch(VITE_BACKEND_URL)
         ┌─────────────▼─────────────┐
         │   eza-worker/  (Hono.js)  │  ← Cloudflare Workers
         │   eza-shop-api.workers.dev│
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Neon PostgreSQL          │  ← Serverless DB
         └───────────────────────────┘

         ┌───────────────────────────┐
         │   bot/  (Telegraf + Node) │  ← Render.com (optional)
         │   Telegram Bot + Webhooks │    for bot notifications
         └───────────────────────────┘
```

---

## Project Structure

```
EZA-SHOP/
├── eza-worker/          # Cloudflare Worker API (Hono.js + Drizzle + Neon)
│   ├── src/
│   │   ├── routes/      # All API route handlers
│   │   ├── db/          # Database schema + connection
│   │   ├── middleware/  # Auth (Telegram + JWT) + CORS
│   │   ├── utils/       # Helpers + auth utils
│   │   └── index.ts     # App entry point
│   ├── wrangler.toml    # Cloudflare config
│   └── .dev.vars.example
│
├── webapp/              # React + Vite frontend (Cloudflare Pages)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # React context (shop, cart, auth)
│   │   ├── api/         # API client functions
│   │   └── utils/       # Shared utilities
│   └── .env.example
│
├── bot/                 # Node.js Telegram Bot (optional - for notifications)
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Database queries
│   ├── migrations/      # SQL migration files
│   └── scripts/         # Ops scripts (migrate, backup, restore)
│
├── shared/              # Shared utilities (discount, delivery math)
│   └── tests/           # Unit tests
│
└── .github/workflows/   # CI/CD (keep-alive + production deploy)
```

---

## Quick Start

### Prerequisites

- Node.js v18+
- A [Cloudflare account](https://cloudflare.com) (free tier works)
- A [Neon.tech](https://neon.tech) PostgreSQL database (free tier works)
- A Telegram Bot token from [@BotFather](https://t.me/botfather)

---

### 1. Clone the repo

```bash
git clone https://github.com/koeurnDev/EZA-SHOP.git
cd EZA-SHOP
```

---

### 2. Set up the database

```bash
cd bot
cp .env.example .env
# Fill in your DATABASE_URL in .env
npm install
npm run migrate
```

---

### 3. Run the Worker API locally

```bash
cd eza-worker
cp .dev.vars.example .dev.vars
# Fill in your secrets in .dev.vars
npm install
npm run dev
# API running at http://localhost:8787
```

---

### 4. Run the frontend locally

```bash
cd webapp
cp .env.example .env
# Set VITE_BACKEND_URL=http://localhost:8787
npm install
npm run dev
# App running at http://localhost:5173
```

---

## Environment Variables

### Worker (`eza-worker/.dev.vars`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ |
| `BOT_TOKEN` | Telegram Bot Token | ✅ |
| `SUPERADMIN_ID` | Your Telegram User ID | ✅ |
| `SESSION_SECRET` | JWT signing secret (32+ chars) | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Optional |

### Frontend (`webapp/.env`)

| Variable | Description | Required |
|---|---|---|
| `VITE_BACKEND_URL` | Worker API URL | ✅ |
| `VITE_BOT_USERNAME` | Telegram bot username (without @) | Optional |

---

## Deployment

### Deploy the Worker (Cloudflare Workers)

```bash
cd eza-worker

# 1. Login
npx wrangler login

# 2. Set production secrets
npx wrangler secret put DATABASE_URL
npx wrangler secret put BOT_TOKEN
npx wrangler secret put SUPERADMIN_ID
npx wrangler secret put SESSION_SECRET

# 3. Deploy
"y" | npx wrangler deploy
```

**Live URL:** `https://eza-shop-api.koeurnseab630.workers.dev`

---

### Deploy the Frontend (Cloudflare Pages)

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Connect `koeurnDev/EZA-SHOP` repository
3. Set build settings:
   - **Framework:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Root directory:** `webapp`
4. Add environment variable:
   - `VITE_BACKEND_URL` = `https://eza-shop-api.koeurnseab630.workers.dev`

---

### Deploy the Bot (Render — optional)

Only needed for Telegram push notifications. The API works fully without it.

```bash
# Render auto-deploys from main branch
# See render.yaml for configuration
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/health` | Health check | None |
| GET | `/api/init` | Products + settings + categories | User |
| GET | `/api/products` | Product catalog | User |
| GET | `/api/products/:id` | Single product | User |
| GET | `/api/products/:id/reviews` | Product reviews | User |
| POST | `/api/reviews` | Submit review | User |
| POST | `/api/orders` | Create order | User |
| GET | `/api/orders` | My orders | User |
| GET | `/api/orders/status/:code` | Order status | User |
| POST | `/api/orders/validate-coupon` | Validate coupon | User |
| GET | `/api/user/profile` | My profile | User |
| PUT | `/api/user/profile` | Update profile | User |
| GET | `/api/wishlist` | My wishlist | User |
| POST | `/api/wishlist/toggle` | Add/remove wishlist | User |
| GET | `/api/faqs` | FAQ list | None |
| GET | `/api/notifications` | Broadcasts | None |
| POST | `/api/upload` | Upload image | User |
| GET | `/api/admin/dashboard` | Admin stats | Admin |
| GET | `/api/admin/orders` | All orders | Admin |
| PUT | `/api/admin/orders/:id/status` | Update order | Admin |
| GET | `/api/admin/customers` | All customers | Admin |
| GET | `/api/admin/products` | All products | Admin |
| POST | `/api/admin/products` | Create product | Admin |
| PUT | `/api/admin/products/:id` | Update product | Admin |
| DELETE | `/api/admin/products/:id` | Delete product | Admin |
| GET | `/api/admin/coupons` | All coupons | Admin |
| GET | `/api/admin/settings` | System settings | Admin |
| GET | `/api/admin/orders/export` | Export CSV | Admin |

---

## Authentication

The Worker supports two auth methods:

**1. Telegram Mini App** — pass `initData` header:
```
X-Telegram-Init-Data: <window.Telegram.WebApp.initData>
```

**2. Development bypass** — local testing only:
```
X-Debug-Bypass: true
```

Admin access is granted automatically when `userId === SUPERADMIN_ID`.

---

## Useful Commands

```bash
# Run all unit tests
npm test

# Bot: apply DB migrations
cd bot && npm run migrate

# Bot: smoke test (DB + tables + products)
cd bot && npm run smoke

# Bot: restore products from backup
cd bot && npm run restore:images

# Worker: local dev server
cd eza-worker && npm run dev

# Worker: type check
cd eza-worker && npm run type-check

# Worker: deploy to production
cd eza-worker && "y" | npx wrangler deploy

# Frontend: local dev
cd webapp && npm run dev

# Frontend: production build
cd webapp && npm run build
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | [Hono.js](https://hono.dev) on Cloudflare Workers |
| Database | [Neon](https://neon.tech) Serverless PostgreSQL |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Validation | [Zod](https://zod.dev) |
| Frontend | React 18 + Vite |
| Hosting (API) | Cloudflare Workers |
| Hosting (Web) | Cloudflare Pages |
| Bot | [Telegraf](https://telegraf.js.org) on Render |
| Images | [Cloudinary](https://cloudinary.com) |
| Auth | Telegram Mini App + JWT |

---

## Database Migrations

Migrations live in `bot/migrations/` and are tracked in the `schema_migrations` table.

```bash
cd bot && npm run migrate   # Apply pending migrations
```

On Render, migrations run automatically before each deploy via `preDeployCommand` in `render.yaml`.

---

Built by **Antigravity** — Senior UXUI & Full-Stack Developer
