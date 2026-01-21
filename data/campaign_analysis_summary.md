# Axiom/Raydium PNL Leaderboard - Campaign Analysis
**Period:** January 19-21, 2026 (3 days of data)
**Generated:** January 21, 2026

---

## Executive Summary

The campaign shows **concerning decline patterns** with significant user and volume drop-off. Gaming remains prevalent but is decreasing proportionally. Key metrics indicate the initial launch spike is normalizing, but retention needs attention.

---

## Key Performance Indicators

### Participation
| Metric | Day 1 (Jan 19) | Day 2 (Jan 20) | Day 3 (Jan 21) | Trend |
|--------|---------------|---------------|---------------|-------|
| Unique Wallets | 10,858 | 10,393 (-4%) | 7,639 (-26%) | Declining |
| Total Trades | 145,139 | 98,013 (-32%) | 72,035 (-27%) | Declining |
| USD Volume | $13.4M | $7.6M (-43%) | $5.9M (-23%) | Declining |
| Unique Tokens | 2,555 | 1,638 (-36%) | 863 (-47%) | Declining |
| New Wallets | 10,858 | 5,278 | 2,956 | Declining |

### Day 1 Cohort Retention
| Day | Returning Day 1 Users | Retention Rate |
|-----|----------------------|----------------|
| Day 1 | 10,858 | 100% |
| Day 2 | 5,115 | 47.1% |
| Day 3 | 3,200 | 29.5% |

**Analysis:** Nearly 30% of Day 1 users are still active on Day 3. This is typical for trading competitions but indicates room for improvement in engagement mechanics.

---

## Trader Behavior Analysis

### Volume Per Trader
| Day | Avg Volume | Median Volume | P90 Volume |
|-----|-----------|---------------|------------|
| Day 1 | $1,237 | $255 | $2,920 |
| Day 2 | $732 (-41%) | $173 | $1,781 |
| Day 3 | $769 (+5%) | $191 | $1,866 |

**Insight:** Volume per trader stabilizing after initial drop. Median volume suggests most traders are small ($170-255 range).

### Profitability
| Day | Profitable | Losing | % Profitable | Median PNL |
|-----|-----------|--------|--------------|------------|
| Day 1 | 4,245 | 6,613 | 39.1% | -$3.07 |
| Day 2 | 3,898 | 6,495 | 37.5% | -$2.76 |
| Day 3 | 3,358 | 4,300 | **43.8%** | -$1.26 |

**Insight:** Profitability improving on Day 3 (43.8% vs 39.1%). Median PNL improving (less negative), suggesting either:
- Less sophisticated traders leaving
- Gaming being less effective
- Better trading behavior

---

## Gaming Indicators

### Rapid Reversals (Buy/Sell within 60s)
| Day | Rapid Reversals | Wallets Involved | % of Wallets |
|-----|-----------------|------------------|--------------|
| Day 1 | 37,653 | 6,939 | 63.9% |
| Day 2 | 25,389 | 6,479 | 62.3% |
| Day 3 | 13,822 | 4,219 | 55.2% |

**Trend:** Rapid reversal activity declining both in absolute terms and as % of wallets. This is positive.

### Volume Dominance (Single trader >50% of token volume)
| Day | Wallets >50% | Wallets >80% | Tokens Dominated |
|-----|--------------|--------------|------------------|
| Day 1 | 64 | 12 | 109 |
| Day 2 | 34 | 9 | 52 |
| Day 3 | 26 | 10 | 29 |

**Trend:** Volume manipulation decreasing. Fewer traders able to dominate tokens.

### Token Concentration (as of Day 3)
- 3,546 traders with >$100 PNL
- 1,354 (38%) have >95% PNL from single token
- 1,695 (48%) have >80% PNL from single token

**Concern:** High concentration persists - nearly half of profitable traders rely on a single token.

---

## Flagged Wallets Update

### Critical: CA4keXLt... (Volume Manipulator)
| Day | Trades | Volume | Trend |
|-----|--------|--------|-------|
| Day 1 | 37 | $34,612 | |
| Day 2 | 15 | $10,517 | -70% |
| Day 3 | 9 | $1,498 | -86% |

**Status:** Activity dramatically decreased. May have realized detection or extracted profits.

### CyaE1Vxv... (High-Frequency Bot)
| Day | Trades | Volume | Trend |
|-----|--------|--------|-------|
| Day 1 | 662 | $129,763 | |
| Day 2 | 472 | $71,884 | -45% |
| Day 3 | 170 | $26,283 | -63% |

**Status:** Still #1 on leaderboard with $22,674 PNL. Decreased activity but still dominant.

### HANRi Ring Members (4NtyFqqR, TimeAdRp, 29fMnkfz)
- 4NtyFqqR: Only active Day 1, no subsequent activity
- TimeAdRp: Declining activity ($29K → $10K → $5K)
- 29fMnkfz: Minimal Day 2 activity ($227), none Day 3

**Status:** Ring appears to have disbanded after Day 1 coordination exploit.

---

## Leaderboard Changes Since Report (Jan 20)

### New Top 10 Entrants
1. **6pkPgzD8...** - #2 with $19,531 PNL (NEW)
2. **HYSq1KBAvq...** - #5 with $10,807 PNL (NEW)
3. **ExggwHcHhg...** - #6 with $10,356 PNL (NEW)
4. **JCLqyRAzLy...** - #9 with $7,155 PNL (NEW)
5. **4QodqLUiQ5...** - #10 with $6,829 PNL (NEW)

### Positions Held by Flagged Wallets
- CyaE1Vxv... (bot): #1 ($22,674)
- CA4keXLt... (manipulator): #3 ($13,532)
- 4NtyFqqR... (coordination): #4 ($11,568)
- ETvmkav3... (coordination): #11 ($6,745)
- TimeAdRp... (coordination): #14 ($5,911)
- 5siYF3h8... (coordination): #18 ($5,116)
- 29fMnkfz... (coordination): #19 ($4,650)

**7 of top 20 positions held by flagged wallets**

---

## Campaign Health Assessment

### Positive Signals
- Profitability rate improving (39% → 44%)
- Gaming activity decreasing in proportion
- Volume dominance declining
- Median losses shrinking

### Concerning Signals
- **-56% volume decline** from Day 1 to Day 3
- **-30% wallet decline** from Day 1 to Day 3
- **47% token concentration** among profitable traders
- **7 of top 20** still flagged wallets
- Day 1 retention only 29.5% by Day 3

### Overall Grade: C+
The campaign attracted significant initial interest but is experiencing typical post-launch decay. Gaming is present but not overwhelming. The main concerns are:
1. Rapid volume/participation decline
2. Flagged wallets still dominating leaderboard
3. High single-token concentration enabling manipulation

---

## Recommendations

### Immediate (Before Day 4)
1. **Implement $10K + 10 trader rule** - As recommended in original report
2. **Communicate leaderboard recalculation** - Build trust with legitimate traders

### This Week
1. **Add volume dominance cap (50%)** - Prevents CA4keXLt-style manipulation
2. **Introduce daily/weekly sub-prizes** - Improve engagement and retention
3. **Highlight legitimate top traders** - Show non-flagged leaders

### Monitoring
1. Track Day 1 cohort through Day 7 for true retention picture
2. Monitor flagged wallets for new gaming patterns
3. Watch for new coordination rings on fresh tokens

---

## Data Files Generated

- `campaign_metrics.json` - Daily participation, volume, retention data
- `gaming_indicators.json` - Rapid reversals, volume dominance, flagged wallet activity
- `leaderboard.json` - Current top 50 with flags and volume data
