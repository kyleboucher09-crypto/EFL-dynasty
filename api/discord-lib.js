const API='https://discord.com/api/v10';

export const BOT_PERMISSIONS={
  MANAGE_CHANNELS:16n,
  VIEW_CHANNEL:1024n,
  SEND_MESSAGES:2048n,
  MANAGE_MESSAGES:8192n,
  EMBED_LINKS:16384n,
  READ_MESSAGE_HISTORY:65536n
};

export const INVITE_PERMISSION_VALUE=Object.values(BOT_PERMISSIONS).reduce((a,b)=>a+b,0n).toString();

export function discordConfigured(){return Boolean(process.env.DISCORD_BOT_TOKEN)}

function token(){
  const v=String(process.env.DISCORD_BOT_TOKEN||'').trim();
  if(!v) throw new Error('DISCORD_BOT_TOKEN is not configured');
  return v;
}

export async function discord(path,{method='GET',body,reason}={}){
  const headers={Authorization:`Bot ${token()}`};
  if(body!==undefined) headers['Content-Type']='application/json';
  if(reason) headers['X-Audit-Log-Reason']=encodeURIComponent(reason).slice(0,512);
  const r=await fetch(`${API}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();
  let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!r.ok){
    const message=(data&&typeof data==='object'&&(data.message||data.error))||`Discord API error ${r.status}`;
    const err=new Error(message);
    err.status=r.status;
    err.discord=data;
    throw err;
  }
  return data;
}

export async function getApplication(){return discord('/oauth2/applications/@me')}
export async function getBotUser(){return discord('/users/@me')}
export async function getGuilds(){return discord('/users/@me/guilds?limit=200')}
export async function getGuild(id){return discord(`/guilds/${encodeURIComponent(id)}`)}
export async function getGuildChannels(id){return discord(`/guilds/${encodeURIComponent(id)}/channels`)}

export function hasPermission(permissionString,flag){
  try{return (BigInt(permissionString||'0')&BigInt(flag))===BigInt(flag)}catch{return false}
}

export async function resolveGuild(preferredId=''){
  const configuredId=String(preferredId||process.env.DISCORD_GUILD_ID||'').trim();
  if(configuredId){
    const guild=await getGuild(configuredId);
    return {id:guild.id,name:guild.name};
  }
  const guilds=await getGuilds();
  const manageable=(guilds||[]).filter(g=>hasPermission(g.permissions,BOT_PERMISSIONS.MANAGE_CHANNELS));
  if(manageable.length===1) return {id:manageable[0].id,name:manageable[0].name};
  if(!manageable.length) throw new Error('The EFL bot is not installed in a server where it has Manage Channels permission yet.');
  const err=new Error('The bot is installed in more than one manageable server. Choose the EFL server first.');
  err.guilds=manageable.map(g=>({id:g.id,name:g.name}));
  throw err;
}

export function inviteUrl(applicationId){
  const p=new URLSearchParams({
    client_id:String(applicationId),
    scope:'bot applications.commands',
    permissions:INVITE_PERMISSION_VALUE
  });
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}
