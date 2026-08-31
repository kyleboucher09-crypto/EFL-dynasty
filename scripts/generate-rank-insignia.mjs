import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'Assets','ranks-football');
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

const badge='M79 29Q160 4 241 29q45 16 45 73v108q0 91-126 134Q34 301 34 210V102q0-57 45-73Z';
const inset='M88 50q72-22 144 0 32 12 32 54v102q0 72-104 113Q56 278 56 206V104q0-42 32-54Z';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function star(cx,cy,r=17){
 const points=[];
 for(let i=0;i<10;i++){
  const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.44;
  points.push(`${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`);
 }
 return `<polygon points="${points.join(' ')}" fill="url(#goldMetal)" stroke="#6b4300" stroke-width="2"/><path d="M${cx-r*.25} ${cy-r*.42}q${r*.35} ${-r*.28} ${r*.7} 0" fill="none" stroke="#fff8cf" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>`;
}

function fieldBands(count){
 return Array.from({length:count},(_,i)=>{
  const y=287-i*27;
  return `<g filter="url(#thread)"><path d="M91 ${y}Q160 ${y+11} 229 ${y}" fill="none" stroke="#020712" stroke-width="17" stroke-linecap="round"/><path d="M91 ${y}Q160 ${y+11} 229 ${y}" fill="none" stroke="url(#blueThread)" stroke-width="10" stroke-linecap="round"/><path d="M112 ${y+1}v7m24-5v7m24-5v7m24-5v7m24-7v7" stroke="#e9f6ff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/></g>`;
 }).join('');
}

function football(hall=false){
 const fill=hall?'url(#sapphireMetal)':'url(#blueThread)';
 const rim=hall?'url(#goldMetal)':'#d9f0ff';
 return `<g filter="url(#lift)">
  <path d="M121 134c20-19 56-21 78-1 22 20 19 50-3 72-22 21-57 23-79 2-22-20-19-51 4-73Z" fill="${fill}" stroke="#020712" stroke-width="8"/>
  <path d="M126 138c17-15 48-17 67-1 18 16 16 41-3 59-18 18-48 20-67 3-18-17-16-42 3-61Z" fill="none" stroke="${rim}" stroke-width="3.5"/>
  <path d="M137 137c10 7 18 15 26 24s16 19 22 30" fill="none" stroke="#f7fbff" stroke-width="5" stroke-linecap="round"/>
  <path d="M146 145l-8 8m17 1-8 9m18 0-8 9m18 0-8 9" stroke="#f7fbff" stroke-width="4" stroke-linecap="round"/>
  ${hall?'<path d="M133 143q21-19 45-12" fill="none" stroke="#fff8cf" stroke-width="4" stroke-linecap="round" opacity=".78"/>':''}
 </g>`;
}

function kickTrails(){
 return `<g fill="none" stroke-linecap="round" filter="url(#thread)">
  <path d="M98 142Q70 157 73 187" stroke="#020712" stroke-width="15"/><path d="M98 142Q70 157 73 187" stroke="url(#blueThread)" stroke-width="8"/><path d="M222 142q28 15 25 45" stroke="#020712" stroke-width="15"/><path d="M222 142q28 15 25 45" stroke="url(#blueThread)" stroke-width="8"/>
  <path d="M82 199q16 18 38 23m118-23q-16 18-38 23" stroke="#7bc4ff" stroke-width="5" stroke-dasharray="4 8"/>
 </g>`;
}

function goalpost(){
 return `<g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#thread)">
  <path d="M112 111v46h96v-46M160 157v72" stroke="#020712" stroke-width="15"/>
  <path d="M112 111v46h96v-46M160 157v72" stroke="url(#silverMetal)" stroke-width="8"/>
  <path d="M114 111v43h92v-43" stroke="#ffffff" stroke-width="2" opacity=".8"/>
 </g>`;
}

function veteranFinish(){
 return `<g filter="url(#thread)">
  <path d="${badge}" fill="none" stroke="url(#silverMetal)" stroke-width="7" opacity=".95"/>
  <path d="M62 118q-7 51 0 101m196-101q7 51 0 101" fill="none" stroke="#dce7f2" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>
  <path d="M82 235q-8 24 12 46m144-46q8 24-12 46" fill="none" stroke="url(#silverMetal)" stroke-width="8" stroke-linecap="round"/>
 </g>`;
}

function allProFinish(){
 return `<g filter="url(#lift)">
  <circle cx="160" cy="171" r="63" fill="none" stroke="#020712" stroke-width="14"/>
  <circle cx="160" cy="171" r="63" fill="none" stroke="url(#silverMetal)" stroke-width="8"/>
  <circle cx="160" cy="171" r="58" fill="none" stroke="url(#goldMetal)" stroke-width="3"/>
  <path d="M108 146 73 130l27 31-35 2 40 18M212 146l35-16-27 31 35 2-40 18" fill="none" stroke="#020712" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M108 146 73 130l27 31-35 2 40 18M212 146l35-16-27 31 35 2-40 18" fill="none" stroke="url(#goldMetal)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#dff3ff" stroke="#45a3ff" stroke-width="1"><circle cx="83" cy="93" r="4"/><circle cx="97" cy="88" r="4"/><circle cx="111" cy="86" r="4"/><circle cx="209" cy="86" r="4"/><circle cx="223" cy="88" r="4"/><circle cx="237" cy="93" r="4"/></g>
 </g>`;
}

function captainStars(count){
 const xs={1:[160],2:[139,181],3:[118,160,202],4:[97,139,181,223]}[count];
 return `<g filter="url(#lift)">${xs.map(x=>star(x,42,count===1?20:16)).join('')}</g>`;
}

function captainTrim(count){
 return `<g><path d="M75 30Q160 5 245 30" fill="none" stroke="url(#goldMetal)" stroke-width="${4+count}" stroke-linecap="round"/><path d="M82 36Q160 16 238 36" fill="none" stroke="#fff4b8" stroke-width="1.5" opacity=".85"/></g>`;
}

function laurels(){
 const left=[[48,269,-31],[38,239,-23],[34,207,-15],[35,173,-5],[42,139,7],[54,109,18],[70,83,29]];
 const leaves=left.map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="8" ry="20" transform="rotate(${r} ${x} ${y})"/>`).join('');
 const right=left.map(([x,y,r])=>`<ellipse cx="${320-x}" cy="${y}" rx="8" ry="20" transform="rotate(${-r} ${320-x} ${y})"/>`).join('');
 return `<g fill="url(#goldMetal)" stroke="#6b4300" stroke-width="2" filter="url(#lift)"><path d="M68 311Q8 223 47 122Q61 87 91 65" fill="none" stroke="url(#goldMetal)" stroke-width="8"/><path d="M252 311q60-88 21-189-14-35-44-57" fill="none" stroke="url(#goldMetal)" stroke-width="8"/>${leaves}${right}</g>`;
}

function hallFinish(){
 return `<g filter="url(#lift)">
  <circle cx="160" cy="171" r="78" fill="none" stroke="#020712" stroke-width="20" opacity=".9"/>
  <circle cx="160" cy="171" r="78" fill="none" stroke="url(#goldMetal)" stroke-width="12"/>
  <circle cx="160" cy="171" r="69" fill="none" stroke="url(#silverMetal)" stroke-width="4"/>
  <path d="M91 83V62Q160 4 229 62v21" fill="none" stroke="#020712" stroke-width="18" stroke-linecap="round"/>
  <path d="M91 83V62Q160 4 229 62v21" fill="none" stroke="url(#goldMetal)" stroke-width="10" stroke-linecap="round"/>
  <path d="M85 77h24v49H85m126-49h24v49h-24" fill="none" stroke="url(#silverMetal)" stroke-width="8" stroke-linejoin="round"/>
  <path d="M79 126h36m90 0h36" stroke="url(#goldMetal)" stroke-width="10" stroke-linecap="round"/>
  <path d="M122 16 128 30 143 35 128 40 122 55 116 40 101 35 116 30Zm76 19 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#fff8cf" stroke="url(#goldMetal)" stroke-width="2"/>
 </g>`;
}

function brand(level){
 const y=level>=7?82:75;
 return `<g filter="url(#thread)"><rect x="119" y="${y-22}" width="82" height="29" rx="8" fill="#061225" stroke="${level>=6?'url(#goldMetal)':'#45a3ff'}" stroke-width="3"/><text x="160" y="${y}" text-anchor="middle" fill="#f5f9ff" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="900" letter-spacing="4">EFL</text></g>`;
}

function svg(name,level){
 const bandCount=Math.min(level,3),veteran=level>=5,allPro=level>=6,legend=level>=11,hall=level>=12;
 const starCount=level>=10?4:level>=7?level-6:0;
 const desc=[`${bandCount} stitched field stripe${bandCount===1?'':'s'}`,'football',level>=3?'kick-return trails':'',level>=4?'goalposts':'',veteran?'silver veteran thread':'',allPro?'All-Pro metallic ring and stadium lights':'',starCount?`${starCount} gold captain star${starCount===1?'':'s'}`:'',legend?'gold laurels':'',hall?'Hall of Fame gold medallion and arch':''].filter(Boolean).join(', ');
 return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" role="img" aria-labelledby="title desc">
 <title id="title">${esc(name)} rank insignia</title>
 <desc id="desc">EFL Dynasty football-club rank patch with ${esc(desc)}.</desc>
 <defs>
  <linearGradient id="navyFabric" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#132b50"/><stop offset=".42" stop-color="#07162b"/><stop offset="1" stop-color="#020712"/></linearGradient>
  <linearGradient id="blueThread" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9bd9ff"/><stop offset=".25" stop-color="#45a3ff"/><stop offset=".7" stop-color="#1769e8"/><stop offset="1" stop-color="#0a347c"/></linearGradient>
  <linearGradient id="silverMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".2" stop-color="#9fb1c7"/><stop offset=".43" stop-color="#eef6ff"/><stop offset=".68" stop-color="#6f8298"/><stop offset=".88" stop-color="#ffffff"/><stop offset="1" stop-color="#53657a"/></linearGradient>
  <linearGradient id="goldMetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8cf"/><stop offset=".18" stop-color="#ffd979"/><stop offset=".42" stop-color="#a96c00"/><stop offset=".62" stop-color="#ffe89a"/><stop offset=".82" stop-color="#e8b84a"/><stop offset="1" stop-color="#784900"/></linearGradient>
  <radialGradient id="sapphireMetal" cx="35%" cy="25%"><stop stop-color="#b9e8ff"/><stop offset=".22" stop-color="#45a3ff"/><stop offset=".62" stop-color="#1769e8"/><stop offset="1" stop-color="#041b4d"/></radialGradient>
  <pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 7 7-2M1 9 9 1" stroke="#8fb9e8" stroke-width="1" opacity=".13"/></pattern>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="175%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".68"/></filter>
  <filter id="lift" x="-25%" y="-25%" width="150%" height="165%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".7"/></filter>
  <filter id="thread" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="1.3" flood-color="#000" flood-opacity=".62"/></filter>
 </defs>
 ${hall?'<circle cx="160" cy="174" r="151" fill="none" stroke="url(#goldMetal)" stroke-width="8" opacity=".8"/>':''}
 <g filter="url(#shadow)">
  <path d="${badge}" fill="#020712" stroke="#1769e8" stroke-width="19" opacity=".22"/>
  <path d="${badge}" fill="url(#navyFabric)" stroke="url(#blueThread)" stroke-width="10" stroke-linejoin="round"/>
  <path d="${inset}" fill="url(#weave)" stroke="#45a3ff" stroke-width="2.5" stroke-dasharray="4 5" opacity=".92"/>
  <path d="M67 107q93-39 186 0" fill="none" stroke="#45a3ff" stroke-width="3" opacity=".35"/>
 </g>
 ${legend?laurels():''}
 ${starCount?captainTrim(starCount):''}
 ${brand(level)}
 ${level>=3?kickTrails():''}
 ${level>=4?goalpost():''}
 ${allPro?allProFinish():''}
 ${football(hall)}
 ${fieldBands(bandCount)}
 ${veteran?veteranFinish():''}
 ${starCount?captainStars(starCount):''}
 ${hall?hallFinish():''}
</svg>\n`;
}

for(const [file,name,level] of levels)writeFileSync(join(out,`rank-${file}.svg`),svg(name,level));
console.log(`Generated ${levels.length} football-club rank patches in ${out}`);
