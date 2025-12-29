# 🚀 Vercel Deployment Guide

## Required Environment Variables

You need to set these in **Vercel Dashboard** → Your Project → Settings → Environment Variables:

### Server-Side (Serverless Functions / API Routes)

| Variable                 | Value                     | Description                                 |
| ------------------------ | ------------------------- | ------------------------------------------- |
| `GAMERSTAKE_API_KEY`     | `your_production_api_key` | SDK API key from GamerStake                 |
| `GAMERSTAKE_ENVIRONMENT` | `production`              | SDK environment mode                        |
| `PORT`                   | `3001`                    | (Optional) Socket server port (if separate) |

### Client-Side (Public - Exposed to Browser)

| Variable                   | Value                              | Description                |
| -------------------------- | ---------------------------------- | -------------------------- |
| `NEXT_PUBLIC_SOCKET_URL`   | Your socket server URL (see below) | WebSocket server URL       |
| `NEXT_PUBLIC_PLATFORM_URL` | `https://gamerstake.io`            | Platform URL for redirects |

---

## ⚠️ Important Notes

### 1. Socket Server Deployment

**⚠️ IMPORTANT: Vercel serverless functions DO NOT support persistent WebSocket connections.**

Your `server/index.ts` socket server **MUST** be deployed separately:

**Option A: Railway (Recommended - Easiest)**

1. Create account at [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repo
4. Set environment variables:
    - `GAMERSTAKE_API_KEY`
    - `GAMERSTAKE_ENVIRONMENT=production`
    - `PORT=3001`
5. Railway will give you a URL like: `https://xy-game-production.up.railway.app`
6. Set `NEXT_PUBLIC_SOCKET_URL=https://xy-game-production.up.railway.app` (use `https://`, Socket.io handles WebSocket upgrade)

**Option B: Render**

1. Create account at [render.com](https://render.com)
2. Create new Web Service → Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm run server`
5. Set environment variables (same as Railway)
6. Render gives you: `https://xy-game.onrender.com`
7. Set `NEXT_PUBLIC_SOCKET_URL=https://xy-game.onrender.com`

**Option C: Fly.io**

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch` in your project
3. Deploy: `fly deploy`
4. Get URL: `https://xy-game.fly.dev`
5. Set `NEXT_PUBLIC_SOCKET_URL=https://xy-game.fly.dev`

### 2. CORS Configuration

Update `server/index.ts` CORS origins to include your Vercel domain:

```typescript
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: [
            "http://localhost:3000", // Local dev
            "https://dev.gamerstake.io", // Platform dev
            "https://gamerstake.io", // Platform prod
            "https://xy-game.vercel.app", // ⬅️ ADD YOUR VERCEL URL
            process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "", // Auto from Vercel
        ].filter(Boolean),
        methods: ["GET", "POST"],
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

-   [ ] `GAMERSTAKE_API_KEY` set in Vercel (Production)
-   [ ] `GAMERSTAKE_ENVIRONMENT=production` set in Vercel
-   [ ] `NEXT_PUBLIC_SOCKET_URL` set to your socket server URL
-   [ ] `NEXT_PUBLIC_PLATFORM_URL` set to production platform URL
-   [ ] CORS origins updated in `server/index.ts` with Vercel domain
-   [ ] Socket server deployed and accessible
-   [ ] Test deployment with a real match

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

-   **Solution**: Check `GAMERSTAKE_API_KEY` is correct and `GAMERSTAKE_ENVIRONMENT=production`

### Issue: Socket connection fails

-   **Solution**: Verify `NEXT_PUBLIC_SOCKET_URL` is correct and socket server is running

### Issue: CORS errors

-   **Solution**: Add your Vercel domain to CORS origins in `server/index.ts`

### Issue: Environment variables not working

-   **Solution**:
    -   Make sure variables are set for **Production** environment
    -   Redeploy after adding variables
    -   Variables starting with `NEXT_PUBLIC_` are exposed to browser

---

## 📝 Example Vercel Environment Variables

**In Vercel Dashboard → Settings → Environment Variables:**

```
GAMERSTAKE_API_KEY=prod_abc123xyz...
GAMERSTAKE_ENVIRONMENT=production
NEXT_PUBLIC_SOCKET_URL=https://xy-game-production.up.railway.app
NEXT_PUBLIC_PLATFORM_URL=https://gamerstake.io
```

**Note:** Use `https://` (not `wss://`) for `NEXT_PUBLIC_SOCKET_URL`. Socket.io will automatically upgrade to WebSocket.

---

## 🔍 How to Find Your Socket Server URL

1. **If on Railway:**

    - Go to Railway Dashboard → Your Project → Settings → Domains
    - Copy the `.railway.app` URL

2. **If on Render:**

    - Go to Render Dashboard → Your Service → Settings
    - Copy the `.onrender.com` URL

3. **If on Fly.io:**

    - Run: `fly status` or check Fly Dashboard

4. **Test your socket server:**
    ```bash
    curl https://your-socket-server-url.com
    # Should return some response (even if error, means it's accessible)
    ```
