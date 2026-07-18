/**
 * Add cached rating columns to chess_account.
 *
 * Usage: node --env-file=.env scripts/migrate-chess-account-ratings.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

/**
 * @param {string} column
 * @param {string} definition
 */
async function addColumnIfMissing(column, definition) {
	const [rows] = await conn.query(
		`SELECT COLUMN_NAME FROM information_schema.COLUMNS
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chess_account' AND COLUMN_NAME = ?
		 LIMIT 1`,
		[column]
	);

	if (rows.length) {
		console.log(`chess_account.${column} already exists`);
		return;
	}

	await conn.query(`ALTER TABLE \`chess_account\` ADD COLUMN ${definition}`);
	console.log(`Added chess_account.${column}`);
}

await addColumnIfMissing('rating', `\`rating\` INT NULL AFTER \`title\``);
await addColumnIfMissing('ratings_json', `\`ratings_json\` TEXT NULL AFTER \`rating\``);
await addColumnIfMissing(
	'ratings_updated_at',
	`\`ratings_updated_at\` TIMESTAMP(3) NULL AFTER \`ratings_json\``
);

await conn.end();
console.log('chess_account ratings cache migration complete');
