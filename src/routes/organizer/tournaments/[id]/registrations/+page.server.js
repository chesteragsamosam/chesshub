import { error, fail } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guards';
import {
	getTournamentById,
	getRegistrationById,
	listTournamentRegistrations,
	countPaidRegistrations,
	updateRegistration,
	toPublicTournament
} from '$lib/server/db/queries';
import { syncChessHubTournamentAllowList } from '$lib/server/chess/arena-allow-list';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const user = requireOrganizer(event);
	const tournament = await getTournamentById(event.params.id);

	if (!tournament) error(404, 'Tournament not found');
	if (tournament.organizerId !== user.id && user.role !== 'admin') {
		error(403, 'Not your tournament');
	}

	const [registrations, paidCount] = await Promise.all([
		listTournamentRegistrations(tournament.id),
		countPaidRegistrations(tournament.id)
	]);

	return {
		tournament: toPublicTournament(tournament) ?? tournament,
		registrations,
		paidCount,
		pendingCount: registrations.filter((r) => r.status === 'pending').length
	};
}

export const actions = {
	approve: async (event) => {
		const user = requireOrganizer(event);
		const tournament = await getTournamentById(event.params.id);
		if (!tournament) return fail(404, { message: 'Tournament not found' });
		if (tournament.organizerId !== user.id && user.role !== 'admin') {
			return fail(403, { message: 'Forbidden' });
		}
		if (!tournament.directPaymentToOrganizer) {
			return fail(400, {
				message: 'This tournament does not use direct payment approval.'
			});
		}

		const formData = await event.request.formData();
		const registrationId = formData.get('registrationId')?.toString() ?? '';
		if (!registrationId) return fail(400, { message: 'Missing registration' });

		const registration = await getRegistrationById(registrationId);
		if (!registration || registration.tournamentId !== tournament.id) {
			return fail(404, { message: 'Registration not found' });
		}
		if (registration.status === 'paid') {
			return { success: true, alreadyPaid: true };
		}
		if (registration.status !== 'pending') {
			return fail(400, { message: 'Only pending requests can be approved' });
		}

		if (tournament.maxPlayers != null) {
			const paidCount = await countPaidRegistrations(tournament.id);
			if (paidCount >= tournament.maxPlayers) {
				return fail(400, { message: 'This tournament is full' });
			}
		}

		await updateRegistration(registration.id, {
			status: 'paid',
			paidAt: new Date()
		});
		await syncChessHubTournamentAllowList(tournament).catch(() => null);

		return { success: true, approved: true };
	},

	reject: async (event) => {
		const user = requireOrganizer(event);
		const tournament = await getTournamentById(event.params.id);
		if (!tournament) return fail(404, { message: 'Tournament not found' });
		if (tournament.organizerId !== user.id && user.role !== 'admin') {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const registrationId = formData.get('registrationId')?.toString() ?? '';
		if (!registrationId) return fail(400, { message: 'Missing registration' });

		const registration = await getRegistrationById(registrationId);
		if (!registration || registration.tournamentId !== tournament.id) {
			return fail(404, { message: 'Registration not found' });
		}
		if (registration.status !== 'pending') {
			return fail(400, { message: 'Only pending requests can be rejected' });
		}

		await updateRegistration(registration.id, {
			status: 'cancelled',
			paidAt: null
		});

		return { success: true, rejected: true };
	}
};
