import { json, clearCommissionerCookie, noStore, sameOrigin } from './_common.js';

export default async function handler(req,res){
  noStore(res);
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  if(!sameOrigin(req)) return json(res,403,{error:'Forbidden'});
  clearCommissionerCookie(res);
  return json(res,200,{ok:true});
}
