import {db,json,noStore} from './_common.js';
import {discord,discordConfigured,getBotUser,getGuildChannels,resolveGuild} from './discord-lib.js';

const LEAGUE_ID='1313240395462742016';
const SLEEPER='https://api.sleeper.app/v1';
const LOGO_URL='https://www.efldynasty.com/Assets/efl-logo.jpeg';
const GAME_DAY_URL='https://www.efldynasty.com/#game-day';
const CRON_SCHEDULE='*/5 * * * *';
const TYPE_TEXT=0;
const TYPE_CATEGORY=4;
const VIEW_CHANNEL=1024n;
const SEND_MESSAGES=2048n;
const EMBED_LINKS=16384n;
const READ_MESSAGE_HISTORY=65536n;
const CHANNEL_NAME='📡・league-feed';
const CHANNEL_TOPIC='Automatic EFL activity from Sleeper — trades, waivers, free agents, weekly matchups, results, and standings.';
const INITIALIZED='__efl_sleeper_feed_initialized__';

let feedSchemaReady=globalThis.__eflSleeperFeedSchemaReady||null;
let playerCache=globalThis.__eflSleeperPlayerCache||{at:0,data:null};

function canonical(v){return String(v||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')}
function millis(v){const n=Number(v||0);return Number.isFinite(n)&&n>0?n:Date.now()}
function iso(v){try{return new Date(millis(v)).toISOString()}catch{return new Date().toISOString()}}
function round2(v){const n=Number(v||0);return Number.isFinite(n)?n.toFixed(2):'0.00'}
function trim(v,max=1000){const s=String(v??'');return s.length>max?s.slice(0,max-1)+'…':s}

function cronAuthorized(req){
  const secret=String(process.env.CRON_SECRET||'').trim();
  if(secret) return String(req.headers.authorization||'')===`Bearer ${secret}`;
  return String(req.headers['x-vercel-cron-schedule']||'')===CRON_SCHEDULE;
}

async function sleeper(path){
  const r=await fetch(`${SLEEPER}${path}`,{cache:'no-store',headers:{'User-Agent':'EFL-Discord-Sleeper-Feed/1.0'}});
  if(!r.ok) throw new Error(`Sleeper request failed (${r.status})`);
  return r.json();
}

async function ensureFeedSchema(sql){
  if(!feedSchemaReady){
    feedSchemaReady=(async()=>{
      await sql`
        CREATE TABLE IF NOT EXISTS discord_sleeper_feed_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          sleeper_created_at BIGINT,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          discord_message_id TEXT,
          payload JSONB,
          last_error TEXT,
          recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          posted_at TIMESTAMPTZ
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_discord_sleeper_feed_status ON discord_sleeper_feed_events(status, recorded_at DESC)`;
    })().catch(err=>{feedSchemaReady=null;globalThis.__eflSleeperFeedSchemaReady=null;throw err});
    globalThis.__eflSleeperFeedSchemaReady=feedSchemaReady;
  }
  return feedSchemaReady;
}

async function hasEvent(sql,id){
  const rows=await sql`SELECT event_id FROM discord_sleeper_feed_events WHERE event_id=${id} LIMIT 1`;
  return Boolean(rows?.length);
}

async function seedEvent(sql,id,type,createdAt,payload=null){
  await sql`
    INSERT INTO discord_sleeper_feed_events(event_id,event_type,sleeper_created_at,status,payload,posted_at)
    VALUES(${id},${type},${createdAt||null},'seeded',${payload?JSON.stringify(payload):null}::jsonb,NOW())
    ON CONFLICT (event_id) DO NOTHING
  `;
}

async function claimEvent(sql,id,type,createdAt,payload=null){
  const rows=await sql`
    INSERT INTO discord_sleeper_feed_events(event_id,event_type,sleeper_created_at,status,attempts,payload)
    VALUES(${id},${type},${createdAt||null},'pending',1,${payload?JSON.stringify(payload):null}::jsonb)
    ON CONFLICT (event_id) DO UPDATE SET
      status='pending',
      attempts=discord_sleeper_feed_events.attempts+1,
      last_error=NULL,
      payload=EXCLUDED.payload
    WHERE discord_sleeper_feed_events.status='failed'
    RETURNING event_id
  `;
  return Boolean(rows?.length);
}

async function markPosted(sql,id,messageId){
  await sql`UPDATE discord_sleeper_feed_events SET status='posted',discord_message_id=${String(messageId||'')},posted_at=NOW(),last_error=NULL WHERE event_id=${id}`;
}
async function markFailed(sql,id,error){
  await sql`UPDATE discord_sleeper_feed_events SET status='failed',last_error=${trim(error?.message||error,900)} WHERE event_id=${id}`;
}

function mergeReadOnly(overwrites,guildId,botUserId){
  const list=Array.isArray(overwrites)?overwrites.map(x=>({...x})):[];
  let everyone=list.find(x=>String(x.id)===String(guildId)&&Number(x.type)===0);
  if(!everyone){everyone={id:String(guildId),type:0,allow:'0',deny:'0'};list.push(everyone)}
  let allow=0n,deny=0n;
  try{allow=BigInt(everyone.allow||'0')}catch{}
  try{deny=BigInt(everyone.deny||'0')}catch{}
  everyone.allow=(allow&~SEND_MESSAGES).toString();
  everyone.deny=(deny|SEND_MESSAGES).toString();
  let bot=list.find(x=>String(x.id)===String(botUserId)&&Number(x.type)===1);
  if(!bot){bot={id:String(botUserId),type:1,allow:'0',deny:'0'};list.push(bot)}
  let ba=0n,bd=0n;
  try{ba=BigInt(bot.allow||'0')}catch{}
  try{bd=BigInt(bot.deny||'0')}catch{}
  const needed=VIEW_CHANNEL|SEND_MESSAGES|EMBED_LINKS|READ_MESSAGE_HISTORY;
  bot.allow=(ba|needed).toString();
  bot.deny=(bd&~needed).toString();
  return list;
}

async function ensureFeedChannel(guild,bot){
  let channels=await getGuildChannels(guild.id);
  let category=channels.find(c=>c.type===TYPE_CATEGORY&&canonical(c.name)==='league');
  if(!category){
    category=await discord(`/guilds/${guild.id}/channels`,{method:'POST',reason:'Create EFL League category',body:{name:'📢 LEAGUE',type:TYPE_CATEGORY,position:0}});
    channels.push(category);
  }
  let channel=channels.find(c=>c.type===TYPE_TEXT&&canonical(c.name)==='league-feed');
  if(!channel){
    channel=await discord(`/guilds/${guild.id}/channels`,{
      method:'POST',
      reason:'Create EFL Sleeper league feed',
      body:{name:CHANNEL_NAME,type:TYPE_TEXT,parent_id:category.id,topic:CHANNEL_TOPIC,permission_overwrites:mergeReadOnly([],guild.id,bot.id)}
    });
    return {channel,created:true};
  }
  const patch={};
  if(channel.name!==CHANNEL_NAME) patch.name=CHANNEL_NAME;
  if(String(channel.parent_id||'')!==String(category.id)) patch.parent_id=category.id;
  if(channel.topic!==CHANNEL_TOPIC) patch.topic=CHANNEL_TOPIC;
  patch.permission_overwrites=mergeReadOnly(channel.permission_overwrites,guild.id,bot.id);
  channel=await discord(`/channels/${channel.id}`,{method:'PATCH',reason:'Keep EFL Sleeper feed read-only',body:patch});
  return {channel,created:false};
}

function nameMaps(users,rosters){
  const userById=Object.fromEntries((users||[]).map(u=>[String(u.user_id),u]));
  const rosterById=Object.fromEntries((rosters||[]).map(r=>[String(r.roster_id),r]));
  const name=rid=>{
    const r=rosterById[String(rid)],u=r?userById[String(r.owner_id)]:null;
    return u?.metadata?.team_name||u?.display_name||(r?`Roster ${r.roster_id}`:`Roster ${rid}`);
  };
  return {userById,rosterById,name};
}

async function recentTransactions(league,state){
  const stateWeek=Math.max(1,Number(state?.week||1));
  const leagueWeek=Math.max(1,Number(league?.settings?.leg||stateWeek||1));
  const rounds=[...new Set([stateWeek,leagueWeek,Math.max(1,stateWeek-1),Math.max(1,leagueWeek-1)])];
  const pages=await Promise.all(rounds.map(w=>sleeper(`/league/${LEAGUE_ID}/transactions/${w}`).catch(()=>[])));
  const seen=new Set(),out=[];
  for(const t of pages.flat()){
    const id=String(t?.transaction_id||'');
    if(!id||seen.has(id)||String(t.status||'')!=='complete'||!['trade','waiver','free_agent'].includes(String(t.type||''))) continue;
    seen.add(id);out.push(t);
  }
  out.sort((a,b)=>millis(a.status_updated||a.created)-millis(b.status_updated||b.created));
  return out;
}

async function playersFor(transactions){
  const ids=new Set();
  for(const t of transactions){
    Object.keys(t?.adds||{}).forEach(id=>ids.add(id));
    Object.keys(t?.drops||{}).forEach(id=>ids.add(id));
  }
  if(!ids.size) return {};
  if(playerCache.data&&Date.now()-playerCache.at<6*60*60*1000) return playerCache.data;
  try{
    const data=await sleeper('/players/nfl');
    playerCache={at:Date.now(),data};globalThis.__eflSleeperPlayerCache=playerCache;
    return data;
  }catch{return {}}
}

function playerName(id,players){
  const p=players?.[id]||{};
  const n=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ');
  return n||`Player ${id}`;
}
function listText(items){return items.length?trim(items.map(x=>`• ${x}`).join('\n'),1000):'—'}

function tradeEmbed(tx,maps,players){
  const assets={};
  const add=(rid,text)=>{const k=String(rid||'');if(!k)return;(assets[k]??=[]).push(text)};
  for(const [pid,rid] of Object.entries(tx.adds||{})) add(rid,playerName(pid,players));
  for(const p of tx.draft_picks||[]){
    const target=p.owner_id??p.roster_id;
    const origin=p.roster_id!=null?maps.name(p.roster_id):'';
    const suffix=origin&&String(target)!==String(p.roster_id)?` (${origin})`:'';
    add(target,`${p.season} Round ${p.round} pick${suffix}`);
  }
  for(const b of tx.waiver_budget||[]) if(Number(b.amount)>0) add(b.receiver,`$${Number(b.amount)} FAAB`);
  const rosterIds=[...new Set([...(tx.roster_ids||[]).map(String),...Object.keys(assets)])];
  const fields=rosterIds.slice(0,8).map(rid=>({name:`${maps.name(rid)} receives`,value:listText(assets[rid]||[]),inline:rosterIds.length===2}));
  return {
    title:'🚨 TRADE COMPLETED',
    description:rosterIds.length?rosterIds.map(r=>`**${maps.name(r)}**`).join('  ⇄  '):'A trade was completed in the EFL.',
    color:15120458,
    thumbnail:{url:LOGO_URL},
    fields,
    footer:{text:`EFL Sleeper Feed • ${tx.transaction_id}`},
    timestamp:iso(tx.status_updated||tx.created)
  };
}

function moveEmbed(tx,maps,players){
  const adds=Object.entries(tx.adds||{}),drops=Object.entries(tx.drops||{});
  const rid=adds[0]?.[1]??drops[0]?.[1]??tx.roster_ids?.[0];
  const team=maps.name(rid);
  const isWaiver=tx.type==='waiver';
  const fields=[];
  if(adds.length) fields.push({name:'Added',value:listText(adds.map(([id])=>playerName(id,players))),inline:true});
  if(drops.length) fields.push({name:'Dropped',value:listText(drops.map(([id])=>playerName(id,players))),inline:true});
  const bid=Number(tx.settings?.waiver_bid||0);
  if(isWaiver&&bid>0) fields.push({name:'FAAB',value:`$${bid}`,inline:true});
  return {
    title:isWaiver?'🧾 WAIVER CLAIM':'➕ FREE AGENT MOVE',
    description:`**${team}** made a roster move.`,
    color:isWaiver?4521728:3447003,
    thumbnail:{url:LOGO_URL},
    fields,
    footer:{text:`EFL Sleeper Feed • ${tx.transaction_id}`},
    timestamp:iso(tx.status_updated||tx.created)
  };
}

function transactionMessage(tx,maps,players){
  return {allowed_mentions:{parse:[]},embeds:[tx.type==='trade'?tradeEmbed(tx,maps,players):moveEmbed(tx,maps,players)]};
}

function matchupGroups(rows){
  const groups={};
  for(const m of rows||[]){if(m?.matchup_id==null)continue;(groups[m.matchup_id]??=[]).push(m)}
  return Object.entries(groups).map(([id,g])=>({id,g})).filter(x=>x.g.length===2).sort((a,b)=>Number(a.id)-Number(b.id));
}

function slateMessage(league,week,matchups,maps){
  const groups=matchupGroups(matchups);
  if(!groups.length) return null;
  const fields=groups.slice(0,12).map(({g})=>{
    const a=maps.rosterById[String(g[0].roster_id)]||{},b=maps.rosterById[String(g[1].roster_id)]||{};
    const ar=a.settings||{},br=b.settings||{};
    return {name:`${maps.name(g[0].roster_id)} vs. ${maps.name(g[1].roster_id)}`,value:`${ar.wins||0}-${ar.losses||0}  •  ${br.wins||0}-${br.losses||0}`,inline:false};
  });
  const marker=`slate:${league.season}:${week}`;
  return {id:marker,type:'matchup_slate',createdAt:Date.now(),body:{
    allowed_mentions:{parse:[]},
    embeds:[{title:`🏈 EFL WEEK ${week} MATCHUPS`,description:'This week’s EFL slate is set. The live matchup spotlight is available on the league site.',color:3447003,thumbnail:{url:LOGO_URL},fields,footer:{text:`EFL Sleeper Feed • ${marker}`},timestamp:new Date().toISOString()}],
    components:[{type:1,components:[{type:2,style:5,label:'Open Game Day',url:GAME_DAY_URL,emoji:{name:'🏈'}}]}]
  }};
}

function pointsFor(r){return (Number(r?.settings?.fpts)||0)+(Number(r?.settings?.fpts_decimal)||0)/100}
function summaryMessage(league,week,matchups,maps,rosters){
  const groups=matchupGroups(matchups);
  if(!groups.length) return null;
  const scored=groups.some(({g})=>Number(g[0].points||0)>0||Number(g[1].points||0)>0);
  if(!scored) return null;
  let high=null,closest=null;
  const fields=groups.slice(0,12).map(({g})=>{
    const a=g[0],b=g[1],ap=Number(a.points||0),bp=Number(b.points||0),winner=ap>=bp?a:b,loser=winner===a?b:a;
    const wp=Math.max(ap,bp),lp=Math.min(ap,bp),margin=Math.abs(ap-bp);
    if(!high||wp>high.points) high={team:maps.name(winner.roster_id),points:wp};
    if(!closest||margin<closest.margin) closest={winner:maps.name(winner.roster_id),loser:maps.name(loser.roster_id),margin};
    return {name:`${maps.name(a.roster_id)} ${round2(ap)} — ${round2(bp)} ${maps.name(b.roster_id)}`,value:`Winner: **${maps.name(winner.roster_id)}**`,inline:false};
  });
  const standings=[...(rosters||[])].sort((a,b)=>(Number(b.settings?.wins)||0)-(Number(a.settings?.wins)||0)||(Number(a.settings?.losses)||0)-(Number(b.settings?.losses)||0)||pointsFor(b)-pointsFor(a));
  const standingsText=standings.map((r,i)=>`${i+1}. **${maps.name(r.roster_id)}** — ${r.settings?.wins||0}-${r.settings?.losses||0} • ${round2(pointsFor(r))} PF`).join('\n');
  const marker=`summary:${league.season}:${week}`;
  const description=[high?`🔥 High score: **${high.team} — ${round2(high.points)}**`:null,closest?`😬 Closest game: **${closest.winner}** by ${round2(closest.margin)}`:null].filter(Boolean).join('\n');
  return {id:marker,type:'week_summary',createdAt:Date.now(),body:{allowed_mentions:{parse:[]},embeds:[
    {title:`🏆 EFL WEEK ${week} FINAL`,description:description||'Week complete.',color:15120458,thumbnail:{url:LOGO_URL},fields,footer:{text:`EFL Sleeper Feed • ${marker}`},timestamp:new Date().toISOString()},
    {title:`📊 EFL STANDINGS — AFTER WEEK ${week}`,description:trim(standingsText,4000),color:3447003,footer:{text:`EFL Sleeper Feed • ${marker}`}}
  ]}};
}

async function activationPost(channel,bot){
  let recent=[];try{recent=await discord(`/channels/${channel.id}/messages?limit=50`)}catch{}
  const marker='EFL Sleeper Feed • LIVE';
  const existing=(recent||[]).find(m=>String(m.author?.id)===String(bot.id)&&(m.embeds||[]).some(e=>e.footer?.text===marker));
  if(existing) return existing;
  return discord(`/channels/${channel.id}/messages`,{method:'POST',body:{allowed_mentions:{parse:[]},embeds:[{
    title:'📡 EFL LEAGUE FEED IS LIVE',
    description:'Sleeper activity now flows here automatically. Trades, waivers, free-agent moves, weekly matchup slates, final scores, and standings will appear without anyone having to repost them.',
    color:3447003,thumbnail:{url:LOGO_URL},footer:{text:marker},timestamp:new Date().toISOString()
  }]}});
}

async function postEvent(sql,channel,event){
  const claimed=await claimEvent(sql,event.id,event.type,event.createdAt,event.payload||null);
  if(!claimed) return {posted:false,deduped:true,id:event.id};
  try{
    const message=await discord(`/channels/${channel.id}/messages`,{method:'POST',body:event.body});
    await markPosted(sql,event.id,message.id);
    return {posted:true,id:event.id,message_id:message.id};
  }catch(e){await markFailed(sql,event.id,e);return {posted:false,id:event.id,error:e.message||String(e)}}
}

export default async function handler(req,res){
  noStore(res);
  res.setHeader('Allow','GET');
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(!cronAuthorized(req)) return json(res,401,{error:'Unauthorized cron request'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot is not configured'});
  try{
    const sql=db();await ensureFeedSchema(sql);
    const [guild,bot,league,users,rosters,state]=await Promise.all([
      resolveGuild(),getBotUser(),sleeper(`/league/${LEAGUE_ID}`),sleeper(`/league/${LEAGUE_ID}/users`),sleeper(`/league/${LEAGUE_ID}/rosters`),sleeper('/state/nfl')
    ]);
    const {channel,created:channelCreated}=await ensureFeedChannel(guild,bot);
    const maps=nameMaps(users,rosters);
    const transactions=await recentTransactions(league,state);
    const initialized=await hasEvent(sql,INITIALIZED);
    const currentWeek=Math.max(1,Number(state?.week||league?.settings?.leg||1));

    if(!initialized){
      await seedEvent(sql,INITIALIZED,'meta',Date.now(),{league_id:LEAGUE_ID,season:league.season});
      for(const tx of transactions) await seedEvent(sql,String(tx.transaction_id),`transaction_${tx.type}`,millis(tx.status_updated||tx.created),tx);
      if(currentWeek>1) await seedEvent(sql,`summary:${league.season}:${currentWeek-1}`,'week_summary',Date.now());
      await activationPost(channel,bot);
    }

    const outcomes=[];
    const pending=[];
    for(const tx of transactions){
      const id=String(tx.transaction_id);
      if(await hasEvent(sql,id)) continue;
      pending.push(tx);
    }
    const players=await playersFor(pending);
    for(const tx of pending){
      outcomes.push(await postEvent(sql,channel,{
        id:String(tx.transaction_id),type:`transaction_${tx.type}`,createdAt:millis(tx.status_updated||tx.created),payload:tx,body:transactionMessage(tx,maps,players)
      }));
    }

    const currentMatchups=await sleeper(`/league/${LEAGUE_ID}/matchups/${currentWeek}`).catch(()=>[]);
    const slate=slateMessage(league,currentWeek,currentMatchups,maps);
    if(slate) outcomes.push(await postEvent(sql,channel,slate));

    if(currentWeek>1){
      const previousWeek=currentWeek-1;
      const previousMatchups=await sleeper(`/league/${LEAGUE_ID}/matchups/${previousWeek}`).catch(()=>[]);
      const summary=summaryMessage(league,previousWeek,previousMatchups,maps,rosters);
      if(summary) outcomes.push(await postEvent(sql,channel,summary));
    }

    const posted=outcomes.filter(x=>x.posted).length;
    const failures=outcomes.filter(x=>x.error);
    return json(res,200,{ok:true,channel_id:channel.id,channel_created:channelCreated,initialized:!initialized,week:currentWeek,transactions_checked:transactions.length,posted,failures,outcomes});
  }catch(e){
    console.error('EFL Sleeper Discord feed failed',e);
    return json(res,e.status&&e.status>=400&&e.status<500?e.status:502,{error:e.message||'Sleeper feed failed'});
  }
}
