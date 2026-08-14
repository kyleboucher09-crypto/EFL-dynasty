
const EFL_ID="1313240395462742016", EFL_API="https://api.sleeper.app/v1";
const $=s=>document.querySelector(s);
async function apiGet(path){const r=await fetch(EFL_API+path);if(!r.ok)throw new Error("Sleeper "+r.status);return r.json()}
function teamName(user,roster){return user?.metadata?.team_name||user?.display_name||(roster?`Roster ${roster.roster_id}`:"EFL Team")}
function setupShell(){
 const page=location.pathname.split("/").pop()||"index.html";
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute("href")===page)a.classList.add("active")});
 const btn=$("#menuBtn"),menu=$("#mobileMenu");
 if(btn&&menu){btn.addEventListener("click",()=>{const open=menu.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));btn.textContent=open?"✕":"☰"});
 document.addEventListener("click",e=>{if(menu.classList.contains("open")&&!menu.contains(e.target)&&e.target!==btn){menu.classList.remove("open");btn.textContent="☰";btn.setAttribute("aria-expanded","false")}})}
}
document.addEventListener("DOMContentLoaded",setupShell);
