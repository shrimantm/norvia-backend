const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const marketData = require("../data/marketData");
const GameState = require("../models/GameState");
const Portfolio = require("../models/Portfolio");
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

// ─── Helper: ensure GameState singleton exists ─────────────
async function getGameState() {
  let gs = await GameState.findOne({ key: "main" });
  if (!gs) {
    gs = await GameState.create({ key: "main", currentRound: 0 });
  }
  return gs;
}

// ─── Event multiplier map ──────────────────────────────────
const EVENT_MODIFIERS = {
  crash: -15,
  recovery: 10,
  boom: 20,
};

// ─── Helper: calculate price at a given round ──────────────
// Price = basePrice * (1 + pct1/100) * (1 + pct2/100) * ...
// Applies admin overrides and events for the relevant round
function getCurrentPrice(item, round, gs) {
  if (round === 0) return item.basePrice;

  let price = item.basePrice;
  for (let r = 1; r <= Math.min(round, item.newsRounds.length); r++) {
    let pct = item.newsRounds[r - 1].percentChange;

    // Apply admin per-item override for this round (if matching)
    if (gs && gs.priceOverrides && r === gs.currentRound) {
      const override = gs.priceOverrides.get(item.id);
      if (override !== undefined) {
        pct += override;
      }
    }

    // Apply special event modifier for the round it was set
    if (gs && gs.activeEvent && gs.eventRound === r) {
      const eventMod = EVENT_MODIFIERS[gs.activeEvent] || 0;
      pct += eventMod;
    }

    // Fairness cap: no single round change exceeds ±30%
    pct = Math.max(-30, Math.min(30, pct));

    price = price * (1 + pct / 100);
  }

  // Round to 2 decimals, minimum price 1 CC
  return Math.max(1, Math.round(price * 100) / 100);
}

// ─── Helper: get current news headline for an item ─────────
function getCurrentNews(item, round) {
  if (round === 0) return "Market awaiting first news release...";
  const idx = Math.min(round, item.newsRounds.length) - 1;
  return item.newsRounds[idx].news;
}

// ─── Helper: build market response ─────────────────────────
function buildMarketResponse(items, round, gs) {
  return items.map((item) => {
    const currentPrice = getCurrentPrice(item, round, gs);
    const previousPrice = round <= 1 ? item.basePrice : getCurrentPrice(item, round - 1, gs);
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice > 0 ? Math.round(((change / previousPrice) * 100) * 100) / 100 : 0;
    const totalChangePercent = item.basePrice > 0 ? Math.round(((currentPrice - item.basePrice) / item.basePrice * 100) * 100) / 100 : 0;

    // Is this item frozen?
    const isFrozen = gs && gs.frozenItems && gs.frozenItems.includes(item.id);

    // Build price history (base + each round up to current)
    const priceHistory = [item.basePrice];
    for (let r = 1; r <= round; r++) {
      priceHistory.push(getCurrentPrice(item, r, gs));
    }

    // Get the raw percent change for this round
    const roundPctChange = round > 0
      ? item.newsRounds[Math.min(round, item.newsRounds.length) - 1].percentChange
      : 0;

    return {
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      type: item.type,
      basePrice: item.basePrice,
      currentPrice,
      change,
      changePercent,
      totalChangePercent,
      roundPctChange,
      isFrozen,
      currentNews: getCurrentNews(item, round),
      priceHistory,
      newsHistory: item.newsRounds.slice(0, round).map((nr, i) => ({
        round: i + 1,
        news: nr.news,
        percentChange: nr.percentChange,
        priceAfter: getCurrentPrice(item, i + 1, gs),
      })),
    };
  });
}

// ═══════════════════════════════════════════════════════════
// GET /api/market/data — returns all stocks & commodities
// ═══════════════════════════════════════════════════════════
router.get("/data", async (_req, res) => {
  try {
    const gs = await getGameState();
    const round = gs.currentRound;

    const stocks = buildMarketResponse(marketData.stocks, round, gs);
    const commodities = buildMarketResponse(marketData.commodities, round, gs);

    // Check if market freeze has expired
    if (gs.marketFrozen && gs.marketFreezeUntil && new Date() > gs.marketFreezeUntil) {
      gs.marketFrozen = false;
      gs.marketFreezeUntil = null;
      await gs.save();
    }

    res.json({
      currentRound: round,
      totalRounds: 4,
      stocks,
      commodities,
      // Admin info
      frozenItems: gs.frozenItems || [],
      activeEvent: gs.activeEvent,
      eventRound: gs.eventRound || 0,
      priceOverrides: gs.priceOverrides ? Object.fromEntries(gs.priceOverrides) : {},
      marketFrozen: gs.marketFrozen || false,
      marketFreezeUntil: gs.marketFreezeUntil || null,
    });
  } catch (err) {
    console.error("GET /market/data error:", err);
    res.status(500).json({ message: "Failed to fetch market data" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/next-news — advance to next news round (admin only)
// ═══════════════════════════════════════════════════════════
router.post("/next-news", authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const gs = await getGameState();
    if (gs.currentRound >= 4) {
      return res.status(400).json({ message: "All 4 news rounds are already released" });
    }

    gs.currentRound += 1;
    // Clear per-item overrides when advancing (they were for previous round)
    gs.priceOverrides = new Map();
    await gs.save();

    const stocks = buildMarketResponse(marketData.stocks, gs.currentRound, gs);
    const commodities = buildMarketResponse(marketData.commodities, gs.currentRound, gs);

    res.json({
      message: `News round ${gs.currentRound} released!`,
      currentRound: gs.currentRound,
      totalRounds: 4,
      stocks,
      commodities,
      frozenItems: gs.frozenItems || [],
      activeEvent: gs.activeEvent,
      eventRound: gs.eventRound || 0,
    });
  } catch (err) {
    console.error("POST /market/next-news error:", err);
    res.status(500).json({ message: "Failed to advance news round" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/reset — reset game to round 0 (admin only)
// ═══════════════════════════════════════════════════════════
router.post("/reset", authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    await GameState.findOneAndUpdate(
      { key: "main" },
      {
        currentRound: 0,
        frozenItems: [],
        priceOverrides: {},
        activeEvent: null,
        eventRound: 0,
        marketFrozen: false,
        marketFreezeUntil: null,
      },
      { upsert: true }
    );

    await Portfolio.deleteMany({});

    res.json({ message: "Market reset to round 0. All portfolios and admin overrides cleared." });
  } catch (err) {
    console.error("POST /market/reset error:", err);
    res.status(500).json({ message: "Failed to reset market" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/freeze — freeze/unfreeze a stock (admin only)
// Body: { itemId, freeze: true/false }
// ═══════════════════════════════════════════════════════════
router.post("/freeze", authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ message: "Admin access required" });

    const { itemId, freeze } = req.body;
    if (!itemId) return res.status(400).json({ message: "itemId required" });

    const allItems = [...marketData.stocks, ...marketData.commodities];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const gs = await getGameState();
    if (freeze) {
      if (!gs.frozenItems.includes(itemId)) {
        gs.frozenItems.push(itemId);
      }
    } else {
      gs.frozenItems = gs.frozenItems.filter((id) => id !== itemId);
    }
    await gs.save();

    res.json({
      message: `${item.symbol} ${freeze ? "frozen" : "unfrozen"} successfully`,
      frozenItems: gs.frozenItems,
    });
  } catch (err) {
    console.error("POST /market/freeze error:", err);
    res.status(500).json({ message: "Failed to update freeze status" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/adjust — adjust % for a specific item (admin only)
// Body: { itemId, adjustPercent: number }
// ═══════════════════════════════════════════════════════════
router.post("/adjust", authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ message: "Admin access required" });

    const { itemId, adjustPercent } = req.body;
    if (!itemId || adjustPercent === undefined) {
      return res.status(400).json({ message: "itemId and adjustPercent required" });
    }

    const allItems = [...marketData.stocks, ...marketData.commodities];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const gs = await getGameState();
    if (gs.currentRound === 0) {
      return res.status(400).json({ message: "Cannot adjust prices before first news round" });
    }

    gs.priceOverrides.set(itemId, Number(adjustPercent));
    await gs.save();

    const newPrice = getCurrentPrice(item, gs.currentRound, gs);

    res.json({
      message: `${item.symbol} adjusted by ${adjustPercent > 0 ? "+" : ""}${adjustPercent}%. New price: ${newPrice} CC`,
      itemId,
      newPrice,
      adjustPercent,
    });
  } catch (err) {
    console.error("POST /market/adjust error:", err);
    res.status(500).json({ message: "Failed to adjust price" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/event — trigger a market event (admin only)
// Body: { event: "crash" | "recovery" | "boom" | null }
// ═══════════════════════════════════════════════════════════
router.post("/event", authMiddleware, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ message: "Admin access required" });

    const { event } = req.body;
    const validEvents = [null, "crash", "recovery", "boom"];
    if (!validEvents.includes(event)) {
      return res.status(400).json({ message: "Invalid event. Use: crash, recovery, boom, or null to clear" });
    }

    const gs = await getGameState();
    if (gs.currentRound === 0 && event) {
      return res.status(400).json({ message: "Cannot trigger events before first news round" });
    }

    gs.activeEvent = event;
    gs.eventRound = event ? gs.currentRound : 0;
    await gs.save();

    const effectDesc = event
      ? `${event.toUpperCase()} event triggered! (${EVENT_MODIFIERS[event] > 0 ? "+" : ""}${EVENT_MODIFIERS[event]}% to all items in round ${gs.currentRound})`
      : "Market event cleared";

    res.json({
      message: effectDesc,
      activeEvent: gs.activeEvent,
      eventRound: gs.eventRound,
    });
  } catch (err) {
    console.error("POST /market/event error:", err);
    res.status(500).json({ message: "Failed to trigger event" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/freeze-market — freeze entire market temporarily
// Body: { durationMinutes } (0 to unfreeze immediately)
// ═══════════════════════════════════════════════════════════
router.post("/freeze-market", authMiddleware, async (req, res) => {
  try {
    // Admin only
    const user = await User.findById(req.userId);
    if (user.username !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { durationMinutes } = req.body;
    const duration = parseInt(durationMinutes);
    
    if (duration === undefined || duration === null || isNaN(duration) || duration < 0) {
      return res.status(400).json({ message: "Valid durationMinutes required (0 to unfreeze)" });
    }

    const gs = await GameState.findOne();
    if (!gs) {
      return res.status(500).json({ message: "GameState not found" });
    }

    if (duration === 0) {
      // Unfreeze immediately
      gs.marketFrozen = false;
      gs.marketFreezeUntil = null;
      await gs.save();
      return res.json({ 
        message: "Market unfrozen successfully",
        marketFrozen: false,
        marketFreezeUntil: null
      });
    }

    // Freeze for specified duration
    gs.marketFrozen = true;
    gs.marketFreezeUntil = new Date(Date.now() + duration * 60 * 1000);
    await gs.save();

    res.json({
      message: `Market frozen for ${duration} minute(s)`,
      marketFrozen: true,
      marketFreezeUntil: gs.marketFreezeUntil
    });
  } catch (err) {
    console.error("POST /market/freeze-market error:", err);
    res.status(500).json({ message: "Failed to freeze market" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/buy — buy a stock or commodity
// Body: { itemId, quantity }
// ═══════════════════════════════════════════════════════════
router.post("/buy", authMiddleware, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const qty = parseInt(quantity);
    if (!itemId || !qty || qty < 1) {
      return res.status(400).json({ message: "itemId and positive quantity required" });
    }

    const allItems = [...marketData.stocks, ...marketData.commodities];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const gs = await getGameState();

    // Check if market freeze has expired
    if (gs.marketFrozen && gs.marketFreezeUntil && new Date() > gs.marketFreezeUntil) {
      gs.marketFrozen = false;
      gs.marketFreezeUntil = null;
      await gs.save();
    }

    // Check if entire market is frozen
    if (gs.marketFrozen) {
      return res.status(400).json({ message: "Market is currently frozen by admin. Trading is temporarily disabled." });
    }

    // Check if item is frozen
    if (gs.frozenItems && gs.frozenItems.includes(itemId)) {
      return res.status(400).json({ message: `${item.symbol} is frozen and cannot be traded` });
    }

    const currentPrice = getCurrentPrice(item, gs.currentRound, gs);
    const totalCost = currentPrice * qty;

    const team = await Team.findById(req.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.balance < totalCost) {
      return res.status(400).json({ message: `Insufficient credits. Need ${totalCost.toFixed(2)} CC, have ${team.balance.toFixed(2)} CC` });
    }

    team.balance = Math.round((team.balance - totalCost) * 100) / 100;
    await team.save();

    let portfolio = await Portfolio.findOne({ teamId: req.teamId });
    if (!portfolio) {
      portfolio = new Portfolio({ teamId: req.teamId, holdings: [] });
    }

    portfolio.holdings.push({
      itemId: item.id,
      itemName: item.name,
      itemSymbol: item.symbol,
      itemType: item.type,
      quantity: qty,
      buyPrice: currentPrice,
      buyRound: gs.currentRound,
    });

    await portfolio.save();

    res.json({
      message: `Bought ${qty}x ${item.symbol} at ${currentPrice.toFixed(2)} CC each. Total: ${totalCost.toFixed(2)} CC`,
      newBalance: team.balance,
      holding: {
        itemId: item.id,
        symbol: item.symbol,
        quantity: qty,
        buyPrice: currentPrice,
      },
    });
  } catch (err) {
    console.error("POST /market/buy error:", err);
    res.status(500).json({ message: "Failed to buy" });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/market/sell — sell holdings
// Body: { itemId, quantity }
// ═══════════════════════════════════════════════════════════
router.post("/sell", authMiddleware, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const qty = parseInt(quantity);
    if (!itemId || !qty || qty < 1) {
      return res.status(400).json({ message: "itemId and positive quantity required" });
    }

    const allItems = [...marketData.stocks, ...marketData.commodities];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const gs = await getGameState();

    // Check if market freeze has expired
    if (gs.marketFrozen && gs.marketFreezeUntil && new Date() > gs.marketFreezeUntil) {
      gs.marketFrozen = false;
      gs.marketFreezeUntil = null;
      await gs.save();
    }

    // Check if entire market is frozen
    if (gs.marketFrozen) {
      return res.status(400).json({ message: "Market is currently frozen by admin. Trading is temporarily disabled." });
    }

    // Check if item is frozen
    if (gs.frozenItems && gs.frozenItems.includes(itemId)) {
      return res.status(400).json({ message: `${item.symbol} is frozen and cannot be traded` });
    }

    const currentPrice = getCurrentPrice(item, gs.currentRound, gs);

    const portfolio = await Portfolio.findOne({ teamId: req.teamId });
    if (!portfolio) return res.status(400).json({ message: "No portfolio found" });

    const itemHoldings = portfolio.holdings.filter((h) => h.itemId === itemId);
    const totalOwned = itemHoldings.reduce((sum, h) => sum + h.quantity, 0);
    if (totalOwned < qty) {
      return res.status(400).json({ message: `Cannot sell ${qty}. You only own ${totalOwned}` });
    }

    // FIFO sell
    let remaining = qty;
    for (let i = 0; i < portfolio.holdings.length && remaining > 0; i++) {
      const h = portfolio.holdings[i];
      if (h.itemId !== itemId) continue;
      if (h.quantity <= remaining) {
        remaining -= h.quantity;
        h.quantity = 0;
      } else {
        h.quantity -= remaining;
        remaining = 0;
      }
    }

    portfolio.holdings = portfolio.holdings.filter((h) => h.quantity > 0);
    await portfolio.save();

    const revenue = currentPrice * qty;
    const team = await Team.findById(req.teamId);
    team.balance = Math.round((team.balance + revenue) * 100) / 100;
    await team.save();

    res.json({
      message: `Sold ${qty}x ${item.symbol} at ${currentPrice.toFixed(2)} CC each. Revenue: ${revenue.toFixed(2)} CC`,
      newBalance: team.balance,
    });
  } catch (err) {
    console.error("POST /market/sell error:", err);
    res.status(500).json({ message: "Failed to sell" });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/market/portfolio — get current team's portfolio
// ═══════════════════════════════════════════════════════════
router.get("/portfolio", authMiddleware, async (req, res) => {
  try {
    const gs = await getGameState();
    const allItems = [...marketData.stocks, ...marketData.commodities];

    const portfolio = await Portfolio.findOne({ teamId: req.teamId });
    if (!portfolio || portfolio.holdings.length === 0) {
      return res.json({ holdings: [], summary: { totalInvested: 0, currentValue: 0, totalPnL: 0 } });
    }

    const aggregated = {};
    for (const h of portfolio.holdings) {
      if (!aggregated[h.itemId]) {
        aggregated[h.itemId] = {
          itemId: h.itemId,
          itemName: h.itemName,
          itemSymbol: h.itemSymbol,
          itemType: h.itemType,
          totalQty: 0,
          totalCost: 0,
        };
      }
      aggregated[h.itemId].totalQty += h.quantity;
      aggregated[h.itemId].totalCost += h.buyPrice * h.quantity;
    }

    const holdings = Object.values(aggregated).map((a) => {
      const item = allItems.find((i) => i.id === a.itemId);
      const currentPrice = item ? getCurrentPrice(item, gs.currentRound, gs) : 0;
      const avgBuyPrice = a.totalCost / a.totalQty;
      const currentValue = currentPrice * a.totalQty;
      const pnl = currentValue - a.totalCost;
      const pnlPercent = a.totalCost > 0 ? ((pnl / a.totalCost) * 100) : 0;

      return {
        itemId: a.itemId,
        name: a.itemName,
        symbol: a.itemSymbol,
        type: a.itemType,
        quantity: a.totalQty,
        avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
        currentPrice,
        invested: Math.round(a.totalCost * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
      };
    });

    const summary = {
      totalInvested: holdings.reduce((s, h) => s + h.invested, 0),
      currentValue: holdings.reduce((s, h) => s + h.currentValue, 0),
      totalPnL: holdings.reduce((s, h) => s + h.pnl, 0),
    };

    res.json({ holdings, summary });
  } catch (err) {
    console.error("GET /market/portfolio error:", err);
    res.status(500).json({ message: "Failed to fetch portfolio" });
  }
});

module.exports = router;
