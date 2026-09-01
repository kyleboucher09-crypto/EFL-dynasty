import { commissionerOK } from './_common.js';
import { commissionerScope, requireEflSession } from '../lib/efl-account-data.js';
import { eflPublicSignupReadiness } from '../lib/efl-auth.js';

async function commissioner(req){const session=await requireEflSession(req).catch(()=>null);if(session?.user){const scope=await commissionerScope(session.user.id);if(scope.global||scope.leagueIds.length)return true;}return commissionerOK(req);}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{if(!await commissioner(req))return res.status(401).json({error:'Commissioner access required'});const readiness=await eflPublicSignupReadiness();return res.status(200).json({coreConfigured:readiness.coreConfigured,emailConfigured:readiness.emailConfigured,signupFlagEnabled:readiness.signupFlagEnabled,signupMode:readiness.signupMode,senderDomain:readiness.senderDomain,senderDomainVerified:readiness.verified,providerStatus:readiness.status,publicSignupReady:readiness.publicSignupEnabled});}catch(error){console.error('Commissioner launch readiness error:',error);return res.status(500).json({error:'Launch readiness is temporarily unavailable.'});}
}
