
import { neon } from '@neondatabase/serverless';

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

export async function ensureTable(sql) {
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
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      review_note TEXT
    )
  `;
}

export function json(res, status, body) {
  res.status(status).json(body);
}

export function clean(v, max=1000) {
  return String(v ?? '').trim().slice(0,max);
}

export function commissionerOK(req) {
  const supplied = req.headers['x-commissioner-key'];
  const expected = process.env.COMMISSIONER_KEY;
  return Boolean(expected && supplied && supplied === expected);
}
