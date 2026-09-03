import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { attachDatabasePool, waitUntil } from '@vercel/functions';

const DATABASE_URL = process.env.DATABASE_URL || '';
const PROD_BASE_URL = process.env.BETTER_AUTH_URL || 'https://www.efldynasty.com';
const VERCEL_PREVIEW_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
const VERCEL_BRANCH_URL = process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : '';
const BASE_URL = process.env.VERCEL_ENV === 'preview' && VERCEL_PREVIEW_URL ? VERCEL_PREVIEW_URL : PROD_BASE_URL;
const PUBLIC_SIGNUP_SETTING = String(process.env.EFL_PUBLIC_SIGNUP_ENABLED || '').trim().toLowerCase();
const PUBLIC_SIGNUP_ENABLED = PUBLIC_SIGNUP_SETTING === 'true';
const PREVIEW_AUTO_SIGNUP = process.env.VERCEL_ENV === 'preview' && !PUBLIC_SIGNUP_SETTING;

if (!DATABASE_URL) throw new Error('DATABASE_URL is not configured');

export const eflAuthPool = globalThis.__eflAuthPool || new Pool({
  connectionString: DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});
globalThis.__eflAuthPool = eflAuthPool;
try { attachDatabasePool(eflAuthPool); } catch {}

export async function sendEflEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = process.env.EFL_AUTH_FROM_EMAIL || '';
  if (!apiKey || !from) throw new Error('EFL transactional email is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text, html }),
  });
  if (!response.ok) {
    const providerBody = await response.text().catch(() => '');
    const safeDetail = providerBody.replace(/re_[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 1200);
    console.error(JSON.stringify({ level: 'error', event: 'efl_email_rejected', status: response.status, subject }));
    throw new Error(`Email provider returned ${response.status}${safeDetail ? `: ${safeDetail}` : ''}`);
  }
  const result = await response.json().catch(() => ({}));
  console.log(JSON.stringify({ level: 'info', event: 'efl_email_accepted', status: response.status, subject, providerMessageId: result?.id || null }));
  return result;
}

function queueEmail(message) {
  try {
    waitUntil(sendEflEmail(message).catch(err => console.error('EFL email failed:', err?.message || err)));
  } catch {
    void sendEflEmail(message).catch(err => console.error('EFL email failed:', err?.message || err));
  }
}

function emailShell(title, body, actionLabel, actionUrl) {
  const safeTitle = String(title || 'EFL Dynasty');
  const safeBody = String(body || '');
  const action = actionUrl ? `<p style="margin:24px 0"><a href="${actionUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1769e8;color:#fff;text-decoration:none;font-weight:800">${actionLabel || 'Open EFL'}</a></p>` : '';
  return `<div style="font-family:Arial,sans-serif;background:#07101d;color:#f4f8ff;padding:28px"><div style="max-width:580px;margin:auto;background:#0c1a2d;border:1px solid #234a7a;border-radius:18px;padding:26px"><div style="color:#ffd979;font-size:12px;font-weight:900;letter-spacing:.12em">EFL DYNASTY</div><h1 style="font-size:25px;margin:8px 0 14px">${safeTitle}</h1><div style="color:#c7d4e5;font-size:15px;line-height:1.6">${safeBody}</div>${action}<div style="margin-top:24px;color:#74879f;font-size:11px">Elite Fantasy Footballers · EFL Dynasty</div></div></div>`;
}

const trustedOrigins = [...new Set([
  BASE_URL,
  PROD_BASE_URL,
  VERCEL_PREVIEW_URL,
  VERCEL_BRANCH_URL,
  'https://www.efldynasty.com',
  'https://efldynasty.com',
].filter(Boolean))];

export const auth = betterAuth({
  appName: 'EFL Dynasty',
  database: eflAuthPool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: BASE_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await sendEflEmail({
        to: user.email,
        subject: 'Reset your EFL password',
        text: `Reset your EFL Dynasty password: ${url}`,
        html: emailShell('Reset your password', 'A password reset was requested for your EFL account. If this was you, use the secure link below. If not, you can ignore this message.', 'RESET PASSWORD', url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEflEmail({
        to: user.email,
        subject: 'Verify your EFL account',
        text: `Verify your EFL Dynasty account: ${url}`,
        html: emailShell('Verify your EFL account', 'Confirm this email address to finish creating your EFL account. Franchise claims and Prospect registration stay locked until verification is complete.', 'VERIFY EMAIL', url),
      });
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 80,
    storage: 'database',
    customRules: {
      '/sign-up/email': { window: 60, max: 5 },
      '/sign-in/email': { window: 60, max: 10 },
      '/request-password-reset': { window: 300, max: 5 },
      '/send-verification-email': { window: 300, max: 5 },
    },
  },
});

export function queueEflEmail(message) {
  queueEmail(message);
}

export const EFL_AUTH_BASE_URL = BASE_URL;
export function eflAuthReadiness() {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EFL_AUTH_FROM_EMAIL);
  const coreConfigured = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && BASE_URL);
  return { coreConfigured, emailConfigured, signupFlagEnabled: PUBLIC_SIGNUP_ENABLED, previewAutoSignupEnabled: PREVIEW_AUTO_SIGNUP, signupRequested: PUBLIC_SIGNUP_ENABLED || PREVIEW_AUTO_SIGNUP };
}

function configuredSenderDomain() {
  const match = String(process.env.EFL_AUTH_FROM_EMAIL || '').match(/@([a-z0-9.-]+)>?$/i);
  return match?.[1]?.toLowerCase() || null;
}

let providerReadiness = globalThis.__eflEmailProviderReadiness || null;
export async function eflEmailProviderReadiness() {
  const domain = configuredSenderDomain();
  if (!process.env.RESEND_API_KEY || !domain) return { checked: false, verified: false, status: 'not_configured', senderDomain: domain };
  if (providerReadiness && providerReadiness.domain === domain && Date.now() - providerReadiness.checkedAt < 300_000) return providerReadiness.value;
  let value;
  try {
    const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      const providerBody = await response.json().catch(() => ({}));
      const providerCode = String(providerBody?.name || providerBody?.code || '').toLowerCase();
      const sendingOnlyKey = response.status === 401 && providerCode === 'restricted_api_key';
      value = {
        checked: true,
        verified: sendingOnlyKey,
        status: sendingOnlyKey ? 'sending_key_ready' : `provider_${response.status}`,
        senderDomain: domain,
      };
    } else {
      const json = await response.json();
      const domains = Array.isArray(json?.data) ? json.data : [];
      const entry = domains.find(item => { const configured = String(item?.name || '').toLowerCase(); return configured && (domain === configured || domain.endsWith(`.${configured}`)); });
      value = { checked: true, verified: String(entry?.status || '').toLowerCase() === 'verified', status: entry?.status || 'domain_not_found', senderDomain: domain };
    }
  } catch {
    value = { checked: true, verified: false, status: 'provider_unavailable', senderDomain: domain };
  }
  providerReadiness = { domain, checkedAt: Date.now(), value };
  globalThis.__eflEmailProviderReadiness = providerReadiness;
  return value;
}

export async function eflPublicSignupReadiness() {
  const readiness = eflAuthReadiness();
  const provider = await eflEmailProviderReadiness();
  return { ...readiness, ...provider, signupMode: readiness.signupFlagEnabled ? 'explicit' : readiness.previewAutoSignupEnabled ? 'preview-auto' : 'disabled', publicSignupEnabled: readiness.coreConfigured && readiness.emailConfigured && readiness.signupRequested && provider.verified };
}
