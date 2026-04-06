import { defineConfig } from 'drizzle-kit';

/** Fallback when `DATABASE_URL` is unset (e.g. Knip); align with `.env.example`. */
const database_url = process.env.DATABASE_URL ?? 'file:./local.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: database_url },
	verbose: true,
	strict: true
});
