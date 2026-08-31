import {json,noStore} from './_common.js';
import {discord,discordConfigured} from './discord-lib.js';

const KEY='efl-create-invite-2026-08-31';
const START_HERE_CHANNEL_ID='1544063372318736395';

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  if(String(req.query?.key||'')!==KEY) return json(res,401,{error:'Unauthorized'});
  if(!discordConfigured()) return json(res,503,{error:'Discord bot not configured'});
  try{
    const invite=await discord(`/channels/${START_HERE_CHANNEL_ID}/invites`,{method:'POST',body:{max_age:0,max_uses:0,temporary:false,unique:true},reason:'Create permanent EFL Discord onboarding invite'});
    return json(res,200,{ok:true,code:invite.code,url:`https://discord.gg/${invite.code}`});
  }catch(e){return json(res,502,{error:e.message||'Invite creation failed'})}
}
