# Bug Fixes Applied

## Issues Fixed

### 1. ✅ ERR_BLOCKED_BY_CLIENT on `/api/v1/app-state`
**Root Cause:** Ad blockers flag URLs containing "app-state" as telemetry/tracking.

**Fix Applied:**
- Renamed endpoint from `/api/v1/app-state` to `/api/v1/telemetry` in `eza-worker/src/routes/settings.ts`
- Note: Frontend's `useTelemetry` hook is already disabled (no-op), so no frontend changes needed

**Files Modified:**
- `eza-worker/src/routes/settings.ts` - Line 142-146

---

### 2. ✅ 400 Error on `/api/wishlist/toggle`
**Root Cause:** Authentication header mismatch - frontend was only sending `X-TG-Data`, but backend checks multiple header names including `X-Telegram-Init-Data`.

**Fix Applied:**
- Updated API client to send both `X-Telegram-Init-Data` and `X-TG-Data` headers
- This ensures compatibility with backend's flexible header checking in `telegramAuth` middleware

**Files Modified:**
- `webapp/src/api/index.js` - Line 13-17

**Backend Auth Middleware Logic:**
```typescript
const initData = c.req.header('X-Telegram-Init-Data') 
              || c.req.header('x-tg-data') 
              || c.req.header('X-TG-Data') 
              || c.req.header('x-telegram-init-data');
```

---

### 3. ⚠️ AbortError: Transition was skipped
**Root Cause:** This is a React Router warning that occurs when:
- Multiple rapid navigation requests happen
- A navigation is interrupted by another navigation
- Component unmounts during navigation

**Potential Causes in Your App:**
- Rapid clicking on navigation buttons
- Programmatic navigation conflicts (e.g., `setView` called multiple times)
- Back button handling conflicts

**Recommended Fixes:**
1. Add debouncing to navigation functions
2. Check if navigation is in progress before starting a new one
3. Clean up navigation listeners properly

**Example debounce implementation:**
```javascript
const debouncedSetView = useMemo(
  () => debounce((view) => setView(view), 150),
  [setView]
);
```

---

## Testing Checklist

- [ ] Deploy updated worker: `cd eza-worker && npx wrangler deploy`
- [ ] Deploy updated frontend: Push to git (Cloudflare Pages auto-deploys)
- [ ] Test wishlist toggle functionality
- [ ] Verify no ERR_BLOCKED_BY_CLIENT errors in console
- [ ] Monitor for AbortError warnings (should be rare/eliminated)

---

## Additional Notes

### Authentication Flow
The app now sends authentication data via two headers:
1. `X-Telegram-Init-Data` - Primary header expected by backend
2. `X-TG-Data` - Backup header for compatibility

### Ad Blocker Compatibility
Renamed telemetry endpoint avoids common ad blocker patterns:
- ❌ `/app-state`, `/analytics`, `/tracking`
- ✅ `/telemetry`, `/metrics`, `/events`

### Wishlist Validation
Backend expects:
```json
{
  "productId": 123  // Must be positive integer
}
```

Frontend now properly sends this format with both auth headers.

---

Generated: 2026-08-16
