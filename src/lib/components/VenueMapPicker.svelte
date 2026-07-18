<script>
	import { onDestroy } from 'svelte';
	import { loadGoogleMaps } from '$lib/client/google-maps';

	/**
	 * @typedef {{
	 *   venue?: string | null;
	 *   city?: string | null;
	 *   state?: string | null;
	 *   country?: string | null;
	 *   latitude?: number | null;
	 *   longitude?: number | null;
	 * }} VenueValue
	 */

	/** @type {{
	 *   apiKey: string;
	 *   value?: VenueValue | null;
	 *   invalid?: boolean;
	 * }} */
	let { apiKey, value = null, invalid = false } = $props();

	/** @type {HTMLElement | undefined} */
	let mapEl = $state();
	/** @type {HTMLInputElement | undefined} */
	let searchEl = $state();

	let venue = $state(value?.venue ?? '');
	let city = $state(value?.city ?? '');
	let state = $state(value?.state ?? '');
	let country = $state(value?.country ?? '');
	let latitude = $state(
		value?.latitude != null && Number.isFinite(value.latitude) ? String(value.latitude) : ''
	);
	let longitude = $state(
		value?.longitude != null && Number.isFinite(value.longitude) ? String(value.longitude) : ''
	);

	/** @type {string | null} */
	let loadError = $state(null);
	let loading = $state(true);

	/** @type {any} */
	let map = null;
	/** @type {any} */
	let marker = null;
	/** @type {any} */
	let autocomplete = null;
	/** @type {Array<{ remove: () => void }>} */
	let listeners = [];

	const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 }; // Manila

	/**
	 * @param {Array<{ long_name: string, short_name: string, types: string[] }> | undefined} components
	 * @param {string[]} types
	 */
	function componentByType(components, types) {
		if (!components) return '';
		const match = components.find((c) => types.some((t) => c.types.includes(t)));
		return match?.short_name || match?.long_name || '';
	}

	/**
	 * @param {{
	 *   name?: string;
	 *   formatted_address?: string;
	 *   address_components?: Array<{ long_name: string, short_name: string, types: string[] }>;
	 * }} place
	 * @param {{ lat: number, lng: number }} latLng
	 */
	function applyPlace(place, latLng) {
		const name = place.name || place.formatted_address || venue || 'Pinned venue';
		venue = name;
		city =
			componentByType(place.address_components, ['locality', 'postal_town']) ||
			componentByType(place.address_components, ['administrative_area_level_2']) ||
			city;
		state =
			componentByType(place.address_components, ['administrative_area_level_1']) || state;
		const countryCode = componentByType(place.address_components, ['country']);
		country = countryCode ? countryCode.toUpperCase().slice(0, 2) : country;
		latitude = String(latLng.lat);
		longitude = String(latLng.lng);
	}

	/**
	 * @param {{ lat: number, lng: number }} latLng
	 * @param {boolean} [pan]
	 */
	function setMarker(latLng, pan = true) {
		if (!map || !window.google?.maps) return;
		if (!marker) {
			marker = new window.google.maps.Marker({
				map,
				position: latLng,
				draggable: true,
				title: 'Venue pin'
			});
			listeners.push(
				marker.addListener('dragend', () => {
					const pos = marker?.getPosition();
					if (!pos) return;
					latitude = String(pos.lat());
					longitude = String(pos.lng());
					reverseGeocode({ lat: pos.lat(), lng: pos.lng() });
				})
			);
		} else {
			marker.setPosition(latLng);
		}
		if (pan) {
			map.panTo(latLng);
			if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
		}
	}

	/** @param {{ lat: number, lng: number }} latLng */
	function reverseGeocode(latLng) {
		if (!window.google?.maps) return;
		const geocoder = new window.google.maps.Geocoder();
		geocoder.geocode({ location: latLng }, (results, status) => {
			if (status !== 'OK' || !results?.[0]) return;
			applyPlace(results[0], latLng);
		});
	}

	$effect(() => {
		const el = mapEl;
		const search = searchEl;
		const key = apiKey;
		if (!el || !search || !key) return;

		let cancelled = false;

		(async () => {
			loading = true;
			loadError = null;
			try {
				const maps = await loadGoogleMaps(key);
				if (cancelled) return;

				const hasPin =
					latitude !== '' &&
					longitude !== '' &&
					Number.isFinite(Number(latitude)) &&
					Number.isFinite(Number(longitude));
				const center = hasPin
					? { lat: Number(latitude), lng: Number(longitude) }
					: DEFAULT_CENTER;

				map = new maps.Map(el, {
					center,
					zoom: hasPin ? 15 : 11,
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: false
				});

				autocomplete = new maps.places.Autocomplete(search, {
					fields: ['name', 'formatted_address', 'geometry', 'address_components']
				});
				autocomplete.bindTo('bounds', map);

				listeners.push(
					autocomplete.addListener('place_changed', () => {
						const place = autocomplete?.getPlace();
						const loc = place?.geometry?.location;
						if (!place || !loc) {
							loadError = 'Pick a place from the suggestions list';
							return;
						}
						loadError = null;
						const latLng = { lat: loc.lat(), lng: loc.lng() };
						applyPlace(place, latLng);
						setMarker(latLng);
					})
				);

				listeners.push(
					map.addListener('click', (/** @type {{ latLng?: { lat: () => number, lng: () => number } }} */ event) => {
						if (!event.latLng) return;
						const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
						latitude = String(latLng.lat);
						longitude = String(latLng.lng);
						setMarker(latLng, false);
						reverseGeocode(latLng);
					})
				);

				if (hasPin) {
					setMarker(center, false);
				}

				loading = false;
			} catch {
				if (!cancelled) {
					loading = false;
					loadError = 'Could not load Google Maps. Check the API key and try again.';
				}
			}
		})();

		return () => {
			cancelled = true;
			for (const listener of listeners) {
				listener.remove();
			}
			listeners = [];
			autocomplete = null;
			marker = null;
			map = null;
		};
	});

	onDestroy(() => {
		for (const listener of listeners) {
			listener.remove();
		}
		listeners = [];
	});
</script>

<div class="venue-picker" class:field-invalid={invalid} id="venue-picker">
	<label class="field" class:field-invalid={invalid}>
		Search venue <span class="req" aria-hidden="true">*</span>
		<input
			type="text"
			bind:this={searchEl}
			placeholder="Search for a club, hall, or address"
			autocomplete="off"
			aria-invalid={invalid}
		/>
	</label>

	<label class="field" class:field-invalid={invalid}>
		Venue name <span class="req" aria-hidden="true">*</span>
		<input type="text" name="venue" required bind:value={venue} aria-invalid={invalid} />
	</label>

	<div class="map-wrap" class:is-loading={loading}>
		<div class="map" bind:this={mapEl} role="presentation"></div>
		{#if loading}
			<p class="map-status">Loading map…</p>
		{/if}
	</div>

	{#if loadError}
		<p class="alert alert-error">{loadError}</p>
	{:else}
		<p class="field-hint">
			Search or click the map to drop a pin. Drag the pin to fine-tune.
		</p>
	{/if}

	<div class="grid-2">
		<label class="field">
			City
			<input type="text" name="city" bind:value={city} />
		</label>
		<label class="field">
			State / region
			<input type="text" name="state" bind:value={state} />
		</label>
		<label class="field">
			Country code
			<input
				type="text"
				name="country"
				maxlength="2"
				placeholder="PH"
				class="uppercase"
				bind:value={country}
			/>
		</label>
	</div>

	<input type="hidden" name="latitude" value={latitude} required />
	<input type="hidden" name="longitude" value={longitude} required />
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.venue-picker {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.map-wrap {
		position: relative;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		overflow: hidden;
		min-height: 16rem;
		background: color-mix(in srgb, $color-surface 92%, $color-bg);
	}

	.map {
		width: 100%;
		height: 16rem;
	}

	.map-status {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		background: color-mix(in srgb, $color-bg 70%, transparent);
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.field-hint {
		margin: calc($space-2 * -1) 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.req {
		color: $color-danger;
		font-weight: $font-weight-semibold;
	}

	.field-invalid :is(input, textarea, select) {
		border-color: $color-danger;
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}
</style>
