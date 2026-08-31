import { commissionerOK, sameOrigin } from './_common.js';
import { commissionerScope, listCommissionerAccountData, requireEflSession, reviewFranchiseClaim } from '../lib/efl-account-data.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

async function reviewer(req) {
  const session = await requireEflSession(req).catch(() => null);
  if (session?.user) {
    const scope = await commissionerScope(session.user.id);
    if (scope.global || scope.leagueIds.length) return { ok: true, reviewerUserId: session.user.id, scope };
  }
  if (commissionerOK(req)) return { ok: true, reviewerUserId: 'commissioner-key', scope: { global: true, leagueIds: [] } };
  return { ok: false };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (req.method === 'POST' && !sameOrigin(req)) return res.status(403).json({ error: 'Origin check failed' });
  try {
    const access = await reviewer(req);
    if (!access.ok) return res.status(401).json({ error: 'Commissioner access required' });

    if (req.method === 'GET') {
      const data = await listCommissionerAccountData(access.scope);
      return res.status(200).json({ ...data, scope: access.scope });
    }

    const body = bodyOf(req);
    const claimId = Number(body.claimId);
    const status = String(body.status || '').trim().toLowerCase();
    if (!Number.isInteger(claimId) || claimId < 1) return res.status(400).json({ error: 'Invalid claim ID' });
    const claim = await reviewFranchiseClaim({
      claimId,
      status,
      reviewerUserId: access.reviewerUserId,
      reviewNote: String(body.note || '').trim(),
      scope: access.scope,
    });
    return res.status(200).json({ ok: true, claim });
  } catch (error) {
    console.error('Commissioner account claim error:', error);
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Unable to review franchise claim.' });
  }
}
