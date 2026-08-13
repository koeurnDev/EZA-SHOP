# MO-MO Maintenance Guide

Quick reference for day-to-day ops. Run all commands from the **`bot/`** directory unless noted.

---

## Daily / Weekly Checklist

| Task | Command | When |
|------|---------|------|
| Health check | `npm run smoke` | After deploy or weekly |
| DB migrations | `npm run migrate` | After pulling schema changes |
| Image scan (safe) | `npm run scan:images` | Weekly — **does not wipe DB** |
| Restore images | `npm run restore:images` | If product photos disappear |
| DB backup | `npm run backup:db` | Before major changes |

---

## Database Migrations

All SQL files live in `bot/migrations/`. Applied migrations are tracked in `schema_migrations`.

```bash
cd bot
npm run migrate          # apply pending migrations
```

**Render:** `preDeployCommand: npm run migrate` runs automatically on each backend deploy.

**Rules:**
- New migrations: use `000_name.sql` prefix so table-creation runs before index files.
- Save files as **UTF-8** (not UTF-16) — UTF-16 breaks PostgreSQL with `invalid message format`.

---

## Product Images

### Safe scan (default)
```bash
npm run scan:images        # flags broken URLs in Redis cache only
npm run scan:images:dry    # report only
```

### Dangerous — only when intentional
```bash
npm run scan:images:clear  # removes broken URLs from products table
npm run restore:images     # restore from backup JSON
```

**Never** run `--clear-db` on production without a backup. The keep-alive worker uses `clearDb: false`.

Optional env:
```env
DISABLE_IMAGE_SCAN=true    # disable daily worker scan
```

---

## Wishlist

- Table: `wishlist (user_id, product_id)`
- API: `GET /api/wishlist`, `POST /api/wishlist/toggle`
- Frontend syncs on login; `localStorage` is offline cache only.

---

## Frontend Structure

| File | Purpose |
|------|---------|
| `webapp/src/App.css` | Global + layout styles |
| `webapp/src/styles/product-detail.css` | Product detail (`.pd-*`) |
| `webapp/src/styles/wishlist.css` | Wishlist page + profile favorites |
| `webapp/src/styles/admin-dashboard.css` | Admin panel |

When editing product detail UI, change **`product-detail.css`** — not the full App.css.

---

## Shared Business Logic

Discount and delivery math live in **`shared/`** (single source of truth):

| Module | Used by |
|--------|---------|
| `shared/discountUtils.js` | bot checkout + webapp cart/product cards |
| `shared/deliveryUtils.js` | bot order totals + webapp checkout |

Bot re-exports via `bot/utils/*.js`. Webapp imports via `@shared` alias in `vite.config.js`.

**Do not** duplicate formulas in bot/webapp — change `shared/` and run tests.

---

## Automated Tests

```bash
npm test              # shared discount + delivery math (node:test)
cd bot && npm run smoke   # DB + env health check
npm run check         # test + smoke + webapp build
```

---

## Deploy (Render)

1. Push to `main`
2. Backend: build → **migrate** → start
3. Frontend: static build with `VITE_BACKEND_URL`
4. Run `npm run smoke` on Render shell after first deploy

---

## Known Gaps (future work)

- Expand tests to API routes (order create, wishlist toggle)
- Further split `App.css` (product cards, admin leftovers)
- CI deploy is Render auto-deploy — no SSH step needed

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 0 products / blank images | `npm run restore:images`, hard-refresh Mini App |
| Wishlist not syncing | Check `GET /api/wishlist` auth (`X-TG-Data` header) |
| Migration fails | Check file encoding (UTF-8), run `npm run migrate` again |
| `invalid message format` | SQL file saved as UTF-16 — re-save as UTF-8 |
