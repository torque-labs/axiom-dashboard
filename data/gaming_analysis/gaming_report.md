# PNL Leaderboard Gaming Analysis Report

**Analysis Period:** January 19-25, 2026
**Generated:** January 21, 2026
**Methodology:** VWAP-based realized PNL with unrealized loss deduction

---

## Executive Summary

This report analyzes the top 50 PNL wallets on the Axiom platform to identify potential gaming behaviors and recommend adjustments to ensure fair leaderboard rankings.

### Key Findings

| Metric | Value |
|--------|-------|
| Total Wallets Analyzed | 50 |
| Clean Wallets | 29 (58%) |
| Low Risk Wallets | 15 (30%) |
| Moderate Risk Wallets | 5 (10%) |
| High Risk Wallets | 1 (2%) |
| Top PNL (Raw) | $25,971.74 |
| Top PNL (Adjusted) | $23,374.57 |

### Primary Gaming Mechanism Identified

**LaunchLab Token Concentration** is the most common pattern among flagged wallets:
- 15 wallets have >80% of trades on LaunchLab platform
- Wallets trading predominantly LaunchLab tokens show higher variance in outcomes
- This is not necessarily gaming, but warrants monitoring

**Extreme ROI with Low Diversity** is the clearest red flag:
- 5 wallets achieved >500% ROI
- These wallets typically trade only 1-3 tokens
- Example: Wallet #30 achieved 2,869% ROI trading only 1 token

---

## Gaming Detection Methodology

### Scoring Components

| Component | Weight | Red Flag Threshold | Max Score |
|-----------|--------|-------------------|-----------|
| Sell Bias | 25 | >80% sells | 25 |
| Extreme ROI | 25 | >500% | 25 |
| LaunchLab Concentration | 25 | >95% | 25 |
| Low Token Diversity | 25 | <3 unique tokens | 25 |

### Risk Levels & Penalties

| Gaming Score | Risk Level | Penalty Multiplier |
|--------------|------------|-------------------|
| 0-20 | Clean | 1.00x (no penalty) |
| 21-40 | Low Risk | 0.90x (10% reduction) |
| 41-60 | Moderate Risk | 0.70x (30% reduction) |
| 61-80 | High Risk | 0.40x (60% reduction) |
| 81-100 | Severe Gaming | 0.10x (90% reduction) |

---

## Top 10 Wallet Analysis

### Rank #1: CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $25,971.74 | Highest earner |
| Total Volume | $245,373.58 | Very high activity |
| Unique Tokens | 194 | Excellent diversity |
| Total Trades | 1,426 | High frequency |
| Sell Ratio | 31.6% | Normal |
| ROI | 24.5% | Reasonable |
| LaunchLab % | 98.0% | **Flag: High concentration** |
| Avg Hold Time | 20.6 sec | Fast but reasonable |

**Gaming Score: 25 (Low Risk)**
**Adjusted PNL: $23,374.57**

Assessment: This wallet shows legitimate high-volume trading behavior. The high LaunchLab concentration is notable but the excellent token diversity and reasonable ROI suggest skill rather than exploitation.

---

### Rank #2: 6pkPgzD8LeNbaiD86DYAQtFHfvCMkiLVscyyi4E5NcyY

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $19,530.35 | Second highest |
| Total Volume | $21,933.54 | Moderate |
| Unique Tokens | 2 | **Flag: Very low** |
| Total Trades | 24 | Very low |
| Sell Ratio | 54.2% | Normal |
| ROI | 1,608.4% | **Flag: Extreme** |
| LaunchLab % | 8.3% | Normal |
| Avg Hold Time | 15,630.4 sec | Long hold |

**Gaming Score: 50 (Moderate Risk)**
**Adjusted PNL: $13,671.25**

Assessment: Extreme ROI on only 2 tokens with low trade count suggests either lucky concentrated bets or potential insider knowledge. The long hold time indicates this isn't rapid exploitation.

---

### Rank #3: CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $13,601.54 | Third highest |
| Total Volume | $46,079.07 | Good |
| Unique Tokens | 13 | Good diversity |
| Total Trades | 61 | Moderate |
| Sell Ratio | 47.5% | Balanced |
| ROI | 88.1% | Healthy |
| LaunchLab % | 36.1% | Normal |
| Avg Hold Time | 1,711.8 sec | Normal |

**Gaming Score: 0 (Clean)**
**Adjusted PNL: $13,601.54**

Assessment: Clean trading pattern with balanced buy/sell ratio, good diversity, and reasonable ROI. No red flags detected.

---

### Rank #4: 4NtyFqqRzvHWsTmJZoT26H9xtL7asWGTxpcpCxiKax9a

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $11,568.40 | Strong |
| Total Volume | $28,425.53 | Good |
| Unique Tokens | 4 | Low but acceptable |
| Sell Ratio | 73.3% | Somewhat high |
| ROI | 137.3% | Good |
| LaunchLab % | 20.0% | Normal |

**Gaming Score: 20 (Clean)**
**Adjusted PNL: $11,568.40**

Assessment: Slightly concentrated but legitimate trading pattern.

---

### Rank #5: HYSq1KBAvqWpEv1pCbV31muKM1za5A1WSHGdiVLUoNhb

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $10,807.03 | Strong |
| Total Volume | $87,391.05 | Very high |
| Unique Tokens | 2 | Low |
| Sell Ratio | 76.2% | High |
| ROI | 101.2% | Reasonable for volume |
| LaunchLab % | 0.0% | CPMM only |

**Gaming Score: 25 (Low Risk)**
**Adjusted PNL: $9,726.33**

Assessment: Appears to be DCA selling of a large position. The zero LaunchLab usage and reasonable ROI suggest legitimate profit-taking rather than gaming.

---

### Rank #6: ExggwHcHhg67jgR6oyUiZxq7RhsYDhSkAeSkN2W9VBHH

| Metric | Value | Assessment |
|--------|-------|------------|
| Total PNL | $10,356.27 | Strong |
| Unique Tokens | 4 | Low |
| Sell Ratio | 59.3% | Normal |
| ROI | 112.9% | Good |
| LaunchLab % | 0.0% | CPMM only |
| Avg Hold Time | 5,567.7 sec | Long |

**Gaming Score: 20 (Clean)**
**Adjusted PNL: $10,356.27**

Assessment: Legitimate concentrated trading with good profits and long hold times.

---

### Rank #7-10 Summary

| Rank | Wallet (short) | PNL | Score | Risk |
|------|----------------|-----|-------|------|
| 7 | 5CWn9g...A7Ye | $9,728.83 | 10 | Clean |
| 8 | BTZJRd...vAxY | $9,149.73 | 0 | Clean |
| 9 | 4Qodq...kVa2 | $7,893.88 | 20 | Clean |
| 10 | JCLqyR...oRQJ | $7,125.27 | 0 | Clean |

---

## High Risk Wallet Analysis

### Wallet #30: FJyFzGMFyJALfd7R9PANSZY7WjPbhV4p6HmsHcp5hPG1

**THE HIGHEST RISK WALLET IDENTIFIED**

| Metric | Value | Red Flag |
|--------|-------|----------|
| Total PNL | $3,600.48 | - |
| Unique Tokens | 1 | **SEVERE** |
| Total Trades | 9 | **SEVERE** |
| Buy Count | 1 | **SEVERE** |
| Sell Count | 8 | **SEVERE** |
| USD Invested | $125.49 | **SEVERE** |
| USD Received | $3,725.97 | - |
| Sell Ratio | 88.9% | **HIGH** |
| ROI | 2,869.2% | **EXTREME** |

**Gaming Score: 65 (High Risk)**
**Adjusted PNL: $1,440.19**

**Pattern Analysis:**
- Made only 1 buy for $125.49
- Made 8 sells totaling $3,725.97
- Trading only 1 token
- This pattern is highly suspicious - likely received tokens from an external source (airdrop, team allocation, pre-sale) and dumped them

---

## Gaming Score Distribution

| Risk Level | Count | Percentage | Total Raw PNL | Total Adjusted PNL |
|------------|-------|------------|---------------|-------------------|
| Clean | 29 | 58% | $162,747.91 | $162,747.91 |
| Low Risk | 15 | 30% | $64,520.96 | $58,068.86 |
| Moderate Risk | 5 | 10% | $35,817.12 | $25,071.98 |
| High Risk | 1 | 2% | $3,600.48 | $1,440.19 |
| **Total** | **50** | **100%** | **$266,686.47** | **$247,328.94** |

---

## Rank Impact Analysis

### Biggest Losers (Rank Drop)

| Wallet | Raw Rank | Adjusted Rank | Change | Reason |
|--------|----------|---------------|--------|--------|
| FJyFzG...HmsHcp5hPG1 | 30 | 47 | -17 | High Risk: 2,869% ROI on 1 token |
| 29fMnk...nSmG85qQu | 20 | 26 | -6 | Moderate: 647% ROI on 3 tokens |
| 5VmT4H...KPhzUQgs1i6ND | 40 | 46 | -6 | Moderate: 820% ROI, 81% sell ratio |

### Biggest Winners (Rank Improvement)

| Wallet | Raw Rank | Adjusted Rank | Change | Reason |
|--------|----------|---------------|--------|--------|
| AGbU8n...NUwZj | 34 | 30 | +4 | Clean despite low diversity |
| Dgehc8...wdcYJPJ | 37 | 34 | +3 | Clean trading pattern |
| GrNyJK...D45Atnq | 38 | 35 | +3 | Clean trading pattern |
| J2zVGk...UmJK2j | 32 | 29 | +3 | Clean trading pattern |

---

## Recommendations

### Immediate Actions

1. **Monitor High Risk Wallet (#30)**
   - Investigate source of tokens
   - Consider manual review before payout

2. **Flag Moderate Risk Wallets**
   - Wallets #2, #20, #40 show extreme ROI patterns
   - May benefit from additional verification

### Leaderboard Adjustments

**Option A: Apply Gaming Penalties (Recommended)**
- Multiply raw PNL by penalty multiplier
- Preserves all wallets on leaderboard
- Rewards clean traders relatively

**Option B: Hard Filters**
- Remove wallets with >500% ROI
- Remove wallets with >80% sell ratio AND <5 tokens
- More aggressive but may catch false positives

### SQL Implementation

```sql
-- Apply gaming score penalty to leaderboard
WITH gaming_scores AS (
  -- Calculate gaming indicators
  SELECT
    wallet,
    total_pnl,
    CASE
      WHEN sell_ratio > 80 THEN 25
      WHEN sell_ratio > 70 THEN 10
      ELSE 0
    END +
    CASE
      WHEN roi_pct > 1000 THEN 25
      WHEN roi_pct > 500 THEN 15
      WHEN roi_pct > 200 THEN 5
      ELSE 0
    END +
    CASE
      WHEN launchlab_pct > 95 THEN 25
      WHEN launchlab_pct > 85 THEN 15
      ELSE 0
    END +
    CASE
      WHEN unique_tokens < 3 THEN 25
      WHEN unique_tokens < 5 THEN 15
      WHEN unique_tokens < 10 THEN 5
      ELSE 0
    END as gaming_score
  FROM wallet_stats
)
SELECT
  wallet,
  total_pnl,
  gaming_score,
  CASE
    WHEN gaming_score <= 20 THEN 1.00
    WHEN gaming_score <= 40 THEN 0.90
    WHEN gaming_score <= 60 THEN 0.70
    WHEN gaming_score <= 80 THEN 0.40
    ELSE 0.10
  END as penalty_multiplier,
  total_pnl * penalty_multiplier as adjusted_pnl
FROM gaming_scores
ORDER BY adjusted_pnl DESC;
```

---

## Appendix: Data Files

| File | Description |
|------|-------------|
| `top10_wallet_profiles.csv` | Detailed stats for top 10 PNL wallets |
| `gaming_scores_top50.csv` | Gaming score breakdown for all 50 wallets |
| `token_analysis.csv` | Token-level analysis for suspicious patterns |
| `rank_impact.csv` | Before/after ranking comparison |

---

## Conclusion

The analysis reveals that **58% of top 50 wallets demonstrate clean trading patterns** with no red flags. The gaming penalty system would primarily impact:

- **1 high-risk wallet** (rank drop: 17 positions)
- **5 moderate-risk wallets** (average rank drop: 4 positions)
- **15 low-risk wallets** (average rank drop: 0.5 positions)

The primary gaming mechanism identified is **not traditional wash trading** but rather:
1. Receiving tokens from external sources (airdrops, team allocations)
2. Immediately selling for USD1
3. Achieving extreme ROI with minimal investment

Implementing the penalty system would reward legitimate traders while reducing the impact of those exploiting token distributions.

---

*Report generated by Axiom Gaming Analysis System*
