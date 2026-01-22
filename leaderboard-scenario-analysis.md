# Leaderboard Scenario Analysis Report

**Analysis Period:** January 19-25, 2026
**Generated:** January 21, 2026

---

## Executive Summary

This report analyzes the impact of 12 different filter combinations on the leaderboard rankings, specifically examining how different Hold Time, Volume, and Unique Trader thresholds affect identified snipers vs legitimate traders.

### Key Finding
**All tested scenarios effectively neutralize the sniper ring.** The hold time requirement is the most impactful filter - even 15 minutes eliminates 82-99% of sniper PNL, while legitimate traders are minimally affected.

---

## Identified Snipers (Baseline)

| Wallet | Baseline PNL | Rank | Evidence |
|--------|-------------|------|----------|
| CyaE1Vxv | $37,345 | #1 | Coordinated trading, 14 shared tokens with ring |
| 5CWn9gFt | $9,767 | #7 | 40 tokens traded within 0.1 min of JCLqyRAz |
| JCLqyRAz | $7,195 | #11 | 40 tokens traded within 0.1 min of 5CWn9gFt |
| **Total Sniper PNL** | **$54,307** | | |

---

## Scenario Matrix (12 Combinations)

### Parameters Tested
- **Hold Time:** 15 minutes, 20 minutes
- **Minimum Volume:** $2,000, $3,000
- **Unique Traders:** 10, 20, 30

---

## Results: Sniper Impact

### CyaE1Vxv (Baseline: $37,345)

| Scenario | PNL | Reduction | Rank |
|----------|-----|-----------|------|
| 15m / $2k / 10T | $6,549 | -82% | #11 |
| 15m / $2k / 20T | $6,549 | -82% | #10 |
| 15m / $2k / 30T | $6,549 | -82% | #10 |
| 15m / $3k / 10T | $6,549 | -82% | #11 |
| 15m / $3k / 20T | $6,549 | -82% | #10 |
| 15m / $3k / 30T | $6,549 | -82% | #10 |
| 20m / $2k / 10T | $6,332 | -83% | #12 |
| 20m / $2k / 20T | $6,332 | -83% | #11 |
| 20m / $2k / 30T | $6,332 | -83% | #11 |
| 20m / $3k / 10T | $6,332 | -83% | #12 |
| 20m / $3k / 20T | $6,332 | -83% | #11 |
| 20m / $3k / 30T | $6,332 | -83% | #11 |

### 5CWn9gFt (Baseline: $9,767)

| Scenario | PNL | Reduction |
|----------|-----|-----------|
| All 15-min scenarios | $134 | **-99%** |
| All 20-min scenarios | $134 | **-99%** |

### JCLqyRAz (Baseline: $7,195)

| Scenario | PNL | Reduction |
|----------|-----|-----------|
| All 15-min scenarios | $75 | **-99%** |
| All 20-min scenarios | $75 | **-99%** |

---

## Results: Stable Trader Impact

### Top 5 Stable Traders (No Sniper Activity)

| Wallet | Baseline | 15m/2k/10T | 20m/2k/10T | Change |
|--------|----------|------------|------------|--------|
| 6pkPgzD8 | $18,229 | $19,327 | $19,327 | +6% |
| HYSq1KBA | $11,942 | $13,009 | $13,009 | +9% |
| CA4keXLt | $13,922 | $11,751 | $11,751 | -16% |
| 4NtyFqqR | $11,568 | $11,197 | $11,197 | -3% |
| ExggwHcH | $10,356 | $10,356 | $10,356 | 0% |

**Key Observation:** Most stable traders see minimal impact or slight improvement due to removal of sniper-inflated positions.

---

## Full Leaderboard Comparison

### Baseline (No Filters)
```
Rank  Wallet      PNL
1     CyaE1Vxv    $37,345  ← SNIPER
2     6pkPgzD8    $18,229
3     CA4keXLt    $13,922
4     HYSq1KBA    $11,942
5     4NtyFqqR    $11,568
6     ExggwHcH    $10,356
7     5CWn9gFt    $9,767   ← SNIPER
8     BTZJRdcc    $9,326
9     TimeAdRp    $8,442
10    4QodqLUi    $7,894
11    JCLqyRAz    $7,195   ← SNIPER
```

### 15 Minute Hold / $2,000 Volume / 10 Unique Traders
```
Rank  Wallet      PNL       Change
1     6pkPgzD8    $19,327   ↑ from #2
2     HYSq1KBA    $13,009   ↑ from #4
3     CA4keXLt    $11,751   ↑ from #3
4     TimeAdRp    $11,566   ↑ from #9
5     4NtyFqqR    $11,197   ↓ from #5
6     ExggwHcH    $10,356   ↓ from #6
7     BTZJRdcc    $9,306    ↓ from #8
8     4QodqLUi    $7,985    ↓ from #10
9     5B79fMkc    $6,970    NEW
10    8pKVAVuG    $6,745    NEW
11    CyaE1Vxv    $6,549    ↓↓ from #1 (SNIPER)
```
*5CWn9gFt ($134) and JCLqyRAz ($75) fall out of top 20*

### 20 Minute Hold / $2,000 Volume / 10 Unique Traders
```
Rank  Wallet      PNL       Change
1     6pkPgzD8    $19,327   ↑ from #2
2     HYSq1KBA    $13,009   ↑ from #4
3     CA4keXLt    $11,751   ↑ from #3
4     TimeAdRp    $11,566   ↑ from #9
5     4NtyFqqR    $11,197   ↓ from #5
6     ExggwHcH    $10,356   ↓ from #6
7     BTZJRdcc    $9,306    ↓ from #8
8     4QodqLUi    $7,985    ↓ from #10
9     5B79fMkc    $6,970    NEW
10    8pKVAVuG    $6,745    NEW
11    FcBdvzv2    $6,451    NEW
12    CyaE1Vxv    $6,332    ↓↓ from #1 (SNIPER)
```

---

## Scenario Comparison: Key Observations

### 1. Hold Time Impact
| Hold Time | CyaE1Vxv PNL | 5CWn9gFt PNL | JCLqyRAz PNL |
|-----------|--------------|--------------|--------------|
| 15 min | $6,549 (-82%) | $134 (-99%) | $75 (-99%) |
| 20 min | $6,332 (-83%) | $134 (-99%) | $75 (-99%) |

**Finding:** 15→20 min has minimal additional impact. The coordinated bot wallets (5CWn9gFt, JCLqyRAz) are already at -99% with 15 min.

### 2. Volume Threshold Impact
| Volume | Leaderboard Change |
|--------|-------------------|
| $2,000 | Same rankings as $3,000 |
| $3,000 | Same rankings as $2,000 |

**Finding:** Volume threshold ($2k vs $3k) has negligible impact on top traders. Both snipers and legitimate traders are trading eligible tokens.

### 3. Unique Traders Impact
| Unique Traders | Notable Changes |
|----------------|-----------------|
| 10 | CA4keXLt appears at #3 |
| 20 | CA4keXLt drops off top 20 |
| 30 | Same as 20T |

**Finding:** Increasing unique traders from 10→20 removes CA4keXLt (potential gaming on low-trader tokens). 20→30 has no additional impact.

---

## Recommendations

### Option A: Conservative (15m / $2k / 10T)
- Removes 82-99% of sniper PNL
- Minimal disruption to legitimate traders
- Lower threshold keeps more trading activity eligible

### Option B: Moderate (15m / $2k / 20T) ⭐ RECOMMENDED
- Same sniper reduction as Option A
- Additional protection: removes potential gaming on low-popularity tokens
- CA4keXLt (possible gaming) is eliminated

### Option C: Aggressive (20m / $3k / 30T)
- Marginally more sniper reduction (83% vs 82% for CyaE1Vxv)
- May exclude some legitimate short-term trades
- Higher thresholds reduce eligible trading activity

---

## Summary Statistics

| Metric | Baseline | 15m/2k/10T | 20m/2k/20T |
|--------|----------|------------|------------|
| Total Sniper PNL | $54,307 | $6,758 | $6,541 |
| Sniper Reduction | - | -88% | -88% |
| #1 Trader | CyaE1Vxv (Sniper) | 6pkPgzD8 (Legit) | 6pkPgzD8 (Legit) |
| Snipers in Top 10 | 2 | 0 | 0 |
| Snipers in Top 20 | 3 | 1 | 1 |

---

## Appendix: SQL Query Template

```sql
-- Parameterized query for any scenario
-- Replace: {HOLD_MINUTES}, {MIN_VOLUME}, {MIN_TRADERS}

WITH base AS (
  SELECT "tokenIn", "tokenOut", "feePayer", "uiAmountIn", "uiAmountOut", "receivedAt",
    CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN 'BUY' ELSE 'SELL' END AS direction,
    CASE WHEN "tokenIn" != 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "tokenIn" ELSE "tokenOut" END AS token,
    CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
      THEN NULLIF("uiAmountIn", 0) / NULLIF("uiAmountOut", 0)
      WHEN "tokenOut" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
      THEN NULLIF("uiAmountOut", 0) / NULLIF("uiAmountIn", 0)
      ELSE 0 END AS trade_price
  FROM "AxiomTrade"
  WHERE "receivedAt" BETWEEN '2026-01-19T00:01:00Z' AND '2026-01-25T00:00:00Z'
),

-- Token eligibility: volume + unique traders
token_stats AS (
  SELECT token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) AS total_usd_volume,
    COUNT(DISTINCT "feePayer") as unique_traders
  FROM base GROUP BY token
),
eligible_tokens AS (
  SELECT token FROM token_stats
  WHERE total_usd_volume >= {MIN_VOLUME} AND unique_traders >= {MIN_TRADERS}
),
base_filtered AS (
  SELECT b.* FROM base b
  INNER JOIN eligible_tokens et ON b.token = et.token
),

-- Hold time filter
trader_windows AS (
  SELECT token, "feePayer",
    EXTRACT(EPOCH FROM (MAX("receivedAt") - MIN("receivedAt"))) / 60 AS window_minutes
  FROM base_filtered GROUP BY token, "feePayer"
),
eligible_positions AS (
  SELECT token, "feePayer" FROM trader_windows
  WHERE window_minutes >= {HOLD_MINUTES}
),
base_hold_filtered AS (
  SELECT bf.* FROM base_filtered bf
  INNER JOIN eligible_positions ep ON bf.token = ep.token AND bf."feePayer" = ep."feePayer"
),

-- Last price calculation
last_trade_vwap AS (
  SELECT token,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) /
    NULLIF(SUM(CASE WHEN direction = 'BUY' THEN "uiAmountOut" ELSE "uiAmountIn" END), 0) AS last_price
  FROM base_hold_filtered
  WHERE "receivedAt" >= '2026-01-25T00:00:00Z'::timestamp - INTERVAL '4 hours'
  GROUP BY token
),
last_trade_fallback AS (
  SELECT DISTINCT ON (token) token, trade_price AS last_price
  FROM base_hold_filtered ORDER BY token, "receivedAt" DESC
),
last_price AS (
  SELECT ltf.token, COALESCE(ltv.last_price, ltf.last_price) AS last_price
  FROM last_trade_fallback ltf
  LEFT JOIN last_trade_vwap ltv ON ltv.token = ltf.token
),

-- Aggregation
aggregated AS (
  SELECT b.token, b."feePayer",
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountIn" ELSE 0 END) AS sum_token_in,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountOut" ELSE 0 END) AS sum_token_out,
    SUM(CASE WHEN b.direction = 'BUY' THEN b."uiAmountIn" ELSE 0 END) AS sum_usd1_in,
    SUM(CASE WHEN b.direction = 'SELL' THEN b."uiAmountOut" ELSE 0 END) AS sum_usd1_out,
    MAX(lp.last_price) AS last_traded_unit_price
  FROM base_hold_filtered b
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

-- PNL calculation
with_pnl AS (
  SELECT token, "feePayer", trader_volume,
    LEAST(sum_token_in, sum_token_out) * (vwap_sell_price - vwap_buy_price) AS realized_pnl,
    CASE WHEN sum_token_out > sum_token_in
      AND (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price) < 0
      THEN (sum_token_out - sum_token_in) * (COALESCE(last_traded_unit_price, 0) - vwap_buy_price)
      ELSE 0 END AS unrealized_losses
  FROM with_vwap
)

SELECT
  LEFT("feePayer", 8) as wallet,
  ROUND((SUM(realized_pnl) + SUM(unrealized_losses))::numeric, 0) AS total_pnl
FROM with_pnl
GROUP BY "feePayer"
ORDER BY total_pnl DESC
LIMIT 20;
```

---

*Report generated by Axiom Analytics*
