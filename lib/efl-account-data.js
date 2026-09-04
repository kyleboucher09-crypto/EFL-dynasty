import { neon } from '@neondatabase/serverless';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, eflAuthPool, queueEflEmail, EFL_AUTH_BASE_URL } from './efl-auth.js';
import { ensureAuthSchema } from './efl-auth-schema.js';
import { findEflLeague } from './efl-leagues.js';

function sqlClient() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

async function accountTransaction(work) {
  const client = await eflAuthPool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function clean(v, max = 500) {
  return String(v ?? '').trim().slice(0, max);
}

function html(v) {
  return clean(v, 1000).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let schemaReady = globalThis.__eflAccountSchemaReady || null;
export async function ensureEflAccountSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = sqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS efl_profiles (
          user_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          site_role TEXT NOT NULL DEFAULT 'member',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE efl_profiles ADD COLUMN IF NOT EXISTS email TEXT`;
      await sql`
        CREATE TABLE IF NOT EXISTS efl_league_memberships (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          league_id TEXT NOT NULL,
          membership_type TEXT NOT NULL DEFAULT 'member',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, league_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS efl_franchise_claims (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          league_id TEXT NOT NULL,
          league_name TEXT NOT NULL,
          roster_id INTEGER NOT NULL,
          franchise_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          reviewed_by TEXT,
          review_note TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS efl_franchise_owners (
          league_id TEXT NOT NULL,
          roster_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          approved_claim_id BIGINT,
          approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY(league_id, roster_id),
          UNIQUE(user_id, league_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS efl_league_staff (
          league_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          assigned_by TEXT,
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY(league_id, user_id),
          CHECK(role IN ('moderator','commissioner'))
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS efl_account_audit_log (
          id BIGSERIAL PRIMARY KEY,
          actor_user_id TEXT,
          action TEXT NOT NULL,
          league_id TEXT,
          roster_id INTEGER,
          target_user_id TEXT,
          detail TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE TABLE IF NOT EXISTS efl_cosmetic_inventory (league_id TEXT NOT NULL,roster_id INTEGER NOT NULL,cosmetic_id TEXT NOT NULL,acquired_via TEXT NOT NULL,acquisition_key TEXT NOT NULL,acquired_by_user_id TEXT NOT NULL,acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(league_id,roster_id,cosmetic_id),UNIQUE(league_id,roster_id,acquisition_key),CHECK(acquired_via IN ('purchase','victory_crate','commissioner')))`;
      await sql`CREATE TABLE IF NOT EXISTS efl_economy_ledger (id BIGSERIAL PRIMARY KEY,league_id TEXT NOT NULL,roster_id INTEGER NOT NULL,user_id TEXT NOT NULL,kind TEXT NOT NULL,amount_ec INTEGER NOT NULL,cosmetic_id TEXT,reference_key TEXT NOT NULL,detail JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(league_id,roster_id,reference_key),CHECK(kind IN ('cosmetic_purchase','crate_duplicate_credit','commissioner_adjustment')),CHECK(amount_ec <> 0))`;
      await sql`CREATE TABLE IF NOT EXISTS efl_equipped_cosmetics (league_id TEXT NOT NULL,roster_id INTEGER NOT NULL,slot TEXT NOT NULL,cosmetic_id TEXT NOT NULL,equipped_by_user_id TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(league_id,roster_id,slot))`;
      await sql`CREATE TABLE IF NOT EXISTS efl_victory_crate_openings (league_id TEXT NOT NULL,roster_id INTEGER NOT NULL,win_key TEXT NOT NULL,opened_by_user_id TEXT NOT NULL,reward_type TEXT NOT NULL,reward_cosmetic_id TEXT,reward_ec INTEGER NOT NULL DEFAULT 0,opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(league_id,roster_id,win_key),CHECK(reward_type IN ('cosmetic','duplicate_credit')))`;
      await sql`CREATE TABLE IF NOT EXISTS efl_test_crates (id TEXT PRIMARY KEY,league_id TEXT NOT NULL,roster_id INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'ready',granted_by_user_id TEXT NOT NULL,grant_note TEXT NOT NULL,granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),opened_by_user_id TEXT,opened_at TIMESTAMPTZ,CHECK(status IN ('ready','opened','revoked')))`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_memberships_league ON efl_league_memberships(league_id, membership_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_claims_status ON efl_franchise_claims(status, requested_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_staff_role ON efl_league_staff(league_id, role)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_inventory_franchise ON efl_cosmetic_inventory(league_id, roster_id, acquired_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_ledger_franchise ON efl_economy_ledger(league_id, roster_id, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_crates_franchise ON efl_victory_crate_openings(league_id, roster_id, opened_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_efl_test_crates_franchise ON efl_test_crates(league_id, roster_id, status, granted_at DESC)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_efl_pending_claim_user_league ON efl_franchise_claims(user_id, league_id) WHERE status='pending'`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_efl_pending_claim_franchise ON efl_franchise_claims(league_id, roster_id) WHERE status='pending'`;
    })().catch(err => {
      schemaReady = null;
      globalThis.__eflAccountSchemaReady = null;
      throw err;
    });
    globalThis.__eflAccountSchemaReady = schemaReady;
  }
  return schemaReady;
}

export async function sessionForRequest(req) {
  await ensureAuthSchema();
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user ? session : null;
}

export async function ensureProfile(user) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const commissionerEmail = clean(process.env.COMMISSIONER_EMAIL, 320).toLowerCase();
  const email = clean(user.email, 320).toLowerCase();
  const role = commissionerEmail && email === commissionerEmail ? 'commissioner' : 'member';
  const displayName = clean(user.name || email.split('@')[0] || 'EFL Member', 120);
  await sql`
    INSERT INTO efl_profiles(user_id, display_name, email, site_role)
    VALUES (${user.id}, ${displayName}, ${email}, ${role})
    ON CONFLICT(user_id) DO UPDATE SET
      display_name=EXCLUDED.display_name,
      email=EXCLUDED.email,
      site_role=CASE WHEN efl_profiles.site_role='commissioner' THEN 'commissioner' ELSE EXCLUDED.site_role END,
      updated_at=NOW()
  `;
}

export async function requireEflSession(req) {
  const session = await sessionForRequest(req);
  if (!session?.user || !session.user.emailVerified) return null;
  await ensureProfile(session.user);
  return session;
}

export async function isPrimaryCommissionerUser(userId) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const rows = await sql`SELECT site_role FROM efl_profiles WHERE user_id=${userId} LIMIT 1`;
  return rows[0]?.site_role === 'commissioner';
}

export async function commissionerScope(userId) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const profiles = await sql`SELECT site_role FROM efl_profiles WHERE user_id=${userId} LIMIT 1`;
  if (profiles[0]?.site_role === 'commissioner') return { global: true, leagueIds: [] };
  const rows = await sql`SELECT league_id FROM efl_league_staff WHERE user_id=${userId} AND role='commissioner' ORDER BY league_id`;
  return { global: false, leagueIds: rows.map(row => String(row.league_id)) };
}

export async function isCommissionerUser(userId, leagueId = '') {
  const scope = await commissionerScope(userId);
  if (scope.global) return true;
  if (leagueId) return scope.leagueIds.includes(String(leagueId));
  return scope.leagueIds.length > 0;
}

export async function franchiseManagementAccess(userId, leagueId, rosterId) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const league = String(leagueId || '').trim();
  const roster = Number(rosterId);
  if (!league || !Number.isInteger(roster) || roster < 1) return { allowed: false, reason: 'invalid_target', role: null };

  const profiles = await sql`SELECT site_role FROM efl_profiles WHERE user_id=${userId} LIMIT 1`;
  if (profiles[0]?.site_role === 'commissioner') return { allowed: true, reason: 'primary_commissioner', role: 'commissioner' };

  const staff = await sql`SELECT role FROM efl_league_staff WHERE league_id=${league} AND user_id=${userId} LIMIT 1`;
  if (['moderator', 'commissioner'].includes(staff[0]?.role)) return { allowed: true, reason: 'league_staff', role: staff[0].role };

  const owners = await sql`SELECT user_id FROM efl_franchise_owners WHERE league_id=${league} AND roster_id=${roster} LIMIT 1`;
  if (owners[0]?.user_id === userId) return { allowed: true, reason: 'franchise_owner', role: 'owner' };
  return { allowed: false, reason: 'not_authorized', role: null };
}

export async function accountSnapshot(user) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const [profiles, memberships, claims, ownerships, staffRoles] = await Promise.all([
    sql`SELECT user_id, display_name, email, site_role, created_at FROM efl_profiles WHERE user_id=${user.id} LIMIT 1`,
    sql`SELECT league_id, membership_type, created_at, updated_at FROM efl_league_memberships WHERE user_id=${user.id} ORDER BY created_at`,
    sql`SELECT id, league_id, league_name, roster_id, franchise_name, status, requested_at, reviewed_at, review_note FROM efl_franchise_claims WHERE user_id=${user.id} ORDER BY requested_at DESC`,
    sql`
      SELECT o.league_id, o.roster_id, o.approved_at, c.franchise_name, c.league_name
      FROM efl_franchise_owners o
      LEFT JOIN efl_franchise_claims c ON c.id=o.approved_claim_id
      WHERE o.user_id=${user.id}
      ORDER BY o.approved_at DESC
    `,
    sql`SELECT league_id, role, assigned_at, updated_at FROM efl_league_staff WHERE user_id=${user.id} ORDER BY league_id`,
  ]);
  return { profile: profiles[0] || null, memberships, claims, ownerships, staffRoles };
}

export async function registerProspect(user, leagueId) {
  await ensureEflAccountSchema();
  const league = findEflLeague(leagueId);
  if (!league?.active || !league.acceptingProspects) throw Object.assign(new Error('That league is not accepting prospects.'), { status: 400 });
  await accountTransaction(async client => {
    await client.query("INSERT INTO efl_league_memberships(user_id,league_id,membership_type) VALUES($1,$2,'prospect') ON CONFLICT(user_id,league_id) DO UPDATE SET membership_type=CASE WHEN efl_league_memberships.membership_type='member' THEN 'member' ELSE 'prospect' END,updated_at=NOW()", [user.id, league.id]);
    await client.query("INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,target_user_id,detail) VALUES($1,'prospect_joined',$2,$1,'Joined league as a Prospect')", [user.id, league.id]);
  });
  return league;
}

async function sleeperFranchise(league, rosterId) {
  const sleeperId = league.sleeperLeagueId;
  const [leagueRes, rosterRes, userRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${sleeperId}`),
    fetch(`https://api.sleeper.app/v1/league/${sleeperId}/rosters`),
    fetch(`https://api.sleeper.app/v1/league/${sleeperId}/users`),
  ]);
  if (!leagueRes.ok || !rosterRes.ok || !userRes.ok) throw Object.assign(new Error('Sleeper could not validate that franchise right now.'), { status: 502 });
  const [sleeperLeague, rosters, users] = await Promise.all([leagueRes.json(), rosterRes.json(), userRes.json()]);
  const roster = rosters.find(item => Number(item.roster_id) === Number(rosterId));
  if (!roster) throw Object.assign(new Error('That franchise does not belong to the selected league.'), { status: 400 });
  const sleeperUser = users.find(item => item.user_id === roster.owner_id);
  const franchiseName = clean(sleeperUser?.metadata?.team_name || sleeperUser?.display_name || `Roster ${roster.roster_id}`, 160);
  return { sleeperLeague, roster, sleeperUser, franchiseName };
}

export async function submitFranchiseClaim(user, leagueId, rosterId) {
  await ensureEflAccountSchema();
  const league = findEflLeague(leagueId);
  if (!league?.active || !league.claimsEnabled) throw Object.assign(new Error('Franchise claims are not open for that league.'), { status: 400 });
  const rosterNumber = Number(rosterId);
  const validated = await sleeperFranchise(league, rosterNumber);
  let claim;
  try {
    claim = await accountTransaction(async client => {
      const owned = await client.query('SELECT user_id FROM efl_franchise_owners WHERE league_id=$1 AND roster_id=$2 LIMIT 1', [league.id, rosterNumber]);
      if (owned.rowCount) throw Object.assign(new Error('That franchise has already been claimed and approved.'), { status: 409 });
      const existingOwnership = await client.query('SELECT roster_id FROM efl_franchise_owners WHERE league_id=$1 AND user_id=$2 LIMIT 1', [league.id, user.id]);
      if (existingOwnership.rowCount) throw Object.assign(new Error('Your account already manages a franchise in this league.'), { status: 409 });
      await client.query("INSERT INTO efl_league_memberships(user_id,league_id,membership_type) VALUES($1,$2,'member') ON CONFLICT(user_id,league_id) DO UPDATE SET membership_type='member',updated_at=NOW()", [user.id, league.id]);
      const inserted = await client.query('INSERT INTO efl_franchise_claims(user_id,user_email,user_name,league_id,league_name,roster_id,franchise_name) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,league_id,league_name,roster_id,franchise_name,status,requested_at', [user.id, clean(user.email, 320).toLowerCase(), clean(user.name || user.email, 120), league.id, league.name, rosterNumber, validated.franchiseName]);
      await client.query("INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,target_user_id,detail) VALUES($1,'franchise_claim_requested',$2,$3,$1,$4)", [user.id, league.id, rosterNumber, validated.franchiseName]);
      return inserted.rows[0];
    });
  } catch (error) {
    const constraint = String(error?.constraint || '');
    const msg = `${constraint} ${String(error?.message || '')}`;
    if (msg.includes('uq_efl_pending_claim_user_league')) throw Object.assign(new Error('You already have a pending franchise claim in this league.'), { status: 409 });
    if (msg.includes('uq_efl_pending_claim_franchise')) throw Object.assign(new Error('Another manager already has a pending claim for that franchise.'), { status: 409 });
    throw error;
  }

  const accountUrl = `${EFL_AUTH_BASE_URL}/account.html`;
  queueEflEmail({
    to: user.email,
    subject: 'EFL franchise claim received — pending approval',
    text: `We received your claim for ${validated.franchiseName} in ${league.name}. It is pending Commissioner approval. You will receive another email when a decision is made. Account: ${accountUrl}`,
    html: `<div style="font-family:Arial,sans-serif;background:#07101d;color:#f4f8ff;padding:26px"><div style="max-width:580px;margin:auto;background:#0c1a2d;border:1px solid #234a7a;border-radius:18px;padding:24px"><div style="color:#ffd979;font-weight:900">CLAIM RECEIVED</div><h2>Pending Commissioner approval</h2><p>We received your request for <b>${html(validated.franchiseName)}</b> in <b>${html(league.name)}</b>.</p><p>Your claim is now <b>pending review</b>. You’ll receive another email as soon as the Commissioner approves or denies it.</p><p><a href="${accountUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1769e8;color:white;text-decoration:none;font-weight:800">VIEW MY EFL ACCOUNT</a></p><p style="color:#8092aa;font-size:12px">Franchise management remains locked until approval.</p></div></div>`,
  });

  const commissionerEmail = clean(process.env.COMMISSIONER_EMAIL, 320);
  if (commissionerEmail) {
    const reviewUrl = `${EFL_AUTH_BASE_URL}/account.html`;
    queueEflEmail({
      to: commissionerEmail,
      subject: `ACTION REQUIRED: EFL franchise claim — ${validated.franchiseName}`,
      text: `${user.name} (${user.email}) is requesting ${validated.franchiseName} in ${league.name}. Commissioner approval is required. Review: ${reviewUrl}`,
      html: `<div style="font-family:Arial,sans-serif;background:#07101d;color:#f4f8ff;padding:26px"><div style="max-width:580px;margin:auto;background:#0c1a2d;border:1px solid #234a7a;border-radius:18px;padding:24px"><div style="color:#ffd979;font-weight:900">ACTION REQUIRED · NEW FRANCHISE CLAIM</div><h2>${html(validated.franchiseName)}</h2><p>A verified EFL member is waiting for Commissioner approval.</p><p><b>League:</b> ${html(league.name)}<br><b>Manager:</b> ${html(user.name)}<br><b>Email:</b> ${html(user.email)}</p><p><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1769e8;color:white;text-decoration:none;font-weight:800">OPEN COMMISSIONER INBOX</a></p><p style="color:#8092aa;font-size:12px">Franchise management stays locked until this claim is approved.</p></div></div>`,
    });
  }
  return claim;
}

function scopeFilter(rows, scope) {
  if (!scope || scope.global) return rows;
  const allowed = new Set((scope.leagueIds || []).map(String));
  return rows.filter(row => allowed.has(String(row.league_id)));
}

export async function listCommissionerAccountData(scope = { global: true, leagueIds: [] }) {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const [claims, prospects] = await Promise.all([
    sql`SELECT id, user_id, user_email, user_name, league_id, league_name, roster_id, franchise_name, status, requested_at, reviewed_at, reviewed_by, review_note FROM efl_franchise_claims ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, requested_at DESC LIMIT 250`,
    sql`SELECT m.user_id, m.league_id, m.created_at, p.display_name, p.email FROM efl_league_memberships m LEFT JOIN efl_profiles p ON p.user_id=m.user_id WHERE m.membership_type='prospect' ORDER BY m.created_at DESC LIMIT 250`,
  ]);
  return { claims: scopeFilter(claims, scope), prospects: scopeFilter(prospects, scope) };
}

export async function reviewFranchiseClaim({ claimId, status, reviewerUserId, reviewNote, scope = { global: true, leagueIds: [] } }) {
  await ensureEflAccountSchema();
  if (!['approved', 'denied'].includes(status)) throw Object.assign(new Error('Review status must be approved or denied.'), { status: 400 });
  const note = clean(reviewNote, 500);
  const client = await eflAuthPool.connect();
  let claim;
  let updated;
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM efl_franchise_claims WHERE id=$1 FOR UPDATE', [Number(claimId)]);
    claim = result.rows[0];
    if (!claim) throw Object.assign(new Error('Claim not found.'), { status: 404 });
    if (!scope.global && !scope.leagueIds.includes(String(claim.league_id))) throw Object.assign(new Error('You do not have Commissioner access for that league.'), { status: 403 });
    if (claim.status !== 'pending') throw Object.assign(new Error('That claim has already been reviewed.'), { status: 409 });

    if (status === 'approved') {
      const existing = await client.query('SELECT user_id FROM efl_franchise_owners WHERE league_id=$1 AND roster_id=$2 LIMIT 1', [claim.league_id, claim.roster_id]);
      if (existing.rowCount) throw Object.assign(new Error('That franchise already has an approved owner.'), { status: 409 });
      const other = await client.query('SELECT roster_id FROM efl_franchise_owners WHERE league_id=$1 AND user_id=$2 LIMIT 1', [claim.league_id, claim.user_id]);
      if (other.rowCount) throw Object.assign(new Error('That manager already owns a franchise in this league.'), { status: 409 });
      await client.query('INSERT INTO efl_franchise_owners(league_id,roster_id,user_id,approved_claim_id) VALUES($1,$2,$3,$4)', [claim.league_id, claim.roster_id, claim.user_id, claim.id]);
      await client.query("UPDATE efl_league_memberships SET membership_type='member',updated_at=NOW() WHERE user_id=$1 AND league_id=$2", [claim.user_id, claim.league_id]);
    }

    const changed = await client.query('UPDATE efl_franchise_claims SET status=$1,reviewed_at=NOW(),reviewed_by=$2,review_note=$3 WHERE id=$4 RETURNING id,user_id,user_email,user_name,league_id,league_name,roster_id,franchise_name,status,requested_at,reviewed_at,review_note', [status, reviewerUserId || 'commissioner', note, claim.id]);
    updated = changed.rows[0];
    await client.query('INSERT INTO efl_account_audit_log(actor_user_id,action,league_id,roster_id,target_user_id,detail) VALUES($1,$2,$3,$4,$5,$6)', [reviewerUserId || null, status === 'approved' ? 'franchise_claim_approved' : 'franchise_claim_denied', claim.league_id, claim.roster_id, claim.user_id, claim.franchise_name]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error?.code === '23505') throw Object.assign(new Error('That franchise or manager already has an approved ownership record.'), { status: 409 });
    throw error;
  } finally {
    client.release();
  }

  const accountUrl = `${EFL_AUTH_BASE_URL}/account.html`;
  queueEflEmail({
    to: claim.user_email,
    subject: status === 'approved' ? 'Your EFL franchise claim was approved' : 'Update on your EFL franchise claim',
    text: status === 'approved'
      ? `Your claim for ${claim.franchise_name} in ${claim.league_name} was approved. Open your account: ${accountUrl}`
      : `Your claim for ${claim.franchise_name} in ${claim.league_name} was denied.${note ? ` Note: ${note}` : ''}`,
    html: `<div style="font-family:Arial,sans-serif;background:#07101d;color:#f4f8ff;padding:26px"><div style="max-width:580px;margin:auto;background:#0c1a2d;border:1px solid #234a7a;border-radius:18px;padding:24px"><div style="color:#ffd979;font-weight:900">EFL DYNASTY</div><h2>${status === 'approved' ? 'Franchise unlocked' : 'Franchise claim update'}</h2><p>Your request for <b>${html(claim.franchise_name)}</b> in <b>${html(claim.league_name)}</b> was <b>${html(status)}</b>.</p>${note ? `<p>${html(note)}</p>` : ''}${status === 'approved' ? `<p><a href="${accountUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1769e8;color:white;text-decoration:none;font-weight:800">OPEN MY EFL ACCOUNT</a></p>` : ''}</div></div>`,
  });
  return updated;
}

export async function listLeagueStaffAdminData() {
  await ensureEflAccountSchema();
  const sql = sqlClient();
  const [members, staff] = await Promise.all([
    sql`
      SELECT m.user_id, m.league_id, m.membership_type, m.created_at, p.display_name, p.email, p.site_role
      FROM efl_league_memberships m
      LEFT JOIN efl_profiles p ON p.user_id=m.user_id
      ORDER BY m.league_id, p.display_name, m.created_at
    `,
    sql`
      SELECT s.league_id, s.user_id, s.role, s.assigned_by, s.assigned_at, s.updated_at, p.display_name, p.email
      FROM efl_league_staff s
      LEFT JOIN efl_profiles p ON p.user_id=s.user_id
      ORDER BY s.league_id, s.role, p.display_name
    `,
  ]);
  return { members, staff };
}

export async function setLeagueStaffRole({ leagueId, userId, role, actorUserId }) {
  await ensureEflAccountSchema();
  const league = findEflLeague(leagueId);
  if (!league?.active) throw Object.assign(new Error('That league is not available.'), { status: 400 });
  const targetUserId = clean(userId, 200);
  const desiredRole = clean(role, 40).toLowerCase();
  if (!targetUserId) throw Object.assign(new Error('Select an EFL member first.'), { status: 400 });
  if (!['member', 'moderator', 'commissioner'].includes(desiredRole)) throw Object.assign(new Error('Role must be member, moderator, or commissioner.'), { status: 400 });

  const sql = sqlClient();
  const targetProfiles = await sql`SELECT user_id, display_name, email, site_role FROM efl_profiles WHERE user_id=${targetUserId} LIMIT 1`;
  const target = targetProfiles[0];
  if (!target) throw Object.assign(new Error('That EFL account could not be found.'), { status: 404 });
  if (target.site_role === 'commissioner') throw Object.assign(new Error('The primary Commissioner account cannot be changed here.'), { status: 403 });
  const memberships = await sql`SELECT user_id FROM efl_league_memberships WHERE user_id=${targetUserId} AND league_id=${league.id} LIMIT 1`;
  if (!memberships.length) throw Object.assign(new Error('That account must join this league before receiving a staff role.'), { status: 409 });

  if (desiredRole === 'member') {
    await sql`DELETE FROM efl_league_staff WHERE league_id=${league.id} AND user_id=${targetUserId}`;
  } else {
    await sql`
      INSERT INTO efl_league_staff(league_id, user_id, role, assigned_by)
      VALUES (${league.id}, ${targetUserId}, ${desiredRole}, ${actorUserId})
      ON CONFLICT(league_id, user_id) DO UPDATE SET
        role=EXCLUDED.role,
        assigned_by=EXCLUDED.assigned_by,
        updated_at=NOW()
    `;
  }

  await sql`INSERT INTO efl_account_audit_log(actor_user_id, action, league_id, target_user_id, detail) VALUES (${actorUserId}, 'league_staff_role_changed', ${league.id}, ${targetUserId}, ${desiredRole})`;

  if (target.email) {
    const label = desiredRole === 'member' ? 'Member' : desiredRole === 'moderator' ? 'Moderator' : 'Commissioner';
    const accountUrl = `${EFL_AUTH_BASE_URL}/account.html`;
    queueEflEmail({
      to: target.email,
      subject: desiredRole === 'member' ? `Your EFL ${league.name} staff access changed` : `You are now an EFL ${label}`,
      text: desiredRole === 'member'
        ? `Your elevated staff access for ${league.name} has been removed. Your normal membership and any approved franchise ownership are unchanged.`
        : `You were assigned the ${label} role for ${league.name}. ${desiredRole === 'moderator' ? 'You can manage any franchise in this league.' : 'You can review franchise claims and manage any franchise in this league.'} Open your account: ${accountUrl}`,
      html: `<div style="font-family:Arial,sans-serif;background:#07101d;color:#f4f8ff;padding:26px"><div style="max-width:580px;margin:auto;background:#0c1a2d;border:1px solid #234a7a;border-radius:18px;padding:24px"><div style="color:#ffd979;font-weight:900">EFL STAFF ACCESS</div><h2>${desiredRole === 'member' ? 'Staff role removed' : `${html(label)} access granted`}</h2><p><b>League:</b> ${html(league.name)}</p><p>${desiredRole === 'member' ? 'Your normal EFL membership and approved franchise ownership are unchanged.' : desiredRole === 'moderator' ? 'You can now manage Franchise Headquarters for any franchise in this league.' : 'You can now review franchise claims and manage Franchise Headquarters for any franchise in this league.'}</p>${desiredRole !== 'member' ? `<p><a href="${accountUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1769e8;color:white;text-decoration:none;font-weight:800">OPEN EFL ACCOUNT</a></p>` : ''}</div></div>`,
    });
  }

  return { leagueId: league.id, userId: targetUserId, role: desiredRole };
}
