/**
 * Add tournament.modality (lichess | otb) and backfill existing rows.
 *
 * Usage: node --env-file=.env scripts/migrate-tournament-modality.mjs
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

async function indexExists(table, indexName) {
	const [rows] = await conn.query(
		`SELECT 1 FROM information_schema.STATISTICS
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
		 LIMIT 1`,
		[table, indexName]
	);
	return rows.length > 0;
}

if (!(await columnExists('tournament', 'modality'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`modality\` ENUM('lichess', 'otb') NOT NULL DEFAULT 'lichess'
		 AFTER \`description\``
	);
	console.log('Added tournament.modality');
} else {
	console.log('tournament.modality already present');
}

const [result] = await conn.query(`
	UPDATE \`tournament\`
	SET \`modality\` = CASE
		WHEN \`lichess_tournament_id\` IS NOT NULL AND \`lichess_tournament_id\` != '' THEN 'lichess'
		WHEN (\`venue\` IS NOT NULL AND \`venue\` != '')
			OR (\`city\` IS NOT NULL AND \`city\` != '') THEN 'otb'
		ELSE 'lichess'
	END
`);
console.log(`Backfilled modality on ${result.affectedRows ?? 0} tournament row(s)`);

if (!(await indexExists('tournament', 'tournament_modality_idx'))) {
	await conn.query('CREATE INDEX `tournament_modality_idx` ON `tournament` (`modality`)');
	console.log('Created tournament_modality_idx');
} else {
	console.log('tournament_modality_idx already present');
}

await conn.end();
console.log('Tournament modality migration complete');
