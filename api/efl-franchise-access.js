import { franchiseManagementAccess, requireEflSession } from '../lib/efl-account-data.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const session = await requireEflSession(req);
    if (!session?.user) return res.status(401).json({ allowed: false, error: 'Verified EFL account required.' });
    const leagueId = String(req.query?.leagueId || '').trim();
    const rosterId = Number(req.query?.rosterId);
    const access = await franchiseManagementAccess(session.user.id, leagueId, rosterId);
    return res.status(access.allowed ? 200 : 403).json(access);
  } catch (error) {
    console.error('Franchise access check error:', error);
    return res.status(500).json({ allowed: false, error: 'Unable to verify franchise access.' });
  }
}
