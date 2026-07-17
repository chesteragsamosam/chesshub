/**
 * Targeted Stripe → PayMongo schema migration.
 * Avoids drizzle-kit push data-loss prompts (e.g. truncating `user`).
 *
 * Usage: node --env-file=.env scripts/migrate-paymongo.mjs
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

async function tableExists(table) {
	const [rows] = await conn.query(
		`SELECT 1 FROM information_schema.TABLES
		 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
		 LIMIT 1`,
		[table]
	);
	return rows.length > 0;
}

if (await tableExists('stripe_connect_account')) {
	await conn.query('DROP TABLE `stripe_connect_account`');
	console.log('Dropped stripe_connect_account');
} else {
	console.log('stripe_connect_account already absent');
}

if (await columnExists('tournament_registration', 'stripe_checkout_session_id')) {
	if (!(await columnExists('tournament_registration', 'paymongo_checkout_session_id'))) {
		await conn.query(
			'ALTER TABLE `tournament_registration` CHANGE `stripe_checkout_session_id` `paymongo_checkout_session_id` varchar(255)'
		);
		console.log('Renamed stripe_checkout_session_id → paymongo_checkout_session_id');
	} else {
		await conn.query(
			'ALTER TABLE `tournament_registration` DROP COLUMN `stripe_checkout_session_id`'
		);
		console.log('Dropped leftover stripe_checkout_session_id');
	}
} else if (!(await columnExists('tournament_registration', 'paymongo_checkout_session_id'))) {
	await conn.query(
		'ALTER TABLE `tournament_registration` ADD `paymongo_checkout_session_id` varchar(255)'
	);
	console.log('Added paymongo_checkout_session_id');
} else {
	console.log('paymongo_checkout_session_id already present');
}

if (await columnExists('tournament_registration', 'stripe_payment_intent_id')) {
	if (!(await columnExists('tournament_registration', 'paymongo_payment_id'))) {
		await conn.query(
			'ALTER TABLE `tournament_registration` CHANGE `stripe_payment_intent_id` `paymongo_payment_id` varchar(255)'
		);
		console.log('Renamed stripe_payment_intent_id → paymongo_payment_id');
	} else {
		await conn.query(
			'ALTER TABLE `tournament_registration` DROP COLUMN `stripe_payment_intent_id`'
		);
		console.log('Dropped leftover stripe_payment_intent_id');
	}
} else if (!(await columnExists('tournament_registration', 'paymongo_payment_id'))) {
	await conn.query('ALTER TABLE `tournament_registration` ADD `paymongo_payment_id` varchar(255)');
	console.log('Added paymongo_payment_id');
} else {
	console.log('paymongo_payment_id already present');
}

await conn.query("ALTER TABLE `tournament` ALTER `currency` SET DEFAULT 'php'");
await conn.query(
	"UPDATE `tournament` SET `currency` = 'php' WHERE `currency` IS NULL OR `currency` = '' OR `currency` = 'usd'"
);
console.log('Tournament currency default set to php');

await conn.end();
console.log('PayMongo migration complete');
