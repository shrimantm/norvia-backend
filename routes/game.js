const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const GameAttempt = require("../models/GameAttempt");
const Team = require("../models/Team");

// ─── Auth middleware ───────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.teamId = decoded.id;
    req.isAdmin = decoded.isAdmin || false;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Max attempts per game type per round (resets by admin or daily)
const MAX_ATTEMPTS = 3;

// ─── POST /api/game/word ──────────────────────────────────
router.post("/word", authMiddleware, async (req, res) => {
  try {
    const { correct, wrong } = req.body;

    // Validate input
    if (typeof correct !== "number" || typeof wrong !== "number") {
      return res.status(400).json({ message: "Invalid result data" });
    }

    // Check attempt limits
    const attempts = await GameAttempt.countDocuments({
      teamId: req.teamId,
      gameType: "word",
    });
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Maximum attempts reached for Word Challenge" });
    }

    // Calculate credits: +50 per correct, -20 per wrong
    const creditsChange = correct * 50 - wrong * 20;

    // Update team balance
    const team = await Team.findById(req.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.balance = Math.max(0, team.balance + creditsChange);
    await team.save();

    // Save attempt
    const attempt = await GameAttempt.create({
      teamId: req.teamId,
      gameType: "word",
      result: creditsChange > 0 ? "win" : "loss",
      creditsChange,
      details: { correct, wrong },
    });

    res.json({
      message: creditsChange > 0 ? "You earned credits!" : "You lost credits!",
      creditsChange,
      newBalance: team.balance,
      attempt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── POST /api/game/pattern ───────────────────────────────
router.post("/pattern", authMiddleware, async (req, res) => {
  try {
    const { correct, wrong } = req.body;

    if (typeof correct !== "number" || typeof wrong !== "number") {
      return res.status(400).json({ message: "Invalid result data" });
    }

    const attempts = await GameAttempt.countDocuments({
      teamId: req.teamId,
      gameType: "pattern",
    });
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Maximum attempts reached for Pattern Recognition" });
    }

    // Calculate credits: +40 per correct, -20 per wrong
    const creditsChange = correct * 40 - wrong * 20;

    const team = await Team.findById(req.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.balance = Math.max(0, team.balance + creditsChange);
    await team.save();

    const attempt = await GameAttempt.create({
      teamId: req.teamId,
      gameType: "pattern",
      result: creditsChange > 0 ? "win" : "loss",
      creditsChange,
      details: { correct, wrong },
    });

    res.json({
      message: creditsChange > 0 ? "You earned credits!" : "You lost credits!",
      creditsChange,
      newBalance: team.balance,
      attempt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── POST /api/game/maze ──────────────────────────────────
router.post("/maze", authMiddleware, async (req, res) => {
  try {
    const { won, moves } = req.body;

    if (typeof won !== "boolean" || typeof moves !== "number") {
      return res.status(400).json({ message: "Invalid result data" });
    }

    const attempts = await GameAttempt.countDocuments({
      teamId: req.teamId,
      gameType: "maze",
    });
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Maximum attempts reached for Maze Navigation" });
    }

    // +60 for win, -30 for loss
    const creditsChange = won ? 60 : -30;

    const team = await Team.findById(req.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    team.balance = Math.max(0, team.balance + creditsChange);
    await team.save();

    const attempt = await GameAttempt.create({
      teamId: req.teamId,
      gameType: "maze",
      result: won ? "win" : "loss",
      creditsChange,
      details: { moves },
    });

    res.json({
      message: won ? "You escaped the maze!" : "You failed the maze!",
      creditsChange,
      newBalance: team.balance,
      attempt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /api/game/attempts ─── Get attempt count per type ─
router.get("/attempts", authMiddleware, async (req, res) => {
  try {
    const [word, pattern, maze] = await Promise.all([
      GameAttempt.countDocuments({ teamId: req.teamId, gameType: "word" }),
      GameAttempt.countDocuments({ teamId: req.teamId, gameType: "pattern" }),
      GameAttempt.countDocuments({ teamId: req.teamId, gameType: "maze" }),
    ]);

    res.json({
      word,
      pattern,
      maze,
      maxAttempts: MAX_ATTEMPTS,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ─── GET /api/game/history ─── Game history for a team ─────
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await GameAttempt.find({ teamId: req.teamId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
