// ──────────────────────────────────────────────────────────
// News-Based Market Data: 13 Stocks + 5 Commodities
// All items start at 100 CC (uniform initial price)
// Each round has a percentage change (not absolute price)
// Built-in fluctuation: some up→down, some down→up, recovery patterns
// Fairness: no stock grows > +20% without correction next round
// Strategy: top gainers get headwinds, losers get recovery
// ──────────────────────────────────────────────────────────

const marketData = {
  stocks: [
    {
      id: "s1",
      name: "Reliance Industries",
      symbol: "RELIANCE",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Reliance Jio launches 5G in 50 new cities; subscriber base crosses 500M", percentChange: 8 },
        { news: "Reliance refinery output drops 8% due to maintenance shutdown", percentChange: -12 },
        { news: "Reliance Retail partners with global luxury brands for India expansion", percentChange: 6 },
        { news: "Government imposes windfall tax on fuel exports; Reliance margins hit", percentChange: -9 },
      ],
    },
    {
      id: "s2",
      name: "HDFC Bank",
      symbol: "HDFCBANK",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "HDFC Bank reports 20% rise in Q3 net profit; NPA improves", percentChange: 10 },
        { news: "RBI flags concerns over HDFC Bank's digital outage frequency", percentChange: -7 },
        { news: "HDFC Bank expands rural branches to 10,000; financial inclusion drive", percentChange: 9 },
        { news: "Global recession fears hit banking stocks; HDFC Bank under pressure", percentChange: -14 },
      ],
    },
    {
      id: "s3",
      name: "Hindustan Unilever (HUL)",
      symbol: "HUL",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "HUL launches eco-friendly product range; ESG ratings upgraded", percentChange: 5 },
        { news: "Raw material costs surge for HUL; palm oil prices at record high", percentChange: -10 },
        { news: "HUL acquires D2C skincare brand for ₹3,000 crore", percentChange: 7 },
        { news: "Rural demand slows for FMCG; HUL Q4 volume growth weakens", percentChange: -6 },
      ],
    },
    {
      id: "s4",
      name: "ITC",
      symbol: "ITC",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "ITC's hotel division files for demerger; unlocks value for investors", percentChange: 15 },
        { news: "Government hikes cigarette excise duty by 15% in Union Budget", percentChange: -18 },
        { news: "ITC FMCG business turns profitable for the first time", percentChange: 12 },
        { news: "Tobacco regulation tightens globally; ITC faces ESG downgrade", percentChange: -11 },
      ],
    },
    {
      id: "s5",
      name: "Bharti Airtel",
      symbol: "AIRTEL",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Airtel raises tariffs by 15%; ARPU expected to jump significantly", percentChange: 11 },
        { news: "Airtel Africa reports losses; currency devaluation hits revenue", percentChange: -8 },
        { news: "Airtel wins major 5G spectrum in government auction at lower price", percentChange: 7 },
        { news: "TRAI proposes lower interconnect charges; Airtel margins may shrink", percentChange: -13 },
      ],
    },
    {
      id: "s6",
      name: "ICICI Bank",
      symbol: "ICICIBANK",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "ICICI Bank digital loans cross ₹1 lakh crore; fintech integration grows", percentChange: 9 },
        { news: "ICICI Bank faces ₹500 crore penalty for KYC lapses from RBI", percentChange: -11 },
        { news: "ICICI Prudential Life Insurance IPO boosts group valuation", percentChange: 8 },
        { news: "Rising NPAs in SME segment worry ICICI Bank investors", percentChange: -7 },
      ],
    },
    {
      id: "s7",
      name: "State Bank of India (SBI)",
      symbol: "SBI",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "SBI posts record annual profit of ₹65,000 crore; dividend declared", percentChange: 13 },
        { news: "Government plans to sell 5% stake in SBI; dilution concerns rise", percentChange: -15 },
        { news: "SBI launches green bonds worth $1B for renewable energy financing", percentChange: 10 },
        { news: "Bad loan fears return as Adani Group exposure rattles SBI investors", percentChange: -8 },
      ],
    },
    {
      id: "s8",
      name: "Sun Pharma",
      symbol: "SUNPHARMA",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Sun Pharma gets US FDA approval for high-revenue cancer drug", percentChange: 14 },
        { news: "Sun Pharma recalls batches of blood pressure medication in the US", percentChange: -10 },
        { news: "Sun Pharma signs ₹6,000 crore licensing deal with Japanese pharma giant", percentChange: 11 },
        { news: "Price controls on essential medicines tightened; Sun Pharma revenue at risk", percentChange: -16 },
      ],
    },
    {
      id: "s9",
      name: "Mahindra & Mahindra (M&M)",
      symbol: "M&M",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "M&M EV sales surge 60% YoY; new electric SUV bookings cross 100K", percentChange: 12 },
        { news: "M&M tractor sales decline due to poor monsoon forecast", percentChange: -9 },
        { news: "M&M wins contract to supply EVs to Indian Army fleet", percentChange: 8 },
        { news: "Steel price hike raises production cost for M&M's auto division", percentChange: -11 },
      ],
    },
    {
      id: "s10",
      name: "Asian Paints",
      symbol: "ASIANPAINT",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Asian Paints launches AI-powered home decor platform; consumer buzz grows", percentChange: 6 },
        { news: "TiO2 prices spike globally; Asian Paints raw material cost rises 12%", percentChange: -14 },
        { news: "Asian Paints expands into Middle East market with new factory in UAE", percentChange: 10 },
        { news: "Slowdown in real estate construction drags paint demand in India", percentChange: -5 },
      ],
    },
    {
      id: "s11",
      name: "Titan Company",
      symbol: "TITAN",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Titan's Tanishq brand sees record Diwali sales; gold demand booms", percentChange: 7 },
        { news: "Titan's CaratLane acquisition faces integration issues and cost overruns", percentChange: -8 },
        { news: "Titan enters premium international watch market; partners with Swiss brand", percentChange: 9 },
        { news: "Gold import duty hike to 18% may impact Titan's jewellery margins", percentChange: -12 },
      ],
    },
    {
      id: "s12",
      name: "Adani Ports",
      symbol: "ADANIPORTS",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "Adani Ports wins Colombo port terminal contract; global expansion continues", percentChange: 16 },
        { news: "Hindenburg 2.0 report raises fresh governance questions on Adani Group", percentChange: -20 },
        { news: "Adani Ports cargo volumes hit all-time high in March; revenue jumps 25%", percentChange: 14 },
        { news: "Credit Suisse downgrades Adani Ports citing high debt levels", percentChange: -17 },
      ],
    },
    {
      id: "s13",
      name: "UltraTech Cement",
      symbol: "ULTRATECH",
      type: "stock",
      basePrice: 100,
      newsRounds: [
        { news: "UltraTech acquires regional cement firm; capacity crosses 150 MTPA", percentChange: 10 },
        { news: "Cement prices fall 5% amid oversupply in southern India", percentChange: -6 },
        { news: "Government approves mega infra projects worth ₹5 lakh crore; cement demand rises", percentChange: 13 },
        { news: "Energy costs spike for cement makers; coal prices at 6-month high", percentChange: -15 },
      ],
    },
  ],
  commodities: [
    {
      id: "c1",
      name: "Crude Oil",
      symbol: "CRUDEOIL",
      type: "commodity",
      basePrice: 100,
      newsRounds: [
        { news: "OPEC+ announces surprise production cuts; oil supply tightens globally", percentChange: 12 },
        { news: "US releases 50M barrels from Strategic Petroleum Reserve to cool prices", percentChange: -8 },
        { news: "Middle East tensions escalate; Strait of Hormuz shipping disrupted", percentChange: 18 },
        { news: "Global EV adoption accelerates; long-term oil demand outlook weakens", percentChange: -15 },
      ],
    },
    {
      id: "c2",
      name: "Gold",
      symbol: "GOLD",
      type: "commodity",
      basePrice: 100,
      newsRounds: [
        { news: "Central banks globally increase gold reserves; demand at 10-year high", percentChange: 7 },
        { news: "US Fed signals rate hike; dollar strengthens, gold dips", percentChange: -5 },
        { news: "Geopolitical crisis in Europe drives safe-haven buying; gold surges", percentChange: 11 },
        { news: "India reduces gold import duty; retail prices drop, investment demand cools", percentChange: -9 },
      ],
    },
    {
      id: "c3",
      name: "Natural Gas",
      symbol: "NATURALGAS",
      type: "commodity",
      basePrice: 100,
      newsRounds: [
        { news: "Cold wave across Europe spikes natural gas demand; prices rally", percentChange: 20 },
        { news: "US shale gas production reaches record highs; supply surplus expected", percentChange: -16 },
        { news: "Russia-Ukraine gas pipeline negotiations collapse; supply fears return", percentChange: 15 },
        { news: "Mild winter forecast in Northern Hemisphere eases demand pressure", percentChange: -12 },
      ],
    },
    {
      id: "c4",
      name: "Silver",
      symbol: "SILVER",
      type: "commodity",
      basePrice: 100,
      newsRounds: [
        { news: "Solar panel manufacturing boom drives industrial silver demand higher", percentChange: 9 },
        { news: "Silver mine output from Mexico increases 10%; supply pressure builds", percentChange: -7 },
        { news: "Silver ETF inflows surge as investors hedge against inflation", percentChange: 12 },
        { news: "Strong US dollar and rising bond yields weigh on precious metals", percentChange: -10 },
      ],
    },
    {
      id: "c5",
      name: "Copper",
      symbol: "COPPER",
      type: "commodity",
      basePrice: 100,
      newsRounds: [
        { news: "China stimulus package boosts construction; copper demand jumps", percentChange: 8 },
        { news: "Chile's largest copper mine faces strike; global supply stalls", percentChange: 11 },
        { news: "EV battery makers shift to aluminium alternatives; copper demand outlook mixed", percentChange: -13 },
        { news: "Global recession fears intensify; industrial metals sell off broadly", percentChange: -10 },
      ],
    },
  ],
};

module.exports = marketData;
