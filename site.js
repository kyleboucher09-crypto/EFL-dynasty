const EFL_ID="1313240395462742016", EFL_API="https://api.sleeper.app/v1";
const $=s=>document.querySelector(s);
async function apiGet(path){const r=await fetch(EFL_API+path);if(!r.ok)throw new Error("Sleeper "+r.status);return r.json()}
function teamName(user,roster){return user?.metadata?.team_name||user?.display_name||(roster?`Roster ${roster.roster_id}`:"EFL Team")}

const LEGACY_RANK_LEVELS=[
 {level:1,name:'Prospect',lp:0,icon:'P'},
 {level:2,name:'Rookie',lp:1,icon:'R'},
 {level:3,name:'Veteran',lp:500,icon:'V'},
 {level:4,name:'Captain ★',lp:1200,icon:'C1'},
 {level:5,name:'Captain ★★',lp:2200,icon:'C2'},
 {level:6,name:'Captain ★★★',lp:3400,icon:'C3'},
 {level:7,name:'Captain ★★★★',lp:4700,icon:'C4'},
 {level:8,name:'Hall of Famer',lp:6000,icon:'HOF'}
];

const LEGACY_BADGE_ALIASES={efl_champion:'champion',first_round_bye:'first_class_ticket',podium:'on_the_podium',consolation:'consolation_king',bye_to_final:'business_trip',thousand:'four_digits',high_week:'weekly_hammer',defending_champ:'title_defense',iron_man:'iron_franchise',decade:'efl_lifetime'};
const SEASONAL_REPEAT_BADGES=new Set(['champion','regular_season_king','points_king','untouchable','two_hundred_club','absolute_destruction','photo_finish','hot_streak','perfect_month','comeback_kid','giant_killer','wire_wizard','playoff_assassin','first_class_ticket','on_the_podium','four_digits','weekly_hammer','bracket_breaker','consolation_king','business_trip','title_defense','three_week_terror','double_crown','triple_crown_season','survivor','bench_boss','consistency_king','precision_drafter','rivalry_king','roster_builder','sleeper_hit','streak_breaker','sunday_miracle','the_spoiler','trade_heist','trade_master','upset_of_year','waiver_steal','monday_night_hero','iron_curtain']);
window.EFL_LEGACY_POLICY={hallOfFameTargetYears:[8,12],rankScope:'franchise-per-league',multiLeagueMode:'separate-franchise-ledgers',leagueIds:[EFL_ID],note:'One owner may have multiple league franchises, but each franchise keeps its own LP and rank so joining more leagues does not accelerate a single Hall of Fame track.'};

function installLegacyEconomyPatch(){
 let tries=0;
 const rulesTimer=setInterval(()=>{
  tries++;
  if(typeof RULES!=='undefined'&&Array.isArray(RULES.levels)){RULES.levels=LEGACY_RANK_LEVELS.map(x=>({...x}));clearInterval(rulesTimer)}
  if(tries>120)clearInterval(rulesTimer);
 },25);
 if(typeof window.award==='function'&&!window.award.__eflLegacyPatched){
  const originalAward=window.award;
  const patched=function(a,id,count=1,meta=''){
   id=LEGACY_BADGE_ALIASES[id]||id;
   const b=(typeof RULES!=='undefined'&&RULES.badges||[]).find(x=>x.id===id);
   if(!b||count<=0)return;
   const year=Number(a?.modern?.[a.modern.length-1]?.year)||0;
   if(SEASONAL_REPEAT_BADGES.has(id)&&year>=2026){
    let old=a.badges.find(x=>x.id===id);
    const units=Math.max(1,Number(count)||1);
    if(!old){old={...b,count:0,meta,_creditedSeasons:[]};a.badges.push(old)}
    old._creditedSeasons=Array.isArray(old._creditedSeasons)?old._creditedSeasons:[];
    if(old._creditedSeasons.includes(year))return;
    old._creditedSeasons.push(year);old.count=(old.count||0)+units;a.lp+=b.lp*units;
    if(id==='triple_crown_season'){
     const dbl=a.badges.find(x=>x.id==='double_crown');
     if(dbl&&Array.isArray(dbl._creditedSeasons)&&dbl._creditedSeasons.includes(year)){
      dbl._creditedSeasons=dbl._creditedSeasons.filter(y=>y!==year);dbl.count=Math.max(0,(dbl.count||1)-1);
      const db=(RULES.badges||[]).find(x=>x.id==='double_crown');if(db)a.lp=Math.max(0,a.lp-db.lp);
      if(!dbl._creditedSeasons.length)a.badges=a.badges.filter(x=>x!==dbl);
     }
    }
    return;
   }
   return originalAward(a,id,count,meta);
  };
  patched.__eflLegacyPatched=true;window.award=patched;
 }
}
installLegacyEconomyPatch();

function setupRankArtwork(){
 const art={
  P:{name:'Prospect',src:'Assets/D2751C69-F5D3-411C-A50F-ADACC6ED2787.png'},
  R:{name:'Rookie',src:'Assets/755F37EB-B462-45E6-B5A6-785DC3183CDF.png'},
  V:{name:'Veteran',src:'Assets/740153F8-9D5F-4F33-A168-B03FE9F31012.png'},
  C1:{name:'Captain ★',src:'Assets/207A9B99-619F-4EBB-8695-4EF75B366000.png'},
  C2:{name:'Captain ★★',src:'Assets/E133E406-603D-4E67-8274-A6DABAD4B339.png'},
  C3:{name:'Captain ★★★',src:'Assets/A428E06C-472D-47AF-A71F-2CF47F2438F0.png'},
  C4:{name:'Captain ★★★★',src:'Assets/85ACDAEA-7E66-4C66-B156-12DF58298C5E.png'},
  HOF:{name:'Hall of Famer',src:'Assets/F7231A5B-872E-4746-B2C4-511832582CB6.png'}
 };
 const style=document.createElement('style');
 style.textContent=`
 .rank-mark,.rank-icon{overflow:visible!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important}
 .rank-mark img,.rank-icon img{width:100%;height:100%;display:block;object-fit:contain;filter:drop-shadow(0 5px 8px rgba(0,0,0,.48))}
 body:has(#grid) .rankline{grid-template-columns:92px minmax(0,1fr);gap:14px;align-items:center}
 body:has(#grid) .rank-icon{width:92px!important;height:92px!important}
 body:has(#grid) .rank-name{font-size:22px}
 body:has(#grid) .rank-sub{font-size:8px}
 body:has(#grid) .lp{grid-column:2;text-align:left;font-size:12px;line-height:1.45;margin-top:-8px}
 body:has(#grid) .bar{margin-top:12px}
 body:has(#grid) .badge-row{gap:8px;min-height:58px}
 body:has(#grid) .badge{width:58px;height:58px;font-size:0;flex:0 0 58px;padding:2px;overflow:hidden;background:rgba(255,255,255,.025)}
 body:has(#grid) .badge img{width:100%;height:100%;display:block;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
 body:has(#grid) .ach .ico img{width:82px;height:82px;display:block;object-fit:contain;margin:0 auto;filter:drop-shadow(0 5px 8px rgba(0,0,0,.45))}
 body:has(#grid) .legacy-title{grid-template-columns:108px minmax(0,1fr)}
 body:has(#grid) .legacy-title .rank-icon{width:108px!important;height:108px!important}
 @media(max-width:560px){body:has(#grid) .legacy{padding:17px 16px 16px}body:has(#grid) .rankline{grid-template-columns:92px minmax(0,1fr);gap:14px;align-items:center;min-height:102px}body:has(#grid) .rank-icon{width:92px!important;height:92px!important}body:has(#grid) .rank-name{font-size:22px;line-height:1.05;margin-top:3px}body:has(#grid) .rank-sub{font-size:8px;line-height:1.35}body:has(#grid) .lp{grid-column:2!important;text-align:left!important;font-size:12px;margin-top:-14px}body:has(#grid) .bar{margin-top:10px}body:has(#grid) .badge-row{gap:8px;min-height:58px;justify-content:flex-start}body:has(#grid) .badge{width:58px;height:58px;flex:0 0 58px}body:has(#grid) .legacy-title{grid-template-columns:100px minmax(0,1fr)}body:has(#grid) .legacy-title .rank-icon{width:100px!important;height:100px!important}}
 `;
 document.head.appendChild(style);
 const replace=el=>{if(!el||el.dataset.rankArtApplied)return;const key=el.textContent.trim(),item=art[key];if(!item)return;el.innerHTML=`<img src="${item.src}" alt="${item.name} rank patch">`;el.dataset.rankArtApplied='1'};
 const apply=root=>{if(root.matches?.('.rank-mark,.rank-icon'))replace(root);(root.querySelectorAll?root.querySelectorAll('.rank-mark,.rank-icon'):[]).forEach(replace)};
 apply(document);
 const observer=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)})));
 observer.observe(document.body,{childList:true,subtree:true});
}

function setupHubTouchTrail(){
 const grid=document.querySelector('.hub-grid');if(!grid||grid.dataset.touchTrailReady)return;grid.dataset.touchTrailReady='1';
 const style=document.createElement('style');style.textContent=`.hub-tile{will-change:transform,box-shadow,border-color}.hub-tile.hub-touch-active{border-color:#b85cff!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(184,92,255,.16) 53%,rgba(9,7,13,.96) 76%)!important;box-shadow:0 0 0 1px rgba(184,92,255,.62),0 0 30px rgba(153,55,230,.42),inset 0 0 24px rgba(184,92,255,.13)!important;transform:translateY(-1px) scale(.99)!important}.hub-tile.hub-touch-active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(184,92,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}@media(hover:none),(pointer:coarse){.hub-tile:active{border-color:rgba(232,184,74,.28)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.13),rgba(232,184,74,.045) 46%,rgba(9,7,13,.96) 74%)!important;box-shadow:0 0 16px rgba(232,184,74,.12),inset 0 0 20px rgba(232,184,74,.045)!important;transform:none!important}.hub-tile:active img{filter:drop-shadow(0 0 8px rgba(255,215,108,.6)) drop-shadow(0 0 18px rgba(232,184,74,.25)) brightness(1.06)!important;transform:none!important}.hub-tile.hub-touch-active,.hub-tile.hub-touch-active:active{border-color:#b85cff!important;box-shadow:0 0 0 1px rgba(184,92,255,.62),0 0 30px rgba(153,55,230,.42),inset 0 0 24px rgba(184,92,255,.13)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(184,92,255,.16) 53%,rgba(9,7,13,.96) 76%)!important;transform:translateY(-1px) scale(.99)!important}.hub-tile.hub-touch-active img,.hub-tile.hub-touch-active:active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(184,92,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}}`;document.head.appendChild(style);
 let active=null,touchId=null,startX=0,startY=0;
 const setActive=tile=>{if(active===tile)return;active?.classList.remove('hub-touch-active');active=tile||null;active?.classList.add('hub-touch-active')};
 const tileAt=(x,y)=>{const el=document.elementFromPoint(x,y);const tile=el?.closest?.('.hub-tile');return tile&&grid.contains(tile)?tile:null};
 const findTouch=list=>Array.from(list||[]).find(t=>t.identifier===touchId);
 grid.addEventListener('touchstart',e=>{if(touchId!==null)return;const t=e.changedTouches[0],tile=e.target.closest('.hub-tile');if(!t||!tile)return;touchId=t.identifier;startX=t.clientX;startY=t.clientY;setActive(tile)},{passive:true});
 document.addEventListener('touchmove',e=>{if(touchId===null)return;const t=findTouch(e.touches);if(!t)return;const dx=t.clientX-startX,dy=t.clientY-startY;if(Math.abs(dx)>Math.abs(dy)+3)e.preventDefault();setActive(tileAt(t.clientX,t.clientY))},{passive:false,capture:true});
 const finish=e=>{if(touchId===null)return;const t=findTouch(e.changedTouches);if(!t)return;touchId=null;setActive(null)};
 document.addEventListener('touchend',finish,{passive:true,capture:true});document.addEventListener('touchcancel',finish,{passive:true,capture:true});
}

function setupMobileDock(){
 if(document.querySelector('.efl-mobile-dock'))return;const page=location.pathname.split('/').pop()||'index.html';
 const style=document.createElement('style');style.textContent=`.efl-mobile-dock{display:none}@media(max-width:850px){body{padding-bottom:74px!important}.efl-mobile-dock{position:fixed;left:10px;right:10px;bottom:10px;z-index:120;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(8,6,11,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 14px 38px rgba(0,0,0,.48)}.efl-mobile-dock a,.efl-mobile-dock button{min-width:0;height:50px;border:0;border-radius:12px;background:transparent;color:#a99faf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:800 8px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;letter-spacing:.02em}.efl-mobile-dock .dock-icon{font-size:19px;line-height:1}.efl-mobile-dock a.active{color:#ffd979;background:rgba(255,217,121,.09)}.efl-mobile-dock button{cursor:pointer}.efl-mobile-dock button:active,.efl-mobile-dock a:active{background:rgba(255,255,255,.08)}}`;document.head.appendChild(style);
 const dock=document.createElement('nav');dock.className='efl-mobile-dock';dock.setAttribute('aria-label','Primary mobile navigation');const links=[['index.html','🏠','Home'],['franchises.html','🛡️','Franchise'],['legacy.html','🏅','Legacy'],['power-rankings.html','📈','Rankings']];dock.innerHTML=links.map(([href,icon,label])=>`<a href="${href}"${page===href?' class="active" aria-current="page"':''}><span class="dock-icon">${icon}</span><span>${label}</span></a>`).join('')+`<button type="button" id="dockMore" aria-label="Open more navigation"><span class="dock-icon">☰</span><span>More</span></button>`;document.body.appendChild(dock);
 const more=dock.querySelector('#dockMore');more?.addEventListener('click',()=>{const menu=document.querySelector('#mobileMenu')||document.querySelector('#mobile');const topBtn=document.querySelector('#menuBtn');if(menu){const open=menu.classList.toggle('open');if(topBtn){topBtn.setAttribute('aria-expanded',String(open));if(topBtn.classList.contains('menu-btn'))topBtn.textContent=open?'✕':'☰'}if(open)window.scrollTo({top:0,behavior:'smooth'})}});
}

function enforcePreseasonHeritageBaseline(){
 if(!document.querySelector('#grid'))return;let tries=0;
 const timer=setInterval(()=>{tries++;const arr=window.EFL;if(!Array.isArray(arr)||!arr.length){if(tries>120)clearInterval(timer);return}const gamesPlayed=arr.reduce((n,a)=>n+(+a.r?.settings?.wins||0)+(+a.r?.settings?.losses||0)+(+a.r?.settings?.ties||0),0);if(gamesPlayed===0&&typeof RULES!=='undefined'&&typeof card==='function'){RULES.levels=LEGACY_RANK_LEVELS.map(x=>({...x}));const franchiseBadge=RULES.badges.find(b=>b.id==='legacy_franchise');const championBadge=RULES.badges.find(b=>b.id==='legacy_champion');for(const a of arr){a.badges=[];a.lp=0;if(a.heritageYears?.length&&franchiseBadge){a.badges.push({...franchiseBadge,count:1,icon:`<img src="${franchiseBadge.image}" alt="Legacy Franchise Owner badge">`,meta:'Pre-2026 franchise owner'});a.lp+=franchiseBadge.lp}if(a.historicTitles>0&&championBadge){a.badges.push({...championBadge,count:1,icon:`<img src="${championBadge.image}" alt="Legacy Champion badge">`,meta:`${a.historicTitles} pre-2026 championship${a.historicTitles===1?'':'s'}`});a.lp+=championBadge.lp}}arr.sort((a,b)=>b.lp-a.lp||b.historicTitles-a.historicTitles);const grid=document.querySelector('#grid');if(grid)grid.innerHTML=arr.map((a,i)=>card(a,i)).join('')}clearInterval(timer)},100);
}

function setupShell(){const page=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute('href')===page)a.classList.add('active')});const btn=$('#menuBtn'),menu=$('#mobileMenu');if(btn&&menu){btn.addEventListener('click',()=>{const open=menu.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'✕':'☰'});document.addEventListener('click',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn&&!e.target.closest('#dockMore')){menu.classList.remove('open');btn.textContent='☰';btn.setAttribute('aria-expanded','false')}})}setupMobileDock();setupRankArtwork();setupHubTouchTrail();enforcePreseasonHeritageBaseline()}
document.addEventListener('DOMContentLoaded',setupShell);
// Legacy rank artwork now uses the official uploaded Prospect, Rookie, Veteran, Captain 1-4 star, and Hall of Famer patches.
