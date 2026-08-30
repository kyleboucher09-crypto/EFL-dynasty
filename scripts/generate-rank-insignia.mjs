import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'Assets','ranks');
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

const shield='M160 28 276 68v128c0 69-46 119-116 142C90 315 44 265 44 196V68Z';
const innerShield='M160 47 257 81v113c0 57-36 99-97 121-61-22-97-64-97-121V81Z';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function star(cx,cy,r=17){
  const pts=[];
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.43;
    pts.push(`${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="url(#gold)" stroke="#5e3b00" stroke-width="2.2"/><polygon points="${pts.join(' ')}" fill="none" stroke="#fff1a8" stroke-width="1" opacity=".72"/>`;
}

function chevrons(count){
  return Array.from({length:count},(_,i)=>{
    const y=282-i*29;
    return `<path d="M98 ${y} 160 ${y+25} 222 ${y}" fill="none" stroke="#020712" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><path d="M98 ${y} 160 ${y+25} 222 ${y}" fill="none" stroke="url(#blue)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M100 ${y-2} 160 ${y+22} 220 ${y-2}" fill="none" stroke="#8ed2ff" stroke-width="2" stroke-linecap="round" opacity=".82"/>`;
  }).join('');
}

function football(){
  return `<g filter="url(#raised)">
    <path d="M122 124c20-19 55-21 76-2 21 19 18 48-3 69-21 21-55 23-77 3-21-20-18-49 4-70Z" fill="url(#blue)" stroke="#020712" stroke-width="8"/>
    <path d="M125 128c18-15 48-17 67-1 18 16 16 40-3 59-18 18-47 20-66 3-18-17-16-41 2-61Z" fill="none" stroke="#d8efff" stroke-width="3" opacity=".9"/>
    <path d="M136 129c10 7 18 15 26 24s16 19 22 29" fill="none" stroke="#f7fbff" stroke-width="5" stroke-linecap="round"/>
    <path d="M145 137l-7 8m16 1-7 9m17 0-8 9m17 0-8 9" stroke="#f7fbff" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

function serviceRocker(gold=false){
  const fill=gold?'url(#gold)':'url(#silver)';
  const hi=gold?'#fff1a8':'#ffffff';
  return `<path d="M88 323Q160 357 232 323" fill="none" stroke="#020712" stroke-width="21" stroke-linecap="round"/><path d="M88 323Q160 357 232 323" fill="none" stroke="${fill}" stroke-width="13" stroke-linecap="round"/><path d="M91 320Q160 351 229 320" fill="none" stroke="${hi}" stroke-width="2" stroke-linecap="round" opacity=".75"/>`;
}

function wings(){
  return `<g filter="url(#raised)">
    <path d="M116 143 72 121 109 159 65 151 111 174 74 183 122 189" fill="none" stroke="#020712" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M204 143 248 121 211 159 255 151 209 174 246 183 198 189" fill="none" stroke="#020712" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M116 143 72 121 109 159 65 151 111 174 74 183 122 189" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M204 143 248 121 211 159 255 151 209 174 246 183 198 189" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M113 144 75 125m36 34-40-6m41 21-32 8M207 144l38-19m-36 34 40-6m-41 21 32 8" stroke="#fff1a8" stroke-width="2" stroke-linecap="round" opacity=".78"/>
  </g>`;
}

function captainStars(count){
  const xs={1:[160],2:[138,182],3:[116,160,204],4:[94,138,182,226]}[count];
  return `<g filter="url(#raised)">${xs.map(x=>star(x,92,count===1?20:17)).join('')}</g>`;
}

function laurels(){
  const leftLeaves=[[46,258,-28],[39,228,-20],[36,197,-12],[39,164,-3],[47,132,8],[60,102,19],[77,78,30]];
  const leaves=leftLeaves.map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="9" ry="21" transform="rotate(${r} ${x} ${y})"/>`).join('');
  const mirror=leftLeaves.map(([x,y,r])=>`<ellipse cx="${320-x}" cy="${y}" rx="9" ry="21" transform="rotate(${-r} ${320-x} ${y})"/>`).join('');
  return `<g fill="url(#gold)" stroke="#5e3b00" stroke-width="2" filter="url(#raised)"><path d="M68 302Q12 223 49 126Q63 88 98 61" fill="none" stroke="url(#gold)" stroke-width="8"/><path d="M252 302q56-79 19-176-14-38-49-65" fill="none" stroke="url(#gold)" stroke-width="8"/>${leaves}${mirror}</g>`;
}

function hallArch(){
  return `<g filter="url(#raised)">
    <path d="M91 76V51Q160-12 229 51v25" fill="none" stroke="#020712" stroke-width="20" stroke-linecap="round"/>
    <path d="M91 76V51Q160-12 229 51v25" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>
    <path d="M100 73V53Q160 2 220 53v20" fill="none" stroke="#fff1a8" stroke-width="2" opacity=".8"/>
    <path d="M82 76h30v18H82zm126 0h30v18h-30z" fill="url(#silver)" stroke="#5b6b7f" stroke-width="3"/>
    <path d="M88 92h18v48H88zm126 0h18v48h-18z" fill="url(#silver)" stroke="#5b6b7f" stroke-width="3"/>
    <path d="M77 136h40v13H77zm126 0h40v13h-40z" fill="url(#gold)" stroke="#5e3b00" stroke-width="3"/>
    <circle cx="160" cy="43" r="18" fill="url(#silver)" stroke="url(#gold)" stroke-width="5"/>
    <path d="M153 31v24m-6-15h26m-24 7h22" stroke="#1769e8" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function svg(name,level){
  const chevronCount=Math.min(level,3);
  const veteran=level>=5,allPro=level>=6,captain=level>=7&&level<=10,legend=level>=11,hof=level>=12;
  const starCount=level>=10?4:level>=7?level-6:0;
  const trim=allPro?'url(#gold)':veteran?'url(#silver)':'url(#blue)';
  const description=[
    `${chevronCount} blue chevron${chevronCount===1?'':'s'}`,
    level>=4?'central football':'',veteran?'service trim':'',allPro?'gold wings':'',starCount?`${starCount} captain star${starCount===1?'':'s'}`:'',legend?'gold laurels':'',hof?'Hall of Fame arch':''
  ].filter(Boolean).join(', ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" role="img" aria-labelledby="title desc">
  <title id="title">${esc(name)} rank insignia</title>
  <desc id="desc">EFL Dynasty additive football rank badge with ${esc(description)}.</desc>
  <defs>
    <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10264a"/><stop offset=".45" stop-color="#061225"/><stop offset="1" stop-color="#020712"/></linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7bc4ff"/><stop offset=".38" stop-color="#45a3ff"/><stop offset=".72" stop-color="#1769e8"/><stop offset="1" stop-color="#0b327d"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1a8"/><stop offset=".3" stop-color="#ffd979"/><stop offset=".68" stop-color="#e8b84a"/><stop offset="1" stop-color="#845500"/></linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".38" stop-color="#dce7f2"/><stop offset=".72" stop-color="#9fb1c7"/><stop offset="1" stop-color="#53657a"/></linearGradient>
    <pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 7 7-2M1 9 9 1" stroke="#8fb9e8" stroke-width="1" opacity=".12"/></pattern>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000000" flood-opacity=".65"/></filter>
    <filter id="raised" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity=".65"/></filter>
  </defs>
  ${legend?laurels():''}
  ${hof?hallArch():''}
  <g filter="url(#shadow)">
    <path d="${shield}" fill="#020712" stroke="#45a3ff" stroke-width="20" opacity=".22"/>
    <path d="${shield}" fill="url(#navy)" stroke="${trim}" stroke-width="10" stroke-linejoin="round"/>
    <path d="${innerShield}" fill="url(#weave)" stroke="${trim}" stroke-width="2.4" stroke-dasharray="4 5" opacity=".9"/>
    <path d="M160 39v282" stroke="#45a3ff" stroke-width="1.5" opacity=".18"/>
  </g>
  ${allPro?wings():''}
  ${level>=4?football():''}
  ${captain||legend?captainStars(starCount):''}
  ${chevrons(chevronCount)}
  ${veteran?serviceRocker(allPro):''}
  ${legend?`<path d="M118 57h84" stroke="url(#gold)" stroke-width="9" stroke-linecap="round"/><path d="M132 48h56" stroke="#fff1a8" stroke-width="2" stroke-linecap="round" opacity=".8"/>`:''}
  ${hof?`<circle cx="160" cy="158" r="58" fill="none" stroke="url(#silver)" stroke-width="5" opacity=".95"/><circle cx="160" cy="158" r="64" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".9"/>`:''}
</svg>\n`;
}

for(const [file,name,level] of levels)writeFileSync(join(out,`rank-${file}.svg`),svg(name,level));
console.log(`Generated ${levels.length} rank insignias in ${out}`);
