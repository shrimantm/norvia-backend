const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema({
  itemId: { type: String, required: true },      // e.g. "s1", "c2"
  itemName: { type: String, required: true },
  itemSymbol: { type: String, required: true },
  itemType: { type: String, enum: ["stock", "commodity"], required: true },
  quantity: { type: Number, required: true, min: 1 },
  buyPrice: { type: Number, required: true },     // price at time of purchase
  buyRound: { type: Number, default: 0 },         // which news round they bought in (0 = before any news)
});

const portfolioSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    holdings: [holdingSchema],
  },
  { timestamps: true }
);

// Ensure one portfolio per team
portfolioSchema.index({ teamId: 1 }, { unique: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);
