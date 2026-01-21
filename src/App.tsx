import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layout } from './components/Layout';
import { MetricCard, MetricCardSkeleton } from './components/MetricCard';
import { SegmentCard } from './components/SegmentCard';
import { SegmentPage } from './components/SegmentPage';
import { UserProfile } from './components/UserProfile';
import { GamingAnalysis } from './components/GamingAnalysis';
import { CampaignDashboard } from './components/CampaignDashboard';
import { useSegmentQuery, transformSegmentData, useVelocitySegmentQuery } from './hooks/useCubeQuery';
import { SEGMENT_QUERIES, formatCurrency, formatNumber, type SegmentKey } from './lib/cube';

const queryClient = new QueryClient();

interface SegmentUser {
  fee_payer: string;
  total_usd_volume?: number;
  swap_count?: number;
  avg_swap_size?: number;
  net_usd1_flow?: number;
  buy_sell_ratio?: number;
  aggregation_date?: string;
  current_streak_length?: number;
  total_active_days_30d?: number;
}

function Dashboard() {
  // Query all segments
  const whalesQuery = useSegmentQuery('whales', SEGMENT_QUERIES.whales.query);
  const midTierQuery = useSegmentQuery('mid_tier', SEGMENT_QUERIES.mid_tier.query);
  const streakMastersQuery = useSegmentQuery('streak_masters', SEGMENT_QUERIES.streak_masters.query);
  const lapsedWhalesQuery = useSegmentQuery('lapsed_whales', SEGMENT_QUERIES.lapsed_whales.query);
  const consistentTradersQuery = useSegmentQuery('consistent_traders', SEGMENT_QUERIES.consistent_traders.query);
  const accumulatorsQuery = useSegmentQuery('accumulators', SEGMENT_QUERIES.accumulators.query);
  const distributorsQuery = useSegmentQuery('distributors', SEGMENT_QUERIES.distributors.query);
  const activeSmallQuery = useSegmentQuery('active_small', SEGMENT_QUERIES.active_small.query);
  const newUsersQuery = useSegmentQuery('new_users', SEGMENT_QUERIES.new_users.query);

  // New segments
  const atRiskMidTierQuery = useSegmentQuery('at_risk_mid_tier', SEGMENT_QUERIES.at_risk_mid_tier.query);
  const oneAndDoneQuery = useSegmentQuery('one_and_done', SEGMENT_QUERIES.one_and_done.query);

  // Velocity segments (require comparison queries)
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

  // Transform data for each segment
  const segmentsData = useMemo(() => {
    return {
      whales: whalesQuery.data?.data ? transformSegmentData(whalesQuery.data.data) : [],
      mid_tier: midTierQuery.data?.data ? transformSegmentData(midTierQuery.data.data) : [],
      streak_masters: streakMastersQuery.data?.data ? transformSegmentData(streakMastersQuery.data.data) : [],
      lapsed_whales: lapsedWhalesQuery.data?.data ? transformSegmentData(lapsedWhalesQuery.data.data) : [],
      consistent_traders: consistentTradersQuery.data?.data ? transformSegmentData(consistentTradersQuery.data.data) : [],
      accumulators: accumulatorsQuery.data?.data ? transformSegmentData(accumulatorsQuery.data.data) : [],
      distributors: distributorsQuery.data?.data ? transformSegmentData(distributorsQuery.data.data) : [],
      active_small: activeSmallQuery.data?.data ? transformSegmentData(activeSmallQuery.data.data) : [],
      new_users: newUsersQuery.data?.data ? transformSegmentData(newUsersQuery.data.data) : [],
      // New segments
      at_risk_mid_tier: atRiskMidTierQuery.data?.data ? transformSegmentData(atRiskMidTierQuery.data.data) : [],
      one_and_done: oneAndDoneQuery.data?.data ? transformSegmentData(oneAndDoneQuery.data.data) : [],
      rising_stars: risingStarsQuery.data || [],
      cooling_down: coolingDownQuery.data || [],
    };
  }, [
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

  // Calculate metrics for each segment
  const getSegmentMetrics = (users: SegmentUser[]) => ({
    userCount: users.length,
    totalVolume: users.reduce((sum, u) => sum + (u.total_usd_volume || 0), 0),
    totalSwaps: users.reduce((sum, u) => sum + (u.swap_count || 0), 0),
  });

  // Calculate totals for hero section
  const totals = useMemo(() => {
    const allUsers = new Set<string>();
    let totalVolume = 0;
    let totalSwaps = 0;

    Object.values(segmentsData).forEach((users) => {
      users.forEach((user) => {
        allUsers.add(user.fee_payer);
        totalVolume += user.total_usd_volume || 0;
        totalSwaps += user.swap_count || 0;
      });
    });

    const avgTradeSize = totalSwaps > 0 ? totalVolume / totalSwaps : 0;

    return {
      totalUsers: allUsers.size,
      totalVolume,
      totalSwaps,
      avgTradeSize,
    };
  }, [segmentsData]);

  // Pie chart data (only include main segments to avoid overcrowding)
  const pieData = useMemo(() => {
    const mainSegments: SegmentKey[] = ['whales', 'mid_tier', 'streak_masters', 'lapsed_whales', 'consistent_traders', 'accumulators', 'distributors', 'active_small', 'new_users'];
    return mainSegments.map((key) => ({
      name: SEGMENT_QUERIES[key].name,
      value: segmentsData[key]?.length || 0,
      color: SEGMENT_QUERIES[key].color,
    }));
  }, [segmentsData]);

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

  return (
    <Layout>
      {/* Hero Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <MetricCard
                  title="Total Users"
                  value={formatNumber(totals.totalUsers)}
                  subtitle="Across all segments"
                />
                <MetricCard
                  title="Total Volume"
                  value={formatCurrency(totals.totalVolume)}
                  subtitle="Last 30 days"
                />
                <MetricCard
                  title="Total Swaps"
                  value={formatNumber(totals.totalSwaps)}
                  subtitle="Last 30 days"
                />
                <MetricCard
                  title="Avg Trade Size"
                  value={formatCurrency(totals.avgTradeSize)}
                  subtitle="Per swap"
                />
              </>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm text-gray-400 mb-4">Segment Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [formatNumber(value as number), 'Users']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs text-gray-400">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Segment Cards - 3x3 Grid */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">User Segments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1: Volume-based */}
          <Link to="/segment/whales">
            <SegmentCard
              name={SEGMENT_QUERIES.whales.name}
              description={SEGMENT_QUERIES.whales.description}
              color={SEGMENT_QUERIES.whales.color}
              {...getSegmentMetrics(segmentsData.whales)}
              isLoading={whalesQuery.isLoading}
              error={whalesQuery.error}
            />
          </Link>

          <Link to="/segment/mid_tier">
            <SegmentCard
              name={SEGMENT_QUERIES.mid_tier.name}
              description={SEGMENT_QUERIES.mid_tier.description}
              color={SEGMENT_QUERIES.mid_tier.color}
              {...getSegmentMetrics(segmentsData.mid_tier)}
              isLoading={midTierQuery.isLoading}
              error={midTierQuery.error}
            />
          </Link>

          <Link to="/segment/lapsed_whales">
            <SegmentCard
              name={SEGMENT_QUERIES.lapsed_whales.name}
              description={SEGMENT_QUERIES.lapsed_whales.description}
              color={SEGMENT_QUERIES.lapsed_whales.color}
              {...getSegmentMetrics(segmentsData.lapsed_whales)}
              isLoading={lapsedWhalesQuery.isLoading}
              error={lapsedWhalesQuery.error}
            />
          </Link>

          {/* Row 2: Behavior-based */}
          <Link to="/segment/streak_masters">
            <SegmentCard
              name={SEGMENT_QUERIES.streak_masters.name}
              description={SEGMENT_QUERIES.streak_masters.description}
              color={SEGMENT_QUERIES.streak_masters.color}
              {...getSegmentMetrics(segmentsData.streak_masters)}
              isLoading={streakMastersQuery.isLoading}
              error={streakMastersQuery.error}
            />
          </Link>

          <Link to="/segment/consistent_traders">
            <SegmentCard
              name={SEGMENT_QUERIES.consistent_traders.name}
              description={SEGMENT_QUERIES.consistent_traders.description}
              color={SEGMENT_QUERIES.consistent_traders.color}
              {...getSegmentMetrics(segmentsData.consistent_traders)}
              isLoading={consistentTradersQuery.isLoading}
              error={consistentTradersQuery.error}
            />
          </Link>

          <Link to="/segment/active_small">
            <SegmentCard
              name={SEGMENT_QUERIES.active_small.name}
              description={SEGMENT_QUERIES.active_small.description}
              color={SEGMENT_QUERIES.active_small.color}
              {...getSegmentMetrics(segmentsData.active_small)}
              isLoading={activeSmallQuery.isLoading}
              error={activeSmallQuery.error}
            />
          </Link>

          {/* Row 3: Flow-based */}
          <Link to="/segment/accumulators">
            <SegmentCard
              name={SEGMENT_QUERIES.accumulators.name}
              description={SEGMENT_QUERIES.accumulators.description}
              color={SEGMENT_QUERIES.accumulators.color}
              {...getSegmentMetrics(segmentsData.accumulators)}
              isLoading={accumulatorsQuery.isLoading}
              error={accumulatorsQuery.error}
            />
          </Link>

          <Link to="/segment/distributors">
            <SegmentCard
              name={SEGMENT_QUERIES.distributors.name}
              description={SEGMENT_QUERIES.distributors.description}
              color={SEGMENT_QUERIES.distributors.color}
              {...getSegmentMetrics(segmentsData.distributors)}
              isLoading={distributorsQuery.isLoading}
              error={distributorsQuery.error}
            />
          </Link>

          <Link to="/segment/new_users">
            <SegmentCard
              name={SEGMENT_QUERIES.new_users.name}
              description={SEGMENT_QUERIES.new_users.description}
              color={SEGMENT_QUERIES.new_users.color}
              {...getSegmentMetrics(segmentsData.new_users)}
              isLoading={newUsersQuery.isLoading}
              error={newUsersQuery.error}
            />
          </Link>
        </div>
      </section>

      {/* New Segments - Velocity, Retention, Behavior */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Advanced Segments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Velocity Segments */}
          <Link to="/segment/rising_stars">
            <SegmentCard
              name={SEGMENT_QUERIES.rising_stars.name}
              description={SEGMENT_QUERIES.rising_stars.description}
              color={SEGMENT_QUERIES.rising_stars.color}
              {...getSegmentMetrics(segmentsData.rising_stars)}
              isLoading={risingStarsQuery.isLoading}
              error={risingStarsQuery.error}
            />
          </Link>

          <Link to="/segment/cooling_down">
            <SegmentCard
              name={SEGMENT_QUERIES.cooling_down.name}
              description={SEGMENT_QUERIES.cooling_down.description}
              color={SEGMENT_QUERIES.cooling_down.color}
              {...getSegmentMetrics(segmentsData.cooling_down)}
              isLoading={coolingDownQuery.isLoading}
              error={coolingDownQuery.error}
            />
          </Link>

          <Link to="/segment/at_risk_mid_tier">
            <SegmentCard
              name={SEGMENT_QUERIES.at_risk_mid_tier.name}
              description={SEGMENT_QUERIES.at_risk_mid_tier.description}
              color={SEGMENT_QUERIES.at_risk_mid_tier.color}
              {...getSegmentMetrics(segmentsData.at_risk_mid_tier)}
              isLoading={atRiskMidTierQuery.isLoading}
              error={atRiskMidTierQuery.error}
            />
          </Link>

          {/* Activation Segment */}
          <Link to="/segment/one_and_done">
            <SegmentCard
              name={SEGMENT_QUERIES.one_and_done.name}
              description={SEGMENT_QUERIES.one_and_done.description}
              color={SEGMENT_QUERIES.one_and_done.color}
              {...getSegmentMetrics(segmentsData.one_and_done)}
              isLoading={oneAndDoneQuery.isLoading}
              error={oneAndDoneQuery.error}
            />
          </Link>
        </div>
      </section>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/segment/:segmentKey" element={<SegmentPage />} />
          <Route path="/user/:address" element={<UserProfile />} />
          <Route path="/gaming-analysis" element={<GamingAnalysis />} />
          <Route path="/campaign" element={<CampaignDashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
