const LEAGUE_ID = '1313240395462742016';
const SLEEPER_API = 'https://api.sleeper.app/v1';
const PROJECTIONS_API = 'https://api.sleeper.com/projections/nfl';
const CACHE_MS = 5 * 60 * 1000;

let memoryCache = globalThis.__eflMatchupPredictionCache || null;

async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EFL-Dynasty-Matchup-Model/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} from ${url}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function projectionMap(rows) {
  return Object.fromEntries((Array.isArray(rows) ? rows : []).flatMap(row => {
    const id = row?.player_id || row?.player?.player_id;
    return id ? [[String(id), row]] : [];
  }));
}

function projectedPoints(row, scoring) {
  if (!row) return 0;
  const stats = row.stats || row;
  let points = 0;
  for (const [category, multiplier] of Object.entries(scoring || {})) {
    const stat = Number(stats?.[category] || 0);
    const value = Number(multiplier || 0);
    if (Number.isFinite(stat) && Number.isFinite(value)) points += stat * value;
  }
  if (points > 0) return points;
  for (const key of ['pts_ppr', 'pts_half_ppr', 'pts_std']) {
    const fallback = Number(row?.[key]);
    if (Number.isFinite(fallback) && fallback > 0) return fallback;
  }
  return 0;
}

function erf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function winProbabilities(a, b) {
  if (!(a > 0) && !(b > 0)) return [50, 50];
  const average = Math.max(80, (a + b) / 2);
  const differenceDeviation = Math.max(18, average * 0.16 * Math.SQRT2);
  const probabilityA = 100 * 0.5 * (1 + erf((a - b) / (differenceDeviation * Math.SQRT2)));
  const boundedA = Math.max(5, Math.min(95, probabilityA));
  return [Number(boundedA.toFixed(1)), Number((100 - boundedA).toFixed(1))];
}

function starterProjection(matchup, weekly, season, scoring) {
  const starters = (matchup?.starters || []).map(String).filter(id => id && id !== '0');
  let weeklyCoverage = 0;
  let projected = 0;
  for (const id of starters) {
    const weeklyPoints = projectedPoints(weekly[id], scoring);
    const seasonAverage = projectedPoints(season[id], scoring) / 17;
    if (weeklyPoints > 0) weeklyCoverage += 1;
    projected += weeklyPoints > 0 ? weeklyPoints : seasonAverage;
  }
  return {
    projected_points: Number(projected.toFixed(2)),
    starters_count: starters.length,
    weekly_projection_coverage: starters.length ? Number((weeklyCoverage / starters.length).toFixed(2)) : 0,
  };
}

async function buildPredictions(requestedWeek) {
  const [league, state] = await Promise.all([
    fetchJSON(`${SLEEPER_API}/league/${LEAGUE_ID}`),
    fetchJSON(`${SLEEPER_API}/state/nfl`),
  ]);
  const season = Number(league?.season || state?.season || new Date().getUTCFullYear());
  const stateWeek = String(state?.season_type || '').toLowerCase() === 'regular' ? Number(state?.week || 1) : 1;
  const week = Math.max(1, Math.min(18, Number(requestedWeek) || stateWeek));
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const positionQuery = positions.map(position => `position%5B%5D=${position}`).join('&');
  const [matchups, weeklyRows, seasonRows] = await Promise.all([
    fetchJSON(`${SLEEPER_API}/league/${LEAGUE_ID}/matchups/${week}`),
    fetchJSON(`${PROJECTIONS_API}/${season}/${week}?season_type=regular&${positionQuery}&order_by=pts_ppr`),
    fetchJSON(`${PROJECTIONS_API}/${season}?season_type=regular&${positionQuery}&order_by=pts_ppr`),
  ]);
  const weekly = projectionMap(weeklyRows);
  const seasonProjections = projectionMap(seasonRows);
  const groups = {};
  for (const matchup of Array.isArray(matchups) ? matchups : []) {
    if (matchup?.matchup_id == null) continue;
    (groups[matchup.matchup_id] ||= []).push(matchup);
  }
  const predictions = Object.entries(groups).flatMap(([matchupId, pair]) => {
    if (pair.length !== 2) return [];
    const [away, home] = pair;
    const awayProjection = starterProjection(away, weekly, seasonProjections, league?.scoring_settings || {});
    const homeProjection = starterProjection(home, weekly, seasonProjections, league?.scoring_settings || {});
    const [awayPct, homePct] = winProbabilities(awayProjection.projected_points, homeProjection.projected_points);
    return [{
      matchup_id: Number(matchupId),
      teams: [
        { roster_id: away.roster_id, win_pct: awayPct, ...awayProjection },
        { roster_id: home.roster_id, win_pct: homePct, ...homeProjection },
      ],
    }];
  });
  return {
    league_id: LEAGUE_ID,
    season,
    week,
    generated_at: new Date().toISOString(),
    source: 'Sleeper weekly projections, selected starters, and EFL scoring settings',
    model: 'normal score-distribution estimate',
    predictions,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const week = Math.max(1, Math.min(18, Number(req.query?.week) || 1));
    const cacheKey = String(week);
    const now = Date.now();
    if (!memoryCache || memoryCache.key !== cacheKey || now - memoryCache.time > CACHE_MS) {
      memoryCache = { key: cacheKey, time: now, data: await buildPredictions(week) };
      globalThis.__eflMatchupPredictionCache = memoryCache;
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json(memoryCache.data);
  } catch (error) {
    console.error('matchup prediction error', error);
    return res.status(502).json({ error: 'Sleeper projections are temporarily unavailable' });
  }
}
