const EFL_ID="1313240395462742016", EFL_API="https://api.sleeper.app/v1";
const eflQuery=s=>document.querySelector(s);
async function apiGet(path){const r=await fetch(EFL_API+path);if(!r.ok)throw new Error("Sleeper "+r.status);return r.json()}
function teamName(user,roster){return user?.metadata?.team_name||user?.display_name||(roster?`Roster ${roster.roster_id}`:"EFL Team")}

const LEGACY_RANK_LEVELS=[
 {level:1,name:'Prospect',lp:0,icon:'P',art:'Assets/ranks-football/rank-01-prospect.svg'},
 {level:2,name:'Rookie',lp:1,icon:'R',art:'Assets/ranks-football/rank-02-rookie.svg'},
 {level:3,name:'Special Teamer',lp:175,icon:'ST',art:'Assets/ranks-football/rank-03-special-teamer.svg'},
 {level:4,name:'Starter',lp:350,icon:'S',art:'Assets/ranks-football/rank-04-starter.svg'},
 {level:5,name:'Veteran',lp:500,icon:'V',art:'Assets/ranks-football/rank-05-veteran.svg'},
 {level:6,name:'All-Pro',lp:850,icon:'AP',art:'Assets/ranks-football/rank-06-all-pro.svg'},
 {level:7,name:'Captain ★',lp:1200,icon:'C1',art:'Assets/ranks-football/rank-07-captain-1.svg'},
 {level:8,name:'Captain ★★',lp:2200,icon:'C2',art:'Assets/ranks-football/rank-08-captain-2.svg'},
 {level:9,name:'Captain ★★★',lp:3400,icon:'C3',art:'Assets/ranks-football/rank-09-captain-3.svg'},
 {level:10,name:'Captain ★★★★',lp:4700,icon:'C4',art:'Assets/ranks-football/rank-10-captain-4.svg'},
 {level:11,name:'Franchise Legend',lp:5400,icon:'FL',art:'Assets/ranks-football/rank-11-franchise-legend.svg'},
 {level:12,name:'Hall of Famer',lp:6000,icon:'HOF',art:'Assets/ranks-football/rank-12-hall-of-famer.svg'}
];

window.EFL_LEGACY_POLICY={hallOfFameTargetYears:[8,12],rankScope:'franchise-per-league',multiLeagueMode:'separate-franchise-ledgers',leagueIds:[EFL_ID],note:'One owner may have multiple league franchises, but each franchise keeps its own LP and rank so joining more leagues does not accelerate a single Hall of Fame track.'};

function installLegacyEconomyPatch(){
 let tries=0;
 const rulesTimer=setInterval(()=>{
  tries++;
  if(typeof RULES!=='undefined'&&Array.isArray(RULES.levels)){RULES.levels=LEGACY_RANK_LEVELS.map(x=>({...x}));clearInterval(rulesTimer)}
  if(tries>120)clearInterval(rulesTimer);
 },25);
}
installLegacyEconomyPatch();

function setupRankArtwork(){
 const art={
  P:{name:'Prospect',src:'Assets/ranks-football/rank-01-prospect.svg'},
  R:{name:'Rookie',src:'Assets/ranks-football/rank-02-rookie.svg'},
  ST:{name:'Special Teamer',src:'Assets/ranks-football/rank-03-special-teamer.svg'},
  S:{name:'Starter',src:'Assets/ranks-football/rank-04-starter.svg'},
  V:{name:'Veteran',src:'Assets/ranks-football/rank-05-veteran.svg'},
  AP:{name:'All-Pro',src:'Assets/ranks-football/rank-06-all-pro.svg'},
  C1:{name:'Captain ★',src:'Assets/ranks-football/rank-07-captain-1.svg'},
  C2:{name:'Captain ★★',src:'Assets/ranks-football/rank-08-captain-2.svg'},
  C3:{name:'Captain ★★★',src:'Assets/ranks-football/rank-09-captain-3.svg'},
  C4:{name:'Captain ★★★★',src:'Assets/ranks-football/rank-10-captain-4.svg'},
  FL:{name:'Franchise Legend',src:'Assets/ranks-football/rank-11-franchise-legend.svg'},
  HOF:{name:'Hall of Famer',src:'Assets/ranks-football/rank-12-hall-of-famer.svg'}
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
 const itemFor=el=>{
  const candidates=[
   el?.textContent?.trim(),
   el?.closest?.('.rank-card')?.querySelector?.('h3')?.textContent?.trim(),
   el?.closest?.('.legacy')?.querySelector?.('.rank-name')?.textContent?.trim(),
   el?.querySelector?.('img')?.alt?.replace(/ rank (badge|patch)$/i,'').trim()
  ].filter(Boolean);
  for(const key of candidates){
   if(art[key])return art[key];
   const byName=Object.values(art).find(x=>x.name===key);if(byName)return byName;
  }
 };
 const replace=el=>{if(!el)return;const item=itemFor(el);if(!item)return;const img=el.querySelector('img');if(img){img.src=item.src;img.alt=`${item.name} rank patch`;}else{el.innerHTML=`<img src="${item.src}" alt="${item.name} rank patch">`;}el.dataset.rankArtApplied='1'};
 const apply=root=>{if(root.matches?.('.rank-mark,.rank-icon'))replace(root);(root.querySelectorAll?root.querySelectorAll('.rank-mark,.rank-icon'):[]).forEach(replace)};
 apply(document);
 const observer=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)})));
 observer.observe(document.body,{childList:true,subtree:true});
}

function setupHubTouchTrail(){
 const grid=document.querySelector('.hub-grid');if(!grid||grid.dataset.touchTrailReady)return;grid.dataset.touchTrailReady='1';
 const style=document.createElement('style');style.textContent=`.hub-tile{will-change:transform,box-shadow,border-color}.hub-tile.hub-touch-active{border-color:#45a3ff!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(23,105,232,.18) 53%,rgba(4,9,20,.96) 76%)!important;box-shadow:0 0 0 1px rgba(69,163,255,.65),0 0 30px rgba(23,105,232,.42),inset 0 0 24px rgba(69,163,255,.14)!important;transform:translateY(-1px) scale(.99)!important}.hub-tile.hub-touch-active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(69,163,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}@media(hover:none),(pointer:coarse){.hub-tile:active{border-color:rgba(232,184,74,.28)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.13),rgba(232,184,74,.045) 46%,rgba(4,9,20,.96) 74%)!important;box-shadow:0 0 16px rgba(232,184,74,.12),inset 0 0 20px rgba(232,184,74,.045)!important;transform:none!important}.hub-tile:active img{filter:drop-shadow(0 0 8px rgba(255,215,108,.6)) drop-shadow(0 0 18px rgba(232,184,74,.25)) brightness(1.06)!important;transform:none!important}.hub-tile.hub-touch-active,.hub-tile.hub-touch-active:active{border-color:#45a3ff!important;box-shadow:0 0 0 1px rgba(69,163,255,.65),0 0 30px rgba(23,105,232,.42),inset 0 0 24px rgba(69,163,255,.14)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(23,105,232,.18) 53%,rgba(4,9,20,.96) 76%)!important;transform:translateY(-1px) scale(.99)!important}.hub-tile.hub-touch-active img,.hub-tile.hub-touch-active:active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(69,163,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}}`;document.head.appendChild(style);
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
 const style=document.createElement('style');style.textContent=`.efl-mobile-dock{display:none}@media(max-width:850px){body{padding-bottom:74px!important}.efl-mobile-dock{position:fixed;left:10px;right:10px;bottom:10px;z-index:120;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px;border:1px solid rgba(69,163,255,.22);border-radius:18px;background:rgba(4,9,20,.95);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 14px 38px rgba(0,0,0,.48),0 0 22px rgba(23,105,232,.12)}.efl-mobile-dock a,.efl-mobile-dock button{min-width:0;height:50px;border:0;border-radius:12px;background:transparent;color:#8fa6c7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:800 8px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;letter-spacing:.02em}.efl-mobile-dock .dock-icon{font-size:19px;line-height:1}.efl-mobile-dock a.active{color:#ffd979;background:rgba(23,105,232,.18)}.efl-mobile-dock button{cursor:pointer}.efl-mobile-dock button:active,.efl-mobile-dock a:active{background:rgba(69,163,255,.12)}}`;document.head.appendChild(style);
 const dock=document.createElement('nav');dock.className='efl-mobile-dock';dock.setAttribute('aria-label','Primary mobile navigation');const links=[['index.html','🏠','Home'],['franchises.html','🛡️','Franchise'],['legacy.html','🏅','Legacy'],['power-rankings.html','📈','Rankings']];dock.innerHTML=links.map(([href,icon,label])=>`<a href="${href}"${page===href?' class="active" aria-current="page"':''}><span class="dock-icon">${icon}</span><span>${label}</span></a>`).join('')+`<button type="button" id="dockMore" aria-label="Open more navigation"><span class="dock-icon">☰</span><span>More</span></button>`;document.body.appendChild(dock);
 const more=dock.querySelector('#dockMore');more?.addEventListener('click',()=>{const menu=document.querySelector('#mobileMenu')||document.querySelector('#mobile');const topBtn=document.querySelector('#menuBtn');if(menu){const open=menu.classList.toggle('open');if(topBtn){topBtn.setAttribute('aria-expanded',String(open));if(topBtn.classList.contains('menu-btn'))topBtn.textContent=open?'✕':'☰'}if(open)window.scrollTo({top:0,behavior:'smooth'})}});
}

function enforcePreseasonHeritageBaseline(){
 if(!document.querySelector('#grid'))return;let tries=0;
 const timer=setInterval(()=>{tries++;const arr=window.EFL;if(!Array.isArray(arr)||!arr.length){if(tries>120)clearInterval(timer);return}const gamesPlayed=arr.reduce((n,a)=>n+(+a.r?.settings?.wins||0)+(+a.r?.settings?.losses||0)+(+a.r?.settings?.ties||0),0);if(gamesPlayed===0&&typeof RULES!=='undefined'&&typeof card==='function'){RULES.levels=LEGACY_RANK_LEVELS.map(x=>({...x}));const franchiseBadge=RULES.badges.find(b=>b.id==='legacy_franchise');const championBadge=RULES.badges.find(b=>b.id==='legacy_champion');for(const a of arr){a.badges=[];a.lp=0;if(a.heritageYears?.length&&franchiseBadge){a.badges.push({...franchiseBadge,count:1,icon:`<img src="${franchiseBadge.image}" alt="Legacy Franchise Owner badge">`,meta:'Pre-2026 franchise owner'});a.lp+=franchiseBadge.lp}if(a.historicTitles>0&&championBadge){a.badges.push({...championBadge,count:1,icon:`<img src="${championBadge.image}" alt="Legacy Champion badge">`,meta:`${a.historicTitles} pre-2026 championship${a.historicTitles===1?'':'s'}`});a.lp+=championBadge.lp}}arr.sort((a,b)=>b.lp-a.lp||b.historicTitles-a.historicTitles);const grid=document.querySelector('#grid');if(grid)grid.innerHTML=arr.map((a,i)=>card(a,i)).join('')}clearInterval(timer)},100);
}

function setupShell(){const page=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute('href')===page)a.classList.add('active')});const btn=eflQuery('#menuBtn'),menu=eflQuery('#mobileMenu');if(btn&&menu){btn.addEventListener('click',()=>{const open=menu.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'✕':'☰'});document.addEventListener('click',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn&&!e.target.closest('#dockMore')){menu.classList.remove('open');btn.textContent='☰';btn.setAttribute('aria-expanded','false')}})}setupMobileDock();setupRankArtwork();setupHubTouchTrail();enforcePreseasonHeritageBaseline()}
document.addEventListener('DOMContentLoaded',setupShell);
// Legacy rank artwork follows the 12-step football ladder while preserving the Captain 1-4 star progression.
