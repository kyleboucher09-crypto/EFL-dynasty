export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const LEAGUE='1313240395462742016';
  const BASE='https://api.sleeper.app/v1';
  const get=async u=>{const r=await fetch(u,{headers:{'User-Agent':'EFL-Dynasty-Rankings/2.0'}});if(!r.ok)throw new Error(`${r.status} ${u}`);return r.json()};
  try{
    const [league,rosters,users,state,allPlayers]=await Promise.all([
      get(`${BASE}/league/${LEAGUE}`),get(`${BASE}/league/${LEAGUE}/rosters`),get(`${BASE}/league/${LEAGUE}/users`),get(`${BASE}/state/nfl`),get(`${BASE}/players/nfl`)
    ]);
    const season=Number(state.season||2026), seasonType=String(state.season_type||'').toLowerCase();
    const sourceWeek=Math.max(1,Number(state.week||1)); const week=seasonType==='regular'?sourceWeek:1;
    const ids=new Set(rosters.flatMap(r=>r.players||[]).map(String));
    const players={}; for(const id of ids){if(allPlayers[id])players[id]=allPlayers[id]}
    const positions=['QB','RB','WR','TE','K','DEF']; const q=positions.map(x=>'position[]='+x).join('&');
    const [matchups,seasonProj,weeklyProj]=await Promise.all([
      get(`${BASE}/league/${LEAGUE}/matchups/${week}`),
      get(`https://api.sleeper.com/projections/nfl/${season}?season_type=regular&${q}&order_by=pts_ppr`),
      get(`https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular&${q}&order_by=pts_ppr`)
    ]);
    const filt=rows=>(rows||[]).filter(x=>ids.has(String(x.player_id||x.player?.player_id||'')));
    let previousRosters=[]; if(league.previous_league_id){try{previousRosters=await get(`${BASE}/league/${league.previous_league_id}/rosters`)}catch{}}
    return res.status(200).json({league,rosters,users,state,players,matchups,seasonProj:filt(seasonProj),weeklyProj:filt(weeklyProj),previousRosters});
  }catch(e){console.error(e);return res.status(500).json({error:String(e.message||e)})}
}
