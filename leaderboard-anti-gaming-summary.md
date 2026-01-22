# Leaderboard Anti-Gaming Implementation

**Analysis Period:** January 19-25, 2026

---

## Current Leaderboard (No Filters)

| Rank | Wallet | PNL | Status |
|------|--------|-----|--------|
| 1 | CyaE1Vxv | $37,345 | **Suspected Gaming** |
| 2 | 6pkPgzD8 | $18,229 | Legitimate |
| 3 | CA4keXLt | $13,922 | Legitimate |
| 4 | HYSq1KBA | $11,942 | Legitimate |
| 5 | 4NtyFqqR | $11,568 | Legitimate |
| 6 | ExggwHcH | $10,356 | Legitimate |
| 7 | 5CWn9gFt | $9,767 | **Suspected Gaming** |
| 8 | BTZJRdcc | $9,326 | Legitimate |
| 9 | TimeAdRp | $8,442 | Legitimate |
| 10 | 4QodqLUi | $7,894 | Legitimate |

**Problem:** 2 suspected gaming wallets in top 10, #1 position shows patterns consistent with sniping behavior

---

## Suspicious Activity Identified

| Wallet Pair | Shared Tokens | Trades on Shared | Avg Time Apart | Pattern |
|-------------|---------------|------------------|----------------|---------|
| 5CWn9gFt ↔ JCLqyRAz | 39 tokens | 373 trades | 0.1 seconds | Near-simultaneous |
| CyaE1Vxv ↔ JCLqyRAz | 14 tokens | — | 69 minutes | 10 within 5 min |
| CyaE1Vxv ↔ 5CWn9gFt | 14 tokens | — | 69 minutes | 10 within 5 min |

**Observation:** 5CWn9gFt and JCLqyRAz traded 39 of the same tokens (373 total trades) with an average of 0.1 seconds between their first trades on each token. This pattern is consistent with bot behavior, though coordination cannot be confirmed.

---

## New Leaderboard (15min / $2k / 10T)

| Rank | Wallet | PNL | Change |
|------|--------|-----|--------|
| 1 | 6pkPgzD8 | $19,327 | ↑ from #2 |
| 2 | HYSq1KBA | $13,009 | ↑ from #4 |
| 3 | CA4keXLt | $11,751 | — |
| 4 | TimeAdRp | $11,566 | ↑ from #9 |
| 5 | 4NtyFqqR | $11,197 | — |
| 6 | ExggwHcH | $10,356 | — |
| 7 | BTZJRdcc | $9,306 | ↓ from #8 |
| 8 | 4QodqLUi | $7,985 | ↓ from #10 |
| 9 | 5B79fMkc | $6,970 | NEW |
| 10 | 8pKVAVuG | $6,745 | NEW |

**Result:** Clean top 10 — no suspected gaming wallets

---

## Scenarios Tested

| Hold Time | Volume | Unique Traders | Sniper Reduction | Notes |
|-----------|--------|----------------|------------------|-------|
| 15 min | $2,000 | 10 | -88% | **RECOMMENDED** |
| 15 min | $2,000 | 20 | -88% | Removes CA4keXLt |
| 15 min | $2,000 | 30 | -88% | Same as 20T |
| 15 min | $3,000 | 10 | -88% | Same as $2k |
| 15 min | $3,000 | 20 | -88% | Same as $2k |
| 15 min | $3,000 | 30 | -88% | Same as $2k |
| 20 min | $2,000 | 10 | -88% | Marginal improvement |
| 20 min | $2,000 | 20 | -88% | Removes CA4keXLt |
| 20 min | $2,000 | 30 | -88% | Same as 20T |
| 20 min | $3,000 | 10 | -88% | Same as $2k |
| 20 min | $3,000 | 20 | -88% | Same as $2k |
| 20 min | $3,000 | 30 | -88% | Same as $2k |

---

## Why 15min / $2k / 10 Unique Traders

| Decision | Reasoning |
|----------|-----------|
| **15 min hold** | Eliminates 99% of suspected sniper PNL; 20 min adds only 1% more reduction |
| **$2,000 volume** | $3,000 produced identical results; lower threshold keeps more activity eligible |
| **10 unique traders** | 20+ removes CA4keXLt (likely legitimate); 10 still filters low-participation tokens |

---

## Impact on Suspected Gaming Wallets

| Wallet | Current | After Filters | Reduction |
|--------|---------|---------------|-----------|
| CyaE1Vxv | $37,345 (#1) | $6,549 (#11) | **-82%** |
| 5CWn9gFt | $9,767 (#7) | $134 | **-99%** |
| JCLqyRAz | $7,195 (#11) | $75 | **-99%** |
| **Total** | **$54,307** | **$6,758** | **-88%** |

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Suspected Gaming Wallets in Top 10 | 2 | 0 |
| Suspected Gaming PNL | $54,307 | $6,758 |
| #1 Position | Suspected Gaming | Legitimate |
| Avg Legitimate Trader Impact | — | +9% |

**Recommendation:** Implement **15-minute hold**, **$2,000 minimum volume**, and **10 unique traders** per token to reduce suspected gaming by 88% while preserving legitimate trader rankings.
