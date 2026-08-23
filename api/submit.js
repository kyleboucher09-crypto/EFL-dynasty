import { put } from '@vercel/blob';
import { db, ensureTable, json, clean } from './_common.js';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const BODY_LIMIT = 1_200_000;
const rateBuckets = globalThis.__eflSubmitRateBuckets || (globalThis.__eflSubmitRateBuckets = new Map());

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || 'unknown';
  return String(forwarded || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
}
function rateLimited(req) {
  const now = Date.now();
  const ip = clientIp(req);
  const current = rateBuckets.get(ip);
  if (!current || now - current.start >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  rateBuckets.set(ip, current);
  return current.count > RATE_MAX;
}
function validImageDataUrl(value) {
  if (!value) return true;
  return /^data:image\/(png|jpeg|jpg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(value);
}
function decodeImageDataUrl(value){
  const m=String(value||'').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-z0-9+/=\r\n]+)$/i);
  if(!m)return null;
  const mime=m[1].toLowerCase().replace('image/jpg','image/jpeg');
  return {mime,buffer:Buffer.from(m[2].replace(/\s/g,''),'base64')};
}
function safeSlug(value){
  return String(value||'team').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'team';
}
async function storeLogo(logoData,teamName){
  if(!logoData)return {logoUrl:'',logoData:''};
  if(!process.env.BLOB_READ_WRITE_TOKEN)return {logoUrl:'',logoData};
  const decoded=decodeImageDataUrl(logoData);
  if(!decoded)return {logoUrl:'',logoData};
  const ext=decoded.mime==='image/png'?'png':decoded.mime==='image/webp'?'webp':'jpg';
  const name=`franchise-logos/${safeSlug(teamName)}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
  try{
    const blob=await put(name,decoded.buffer,{access:'public',contentType:decoded.mime,token:process.env.BLOB_READ_WRITE_TOKEN});
    return {logoUrl:blob.url,logoData:''};
  }catch(err){
    console.error('Blob logo upload failed; using database fallback',err);
    return {logoUrl:'',logoData};
  }
}

async function sendEmail(data, id) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.COMMISSIONER_EMAIL;
  if (!key || !to) return { sent:false, reason:'email_not_configured' };

  const subject = `EFL Franchise Submission — ${data.teamName || 'Unknown Team'}`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#0b0710;color:#fff;padding:24px">
      <h2 style="color:#ffd979">👑 New EFL Franchise Profile Submission</h2>
      <p><b>Team:</b> ${escapeHtml(data.teamName)}</p>
      <p><b>Owner:</b> ${escapeHtml(data.ownerName)}</p>
      <p><b>Motto:</b> ${escapeHtml(data.motto)}</p>
      <p><b>Home Field:</b> ${escapeHtml(data.stadium)}</p>
      <p><b>Franchise Player:</b> ${escapeHtml(data.franchisePlayer)}</p>
      <p><b>Nemesis:</b> ${escapeHtml(data.nemesis)}</p>
      <p><b>Quote:</b> ${escapeHtml(data.quote)}</p>
      <p><b>Story:</b><br>${escapeHtml(data.story)}</p>
      <p style="margin-top:24px;color:#aaa">Submission #${id}. Review it from the EFL Commissioner Dashboard.</p>
    </div>`;
  const r = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from: process.env.RESEND_FROM || 'EFL Dynasty <onboarding@resend.dev>',
      to:[to],
      subject,
      html
    })
  });
  return { sent:r.ok, status:r.status };
}
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

export default async function handler(req,res){
  res.setHeader('Allow','POST');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});

  const contentLength = Number(req.headers['content-length'] || 0);
  if(contentLength > BODY_LIMIT) return json(res,413,{error:'Submission too large'});
  if(rateLimited(req)) {
    res.setHeader('Retry-After','600');
    return json(res,429,{error:'Too many submissions. Please try again later.'});
  }

  try{
    const sql=db(); await ensureTable(sql);
    const b=req.body||{};
    const logo = clean(b.logoData, 900000);
    if(!validImageDataUrl(logo)) return json(res,400,{error:'Invalid logo'});
    const data={
      teamName:clean(b.teamName,120),
      ownerName:clean(b.ownerName,120),
      motto:clean(b.motto,120),
      stadium:clean(b.stadium,120),
      primaryColor:clean(b.primaryColor,20),
      secondaryColor:clean(b.secondaryColor,20),
      franchisePlayer:clean(b.franchisePlayer,120),
      nemesis:clean(b.nemesis,120),
      quote:clean(b.quote,180),
      story:clean(b.story,700)
    };
    if(!data.teamName) return json(res,400,{error:'Team is required'});
    const storedLogo=await storeLogo(logo,data.teamName);
    const rows=await sql`
      INSERT INTO franchise_submissions
      (team_name,owner_name,motto,stadium,primary_color,secondary_color,franchise_player,nemesis,quote,story,logo_data,logo_url)
      VALUES(${data.teamName},${data.ownerName},${data.motto},${data.stadium},${data.primaryColor},${data.secondaryColor},${data.franchisePlayer},${data.nemesis},${data.quote},${data.story},${storedLogo.logoData},${storedLogo.logoUrl})
      RETURNING id, created_at
    `;
    let email={sent:false};
    try{ email=await sendEmail(data,rows[0].id); }catch(e){ email={sent:false,reason:'email_failed'}; }
    return json(res,200,{ok:true,id:rows[0].id,emailSent:email.sent,logoStorage:storedLogo.logoUrl?'blob':(storedLogo.logoData?'database':'none')});
  }catch(e){ console.error(e); return json(res,500,{error:'Submission failed'}); }
}
