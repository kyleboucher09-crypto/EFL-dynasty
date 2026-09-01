import { getPublicHqIdentity } from '../lib/efl-hq-economy.js';

function headers(res){
  res.setHeader('Cache-Control','public, max-age=30, stale-while-revalidate=120');
  res.setHeader('X-Content-Type-Options','nosniff');
}

export default async function handler(req,res){
  headers(res);
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const identity=await getPublicHqIdentity(String(req.query?.leagueId||'').trim(),Number(req.query?.rosterId));
    return res.status(200).json(identity);
  }catch(error){
    const status=Number(error?.status)||500;
    if(status>=500)console.error('Public Franchise HQ identity error:',error);
    return res.status(status).json({error:status>=500?'Franchise identity is temporarily unavailable.':error.message});
  }
}
