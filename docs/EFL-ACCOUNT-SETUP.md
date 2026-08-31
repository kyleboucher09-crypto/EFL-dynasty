# EFL Account System — Activation Guide

The account system is designed around Better Auth + PostgreSQL and the existing EFL Vercel/Neon database.

## Account flow

1. Create an EFL account with name, email and password.
2. Verify the email address from the verification email.
3. Sign in with the verified account.
4. Select an EFL league.
5. Choose one path:
   - **Franchise Owner** — select a Sleeper franchise and submit a claim.
   - **Prospect** — join the selected league without franchise-management permissions.
6. Franchise claims remain pending until the Commissioner approves or denies them.
7. Approved owners receive persistent management permission for that league + roster combination.

Prospect membership and franchise ownership are intentionally separate. A Prospect can later submit a claim from the same account. One account can also belong to multiple EFL leagues as the platform expands.

## Required Vercel environment variables

These values must be stored in Vercel environment variables. Never commit them to GitHub.

- `DATABASE_URL` — already used by the EFL site.
- `BETTER_AUTH_SECRET` — a new high-entropy secret, at least 32 characters.
- `BETTER_AUTH_URL` — production value: `https://www.efldynasty.com`.
- `RESEND_API_KEY` — API key for transactional account emails. The key must have sending permission for `efldynasty.com` (or all verified domains).
- `EFL_AUTH_FROM_EMAIL` — verified sender, recommended: `EFL Dynasty <accounts@efldynasty.com>`.
- `COMMISSIONER_EMAIL` — email that receives new franchise-claim notifications. It also identifies the commissioner EFL account role once that email signs up and verifies.

Existing `COMMISSIONER_KEY` remains supported as a bootstrap/fallback for the Commissioner Account Inbox while the commissioner account is being established.

After adding or changing any of these environment variables, create a fresh Vercel deployment before testing so the preview/runtime picks up the new values. Auth and email variables used for feature-branch testing must be enabled for the **Preview** environment as well as Production.

## Transactional email domain

Before public signup opens, configure and verify `efldynasty.com` with the transactional email provider so verification, reset and claim emails pass SPF/DKIM checks and do not look like spoofed mail.

## Security rules built into the system

- Email verification is required before EFL onboarding.
- Passwords and sessions are handled by Better Auth, not custom EFL password code.
- Password-reset links expire.
- Auth requests are rate limited.
- Sessions are database backed.
- Franchise claim mutation requires an authenticated, verified session.
- A claim never grants management permission by itself.
- Commissioner approval creates the actual franchise-ownership record.
- One approved owner per franchise per league.
- One approved franchise per account per league.
- Prospect accounts have no franchise-management permission.
- Commissioner approvals/denials and account actions are written to an audit log.
- Public Franchise pages can remain public; authenticated ownership controls editing only.

## New pages

- `/account.html` — signup, sign-in, league selection, Prospect registration and franchise claiming.
- `/reset-password.html` — secure password reset completion.
- `/commissioner-accounts.html` — secure franchise-claim inbox and Prospect pool.

## Database data owned by EFL

Better Auth manages its own user/session/account/verification tables. EFL-specific tables are separate:

- `efl_profiles`
- `efl_league_memberships`
- `efl_franchise_claims`
- `efl_franchise_owners`
- `efl_account_audit_log`

The next economy milestone should reference `efl_franchise_owners` before allowing any wallet, crate, cosmetic, inventory or Headquarters mutation.
