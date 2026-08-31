import { sameOrigin } from './_common.js';
import { isPrimaryCommissionerUser, listLeagueStaffAdminData, requireEflSession, setLeagueStaffRole } from '../lib/efl-account-data.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

async function primaryCommissioner(req) {
  const session = await requireEflSession(req).catch(() => null);
  if (!session?.user) return null;
  return await isPrimaryCommissionerUser(session.user.id) ? session : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (req.method === 'POST' && !sameOrigin(req)) return res.status(403).json({ error: 'Origin check failed' });

  try {
    const session = await primaryCommissioner(req);
    if (!session) return res.status(403).json({ error: 'Primary Commissioner account required.' });

    if (req.method === 'GET') {
      const data = await listLeagueStaffAdminData();
      return res.status(200).json({ ...data, primaryCommissionerUserId: session.user.id });
    }

    const body = bodyOf(req);
    const result = await setLeagueStaffRole({
      leagueId: String(body.leagueId || '').trim(),
      userId: String(body.userId || '').trim(),
      role: String(body.role || '').trim(),
      actorUserId: session.user.id,
    });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Commissioner staff role error:', error);
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Unable to update staff access.' });
  }
}
