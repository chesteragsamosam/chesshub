/**
 * Add federation + title columns to chess_account for FIDE linking.
 *
 * Usage: node --env-file=.env scripts/migrate-chess-account-fide.mjs
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

await addColumnIfMissing(
	'federation',
	`\`federation\` VARCHAR(3) NULL AFTER \`display_name\``
);
await addColumnIfMissing('title', `\`title\` VARCHAR(10) NULL AFTER \`federation\``);

const [indexRows] = await conn.query(
	`SELECT INDEX_NAME FROM information_schema.STATISTICS
	 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chess_account' AND INDEX_NAME = 'chess_account_federation_idx'
	 LIMIT 1`
);

if (indexRows.length) {
	console.log('chess_account_federation_idx already exists');
} else {
	await conn.query(
		`CREATE INDEX \`chess_account_federation_idx\` ON \`chess_account\` (\`federation\`)`
	);
	console.log('Created chess_account_federation_idx');
}

await conn.end();
console.log('chess_account FIDE columns migration complete');
