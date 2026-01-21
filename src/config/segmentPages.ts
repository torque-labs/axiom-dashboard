import type { SegmentKey } from '../lib/cube';

export interface SegmentMetricConfig {
  key: string;
  label: string;
  format: 'number' | 'currency' | 'percent';
  compute: (users: SegmentUser[]) => number;
}

export interface SegmentChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'histogram' | 'area' | 'pipeline';
  title: string;
  description: string;
  dataKey?: string;
  xKey?: string;
  yKey?: string;
  // For histograms
  bucketField?: string;
  bucketCount?: number;
  // For time series
  timeField?: string;
  granularity?: 'day' | 'week';
  // For pipeline charts
  tiers?: { label: string; min: number; max: number; color: string }[];
}

export interface SegmentPageConfig {
  key: SegmentKey;
  name: string;
  description: string;
  color: string;
  growthQuestion: string;
  metrics: SegmentMetricConfig[];
  charts: [SegmentChartConfig, SegmentChartConfig];
}

export interface SegmentUser {
  fee_payer: string;
  total_usd_volume: number;
  swap_count: number;
  avg_swap_size: number;
  net_usd1_flow: number;
  aggregation_date?: string;
  // Streak fields (from user_streaks cube)
  current_streak_length?: number;
  max_streak_length_30d?: number;
  total_active_days_30d?: number;
  // Buy/sell metrics
  buy_sell_ratio?: number;
  sell_volume_pct?: number;
}

// Helper functions for metric computation
const sum = (users: SegmentUser[], field: keyof SegmentUser) =>
  users.reduce((acc, u) => acc + (Number(u[field]) || 0), 0);

const _avg = (users: SegmentUser[], field: keyof SegmentUser) =>
  users.length ? sum(users, field) / users.length : 0;
void _avg; // Keep for potential future use

const median = (users: SegmentUser[], field: keyof SegmentUser) => {
  const values = users.map(u => Number(u[field]) || 0).filter(v => v > 0).sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
};

const max = (users: SegmentUser[], field: keyof SegmentUser) =>
  users.reduce((max, u) => Math.max(max, Number(u[field]) || 0), 0);

const topNPercentOfTotal = (users: SegmentUser[], n: number, field: keyof SegmentUser) => {
  const total = sum(users, field);
  if (!total) return 0;
  const sorted = [...users].sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0));
  const topN = sorted.slice(0, n);
  const topNSum = topN.reduce((acc, u) => acc + (Number(u[field]) || 0), 0);
  return (topNSum / total) * 100;
};

export const SEGMENT_PAGE_CONFIGS: Record<SegmentKey, SegmentPageConfig> = {
  whales: {
    key: 'whales',
    name: 'Whales',
    description: 'Top 5% traders with $196K+ volume (36% of total volume)',
    color: '#3B82F6',
    growthQuestion: 'Are my VIPs healthy? Are they growing or declining?',
    metrics: [
      {
        key: 'count',
        label: 'Whale Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Total Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'concentration',
        label: 'Top 5 Concentration',
        format: 'percent',
        compute: (users) => topNPercentOfTotal(users, 5, 'total_usd_volume'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Volume by Whale',
        description: 'Top whales ranked by trading volume',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'histogram',
        title: 'Activity Distribution',
        description: 'Distribution of swap counts across whales',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
    ],
  },

  mid_tier: {
    key: 'mid_tier',
    name: 'Mid-Tier Traders',
    description: 'Regular traders with $53K-$196K volume (p75-p95)',
    color: '#06B6D4',
    growthQuestion: "Who's ready to become a whale? What's blocking them?",
    metrics: [
      {
        key: 'hotProspects',
        label: 'Hot Prospects (>$175K)',
        format: 'number',
        compute: (users) => users.filter(u => u.total_usd_volume >= 175000).length,
      },
      {
        key: 'medianGap',
        label: 'Median Gap to Whale',
        format: 'currency',
        compute: (users) => 196000 - median(users, 'total_usd_volume'),
      },
      {
        key: 'needMoreTrades',
        label: 'Need More Trades',
        format: 'percent',
        compute: (users) => {
          const freqLimited = users.filter(u => u.swap_count < 200 && u.avg_swap_size >= 150).length;
          return users.length > 0 ? (freqLimited / users.length) * 100 : 0;
        },
      },
      {
        key: 'needBiggerTrades',
        label: 'Need Bigger Trades',
        format: 'percent',
        compute: (users) => {
          const sizeLimited = users.filter(u => u.swap_count >= 200 && u.avg_swap_size < 150).length;
          return users.length > 0 ? (sizeLimited / users.length) * 100 : 0;
        },
      },
    ],
    charts: [
      {
        type: 'pipeline',
        title: 'Pipeline to Whale Status',
        description: 'How close are traders to the $196K whale threshold?',
        dataKey: 'total_usd_volume',
        tiers: [
          { label: '$175K-$196K: Hot Prospects', min: 175000, max: 196000, color: '#22C55E' },
          { label: '$125K-$175K: Building Momentum', min: 125000, max: 175000, color: '#3B82F6' },
          { label: '$75K-$125K: Developing', min: 75000, max: 125000, color: '#F59E0B' },
          { label: '$53K-$75K: Just Entered', min: 53000, max: 75000, color: '#6B7280' },
        ],
      },
      {
        type: 'scatter',
        title: 'Behavior Analysis: Trade Size vs Frequency',
        description: 'Top-right = Rising Stars | Top-left = Need engagement | Bottom-right = Need bigger trades',
        xKey: 'swap_count',
        yKey: 'avg_swap_size',
      },
    ],
  },

  streak_masters: {
    key: 'streak_masters',
    name: 'Streak Masters',
    description: 'Highly active traders (500+ swaps in 30 days)',
    color: '#14B8A6',
    growthQuestion: 'Who are my most engaged users? How do I keep them active?',
    metrics: [
      {
        key: 'count',
        label: 'Power Traders',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Total Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
    ],
    charts: [
      {
        type: 'histogram',
        title: 'Swap Count Distribution',
        description: 'How active are your power traders?',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
      {
        type: 'bar',
        title: 'Top Traders by Activity',
        description: 'Most active users by swap count',
        dataKey: 'swap_count',
      },
    ],
  },

  lapsed_whales: {
    key: 'lapsed_whales',
    name: 'Lapsed Power Users',
    description: 'Power users ($119K+) inactive 14+ days',
    color: '#EF4444',
    growthQuestion: 'Who should I re-engage? What volume did we lose?',
    metrics: [
      {
        key: 'count',
        label: 'Lapsed Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'lostVolume',
        label: 'Lost Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianLostVolume',
        label: 'Median Lost Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Past Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Lost Volume by User',
        description: 'Prioritize outreach by value at risk',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'histogram',
        title: 'Trade Size Distribution',
        description: 'Historical avg trade sizes of lapsed whales',
        bucketField: 'avg_swap_size',
        bucketCount: 6,
      },
    ],
  },

  consistent_traders: {
    key: 'consistent_traders',
    name: 'Consistent Traders',
    description: 'Regular active traders (200-500 swaps in 30 days)',
    color: '#F59E0B',
    growthQuestion: 'Who are my reliable regulars? How do I level them up?',
    metrics: [
      {
        key: 'count',
        label: 'Trader Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Total Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
    ],
    charts: [
      {
        type: 'histogram',
        title: 'Swap Count Distribution',
        description: 'Activity level of consistent traders',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
      {
        type: 'scatter',
        title: 'Volume vs Frequency',
        description: 'Who is ready to become a power trader?',
        xKey: 'swap_count',
        yKey: 'total_usd_volume',
      },
    ],
  },

  accumulators: {
    key: 'accumulators',
    name: 'Accumulators',
    description: 'Top net buyers (highest USD1 inflow)',
    color: '#10B981',
    growthQuestion: 'Who are my believers? Can they become advocates?',
    metrics: [
      {
        key: 'count',
        label: 'Accumulator Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalInflow',
        label: 'Total Net Inflow',
        format: 'currency',
        compute: (users) => sum(users, 'net_usd1_flow'),
      },
      {
        key: 'medianInflow',
        label: 'Median Net Inflow',
        format: 'currency',
        compute: (users) => median(users, 'net_usd1_flow'),
      },
      {
        key: 'largestAccumulator',
        label: 'Largest Position',
        format: 'currency',
        compute: (users) => max(users, 'net_usd1_flow'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Net Inflow by User',
        description: 'Who is accumulating the most?',
        dataKey: 'net_usd1_flow',
      },
      {
        type: 'histogram',
        title: 'Inflow Distribution',
        description: 'How concentrated is accumulation?',
        bucketField: 'net_usd1_flow',
        bucketCount: 8,
      },
    ],
  },

  distributors: {
    key: 'distributors',
    name: 'Distributors',
    description: 'Top net sellers (highest USD1 outflow)',
    color: '#F43F5E',
    growthQuestion: 'Who is exiting positions? Is this profit-taking or churn risk?',
    metrics: [
      {
        key: 'count',
        label: 'Distributor Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Total Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'totalOutflow',
        label: 'Total Net Outflow',
        format: 'currency',
        compute: (users) => Math.abs(sum(users, 'net_usd1_flow')),
      },
      {
        key: 'medianOutflow',
        label: 'Median Net Outflow',
        format: 'currency',
        compute: (users) => Math.abs(median(users, 'net_usd1_flow')),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Volume by Distributor',
        description: 'Who is selling the most?',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'histogram',
        title: 'Sell Volume Distribution',
        description: 'How concentrated is selling?',
        bucketField: 'total_usd_volume',
        bucketCount: 8,
      },
    ],
  },

  active_small: {
    key: 'active_small',
    name: 'Active Small Traders',
    description: 'High frequency (100+ trades) but small avg size ($200 or less)',
    color: '#8B5CF6',
    growthQuestion: "Who's ready to graduate to bigger trades?",
    metrics: [
      {
        key: 'count',
        label: 'User Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalSwaps',
        label: 'Total Swaps',
        format: 'number',
        compute: (users) => sum(users, 'swap_count'),
      },
      {
        key: 'totalVolume',
        label: 'Total Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianTradeSize',
        label: 'Median Trade Size',
        format: 'currency',
        compute: (users) => median(users, 'avg_swap_size'),
      },
    ],
    charts: [
      {
        type: 'histogram',
        title: 'Trade Frequency Distribution',
        description: 'How engaged are they?',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
      {
        type: 'scatter',
        title: 'Volume vs Trade Count',
        description: 'Identify graduation candidates',
        xKey: 'swap_count',
        yKey: 'total_usd_volume',
      },
    ],
  },

  new_users: {
    key: 'new_users',
    name: 'New Users',
    description: 'First-time traders in the last 7 days',
    color: '#EC4899',
    growthQuestion: 'Is my acquisition funnel healthy?',
    metrics: [
      {
        key: 'count',
        label: 'New Users (7d)',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'First Week Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianFirstTrade',
        label: 'Median First Trade',
        format: 'currency',
        compute: (users) => median(users, 'avg_swap_size'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
    ],
    charts: [
      {
        type: 'histogram',
        title: 'First Trade Size Distribution',
        description: 'Quality of new users',
        bucketField: 'avg_swap_size',
        bucketCount: 8,
      },
      {
        type: 'bar',
        title: 'Top New Users by Volume',
        description: 'High-potential new users',
        dataKey: 'total_usd_volume',
      },
    ],
  },

  // === NEW SEGMENTS ===

  at_risk_mid_tier: {
    key: 'at_risk_mid_tier',
    name: 'At-Risk Mid-Tier',
    description: 'Mid-tier traders ($53K-$196K) inactive 7-30 days',
    color: '#EAB308',
    growthQuestion: 'Who is slipping away? Can we automate "we miss you" campaigns?',
    metrics: [
      {
        key: 'count',
        label: 'At-Risk Count',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Volume at Risk',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Past Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Volume at Risk',
        description: 'Prioritize outreach by historical value',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'histogram',
        title: 'Activity History',
        description: 'How active were they before going quiet?',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
    ],
  },

  one_and_done: {
    key: 'one_and_done',
    name: 'One-and-Done',
    description: 'Users who made 1 trade 7+ days ago and never returned',
    color: '#6B7280',
    growthQuestion: 'Why did they leave? Is this an activation problem?',
    metrics: [
      {
        key: 'count',
        label: 'Churned Users',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Total First Trades',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianFirstTrade',
        label: 'Median First Trade',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'maxFirstTrade',
        label: 'Largest First Trade',
        format: 'currency',
        compute: (users) => max(users, 'total_usd_volume'),
      },
    ],
    charts: [
      {
        type: 'histogram',
        title: 'First Trade Size Distribution',
        description: 'Were they testing with small or large amounts?',
        bucketField: 'total_usd_volume',
        bucketCount: 8,
      },
      {
        type: 'bar',
        title: 'Top One-and-Done by Trade Size',
        description: 'High-value users who never returned',
        dataKey: 'total_usd_volume',
      },
    ],
  },

  rising_stars: {
    key: 'rising_stars',
    name: 'Rising Stars',
    description: 'Users with 1.5x+ week-over-week volume growth (min $1K)',
    color: '#22C55E',
    growthQuestion: 'Who is surging right now? How do I reinforce this behavior?',
    metrics: [
      {
        key: 'count',
        label: 'Rising Stars',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Current Week Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Top Rising Stars by Volume',
        description: 'Fastest growing users this week',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'scatter',
        title: 'Growth vs Activity',
        description: 'Volume vs swap count for rising users',
        xKey: 'swap_count',
        yKey: 'total_usd_volume',
      },
    ],
  },

  cooling_down: {
    key: 'cooling_down',
    name: 'Cooling Down',
    description: 'Users with 50%+ week-over-week volume decline (was $50K+)',
    color: '#F97316',
    growthQuestion: 'Who is declining before they fully churn? Early warning system.',
    metrics: [
      {
        key: 'count',
        label: 'Cooling Down',
        format: 'number',
        compute: (users) => users.length,
      },
      {
        key: 'totalVolume',
        label: 'Current Week Volume',
        format: 'currency',
        compute: (users) => sum(users, 'total_usd_volume'),
      },
      {
        key: 'medianVolume',
        label: 'Median Volume',
        format: 'currency',
        compute: (users) => median(users, 'total_usd_volume'),
      },
      {
        key: 'medianSwaps',
        label: 'Median Swaps',
        format: 'number',
        compute: (users) => median(users, 'swap_count'),
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Volume This Week',
        description: 'Remaining activity from declining users',
        dataKey: 'total_usd_volume',
      },
      {
        type: 'histogram',
        title: 'Activity Distribution',
        description: 'How active are declining users?',
        bucketField: 'swap_count',
        bucketCount: 8,
      },
    ],
  },
};
