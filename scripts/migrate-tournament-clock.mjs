/**
 * Add tournament clock columns and backfill from lichess_arena_settings JSON.
 *
 * Usage: node --env-file=.env scripts/migrate-tournament-clock.mjs
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

if (!(await columnExists('tournament', 'clock_time'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`clock_time\` DOUBLE NULL AFTER \`max_players\``
	);
	console.log('Added tournament.clock_time');
} else {
	console.log('tournament.clock_time already present');
}

if (!(await columnExists('tournament', 'clock_increment'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`clock_increment\` INT NULL DEFAULT 0 AFTER \`clock_time\``
	);
	console.log('Added tournament.clock_increment');
} else {
	console.log('tournament.clock_increment already present');
}

if (!(await columnExists('tournament', 'clock_delay'))) {
	await conn.query(
		`ALTER TABLE \`tournament\`
		 ADD \`clock_delay\` INT NULL DEFAULT 0 AFTER \`clock_increment\``
	);
	console.log('Added tournament.clock_delay');
} else {
	console.log('tournament.clock_delay already present');
}

const [rows] = await conn.query(
	`SELECT \`id\`, \`lichess_arena_settings\` AS settings
	 FROM \`tournament\`
	 WHERE \`clock_time\` IS NULL
	   AND \`lichess_arena_settings\` IS NOT NULL
	   AND \`lichess_arena_settings\` != ''`
);

let updated = 0;
for (const row of rows) {
	try {
		const parsed = JSON.parse(row.settings);
		if (typeof parsed?.clockTime !== 'number') continue;
		const increment = typeof parsed.clockIncrement === 'number' ? parsed.clockIncrement : 0;
		const delay = typeof parsed.clockDelay === 'number' ? parsed.clockDelay : 0;
		await conn.query(
			`UPDATE \`tournament\`
			 SET \`clock_time\` = ?, \`clock_increment\` = ?, \`clock_delay\` = ?
			 WHERE \`id\` = ?`,
			[parsed.clockTime, increment, delay, row.id]
		);
		updated += 1;
	} catch {
		// skip invalid JSON
	}
}

console.log(`Backfilled clock fields on ${updated} tournament(s)`);
await conn.end();
