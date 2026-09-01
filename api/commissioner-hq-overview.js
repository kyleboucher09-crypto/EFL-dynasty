import { commissionerOK } from './_common.js';
import { commissionerScope, requireEflSession } from '../lib/efl-account-data.js';
import { getCommissionerEconomyOverview } from '../lib/efl-hq-economy.js';

async function accessFor(req){
  const session=await requireEflSession(req).catch(()=>null);
  if(session?.user){const scope=await commissionerScope(session.user.id);if(scope.global||scope.leagueIds.length)return {allowed:true,scope};}
  if(commissionerOK(req))return {allowed:true,scope:{global:true,leagueIds:[]}};
  return {allowed:false,scope:null};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const access=await accessFor(req);if(!access.allowed)return res.status(401).json({error:'Commissioner access required'});
    const leagueId=String(req.query?.leagueId||'').trim();
    if(!access.scope.global&&!access.scope.leagueIds.includes(leagueId))return res.status(403).json({error:'Commissioner access is not available for that league.'});
    return res.status(200).json(await getCommissionerEconomyOverview(leagueId));
  }catch(error){const status=Number(error?.status)||500;if(status>=500)console.error('Commissioner HQ overview error:',error);return res.status(status).json({error:status>=500?'The economy overview is temporarily unavailable.':error.message});}
}
