import { searchTournaments } from '$lib/server/db/queries';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const city = url.searchParams.get('city')?.trim() || '';
	const country = url.searchParams.get('country')?.trim().toUpperCase() || '';
	const fromRaw = url.searchParams.get('from') || '';
	const toRaw = url.searchParams.get('to') || '';
	const latRaw = url.searchParams.get('lat');
	const lngRaw = url.searchParams.get('lng');

	const from = fromRaw ? new Date(fromRaw) : undefined;
	const to = toRaw ? new Date(toRaw + 'T23:59:59') : undefined;
	const latitude = latRaw != null && latRaw !== '' ? Number(latRaw) : undefined;
	const longitude = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : undefined;

	const tournaments = await searchTournaments({
		city: city || undefined,
		country: country || undefined,
		from: from && !Number.isNaN(from.getTime()) ? from : undefined,
		to: to && !Number.isNaN(to.getTime()) ? to : undefined,
		latitude: Number.isFinite(latitude) ? latitude : undefined,
		longitude: Number.isFinite(longitude) ? longitude : undefined
	});

	return {
		tournaments,
		filters: { city, country, from: fromRaw, to: toRaw }
	};
}
