import type { CubeQuery, CubeResponse } from '../types/segments';

// Use proxy path - configured in vite.config.ts
const CUBE_API_URL = '/cubejs-api/v1';

// API key for Cube.js authentication (set via VITE_CUBE_API_KEY env var)
const CUBE_API_KEY = import.meta.env.VITE_CUBE_API_KEY || '';

export async function queryCube<T = Record<string, unknown>>(
  query: CubeQuery
): Promise<CubeResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (CUBE_API_KEY) {
    headers['x-api-key'] = CUBE_API_KEY;
  }

  const response = await fetch(`${CUBE_API_URL}/load`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cube API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * SEGMENT QUERY CONFIGURATIONS
 *
 * These queries use hard thresholds as proxies for percentile-based segments.
 * Cube.js doesn't support NTILE/percentile functions, so we use approximate
 * dollar/count thresholds derived from historical data.
 *
 * See AXIOM_SEGMENTS_ANALYSIS.md for the full percentile-based definitions.
 *
 * SEGMENT CALCULATION CONDITIONS:
 * ┌─────────────────────┬──────────────────────────────────────────────────────────┐
 * │ Segment             │ Condition                                                │
 * ├─────────────────────┼──────────────────────────────────────────────────────────┤
 * │ Whales              │ volume_percentile >= 95 (~$196K+)                        │
 * │ Mid-Tier            │ volume_percentile 75-95 (~$53K-$196K)                    │
 * │ Lapsed Power        │ last_trade < 14 days ago AND volume_percentile >= 75    │
 * │ Streak Masters      │ frequency_percentile >= 95 (~500+ swaps)                │
 * │ Consistent          │ frequency_percentile 50-95 (~200-500 swaps)             │
 * │ Active Small        │ frequency >= 50th pctl AND volume < 50th pctl           │
 * │ Suspected Bots      │ swaps_per_day > 50 AND avg_swap_size < $100             │
 * │ Accumulators        │ flow_percentile >= 75 (net buyers)                      │
 * │ Distributors        │ flow_percentile < 25 (net sellers)                      │
 * │ Rising Stars        │ velocity_percentile >= 90 (1.5x+ WoW growth)            │
 * │ Cooling Down        │ velocity_percentile < 10 AND volume >= 50th pctl        │
 * │ At-Risk Mid         │ velocity < 25th pctl AND volume 50-75th pctl            │
 * │ New Users           │ first_trade >= NOW() - 7 days                           │
 * │ One-and-Done        │ swap_count = 1 AND first_trade < 7 days ago             │
 * │ Alpha Winners       │ pnl_percentile >= 95 AND gaming_risk = 'LOW'            │
 * └─────────────────────┴──────────────────────────────────────────────────────────┘
 *
 * NOTE: Hard thresholds below are approximations. For true percentile-based
 * segmentation, use the SQL in AXIOM_SEGMENTS_ANALYSIS.md Section 9.
 */
export const SEGMENT_QUERIES = {
  whales: {
    type: 'whales' as const,
    name: 'Whales',
    description: 'Top 5% traders with $196K+ volume (36% of total volume)',
    color: '#3B82F6',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['196000'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
  },

  mid_tier: {
    type: 'mid_tier' as const,
    name: 'Mid-Tier Traders',
    description: 'Regular traders with $53K-$196K volume (p75-p95)',
    color: '#06B6D4',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['53000'],
        },
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'lt',
          values: ['196000'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
  },

  streak_masters: {
    type: 'streak_masters' as const,
    name: 'Streak Masters',
    description: 'Highly active traders (500+ swaps in 30 days)',
    color: '#14B8A6',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'gte',
          values: ['500'],
        },
      ],
      order: { 'user_axiom_volume.swap_count': 'desc' as const },
      limit: 10000,
    },
  },

  lapsed_whales: {
    type: 'lapsed_whales' as const,
    name: 'Lapsed Power Users',
    description: 'Power users ($119K+) inactive 14+ days',
    color: '#EF4444',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: [
            new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ] as [string, string],
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['119000'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
  },

  consistent_traders: {
    type: 'consistent_traders' as const,
    name: 'Consistent Traders',
    description: 'Regular active traders (200-500 swaps in 30 days)',
    color: '#F59E0B',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'gte',
          values: ['200'],
        },
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'lt',
          values: ['500'],
        },
      ],
      order: { 'user_axiom_volume.swap_count': 'desc' as const },
      limit: 10000,
    },
  },

  accumulators: {
    type: 'accumulators' as const,
    name: 'Accumulators',
    description: 'Top net buyers (highest USD1 inflow)',
    color: '#10B981',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      order: { 'user_axiom_volume.net_usd1_flow': 'desc' as const },
      limit: 10000,
    },
  },

  distributors: {
    type: 'distributors' as const,
    name: 'Distributors',
    description: 'Top net sellers (highest USD1 outflow)',
    color: '#F43F5E',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      order: { 'user_axiom_volume.net_usd1_flow': 'asc' as const },
      limit: 10000,
    },
  },

  active_small: {
    type: 'active_small' as const,
    name: 'Active Small Traders',
    description: 'High frequency (100+ trades) but small avg size ($200 or less)',
    color: '#8B5CF6',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'gte',
          values: ['100'],
        },
        {
          member: 'user_axiom_volume.avg_swap_size',
          operator: 'lte',
          values: ['200'],
        },
      ],
      order: { 'user_axiom_volume.swap_count': 'desc' as const },
      limit: 10000,
    },
  },

  new_users: {
    type: 'new_users' as const,
    name: 'New Users',
    description: 'First-time traders in the last 7 days',
    color: '#EC4899',
    chartType: 'line' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 7 days',
          granularity: 'day',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'equals',
          values: ['1'],
        },
      ],
      limit: 10000,
    },
    // Additional query for daily counts
    trendQuery: {
      measures: ['user_axiom_volume.swap_count'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 7 days',
          granularity: 'day',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'equals',
          values: ['1'],
        },
      ],
    },
  },

  // === NEW SEGMENTS ===

  at_risk_mid_tier: {
    type: 'at_risk_mid_tier' as const,
    name: 'At-Risk Mid-Tier',
    description: 'Mid-tier traders ($53K-$196K) inactive 7-30 days',
    color: '#EAB308',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: [
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ] as [string, string],
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['53000'],
        },
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'lt',
          values: ['196000'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
  },

  one_and_done: {
    type: 'one_and_done' as const,
    name: 'One-and-Done',
    description: 'Users who made 1 trade 7+ days ago and never returned',
    color: '#6B7280',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: [
            new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ] as [string, string],
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.swap_count',
          operator: 'equals',
          values: ['1'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
  },

  rising_stars: {
    type: 'rising_stars' as const,
    name: 'Rising Stars',
    description: 'Users with 1.5x+ week-over-week volume growth (min $1K)',
    color: '#22C55E',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 7 days',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['1000'],
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
    // Comparison query for previous week
    comparisonQuery: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: [
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ] as [string, string],
        },
      ],
      limit: 10000,
    },
    velocityThreshold: 1.5,
    velocityDirection: 'up' as const,
  },

  cooling_down: {
    type: 'cooling_down' as const,
    name: 'Cooling Down',
    description: 'Users with 50%+ week-over-week volume decline (was $50K+)',
    color: '#F97316',
    chartType: 'bar' as const,
    query: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count', 'user_axiom_volume.avg_swap_size', 'user_axiom_volume.net_usd1_flow'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 7 days',
        },
      ],
      order: { 'user_axiom_volume.total_usd_volume': 'desc' as const },
      limit: 10000,
    },
    // Comparison query for previous week (users who had $50K+)
    comparisonQuery: {
      measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count'],
      dimensions: ['user_axiom_volume.fee_payer'],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: [
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ] as [string, string],
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.total_usd_volume',
          operator: 'gte',
          values: ['50000'],
        },
      ],
      limit: 10000,
    },
    velocityThreshold: 0.5,
    velocityDirection: 'down' as const,
  },
};

export type SegmentKey = keyof typeof SEGMENT_QUERIES;

// Helper to format wallet address
export function formatWallet(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Helper to format currency
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Helper to format number
export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}
