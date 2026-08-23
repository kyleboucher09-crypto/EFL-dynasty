
const EFL_ID="1313240395462742016", EFL_API="https://api.sleeper.app/v1";
const $=s=>document.querySelector(s);
async function apiGet(path){const r=await fetch(EFL_API+path);if(!r.ok)throw new Error("Sleeper "+r.status);return r.json()}
function teamName(user,roster){return user?.metadata?.team_name||user?.display_name||(roster?`Roster ${roster.roster_id}`:"EFL Team")}

function setupRankArtwork(){
 const art={
  '🏈':['Prospect','Assets/3ED57F2C-69A2-427F-9DB1-F020652E5A7D.png'],
  '🪖':['Rookie','Assets/3ACFFE79-7314-48A1-9BAD-88D72446C0BC.png'],
  '🛡️':['Veteran','Assets/41A69F96-74FB-4A4C-AA47-3A2FD1FBDAB7.png'],
  '©️':['Captain','Assets/97A9681C-3CD5-473A-855B-EF5BE9AC7191.png'],
  '⭐':['All Star','Assets/5079A91E-C035-406C-A35D-779D46B90FFD.png'],
  '🏅':['MVP','Assets/19C23122-FD7A-4EBC-9C62-966332FAADD2.png'],
  '💎':['Elite','Assets/DE1A5EAB-965D-49BE-BA89-1C783D503FED.png'],
  '👑':['Legend','Assets/93135308-577B-4524-9CE7-2D65DAD1648C.png'],
  '🏛️':['Hall of Famer','Assets/E8EA15EF-8A41-4267-BB97-307CF803EC52.png']
 };
 const style=document.createElement('style');
 style.textContent=`
 .rank-mark img,.rank-icon img{width:100%;height:100%;display:block;object-fit:contain;border-radius:inherit;filter:drop-shadow(0 5px 8px rgba(0,0,0,.45))}
 .rank-icon{overflow:visible!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important}
 body:has(#grid) .rankline{grid-template-columns:92px minmax(0,1fr);gap:14px;align-items:center}
 body:has(#grid) .rank-icon{width:92px!important;height:92px!important}
 body:has(#grid) .rank-icon img{transform:scale(1.22);transform-origin:center}
 body:has(#grid) .rank-name{font-size:22px}
 body:has(#grid) .rank-sub{font-size:8px}
 body:has(#grid) .lp{grid-column:2;text-align:left;font-size:12px;line-height:1.45;margin-top:-8px}
 body:has(#grid) .bar{margin-top:12px}
 body:has(#grid) .badge-row{gap:8px;min-height:52px}
 body:has(#grid) .badge{width:52px;height:52px;font-size:26px;flex:0 0 52px}
 body:has(#grid) .legacy-title{grid-template-columns:108px minmax(0,1fr)}
 body:has(#grid) .legacy-title .rank-icon{width:108px!important;height:108px!important}
 body:has(#grid) .legacy-title .rank-icon img{transform:scale(1.18)}
 @media(max-width:560px){
   body:has(#grid) .legacy{padding:17px 16px 16px}
   body:has(#grid) .rankline{grid-template-columns:92px minmax(0,1fr);gap:14px;align-items:center;min-height:102px}
   body:has(#grid) .rank-icon{width:92px!important;height:92px!important}
   body:has(#grid) .rank-icon img{transform:scale(1.22)}
   body:has(#grid) .rank-name{font-size:22px;line-height:1.05;margin-top:3px}
   body:has(#grid) .rank-sub{font-size:8px;line-height:1.35}
   body:has(#grid) .lp{grid-column:2!important;text-align:left!important;font-size:12px;margin-top:-14px}
   body:has(#grid) .bar{margin-top:10px}
   body:has(#grid) .badge-row{gap:8px;min-height:52px;justify-content:flex-start}
   body:has(#grid) .badge{width:52px;height:52px;font-size:26px;flex:0 0 52px}
   body:has(#grid) .legacy-title{grid-template-columns:100px minmax(0,1fr)}
   body:has(#grid) .legacy-title .rank-icon{width:100px!important;height:100px!important}
 }
 `;
 document.head.appendChild(style);
 const replace=el=>{if(!el||el.dataset.rankArtApplied)return;const key=el.textContent.trim(),item=art[key];if(!item)return;el.innerHTML=`<img src="${item[1]}" alt="${item[0]} rank badge">`;el.dataset.rankArtApplied='1'};
 const apply=root=>{if(root.matches?.('.rank-mark,.rank-icon'))replace(root);(root.querySelectorAll?root.querySelectorAll('.rank-mark,.rank-icon'):[]).forEach(replace)};
 apply(document);const observer=new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)})));observer.observe(document.body,{childList:true,subtree:true});
}

function setupHubTouchTrail(){
 const grid=document.querySelector('.hub-grid');
 if(!grid||grid.dataset.touchTrailReady)return;
 grid.dataset.touchTrailReady='1';
 const style=document.createElement('style');
 style.textContent=`
 .hub-tile{will-change:transform,box-shadow,border-color}
 .hub-tile.hub-touch-active{border-color:#b85cff!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(184,92,255,.16) 53%,rgba(9,7,13,.96) 76%)!important;box-shadow:0 0 0 1px rgba(184,92,255,.62),0 0 30px rgba(153,55,230,.42),inset 0 0 24px rgba(184,92,255,.13)!important;transform:translateY(-1px) scale(.99)!important}
 .hub-tile.hub-touch-active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(184,92,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}
 @media(hover:none),(pointer:coarse){
   .hub-tile:active{border-color:rgba(232,184,74,.28)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.13),rgba(232,184,74,.045) 46%,rgba(9,7,13,.96) 74%)!important;box-shadow:0 0 16px rgba(232,184,74,.12),inset 0 0 20px rgba(232,184,74,.045)!important;transform:none!important}
   .hub-tile:active img{filter:drop-shadow(0 0 8px rgba(255,215,108,.6)) drop-shadow(0 0 18px rgba(232,184,74,.25)) brightness(1.06)!important;transform:none!important}
   .hub-tile.hub-touch-active,.hub-tile.hub-touch-active:active{border-color:#b85cff!important;box-shadow:0 0 0 1px rgba(184,92,255,.62),0 0 30px rgba(153,55,230,.42),inset 0 0 24px rgba(184,92,255,.13)!important;background:radial-gradient(circle at 50% 34%,rgba(232,184,74,.12),rgba(184,92,255,.16) 53%,rgba(9,7,13,.96) 76%)!important;transform:translateY(-1px) scale(.99)!important}
   .hub-tile.hub-touch-active img,.hub-tile.hub-touch-active:active img{filter:drop-shadow(0 0 9px rgba(255,215,108,.72)) drop-shadow(0 0 18px rgba(184,92,255,.68)) brightness(1.12)!important;transform:scale(1.035)!important}
 }
 `;
 document.head.appendChild(style);
 let active=null,touchId=null,startX=0,startY=0,dragging=false;
 const setActive=tile=>{if(active===tile)return;active?.classList.remove('hub-touch-active');active=tile||null;active?.classList.add('hub-touch-active')};
 const tileAt=(x,y)=>{const el=document.elementFromPoint(x,y);const tile=el?.closest?.('.hub-tile');return tile&&grid.contains(tile)?tile:null};
 const findTouch=list=>Array.from(list||[]).find(t=>t.identifier===touchId);
 grid.addEventListener('touchstart',e=>{
   if(touchId!==null)return;
   const t=e.changedTouches[0],tile=e.target.closest('.hub-tile');
   if(!t||!tile)return;
   touchId=t.identifier;startX=t.clientX;startY=t.clientY;dragging=false;setActive(tile);
 },{passive:true});
 document.addEventListener('touchmove',e=>{
   if(touchId===null)return;
   const t=findTouch(e.touches);if(!t)return;
   const dx=t.clientX-startX,dy=t.clientY-startY;
   if(Math.abs(dx)>7||Math.abs(dy)>7)dragging=true;
   if(Math.abs(dx)>Math.abs(dy)+3)e.preventDefault();
   setActive(tileAt(t.clientX,t.clientY));
 },{passive:false,capture:true});
 const finish=e=>{
   if(touchId===null)return;
   const t=findTouch(e.changedTouches);if(!t)return;
   touchId=null;dragging=false;setActive(null);
 };
 document.addEventListener('touchend',finish,{passive:true,capture:true});
 document.addEventListener('touchcancel',finish,{passive:true,capture:true});
}

function setupMobileDock(){
 if(document.querySelector('.efl-mobile-dock')) return;
 const page=location.pathname.split('/').pop()||'index.html';
 const style=document.createElement('style');style.textContent=`.efl-mobile-dock{display:none}@media(max-width:850px){body{padding-bottom:74px!important}.efl-mobile-dock{position:fixed;left:10px;right:10px;bottom:10px;z-index:120;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(8,6,11,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 14px 38px rgba(0,0,0,.48)}.efl-mobile-dock a,.efl-mobile-dock button{min-width:0;height:50px;border:0;border-radius:12px;background:transparent;color:#a99faf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:800 8px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;letter-spacing:.02em}.efl-mobile-dock .dock-icon{font-size:19px;line-height:1}.efl-mobile-dock a.active{color:#ffd979;background:rgba(255,217,121,.09)}.efl-mobile-dock button{cursor:pointer}.efl-mobile-dock button:active,.efl-mobile-dock a:active{background:rgba(255,255,255,.08)}}`;document.head.appendChild(style);
 const dock=document.createElement('nav');dock.className='efl-mobile-dock';dock.setAttribute('aria-label','Primary mobile navigation');const links=[['index.html','🏠','Home'],['franchises.html','🛡️','Franchise'],['legacy.html','🏅','Legacy'],['power-rankings.html','📈','Rankings']];dock.innerHTML=links.map(([href,icon,label])=>`<a href="${href}"${page===href?' class="active" aria-current="page"':''}><span class="dock-icon">${icon}</span><span>${label}</span></a>`).join('')+`<button type="button" id="dockMore" aria-label="Open more navigation"><span class="dock-icon">☰</span><span>More</span></button>`;document.body.appendChild(dock);
 const more=dock.querySelector('#dockMore');more?.addEventListener('click',()=>{const menu=document.querySelector('#mobileMenu')||document.querySelector('#mobile');const topBtn=document.querySelector('#menuBtn');if(menu){const open=menu.classList.toggle('open');if(topBtn){topBtn.setAttribute('aria-expanded',String(open));if(topBtn.classList.contains('menu-btn'))topBtn.textContent=open?'✕':'☰'}if(open)window.scrollTo({top:0,behavior:'smooth'})}});
}
function setupShell(){const page=location.pathname.split("/").pop()||"index.html";document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute("href")===page)a.classList.add("active")});const btn=$("#menuBtn"),menu=$("#mobileMenu");if(btn&&menu){btn.addEventListener("click",()=>{const open=menu.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰"});document.addEventListener("click",e=>{if(menu.classList.contains("open")&&!menu.contains(e.target)&&e.target!==btn&&!e.target.closest('#dockMore')){menu.classList.remove("open");btn.textContent="☰";btn.setAttribute("aria-expanded","false")}})}setupMobileDock();setupRankArtwork();setupHubTouchTrail()}
document.addEventListener("DOMContentLoaded",setupShell);
// deployment refresh: corrected franchise rank sizing
