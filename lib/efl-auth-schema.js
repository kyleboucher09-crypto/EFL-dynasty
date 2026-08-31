import { getMigrations } from 'better-auth/db/migration';
import { auth } from './efl-auth.js';

let schemaReady = globalThis.__eflBetterAuthSchemaReady || null;

export async function ensureAuthSchema() {
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
