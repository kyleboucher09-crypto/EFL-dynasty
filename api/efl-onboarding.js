import { accountSnapshot, registerProspect, requireEflSession, submitFranchiseClaim } from '../lib/efl-account-data.js';
import { sameOrigin } from './_common.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Origin check failed' });

  try {
    const session = await requireEflSession(req);
    if (!session) return res.status(401).json({ error: 'Sign in with a verified EFL account first.' });
    const body = bodyOf(req);
    const mode = String(body.mode || '').trim().toLowerCase();
    const leagueId = String(body.leagueId || '').trim();
    if (!leagueId) return res.status(400).json({ error: 'Select a league first.' });

    let result;
    if (mode === 'prospect') {
      result = { type: 'prospect', league: await registerProspect(session.user, leagueId) };
    } else if (mode === 'claim') {
      const rosterId = Number(body.rosterId);
      if (!Number.isInteger(rosterId) || rosterId < 1) return res.status(400).json({ error: 'Select a franchise first.' });
      result = { type: 'claim', claim: await submitFranchiseClaim(session.user, leagueId, rosterId) };
    } else {
      return res.status(400).json({ error: 'Choose whether you own a franchise or are joining as a Prospect.' });
    }

    const account = await accountSnapshot(session.user);
    return res.status(200).json({ ok: true, result, account });
  } catch (error) {
    console.error('EFL onboarding error:', error);
    const status = Number(error?.status) || 500;
    return res.status(status).json({ error: error?.message || 'Unable to complete onboarding.' });
  }
}
