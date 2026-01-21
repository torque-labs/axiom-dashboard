import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Layout } from './Layout';
import { MetricCard } from './MetricCard';
import { formatCurrency, formatWallet } from '../lib/cube';

// Types
interface LeaderboardEntry {
  feePayer: string;
  total_pnl: number;
  trade_count: number;
  unique_tokens: number;
  total_volume: number;
  rapid_reversals: number;
  top_token_pct: number;
  pnl_per_1k_volume: number;
  flags: string[];
  risk_score: number;
}

interface CoordinatedToken {
  token: string;
  traders: string[];
  num_traders: number;
}

interface TokenDominance {
  token: string;
  feePayer: string;
  volume_dominance_pct: number;
  unique_traders: number;
}

interface TradeTimeline {
  feePayer: string;
  direction: 'BUY' | 'SELL';
  receivedAt: string;
  price: number;
  amount_in: number;
  amount_out: number;
}

// Analysis data from queries
const leaderboardData: LeaderboardEntry[] = [
  { feePayer: 'CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o', total_pnl: 13165.75, trade_count: 765, unique_tokens: 121, total_volume: 146932.12, rapid_reversals: 222, top_token_pct: 20.1, pnl_per_1k_volume: 89.6, flags: ['Rapid Reversals'], risk_score: 65 },
  { feePayer: 'CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5', total_pnl: 13136.98, trade_count: 41, unique_tokens: 14, total_volume: 41693.36, rapid_reversals: 3, top_token_pct: 75.9, pnl_per_1k_volume: 315.2, flags: ['Volume Dominance', 'Token Concentration', 'Coordination Ring'], risk_score: 85 },
  { feePayer: '4NtyFqqRzvHWsTmJZoT26H9xtL7asWGTxpcpCxiKax9a', total_pnl: 11568.40, trade_count: 45, unique_tokens: 4, total_volume: 28425.53, rapid_reversals: 3, top_token_pct: 105.7, pnl_per_1k_volume: 406.9, flags: ['Token Concentration', 'Coordination Ring', 'High PNL Efficiency'], risk_score: 95 },
  { feePayer: 'TimeAdRpWxqKXR5YPEwGBF48KC5V5TxB2g6mnyCp4VR', total_pnl: 10079.97, trade_count: 34, unique_tokens: 2, total_volume: 31658.36, rapid_reversals: 3, top_token_pct: 102.3, pnl_per_1k_volume: 318.5, flags: ['Token Concentration', 'Coordination Ring', 'High PNL Efficiency'], risk_score: 92 },
  { feePayer: 'BTZJRdccNMrF1tdwjSk9K369udDJpk8mxrZNP2U7vAxY', total_pnl: 9904.63, trade_count: 54, unique_tokens: 8, total_volume: 24170.42, rapid_reversals: 5, top_token_pct: 80.5, pnl_per_1k_volume: 409.7, flags: ['Token Concentration', 'High PNL Efficiency'], risk_score: 75 },
  { feePayer: '5CWn9gFtdLSKzSELvhPufwqaky73LU9pyW5VQ6xJA7Ye', total_pnl: 6092.58, trade_count: 92, unique_tokens: 22, total_volume: 20185.04, rapid_reversals: 23, top_token_pct: 45.2, pnl_per_1k_volume: 301.8, flags: ['Rapid Reversals'], risk_score: 55 },
  { feePayer: 'ETvmkav36qmxXViTNzuEc29hjdhnbaMQ9WYJifeH4AhN', total_pnl: 5235.21, trade_count: 58, unique_tokens: 9, total_volume: 12700.45, rapid_reversals: 1, top_token_pct: 52.1, pnl_per_1k_volume: 412.2, flags: ['Coordination Ring', 'High PNL Efficiency'], risk_score: 70 },
  { feePayer: '5siYF3h8FLK5W9FexFsr4wR6ijS6J3dYb5FMqAQhtnbo', total_pnl: 4978.40, trade_count: 45, unique_tokens: 5, total_volume: 9637.92, rapid_reversals: 1, top_token_pct: 61.3, pnl_per_1k_volume: 516.5, flags: ['Coordination Ring', 'Token Concentration', 'High PNL Efficiency'], risk_score: 80 },
  { feePayer: '29fMnkfzGMzHqocaUM4758rmJz6jb5eskvZnSmG85qQu', total_pnl: 4696.38, trade_count: 45, unique_tokens: 2, total_volume: 5859.65, rapid_reversals: 1, top_token_pct: 95.2, pnl_per_1k_volume: 801.5, flags: ['Token Concentration', 'Coordination Ring', 'Extreme PNL Efficiency'], risk_score: 90 },
  { feePayer: 'GZPYq37cr9Gibj9GV7f686LSZTCKSCJfVy9xTrwahX5W', total_pnl: 4539.15, trade_count: 8, unique_tokens: 1, total_volume: 6733.50, rapid_reversals: 0, top_token_pct: 100, pnl_per_1k_volume: 674.1, flags: ['Single Token', 'High PNL Efficiency'], risk_score: 60 },
];

const coordinatedTokens: CoordinatedToken[] = [
  { token: 'HANRi4rBbQ28QJzGyFp9QP5QntEvaMJr17CNtRRHbonk', traders: ['29fMnkfz...', '4NtyFqqR...', '5siYF3h8...', 'CA4keXLt...', 'ETvmkav3...', 'TimeAdRp...'], num_traders: 6 },
  { token: '14PPxCJvMCx4zh6svSxBXjKuhJ1H4CTwSPJp8m3Pbonk', traders: ['5CWn9gFt...', '5siYF3h8...', 'CyaE1Vxv...', 'ETvmkav3...'], num_traders: 4 },
  { token: 'BikyCbsYXRXC8UEVobjCRFBzusgYKVFLTBHTy9aYbonk', traders: ['29fMnkfz...', '5siYF3h8...', 'BTZJRdcc...', 'ETvmkav3...'], num_traders: 4 },
];

const volumeDominanceData: TokenDominance[] = [
  { token: '4NqDsZe2...', feePayer: 'CA4keXLt...', volume_dominance_pct: 96.2, unique_traders: 4 },
  { token: 'ZJ42X2TG...', feePayer: 'CA4keXLt...', volume_dominance_pct: 83.7, unique_traders: 16 },
  { token: 'KrKegmYo...', feePayer: 'CyaE1Vxv...', volume_dominance_pct: 78.3, unique_traders: 5 },
  { token: '27zgMUPD...', feePayer: 'CyaE1Vxv...', volume_dominance_pct: 78.2, unique_traders: 3 },
  { token: '9RtS5j8r...', feePayer: 'CyaE1Vxv...', volume_dominance_pct: 73.0, unique_traders: 4 },
  { token: 'A2WQn9SY...', feePayer: 'CyaE1Vxv...', volume_dominance_pct: 72.6, unique_traders: 3 },
];

const hanriTimeline: TradeTimeline[] = [
  { feePayer: 'ETvmkav3...', direction: 'BUY', receivedAt: '2026-01-20T01:57:20', price: 0.00004674, amount_in: 100.05, amount_out: 2140589 },
  { feePayer: '5siYF3h8...', direction: 'BUY', receivedAt: '2026-01-20T01:57:20', price: 0.00004741, amount_in: 90.39, amount_out: 1906460 },
  { feePayer: 'ETvmkav3...', direction: 'SELL', receivedAt: '2026-01-20T02:03:54', price: 0.00004635, amount_in: 2140589, amount_out: 99.22 },
  { feePayer: '5siYF3h8...', direction: 'SELL', receivedAt: '2026-01-20T02:03:54', price: 0.00004526, amount_in: 1906460, amount_out: 86.29 },
  { feePayer: '29fMnkfz...', direction: 'BUY', receivedAt: '2026-01-20T02:05:22', price: 0.00004489, amount_in: 13.27, amount_out: 295659 },
  { feePayer: '4NtyFqqR...', direction: 'BUY', receivedAt: '2026-01-20T03:27:03', price: 0.00015852, amount_in: 1317.25, amount_out: 8309764 },
  { feePayer: '4NtyFqqR...', direction: 'SELL', receivedAt: '2026-01-20T03:27:51', price: 0.00015190, amount_in: 8309764, amount_out: 1262.27 },
  { feePayer: 'TimeAdRp...', direction: 'BUY', receivedAt: '2026-01-20T03:50:57', price: 0.00027159, amount_in: 654.19, amount_out: 2408730 },
  { feePayer: '29fMnkfz...', direction: 'SELL', receivedAt: '2026-01-20T03:51:27', price: 0.00038070, amount_in: 812721, amount_out: 309.40 },
  { feePayer: 'CA4keXLt...', direction: 'BUY', receivedAt: '2026-01-20T04:01:22', price: 0.00144068, amount_in: 3271.45, amount_out: 2270757 },
  { feePayer: 'CA4keXLt...', direction: 'SELL', receivedAt: '2026-01-20T04:04:07', price: 0.00119154, amount_in: 2270757, amount_out: 2705.70 },
  { feePayer: 'TimeAdRp...', direction: 'SELL', receivedAt: '2026-01-20T04:38:36', price: 0.00084643, amount_in: 2965278, amount_out: 2509.90 },
];

// Color assignments for traders
const traderColors: Record<string, string> = {
  'ETvmkav3...': '#8B5CF6',
  '5siYF3h8...': '#EC4899',
  '29fMnkfz...': '#10B981',
  '4NtyFqqR...': '#F59E0B',
  'TimeAdRp...': '#3B82F6',
  'CA4keXLt...': '#EF4444',
  'CyaE1Vxv...': '#6366F1',
  'BTZJRdcc...': '#14B8A6',
  '5CWn9gFt...': '#F97316',
  'GZPYq37c...': '#A855F7',
};

// Mitigation controls type
interface MitigationControls {
  minTokenVolume: number;
  minUniqueTraders: number;
  maxVolumeDominance: number;
  maxTokenPnlPct: number;
  minHoldTime: number;
}

export function GamingAnalysis() {
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [mitigations, setMitigations] = useState<MitigationControls>({
    minTokenVolume: 1000,
    minUniqueTraders: 1,
    maxVolumeDominance: 100,
    maxTokenPnlPct: 100,
    minHoldTime: 0,
  });

  // Filter leaderboard based on controls
  const filteredLeaderboard = useMemo(() => {
    let data = [...leaderboardData];

    if (showFlaggedOnly) {
      data = data.filter(d => d.flags.length > 0);
    }

    // Apply mitigation filters to calculate adjusted PNL
    return data.map(entry => {
      let adjustedPnl = entry.total_pnl;
      let disqualified = false;

      // If PNL efficiency too high
      if (entry.pnl_per_1k_volume > 500) {
        adjustedPnl *= 0.5; // Penalize 50%
      }

      // If token concentration too high
      if (entry.top_token_pct > mitigations.maxTokenPnlPct) {
        adjustedPnl *= (mitigations.maxTokenPnlPct / 100);
      }

      // If unique tokens too low
      if (entry.unique_tokens < mitigations.minUniqueTraders) {
        disqualified = true;
      }

      return {
        ...entry,
        adjustedPnl,
        disqualified,
      };
    }).sort((a, b) => b.adjustedPnl - a.adjustedPnl);
  }, [showFlaggedOnly, mitigations]);

  // Summary stats
  const stats = useMemo(() => {
    const flaggedCount = leaderboardData.filter(d => d.risk_score >= 70).length;
    const coordinationRingCount = leaderboardData.filter(d => d.flags.includes('Coordination Ring')).length;
    const totalPnlAtRisk = leaderboardData.filter(d => d.risk_score >= 70).reduce((sum, d) => sum + d.total_pnl, 0);
    return { flaggedCount, coordinationRingCount, totalPnlAtRisk };
  }, []);

  // PNL efficiency scatter data
  const pnlEfficiencyData = useMemo(() => {
    return leaderboardData.map(d => ({
      x: d.total_volume,
      y: d.total_pnl,
      efficiency: d.pnl_per_1k_volume,
      name: formatWallet(d.feePayer),
      fullAddress: d.feePayer,
      risk: d.risk_score,
    }));
  }, []);

  // Price timeline data for HANRi
  const priceTimelineData = useMemo(() => {
    return hanriTimeline.map((t, i) => ({
      time: new Date(t.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: t.price * 1000000, // Scale for visibility
      trader: t.feePayer,
      direction: t.direction,
      index: i,
    }));
  }, []);

  // Risk distribution pie
  const riskDistribution = useMemo(() => {
    const high = leaderboardData.filter(d => d.risk_score >= 80).length;
    const medium = leaderboardData.filter(d => d.risk_score >= 60 && d.risk_score < 80).length;
    const low = leaderboardData.filter(d => d.risk_score < 60).length;
    return [
      { name: 'High Risk (80+)', value: high, color: '#EF4444' },
      { name: 'Medium Risk (60-79)', value: medium, color: '#F59E0B' },
      { name: 'Low Risk (<60)', value: low, color: '#10B981' },
    ];
  }, []);

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
          <div className="w-4 h-4 rounded bg-red-500" />
          <h1 className="text-3xl font-bold text-white">PNL Leaderboard Gaming Analysis</h1>
        </div>
        <p className="text-gray-400">
          Analysis of potential gaming vectors, coordinated trading, and mitigation strategies for the Axiom/Raydium PNL leaderboard
        </p>
        <p className="text-sm text-gray-500 mt-1">Competition Period: Jan 19-25, 2026</p>
      </div>

      {/* Alert Banner */}
      <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Coordination Ring Detected</h3>
            <p className="text-red-300/80 text-sm mt-1">
              6 of the top 10 traders appear to be coordinating on the HANRi token. Same-second buys/sells and sequential pump patterns detected.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Risk Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="High-Risk Traders"
            value={`${stats.flaggedCount} / 10`}
            subtitle="In top 10"
          />
          <MetricCard
            title="Coordination Ring"
            value={`${stats.coordinationRingCount} traders`}
            subtitle="Same token patterns"
          />
          <MetricCard
            title="At-Risk PNL"
            value={formatCurrency(stats.totalPnlAtRisk)}
            subtitle="Potentially gamed"
          />
          <MetricCard
            title="Shared Tokens"
            value={`${coordinatedTokens.length}`}
            subtitle="Multi-trader overlap"
          />
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Leaderboard Table */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Leaderboard with Gaming Flags</h3>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showFlaggedOnly}
                onChange={(e) => setShowFlaggedOnly(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500"
              />
              Flagged only
            </label>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-800/80 sticky top-0">
                <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Wallet</th>
                  <th className="px-3 py-2 text-right">PNL</th>
                  <th className="px-3 py-2 text-right">Volume</th>
                  <th className="px-3 py-2 text-right">Efficiency</th>
                  <th className="px-3 py-2 text-center">Risk</th>
                  <th className="px-3 py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((entry, idx) => (
                  <tr
                    key={entry.feePayer}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
                      selectedTrader === entry.feePayer ? 'bg-gray-700/50' : ''
                    } ${entry.disqualified ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedTrader(entry.feePayer === selectedTrader ? null : entry.feePayer)}
                  >
                    <td className="px-3 py-2 text-gray-500 text-sm">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-blue-400 font-mono">
                        {formatWallet(entry.feePayer)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-white text-sm font-medium">
                      {formatCurrency(entry.total_pnl)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300 text-sm">
                      {formatCurrency(entry.total_volume)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-sm font-medium ${
                        entry.pnl_per_1k_volume > 500 ? 'text-red-400' :
                        entry.pnl_per_1k_volume > 300 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        ${entry.pnl_per_1k_volume.toFixed(0)}/1K
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        entry.risk_score >= 80 ? 'bg-red-500/20 text-red-400' :
                        entry.risk_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {entry.risk_score}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.flags.slice(0, 2).map((flag, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              flag.includes('Coordination') ? 'bg-red-500/20 text-red-300' :
                              flag.includes('Extreme') ? 'bg-purple-500/20 text-purple-300' :
                              flag.includes('High') ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-600 text-gray-300'
                            }`}
                          >
                            {flag.length > 15 ? flag.substring(0, 15) + '...' : flag}
                          </span>
                        ))}
                        {entry.flags.length > 2 && (
                          <span className="text-xs text-gray-500">+{entry.flags.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 space-y-2">
            {riskDistribution.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-400">{entry.name}</span>
                </div>
                <span className="text-white font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HANRi Token Analysis */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">HANRi Token Coordination Timeline</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Chart */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Price Action with Trader Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  label={{ value: 'Price (×10⁶)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`$${(Number(value) / 1000000).toFixed(8)}`, 'Price']}
                  labelFormatter={(label) => {
                    const item = priceTimelineData.find(d => d.time === label);
                    return item ? `${item.trader} (${item.direction})` : String(label);
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="price"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const color = traderColors[payload.trader] || '#8B5CF6';
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.direction === 'BUY' ? 6 : 4}
                        fill={color}
                        stroke={payload.direction === 'BUY' ? '#fff' : 'none'}
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Trader Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-700">
              {Object.entries(traderColors).slice(0, 6).map(([trader, color]) => (
                <div key={trader} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-gray-400">{trader}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Sequence */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Trade Sequence Analysis</h3>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {hanriTimeline.map((trade, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    trade.direction === 'BUY' ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: traderColors[trade.feePayer] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-300">{trade.feePayer}</span>
                      <span className={`text-xs font-bold ${
                        trade.direction === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.direction}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(trade.receivedAt).toLocaleTimeString()} · ${trade.direction === 'BUY' ? trade.amount_in.toFixed(2) : trade.amount_out.toFixed(2)} USD
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      ${(trade.price * 1000000).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">×10⁻⁶</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pattern Explanation */}
            <div className="mt-4 pt-4 border-t border-gray-700 bg-yellow-900/20 rounded-lg p-3">
              <p className="text-xs text-yellow-300">
                <strong>Pattern Detected:</strong> ETvmkav & 5siYF3h8 entered at same second (01:57:20), exited at same second (02:03:54).
                29fMnkfz accumulated, then 4NtyFqqR and TimeAdRp bought in sequence at higher prices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Volume vs PNL Analysis */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">PNL Efficiency Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scatter Plot */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Volume vs PNL</h3>
            <p className="text-xs text-gray-500 mb-4">High PNL with low volume indicates potential gaming</p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`}
                  label={{ value: 'Volume', position: 'bottom', fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`}
                  label={{ value: 'PNL', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 11 }}
                />
                {/* Reference line for "normal" efficiency */}
                <ReferenceLine
                  stroke="#4B5563"
                  strokeDasharray="3 3"
                  segment={[{ x: 0, y: 0 }, { x: 150000, y: 15000 }]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'x') return [formatCurrency(Number(value)), 'Volume'];
                    if (name === 'y') return [formatCurrency(Number(value)), 'PNL'];
                    return [Number(value), String(name)];
                  }}
                />
                <Scatter data={pnlEfficiencyData}>
                  {pnlEfficiencyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.risk >= 80 ? '#EF4444' : entry.risk >= 60 ? '#F59E0B' : '#10B981'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Dashed line = 10% efficiency (normal). Points above = suspicious
            </p>
          </div>

          {/* Volume Dominance */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Volume Dominance by Token</h3>
            <p className="text-xs text-gray-500 mb-4">Single trader controlling majority of token volume</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={volumeDominanceData}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 70, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="token"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value)}%`, 'Dominance']}
                />
                <ReferenceLine x={50} stroke="#EF4444" strokeDasharray="3 3" />
                <Bar dataKey="volume_dominance_pct" radius={[0, 4, 4, 0]}>
                  {volumeDominanceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.volume_dominance_pct > 80 ? '#EF4444' : entry.volume_dominance_pct > 50 ? '#F59E0B' : '#10B981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Red line = 50% threshold. Above = single trader dominates market
            </p>
          </div>
        </div>
      </section>

      {/* Mitigation Controls */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Mitigation Controls Simulator</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Min Token Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min Token Volume
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={mitigations.minTokenVolume}
                  onChange={(e) => setMitigations({ ...mitigations, minTokenVolume: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-16">${(mitigations.minTokenVolume/1000).toFixed(0)}K</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current: $1K</p>
            </div>

            {/* Min Unique Traders */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min Unique Traders
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={mitigations.minUniqueTraders}
                  onChange={(e) => setMitigations({ ...mitigations, minUniqueTraders: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-16">{mitigations.minUniqueTraders}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current: 1</p>
            </div>

            {/* Max Volume Dominance */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Volume Dominance
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={mitigations.maxVolumeDominance}
                  onChange={(e) => setMitigations({ ...mitigations, maxVolumeDominance: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-16">{mitigations.maxVolumeDominance}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current: 100%</p>
            </div>

            {/* Max Token PNL % */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Token PNL %
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={mitigations.maxTokenPnlPct}
                  onChange={(e) => setMitigations({ ...mitigations, maxTokenPnlPct: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-16">{mitigations.maxTokenPnlPct}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current: 100%</p>
            </div>

            {/* Min Hold Time */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min Hold Time (min)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={mitigations.minHoldTime}
                  onChange={(e) => setMitigations({ ...mitigations, minHoldTime: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-mono text-sm w-16">{mitigations.minHoldTime}m</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current: 0</p>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-sm font-medium text-white mb-3">Impact Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Tokens Affected</div>
                <div className="text-lg font-bold text-white">
                  {mitigations.minTokenVolume > 5000 ? '~1,100' : mitigations.minTokenVolume > 1000 ? '~160' : '0'}
                </div>
                <div className="text-xs text-gray-500">Would be filtered</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Traders Affected</div>
                <div className="text-lg font-bold text-white">
                  {filteredLeaderboard.filter(d => d.disqualified).length}
                </div>
                <div className="text-xs text-gray-500">Disqualified</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-400">PNL Reduction</div>
                <div className="text-lg font-bold text-yellow-400">
                  {formatCurrency(leaderboardData.reduce((sum, d) => sum + d.total_pnl, 0) - filteredLeaderboard.reduce((sum, d) => sum + d.adjustedPnl, 0))}
                </div>
                <div className="text-xs text-gray-500">Gaming impact</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Ring Members</div>
                <div className="text-lg font-bold text-red-400">
                  {mitigations.maxTokenPnlPct < 80 ? '6 affected' : '0 affected'}
                </div>
                <div className="text-xs text-gray-500">Coordination ring</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coordinated Trading Network */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Coordinated Trading Network</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coordinatedTokens.map((token) => (
              <div key={token.token} className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-blue-400">{token.token.substring(0, 12)}...</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    token.num_traders >= 5 ? 'bg-red-500/20 text-red-300' :
                    token.num_traders >= 3 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {token.num_traders} top traders
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {token.traders.map((trader) => (
                    <div
                      key={trader}
                      className="flex items-center gap-1 text-xs bg-gray-800 rounded px-2 py-1"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: traderColors[trader] || '#6B7280' }}
                      />
                      <span className="text-gray-300">{trader}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Recommended Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="font-semibold text-red-400">Immediate</h3>
            </div>
            <ul className="text-sm text-red-300/80 space-y-1 list-disc list-inside">
              <li>Raise min token volume to $10K (filters 74% of manipulable tokens)</li>
              <li>Flag 4NtyFqqR, TimeAdRp, 29fMnkfz for HANRi coordination</li>
              <li>Add min 10 unique traders per token requirement</li>
            </ul>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <h3 className="font-semibold text-yellow-400">Short-term</h3>
            </div>
            <ul className="text-sm text-yellow-300/80 space-y-1 list-disc list-inside">
              <li>Cap single-token PNL contribution to 30%</li>
              <li>Cap volume dominance to 50% per trader per token</li>
              <li>Add 5-minute minimum hold time for PNL credit</li>
            </ul>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-blue-400">Medium-term</h3>
            </div>
            <ul className="text-sm text-blue-300/80 space-y-1 list-disc list-inside">
              <li>Implement same-second trade detection algorithm</li>
              <li>Weight PNL by inverse of volume dominance</li>
              <li>Add wallet clustering for Sybil detection</li>
            </ul>
          </div>
          <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="font-semibold text-green-400">Long-term</h3>
            </div>
            <ul className="text-sm text-green-300/80 space-y-1 list-disc list-inside">
              <li>On-chain wallet graph analysis for coordination rings</li>
              <li>ML-based anomaly detection for trading patterns</li>
              <li>Tiered verification system for large PNL claims</li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
