# Axiom User Segments

## Overview

This document describes all user segments in the Axiom Dashboard, including their definitions, query logic, and strategic use cases.

### Data Source

All segments query the `user_axiom_volume` cube which aggregates user trading activity with the following measures:
- `total_usd_volume` - Total trading volume in USD
- `swap_count` - Number of swaps executed
- `avg_swap_size` - Average trade size (volume / swaps)
- `net_usd1_flow` - Net capital flow (positive = buying, negative = selling)

### Threshold Rationale

Volume thresholds are based on statistical analysis of user behavior:

| Percentile | Volume Threshold | Description |
|------------|------------------|-------------|
| p75 | $53K | Top 25% of traders |
| p90 | $119K | Top 10% of traders |
| p95 | $196K | Top 5% of traders (Whales) |

The top 5% of traders drive approximately 36% of total platform volume.

---

## Volume-Based Segments

### 1. Whales

**Definition:** Top 5% traders with $196K+ volume in 30 days

| Property | Value |
|----------|-------|
| Color | `#3B82F6` (Blue) |
| Time Range | Last 30 days |
| Order By | Volume descending |

**Query Logic:**
```
WHERE total_usd_volume >= $196,000
  AND aggregation_date IN last 30 days
ORDER BY total_usd_volume DESC
```

**Strategic Value:**
- VIP users driving disproportionate platform revenue
- Losing even one whale has significant business impact
- Ideal targets for white-glove service, early feature access, retention programs
- Monitor for churn signals (declining activity, reduced trade sizes)

---

### 2. Mid-Tier Traders

**Definition:** Regular traders with $53K-$196K volume (p75-p95)

| Property | Value |
|----------|-------|
| Color | `#06B6D4` (Cyan) |
| Time Range | Last 30 days |
| Order By | Volume descending |

**Query Logic:**
```
WHERE total_usd_volume >= $53,000
  AND total_usd_volume < $196,000
  AND aggregation_date IN last 30 days
ORDER BY total_usd_volume DESC
```

**Sub-tiers for Pipeline Tracking:**
| Tier | Range | Description |
|------|-------|-------------|
| Hot Prospects | $175K-$196K | One good month away from whale status |
| Building Momentum | $125K-$175K | Showing strong commitment |
| Developing | $75K-$125K | Established but need nurturing |
| Just Entered | $53K-$75K | Recently crossed into mid-tier |

**Strategic Value:**
- Pipeline to whale status - largest pool of potential high-value users
- ~50% are limited by trade size, not frequency
- Focus growth strategy on encouraging larger trades

---

### 3. Lapsed Power Users

**Definition:** Power users ($119K+ volume) who were active 14-28 days ago but not in the last 14 days

| Property | Value |
|----------|-------|
| Color | `#EF4444` (Red) |
| Time Range | 28 to 14 days ago |
| Order By | Volume descending |

**Query Logic:**
```
WHERE total_usd_volume >= $119,000
  AND aggregation_date BETWEEN (today - 28 days) AND (today - 14 days)
ORDER BY total_usd_volume DESC
```

**Strategic Value:**
- High-value users showing early churn signals
- Still recent enough to win back with targeted outreach
- Understanding why they left can reveal product issues or competitive threats
- ROI on re-engagement is high given their proven spending capacity

---

## Activity-Based Segments

### 4. Streak Masters

**Definition:** Highly active traders with 500+ swaps in 30 days

| Property | Value |
|----------|-------|
| Color | `#14B8A6` (Teal) |
| Time Range | Last 30 days |
| Order By | Swap count descending |

**Query Logic:**
```
WHERE swap_count >= 500
  AND aggregation_date IN last 30 days
ORDER BY swap_count DESC
```

**Strategic Value:**
- Most engaged power users (16+ trades per day average)
- Strong product-market fit indicators - built trading into daily routine
- Best candidates for referral programs (high engagement = likely to recommend)
- Monitor for burnout or platform fatigue
- Good cohort for beta testing new features

---

### 5. Consistent Traders

**Definition:** Regular active traders with 200-500 swaps in 30 days

| Property | Value |
|----------|-------|
| Color | `#F59E0B` (Amber) |
| Time Range | Last 30 days |
| Order By | Swap count descending |

**Query Logic:**
```
WHERE swap_count >= 200
  AND swap_count < 500
  AND aggregation_date IN last 30 days
ORDER BY swap_count DESC
```

**Strategic Value:**
- Reliable, habitual users (7-16 trades per day average)
- More sustainable engagement pattern than Streak Masters
- Pipeline to become Streak Masters with the right incentives
- Good cohort for feature adoption campaigns
- Lower churn risk due to established habits

---

### 6. Active Small Traders

**Definition:** High frequency (100+ trades) but small average size ($200 or less)

| Property | Value |
|----------|-------|
| Color | `#8B5CF6` (Purple) |
| Time Range | Last 30 days |
| Order By | Swap count descending |

**Query Logic:**
```
WHERE swap_count >= 100
  AND avg_swap_size <= $200
  AND aggregation_date IN last 30 days
ORDER BY swap_count DESC
```

**Strategic Value:**
- Highly engaged but capital-constrained users
- Strong product affinity (they keep coming back despite small trades)
- Growth potential if their financial situation changes
- Good candidates for:
  - Educational content about larger position sizing
  - Loyalty rewards that compound with activity
  - Referral programs (high engagement = likely to share)
- May indicate users who are learning/experimenting

---

## Flow-Based Segments

### 7. Accumulators

**Definition:** Top net buyers (highest positive USD1 inflow)

| Property | Value |
|----------|-------|
| Color | `#10B981` (Green) |
| Time Range | Last 30 days |
| Order By | Net USD1 flow descending |

**Query Logic:**
```
WHERE aggregation_date IN last 30 days
ORDER BY net_usd1_flow DESC
```

**Strategic Value:**
- Users who are net adding capital to the ecosystem
- Bullish sentiment indicators - buying more than selling
- High lifetime value potential (actively growing their positions)
- Good targets for:
  - Premium features that help manage larger portfolios
  - Advanced trading tools
  - VIP programs
- Can indicate confidence in the platform/market

---

### 8. Distributors

**Definition:** Top net sellers (highest negative USD1 outflow)

| Property | Value |
|----------|-------|
| Color | `#F43F5E` (Rose) |
| Time Range | Last 30 days |
| Order By | Net USD1 flow ascending |

**Query Logic:**
```
WHERE aggregation_date IN last 30 days
ORDER BY net_usd1_flow ASC
```

**Strategic Value:**
- Users who are net removing capital from the ecosystem
- Early warning system for churn or market sentiment shifts
- Not necessarily bad - could be:
  - Taking profits (healthy behavior)
  - Rebalancing portfolios
  - Moving to competitors (concerning)
  - Life circumstances requiring liquidity
- Worth investigating reasons through surveys or outreach
- Monitor if the same users appear repeatedly

---

## Lifecycle Segments

### 9. New Users

**Definition:** First-time traders in the last 7 days (users with exactly 1 swap)

| Property | Value |
|----------|-------|
| Color | `#EC4899` (Pink) |
| Time Range | Last 7 days |
| Granularity | Daily |

**Query Logic:**
```
WHERE swap_count = 1
  AND aggregation_date IN last 7 days
```

**Strategic Value:**
- Critical for measuring acquisition funnel health
- First-trade experience determines long-term retention
- Key questions to answer:
  - What's the conversion rate from signup to first trade?
  - How many new users return for a second trade?
  - What's the average first trade size?
- Good cohort for:
  - Onboarding optimization experiments
  - Welcome sequences and education
  - First-week engagement campaigns
- Trend analysis shows acquisition momentum

---

## Velocity Segments (Week-over-Week Comparison)

These segments use a **dual-query pattern** comparing current week to previous week activity.

### 10. Rising Stars

**Definition:** Users with 1.5x+ week-over-week volume growth (minimum $1K current week)

| Property | Value |
|----------|-------|
| Color | `#22C55E` (Green) |
| Current Period | Last 7 days |
| Comparison Period | 7-14 days ago |
| Velocity Threshold | 1.5x (50% growth) |

**Query Logic:**
```
-- Current Week Query
SELECT fee_payer, total_usd_volume as current_volume
WHERE total_usd_volume >= $1,000
  AND aggregation_date IN last 7 days

-- Previous Week Query
SELECT fee_payer, total_usd_volume as previous_volume
WHERE aggregation_date BETWEEN (today - 14 days) AND (today - 7 days)

-- Client-side join and filter
WHERE current_volume >= 1.5 * previous_volume
  AND previous_volume > 0  -- Exclude brand new users
ORDER BY (current_volume / previous_volume) DESC
```

**Strategic Value:**
- Catches users while they're surging to reinforce behavior
- Don't wait 30 days for them to hit "Whale" bucket
- Real-time growth signal vs lagging 30-day metrics
- Ideal for:
  - Immediate recognition/rewards
  - Personalized outreach while momentum is high
  - Understanding what's driving the surge

---

### 11. Cooling Down

**Definition:** Users with 50%+ week-over-week volume decline (was $50K+ last week)

| Property | Value |
|----------|-------|
| Color | `#F97316` (Orange) |
| Current Period | Last 7 days |
| Comparison Period | 7-14 days ago |
| Velocity Threshold | 0.5x (50% decline) |

**Query Logic:**
```
-- Current Week Query
SELECT fee_payer, total_usd_volume as current_volume
WHERE aggregation_date IN last 7 days

-- Previous Week Query (only users with $50K+)
SELECT fee_payer, total_usd_volume as previous_volume
WHERE total_usd_volume >= $50,000
  AND aggregation_date BETWEEN (today - 14 days) AND (today - 7 days)

-- Client-side join and filter
WHERE current_volume <= 0.5 * previous_volume
  AND current_volume > 0  -- Still has some activity
ORDER BY (current_volume / previous_volume) ASC
```

**Strategic Value:**
- Early warning system before full churn
- Catches decline before they drop out of 30-day segments
- High-value users worth immediate intervention
- Can identify:
  - Platform issues affecting specific users
  - Competitive threats
  - Market-driven behavior changes

---

## Retention Gap Segments

### 12. At-Risk Mid-Tier

**Definition:** Mid-tier traders ($53K-$196K volume) inactive for 7-30 days

| Property | Value |
|----------|-------|
| Color | `#EAB308` (Yellow) |
| Time Range | 30 to 7 days ago |
| Order By | Volume descending |

**Query Logic:**
```
WHERE total_usd_volume >= $53,000
  AND total_usd_volume < $196,000
  AND aggregation_date BETWEEN (today - 30 days) AND (today - 7 days)
ORDER BY total_usd_volume DESC
```

**Strategic Value:**
- Mid-tier users don't get whale-level attention but still valuable
- Automate "we miss you" campaigns at scale
- Different from Lapsed Power Users (lower threshold, broader net)
- ROI-positive re-engagement campaigns

---

### 13. One-and-Done

**Definition:** Users who made exactly 1 trade 7+ days ago and never returned

| Property | Value |
|----------|-------|
| Color | `#6B7280` (Gray) |
| Time Range | 60 to 7 days ago |
| Order By | Volume descending |

**Query Logic:**
```
WHERE swap_count = 1
  AND aggregation_date BETWEEN (today - 60 days) AND (today - 7 days)
ORDER BY total_usd_volume DESC
```

**Strategic Value:**
- Measures activation failure rate
- Different from "New Users" (tracks failed activation, not fresh traffic)
- Indicates onboarding/trust issues
- Key questions:
  - Did they have a bad experience?
  - Was the product confusing?
  - Did they find a competitor?
- Campaigns need re-education/trust building, not engagement

---

## Segment Matrix

| Segment | Primary Metric | Growth Lever | Risk Signal |
|---------|---------------|--------------|-------------|
| Whales | Volume | Retention, ARPU | Any decline |
| Mid-Tier | Volume | Conversion to Whale | Stagnation |
| Lapsed Power Users | Recency | Win-back | Already churning |
| Streak Masters | Frequency | Referrals | Burnout |
| Consistent Traders | Frequency | Upgrade to Streak | Declining frequency |
| Active Small | Frequency | Trade size | Capital constraints |
| Accumulators | Net Flow | Upsell | Reversal to selling |
| Distributors | Net Flow | Retention | Sustained outflow |
| New Users | Count | Activation | Low conversion |
| Rising Stars | Velocity | Reinforce growth | N/A (positive signal) |
| Cooling Down | Velocity | Intervention | Already declining |
| At-Risk Mid-Tier | Recency | Automated win-back | 7+ days inactive |
| One-and-Done | Activation | Re-education | Failed activation |

---

## Recommended Actions by Segment

| Segment | Recommended Actions |
|---------|---------------------|
| **Whales** | Personal outreach, priority support, exclusive features, churn prevention |
| **Mid-Tier** | Gamification toward whale status, trade size incentives, progress tracking |
| **Lapsed Power Users** | Win-back campaigns, exit surveys, competitive analysis |
| **Streak Masters** | Referral programs, beta access, community leadership roles |
| **Consistent Traders** | Streak challenges, frequency rewards, feature education |
| **Active Small** | Education content, position sizing guides, loyalty programs |
| **Accumulators** | Portfolio tools, premium features, VIP treatment |
| **Distributors** | Exit surveys, retention offers, understand motivations |
| **New Users** | Onboarding optimization, second-trade incentives, education |
| **Rising Stars** | Immediate recognition, personalized outreach, understand what's working |
| **Cooling Down** | Urgent intervention, exit surveys, competitive intel |
| **At-Risk Mid-Tier** | Automated "we miss you" campaigns, market updates, re-engagement offers |
| **One-and-Done** | Re-education campaigns, trust building, simplified onboarding |

---

## Technical Implementation

### Query Limits

All segments are configured with a limit of **10,000 users** per query to balance data coverage with performance.

### Velocity Segment Implementation

Rising Stars and Cooling Down use a dual-query pattern:

1. **Current Period Query** - Fetch users active in last 7 days
2. **Comparison Period Query** - Fetch users active 7-14 days ago
3. **Client-side Join** - Match users by `fee_payer` wallet address
4. **Velocity Calculation** - Compute `current_volume / previous_volume`
5. **Filter & Sort** - Apply threshold filter and sort by velocity ratio

This approach enables week-over-week comparison without requiring pre-computed velocity measures in the cube.
