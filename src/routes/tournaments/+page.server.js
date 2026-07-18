import { searchTournaments } from '$lib/server/db/queries';
import { toDateInputValue, tournamentScheduleStatus } from '$lib/tournament-status';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const modalityRaw = url.searchParams.get('modality')?.trim() || '';
	const city = url.searchParams.get('city')?.trim() || '';
	const country = url.searchParams.get('country')?.trim().toUpperCase() || '';
	const fromRaw = url.searchParams.get('from')?.trim() || toDateInputValue();
	const toRaw = url.searchParams.get('to')?.trim() || '';
	const latRaw = url.searchParams.get('lat');
	const lngRaw = url.searchParams.get('lng');

	/** @type {'lichess' | 'otb' | undefined} */
	const modality = modalityRaw === 'lichess' || modalityRaw === 'otb' ? modalityRaw : undefined;

	const from = fromRaw ? new Date(fromRaw) : undefined;
	const to = toRaw ? new Date(toRaw + 'T23:59:59') : undefined;
	const latitude = latRaw != null && latRaw !== '' ? Number(latRaw) : undefined;
	const longitude = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : undefined;

	const tournaments = await searchTournaments({
		modality,
		city: city || undefined,
		country: country || undefined,
		from: from && !Number.isNaN(from.getTime()) ? from : undefined,
		to: to && !Number.isNaN(to.getTime()) ? to : undefined,
		latitude: Number.isFinite(latitude) ? latitude : undefined,
		longitude: Number.isFinite(longitude) ? longitude : undefined
	});

	const now = new Date();
	const withStatus = tournaments.map((tournament) => ({
		...tournament,
		scheduleStatus: tournamentScheduleStatus(tournament, now)
	}));

	withStatus.sort((a, b) => {
		const aLive = a.scheduleStatus.key === 'live' ? 0 : 1;
		const bLive = b.scheduleStatus.key === 'live' ? 0 : 1;
		if (aLive !== bLive) return aLive - bLive;
		return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
	});

	return {
		tournaments: withStatus,
		filters: {
			modality: modality ?? '',
			city,
			country,
			from: fromRaw,
			to: toRaw
		}
	};
}
