/**
 * Add donation table for platform Support ChessHub gifts.
 *
 * Usage: node --env-file=.env scripts/migrate-donations.mjs
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

if (!(await tableExists('donation'))) {
	await conn.query(`
		CREATE TABLE \`donation\` (
			\`id\` VARCHAR(36) NOT NULL,
			\`user_id\` VARCHAR(36) NULL,
			\`amount_cents\` INT NOT NULL,
			\`currency\` VARCHAR(3) NOT NULL DEFAULT 'php',
			\`status\` ENUM('pending', 'paid', 'failed', 'expired') NOT NULL DEFAULT 'pending',
			\`paymongo_checkout_session_id\` VARCHAR(255) NULL,
			\`paymongo_payment_id\` VARCHAR(255) NULL,
			\`donor_name\` VARCHAR(255) NULL,
			\`donor_email\` VARCHAR(255) NULL,
			\`message\` TEXT NULL,
			\`list_public\` BOOLEAN NOT NULL DEFAULT FALSE,
			\`public_name\` VARCHAR(255) NULL,
			\`paid_at\` TIMESTAMP(3) NULL,
			\`created_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
			\`updated_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
				ON UPDATE CURRENT_TIMESTAMP(3),
			PRIMARY KEY (\`id\`),
			KEY \`donation_status_idx\` (\`status\`),
			KEY \`donation_checkout_session_idx\` (\`paymongo_checkout_session_id\`),
			KEY \`donation_list_public_idx\` (\`list_public\`, \`status\`)
		)
	`);
	console.log('Created donation');
} else {
	console.log('donation already present');
}

await conn.end();
