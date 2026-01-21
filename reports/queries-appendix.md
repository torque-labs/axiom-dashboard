# Trading Competition Analysis - SQL Queries Appendix

All queries run against `axiomtrade_partitioned` table in PostgreSQL.

**Quote Token**: `USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB`

---

## 1. Daily Breakdown (Volume, Trades, Users)

```sql
SELECT
  DATE("receivedAt") as day,
  COUNT(*) as trades,
  COUNT(DISTINCT "feePayer") as users,
  ROUND(SUM(CASE
    WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "uiAmountIn"
    ELSE "uiAmountOut"
  END)::numeric, 2) as volume
FROM axiomtrade_partitioned
WHERE "receivedAt" >= '2026-01-12' AND "receivedAt" < '2026-01-22'
GROUP BY DATE("receivedAt")
ORDER BY day;
```

---

## 2. Period Comparison (Baseline vs Competition)

```sql
-- Baseline period (Jan 12-18): 7 days
SELECT
  'Baseline (Jan 12-18)' as period,
  COUNT(*) as total_trades,
  COUNT(DISTINCT "feePayer") as unique_users,
  ROUND(SUM(CASE
    WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "uiAmountIn"
    ELSE "uiAmountOut"
  END)::numeric, 2) as total_volume,
  ROUND(COUNT(*)::numeric / 7, 0) as daily_trades,
  ROUND(SUM(CASE
    WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "uiAmountIn"
    ELSE "uiAmountOut"
  END)::numeric / 7, 2) as daily_volume
FROM axiomtrade_partitioned
WHERE "receivedAt" >= '2026-01-12' AND "receivedAt" < '2026-01-19'

UNION ALL

-- Competition period (Jan 19-21): 3 days
SELECT
  'Competition (Jan 19-21)' as period,
  COUNT(*) as total_trades,
  COUNT(DISTINCT "feePayer") as unique_users,
  ROUND(SUM(CASE
    WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "uiAmountIn"
    ELSE "uiAmountOut"
  END)::numeric, 2) as total_volume,
  ROUND(COUNT(*)::numeric / 3, 0) as daily_trades,
  ROUND(SUM(CASE
    WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "uiAmountIn"
    ELSE "uiAmountOut"
  END)::numeric / 3, 2) as daily_volume
FROM axiomtrade_partitioned
WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22';
```

---

## 3. New vs Returning Users

```sql
WITH comp_traders AS (
  SELECT DISTINCT "feePayer" FROM axiomtrade_partitioned
  WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22'
),
pre_traders AS (
  SELECT DISTINCT "feePayer" FROM axiomtrade_partitioned
  WHERE "receivedAt" < '2026-01-19'
)
SELECT
  CASE WHEN p."feePayer" IS NULL THEN 'New User' ELSE 'Returning User' END as user_type,
  COUNT(*) as user_count
FROM comp_traders c
LEFT JOIN pre_traders p ON c."feePayer" = p."feePayer"
GROUP BY 1;
```

---

## 4. User Segmentation by Volume Tier

```sql
WITH user_volume AS (
  SELECT "feePayer",
         SUM(CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
                  THEN "uiAmountIn" ELSE "uiAmountOut" END) as total_volume,
         COUNT(*) as trade_count
  FROM axiomtrade_partitioned
  WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22'
  GROUP BY "feePayer"
)
SELECT
  CASE
    WHEN total_volume >= 100000 THEN 'Whale (>$100K)'
    WHEN total_volume >= 10000 THEN 'Mid-Tier ($10K-$100K)'
    WHEN total_volume >= 1000 THEN 'Participant ($1K-$10K)'
    ELSE 'Casual (<$1K)'
  END as segment,
  COUNT(*) as user_count,
  ROUND(SUM(total_volume)::numeric, 2) as segment_volume,
  ROUND(AVG(trade_count)::numeric, 1) as avg_trades
FROM user_volume
GROUP BY 1
ORDER BY segment_volume DESC;
```

---

## 5. Volume Concentration (Top 1%, Top 10%, Bottom 50%)

```sql
WITH user_volume AS (
  SELECT "feePayer",
         SUM(CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
                  THEN "uiAmountIn" ELSE "uiAmountOut" END) as total_volume
  FROM axiomtrade_partitioned
  WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22'
  GROUP BY "feePayer"
),
ranked AS (
  SELECT *,
         NTILE(100) OVER (ORDER BY total_volume DESC) as percentile
  FROM user_volume
),
total AS (
  SELECT SUM(total_volume) as total_vol FROM user_volume
)
SELECT
  'Top 1%' as segment,
  COUNT(*) as users,
  ROUND(SUM(total_volume)::numeric, 2) as volume,
  ROUND((SUM(total_volume) / (SELECT total_vol FROM total) * 100)::numeric, 1) as pct_of_total
FROM ranked WHERE percentile = 1
UNION ALL
SELECT
  'Top 10%' as segment,
  COUNT(*) as users,
  ROUND(SUM(total_volume)::numeric, 2) as volume,
  ROUND((SUM(total_volume) / (SELECT total_vol FROM total) * 100)::numeric, 1) as pct_of_total
FROM ranked WHERE percentile <= 10
UNION ALL
SELECT
  'Bottom 50%' as segment,
  COUNT(*) as users,
  ROUND(SUM(total_volume)::numeric, 2) as volume,
  ROUND((SUM(total_volume) / (SELECT total_vol FROM total) * 100)::numeric, 1) as pct_of_total
FROM ranked WHERE percentile > 50;
```

---

## 6. Top Volume Leaders

```sql
SELECT
  "feePayer",
  ROUND(SUM(CASE WHEN "tokenIn" = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'
                 THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric, 2) as total_volume,
  COUNT(*) as trade_count,
  COUNT(DISTINCT CASE
    WHEN "tokenIn" != 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB' THEN "tokenIn"
    ELSE "tokenOut"
  END) as tokens_traded
FROM axiomtrade_partitioned
WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22'
GROUP BY "feePayer"
ORDER BY total_volume DESC
LIMIT 10;
```

---

## 7. PnL Leaderboard (VWAP-based)

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
  WHERE ap."receivedAt" >= '2026-01-19'
),
vwap AS (
  SELECT
    token,
    SUM(CASE WHEN direction = 'SELL' THEN "uiAmountIn" * trade_price ELSE 0 END) /
    NULLIF(SUM(CASE WHEN direction = 'SELL' THEN "uiAmountIn" ELSE 0 END), 0) AS vwap_price
  FROM base
  GROUP BY token
),
user_token_pnl AS (
  SELECT
    b."feePayer",
    b.token,
    SUM(CASE WHEN direction = 'BUY' THEN -"uiAmountIn" ELSE "uiAmountOut" END) AS realized_pnl_usd,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountOut" ELSE -"uiAmountIn" END) AS net_token_balance,
    SUM(CASE WHEN direction = 'BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) AS total_volume
  FROM base b
  GROUP BY b."feePayer", b.token
),
with_unrealized AS (
  SELECT
    u."feePayer",
    u.token,
    u.realized_pnl_usd,
    u.net_token_balance,
    u.total_volume,
    COALESCE(v.vwap_price, 0) AS vwap_price,
    CASE
      WHEN u.net_token_balance < 0
      THEN u.net_token_balance * COALESCE(v.vwap_price, 0)
      ELSE 0
    END AS unrealized_loss
  FROM user_token_pnl u
  LEFT JOIN vwap v ON u.token = v.token
)
SELECT
  "feePayer",
  ROUND(SUM(realized_pnl_usd + unrealized_loss)::numeric, 2) AS total_pnl,
  ROUND(SUM(total_volume)::numeric, 2) AS total_volume,
  COUNT(DISTINCT token) AS tokens_traded,
  SUM(1) AS trade_pairs
FROM with_unrealized
GROUP BY "feePayer"
HAVING SUM(total_volume) >= 1000
ORDER BY total_pnl DESC
LIMIT 10;
```

---

## 8. Trade Frequency Distribution

```sql
WITH user_trades AS (
  SELECT "feePayer", COUNT(*) as trade_count
  FROM axiomtrade_partitioned
  WHERE "receivedAt" >= '2026-01-19' AND "receivedAt" < '2026-01-22'
  GROUP BY "feePayer"
)
SELECT
  COUNT(*) as total_users,
  ROUND(AVG(trade_count)::numeric, 2) as avg_trades_per_user,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY trade_count) as median_trades,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY trade_count) as p90_trades,
  MAX(trade_count) as max_trades
FROM user_trades;
```

---

*Generated: January 21, 2026*
