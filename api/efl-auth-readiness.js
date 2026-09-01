import { eflPublicSignupReadiness } from '../lib/efl-auth.js';

function signupBlocker(ready) {
  if (!ready.coreConfigured) return 'auth_not_configured';
  if (!ready.emailConfigured) return 'email_not_configured';
  if (!ready.signupRequested) return 'signup_not_enabled';
  if (!ready.verified) return ready.status || 'sender_not_verified';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ready = await eflPublicSignupReadiness();
    return res.status(200).json({
      signInAvailable: ready.coreConfigured,
      passwordResetAvailable: ready.coreConfigured && ready.emailConfigured && ready.verified,
      publicSignupAvailable: ready.publicSignupEnabled,
      signupMode: ready.signupMode,
      signupBlocker: signupBlocker(ready),
    });
  } catch {
    return res.status(503).json({
      signInAvailable: false,
      passwordResetAvailable: false,
      publicSignupAvailable: false,
      signupMode: 'unavailable',
      signupBlocker: 'readiness_check_failed',
    });
  }
}
