import {json,noStore} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const REPORT_SOURCE='https://raw.githubusercontent.com/kyleboucher09-crypto/EFL-dynasty/main/weekly-report.json';
const REPORT_URL='https://www.efldynasty.com/#game-day';
const LOGO_URL='https://www.efldynasty.com/Assets/efl-logo.jpeg';

function canonical(v){
  return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
}
function clip(v,max=420){
  const s=String(v||'').trim();
  return s.length>max?s.slice(0,max-1).trimEnd()+'…':s;
}

async function loadReport(){
  const r=await fetch(`${REPORT_SOURCE}?v=${Date.now()}`,{
    cache:'no-store',
    headers:{'User-Agent':'EFL-Discord-Announcements/1.0'}
  });
  if(!r.ok) throw new Error(`Could not load EFL Weekly (${r.status})`);
  const data=await r.json();
  if(!data?.headline||!data?.published) throw new Error('EFL Weekly data is incomplete');
  return data;
}

function buildMessage(data){
  const marker=`EFL Weekly • ${data.published} • ${data.headline}`;
  const fields=[];
  const lead=data.lead||{};
  if(lead.title){
    fields.push({
      name:`🗞️ ${lead.tag||'Lead Story'}`,
      value:`**${clip(lead.title,180)}**\n${clip(lead.body||'',520)}`,
      inline:false
    });
  }
  for(const brief of (Array.isArray(data.briefs)?data.briefs:[]).slice(0,3)){
    fields.push({
      name:`${brief.icon||'•'} ${brief.label||'Around the EFL'}`,
      value:`**${clip(brief.title||'',160)}**\n${clip(brief.body||'',260)}`,
      inline:false
    });
  }
  return {
    marker,
    body:{
      allowed_mentions:{parse:[]},
      embeds:[{
        author:{name:data.edition||`EFL Weekly · Week ${data.week||''}`},
        title:`📰 ${data.headline}`,
        url:REPORT_URL,
        description:clip(data.dek||'The latest stories shaping the EFL Dynasty league.',520),
        color:8200905,
        thumbnail:{url:LOGO_URL},
        fields,
        footer:{text:marker}
      }],
      components:[{
        type:1,
        components:[{type:2,style:5,label:'Read EFL Weekly',url:REPORT_URL,emoji:{name:'📰'}}]
      }]
    }
  };
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot is not configured'});
  try{
    const [data,guild,bot]=await Promise.all([loadReport(),resolveGuild(),getBotUser()]);
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
    return json(res,e.status&&e.status>=400&&e.status<500?e.status:502,{error:e.message||'EFL Weekly announcement failed'});
  }
}
