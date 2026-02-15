const mongoose = require("mongoose");

const gameAttemptSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  gameType: { type: String, enum: ["word", "pattern", "maze"], required: true },
  result: { type: String, enum: ["win", "loss"], required: true },
  creditsChange: { type: Number, required: true },
  details: { type: Object, default: {} }, // correct count, wrong count, moves, etc.
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient lookup of attempts per team per game
gameAttemptSchema.index({ teamId: 1, gameType: 1, createdAt: -1 });

module.exports = mongoose.model("GameAttempt", gameAttemptSchema);
