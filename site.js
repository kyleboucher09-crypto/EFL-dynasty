
const EFL_ID="1313240395462742016", EFL_API="https://api.sleeper.app/v1";
const $=s=>document.querySelector(s);
async function apiGet(path){const r=await fetch(EFL_API+path);if(!r.ok)throw new Error("Sleeper "+r.status);return r.json()}
function teamName(user,roster){return user?.metadata?.team_name||user?.display_name||(roster?`Roster ${roster.roster_id}`:"EFL Team")}

function setupMobileDock(){
 if(document.querySelector('.efl-mobile-dock')) return;
 const page=location.pathname.split('/').pop()||'index.html';
 const style=document.createElement('style');
 style.textContent=`
 .efl-mobile-dock{display:none}
 @media(max-width:850px){
   body{padding-bottom:74px!important}
   .efl-mobile-dock{position:fixed;left:10px;right:10px;bottom:10px;z-index:120;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(8,6,11,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 14px 38px rgba(0,0,0,.48)}
   .efl-mobile-dock a,.efl-mobile-dock button{min-width:0;height:50px;border:0;border-radius:12px;background:transparent;color:#a99faf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:800 8px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;letter-spacing:.02em}
   .efl-mobile-dock .dock-icon{font-size:19px;line-height:1}
   .efl-mobile-dock a.active{color:#ffd979;background:rgba(255,217,121,.09)}
   .efl-mobile-dock button{cursor:pointer}
   .efl-mobile-dock button:active,.efl-mobile-dock a:active{background:rgba(255,255,255,.08)}
 }
 `;
 document.head.appendChild(style);
 const dock=document.createElement('nav');
 dock.className='efl-mobile-dock';
 dock.setAttribute('aria-label','Primary mobile navigation');
 const links=[
   ['index.html','🏠','Home'],
   ['franchises.html','🛡️','Franchise'],
   ['legacy.html','🏅','Legacy'],
   ['power-rankings.html','📈','Rankings']
 ];
 dock.innerHTML=links.map(([href,icon,label])=>`<a href="${href}"${page===href?' class="active" aria-current="page"':''}><span class="dock-icon">${icon}</span><span>${label}</span></a>`).join('')+`<button type="button" id="dockMore" aria-label="Open more navigation"><span class="dock-icon">☰</span><span>More</span></button>`;
 document.body.appendChild(dock);
 const more=dock.querySelector('#dockMore');
 more?.addEventListener('click',()=>{
   const menu=document.querySelector('#mobileMenu')||document.querySelector('#mobile');
   const topBtn=document.querySelector('#menuBtn');
   if(menu){
     const open=menu.classList.toggle('open');
     if(topBtn){topBtn.setAttribute('aria-expanded',String(open));if(topBtn.classList.contains('menu-btn'))topBtn.textContent=open?'✕':'☰'}
     if(open) window.scrollTo({top:0,behavior:'smooth'});
   }
 });
}

function setupShell(){
 const page=location.pathname.split("/").pop()||"index.html";
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute("href")===page)a.classList.add("active")});
 const btn=$("#menuBtn"),menu=$("#mobileMenu");
 if(btn&&menu){btn.addEventListener("click",()=>{const open=menu.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰"});
 document.addEventListener("click",e=>{if(menu.classList.contains("open")&&!menu.contains(e.target)&&e.target!==btn&&!e.target.closest('#dockMore')){menu.classList.remove("open");btn.textContent="☰";btn.setAttribute("aria-expanded","false")}})}
 setupMobileDock();
}
document.addEventListener("DOMContentLoaded",setupShell);
