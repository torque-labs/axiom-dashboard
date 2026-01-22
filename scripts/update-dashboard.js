import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUOTE_TOKEN = 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB';

// Competition dates - UPDATE THESE AS NEEDED
const BASELINE_START = '2026-01-12';
const BASELINE_END = '2026-01-19';  // exclusive
const COMP_START = '2026-01-19';
const COMP_END = '2026-01-22';      // exclusive (Jan 21 is last day)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(sql) {
  const result = await pool.query(sql);
  return result.rows;
}

// Formatting helpers
const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const fmtMoney = (n) => {
  const v = Number(n);
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${fmt(v)}`;
};
const shortWallet = (w) => `${w.slice(0, 6)}...${w.slice(-4)}`;
const pctChange = (comp, base) => Math.round(((comp - base) / base) * 100);

async function fetchAllData() {
  console.log('Fetching data...');

  const [dailyData, segments, newVsReturning, pnlLeaders, volumeLeaders] = await Promise.all([
    // Daily breakdown
    query(`
      SELECT DATE("receivedAt") as day, COUNT(*) as trades, COUNT(DISTINCT "feePayer") as users,
        ROUND(SUM(CASE WHEN "tokenIn" = '${QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric, 2) as volume
      FROM axiomtrade_partitioned
      WHERE "receivedAt" >= '${BASELINE_START}' AND "receivedAt" < '${COMP_END}'
      GROUP BY DATE("receivedAt") ORDER BY day
    `),
    // Segments
    query(`
      WITH uv AS (
        SELECT "feePayer", SUM(CASE WHEN "tokenIn" = '${QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END) as vol
        FROM axiomtrade_partitioned WHERE "receivedAt" >= '${COMP_START}' AND "receivedAt" < '${COMP_END}' GROUP BY "feePayer"
      )
      SELECT CASE WHEN vol >= 100000 THEN 'Whale' WHEN vol >= 10000 THEN 'Mid' WHEN vol >= 1000 THEN 'Participant' ELSE 'Casual' END as segment,
        COUNT(*) as users, ROUND(SUM(vol)::numeric, 2) as volume FROM uv GROUP BY 1
    `),
    // New vs Returning
    query(`
      WITH comp AS (SELECT DISTINCT "feePayer" FROM axiomtrade_partitioned WHERE "receivedAt" >= '${COMP_START}' AND "receivedAt" < '${COMP_END}'),
           pre AS (SELECT DISTINCT "feePayer" FROM axiomtrade_partitioned WHERE "receivedAt" < '${COMP_START}')
      SELECT CASE WHEN p."feePayer" IS NULL THEN 'New' ELSE 'Returning' END as type, COUNT(*) as cnt
      FROM comp c LEFT JOIN pre p ON c."feePayer" = p."feePayer" GROUP BY 1
    `),
    // PnL Leaderboard
    query(`
      WITH base AS (
        SELECT "feePayer", "uiAmountIn", "uiAmountOut",
          CASE WHEN "tokenIn" = '${QUOTE_TOKEN}' THEN 'BUY' ELSE 'SELL' END AS dir,
          CASE WHEN "tokenIn" != '${QUOTE_TOKEN}' THEN "tokenIn" ELSE "tokenOut" END AS token,
          CASE WHEN "tokenIn" = '${QUOTE_TOKEN}' THEN NULLIF("uiAmountIn",0)/NULLIF("uiAmountOut",0)
               ELSE NULLIF("uiAmountOut",0)/NULLIF("uiAmountIn",0) END AS price
        FROM axiomtrade_partitioned WHERE "receivedAt" >= '${COMP_START}' AND "receivedAt" < '${COMP_END}'
      ),
      vwap AS (SELECT token, SUM(CASE WHEN dir='SELL' THEN "uiAmountIn"*price ELSE 0 END)/NULLIF(SUM(CASE WHEN dir='SELL' THEN "uiAmountIn" ELSE 0 END),0) AS vp FROM base GROUP BY token),
      utp AS (SELECT b."feePayer", b.token, SUM(CASE WHEN dir='BUY' THEN -"uiAmountIn" ELSE "uiAmountOut" END) AS rpnl,
              SUM(CASE WHEN dir='BUY' THEN "uiAmountOut" ELSE -"uiAmountIn" END) AS bal,
              SUM(CASE WHEN dir='BUY' THEN "uiAmountIn" ELSE "uiAmountOut" END) AS vol FROM base b GROUP BY 1,2),
      wu AS (SELECT u."feePayer", u.token, u.rpnl, u.vol, CASE WHEN u.bal<0 THEN u.bal*COALESCE(v.vp,0) ELSE 0 END AS uloss FROM utp u LEFT JOIN vwap v ON u.token=v.token),
      pnl AS (SELECT "feePayer", ROUND(SUM(rpnl+uloss)::numeric,2) AS pnl, ROUND(SUM(vol)::numeric,2) AS vol, COUNT(DISTINCT token) AS tokens FROM wu GROUP BY 1 HAVING SUM(vol)>=1000),
      tc AS (SELECT "feePayer", COUNT(*) as trades FROM axiomtrade_partitioned WHERE "receivedAt" >= '${COMP_START}' AND "receivedAt" < '${COMP_END}' GROUP BY 1),
      pre AS (SELECT DISTINCT "feePayer" FROM axiomtrade_partitioned WHERE "receivedAt" < '${COMP_START}')
      SELECT p."feePayer", p.pnl, p.vol, p.tokens, t.trades, CASE WHEN pre."feePayer" IS NOT NULL THEN 'Return' ELSE 'New' END as type
      FROM pnl p JOIN tc t ON p."feePayer"=t."feePayer" LEFT JOIN pre ON p."feePayer"=pre."feePayer" ORDER BY p.pnl DESC LIMIT 10
    `),
    // Volume Leaders
    query(`
      SELECT "feePayer", ROUND(SUM(CASE WHEN "tokenIn"='${QUOTE_TOKEN}' THEN "uiAmountIn" ELSE "uiAmountOut" END)::numeric,2) as vol
      FROM axiomtrade_partitioned WHERE "receivedAt" >= '${COMP_START}' AND "receivedAt" < '${COMP_END}'
      GROUP BY 1 ORDER BY vol DESC LIMIT 5
    `)
  ]);

  return { dailyData, segments, newVsReturning, pnlLeaders, volumeLeaders };
}

function generateHTML(data) {
  const { dailyData, segments, newVsReturning, pnlLeaders, volumeLeaders } = data;

  // Calculate metrics
  const baselineDays = dailyData.filter(d => new Date(d.day) < new Date(COMP_START));
  const compDays = dailyData.filter(d => new Date(d.day) >= new Date(COMP_START));

  const bVol = baselineDays.reduce((s, d) => s + Number(d.volume), 0) / baselineDays.length;
  const bTrades = baselineDays.reduce((s, d) => s + Number(d.trades), 0) / baselineDays.length;
  const bUsers = baselineDays.reduce((s, d) => s + Number(d.users), 0) / baselineDays.length;

  const cVol = compDays.reduce((s, d) => s + Number(d.volume), 0) / compDays.length;
  const cTrades = compDays.reduce((s, d) => s + Number(d.trades), 0) / compDays.length;
  const cUsers = compDays.reduce((s, d) => s + Number(d.users), 0) / compDays.length;

  // Segments
  const seg = {};
  segments.forEach(s => seg[s.segment] = s);
  const totalVol = segments.reduce((s, x) => s + Number(x.volume), 0);
  const maxVol = Math.max(...segments.map(s => Number(s.volume)));

  // New vs Returning
  const userTypes = {};
  newVsReturning.forEach(u => userTypes[u.type] = Number(u.cnt));
  const totalU = (userTypes['New'] || 0) + (userTypes['Returning'] || 0);
  const newPct = Math.round((userTypes['New'] / totalU) * 100);

  // Volume leaders set for overlap check
  const volLeaderSet = new Set(volumeLeaders.map(v => v.feePayer));
  const overlap = pnlLeaders.filter(p => volLeaderSet.has(p.feePayer));

  // Chart data
  const labels = dailyData.map(d => `Jan ${new Date(d.day).getDate()}`);
  const volData = dailyData.map(d => (Number(d.volume) / 1e6).toFixed(2));
  const tradeData = dailyData.map(d => (Number(d.trades) / 1000).toFixed(1));
  const userData = dailyData.map(d => (Number(d.users) / 1000).toFixed(2));

  const compEndDay = new Date(COMP_END);
  compEndDay.setDate(compEndDay.getDate() - 1);
  const compDaysCount = compDays.length;
  const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  // Generate leaderboard rows
  const leaderRows = pnlLeaders.map((l, i) => {
    const isHighlight = volLeaderSet.has(l.feePayer);
    const eff = ((Number(l.pnl) / Number(l.vol)) * 100).toFixed(1);
    return `
          <div class="leader-row${isHighlight ? ' highlight' : ''}">
            <div class="leader-rank">${i + 1}</div>
            <div class="leader-info">
              <div class="leader-wallet">${shortWallet(l.feePayer)}</div>
              <div class="leader-stats">${l.tokens} tokens · ${fmt(l.trades)} trades</div>
            </div>
            <div class="leader-badge${l.type === 'New' ? ' new' : ''}">${l.type}</div>
            <div class="leader-efficiency">${eff}%</div>
            <div class="leader-volume">${fmtMoney(l.vol)}</div>
            <div class="leader-pnl">${fmtMoney(l.pnl)}</div>
          </div>`;
  }).join('');

  // Generate volume leader rows
  const volRows = volumeLeaders.map(v => {
    const isPnL = pnlLeaders.some(p => p.feePayer === v.feePayer);
    return `
          <div class="vol-leader-row${isPnL ? ' highlight' : ''}">
            <span class="vol-leader-wallet">${shortWallet(v.feePayer)}${isPnL ? ' ★' : ''}</span>
            <span class="vol-leader-value">${fmtMoney(v.vol)}</span>
          </div>`;
  }).join('');

  // Overlap info
  const overlapW = overlap[0];
  const overlapNote = overlapW
    ? `<strong>${overlap.length} of 10</strong> PnL leaders overlaps with top 5 volume (${shortWallet(overlapW.feePayer)} ★). Diversified trader: ${overlapW.tokens} tokens, ${fmt(overlapW.trades)} trades.`
    : `<strong>0 of 10</strong> PnL leaders overlap with top 5 volume.`;

  const lbReturn = pnlLeaders.filter(l => l.type === 'Return').length;
  const lbNew = 10 - lbReturn;

  // Segment helpers
  const segRow = (name, label, range, cls, s) => {
    const vol = s ? Number(s.volume) : 0;
    const users = s ? s.users : 0;
    const pct = totalVol > 0 ? Math.round((vol / totalVol) * 100) : 0;
    const bar = maxVol > 0 ? Math.round((vol / maxVol) * 100) : 0;
    return `
          <div class="segment-row">
            <div class="segment-header">
              <span class="segment-name">${name} <small>${range}</small></span>
              <span class="segment-value">${fmtMoney(vol)}</span>
            </div>
            <div class="segment-bar-bg">
              <div class="segment-bar ${cls}" data-width="${bar}"></div>
            </div>
            <div class="segment-meta">
              <span>${fmt(users)} users</span>
              <span>${pct}%</span>
            </div>
          </div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trading Competition | Torque</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation"></script>
  <style>
    :root {
      --bg-primary: #fafafa; --bg-secondary: #f4f4f5; --bg-card: #ffffff; --bg-elevated: #f4f4f5;
      --text-primary: #18181b; --text-secondary: #52525b; --text-muted: #a1a1aa;
      --primary: #6166f5; --primary-dim: rgba(97, 102, 245, 0.1); --primary-glow: rgba(97, 102, 245, 0.3);
      --accent-green: #16a34a; --accent-green-dim: rgba(22, 163, 74, 0.1);
      --accent-blue: #2563eb; --accent-amber: #d97706; --accent-red: #dc2626;
      --border-subtle: rgba(0, 0, 0, 0.08); --border-primary: rgba(97, 102, 245, 0.3);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; padding: 32px 40px;
      background-image: radial-gradient(ellipse 80% 60% at 50% -30%, rgba(97, 102, 245, 0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 100% 50%, rgba(97, 102, 245, 0.04) 0%, transparent 50%); }
    .dashboard { max-width: 1440px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle); }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo svg { width: 32px; height: 32px; }
    .logo-separator { font-size: 18px; color: var(--text-muted); font-weight: 300; }
    .header-divider { width: 1px; height: 24px; background: var(--border-subtle); }
    .header-title { display: flex; flex-direction: column; gap: 2px; }
    .header-title h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.3px; }
    .header-title .period { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); letter-spacing: 0.3px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .metric-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px 28px; position: relative; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
    .metric-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--primary), transparent); opacity: 0.6; }
    .metric-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted); margin-bottom: 12px; }
    .metric-value { font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; line-height: 1; letter-spacing: -1px; }
    .metric-delta { display: inline-flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--accent-green); background: var(--accent-green-dim); padding: 4px 10px; border-radius: 6px; }
    .metric-delta span { font-family: 'Inter', sans-serif; font-weight: 400; color: var(--text-muted); font-size: 11px; }
    .charts-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .chart-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
    .chart-card h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .chart-card h3::before { content: ''; width: 4px; height: 14px; border-radius: 2px; background: var(--primary); }
    .chart-container { position: relative; height: 160px; }
    .chart-legend { display: flex; justify-content: center; gap: 24px; margin-top: 14px; font-size: 11px; }
    .legend-item { display: flex; align-items: center; gap: 8px; color: var(--text-muted); }
    .legend-dot { width: 10px; height: 10px; border-radius: 3px; }
    .legend-dot.baseline { background: var(--text-muted); }
    .legend-dot.competition { background: var(--primary); }
    .content-grid { display: grid; grid-template-columns: 300px 1fr 300px; gap: 20px; }
    .card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
    .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
    .card-title::before { content: ''; width: 4px; height: 14px; background: var(--primary); border-radius: 2px; }
    .segment-list { display: flex; flex-direction: column; gap: 14px; }
    .segment-row { display: flex; flex-direction: column; gap: 8px; }
    .segment-header { display: flex; justify-content: space-between; align-items: baseline; }
    .segment-name { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    .segment-name small { color: var(--text-muted); font-size: 11px; font-weight: 400; }
    .segment-value { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .segment-bar-bg { height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
    .segment-bar { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
    .segment-bar.participant { background: var(--primary); }
    .segment-bar.mid { background: var(--accent-blue); }
    .segment-bar.casual { background: var(--accent-amber); }
    .segment-bar.whale { background: var(--accent-green); }
    .segment-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }
    .user-breakdown { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--border-subtle); }
    .user-breakdown h4 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 12px; }
    .user-stat { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
    .user-stat-label { font-size: 12px; color: var(--text-secondary); }
    .user-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .leaderboard { display: flex; flex-direction: column; gap: 6px; }
    .leader-header { display: grid; grid-template-columns: 28px 1fr 60px 60px 50px 70px; gap: 8px; padding: 0 12px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .leader-row { display: grid; grid-template-columns: 28px 1fr 60px 60px 50px 70px; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-elevated); border-radius: 10px; }
    .leader-row.highlight { background: var(--primary-dim); border: 1px solid var(--border-primary); }
    .leader-rank { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--text-muted); }
    .leader-row:nth-child(2) .leader-rank { color: #fbbf24; }
    .leader-row:nth-child(3) .leader-rank { color: #94a3b8; }
    .leader-row:nth-child(4) .leader-rank { color: #d97706; }
    .leader-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .leader-wallet { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-primary); }
    .leader-stats { font-size: 10px; color: var(--text-muted); }
    .leader-badge { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; padding: 3px 6px; border-radius: 4px; background: var(--primary-dim); color: var(--primary); justify-self: start; }
    .leader-badge.new { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .leader-efficiency { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); text-align: right; }
    .leader-volume { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); text-align: right; }
    .leader-pnl { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--accent-green); text-align: right; }
    .volume-leaders { display: flex; flex-direction: column; gap: 8px; }
    .vol-leader-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-elevated); border-radius: 10px; }
    .vol-leader-row.highlight { background: var(--primary-dim); border: 1px solid var(--border-primary); }
    .vol-leader-wallet { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-secondary); }
    .vol-leader-row.highlight .vol-leader-wallet { color: var(--primary); }
    .vol-leader-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--accent-blue); }
    .overlap-note { margin-top: 16px; padding: 12px; background: var(--primary-dim); border-radius: 10px; border-left: 3px solid var(--primary); }
    .overlap-note p { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
    .overlap-note strong { color: var(--primary); }
    .integrity-panel { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px 28px; margin-top: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
    .integrity-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .integrity-header-left h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    .integrity-subtitle { font-size: 13px; color: var(--text-muted); max-width: 600px; line-height: 1.5; }
    .integrity-content { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 16px; align-items: stretch; }
    .integrity-arrow { display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--text-muted); padding: 0 8px; }
    .integrity-card { background: var(--bg-elevated); border-radius: 12px; padding: 20px; }
    .integrity-card.tested { border-left: 3px solid var(--text-muted); }
    .integrity-card.recommended { border-left: 3px solid var(--accent-green); }
    .integrity-card.results { border-left: 3px solid var(--accent-green); }
    .integrity-card-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 16px; }
    .tested-section { display: flex; flex-direction: column; gap: 16px; margin-bottom: 14px; }
    .tested-group { display: flex; flex-direction: column; gap: 8px; }
    .tested-group-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
    .tested-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tested-tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; padding: 6px 10px; background: var(--primary-dim); color: var(--primary); border-radius: 6px; }
    .tested-tags.muted .tested-tag { background: var(--bg-secondary); color: var(--text-muted); }
    .integrity-filters-display { display: flex; gap: 12px; margin-bottom: 14px; }
    .filter-item { flex: 1; background: var(--primary-dim); border-radius: 8px; padding: 12px; text-align: center; }
    .filter-value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; color: var(--primary); display: block; margin-bottom: 4px; }
    .filter-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .integrity-card-note { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
    .results-stats { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .result-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
    .result-row:last-child { border-bottom: none; padding-bottom: 0; }
    .result-label { font-size: 12px; color: var(--text-secondary); }
    .result-values { display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; }
    .result-before { color: var(--accent-amber); }
    .result-arrow-small { font-size: 12px; color: var(--text-muted); }
    .result-after { color: var(--text-primary); }
    .result-after.success { color: var(--accent-green); }
    .result-change { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; }
    .result-change.success { color: var(--accent-green); }
    .result-wallet { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--primary); font-weight: 500; }
    .footer { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; }
    .timestamp { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); }
    .metric-card, .chart-card, .card, .integrity-panel { opacity: 0; transform: translateY(12px); animation: fadeUp 0.5s ease forwards; }
    .metric-card:nth-child(1) { animation-delay: 0.05s; } .metric-card:nth-child(2) { animation-delay: 0.1s; } .metric-card:nth-child(3) { animation-delay: 0.15s; }
    .chart-card:nth-child(1) { animation-delay: 0.2s; } .chart-card:nth-child(2) { animation-delay: 0.25s; } .chart-card:nth-child(3) { animation-delay: 0.3s; }
    .card:nth-child(1) { animation-delay: 0.35s; } .card:nth-child(2) { animation-delay: 0.4s; } .card:nth-child(3) { animation-delay: 0.45s; }
    .integrity-panel { animation-delay: 0.5s; }
    @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.5871 2H9.41337C8.48752 2 7.63199 2.49394 7.16906 3.29577L0.58254 14.7041C0.119628 15.5059 0.119621 16.4937 0.582525 17.2955L7.16907 28.7042C7.63199 29.506 8.48752 30 9.4134 30H22.5871C23.513 30 24.3685 29.506 24.8314 28.7042L31.418 17.2955C31.8809 16.4937 31.8809 15.5059 31.4179 14.7041L24.8314 3.29577C24.3685 2.49395 23.513 2 22.5871 2ZM17.6833 16.9716H29.3608L23.5223 27.0847L17.6833 16.9716ZM29.3608 15.0281H18.0574C17.1315 15.0281 16.276 14.5341 15.8131 13.7323L10.1613 3.94352H21.465C22.3909 3.94352 23.2464 4.43746 23.7093 5.23929L29.3608 15.0281ZM14.317 15.0281H2.63966L8.47822 4.91526L14.317 15.0281ZM2.63964 16.9716H13.9429C14.8688 16.9716 15.7243 17.4655 16.1872 18.2673L21.8391 28.0565H10.5355C9.6096 28.0565 8.75407 27.5625 8.29115 26.7607L2.63964 16.9716Z" fill="#6166f5"/>
          </svg>
          <span class="logo-separator">×</span>
          <svg fill="none" height="32" viewBox="0 0 29 33" width="28" xmlns="http://www.w3.org/2000/svg"><linearGradient id="raydium-grad" gradientUnits="userSpaceOnUse" x1="28.3168" x2="-1.73336" y1="8.19162" y2="20.2086"><stop offset="0" stop-color="#c200fb"/><stop offset=".489658" stop-color="#3772ff"/><stop offset=".489758" stop-color="#3773fe"/><stop offset="1" stop-color="#5ac4be"/></linearGradient><g fill="url(#raydium-grad)"><path d="m26.8625 12.281v11.4104l-12.6916 7.3261-12.69859-7.3261v-14.65937l12.69859-7.33322 9.7541 5.63441 1.4723-.84941-11.2264-6.48381-14.1709 8.18262v16.35818l14.1709 8.1826 14.171-8.1826v-13.1092z"/><path d="m10.6176 23.6985h-2.12353v-7.1209h7.07843c.6697-.0074 1.3095-.2782 1.7811-.7538.4716-.4755.737-1.1176.7388-1.7874.0038-.3311-.0601-.6596-.1879-.9651-.1279-.3056-.3168-.5817-.5554-.8115-.2308-.2372-.5071-.4253-.8124-.553-.3053-.1278-.6333-.1925-.9642-.1903h-7.07843v-2.16595h7.08543c1.2405.00743 2.4281.50351 3.3053 1.38065.8771.8772 1.3732 2.0648 1.3806 3.3052.0076.9496-.2819 1.8777-.8281 2.6544-.5027.7432-1.2111 1.3237-2.0386 1.6705-.8194.2599-1.6745.3889-2.5341.3823h-4.247z"/><path d="m20.2159 23.5215h-2.4775l-1.9111-3.3339c.7561-.0463 1.5019-.1988 2.2155-.453z"/><path d="m25.3831 9.90975 1.4652.81405 1.4653-.81405v-1.72005l-1.4653-.84941-1.4652.84941z"/></g></svg>
        </div>
        <div class="header-divider"></div>
        <div class="header-title">
          <h1>Trading Competition Analysis</h1>
          <div class="period">Competition: Jan 19–${compEndDay.getDate()} · Baseline: Jan 12–18</div>
        </div>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Daily Volume</div>
        <div class="metric-value">${fmtMoney(cVol)}</div>
        <div class="metric-delta">+${pctChange(cVol, bVol)}% <span>vs ${fmtMoney(bVol)} baseline</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Daily Trades</div>
        <div class="metric-value">${fmt(Math.round(cTrades))}</div>
        <div class="metric-delta">+${pctChange(cTrades, bTrades)}% <span>vs ${fmt(Math.round(bTrades))} baseline</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Daily Users</div>
        <div class="metric-value">${fmt(Math.round(cUsers))}</div>
        <div class="metric-delta">+${pctChange(cUsers, bUsers)}% <span>vs ${fmt(Math.round(bUsers))} baseline</span></div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h3>Daily Volume ($M)</h3>
        <div class="chart-container"><canvas id="volumeChart"></canvas></div>
        <div class="chart-legend">
          <div class="legend-item"><div class="legend-dot baseline"></div>Baseline</div>
          <div class="legend-item"><div class="legend-dot competition"></div>Competition</div>
        </div>
      </div>
      <div class="chart-card">
        <h3>Daily Trades (K)</h3>
        <div class="chart-container"><canvas id="tradesChart"></canvas></div>
        <div class="chart-legend">
          <div class="legend-item"><div class="legend-dot baseline"></div>Baseline</div>
          <div class="legend-item"><div class="legend-dot competition"></div>Competition</div>
        </div>
      </div>
      <div class="chart-card">
        <h3>Daily Users (K)</h3>
        <div class="chart-container"><canvas id="usersChart"></canvas></div>
        <div class="chart-legend">
          <div class="legend-item"><div class="legend-dot baseline"></div>Baseline</div>
          <div class="legend-item"><div class="legend-dot competition"></div>Competition</div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-title">Volume by Segment</div>
        <div class="segment-list">
          ${segRow('Participants', 'Participant', '$1K–$10K', 'participant', seg['Participant'])}
          ${segRow('Mid-Tier', 'Mid', '$10K–$100K', 'mid', seg['Mid'])}
          ${segRow('Casual', 'Casual', '<$1K', 'casual', seg['Casual'])}
          ${segRow('Whales', 'Whale', '>$100K', 'whale', seg['Whale'])}
        </div>
        <div class="user-breakdown">
          <h4>User Acquisition</h4>
          <div class="user-stat">
            <span class="user-stat-label">New Users</span>
            <span class="user-stat-value">${fmt(userTypes['New'])} (${newPct}%)</span>
          </div>
          <div class="user-stat">
            <span class="user-stat-label">Returning Users</span>
            <span class="user-stat-value">${fmt(userTypes['Returning'])} (${100 - newPct}%)</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">PnL Leaderboard (Top 10)</div>
        <div class="leaderboard">
          <div class="leader-header">
            <span>#</span><span>Wallet</span><span>Type</span><span>PnL/Vol</span><span>Vol</span><span style="text-align:right">PnL</span>
          </div>
          ${leaderRows}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Top 5 Volume Leaders</div>
        <div class="volume-leaders">${volRows}</div>
        <div class="overlap-note"><p>${overlapNote}</p></div>
        <div class="user-breakdown">
          <h4>Leaderboard Composition</h4>
          <div class="user-stat">
            <span class="user-stat-label">Returning Users</span>
            <span class="user-stat-value">${lbReturn} of 10</span>
          </div>
          <div class="user-stat">
            <span class="user-stat-label">New Users</span>
            <span class="user-stat-value">${lbNew} of 10</span>
          </div>
        </div>
      </div>
    </div>

    <div class="integrity-panel">
      <div class="integrity-header">
        <div class="integrity-header-left">
          <h3>Leaderboard Integrity Analysis</h3>
          <p class="integrity-subtitle">We identified 2 flagged accounts in the current top 10 showing patterns consistent with coordinated activity. Here's our analysis and recommendation.</p>
        </div>
      </div>
      <div class="integrity-content">
        <div class="integrity-card tested">
          <div class="integrity-card-header">Filters Evaluated</div>
          <div class="tested-section">
            <div class="tested-group">
              <div class="tested-group-title">Primary Filters (12 combinations)</div>
              <div class="tested-tags">
                <span class="tested-tag">Hold Time</span>
                <span class="tested-tag">Min Volume</span>
                <span class="tested-tag">Unique Traders</span>
              </div>
            </div>
            <div class="tested-group">
              <div class="tested-group-title">Also Considered</div>
              <div class="tested-tags muted">
                <span class="tested-tag">Time-Weighted PnL</span>
                <span class="tested-tag">Wallet Clustering</span>
                <span class="tested-tag">Velocity Limits</span>
                <span class="tested-tag">Token Age</span>
              </div>
            </div>
          </div>
          <p class="integrity-card-note">Complex filters were evaluated but found to be overly penalizing to legitimate traders or difficult to communicate clearly.</p>
        </div>
        <div class="integrity-arrow">→</div>
        <div class="integrity-card recommended">
          <div class="integrity-card-header">Recommended Configuration</div>
          <div class="integrity-filters-display">
            <div class="filter-item"><span class="filter-value">15 min</span><span class="filter-label">Hold Time</span></div>
            <div class="filter-item"><span class="filter-value">$2,000</span><span class="filter-label">Min Volume</span></div>
            <div class="filter-item"><span class="filter-value">10</span><span class="filter-label">Unique Traders</span></div>
          </div>
          <p class="integrity-card-note">Optimal balance between gaming prevention and fair competition. Aggressive enough to filter bad actors, permissive enough to preserve legitimate rankings.</p>
        </div>
        <div class="integrity-arrow">→</div>
        <div class="integrity-card results">
          <div class="integrity-card-header">Results</div>
          <div class="results-stats">
            <div class="result-row">
              <span class="result-label">Flagged in Top 10</span>
              <div class="result-values"><span class="result-before">2</span><span class="result-arrow-small">→</span><span class="result-after success">0</span></div>
            </div>
            <div class="result-row">
              <span class="result-label">Flagged PnL</span>
              <span class="result-change success">-88%</span>
            </div>
            <div class="result-row">
              <span class="result-label">Legitimate Traders</span>
              <span class="result-change success">+9% avg</span>
            </div>
            <div class="result-row">
              <span class="result-label">New #1</span>
              <span class="result-wallet">6pkPgz...</span>
            </div>
          </div>
          <p class="integrity-card-note">Clean leaderboard with no flagged accounts. Legitimate traders see improved rankings on average.</p>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="timestamp">Updated ${timestamp} · Data: Jan 19–${compEndDay.getDate()} (${compDaysCount} days)</div>
    </footer>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        document.querySelectorAll('.segment-bar').forEach(bar => {
          bar.style.width = bar.dataset.width + '%';
        });
      }, 600);

      const labels = ${JSON.stringify(labels)};
      const volumeData = ${JSON.stringify(volData.map(Number))};
      const tradesData = ${JSON.stringify(tradeData.map(Number))};
      const usersData = ${JSON.stringify(userData.map(Number))};
      const baselineDays = ${baselineDays.length};

      const colors = {
        baseline: 'rgba(161, 161, 170, 0.8)', baselineBg: 'rgba(161, 161, 170, 0.25)',
        competition: 'rgba(97, 102, 245, 0.85)', competitionBg: 'rgba(97, 102, 245, 0.2)',
        grid: 'rgba(0, 0, 0, 0.06)', text: '#71717a'
      };

      const opts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#18181b', bodyColor: '#18181b', borderColor: 'rgba(97,102,245,0.2)', borderWidth: 1, padding: 12, cornerRadius: 8, displayColors: false } },
        scales: {
          x: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0 } },
          y: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 9, family: 'JetBrains Mono' } }, beginAtZero: true }
        }
      };

      const bgColors = (d) => d.map((_, i) => i < baselineDays ? colors.baselineBg : colors.competitionBg);
      const brColors = (d) => d.map((_, i) => i < baselineDays ? colors.baseline : colors.competition);

      const bVolAvg = volumeData.slice(0, baselineDays).reduce((a, b) => a + b) / baselineDays;
      const bTradesAvg = tradesData.slice(0, baselineDays).reduce((a, b) => a + b) / baselineDays;
      const bUsersAvg = usersData.slice(0, baselineDays).reduce((a, b) => a + b) / baselineDays;

      const annot = (val, lbl) => ({
        competitionLine: { type: 'line', xMin: baselineDays - 0.5, xMax: baselineDays - 0.5, borderColor: 'rgba(97,102,245,0.5)', borderWidth: 2, borderDash: [5, 5] },
        baselineLine: { type: 'line', yMin: val, yMax: val, borderColor: 'rgba(161,161,170,0.6)', borderWidth: 1, borderDash: [3, 3], label: { display: true, content: 'Baseline: ' + lbl, position: 'end', backgroundColor: 'transparent', color: '#71717a', font: { size: 9, family: 'JetBrains Mono' }, padding: 2 } }
      });

      new Chart(document.getElementById('volumeChart'), {
        type: 'bar', data: { labels, datasets: [{ data: volumeData, backgroundColor: bgColors(volumeData), borderColor: brColors(volumeData), borderWidth: 1, borderRadius: 4 }] },
        options: { ...opts, plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (c) => '$' + c.raw.toFixed(2) + 'M' } }, annotation: { annotations: annot(bVolAvg, '$${(bVol / 1e6).toFixed(2)}M') } } }
      });
      new Chart(document.getElementById('tradesChart'), {
        type: 'bar', data: { labels, datasets: [{ data: tradesData, backgroundColor: bgColors(tradesData), borderColor: brColors(tradesData), borderWidth: 1, borderRadius: 4 }] },
        options: { ...opts, plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (c) => c.raw.toFixed(1) + 'K trades' } }, annotation: { annotations: annot(bTradesAvg, '${(bTrades / 1000).toFixed(1)}K') } } }
      });
      new Chart(document.getElementById('usersChart'), {
        type: 'bar', data: { labels, datasets: [{ data: usersData, backgroundColor: bgColors(usersData), borderColor: brColors(usersData), borderWidth: 1, borderRadius: 4 }] },
        options: { ...opts, plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: { label: (c) => c.raw.toFixed(2) + 'K users' } }, annotation: { annotations: annot(bUsersAvg, '${(bUsers / 1000).toFixed(1)}K') } } }
      });
    });
  </script>
</body>
</html>`;
}

async function main() {
  try {
    const data = await fetchAllData();
    const html = generateHTML(data);

    const outputPath = path.join(__dirname, '..', 'public', 'index.html');
    fs.writeFileSync(outputPath, html);
    console.log(`Dashboard updated: ${outputPath}`);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
