import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { queryCube } from '../lib/cube';
import { formatCurrency, formatNumber, formatWallet } from '../lib/cube';
import type { CubeQuery } from '../types/segments';

interface DailyActivity {
  fee_payer: string;
  date: string;
  volume: number;
  swaps: number;
  net_flow: number;
}

interface WhalePattern {
  fee_payer: string;
  pattern: 'accumulating' | 'distributing' | 'swing_trading' | 'stable';
  dailyActivity: { date: string; swaps: number; volume: number; net_flow: number }[];
  totalVolume: number;
  totalSwaps: number;
  netChange: number;
  avgDailySwaps: number;
}

const PATTERN_COLORS = {
  accumulating: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-700' },
  stable: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-700' },
  distributing: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-700' },
  swing_trading: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-700' },
};

const PATTERN_LABELS = {
  accumulating: 'Accumulating',
  stable: 'Stable',
  distributing: 'Distributing',
  swing_trading: 'Swing Trading',
};

// Generate last 14 days
function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

// Classify whale behavior pattern
function classifyPattern(
  totalNetFlow: number,
  avgDailySwaps: number,
  activeDays: number
): 'accumulating' | 'distributing' | 'swing_trading' | 'stable' {
  // High frequency traders (avg > 50 swaps/day when active)
  if (avgDailySwaps > 50) {
    return 'swing_trading';
  }

  // Low activity = stable
  if (activeDays <= 3 || avgDailySwaps < 5) {
    return 'stable';
  }

  // Net flow determines accumulating vs distributing
  if (totalNetFlow > 1000) {
    return 'accumulating';
  } else if (totalNetFlow < -1000) {
    return 'distributing';
  }

  return 'stable';
}

// Get cell color based on net flow (green = buying, red = selling)
function getCellColor(netFlow: number, swaps: number): string {
  if (swaps === 0) return 'bg-gray-800';

  // Determine intensity based on absolute net flow
  const absFlow = Math.abs(netFlow);
  let intensity: string;

  if (absFlow < 100) {
    intensity = '900/50';
  } else if (absFlow < 500) {
    intensity = '800/60';
  } else if (absFlow < 1000) {
    intensity = '700/70';
  } else if (absFlow < 5000) {
    intensity = '600/80';
  } else {
    intensity = '500';
  }

  // Green for positive (buying), red for negative (selling)
  if (netFlow >= 0) {
    return `bg-green-${intensity}`;
  } else {
    return `bg-red-${intensity}`;
  }
}

interface WhaleBehaviorCenterProps {
  whaleAddresses: string[];
}

export function WhaleBehaviorCenter({ whaleAddresses }: WhaleBehaviorCenterProps) {
  const last14Days = useMemo(() => getLast14Days(), []);

  // Query for daily activity data
  const dailyQuery: CubeQuery = useMemo(() => ({
    measures: [
      'user_axiom_volume.total_usd_volume',
      'user_axiom_volume.swap_count',
      'user_axiom_volume.net_usd1_flow',
    ],
    dimensions: ['user_axiom_volume.fee_payer'],
    timeDimensions: [
      {
        dimension: 'user_axiom_volume.aggregation_date',
        dateRange: [last14Days[0], last14Days[last14Days.length - 1]],
        granularity: 'day',
      },
    ],
    filters: [
      {
        member: 'user_axiom_volume.fee_payer',
        operator: 'equals',
        values: whaleAddresses.slice(0, 100), // Top 100 whales
      },
    ],
    limit: 10000,
  }), [whaleAddresses, last14Days]);

  const { data, isLoading } = useQuery({
    queryKey: ['whale-daily-activity', whaleAddresses.slice(0, 100)],
    queryFn: () => queryCube(dailyQuery),
    enabled: whaleAddresses.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Process data into whale patterns
  const whalePatterns = useMemo<WhalePattern[]>(() => {
    if (!data?.data) return [];

    // Group by wallet
    const walletData: Record<string, DailyActivity[]> = {};

    data.data.forEach((row: Record<string, unknown>) => {
      const feePayer = row['user_axiom_volume.fee_payer'] as string;
      const date = row['user_axiom_volume.aggregation_date'] as string;
      const volume = parseFloat(String(row['user_axiom_volume.total_usd_volume'] ?? 0)) || 0;
      const swaps = parseFloat(String(row['user_axiom_volume.swap_count'] ?? 0)) || 0;
      const netFlow = parseFloat(String(row['user_axiom_volume.net_usd1_flow'] ?? 0)) || 0;

      if (!walletData[feePayer]) {
        walletData[feePayer] = [];
      }
      walletData[feePayer].push({ fee_payer: feePayer, date, volume, swaps, net_flow: netFlow });
    });

    // Process each wallet
    return whaleAddresses.slice(0, 100).map((address) => {
      const activities = walletData[address] || [];

      // Create a map for quick lookup
      const activityMap = new Map(activities.map((a) => [a.date.split('T')[0], a]));

      // Fill in all 14 days
      const dailyActivity = last14Days.map((date) => {
        const activity = activityMap.get(date);
        return {
          date,
          swaps: activity?.swaps || 0,
          volume: activity?.volume || 0,
          net_flow: activity?.net_flow || 0,
        };
      });

      const totalVolume = dailyActivity.reduce((sum, d) => sum + d.volume, 0);
      const totalSwaps = dailyActivity.reduce((sum, d) => sum + d.swaps, 0);
      const netChange = dailyActivity.reduce((sum, d) => sum + d.net_flow, 0);
      const activeDays = dailyActivity.filter((d) => d.swaps > 0).length;
      const avgDailySwaps = activeDays > 0 ? totalSwaps / activeDays : 0;

      const pattern = classifyPattern(netChange, avgDailySwaps, activeDays);

      return {
        fee_payer: address,
        pattern,
        dailyActivity,
        totalVolume,
        totalSwaps,
        netChange,
        avgDailySwaps,
      };
    });
  }, [data, whaleAddresses, last14Days]);

  // Calculate pattern summaries
  const patternSummaries = useMemo(() => {
    const summaries = {
      accumulating: { count: 0, avgIncrease: 0, totalIncrease: 0 },
      stable: { count: 0, avgHoldingDays: 0 },
      distributing: { count: 0, avgDecrease: 0, totalDecrease: 0 },
      swing_trading: { count: 0, avgTradesPerWeek: 0, totalVolume: 0 },
    };

    whalePatterns.forEach((whale) => {
      summaries[whale.pattern].count++;

      if (whale.pattern === 'accumulating') {
        summaries.accumulating.totalIncrease += whale.netChange;
      } else if (whale.pattern === 'distributing') {
        summaries.distributing.totalDecrease += Math.abs(whale.netChange);
      } else if (whale.pattern === 'swing_trading') {
        summaries.swing_trading.totalVolume += whale.totalVolume;
        summaries.swing_trading.avgTradesPerWeek += whale.totalSwaps / 2;
      }
    });

    if (summaries.accumulating.count > 0) {
      summaries.accumulating.avgIncrease = summaries.accumulating.totalIncrease / summaries.accumulating.count;
    }
    if (summaries.distributing.count > 0) {
      summaries.distributing.avgDecrease = summaries.distributing.totalDecrease / summaries.distributing.count;
    }
    if (summaries.swing_trading.count > 0) {
      summaries.swing_trading.avgTradesPerWeek = summaries.swing_trading.avgTradesPerWeek / summaries.swing_trading.count;
    }

    return summaries;
  }, [whalePatterns]);

  // Overall metrics
  const overallMetrics = useMemo(() => {
    const totalHoldings = whalePatterns.reduce((sum, w) => sum + w.totalVolume, 0);
    const net14dChange = whalePatterns.reduce((sum, w) => sum + w.netChange, 0);
    const activeWhales = whalePatterns.filter((w) => w.totalSwaps > 0).length;
    const avgVolume = whalePatterns.length > 0 ? totalHoldings / whalePatterns.length : 0;

    return {
      totalWhales: whalePatterns.length,
      totalHoldings,
      net14dChange,
      retention: whalePatterns.length > 0 ? (activeWhales / whalePatterns.length) * 100 : 0,
      activeWhales,
      avgVolume,
    };
  }, [whalePatterns]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Whale Behavior Intelligence Center</h2>
        <p className="text-sm text-gray-400">Monitor and analyze top holder activity and patterns</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Whales</p>
          <p className="text-2xl font-bold text-white mt-1">{overallMetrics.totalWhales}</p>
          <p className="text-xs text-gray-500 mt-1">Top 1-5% by volume</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Holdings</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(overallMetrics.totalHoldings)}</p>
          <p className="text-xs text-gray-500 mt-1">Estimated value</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Net 14D Change</p>
          <p className={`text-2xl font-bold mt-1 ${overallMetrics.net14dChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(Math.abs(overallMetrics.net14dChange))}
          </p>
          <p className={`text-xs mt-1 ${overallMetrics.net14dChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {overallMetrics.net14dChange >= 0 ? '+ Accumulating' : '- Distributing'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Whale Retention</p>
          <p className="text-2xl font-bold text-white mt-1">{overallMetrics.retention.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{overallMetrics.activeWhales} active this week</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Avg Whale Volume</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(overallMetrics.avgVolume)}</p>
          <p className="text-xs text-gray-500 mt-1">Per 2 weeks</p>
        </div>
      </div>

      {/* Pattern Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Accumulating */}
        <div className={`rounded-xl border p-4 ${PATTERN_COLORS.accumulating.bg} ${PATTERN_COLORS.accumulating.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${PATTERN_COLORS.accumulating.text}`}>Accumulating</span>
            <span className="text-2xl font-bold text-white">{patternSummaries.accumulating.count}</span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400">Net buyers</p>
            <p className="text-xs text-gray-400">
              Avg position increase: {formatCurrency(patternSummaries.accumulating.avgIncrease)}
            </p>
          </div>
        </div>

        {/* Stable */}
        <div className={`rounded-xl border p-4 ${PATTERN_COLORS.stable.bg} ${PATTERN_COLORS.stable.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${PATTERN_COLORS.stable.text}`}>Stable</span>
            <span className="text-2xl font-bold text-white">{patternSummaries.stable.count}</span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400">Holding</p>
            <p className="text-xs text-gray-400">Activity level: Low</p>
          </div>
        </div>

        {/* Distributing */}
        <div className={`rounded-xl border p-4 ${PATTERN_COLORS.distributing.bg} ${PATTERN_COLORS.distributing.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${PATTERN_COLORS.distributing.text}`}>Distributing</span>
            <span className="text-2xl font-bold text-white">{patternSummaries.distributing.count}</span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400">Net sellers</p>
            <p className="text-xs text-gray-400">
              Avg position decrease: {formatCurrency(patternSummaries.distributing.avgDecrease)}
            </p>
          </div>
        </div>

        {/* Swing Trading */}
        <div className={`rounded-xl border p-4 ${PATTERN_COLORS.swing_trading.bg} ${PATTERN_COLORS.swing_trading.border}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${PATTERN_COLORS.swing_trading.text}`}>Swing Trading</span>
            <span className="text-2xl font-bold text-white">{patternSummaries.swing_trading.count}</span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400">High frequency</p>
            <p className="text-xs text-gray-400">
              Avg trades/week: {formatNumber(patternSummaries.swing_trading.avgTradesPerWeek)}
            </p>
          </div>
        </div>
      </div>

      {/* 14-Day Activity Heatmap */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">14-Day Activity Heatmap</h3>
          <span className="text-sm text-gray-400">Showing: Top {Math.min(whaleAddresses.length, 100)} Whales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-700">
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-800 min-w-[120px]">Wallet</th>
                <th className="px-2 py-2 text-left min-w-[90px]">Pattern</th>
                {last14Days.map((date, i) => (
                  <th key={date} className="px-1 py-2 text-center w-10">
                    D{i + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-right min-w-[100px]">Net Change</th>
              </tr>
            </thead>
            <tbody>
              {whalePatterns.map((whale) => (
                <tr key={whale.fee_payer} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-3 py-2 sticky left-0 bg-gray-800">
                    <Link to={`/user/${whale.fee_payer}`} className="hover:underline">
                      <code className="text-sm text-blue-400 font-mono">
                        {formatWallet(whale.fee_payer)}
                      </code>
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${PATTERN_COLORS[whale.pattern].bg} ${PATTERN_COLORS[whale.pattern].text}`}
                    >
                      {PATTERN_LABELS[whale.pattern]}
                    </span>
                  </td>
                  {whale.dailyActivity.map((day, i) => (
                    <td key={i} className="px-1 py-2">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                          getCellColor(day.net_flow, day.swaps)
                        } ${day.swaps > 0 ? 'text-white' : 'text-gray-600'}`}
                        title={`${day.date}: ${day.swaps} swaps, ${formatCurrency(day.volume)} volume, ${formatCurrency(day.net_flow)} net flow`}
                      >
                        {day.swaps > 0 ? day.swaps : ''}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-medium ${
                        whale.netChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {whale.netChange >= 0 ? '+' : ''}
                      {formatCurrency(whale.netChange)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-gray-400">
        <span>Net flow:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700/30" />
          <span>No activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600/80" />
          <span>Buying (net +)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-600/80" />
          <span>Selling (net -)</span>
        </div>
        <span className="text-gray-500">|</span>
        <span>Intensity = net flow amount</span>
      </div>
    </div>
  );
}
