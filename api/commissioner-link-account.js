import { neon } from '@neondatabase/serverless';
import { commissionerKeyOK, sameOrigin } from './_common.js';
import { ensureEflAccountSchema, requireEflSession } from '../lib/efl-account-data.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Origin check failed' });

  try {
    const session = await requireEflSession(req);
    if (!session?.user) return res.status(401).json({ error: 'Sign in with your verified EFL account first.' });

    const body = bodyOf(req);
    if (!commissionerKeyOK(String(body.key || ''))) {
      return res.status(401).json({ error: 'That Commissioner key was not accepted.' });
    }

    await ensureEflAccountSchema();
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
    const sql = neon(process.env.DATABASE_URL);

    await sql`
      UPDATE efl_profiles
      SET site_role='commissioner', updated_at=NOW()
      WHERE user_id=${session.user.id}
    `;
    await sql`
      INSERT INTO efl_account_audit_log(actor_user_id, action, target_user_id, detail)
      VALUES (${session.user.id}, 'primary_commissioner_account_linked', ${session.user.id}, 'Verified EFL account linked using Commissioner bootstrap credential')
    `;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Commissioner account link error:', error?.message || error);
    return res.status(Number(error?.status) || 500).json({ error: error?.message || 'Unable to link Commissioner access.' });
  }
}
