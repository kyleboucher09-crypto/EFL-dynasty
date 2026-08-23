import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

let schemaReady = globalThis.__eflSchemaReady || null;
export async function ensureTable(sql) {
  if (!schemaReady) {
    schemaReady = (async()=>{
      await sql`
        CREATE TABLE IF NOT EXISTS franchise_submissions (
          id BIGSERIAL PRIMARY KEY,
          team_name TEXT NOT NULL,
          owner_name TEXT,
          motto TEXT,
          stadium TEXT,
          primary_color TEXT,
          secondary_color TEXT,
          franchise_player TEXT,
          nemesis TEXT,
          quote TEXT,
          story TEXT,
          logo_data TEXT,
          logo_url TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          review_note TEXT
        )
      `;
      await sql`ALTER TABLE franchise_submissions ADD COLUMN IF NOT EXISTS logo_url TEXT`;
      await sql`CREATE INDEX IF NOT EXISTS idx_franchise_submissions_status_created ON franchise_submissions(status, created_at DESC)`;
    })().catch(err=>{ schemaReady=null; globalThis.__eflSchemaReady=null; throw err; });
    globalThis.__eflSchemaReady=schemaReady;
  }
  return schemaReady;
}

export function json(res, status, body) {
  res.status(status).json(body);
}

export function clean(v, max=1000) {
  return String(v ?? '').trim().slice(0,max);
}

export function noStore(res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
}

export function sameOrigin(req){
  const origin=String(req.headers.origin||'').trim();
  if(!origin) return true;
  const forwardedProto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(!host) return false;
  try{return new URL(origin).origin===`${forwardedProto}://${host}`}catch{return false}
}

function expectedKey(){ return process.env.COMMISSIONER_KEY || ''; }
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||''));
  return aa.length===bb.length && aa.length>0 && crypto.timingSafeEqual(aa,bb);
}
function parseCookies(req){
  return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));
}
function signExpiry(exp){ return crypto.createHmac('sha256',expectedKey()).update(String(exp)).digest('base64url'); }
export function createCommissionerSession(){
  if(!expectedKey()) throw new Error('COMMISSIONER_KEY is not configured');
  const exp=Date.now()+8*60*60*1000;
  return `${exp}.${signExpiry(exp)}`;
}
export function setCommissionerCookie(res,token){
  res.setHeader('Set-Cookie',`efl_commissioner=${encodeURIComponent(token)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${8*60*60}`);
}
export function clearCommissionerCookie(res){
  res.setHeader('Set-Cookie','efl_commissioner=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}
export function commissionerKeyOK(supplied){ return safeEqual(supplied,expectedKey()); }
export function commissionerOK(req) {
  const supplied = req.headers['x-commissioner-key'];
  if(commissionerKeyOK(supplied)) return true;
  const token=parseCookies(req).efl_commissioner;
  if(!token) return false;
  const [expRaw,sig]=String(token).split('.');
  const exp=Number(expRaw);
  if(!exp||exp<Date.now()||!sig) return false;
  return safeEqual(sig,signExpiry(exp));
}
