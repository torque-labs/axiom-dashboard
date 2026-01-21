# Technical Specification: Axiom Dashboard Segment Definitions

## Overview

The Axiom Dashboard defines **13 user segments** for analyzing trading behavior.

**Important:** Cube.js does not support `NTILE()` or percentile window functions. The hardcoded thresholds below are **approximations derived from historical data analysis**. For true percentile-based segmentation in production, use SQL with `NTILE()` or `PERCENTILE_CONT()` functions.

### Source Files
- `/src/config/segmentPages.ts` - Segment configurations, metrics, and charts
- `/src/lib/cube.ts` - Query definitions with hardcoded thresholds

---

## Data Model

### SegmentUser Interface
```typescript
interface SegmentUser {
  fee_payer: string;              // Wallet address (primary key)
  total_usd_volume: number;       // Total trading volume in USD
  swap_count: number;             // Total number of swaps
  avg_swap_size: number;          // Average swap size in USD
  net_usd1_flow: number;          // Net inflow/outflow of USD1 token
  aggregation_date?: string;      // Date of data aggregation
}
```

### Data Source
- **Cube:** `user_axiom_volume`
- **Time Range:** Default `last 30 days` (varies by segment)

---

## Percentile-to-Threshold Reference

The following table shows how percentile-based segment definitions map to hardcoded thresholds:

| Segment | Percentile Definition | Hardcoded Proxy |
|---------|----------------------|-----------------|
| Whales | `volume_percentile >= 95` | `total_usd_volume >= $196,000` |
| Mid-Tier | `volume_percentile 75-95` | `$53,000 <= total_usd_volume < $196,000` |
| Lapsed Power Users | `volume_percentile >= 90` + inactive 14d | `total_usd_volume >= $119,000` |
| Streak Masters | `frequency_percentile >= 95` | `swap_count >= 500` |
| Consistent Traders | `frequency_percentile 50-95` | `200 <= swap_count < 500` |
| Active Small | `frequency >= 50th pctl AND avg_size < 50th pctl` | `swap_count >= 100 AND avg_swap_size <= $200` |
| Accumulators | `flow_percentile >= 75` (net buyers) | `net_usd1_flow > 0` (sorted DESC) |
| Distributors | `flow_percentile <= 25` (net sellers) | `net_usd1_flow < 0` (sorted ASC) |
| At-Risk Mid-Tier | `volume 75-95th pctl` + inactive 7-30d | `$53,000 <= total_usd_volume < $196,000` |
| Rising Stars | `velocity_percentile >= 90` | `velocity_ratio >= 1.5` (1.5x WoW growth) |
| Cooling Down | `velocity_percentile <= 10 AND volume >= 50th pctl` | `velocity_ratio <= 0.5 AND prev_week >= $50,000` |
| New Users | `first_trade >= NOW() - 7 days` | `swap_count = 1` in last 7 days |
| One-and-Done | `swap_count = 1 AND first_trade < 7 days ago` | `swap_count = 1` in 7-60 days ago window |

---

## Segment Definitions

### 1. WHALES

| Property | Value |
|----------|-------|
| **Key** | `whales` |
| **Percentile Definition** | `volume_percentile >= 95` (top 5% by volume) |
| **Hardcoded Proxy** | `total_usd_volume >= $196,000` |
| **Rationale** | $196K represents the 95th percentile of 30-day trading volume based on historical analysis. These users account for ~36% of total platform volume. |
| **Color** | `#3B82F6` (Blue) |
| **Time Range** | Last 30 days |

**Cube.js Filter:**
```typescript
filters: [
  { member: 'user_axiom_volume.total_usd_volume', operator: 'gte', values: ['196000'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE volume_percentile >= 95
-- Using NTILE: NTILE(100) OVER (ORDER BY total_usd_volume) AS volume_percentile
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Whale Count | number | `users.length` |
| Total Volume | currency | `sum(total_usd_volume)` |
| Median Volume | currency | `median(total_usd_volume)` |
| Top 5 Concentration | percent | `sum(top 5 volumes) / sum(all volumes) * 100` |

**Growth Question:** "Are my VIPs healthy? Are they growing or declining?"

---

### 2. MID_TIER

| Property | Value |
|----------|-------|
| **Key** | `mid_tier` |
| **Percentile Definition** | `volume_percentile 75-95` (75th to 95th percentile) |
| **Hardcoded Proxy** | `$53,000 <= total_usd_volume < $196,000` |
| **Rationale** | $53K = 75th percentile, $196K = 95th percentile of 30-day volume. This captures the "upper middle class" of traders. |
| **Color** | `#06B6D4` (Cyan) |
| **Time Range** | Last 30 days |

**Cube.js Filter:**
```typescript
filters: [
  { member: 'user_axiom_volume.total_usd_volume', operator: 'gte', values: ['53000'] },
  { member: 'user_axiom_volume.total_usd_volume', operator: 'lt', values: ['196000'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE volume_percentile >= 75 AND volume_percentile < 95
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Hot Prospects | number | `count where total_usd_volume > 175000` |
| Median Gap to Whale | currency | `196000 - median(total_usd_volume)` |
| Need More Trades | percent | `count(swap_count < 200 AND avg_swap_size >= 150) / total * 100` |
| Need Bigger Trades | percent | `count(swap_count >= 200 AND avg_swap_size < 150) / total * 100` |

**Growth Question:** "Who's ready to become a whale? What's blocking them?"

---

### 3. STREAK_MASTERS

| Property | Value |
|----------|-------|
| **Key** | `streak_masters` |
| **Percentile Definition** | `frequency_percentile >= 95` (top 5% by swap count) |
| **Hardcoded Proxy** | `swap_count >= 500` |
| **Rationale** | 500 swaps/30 days represents the 95th percentile of trading frequency. These are the most engaged users by activity. |
| **Color** | `#14B8A6` (Teal) |
| **Time Range** | Last 30 days |

**Cube.js Filter:**
```typescript
filters: [
  { member: 'user_axiom_volume.swap_count', operator: 'gte', values: ['500'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE frequency_percentile >= 95
-- Using NTILE: NTILE(100) OVER (ORDER BY swap_count) AS frequency_percentile
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Power Traders | number | `users.length` |
| Total Volume | currency | `sum(total_usd_volume)` |
| Median Swaps | number | `median(swap_count)` |
| Median Volume | currency | `median(total_usd_volume)` |

**Growth Question:** "Who are my most engaged users? How do I keep them active?"

---

### 4. LAPSED_WHALES

| Property | Value |
|----------|-------|
| **Key** | `lapsed_whales` |
| **Percentile Definition** | `volume_percentile >= 90` + `last_trade < 14 days ago` |
| **Hardcoded Proxy** | `total_usd_volume >= $119,000` + inactive 14-28 days |
| **Rationale** | $119K = 90th percentile. Slightly lower than whale threshold to catch "near-whales" who are churning. 14-day inactivity window identifies users who have stopped trading. |
| **Color** | `#EF4444` (Red) |
| **Time Range** | 14-28 days ago (inactive window) |

**Cube.js Filter:**
```typescript
timeDimensions: [{
  dimension: 'user_axiom_volume.aggregation_date',
  dateRange: ['2025-01-07', '2025-01-21']  // 14-28 days ago, computed dynamically
}],
filters: [
  { member: 'user_axiom_volume.total_usd_volume', operator: 'gte', values: ['119000'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE volume_percentile >= 90
  AND last_trade_date < CURRENT_DATE - INTERVAL '14 days'
  AND last_trade_date >= CURRENT_DATE - INTERVAL '28 days'
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Lapsed Count | number | `users.length` |
| Lost Volume | currency | `sum(total_usd_volume)` |
| Median Lost Volume | currency | `median(total_usd_volume)` |
| Median Past Swaps | number | `median(swap_count)` |

**Growth Question:** "Who should I re-engage? What volume did we lose?"

---

### 5. CONSISTENT_TRADERS

| Property | Value |
|----------|-------|
| **Key** | `consistent_traders` |
| **Percentile Definition** | `frequency_percentile 50-95` (median to 95th percentile by activity) |
| **Hardcoded Proxy** | `200 <= swap_count < 500` |
| **Rationale** | 200 swaps = 50th percentile (median), 500 swaps = 95th percentile. These are regular, reliable traders—not power users, but consistently active. |
| **Color** | `#F59E0B` (Amber) |
| **Time Range** | Last 30 days |

**Cube.js Filter:**
```typescript
filters: [
  { member: 'user_axiom_volume.swap_count', operator: 'gte', values: ['200'] },
  { member: 'user_axiom_volume.swap_count', operator: 'lt', values: ['500'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE frequency_percentile >= 50 AND frequency_percentile < 95
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Trader Count | number | `users.length` |
| Total Volume | currency | `sum(total_usd_volume)` |
| Median Swaps | number | `median(swap_count)` |
| Median Volume | currency | `median(total_usd_volume)` |

**Growth Question:** "Who are my reliable regulars? How do I level them up?"

---

### 6. ACCUMULATORS

| Property | Value |
|----------|-------|
| **Key** | `accumulators` |
| **Percentile Definition** | `flow_percentile >= 75` (top 25% net buyers) |
| **Hardcoded Proxy** | `net_usd1_flow > 0` (sorted by flow DESC, takes top results) |
| **Rationale** | Users with positive net flow are net buyers (accumulating the token). Sorting DESC and limiting results approximates the top quartile. |
| **Color** | `#10B981` (Emerald) |
| **Time Range** | Last 30 days |

**Cube.js Query:**
```typescript
// No filter on net_usd1_flow - sorted DESC to get top accumulators
order: { 'user_axiom_volume.net_usd1_flow': 'desc' },
limit: 10000
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE flow_percentile >= 75  -- top 25% net buyers
-- Using NTILE: NTILE(100) OVER (ORDER BY net_usd1_flow) AS flow_percentile
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Accumulator Count | number | `users.length` |
| Total Net Inflow | currency | `sum(net_usd1_flow)` |
| Median Net Inflow | currency | `median(net_usd1_flow)` |
| Largest Position | currency | `max(net_usd1_flow)` |

**Growth Question:** "Who are my believers? Can they become advocates?"

---

### 7. DISTRIBUTORS

| Property | Value |
|----------|-------|
| **Key** | `distributors` |
| **Percentile Definition** | `flow_percentile <= 25` (bottom 25% = top net sellers) |
| **Hardcoded Proxy** | `net_usd1_flow < 0` (sorted by flow ASC, takes most negative) |
| **Rationale** | Users with negative net flow are net sellers (distributing/exiting). Sorting ASC captures the largest sellers first. |
| **Color** | `#F43F5E` (Rose) |
| **Time Range** | Last 30 days |

**Cube.js Query:**
```typescript
// No filter - sorted ASC to get biggest sellers (most negative flow)
order: { 'user_axiom_volume.net_usd1_flow': 'asc' },
limit: 10000
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE flow_percentile <= 25  -- bottom 25% = biggest net sellers
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Distributor Count | number | `users.length` |
| Total Volume | currency | `sum(total_usd_volume)` |
| Total Net Outflow | currency | `abs(sum(net_usd1_flow))` |
| Median Net Outflow | currency | `abs(median(net_usd1_flow))` |

**Growth Question:** "Who is exiting positions? Is this profit-taking or churn risk?"

---

### 8. ACTIVE_SMALL

| Property | Value |
|----------|-------|
| **Key** | `active_small` |
| **Percentile Definition** | `frequency >= 50th pctl AND avg_trade_size < 50th pctl` |
| **Hardcoded Proxy** | `swap_count >= 100 AND avg_swap_size <= $200` |
| **Rationale** | 100 swaps = ~50th percentile frequency. $200 avg size = below median trade size. These users are active but trading small—potential for growth. |
| **Color** | `#8B5CF6` (Purple) |
| **Time Range** | Last 30 days |

**Cube.js Filter:**
```typescript
filters: [
  { member: 'user_axiom_volume.swap_count', operator: 'gte', values: ['100'] },
  { member: 'user_axiom_volume.avg_swap_size', operator: 'lte', values: ['200'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE frequency_percentile >= 50
  AND size_percentile < 50
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| User Count | number | `users.length` |
| Total Swaps | number | `sum(swap_count)` |
| Total Volume | currency | `sum(total_usd_volume)` |
| Median Trade Size | currency | `median(avg_swap_size)` |

**Growth Question:** "Who's ready to graduate to bigger trades?"

---

### 9. NEW_USERS

| Property | Value |
|----------|-------|
| **Key** | `new_users` |
| **Percentile Definition** | `first_trade >= NOW() - 7 days` (time-based, not percentile) |
| **Hardcoded Proxy** | `swap_count = 1` in last 7 days |
| **Rationale** | First-time traders identified by having exactly 1 swap in their first week. This is a time-based cohort, not percentile-based. |
| **Color** | `#EC4899` (Pink) |
| **Time Range** | Last 7 days |

**Cube.js Filter:**
```typescript
timeDimensions: [{
  dimension: 'user_axiom_volume.aggregation_date',
  dateRange: 'last 7 days'
}],
filters: [
  { member: 'user_axiom_volume.swap_count', operator: 'equals', values: ['1'] }
]
```

**Production SQL:**
```sql
SELECT * FROM users
WHERE first_trade_date >= CURRENT_DATE - INTERVAL '7 days'
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| New Users (7d) | number | `users.length` |
| First Week Volume | currency | `sum(total_usd_volume)` |
| Median First Trade | currency | `median(avg_swap_size)` |
| Median Volume | currency | `median(total_usd_volume)` |

**Growth Question:** "Is my acquisition funnel healthy?"

---

### 10. AT_RISK_MID_TIER

| Property | Value |
|----------|-------|
| **Key** | `at_risk_mid_tier` |
| **Percentile Definition** | `volume_percentile 75-95` + `velocity < 25th pctl` (declining activity) |
| **Hardcoded Proxy** | `$53,000 <= total_usd_volume < $196,000` + inactive 7-30 days |
| **Rationale** | Same volume thresholds as mid-tier, but filtered by inactivity window. These are valuable users showing early churn signals. |
| **Color** | `#EAB308` (Yellow) |
| **Time Range** | 7-30 days ago (inactive window) |

**Cube.js Filter:**
```typescript
timeDimensions: [{
  dimension: 'user_axiom_volume.aggregation_date',
  dateRange: ['2025-01-05', '2025-01-28']  // 7-30 days ago, computed dynamically
}],
filters: [
  { member: 'user_axiom_volume.total_usd_volume', operator: 'gte', values: ['53000'] },
  { member: 'user_axiom_volume.total_usd_volume', operator: 'lt', values: ['196000'] }
]
```

**Production SQL (true percentile):**
```sql
SELECT * FROM users
WHERE volume_percentile >= 75 AND volume_percentile < 95
  AND velocity_percentile < 25
  AND last_trade_date < CURRENT_DATE - INTERVAL '7 days'
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| At-Risk Count | number | `users.length` |
| Volume at Risk | currency | `sum(total_usd_volume)` |
| Median Volume | currency | `median(total_usd_volume)` |
| Median Past Swaps | number | `median(swap_count)` |

**Growth Question:** "Who is slipping away? Can we automate 'we miss you' campaigns?"

---

### 11. ONE_AND_DONE

| Property | Value |
|----------|-------|
| **Key** | `one_and_done` |
| **Percentile Definition** | `swap_count = 1 AND first_trade < 7 days ago` (behavioral, not percentile) |
| **Hardcoded Proxy** | `swap_count = 1` in 7-60 day window |
| **Rationale** | Users who made exactly one trade and haven't returned. The 7-60 day window excludes new users (< 7 days) and very old churned users (> 60 days). |
| **Color** | `#6B7280` (Gray) |
| **Time Range** | 7-60 days ago |

**Cube.js Filter:**
```typescript
timeDimensions: [{
  dimension: 'user_axiom_volume.aggregation_date',
  dateRange: ['2024-11-22', '2025-01-14']  // 7-60 days ago, computed dynamically
}],
filters: [
  { member: 'user_axiom_volume.swap_count', operator: 'equals', values: ['1'] }
]
```

**Production SQL:**
```sql
SELECT * FROM users
WHERE swap_count = 1
  AND first_trade_date < CURRENT_DATE - INTERVAL '7 days'
  AND first_trade_date >= CURRENT_DATE - INTERVAL '60 days'
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Churned Users | number | `users.length` |
| Total First Trades | currency | `sum(total_usd_volume)` |
| Median First Trade | currency | `median(total_usd_volume)` |
| Largest First Trade | currency | `max(total_usd_volume)` |

**Growth Question:** "Why did they leave? Is this an activation problem?"

---

### 12. RISING_STARS

| Property | Value |
|----------|-------|
| **Key** | `rising_stars` |
| **Percentile Definition** | `velocity_percentile >= 90` (top 10% week-over-week growth) |
| **Hardcoded Proxy** | `velocity_ratio >= 1.5` (50%+ WoW volume increase) + `min $1K current week` |
| **Rationale** | 1.5x WoW growth approximates the 90th percentile of velocity. $1K minimum filters out noise from tiny accounts. |
| **Color** | `#22C55E` (Green) |
| **Computation** | Requires dual query (current week vs previous week) |

**Velocity Calculation:**
```typescript
velocity_ratio = current_week_volume / previous_week_volume

// Include user if:
// - current_week_volume >= 1000
// - velocity_ratio >= 1.5
```

**Cube.js Queries:**
```typescript
// Query 1: Current week
{ dateRange: 'last 7 days', filters: [{ total_usd_volume >= 1000 }] }

// Query 2: Previous week
{ dateRange: ['14 days ago', '7 days ago'] }

// Client-side join by fee_payer, compute velocity_ratio
```

**Production SQL (true percentile):**
```sql
WITH velocity AS (
  SELECT
    fee_payer,
    current_week_volume,
    previous_week_volume,
    current_week_volume / NULLIF(previous_week_volume, 0) as velocity_ratio,
    NTILE(100) OVER (ORDER BY current_week_volume / NULLIF(previous_week_volume, 0)) as velocity_percentile
  FROM user_weekly_volumes
)
SELECT * FROM velocity
WHERE velocity_percentile >= 90
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Rising Stars | number | `users.length` |
| Current Week Volume | currency | `sum(total_usd_volume)` (current week) |
| Median Volume | currency | `median(total_usd_volume)` |
| Median Swaps | number | `median(swap_count)` |

**Growth Question:** "Who is surging right now? How do I reinforce this behavior?"

---

### 13. COOLING_DOWN

| Property | Value |
|----------|-------|
| **Key** | `cooling_down` |
| **Percentile Definition** | `velocity_percentile <= 10 AND volume_percentile >= 50` |
| **Hardcoded Proxy** | `velocity_ratio <= 0.5` (50%+ WoW decline) + `previous week >= $50K` |
| **Rationale** | 0.5x velocity (50% decline) approximates the 10th percentile. $50K previous week threshold ensures we're tracking meaningful users, not small accounts with volatile activity. |
| **Color** | `#F97316` (Orange) |
| **Computation** | Requires dual query (current week vs previous week) |

**Velocity Calculation:**
```typescript
velocity_ratio = current_week_volume / previous_week_volume

// Include user if:
// - previous_week_volume >= 50000
// - velocity_ratio <= 0.5
```

**Cube.js Queries:**
```typescript
// Query 1: Current week
{ dateRange: 'last 7 days' }

// Query 2: Previous week (filter for $50K+)
{ dateRange: ['14 days ago', '7 days ago'], filters: [{ total_usd_volume >= 50000 }] }

// Client-side join by fee_payer, compute velocity_ratio
```

**Production SQL (true percentile):**
```sql
WITH velocity AS (
  SELECT
    fee_payer,
    current_week_volume,
    previous_week_volume,
    current_week_volume / NULLIF(previous_week_volume, 0) as velocity_ratio,
    NTILE(100) OVER (ORDER BY current_week_volume / NULLIF(previous_week_volume, 0)) as velocity_percentile,
    NTILE(100) OVER (ORDER BY previous_week_volume) as volume_percentile
  FROM user_weekly_volumes
)
SELECT * FROM velocity
WHERE velocity_percentile <= 10
  AND volume_percentile >= 50
```

**Metrics:**
| Metric | Format | Computation |
|--------|--------|-------------|
| Cooling Down | number | `users.length` |
| Current Week Volume | currency | `sum(total_usd_volume)` (current week) |
| Median Volume | currency | `median(total_usd_volume)` |
| Median Swaps | number | `median(swap_count)` |

**Growth Question:** "Who is declining before they fully churn? Early warning system."

---

## Summary Table

| # | Segment | Percentile Definition | Hardcoded Proxy | Color |
|---|---------|----------------------|-----------------|-------|
| 1 | Whales | `volume_pctl >= 95` | `volume >= $196K` | `#3B82F6` |
| 2 | Mid-Tier | `volume_pctl 75-95` | `$53K <= volume < $196K` | `#06B6D4` |
| 3 | Streak Masters | `freq_pctl >= 95` | `swaps >= 500` | `#14B8A6` |
| 4 | Lapsed Whales | `volume_pctl >= 90` + inactive 14d | `volume >= $119K` + 14-28d ago | `#EF4444` |
| 5 | Consistent Traders | `freq_pctl 50-95` | `200 <= swaps < 500` | `#F59E0B` |
| 6 | Accumulators | `flow_pctl >= 75` | `net_flow > 0` (sorted DESC) | `#10B981` |
| 7 | Distributors | `flow_pctl <= 25` | `net_flow < 0` (sorted ASC) | `#F43F5E` |
| 8 | Active Small | `freq >= 50th AND size < 50th` | `swaps >= 100 AND avg <= $200` | `#8B5CF6` |
| 9 | New Users | `first_trade >= 7d ago` | `swaps = 1` in last 7d | `#EC4899` |
| 10 | At-Risk Mid-Tier | `volume 75-95th` + `velocity < 25th` | Mid-tier + 7-30d inactive | `#EAB308` |
| 11 | One-and-Done | `swaps = 1` + `first_trade < 7d ago` | `swaps = 1` in 7-60d window | `#6B7280` |
| 12 | Rising Stars | `velocity_pctl >= 90` | `velocity >= 1.5x` + `min $1K` | `#22C55E` |
| 13 | Cooling Down | `velocity_pctl <= 10` + `volume >= 50th` | `velocity <= 0.5x` + `prev >= $50K` | `#F97316` |

---

## Implementation Notes

### Why Hardcoded Thresholds?

1. **Cube.js Limitation** - Cube.js does not support SQL window functions like `NTILE()`, `PERCENTILE_CONT()`, or `PERCENT_RANK()`. All aggregations must be pre-defined measures.

2. **Historical Derivation** - The hardcoded values ($196K, $53K, 500 swaps, etc.) were derived from historical data analysis at a specific point in time.

3. **Drift Risk** - As the user base grows or market conditions change, these thresholds may no longer accurately represent the intended percentiles. Regular recalibration is recommended.

### Production Recommendations

For true percentile-based segmentation in production:

1. **Pre-compute percentiles** in a data pipeline (dbt, Airflow, etc.) and store as columns
2. **Use SQL window functions** directly if querying a warehouse (Snowflake, BigQuery, Postgres)
3. **Recalibrate thresholds quarterly** by running percentile analysis on current data
4. **Consider dynamic thresholds** - compute percentile boundaries daily and store in a config table

### Velocity Segment Complexity

Rising Stars and Cooling Down require:
1. Two separate Cube.js queries (current week + previous week)
2. Client-side join by `fee_payer`
3. Client-side velocity ratio computation
4. Client-side filtering based on ratio thresholds

This adds latency and complexity. For production, consider pre-computing velocity metrics in the data pipeline.

---

## Threshold Calibration Reference

These thresholds should be recalibrated periodically. Run this analysis quarterly:

```sql
-- Volume percentiles
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_usd_volume) as p50_volume,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_usd_volume) as p75_volume,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_usd_volume) as p90_volume,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_usd_volume) as p95_volume
FROM user_axiom_volume
WHERE aggregation_date >= CURRENT_DATE - INTERVAL '30 days';

-- Frequency percentiles
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY swap_count) as p50_swaps,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY swap_count) as p75_swaps,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY swap_count) as p90_swaps,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY swap_count) as p95_swaps
FROM user_axiom_volume
WHERE aggregation_date >= CURRENT_DATE - INTERVAL '30 days';
```

Update the hardcoded values in `/src/lib/cube.ts` based on the results.
