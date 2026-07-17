import { requireOrganizer } from '$lib/server/auth-guards';
import { getTournamentsByOrganizer } from '$lib/server/db/queries';
import { isPaymongoConfigured } from '$lib/server/paymongo';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const { url } = event;

	const modalityRaw = url.searchParams.get('modality')?.trim() || '';
	const fromRaw = url.searchParams.get('from') || '';
	const toRaw = url.searchParams.get('to') || '';

	/** @type {'lichess' | 'otb' | undefined} */
	const modality =
		modalityRaw === 'lichess' || modalityRaw === 'otb' ? modalityRaw : undefined;

	const from = fromRaw ? new Date(fromRaw) : undefined;
	const to = toRaw ? new Date(toRaw + 'T23:59:59') : undefined;

	const tournaments = await getTournamentsByOrganizer(user.id, {
		modality,
		from: from && !Number.isNaN(from.getTime()) ? from : undefined,
		to: to && !Number.isNaN(to.getTime()) ? to : undefined
	});

	return {
		tournaments,
		filters: {
			modality: modality ?? '',
			from: fromRaw,
			to: toRaw
		},
		paymongoConfigured: isPaymongoConfigured()
	};
}
