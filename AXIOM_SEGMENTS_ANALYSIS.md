# Axiom User Segments - CDP Framework

**Protocol:** Axiom (USD1 Trading)
**Analysis Date:** January 20, 2026
**Approach:** Percentile-based dynamic segmentation

---

## Executive Summary

This document defines a **Customer Data Platform (CDP)** segmentation strategy for Axiom using **percentile-based definitions** rather than hard thresholds. Benefits:

1. **Self-adjusting** - Segments scale with user base growth
2. **Market-agnostic** - Works in bull/bear markets
3. **Relative positioning** - Always know where a user stands vs peers
4. **Consistent sizing** - "Top 5%" is always 5% of users

### Why Percentiles > Hard Thresholds

| Approach | Example | Problem |
|----------|---------|---------|
| Hard threshold | Whale = $196K+ | In a bull market, this might be 20% of users. In bear, 1%. |
| Percentile | Whale = Top 5% | Always 5%, definition adjusts to market conditions |

---

## 1. Percentile-Based Segment Definitions

### 1.1 Value Tiers (by Volume)

| Segment | Percentile Definition | ~Current Threshold | Justification |
|---------|----------------------|-------------------|---------------|
| **Whales** | Top 5% (p95+) | ~$196K | Revenue defense. Drive 36% of volume. |
| **Mid-Tier** | p75 - p95 | ~$53K - $196K | Growth pipeline. Upsell potential. |
| **Core** | p25 - p75 | ~$5K - $53K | The backbone. Reliable baseline. |
| **Casual** | Bottom 25% (p0 - p25) | <$5K | Low value, high volume of users. |

```sql
-- Value tier assignment
SELECT
  fee_payer,
  total_volume,
  NTILE(100) OVER (ORDER BY total_volume) as volume_percentile,
  CASE
    WHEN NTILE(100) OVER (ORDER BY total_volume) >= 95 THEN 'whale'
    WHEN NTILE(100) OVER (ORDER BY total_volume) >= 75 THEN 'mid_tier'
    WHEN NTILE(100) OVER (ORDER BY total_volume) >= 25 THEN 'core'
    ELSE 'casual'
  END as value_tier
FROM user_stats;
```

---

### 1.2 Engagement Tiers (by Frequency)

| Segment | Percentile Definition | ~Current Threshold | Justification |
|---------|----------------------|-------------------|---------------|
| **Power Users** | Top 5% by swap count | ~500+ swaps | The addicts. Drive DAU. |
| **Regular** | p50 - p95 by swaps | ~50-500 swaps | Consistent engagement. |
| **Occasional** | p10 - p50 by swaps | ~5-50 swaps | Periodic users. |
| **Dormant** | Bottom 10% by swaps | <5 swaps | At risk or churned. |

```sql
SELECT
  fee_payer,
  swap_count,
  NTILE(100) OVER (ORDER BY swap_count) as frequency_percentile,
  CASE
    WHEN NTILE(100) OVER (ORDER BY swap_count) >= 95 THEN 'power_user'
    WHEN NTILE(100) OVER (ORDER BY swap_count) >= 50 THEN 'regular'
    WHEN NTILE(100) OVER (ORDER BY swap_count) >= 10 THEN 'occasional'
    ELSE 'dormant'
  END as engagement_tier
FROM user_stats;
```

---

### 1.3 Flow Segments (by Net Position)

| Segment | Percentile Definition | Justification |
|---------|----------------------|---------------|
| **Strong Accumulator** | Top 10% net inflow | Bullish. Betting big on ecosystem. |
| **Accumulator** | p50 - p90 net inflow | Net buyers. |
| **Neutral** | p25 - p75 (around zero) | Balanced trading. |
| **Distributor** | p10 - p50 net outflow | Net sellers. |
| **Strong Distributor** | Bottom 10% (high outflow) | Exit risk. Cashing out. |

```sql
SELECT
  fee_payer,
  net_usd1_flow,
  NTILE(100) OVER (ORDER BY net_usd1_flow) as flow_percentile,
  CASE
    WHEN NTILE(100) OVER (ORDER BY net_usd1_flow) >= 90 THEN 'strong_accumulator'
    WHEN NTILE(100) OVER (ORDER BY net_usd1_flow) >= 50 THEN 'accumulator'
    WHEN NTILE(100) OVER (ORDER BY net_usd1_flow) >= 25 THEN 'neutral'
    WHEN NTILE(100) OVER (ORDER BY net_usd1_flow) >= 10 THEN 'distributor'
    ELSE 'strong_distributor'
  END as flow_segment
FROM user_stats;
```

---

### 1.4 Velocity Segments (by WoW Change)

| Segment | Definition | Justification |
|---------|------------|---------------|
| **Surging** | Top 10% WoW growth | Rapidly increasing activity. |
| **Growing** | p50 - p90 growth | Positive momentum. |
| **Stable** | p25 - p75 (±20% change) | Consistent behavior. |
| **Declining** | p10 - p50 decline | Negative momentum. |
| **Churning** | Bottom 10% (>50% decline) | High churn risk. |

```sql
WITH velocity AS (
  SELECT
    fee_payer,
    (current_week_vol - prev_week_vol) / NULLIF(prev_week_vol, 0) as wow_change
  FROM weekly_volumes
)
SELECT
  fee_payer,
  wow_change,
  NTILE(100) OVER (ORDER BY wow_change) as velocity_percentile,
  CASE
    WHEN NTILE(100) OVER (ORDER BY wow_change) >= 90 THEN 'surging'
    WHEN NTILE(100) OVER (ORDER BY wow_change) >= 50 THEN 'growing'
    WHEN wow_change BETWEEN -0.2 AND 0.2 THEN 'stable'
    WHEN NTILE(100) OVER (ORDER BY wow_change) >= 10 THEN 'declining'
    ELSE 'churning'
  END as velocity_segment
FROM velocity;
```

---

### 1.5 Lifecycle Segments (Time-Based)

| Segment | Definition | Justification |
|---------|------------|---------------|
| **New** | First trade within 7 days | Activation critical period. |
| **Activated** | 2+ trades, joined 7-30 days ago | Successfully onboarded. |
| **Established** | Active 30+ days | Habit formed. |
| **Lapsed** | No trade in 14+ days (was active) | Win-back opportunity. |
| **Churned** | No trade in 30+ days | Likely gone. |

```sql
SELECT
  fee_payer,
  first_trade_date,
  last_trade_date,
  CASE
    WHEN first_trade_date >= NOW() - INTERVAL '7 days' THEN 'new'
    WHEN last_trade_date < NOW() - INTERVAL '30 days' THEN 'churned'
    WHEN last_trade_date < NOW() - INTERVAL '14 days' THEN 'lapsed'
    WHEN first_trade_date >= NOW() - INTERVAL '30 days' THEN 'activated'
    ELSE 'established'
  END as lifecycle_stage
FROM user_stats;
```

---

### 1.6 Composite CDP Profile

Combine dimensions for rich user profiles:

```sql
SELECT
  fee_payer,
  value_tier,           -- whale, mid_tier, core, casual
  engagement_tier,      -- power_user, regular, occasional, dormant
  flow_segment,         -- accumulator, neutral, distributor
  velocity_segment,     -- surging, growing, stable, declining, churning
  lifecycle_stage,      -- new, activated, established, lapsed, churned
  -- Percentile scores (0-100)
  volume_percentile,
  frequency_percentile,
  flow_percentile,
  velocity_percentile
FROM user_cdp_profile;

-- Example output:
-- fee_payer | whale | power_user | accumulator | stable | established | 97 | 98 | 85 | 55
-- fee_payer | mid_tier | regular | distributor | declining | lapsed | 82 | 65 | 22 | 18
```

---

## 2. CDP Segment → CRM Action Mapping

### 2.1 Action Matrix by Percentile Tier

Actions are tied to percentile tiers, not absolute dollar amounts. This ensures campaigns scale with market conditions.

#### By Value Tier

| Percentile | Tier | CRM Actions |
|------------|------|-------------|
| **p95+** | Whale | VIP white-glove outreach, dedicated account manager, early access to new features, satisfaction surveys |
| **p75-95** | Mid-Tier | Volume incentive campaigns, feature upsells, referral program invites |
| **p25-75** | Core | Standard nurture sequences, educational content, community events |
| **p0-25** | Casual | Light-touch engagement, re-activation campaigns after dormancy |

#### By Engagement Tier

| Percentile | Tier | CRM Actions |
|------------|------|-------------|
| **p95+** | Power User | Gamification (streaks, badges), beta tester invites, feedback requests |
| **p50-95** | Regular | Consistent nurture, engagement milestone rewards |
| **p10-50** | Occasional | Activation nudges, feature education |
| **p0-10** | Dormant | Re-engagement campaigns, "we miss you" emails |

#### By Flow Segment

| Percentile | Segment | CRM Actions |
|------------|---------|-------------|
| **p90+** | Strong Accumulator | Staking offers, long-term holder benefits, yield products |
| **p50-90** | Accumulator | DCA feature promotion, portfolio tracking tools |
| **p25-75** | Neutral | Balanced product suite, market insights |
| **p10-50** | Distributor | Yield opportunities, liquidity incentives |
| **p0-10** | Strong Distributor | Exit survey, win-back offers, alternative products |

#### By Velocity Segment

| Segment | CRM Actions |
|---------|-------------|
| **Surging** (p90+) | Referral ask while hot, testimonial capture, upsell now |
| **Growing** (p50-90) | Momentum recognition, next-tier incentives |
| **Stable** (middle) | Loyalty rewards, habit reinforcement |
| **Declining** (p10-50) | Early intervention, re-engagement offers |
| **Churning** (p0-10) | Urgent win-back, satisfaction survey, exit interview |

#### By Lifecycle Stage

| Stage | Timeframe | CRM Actions |
|-------|-----------|-------------|
| **New** | First 7 days | Onboarding drip, first trade celebration, feature education |
| **Activated** | Day 7-30 | Deepening engagement, second action nudge, community invite |
| **Established** | 30+ days | Loyalty program, referral incentives, beta access |
| **Lapsed** | No trade 14+ days | Re-engagement sequence, "what's new" updates |
| **Churned** | No trade 30+ days | Feedback survey, win-back offer, then sunset |

### 2.2 Composite Profile Actions

Use multiple dimensions to personalize actions:

```sql
-- Example: High-value users showing decline need urgent intervention
SELECT fee_payer, email
FROM user_cdp_profile u
WHERE value_tier = 'whale'
  AND velocity_segment IN ('declining', 'churning')
  AND email_opt_in = true;
-- Action: VIP retention call + personalized win-back offer

-- Example: New users with high engagement = future whales
SELECT fee_payer
FROM user_cdp_profile
WHERE lifecycle_stage = 'new'
  AND engagement_tier = 'power_user';
-- Action: Fast-track to VIP program, early relationship building
```

### 2.3 Segment Exclusions

| Condition | Action | Reason |
|-----------|--------|--------|
| `classification = 'likely_bot'` | Exclude from ALL email | Bots don't read email |
| `gaming_risk = 'HIGH'` | Exclude from testimonials | Avoid promoting bad actors |
| `lifecycle = 'churned'` + 90 days | Archive | Respect their choice |

---

## 3. Value Metrics by Segment

### 3.1 Primary Value Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total Volume** | USD value of all trades | `SUM(uiAmountIn)` for buys + `SUM(uiAmountOut)` for sells |
| **Swap Count** | Number of trades | `COUNT(*)` |
| **Avg Swap Size** | Average trade value | `total_volume / swap_count` |
| **Net USD1 Flow** | Buy vs sell pressure | `SUM(buy_usd1) - SUM(sell_usd1)` |
| **PNL** | Realized + unrealized profit | Complex VWAP calculation |

### 2.2 Segment Value Distribution (Estimated)

```
Value Contribution by Segment:

Whales (5%)        ████████████████████████████████████ 36%
Mid-Tier (20%)     ██████████████████████████████ 30%
Consistent (15%)   ████████████████ 16%
Active Small (25%) ████████████ 12%
New Users (20%)    ██████ 6%
Others (15%)       ████ 4%
```

### 2.3 Segment Characteristics

| Segment | Avg Volume | Avg Swaps | Avg Size | Typical PNL Range |
|---------|------------|-----------|----------|-------------------|
| Whales | $350K | 800 | $437 | -$50K to +$100K |
| Mid-Tier | $95K | 400 | $237 | -$10K to +$20K |
| Streak Masters | $120K | 650 | $185 | -$15K to +$25K |
| Consistent | $45K | 300 | $150 | -$5K to +$10K |
| Active Small | $12K | 180 | $67 | -$2K to +$3K |
| Rising Stars | $8K | 120 | $67 | -$1K to +$5K |
| New Users | $500 | 3 | $167 | -$200 to +$500 |

---

## 3. Gaming Risk by Segment

### 3.1 Risk Profile Matrix

| Segment | Volume Dominance Risk | Coordination Risk | Wash Trading Risk | Overall Risk |
|---------|----------------------|-------------------|-------------------|--------------|
| Whales | **High** | Medium | Low | **High** |
| Mid-Tier | Medium | Medium | Medium | Medium |
| Streak Masters | Medium | Low | **High** | Medium |
| Consistent | Low | Low | Medium | Low |
| Active Small | Low | Low | **High** | Medium |
| Rising Stars | **High** | **High** | Medium | **High** |
| New Users | Medium | **High** | Low | Medium |

### 3.2 Rationale

**Whales - High Risk:**
- Large volume can naturally dominate low-liquidity tokens
- High incentive to game PNL leaderboards
- Can coordinate with other whales

**Rising Stars - High Risk:**
- Rapid growth pattern matches coordination ring behavior
- New accounts with sudden high PNL are suspicious
- Often the "beneficiary" wallets in pump schemes

**Streak Masters - Medium Risk:**
- High swap count enables rapid reversal patterns
- Could be legitimate scalpers OR wash traders
- Need to distinguish by PNL efficiency

**Active Small - Medium Risk:**
- High frequency, low value = potential wash trading
- Many small trades can manipulate VWAP
- Low individual impact but high aggregate risk

---

## 4. Segmentation Analysis Metrics

### 4.1 Purpose: Understanding User Behavior

These thresholds are for **analysis and segmentation**, not for filtering incentive payouts. They help us:
- Understand trading patterns within each segment
- Identify outliers for further investigation
- Inform CRM strategy (who to contact, how)
- Track segment health over time

**Note:** Incentive system rules (leaderboard eligibility, payout caps) are separate decisions made by the business team.

### 4.2 Behavioral Metrics by Segment

| Segment | Typical Volume Dominance | Typical Token Concentration | Typical PNL Efficiency | Notes |
|---------|-------------------------|----------------------------|----------------------|-------|
| **Whales** | 10-40% | 30-60% | $200-500/1K | High volume, can naturally dominate smaller tokens |
| **Mid-Tier** | 5-20% | 40-70% | $150-400/1K | Diverse trading, moderate concentration |
| **Streak Masters** | 5-15% | 50-80% | $100-300/1K | Many small trades, often focused on few tokens |
| **Consistent** | 3-10% | 40-60% | $100-250/1K | Steady, diversified |
| **Active Small** | 1-5% | 60-90% | $50-200/1K | Small size, high concentration is normal |
| **Rising Stars** | Varies | Varies | Varies | **Investigate** - rapid growth can be legitimate or gaming |
| **New Users** | 1-10% | 70-100% | Varies | High concentration normal (only traded 1-2 tokens) |

### 4.3 Outlier Detection (For Analysis)

Flag users for **investigation** (not automatic exclusion) when metrics are unusual for their segment:

| Metric | "Normal" Range | Outlier Threshold | What It Might Mean |
|--------|---------------|-------------------|-------------------|
| Volume Dominance | <30% | >50% | Could be market maker, whale, or manipulator |
| Token Concentration | <70% | >90% | Focused strategy OR single-token gaming |
| PNL Efficiency | <$300/1K | >$500/1K | Skilled trader OR insider/gaming |
| Same-second trades | 0 | >0 | Coordination OR arbitrage bot |
| Rapid reversals | <5/day | >20/day | Scalper OR wash trading |

### 4.4 Segment Health Indicators

Track these metrics **per segment** to understand behavior:

```sql
-- Segment behavior analysis (not for filtering)
SELECT
  segment,
  COUNT(*) as user_count,
  AVG(volume_dominance) as avg_dominance,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY volume_dominance) as median_dominance,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY volume_dominance) as p95_dominance,
  AVG(token_concentration) as avg_concentration,
  AVG(pnl_efficiency) as avg_efficiency,
  COUNT(*) FILTER (WHERE pnl_efficiency > 500) as high_efficiency_count
FROM user_analysis
JOIN user_segments USING (fee_payer)
GROUP BY segment
ORDER BY user_count DESC;
```

### 4.5 Investigation Triggers

When a user's metrics are **unusual for their segment**, flag for review:

| Segment | Trigger Condition | Investigation Question |
|---------|------------------|----------------------|
| Whale | Dominance >60% on low-liquidity token | Market making or manipulation? |
| Rising Star | PNL efficiency >$400/1K | Skill or coordination ring? |
| Active Small | >100 trades/day, <5s between trades | Human or bot? |
| New User | >$5K PNL in first week | Legitimate alpha or exit wallet? |
| Alpha Winner candidate | Any coordination signals | Verify before promoting |

### 4.6 Bot vs Human Classification

For Active Small segment, classify (don't auto-exclude):

```sql
SELECT
  fee_payer,
  CASE
    WHEN trades_per_day > 50
         AND avg_time_between_trades < INTERVAL '5 seconds'
         AND trade_size_stddev / avg_trade_size < 0.1
    THEN 'likely_bot'
    WHEN trades_per_day > 20
         AND avg_time_between_trades < INTERVAL '30 seconds'
    THEN 'possible_bot'
    ELSE 'likely_human'
  END as classification
FROM trade_patterns;
```

**Use this for:**
- Excluding bots from marketing emails
- Segmenting volume metrics (human vs bot volume)
- Understanding true user engagement

---

## 5. Segment Analysis Queries

### 5.1 Segment Distribution Over Time

Track how segment sizes change:

```sql
SELECT
  DATE_TRUNC('week', aggregation_date) as week,
  segment,
  COUNT(DISTINCT fee_payer) as user_count,
  SUM(total_volume) as segment_volume
FROM user_segments
JOIN user_axiom_volume USING (fee_payer)
GROUP BY 1, 2
ORDER BY 1, 2;
```

### 5.2 Segment Behavior Comparison

Understand what's "normal" for each segment:

```sql
SELECT
  segment,
  COUNT(*) as users,
  -- Volume metrics
  ROUND(AVG(total_volume)) as avg_volume,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_volume)) as median_volume,
  -- Behavior metrics
  ROUND(AVG(volume_dominance), 3) as avg_dominance,
  ROUND(AVG(token_concentration), 3) as avg_concentration,
  ROUND(AVG(pnl_efficiency)) as avg_efficiency,
  -- Outlier counts
  COUNT(*) FILTER (WHERE volume_dominance > 0.5) as high_dominance_count,
  COUNT(*) FILTER (WHERE pnl_efficiency > 500) as high_efficiency_count
FROM user_analysis
JOIN user_segments USING (fee_payer)
GROUP BY segment
ORDER BY users DESC;
```

### 5.3 Segment Transition Analysis

Who moves between segments?

```sql
WITH current_segments AS (
  SELECT fee_payer, segment as current_segment
  FROM user_segments
  WHERE as_of_date = CURRENT_DATE
),
previous_segments AS (
  SELECT fee_payer, segment as previous_segment
  FROM user_segments
  WHERE as_of_date = CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  previous_segment,
  current_segment,
  COUNT(*) as transitions
FROM previous_segments p
JOIN current_segments c USING (fee_payer)
WHERE previous_segment != current_segment
GROUP BY 1, 2
ORDER BY transitions DESC;
```

### 5.4 Rising Star Investigation

Are Rising Stars legitimate or suspicious?

```sql
SELECT
  fee_payer,
  total_pnl,
  wow_growth,
  volume_dominance,
  token_concentration,
  pnl_efficiency,
  unique_tokens_traded,
  same_second_trade_count,
  CASE
    WHEN same_second_trade_count > 0 THEN 'INVESTIGATE: Coordination signal'
    WHEN pnl_efficiency > 500 THEN 'INVESTIGATE: High efficiency'
    WHEN volume_dominance > 0.5 THEN 'INVESTIGATE: High dominance'
    WHEN unique_tokens_traded < 3 THEN 'REVIEW: Low diversity'
    ELSE 'LIKELY LEGIT'
  END as assessment
FROM user_analysis
JOIN user_segments USING (fee_payer)
WHERE segment = 'rising_star'
ORDER BY total_pnl DESC
LIMIT 50;
```

### 5.5 Bot Detection in Active Small

What % of Active Small are likely bots?

```sql
SELECT
  classification,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct,
  SUM(total_volume) as volume,
  ROUND(100.0 * SUM(total_volume) / SUM(SUM(total_volume)) OVER (), 1) as volume_pct
FROM user_segments
JOIN bot_classification USING (fee_payer)
WHERE segment = 'active_small'
GROUP BY classification;

-- Example output:
-- likely_human  | 1200 | 72% | $8M  | 85%
-- possible_bot  | 300  | 18% | $1M  | 10%
-- likely_bot    | 170  | 10% | $500K| 5%
```

---

## 6. CDP Implementation Roadmap

### Phase 1: Foundation (Current) ✅
- [x] Basic segments defined in Cube
- [x] Dashboard showing segment distribution
- [x] Percentile-based segment framework documented

### Phase 2: CDP Profile (This Sprint)
- [ ] Deploy `user_cdp_profile` materialized view
- [ ] Set up daily refresh schedule
- [ ] Add percentile columns to user data exports
- [ ] Connect to CRM for campaign targeting

### Phase 3: Segment Intelligence (Next Sprint)
- [ ] Build segment transition tracking (cohort movements)
- [ ] Create composite scoring for user prioritization
- [ ] Implement bot classification exclusions
- [ ] Add segment health monitoring dashboard

### Phase 4: Campaign Automation
- [ ] Automate segment → campaign mapping
- [ ] Set up trigger-based campaigns (velocity changes, lifecycle transitions)
- [ ] Build A/B testing framework by segment
- [ ] Create personalization rules by percentile tier

### Phase 5: Advanced Analytics (Ongoing)
- [ ] Cohort retention analysis by tier
- [ ] Predictive churn modeling
- [ ] Segment profitability analysis
- [ ] Cross-segment journey mapping

---

## 6.1 Segment Analysis Use Cases

### For Product Team
- Track segment sizes over time (is Whale count growing?)
- Monitor One-and-Done rate (activation problem?)
- Identify what makes Rising Stars different from churned users

### For Marketing/CRM Team
- Target campaigns by segment
- Exclude suspected bots from emails
- Identify Alpha Winner candidates for testimonials

### For Analytics Team
- Investigate outliers within segments
- Understand "normal" behavior per segment
- Detect emerging gaming patterns

### For Business Team (Incentive Decisions)
The segmentation analysis **informs** incentive design, but doesn't dictate it:

| Analysis Finding | Business Decision (Separate) |
|-----------------|------------------------------|
| "60% of Rising Stars have >40% dominance" | Should we cap dominance in leaderboard? |
| "Suspected bots are 15% of Active Small" | Should we exclude bots from rewards? |
| "Coordination rings detected in top 10" | Should we add minimum trader requirements? |

---

## 6.2 CRM Campaign Integration

### Segment → Campaign Mapping

| Segment | Primary Campaign | Pre-Send Check | Notes |
|---------|-----------------|----------------|-------|
| Whales | VIP retention | Verify active | White-glove outreach |
| Mid-Tier | Volume incentive | None | Automated OK |
| Rising Stars | Referral ask | Review if outlier metrics | Strike while hot |
| Cooling Down | Re-engagement | None | Automated OK |
| New Users | Education drip | None | 7-day sequence |
| One-and-Done | Feedback survey | None | Learn, don't sell |
| Alpha Winners | Testimonial ask | Validate behavior first | Only verified winners |
| Suspected Bots | **NONE** | N/A | Exclude from all email |

### Campaign Audiences

```sql
-- Example: Rising Stars referral campaign (exclude outliers)
SELECT fee_payer, email
FROM users u
JOIN user_segments s ON u.fee_payer = s.fee_payer
JOIN user_analysis a ON u.fee_payer = a.fee_payer
WHERE s.segment = 'rising_star'
  AND a.pnl_efficiency < 500  -- Exclude suspicious efficiency
  AND s.classification != 'likely_bot'
  AND u.email_opt_in = true;
```

---

## 7. Complete Segment Reference

### 7.1 Master Reference Table

| Segment | Calculation Condition | CRM Action | Analysis Focus |
|---------|----------------------|------------|----------------|
| **Whales** | `volume_percentile >= 95` | VIP white-glove | Retention, satisfaction |
| **Mid-Tier** | `volume_percentile >= 75 AND volume_percentile < 95` | Volume upsell | Upgrade path |
| **Core** | `volume_percentile >= 25 AND volume_percentile < 75` | Standard nurture | Baseline health |
| **Casual** | `volume_percentile < 25` | Light touch | Activation potential |
| **Lapsed Power** | `last_trade < NOW() - 14 days AND volume_percentile >= 75` | Urgent winback | Why did they leave? |
| **Streak Masters** | `frequency_percentile >= 95` | Gamification | Keep the streak |
| **Consistent** | `frequency_percentile >= 50 AND frequency_percentile < 95` | Loyalty rewards | Maintain engagement |
| **Active Small** | `frequency_percentile >= 50 AND volume_percentile < 50` | Community events | Bot vs human? |
| **Suspected Bots** | `swaps_per_day > 50 AND avg_swap_size < $100` | **NONE** | Monitor for abuse |
| **Accumulators** | `flow_percentile >= 75` (net buyers) | Staking offers | What are they buying? |
| **Distributors** | `flow_percentile < 25` (net sellers) | Yield offers | Keep liquidity |
| **Rising Stars** | `velocity_percentile >= 90` (WoW growth top 10%) | Referral ask | Legit or gaming? |
| **Cooling Down** | `velocity_percentile < 10 AND volume_percentile >= 50` | Re-engagement | What changed? |
| **At-Risk Mid** | `velocity_percentile < 25 AND volume_percentile BETWEEN 50-75` | Automated email | Early intervention |
| **New Users** | `first_trade >= NOW() - 7 days` | Education drip | Activation success? |
| **One-and-Done** | `swap_count = 1 AND first_trade < NOW() - 7 days` | Feedback survey | What went wrong? |
| **Alpha Winners** | `pnl_percentile >= 95 AND gaming_risk = 'LOW'` | Testimonials | Legit alpha? |

### 7.2 Detailed Calculation Logic

```sql
-- Segment assignment priority (evaluated top to bottom, first match wins)
CASE
  -- 1. Bot detection (exclude from all segments)
  WHEN swaps_per_day > 50 AND avg_swap_size < 100 THEN 'suspected_bot'

  -- 2. Lifecycle stages (time-sensitive, highest priority)
  WHEN first_trade >= NOW() - INTERVAL '7 days' THEN 'new_user'
  WHEN swap_count = 1 AND first_trade < NOW() - INTERVAL '7 days' THEN 'one_and_done'
  WHEN last_trade < NOW() - INTERVAL '14 days' AND volume_percentile >= 75 THEN 'lapsed_power'

  -- 3. Velocity segments (behavioral shift detection)
  WHEN velocity_percentile >= 90 AND volume_percentile >= 25 THEN 'rising_star'
  WHEN velocity_percentile < 10 AND volume_percentile >= 50 THEN 'cooling_down'
  WHEN velocity_percentile < 25 AND volume_percentile BETWEEN 50 AND 75 THEN 'at_risk_mid'

  -- 4. Value tiers (volume-based)
  WHEN volume_percentile >= 95 THEN 'whale'
  WHEN volume_percentile >= 75 THEN 'mid_tier'

  -- 5. Engagement patterns (frequency-based)
  WHEN frequency_percentile >= 95 THEN 'streak_master'
  WHEN frequency_percentile >= 50 AND volume_percentile < 50 THEN 'active_small'
  WHEN frequency_percentile >= 50 THEN 'consistent'

  -- 6. Flow patterns (accumulation vs distribution)
  WHEN flow_percentile >= 75 THEN 'accumulator'
  WHEN flow_percentile < 25 THEN 'distributor'

  -- 7. Default
  ELSE 'core'
END as segment
```

### 7.3 Percentile Definitions

| Metric | Calculation | Window |
|--------|-------------|--------|
| `volume_percentile` | `NTILE(100) OVER (ORDER BY total_volume)` | 30 days |
| `frequency_percentile` | `NTILE(100) OVER (ORDER BY swap_count)` | 30 days |
| `flow_percentile` | `NTILE(100) OVER (ORDER BY net_usd1_flow)` | 30 days |
| `velocity_percentile` | `NTILE(100) OVER (ORDER BY wow_change)` | 7 vs 7 days |
| `pnl_percentile` | `NTILE(100) OVER (ORDER BY total_pnl)` | Competition period |

### 7.4 Derived Metrics

| Metric | Formula |
|--------|---------|
| `swaps_per_day` | `swap_count / active_days` |
| `avg_swap_size` | `total_volume / swap_count` |
| `wow_change` | `(current_week_vol - prev_week_vol) / prev_week_vol` |
| `net_usd1_flow` | `SUM(buy_usd1) - SUM(sell_usd1)` |
| `gaming_risk` | Composite of dominance, concentration, efficiency, coordination signals |

### 7.5 Campaign Priority Matrix

```
                    HIGH VALUE
                        ▲
    Lapsed Power   │   Whales
    (URGENT)       │   (PROTECT)
                   │
    ───────────────┼───────────────► HIGH ENGAGEMENT
                   │
    One-and-Done   │   Rising Stars
    (LEARN)        │   (CONVERT - verify first)
                   │
                LOW VALUE
```

### 7.6 Analysis Priority

```
UNDERSTAND FIRST:
1. Rising Stars       → Why are they growing? Skill or gaming?
2. Alpha Winners      → Validate before promoting
3. One-and-Done       → What's the activation blocker?

MONITOR ONGOING:
4. Whales            → Track satisfaction, catch churn early
5. Active Small      → What % are bots?
6. Cooling Down      → Can we re-engage before they churn?

SEGMENT HEALTH:
7. Track segment sizes over time
8. Monitor transitions between segments
9. Compare behavior across segments
```

---

## 8. Success Metrics

### 8.1 Segment Health KPIs

| Metric | Target | Alert | Owner |
|--------|--------|-------|-------|
| Whale retention (30d) | >80% | <70% | Growth |
| Whale → Lapsed conversion | <5% | >10% | Growth |
| Mid-tier growth rate | >5% MoM | <0% | Growth |
| New user → 2nd trade (7d) | >40% | <25% | Product |
| One-and-done rate | <50% | >65% | Product |
| Rising Star validation rate | >70% | <50% | Analytics |

### 8.2 Gaming Detection KPIs

| Metric | Target | Alert | Owner |
|--------|--------|-------|-------|
| Flagged wallets in top 50 | <5 | >10 | Analytics |
| Gaming PNL % of leaderboard | <2% | >5% | Analytics |
| Coordination rings detected | 0 | >0 | Analytics |
| False positive rate | <10% | >20% | Analytics |
| Bot % of Active Small | <20% | >40% | Analytics |
| Alpha Winner validation pass | >80% | <60% | Marketing |

### 8.3 Revenue Protection

| Metric | Calculation | Target |
|--------|-------------|--------|
| Gaming PNL eliminated | Sum of adjusted PNL reductions | Track weekly |
| Legitimate volume preserved | Volume from non-flagged users | >95% |
| Leaderboard integrity score | (Clean wallets in top 50) / 50 | >90% |

---

## 9. Appendix: SQL Implementations

### A. Complete CDP Profile (Percentile-Based)

```sql
CREATE MATERIALIZED VIEW user_cdp_profile AS
WITH user_stats AS (
  SELECT
    fee_payer,
    SUM(total_usd_volume) as total_volume,
    SUM(swap_count) as total_swaps,
    AVG(avg_swap_size) as avg_size,
    SUM(net_usd1_flow) as net_flow,
    MIN(aggregation_date) as first_trade,
    MAX(aggregation_date) as last_trade,
    COUNT(DISTINCT aggregation_date) as active_days
  FROM user_axiom_volume
  WHERE aggregation_date >= NOW() - INTERVAL '30 days'
  GROUP BY fee_payer
),
velocity AS (
  SELECT
    fee_payer,
    current_vol,
    prev_vol,
    CASE
      WHEN prev_vol > 0 THEN (current_vol - prev_vol) / prev_vol
      ELSE NULL
    END as wow_change
  FROM (
    SELECT fee_payer,
      COALESCE(SUM(CASE WHEN aggregation_date >= NOW() - INTERVAL '7 days' THEN total_usd_volume END), 0) as current_vol,
      COALESCE(SUM(CASE WHEN aggregation_date < NOW() - INTERVAL '7 days' THEN total_usd_volume END), 0) as prev_vol
    FROM user_axiom_volume
    WHERE aggregation_date >= NOW() - INTERVAL '14 days'
    GROUP BY fee_payer
  ) t
),
percentiles AS (
  SELECT
    s.fee_payer,
    s.total_volume,
    s.total_swaps,
    s.avg_size,
    s.net_flow,
    s.first_trade,
    s.last_trade,
    s.active_days,
    v.wow_change,
    -- Percentile calculations
    NTILE(100) OVER (ORDER BY s.total_volume) as volume_percentile,
    NTILE(100) OVER (ORDER BY s.total_swaps) as frequency_percentile,
    NTILE(100) OVER (ORDER BY s.net_flow) as flow_percentile,
    NTILE(100) OVER (ORDER BY v.wow_change) as velocity_percentile
  FROM user_stats s
  LEFT JOIN velocity v ON s.fee_payer = v.fee_payer
)
SELECT
  p.fee_payer,
  p.total_volume,
  p.total_swaps,
  p.avg_size,
  p.net_flow,
  p.first_trade,
  p.last_trade,
  p.active_days,
  p.wow_change,
  -- Raw percentiles (0-100)
  p.volume_percentile,
  p.frequency_percentile,
  p.flow_percentile,
  p.velocity_percentile,

  -- VALUE TIER (by volume percentile)
  CASE
    WHEN p.volume_percentile >= 95 THEN 'whale'
    WHEN p.volume_percentile >= 75 THEN 'mid_tier'
    WHEN p.volume_percentile >= 25 THEN 'core'
    ELSE 'casual'
  END as value_tier,

  -- ENGAGEMENT TIER (by swap count percentile)
  CASE
    WHEN p.frequency_percentile >= 95 THEN 'power_user'
    WHEN p.frequency_percentile >= 50 THEN 'regular'
    WHEN p.frequency_percentile >= 10 THEN 'occasional'
    ELSE 'dormant'
  END as engagement_tier,

  -- FLOW SEGMENT (by net flow percentile)
  CASE
    WHEN p.flow_percentile >= 90 THEN 'strong_accumulator'
    WHEN p.flow_percentile >= 50 THEN 'accumulator'
    WHEN p.flow_percentile >= 25 THEN 'neutral'
    WHEN p.flow_percentile >= 10 THEN 'distributor'
    ELSE 'strong_distributor'
  END as flow_segment,

  -- VELOCITY SEGMENT (by WoW change percentile)
  CASE
    WHEN p.velocity_percentile >= 90 THEN 'surging'
    WHEN p.velocity_percentile >= 50 THEN 'growing'
    WHEN p.wow_change BETWEEN -0.2 AND 0.2 THEN 'stable'
    WHEN p.velocity_percentile >= 10 THEN 'declining'
    ELSE 'churning'
  END as velocity_segment,

  -- LIFECYCLE STAGE (time-based, not percentile)
  CASE
    WHEN p.first_trade >= NOW() - INTERVAL '7 days' THEN 'new'
    WHEN p.last_trade < NOW() - INTERVAL '30 days' THEN 'churned'
    WHEN p.last_trade < NOW() - INTERVAL '14 days' THEN 'lapsed'
    WHEN p.first_trade >= NOW() - INTERVAL '30 days' THEN 'activated'
    ELSE 'established'
  END as lifecycle_stage,

  -- BOT CLASSIFICATION (behavior-based)
  CASE
    WHEN p.total_swaps / NULLIF(p.active_days, 0) > 50
         AND p.avg_size < 100 THEN 'likely_bot'
    WHEN p.total_swaps / NULLIF(p.active_days, 0) > 20
         AND p.avg_size < 200 THEN 'possible_bot'
    ELSE 'likely_human'
  END as bot_classification

FROM percentiles p;

-- Refresh daily
-- REFRESH MATERIALIZED VIEW user_cdp_profile;
```

### A.2 Legacy Segment Mapping (for backwards compatibility)

Maps CDP tiers to legacy segment names:

```sql
CREATE VIEW user_segments AS
SELECT
  fee_payer,
  -- Primary segment (highest priority match)
  CASE
    -- Bot detection first
    WHEN bot_classification = 'likely_bot' THEN 'suspected_bot'
    -- Lifecycle takes priority for new/churned
    WHEN lifecycle_stage = 'new' THEN 'new_user'
    WHEN lifecycle_stage = 'churned' THEN 'churned'
    WHEN lifecycle_stage = 'lapsed' AND value_tier IN ('whale', 'mid_tier') THEN 'lapsed_power'
    -- Velocity segments (behavioral shift)
    WHEN velocity_segment = 'surging' AND volume_percentile >= 25 THEN 'rising_star'
    WHEN velocity_segment = 'churning' AND value_tier IN ('whale', 'mid_tier') THEN 'cooling_down'
    WHEN velocity_segment = 'declining' AND value_tier = 'mid_tier' THEN 'at_risk_mid'
    -- Value tiers
    WHEN value_tier = 'whale' THEN 'whale'
    WHEN value_tier = 'mid_tier' THEN 'mid_tier'
    -- Engagement patterns
    WHEN engagement_tier = 'power_user' THEN 'streak_master'
    WHEN engagement_tier = 'regular' THEN 'consistent_trader'
    WHEN engagement_tier = 'occasional' AND value_tier = 'core' THEN 'active_small'
    -- Flow patterns
    WHEN flow_segment IN ('strong_accumulator', 'accumulator') THEN 'accumulator'
    WHEN flow_segment IN ('strong_distributor', 'distributor') THEN 'distributor'
    -- One-and-done detection
    WHEN total_swaps = 1
         AND first_trade < NOW() - INTERVAL '7 days' THEN 'one_and_done'
    ELSE 'other'
  END as segment,
  -- Include all dimensions for analysis
  value_tier,
  engagement_tier,
  flow_segment,
  velocity_segment,
  lifecycle_stage,
  bot_classification,
  volume_percentile,
  frequency_percentile,
  flow_percentile,
  velocity_percentile,
  total_volume,
  total_swaps,
  net_flow,
  wow_change
FROM user_cdp_profile;
```

### B. Gaming Risk Score

```sql
CREATE VIEW gaming_risk_scores AS
WITH token_stats AS (
  SELECT
    "feePayer",
    token,
    SUM(usd_volume) as trader_token_vol,
    SUM(SUM(usd_volume)) OVER (PARTITION BY token) as total_token_vol
  FROM trades
  GROUP BY "feePayer", token
),
user_gaming_metrics AS (
  SELECT
    "feePayer",
    -- Volume dominance (max across all tokens)
    MAX(trader_token_vol / NULLIF(total_token_vol, 0)) as max_dominance,
    -- Token concentration (% of PNL from top token)
    MAX(token_pnl) / NULLIF(SUM(token_pnl), 0) as max_concentration,
    -- PNL efficiency
    SUM(pnl) / NULLIF(SUM(volume), 0) * 1000 as pnl_efficiency,
    -- Same-second trades (coordination signal)
    COUNT(*) FILTER (WHERE same_second_count > 0) as coordination_signals
  FROM trading_analysis
  GROUP BY "feePayer"
)
SELECT
  "feePayer",
  max_dominance,
  max_concentration,
  pnl_efficiency,
  coordination_signals,
  -- Composite risk score (0-100)
  (
    LEAST(max_dominance / 0.5, 1) * 30 +          -- 30 pts for dominance
    LEAST(max_concentration / 0.8, 1) * 25 +      -- 25 pts for concentration
    LEAST(pnl_efficiency / 500, 1) * 25 +         -- 25 pts for efficiency
    CASE WHEN coordination_signals > 0 THEN 20 ELSE 0 END  -- 20 pts for coordination
  )::int as risk_score,
  -- Risk level
  CASE
    WHEN coordination_signals > 0 THEN 'CRITICAL'
    WHEN max_dominance > 0.8 THEN 'HIGH'
    WHEN max_dominance > 0.5 OR pnl_efficiency > 500 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level
FROM user_gaming_metrics;
```

### C. Alpha Winner Validation

```sql
CREATE VIEW alpha_winner_candidates AS
SELECT
  p.fee_payer,
  p.total_pnl,
  s.segment,
  g.risk_score,
  g.risk_level,
  CASE
    WHEN g.risk_level IN ('CRITICAL', 'HIGH') THEN 'REJECT'
    WHEN g.risk_score > 50 THEN 'REVIEW'
    WHEN s.segment = 'suspected_bot' THEN 'REJECT'
    WHEN p.total_pnl < 1000 THEN 'TOO_SMALL'
    ELSE 'CANDIDATE'
  END as validation_status
FROM pnl_leaderboard p
JOIN user_segments s ON p.fee_payer = s.fee_payer
JOIN gaming_risk_scores g ON p.fee_payer = g.fee_payer
WHERE p.total_pnl > 0
ORDER BY p.total_pnl DESC;
```

---

## 10. Segments Requiring Additional Data

Some valuable segments can't be built from trading data alone:

### 10.1 Referral Network Segments

| Segment | Required Data | Value |
|---------|---------------|-------|
| **Super Referrers** | Referral tracking | Top 5% by referred volume |
| **Network Hubs** | Social graph | Users who onboard many traders |
| **Organic Discoverers** | Attribution data | Arrived without referral code |

### 10.2 Cross-Protocol Segments

| Segment | Required Data | Value |
|---------|---------------|-------|
| **Multi-Protocol Power Users** | Cross-protocol identity | Active on 3+ DeFi protocols |
| **Protocol Migrants** | Competitor data | Left competitor for Axiom |
| **DeFi Natives** | Wallet history | Long crypto experience |

### 10.3 Behavioral Segments (Future)

| Segment | Required Data | Value |
|---------|---------------|-------|
| **Feature Adopters** | Feature usage events | Try new features within 7 days |
| **Mobile-First** | Device data | Primarily trade on mobile |
| **Time-Zone Active** | Session data | Peak activity hours |

---

## 11. Next Steps

### Immediate
- [ ] Deploy `user_cdp_profile` materialized view to production
- [ ] Set up daily refresh schedule for percentile recalculation
- [ ] Connect CDP profile to CRM system for campaign targeting

### This Sprint
- [ ] Build CDP dashboard showing percentile distributions
- [ ] Create segment transition monitoring (who moved up/down)
- [ ] Implement bot classification exclusion for email campaigns

### Next Sprint
- [ ] Add segment-level cohort analysis (retention by tier)
- [ ] Build composite scoring for prioritization
- [ ] Integrate with campaign automation

### Ongoing
- [ ] Monitor percentile threshold effectiveness (are tiers meaningful?)
- [ ] Track segment health KPIs
- [ ] Refine bot detection rules based on false positive feedback

---

*Document maintained by Torque Analytics. Last updated: January 20, 2026*
