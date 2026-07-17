/**
 * Add tournament.lichess_arena_password and tournament_registration.lichess_joined_at.
 *
 * Usage: node --env-file=.env scripts/migrate-lichess-arena-password.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

/**
 * @param {string} table
 * @param {string} column
 */
async function columnExists(table, column) {
	const [rows] = await conn.query(
		`SELECT 1 FROM information_schema.COLUMNS
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
		 LIMIT 1`,
		[table, column]
	);
	return rows.length > 0;
}

if (!(await columnExists('tournament', 'lichess_arena_password'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`lichess_arena_password\` TEXT NULL
		 AFTER \`lichess_tournament_format\``
	);
	console.log('Added tournament.lichess_arena_password');
} else {
	console.log('tournament.lichess_arena_password already present');
}

if (!(await columnExists('tournament_registration', 'lichess_joined_at'))) {
	await conn.query(
		`ALTER TABLE \`tournament_registration\`
		 ADD \`lichess_joined_at\` TIMESTAMP(3) NULL
		 AFTER \`paid_at\``
	);
	console.log('Added tournament_registration.lichess_joined_at');
} else {
	console.log('tournament_registration.lichess_joined_at already present');
}

await conn.end();
console.log('Lichess Arena password migration complete');
