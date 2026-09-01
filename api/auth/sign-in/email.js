import { auth } from '../../../lib/efl-auth.js';
import { ensureAuthSchema } from '../../../lib/efl-auth-schema.js';

export default {
  async fetch(request) {
    try {
      await ensureAuthSchema();
      return auth.handler(request);
    } catch (error) {
      console.error('EFL auth sign-in unavailable:', error?.message || error);
      return Response.json({ error: 'Authentication service is not configured yet.' }, { status: 503 });
    }
  },
};
