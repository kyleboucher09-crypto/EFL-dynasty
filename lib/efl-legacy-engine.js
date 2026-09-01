import { readFile } from 'node:fs/promises';
import { findEflLeague } from './efl-leagues.js';

const API = 'https://api.sleeper.app/v1';
const SEASONAL = new Set(['champion','regular_season_king','points_king','untouchable','two_hundred_club','absolute_destruction','photo_finish','hot_streak','perfect_month','comeback_kid','playoff_assassin','first_class_ticket','on_the_podium','four_digits','weekly_hammer','bracket_breaker','consolation_king','business_trip','title_defense','three_week_terror','double_crown','triple_crown_season']);
let rulesPromise = globalThis.__eflLegacyRulesPromise || null;
const leagueCache = globalThis.__eflLegacyLeagueCache || new Map();
globalThis.__eflLegacyLeagueCache = leagueCache;

async function rules() {
  if (!rulesPromise) {
    rulesPromise = readFile(new URL('../legacy-system.json', import.meta.url), 'utf8').then(JSON.parse);
    globalThis.__eflLegacyRulesPromise = rulesPromise;
  }
  return rulesPromise;
}

async function get(path, cache) {
  if (!cache.has(path)) cache.set(path, fetch(`${API}${path}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) }).then(async response => {
    if (!response.ok) throw Object.assign(new Error(`Sleeper returned ${response.status}`), { status: 502 });
    return response.json();
  }));
  return cache.get(path);
}

async function season(leagueId, cache) {
  const [league, users, rosters, winners, consolation] = await Promise.all([
    get(`/league/${leagueId}`, cache), get(`/league/${leagueId}/users`, cache), get(`/league/${leagueId}/rosters`, cache),
    get(`/league/${leagueId}/winners_bracket`, cache).catch(() => []), get(`/league/${leagueId}/losers_bracket`, cache).catch(() => []),
  ]);
  return { league, users, rosters, winners, consolation, userById: Object.fromEntries(users.map(user => [user.user_id, user])), rosterById: Object.fromEntries(rosters.map(roster => [roster.roster_id, roster])) };
}

function champion(data) { const final = data.winners.find(match => Number(match.p) === 1); return final ? data.rosterById[final.w]?.owner_id : null; }
function consolationWinner(data) { const final = data.consolation.find(match => Number(match.p) === 1); return final ? data.rosterById[final.w]?.owner_id : null; }
function pointsFor(roster) { return (Number(roster?.settings?.fpts) || 0) + (Number(roster?.settings?.fpts_decimal) || 0) / 100; }

function award(owner, config, id, count = 1, year = 0) {
  const badge = config.badges.find(item => item.id === id);
  let units = Math.max(1, Number(count) || 1);
  if (!badge || count <= 0) return;
  let existing = owner.badges.find(item => item.id === id);
  if (year >= config.startSeason && SEASONAL.has(id)) {
    if (!existing) { existing = { ...badge, count: 0, _creditedSeasons: [] }; owner.badges.push(existing); }
    if (existing._creditedSeasons.includes(year)) return;
    existing._creditedSeasons.push(year); existing.count += units; owner.lp += Number(badge.lp || 0) * units; return;
  }
  if (existing) return;
  if (id !== 'legacy_champion') units = 1;
  owner.badges.push({ ...badge, count: units }); owner.lp += Number(badge.lp || 0) * units;
}

async function evaluate(owner, data, config, cache) {
  const year = Number(data.league.season); if (year < config.startSeason) return;
  const roster = data.rosters.find(item => item.owner_id === owner.id); if (!roster) return;
  const playoffStart = Number(data.league.settings?.playoff_week_start) || 15;
  const regularWeeks = Math.max(1, playoffStart - 1);
  const leagueWeek = Number(data.league.settings?.leg) || 0;
  const status = String(data.league.status || '').toLowerCase();
  const complete = ['complete','post_season'].includes(status) || leagueWeek >= playoffStart;
  const regularCount = complete ? regularWeeks : Math.min(regularWeeks, Math.max(0, leagueWeek - 1));
  const crateCount = complete ? Math.max(regularWeeks, leagueWeek) : Math.max(0, leagueWeek - 1);
  const allWeeks = await Promise.all(Array.from({ length: crateCount }, (_, i) => get(`/league/${data.league.league_id}/matchups/${i + 1}`, cache).catch(() => [])));
  allWeeks.forEach((matchups, i) => {
    const mine = matchups.find(match => Number(match.roster_id) === Number(roster.roster_id));
    const opponent = mine && matchups.find(match => match.matchup_id === mine.matchup_id && Number(match.roster_id) !== Number(mine.roster_id));
    if (mine && opponent && (Number(mine.points) || 0) > (Number(opponent.points) || 0)) owner.victoryKeys.push(`${data.league.league_id}:${year}:week-${i + 1}:roster-${roster.roster_id}`);
  });
  let week200=0,win100=0,photo=0,weeklyHigh=0,maxStreak=0,streak=0; const firstThree=[];
  allWeeks.slice(0, regularCount).forEach((matchups, index) => {
    const mine=matchups.find(match=>Number(match.roster_id)===Number(roster.roster_id)); if(!mine)return;
    const points=Number(mine.points)||0, high=Math.max(0,...matchups.map(match=>Number(match.points)||0)); if(points>=200)week200++; if(points===high&&high>0)weeklyHigh++;
    const opponent=matchups.find(match=>match.matchup_id===mine.matchup_id&&Number(match.roster_id)!==Number(mine.roster_id)); if(!opponent)return;
    const difference=points-(Number(opponent.points)||0),won=difference>0; if(won){streak++;if(difference>=100)win100++;if(difference<1)photo++;}else streak=0; if(index<3)firstThree.push(won?1:0); maxStreak=Math.max(maxStreak,streak);
  });
  const ordered=[...data.rosters].sort((a,b)=>(Number(b.settings?.wins)||0)-(Number(a.settings?.wins)||0)||pointsFor(b)-pointsFor(a));
  const byPoints=[...data.rosters].sort((a,b)=>pointsFor(b)-pointsFor(a));
  const championId=complete?champion(data):null, consolationId=complete?consolationWinner(data):null;
  const place=ordered.findIndex(item=>item.owner_id===owner.id)+1,wins=Number(roster.settings?.wins)||0,losses=Number(roster.settings?.losses)||0,franchisePoints=pointsFor(roster);
  const first=complete&&ordered[0]?.owner_id===owner.id,pointsKing=complete&&byPoints[0]?.owner_id===owner.id,bye=complete&&place>0&&place<=2;
  const final=complete&&data.winners.some(match=>Number(match.p)===1&&(data.rosterById[match.w]?.owner_id===owner.id||data.rosterById[match.l]?.owner_id===owner.id));
  const podium=complete&&data.winners.some(match=>[1,3].includes(Number(match.p))&&(data.rosterById[match.w]?.owner_id===owner.id||(Number(match.p)===1&&data.rosterById[match.l]?.owner_id===owner.id)));
  const last=complete&&place===data.rosters.length,undefeated=complete&&wins>0&&losses===0,isChampion=championId===owner.id;
  owner.modern.push({year,champ:isChampion,final,last,complete});
  if(isChampion)award(owner,config,'champion',1,year);if(first)award(owner,config,'regular_season_king',1,year);if(pointsKing)award(owner,config,'points_king',1,year);if(undefeated)award(owner,config,'untouchable',1,year);if(bye)award(owner,config,'first_class_ticket',1,year);if(podium)award(owner,config,'on_the_podium',1,year);if(consolationId===owner.id)award(owner,config,'consolation_king',1,year);if(final&&bye)award(owner,config,'business_trip',1,year);
  if(first&&pointsKing&&isChampion)award(owner,config,'triple_crown_season',1,year);else if(first&&isChampion)award(owner,config,'double_crown',1,year);
  if(complete&&franchisePoints>=1000)award(owner,config,'four_digits',1,year);if(maxStreak>=5)award(owner,config,'hot_streak',1,year);if(maxStreak>=4)award(owner,config,'perfect_month',1,year);if(complete&&firstThree.length===3&&firstThree.every(value=>value===0)&&place>0&&place<=6)award(owner,config,'comeback_kid',1,year);if(weeklyHigh>=3)award(owner,config,'three_week_terror',1,year);
  award(owner,config,'two_hundred_club',week200,year);award(owner,config,'absolute_destruction',win100,year);award(owner,config,'photo_finish',photo,year);award(owner,config,'weekly_hammer',weeklyHigh,year);
}

async function calculateLeague(leagueId) {
  const league=findEflLeague(leagueId); if(!league?.active)throw Object.assign(new Error('That EFL league is not available.'),{status:400});
  const cached=leagueCache.get(league.id);if(cached&&Date.now()-cached.createdAt<60000)return cached.value;
  const cache=new Map(),config=await rules(),current=await season(league.sleeperLeagueId,cache),owners={};
  current.rosters.forEach(roster=>{const id=roster.owner_id||`roster-${roster.roster_id}`;owners[id]={id,roster,user:current.userById[roster.owner_id],badges:[],lp:0,modern:[],heritageYears:[],historicTitles:0,victoryKeys:[]};});
  const chain=[current];let previous=current.league.previous_league_id,depth=1;while(previous&&depth++<20){const data=await season(previous,cache);chain.push(data);previous=data.league.previous_league_id;}
  chain.forEach(data=>{const year=Number(data.league.season),championId=champion(data);data.rosters.forEach(roster=>{const owner=owners[roster.owner_id];if(!owner)return;if(year<config.startSeason)owner.heritageYears.push(year);if(year<config.startSeason&&championId===roster.owner_id)owner.historicTitles++;});});
  await Promise.all(Object.values(owners).map(async owner=>{if(owner.heritageYears.length)award(owner,config,'legacy_franchise');if(owner.historicTitles)award(owner,config,'legacy_champion',owner.historicTitles);for(const data of [...chain].reverse())await evaluate(owner,data,config,cache);const modern=owner.modern.sort((a,b)=>a.year-b.year),completed=modern.filter(item=>item.complete);for(let i=1;i<modern.length;i++){const now=modern[i],prior=modern[i-1];if(!now.complete)continue;if(now.champ&&prior.champ)award(owner,config,'back_to_back_champion',1,now.year);if(now.champ&&prior.last)award(owner,config,'worst_to_first',1,now.year);if(now.final&&prior.champ)award(owner,config,'title_defense',1,now.year);}if(completed.length>=5)award(owner,config,'iron_franchise');if(completed.length>=10)award(owner,config,'efl_lifetime');owner.victoryKeys=[...new Set(owner.victoryKeys)].sort();}));
  const value={league,current,config,owners:Object.values(owners)};leagueCache.set(league.id,{createdAt:Date.now(),value});return value;
}

export async function calculateLeagueLegacy(leagueId) {
  return calculateLeague(leagueId);
}

export async function calculateFranchiseLegacy(leagueId, rosterId) {
  const result=await calculateLeague(leagueId),roster=Number(rosterId),owner=result.owners.find(item=>Number(item.roster?.roster_id)===roster);
  if(!owner)throw Object.assign(new Error('That franchise does not belong to this EFL league.'),{status:404});
  return {league:result.league,season:Number(result.current.league.season),rosterId:roster,lp:Math.max(0,Math.floor(Number(owner.lp)||0)),badges:owner.badges,victoryKeys:owner.victoryKeys};
}
