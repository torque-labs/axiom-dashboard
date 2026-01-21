import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatWallet, formatCurrency, formatNumber } from '../lib/cube';

interface SegmentUser {
  fee_payer: string;
  total_usd_volume?: number;
  swap_count?: number;
  avg_swap_size?: number;
  net_usd1_flow?: number;
  aggregation_date?: string;
}

interface SegmentChartProps {
  type: 'bar' | 'line' | 'scatter' | 'pie';
  data: SegmentUser[];
  color: string;
  dataKey?: string;
  xKey?: string;
  yKey?: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SegmentUser }> }) => {
  if (!active || !payload?.[0]) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-xs mb-1">Wallet</p>
      <p className="text-white font-mono text-sm mb-2">{formatWallet(data.fee_payer)}</p>
      {data.total_usd_volume !== undefined && (
        <p className="text-gray-300 text-sm">
          Volume: <span className="text-white">{formatCurrency(data.total_usd_volume)}</span>
        </p>
      )}
      {data.swap_count !== undefined && (
        <p className="text-gray-300 text-sm">
          Swaps: <span className="text-white">{formatNumber(data.swap_count)}</span>
        </p>
      )}
      {data.avg_swap_size !== undefined && (
        <p className="text-gray-300 text-sm">
          Avg Size: <span className="text-white">{formatCurrency(data.avg_swap_size)}</span>
        </p>
      )}
      {data.net_usd1_flow !== undefined && (
        <p className="text-gray-300 text-sm">
          Net Flow: <span className="text-white">{formatCurrency(data.net_usd1_flow)}</span>
        </p>
      )}
    </div>
  );
};

export function SegmentChart({ type, data, color, dataKey = 'total_usd_volume', xKey, yKey }: SegmentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const chartData = data.slice(0, 20).map((item, index) => ({
    ...item,
    name: formatWallet(item.fee_payer),
    index,
  }));

  const commonProps = {
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
            interval={Math.floor(chartData.length / 5)}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
            tickFormatter={(value) => formatCurrency(value).replace('$', '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    const lineData = data.reduce((acc, item) => {
      const date = item.aggregation_date || 'Unknown';
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as Array<{ date: string; count: number }>);

    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={lineData} {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={xKey || 'swap_count'}
            name="Swap Count"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
          />
          <YAxis
            dataKey={yKey || 'avg_swap_size'}
            name="Avg Size"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickLine={{ stroke: '#4B5563' }}
            axisLine={{ stroke: '#4B5563' }}
            tickFormatter={(value) => formatCurrency(value).replace('$', '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={chartData} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
