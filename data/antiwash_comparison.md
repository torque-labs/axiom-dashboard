# Anti-Wash Implementation Comparison

**Generated:** January 21, 2026

This document compares two approaches for handling wash trading in the leaderboard:

- **Option 1: Wallet Disqualification** - Exclude entire wallet if >500 rapid reversals
- **Option 2: Trade Exclusion** - Exclude only the specific reversal trades, keep legitimate volume

---

## Summary

| Metric | Option 1 (Wallet DQ) | Option 2 (Trade Exclusion) |
|--------|---------------------|---------------------------|
| **Query Time** | ~3.5 sec | ~4.6 sec |
| **Approach** | Binary - in or out | Surgical - remove bad trades |
| **Wash traders in Top 10** | 0 | 2 (BA36Anwp #1, CyaE1Vxv #6) |
| **Top 50 volume retained** | More legitimate traders | Wash traders with reduced volume |

---

## Key Differences

### Option 1 removes these wallets entirely:
| Wallet | Total Volume | Reversals | Status |
|--------|-------------|-----------|--------|
| CyaE1VxvBrahn... | $246,694 | 3,279 | **REMOVED** |
| BA36AnwpTfKeq... | $230,286 | 1,770 | **REMOVED** |
| BBPKQwYLyiPjA... | $93,555 | 520 | **REMOVED** |
| 2fg5QD1eD7rzN... | $92,004 | 1,176 | **REMOVED** |
| FxN3VZ4BosL5u... | $71,684 | 1,169 | **REMOVED** |
| 7NAd2EpYGGeFo... | $70,658 | 1,170 | **REMOVED** |

### Option 2 keeps them with reduced volume:
| Wallet | Total Volume | Adjusted Volume | % Kept | Reversals |
|--------|-------------|-----------------|--------|-----------|
| BA36AnwpTfKeq... | $230,286 | $97,398 | 42% | 1,770 |
| CyaE1VxvBrahn... | $246,694 | $67,572 | 27% | 3,279 |
| BBPKQwYLyiPjA... | $93,555 | $37,328 | 40% | 520 |
| 2fg5QD1eD7rzN... | $92,004 | $37,759 | 41% | 1,176 |
| FxN3VZ4BosL5u... | $71,684 | $28,685 | 40% | 1,169 |
| 7NAd2EpYGGeFo... | $70,658 | $27,971 | 40% | 1,170 |

---

## Option 1: Wallet Disqualification (Top 50)

*Wallets with >500 rapid reversals are completely excluded*

| Rank | Wallet | Trades | Tokens | Volume | Reversals |
|------|--------|--------|--------|--------|-----------|
| 1 | HYSq1KBAvqWpEv1pCbV31muKM1za5A1WSHGdiVLUoNhb | 206 | 2 | $87,391.05 | 2 |
| 2 | 3JD7zrZVXfGozgaSrnn3GzAcGsHCM5ATazX8EqwJqZWY | 245 | 99 | $86,809.55 | 162 |
| 3 | AD3XDgirYWTDrtztXDyjwzRvwyA5aG5bivaFXnjujXPf | 256 | 59 | $86,195.90 | 380 |
| 4 | FYQU4Q4BEgNwNATMEphBtZtfkR3RamXXy6JvHnVHhjuo | 97 | 16 | $84,468.24 | 9 |
| 5 | BAk7jy4pPS9u4tBsbGWVJstrbami8UuxQtRktVFnfx9k | 278 | 55 | $83,917.40 | 224 |
| 6 | 7naFFwuEJWeWwWYQUkgAWHsxYKg3KctEuUj42JdAMidP | 279 | 60 | $76,277.30 | 54 |
| 7 | JAQZkUqCfWjXu2jKVDbBp4LD2SbYcRHMN1RN9N8uWiBn | 417 | 120 | $74,515.20 | 471 |
| 8 | EFaQQTGywnD4CjQQvTugUiyVT4LV9G6MsWqiub8X6unN | 256 | 191 | $71,220.56 | 0 |
| 9 | PMJA8UQDyWTFw2Smhyp9jGA6aTaP7jKHR7BPudrgyYN | 407 | 132 | $65,290.37 | 452 |
| 10 | J2L495ZPcJ6Btuyd4YqXz5uw7hpKiQXGcLvALwumabED | 373 | 131 | $63,173.03 | 401 |
| 11 | 5t5Y3upBdyxeszzxKRtNw6h9fGnpFF1WJQwNHfPEQobQ | 355 | 95 | $58,312.22 | 307 |
| 12 | 6nU2L7MQVUWjtdKHVpuZA9aind73nd3rXC4YFo8KQCy4 | 219 | 45 | $55,502.19 | 1 |
| 13 | DqD9b5LZK8RRXkfXQNF97e6HTcfZ8XsYNdAN2kNdGNty | 169 | 14 | $54,786.38 | 61 |
| 14 | 3UNPM7X6LbmxUms5ij6zm9P7J1Ev2Wd7TwwXmYrPX3n3 | 334 | 76 | $54,609.62 | 447 |
| 15 | 3J7ZjmdcrwHMuW8osom4K19ybm1NL1mAP89DpC5MyEWC | 145 | 44 | $53,783.74 | 187 |
| 16 | kkMrXRWnhkR9vgzmjPSLZTV7N7LsMeyXifPiW1HFWMn | 331 | 79 | $53,062.79 | 432 |
| 17 | 5zCkbcD74hFPeBHwYdwJLJAoLVgHX45AFeR7RzC8vFiD | 261 | 76 | $53,046.43 | 3 |
| 18 | ACTbvbNm5qTLuofNRPxFPMtHAAtdH1CtzhCZatYHy831 | 191 | 56 | $52,672.32 | 105 |
| 19 | 9nHkJPoPwKdwDWNt3HdC753R1WjyBcuXLg5HQsxZtMiv | 162 | 14 | $51,964.81 | 61 |
| 20 | CJKksKnktWH3AcNupDPzdry2KpoCVBT5nyPNpe975qUK | 220 | 50 | $51,430.55 | 286 |
| 21 | 6wowwKG1ztzTRBzrVmxuWnZVUh8AwcPD2DFEXPgR1VsM | 220 | 50 | $51,042.80 | 286 |
| 22 | GijFWw4oNyh9ko3FaZforNsi3jk6wDovARpkKahPD4o5 | 166 | 41 | $47,794.81 | 69 |
| 23 | Dgehc8YMv6dHsiPJVoumvq4pSBkMVvrTgTUg7wdcYJPJ | 128 | 43 | $47,297.20 | 90 |
| 24 | BRx8TP6HsD9srJ62rcYizjAHyZ5mt3cp8wPBEZioTsym | 209 | 60 | $46,829.63 | 148 |
| 25 | B3wagQZiZU2hKa5pUCj6rrdhWsX3Q6WfTTnki9PjwzMh | 58 | 17 | $46,783.22 | 15 |
| 26 | CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5 | 61 | 17 | $46,627.61 | 8 |
| 27 | TimeAdRpWxqKXR5YPEwGBF48KC5V5TxB2g6mnyCp4VR | 76 | 14 | $45,507.50 | 25 |
| 28 | JCLqyRAzLy2otp1mUkgaHpJkNRrQ5Xf1hQakn7m1oRQJ | 183 | 34 | $45,412.49 | 174 |
| 29 | EAoe557r1L8ZAMHNjrccnjekyo95iov6y62mxwv8BN2N | 96 | 44 | $45,382.44 | 5 |
| 30 | 5RA3mHaNZmteC7TLkykPe6NwMdYzz9XqRqZdXsS2nQqa | 360 | 85 | $44,892.71 | 341 |
| 31 | jewY1ZEqT7wEyUDMFJ6mFW52soaX1i9zr4wLpqUvaMz | 346 | 89 | $44,580.46 | 345 |
| 32 | DEVA1RTJX6mAXLy9HikaDG3SPRu8mrjXnkedoivGQMvZ | 187 | 27 | $44,437.27 | 133 |
| 33 | 5TcyQLh8ojBf81DKeRC4vocTbNKJpJCsR9Kei16kLqDM | 162 | 64 | $44,060.07 | 11 |
| 34 | 5FqUo9aBjsp7QeeyN6Vi2ZmF2fjS4H5EU7wnAQwPy17z | 134 | 81 | $44,002.02 | 0 |
| 35 | C7yUFMdiV2tucSc9FXurvuvBCFek195oA8hgfn9AS3CF | 173 | 47 | $43,976.19 | 63 |
| 36 | HqBLXnqnDY1xrGnMsa3rRfw4C6qoQYiCsbQCap5LUyGQ | 293 | 69 | $43,524.70 | 380 |
| 37 | 5B79fMkcFeRTiwm7ehsZsFiKsC7m7n1Bgv9yLxPp9q2X | 228 | 31 | $42,571.77 | 233 |
| 38 | G7NvZKjoVqBDWciSYtWWgUPB7DA1iJavdvH5jty2FAmM | 173 | 103 | $42,188.56 | 61 |
| 39 | DdZG8dw12CsHjj2Ytfo1vKNPPoU4DEYSMSxdhPjo5U6N | 117 | 114 | $42,118.64 | 3 |
| 40 | 3rcUJ1ydrfXYDZWTu3GfVRRg3WE34CwFywRkeU6qZGyg | 248 | 72 | $42,045.28 | 246 |
| 41 | 98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp | 150 | 35 | $40,418.88 | 124 |
| 42 | 9fpUmh3Tv3UCdeHLyq3o4QhkTBu5XAbEiKP9FtGaSndb | 110 | 35 | $39,760.25 | 94 |
| 43 | C6RY5sbvmTFBZXYe6YLrpGjUAFSQwyRmKawLZk9ucrSS | 256 | 31 | $39,308.67 | 489 |
| 44 | AQ46kfYT3hW28Xg5gWHrJkzFSz1oGWBHC3FsTbqgMEco | 238 | 65 | $38,393.83 | 203 |
| 45 | 8NVkytV1CtoNBXGFtwXwh4KQdbgVcA6hFmym1gMuRHru | 139 | 26 | $38,128.15 | 56 |
| 46 | 4idPDNg7qzUqWgrkVvaM9StXaQCcMTes1XSPYGH5qtu6 | 293 | 49 | $37,806.41 | 443 |
| 47 | 9Huizoqi35PVAe3EqeUQ7YabPUgM1NANcFbWvHhm9isK | 293 | 49 | $37,486.99 | 443 |
| 48 | CPrMbU3PwEbLRuvnb4uFdCrtyyVAu11tYeWY5kF6u9f6 | 101 | 45 | $37,437.20 | 139 |
| 49 | BKcCjjQayhnhxq65FcYFNHGNke71Zu24wHmXQw2WeVda | 293 | 49 | $37,312.50 | 444 |
| 50 | D3JY3AvpXDVcMjAdFUSXsCKx8rbnVo1Vi42MoKPCuBHC | 217 | 82 | $37,033.05 | 95 |

---

## Option 2: Trade Exclusion (Top 50)

*Only reversal trades excluded, legitimate volume kept*

| Rank | Wallet | Total Trades | Clean Trades | Tokens | Total Vol | Adjusted Vol | Reversals |
|------|--------|--------------|--------------|--------|-----------|--------------|-----------|
| 1 | BA36AnwpTfKeqNhExVUFFbzUAQTyKYvJrEokKJqVCTPi | 967 | 330 | 84 | $230,286.06 | **$97,397.71** | 1,770 |
| 2 | HYSq1KBAvqWpEv1pCbV31muKM1za5A1WSHGdiVLUoNhb | 206 | 204 | 2 | $87,391.05 | $86,780.21 | 2 |
| 3 | FYQU4Q4BEgNwNATMEphBtZtfkR3RamXXy6JvHnVHhjuo | 97 | 88 | 16 | $84,468.24 | $80,962.74 | 9 |
| 4 | 7naFFwuEJWeWwWYQUkgAWHsxYKg3KctEuUj42JdAMidP | 279 | 233 | 60 | $76,277.30 | $73,953.61 | 54 |
| 5 | EFaQQTGywnD4CjQQvTugUiyVT4LV9G6MsWqiub8X6unN | 256 | 256 | 191 | $71,220.56 | $71,220.56 | 0 |
| 6 | CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o | 1,422 | 517 | 196 | $246,694.30 | **$67,572.43** | 3,279 |
| 7 | 6nU2L7MQVUWjtdKHVpuZA9aind73nd3rXC4YFo8KQCy4 | 219 | 218 | 45 | $55,502.19 | $55,117.29 | 1 |
| 8 | 5zCkbcD74hFPeBHwYdwJLJAoLVgHX45AFeR7RzC8vFiD | 261 | 259 | 76 | $53,046.43 | $52,605.21 | 3 |
| 9 | DqD9b5LZK8RRXkfXQNF97e6HTcfZ8XsYNdAN2kNdGNty | 169 | 149 | 14 | $54,786.38 | $49,217.43 | 61 |
| 10 | 9nHkJPoPwKdwDWNt3HdC753R1WjyBcuXLg5HQsxZtMiv | 162 | 142 | 14 | $51,964.81 | $46,168.16 | 61 |
| 11 | 5FqUo9aBjsp7QeeyN6Vi2ZmF2fjS4H5EU7wnAQwPy17z | 134 | 134 | 81 | $44,002.02 | $44,002.02 | 0 |
| 12 | CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5 | 61 | 54 | 17 | $46,627.61 | $43,601.81 | 8 |
| 13 | EAoe557r1L8ZAMHNjrccnjekyo95iov6y62mxwv8BN2N | 96 | 91 | 44 | $45,382.44 | $42,556.92 | 5 |
| 14 | AD3XDgirYWTDrtztXDyjwzRvwyA5aG5bivaFXnjujXPf | 256 | 101 | 59 | $86,195.90 | $42,038.35 | 380 |
| 15 | DdZG8dw12CsHjj2Ytfo1vKNPPoU4DEYSMSxdhPjo5U6N | 117 | 114 | 114 | $42,118.64 | $41,372.49 | 3 |
| 16 | 5TcyQLh8ojBf81DKeRC4vocTbNKJpJCsR9Kei16kLqDM | 162 | 155 | 64 | $44,060.07 | $40,005.20 | 11 |
| 17 | B3wagQZiZU2hKa5pUCj6rrdhWsX3Q6WfTTnki9PjwzMh | 58 | 44 | 17 | $46,783.22 | $40,003.90 | 15 |
| 18 | TimeAdRpWxqKXR5YPEwGBF48KC5V5TxB2g6mnyCp4VR | 76 | 62 | 14 | $45,507.50 | $39,843.23 | 25 |
| 19 | 2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f | 1,037 | 587 | 162 | $92,004.33 | **$37,758.83** | 1,176 |
| 20 | BAk7jy4pPS9u4tBsbGWVJstrbami8UuxQtRktVFnfx9k | 278 | 117 | 55 | $83,917.40 | $37,603.72 | 224 |
| 21 | BBPKQwYLyiPjAX2KTFxanR7vxwa7majAF7c7yoaRX8oR | 445 | 154 | 109 | $93,554.89 | **$37,328.21** | 520 |
| 22 | 3JD7zrZVXfGozgaSrnn3GzAcGsHCM5ATazX8EqwJqZWY | 245 | 93 | 99 | $86,809.55 | $34,971.18 | 162 |
| 23 | G7NvZKjoVqBDWciSYtWWgUPB7DA1iJavdvH5jty2FAmM | 173 | 117 | 103 | $42,188.56 | $34,959.75 | 61 |
| 24 | ACTbvbNm5qTLuofNRPxFPMtHAAtdH1CtzhCZatYHy831 | 191 | 125 | 56 | $52,672.32 | $34,883.31 | 105 |
| 25 | 2hMTR55HQAKpFAhmmQYChAXwoX5Lxynih1N6ZigZ6Bms | 116 | 115 | 7 | $33,658.74 | $33,646.03 | 1 |
| 26 | HUgpmqL6r4Z4iEZiVuNZ6J6QnAsSZpsL8giVyVtz3QhT | 127 | 123 | 67 | $32,450.80 | $31,988.49 | 4 |
| 27 | BTZJRdccNMrF1tdwjSk9K369udDJpk8mxrZNP2U7vAxY | 80 | 69 | 11 | $35,636.28 | $31,160.23 | 13 |
| 28 | 5t5Y3upBdyxeszzxKRtNw6h9fGnpFF1WJQwNHfPEQobQ | 355 | 163 | 95 | $58,312.22 | $30,305.72 | 307 |
| 29 | GijFWw4oNyh9ko3FaZforNsi3jk6wDovARpkKahPD4o5 | 166 | 120 | 41 | $47,794.81 | $29,901.05 | 69 |
| 30 | 5B79fMkcFeRTiwm7ehsZsFiKsC7m7n1Bgv9yLxPp9q2X | 228 | 171 | 31 | $42,571.77 | $29,813.06 | 233 |
| 31 | BUeeLU7F9jD27ZkQMtbqd1JwTMu4tFdG7qGxqeeYhYN5 | 130 | 106 | 65 | $32,826.57 | $29,430.51 | 27 |
| 32 | 9h8Myodcd6PeeCxVo4ReV7799GL7EvHLUzXjJcxgrYWz | 74 | 71 | 1 | $30,426.73 | $28,971.95 | 3 |
| 33 | 47jfhw5puHdFjkmWoGahkuLgVSqYBzmdGPzDaMu47d6k | 32 | 32 | 1 | $28,900.23 | $28,900.23 | 0 |
| 34 | ExggwHcHhg67jgR6oyUiZxq7RhsYDhSkAeSkN2W9VBHH | 54 | 54 | 4 | $28,695.10 | $28,695.10 | 0 |
| 35 | FxN3VZ4BosL5urG2yoeQ156JSdmavm9K5fdLxjkPmaMR | 984 | 537 | 159 | $71,683.96 | **$28,684.84** | 1,169 |
| 36 | C7yUFMdiV2tucSc9FXurvuvBCFek195oA8hgfn9AS3CF | 173 | 116 | 47 | $43,976.19 | $28,626.07 | 63 |
| 37 | FG8J8Un82uBHwGFf7D4EnBcfMGjbjdCz8yxp3MUy66f7 | 85 | 72 | 18 | $31,084.47 | $28,494.12 | 24 |
| 38 | 7NAd2EpYGGeFofpyvgehSXhH5vg6Ry6VRMW2Y6jiqCu1 | 969 | 529 | 157 | $70,658.47 | **$27,971.19** | 1,170 |
| 39 | DEVA1RTJX6mAXLy9HikaDG3SPRu8mrjXnkedoivGQMvZ | 187 | 61 | 27 | $44,437.27 | $27,519.02 | 133 |
| 40 | Dgehc8YMv6dHsiPJVoumvq4pSBkMVvrTgTUg7wdcYJPJ | 128 | 55 | 43 | $47,297.20 | $27,168.20 | 90 |
| 41 | Aqje5DsN4u2PHmQxGF9PKfpsDGwQRCBhWeLKHCFhSMXk | 105 | 103 | 67 | $26,801.31 | $26,652.24 | 2 |
| 42 | NtYVyP6Sj5TKA38bZUTQTnxAt4yaa5KTQJqKex3iUj3 | 113 | 110 | 2 | $29,183.20 | $26,137.22 | 8 |
| 43 | 4NtyFqqRzvHWsTmJZoT26H9xtL7asWGTxpcpCxiKax9a | 45 | 40 | 4 | $28,425.53 | $25,612.37 | 7 |
| 44 | D3JY3AvpXDVcMjAdFUSXsCKx8rbnVo1Vi42MoKPCuBHC | 217 | 164 | 82 | $37,033.05 | $25,138.27 | 95 |
| 45 | 7vtfeHxrZA9uyGtVWZzm4VAkoBP9K5o9BCyCB7aABzkF | 95 | 71 | 42 | $31,638.93 | $24,034.30 | 41 |
| 46 | GpTXmkdvrTajqkzX1fBmC4BUjSboF9dHgfnqPqj8WAc4 | 84 | 84 | 50 | $23,640.46 | $23,640.46 | 0 |
| 47 | AS25HYWuQ5c8wgD8VTpjt5oi5vYErm1R46XGr3a2i535 | 196 | 100 | 52 | $35,244.40 | $23,579.47 | 153 |
| 48 | HsNqrgYmw5GnWTVkzbjQPbSeAmWK7q5ZvQzhaUmxdEF5 | 72 | 65 | 4 | $25,091.35 | $22,676.88 | 7 |
| 49 | 8NVkytV1CtoNBXGFtwXwh4KQdbgVcA6hFmym1gMuRHru | 139 | 90 | 26 | $38,128.15 | $22,475.82 | 56 |
| 50 | 98T65wcMEjoNLDTJszBHGZEX75QRe8QaANXokv4yw3Mp | 150 | 95 | 35 | $40,418.88 | $22,453.77 | 124 |

---

## Recommendation

**Use Option 1 (Wallet Disqualification)** because:

1. **Cleaner leaderboard** - No wash traders in top positions
2. **Simpler messaging** - "Excessive wash trading = disqualified"
3. **No partial credit** - Gamers don't benefit from mixing legitimate trades
4. **Clear threshold** - 500 reversals is generous (legitimate traders rarely exceed 100)

Option 2 allows wash traders like BA36Anwp to still rank #1 with "adjusted" volume. This sends the wrong message - they're still being rewarded for gaming behavior.

---

## SQL Queries

### Option 1: Wallet Disqualification
```sql
WITH reversal_counts AS (
  SELECT t1."feePayer", COUNT(*) as reversal_count
  FROM axiomtrade_partitioned t1
  JOIN axiomtrade_partitioned t2
    ON t1."feePayer" = t2."feePayer"
    AND t1."tokenOut" = t2."tokenIn"
    AND t2."createdAt" > t1."createdAt"
    AND t2."createdAt" <= t1."createdAt" + INTERVAL '60 seconds'
  WHERE t1."programId" IN ('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C','LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj')
  AND t1."createdAt" >= '2026-01-19'
  GROUP BY t1."feePayer"
)
SELECT t."feePayer", SUM(...) as volume
FROM axiomtrade_partitioned t
LEFT JOIN reversal_counts rc ON t."feePayer" = rc."feePayer"
WHERE COALESCE(rc.reversal_count, 0) <= 500  -- Disqualify if >500
GROUP BY t."feePayer"
ORDER BY volume DESC;
```

### Option 2: Trade Exclusion
```sql
WITH rapid_reversal_trades AS (
  SELECT DISTINCT t2.signature as reversal_signature
  FROM axiomtrade_partitioned t1
  JOIN axiomtrade_partitioned t2
    ON t1."feePayer" = t2."feePayer"
    AND t1."tokenOut" = t2."tokenIn"
    AND t2."createdAt" > t1."createdAt"
    AND t2."createdAt" <= t1."createdAt" + INTERVAL '60 seconds'
  WHERE t1."programId" IN ('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C','LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj')
  AND t1."createdAt" >= '2026-01-19'
)
SELECT t."feePayer",
  SUM(CASE WHEN rr.reversal_signature IS NULL THEN volume ELSE 0 END) as adjusted_volume
FROM axiomtrade_partitioned t
LEFT JOIN rapid_reversal_trades rr ON t.signature = rr.reversal_signature
GROUP BY t."feePayer"
ORDER BY adjusted_volume DESC;
```

---

*Generated by Claude Code - January 21, 2026*
