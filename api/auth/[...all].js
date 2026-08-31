import { getMigrations } from 'better-auth/db/migration';
import { auth } from '../../lib/efl-auth.js';

let schemaReady = globalThis.__eflBetterAuthSchemaReady || null;
async function ensureAuthSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const { runMigrations } = await getMigrations(auth.options);
      await runMigrations();
    })().catch(err => {
      schemaReady = null;
      globalThis.__eflBetterAuthSchemaReady = null;
      throw err;
    });
    globalThis.__eflBetterAuthSchemaReady = schemaReady;
  }
  return schemaReady;
}

export default {
  async fetch(request) {
    try {
      await ensureAuthSchema();
      return auth.handler(request);
    } catch (error) {
      console.error('EFL auth unavailable:', error?.message || error);
      return Response.json({ error: 'Authentication service is not configured yet.' }, { status: 503 });
    }
  },
};
