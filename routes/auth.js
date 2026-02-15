const express = require("express");
const jwt = require("jsonwebtoken");
const Team = require("../models/Team");

const router = express.Router();

// Generate JWT
function generateToken(team) {
  return jwt.sign(
    { id: team._id, teamName: team.teamName, isAdmin: team.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// ──────────────── REGISTER ────────────────
router.post("/register", async (req, res) => {
  try {
    const { teamName, password } = req.body;

    if (!teamName || !password) {
      return res.status(400).json({ message: "Team name and password are required" });
    }

    if (teamName.trim().length < 2) {
      return res.status(400).json({ message: "Team name must be at least 2 characters" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters" });
    }

    // Check if team name already exists (case-insensitive)
    const existingTeam = await Team.findOne({
      teamName: { $regex: new RegExp(`^${teamName.trim()}$`, "i") },
    });

    if (existingTeam) {
      return res.status(409).json({ message: "Team name already taken. Choose a different name." });
    }

    // Create team
    const isAdmin = teamName.trim().toLowerCase() === "admin";
    const team = await Team.create({
      teamName: teamName.trim(),
      password,
      isAdmin,
    });

    const token = generateToken(team);

    res.status(201).json({
      message: "Team registered successfully",
      token,
      team: {
        id: team._id,
        teamName: team.teamName,
        balance: team.balance,
        quizScore: team.quizScore,
        isAdmin: team.isAdmin,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Team name already taken." });
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ──────────────── LOGIN ────────────────
router.post("/login", async (req, res) => {
  try {
    const { teamName, password } = req.body;

    if (!teamName || !password) {
      return res.status(400).json({ message: "Team name and password are required" });
    }

    // Find team (case-insensitive)
    const team = await Team.findOne({
      teamName: { $regex: new RegExp(`^${teamName.trim()}$`, "i") },
    });

    if (!team) {
      return res.status(401).json({ message: "Team not found. Please register first." });
    }

    // Compare password
    const isMatch = await team.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = generateToken(team);

    res.json({
      message: "Login successful",
      token,
      team: {
        id: team._id,
        teamName: team.teamName,
        balance: team.balance,
        quizScore: team.quizScore,
        isAdmin: team.isAdmin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ──────────────── GET ALL TEAMS (leaderboard) ────────────────
router.get("/teams", async (_req, res) => {
  try {
    const teams = await Team.find({}, "teamName balance quizScore")
      .sort({ balance: -1 })
      .lean();
    res.json(teams);
  } catch (error) {
    console.error("Fetch teams error:", error);
    res.status(500).json({ message: "Server error fetching teams" });
  }
});

// ──────────────── UPDATE TEAM STATS ────────────────
router.put("/teams/:id", async (req, res) => {
  try {
    const { balance, quizScore } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { balance, quizScore },
      { new: true, select: "teamName balance quizScore" }
    );
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    console.error("Update team error:", error);
    res.status(500).json({ message: "Server error updating team" });
  }
});

module.exports = router;
