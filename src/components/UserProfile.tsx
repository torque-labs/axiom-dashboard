import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import { Layout } from './Layout';
import { MetricCard, MetricCardSkeleton } from './MetricCard';
import { useCubeQuery, useSegmentQuery, transformSegmentData, useVelocitySegmentQuery } from '../hooks/useCubeQuery';
import { SEGMENT_QUERIES, formatCurrency, formatNumber } from '../lib/cube';
import type { SegmentKey } from '../lib/cube';

interface SegmentMembership {
  key: SegmentKey;
  name: string;
  color: string;
  rank: number;
  totalInSegment: number;
  percentile: number;
  metric: string;
  metricValue: number;
}

interface UserData {
  fee_payer: string;
  total_usd_volume: number;
  swap_count: number;
  avg_swap_size: number;
  net_usd1_flow: number;
}

interface HistoricalDataPoint {
  'user_axiom_volume.aggregation_date': string;
  'user_axiom_volume.total_usd_volume': number;
  'user_axiom_volume.swap_count': number;
  'user_axiom_volume.net_usd1_flow': number;
}

// Copy wallet to clipboard
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UserProfile() {
  const { address } = useParams<{ address: string }>();

  // Query historical data for this user (last 30 days with daily granularity)
  const historicalQuery = useCubeQuery<HistoricalDataPoint>(
    ['user_history', address || ''],
    {
      measures: [
        'user_axiom_volume.total_usd_volume',
        'user_axiom_volume.swap_count',
        'user_axiom_volume.net_usd1_flow',
      ],
      timeDimensions: [
        {
          dimension: 'user_axiom_volume.aggregation_date',
          dateRange: 'last 30 days',
          granularity: 'day',
        },
      ],
      filters: [
        {
          member: 'user_axiom_volume.fee_payer',
          operator: 'equals',
          values: [address || ''],
        },
      ],
      order: { 'user_axiom_volume.aggregation_date': 'asc' },
    },
    { enabled: !!address }
  );

  // Query all main segments to find user's membership and rank
  const whalesQuery = useSegmentQuery('whales', SEGMENT_QUERIES.whales.query);
  const midTierQuery = useSegmentQuery('mid_tier', SEGMENT_QUERIES.mid_tier.query);
  const streakMastersQuery = useSegmentQuery('streak_masters', SEGMENT_QUERIES.streak_masters.query);
  const lapsedWhalesQuery = useSegmentQuery('lapsed_whales', SEGMENT_QUERIES.lapsed_whales.query);
  const consistentTradersQuery = useSegmentQuery('consistent_traders', SEGMENT_QUERIES.consistent_traders.query);
  const accumulatorsQuery = useSegmentQuery('accumulators', SEGMENT_QUERIES.accumulators.query);
  const distributorsQuery = useSegmentQuery('distributors', SEGMENT_QUERIES.distributors.query);
  const activeSmallQuery = useSegmentQuery('active_small', SEGMENT_QUERIES.active_small.query);
  const newUsersQuery = useSegmentQuery('new_users', SEGMENT_QUERIES.new_users.query);
  const atRiskMidTierQuery = useSegmentQuery('at_risk_mid_tier', SEGMENT_QUERIES.at_risk_mid_tier.query);
  const oneAndDoneQuery = useSegmentQuery('one_and_done', SEGMENT_QUERIES.one_and_done.query);

  // Velocity segments
  const risingStarsConfig = SEGMENT_QUERIES.rising_stars;
  const risingStarsQuery = useVelocitySegmentQuery(
    'rising_stars',
    risingStarsConfig.query,
    risingStarsConfig.comparisonQuery!,
    risingStarsConfig.velocityThreshold!,
    risingStarsConfig.velocityDirection!
  );

  const coolingDownConfig = SEGMENT_QUERIES.cooling_down;
  const coolingDownQuery = useVelocitySegmentQuery(
    'cooling_down',
    coolingDownConfig.query,
    coolingDownConfig.comparisonQuery!,
    coolingDownConfig.velocityThreshold!,
    coolingDownConfig.velocityDirection!
  );

  const isLoading =
    whalesQuery.isLoading ||
    midTierQuery.isLoading ||
    streakMastersQuery.isLoading ||
    lapsedWhalesQuery.isLoading ||
    consistentTradersQuery.isLoading ||
    accumulatorsQuery.isLoading ||
    distributorsQuery.isLoading ||
    activeSmallQuery.isLoading ||
    newUsersQuery.isLoading ||
    atRiskMidTierQuery.isLoading ||
    oneAndDoneQuery.isLoading ||
    risingStarsQuery.isLoading ||
    coolingDownQuery.isLoading;

  // Transform historical data for charts - fill in all 30 days including gaps
  const historicalData = useMemo(() => {
    if (!historicalQuery.data?.data || historicalQuery.data.data.length === 0) return [];

    // Create a map of existing data by date
    const dataByDate = new Map<string, {
      volume: number;
      swaps: number;
      netFlow: number;
    }>();

    let latestDate: Date | null = null;

    historicalQuery.data.data.forEach((row) => {
      const dateKey = row['user_axiom_volume.aggregation_date'].split('T')[0];
      const rowDate = new Date(dateKey);

      if (!latestDate || rowDate > latestDate) {
        latestDate = rowDate;
      }

      dataByDate.set(dateKey, {
        volume: parseFloat(String(row['user_axiom_volume.total_usd_volume'] ?? 0)) || 0,
        swaps: parseFloat(String(row['user_axiom_volume.swap_count'] ?? 0)) || 0,
        netFlow: parseFloat(String(row['user_axiom_volume.net_usd1_flow'] ?? 0)) || 0,
      });
    });

    // Generate all 30 days ending at the latest data date, filling gaps with zeros
    const result: Array<{
      date: string;
      dateFormatted: string;
      volume: number;
      swaps: number;
      netFlow: number;
    }> = [];

    // Use latest data date as the end (not today, since data may be lagged)
    const endDate = latestDate || new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const existing = dataByDate.get(dateKey);

      result.push({
        date: `${dateKey}T00:00:00.000`,
        dateFormatted: formatDate(`${dateKey}T00:00:00.000`),
        volume: existing?.volume ?? 0,
        swaps: existing?.swaps ?? 0,
        netFlow: existing?.netFlow ?? 0,
      });
    }

    return result;
  }, [historicalQuery.data]);

  // Calculate cumulative volume and P&L for the charts
  const cumulativeData = useMemo(() => {
    let cumVolume = 0;
    let cumSwaps = 0;
    let cumNetFlow = 0;
    return historicalData.map((day) => {
      cumVolume += day.volume;
      cumSwaps += day.swaps;
      cumNetFlow += day.netFlow;
      return {
        ...day,
        cumulativeVolume: cumVolume,
        cumulativeSwaps: cumSwaps,
        cumulativeNetFlow: cumNetFlow,
      };
    });
  }, [historicalData]);

  // Calculate total P&L (net flow) for metrics
  const totalNetFlow = useMemo(() => {
    return historicalData.reduce((sum, day) => sum + day.netFlow, 0);
  }, [historicalData]);

  // Calculate streak data directly from historical data for accuracy
  // This ensures consistency with what's shown in the chart
  const streakData = useMemo(() => {
    if (historicalData.length === 0) {
      return {
        currentStreak: 0,
        maxStreak: 0,
        activeDays: 0,
        retentionRate: 0,
        isActiveOnLatestDay: false,
      };
    }

    // Count active days (days with swaps > 0)
    const activeDays = historicalData.filter(d => d.swaps > 0).length;

    // Build a set of active dates for streak calculation
    const activeDates = new Set(
      historicalData
        .filter(d => d.swaps > 0)
        .map(d => d.date.split('T')[0])
    );

    // Generate all dates in the 30-day range to find streaks
    const allDates: string[] = [];
    if (historicalData.length > 0) {
      const endDate = new Date(historicalData[historicalData.length - 1].date);
      for (let i = 29; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        allDates.push(d.toISOString().split('T')[0]);
      }
    }

    // Calculate current streak (consecutive days from the end)
    let currentStreak = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      if (activeDates.has(allDates[i])) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate max streak in the period
    let maxStreak = 0;
    let tempStreak = 0;
    for (const date of allDates) {
      if (activeDates.has(date)) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const isActiveOnLatestDay = historicalData.length > 0 &&
      historicalData[historicalData.length - 1].swaps > 0;

    return {
      currentStreak,
      maxStreak,
      activeDays,
      retentionRate: (activeDays / 30) * 100,
      isActiveOnLatestDay,
    };
  }, [historicalData]);

  // Transform and find user in each segment
  const segmentAnalysis = useMemo(() => {
    if (isLoading || !address) return { userData: null, memberships: [], allSegmentData: {} };

    const segments: {
      key: SegmentKey;
      name: string;
      color: string;
      data: UserData[];
      rankBy: 'total_usd_volume' | 'swap_count' | 'net_usd1_flow';
      metricLabel: string;
    }[] = [
      { key: 'whales', name: 'Whales', color: SEGMENT_QUERIES.whales.color, data: whalesQuery.data?.data ? transformSegmentData(whalesQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'mid_tier', name: 'Mid-Tier Traders', color: SEGMENT_QUERIES.mid_tier.color, data: midTierQuery.data?.data ? transformSegmentData(midTierQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'streak_masters', name: 'Streak Masters', color: SEGMENT_QUERIES.streak_masters.color, data: streakMastersQuery.data?.data ? transformSegmentData(streakMastersQuery.data.data) : [], rankBy: 'swap_count', metricLabel: 'Swaps' },
      { key: 'lapsed_whales', name: 'Lapsed Power Users', color: SEGMENT_QUERIES.lapsed_whales.color, data: lapsedWhalesQuery.data?.data ? transformSegmentData(lapsedWhalesQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'consistent_traders', name: 'Consistent Traders', color: SEGMENT_QUERIES.consistent_traders.color, data: consistentTradersQuery.data?.data ? transformSegmentData(consistentTradersQuery.data.data) : [], rankBy: 'swap_count', metricLabel: 'Swaps' },
      { key: 'accumulators', name: 'Accumulators', color: SEGMENT_QUERIES.accumulators.color, data: accumulatorsQuery.data?.data ? transformSegmentData(accumulatorsQuery.data.data) : [], rankBy: 'net_usd1_flow', metricLabel: 'Net Flow' },
      { key: 'distributors', name: 'Distributors', color: SEGMENT_QUERIES.distributors.color, data: distributorsQuery.data?.data ? transformSegmentData(distributorsQuery.data.data) : [], rankBy: 'net_usd1_flow', metricLabel: 'Net Flow' },
      { key: 'active_small', name: 'Active Small Traders', color: SEGMENT_QUERIES.active_small.color, data: activeSmallQuery.data?.data ? transformSegmentData(activeSmallQuery.data.data) : [], rankBy: 'swap_count', metricLabel: 'Swaps' },
      { key: 'new_users', name: 'New Users', color: SEGMENT_QUERIES.new_users.color, data: newUsersQuery.data?.data ? transformSegmentData(newUsersQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'at_risk_mid_tier', name: 'At-Risk Mid-Tier', color: SEGMENT_QUERIES.at_risk_mid_tier.color, data: atRiskMidTierQuery.data?.data ? transformSegmentData(atRiskMidTierQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'one_and_done', name: 'One-and-Done', color: SEGMENT_QUERIES.one_and_done.color, data: oneAndDoneQuery.data?.data ? transformSegmentData(oneAndDoneQuery.data.data) : [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'rising_stars', name: 'Rising Stars', color: SEGMENT_QUERIES.rising_stars.color, data: risingStarsQuery.data || [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
      { key: 'cooling_down', name: 'Cooling Down', color: SEGMENT_QUERIES.cooling_down.color, data: coolingDownQuery.data || [], rankBy: 'total_usd_volume', metricLabel: 'Volume' },
    ];

    let userData: UserData | null = null;
    const memberships: SegmentMembership[] = [];

    segments.forEach(({ key, name, color, data, rankBy, metricLabel }) => {
      // Sort by the ranking metric
      const sorted = [...data].sort((a, b) => {
        if (rankBy === 'net_usd1_flow' && key === 'distributors') {
          return a[rankBy] - b[rankBy]; // Ascending for distributors (most negative first)
        }
        return b[rankBy] - a[rankBy]; // Descending for others
      });

      const userIndex = sorted.findIndex((u) => u.fee_payer === address);

      if (userIndex !== -1) {
        const user = sorted[userIndex];
        if (!userData) {
          userData = user;
        }

        memberships.push({
          key,
          name,
          color,
          rank: userIndex + 1,
          totalInSegment: sorted.length,
          percentile: ((sorted.length - userIndex) / sorted.length) * 100,
          metric: metricLabel,
          metricValue: user[rankBy],
        });
      }
    });

    // If user not found in any segment, try to find their data from the largest dataset
    if (!userData) {
      for (const seg of segments) {
        const found = seg.data.find((u) => u.fee_payer === address);
        if (found) {
          userData = found;
          break;
        }
      }
    }

    return { userData, memberships, allSegmentData: segments };
  }, [
    isLoading,
    address,
    whalesQuery.data,
    midTierQuery.data,
    streakMastersQuery.data,
    lapsedWhalesQuery.data,
    consistentTradersQuery.data,
    accumulatorsQuery.data,
    distributorsQuery.data,
    activeSmallQuery.data,
    newUsersQuery.data,
    atRiskMidTierQuery.data,
    oneAndDoneQuery.data,
    risingStarsQuery.data,
    coolingDownQuery.data,
  ]);

  const { userData, memberships } = segmentAnalysis;

  // Radar chart data for user profile
  const radarData = useMemo(() => {
    if (!userData) return [];

    // Normalize metrics to 0-100 scale based on typical ranges
    return [
      { metric: 'Volume', value: Math.min((userData.total_usd_volume / 500000) * 100, 100), fullMark: 100 },
      { metric: 'Activity', value: Math.min((userData.swap_count / 1000) * 100, 100), fullMark: 100 },
      { metric: 'Retention', value: streakData.retentionRate, fullMark: 100 }, // % of days active
      { metric: 'Trade Size', value: Math.min((userData.avg_swap_size / 5000) * 100, 100), fullMark: 100 },
      { metric: 'Streak', value: Math.min((streakData.maxStreak / 14) * 100, 100), fullMark: 100 }, // 14-day streak = 100%
    ];
  }, [userData, streakData]);

  if (!address) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-4">No Address Provided</h1>
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

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
        Back to Overview
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Profile</h1>
            <div className="flex items-center gap-2">
              <code className="text-sm text-blue-400 font-mono">{address}</code>
              <button
                onClick={() => copyToClipboard(address)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy address"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <a
                href={`https://solscan.io/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                title="View on Solscan"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Segment badges */}
        {memberships.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {memberships.map((m) => (
              <Link
                key={m.key}
                to={`/segment/${m.key}`}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: m.color + '33', color: m.color, border: `1px solid ${m.color}` }}
              >
                <span>{m.name}</span>
                <span className="text-xs opacity-75">#{m.rank}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : userData ? (
            <>
              <MetricCard
                title="Total Volume"
                value={formatCurrency(userData.total_usd_volume)}
                subtitle="Last 30 days"
              />
              <MetricCard
                title="Total Swaps"
                value={formatNumber(userData.swap_count)}
                subtitle="Last 30 days"
              />
              <MetricCard
                title="Avg Trade Size"
                value={formatCurrency(userData.avg_swap_size)}
                subtitle="Per swap"
              />
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="text-sm text-gray-400 mb-1">Est. P&L</div>
                <div className={`text-2xl font-bold ${userData.net_usd1_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {userData.net_usd1_flow >= 0 ? '+' : ''}{formatCurrency(userData.net_usd1_flow)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {userData.net_usd1_flow >= 0 ? 'Net profit' : 'Net loss'}
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="text-sm text-gray-400 mb-1">Current Streak</div>
                <div className={`text-2xl font-bold ${streakData.isActiveOnLatestDay ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {streakData.currentStreak} days
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {streakData.isActiveOnLatestDay ? (
                    <span className="text-emerald-400">● Active</span>
                  ) : streakData.currentStreak === 0 ? (
                    <span className="text-red-400">● Broken</span>
                  ) : (
                    <span>Max: {streakData.maxStreak} days</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="text-sm text-gray-400 mb-1">Retention</div>
                <div className="text-2xl font-bold text-blue-400">
                  {streakData.activeDays}/30 days
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {streakData.retentionRate.toFixed(0)}% active
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-6 bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-gray-400">User not found in any segment</p>
              <p className="text-sm text-gray-500 mt-2">This user may not have traded in the last 30 days</p>
            </div>
          )}
        </div>
      </section>

      {/* Profile Analysis Row */}
      {userData && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Trader Profile</h3>
              <p className="text-sm text-gray-400 mb-4">Normalized metrics (0-100 scale)</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Radar
                    name="User"
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Cumulative Volume Chart */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">Cumulative Volume</h3>
              <p className="text-sm text-gray-400 mb-4">30-day volume accumulation</p>
              {historicalQuery.isLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-500">Loading...</div>
                </div>
              ) : cumulativeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="dateFormatted"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [formatCurrency(Number(value) || 0), 'Cumulative Volume']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeVolume"
                      stroke="#3B82F6"
                      fill="url(#volumeGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-500">
                  No historical data available
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Profit & Loss (Net Flow) */}
      {userData && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Estimated P&L (Net Flow)</h2>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Cumulative Net Flow</h3>
                <p className="text-sm text-gray-400">Estimated P&L based on buy/sell USD flow</p>
              </div>
              <div className={`text-2xl font-bold ${totalNetFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalNetFlow >= 0 ? '+' : ''}{formatCurrency(totalNetFlow)}
              </div>
            </div>
            {historicalQuery.isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading...</div>
              </div>
            ) : cumulativeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="pnlGradientPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="dateFormatted"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => {
                      const numValue = Number(value) || 0;
                      return [
                        (numValue >= 0 ? '+' : '') + formatCurrency(numValue),
                        'Cumulative P&L'
                      ];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeNetFlow"
                    stroke={totalNetFlow >= 0 ? '#10B981' : '#EF4444'}
                    fill={totalNetFlow >= 0 ? 'url(#pnlGradientPos)' : 'url(#pnlGradientNeg)'}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No historical data available
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4">
              * Net Flow = USD received from sells - USD spent on buys. Positive values indicate net profit (more sells than buys).
            </p>
          </div>
        </section>
      )}

      {/* Historical Activity */}
      {userData && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">30-Day Activity</h2>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-1">Daily Volume & Swaps</h3>
            <p className="text-sm text-gray-400 mb-4">Trading activity over the last 30 days</p>
            {historicalQuery.isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading historical data...</div>
              </div>
            ) : historicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={historicalData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="dateFormatted"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="volume"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={60}
                  />
                  <YAxis
                    yAxisId="swaps"
                    orientation="right"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    tickFormatter={(v) => formatNumber(v)}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => {
                      const numValue = Number(value) || 0;
                      if (name === 'volume') return [formatCurrency(numValue), 'Volume'];
                      if (name === 'swaps') return [formatNumber(numValue), 'Swaps'];
                      return [numValue, String(name)];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    name="volume"
                  />
                  <Line
                    yAxisId="swaps"
                    type="monotone"
                    dataKey="swaps"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
                    name="swaps"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No trading activity in the last 30 days
              </div>
            )}
            {historicalData.length > 0 && (
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-gray-400">Daily Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-gray-400">Daily Swaps</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}
