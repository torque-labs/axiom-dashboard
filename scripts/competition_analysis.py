#!/usr/bin/env python3
"""
Competition Impact Analysis
Comparing baseline activity vs competition period to estimate lift
"""

import os
import psycopg2
import pandas as pd
from datetime import datetime, timedelta

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:Hu6oz7hEbA7YGJ8MAq2rvrprGG4Aq5vfus6Qu6YEaq5fShhl05kh1961f99zLqji@torque-newindexer-staging-multi-aurora-instance-1-us-east-1b.ctk2soogyiwl.us-east-1.rds.amazonaws.com:5432/postgres')
QUOTE_TOKEN = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'

# Dates
BASELINE_START = '2026-01-12'
BASELINE_END = '2026-01-19'  # Competition announcement on Monday Jan 20
COMP_START = '2026-01-20'    # Monday - announcement day
COMP_END = '2026-01-23'

conn = psycopg2.connect(DATABASE_URL)

def query(sql):
    return pd.read_sql(sql, conn)

print("=" * 70)
print("COMPETITION IMPACT ANALYSIS")
print("=" * 70)
print(f"\nBaseline Period: {BASELINE_START} to {BASELINE_END} (7 days, pre-announcement)")
print(f"Competition Period: {COMP_START} to {COMP_END} (3 days, post-announcement)")
print()

# =============================================================================
# 1. DAILY BREAKDOWN - Volume, Trades, Users
# =============================================================================
print("\n" + "=" * 70)
print("1. DAILY ACTIVITY BREAKDOWN")
print("=" * 70)

daily_df = query(f"""
    SELECT
        DATE("receivedAt") as day,
        EXTRACT(DOW FROM DATE("receivedAt")) as day_of_week,
        COUNT(*) as trades,
        COUNT(DISTINCT "feePayer") as users,
        ROUND(SUM(CASE WHEN "tokenIn" = '{QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric, 2) as volume
    FROM axiomtrade_partitioned
    WHERE "receivedAt" >= '{BASELINE_START}' AND "receivedAt" < '{COMP_END}'
    GROUP BY DATE("receivedAt"), EXTRACT(DOW FROM DATE("receivedAt"))
    ORDER BY day
""")

# Add day names
day_names = {0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'}
daily_df['day_name'] = daily_df['day_of_week'].map(day_names)
comp_start_ts = pd.Timestamp(COMP_START)
daily_df['period'] = daily_df['day'].apply(lambda x: 'Competition' if pd.Timestamp(x) >= comp_start_ts else 'Baseline')

print("\nDaily breakdown:")
print(daily_df[['day', 'day_name', 'period', 'trades', 'users', 'volume']].to_string(index=False))

# =============================================================================
# 2. PERIOD COMPARISON
# =============================================================================
print("\n" + "=" * 70)
print("2. PERIOD COMPARISON (Daily Averages)")
print("=" * 70)

baseline = daily_df[daily_df['period'] == 'Baseline']
competition = daily_df[daily_df['period'] == 'Competition']

baseline_avg = {
    'trades': baseline['trades'].mean(),
    'users': baseline['users'].mean(),
    'volume': baseline['volume'].mean()
}

comp_avg = {
    'trades': competition['trades'].mean(),
    'users': competition['users'].mean(),
    'volume': competition['volume'].mean()
}

print(f"\n{'Metric':<20} {'Baseline Avg':>15} {'Competition Avg':>18} {'Change':>12} {'Lift %':>10}")
print("-" * 75)
for metric in ['trades', 'users', 'volume']:
    change = comp_avg[metric] - baseline_avg[metric]
    lift_pct = (change / baseline_avg[metric]) * 100
    if metric == 'volume':
        print(f"{metric:<20} ${baseline_avg[metric]:>14,.0f} ${comp_avg[metric]:>17,.0f} ${change:>11,.0f} {lift_pct:>9.1f}%")
    else:
        print(f"{metric:<20} {baseline_avg[metric]:>15,.0f} {comp_avg[metric]:>18,.0f} {change:>12,.0f} {lift_pct:>9.1f}%")

# =============================================================================
# 3. DAY-OF-WEEK ANALYSIS (Controlling for weekly patterns)
# =============================================================================
print("\n" + "=" * 70)
print("3. DAY-OF-WEEK ANALYSIS (Controlling for weekly patterns)")
print("=" * 70)

# Get historical day-of-week patterns from baseline
dow_baseline = baseline.groupby('day_name').agg({
    'trades': 'mean',
    'users': 'mean',
    'volume': 'mean'
}).round(0)

print("\nBaseline averages by day of week:")
print(dow_baseline.to_string())

print("\nCompetition days vs same-day baseline:")
print(f"\n{'Day':<10} {'Baseline Avg':>15} {'Competition':>15} {'Lift':>12} {'Lift %':>10}")
print("-" * 65)

for _, row in competition.iterrows():
    day_name = row['day_name']
    if day_name in dow_baseline.index:
        baseline_vol = dow_baseline.loc[day_name, 'volume']
        comp_vol = row['volume']
        lift = comp_vol - baseline_vol
        lift_pct = (lift / baseline_vol) * 100 if baseline_vol > 0 else 0
        print(f"{row['day'].strftime('%a %m/%d'):<10} ${baseline_vol:>14,.0f} ${comp_vol:>14,.0f} ${lift:>11,.0f} {lift_pct:>9.1f}%")

# =============================================================================
# 4. PROGRAM BREAKDOWN
# =============================================================================
print("\n" + "=" * 70)
print("4. VOLUME BY PROGRAM (Baseline vs Competition)")
print("=" * 70)

program_df = query(f"""
    SELECT
        "programId",
        CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END as period,
        COUNT(*) as trades,
        ROUND(SUM(CASE WHEN "tokenIn" = '{QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric, 2) as volume
    FROM axiomtrade_partitioned
    WHERE "receivedAt" >= '{BASELINE_START}' AND "receivedAt" < '{COMP_END}'
    GROUP BY "programId", CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END
    ORDER BY "programId", period
""")

# Pivot to compare
program_pivot = program_df.pivot(index='programId', columns='period', values='volume').fillna(0)
program_pivot['baseline_daily'] = program_pivot['Baseline'] / 7
program_pivot['comp_daily'] = program_pivot['Competition'] / 3
program_pivot['lift_pct'] = ((program_pivot['comp_daily'] - program_pivot['baseline_daily']) / program_pivot['baseline_daily'] * 100).round(1)

print("\nProgram volume comparison (daily averages):")
print(f"\n{'Program':<50} {'Baseline/Day':>15} {'Comp/Day':>15} {'Lift %':>10}")
print("-" * 95)
for prog, row in program_pivot.iterrows():
    prog_short = prog[:45] + '...' if len(prog) > 45 else prog
    print(f"{prog_short:<50} ${row['baseline_daily']:>14,.0f} ${row['comp_daily']:>14,.0f} {row['lift_pct']:>9.1f}%")

# =============================================================================
# 5. NEW USER ACQUISITION
# =============================================================================
print("\n" + "=" * 70)
print("5. NEW USER ACQUISITION ANALYSIS")
print("=" * 70)

new_users_df = query(f"""
    WITH daily_new AS (
        SELECT
            DATE("receivedAt") as day,
            COUNT(DISTINCT "feePayer") as total_users,
            COUNT(DISTINCT CASE
                WHEN NOT EXISTS (
                    SELECT 1 FROM axiomtrade_partitioned p2
                    WHERE p2."feePayer" = axiomtrade_partitioned."feePayer"
                    AND p2."receivedAt" < DATE("receivedAt")
                ) THEN "feePayer"
            END) as new_users
        FROM axiomtrade_partitioned
        WHERE "receivedAt" >= '{BASELINE_START}' AND "receivedAt" < '{COMP_END}'
        GROUP BY DATE("receivedAt")
    )
    SELECT * FROM daily_new ORDER BY day
""")

# Simpler approach - compare distinct users
new_vs_return = query(f"""
    WITH comp_users AS (
        SELECT DISTINCT "feePayer"
        FROM axiomtrade_partitioned
        WHERE "receivedAt" >= '{COMP_START}' AND "receivedAt" < '{COMP_END}'
    ),
    pre_users AS (
        SELECT DISTINCT "feePayer"
        FROM axiomtrade_partitioned
        WHERE "receivedAt" < '{COMP_START}'
    )
    SELECT
        CASE WHEN p."feePayer" IS NULL THEN 'New' ELSE 'Returning' END as user_type,
        COUNT(*) as count
    FROM comp_users c
    LEFT JOIN pre_users p ON c."feePayer" = p."feePayer"
    GROUP BY 1
""")

print("\nCompetition period user breakdown:")
for _, row in new_vs_return.iterrows():
    print(f"  {row['user_type']}: {row['count']:,}")

total_comp_users = new_vs_return['count'].sum()
new_users = new_vs_return[new_vs_return['user_type'] == 'New']['count'].values[0]
print(f"\nNew user acquisition rate: {new_users/total_comp_users*100:.1f}%")

# =============================================================================
# 6. TRADING INTENSITY (Trades per User)
# =============================================================================
print("\n" + "=" * 70)
print("6. TRADING INTENSITY (Trades per User)")
print("=" * 70)

intensity_df = query(f"""
    SELECT
        CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END as period,
        COUNT(*) as total_trades,
        COUNT(DISTINCT "feePayer") as unique_users,
        ROUND(COUNT(*)::numeric / COUNT(DISTINCT "feePayer"), 2) as trades_per_user
    FROM axiomtrade_partitioned
    WHERE "receivedAt" >= '{BASELINE_START}' AND "receivedAt" < '{COMP_END}'
    GROUP BY CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END
""")

print("\nTrading intensity by period:")
print(intensity_df.to_string(index=False))

baseline_intensity = intensity_df[intensity_df['period'] == 'Baseline']['trades_per_user'].values[0]
comp_intensity = intensity_df[intensity_df['period'] == 'Competition']['trades_per_user'].values[0]
print(f"\nIntensity lift: {((comp_intensity - baseline_intensity) / baseline_intensity * 100):.1f}%")

# =============================================================================
# 7. HOURLY PATTERNS
# =============================================================================
print("\n" + "=" * 70)
print("7. HOURLY VOLUME PATTERNS")
print("=" * 70)

hourly_df = query(f"""
    SELECT
        EXTRACT(HOUR FROM "receivedAt") as hour,
        CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END as period,
        ROUND(SUM(CASE WHEN "tokenIn" = '{QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric, 2) as volume
    FROM axiomtrade_partitioned
    WHERE "receivedAt" >= '{BASELINE_START}' AND "receivedAt" < '{COMP_END}'
    GROUP BY EXTRACT(HOUR FROM "receivedAt"),
             CASE WHEN DATE("receivedAt") >= '{COMP_START}' THEN 'Competition' ELSE 'Baseline' END
    ORDER BY hour
""")

hourly_pivot = hourly_df.pivot(index='hour', columns='period', values='volume').fillna(0)
hourly_pivot['baseline_daily'] = hourly_pivot['Baseline'] / 7
hourly_pivot['comp_daily'] = hourly_pivot['Competition'] / 3
hourly_pivot['lift_pct'] = ((hourly_pivot['comp_daily'] - hourly_pivot['baseline_daily']) / hourly_pivot['baseline_daily'] * 100)

peak_hours = hourly_pivot.nlargest(5, 'comp_daily')
print("\nTop 5 hours by competition volume (daily avg):")
print(f"\n{'Hour (UTC)':<12} {'Baseline':>12} {'Competition':>15} {'Lift %':>10}")
print("-" * 52)
for hour, row in peak_hours.iterrows():
    print(f"{int(hour):02d}:00{'':<7} ${row['baseline_daily']:>11,.0f} ${row['comp_daily']:>14,.0f} {row['lift_pct']:>9.1f}%")

# =============================================================================
# 8. ESTIMATED COMPETITION IMPACT
# =============================================================================
print("\n" + "=" * 70)
print("8. ESTIMATED COMPETITION IMPACT")
print("=" * 70)

# Calculate what volume WOULD have been without competition (using baseline avg)
comp_days = 3
expected_volume = baseline_avg['volume'] * comp_days
actual_volume = competition['volume'].sum()
incremental_volume = actual_volume - expected_volume

expected_trades = baseline_avg['trades'] * comp_days
actual_trades = competition['trades'].sum()
incremental_trades = actual_trades - expected_trades

expected_users = baseline_avg['users'] * comp_days  # Note: this overcounts, users aren't additive
actual_users_total = query(f"""
    SELECT COUNT(DISTINCT "feePayer") as users
    FROM axiomtrade_partitioned
    WHERE "receivedAt" >= '{COMP_START}' AND "receivedAt" < '{COMP_END}'
""")['users'].values[0]

print(f"\nVolume Analysis (Competition Period: {comp_days} days)")
print("-" * 50)
print(f"Expected volume (baseline rate):  ${expected_volume:>15,.0f}")
print(f"Actual volume:                    ${actual_volume:>15,.0f}")
print(f"INCREMENTAL VOLUME:               ${incremental_volume:>15,.0f}")
print(f"Lift:                             {(incremental_volume/expected_volume)*100:>15.1f}%")

print(f"\nTrades Analysis")
print("-" * 50)
print(f"Expected trades (baseline rate):  {expected_trades:>15,.0f}")
print(f"Actual trades:                    {actual_trades:>15,.0f}")
print(f"INCREMENTAL TRADES:               {incremental_trades:>15,.0f}")
print(f"Lift:                             {(incremental_trades/expected_trades)*100:>15.1f}%")

# =============================================================================
# 9. SUMMARY
# =============================================================================
print("\n" + "=" * 70)
print("SUMMARY: COMPETITION ATTRIBUTION")
print("=" * 70)

organic_pct = (expected_volume / actual_volume) * 100
competition_pct = (incremental_volume / actual_volume) * 100

print(f"""
Total Competition Period Volume: ${actual_volume:,.0f}

Attribution breakdown:
├── Organic (baseline rate):     ${expected_volume:>12,.0f}  ({organic_pct:.1f}%)
└── Competition-driven:          ${incremental_volume:>12,.0f}  ({competition_pct:.1f}%)

Key Metrics:
• Daily volume increased by {((comp_avg['volume'] - baseline_avg['volume']) / baseline_avg['volume'] * 100):.0f}%
• Daily trades increased by {((comp_avg['trades'] - baseline_avg['trades']) / baseline_avg['trades'] * 100):.0f}%
• Daily users increased by {((comp_avg['users'] - baseline_avg['users']) / baseline_avg['users'] * 100):.0f}%
• {new_users:,} new users acquired ({new_users/total_comp_users*100:.0f}% of competition participants)
""")

conn.close()
print("\nAnalysis complete.")
