import { json, clearCommissionerCookie } from './_common.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  clearCommissionerCookie(res);
  return json(res,200,{ok:true});
}
