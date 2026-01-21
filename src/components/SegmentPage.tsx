import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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
} from 'recharts';
import { Layout } from './Layout';
import { MetricCard, MetricCardSkeleton } from './MetricCard';
import { WhaleBehaviorCenter } from './WhaleBehaviorCenter';
import { useSegmentQuery, transformSegmentData } from '../hooks/useCubeQuery';
import { SEGMENT_QUERIES, formatCurrency, formatNumber, formatWallet } from '../lib/cube';
import type { SegmentKey } from '../lib/cube';
import { SEGMENT_PAGE_CONFIGS } from '../config/segmentPages';
import type { SegmentUser, SegmentChartConfig } from '../config/segmentPages';

function formatMetricValue(value: number, format: 'number' | 'currency' | 'percent'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return formatNumber(value);
  }
}

// Generate histogram buckets from data
function generateHistogramData(
  users: SegmentUser[],
  field: keyof SegmentUser,
  bucketCount: number
) {
  const values = users.map((u) => Number(u[field]) || 0).filter((v) => v > 0);
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const bucketSize = range / bucketCount;

  const buckets: { range: string; count: number; min: number; max: number }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketMin = min + i * bucketSize;
    const bucketMax = min + (i + 1) * bucketSize;
    buckets.push({
      range: `${formatCurrency(bucketMin).replace('$', '')}`,
      count: 0,
      min: bucketMin,
      max: bucketMax,
    });
  }

  values.forEach((value) => {
    const bucketIndex = Math.min(
      Math.floor((value - min) / bucketSize),
      bucketCount - 1
    );
    buckets[bucketIndex].count++;
  });

  return buckets;
}

interface ChartProps {
  config: SegmentChartConfig;
  users: SegmentUser[];
  color: string;
}

type HistogramData = { range: string; count: number; min: number; max: number }[];
type BarData = { name: string; fullAddress: string; value: number }[];
type ScatterData = { x: number; y: number; name: string; fullAddress: string }[];
type PipelineData = { label: string; count: number; percent: number; color: string }[];

function SegmentChart({ config, users, color }: ChartProps) {
  const histogramData = useMemo<HistogramData>(() => {
    if (config.type !== 'histogram' || !config.bucketField) return [];
    return generateHistogramData(
      users,
      config.bucketField as keyof SegmentUser,
      config.bucketCount || 8
    );
  }, [config, users]);

  const barData = useMemo<BarData>(() => {
    if (config.type !== 'bar' || !config.dataKey) return [];
    return [...users]
      .sort((a, b) => {
        const aVal = Number(a[config.dataKey as keyof SegmentUser]) || 0;
        const bVal = Number(b[config.dataKey as keyof SegmentUser]) || 0;
        return bVal - aVal;
      })
      .slice(0, 15)
      .map((u) => ({
        name: formatWallet(u.fee_payer),
        fullAddress: u.fee_payer,
        value: Number(u[config.dataKey as keyof SegmentUser]) || 0,
      }));
  }, [config, users]);

  const scatterData = useMemo<ScatterData>(() => {
    if (config.type !== 'scatter' || !config.xKey || !config.yKey) return [];
    return users.map((u) => ({
      x: Number(u[config.xKey as keyof SegmentUser]) || 0,
      y: Number(u[config.yKey as keyof SegmentUser]) || 0,
      name: formatWallet(u.fee_payer),
      fullAddress: u.fee_payer,
    }));
  }, [config, users]);

  const pipelineData = useMemo<PipelineData>(() => {
    if (config.type !== 'pipeline' || !config.tiers || !config.dataKey) return [];
    const total = users.length;
    return config.tiers.map((tier) => {
      const count = users.filter((u) => {
        const val = Number(u[config.dataKey as keyof SegmentUser]) || 0;
        return val >= tier.min && val < tier.max;
      }).length;
      return {
        label: tier.label,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
        color: tier.color,
      };
    });
  }, [config, users]);

  const renderChart = () => {
    if (config.type === 'histogram') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <XAxis
              dataKey="range"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value) => [Number(value), 'Users']}
            />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (config.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 60, bottom: 10 }}
          >
            <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Value']}
              labelFormatter={(label) => {
                const item = barData.find((d) => d.name === label);
                return item?.fullAddress || String(label);
              }}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (config.type === 'scatter') {
      // Calculate medians for quadrant lines
      const xValues = scatterData.map(d => d.x).sort((a, b) => a - b);
      const yValues = scatterData.map(d => d.y).sort((a, b) => a - b);
      const medianX = xValues.length > 0 ? xValues[Math.floor(xValues.length / 2)] : 0;
      const medianY = yValues.length > 0 ? yValues[Math.floor(yValues.length / 2)] : 0;

      return (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <XAxis
              type="number"
              dataKey="x"
              name={config.xKey}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(v) => formatNumber(v)}
              label={{ value: config.xKey === 'swap_count' ? 'Swaps' : config.xKey, position: 'bottom', fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={config.yKey}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
              label={{ value: config.yKey === 'avg_swap_size' ? 'Trade Size' : 'Volume', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
            />
            {/* Quadrant reference lines */}
            <ReferenceLine x={medianX} stroke="#4B5563" strokeDasharray="3 3" />
            <ReferenceLine y={medianY} stroke="#4B5563" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                if (name === 'x') return [formatNumber(Number(value)), 'Swaps'];
                if (name === 'y') return [formatCurrency(Number(value)), config.yKey === 'avg_swap_size' ? 'Trade Size' : 'Volume'];
                return [Number(value), String(name)];
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullAddress;
                }
                return '';
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (config.type === 'pipeline') {
      return (
        <div className="space-y-3">
          {pipelineData.map((tier, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{tier.label}</span>
                <span className="text-sm text-gray-400">
                  {tier.count} users ({tier.percent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                  style={{
                    width: `${Math.max(tier.percent, 5)}%`,
                    backgroundColor: tier.color,
                  }}
                >
                  {tier.percent > 15 && (
                    <span className="text-xs font-bold text-white">{tier.count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-500">
              <span>← Further from whale</span>
              <span>Closer to whale →</span>
            </div>
          </div>
        </div>
      );
    }

    return <div className="text-gray-500">Chart type not supported</div>;
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-white mb-1">{config.title}</h3>
      <p className="text-sm text-gray-400 mb-4">{config.description}</p>
      {renderChart()}
    </div>
  );
}

function UserTable({ users, color }: { users: SegmentUser[]; color: string }) {
  // Show top 25 sorted by volume
  const sortedUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => b.total_usd_volume - a.total_usd_volume)
      .slice(0, 25);
  }, [users]);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-semibold text-white">Top 25 Users</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Swaps</th>
              <th className="px-4 py-3 text-right">Avg Size</th>
              <th className="px-4 py-3 text-right">Net Flow</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr
                key={user.fee_payer}
                className="border-b border-gray-700/50 hover:bg-gray-700/30"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/user/${user.fee_payer}`}
                    className="text-sm text-blue-400 font-mono hover:text-blue-300 hover:underline transition-colors"
                  >
                    {user.fee_payer}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(user.total_usd_volume)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatNumber(user.swap_count)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatCurrency(user.avg_swap_size)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      user.net_usd1_flow >= 0 ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {formatCurrency(user.net_usd1_flow)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SegmentPage() {
  const { segmentKey } = useParams<{ segmentKey: string }>();
  const key = segmentKey as SegmentKey;

  const config = SEGMENT_PAGE_CONFIGS[key];
  const queryConfig = SEGMENT_QUERIES[key];

  const { data, isLoading, error } = useSegmentQuery(key, queryConfig?.query);

  const users = useMemo(() => {
    if (!data?.data) return [];
    return transformSegmentData(data.data);
  }, [data]);

  if (!config || !queryConfig) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-4">Segment Not Found</h1>
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const computedMetrics = config.metrics.map((metric) => ({
    ...metric,
    value: isLoading ? 0 : metric.compute(users),
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
        Back to Overview
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: config.color }}
          />
          <h1 className="text-3xl font-bold text-white">{config.name}</h1>
        </div>
        <p className="text-gray-400 mb-2">{config.description}</p>
        <p className="text-sm text-gray-500 italic">"{config.growthQuestion}"</p>
      </div>

      {/* Whale Behavior Intelligence Center - Only for whales segment */}
      {key === 'whales' && !isLoading && users.length > 0 && (
        <section className="mb-8">
          <WhaleBehaviorCenter whaleAddresses={users.map((u) => u.fee_payer)} />
        </section>
      )}

      {/* Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : error ? (
            <div className="col-span-4 bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
              Error loading data: {error.message}
            </div>
          ) : (
            computedMetrics.map((metric) => (
              <MetricCard
                key={metric.key}
                title={metric.label}
                value={formatMetricValue(metric.value, metric.format)}
              />
            ))
          )}
        </div>
      </section>

      {/* Charts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Insights</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 h-80 animate-pulse" />
            <div className="bg-gray-800 rounded-xl border border-gray-700 h-80 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SegmentChart config={config.charts[0]} users={users} color={config.color} />
            <SegmentChart config={config.charts[1]} users={users} color={config.color} />
          </div>
        )}
      </section>

      {/* User Table */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Top Users</h2>
        {isLoading ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 h-96 animate-pulse" />
        ) : (
          <UserTable users={users} color={config.color} />
        )}
      </section>
    </Layout>
  );
}
