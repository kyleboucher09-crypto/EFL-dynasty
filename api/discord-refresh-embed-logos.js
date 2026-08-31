import {json,noStore} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const LOGO_URL='https://www.efldynasty.com/Assets/efl-logo.jpeg?v=efl-2026-08-31';
const CRON_SCHEDULE='*/5 * * * *';

function canonical(v){return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')}
function authorized(req){
  const secret=String(process.env.CRON_SECRET||'').trim();
  if(secret) return String(req.headers.authorization||'')===`Bearer ${secret}`;
  return String(req.headers['x-vercel-cron-schedule']||'')===CRON_SCHEDULE;
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(!authorized(req)) return json(res,401,{error:'Unauthorized'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot is not configured'});
  try{
    const [guild,bot]=await Promise.all([resolveGuild(),getBotUser()]);
    const channels=await getGuildChannels(guild.id);
    const targets=(channels||[]).filter(c=>c.type===0&&['league-feed','efl-hub'].includes(canonical(c.name)));
    let scanned=0,updated=0;
    const details=[];
    for(const channel of targets){
      let messages=[];
      try{messages=await discord(`/channels/${channel.id}/messages?limit=50`)}catch(e){details.push({channel:channel.name,error:e.message});continue}
      let channelUpdated=0;
      for(const message of messages||[]){
        if(String(message.author?.id)!==String(bot.id)||!Array.isArray(message.embeds)||!message.embeds.length) continue;
        scanned++;
        const embeds=message.embeds.map(e=>JSON.parse(JSON.stringify(e)));
        let changed=false;
        for(const embed of embeds){
          const thumb=String(embed?.thumbnail?.url||'');
          if(thumb.includes('/Assets/efl-logo.jpeg')&&thumb!==LOGO_URL){
            embed.thumbnail={...(embed.thumbnail||{}),url:LOGO_URL};
            changed=true;
          }
        }
        if(changed){
          await discord(`/channels/${channel.id}/messages/${message.id}`,{method:'PATCH',body:{embeds}});
          updated++;channelUpdated++;
        }
      }
      details.push({channel:channel.name,updated:channelUpdated});
    }
    return json(res,200,{ok:true,logo:LOGO_URL,channels:targets.length,scanned,updated,details});
  }catch(e){return json(res,e.status&&e.status>=400&&e.status<500?e.status:502,{error:e.message||'Discord logo refresh failed'})}
}
