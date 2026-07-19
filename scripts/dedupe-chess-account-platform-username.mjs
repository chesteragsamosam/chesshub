/**
 * Remove duplicate chess_account rows (same platform + username).
 * Keeps the earliest linked row per pair, prefers verified when tied.
 *
 * Usage: node --env-file=.env scripts/dedupe-chess-account-platform-username.mjs
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

if (!dupes.length) {
	console.log('No duplicate platform+username rows');
	await conn.end();
	process.exit(0);
}

console.log(`Found ${dupes.length} duplicate platform+username group(s)`);

let deleted = 0;
for (const group of dupes) {
	const [rows] = await conn.query(
		`SELECT id, user_id, verified, linked_at
		 FROM chess_account
		 WHERE platform = ? AND username = ?
		 ORDER BY verified DESC, linked_at ASC, id ASC`,
		[group.platform, group.username]
	);

	const [, ...extras] = rows;
	for (const row of extras) {
		await conn.query(`DELETE FROM chess_account WHERE id = ?`, [row.id]);
		deleted += 1;
		console.log(
			`Deleted duplicate ${group.platform}/${group.username} id=${row.id} (user ${row.user_id})`
		);
	}
	console.log(
		`Kept ${group.platform}/${group.username} id=${rows[0].id} (user ${rows[0].user_id})`
	);
}

await conn.end();
console.log(`Deduped ${deleted} row(s)`);
