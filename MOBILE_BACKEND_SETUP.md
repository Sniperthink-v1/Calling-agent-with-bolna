# Mobile App Backend Configuration Guide

## ✅ Configuration Completed

### Mobile App Setup
Your mobile app is now configured to use the production backend:
- **Backend URL**: `https://calling-agent-with-bolna-production.up.railway.app/api`

### Files Updated:
1. **`mobile/.env`** - API base URL updated to production
2. **`mobile/src/config/environment.ts`** - All environments (dev/staging/prod) point to production backend

---

## 🔒 CORS Configuration (Backend)

### Current CORS Settings
The backend (`backend/src/server.ts`) is already configured with proper CORS settings:

```typescript
app.use(cors({
  origin: function (origin, callback) {
    // Allows:
    // 1. Requests with no origin (mobile apps, curl, etc.)
    // 2. Origins from FRONTEND_URL env variable
    // 3. Origins from CORS_ORIGIN env variable
    // 4. Localhost origins (if DEV_ALLOW_LOCALHOST=true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'X-File-Name']
}));
```

### ✅ Mobile Apps Work Without CORS Issues
**Important**: Mobile apps (React Native/Expo) do NOT have CORS restrictions because:
- They don't run in a browser
- Requests come from the native app, not a web browser
- No `Origin` header is sent (CORS allows requests with no origin)

The backend code explicitly allows this:
```typescript
// Allow requests with no origin (mobile apps, curl, etc.)
if (!origin) return callback(null, true);
```

---

## 📋 Backend Environment Variables (Already Configured)

### Required Variables in Railway:
```bash
# Frontend URLs (for web app CORS)
FRONTEND_URL=https://calling-agent-with-bolna-production.up.railway.app,http://192.168.1.25:8080

# Additional CORS origins (optional)
CORS_ORIGIN=https://calling-agent-with-bolna-production.up.railway.app,http://localhost:8080,http://192.168.1.25:8080

# Allow localhost in development (optional)
DEV_ALLOW_LOCALHOST=true
NODE_ENV=production
```

### Current CORS_ORIGIN in backend/.env:
```
CORS_ORIGIN=https://calling-agent-with-bolna-production.up.railway.app,http://localhost:8080,http://192.168.1.25:8080
```

✅ **No changes needed** - Mobile apps will work as-is!

---

## 🚀 Testing the Connection

1. **Restart your mobile app**:
   ```bash
   # In mobile directory
   npx expo start --clear
   ```

2. **Test API connection**:
   - Login to the mobile app
   - Check if data loads (agents, campaigns, contacts)
   - Try creating a campaign or making a call

3. **Check for errors**:
   - Open Metro bundler console (where you ran `npx expo start`)
   - Look for API errors
   - Common errors:
     - `Network Error` - Backend might be down
     - `401 Unauthorized` - Token expired, try logging out and back in
     - `404 Not Found` - Endpoint doesn't exist

---

## 🔧 Troubleshooting

### If you get connection errors:

1. **Verify backend is running**:
   ```bash
   curl https://calling-agent-with-bolna-production.up.railway.app/api/health
   ```
   Should return: `{"status":"ok"}`

2. **Check mobile app network logs**:
   - In your app, check React Query DevTools (if enabled)
   - Or add console logs in `mobile/src/api/client.ts`:
   ```typescript
   apiClient.interceptors.response.use(
     (response) => {
       console.log('✅ API Response:', response.config.url, response.status);
       return response;
     },
     (error) => {
       console.log('❌ API Error:', error.config?.url, error.response?.status);
       return Promise.reject(error);
     }
   );
   ```

3. **Test specific endpoint**:
   ```bash
   # Test from terminal
   curl -X GET https://calling-agent-with-bolna-production.up.railway.app/api/agents \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### Common Issues:

| Issue | Solution |
|-------|----------|
| Network timeout | Increase timeout in `mobile/src/api/client.ts` (currently 30s) |
| 401 Errors | Clear app storage and login again |
| Can't connect | Check if backend is deployed and running on Railway |
| Slow responses | Railway free tier may be slow, consider upgrading |

---

## 📱 Railway Backend Configuration Checklist

Ensure these environment variables are set in your Railway project:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `FRONTEND_URL` - Your frontend URLs (comma-separated)
- ✅ `CORS_ORIGIN` - Additional allowed origins
- ✅ `JWT_SECRET` - For authentication
- ✅ `BOLNA_API_KEY` - For Bolna.ai integration
- ✅ All other required env variables from `.env.example`

---

## 🎯 Next Steps

1. Clear mobile app cache: `npx expo start --clear`
2. Test login functionality
3. Test API calls (fetch agents, campaigns, contacts)
4. Test creating a campaign with the new UI
5. Monitor Railway logs for any backend errors

---

## 📝 Notes

- Mobile apps don't need to be added to CORS_ORIGIN (they have no origin header)
- The backend automatically allows requests without an origin
- CORS_ORIGIN is only for web browsers accessing the API
- If you deploy a web frontend, add its URL to FRONTEND_URL or CORS_ORIGIN
