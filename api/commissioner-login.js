import { json, clean, commissionerKeyOK, createCommissionerSession, setCommissionerCookie, noStore, sameOrigin } from './_common.js';

const attempts=new Map();
function clientId(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()}
function allowed(req){
  const now=Date.now(), id=clientId(req), old=attempts.get(id)||[];
  const recent=old.filter(t=>now-t<15*60*1000);
  if(recent.length>=8){attempts.set(id,recent);return false}
  recent.push(now);attempts.set(id,recent);return true;
}

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req)) return json(res,403,{error:'Forbidden'});
  if(!allowed(req)) return json(res,429,{error:'Too many login attempts. Try again later.'});
  const key=clean(req.body?.key,300);
  if(!commissionerKeyOK(key)) return json(res,401,{error:'Unauthorized'});
  const token=createCommissionerSession();
  setCommissionerCookie(res,token);
  return json(res,200,{ok:true,expiresIn:8*60*60});
}
