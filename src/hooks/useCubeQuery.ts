import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { queryCube } from '../lib/cube';
import type { CubeQuery, CubeResponse } from '../types/segments';

interface UseCubeQueryOptions<T> extends Omit<UseQueryOptions<CubeResponse<T>, Error>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export function useCubeQuery<T = Record<string, unknown>>(
  queryKey: string | string[],
  query: CubeQuery,
  options?: UseCubeQueryOptions<T>
) {
  const keys = Array.isArray(queryKey) ? queryKey : [queryKey];

  return useQuery<CubeResponse<T>, Error>({
    queryKey: ['cube', ...keys, query],
    queryFn: () => queryCube<T>(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Hook for segment data with proper typing
export interface SegmentUserData {
  'user_axiom_volume.fee_payer': string;
  'user_axiom_volume.total_usd_volume'?: number;
  'user_axiom_volume.swap_count'?: number;
  'user_axiom_volume.avg_swap_size'?: number;
  'user_axiom_volume.net_usd1_flow'?: number;
  'user_axiom_volume.buy_sell_ratio'?: number;
  'user_axiom_volume.aggregation_date'?: string;
}

export function useSegmentQuery(
  segmentKey: string,
  query: CubeQuery,
  options?: UseCubeQueryOptions<SegmentUserData>
) {
  return useCubeQuery<SegmentUserData>(
    ['segment', segmentKey],
    query,
    options
  );
}

// Transform cube response to more usable format
// Note: Cube returns numeric values as strings, so we parse them
export function transformSegmentData(data: SegmentUserData[]) {
  return data.map((row) => ({
    fee_payer: row['user_axiom_volume.fee_payer'],
    total_usd_volume: parseFloat(String(row['user_axiom_volume.total_usd_volume'] ?? 0)) || 0,
    swap_count: parseFloat(String(row['user_axiom_volume.swap_count'] ?? 0)) || 0,
    avg_swap_size: parseFloat(String(row['user_axiom_volume.avg_swap_size'] ?? 0)) || 0,
    net_usd1_flow: parseFloat(String(row['user_axiom_volume.net_usd1_flow'] ?? 0)) || 0,
    buy_sell_ratio: parseFloat(String(row['user_axiom_volume.buy_sell_ratio'] ?? 0)) || 0,
    aggregation_date: row['user_axiom_volume.aggregation_date'],
  }));
}

// Streak data from user_streaks cube
export interface StreakUserData {
  'user_streaks.fee_payer': string;
  'user_streaks.current_streak_length'?: number;
  'user_streaks.max_streak_length_30d'?: number;
  'user_streaks.total_active_days_30d'?: number;
  'user_streaks.has_7_day_streak'?: boolean;
  'user_streaks.summary_date'?: string;
}

// Transform streak data to segment-compatible format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformStreakData(data: any[]) {
  return data.map((row) => ({
    fee_payer: String(row['user_streaks.fee_payer'] || ''),
    total_usd_volume: 0, // Streaks don't have volume
    swap_count: 0,
    avg_swap_size: 0,
    net_usd1_flow: 0,
    current_streak_length: parseFloat(String(row['user_streaks.current_streak_length'] ?? 0)) || 0,
    max_streak_length_30d: parseFloat(String(row['user_streaks.max_streak_length_30d'] ?? 0)) || 0,
    total_active_days_30d: parseFloat(String(row['user_streaks.total_active_days_30d'] ?? 0)) || 0,
  }));
}

// Hook for velocity segments (Rising Stars, Cooling Down) that compare two time periods
export function useVelocitySegmentQuery(
  segmentKey: string,
  currentQuery: CubeQuery,
  comparisonQuery: CubeQuery,
  velocityThreshold: number,
  velocityDirection: 'up' | 'down',
  options?: UseCubeQueryOptions<SegmentUserData>
) {
  const currentData = useSegmentQuery(`${segmentKey}_current`, currentQuery, options);
  const comparisonData = useSegmentQuery(`${segmentKey}_comparison`, comparisonQuery, options);

  const isLoading = currentData.isLoading || comparisonData.isLoading;
  const error = currentData.error || comparisonData.error;

  // Compute velocity users once both queries complete
  const velocityUsers = (() => {
    if (!currentData.data?.data || !comparisonData.data?.data) return [];

    const currentUsers = transformSegmentData(currentData.data.data);
    const comparisonUsers = transformSegmentData(comparisonData.data.data);

    // Create lookup map for comparison period
    const comparisonMap = new Map(
      comparisonUsers.map((u) => [u.fee_payer, u.total_usd_volume])
    );

    // Filter users based on velocity
    return currentUsers
      .map((user) => {
        const previousVolume = comparisonMap.get(user.fee_payer) || 0;
        const currentVolume = user.total_usd_volume;
        const velocityRatio = previousVolume > 0 ? currentVolume / previousVolume : (currentVolume > 0 ? Infinity : 0);

        return {
          ...user,
          previous_volume: previousVolume,
          velocity_ratio: velocityRatio,
          velocity_change: previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0,
        };
      })
      .filter((user) => {
        if (velocityDirection === 'up') {
          // Rising Stars: current >= threshold * previous (and previous > 0 to avoid new users)
          return user.velocity_ratio >= velocityThreshold && user.previous_volume > 0;
        } else {
          // Cooling Down: current <= threshold * previous (significant decline)
          return user.velocity_ratio <= velocityThreshold && user.velocity_ratio > 0;
        }
      })
      .sort((a, b) => {
        if (velocityDirection === 'up') {
          return b.velocity_ratio - a.velocity_ratio; // Highest growth first
        } else {
          return a.velocity_ratio - b.velocity_ratio; // Biggest decline first
        }
      });
  })();

  return {
    data: velocityUsers,
    isLoading,
    error,
    currentData,
    comparisonData,
  };
}

