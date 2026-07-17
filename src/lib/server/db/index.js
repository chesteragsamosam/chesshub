import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

/**
 * Reuse one pool across Vite HMR reloads. Without this, each module re-eval
 * opens another pool and MySQL eventually returns ER_CON_COUNT_ERROR
 * ("Too many connections"), which surfaces as "Unexpected error" on login.
 * @type {import('mysql2/promise').Pool}
 */
const client =
	globalThis.__chesshubMysqlPool ??
	mysql.createPool({
		uri: env.DATABASE_URL,
		connectionLimit: 10,
		waitForConnections: true,
		maxIdle: 5,
		idleTimeout: 60_000,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0
	});

if (dev) {
	globalThis.__chesshubMysqlPool = client;
}

export const db = drizzle(client, { schema, mode: 'default' });
