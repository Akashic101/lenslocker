import { defineConfig } from 'drizzle-kit';

const database_url =
	process.env.DATABASE_URL ??
	(process.env.NODE_ENV === 'production'
		? (() => {
				throw new Error('DATABASE_URL is required in production');
		  })()
		: './local.db');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: database_url },
	verbose: true,
	strict: true
});