import { requireOrganizer } from '$lib/server/auth-guards';
import { getTournamentsByOrganizer } from '$lib/server/db/queries';
import { isPaymongoConfigured } from '$lib/server/paymongo';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const tournaments = await getTournamentsByOrganizer(user.id);

	return {
		tournaments,
		paymongoConfigured: isPaymongoConfigured()
	};
}
