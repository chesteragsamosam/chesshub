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
		/** FIDE federation code (e.g. PHI), set when linking a FIDE account */
		federation: varchar('federation', { length: 3 }),
		/** FIDE title (e.g. GM, IM), set when linking a FIDE account */
		title: varchar('title', { length: 10 }),
		/** Primary rating for sorting / compact display */
		rating: int('rating'),
		/** JSON map of time-control ratings (standard/blitz/…) */
		ratingsJson: text('ratings_json'),
		ratingsUpdatedAt: timestamp('ratings_updated_at', { fsp: 3 }),
		verified: boolean('verified').default(false).notNull(),
		accessToken: text('access_token'),
		linkedAt: timestamp('linked_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('chess_account_user_platform_idx').on(table.userId, table.platform),
		index('chess_account_user_idx').on(table.userId),
		index('chess_account_federation_idx').on(table.federation)
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
			'facebook',
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

export const tournament = mysqlTable(
	'tournament',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		organizerId: varchar('organizer_id', { length: 36 }).notNull(),
		title: varchar('title', { length: 255 }).notNull(),
		description: text('description'),
		modality: mysqlEnum('modality', ['lichess', 'otb']).default('lichess').notNull(),
		venue: varchar('venue', { length: 255 }),
		city: varchar('city', { length: 255 }),
		state: varchar('state', { length: 255 }),
		country: varchar('country', { length: 2 }),
		latitude: double('latitude'),
		longitude: double('longitude'),
		startDate: timestamp('start_date', { fsp: 3 }).notNull(),
		endDate: timestamp('end_date', { fsp: 3 }),
		entryFeeCents: int('entry_fee_cents').default(0).notNull(),
		currency: varchar('currency', { length: 3 }).default('php').notNull(),
		maxPlayers: int('max_players'),
		/** Initial clock in minutes (Lichess + OTB). */
		clockTime: double('clock_time'),
		/** Fischer increment seconds. */
		clockIncrement: int('clock_increment').default(0),
		/** Bronstein / simple delay seconds. */
		clockDelay: int('clock_delay').default(0),
		lichessTournamentId: varchar('lichess_tournament_id', { length: 64 }),
		lichessTournamentFormat: mysqlEnum('lichess_tournament_format', ['arena', 'swiss']),
		/** Server-only Arena password; never expose to clients. */
		lichessArenaPassword: text('lichess_arena_password'),
		/**
		 * JSON snapshot of Arena create fields so updates can re-send conditions
		 * (Lichess clears omitted conditions on POST /api/tournament/{id}).
		 */
		lichessArenaSettings: text('lichess_arena_settings'),
		resultsFinalizedAt: timestamp('results_finalized_at', { fsp: 3 }),
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
		index('tournament_modality_idx').on(table.modality),
		index('tournament_location_idx').on(table.city, table.country)
	]
);

export const tournamentPrize = mysqlTable(
	'tournament_prize',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		tournamentId: varchar('tournament_id', { length: 36 }).notNull(),
		placement: int('placement').notNull(),
		label: varchar('label', { length: 255 }).notNull(),
		amountCents: int('amount_cents').notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('tournament_prize_placement_idx').on(table.tournamentId, table.placement),
		index('tournament_prize_tournament_idx').on(table.tournamentId)
	]
);

/** Optional sponsor list for Lichess and OTB tournaments. */
export const tournamentSponsor = mysqlTable(
	'tournament_sponsor',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		tournamentId: varchar('tournament_id', { length: 36 }).notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		url: varchar('url', { length: 512 }),
		sortOrder: int('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('tournament_sponsor_tournament_idx').on(table.tournamentId)]
);

export const tournamentAward = mysqlTable(
	'tournament_award',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		tournamentId: varchar('tournament_id', { length: 36 }).notNull(),
		prizeId: varchar('prize_id', { length: 36 }).notNull(),
		userId: varchar('user_id', { length: 36 }).notNull(),
		placement: int('placement').notNull(),
		lichessUsername: varchar('lichess_username', { length: 255 }).notNull(),
		prizeLabel: varchar('prize_label', { length: 255 }).notNull(),
		amountCents: int('amount_cents').notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('tournament_award_prize_idx').on(table.prizeId),
		uniqueIndex('tournament_award_placement_idx').on(table.tournamentId, table.placement),
		index('tournament_award_user_idx').on(table.userId)
	]
);

export const prizeClaim = mysqlTable(
	'prize_claim',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		awardId: varchar('award_id', { length: 36 }).notNull(),
		status: mysqlEnum('status', ['unclaimed', 'processing', 'paid', 'failed'])
			.default('unclaimed')
			.notNull(),
		paymongoWalletTransactionId: varchar('paymongo_wallet_transaction_id', { length: 255 }),
		paymongoTransferId: varchar('paymongo_transfer_id', { length: 255 }),
		paymongoReferenceNumber: varchar('paymongo_reference_number', { length: 255 }),
		destinationMasked: varchar('destination_masked', { length: 32 }),
		recipientName: varchar('recipient_name', { length: 255 }),
		failureCode: varchar('failure_code', { length: 100 }),
		failureReason: text('failure_reason'),
		attemptCount: int('attempt_count').default(0).notNull(),
		claimedAt: timestamp('claimed_at', { fsp: 3 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('prize_claim_award_idx').on(table.awardId),
		uniqueIndex('prize_claim_wallet_transaction_idx').on(table.paymongoWalletTransactionId),
		uniqueIndex('prize_claim_transfer_idx').on(table.paymongoTransferId),
		index('prize_claim_status_idx').on(table.status)
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
		paymongoCheckoutSessionId: varchar('paymongo_checkout_session_id', { length: 255 }),
		paymongoPaymentId: varchar('paymongo_payment_id', { length: 255 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		lichessJoinedAt: timestamp('lichess_joined_at', { fsp: 3 }),
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

/**
 * Meta / Facebook data-deletion callback tracking (status page by confirmation code).
 */
export const facebookDataDeletionRequest = mysqlTable(
	'facebook_data_deletion_request',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		confirmationCode: varchar('confirmation_code', { length: 64 }).notNull().unique(),
		facebookUserId: varchar('facebook_user_id', { length: 255 }).notNull(),
		chessHubUserId: varchar('chesshub_user_id', { length: 36 }),
		status: mysqlEnum('status', ['received', 'completed', 'not_found', 'failed'])
			.default('received')
			.notNull(),
		details: text('details'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { fsp: 3 })
	},
	(table) => [
		index('facebook_deletion_code_idx').on(table.confirmationCode),
		index('facebook_deletion_fb_user_idx').on(table.facebookUserId)
	]
);

export * from './auth.schema.js';
