const express = require("express");
const cors = require("cors");
const connectDB = require("../config/db");
const authRoutes = require("../routes/auth");
const marketRoutes = require("../routes/market");
const gameRoutes = require("../routes/game");

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors({
  origin: "https://norvia-frontend.vercel.app"
}));
app.use(express.json());

// Root route
app.get("/", (_req, res) => {
  res.json({ message: "Backend running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/game", gameRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
