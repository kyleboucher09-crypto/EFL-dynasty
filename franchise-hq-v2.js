(()=>{
  const PARAMS=new URLSearchParams(location.search);
  const EFL_LEAGUE_ID=PARAMS.get('league')||'efl-dynasty';
  const REQUESTED_ROSTER=Number(PARAMS.get('roster'))||0;
  const previewShare=PARAMS.get('_vercel_share')||'';
  const LEAGUE_ID='1313240395462742016';
  const API='https://api.sleeper.app/v1';
  const cache=new Map();
  const seasonalBadges=new Set(['champion','regular_season_king','points_king','untouchable','two_hundred_club','absolute_destruction','photo_finish','hot_streak','perfect_month','comeback_kid','playoff_assassin','first_class_ticket','on_the_podium','four_digits','weekly_hammer','bracket_breaker','consolation_king','business_trip','title_defense','three_week_terror','double_crown','triple_crown_season']);
  let RULES=null,COSMETICS=null,OWNERS=[],ACTIVE_OWNER=null,ECONOMY=null,PUBLIC_EQUIPPED={};
  const q=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=path=>{if(!cache.has(path))cache.set(path,fetch(API+path).then(r=>{if(!r.ok)throw Error(`Sleeper ${r.status}`);return r.json()}).catch(e=>{cache.delete(path);throw e}));return cache.get(path)};
  const teamName=(u,r)=>u?.metadata?.team_name||u?.display_name||`Roster ${r?.roster_id||'?'}`;
  const avatar=u=>u?.avatar?`https://sleepercdn.com/avatars/thumbs/${u.avatar}`:'';
  function localUrl(path){if(!previewShare)return path;const u=new URL(path,location.origin);u.searchParams.set('_vercel_share',previewShare);return `${u.pathname}${u.search}`}

  function publishEconomy(owner,economy,allowed=false,status='view'){window.EFL_HQ_STATE={leagueId:EFL_LEAGUE_ID,rosterId:Number(owner?.roster?.roster_id)||0,allowed:Boolean(allowed),status,economy:economy||null};document.dispatchEvent(new CustomEvent('efl:hq-economy',{detail:window.EFL_HQ_STATE}))}
  function applyEconomy(owner,economy){if(!owner||!economy||Number(ACTIVE_OWNER?.roster?.roster_id)!==Number(owner.roster?.roster_id))return;ECONOMY=economy;q('#lpTotal').textContent=Number(economy.performance?.lp??owner.lp).toLocaleString();q('#creditTotal').textContent=Number(economy.wallet?.balance||0).toLocaleString();const crates=economy.crates||{},officialReady=Number(crates.unopened||0),testReady=Number(crates.testReady||0),totalReady=officialReady+testReady;q('#crateCount').textContent=totalReady;q('#crateText').textContent=`${Number(crates.earned||0)} official earned · ${Number(crates.opened||0)} official opened · ${officialReady} official ready.${testReady?` ${testReady} Commissioner test crate ready; it does not count as a Sleeper win.`:''} Duplicate drops convert to EFL Credits.`;const btn=q('#openCrateBtn');if(btn){btn.disabled=!totalReady;btn.textContent=btn.disabled?'NO CRATES READY':testReady&&!officialReady?'OPEN COMMISSIONER TEST CRATE':`OPEN VICTORY CRATE · ${totalReady} READY`}publishEconomy(owner,economy,true,'allowed')}
  async function renderAccess(owner){
    const el=q('#accessStatus');if(!el||!owner?.roster?.roster_id)return;const rosterId=Number(owner.roster.roster_id);ACTIVE_OWNER=owner;ECONOMY=null;PUBLIC_EQUIPPED={};el.textContent='CHECKING ACCESS…';el.dataset.access='loading';publishEconomy(owner,{equipped:{}},false,'loading');
    const publicIdentity=fetch(localUrl(`/api/efl-hq-public?leagueId=${encodeURIComponent(EFL_LEAGUE_ID)}&rosterId=${rosterId}`),{credentials:'same-origin'}).then(async response=>{let json={};try{json=await response.json()}catch{}if(!response.ok)throw Error(json.error||'Public identity unavailable');if(Number(ACTIVE_OWNER?.roster?.roster_id)!==rosterId)return;PUBLIC_EQUIPPED=json.equipped||{};if(!ECONOMY)publishEconomy(owner,{equipped:PUBLIC_EQUIPPED},false,'loading')}).catch(error=>console.warn('Public HQ identity unavailable',error));
    try{
      const path=`/api/efl-franchise-access?leagueId=${encodeURIComponent(EFL_LEAGUE_ID)}&rosterId=${Number(owner.roster.roster_id)}`;
      const r=await fetch(localUrl(path),{credentials:'same-origin',cache:'no-store'});let j={};try{j=await r.json()}catch{}
      if(Number(ACTIVE_OWNER?.roster?.roster_id)!==rosterId)return;if(r.ok&&j.allowed){const role=String(j.role||'owner').toUpperCase();el.textContent=`${role} ACCESS · LOADING HQ DATA…`;el.dataset.access='loading';const economyPath=`/api/efl-hq-economy?leagueId=${encodeURIComponent(EFL_LEAGUE_ID)}&rosterId=${rosterId}`;const er=await fetch(localUrl(economyPath),{credentials:'same-origin',cache:'no-store'});let ej={};try{ej=await er.json()}catch{}if(!er.ok)throw Error(ej.error||'Economy unavailable');applyEconomy(owner,ej.economy);el.textContent=`${role} ACCESS · MANAGEMENT AUTHORIZED`;el.dataset.access='allowed';return}
      await publicIdentity;el.textContent='VIEW ONLY · SIGN IN FOR MANAGEMENT';el.dataset.access='view';publishEconomy(owner,{equipped:PUBLIC_EQUIPPED},false,'view');q('#crateText').textContent='Sign in with an approved franchise account to view crates, inventory and spendable Credits.';
      const btn=q('#openCrateBtn');if(btn){btn.disabled=true;btn.textContent='SIGN IN TO OPEN'}
    }catch(error){await publicIdentity;if(Number(ACTIVE_OWNER?.roster?.roster_id)!==rosterId)return;console.error('HQ access/economy check failed',error);if(!ECONOMY)publishEconomy(owner,{equipped:PUBLIC_EQUIPPED},false,'error');el.textContent='VIEW ONLY · ACCESS CHECK UNAVAILABLE';el.dataset.access='error';q('#crateText').textContent='The private HQ economy could not be loaded. Try refreshing this page.';const btn=q('#openCrateBtn');if(btn){btn.disabled=true;btn.textContent='HQ ECONOMY UNAVAILABLE'}}
  }
  async function economyAction(action,payload={}){const owner=ACTIVE_OWNER;if(!owner?.roster?.roster_id)throw Error('Select a franchise first.');const response=await fetch(localUrl('/api/efl-hq-economy'),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({leagueId:EFL_LEAGUE_ID,rosterId:Number(owner.roster.roster_id),action,...payload})});let json={};try{json=await response.json()}catch{}if(!response.ok)throw Error(json.error||'That HQ action could not be completed.');applyEconomy(owner,json.economy);return json}window.EFL_HQ_ACTION=economyAction;

  async function season(leagueId){
    const [league,users,rosters,winners,consolation]=await Promise.all([
      get(`/league/${leagueId}`),get(`/league/${leagueId}/users`),get(`/league/${leagueId}/rosters`),
      get(`/league/${leagueId}/winners_bracket`).catch(()=>[]),get(`/league/${leagueId}/losers_bracket`).catch(()=>[])
    ]);
    return {league,users,rosters,winners,consolation,userById:Object.fromEntries(users.map(u=>[u.user_id,u])),rosterById:Object.fromEntries(rosters.map(r=>[r.roster_id,r]))};
  }
  const champion=d=>{const final=d.winners.find(m=>Number(m.p)===1);return final?d.rosterById[final.w]?.owner_id:null};
  const consolationWinner=d=>{const final=d.consolation.find(m=>Number(m.p)===1);return final?d.rosterById[final.w]?.owner_id:null};

  function award(owner,id,count=1,year=0){
    const badge=RULES.badges.find(b=>b.id===id);let units=Math.max(1,Number(count)||1);if(!badge||count<=0)return;
    let existing=owner.badges.find(b=>b.id===id);
    if(year>=RULES.startSeason&&seasonalBadges.has(id)){
      if(!existing){existing={...badge,count:0,_creditedSeasons:[]};owner.badges.push(existing)}
      if(existing._creditedSeasons.includes(year))return;
      existing._creditedSeasons.push(year);existing.count+=units;owner.lp+=badge.lp*units;return;
    }
    if(existing)return;if(id!=='legacy_champion')units=1;owner.badges.push({...badge,count:units});owner.lp+=badge.lp*units;
  }

  async function evaluateModern(owner,data){
    const year=Number(data.league.season);if(year<RULES.startSeason)return;
    const roster=data.rosters.find(r=>r.owner_id===owner.id);if(!roster)return;
    const playoffStart=Number(data.league.settings?.playoff_week_start)||15;
    const regularWeeks=Math.max(1,playoffStart-1);
    const leagueWeek=Number(data.league.settings?.leg)||0;
    const status=String(data.league.status||'').toLowerCase();
    const seasonComplete=['complete','post_season'].includes(status)||leagueWeek>=playoffStart;
    const completedWeeks=seasonComplete?regularWeeks:Math.min(regularWeeks,Math.max(0,leagueWeek-1));
    const weekly=await Promise.all(Array.from({length:completedWeeks},(_,i)=>get(`/league/${data.league.league_id}/matchups/${i+1}`).catch(()=>[])));
    let week200=0,win100=0,photo=0,weeklyHigh=0,maxStreak=0,streak=0;const firstThree=[];
    weekly.forEach((matchups,index)=>{
      const mine=matchups.find(m=>m.roster_id===roster.roster_id);if(!mine)return;
      const points=Number(mine.points)||0,high=Math.max(...matchups.map(m=>Number(m.points)||0));if(points>=200)week200++;if(points===high&&high>0)weeklyHigh++;
      const opp=matchups.find(m=>m.matchup_id===mine.matchup_id&&m.roster_id!==mine.roster_id);if(!opp)return;
      const diff=points-(Number(opp.points)||0),won=diff>0;if(won){streak++;if(diff>=100)win100++;if(diff<1)photo++}else streak=0;if(index<3)firstThree.push(won?1:0);maxStreak=Math.max(maxStreak,streak);
    });
    const pointsFor=r=>(Number(r.settings?.fpts)||0)+(Number(r.settings?.fpts_decimal)||0)/100;
    const ordered=[...data.rosters].sort((a,b)=>(Number(b.settings?.wins)||0)-(Number(a.settings?.wins)||0)||pointsFor(b)-pointsFor(a));
    const byPoints=[...data.rosters].sort((a,b)=>pointsFor(b)-pointsFor(a));
    const champId=seasonComplete?champion(data):null,consolationId=seasonComplete?consolationWinner(data):null;
    const place=ordered.findIndex(r=>r.owner_id===owner.id)+1,wins=Number(roster.settings?.wins)||0,losses=Number(roster.settings?.losses)||0,pf=pointsFor(roster);
    const first=seasonComplete&&ordered[0]?.owner_id===owner.id,pointsKing=seasonComplete&&byPoints[0]?.owner_id===owner.id,bye=seasonComplete&&place>0&&place<=2;
    const final=seasonComplete&&data.winners.some(m=>Number(m.p)===1&&(data.rosterById[m.w]?.owner_id===owner.id||data.rosterById[m.l]?.owner_id===owner.id));
    const podium=seasonComplete&&data.winners.some(m=>[1,3].includes(Number(m.p))&&(data.rosterById[m.w]?.owner_id===owner.id||(Number(m.p)===1&&data.rosterById[m.l]?.owner_id===owner.id)));
    const last=seasonComplete&&place===data.rosters.length,undefeated=seasonComplete&&wins>0&&losses===0,isChampion=champId===owner.id;
    owner.modern.push({year,champ:isChampion,final,last,complete:seasonComplete});
    if(isChampion)award(owner,'champion',1,year);if(first)award(owner,'regular_season_king',1,year);if(pointsKing)award(owner,'points_king',1,year);if(undefeated)award(owner,'untouchable',1,year);if(bye)award(owner,'first_class_ticket',1,year);if(podium)award(owner,'on_the_podium',1,year);if(consolationId===owner.id)award(owner,'consolation_king',1,year);if(final&&bye)award(owner,'business_trip',1,year);
    if(first&&pointsKing&&isChampion)award(owner,'triple_crown_season',1,year);else if(first&&isChampion)award(owner,'double_crown',1,year);
    if(seasonComplete&&pf>=1000)award(owner,'four_digits',1,year);if(maxStreak>=5)award(owner,'hot_streak',1,year);if(maxStreak>=4)award(owner,'perfect_month',1,year);if(seasonComplete&&firstThree.length===3&&firstThree.every(v=>v===0)&&place>0&&place<=6)award(owner,'comeback_kid',1,year);if(weeklyHigh>=3)award(owner,'three_week_terror',1,year);
    award(owner,'two_hundred_club',week200,year);award(owner,'absolute_destruction',win100,year);award(owner,'photo_finish',photo,year);award(owner,'weekly_hammer',weeklyHigh,year);
  }

  function rankFor(lp){
    let current=RULES.levels[0];for(const level of RULES.levels)if(lp>=level.lp)current=level;
    const index=RULES.levels.indexOf(current),next=RULES.levels[index+1];const pct=next?Math.max(0,Math.min(100,(lp-current.lp)/(next.lp-current.lp)*100)):100;
    return {...current,next,pct};
  }

  function badgeCard(b,earned){
    const secret=b.secret&&!earned,priority=earned?'eager':'lazy';return `<article class="badge-card ${earned?'earned':'locked'}">${secret?'<div class="lock">🔒</div>':`<div class="badge-art"><span aria-hidden="true">EFL</span><img ${earned?`src="${esc(b.image)}"`:`data-src="${esc(b.image)}"`} alt="${esc(b.name)} badge" loading="${priority}" decoding="async" fetchpriority="${earned?'high':'low'}"></div>`}<h4>${secret?'???':esc(b.name)}</h4><p>${secret?'Hidden achievement. Unlock it to reveal the requirement.':esc(b.requirement)}</p><div class="value">${earned?'✓ EARNED · ':''}${b.live?'LIVE STATUS':`${Number(b.lp)||0} LP`}</div></article>`;
  }
  function hydrateBadgeImages(){
    const images=[...document.querySelectorAll('.badge-art img')],load=img=>{if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src}};
    images.forEach(img=>{img.addEventListener('load',()=>img.closest('.badge-art')?.classList.add('loaded'),{once:true});img.addEventListener('error',()=>img.closest('.badge-art')?.classList.add('failed'),{once:true});if(img.getAttribute('src')&&img.complete){if(img.naturalWidth)img.closest('.badge-art')?.classList.add('loaded');else img.closest('.badge-art')?.classList.add('failed')}});
    const pending=images.filter(img=>img.dataset.src);if(!('IntersectionObserver'in window)){pending.forEach(load);return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;load(entry.target);observer.unobserve(entry.target)}),{rootMargin:'360px 0px'});pending.forEach(img=>observer.observe(img));
  }
  function renderShop(credits){
    q('#shopGrid').innerHTML=COSMETICS.items.map(item=>`<article class="shop-card"><div class="shop-icon">${item.icon}</div><span class="rarity ${item.rarity}">${item.rarity.toUpperCase()}</span><h4>${esc(item.name)}</h4><p>${esc(item.description)}</p><div class="price">${item.lootOnly?'🎁 LOOT EXCLUSIVE':`${item.price} EC`}</div><button type="button" disabled>${item.lootOnly?'VICTORY CRATE DROP':credits>=item.price?'PURCHASE AFTER LOGIN':'NOT ENOUGH EC'}</button></article>`).join('');
  }
  function renderOwner(owner){
    ACTIVE_OWNER=owner;ECONOMY=null;PUBLIC_EQUIPPED={};const r=rankFor(owner.lp),name=teamName(owner.user,owner.roster),img=avatar(owner.user),credits=Math.floor(owner.lp/10);
    q('#teamName').textContent=name;q('#ownerName').textContent=owner.user?.display_name||'EFL Franchise';q('#avatar').innerHTML=img?`<img src="${img}" alt="${esc(name)} avatar">`:esc(name.slice(0,2));
    q('#rankArt').src=r.art;q('#rankArt').alt=`${r.name} Legacy rank patch`;q('#rankName').textContent=r.name;q('#rankLevel').textContent=`LEGACY RANK ${r.level} OF ${RULES.levels.length}`;
    q('#lpTotal').textContent=owner.lp.toLocaleString();q('#creditTotal').textContent=credits.toLocaleString();q('#badgeTotal').textContent=owner.badges.length;q('#badgeSub').textContent=`${RULES.badges.length-owner.badges.length} still locked`;
    q('#progressFrom').textContent=r.name;q('#progressBar').style.width=`${r.pct}%`;if(r.next){const remaining=Math.max(0,r.next.lp-owner.lp);q('#progressTo').textContent=r.next.name;q('#progressNote').textContent=`${remaining.toLocaleString()} LP until promotion to ${r.next.name}.`;}else{q('#progressTo').textContent='LADDER COMPLETE';q('#progressNote').textContent='Maximum Legacy rank achieved.'}
    q('#crateCount').textContent='—';q('#crateText').textContent='Loading server-verified crates, inventory and spendable Credits…';q('#crateResult').textContent='';const crateBtn=q('#openCrateBtn');if(crateBtn){crateBtn.disabled=true;crateBtn.textContent='CHECKING ACCESS…'}
    const earned=new Set(owner.badges.map(b=>b.id));q('#vaultGrid').innerHTML=RULES.badges.map(b=>badgeCard(b,earned.has(b.id))).join('');hydrateBadgeImages();
    const trophyIds=new Set(['legacy_champion','champion','back_to_back_champion','worst_to_first','double_crown','triple_crown_season']);
    const top=[...owner.badges].filter(b=>trophyIds.has(b.id)).sort((a,b)=>(Number(b.lp)||0)-(Number(a.lp)||0)).slice(0,6);q('#showcaseGrid').innerHTML=top.length?top.map(b=>`<div class="trophy-slot"><img src="${esc(b.image)}" alt="${esc(b.name)}"><strong>${esc(b.name)}</strong><small>${b.rarity||'EFL TROPHY'} · ${Number(b.lp)||0} LP</small></div>`).join(''):'<div class="empty">No championship trophies earned yet. Future EFL titles and crown achievements will fill this case.</div>';
    renderShop(credits);renderAccess(owner);q('#hq').classList.add('on');
  }

  async function load(){
    [RULES,COSMETICS]=await Promise.all([fetch('legacy-system.json?v=14',{cache:'no-store'}).then(r=>r.json()),fetch('legacy-cosmetics.json?v=1',{cache:'no-store'}).then(r=>r.json())]);
    const current=await season(LEAGUE_ID),owners={};current.rosters.forEach(roster=>{const id=roster.owner_id||`roster-${roster.roster_id}`;owners[id]={id,roster,user:current.userById[roster.owner_id],badges:[],lp:0,modern:[],heritageYears:[],historicTitles:0}});
    const chain=[current];let previous=current.league.previous_league_id,depth=1;while(previous&&depth++<20){const data=await season(previous);chain.push(data);previous=data.league.previous_league_id}
    chain.forEach(data=>{const year=Number(data.league.season),champId=champion(data);data.rosters.forEach(roster=>{const o=owners[roster.owner_id];if(!o)return;if(year<RULES.startSeason)o.heritageYears.push(year);if(year<RULES.startSeason&&champId===roster.owner_id)o.historicTitles++})});
    await Promise.all(Object.values(owners).map(async owner=>{if(owner.heritageYears.length)award(owner,'legacy_franchise');if(owner.historicTitles)award(owner,'legacy_champion',owner.historicTitles);for(const data of [...chain].reverse())await evaluateModern(owner,data);const modern=owner.modern.sort((a,b)=>a.year-b.year),completed=modern.filter(x=>x.complete);for(let i=1;i<modern.length;i++){const now=modern[i],prior=modern[i-1];if(!now.complete)continue;if(now.champ&&prior.champ)award(owner,'back_to_back_champion',1,now.year);if(now.champ&&prior.last)award(owner,'worst_to_first',1,now.year);if(now.final&&prior.champ)award(owner,'title_defense',1,now.year)}if(completed.length>=5)award(owner,'iron_franchise');if(completed.length>=10)award(owner,'efl_lifetime')}));
    OWNERS=Object.values(owners).sort((a,b)=>teamName(a.user,a.roster).localeCompare(teamName(b.user,b.roster)));
    const picker=q('#franchisePicker');picker.innerHTML=OWNERS.map((o,i)=>`<option value="${i}">${esc(teamName(o.user,o.roster))}</option>`).join('');picker.onchange=()=>renderOwner(OWNERS[Number(picker.value)||0]);q('#status').textContent=`Sleeper live · ${current.league.season} · ${OWNERS.length} franchises`;
    const requestedIndex=REQUESTED_ROSTER?OWNERS.findIndex(o=>Number(o.roster?.roster_id)===REQUESTED_ROSTER):-1;const initialIndex=requestedIndex>=0?requestedIndex:0;picker.value=String(initialIndex);renderOwner(OWNERS[initialIndex]);
  }

  document.addEventListener('click',e=>{const btn=e.target.closest('.tab');if(!btn)return;document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('on'));btn.classList.add('on');q('#'+btn.dataset.panel)?.classList.add('on')});
  q('#openCrateBtn')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;btn.textContent='OPENING…';q('#crateResult').textContent='Verifying the win and opening the crate…';try{const result=await economyAction('open_crate'),reward=result.reward||{};q('#crateResult').textContent=reward.type==='duplicate_credit'?`Duplicate ${reward.itemName} converted to ${Number(reward.credits)||0} EC.`:`Unlocked ${reward.itemName} · ${String(reward.rarity||'EFL').toUpperCase()}.`;}catch(error){q('#crateResult').textContent=error.message||'The crate could not be opened.';if(ECONOMY)applyEconomy(ACTIVE_OWNER,ECONOMY)}});
  load().catch(err=>{console.error(err);q('#status').textContent='Unable to load Franchise HQ';q('#franchisePicker').innerHTML='<option>Try refreshing</option>';if(q('#accessStatus'))q('#accessStatus').textContent='ACCESS CHECK UNAVAILABLE'});
})();
