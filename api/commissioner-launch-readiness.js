import { commissionerOK } from './_common.js';
import { commissionerScope, requireEflSession } from '../lib/efl-account-data.js';
import { eflAuthReadiness } from '../lib/efl-auth.js';

async function commissioner(req){const session=await requireEflSession(req).catch(()=>null);if(session?.user){const scope=await commissionerScope(session.user.id);if(scope.global||scope.leagueIds.length)return true;}return commissionerOK(req);}
function senderDomain(){const from=String(process.env.EFL_AUTH_FROM_EMAIL||'');const match=from.match(/@([a-z0-9.-]+)>?$/i);return match?.[1]?.toLowerCase()||null;}
async function providerStatus(domain){
  if(!process.env.RESEND_API_KEY||!domain)return {checked:false,verified:false,status:'not_configured'};
  try{const response=await fetch('https://api.resend.com/domains',{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!response.ok)return {checked:true,verified:false,status:`provider_${response.status}`};const json=await response.json(),domains=Array.isArray(json?.data)?json.data:[],entry=domains.find(item=>{const configured=String(item?.name||'').toLowerCase();return configured&&(domain===configured||domain.endsWith(`.${configured}`));});return {checked:true,verified:String(entry?.status||'').toLowerCase()==='verified',status:entry?.status||'domain_not_found'};}catch{return {checked:true,verified:false,status:'provider_unavailable'};}
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{if(!await commissioner(req))return res.status(401).json({error:'Commissioner access required'});const readiness=eflAuthReadiness(),domain=senderDomain(),provider=await providerStatus(domain);return res.status(200).json({coreConfigured:readiness.coreConfigured,emailConfigured:readiness.emailConfigured,signupFlagEnabled:readiness.signupFlagEnabled,senderDomain:domain,senderDomainVerified:provider.verified,providerStatus:provider.status,publicSignupReady:readiness.publicSignupEnabled&&provider.verified});}catch(error){console.error('Commissioner launch readiness error:',error);return res.status(500).json({error:'Launch readiness is temporarily unavailable.'});}
}
