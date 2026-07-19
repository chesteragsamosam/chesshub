/**
 * Add tournament.direct_payment_to_organizer for offline entry-fee collection.
 *
 * Usage: node --env-file=.env scripts/migrate-direct-payment.mjs
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const conn = await mysql.createConnection(url);

async function columnExists(table, column) {
	const [rows] = await conn.query(
		`SELECT 1 FROM information_schema.COLUMNS
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
		 LIMIT 1`,
		[table, column]
	);
	return rows.length > 0;
}

if (!(await columnExists('tournament', 'direct_payment_to_organizer'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`direct_payment_to_organizer\` BOOLEAN NOT NULL DEFAULT false
		 AFTER \`currency\``
	);
	console.log('Added tournament.direct_payment_to_organizer');
} else {
	console.log('tournament.direct_payment_to_organizer already present');
}

await conn.end();
