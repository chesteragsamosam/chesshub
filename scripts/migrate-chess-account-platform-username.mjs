/**
 * Enforce one ChessHub account per platform username (FIDE ID, Lichess handle, etc.).
 *
 * Usage: node --env-file=.env scripts/migrate-chess-account-platform-username.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

const [dupes] = await conn.query(
	`SELECT platform, username, COUNT(*) AS cnt
	 FROM chess_account
	 GROUP BY platform, username
	 HAVING cnt > 1`
);

if (dupes.length) {
	console.error(
		'Cannot create unique index: duplicate platform+username rows exist. Resolve these first:'
	);
	for (const row of dupes) {
		console.error(`  ${row.platform} / ${row.username} (${row.cnt} rows)`);
	}
	await conn.end();
	process.exit(1);
}

const [indexRows] = await conn.query(
	`SELECT INDEX_NAME FROM information_schema.STATISTICS
	 WHERE TABLE_SCHEMA = DATABASE()
	   AND TABLE_NAME = 'chess_account'
	   AND INDEX_NAME = 'chess_account_platform_username_idx'
	 LIMIT 1`
);

if (indexRows.length) {
	console.log('chess_account_platform_username_idx already exists');
} else {
	await conn.query(
		`CREATE UNIQUE INDEX \`chess_account_platform_username_idx\`
		 ON \`chess_account\` (\`platform\`, \`username\`)`
	);
	console.log('Created chess_account_platform_username_idx');
}

await conn.end();
console.log('chess_account platform+username uniqueness migration complete');
