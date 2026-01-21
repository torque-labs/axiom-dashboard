import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Legend,
} from 'recharts';
import { Layout } from './Layout';
import { MetricCard } from './MetricCard';

// Import JSON data
import campaignMetrics from '../../data/campaign_metrics.json';
import gamingIndicators from '../../data/gaming_indicators.json';
import leaderboardData from '../../data/leaderboard.json';
import top200Traders from '../../data/top_200_traders.json';

// Formatting utilities
const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

// Trader flag status types
interface TraderFlags {
  status: 'critical' | 'warning' | 'clean';
  reasons: string[];
  mitigations: string[];
}

// Get trader flag status based on thresholds
const getTraderFlags = (trader: typeof top200Traders.traders[0]): TraderFlags => {
  const reasons: string[] = [];
  const mitigations: string[] = [];
  let hasCritical = false;
  let hasWarning = false;

  // Check rapid reversals
  if (trader.rapid_reversals >= top200Traders.flag_thresholds.rapid_reversals_critical) {
    hasCritical = true;
    reasons.push(`${trader.rapid_reversals.toLocaleString()} rapid reversals (critical: >${top200Traders.flag_thresholds.rapid_reversals_critical})`);
    mitigations.push('Add cooldown period between buys/sells of same token');
  } else if (trader.rapid_reversals >= top200Traders.flag_thresholds.rapid_reversals_warning) {
    hasWarning = true;
    reasons.push(`${trader.rapid_reversals.toLocaleString()} rapid reversals (warning: >${top200Traders.flag_thresholds.rapid_reversals_warning})`);
    mitigations.push('Monitor for wash trading patterns');
  }

  // Check token concentration
  if (trader.token_concentration_pct >= top200Traders.flag_thresholds.token_concentration_critical) {
    hasCritical = true;
    reasons.push(`${trader.token_concentration_pct.toFixed(1)}% volume in single token (critical: >${top200Traders.flag_thresholds.token_concentration_critical}%)`);
    mitigations.push('Require minimum token diversity for rewards');
  } else if (trader.token_concentration_pct >= top200Traders.flag_thresholds.token_concentration_warning) {
    hasWarning = true;
    reasons.push(`${trader.token_concentration_pct.toFixed(1)}% volume in single token (warning: >${top200Traders.flag_thresholds.token_concentration_warning}%)`);
    mitigations.push('Consider token diversification requirements');
  }

  // Check single day only
  if (trader.active_days === 1) {
    hasWarning = true;
    reasons.push('Active only 1 day - potential one-and-done trader');
    mitigations.push('Require multi-day participation for top rewards');
  }

  return {
    status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'clean',
    reasons,
    mitigations,
  };
};

// Transform cohort data for retention chart
interface CohortRow {
  cohort: string;
  d0_traders: number;
  d0_volume: number;
  d1_traders?: number;
  d1_volume?: number;
  d1_retention?: number;
  d2_traders?: number;
  d2_volume?: number;
  d2_retention?: number;
}

const transformCohortData = (): CohortRow[] => {
  const cohortMap = new Map<string, CohortRow>();

  top200Traders.cohort_retention.forEach(row => {
    const cohortKey = row.cohort_date.split('-').slice(1).join('/');
    if (!cohortMap.has(cohortKey)) {
      cohortMap.set(cohortKey, { cohort: cohortKey, d0_traders: 0, d0_volume: 0 });
    }
    const cohort = cohortMap.get(cohortKey)!;

    if (row.day === 0) {
      cohort.d0_traders = row.unique_traders;
      cohort.d0_volume = row.total_volume;
    } else if (row.day === 1) {
      cohort.d1_traders = row.unique_traders;
      cohort.d1_volume = row.total_volume;
      cohort.d1_retention = (row.unique_traders / cohort.d0_traders) * 100;
    } else if (row.day === 2) {
      cohort.d2_traders = row.unique_traders;
      cohort.d2_volume = row.total_volume;
      cohort.d2_retention = (row.unique_traders / cohort.d0_traders) * 100;
    }
  });

  return Array.from(cohortMap.values());
};

const cohortData = transformCohortData();

// Transform data for charts
const dailyOverview = campaignMetrics.daily_overview.map(d => ({
  ...d,
  date: d.date.split('-').slice(1).join('/'), // "01/19" format
  volume_k: d.total_usd_volume / 1000,
}));

const traderBehavior = campaignMetrics.trader_behavior.map(d => ({
  ...d,
  date: d.date.split('-').slice(1).join('/'),
}));

interface PnlRow {
  date: string;
  total_wallets: number;
  big_winners: number;
  small_winners: number;
  small_losers: number;
  big_losers: number;
  pct_profitable: number;
  total_pnl: number;
  avg_pnl: number;
  total_gains: number;
  total_losses: number;
  median_pnl: number;
  p75_pnl: number;
  p90_pnl: number;
  p99_pnl: number;
}

const pnlDistribution: PnlRow[] = campaignMetrics.pnl_distribution.map(d => ({
  ...d,
  date: d.date.split('-').slice(1).join('/'),
}));

const rapidReversals = gamingIndicators.rapid_reversals.map(d => ({
  ...d,
  date: d.date.split('-').slice(1).join('/'),
}));

const volumeDominance = gamingIndicators.volume_dominance.map(d => ({
  ...d,
  date: d.date.split('-').slice(1).join('/'),
}));

// Volume bucket colors
const bucketColors: Record<string, string> = {
  'under_100': '#6366F1',
  '100_500': '#8B5CF6',
  '500_1k': '#A855F7',
  '1k_5k': '#D946EF',
  '5k_10k': '#EC4899',
  'over_10k': '#F43F5E',
};

const bucketLabels: Record<string, string> = {
  'under_100': '<$100',
  '100_500': '$100-500',
  '500_1k': '$500-1K',
  '1k_5k': '$1K-5K',
  '5k_10k': '$5K-10K',
  'over_10k': '>$10K',
};

// Transform volume buckets for stacked bar
const volumeBucketData = Object.entries(campaignMetrics.volume_buckets).map(([date, buckets]) => {
  const row: Record<string, number | string> = { date: date.split('-').slice(1).join('/') };
  buckets.forEach(b => {
    row[b.bucket] = b.wallet_count;
  });
  return row;
});

export function CampaignDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'gaming' | 'leaderboard' | 'traders' | 'cohort'>('overview');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [expandedTrader, setExpandedTrader] = useState<string | null>(null);
  const [traderFilter, setTraderFilter] = useState<'all' | 'critical' | 'warning' | 'clean'>('all');

  // Calculate trader flag statistics
  const traderStats = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let clean = 0;
    top200Traders.traders.forEach(t => {
      const flags = getTraderFlags(t);
      if (flags.status === 'critical') critical++;
      else if (flags.status === 'warning') warning++;
      else clean++;
    });
    return { critical, warning, clean, total: top200Traders.traders.length };
  }, []);

  // Filtered traders based on filter selection
  const filteredTraders = useMemo(() => {
    if (traderFilter === 'all') return top200Traders.traders;
    return top200Traders.traders.filter(t => getTraderFlags(t).status === traderFilter);
  }, [traderFilter]);

  // Calculate latest day metrics
  const latestDay = campaignMetrics.daily_overview[campaignMetrics.daily_overview.length - 1];
  const previousDay = campaignMetrics.daily_overview[campaignMetrics.daily_overview.length - 2];

  const volumeChange = previousDay
    ? ((latestDay.total_usd_volume - previousDay.total_usd_volume) / previousDay.total_usd_volume) * 100
    : 0;
  const tradeChange = previousDay
    ? ((latestDay.total_trades - previousDay.total_trades) / previousDay.total_trades) * 100
    : 0;

  // Total metrics from summary
  const summary = campaignMetrics.summary;
  const totalWallets = summary.total_unique_participants;
  const totalVolume = summary.total_volume_usd;
  const totalTrades = summary.total_trades;

  // Retention rate
  const day3Retention = latestDay.retention_rate;

  // Filter data based on selected date
  const filteredPnlData = selectedDate === 'all'
    ? pnlDistribution
    : pnlDistribution.filter(d => d.date === selectedDate);

  // Win/Loss breakdown data for stacked bar
  const winLossData = pnlDistribution.map(d => ({
    date: d.date,
    'Big Winners (>$100)': d.big_winners,
    'Small Winners ($0-100)': d.small_winners,
    'Small Losers ($0-100)': d.small_losers,
    'Big Losers (>$100)': d.big_losers,
  }));

  // Gains vs Losses data
  const gainsLossesData = pnlDistribution.map(d => ({
    date: d.date,
    gains: d.total_gains,
    losses: Math.abs(d.total_losses),
    net: d.total_pnl,
  }));

  return (
    <Layout>
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-500" />
          <h1 className="text-3xl font-bold text-white">Campaign Performance</h1>
        </div>
        <p className="text-gray-400">
          Axiom/Raydium PNL Leaderboard - Growth & Health Metrics
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {campaignMetrics.meta.period} · Data through {new Date(campaignMetrics.meta.data_through).toLocaleDateString()}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['overview', 'traders', 'cohort', 'gaming', 'leaderboard'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'traders' && 'Top 200 Traders'}
            {tab === 'cohort' && 'Cohort Retention'}
            {tab === 'gaming' && 'Gaming Indicators'}
            {tab === 'leaderboard' && 'PNL Leaderboard'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Hero Metrics */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                title="Total Participants"
                value={formatNumber(totalWallets)}
                subtitle="Cumulative unique wallets"
              />
              <MetricCard
                title="Total Volume"
                value={formatCurrency(totalVolume)}
                subtitle="USD traded"
                trend={{ value: volumeChange, isPositive: volumeChange >= 0 }}
              />
              <MetricCard
                title="Total Trades"
                value={formatNumber(totalTrades)}
                subtitle="Swap transactions"
                trend={{ value: tradeChange, isPositive: tradeChange >= 0 }}
              />
              <MetricCard
                title="Net PNL Distributed"
                value={formatCurrency(summary.total_pnl_distributed)}
                subtitle="Winners - Losers"
              />
              <MetricCard
                title="Day 3 Retention"
                value={`${day3Retention.toFixed(1)}%`}
                subtitle="Day 1 cohort"
              />
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Day 1 Wallets</div>
                <div className="text-lg font-bold text-white">{formatNumber(dailyOverview[0]?.unique_wallets || 0)}</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Day 2 Wallets</div>
                <div className="text-lg font-bold text-white">{formatNumber(dailyOverview[1]?.unique_wallets || 0)}</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Day 3 Wallets</div>
                <div className="text-lg font-bold text-white">{formatNumber(dailyOverview[2]?.unique_wallets || 0)}</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 text-center">
                <div className="text-xs text-green-500">Total Gains</div>
                <div className="text-lg font-bold text-green-400">{formatCurrency(summary.total_gains)}</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-3 text-center">
                <div className="text-xs text-red-500">Total Losses</div>
                <div className="text-lg font-bold text-red-400">{formatCurrency(Math.abs(summary.total_losses))}</div>
              </div>
              <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-500">New Wallets (Day 3)</div>
                <div className="text-lg font-bold text-blue-400">{formatNumber(dailyOverview[2]?.new_wallets || 0)}</div>
              </div>
            </div>
          </section>

          {/* Charts Row 1 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Participation */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Daily Participation</h3>
              <p className="text-sm text-gray-500 mb-4">Wallets & Trades over time</p>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dailyOverview}>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="unique_wallets" name="Wallets" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="total_trades" name="Trades" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Trend */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Volume Trend</h3>
              <p className="text-sm text-gray-500 mb-4">Daily USD volume (thousands)</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyOverview}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [formatCurrency((value as number) * 1000), 'Volume']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume_k"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Charts Row 2 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Retention Funnel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Day 1 Cohort Retention</h3>
              <p className="text-sm text-gray-500 mb-4">How many Day 1 users return</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyOverview} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis dataKey="date" type="category" tick={{ fill: '#9CA3AF', fontSize: 12 }} width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [formatNumber(value as number), 'Returning Users']}
                  />
                  <Bar dataKey="day1_retention" name="Day 1 Users Returning" radius={[0, 4, 4, 0]}>
                    {dailyOverview.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10B981' : index === 1 ? '#F59E0B' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {dailyOverview.map((d, i) => (
                  <div key={d.date} className="bg-gray-900/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Day {i + 1}</div>
                    <div className={`text-lg font-bold ${i === 0 ? 'text-green-400' : i === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {d.retention_rate.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume Buckets */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Trader Volume Distribution</h3>
              <p className="text-sm text-gray-500 mb-4">Wallet count by volume tier</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={volumeBucketData}>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend formatter={(value) => bucketLabels[value] || value} />
                  {Object.keys(bucketColors).map((bucket) => (
                    <Bar
                      key={bucket}
                      dataKey={bucket}
                      stackId="a"
                      fill={bucketColors[bucket]}
                      name={bucket}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Trader Behavior */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Trader Behavior Trends</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avg Volume */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Volume per Trader</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={traderBehavior}>
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(v) => [formatCurrency(v as number), 'Avg Volume']}
                    />
                    <Line type="monotone" dataKey="avg_volume_per_trader" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Trades per Trader */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Trades per Trader</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={traderBehavior}>
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(v) => [(v as number).toFixed(1), 'Trades']}
                    />
                    <Line type="monotone" dataKey="avg_trades_per_trader" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tokens per Trader */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Tokens per Trader</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={traderBehavior}>
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(v) => [(v as number).toFixed(1), 'Tokens']}
                    />
                    <Line type="monotone" dataKey="avg_tokens_per_trader" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* PNL Distribution - Winners vs Losers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Winners vs Losers Breakdown</h2>
              <div className="flex gap-2">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Days</option>
                  {pnlDistribution.map(d => (
                    <option key={d.date} value={d.date}>{d.date}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Stacked Bar - Win/Loss Categories */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Wallet Outcome Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={winLossData}>
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="Big Winners (>$100)" stackId="a" fill="#10B981" />
                    <Bar dataKey="Small Winners ($0-100)" stackId="a" fill="#6EE7B7" />
                    <Bar dataKey="Small Losers ($0-100)" stackId="a" fill="#FCA5A5" />
                    <Bar dataKey="Big Losers (>$100)" stackId="a" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gains vs Losses Flow */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Total Gains vs Losses (USD)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={gainsLossesData}>
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value) => [formatCurrency(value as number), '']}
                    />
                    <Legend />
                    <Bar dataKey="gains" name="Total Gains" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" name="Total Losses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                  <p className="text-sm text-blue-300">
                    Net PNL distributed: <span className="font-bold text-green-400">{formatCurrency(summary.total_pnl_distributed)}</span>
                    {' '}— Winners extracted {formatCurrency(summary.total_gains)} while losers lost {formatCurrency(Math.abs(summary.total_losses))}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Daily PNL Statistics (All Participants)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4 text-right">All Wallets</th>
                      <th className="pb-3 pr-4 text-right">Winners</th>
                      <th className="pb-3 pr-4 text-right">Losers</th>
                      <th className="pb-3 pr-4 text-right">% Profitable</th>
                      <th className="pb-3 pr-4 text-right">Total Gains</th>
                      <th className="pb-3 pr-4 text-right">Total Losses</th>
                      <th className="pb-3 pr-4 text-right">Net PNL</th>
                      <th className="pb-3 text-right">Avg PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPnlData.map((row) => (
                      <tr key={row.date} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 pr-4 text-white font-medium">{row.date}</td>
                        <td className="py-3 pr-4 text-right text-gray-300">{formatNumber(row.total_wallets)}</td>
                        <td className="py-3 pr-4 text-right text-green-400">{formatNumber(row.big_winners + row.small_winners)}</td>
                        <td className="py-3 pr-4 text-right text-red-400">{formatNumber(row.small_losers + row.big_losers)}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={`px-2 py-1 rounded text-sm ${
                            row.pct_profitable >= 40 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {row.pct_profitable}%
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-green-400">{formatCurrency(row.total_gains)}</td>
                        <td className="py-3 pr-4 text-right text-red-400">{formatCurrency(Math.abs(row.total_losses))}</td>
                        <td className="py-3 pr-4 text-right text-blue-400 font-medium">{formatCurrency(row.total_pnl)}</td>
                        <td className={`py-3 text-right ${row.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(row.avg_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'gaming' && (
        <>
          {/* Gaming Overview */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Rapid Reversals (Day 3)"
                value={formatNumber(rapidReversals[rapidReversals.length - 1]?.rapid_reversals || 0)}
                subtitle={`${rapidReversals[rapidReversals.length - 1]?.pct_of_wallets || 0}% of wallets`}
              />
              <MetricCard
                title="Volume Dominators"
                value={`${volumeDominance[volumeDominance.length - 1]?.wallets_over_50pct || 0}`}
                subtitle=">50% of token volume"
              />
              <MetricCard
                title="Tokens Dominated"
                value={`${volumeDominance[volumeDominance.length - 1]?.tokens_dominated || 0}`}
                subtitle="Single trader control"
              />
              <MetricCard
                title="High Concentration"
                value={`${gamingIndicators.token_concentration.pct_highly_concentrated.toFixed(0)}%`}
                subtitle=">80% single token PNL"
              />
            </div>
          </section>

          {/* Gaming Trends */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Rapid Reversals Trend */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Rapid Reversals Trend</h3>
              <p className="text-sm text-gray-500 mb-4">Buy/Sell within 60 seconds</p>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={rapidReversals}>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="rapid_reversals" name="Reversals" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pct_of_wallets" name="% of Wallets" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                <p className="text-sm text-green-400">
                  Rapid reversals decreased from 64% to 55% of wallets - gaming behavior declining.
                </p>
              </div>
            </div>

            {/* Volume Dominance Trend */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Volume Dominance Trend</h3>
              <p className="text-sm text-gray-500 mb-4">Single traders controlling token volume</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={volumeDominance}>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="wallets_over_50pct" name=">50% Dominance" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wallets_over_80pct" name=">80% Dominance" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                <p className="text-sm text-green-400">
                  Volume dominators reduced from 64 to 26 wallets - manipulation decreasing.
                </p>
              </div>
            </div>
          </section>

          {/* Flagged Wallets */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Flagged Wallet Activity</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/80">
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Concern</th>
                      <th className="px-4 py-3 text-right">Day 1 Volume</th>
                      <th className="px-4 py-3 text-right">Day 2 Volume</th>
                      <th className="px-4 py-3 text-right">Day 3 Volume</th>
                      <th className="px-4 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamingIndicators.flagged_wallets_activity.map((wallet) => {
                      const day1 = wallet.daily_activity.find(a => a.date === '2026-01-19')?.volume || 0;
                      const day2 = wallet.daily_activity.find(a => a.date === '2026-01-20')?.volume || 0;
                      const day3 = wallet.daily_activity.find(a => a.date === '2026-01-21')?.volume || 0;
                      const trend = day1 > 0 ? ((day3 - day1) / day1) * 100 : 0;

                      return (
                        <tr key={wallet.wallet} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-blue-400">
                              {wallet.wallet.substring(0, 8)}...
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              wallet.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                              wallet.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
                              wallet.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {wallet.risk_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                            {wallet.concern}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {day1 > 0 ? formatCurrency(day1) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {day2 > 0 ? formatCurrency(day2) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {day3 > 0 ? formatCurrency(day3) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {day1 > 0 && (
                              <span className={`text-sm font-medium ${trend <= -50 ? 'text-green-400' : trend < 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {formatPercent(trend)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Link to Full Gaming Analysis */}
          <div className="text-center">
            <Link
              to="/gaming-analysis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              View Full Gaming Analysis
            </Link>
          </div>
        </>
      )}

      {activeTab === 'leaderboard' && (
        <>
          {/* Leaderboard Stats */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Top PNL"
                value={formatCurrency(leaderboardData.top_50[0]?.pnl || 0)}
                subtitle={`${leaderboardData.top_50[0]?.wallet.substring(0, 8)}...`}
              />
              <MetricCard
                title="Flagged in Top 20"
                value={`${leaderboardData.top_50.slice(0, 20).filter(t => t.flags.length > 0).length}`}
                subtitle="With risk flags"
              />
              <MetricCard
                title="New Top 10 Entries"
                value={`${leaderboardData.leaderboard_changes_since_report.new_entrants_top_10.length}`}
                subtitle="Since Jan 20"
              />
              <MetricCard
                title="Total Top 50 PNL"
                value={formatCurrency(leaderboardData.top_50.reduce((sum, t) => sum + t.pnl, 0))}
                subtitle="Combined"
              />
            </div>
          </section>

          {/* Leaderboard Table */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Current Leaderboard (Top 50)</h3>
                <p className="text-sm text-gray-500">Original rules: $1K min token volume</p>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/80 sticky top-0">
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3 text-right">PNL</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3 text-right">Tokens</th>
                      <th className="px-4 py-3">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.top_50.map((trader) => (
                      <tr
                        key={trader.wallet}
                        className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${
                          trader.flags.length > 0 ? 'bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-500 text-sm">{trader.rank}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-blue-400">
                            {trader.wallet.substring(0, 12)}...
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatCurrency(trader.pnl)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 text-sm">
                          {formatCurrency(trader.volume)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-sm">
                          {trader.tokens}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {trader.flags.slice(0, 2).map((flag, i) => (
                              <span
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  flag.includes('Coordination') ? 'bg-red-500/20 text-red-300' :
                                  flag.includes('Dominance') ? 'bg-orange-500/20 text-orange-300' :
                                  flag.includes('Concentration') ? 'bg-yellow-500/20 text-yellow-300' :
                                  flag.includes('Reversal') ? 'bg-purple-500/20 text-purple-300' :
                                  'bg-gray-600 text-gray-300'
                                }`}
                              >
                                {flag.length > 18 ? flag.substring(0, 18) + '...' : flag}
                              </span>
                            ))}
                            {trader.flags.length > 2 && (
                              <span className="text-xs text-gray-500">+{trader.flags.length - 2}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Changes Since Report */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Changes Since Report (Jan 20)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-green-400 mb-3">New Top 10 Entrants</h3>
                <div className="space-y-2">
                  {leaderboardData.leaderboard_changes_since_report.new_entrants_top_10.map((entry) => (
                    <div key={entry.wallet} className="flex items-center justify-between p-2 bg-green-900/20 rounded-lg">
                      <div>
                        <span className="text-sm font-mono text-blue-400">{entry.wallet.substring(0, 12)}...</span>
                        <span className="text-xs text-gray-500 ml-2">#{entry.new_rank}</span>
                      </div>
                      <span className="text-sm text-green-400 font-medium">{formatCurrency(entry.pnl)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-medium text-red-400 mb-3">Dropped from Top 10</h3>
                <div className="space-y-2">
                  {leaderboardData.leaderboard_changes_since_report.dropped_from_top_10.map((entry) => (
                    <div key={entry.wallet} className="flex items-center justify-between p-2 bg-red-900/20 rounded-lg">
                      <span className="text-sm font-mono text-blue-400">{entry.wallet}</span>
                      <span className="text-sm text-red-400">#{entry.old_rank} → #{entry.new_rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'traders' && (
        <>
          {/* Trader Stats Overview */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Traders"
                value={formatNumber(traderStats.total)}
                subtitle="Top 200 by volume"
              />
              <div
                onClick={() => setTraderFilter(traderFilter === 'critical' ? 'all' : 'critical')}
                className={`cursor-pointer transition-all ${traderFilter === 'critical' ? 'ring-2 ring-red-500' : ''}`}
              >
                <MetricCard
                  title="Critical Flags"
                  value={`${traderStats.critical}`}
                  subtitle={`${((traderStats.critical / traderStats.total) * 100).toFixed(1)}% of traders`}
                />
              </div>
              <div
                onClick={() => setTraderFilter(traderFilter === 'warning' ? 'all' : 'warning')}
                className={`cursor-pointer transition-all ${traderFilter === 'warning' ? 'ring-2 ring-yellow-500' : ''}`}
              >
                <MetricCard
                  title="Warning Flags"
                  value={`${traderStats.warning}`}
                  subtitle={`${((traderStats.warning / traderStats.total) * 100).toFixed(1)}% of traders`}
                />
              </div>
              <div
                onClick={() => setTraderFilter(traderFilter === 'clean' ? 'all' : 'clean')}
                className={`cursor-pointer transition-all ${traderFilter === 'clean' ? 'ring-2 ring-green-500' : ''}`}
              >
                <MetricCard
                  title="Clean Traders"
                  value={`${traderStats.clean}`}
                  subtitle={`${((traderStats.clean / traderStats.total) * 100).toFixed(1)}% of traders`}
                />
              </div>
            </div>
          </section>

          {/* Flag Thresholds Info */}
          <section className="mb-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Flag Thresholds</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-red-900/20 rounded-lg p-3">
                  <div className="text-red-400 font-medium">Critical: Rapid Reversals</div>
                  <div className="text-gray-400">&gt; {top200Traders.flag_thresholds.rapid_reversals_critical} buy/sell in 60s</div>
                </div>
                <div className="bg-yellow-900/20 rounded-lg p-3">
                  <div className="text-yellow-400 font-medium">Warning: Rapid Reversals</div>
                  <div className="text-gray-400">&gt; {top200Traders.flag_thresholds.rapid_reversals_warning} buy/sell in 60s</div>
                </div>
                <div className="bg-red-900/20 rounded-lg p-3">
                  <div className="text-red-400 font-medium">Critical: Token Concentration</div>
                  <div className="text-gray-400">&gt; {top200Traders.flag_thresholds.token_concentration_critical}% in single token</div>
                </div>
                <div className="bg-yellow-900/20 rounded-lg p-3">
                  <div className="text-yellow-400 font-medium">Warning: Token Concentration</div>
                  <div className="text-gray-400">&gt; {top200Traders.flag_thresholds.token_concentration_warning}% in single token</div>
                </div>
              </div>
            </div>
          </section>

          {/* Filter Controls */}
          <section className="mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Filter:</span>
              <div className="flex gap-2">
                {(['all', 'critical', 'warning', 'clean'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTraderFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      traderFilter === filter
                        ? filter === 'critical' ? 'bg-red-600 text-white' :
                          filter === 'warning' ? 'bg-yellow-600 text-white' :
                          filter === 'clean' ? 'bg-green-600 text-white' :
                          'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {filter === 'all' ? `All (${traderStats.total})` :
                     filter === 'critical' ? `Critical (${traderStats.critical})` :
                     filter === 'warning' ? `Warning (${traderStats.warning})` :
                     `Clean (${traderStats.clean})`}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Top 200 Traders Table */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Top 200 Traders by Volume</h3>
                <p className="text-sm text-gray-500">
                  Campaign total: {formatCurrency(top200Traders.meta.total_volume)} from {formatNumber(top200Traders.meta.total_traders)} traders
                </p>
              </div>
              <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/80 sticky top-0">
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3 text-right">Trades</th>
                      <th className="px-4 py-3 text-right">Tokens</th>
                      <th className="px-4 py-3 text-right">Days</th>
                      <th className="px-4 py-3 text-right">Reversals</th>
                      <th className="px-4 py-3 text-right">Concentration</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTraders.map((trader) => {
                      const flags = getTraderFlags(trader);
                      const isExpanded = expandedTrader === trader.wallet;

                      return (
                        <>
                          <tr
                            key={trader.wallet}
                            className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer ${
                              flags.status === 'critical' ? 'bg-red-900/10' :
                              flags.status === 'warning' ? 'bg-yellow-900/10' : ''
                            }`}
                            onClick={() => setExpandedTrader(isExpanded ? null : trader.wallet)}
                          >
                            <td className="px-4 py-3 text-gray-500 text-sm">{trader.rank}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-blue-400">
                                {trader.wallet.substring(0, 12)}...
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                flags.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                                flags.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {flags.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-white font-medium">
                              {formatCurrency(trader.usd_volume)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-300 text-sm">
                              {formatNumber(trader.trades)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 text-sm">
                              {trader.tokens}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 text-sm">
                              {trader.active_days}
                            </td>
                            <td className={`px-4 py-3 text-right text-sm ${
                              trader.rapid_reversals >= top200Traders.flag_thresholds.rapid_reversals_critical ? 'text-red-400' :
                              trader.rapid_reversals >= top200Traders.flag_thresholds.rapid_reversals_warning ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {formatNumber(trader.rapid_reversals)}
                            </td>
                            <td className={`px-4 py-3 text-right text-sm ${
                              trader.token_concentration_pct >= top200Traders.flag_thresholds.token_concentration_critical ? 'text-red-400' :
                              trader.token_concentration_pct >= top200Traders.flag_thresholds.token_concentration_warning ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {trader.token_concentration_pct.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3">
                              <button className="text-gray-400 hover:text-white">
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${trader.wallet}-details`} className="bg-gray-900/50">
                              <td colSpan={10} className="px-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {flags.reasons.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-medium text-red-400 mb-2">Flag Reasons</h4>
                                      <ul className="space-y-1">
                                        {flags.reasons.map((reason, i) => (
                                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                            <span className="text-red-400 mt-1">•</span>
                                            {reason}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {flags.mitigations.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-medium text-blue-400 mb-2">Recommended Mitigations</h4>
                                      <ul className="space-y-1">
                                        {flags.mitigations.map((mitigation, i) => (
                                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                            <span className="text-blue-400 mt-1">→</span>
                                            {mitigation}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {flags.reasons.length === 0 && (
                                    <div className="col-span-2">
                                      <p className="text-sm text-green-400">No gaming flags detected. This trader shows healthy behavior patterns.</p>
                                    </div>
                                  )}
                                  <div className="col-span-2 mt-2 pt-2 border-t border-gray-700">
                                    <span className="text-xs text-gray-500">Full wallet: </span>
                                    <span className="text-xs font-mono text-gray-400">{trader.wallet}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Mitigation Recommendations */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Mitigation Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Cooldown Periods</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Add minimum time between buy/sell of the same token to prevent wash trading.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: 5-minute cooldown for same token
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Token Diversity</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Require PNL calculations across minimum number of tokens to prevent single-token manipulation.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: Min 3 tokens with &gt;$100 volume each
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Multi-Day Requirement</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Require activity across multiple days for top leaderboard positions.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: Min 2-3 active days for rewards
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Volume Caps</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Cap volume contribution per token to prevent dominance gaming.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: Max 20% of PNL from single token
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Graduated Rewards</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Scale rewards based on behavior quality, not just PNL.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: 1.5x multiplier for clean traders
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white">Real-Time Monitoring</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Flag suspicious patterns in real-time for review before rewards.
                </p>
                <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2">
                  Suggestion: Auto-flag for manual review
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'cohort' && (
        <>
          {/* Cohort Overview */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Day 1 Cohort"
                value={formatNumber(cohortData[0]?.d0_traders || 0)}
                subtitle="New traders Jan 19"
              />
              <MetricCard
                title="D1 Retention"
                value={`${cohortData[0]?.d1_retention?.toFixed(1) || 0}%`}
                subtitle={`${formatNumber(cohortData[0]?.d1_traders || 0)} returned`}
              />
              <MetricCard
                title="D2 Retention"
                value={`${cohortData[0]?.d2_retention?.toFixed(1) || 0}%`}
                subtitle={`${formatNumber(cohortData[0]?.d2_traders || 0)} returned`}
              />
              <MetricCard
                title="Day 2 New Traders"
                value={formatNumber(cohortData[1]?.d0_traders || 0)}
                subtitle="First trade Jan 20"
              />
            </div>
          </section>

          {/* Cohort Retention Chart */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Cohort Retention Analysis</h3>
              <p className="text-sm text-gray-500 mb-4">Trader retention by first trade date (cohort)</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cohortData}>
                  <XAxis dataKey="cohort" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value) => [formatNumber(value as number), '']}
                  />
                  <Legend />
                  <Bar dataKey="d0_traders" name="Day 0 (New)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="d1_traders" name="Day 1 Retained" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="d2_traders" name="Day 2 Retained" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Cohort Volume Chart */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Cohort Volume Analysis</h3>
              <p className="text-sm text-gray-500 mb-4">Volume generated by each cohort over time</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cohortData}>
                  <XAxis dataKey="cohort" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value) => [formatCurrency(value as number), '']}
                  />
                  <Legend />
                  <Bar dataKey="d0_volume" name="Day 0 Volume" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="d1_volume" name="Day 1 Volume" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="d2_volume" name="Day 2 Volume" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Cohort Retention Matrix */}
          <section className="mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Retention Matrix</h3>
              <p className="text-sm text-gray-500 mb-4">Standard cohort analysis showing retention rates</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                      <th className="pb-3 pr-4">Cohort</th>
                      <th className="pb-3 pr-4 text-right">Day 0</th>
                      <th className="pb-3 pr-4 text-right">Day 1</th>
                      <th className="pb-3 pr-4 text-right">Day 2</th>
                      <th className="pb-3 pr-4 text-right">D1 Rate</th>
                      <th className="pb-3 text-right">D2 Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.map((row) => (
                      <tr key={row.cohort} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 pr-4 text-white font-medium">{row.cohort}</td>
                        <td className="py-3 pr-4 text-right">
                          <div className="text-gray-300">{formatNumber(row.d0_traders)}</div>
                          <div className="text-xs text-gray-500">{formatCurrency(row.d0_volume)}</div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="text-gray-300">{row.d1_traders ? formatNumber(row.d1_traders) : '-'}</div>
                          <div className="text-xs text-gray-500">{row.d1_volume ? formatCurrency(row.d1_volume) : '-'}</div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="text-gray-300">{row.d2_traders ? formatNumber(row.d2_traders) : '-'}</div>
                          <div className="text-xs text-gray-500">{row.d2_volume ? formatCurrency(row.d2_volume) : '-'}</div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {row.d1_retention ? (
                            <span className={`px-2 py-1 rounded text-sm ${
                              row.d1_retention >= 50 ? 'bg-green-500/20 text-green-400' :
                              row.d1_retention >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {row.d1_retention.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 text-right">
                          {row.d2_retention ? (
                            <span className={`px-2 py-1 rounded text-sm ${
                              row.d2_retention >= 40 ? 'bg-green-500/20 text-green-400' :
                              row.d2_retention >= 25 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {row.d2_retention.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Retention Insights */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Retention Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 text-lg font-bold">1</span>
                  </div>
                  <h3 className="text-sm font-medium text-white">Day 1 Cohort Performance</h3>
                </div>
                <p className="text-sm text-gray-400">
                  {cohortData[0]?.d1_retention?.toFixed(1)}% of Day 1 traders returned on Day 2.
                  This cohort generated {formatCurrency(cohortData[0]?.d0_volume || 0)} on launch day.
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-green-400 text-lg font-bold">2</span>
                  </div>
                  <h3 className="text-sm font-medium text-white">Volume Retention</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Returning Day 1 traders generated {formatCurrency(cohortData[0]?.d1_volume || 0)} on Day 2 —
                  {' '}{((cohortData[0]?.d1_volume || 0) / (cohortData[0]?.d0_volume || 1) * 100).toFixed(1)}% of their Day 1 volume.
                </p>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-purple-400 text-lg font-bold">3</span>
                  </div>
                  <h3 className="text-sm font-medium text-white">New Trader Acquisition</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Day 2 brought {formatNumber(cohortData[1]?.d0_traders || 0)} new traders,
                  representing {((cohortData[1]?.d0_traders || 0) / (cohortData[0]?.d0_traders || 1) * 100).toFixed(1)}%
                  of Day 1's new trader count.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}
