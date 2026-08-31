import {json,noStore} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const TYPE_TEXT=0,TYPE_CATEGORY=4;
const VIEW=1024n,SEND=2048n,EMBED=16384n,HISTORY=65536n;
const LOGO='https://www.efldynasty.com/Assets/efl-logo.jpeg?v=efl-2026-08-31';
const KEY='efl-onboard-31a9f8c2';

function canonical(v){return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')}
function readOnly(guildId,botId,current=[]){
  const list=Array.isArray(current)?current.map(x=>({...x})):[];
  let everyone=list.find(x=>String(x.id)===String(guildId)&&Number(x.type)===0);
  if(!everyone){everyone={id:String(guildId),type:0,allow:'0',deny:'0'};list.push(everyone)}
  let ea=0n,ed=0n;try{ea=BigInt(everyone.allow||'0')}catch{}try{ed=BigInt(everyone.deny||'0')}catch{}
  everyone.allow=(ea&~SEND).toString();everyone.deny=(ed|SEND).toString();
  let bot=list.find(x=>String(x.id)===String(botId)&&Number(x.type)===1);
  if(!bot){bot={id:String(botId),type:1,allow:'0',deny:'0'};list.push(bot)}
  let ba=0n,bd=0n;try{ba=BigInt(bot.allow||'0')}catch{}try{bd=BigInt(bot.deny||'0')}catch{}
  const needed=VIEW|SEND|EMBED|HISTORY;bot.allow=(ba|needed).toString();bot.deny=(bd&~needed).toString();
  return list;
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(String(req.query?.key||'')!==KEY) return json(res,401,{error:'Unauthorized'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot not configured'});
  try{
    const [guild,bot]=await Promise.all([resolveGuild(),getBotUser()]);
    let channels=await getGuildChannels(guild.id);
    let category=channels.find(x=>x.type===TYPE_CATEGORY&&canonical(x.name)==='league');
    if(!category){category=await discord(`/guilds/${guild.id}/channels`,{method:'POST',body:{name:'📢 LEAGUE',type:TYPE_CATEGORY,position:0}});channels.push(category)}

    const topic='New to the EFL Discord? Start here. Discord is the clubhouse, Sleeper handles teams and transactions, and EFLDynasty.com is the official league home.';
    let channel=channels.find(x=>x.type===TYPE_TEXT&&canonical(x.name)==='start-here');
    let created=false;
    if(!channel){
      channel=await discord(`/guilds/${guild.id}/channels`,{method:'POST',body:{name:'👋・start-here',type:TYPE_TEXT,parent_id:category.id,topic,permission_overwrites:readOnly(guild.id,bot.id)}});
      channels.push(channel);created=true;
    }else{
      channel=await discord(`/channels/${channel.id}`,{method:'PATCH',body:{name:'👋・start-here',parent_id:category.id,topic,permission_overwrites:readOnly(guild.id,bot.id,channel.permission_overwrites)}});
    }

    const find=name=>channels.find(x=>x.type===TYPE_TEXT&&canonical(x.name)===name);
    const general=find('general'),trade=find('trade-block'),trivia=find('trivia');
    const mention=x=>x?.id?`<#${x.id}>`:'the channel list';
    const channelUrl=x=>x?.id?`https://discord.com/channels/${guild.id}/${x.id}`:`https://discord.com/channels/${guild.id}/${channel.id}`;

    const embed={
      title:'👋 WELCOME TO THE EFL',
      description:'**This is the new clubhouse for Elite Fantasy Footballers.**\n\nYou do not need to learn every Discord feature. Three things matter:',
      color:3447003,
      thumbnail:{url:LOGO},
      fields:[
        {name:'💬 DISCORD = THE CLUBHOUSE',value:`League conversation, reactions and trash talk live here. Start in ${mention(general)}. Trade chatter belongs in ${mention(trade)}, and league games live in ${mention(trivia)}.`,inline:false},
        {name:'🏈 SLEEPER = YOUR TEAM',value:'Keep using Sleeper for lineups, waivers, trades, rosters and matchup management. Important Sleeper activity automatically flows back into Discord.',inline:false},
        {name:'🌐 EFLDYNASTY.COM = THE OFFICIAL HOME',value:'Power Rankings, EFL Weekly, league history, champions, records, franchises and the rulebook live on the website.',inline:false},
        {name:'👑 THE SIMPLE VERSION',value:'**Talk here. Manage your team on Sleeper. Find official league content on the website.**',inline:false}
      ],
      footer:{text:'Elite Fantasy Footballers • Dynasty'}
    };
    const body={allowed_mentions:{parse:[]},embeds:[embed],components:[{type:1,components:[
      {type:2,style:5,label:'Start in General',url:channelUrl(general),emoji:{name:'💬'}},
      {type:2,style:5,label:'Open EFL Website',url:'https://www.efldynasty.com/',emoji:{name:'🌐'}},
      {type:2,style:5,label:'Open Sleeper',url:'https://sleeper.com/leagues/1313240395462742016',emoji:{name:'🏈'}}
    ]}]};

    let messages=[];try{messages=await discord(`/channels/${channel.id}/messages?limit=50`)}catch{}
    let post=(messages||[]).find(m=>String(m.author?.id)===String(bot.id)&&(m.embeds||[]).some(e=>e.title==='👋 WELCOME TO THE EFL'));
    const updated=Boolean(post);
    if(post) post=await discord(`/channels/${channel.id}/messages/${post.id}`,{method:'PATCH',body});
    else post=await discord(`/channels/${channel.id}/messages`,{method:'POST',body});
    let pinned=true;try{await discord(`/channels/${channel.id}/messages/pins/${post.id}`,{method:'PUT',reason:'Pin EFL Discord welcome'})}catch{pinned=false}
    return json(res,200,{ok:true,channel_id:channel.id,channel_created:created,message_id:post.id,message_updated:updated,pinned});
  }catch(e){return json(res,502,{error:e.message||'Discord onboarding sync failed'})}
}
