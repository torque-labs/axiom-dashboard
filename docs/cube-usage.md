# Cube.js Usage Guide

This document explains how to query data from Cube.js in the Axiom Dashboard.

## Setup

Cube requires an API key set via environment variable:

```bash
VITE_CUBE_API_KEY=your-api-key-here
```

The API is proxied through `/cubejs-api/v1` (configured in `vite.config.ts`).

## Querying Cube

### Option 1: React Hook (Recommended)

Use the `useCubeQuery` hook for React components:

```tsx
import { useCubeQuery } from '../hooks/useCubeQuery';

function MyComponent() {
  const { data, isLoading, error } = useCubeQuery('unique-query-key', {
    measures: ['user_axiom_volume.total_usd_volume'],
    dimensions: ['user_axiom_volume.fee_payer'],
    timeDimensions: [
      {
        dimension: 'user_axiom_volume.aggregation_date',
        dateRange: 'last 30 days',
      },
    ],
    limit: 100,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

The hook wraps React Query with a 5-minute stale time and disabled refetch on window focus.

### Option 2: Direct API Call

For non-React contexts or custom logic:

```ts
import { queryCube } from '../lib/cube';

const response = await queryCube({
  measures: ['user_axiom_volume.total_usd_volume'],
  dimensions: ['user_axiom_volume.fee_payer'],
  order: { 'user_axiom_volume.total_usd_volume': 'desc' },
  limit: 50,
});

// response.data contains the results
console.log(response.data);
```

## Query Structure

A Cube query has these main parts:

```ts
{
  // What to calculate (aggregations)
  measures: ['user_axiom_volume.total_usd_volume', 'user_axiom_volume.swap_count'],

  // How to group results
  dimensions: ['user_axiom_volume.fee_payer'],

  // Time-based filtering and grouping
  timeDimensions: [
    {
      dimension: 'user_axiom_volume.aggregation_date',
      dateRange: 'last 30 days',  // or ['2024-01-01', '2024-01-31']
      granularity: 'day',         // optional: 'day', 'week', 'month'
    },
  ],

  // Filter conditions
  filters: [
    {
      member: 'user_axiom_volume.total_usd_volume',
      operator: 'gte',
      values: ['100000'],
    },
  ],

  // Sort order
  order: { 'user_axiom_volume.total_usd_volume': 'desc' },

  // Result limit
  limit: 100,
}
```

### Filter Operators

- `equals` - exact match
- `notEquals` - not equal
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `contains` - string contains
- `notContains` - string does not contain

### Date Ranges

Relative ranges:
- `'today'`
- `'yesterday'`
- `'last 7 days'`
- `'last 30 days'`
- `'this week'`
- `'this month'`

Absolute ranges:
```ts
dateRange: ['2024-01-01', '2024-01-31']
```

## Available Measures & Dimensions

From `user_axiom_volume`:

| Field | Type | Description |
|-------|------|-------------|
| `fee_payer` | dimension | Wallet address |
| `aggregation_date` | time dimension | Date of activity |
| `total_usd_volume` | measure | Total trading volume in USD |
| `swap_count` | measure | Number of swaps |
| `avg_swap_size` | measure | Average swap size in USD |
| `net_usd1_flow` | measure | Net USD flow (buys - sells) |
| `buy_sell_ratio` | measure | Ratio of buy to sell volume |

## Pre-defined Segment Queries

Common queries are defined in `src/lib/cube.ts` under `SEGMENT_QUERIES`:

```ts
import { SEGMENT_QUERIES } from '../lib/cube';

// Use pre-defined query
const whalesQuery = SEGMENT_QUERIES.whales.query;
```

Available segments:
- `whales` - High-volume traders ($100K+ in 30 days)
- `lapsed_whales` - Former whales inactive for 14+ days
- `big_infrequent` - Large trades ($10K+) but few swaps (5 or less)
- `accumulators` - Top net buyers
- `active_small` - High frequency but small trades
- `new_users` - First-time traders in last 7 days

## Transforming Response Data

Cube returns numeric values as strings. Use `transformSegmentData` to parse:

```ts
import { transformSegmentData } from '../hooks/useCubeQuery';

const { data } = useCubeQuery('my-query', query);

const transformed = transformSegmentData(data?.data || []);
// Returns: { fee_payer, total_usd_volume, swap_count, avg_swap_size, net_usd1_flow, ... }
```

## Helper Functions

Format utilities in `src/lib/cube.ts`:

```ts
import { formatWallet, formatCurrency, formatNumber } from '../lib/cube';

formatWallet('ABC123...XYZ789');  // "ABC1...Z789"
formatCurrency(1500000);          // "$1.50M"
formatCurrency(50000);            // "$50.0K"
formatNumber(1234567);            // "1.23M"
```
