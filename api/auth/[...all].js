import { auth, eflAuthReadiness } from '../../lib/efl-auth.js';
import { ensureAuthSchema } from '../../lib/efl-auth-schema.js';

export default {
  async fetch(request) {
    try {
      const path = new URL(request.url).pathname;
      const readiness = eflAuthReadiness();
      if (path.endsWith('/sign-up/email') && !readiness.publicSignupEnabled) return Response.json({ error: 'New EFL account registration is temporarily closed while email verification is being activated.' }, { status: 503 });
      if (path.endsWith('/request-password-reset') && !readiness.emailConfigured) return Response.json({ error: 'Password-reset email is not configured yet.' }, { status: 503 });
      await ensureAuthSchema();
      return auth.handler(request);
    } catch (error) {
      console.error('EFL auth unavailable:', error?.message || error);
      return Response.json({ error: 'Authentication service is not configured yet.' }, { status: 503 });
    }
  },
};
