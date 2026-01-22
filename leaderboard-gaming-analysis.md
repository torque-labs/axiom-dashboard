# Leaderboard Gaming Analysis Report

**Date:** January 21, 2026
**Analysis Period:** January 19-25, 2026
**Analyst:** Torque Analytics Team

---

## Executive Summary

Analysis of the top 10 leaderboard winners revealed a coordinated sniping ring responsible for approximately **$56,000 in inflated PNL** (45% of top 10 total). We tested 5 holding time scenarios and recommend implementing a **30-minute minimum hold requirement** to remove gaming while preserving legitimate trader rankings.

---

## Key Findings

### 1. Coordinated Wallet Ring Identified

| Wallet | Current Rank | Current PNL | Coordination Evidence |
|--------|--------------|-------------|----------------------|
| CyaE1Vxv... | #1 | $37,910 | Connected to 2 other top-10 wallets |
| 5CWn9gFt... | #7 | $9,793 | 11 shared tokens with CyaE within 5 min |
| TimeAdRp... | #9 | $8,592 | 4 shared tokens with CyaE within 5 min |

**Evidence:**
- CyaE1Vxv and 5CWn9gFt traded **11 different tokens within 5 minutes of each other**
- Both wallets show 99% of PNL from trades with holding periods under 15 minutes
- Classic sniper pattern: buy → sell within seconds to minutes

### 2. PNL Concentration on Few Tokens

Multiple top-10 winners made significant PNL on the same tokens:

| Token | # of Top-10 Winners | Combined PNL |
|-------|---------------------|--------------|
| 5dxdLpp7... | 7 winners | ~$50,000 |
| HANRi4rB... | 3 winners | ~$22,500 |

### 3. Suspicious Trading Patterns

**Example: HANRi4r token trading (1.2 hour window)**
- 4NtyFqqR bought at 03:27, sold at 03:57-04:02
- TimeAdRp bought at 03:50 (22 sec after 4NtyFqqR), sold at 04:01-04:38
- Trades interleaved with sub-second timing

---

## Scenario Analysis

We tested 5 holding time requirements and measured their impact on the leaderboard:

### Scenario Comparison Table

| Wallet | Current (0 min) | 15 min | 30 min | 60 min | 120 min | Assessment |
|--------|-----------------|--------|--------|--------|---------|------------|
| CyaE1Vxv | #1 ($37,910) | $6,549 | $6,332 | $842 | $842 | 🚨 SNIPER |
| 6pkPgzD8 | #2 ($18,735) | $19,327 | $19,590 | $19,590 | $19,590 | ✅ Stable |
| CA4keXLt | #3 ($14,151) | $11,994 | $11,994 | $11,994 | $11,994 | ✅ Stable |
| 4NtyFqqR | #4 ($11,568) | $11,197 | $11,197 | -$1,036 | $0 | ⚠️ 60min collapses |
| ExggwHcH | #5 ($10,356) | $10,356 | $10,356 | $10,356 | $9,882 | ✅ Stable |
| HYSq1KBA | #6 ($10,158) | $10,807 | $10,807 | $10,807 | $10,807 | ✅ Stable |
| 5CWn9gFt | #7 ($9,793) | $134 | $134 | $134 | $0 | 🚨 SNIPER |
| BTZJRdcc | #8 ($9,493) | $9,316 | $9,316 | $9,316 | $9,384 | ✅ Stable |
| TimeAdRp | #9 ($8,592) | $11,716 | $11,716 | $35 | $35 | ⚠️ 60min collapses |
| 4QodqLUi | #10 ($7,894) | $7,985 | $7,985 | $7,985 | $7,985 | ✅ Stable |
| JCLqyRAz | #11 ($7,138) | $75 | $75 | $0 | $0 | 🚨 SNIPER |

### Scenario Details

#### Option A: 15-Minute Hold
- **Removes:** CyaE1Vxv, 5CWn9gFt, JCLqyRAz
- **Risk:** May leave some sophisticated snipers in place
- **Recommendation:** Too lenient

#### Option B: 30-Minute Hold ⭐ RECOMMENDED
- **Removes:** CyaE1Vxv, 5CWn9gFt, JCLqyRAz (same as 15 min)
- **Preserves:** All legitimate traders
- **Recommendation:** Best balance of protection and fairness

#### Option C: 60-Minute Hold
- **Removes:** Additional collapses for 4NtyFqqR and TimeAdRp
- **Risk:** May penalize legitimate active traders
- **Recommendation:** Too aggressive

#### Option D: 120-Minute Hold
- **Removes:** Multiple additional traders
- **Risk:** Significantly restricts participation
- **Recommendation:** Not recommended

---

## Recommended Implementation: 30-Minute Hold

### New Top 10 Leaderboard (with 30-min hold)

| New Rank | Wallet | New PNL | Previous Rank | Change |
|----------|--------|---------|---------------|--------|
| 1 | 6pkPgzD8... | $19,590 | #2 | ⬆️ +1 |
| 2 | CA4keXLt... | $11,994 | #3 | ⬆️ +1 |
| 3 | TimeAdRp... | $11,716 | #9 | ⬆️ +6 |
| 4 | 4NtyFqqR... | $11,197 | #4 | — |
| 5 | HYSq1KBA... | $10,807 | #6 | ⬆️ +1 |
| 6 | ExggwHcH... | $10,356 | #5 | ⬇️ -1 |
| 7 | BTZJRdcc... | $9,316 | #8 | ⬆️ +1 |
| 8 | 4QodqLUi... | $7,985 | #10 | ⬆️ +2 |
| 9 | 5B79fMkc... | $6,970 | #14 | 🆕 |
| 10 | 8pKVAVuG... | $6,745 | #13 | 🆕 |

### Wallets Removed from Top 10

| Wallet | Previous Rank | Previous PNL | New Rank | New PNL | Reason |
|--------|---------------|--------------|----------|---------|--------|
| CyaE1Vxv... | #1 | $37,910 | #12 | $6,332 | 83% PNL from <15 min trades |
| 5CWn9gFt... | #7 | $9,793 | #36 | $134 | 99% PNL from <15 min trades |

---

## Modified Query (30-Minute Hold Requirement)

```sql
WITH base AS (
  SELECT
    "tokenIn",
    "tokenOut",
    "feePayer",
    "uiAmountIn",
    "uiAmountOut",
    "receivedAt",
    CASE
      WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN 'BUY'
      ELSE 'SELL'
    END AS direction,
    CASE
      WHEN "tokenIn" != 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "tokenIn"
      ELSE "tokenOut"
    END AS token,
    CASE
      WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
        THEN NULLIF("uiAmountIn", 0) / NULLIF("uiAmountOut", 0)
      WHEN "tokenOut" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
        THEN NULLIF("uiAmountOut", 0) / NULLIF("uiAmountIn", 0)
      ELSE 0
    END AS trade_price
  FROM axiomtrade_partitioned ap
  WHERE ap."receivedAt" BETWEEN '2026-01-19T00:01:00Z' AND '2026-01-25T00:00:00Z'
),
token_volume AS (
  SELECT
    token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) AS total_usd_volume
  FROM base
  GROUP BY token
),
eligible_tokens AS (
  SELECT token
  FROM token_volume
  WHERE total_usd_volume >= 1000
),
base_filtered AS (
  SELECT b.*
  FROM base b
  INNER JOIN eligible_tokens et ON b.token = et.token
),
-- NEW: Calculate trading window per trader per token
trader_windows AS (
  SELECT
    token,
    "feePayer",
    EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 AS window_minutes
  FROM base_filtered
  GROUP BY token, "feePayer"
),
-- NEW: Only include positions where trader held 30+ minutes
eligible_positions AS (
  SELECT token, "feePayer"
  FROM trader_windows
  WHERE window_minutes >= 30
),
last_trade_vwap AS (
  SELECT
    token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) /
    NULLIF(SUM(CASE WHEN direction = 'BUY' THEN "uiAmountOut" ELSE "uiAmountIn" END), 0) AS last_price
  FROM base_filtered
  WHERE "receivedAt" >= '2026-01-13T00:00:00Z'::timestamp - INTERVAL '4 hours'
  GROUP BY token
),
last_trade_fallback AS (
  SELECT DISTINCT ON (token)
    token,
    trade_price AS last_price
  FROM base_filtered
  ORDER BY token, "receivedAt" DESC
),
last_price AS (
  SELECT
    ltf.token,
    COALESCE(ltv.last_price, ltf.last_price) AS last_price
  FROM last_trade_fallback ltf
  LEFT JOIN last_trade_vwap ltv ON ltv.token = ltf.token
),
aggregated AS (
  SELECT
    b.token,
    b."feePayer",
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountIn" ELSE 0 END) AS sum_token_in,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountOut" ELSE 0 END) AS sum_token_out,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountIn" ELSE 0 END) AS sum_usd1_in,
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountOut" ELSE 0 END) AS sum_usd1_out,
    MAX(lp.last_price) AS last_traded_unit_price
  FROM base_filtered b
  -- NEW: Filter to only eligible positions (30+ min hold)
  INNER JOIN eligible_positions ep ON b.token = ep.token AND b."feePayer" = ep."feePayer"
  LEFT JOIN last_price lp ON b.token = lp.token
  GROUP BY b.token, b."feePayer"
),
with_vwap AS (
  SELECT
    *,
    sum_usd1_in + sum_usd1_out AS trader_volume,
    CASE WHEN sum_token_out > 0 THEN sum_usd1_in / sum_token_out ELSE 0 END AS vwap_buy_price,
    CASE WHEN sum_token_in > 0 THEN sum_usd1_out / sum_token_in ELSE 0 END AS vwap_sell_price
  FROM aggregated
),
with_pnl AS (
  SELECT
    token,
    "feePayer",
    trader_volume,
    LEAST(sum_token_in, sum_token_out) * (vwap_sell_price - vwap_buy_price) AS realized_pnl,
    CASE
      WHEN sum_token_out > sum_token_in
           AND (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price) < 0
        THEN (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price)
      ELSE 0
    END AS unrealized_losses
  FROM with_vwap
)
SELECT
  "feePayer",
  ROUND((SUM(realized_pnl) + SUM(unrealized_losses))::numeric, 2) AS total_pnl
FROM with_pnl
GROUP BY "feePayer"
ORDER BY total_pnl DESC;
```

---

## Alternative Countermeasures & Combinations

We tested additional countermeasures beyond holding time to evaluate layered approaches.

### Countermeasure Options Tested

| Option | Description | Purpose |
|--------|-------------|---------|
| **Min Unique Traders** | Require N distinct traders per token | Prevents low-participation token manipulation |
| **Higher USD Volume** | Increase min token volume from $1k | Filters out illiquid tokens |
| **Volume Cap** | Cap trader's % of token volume | Prevents single-trader dominance |

### Combination Analysis Results

#### Impact on Top Traders (with 30-min hold baseline)

| Wallet | 30min Only | +10 Traders | +15 Traders | +20 Traders | +$5k Vol | +$10k Vol |
|--------|------------|-------------|-------------|-------------|----------|-----------|
| 6pkPgzD8 | $19,590 | $19,590 | $19,590 | $19,590 | $19,590 | $19,590 |
| CA4keXLt | $11,751 | $11,751 | $11,751 | **$1,803** | $11,751 | $11,751 |
| TimeAdRp | $11,566 | $11,566 | $11,566 | $11,566 | $11,566 | $11,566 |
| 4NtyFqqR | $11,197 | $11,197 | $11,197 | $11,197 | $11,197 | $11,197 |
| HYSq1KBA | $10,807 | $10,807 | $10,807 | $10,807 | $10,807 | $10,807 |
| ExggwHcH | $10,356 | $10,356 | $10,356 | $10,356 | $10,356 | $10,316 |

#### Key Findings

1. **30-min hold does the heavy lifting** - Most snipers already filtered out
2. **Unique trader thresholds (10-15)** - Minimal additional impact
3. **20+ unique traders** - Catches CA4keXLt (drops from $11.7k to $1.8k)
4. **Higher volume thresholds** - Minimal impact, tokens being gamed already have volume

### Scenario Recommendations

| Scenario | Rules | Best For | Trade-off |
|----------|-------|----------|-----------|
| **A: Conservative** | 30 min hold only | Minimal disruption | May miss some edge cases |
| **B: Balanced** ⭐ | 30 min + 10 unique traders | Good protection, low false positives | Slightly more complex |
| **C: Aggressive** | 30 min + 20 unique traders | Maximum protection | May penalize legitimate niche traders |

### Recommended: Scenario B (30 min + 10 unique traders)

This combination:
- Removes all identified snipers (CyaE1Vxv, 5CWn9gFt, JCLqyRAz)
- Adds defense against future low-participation token gaming
- Has negligible impact on legitimate traders
- Easy to explain to participants

---

## Appendix A: Wallet Clustering Evidence

Wallets trading the same tokens within 5 minutes of each other:

| Wallet Pair | Shared Tokens (5 min window) |
|-------------|------------------------------|
| CyaE1Vxv + 5CWn9gFt | **11 tokens** |
| CyaE1Vxv + TimeAdRp | **4 tokens** |
| ExggwHcH + HYSq1KBA | **2 tokens** |

---

## Appendix B: Alternative Query (30 min + 10 Unique Traders)

If choosing Scenario B, use this modified query:

```sql
WITH base AS (
  SELECT
    "tokenIn", "tokenOut", "feePayer", "uiAmountIn", "uiAmountOut", "receivedAt",
    CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN 'BUY' ELSE 'SELL' END AS direction,
    CASE WHEN "tokenIn" != 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "tokenIn" ELSE "tokenOut" END AS token,
    CASE
      WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
        THEN NULLIF("uiAmountIn", 0) / NULLIF("uiAmountOut", 0)
      WHEN "tokenOut" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
        THEN NULLIF("uiAmountOut", 0) / NULLIF("uiAmountIn", 0)
      ELSE 0
    END AS trade_price
  FROM axiomtrade_partitioned ap
  WHERE ap."receivedAt" BETWEEN '2026-01-19T00:01:00Z' AND '2026-01-25T00:00:00Z'
),
token_stats AS (
  SELECT
    token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) AS total_usd_volume,
    COUNT(DISTINCT "feePayer") AS unique_traders
  FROM base
  GROUP BY token
),
-- FILTER: $1k min volume AND 10+ unique traders
eligible_tokens AS (
  SELECT token
  FROM token_stats
  WHERE total_usd_volume >= 1000 AND unique_traders >= 10
),
base_filtered AS (
  SELECT b.*
  FROM base b
  INNER JOIN eligible_tokens et ON b.token = et.token
),
-- FILTER: 30+ minute holding period
trader_windows AS (
  SELECT token, "feePayer",
    EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 AS window_minutes
  FROM base_filtered
  GROUP BY token, "feePayer"
),
eligible_positions AS (
  SELECT token, "feePayer"
  FROM trader_windows
  WHERE window_minutes >= 30
),
last_trade_vwap AS (
  SELECT token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) /
    NULLIF(SUM(CASE WHEN direction = 'BUY' THEN "uiAmountOut" ELSE "uiAmountIn" END), 0) AS last_price
  FROM base_filtered
  WHERE "receivedAt" >= '2026-01-13T00:00:00Z'::timestamp - INTERVAL '4 hours'
  GROUP BY token
),
last_trade_fallback AS (
  SELECT DISTINCT ON (token) token, trade_price AS last_price
  FROM base_filtered
  ORDER BY token, "receivedAt" DESC
),
last_price AS (
  SELECT ltf.token, COALESCE(ltv.last_price, ltf.last_price) AS last_price
  FROM last_trade_fallback ltf
  LEFT JOIN last_trade_vwap ltv ON ltv.token = ltf.token
),
aggregated AS (
  SELECT
    b.token, b."feePayer",
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountIn" ELSE 0 END) AS sum_token_in,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountOut" ELSE 0 END) AS sum_token_out,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountIn" ELSE 0 END) AS sum_usd1_in,
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountOut" ELSE 0 END) AS sum_usd1_out,
    MAX(lp.last_price) AS last_traded_unit_price
  FROM base_filtered b
  INNER JOIN eligible_positions ep ON b.token = ep.token AND b."feePayer" = ep."feePayer"
  LEFT JOIN last_price lp ON b.token = lp.token
  GROUP BY b.token, b."feePayer"
),
with_vwap AS (
  SELECT *,
    sum_usd1_in + sum_usd1_out AS trader_volume,
    CASE WHEN sum_token_out > 0 THEN sum_usd1_in / sum_token_out ELSE 0 END AS vwap_buy_price,
    CASE WHEN sum_token_in > 0 THEN sum_usd1_out / sum_token_in ELSE 0 END AS vwap_sell_price
  FROM aggregated
),
with_pnl AS (
  SELECT token, "feePayer", trader_volume,
    LEAST(sum_token_in, sum_token_out) * (vwap_sell_price - vwap_buy_price) AS realized_pnl,
    CASE
      WHEN sum_token_out > sum_token_in
           AND (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price) < 0
        THEN (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price)
      ELSE 0
    END AS unrealized_losses
  FROM with_vwap
)
SELECT
  "feePayer",
  ROUND((SUM(realized_pnl) + SUM(unrealized_losses))::numeric, 2) AS total_pnl
FROM with_pnl
GROUP BY "feePayer"
ORDER BY total_pnl DESC;
```

---

## Appendix C: Time-Weighted PNL Analysis

An alternative approach to holding time requirements: weight PNL by holding duration instead of excluding short-term trades entirely.

### Weighting Schemes Tested

| Scheme | Formula | Effect |
|--------|---------|--------|
| **Tiered** | <30m=25%, 30-60m=50%, 1-2h=75%, 2h+=100% | Clear buckets, predictable |
| **Linear** | hours_held / 24, capped at 100% | Smooth progression, harsh |
| **Logarithmic** | ln(1+hours) / ln(25), capped at 100% | Diminishing returns |

### Impact on Top Traders

| Wallet | Current PNL | Tiered | Linear (24h) | Log | Assessment |
|--------|-------------|--------|--------------|-----|------------|
| CyaE1Vxv | $37,371 | $11,347 (-70%) | $460 (-99%) | $1,890 (-95%) | 🚨 Sniper penalized |
| 6pkPgzD8 | $18,228 | $19,249 (+6%) | $3,555 (-80%) | $10,184 (-44%) | ✅ Slightly benefits |
| CA4keXLt | $13,903 | $12,289 (-12%) | $7,921 (-43%) | $10,123 (-27%) | ✅ Moderate reduction |
| 4NtyFqqR | $11,568 | $5,432 (-53%) | $239 (-98%) | $1,476 (-87%) | ⚠️ Heavy reduction |
| 5CWn9gFt | $9,812 | $2,520 (-74%) | $44 (-99.5%) | $291 (-97%) | 🚨 Sniper penalized |
| BTZJRdcc | $9,353 | $9,237 (-1%) | $9,216 (-1%) | $9,220 (-1%) | ✅ Very stable |
| TimeAdRp | $8,442 | $4,945 (-41%) | $330 (-96%) | $1,828 (-78%) | ⚠️ Heavy reduction |
| JCLqyRAz | $7,165 | $1,810 (-75%) | $34 (-99.5%) | $228 (-97%) | 🚨 Sniper penalized |

### Tiered Weight Recommendation

The **tiered weighting** scheme offers the best balance:

```sql
-- Tiered time weight multiplier
CASE
  WHEN window_minutes < 30 THEN 0.25   -- <30 min = 25% credit
  WHEN window_minutes < 60 THEN 0.50   -- 30-60 min = 50% credit
  WHEN window_minutes < 120 THEN 0.75  -- 1-2 hours = 75% credit
  ELSE 1.0                              -- 2+ hours = 100% credit
END AS time_weight
```

**Advantages:**
- Doesn't completely exclude any trades (softer approach)
- Clear, communicable rules for participants
- Snipers still get some credit, but significantly reduced
- Long-term holders get full credit

**New Top 10 with Tiered Weighting:**

| Rank | Wallet | Tiered PNL | Change from Current |
|------|--------|------------|---------------------|
| 1 | 6pkPgzD8 | $19,249 | ⬆️ (was #2) |
| 2 | CA4keXLt | $12,289 | ⬆️ (was #3) |
| 3 | CyaE1Vxv | $11,347 | ⬇️ (was #1) |
| 4 | HYSq1KBA | $10,542 | ⬆️ |
| 5 | ExggwHcH | $10,238 | — |
| 6 | BTZJRdcc | $9,237 | ⬆️ |
| 7 | 4QodqLUi | $7,962 | ⬆️ |
| 8 | 5B79fMkc | $6,358 | 🆕 |
| 9 | FcBdvzv2 | $5,483 | 🆕 |
| 10 | 4NtyFqqR | $5,432 | ⬇️ (was #4) |

### Tiered Time-Weighted Query

```sql
-- Add this to the with_pnl CTE to apply tiered time weighting
-- Multiply realized_pnl and unrealized_losses by time_weight

-- Calculate time weight in aggregated CTE:
CASE
  WHEN EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 < 30 THEN 0.25
  WHEN EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 < 60 THEN 0.50
  WHEN EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 < 120 THEN 0.75
  ELSE 1.0
END AS time_weight

-- Then in final SELECT:
SELECT
  "feePayer",
  ROUND((SUM((realized_pnl + unrealized_losses) * time_weight))::numeric, 2) AS total_pnl
FROM with_pnl
GROUP BY "feePayer"
ORDER BY total_pnl DESC;
```

---

## Appendix D: Future Considerations

Additional countermeasures available for future iterations:

1. **Volume Concentration Cap**: Limits individual trader's % contribution to any token's volume
2. **Wallet Clustering Penalty**: Algorithmic detection of coordinated wallet groups
3. **Progressive thresholds**: Increase requirements as competition progresses
4. **Trade frequency limits**: Penalize excessive trading activity

---

## Summary Decision Matrix

### Approach 1: Hard Cutoffs (Exclude trades below threshold)

| Scenario | Hold Time | Unique Traders | Volume Min | Complexity | Recommendation |
|----------|-----------|----------------|------------|------------|----------------|
| Current | 0 min | 1+ | $1,000 | Low | ❌ Gaming vulnerable |
| Option A | 30 min | 1+ | $1,000 | Low | ✅ Good baseline |
| **Option B** | **30 min** | **10+** | **$1,000** | **Medium** | ⭐ **Recommended** |
| Option C | 30 min | 20+ | $1,000 | Medium | ⚠️ May over-filter |
| Option D | 60 min | 10+ | $5,000 | High | ❌ Too restrictive |

### Approach 2: Time-Weighted PNL (Softer approach - no exclusions)

| Scenario | Weighting | Sniper Impact | Complexity | Recommendation |
|----------|-----------|---------------|------------|----------------|
| Tiered | 25%/50%/75%/100% by bucket | -70% to -75% | Medium | ✅ Good alternative |
| Linear | hours/24 | -95% to -99% | Low | ⚠️ Too harsh |
| Logarithmic | ln(hours) | -87% to -97% | Medium | ⚠️ Complex to explain |

### Combined Approach: 30 min + 10 Traders + Tiered Weighting

Testing the full combination (hard 30 min cutoff + 10 unique traders + tiered weighting for remaining positions):

| Wallet | Status | Current | 30m+10T Only | Combined | Change |
|--------|--------|---------|--------------|----------|--------|
| CyaE1Vxv | Sniper | $37,371 | $6,332 | $3,587 | **-90%** |
| 6pkPgzD8 | Stable | $18,228 | $19,590 | $19,590 | +7% |
| 5CWn9gFt | Sniper | $9,812 | $134 | $100 | **-99%** |
| JCLqyRAz | Sniper | $7,165 | $75 | $37 | **-99%** |
| BTZJRdcc | Stable | $9,353 | $9,176 | $9,193 | -2% |

**Result:** Combined approach reduces sniper PNL by 90-99% while stable traders see minimal impact (-2% to +7%).

### Final Recommendation

**Primary:** Option B (30 min hold + 10 unique traders) - Clear rules, removes snipers entirely

**Alternative:** Tiered time-weighting - Softer approach, doesn't exclude anyone but heavily penalizes quick flips

**Maximum Protection:** Combined approach (30 min + 10 traders + tiered weighting) - Most aggressive, virtually eliminates gaming

---

*Report generated by Torque Analytics*
