import { and, eq, gte, lte, desc, asc, sql, like, or, inArray, not, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	profile,
	chessAccount,
	socialLink,
	tournament,
	tournamentPrize,
	tournamentAward,
	prizeClaim,
	tournamentRegistration,
	organizerRequest,
	userFollow,
	user
} from '$lib/server/db/schema';
import { createId } from '$lib/server/id';

/**
 * Strip server-only Arena password before sending a tournament to the client.
 * @template {Record<string, unknown>} T
 * @param {T | null | undefined} row
 */
export function toPublicTournament(row) {
	if (!row) return null;
	const {
		lichessArenaPassword: _secret,
		lichessArenaSettings: _settings,
		...publicRow
	} = row;
	return publicRow;
}

/**
 * @param {string} userId
 */
export async function getOrCreateProfile(userId) {
	const [existing] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
	if (existing) return existing;

	const id = createId();
	await db.insert(profile).values({ id, userId });
	const [created] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
	return created;
}

/**
 * @param {string} userId
 */
export async function getProfileByUserId(userId) {
	const [row] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
	return row ?? null;
}

/**
 * @param {string} userId
 * @param {{ bio?: string | null, city?: string | null, country?: string | null, latitude?: number | null, longitude?: number | null }} data
 */
export async function updateProfile(userId, data) {
	await getOrCreateProfile(userId);
	await db.update(profile).set(data).where(eq(profile.userId, userId));
	return getProfileByUserId(userId);
}

/**
 * @param {string} userId
 */
export async function getChessAccounts(userId) {
	return db.select().from(chessAccount).where(eq(chessAccount.userId, userId));
}

/**
 * @param {string} userId
 */
export async function getSocialLinks(userId) {
	return db.select().from(socialLink).where(eq(socialLink.userId, userId));
}

/**
 * @param {string} userId
 * @param {'lichess' | 'chesscom' | 'fide'} platform
 */
export async function getChessAccount(userId, platform) {
	const [row] = await db
		.select()
		.from(chessAccount)
		.where(and(eq(chessAccount.userId, userId), eq(chessAccount.platform, platform)))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} userId
 * @param {'lichess' | 'chesscom' | 'fide'} platform
 */
export async function unlinkChessAccount(userId, platform) {
	await db
		.delete(chessAccount)
		.where(and(eq(chessAccount.userId, userId), eq(chessAccount.platform, platform)));
}

/**
 * @param {string} userId
 * @param {'lichess' | 'chesscom' | 'fide'} platform
 * @param {{
 *   username: string,
 *   externalId?: string | null,
 *   displayName?: string | null,
 *   verified?: boolean,
 *   accessToken?: string | null
 * }} data
 */
export async function upsertChessAccount(userId, platform, data) {
	const existing = await getChessAccount(userId, platform);

	if (existing) {
		await db
			.update(chessAccount)
			.set({
				username: data.username,
				externalId: data.externalId ?? null,
				displayName: data.displayName ?? null,
				verified: data.verified ?? false,
				accessToken: data.accessToken ?? null,
				linkedAt: new Date()
			})
			.where(eq(chessAccount.id, existing.id));
		return getChessAccount(userId, platform);
	}

	const id = createId();
	await db.insert(chessAccount).values({
		id,
		userId,
		platform,
		username: data.username,
		externalId: data.externalId ?? null,
		displayName: data.displayName ?? null,
		verified: data.verified ?? false,
		accessToken: data.accessToken ?? null
	});
	return getChessAccount(userId, platform);
}

/**
 * @param {string} userId
 * @param {import('$lib/server/db/schema').socialLink.$inferInsert['platform']} platform
 * @param {string} url
 */
export async function upsertSocialLink(userId, platform, url) {
	const [existing] = await db
		.select()
		.from(socialLink)
		.where(and(eq(socialLink.userId, userId), eq(socialLink.platform, platform)))
		.limit(1);

	if (existing) {
		await db.update(socialLink).set({ url }).where(eq(socialLink.id, existing.id));
		return;
	}

	await db.insert(socialLink).values({
		id: createId(),
		userId,
		platform,
		url
	});
}

/**
 * @param {string} userId
 * @param {import('$lib/server/db/schema').socialLink.$inferInsert['platform']} platform
 */
export async function unlinkSocialLink(userId, platform) {
	await db
		.delete(socialLink)
		.where(and(eq(socialLink.userId, userId), eq(socialLink.platform, platform)));
}

/**
 * @param {string} userId
 */
export async function getUserById(userId) {
	const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
	return row ?? null;
}

/**
 * @param {string} username
 */
export async function getUserByUsername(username) {
	const [row] = await db
		.select()
		.from(user)
		.where(eq(user.username, username.toLowerCase()))
		.limit(1);
	return row ?? null;
}

/**
 * Resolve by username first, then by id (legacy / fallback links).
 * @param {string} slug
 */
export async function getUserByUsernameOrId(slug) {
	const byUsername = await getUserByUsername(slug);
	if (byUsername) return byUsername;
	return getUserById(slug);
}

/**
 * @param {string} userId
 * @param {string | null} image
 */
export async function updateUserImage(userId, image) {
	await db.update(user).set({ image }).where(eq(user.id, userId));
}

/**
 * @param {string} userId
 * @param {string} username
 */
export async function updateUsername(userId, username) {
	await db.update(user).set({ username }).where(eq(user.id, userId));
}

/**
 * @param {string} username
 * @param {string} [excludeUserId]
 */
export async function isUsernameTaken(username, excludeUserId) {
	const existing = await getUserByUsername(username);
	if (!existing) return false;
	if (excludeUserId && existing.id === excludeUserId) return false;
	return true;
}

/**
 * @param {{ q?: string, city?: string, country?: string }} filters
 */
export async function searchPlayers(filters) {
	const trimmed = filters.q?.trim() ?? '';
	const city = filters.city?.trim() ?? '';
	const country = filters.country?.trim().toUpperCase() ?? '';
	const hasFilters = trimmed.length >= 2 || city || country;

	const playerFields = {
		id: user.id,
		name: user.name,
		username: user.username,
		image: user.image,
		city: profile.city,
		country: profile.country
	};

	let rows;

	if (!hasFilters) {
		rows = await db
			.select(playerFields)
			.from(user)
			.leftJoin(profile, eq(profile.userId, user.id))
			.orderBy(asc(user.name));
	} else {
		const conditions = [];

		if (trimmed.length >= 2) {
			conditions.push(
				or(
					like(user.name, `%${trimmed}%`),
					like(user.username, `%${trimmed}%`),
					like(profile.city, `%${trimmed}%`),
					like(chessAccount.username, `%${trimmed}%`)
				)
			);
		}
		if (city) {
			conditions.push(like(profile.city, `%${city}%`));
		}
		if (country) {
			conditions.push(eq(profile.country, country));
		}

		rows = await db
			.selectDistinct(playerFields)
			.from(user)
			.leftJoin(profile, eq(profile.userId, user.id))
			.leftJoin(chessAccount, eq(chessAccount.userId, user.id))
			.where(and(...conditions));
	}

	if (rows.length === 0) return [];

	const ids = rows.map((row) => row.id);
	const accounts = await db
		.select({
			userId: chessAccount.userId,
			platform: chessAccount.platform,
			username: chessAccount.username
		})
		.from(chessAccount)
		.where(inArray(chessAccount.userId, ids));

	return rows.map((row) => ({
		...row,
		chessAccounts: accounts.filter((account) => account.userId === row.id)
	}));
}

/**
 * @param {string} followerId
 * @param {string} followingId
 */
export async function followUser(followerId, followingId) {
	if (followerId === followingId) return false;

	try {
		await db.insert(userFollow).values({
			id: createId(),
			followerId,
			followingId
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} followerId
 * @param {string} followingId
 */
export async function unfollowUser(followerId, followingId) {
	await db
		.delete(userFollow)
		.where(and(eq(userFollow.followerId, followerId), eq(userFollow.followingId, followingId)));
}

/**
 * @param {string} followerId
 * @param {string} followingId
 */
export async function isFollowing(followerId, followingId) {
	const [row] = await db
		.select({ id: userFollow.id })
		.from(userFollow)
		.where(and(eq(userFollow.followerId, followerId), eq(userFollow.followingId, followingId)))
		.limit(1);
	return Boolean(row);
}

/**
 * @param {string} userId
 */
export async function countFollowers(userId) {
	const [result] = await db
		.select({ count: sql`count(*)` })
		.from(userFollow)
		.where(eq(userFollow.followingId, userId));
	return Number(result?.count ?? 0);
}

/**
 * @param {string} userId
 */
export async function countFollowing(userId) {
	const [result] = await db
		.select({ count: sql`count(*)` })
		.from(userFollow)
		.where(eq(userFollow.followerId, userId));
	return Number(result?.count ?? 0);
}

/**
 * @param {string} viewerId
 */
export async function getFollowingIds(viewerId) {
	const rows = await db
		.select({ id: userFollow.followingId })
		.from(userFollow)
		.where(eq(userFollow.followerId, viewerId));
	return rows.map((row) => row.id);
}

/**
 * @param {string} userId
 * @param {{ page?: number, pageSize?: number }} options
 */
export async function getFollowers(userId, options = {}) {
	const page = Math.max(1, options.page ?? 1);
	const pageSize = options.pageSize ?? 20;
	const offset = (page - 1) * pageSize;

	const [countRow] = await db
		.select({ count: sql`count(*)` })
		.from(userFollow)
		.where(eq(userFollow.followingId, userId));
	const total = Number(countRow?.count ?? 0);

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			city: profile.city,
			country: profile.country
		})
		.from(userFollow)
		.innerJoin(user, eq(user.id, userFollow.followerId))
		.leftJoin(profile, eq(profile.userId, user.id))
		.where(eq(userFollow.followingId, userId))
		.orderBy(desc(userFollow.createdAt))
		.limit(pageSize)
		.offset(offset);

	return {
		users,
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

/**
 * @param {string} userId
 * @param {{ page?: number, pageSize?: number }} options
 */
export async function getFollowing(userId, options = {}) {
	const page = Math.max(1, options.page ?? 1);
	const pageSize = options.pageSize ?? 20;
	const offset = (page - 1) * pageSize;

	const [countRow] = await db
		.select({ count: sql`count(*)` })
		.from(userFollow)
		.where(eq(userFollow.followerId, userId));
	const total = Number(countRow?.count ?? 0);

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			city: profile.city,
			country: profile.country
		})
		.from(userFollow)
		.innerJoin(user, eq(user.id, userFollow.followingId))
		.leftJoin(profile, eq(profile.userId, user.id))
		.where(eq(userFollow.followerId, userId))
		.orderBy(desc(userFollow.createdAt))
		.limit(pageSize)
		.offset(offset);

	return {
		users,
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

/**
 * Suggest accounts the viewer may want to follow.
 * @param {string} viewerId
 * @param {number} [limit]
 */
export async function recommendUsersToFollow(viewerId, limit = 10) {
	const followingIds = await getFollowingIds(viewerId);
	const excludeIds = [viewerId, ...followingIds];
	const viewerProfile = await getProfileByUserId(viewerId);

	/** @type {Map<string, { id: string, name: string, username: string | null, image: string | null, city: string | null, country: string | null, reason: string, score: number }>} */
	const ranked = new Map();

	/** @param {{ id: string, name: string, username: string | null, image: string | null, city?: string | null, country?: string | null, followerCount?: number | null }} candidate @param {string} reason @param {number} baseScore */
	function consider(candidate, reason, baseScore) {
		if (excludeIds.includes(candidate.id) || ranked.has(candidate.id)) return;

		let score = baseScore;
		if (viewerProfile?.country && candidate.country === viewerProfile.country) score += 20;
		if (viewerProfile?.city && candidate.city === viewerProfile.city) score += 30;
		score += Math.min(Number(candidate.followerCount ?? 0), 50);

		ranked.set(candidate.id, {
			id: candidate.id,
			name: candidate.name,
			username: candidate.username,
			image: candidate.image,
			city: candidate.city ?? null,
			country: candidate.country ?? null,
			reason,
			score
		});
	}

	if (followingIds.length > 0) {
		const secondDegree = await db
			.selectDistinct({
				id: user.id,
				name: user.name,
				username: user.username,
				image: user.image,
				city: profile.city,
				country: profile.country
			})
			.from(userFollow)
			.innerJoin(user, eq(user.id, userFollow.followingId))
			.leftJoin(profile, eq(profile.userId, user.id))
			.where(and(inArray(userFollow.followerId, followingIds), not(inArray(user.id, excludeIds))))
			.limit(50);

		for (const candidate of secondDegree) {
			consider(candidate, 'Followed by someone you follow', 100);
		}
	}

	const candidates = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			city: profile.city,
			country: profile.country,
			followerCount: sql`(
				select count(*)
				from user_follow uf
				where uf.following_id = ${user.id}
			)`.as('follower_count')
		})
		.from(user)
		.leftJoin(profile, eq(profile.userId, user.id))
		.where(not(inArray(user.id, excludeIds)))
		.limit(200);

	for (const candidate of candidates) {
		let reason = 'Popular in the community';
		if (viewerProfile?.city && candidate.city === viewerProfile.city) {
			reason = 'Plays near you';
		} else if (viewerProfile?.country && candidate.country === viewerProfile.country) {
			reason = 'Same country';
		}

		consider(candidate, reason, 0);
	}

	return (
		[...ranked.values()]
			.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
			.slice(0, limit)
			// The score is internal ranking metadata, not part of the public result.
			// eslint-disable-next-line no-unused-vars
			.map(({ score: _score, ...userRow }) => userRow)
	);
}

/**
 * @param {{ modality?: 'lichess' | 'otb', city?: string, country?: string, from?: Date, to?: Date, latitude?: number, longitude?: number }} filters
 */
export async function searchTournaments(filters) {
	const conditions = [eq(tournament.status, 'published')];

	if (filters.modality) {
		conditions.push(eq(tournament.modality, filters.modality));
	}
	if (filters.city) {
		conditions.push(eq(tournament.city, filters.city));
	}
	if (filters.country) {
		conditions.push(eq(tournament.country, filters.country));
	}
	if (filters.from) {
		conditions.push(gte(tournament.startDate, filters.from));
	}
	if (filters.to) {
		conditions.push(lte(tournament.startDate, filters.to));
	}

	const results = await db
		.select()
		.from(tournament)
		.where(and(...conditions))
		.orderBy(asc(tournament.startDate));

	const publicResults = results.map((t) => toPublicTournament(t) ?? t);

	if (filters.latitude != null && filters.longitude != null) {
		return publicResults
			.map((t) => {
				if (t.latitude == null || t.longitude == null) {
					return { ...t, distanceKm: null };
				}
				const distanceKm = haversineKm(
					filters.latitude,
					filters.longitude,
					t.latitude,
					t.longitude
				);
				return { ...t, distanceKm };
			})
			.sort((a, b) => {
				if (a.distanceKm == null) return 1;
				if (b.distanceKm == null) return -1;
				return a.distanceKm - b.distanceKm;
			});
	}

	return publicResults.map((t) => ({ ...t, distanceKm: null }));
}

/**
 * @param {string} id
 */
export async function getTournamentById(id) {
	const [row] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
	return row ?? null;
}

/**
 * @param {string} organizerId
 * @param {{ modality?: 'lichess' | 'otb', from?: Date, to?: Date }} [filters]
 */
export async function getTournamentsByOrganizer(organizerId, filters = {}) {
	const conditions = [eq(tournament.organizerId, organizerId)];

	if (filters.modality) {
		conditions.push(eq(tournament.modality, filters.modality));
	}
	if (filters.from) {
		conditions.push(gte(tournament.startDate, filters.from));
	}
	if (filters.to) {
		conditions.push(lte(tournament.startDate, filters.to));
	}

	return db
		.select()
		.from(tournament)
		.where(and(...conditions))
		.orderBy(desc(tournament.startDate))
		.then((rows) => rows.map((row) => toPublicTournament(row) ?? row));
}

/**
 * @param {import('$lib/server/db/schema').tournament.$inferInsert} data
 */
export async function createTournament(data) {
	const id = data.id ?? createId();
	await db.insert(tournament).values({ ...data, id });
	return getTournamentById(id);
}

/**
 * @param {string} id
 * @param {Partial<import('$lib/server/db/schema').tournament.$inferInsert>} data
 */
export async function updateTournament(id, data) {
	await db.update(tournament).set(data).where(eq(tournament.id, id));
	return getTournamentById(id);
}

/**
 * When a Lichess Arena finishes, mark linked published ChessHub events as completed.
 * Does not finalize prizes (`resultsFinalizedAt` stays null until the organizer imports standings).
 * @param {string} lichessTournamentId
 * @returns {Promise<number>} number of rows updated
 */
export async function markPublishedTournamentsCompletedForLichessArena(lichessTournamentId) {
	const id = lichessTournamentId.trim();
	if (!id) return 0;

	const result = await db
		.update(tournament)
		.set({ status: 'completed' })
		.where(
			and(
				eq(tournament.lichessTournamentId, id),
				eq(tournament.lichessTournamentFormat, 'arena'),
				eq(tournament.status, 'published')
			)
		);

	return (
		/** @type {any} */ (result)?.[0]?.affectedRows ??
		/** @type {any} */ (result)?.affectedRows ??
		0
	);
}

/**
 * @param {string} tournamentId
 */
export async function listTournamentPrizes(tournamentId) {
	return db
		.select()
		.from(tournamentPrize)
		.where(eq(tournamentPrize.tournamentId, tournamentId))
		.orderBy(asc(tournamentPrize.placement));
}

/**
 * Replace all prize tiers before results are finalized.
 * @param {string} tournamentId
 * @param {Array<{ placement: number, label: string, amountCents: number }>} prizes
 */
export async function replaceTournamentPrizes(tournamentId, prizes) {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.select({ resultsFinalizedAt: tournament.resultsFinalizedAt })
			.from(tournament)
			.where(eq(tournament.id, tournamentId))
			.limit(1);
		if (!row || row.resultsFinalizedAt) return false;

		await tx.delete(tournamentPrize).where(eq(tournamentPrize.tournamentId, tournamentId));
		if (prizes.length > 0) {
			await tx.insert(tournamentPrize).values(
				prizes.map((prize) => ({
					id: createId(),
					tournamentId,
					placement: prize.placement,
					label: prize.label,
					amountCents: prize.amountCents
				}))
			);
		}
		return true;
	});
}

/**
 * Atomically save the Lichess source and prize tiers before finalization.
 * @param {string} tournamentId
 * @param {{ lichessTournamentId: string, lichessTournamentFormat: 'arena' | 'swiss' }} source
 * @param {Array<{ placement: number, label: string, amountCents: number }>} prizes
 */
export async function saveTournamentPrizeSetup(tournamentId, source, prizes) {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.select({ resultsFinalizedAt: tournament.resultsFinalizedAt })
			.from(tournament)
			.where(eq(tournament.id, tournamentId))
			.limit(1)
			.for('update');
		if (!row || row.resultsFinalizedAt) return false;

		await tx.update(tournament).set(source).where(eq(tournament.id, tournamentId));
		await tx.delete(tournamentPrize).where(eq(tournamentPrize.tournamentId, tournamentId));
		await tx.insert(tournamentPrize).values(
			prizes.map((prize) => ({
				id: createId(),
				tournamentId,
				placement: prize.placement,
				label: prize.label,
				amountCents: prize.amountCents
			}))
		);
		return true;
	});
}

/**
 * Paid registrants with a verified linked Lichess account.
 * @param {string} tournamentId
 */
export async function listEligibleLichessPlayers(tournamentId) {
	return db
		.select({
			userId: user.id,
			name: user.name,
			username: user.username,
			lichessUsername: chessAccount.username
		})
		.from(tournamentRegistration)
		.innerJoin(user, eq(user.id, tournamentRegistration.userId))
		.innerJoin(
			chessAccount,
			and(
				eq(chessAccount.userId, user.id),
				eq(chessAccount.platform, 'lichess'),
				eq(chessAccount.verified, true)
			)
		)
		.where(
			and(
				eq(tournamentRegistration.tournamentId, tournamentId),
				eq(tournamentRegistration.status, 'paid')
			)
		);
}

/**
 * Finalize immutable awards and create one unclaimed claim per winner.
 * @param {string} tournamentId
 * @param {Array<{ prizeId: string, userId: string, placement: number, lichessUsername: string, prizeLabel: string, amountCents: number }>} awards
 */
export async function finalizeTournamentAwards(tournamentId, awards) {
	return db.transaction(async (tx) => {
		const updateResult = await tx
			.update(tournament)
			.set({ resultsFinalizedAt: new Date(), status: 'completed' })
			.where(and(eq(tournament.id, tournamentId), isNull(tournament.resultsFinalizedAt)));
		const affectedRows =
			/** @type {any} */ (updateResult)?.[0]?.affectedRows ??
			/** @type {any} */ (updateResult)?.affectedRows ??
			0;
		if (affectedRows !== 1) return false;

		for (const award of awards) {
			const awardId = createId();
			await tx.insert(tournamentAward).values({
				id: awardId,
				tournamentId,
				prizeId: award.prizeId,
				userId: award.userId,
				placement: award.placement,
				lichessUsername: award.lichessUsername,
				prizeLabel: award.prizeLabel,
				amountCents: award.amountCents
			});
			await tx.insert(prizeClaim).values({
				id: createId(),
				awardId,
				status: 'unclaimed'
			});
		}
		return true;
	});
}

/**
 * @param {string} tournamentId
 */
export async function listTournamentAwards(tournamentId) {
	return db
		.select({
			id: tournamentAward.id,
			tournamentId: tournamentAward.tournamentId,
			userId: tournamentAward.userId,
			placement: tournamentAward.placement,
			lichessUsername: tournamentAward.lichessUsername,
			prizeLabel: tournamentAward.prizeLabel,
			amountCents: tournamentAward.amountCents,
			name: user.name,
			username: user.username,
			image: user.image,
			claimId: prizeClaim.id,
			claimStatus: prizeClaim.status,
			destinationMasked: prizeClaim.destinationMasked,
			recipientName: prizeClaim.recipientName,
			failureCode: prizeClaim.failureCode,
			failureReason: prizeClaim.failureReason,
			claimedAt: prizeClaim.claimedAt,
			paidAt: prizeClaim.paidAt
		})
		.from(tournamentAward)
		.innerJoin(user, eq(user.id, tournamentAward.userId))
		.innerJoin(prizeClaim, eq(prizeClaim.awardId, tournamentAward.id))
		.where(eq(tournamentAward.tournamentId, tournamentId))
		.orderBy(asc(tournamentAward.placement));
}

/**
 * @param {string} tournamentId
 * @param {string} userId
 */
export async function getTournamentAwardForUser(tournamentId, userId) {
	const [row] = await db
		.select({
			award: tournamentAward,
			claim: prizeClaim
		})
		.from(tournamentAward)
		.innerJoin(prizeClaim, eq(prizeClaim.awardId, tournamentAward.id))
		.where(and(eq(tournamentAward.tournamentId, tournamentId), eq(tournamentAward.userId, userId)))
		.limit(1);
	return row ?? null;
}

/**
 * Reserve an unclaimed or failed claim before making an external payout call.
 * @param {string} claimId
 * @param {string} userId
 * @param {{ destinationMasked: string, recipientName: string }} recipient
 */
export async function reservePrizeClaim(claimId, userId, recipient) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ status: prizeClaim.status })
			.from(prizeClaim)
			.innerJoin(tournamentAward, eq(tournamentAward.id, prizeClaim.awardId))
			.where(and(eq(prizeClaim.id, claimId), eq(tournamentAward.userId, userId)))
			.limit(1);
		if (!current || !['unclaimed', 'failed'].includes(current.status)) return null;

		const updateResult = await tx
			.update(prizeClaim)
			.set({
				status: 'processing',
				destinationMasked: recipient.destinationMasked,
				recipientName: recipient.recipientName,
				failureCode: null,
				failureReason: null,
				claimedAt: new Date(),
				attemptCount: sql`${prizeClaim.attemptCount} + 1`
			})
			.where(and(eq(prizeClaim.id, claimId), eq(prizeClaim.status, current.status)));
		const affectedRows =
			/** @type {any} */ (updateResult)?.[0]?.affectedRows ??
			/** @type {any} */ (updateResult)?.affectedRows ??
			0;
		if (affectedRows !== 1) return null;

		const [reserved] = await tx
			.select({
				claim: prizeClaim,
				award: tournamentAward
			})
			.from(prizeClaim)
			.innerJoin(tournamentAward, eq(tournamentAward.id, prizeClaim.awardId))
			.where(eq(prizeClaim.id, claimId))
			.limit(1);
		return reserved ?? null;
	});
}

/**
 * @param {string} claimId
 * @param {{ paymongoWalletTransactionId?: string | null, paymongoTransferId?: string | null, paymongoReferenceNumber?: string | null, status?: 'processing' | 'paid' | 'failed', failureCode?: string | null, failureReason?: string | null, paidAt?: Date | null }} data
 */
export async function updatePrizeClaim(claimId, data) {
	await db.update(prizeClaim).set(data).where(eq(prizeClaim.id, claimId));
}

/**
 * @param {string} claimId
 */
export async function getPrizeClaimById(claimId) {
	const [row] = await db.select().from(prizeClaim).where(eq(prizeClaim.id, claimId)).limit(1);
	return row ?? null;
}

/**
 * @param {string} walletTransactionId
 */
export async function getPrizeClaimByWalletTransaction(walletTransactionId) {
	const [row] = await db
		.select()
		.from(prizeClaim)
		.where(eq(prizeClaim.paymongoWalletTransactionId, walletTransactionId))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} transferId
 */
export async function getPrizeClaimByPaymongoTransfer(transferId) {
	const [row] = await db
		.select()
		.from(prizeClaim)
		.where(eq(prizeClaim.paymongoTransferId, transferId))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} tournamentId
 */
export async function countPaidRegistrations(tournamentId) {
	const [result] = await db
		.select({ count: sql`count(*)` })
		.from(tournamentRegistration)
		.where(
			and(
				eq(tournamentRegistration.tournamentId, tournamentId),
				eq(tournamentRegistration.status, 'paid')
			)
		);
	return Number(result?.count ?? 0);
}

/**
 * Paid registrations for a tournament, newest first.
 * @param {string} tournamentId
 */
export async function listPaidRegistrations(tournamentId) {
	return db
		.select({
			id: tournamentRegistration.id,
			userId: tournamentRegistration.userId,
			paidAt: tournamentRegistration.paidAt,
			createdAt: tournamentRegistration.createdAt,
			name: user.name,
			username: user.username,
			image: user.image
		})
		.from(tournamentRegistration)
		.innerJoin(user, eq(tournamentRegistration.userId, user.id))
		.where(
			and(
				eq(tournamentRegistration.tournamentId, tournamentId),
				eq(tournamentRegistration.status, 'paid')
			)
		)
		.orderBy(desc(tournamentRegistration.paidAt), desc(tournamentRegistration.createdAt));
}

/**
 * @param {string} tournamentId
 * @param {string} userId
 */
export async function getRegistration(tournamentId, userId) {
	const [row] = await db
		.select()
		.from(tournamentRegistration)
		.where(
			and(
				eq(tournamentRegistration.tournamentId, tournamentId),
				eq(tournamentRegistration.userId, userId)
			)
		)
		.limit(1);
	return row ?? null;
}

/**
 * Create a pending registration, or return the existing one (one per user/tournament).
 * @param {string} tournamentId
 * @param {string} userId
 */
export async function createRegistration(tournamentId, userId) {
	const existing = await getRegistration(tournamentId, userId);
	if (existing) return existing;

	const id = createId();
	try {
		await db.insert(tournamentRegistration).values({
			id,
			tournamentId,
			userId,
			status: 'pending'
		});
	} catch (err) {
		// Unique (tournament_id, user_id) race — reuse the row that won.
		const raced = await getRegistration(tournamentId, userId);
		if (raced) return raced;
		throw err;
	}
	return getRegistration(tournamentId, userId);
}

/**
 * @param {string} id
 * @param {{ status?: 'pending' | 'paid' | 'cancelled' | 'refunded', paymongoCheckoutSessionId?: string | null, paymongoPaymentId?: string | null, paidAt?: Date | null, lichessJoinedAt?: Date | null }} data
 */
export async function updateRegistration(id, data) {
	await db.update(tournamentRegistration).set(data).where(eq(tournamentRegistration.id, id));
	const [row] = await db
		.select()
		.from(tournamentRegistration)
		.where(eq(tournamentRegistration.id, id))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} id
 */
export async function getRegistrationById(id) {
	const [row] = await db
		.select()
		.from(tournamentRegistration)
		.where(eq(tournamentRegistration.id, id))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} checkoutSessionId
 */
export async function getRegistrationByCheckoutSession(checkoutSessionId) {
	const [row] = await db
		.select()
		.from(tournamentRegistration)
		.where(eq(tournamentRegistration.paymongoCheckoutSessionId, checkoutSessionId))
		.limit(1);
	return row ?? null;
}

/**
 * @param {string} userId
 */
export async function createOrganizerRequest(userId, message) {
	const id = createId();
	await db.insert(organizerRequest).values({ id, userId, message: message ?? null });
	return id;
}

/**
 * @param {string} userId
 */
export async function getPendingOrganizerRequest(userId) {
	const [row] = await db
		.select()
		.from(organizerRequest)
		.where(and(eq(organizerRequest.userId, userId), eq(organizerRequest.status, 'pending')))
		.limit(1);
	return row ?? null;
}

export async function getPendingOrganizerRequests() {
	return db
		.select({
			request: organizerRequest,
			user: user
		})
		.from(organizerRequest)
		.innerJoin(user, eq(organizerRequest.userId, user.id))
		.where(eq(organizerRequest.status, 'pending'))
		.orderBy(desc(organizerRequest.createdAt));
}

/**
 * @param {string} requestId
 * @param {'approved' | 'rejected'} status
 * @param {string} adminId
 */
export async function reviewOrganizerRequest(requestId, status, adminId) {
	const [request] = await db
		.select()
		.from(organizerRequest)
		.where(eq(organizerRequest.id, requestId))
		.limit(1);

	if (!request) return null;

	await db
		.update(organizerRequest)
		.set({
			status,
			reviewedBy: adminId,
			reviewedAt: new Date()
		})
		.where(eq(organizerRequest.id, requestId));

	if (status === 'approved') {
		await db.update(user).set({ role: 'organizer' }).where(eq(user.id, request.userId));
	}

	return request;
}

/**
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 */
function haversineKm(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** @param {number} deg */
function toRad(deg) {
	return (deg * Math.PI) / 180;
}
