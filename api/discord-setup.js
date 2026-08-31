import {commissionerOK,json,noStore,sameOrigin} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const TYPE_TEXT=0;
const TYPE_VOICE=2;
const TYPE_CATEGORY=4;
const VIEW_CHANNEL=1024n;
const SEND_MESSAGES=2048n;
const EMBED_LINKS=16384n;
const READ_MESSAGE_HISTORY=65536n;
const REASON='EFL Commissioner Bot channel sync';

const STRUCTURE=[
  {name:'📢 LEAGUE',type:TYPE_CATEGORY,children:[
    {name:'👑・announcements',type:TYPE_TEXT,readOnly:true,topic:'Official EFL commissioner announcements. Official league information lives at https://www.efldynasty.com/'},
    {name:'🌐・efl-hub',type:TYPE_TEXT,readOnly:true,topic:'Official EFL website shortcuts and automated league updates from EFLDynasty.com.'}
  ]},
  {name:'💬 CLUBHOUSE',type:TYPE_CATEGORY,children:[
    {name:'💬・general',type:TYPE_TEXT,topic:'The EFL clubhouse — league conversation, reactions, and trash talk. This is the home for discussion instead of Sleeper chat.'},
    {name:'🤝・trade-block',type:TYPE_TEXT,topic:'Post players and picks you are buying or selling, trade targets, and dynasty trade availability.'},
    {name:'🏈・nfl-talk',type:TYPE_TEXT,topic:'NFL news, games, injuries, rookies, prospects, and dynasty football discussion.'}
  ]},
  {name:'🎮 LEAGUE FUN',type:TYPE_CATEGORY,children:[
    {name:'🧠・trivia',type:TYPE_TEXT,topic:'EFL trivia, weekly questions, predictions, and league engagement.'}
  ]},
  {name:'🔊 VOICE',type:TYPE_CATEGORY,children:[
    {name:'EFL War Room',type:TYPE_VOICE}
  ]}
];

function canonical(v){
  return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
}
function sameTarget(channel,spec){return channel&&channel.type===spec.type&&canonical(channel.name)===canonical(spec.name)}
function mergeReadOnly(overwrites,guildId,botUserId){
  const list=Array.isArray(overwrites)?overwrites.map(x=>({...x})):[];

  let everyone=list.find(x=>String(x.id)===String(guildId)&&Number(x.type)===0);
  if(!everyone){everyone={id:String(guildId),type:0,allow:'0',deny:'0'};list.push(everyone)}
  let everyoneAllow=0n,everyoneDeny=0n;
  try{everyoneAllow=BigInt(everyone.allow||'0')}catch{}
  try{everyoneDeny=BigInt(everyone.deny||'0')}catch{}
  everyone.allow=(everyoneAllow&~SEND_MESSAGES).toString();
  everyone.deny=(everyoneDeny|SEND_MESSAGES).toString();

  if(botUserId){
    let bot=list.find(x=>String(x.id)===String(botUserId)&&Number(x.type)===1);
    if(!bot){bot={id:String(botUserId),type:1,allow:'0',deny:'0'};list.push(bot)}
    let botAllow=0n,botDeny=0n;
    try{botAllow=BigInt(bot.allow||'0')}catch{}
    try{botDeny=BigInt(bot.deny||'0')}catch{}
    const needed=VIEW_CHANNEL|SEND_MESSAGES|EMBED_LINKS|READ_MESSAGE_HISTORY;
    bot.allow=(botAllow|needed).toString();
    bot.deny=(botDeny&~needed).toString();
  }
  return list;
}
async function createChannel(guildId,body){return discord(`/guilds/${guildId}/channels`,{method:'POST',body,reason:REASON})}
async function updateChannel(id,body){return discord(`/channels/${id}`,{method:'PATCH',body,reason:REASON})}

async function ensureCategory(guildId,channels,spec,position,activity){
  let found=channels.find(c=>sameTarget(c,spec));
  if(!found){
    found=await createChannel(guildId,{name:spec.name,type:TYPE_CATEGORY,position});
    channels.push(found);activity.created.push(spec.name);
  }else{
    const patch={};
    if(found.name!==spec.name) patch.name=spec.name;
    if(Object.keys(patch).length){found=await updateChannel(found.id,patch);activity.updated.push(spec.name)}
    else activity.reused.push(spec.name);
  }
  return found;
}

async function ensureChild(guildId,channels,parent,spec,activity,botUserId){
  let found=channels.find(c=>sameTarget(c,spec));
  if(!found){
    const body={name:spec.name,type:spec.type,parent_id:parent.id};
    if(spec.topic) body.topic=spec.topic;
    if(spec.readOnly) body.permission_overwrites=mergeReadOnly([],guildId,botUserId);
    found=await createChannel(guildId,body);
    channels.push(found);activity.created.push(spec.name);
  }else{
    const patch={};
    if(found.name!==spec.name) patch.name=spec.name;
    if(String(found.parent_id||'')!==String(parent.id)) patch.parent_id=parent.id;
    if(spec.topic&&found.topic!==spec.topic) patch.topic=spec.topic;
    if(spec.readOnly) patch.permission_overwrites=mergeReadOnly(found.permission_overwrites,guildId,botUserId);
    if(Object.keys(patch).length){
      found=await updateChannel(found.id,patch);activity.updated.push(spec.name);
      const i=channels.findIndex(c=>c.id===found.id);if(i>=0)channels[i]=found;
    }else activity.reused.push(spec.name);
  }
  return found;
}

function hubEmbed(){
  return {
    title:'👑 EFL LEAGUE HUB',
    description:'**Everything official lives on EFLDynasty.com.**\n\nDiscord is the EFL clubhouse for conversation, trades, NFL talk, trivia, and league reactions.',
    color:8200905,
    thumbnail:{url:'https://www.efldynasty.com/Assets/efl-logo.jpeg?v=efl-2026-08-31'},
    fields:[
      {name:'🏠 League Hub',value:'[Open EFL Dynasty](https://www.efldynasty.com/)',inline:true},
      {name:'📈 Power Rankings',value:'[View Rankings](https://www.efldynasty.com/power-rankings.html)',inline:true},
      {name:'🏆 Champions',value:'[Hall of Champions](https://www.efldynasty.com/champions.html)',inline:true},
      {name:'🔥 Record Book',value:'[League Records](https://www.efldynasty.com/records.html)',inline:true},
      {name:'🛡️ Franchises',value:'[EFL Franchises](https://www.efldynasty.com/franchises.html)',inline:true},
      {name:'🏅 Legacy',value:'[Legacy System](https://www.efldynasty.com/legacy.html)',inline:true},
      {name:'⚖️ Rulebook',value:'[Official Rulebook](https://www.efldynasty.com/rulebook.html)',inline:true}
    ],
    footer:{text:'Elite Fantasy Footballers • Dynasty'}
  };
}

async function ensureHubPost(channel,botUser,activity){
  let messages=[];
  try{messages=await discord(`/channels/${channel.id}/messages?limit=50`)}catch{}
  let post=(messages||[]).find(m=>String(m.author?.id)===String(botUser.id)&&(m.embeds||[]).some(e=>e.title==='👑 EFL LEAGUE HUB'));
  const body={embeds:[hubEmbed()]};
  if(post){
    post=await discord(`/channels/${channel.id}/messages/${post.id}`,{method:'PATCH',body});
    activity.hub_post='updated';
  }else{
    post=await discord(`/channels/${channel.id}/messages`,{method:'POST',body});
    activity.hub_post='created';
  }
  try{
    await discord(`/channels/${channel.id}/messages/pins/${post.id}`,{method:'PUT',reason:'Pin the EFL League Hub'});
    activity.hub_pinned=true;
  }catch(e){activity.hub_pinned=false;activity.warnings.push(`Hub post created, but pinning failed: ${e.message}`)}
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req)) return json(res,403,{error:'Invalid origin'});
  if(!commissionerOK(req)) return json(res,401,{error:'Commissioner session required'});
  if(!discordConfigured()) return json(res,503,{error:'DISCORD_BOT_TOKEN is not configured in Vercel yet.'});
  try{
    const preferred=String(req.body?.guildId||'').trim();
    const guild=await resolveGuild(preferred);
    let channels=await getGuildChannels(guild.id);
    const botUser=await getBotUser();
    const activity={guild,created:[],updated:[],reused:[],warnings:[],hub_post:null,hub_pinned:false};
    const children={};
    for(let i=0;i<STRUCTURE.length;i++){
      const category=await ensureCategory(guild.id,channels,STRUCTURE[i],i,activity);
      for(const spec of STRUCTURE[i].children){
        const child=await ensureChild(guild.id,channels,category,spec,activity,botUser.id);
        children[canonical(spec.name)]=child;
      }
    }
    const hub=children['efl-hub'];
    if(hub) await ensureHubPost(hub,botUser,activity);
    return json(res,200,{ok:true,...activity});
  }catch(e){
    return json(res,e.status&&e.status>=400&&e.status<500?e.status:502,{error:e.message||'Discord setup failed',guilds:e.guilds||undefined});
  }
}
