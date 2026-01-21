import { formatCurrency, formatNumber } from '../lib/cube';

interface SegmentCardProps {
  name: string;
  description: string;
  color: string;
  userCount: number;
  totalVolume: number;
  totalSwaps: number;
  isLoading: boolean;
  error?: Error | null;
}

export function SegmentCard({
  name,
  description,
  color,
  userCount,
  totalVolume,
  totalSwaps,
  isLoading,
  error,
}: SegmentCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white">{name}</h3>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="h-24 flex items-center justify-center text-red-400 text-sm">
            Error loading data
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center min-w-0">
              <p className="text-lg font-bold text-white truncate">{formatNumber(userCount)}</p>
              <p className="text-xs text-gray-500 mt-1">Users</p>
            </div>
            <div className="text-center min-w-0">
              <p className="text-lg font-bold text-white truncate">{formatCurrency(totalVolume)}</p>
              <p className="text-xs text-gray-500 mt-1">Volume</p>
            </div>
            <div className="text-center min-w-0">
              <p className="text-lg font-bold text-white truncate">{formatNumber(totalSwaps)}</p>
              <p className="text-xs text-gray-500 mt-1">Swaps</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SegmentCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-700">
        <div className="h-5 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-700 rounded w-48" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="h-8 bg-gray-700 rounded w-16 mx-auto mb-1" />
            <div className="h-3 bg-gray-700 rounded w-12 mx-auto" />
          </div>
          <div className="text-center">
            <div className="h-8 bg-gray-700 rounded w-16 mx-auto mb-1" />
            <div className="h-3 bg-gray-700 rounded w-12 mx-auto" />
          </div>
          <div className="text-center">
            <div className="h-8 bg-gray-700 rounded w-16 mx-auto mb-1" />
            <div className="h-3 bg-gray-700 rounded w-12 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
