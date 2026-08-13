# EZA SHOP — New Store Checklist

Branded clone from MO-MO template. Use **new credentials only** (do not reuse MO-MO production).

## Naming map

| Item | Value |
|------|--------|
| Brand | **EZA SHOP** |
| Local folder | `d:\MO-MO-clone` → rename to `d:\EZA-SHOP` optional |
| GitHub repo | `eza-shop` (recommended) |
| Telegram bot | `@Eza_Shop_Bot` |
| Render services | `eza-shop-bot`, `eza-shop-web` |

## Bot Telegram (EZA SHOP)

- Bot: https://t.me/Eza_Shop_Bot
- Username: `@Eza_Shop_Bot`
- Create token via `@BotFather` → `/newbot` (already done)
- **Never commit** `bot/.env` or paste token in chat — use `/revoke` if leaked

```powershell
copy bot\.env.example bot\.env
# Edit bot\.env → BOT_TOKEN, DATABASE_URL, WEBAPP_URL, SUPERADMIN_ID, Cloudinary
```

Webapp:
```powershell
copy webapp\.env.example webapp\.env
# VITE_BACKEND_URL = bot URL
# VITE_BOT_USERNAME=Eza_Shop_Bot
```

BotFather menu button → WebApp URL → `🛍️ ចូលហាង EZA SHOP`

## Before deploy

1. **Revoke token if pasted publicly** → BotFather `/mybots` → EZA SHOP → API Token → Revoke → copy **new** token
2. Create **new** PostgreSQL database → `DATABASE_URL`
3. Cloudinary folder/account → upload keys
4. Copy `bot/.env.example` → `bot/.env` and fill values
5. Copy `webapp/.env.example` → `webapp/.env`
6. Set `SUPERADMIN_ID` = your Telegram ID (`@userinfobot`)
7. Run `npm run migrate --prefix bot`
8. Deploy bot + webapp
9. Admin → Settings: logo, banner, payment QR, shop name

## GitHub (optional)

```powershell
cd d:\MO-MO-clone
git remote rename origin upstream
git remote add origin https://github.com/koeurnDev/eza-shop.git
git push -u origin main
```

## MO-MO vs EZA SHOP

- Same codebase, **separate** bot, DB, products, and Cloudinary.
- Customer data never shared between stores.
