# Admin Dashboard Testing Guide

## ✅ Backend API Status: WORKING

All endpoints return 200 OK:
- GET /api/admin/dashboard ✅
- GET /api/admin/products ✅ (6 items)
- GET /api/admin/faqs ✅
- GET /api/admin/advanced-analytics ✅

## 🔍 Debugging Steps:

### 1. Open Browser DevTools (F12)

**Console Tab:**
- Look for JavaScript errors (red text)
- Look for "Failed to load" messages
- Take screenshot if you see errors

**Network Tab:**
- Reload page (Ctrl+R)
- Filter by "Fetch/XHR"
- Check if `/api/admin/products` shows:
  - Status: 200 OK
  - Response: {...products: [...]}

### 2. Check Products Tab

When you click "Products" tab (ផ្លាកសញ្ញាពិនិត្យ):

**If you see:**
- ❌ "កំពុងផ្ទុក..." (Loading spinner) → API slow or stuck
- ❌ Blank/white screen → Component rendering error
- ❌ "គ្មានទំនិញ" (No products) → Data parsing issue
- ✅ Product cards/list → WORKING!

### 3. Quick Fix Options:

**Option A: Hard Refresh**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**Option B: Clear Cache & Reload**
```
F12 → Right-click reload button → "Empty Cache and Hard Reload"
```

**Option C: Incognito/Private Window**
```
Ctrl + Shift + N (Chrome)
Ctrl + Shift + P (Firefox)
```

### 4. Check React State

Open Console and type:
```javascript
// Check if products data loaded
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
```

## 📊 Expected Behavior:

When "Products" tab is active, you should see:
1. Search input at top
2. Category filter dropdown
3. "Add Product" button (green)
4. List of 6 products with:
   - Product image
   - Product name
   - Price
   - Stock count
   - Edit/Delete buttons

## 🐛 Common Issues:

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank tab | Component crash | Check Console for errors |
| Loading forever | API timeout | Check Network tab |
| "គ្មានទំនិញ" | Empty array | Check API response data |
| No tabs visible | Auth failure | Refresh page |

## 📸 Send Screenshot:

If still not working, take screenshot of:
1. The admin page (tabs visible)
2. Browser Console (F12 → Console tab)
3. Network tab (F12 → Network → filter "products")

