# របៀបដោះស្រាយបញ្ហា Backend-Frontend Connection

## បញ្ហា
នៅពេលដាក់ webapp នៅលើ **Cloudflare Pages** (production) ហើយបើកក្នុង browser, backend មិនអាច connect បាន។ Error:
- `500 Internal Server Error`
- `401 Unauthorized`

## មូលហេតុ
Backend worker (eza-shop-api) **ត្រូវការ Telegram authentication** ដើម្បីធានាសុវត្ថិភាព។ នៅពេលអ្នកបើក webapp ក្នុង browser ធម្មតា (មិនមែនតាមរយៈ Telegram Bot), គេគ្មាន initData ដូច្នេះ backend បដិសេធ request។

## ដំណោះស្រាយ

### ✅ ដំណោះស្រាយល្អបំផុត: បើកតាមរយៈ Telegram Bot

1. បើក Telegram
2. ស្វែងរក `@Eza_Shop_Bot`
3. ចុច "បើក Shop" ឬ "Admin"
4. Webapp នឹងដំណើរការល្អ ✅

### 🔧 ដំណោះស្រាយសម្រាប់ Testing: Run Locally

ប្រសិនអ្នកចង់ test ដោយគ្មាន Telegram, run backend និង frontend នៅលើ computer របស់អ្នក:

#### 1. Run Backend Worker (Terminal 1)
```bash
cd eza-worker
npm run dev
```
Backend នឹងរត់នៅលើ: `http://localhost:8787`

#### 2. Run Frontend Webapp (Terminal 2)
```bash
cd webapp

# កែ .env file:
# VITE_BACKEND_URL=http://localhost:8787

npm run dev
```
Frontend នឹងរត់នៅលើ: `http://localhost:5173`

#### 3. បើក Browser
ទៅកាន់: `http://localhost:5173`

ឥឡូវអ្នកអាចធ្វើតេស្តបានដោយគ្មាន Telegram authentication! ពីព្រោះ code សម្គាល់ថា hostname គឺ `localhost` ហើយដាក់ `X-Debug-Bypass: true` header ស្វ័យប្រវត្តិ។

## ការកែប្រែដែលបានធ្វើ

### 1. `webapp/src/hooks/useApi.js`
```javascript
// ✅ BEFORE: Check backend URL
const isDevelopment = BACKEND_URL.includes('localhost');

// ✅ AFTER: Check where webapp is running
const isLocalDev = window.location.hostname === 'localhost';
```

**មូលហេតុ:** webapp នៅលើ Cloudflare Pages (production) អាចនៅតែ call backend localhost បាន (cross-origin)។ ប៉ុន្តែយើងមិនចង់ដាក់ debug bypass header នៅពេល webapp រត់នៅ production URL!

### 2. `webapp/src/utils/apiHelpers.js`
```javascript
// Same fix: check window.location.hostname instead of BACKEND_URL
const isLocalDev = window.location.hostname === 'localhost';
```

### 3. `eza-worker/src/middleware/auth.ts`
```typescript
// ✅ បន្ថែម support សម្រាប់ TEST_TOKEN (optional)
const testToken = c.req.header('X-Test-Token');
const isTestToken = testToken === env.TEST_TOKEN && env.TEST_TOKEN;

if (isDevBypass || isTestToken) {
  // Skip authentication
}
```

### 4. បង្កើត `TESTING.md`
Documentation ពេញលេញអំពីរបៀបធ្វើតេស្ត។

## របៀបប្រើ Production URL ជាមួយ Test Token (Advanced)

⚠️ **សូមប្រើតែសម្រាប់ temporary testing តែប៉ុណ្ណោះ!**

1. បង្កើត random token:
```bash
openssl rand -hex 32
```

2. បន្ថែម token ទៅកាន់ Cloudflare Worker:
```bash
cd eza-worker
wrangler secret put TEST_TOKEN
# Paste token
```

3. នៅក្នុង browser console:
```javascript
localStorage.setItem('test_token', 'YOUR_TOKEN_HERE');
```

4. កែ `webapp/src/hooks/useApi.js` (បន្ថែមជួរទី ~26):
```javascript
const testToken = typeof window !== 'undefined' ? localStorage.getItem('test_token') : null;

const fetchOptions = { 
  ...options, 
  headers: { 
    ...options?.headers,
    ...(isLocalDev && { 'X-Debug-Bypass': 'true' }),
    ...(testToken && { 'X-Test-Token': testToken })
  } 
};
```

5. **IMPORTANT:** លុប TEST_TOKEN បន្ទាប់ពីធ្វើតេស្តរួច:
```bash
wrangler secret delete TEST_TOKEN
```

## Summary / សង្ខេប

| Scenario | Solution |
|----------|----------|
| 🎯 **Production Use** | បើកតាមរយៈ Telegram Bot |
| 🧪 **Development Testing** | Run locally (`localhost:5173` + `localhost:8787`) |
| 🔧 **Debug Production** | ប្រើ Test Token (temporary only!) |

## ទំនាក់ទំនង

ប្រសិនមានបញ្ហា contact:
- Telegram: @Eza_Shop_Bot
- GitHub: [repo link]
