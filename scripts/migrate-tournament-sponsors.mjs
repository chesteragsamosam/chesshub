/**
 * Add tournament_sponsor table for optional event sponsors.
 *
 * Usage: node --env-file=.env scripts/migrate-tournament-sponsors.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

async function tableExists(table) {
	const [rows] = await conn.query(
		`SELECT 1 FROM information_schema.TABLES
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
		 LIMIT 1`,
		[table]
	);
	return rows.length > 0;
}

if (!(await tableExists('tournament_sponsor'))) {
	await conn.query(`
		CREATE TABLE \`tournament_sponsor\` (
			\`id\` VARCHAR(36) NOT NULL,
			\`tournament_id\` VARCHAR(36) NOT NULL,
			\`name\` VARCHAR(255) NOT NULL,
			\`url\` VARCHAR(512) NULL,
			\`sort_order\` INT NOT NULL DEFAULT 0,
			\`created_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			\`updated_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
				ON UPDATE CURRENT_TIMESTAMP(3),
			PRIMARY KEY (\`id\`),
			KEY \`tournament_sponsor_tournament_idx\` (\`tournament_id\`)
		)
	`);
	console.log('Created tournament_sponsor');
} else {
	console.log('tournament_sponsor already present');
}

await conn.end();
