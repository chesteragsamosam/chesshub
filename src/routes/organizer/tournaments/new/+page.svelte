<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import VenueMapPicker from '$lib/components/VenueMapPicker.svelte';
	import SponsorListEditor from '$lib/components/SponsorListEditor.svelte';

	let { data, form } = $props();

	/** @type {'lichess' | 'otb'} */
	let modality = $state(
		form?.modality === 'otb' || form?.modality === 'lichess' ? form.modality : 'lichess'
	);

	let variant = $state(/** @type {string} */ (form?.variant ?? 'standard'));
	let addPrizes = $state(Boolean(form?.addPrizes));
	let nextTierId = 0;
	let tiers = $state([{ id: ++nextTierId, placement: 1, label: 'Champion', amount: '1000.00' }]);

	const lichessLinkUrl = $derived(
		`/api/chess/lichess/start?returnTo=${encodeURIComponent('/organizer/tournaments/new')}`
	);

	const linkedJustNow = $derived($page.url.searchParams.get('linked') === 'lichess');
	const linkError = $derived($page.url.searchParams.get('error'));
	const mapsConfigured = $derived(Boolean(data.googleMapsApiKey));

	/** @param {number} minutes */
	function formatClockTime(minutes) {
		if (minutes === 0) return '0';
		if (minutes < 1) return `${minutes * 60}s`;
		return String(minutes);
	}

	/** @param {number} totalMinutes */
	function formatDuration(totalMinutes) {
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		const parts = [];
		if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
		if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
		if (parts.length === 0) return '0 minutes';
		return parts.join(' ');
	}

	/** @param {string} value */
	function variantLabel(value) {
		const labels = {
			standard: 'Standard',
			chess960: 'Chess960',
			crazyhouse: 'Crazyhouse',
			antichess: 'Antichess',
			atomic: 'Atomic',
			horde: 'Horde',
			kingOfTheHill: 'King of the Hill',
			racingKings: 'Racing Kings',
			threeCheck: 'Three-check',
			fromPosition: 'From position'
		};
		return labels[value] ?? value;
	}

	/** @param {Date} date */
	function toDatetimeLocalValue(date) {
		const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function defaultStartInTenMinutes() {
		return toDatetimeLocalValue(new Date(Date.now() + 10 * 60 * 1000));
	}

	let startDate = $state(
		typeof form?.startDate === 'string' && form.startDate
			? form.startDate
			: defaultStartInTenMinutes()
	);
	let arenaMinutes = $state(String(form?.arenaMinutes ?? '60'));

	function addTier() {
		const nextPlacement = Math.max(0, ...tiers.map((tier) => Number(tier.placement) || 0)) + 1;
		tiers.push({
			id: ++nextTierId,
			placement: nextPlacement,
			label: `${nextPlacement} place`,
			amount: '500.00'
		});
	}

	/** @param {number} index */
	function removeTier(index) {
		tiers.splice(index, 1);
	}

	/** @type {HTMLFormElement | undefined} */
	let formEl = $state();

	/** @type {string | null} */
	let clientMessage = $state(null);
	/** @type {string[]} */
	let missingLabels = $state([]);
	/** @type {Set<string>} */
	let invalidNames = $state(new Set());

	const lichessBlocked = $derived(
		modality === 'lichess' && (!data.lichessConfigured || !data.canCreateLichessArena)
	);

	const otbMapsBlocked = $derived(modality === 'otb' && !mapsConfigured);

	const lichessBlockReason = $derived(
		!data.lichessConfigured
			? 'Lichess Arenas aren’t available right now. Contact the site admin.'
			: !data.canCreateLichessArena
				? data.lichessUsername
					? 'Reconnect your Lichess account so ChessHub can create the Arena.'
					: 'Connect your Lichess account before creating an online Arena.'
				: null
	);

	/** @param {HTMLElement} el */
	function labelForControl(el) {
		const field = el.closest('.field');
		if (field) {
			const clone = field.cloneNode(true);
			if (clone instanceof HTMLElement) {
				clone.querySelectorAll('input, select, textarea, .req, .hint').forEach((node) => {
					node.remove();
				});
				const text = clone.textContent?.replace(/\s+/g, ' ').trim();
				if (text) return text;
			}
		}
		const named = el.getAttribute('name');
		return named ?? 'This field';
	}

	/** @param {Element | null | undefined} el */
	function scrollToElement(el) {
		if (!(el instanceof HTMLElement)) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		const focusable = el.matches('input, select, textarea, button, a')
			? el
			: el.querySelector('input, select, textarea, button, a');
		if (focusable instanceof HTMLElement) {
			try {
				focusable.focus({ preventScroll: true });
			} catch {
				focusable.focus();
			}
		}
	}

	function clearClientValidation() {
		clientMessage = null;
		missingLabels = [];
		invalidNames = new Set();
	}

	/**
	 * @param {SubmitEvent} event
	 */
	function handleSubmit(event) {
		clearClientValidation();

		if (lichessBlocked) {
			event.preventDefault();
			clientMessage = lichessBlockReason;
			missingLabels = ['Lichess account connection'];
			invalidNames = new Set(['lichess']);
			scrollToElement(document.getElementById('lichess-setup'));
			return;
		}

		if (otbMapsBlocked) {
			event.preventDefault();
			clientMessage = 'Venue maps aren’t available right now. Contact the site admin.';
			missingLabels = ['Venue pin'];
			invalidNames = new Set(['venue', 'latitude', 'longitude']);
			scrollToElement(document.getElementById('venue-picker'));
			return;
		}

		const form = formEl ?? /** @type {HTMLFormElement | null} */ (event.currentTarget);
		if (!(form instanceof HTMLFormElement)) return;

		if (modality === 'otb') {
			const lat = form.querySelector('input[name="latitude"]');
			const lng = form.querySelector('input[name="longitude"]');
			const latVal = lat instanceof HTMLInputElement ? lat.value.trim() : '';
			const lngVal = lng instanceof HTMLInputElement ? lng.value.trim() : '';
			if (!latVal || !lngVal || !Number.isFinite(Number(latVal)) || !Number.isFinite(Number(lngVal))) {
				event.preventDefault();
				clientMessage = 'Pin the venue on the map so players can find the location.';
				missingLabels = ['Venue pin'];
				invalidNames = new Set(['venue', 'latitude', 'longitude']);
				scrollToElement(document.getElementById('venue-picker'));
				return;
			}
		}

		if (!form.checkValidity()) {
			event.preventDefault();
			const invalids = /** @type {HTMLElement[]} */ ([
				...form.querySelectorAll('input:invalid, select:invalid, textarea:invalid')
			]);

			const names = new Set(
				invalids
					.map((el) => /** @type {HTMLInputElement} */ (el).name)
					.filter(Boolean)
			);
			invalidNames = names;
			missingLabels = [
				...new Set(invalids.map((el) => labelForControl(el)).filter(Boolean))
			];
			clientMessage =
				missingLabels.length === 1
					? `Complete the required field: ${missingLabels[0]}.`
					: 'Complete the required fields highlighted below.';

			const first = invalids[0];
			const details = first?.closest('details.advanced');
			if (details instanceof HTMLDetailsElement) details.open = true;
			scrollToElement(first ?? form.querySelector('.field-invalid'));
			return;
		}
	}

	/** @param {Event} event */
	function handleInput(event) {
		const target = event.target;
		if (!(target instanceof HTMLElement) || !('name' in target)) return;
		const name = /** @type {HTMLInputElement} */ (target).name;
		if (!name || !invalidNames.has(name)) return;
		if (/** @type {HTMLInputElement} */ (target).checkValidity()) {
			const next = new Set(invalidNames);
			next.delete(name);
			invalidNames = next;
			if (next.size === 0) clearClientValidation();
		}
	}
</script>

<div class="page-mid stack">
	<header>
		<h1 class="page-title">New tournament</h1>
		<p class="page-lede">
			Choose Lichess or an over-the-board event, then save as draft or publish.
		</p>
	</header>

	{#if linkedJustNow}
		<p class="alert alert-success">Lichess connected. You can create your Arena.</p>
	{/if}
	{#if linkError}
		<p class="alert alert-error">
			Could not connect Lichess. Please try again.
			<a href={lichessLinkUrl} class="btn btn-primary">Connect Lichess</a>
		</p>
	{/if}

	<form
		method="post"
		use:enhance
		class="panel stack-sm"
		novalidate
		bind:this={formEl}
		onsubmit={handleSubmit}
		oninput={handleInput}
		onchange={handleInput}
	>
		<p class="req-legend">
			Fields marked <span class="req" aria-hidden="true">*</span> are required.
		</p>

		<fieldset class="modality">
			<legend>Event type</legend>
			<div class="modality-options" role="radiogroup" aria-label="Event type">
				<label class="modality-card" class:active={modality === 'lichess'}>
					<input
						type="radio"
						name="modality"
						value="lichess"
						checked={modality === 'lichess'}
						onchange={() => {
							modality = 'lichess';
							clearClientValidation();
						}}
					/>
					<span class="modality-title">Lichess</span>
					<span class="modality-desc">
						Create a private rated Arena on Lichess. Players register and join from ChessHub.
					</span>
				</label>
				<label class="modality-card" class:active={modality === 'otb'}>
					<input
						type="radio"
						name="modality"
						value="otb"
						checked={modality === 'otb'}
						onchange={() => {
							modality = 'otb';
							clearClientValidation();
						}}
					/>
					<span class="modality-title">OTB</span>
					<span class="modality-desc">
						Club or venue event. Pin the location on the map so players can find it.
					</span>
				</label>
			</div>
		</fieldset>

		{#if modality === 'lichess'}
			<div
				id="lichess-setup"
				class="lichess-setup"
				class:lichess-setup-blocked={lichessBlocked}
				class:field-invalid={invalidNames.has('lichess')}
			>
				{#if !data.lichessConfigured}
					<p class="alert alert-error">
						Lichess Arenas aren’t available right now. Contact the site admin.
					</p>
				{:else if !data.canCreateLichessArena}
					<div class="lichess-cta">
						<p>
							{#if data.lichessUsername}
								Connect Lichess again so ChessHub can create your Arena.
							{:else}
								Connect your Lichess account to create an online Arena.
							{/if}
							<span class="req" aria-hidden="true">*</span>
						</p>
						<a href={lichessLinkUrl} class="btn btn-primary">
							{data.lichessUsername ? 'Reconnect Lichess' : 'Connect Lichess'}
						</a>
					</div>
				{:else}
					<p class="hint-banner">
						ChessHub will create a <strong>rated private</strong> Arena on Lichess as
						{data.lichessUsername}. Players join only via ChessHub after registering. Advertise only
						in your Lichess team or team-tournament chats.
						<a href={resolve('/organizer/guide')} class="link">Organizer guide</a>
					</p>
				{/if}
			</div>

			<div class="grid-2">
				<label class="field" class:field-invalid={invalidNames.has('clockTime')}>
					Clock (minutes) <span class="req" aria-hidden="true">*</span>
					<select name="clockTime" required aria-invalid={invalidNames.has('clockTime')}>
						{#each data.clockTimes as value (value)}
							<option
								value={value}
								selected={String(form?.clockTime ?? '3') === String(value)}
								disabled={value === 0.25}
							>
								{formatClockTime(value)}
							</option>
						{/each}
					</select>
				</label>
				<label class="field" class:field-invalid={invalidNames.has('clockIncrement')}>
					Increment (seconds) <span class="req" aria-hidden="true">*</span>
					<select
						name="clockIncrement"
						required
						aria-invalid={invalidNames.has('clockIncrement')}
					>
						{#each data.clockIncrements as value (value)}
							<option
								value={value}
								selected={String(form?.clockIncrement ?? '0') === String(value)}
							>
								{value}
							</option>
						{/each}
					</select>
				</label>
				<label class="field" class:field-invalid={invalidNames.has('arenaMinutes')}>
					Arena duration <span class="req" aria-hidden="true">*</span>
					<select
						name="arenaMinutes"
						required
						bind:value={arenaMinutes}
						aria-invalid={invalidNames.has('arenaMinutes')}
					>
						{#each data.arenaMinutes as value (value)}
							<option value={value}>{formatDuration(value)}</option>
						{/each}
					</select>
				</label>
				<label class="field" class:field-invalid={invalidNames.has('minRatedGames')}>
					Min rated games to join <span class="req" aria-hidden="true">*</span>
					<select
						name="minRatedGames"
						required
						aria-invalid={invalidNames.has('minRatedGames')}
					>
						{#each data.minRatedGamesOptions as value (value)}
							<option
								value={value}
								selected={String(form?.minRatedGames ?? '10') === String(value)}
							>
								{value}
							</option>
						{/each}
					</select>
				</label>
			</div>
			<p class="field-hint">
				Rated is mandatory. 15s and 0+1 controls are blocked because Lichess cannot rate them.
				The Arena ends after the duration above — no separate end date.
			</p>

			<details class="advanced" open={Boolean(form?.message && form?.variant)}>
				<summary>Advanced Lichess settings</summary>
				<div class="advanced-body stack-sm">
					<div class="grid-2">
						<label class="field">
							Variant
							<select name="variant" bind:value={variant}>
								{#each data.variants as value (value)}
									<option value={value}>{variantLabel(value)}</option>
								{/each}
							</select>
						</label>
						{#if variant === 'fromPosition'}
							<label
								class="field span-2"
								class:field-invalid={invalidNames.has('position')}
							>
								Starting FEN <span class="req" aria-hidden="true">*</span>
								<input
									type="text"
									name="position"
									required
									aria-invalid={invalidNames.has('position')}
									placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
									value={form?.position ?? ''}
								/>
							</label>
						{/if}
						<label class="field">
							Team members only (team id)
							<input
								type="text"
								name="teamMemberTeamId"
								placeholder="e.g. coders"
								value={form?.teamMemberTeamId ?? ''}
							/>
						</label>
						<label class="field">
							Min rating
							<select name="minRating">
								<option value="" selected={!form?.minRating}>None</option>
								{#each data.minRatings as value (value)}
									<option value={value} selected={String(form?.minRating ?? '') === String(value)}>
										{value}
									</option>
								{/each}
							</select>
						</label>
						<label class="field">
							Max rating
							<select name="maxRating">
								<option value="" selected={!form?.maxRating}>None</option>
								{#each data.maxRatings as value (value)}
									<option value={value} selected={String(form?.maxRating ?? '') === String(value)}>
										{value}
									</option>
								{/each}
							</select>
						</label>
						<label class="field">
							Min account age (days)
							<select name="accountAgeDays">
								<option value="" selected={!form?.accountAgeDays}>None</option>
								{#each data.accountAges as value (value)}
									<option
										value={value}
										selected={String(form?.accountAgeDays ?? '') === String(value)}
									>
										{value}
									</option>
								{/each}
							</select>
						</label>
					</div>

					<div class="checks">
						<label class="check">
							<input
								type="checkbox"
								name="berserkable"
								checked={form?.berserkable !== false && form?.berserkable !== 'false'}
							/>
							<span>Allow berserk</span>
						</label>
						<label class="check">
							<input
								type="checkbox"
								name="streakable"
								checked={form?.streakable !== false && form?.streakable !== 'false'}
							/>
							<span>Arena streaks (4 points after 2 wins)</span>
						</label>
						<label class="check">
							<input
								type="checkbox"
								name="hasChat"
								checked={form?.hasChat !== false && form?.hasChat !== 'false'}
							/>
							<span>Player chat</span>
						</label>
						<label class="check">
							<input type="checkbox" name="allowBots" checked={Boolean(form?.allowBots)} />
							<span>Allow bots</span>
						</label>
					</div>
					<p class="field-hint">
						Category / rating side prizes are hard to enforce online. Prefer open placement cash
						prizes on ChessHub.
					</p>
				</div>
			</details>
		{/if}

		<label class="field" class:field-invalid={invalidNames.has('title')}>
			Title <span class="req" aria-hidden="true">*</span>
			<input
				type="text"
				name="title"
				required
				aria-invalid={invalidNames.has('title')}
				value={form?.title ?? ''}
			/>
		</label>
		<label class="field">
			Description
			<textarea name="description" rows="4">{form?.description ?? ''}</textarea>
		</label>

		{#if modality === 'otb'}
			{#if !mapsConfigured}
				<p class="alert alert-error" id="venue-picker">
					Venue maps aren’t available right now. Contact the site admin before posting an OTB
					event.
				</p>
			{:else}
				<section class="venue-section stack-sm">
					<h2 class="section-title">Venue pin <span class="req" aria-hidden="true">*</span></h2>
					<p class="field-hint venue-lede">
						Players need the exact venue on the map before you can post.
					</p>
					<VenueMapPicker
						apiKey={data.googleMapsApiKey}
						invalid={invalidNames.has('venue') ||
							invalidNames.has('latitude') ||
							invalidNames.has('longitude')}
						value={{
							venue: typeof form?.venue === 'string' ? form.venue : '',
							city: typeof form?.city === 'string' ? form.city : '',
							state: typeof form?.state === 'string' ? form.state : '',
							country: typeof form?.country === 'string' ? form.country : '',
							latitude:
								typeof form?.latitude === 'string' && form.latitude
									? Number(form.latitude)
									: null,
							longitude:
								typeof form?.longitude === 'string' && form.longitude
									? Number(form.longitude)
									: null
						}}
					/>
				</section>
			{/if}

			<div class="grid-2">
				<label class="field" class:field-invalid={invalidNames.has('clockTime')}>
					Clock (minutes) <span class="req" aria-hidden="true">*</span>
					<input
						type="number"
						name="clockTime"
						min="0"
						step="0.5"
						required
						aria-invalid={invalidNames.has('clockTime')}
						value={form?.clockTime ?? '90'}
					/>
				</label>
				<label class="field" class:field-invalid={invalidNames.has('clockIncrement')}>
					Increment (seconds)
					<input
						type="number"
						name="clockIncrement"
						min="0"
						step="1"
						aria-invalid={invalidNames.has('clockIncrement')}
						value={form?.clockIncrement ?? '30'}
					/>
				</label>
				<label class="field" class:field-invalid={invalidNames.has('clockDelay')}>
					Delay (seconds)
					<input
						type="number"
						name="clockDelay"
						min="0"
						step="1"
						aria-invalid={invalidNames.has('clockDelay')}
						value={form?.clockDelay ?? '0'}
					/>
				</label>
			</div>
			<p class="field-hint">
				Use increment (Fischer) and/or delay (Bronstein/simple). ChessHub classifies Blitz, Rapid, or
				Standard from the full clock.
			</p>
		{/if}

		<div class="grid-2">
			<label class="field" class:field-invalid={invalidNames.has('startDate')}>
				Start <span class="req" aria-hidden="true">*</span>
				<input
					type="datetime-local"
					name="startDate"
					required
					aria-invalid={invalidNames.has('startDate')}
					bind:value={startDate}
				/>
			</label>
			<label class="field">
				Entry fee
				<input
					type="number"
					name="entryFee"
					min="0"
					step="0.01"
					value={form?.entryFee ?? '0'}
				/>
			</label>
			<label class="field">
				Currency
				<input
					type="text"
					name="currency"
					value={form?.currency ?? 'php'}
					maxlength="3"
					class="lowercase"
				/>
			</label>
			<label class="field span-2">
				Max players (optional)
				<input type="number" name="maxPlayers" min="1" value={form?.maxPlayers ?? ''} />
			</label>
			<label class="check span-2">
				<input
					type="checkbox"
					name="directPaymentToOrganizer"
					checked={Boolean(form?.directPaymentToOrganizer)}
				/>
				<span>
					Accept direct payment to organizer
					<span class="hint">
						Players request to join; you approve after confirming they paid you offline. No online
						checkout.
					</span>
				</span>
			</label>
		</div>

		<section class="prizes-optional stack-sm">
			<label class="check">
				<input
					type="checkbox"
					name="addPrizes"
					checked={addPrizes}
					onchange={(e) => (addPrizes = e.currentTarget.checked)}
				/>
				<span>Add cash prizes now (optional — PHP via GCash later)</span>
			</label>

			{#if addPrizes}
				<div class="tiers">
					<div class="tier-heading">
						<h2 class="section-title">Prize tiers</h2>
						<button type="button" class="btn btn-secondary" onclick={addTier}>Add tier</button>
					</div>
					{#each tiers as tier, index (tier.id)}
						<div class="tier-row">
							<label
								class="field compact"
								class:field-invalid={invalidNames.has('placement')}
							>
								Place <span class="req" aria-hidden="true">*</span>
								<input
									type="number"
									name="placement"
									min="1"
									required
									aria-invalid={invalidNames.has('placement')}
									bind:value={tier.placement}
								/>
							</label>
							<label class="field" class:field-invalid={invalidNames.has('label')}>
								Label <span class="req" aria-hidden="true">*</span>
								<input
									name="label"
									maxlength="255"
									required
									aria-invalid={invalidNames.has('label')}
									bind:value={tier.label}
								/>
							</label>
							<label class="field" class:field-invalid={invalidNames.has('amount')}>
								Amount (PHP) <span class="req" aria-hidden="true">*</span>
								<input
									type="number"
									name="amount"
									min="1"
									max="50000"
									step="0.01"
									required
									aria-invalid={invalidNames.has('amount')}
									bind:value={tier.amount}
								/>
							</label>
							<button
								type="button"
								class="btn btn-secondary remove"
								disabled={tiers.length === 1}
								onclick={() => removeTier(index)}
							>
								Remove
							</button>
						</div>
					{/each}
				</div>
				<p class="field-hint">
					Hold payouts 72 hours after the event for fair-play review. Cash prizes only.
				</p>
			{/if}
		</section>

		<SponsorListEditor invalid={invalidNames.has('sponsorName') || invalidNames.has('sponsorUrl')} />

		<label class="check">
			<input
				type="checkbox"
				name="publish"
				checked={form?.publish === undefined ? true : Boolean(form.publish)}
			/>
			<span>
				Publish immediately
				<span class="hint">(required before players can register)</span>
				{#if !data.paymongoConfigured}
					<span class="hint">(online paid events require PayMongo, or use direct payment)</span>
				{/if}
			</span>
		</label>

		{#if clientMessage || form?.message}
			<div
				id="form-feedback"
				class="alert alert-error submit-feedback"
				role="alert"
				aria-live="polite"
			>
				<p>{clientMessage ?? form?.message}</p>
				{#if missingLabels.length > 0}
					<ul class="missing-list">
						{#each missingLabels as label (label)}
							<li>{label}</li>
						{/each}
					</ul>
				{/if}
				{#if (form?.needsLichessLink || lichessBlocked) && data.lichessConfigured}
					<a href={lichessLinkUrl} class="btn btn-primary">
						{data.lichessUsername ? 'Reconnect Lichess' : 'Connect Lichess'}
					</a>
				{/if}
			</div>
		{/if}

		<div class="actions">
			<button type="submit" class="btn btn-primary">
				{modality === 'lichess' ? 'Create on Lichess & ChessHub' : 'Create tournament'}
			</button>
			<a href={resolve('/organizer')} class="btn btn-secondary">Cancel</a>
		</div>
		{#if lichessBlocked}
			<p class="submit-hint">{lichessBlockReason}</p>
		{/if}
	</form>
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.modality {
		margin: 0;
		padding: 0;
		border: none;
		display: flex;
		flex-direction: column;
		gap: $space-3;

		legend {
			padding: 0;
			font-size: $font-size-sm;
			font-weight: $font-weight-medium;
			color: $color-text;
		}
	}

	.modality-options {
		display: grid;
		gap: $space-3;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.modality-card {
		display: flex;
		flex-direction: column;
		gap: $space-1;
		padding: $space-4;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: color-mix(in srgb, $color-surface 92%, $color-bg);
		cursor: pointer;
		transition:
			border-color $duration-fast $ease-out,
			background-color $duration-fast $ease-out;

		&:hover {
			border-color: color-mix(in srgb, $color-primary 45%, $color-border);
		}

		&.active {
			border-color: $color-primary;
			background: $color-primary-soft;
		}

		input {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
	}

	.modality-title {
		font-weight: $font-weight-semibold;
	}

	.modality-desc {
		font-size: $font-size-sm;
		color: $color-text-muted;
		line-height: 1.4;
	}

	.hint-banner {
		margin: 0;
		padding: $space-3 $space-4;
		border-radius: $radius-md;
		background: color-mix(in srgb, $color-primary-soft 70%, transparent);
		font-size: $font-size-sm;
		color: $color-text;
		line-height: 1.45;
	}

	.lichess-cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
		padding: $space-4;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: color-mix(in srgb, $color-surface 92%, $color-bg);

		p {
			margin: 0;
			flex: 1 1 12rem;
			font-size: $font-size-sm;
			line-height: 1.45;
		}
	}

	.field-hint {
		margin: calc($space-2 * -1) 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.advanced {
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		padding: $space-3 $space-4;

		summary {
			cursor: pointer;
			font-weight: $font-weight-medium;
			font-size: $font-size-sm;
		}
	}

	.advanced-body {
		margin-top: $space-4;
	}

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.span-2 {
		@media (min-width: $breakpoint-sm) {
			grid-column: span 2;
		}
	}

	.checks {
		display: grid;
		gap: $space-2;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.prizes-optional {
		padding-top: $space-2;
		border-top: $border-width solid color-mix(in srgb, $color-border 70%, transparent);
	}

	.venue-section {
		padding-top: $space-2;
	}

	.venue-lede {
		margin: 0;
	}

	.tiers {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.tier-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
	}

	.tier-row {
		display: grid;
		gap: $space-3;
		align-items: end;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: 5rem 1fr 8rem auto;
		}
	}

	.compact :global(input) {
		max-width: 5rem;
	}

	.remove {
		justify-self: start;
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}

	:global(input.lowercase) {
		text-transform: lowercase;
	}

	.check {
		display: flex;
		align-items: flex-start;
		gap: $space-2;
		font-size: $font-size-sm;
	}

	.hint {
		color: $color-text-muted;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}

	.req-legend {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.req {
		color: $color-danger;
		font-weight: $font-weight-semibold;
	}

	.lichess-setup {
		border-radius: $radius-lg;
		transition:
			box-shadow $duration-fast $ease-out,
			outline-color $duration-fast $ease-out;
	}

	.lichess-setup-blocked.field-invalid,
	.field-invalid {
		outline: 2px solid color-mix(in srgb, $color-danger 70%, transparent);
		outline-offset: 2px;
		border-radius: $radius-md;
	}

	.field-invalid :is(input, textarea, select) {
		border-color: $color-danger;
		box-shadow: 0 0 0 calc(var(--spacing) * 0.75) color-mix(in srgb, $color-danger 22%, transparent);
	}

	.submit-feedback {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: $space-3;

		p {
			margin: 0;
		}
	}

	.missing-list {
		margin: 0;
		padding-left: $space-5;
		font-size: $font-size-sm;
	}

	.submit-hint {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
		line-height: 1.45;
	}
</style>
