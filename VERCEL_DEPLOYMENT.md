# 🚀 Vercel Deployment Guide

## Required Environment Variables

You need to set these in **Vercel Dashboard** → Your Project → Settings → Environment Variables:

### Server-Side (Serverless Functions / API Routes)

| Variable | Value | Description |
|----------|-------|-------------|
| `GAMERSTAKE_API_KEY` | `your_production_api_key` | SDK API key from GamerStake |
| `GAMERSTAKE_ENVIRONMENT` | `production` | SDK environment mode |
| `PORT` | `3001` | (Optional) Socket server port (if separate) |

### Client-Side (Public - Exposed to Browser)

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | `wss://your-socket-server.vercel.app` or your socket server URL | WebSocket server URL |
| `NEXT_PUBLIC_PLATFORM_URL` | `https://gamerstake.io` | Platform URL for redirects |

---

## ⚠️ Important Notes

### 1. Socket Server Deployment

**Option A: Separate Socket Server (Recommended)**
- Deploy socket server separately (e.g., Railway, Render, or another Vercel project)
- Set `NEXT_PUBLIC_SOCKET_URL` to that server's URL
- Example: `wss://xy-game-socket.railway.app`

**Option B: Same Vercel Project**
- If socket server runs in the same Vercel project, you'll need to:
  - Use Vercel's serverless functions for WebSocket (requires upgrade)
  - Or use a different hosting for the socket server

### 2. CORS Configuration

Update `server/index.ts` CORS origins to include your Vercel domain:

```typescript
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',                    // Local dev
      'https://dev.gamerstake.io',                // Platform dev
      'https://gamerstake.io',                    // Platform prod
      'https://xy-game.vercel.app',              // ⬅️ ADD YOUR VERCEL URL
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '', // Auto from Vercel
    ].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});
```

### 3. Environment Variable Setup in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: `GAMERSTAKE_API_KEY`
   - **Value**: Your production API key
   - **Environment**: Production (and Preview if needed)
   - **Apply to**: All (or specific environments)

Repeat for all variables above.

---

## 📋 Quick Checklist

- [ ] `GAMERSTAKE_API_KEY` set in Vercel (Production)
- [ ] `GAMERSTAKE_ENVIRONMENT=production` set in Vercel
- [ ] `NEXT_PUBLIC_SOCKET_URL` set to your socket server URL
- [ ] `NEXT_PUBLIC_PLATFORM_URL` set to production platform URL
- [ ] CORS origins updated in `server/index.ts` with Vercel domain
- [ ] Socket server deployed and accessible
- [ ] Test deployment with a real match

---

## 🔍 Testing After Deployment

1. **Check Environment Variables**
   ```bash
   # In Vercel logs, you should see:
   [SDK] Initialized in production mode
   ```

2. **Test Match Flow**
   - Create a match on platform
   - Platform redirects to: `https://xy-game.vercel.app/game/{matchId}?token={jwt}`
   - Game should connect and start

3. **Check Socket Connection**
   - Open browser DevTools → Network → WS
   - Should see WebSocket connection to your socket server

---

## 🐛 Common Issues

### Issue: "Invalid or expired token"
- **Solution**: Check `GAMERSTAKE_API_KEY` is correct and `GAMERSTAKE_ENVIRONMENT=production`

### Issue: Socket connection fails
- **Solution**: Verify `NEXT_PUBLIC_SOCKET_URL` is correct and socket server is running

### Issue: CORS errors
- **Solution**: Add your Vercel domain to CORS origins in `server/index.ts`

### Issue: Environment variables not working
- **Solution**:
  - Make sure variables are set for **Production** environment
  - Redeploy after adding variables
  - Variables starting with `NEXT_PUBLIC_` are exposed to browser

---

## 📝 Example Vercel Environment Variables

```
GAMERSTAKE_API_KEY=prod_abc123xyz...
GAMERSTAKE_ENVIRONMENT=production
NEXT_PUBLIC_SOCKET_URL=wss://xy-game-socket.railway.app
NEXT_PUBLIC_PLATFORM_URL=https://gamerstake.io
```

