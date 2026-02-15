const mongoose = require("mongoose");

// Singleton document that tracks the current news round (0-4)
// 0 = no news yet (prices = basePrice), 1-4 = after news round 1-4
// Also stores admin overrides: frozen items, price adjustments, events
const gameStateSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    currentRound: { type: Number, default: 0, min: 0, max: 4 },

    // Admin: frozen items cannot be bought/sold, price stays at last value
    frozenItems: { type: [String], default: [] },

    // Admin: per-item percentage overrides for the CURRENT round
    // e.g. { "s1": 5, "c2": -10 } — adds extra % on top of base change
    priceOverrides: { type: Map, of: Number, default: {} },

    // Admin: active special event (null = none)
    // "crash"    → all items get extra -15%
    // "recovery" → all items get extra +10%
    // "boom"     → all items get extra +20%
    activeEvent: { type: String, default: null, enum: [null, "crash", "recovery", "boom"] },

    // Which round the event applies to (so it doesn't stack across rounds)
    eventRound: { type: Number, default: 0 },

    // Admin: freeze entire market for a duration
    marketFrozen: { type: Boolean, default: false },
    marketFreezeUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GameState", gameStateSchema);
