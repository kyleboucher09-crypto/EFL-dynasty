(()=>{
  const LEAGUE_ID='1313240395462742016';
  const API='https://api.sleeper.app/v1';
  const cache=new Map();
  const seasonalBadges=new Set(['champion','regular_season_king','points_king','untouchable','two_hundred_club','absolute_destruction','photo_finish','hot_streak','perfect_month','comeback_kid','giant_killer','wire_wizard','playoff_assassin','first_class_ticket','on_the_podium','four_digits','weekly_hammer','bracket_breaker','consolation_king','business_trip','title_defense','three_week_terror','double_crown','triple_crown_season','survivor','bench_boss','consistency_king','precision_drafter','rivalry_king','roster_builder','sleeper_hit','streak_breaker','sunday_miracle','the_spoiler','trade_heist','trade_master','upset_of_year','waiver_steal','monday_night_hero','iron_curtain']);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const get=path=>{
    if(!cache.has(path))cache.set(path,fetch(API+path).then(response=>{if(!response.ok)throw new Error(`Sleeper ${response.status}`);return response.json()}).catch(error=>{cache.delete(path);throw error}));
    return cache.get(path);
  };
  const teamName=(user,roster)=>user?.metadata?.team_name||user?.display_name||`Roster ${roster.roster_id}`;
  async function season(leagueId){
    const [league,users,rosters,winners,consolation]=await Promise.all([
      get(`/league/${leagueId}`),get(`/league/${leagueId}/users`),get(`/league/${leagueId}/rosters`),
      get(`/league/${leagueId}/winners_bracket`).catch(()=>[]),get(`/league/${leagueId}/losers_bracket`).catch(()=>[])
    ]);
    return{league,users,rosters,winners,consolation,userById:Object.fromEntries(users.map(user=>[user.user_id,user])),rosterById:Object.fromEntries(rosters.map(roster=>[roster.roster_id,roster]))};
  }
  const champion=data=>{const final=data.winners.find(match=>Number(match.p)===1);return final?data.rosterById[final.w]?.owner_id:null};
  const consolationWinner=data=>{const final=data.consolation.find(match=>Number(match.p)===1);return final?data.rosterById[final.w]?.owner_id:null};
  function award(owner,rules,id,count=1,year=0){
    const badge=rules.badges.find(item=>item.id===id);let units=Math.max(1,Number(count)||1);if(!badge||count<=0)return;
    let existing=owner.badges.find(item=>item.id===id);
    if(year>=2026&&seasonalBadges.has(id)){
      if(!existing){existing={...badge,count:0,_creditedSeasons:[]};owner.badges.push(existing)}
      if(existing._creditedSeasons.includes(year))return;
      existing._creditedSeasons.push(year);existing.count+=units;owner.lp+=badge.lp*units;return;
    }
    if(existing)return;if(id!=='legacy_champion')units=1;owner.badges.push({...badge,count:units});owner.lp+=badge.lp*units;
  }
  async function evaluateModern(owner,data,rules){
    const year=Number(data.league.season);if(year<(rules.startSeason||2026))return;
    const roster=data.rosters.find(item=>item.owner_id===owner.id);if(!roster)return;
    const playoffStart=Number(data.league.settings?.playoff_week_start)||15;
    const regularWeeks=Math.max(1,playoffStart-1);
    const leagueWeek=Number(data.league.settings?.leg)||0;
    const status=String(data.league.status||'').toLowerCase();
    const seasonComplete=['complete','post_season'].includes(status)||leagueWeek>=playoffStart;
    const completedWeeks=seasonComplete?regularWeeks:Math.min(regularWeeks,Math.max(0,leagueWeek-1));
    const weekly=await Promise.all(Array.from({length:completedWeeks},(_,index)=>get(`/league/${data.league.league_id}/matchups/${index+1}`).catch(()=>[])));
    let week200=0,win100=0,photo=0,weeklyHigh=0,maxStreak=0,streak=0;const firstThree=[];
    weekly.forEach((matchups,index)=>{if(!matchups.length)return;const mine=matchups.find(matchup=>matchup.roster_id===roster.roster_id);if(!mine)return;const points=Number(mine.points)||0;const high=Math.max(...matchups.map(matchup=>Number(matchup.points)||0));if(points>=200)week200++;if(points===high&&high>0)weeklyHigh++;const opponent=matchups.find(matchup=>matchup.matchup_id===mine.matchup_id&&matchup.roster_id!==mine.roster_id);if(!opponent)return;const difference=points-(Number(opponent.points)||0);const won=difference>0;if(won){streak++;if(difference>=100)win100++;if(difference<1)photo++}else streak=0;if(index<3)firstThree.push(won?1:0);maxStreak=Math.max(maxStreak,streak)});
    const pointsFor=item=>(Number(item.settings?.fpts)||0)+(Number(item.settings?.fpts_decimal)||0)/100;
    const ordered=[...data.rosters].sort((a,b)=>(Number(b.settings?.wins)||0)-(Number(a.settings?.wins)||0)||pointsFor(b)-pointsFor(a));
    const byPoints=[...data.rosters].sort((a,b)=>pointsFor(b)-pointsFor(a));
    const championId=seasonComplete?champion(data):null;const consolationId=seasonComplete?consolationWinner(data):null;
    const place=ordered.findIndex(item=>item.owner_id===owner.id)+1;const wins=Number(roster.settings?.wins)||0;const losses=Number(roster.settings?.losses)||0;const points=pointsFor(roster);
    const first=seasonComplete&&ordered[0]?.owner_id===owner.id;const pointsKing=seasonComplete&&byPoints[0]?.owner_id===owner.id;const bye=seasonComplete&&place>0&&place<=2;
    const final=seasonComplete&&data.winners.some(match=>Number(match.p)===1&&(data.rosterById[match.w]?.owner_id===owner.id||data.rosterById[match.l]?.owner_id===owner.id));
    const podium=seasonComplete&&data.winners.some(match=>[1,3].includes(Number(match.p))&&(data.rosterById[match.w]?.owner_id===owner.id||(Number(match.p)===1&&data.rosterById[match.l]?.owner_id===owner.id)));
    const last=seasonComplete&&place===data.rosters.length;const undefeated=seasonComplete&&wins>0&&losses===0;const isChampion=championId===owner.id;
    owner.modern.push({year,champ:isChampion,first,pointsKing,bye,final,podium,last,pf:points,complete:seasonComplete});
    if(isChampion)award(owner,rules,'champion',1,year);if(first)award(owner,rules,'regular_season_king',1,year);if(pointsKing)award(owner,rules,'points_king',1,year);if(undefeated)award(owner,rules,'untouchable',1,year);if(bye)award(owner,rules,'first_class_ticket',1,year);if(podium)award(owner,rules,'on_the_podium',1,year);if(consolationId===owner.id)award(owner,rules,'consolation_king',1,year);if(final&&bye)award(owner,rules,'business_trip',1,year);
    if(first&&pointsKing&&isChampion)award(owner,rules,'triple_crown_season',1,year);else if(first&&isChampion)award(owner,rules,'double_crown',1,year);
    if(seasonComplete&&points>=1000)award(owner,rules,'four_digits',1,year);if(maxStreak>=5)award(owner,rules,'hot_streak',1,year);if(maxStreak>=4)award(owner,rules,'perfect_month',1,year);if(seasonComplete&&firstThree.length===3&&firstThree.every(value=>value===0)&&place>0&&place<=6)award(owner,rules,'comeback_kid',1,year);if(weeklyHigh>=3)award(owner,rules,'three_week_terror',1,year);award(owner,rules,'two_hundred_club',week200,year);award(owner,rules,'absolute_destruction',win100,year);award(owner,rules,'photo_finish',photo,year);award(owner,rules,'weekly_hammer',weeklyHigh,year);
  }
  function rankFor(points,levels){
    let current=levels[0];for(const level of levels)if(points>=level.lp)current=level;
    const index=levels.indexOf(current);const next=levels[index+1];const percent=next?Math.max(0,Math.min(100,(points-current.lp)/(next.lp-current.lp)*100)):100;
    return{...current,next,percent};
  }
  function render(owners,rules,seasonYear){
    const list=document.querySelector('#legacyStandings');const status=document.querySelector('#standingsStatus');if(!list)return;
    list.innerHTML=owners.map((owner,index)=>{const rank=rankFor(owner.lp,rules.levels);const remaining=rank.next?Math.max(0,rank.next.lp-owner.lp):0;const progressText=rank.next?`${remaining.toLocaleString()} LP to ${rank.next.name}`:'Legacy ladder complete';return `<article class="standing-row"><div class="standing-place">${String(index+1).padStart(2,'0')}</div><img class="standing-patch" src="${escapeHtml(rank.art)}" alt="${escapeHtml(rank.name)} patch"><div class="standing-team"><b>${escapeHtml(teamName(owner.user,owner.roster))}</b><span>${escapeHtml(owner.user?.display_name||'EFL franchise')}</span></div><div class="standing-rank"><b>${escapeHtml(rank.name)}</b><span>${owner.lp.toLocaleString()} LP · ${owner.badges.length} badges</span></div><div class="standing-progress"><div class="standing-progress-label"><span>Next promotion</span><strong>${escapeHtml(progressText)}</strong></div><div class="standing-bar" role="progressbar" aria-label="${escapeHtml(progressText)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(rank.percent)}"><i style="width:${rank.percent}%"></i></div></div></article>`}).join('');
    status.textContent=`Sleeper live · ${seasonYear} · ${owners.length} franchises`;
  }
  async function loadStandings(){
    const [rules,current]=await Promise.all([fetch('legacy-system.json?v=14',{cache:'no-store'}).then(response=>response.json()),season(LEAGUE_ID)]);
    const owners={};current.rosters.forEach(roster=>{const id=roster.owner_id||`roster-${roster.roster_id}`;owners[id]={id,roster,user:current.userById[roster.owner_id],badges:[],lp:0,modern:[],heritageYears:[],historicTitles:0}});
    const chain=[current];let previous=current.league.previous_league_id;let depth=1;while(previous&&depth++<20){const data=await season(previous);chain.push(data);previous=data.league.previous_league_id}
    chain.forEach(data=>{const year=Number(data.league.season);const championId=champion(data);data.rosters.forEach(roster=>{const owner=owners[roster.owner_id];if(!owner)return;if(year<2026)owner.heritageYears.push(year);if(year<2026&&championId===roster.owner_id)owner.historicTitles++})});
    await Promise.all(Object.values(owners).map(async owner=>{if(owner.heritageYears.length)award(owner,rules,'legacy_franchise');if(owner.historicTitles)award(owner,rules,'legacy_champion',owner.historicTitles);for(const data of [...chain].reverse())await evaluateModern(owner,data,rules);const modern=owner.modern.sort((a,b)=>a.year-b.year);const completed=modern.filter(item=>item.complete);for(let index=1;index<modern.length;index++){const now=modern[index],prior=modern[index-1];if(!now.complete)continue;if(now.champ&&prior.champ)award(owner,rules,'back_to_back_champion',1,now.year);if(now.champ&&prior.last)award(owner,rules,'worst_to_first',1,now.year);if(now.final&&prior.champ)award(owner,rules,'title_defense',1,now.year)}if(completed.length>=5)award(owner,rules,'iron_franchise');if(completed.length>=10)award(owner,rules,'efl_lifetime')}));
    const ordered=Object.values(owners).sort((a,b)=>b.lp-a.lp||b.historicTitles-a.historicTitles||teamName(a.user,a.roster).localeCompare(teamName(b.user,b.roster)));
    render(ordered,rules,current.league.season);
  }
  loadStandings().catch(error=>{console.error(error);const list=document.querySelector('#legacyStandings');const status=document.querySelector('#standingsStatus');if(status)status.textContent='Standings temporarily unavailable';if(list)list.innerHTML='<div class="standing-row"><div class="standing-team" style="grid-column:1/-1"><b>Legacy standings are taking a timeout.</b><span>Refresh to reconnect with Sleeper.</span></div></div>'});
})();
