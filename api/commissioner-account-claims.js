import { commissionerOK, sameOrigin } from './_common.js';
import { isCommissionerUser, listCommissionerAccountData, requireEflSession, reviewFranchiseClaim } from '../lib/efl-account-data.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

async function reviewer(req) {
  if (commissionerOK(req)) return { ok: true, reviewerUserId: 'commissioner-key' };
  const session = await requireEflSession(req).catch(() => null);
  if (!session?.user) return { ok: false };
  const allowed = await isCommissionerUser(session.user.id);
  return allowed ? { ok: true, reviewerUserId: session.user.id } : { ok: false };
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
      const data = await listCommissionerAccountData();
      return res.status(200).json(data);
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
    });
    return res.status(200).json({ ok: true, claim });
  } catch (error) {
    console.error('Commissioner account claim error:', error);
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Unable to review franchise claim.' });
  }
}
