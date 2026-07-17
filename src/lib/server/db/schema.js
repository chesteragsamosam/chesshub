import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	boolean,
	int,
	double,
	mysqlEnum,
	uniqueIndex,
	index
} from 'drizzle-orm/mysql-core';

export const profile = mysqlTable('profile', {
	id: varchar('id', { length: 36 }).primaryKey(),
	userId: varchar('user_id', { length: 36 }).notNull().unique(),
	bio: text('bio'),
	city: varchar('city', { length: 255 }),
	country: varchar('country', { length: 2 }),
	latitude: double('latitude'),
	longitude: double('longitude'),
	createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const chessAccount = mysqlTable(
	'chess_account',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 36 }).notNull(),
		platform: mysqlEnum('platform', ['lichess', 'chesscom', 'fide']).notNull(),
		username: varchar('username', { length: 255 }).notNull(),
		externalId: varchar('external_id', { length: 255 }),
		displayName: varchar('display_name', { length: 255 }),
		verified: boolean('verified').default(false).notNull(),
		accessToken: text('access_token'),
		linkedAt: timestamp('linked_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('chess_account_user_platform_idx').on(table.userId, table.platform),
		index('chess_account_user_idx').on(table.userId)
	]
);

export const socialLink = mysqlTable(
	'social_link',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 36 }).notNull(),
		platform: mysqlEnum('platform', [
			'twitter',
			'instagram',
			'youtube',
			'discord',
			'twitch',
			'github',
			'other'
		]).notNull(),
		url: varchar('url', { length: 512 }).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('social_link_user_platform_idx').on(table.userId, table.platform),
		index('social_link_user_idx').on(table.userId)
	]
);

export const organizerRequest = mysqlTable(
	'organizer_request',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 36 }).notNull(),
		message: text('message'),
		status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
		reviewedBy: varchar('reviewed_by', { length: 36 }),
		reviewedAt: timestamp('reviewed_at', { fsp: 3 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('organizer_request_user_idx').on(table.userId)]
);

export const stripeConnectAccount = mysqlTable('stripe_connect_account', {
	id: varchar('id', { length: 36 }).primaryKey(),
	userId: varchar('user_id', { length: 36 }).notNull().unique(),
	stripeAccountId: varchar('stripe_account_id', { length: 255 }).notNull().unique(),
	onboardingComplete: boolean('onboarding_complete').default(false).notNull(),
	createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const tournament = mysqlTable(
	'tournament',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		organizerId: varchar('organizer_id', { length: 36 }).notNull(),
		title: varchar('title', { length: 255 }).notNull(),
		description: text('description'),
		venue: varchar('venue', { length: 255 }),
		city: varchar('city', { length: 255 }),
		state: varchar('state', { length: 255 }),
		country: varchar('country', { length: 2 }),
		latitude: double('latitude'),
		longitude: double('longitude'),
		startDate: timestamp('start_date', { fsp: 3 }).notNull(),
		endDate: timestamp('end_date', { fsp: 3 }),
		entryFeeCents: int('entry_fee_cents').default(0).notNull(),
		currency: varchar('currency', { length: 3 }).default('usd').notNull(),
		maxPlayers: int('max_players'),
		status: mysqlEnum('status', ['draft', 'published', 'cancelled', 'completed'])
			.default('draft')
			.notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('tournament_organizer_idx').on(table.organizerId),
		index('tournament_status_idx').on(table.status),
		index('tournament_location_idx').on(table.city, table.country)
	]
);

export const tournamentRegistration = mysqlTable(
	'tournament_registration',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		tournamentId: varchar('tournament_id', { length: 36 }).notNull(),
		userId: varchar('user_id', { length: 36 }).notNull(),
		status: mysqlEnum('status', ['pending', 'paid', 'cancelled', 'refunded'])
			.default('pending')
			.notNull(),
		stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('tournament_registration_unique_idx').on(table.tournamentId, table.userId),
		index('tournament_registration_tournament_idx').on(table.tournamentId)
	]
);

export const userFollow = mysqlTable(
	'user_follow',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		followerId: varchar('follower_id', { length: 36 }).notNull(),
		followingId: varchar('following_id', { length: 36 }).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('user_follow_pair_idx').on(table.followerId, table.followingId),
		index('user_follow_follower_idx').on(table.followerId),
		index('user_follow_following_idx').on(table.followingId)
	]
);

export * from './auth.schema.js';
