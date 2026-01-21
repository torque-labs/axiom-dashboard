export type SegmentType =
  | 'whales'
  | 'lapsed_whales'
  | 'big_infrequent'
  | 'accumulators'
  | 'active_small'
  | 'new_users';

export interface SegmentUser {
  fee_payer: string;
  total_usd_volume?: number;
  swap_count?: number;
  avg_swap_size?: number;
  net_usd1_flow?: number;
  buy_sell_ratio?: number;
  aggregation_date?: string;
}

export interface SegmentData {
  type: SegmentType;
  name: string;
  description: string;
  users: SegmentUser[];
  totalCount: number;
  totalVolume: number;
  avgSwapSize: number;
  color: string;
}

export interface CubeQuery {
  measures?: string[];
  dimensions?: string[];
  timeDimensions?: Array<{
    dimension: string;
    dateRange?: string | [string, string];
    granularity?: string;
  }>;
  filters?: Array<{
    member: string;
    operator: string;
    values: string[];
  }>;
  order?: Record<string, 'asc' | 'desc'> | Array<[string, 'asc' | 'desc']>;
  limit?: number;
  offset?: number;
}

export interface CubeResponse<T = Record<string, unknown>> {
  data: T[];
  annotation?: {
    measures: Record<string, { title: string; type: string }>;
    dimensions: Record<string, { title: string; type: string }>;
  };
}

export interface SegmentConfig {
  type: SegmentType;
  name: string;
  description: string;
  color: string;
  chartType: 'bar' | 'line' | 'scatter' | 'pie';
  query: CubeQuery;
  secondaryQuery?: CubeQuery;
}
