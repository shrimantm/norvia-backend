require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const marketRoutes = require("./routes/market");
const gameRoutes = require("./routes/game");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (_req, res) => {
  res.json({ 
    message: "🌍 Carbon Credit Stock Market Game API is running",
    version: "1.0.0",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      teams: "GET /api/auth/teams",
      updateTeam: "PUT /api/auth/teams/:id",
      health: "GET /api/health",
      marketData: "GET /api/market/data",
      nextNews: "POST /api/market/next-news",
      buyItem: "POST /api/market/buy",
      sellItem: "POST /api/market/sell",
      portfolio: "GET /api/market/portfolio",
      resetMarket: "POST /api/market/reset",
      wordGame: "POST /api/game/word",
      patternGame: "POST /api/game/pattern",
      mazeGame: "POST /api/game/maze",
      gameAttempts: "GET /api/game/attempts",
      gameHistory: "GET /api/game/history"
    }
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/game", gameRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server (only for local development, not for Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
