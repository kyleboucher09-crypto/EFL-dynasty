import {commissionerOK,json,noStore} from './_common.js';
import {discordConfigured,getApplication,getBotUser,getGuilds,getGuildChannels,hasPermission,BOT_PERMISSIONS,inviteUrl} from './discord-lib.js';

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(!commissionerOK(req)) return json(res,401,{error:'Commissioner session required'});
  if(!discordConfigured()) return json(res,200,{configured:false,message:'DISCORD_BOT_TOKEN is not configured in Vercel yet.'});
  try{
    const [app,bot]=await Promise.all([getApplication(),getBotUser()]);
    let guilds=[];
    try{guilds=await getGuilds()}catch{}
    const safeGuilds=(guilds||[]).map(g=>({
      id:g.id,
      name:g.name,
      can_manage_channels:hasPermission(g.permissions,BOT_PERMISSIONS.MANAGE_CHANNELS)
    }));
    const preferred=String(process.env.DISCORD_GUILD_ID||'').trim();
    let activeGuild=null;
    if(preferred) activeGuild=safeGuilds.find(g=>g.id===preferred)||{id:preferred,name:'Configured EFL server',can_manage_channels:true};
    else {
      const manageable=safeGuilds.filter(g=>g.can_manage_channels);
      if(manageable.length===1) activeGuild=manageable[0];
    }
    let structure=null;
    if(activeGuild){
      try{
        const channels=await getGuildChannels(activeGuild.id);
        const names=new Set((channels||[]).map(c=>c.name));
        const expected=['📢 LEAGUE','👑・announcements','🌐・efl-hub','💬 CLUBHOUSE','💬・general','🤝・trade-block','🏈・nfl-talk','🎮 LEAGUE FUN','🧠・trivia','🔊 VOICE','EFL War Room'];
        structure={expected:expected.length,present:expected.filter(x=>names.has(x)).length,complete:expected.every(x=>names.has(x))};
      }catch{}
    }
    return json(res,200,{
      configured:true,
      application:{id:app.id,name:app.name||bot.username},
      bot:{id:bot.id,username:bot.username,global_name:bot.global_name||null},
      invite_url:inviteUrl(app.id),
      guilds:safeGuilds,
      active_guild:activeGuild,
      structure
    });
  }catch(e){
    return json(res,502,{configured:true,error:e.message||'Discord connection failed'});
  }
}
