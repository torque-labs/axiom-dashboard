#!/usr/bin/env python3
"""
Power User Analysis Script

Analyzes Axiom trading data to determine natural breakpoints for power user classification.
Uses statistical methods to find inflection points in user activity distributions.
"""

import json
import urllib.request
import urllib.error
import numpy as np
from collections import defaultdict

import os

CUBE_API_URL = "https://cube.torque.so/cubejs-api/v1/load"
CUBE_API_KEY = os.environ.get("CUBE_API_KEY", "")

def query_cube(query: dict) -> dict:
    """Query the Cube API."""
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(
        CUBE_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-api-key": CUBE_API_KEY
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"  HTTP Error {e.code}: {error_body[:500]}")
        raise


def get_user_volume_data():
    """Fetch user volume data for the last 30 days."""
    # Use only pre-aggregated measures that match the rollup
    query = {
        "measures": [
            "user_axiom_volume.total_usd_volume",
            "user_axiom_volume.swap_count"
        ],
        "dimensions": ["user_axiom_volume.fee_payer"],
        "timeDimensions": [
            {
                "dimension": "user_axiom_volume.aggregation_date",
                "dateRange": "last 30 days"
            }
        ],
        "order": {"user_axiom_volume.total_usd_volume": "desc"},
        "limit": 10000
    }
    return query_cube(query)


def get_daily_user_data():
    """Fetch daily granularity data to understand activity patterns."""
    query = {
        "measures": [
            "user_axiom_volume.total_usd_volume",
            "user_axiom_volume.swap_count"
        ],
        "dimensions": ["user_axiom_volume.fee_payer"],
        "timeDimensions": [
            {
                "dimension": "user_axiom_volume.aggregation_date",
                "dateRange": "last 30 days",
                "granularity": "day"
            }
        ],
        "limit": 50000
    }
    return query_cube(query)


def analyze_distribution(values: list, name: str):
    """Analyze the distribution of a metric."""
    arr = np.array(values)
    arr = arr[arr > 0]  # Remove zeros

    if len(arr) == 0:
        return {}

    percentiles = [50, 75, 90, 95, 99]
    pct_values = np.percentile(arr, percentiles)

    return {
        "name": name,
        "count": len(arr),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std": float(np.std(arr)),
        "percentiles": {f"p{p}": float(v) for p, v in zip(percentiles, pct_values)}
    }


def find_elbow_points(values: list, n_points: int = 5):
    """
    Find elbow/knee points in the distribution using the second derivative.
    These are natural breakpoints where the rate of change shifts.
    """
    arr = np.array(sorted(values, reverse=True))
    arr = arr[arr > 0]

    if len(arr) < 100:
        return []

    # Sample points for smoother analysis
    indices = np.linspace(0, len(arr) - 1, min(1000, len(arr))).astype(int)
    sampled = arr[indices]

    # Calculate second derivative (acceleration of decline)
    first_derivative = np.diff(sampled)
    second_derivative = np.diff(first_derivative)

    # Find points where second derivative changes sign (inflection points)
    sign_changes = np.where(np.diff(np.sign(second_derivative)))[0]

    # Get the values at these inflection points
    elbow_values = []
    for idx in sign_changes[:n_points]:
        actual_idx = indices[idx + 1]
        elbow_values.append({
            "rank": int(actual_idx),
            "value": float(arr[actual_idx]),
            "percentile": float(100 * (1 - actual_idx / len(arr)))
        })

    return elbow_values


def segment_users_by_volume(volumes: list):
    """
    Segment users into tiers using natural breakpoints.
    Uses log-scale binning to find meaningful thresholds.
    """
    arr = np.array(volumes)
    arr = arr[arr > 0]

    if len(arr) == 0:
        return {}

    # Log-transform for better distribution analysis
    log_volumes = np.log10(arr)

    # Find natural clusters using histogram peaks
    hist, bin_edges = np.histogram(log_volumes, bins=50)

    # Find valleys (low points between peaks) as natural boundaries
    valleys = []
    for i in range(1, len(hist) - 1):
        if hist[i] < hist[i-1] and hist[i] < hist[i+1]:
            valleys.append(10 ** bin_edges[i])

    # Also use percentile-based thresholds
    percentile_thresholds = {
        "p50": float(np.percentile(arr, 50)),
        "p75": float(np.percentile(arr, 75)),
        "p90": float(np.percentile(arr, 90)),
        "p95": float(np.percentile(arr, 95)),
        "p99": float(np.percentile(arr, 99)),
    }

    return {
        "natural_boundaries": valleys[:5],
        "percentile_thresholds": percentile_thresholds
    }


def analyze_activity_patterns(daily_data: list):
    """
    Analyze daily activity patterns to find power user thresholds.
    Power users likely have more active days and consistent activity.
    """
    # Group by user
    user_days = defaultdict(list)
    user_daily_volumes = defaultdict(list)

    for row in daily_data:
        user = row.get("user_axiom_volume.fee_payer")
        volume = float(row.get("user_axiom_volume.total_usd_volume", 0) or 0)
        swaps = float(row.get("user_axiom_volume.swap_count", 0) or 0)

        if user and (volume > 0 or swaps > 0):
            user_days[user].append(1)
            user_daily_volumes[user].append(volume)

    # Calculate metrics per user
    active_days = [len(days) for days in user_days.values()]
    avg_daily_volumes = [np.mean(vols) for vols in user_daily_volumes.values() if vols]

    return {
        "active_days_distribution": analyze_distribution(active_days, "Active Days (30d)"),
        "avg_daily_volume_distribution": analyze_distribution(avg_daily_volumes, "Avg Daily Volume"),
        "active_days_thresholds": segment_users_by_volume(active_days),
        "daily_volume_thresholds": segment_users_by_volume(avg_daily_volumes)
    }


def recommend_power_user_thresholds(volume_stats: dict, activity_stats: dict, swap_stats: dict):
    """
    Recommend power user thresholds based on the analysis.
    """
    recommendations = []

    # Volume-based threshold (use p90 as power user cutoff)
    vol_p90 = volume_stats.get("percentiles", {}).get("p90", 0)
    vol_p75 = volume_stats.get("percentiles", {}).get("p75", 0)
    vol_p95 = volume_stats.get("percentiles", {}).get("p95", 0)

    recommendations.append({
        "metric": "Total Volume (30d)",
        "casual_max": vol_p75,
        "power_user_min": vol_p90,
        "whale_min": vol_p95,
        "reasoning": "Based on volume distribution percentiles"
    })

    # Swap count threshold
    swap_p90 = swap_stats.get("percentiles", {}).get("p90", 0)
    swap_p75 = swap_stats.get("percentiles", {}).get("p75", 0)

    recommendations.append({
        "metric": "Swap Count (30d)",
        "casual_max": swap_p75,
        "power_user_min": swap_p90,
        "reasoning": "Based on activity frequency percentiles"
    })

    # Active days threshold
    days_dist = activity_stats.get("active_days_distribution", {})
    days_p75 = days_dist.get("percentiles", {}).get("p75", 0)
    days_p90 = days_dist.get("percentiles", {}).get("p90", 0)

    recommendations.append({
        "metric": "Active Days (30d)",
        "casual_max": days_p75,
        "power_user_min": days_p90,
        "reasoning": "Based on consistency of engagement"
    })

    return recommendations


def main():
    print("=" * 60)
    print("AXIOM POWER USER ANALYSIS")
    print("=" * 60)
    print()

    # Fetch data
    print("Fetching user volume data...")
    try:
        volume_response = get_user_volume_data()
        volume_data = volume_response.get("data", [])
        print(f"  Retrieved {len(volume_data)} users")
    except Exception as e:
        print(f"  Error fetching volume data: {e}")
        volume_data = []

    print("Fetching daily activity data...")
    try:
        daily_response = get_daily_user_data()
        daily_data = daily_response.get("data", [])
        print(f"  Retrieved {len(daily_data)} daily records")
    except Exception as e:
        print(f"  Error fetching daily data: {e}")
        daily_data = []

    if not volume_data:
        print("\nNo data available. Exiting.")
        return

    # Extract metrics
    volumes = [float(r.get("user_axiom_volume.total_usd_volume", 0) or 0) for r in volume_data]
    swaps = [float(r.get("user_axiom_volume.swap_count", 0) or 0) for r in volume_data]

    # Calculate avg sizes from volume/swaps
    avg_sizes = []
    for r in volume_data:
        vol = float(r.get("user_axiom_volume.total_usd_volume", 0) or 0)
        swap_count = float(r.get("user_axiom_volume.swap_count", 0) or 0)
        if swap_count > 0:
            avg_sizes.append(vol / swap_count)

    # Analyze distributions
    print("\n" + "=" * 60)
    print("DISTRIBUTION ANALYSIS")
    print("=" * 60)

    volume_stats = analyze_distribution(volumes, "Total USD Volume (30d)")
    swap_stats = analyze_distribution(swaps, "Swap Count (30d)")
    size_stats = analyze_distribution(avg_sizes, "Avg Swap Size")

    for stats in [volume_stats, swap_stats, size_stats]:
        if not stats or 'name' not in stats:
            continue
        print(f"\n{stats['name']}:")
        print(f"  Users: {stats['count']:,}")
        print(f"  Range: {stats['min']:,.2f} - {stats['max']:,.2f}")
        print(f"  Mean: {stats['mean']:,.2f}")
        print(f"  Median: {stats['median']:,.2f}")
        print(f"  Percentiles:")
        for p, v in stats['percentiles'].items():
            print(f"    {p}: {v:,.2f}")

    # Find elbow points
    print("\n" + "=" * 60)
    print("ELBOW POINT ANALYSIS (Natural Breakpoints)")
    print("=" * 60)

    volume_elbows = find_elbow_points(volumes)
    print("\nVolume Elbow Points:")
    for elbow in volume_elbows:
        print(f"  Rank #{elbow['rank']:,} ({elbow['percentile']:.1f}%ile): ${elbow['value']:,.2f}")

    swap_elbows = find_elbow_points(swaps)
    print("\nSwap Count Elbow Points:")
    for elbow in swap_elbows:
        print(f"  Rank #{elbow['rank']:,} ({elbow['percentile']:.1f}%ile): {elbow['value']:,.0f} swaps")

    # Analyze activity patterns
    print("\n" + "=" * 60)
    print("ACTIVITY PATTERN ANALYSIS")
    print("=" * 60)

    if daily_data:
        activity_stats = analyze_activity_patterns(daily_data)

        days_dist = activity_stats['active_days_distribution']
        print(f"\nActive Days (30d period):")
        print(f"  Users: {days_dist['count']:,}")
        print(f"  Range: {days_dist['min']:.0f} - {days_dist['max']:.0f} days")
        print(f"  Mean: {days_dist['mean']:.1f} days")
        print(f"  Median: {days_dist['median']:.0f} days")
        print(f"  Percentiles:")
        for p, v in days_dist['percentiles'].items():
            print(f"    {p}: {v:.0f} days")
    else:
        activity_stats = {}

    # Generate recommendations
    print("\n" + "=" * 60)
    print("POWER USER THRESHOLD RECOMMENDATIONS")
    print("=" * 60)

    recommendations = recommend_power_user_thresholds(volume_stats, activity_stats, swap_stats)

    for rec in recommendations:
        print(f"\n{rec['metric']}:")
        print(f"  Casual User Max: ${rec.get('casual_max', 0):,.2f}" if 'Volume' in rec['metric'] else f"  Casual User Max: {rec.get('casual_max', 0):,.0f}")
        print(f"  Power User Min: ${rec.get('power_user_min', 0):,.2f}" if 'Volume' in rec['metric'] else f"  Power User Min: {rec.get('power_user_min', 0):,.0f}")
        if 'whale_min' in rec:
            print(f"  Whale Min: ${rec['whale_min']:,.2f}")

    # User tier counts
    print("\n" + "=" * 60)
    print("USER TIER BREAKDOWN")
    print("=" * 60)

    vol_p75 = volume_stats.get("percentiles", {}).get("p75", 0)
    vol_p90 = volume_stats.get("percentiles", {}).get("p90", 0)
    vol_p95 = volume_stats.get("percentiles", {}).get("p95", 0)

    casual = sum(1 for v in volumes if 0 < v <= vol_p75)
    regular = sum(1 for v in volumes if vol_p75 < v <= vol_p90)
    power = sum(1 for v in volumes if vol_p90 < v <= vol_p95)
    whale = sum(1 for v in volumes if v > vol_p95)

    total_vol = sum(volumes)
    casual_vol = sum(v for v in volumes if 0 < v <= vol_p75)
    regular_vol = sum(v for v in volumes if vol_p75 < v <= vol_p90)
    power_vol = sum(v for v in volumes if vol_p90 < v <= vol_p95)
    whale_vol = sum(v for v in volumes if v > vol_p95)

    print(f"\nBy Volume Tier:")
    print(f"  Casual (≤p75):     {casual:>6,} users ({100*casual/len(volumes):.1f}%) | ${casual_vol:>15,.0f} ({100*casual_vol/total_vol:.1f}% of volume)")
    print(f"  Regular (p75-p90): {regular:>6,} users ({100*regular/len(volumes):.1f}%) | ${regular_vol:>15,.0f} ({100*regular_vol/total_vol:.1f}% of volume)")
    print(f"  Power (p90-p95):   {power:>6,} users ({100*power/len(volumes):.1f}%) | ${power_vol:>15,.0f} ({100*power_vol/total_vol:.1f}% of volume)")
    print(f"  Whale (>p95):      {whale:>6,} users ({100*whale/len(volumes):.1f}%) | ${whale_vol:>15,.0f} ({100*whale_vol/total_vol:.1f}% of volume)")

    # Final summary
    print("\n" + "=" * 60)
    print("SUGGESTED SEGMENT THRESHOLDS")
    print("=" * 60)

    days_p90 = days_dist.get('percentiles', {}).get('p90', 'N/A') if days_dist else 'N/A'

    print(f"""
Based on the data analysis, here are suggested thresholds:

VOLUME-BASED TIERS (30-day):
  • Casual:      < ${vol_p75:,.0f}
  • Regular:     ${vol_p75:,.0f} - ${vol_p90:,.0f}
  • Power User:  ${vol_p90:,.0f} - ${vol_p95:,.0f}
  • Whale:       > ${vol_p95:,.0f}

ACTIVITY-BASED (if daily data available):
  • Power users typically have {days_p90} or more active days per month

COMBINED DEFINITION for "Power User":
  A power user should meet EITHER:
  1. Volume > ${vol_p90:,.0f} (top 10% by volume), OR
  2. Active 7+ days AND avg daily volume > ${vol_p75/7:,.0f}
""")

    # Save results to JSON
    results = {
        "volume_distribution": volume_stats,
        "swap_distribution": swap_stats,
        "avg_size_distribution": size_stats,
        "activity_patterns": activity_stats,
        "volume_elbows": volume_elbows,
        "swap_elbows": swap_elbows,
        "recommendations": recommendations,
        "suggested_thresholds": {
            "casual_max_volume": vol_p75,
            "regular_max_volume": vol_p90,
            "power_min_volume": vol_p90,
            "whale_min_volume": vol_p95
        }
    }

    with open("power_user_analysis_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nResults saved to power_user_analysis_results.json")


if __name__ == "__main__":
    main()
