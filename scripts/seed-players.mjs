import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, like, sql } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import { user, account } from '../src/lib/server/db/auth.schema.js';
import { profile, chessAccount } from '../src/lib/server/db/schema.js';

const schema = { user, account, profile, chessAccount };

const MOCK_PLAYER_COUNT = 300;
const ADMIN = {
	email: 'admin@chesshub.local',
	password: 'ChessHubAdmin1!',
	name: 'ChessHub Admin',
	username: 'chesshub_admin'
};

const FIRST_NAMES = [
	'Aarav',
	'Amelia',
	'Carlos',
	'Chen',
	'Diana',
	'Elena',
	'Fatima',
	'Giuseppe',
	'Hannah',
	'Ivan',
	'Jasmine',
	'Kenji',
	'Lena',
	'Mateo',
	'Noah',
	'Olivia',
	'Priya',
	'Quinn',
	'Ravi',
	'Sofia',
	'Tariq',
	'Uma',
	'Victor',
	'Willa',
	'Xavier',
	'Yara',
	'Zoe',
	'Arjun',
	'Boris',
	'Clara',
	'Dmitri',
	'Emma',
	'Felix',
	'Grace',
	'Hassan',
	'Ingrid',
	'Jonas',
	'Keiko',
	'Luca',
	'Maya',
	'Nina',
	'Omar',
	'Paula',
	'Rosa',
	'Samir',
	'Tomas',
	'Ursula',
	'Vikram',
	'Walter',
	'Yuki'
];

const LAST_NAMES = [
	'Andersen',
	'Bennett',
	'Costa',
	'Dubois',
	'Edwards',
	'Fischer',
	'Garcia',
	'Hughes',
	'Ibrahim',
	'Johansson',
	'Khan',
	'Lopez',
	'Miller',
	'Nguyen',
	'Okonkwo',
	'Patel',
	'Quinn',
	'Rossi',
	'Silva',
	'Tanaka',
	'Ueda',
	'Vargas',
	'Williams',
	'Xu',
	'Young',
	'Zhang',
	'Brooks',
	'Campbell',
	'Davis',
	'Evans',
	'Foster',
	'Green',
	'Hall',
	'Ito',
	'Jensen',
	'Kim',
	'Lee',
	'Martin',
	'Nakamura',
	'Olsen',
	'Park',
	'Reed',
	'Sato',
	'Turner',
	'Walker',
	'White',
	'Yamamoto',
	'Zimmerman',
	'Carlsen',
	'Polgar'
];

const LOCATIONS = [
	{ city: 'New York', country: 'US' },
	{ city: 'Los Angeles', country: 'US' },
	{ city: 'Chicago', country: 'US' },
	{ city: 'London', country: 'GB' },
	{ city: 'Paris', country: 'FR' },
	{ city: 'Berlin', country: 'DE' },
	{ city: 'Madrid', country: 'ES' },
	{ city: 'Rome', country: 'IT' },
	{ city: 'Toronto', country: 'CA' },
	{ city: 'Vancouver', country: 'CA' },
	{ city: 'Sydney', country: 'AU' },
	{ city: 'Melbourne', country: 'AU' },
	{ city: 'Tokyo', country: 'JP' },
	{ city: 'Osaka', country: 'JP' },
	{ city: 'Seoul', country: 'KR' },
	{ city: 'Mumbai', country: 'IN' },
	{ city: 'Bengaluru', country: 'IN' },
	{ city: 'Manila', country: 'PH' },
	{ city: 'Singapore', country: 'SG' },
	{ city: 'Amsterdam', country: 'NL' },
	{ city: 'Stockholm', country: 'SE' },
	{ city: 'Oslo', country: 'NO' },
	{ city: 'Warsaw', country: 'PL' },
	{ city: 'Prague', country: 'CZ' },
	{ city: 'Buenos Aires', country: 'AR' },
	{ city: 'Sao Paulo', country: 'BR' },
	{ city: 'Mexico City', country: 'MX' },
	{ city: 'Cape Town', country: 'ZA' },
	{ city: 'Nairobi', country: 'KE' },
	{ city: 'Dubai', country: 'AE' }
];

const PLATFORMS = ['lichess', 'chesscom', 'fide'];

/** @param {number} index */
function mockClassicalRating(index) {
	return 800 + ((index * 7919 + 104729) % 2001);
}

/** @param {number} index */
function buildMockPlayer(index) {
	const first = FIRST_NAMES[index % FIRST_NAMES.length];
	const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
	const location = LOCATIONS[index % LOCATIONS.length];
	const classical = mockClassicalRating(index);
	const padded = String(index + 1).padStart(3, '0');

	return {
		email: `mock-${padded}@chesshub.local`,
		name: `${first} ${last}`,
		username: `mock_player_${padded}`,
		city: location.city,
		country: location.country,
		classical,
		platform: PLATFORMS[index % PLATFORMS.length]
	};
}

/** @param {ReturnType<typeof drizzle>} db */
async function countMockPlayers(db) {
	const [row] = await db
		.select({ count: sql`count(*)` })
		.from(user)
		.where(like(user.email, 'mock-%@chesshub.local'));
	return Number(row?.count ?? 0);
}

/** @param {ReturnType<typeof drizzle>} db */
async function ensureAdmin(db) {
	const passwordHash = await hashPassword(ADMIN.password);
	const now = new Date();
	const [existing] = await db.select().from(user).where(eq(user.email, ADMIN.email)).limit(1);

	if (existing) {
		await db.update(user).set({ role: 'admin', username: ADMIN.username }).where(eq(user.id, existing.id));
		const [credential] = await db
			.select()
			.from(account)
			.where(eq(account.userId, existing.id))
			.limit(1);

		if (credential) {
			await db
				.update(account)
				.set({ password: passwordHash, updatedAt: now })
				.where(eq(account.id, credential.id));
		} else {
			await db.insert(account).values({
				id: randomUUID(),
				accountId: existing.id,
				providerId: 'credential',
				userId: existing.id,
				password: passwordHash,
				createdAt: now,
				updatedAt: now
			});
		}

		return 'updated';
	}

	const userId = randomUUID();
	await db.insert(user).values({
		id: userId,
		name: ADMIN.name,
		email: ADMIN.email,
		emailVerified: true,
		image: null,
		role: 'admin',
		username: ADMIN.username,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(account).values({
		id: randomUUID(),
		accountId: userId,
		providerId: 'credential',
		userId,
		password: passwordHash,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(profile).values({
		id: randomUUID(),
		userId,
		bio: 'Local development admin account.',
		city: 'Manila',
		country: 'PH'
	});

	return 'created';
}

/** @param {ReturnType<typeof drizzle>} db */
async function seedMockPlayers(db) {
	const passwordHash = await hashPassword('MockPlayer1!');
	const now = new Date();

	/** @type {Array<typeof user.$inferInsert>} */
	const users = [];
	/** @type {Array<typeof account.$inferInsert>} */
	const accounts = [];
	/** @type {Array<typeof profile.$inferInsert>} */
	const profiles = [];
	/** @type {Array<typeof chessAccount.$inferInsert>} */
	const chessAccounts = [];

	for (let index = 0; index < MOCK_PLAYER_COUNT; index += 1) {
		const player = buildMockPlayer(index);
		const userId = randomUUID();

		users.push({
			id: userId,
			name: player.name,
			email: player.email,
			emailVerified: true,
			image: null,
			role: 'user',
			username: player.username,
			createdAt: now,
			updatedAt: now
		});

		accounts.push({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: passwordHash,
			createdAt: now,
			updatedAt: now
		});

		profiles.push({
			id: randomUUID(),
			userId,
			bio: `Mock player seeded for local development (#${index + 1}).`,
			city: player.city,
			country: player.country
		});

		chessAccounts.push({
			id: randomUUID(),
			userId,
			platform: player.platform,
			username: `mock-${player.classical}`,
			displayName: player.name,
			verified: false,
			externalId: null,
			accessToken: null,
			linkedAt: now
		});
	}

	const chunkSize = 50;
	for (let offset = 0; offset < users.length; offset += chunkSize) {
		const end = offset + chunkSize;
		await db.insert(user).values(users.slice(offset, end));
		await db.insert(account).values(accounts.slice(offset, end));
		await db.insert(profile).values(profiles.slice(offset, end));
		await db.insert(chessAccount).values(chessAccounts.slice(offset, end));
	}
}

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('DATABASE_URL is not set. Run with: pnpm db:seed');
		process.exit(1);
	}

	const force = process.env.SEED_FORCE === '1';
	const pool = mysql.createPool(databaseUrl);
	const db = drizzle(pool, { schema, mode: 'default' });

	try {
		const existingMockCount = await countMockPlayers(db);

		if (existingMockCount >= MOCK_PLAYER_COUNT && !force) {
			console.log(`Found ${existingMockCount} mock players. Skipping player seed (set SEED_FORCE=1 to re-seed).`);
		} else {
			if (force && existingMockCount > 0) {
				console.log(`SEED_FORCE=1: removing ${existingMockCount} existing mock players...`);
				const mockUsers = await db
					.select({ id: user.id })
					.from(user)
					.where(like(user.email, 'mock-%@chesshub.local'));

				const ids = mockUsers.map((row) => row.id);
				if (ids.length) {
					for (const userId of ids) {
						await db.delete(chessAccount).where(eq(chessAccount.userId, userId));
						await db.delete(profile).where(eq(profile.userId, userId));
						await db.delete(account).where(eq(account.userId, userId));
						await db.delete(user).where(eq(user.id, userId));
					}
				}
			}

			console.log(`Seeding ${MOCK_PLAYER_COUNT} mock players...`);
			await seedMockPlayers(db);
			console.log(`Seeded ${MOCK_PLAYER_COUNT} mock players.`);
		}

		const adminStatus = await ensureAdmin(db);
		console.log(`Admin account ${adminStatus}.`);
		console.log('');
		console.log('Admin login');
		console.log(`  Email:    ${ADMIN.email}`);
		console.log(`  Password: ${ADMIN.password}`);
		console.log('');
		console.log('Mock player login (any seeded account)');
		console.log('  Email:    mock-001@chesshub.local ... mock-300@chesshub.local');
		console.log('  Password: MockPlayer1!');
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
