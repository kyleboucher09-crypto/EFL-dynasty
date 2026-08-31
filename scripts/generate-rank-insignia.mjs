import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'Assets','legacy-ranks-v3');
mkdirSync(out,{recursive:true});

const levels=[
 ['01-prospect','Prospect',1],
 ['02-rookie','Rookie',2],
 ['03-special-teamer','Special Teamer',3],
 ['04-starter','Starter',4],
 ['05-veteran','Veteran',5],
 ['06-all-pro','All-Pro',6],
 ['07-captain-1','Captain One Star',7],
 ['08-captain-2','Captain Two Stars',8],
 ['09-captain-3','Captain Three Stars',9],
 ['10-captain-4','Captain Four Stars',10],
 ['11-franchise-legend','Franchise Legend',11],
 ['12-hall-of-famer','Hall of Famer',12]
];

const shield='M180 19 304 62v139c0 75-52 124-124 148C108 325 56 276 56 201V62Z';
const shieldInset='M180 42 281 77v121c0 60-39 101-101 126C118 299 79 258 79 198V77Z';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function star(cx,cy,r=17){
 const pts=[];
 for(let i=0;i<10;i++){
  const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.44;
  pts.push(`${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`);
 }
 return `<g filter="url(#lift)"><polygon points="${pts.join(' ')}" fill="url(#gold)" stroke="#5f3900" stroke-width="2.2"/><path d="M${cx-r*.28} ${cy-r*.4}q${r*.35} ${-r*.25} ${r*.72} 0" fill="none" stroke="#fff8cf" stroke-width="1.7" stroke-linecap="round"/></g>`;
}

function jerseyOval(level){
 const rx=level===1?84:level===2?96:104;
 const ry=level===1?119:level===2?130:137;
 const outer=level>=6?'url(#silver)':level>=5?'url(#silver)':'url(#blue)';
 return `<g filter="url(#shadow)">
  <ellipse cx="180" cy="190" rx="${rx+8}" ry="${ry+8}" fill="#020712" stroke="#1769e8" stroke-width="17" opacity=".2"/>
  <ellipse cx="180" cy="190" rx="${rx}" ry="${ry}" fill="url(#cloth)" stroke="${outer}" stroke-width="9"/>
  <ellipse cx="180" cy="190" rx="${rx-15}" ry="${ry-15}" fill="url(#weave)" stroke="#45a3ff" stroke-width="2.4" stroke-dasharray="4 5"/>
  ${level>=2?`<ellipse cx="180" cy="190" rx="${rx-7}" ry="${ry-7}" fill="none" stroke="#8ed2ff" stroke-width="2" opacity=".75"/>`:''}
 </g>`;
}

function specialWings(metal=false){
 const fill=metal?'url(#gold)':'url(#blue)';
 const shine=metal?'#fff0a8':'#a8deff';
 return `<g filter="url(#lift)">
  <path d="M96 137 38 111l31 39-52 9 61 20-48 24 72 5M264 137l58-26-31 39 52 9-61 20 48 24-72 5" fill="none" stroke="#020712" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M96 137 38 111l31 39-52 9 61 20-48 24 72 5M264 137l58-26-31 39 52 9-61 20 48 24-72 5" fill="none" stroke="${fill}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M91 138 43 117m32 35-49 8m58 20-43 21M269 138l48-21m-32 35 49 8m-58 20 43 21" stroke="${shine}" stroke-width="2.5" stroke-linecap="round" opacity=".82"/>
 </g>`;
}

function varsityShield(level){
 const stroke=level>=10?'url(#gold)':level>=5?'url(#silver)':'url(#blue)';
 return `<g filter="url(#shadow)">
  <path d="${shield}" fill="#020712" stroke="#1769e8" stroke-width="19" opacity=".22"/>
  <path d="${shield}" fill="url(#cloth)" stroke="${stroke}" stroke-width="11" stroke-linejoin="round"/>
  <path d="${shieldInset}" fill="url(#weave)" stroke="#45a3ff" stroke-width="2.5" stroke-dasharray="4 6" opacity=".88"/>
 </g>`;
}

function fieldMarkers(count){
 return Array.from({length:count},(_,i)=>{
  const y=279-i*27,w=levelWidth(i);
  return `<g filter="url(#thread)"><path d="M${180-w} ${y}Q180 ${y+10} ${180+w} ${y}" fill="none" stroke="#020712" stroke-width="18" stroke-linecap="round"/><path d="M${180-w} ${y}Q180 ${y+10} ${180+w} ${y}" fill="none" stroke="url(#blue)" stroke-width="10" stroke-linecap="round"/><path d="M${180-w+23} ${y+1}v7m25-4v7m25-5v7m25-5v7m25-4v7" stroke="#f1f9ff" stroke-width="2.1" stroke-linecap="round" opacity=".9"/></g>`;
 }).join('');
}

function levelWidth(i){return 70-i*4;}

function goalpost(){
 return `<g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#thread)">
  <path d="M129 104v51h102v-51M180 155v81" stroke="#020712" stroke-width="17"/>
  <path d="M129 104v51h102v-51M180 155v81" stroke="url(#silver)" stroke-width="9"/>
  <path d="M132 104v47h96v-47" stroke="#fff" stroke-width="2" opacity=".8"/>
 </g>`;
}

function core(level){
 const hall=level===12,fill=hall?'url(#sapphire)':'url(#blue)';
 return `<g filter="url(#lift)">
  <path d="M135 132c23-21 64-23 89-1 25 22 22 56-3 80-25 23-65 25-90 2-24-23-21-57 4-81Z" fill="${fill}" stroke="#020712" stroke-width="9"/>
  <path d="M141 137c20-17 54-19 76-1 21 19 18 48-3 68-21 19-55 21-76 1-20-19-18-48 3-68Z" fill="none" stroke="${level>=6?'url(#silver)':'#dff3ff'}" stroke-width="4"/>
  <path d="M151 137c11 8 20 17 29 27s18 21 25 34" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <path d="M160 146l-8 9m18 1-9 10m19 0-9 10m20 0-9 10" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  ${hall?'<path d="M148 143q27-21 55-9" fill="none" stroke="#fff6bf" stroke-width="5" stroke-linecap="round" opacity=".9"/>':''}
 </g>
 <g filter="url(#thread)"><rect x="141" y="97" width="78" height="28" rx="8" fill="#061326" stroke="${level>=6?'url(#gold)':'#45a3ff'}" stroke-width="3"/><text x="180" y="118" text-anchor="middle" fill="#f7fbff" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="900" letter-spacing="4">EFL</text></g>`;
}

function veteranFrame(){
 return `<g filter="url(#thread)">
  <path d="${shield}" fill="none" stroke="url(#silver)" stroke-width="7"/>
  <path d="M78 115q-7 56 0 111m204-111q7 56 0 111" fill="none" stroke="#eff7ff" stroke-width="3" stroke-dasharray="5 7" stroke-linecap="round"/>
  <path d="M103 310q77 34 154 0" fill="none" stroke="url(#silver)" stroke-width="11" stroke-linecap="round"/>
 </g>`;
}

function allProBurst(){
 return `<g filter="url(#lift)">
  <path d="M180 4 196 44 226 13 229 57 270 37 254 79 302 74 272 109 323 120 280 144 328 171 277 178 314 216 264 207 285 254 239 232 239 282 207 245 180 294 153 245 121 282 121 232 75 254 96 207 46 216 83 178 32 171 80 144 37 120 88 109 58 74 106 79 90 37 131 57 134 13 164 44Z" fill="url(#silver)" stroke="#53657a" stroke-width="3" opacity=".9"/>
  <path d="M180 20 191 53 216 28 216 64 250 50 236 85 275 84 247 112 287 123 250 141 286 165 245 168 275 200 234 193 249 231 214 213 212 251 191 221 180 262 169 221 148 251 146 213 111 231 126 193 85 200 115 168 74 165 110 141 73 123 113 112 85 84 124 85 110 50 144 64 144 28 169 53Z" fill="#08162b" opacity=".92"/>
 </g>`;
}

function proRing(level){
 return `<g filter="url(#lift)"><ellipse cx="180" cy="173" rx="72" ry="66" fill="none" stroke="#020712" stroke-width="17"/><ellipse cx="180" cy="173" rx="72" ry="66" fill="none" stroke="${level>=11?'url(#gold)':'url(#silver)'}" stroke-width="9"/><ellipse cx="180" cy="173" rx="65" ry="59" fill="none" stroke="url(#gold)" stroke-width="3"/></g>`;
}

function captainStars(count){
 const xs={1:[180],2:[155,205],3:[130,180,230],4:[107,155,205,253]}[count];
 return xs.map(x=>star(x,51,count===1?21:17)).join('');
}

function promotionGold(count){
 const top=`<path d="M93 66Q180 14 267 66" fill="none" stroke="url(#gold)" stroke-width="${6+count}" stroke-linecap="round"/><path d="M104 65Q180 27 256 65" fill="none" stroke="#fff2ae" stroke-width="2" opacity=".85"/>`;
 const shoulders=count>=2?'<path d="M72 101 39 79 53 124M288 101l33-22-14 45" fill="none" stroke="url(#gold)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>':'';
 const rocker=count>=3?'<path d="M98 326Q180 359 262 326" fill="none" stroke="#020712" stroke-width="20" stroke-linecap="round"/><path d="M98 326Q180 359 262 326" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>':'';
 const frame=count>=4?`<path d="${shield}" fill="none" stroke="url(#gold)" stroke-width="9" opacity=".98"/>`:'';
 return `<g filter="url(#lift)">${top}${shoulders}${rocker}${frame}</g>`;
}

function laurels(){
 const left=[[61,278,-31],[47,247,-23],[42,213,-14],[44,177,-4],[53,142,8],[68,110,20],[88,83,31]];
 const leaves=left.map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="10" ry="23" transform="rotate(${r} ${x} ${y})"/>`).join('');
 const right=left.map(([x,y,r])=>`<ellipse cx="${360-x}" cy="${y}" rx="10" ry="23" transform="rotate(${-r} ${360-x} ${y})"/>`).join('');
 return `<g fill="url(#gold)" stroke="#654000" stroke-width="2" filter="url(#lift)"><path d="M85 318Q12 226 54 126Q70 88 105 66" fill="none" stroke="url(#gold)" stroke-width="9"/><path d="M275 318q73-92 31-192-16-38-51-60" fill="none" stroke="url(#gold)" stroke-width="9"/>${leaves}${right}</g>`;
}

function hallHalo(){
 return `<g filter="url(#lift)">
  <circle cx="180" cy="178" r="168" fill="url(#gold)" stroke="#4f3100" stroke-width="4"/>
  <circle cx="180" cy="178" r="153" fill="#061326" stroke="url(#silver)" stroke-width="8"/>
  <path d="M180 13 193 45 220 20 220 56 253 40 241 75 278 70 254 100 296 106 263 129 306 146 266 157 305 188 260 191 289 230 248 218 262 263 225 239 223 286 195 251 180 303 165 251 137 286 135 239 98 263 112 218 71 230 100 191 55 188 94 157 54 146 97 129 64 106 106 100 82 70 119 75 107 40 140 56 140 20 167 45Z" fill="none" stroke="url(#gold)" stroke-width="8" opacity=".95"/>
 </g>`;
}

function hallFront(){
 return `<g filter="url(#lift)">
  <ellipse cx="180" cy="173" rx="88" ry="81" fill="none" stroke="#020712" stroke-width="23"/>
  <ellipse cx="180" cy="173" rx="88" ry="81" fill="none" stroke="url(#gold)" stroke-width="14"/>
  <ellipse cx="180" cy="173" rx="77" ry="70" fill="none" stroke="url(#silver)" stroke-width="6"/>
  <ellipse cx="180" cy="173" rx="70" ry="63" fill="none" stroke="#45a3ff" stroke-width="3"/>
  <path d="M94 84Q180 9 266 84" fill="none" stroke="#020712" stroke-width="20" stroke-linecap="round"/>
  <path d="M94 84Q180 9 266 84" fill="none" stroke="url(#gold)" stroke-width="11" stroke-linecap="round"/>
  <path d="M107 81Q180 26 253 81" fill="none" stroke="#fff5bf" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
  <g fill="url(#sapphire)" stroke="url(#gold)" stroke-width="3"><circle cx="103" cy="128" r="8"/><circle cx="257" cy="128" r="8"/><circle cx="106" cy="219" r="8"/><circle cx="254" cy="219" r="8"/></g>
  <path d="M123 24 130 40 146 47 130 54 123 70 116 54 100 47 116 40Zm114 15 5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" fill="#fff8cf" stroke="url(#gold)" stroke-width="2"/>
 </g>`;
}

function svg(name,level){
 const markers=Math.min(level,3),shielded=level>=4,veteran=level>=5,allPro=level>=6,captain=level>=7,legend=level>=11,hall=level>=12;
 const stars=level>=10?4:captain?level-6:0;
 const desc=[`${markers} stitched field marker${markers===1?'':'s'}`,'EFL football core',level>=3?'return wings':'',shielded?'varsity shield and goalpost':'',veteran?'silver veteran frame':'',allPro?'All-Pro silver burst and gold ring':'',stars?`${stars} Captain star${stars===1?'':'s'}`:'',legend?'bullion gold laurels':'',hall?'Hall of Fame sapphire and gold medal patch':''].filter(Boolean).join(', ');
 return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" role="img" aria-labelledby="title desc">
 <title id="title">${esc(name)} rank insignia</title>
 <desc id="desc">EFL Dynasty legacy jersey patch with ${esc(desc)}.</desc>
 <defs>
  <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#132d54"/><stop offset=".42" stop-color="#07162b"/><stop offset="1" stop-color="#020712"/></linearGradient>
  <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a5ddff"/><stop offset=".23" stop-color="#45a3ff"/><stop offset=".68" stop-color="#1769e8"/><stop offset="1" stop-color="#092d70"/></linearGradient>
  <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".18" stop-color="#8fa5bd"/><stop offset=".4" stop-color="#f5faff"/><stop offset=".64" stop-color="#66798f"/><stop offset=".85" stop-color="#fff"/><stop offset="1" stop-color="#53657a"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8cf"/><stop offset=".17" stop-color="#ffd979"/><stop offset=".4" stop-color="#9a6100"/><stop offset=".61" stop-color="#fff0a4"/><stop offset=".82" stop-color="#e8b84a"/><stop offset="1" stop-color="#704300"/></linearGradient>
  <radialGradient id="sapphire" cx="34%" cy="24%"><stop stop-color="#d9f5ff"/><stop offset=".2" stop-color="#45a3ff"/><stop offset=".58" stop-color="#1769e8"/><stop offset="1" stop-color="#03143b"/></radialGradient>
  <pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 7 7-2M1 9 9 1" stroke="#8fb9e8" stroke-width="1" opacity=".13"/></pattern>
  <filter id="shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".7"/></filter>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".72"/></filter>
  <filter id="thread" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.2" flood-color="#000" flood-opacity=".64"/></filter>
 </defs>
 ${hall?hallHalo():''}
 ${allPro?allProBurst():''}
 ${level>=3?specialWings(captain):''}
 ${shielded?varsityShield(level):''}
 ${jerseyOval(level)}
 ${shielded?goalpost():''}
 ${allPro?proRing(level):''}
 ${core(level)}
 ${fieldMarkers(markers)}
 ${veteran?veteranFrame():''}
 ${captain?promotionGold(stars):''}
 ${hall?hallFront():''}
 ${captain?captainStars(stars):''}
 ${legend?laurels():''}
</svg>\n`;
}

for(const [file,name,level] of levels)writeFileSync(join(out,`rank-${file}.svg`),svg(name,level));
console.log(`Generated ${levels.length} structural legacy jersey patches in ${out}`);
