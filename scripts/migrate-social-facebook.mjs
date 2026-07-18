/**
 * Add 'facebook' to social_link.platform enum.
 *
 * Usage: node --env-file=.env scripts/migrate-social-facebook.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

const [rows] = await conn.query(
	`SELECT COLUMN_TYPE FROM information_schema.COLUMNS
	 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'social_link' AND COLUMN_NAME = 'platform'
	 LIMIT 1`
);

if (!rows.length) {
	console.error('social_link.platform column not found');
	await conn.end();
	process.exit(1);
}

const columnType = String(rows[0].COLUMN_TYPE ?? '');
if (columnType.includes("'facebook'")) {
	console.log("social_link.platform already includes 'facebook'");
} else {
	await conn.query(
		`ALTER TABLE \`social_link\`
		 MODIFY \`platform\` ENUM(
			'twitter',
			'instagram',
			'youtube',
			'discord',
			'twitch',
			'github',
			'facebook',
			'other'
		 ) NOT NULL`
	);
	console.log("Added 'facebook' to social_link.platform enum");
}

await conn.end();
console.log('Facebook social_link migration complete');
