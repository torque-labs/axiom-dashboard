import { useState, useMemo } from 'react';
import { formatCurrency, formatNumber } from '../lib/cube';

interface SegmentUser {
  fee_payer: string;
  total_usd_volume?: number;
  swap_count?: number;
  avg_swap_size?: number;
  net_usd1_flow?: number;
  buy_sell_ratio?: number;
  aggregation_date?: string;
}

interface UserTableProps {
  segmentName: string;
  segmentColor: string;
  users: SegmentUser[];
  onClose: () => void;
}

type SortKey = 'fee_payer' | 'total_usd_volume' | 'swap_count' | 'avg_swap_size' | 'net_usd1_flow';
type SortDirection = 'asc' | 'desc';

export function UserTable({ segmentName, segmentColor, users, onClose }: UserTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_usd_volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [search, setSearch] = useState('');

  const sortedUsers = useMemo(() => {
    const filtered = users.filter((user) =>
      user.fee_payer.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    // Limit to top 25 users
    return sorted.slice(0, 25);
  }, [users, sortKey, sortDirection, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: segmentColor }}
            />
            <h2 className="text-xl font-semibold text-white">{segmentName}</h2>
            <span className="text-gray-400 text-sm">({sortedUsers.length} users)</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search by wallet address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-800">
              <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white"
                  onClick={() => handleSort('fee_payer')}
                >
                  Wallet <SortIcon columnKey="fee_payer" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white text-right"
                  onClick={() => handleSort('total_usd_volume')}
                >
                  Volume <SortIcon columnKey="total_usd_volume" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white text-right"
                  onClick={() => handleSort('swap_count')}
                >
                  Swaps <SortIcon columnKey="swap_count" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white text-right"
                  onClick={() => handleSort('avg_swap_size')}
                >
                  Avg Size <SortIcon columnKey="avg_swap_size" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white text-right"
                  onClick={() => handleSort('net_usd1_flow')}
                >
                  Net Flow <SortIcon columnKey="net_usd1_flow" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr
                  key={user.fee_payer}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30"
                >
                  <td className="px-4 py-3">
                    <code className="text-sm text-blue-400 font-mono">
                      {user.fee_payer}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {user.total_usd_volume !== undefined
                      ? formatCurrency(user.total_usd_volume)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {user.swap_count !== undefined
                      ? formatNumber(user.swap_count)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {user.avg_swap_size !== undefined
                      ? formatCurrency(user.avg_swap_size)
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.net_usd1_flow !== undefined ? (
                      <span
                        className={
                          user.net_usd1_flow >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {formatCurrency(user.net_usd1_flow)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
