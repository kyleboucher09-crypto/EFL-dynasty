import { accountSnapshot, requireEflSession } from '../lib/efl-account-data.js';
import { EFL_LEAGUES } from '../lib/efl-leagues.js';

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const session = await requireEflSession(req);
    if (!session) return res.status(401).json({ authenticated: false });
    const account = await accountSnapshot(session.user);
    return res.status(200).json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: Boolean(session.user.emailVerified),
        image: session.user.image || null,
      },
      account,
      leagues: EFL_LEAGUES.filter(league => league.active),
    });
  } catch (error) {
    console.error('EFL account snapshot error:', error);
    return res.status(503).json({ error: 'EFL accounts are not configured yet.' });
  }
}
