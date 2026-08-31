import {json,noStore} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const RANKINGS_SOURCE='https://raw.githubusercontent.com/kyleboucher09-crypto/EFL-dynasty/main/power-rankings-data.json';
const RANKINGS_URL='https://www.efldynasty.com/power-rankings.html';
const LOGO_URL='https://www.efldynasty.com/Assets/efl-logo.jpeg';

function canonical(v){
  return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
}

async function loadRankings(){
  const r=await fetch(`${RANKINGS_SOURCE}?v=${Date.now()}`,{
    cache:'no-store',
    headers:{'User-Agent':'EFL-Discord-Announcements/1.0'}
  });
  if(!r.ok) throw new Error(`Could not load rankings data (${r.status})`);
  const data=await r.json();
  if(!data?.generated_at||!Array.isArray(data.rankings)||!data.rankings.length) throw new Error('Rankings data is incomplete');
  return data;
}

function delta(row){
  const current=Number(row?.rank||0), previous=Number(row?.previous_rank||current);
  return previous-current;
}

function movementText(row){
  const d=delta(row);
  if(d>0) return `⬆️ Up ${d}`;
  if(d<0) return `⬇️ Down ${Math.abs(d)}`;
  return '➖ No change';
}

function topThree(rankings){
  return rankings.slice(0,3).map(x=>{
    const score=Number.isFinite(Number(x.power))?` · **${Number(x.power).toFixed(1)}**`:'';
    return `**${x.rank}. ${x.team}**${score}\n${movementText(x)}`;
  }).join('\n\n');
}

function biggest(rankings,direction){
  const rows=rankings.map(x=>({row:x,d:delta(x)}));
  const filtered=direction==='up'?rows.filter(x=>x.d>0):rows.filter(x=>x.d<0);
  if(!filtered.length) return null;
  filtered.sort((a,b)=>direction==='up'?b.d-a.d:a.d-b.d);
  const x=filtered[0];
  return direction==='up'
    ? `**${x.row.team}** — up ${x.d} spot${x.d===1?'':'s'} to No. ${x.row.rank}`
    : `**${x.row.team}** — down ${Math.abs(x.d)} spot${Math.abs(x.d)===1?'':'s'} to No. ${x.row.rank}`;
}

function buildMessage(data){
  const week=Number(data.week||data.source_week||1);
  const rise=biggest(data.rankings,'up');
  const fall=biggest(data.rankings,'down');
  const fields=[{name:'🏆 Top 3',value:topThree(data.rankings),inline:false}];
  if(rise) fields.push({name:'📈 Biggest Riser',value:rise,inline:true});
  if(fall) fields.push({name:'📉 Biggest Faller',value:fall,inline:true});
  const marker=`EFL Power Rankings • ${data.generated_at}`;
  return {
    marker,
    body:{
      allowed_mentions:{parse:[]},
      embeds:[{
        title:`👑 EFL POWER RANKINGS — WEEK ${week}`,
        url:RANKINGS_URL,
        description:'The latest EFL Dynasty Power Rankings are live. See who climbed, who fell, and where every franchise stands this week.',
        color:8200905,
        thumbnail:{url:LOGO_URL},
        fields,
        footer:{text:marker},
        timestamp:data.generated_at
      }],
      components:[{
        type:1,
        components:[{type:2,style:5,label:'View Power Rankings',url:RANKINGS_URL,emoji:{name:'📈'}}]
      }]
    }
  };
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot is not configured'});
  try{
    const [data,guild,bot]=await Promise.all([loadRankings(),resolveGuild(),getBotUser()]);
    const channels=await getGuildChannels(guild.id);
    const hub=(channels||[]).find(c=>c.type===0&&canonical(c.name)==='efl-hub');
    if(!hub) return json(res,404,{error:'EFL Hub channel was not found'});

    const {marker,body}=buildMessage(data);
    let recent=[];
    try{recent=await discord(`/channels/${hub.id}/messages?limit=50`)}catch{}
    const existing=(recent||[]).find(m=>
      String(m.author?.id)===String(bot.id)&&
      (m.embeds||[]).some(e=>String(e.footer?.text||'')===marker)
    );
    if(existing) return json(res,200,{ok:true,posted:false,deduped:true,message_id:existing.id,week:data.week});

    const post=await discord(`/channels/${hub.id}/messages`,{method:'POST',body});
    return json(res,200,{ok:true,posted:true,message_id:post.id,channel_id:hub.id,week:data.week});
  }catch(e){
    return json(res,e.status&&e.status>=400&&e.status<500?e.status:502,{error:e.message||'Discord announcement failed'});
  }
}
