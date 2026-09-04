import { commissionerOK, sameOrigin } from './_common.js';
import { commissionerScope, isPrimaryCommissionerUser, requireEflSession } from '../lib/efl-account-data.js';
import { adjustHqCredits, getCommissionerEconomyOverview, grantHqTestCrate } from '../lib/efl-hq-economy.js';

function body(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}return {}}

async function accessFor(req){
  const session=await requireEflSession(req).catch(()=>null);
  if(session?.user){const scope=await commissionerScope(session.user.id);if(scope.global||scope.leagueIds.length)return {allowed:true,scope};}
  if(commissionerOK(req))return {allowed:true,scope:{global:true,leagueIds:[]}};
  return {allowed:false,scope:null};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  try{
    if(req.method==='POST'){
      if(!sameOrigin(req))return res.status(403).json({error:'Invalid request origin'});
      const session=await requireEflSession(req).catch(()=>null);
      if(!session?.user||!await isPrimaryCommissionerUser(session.user.id))return res.status(403).json({error:'The verified primary Commissioner account is required for economy controls.'});
      const data=body(req),leagueId=String(data.leagueId||'').trim(),rosterId=Number(data.rosterId);
      const action=String(data.action||'').trim();
      if(action==='adjust_credits')return res.status(200).json(await adjustHqCredits({leagueId,rosterId,userId:session.user.id,amount:data.amount,note:data.note}));
      if(action==='grant_test_crate')return res.status(200).json(await grantHqTestCrate({leagueId,rosterId,userId:session.user.id,note:data.note}));
      if(action==='grant_duplicate_test_crate')return res.status(200).json(await grantHqTestCrate({leagueId,rosterId,userId:session.user.id,note:data.note,forceDuplicate:true}));
      return res.status(400).json({error:'Unsupported commissioner economy action.'});
    }
    const access=await accessFor(req);if(!access.allowed)return res.status(401).json({error:'Commissioner access required'});
    const leagueId=String(req.query?.leagueId||'').trim();
    if(!access.scope.global&&!access.scope.leagueIds.includes(leagueId))return res.status(403).json({error:'Commissioner access is not available for that league.'});
    return res.status(200).json(await getCommissionerEconomyOverview(leagueId));
  }catch(error){const status=Number(error?.status)||500;if(status>=500)console.error('Commissioner HQ overview error:',error);return res.status(status).json({error:status>=500?'The economy overview is temporarily unavailable.':error.message});}
}
