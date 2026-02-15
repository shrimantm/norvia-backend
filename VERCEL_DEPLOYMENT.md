# Vercel Deployment Fix ✅

## ❌ Why "Cannot GET /" Error Happened

The error occurred because:

1. **Vercel uses serverless functions** - It doesn't run a traditional Node.js server
2. **`app.listen()` doesn't work on Vercel** - Vercel handles the server automatically
3. **No root route was defined** - Visiting `/` had no handler, resulting in "Cannot GET /"
4. **The app wasn't exported** - Vercel needs `module.exports = app` to use your Express app

---

## ✅ Fixed Files

### 📄 `server.js` (Updated)

```javascript
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ ROOT ROUTE - Now returns API info
app.get("/", (_req, res) => {
  res.json({ 
    message: "🌍 Carbon Credit Stock Market Game API is running",
    version: "1.0.0",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      teams: "GET /api/auth/teams",
      updateTeam: "PUT /api/auth/teams/:id",
      health: "GET /api/health"
    }
  });
});

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ Conditional listen - Only runs locally, not on Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ✅ EXPORT for Vercel serverless
module.exports = app;
```

### 📄 `vercel.json` (Updated)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 📁 Correct Folder Structure

```
backend/
├── config/
│   └── db.js
├── models/
│   └── Team.js
├── routes/
│   └── auth.js
├── .env                    # ⚠️ Add to .gitignore, set in Vercel dashboard
├── .gitignore
├── package.json
├── server.js               # ✅ Entry point, exports app
└── vercel.json             # ✅ Vercel configuration
```

---

## 🚀 Deployment Steps

### 1. **Set Environment Variables in Vercel**

Go to your Vercel project dashboard → Settings → Environment Variables

Add:
- `MONGO_URI` = `mongodb+srv://test-user1:YNtVLMbBKXrrzIFE@test.4iwkuvc.mongodb.net/carbon-credit-game?appName=test`
- `JWT_SECRET` = `carbon_credit_game_secret_key_2026`
- `NODE_ENV` = `production`

### 2. **Deploy**

```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Login
vercel login

# Deploy
cd backend
vercel --prod
```

### 3. **Test the Deployment**

Visit your deployed URL:
- **`/`** → Returns API info
- **`/api/health`** → Returns health status
- **`/api/auth/register`** → Register endpoint
- **`/api/auth/login`** → Login endpoint

---

## 🔑 Key Changes Made

| Issue | Solution |
|-------|----------|
| `Cannot GET /` | ✅ Added root route that returns API info |
| `app.listen()` on Vercel | ✅ Made it conditional (only runs locally) |
| Serverless not working | ✅ Exported app with `module.exports = app` |
| Missing environment flag | ✅ Added `NODE_ENV: production` in `vercel.json` |

---

## 🧪 Testing Locally

```bash
cd backend
npm install
npm start
```

Visit:
- http://localhost:5000/ → Should show API info
- http://localhost:5000/api/health → Should show health status

---

## 📝 Notes

- **Vercel automatically detects** `server.js` as the entry point
- **No need for `app.listen()`** on Vercel - it's handled by serverless functions
- **Always export your app** with `module.exports = app`
- **Set environment variables** in Vercel dashboard, not in `.env` file

---

✅ **Your backend is now ready for Vercel deployment!**
