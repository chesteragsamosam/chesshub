<script>
	import { loadGoogleMaps } from '$lib/client/google-maps';

	/** @type {{
	 *   apiKey: string;
	 *   latitude: number;
	 *   longitude: number;
	 *   title?: string | null;
	 * }} */
	let { apiKey, latitude, longitude, title = 'Venue' } = $props();

	/** @type {HTMLElement | undefined} */
	let mapEl = $state();
	/** @type {string | null} */
	let loadError = $state(null);

	$effect(() => {
		const el = mapEl;
		const key = apiKey;
		const lat = latitude;
		const lng = longitude;
		if (!el || !key || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

		let cancelled = false;
		/** @type {google.maps.MapsEventListener[]} */
		const listeners = [];

		(async () => {
			try {
				const maps = await loadGoogleMaps(key);
				if (cancelled) return;
				const center = { lat, lng };
				const map = new maps.Map(el, {
					center,
					zoom: 15,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: true
				});
				new maps.Marker({
					map,
					position: center,
					title: title || 'Venue'
				});
				void listeners;
			} catch {
				if (!cancelled) {
					loadError = 'Map unavailable';
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const mapsUrl = $derived(
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
	);
</script>

{#if loadError}
	<p class="map-fallback">
		<a href={mapsUrl} class="link" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
	</p>
{:else}
	<div class="map-wrap">
		<div class="map" bind:this={mapEl} role="presentation"></div>
	</div>
	<p class="map-link">
		<a href={mapsUrl} class="link" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
	</p>
{/if}

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.map-wrap {
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		overflow: hidden;
		min-height: 14rem;
	}

	.map {
		width: 100%;
		height: 14rem;
	}

	.map-link,
	.map-fallback {
		margin: $space-2 0 0;
		font-size: $font-size-sm;
	}
</style>
