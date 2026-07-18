<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { modalityLabel } from '$lib/time-control';

	let { data } = $props();

	let endDateOpen = $state(false);
	const showEndDate = $derived(Boolean(data.filters.to) || endDateOpen);

	const hasExtraFilters = $derived(
		Boolean(data.filters.modality) ||
			Boolean(data.filters.city) ||
			Boolean(data.filters.country) ||
			Boolean(data.filters.to) ||
			$page.url.searchParams.has('lat') ||
			$page.url.searchParams.has('lng')
	);

	/** @param {number} cents @param {string} currency */
	function formatFee(cents, currency) {
		if (!cents) return 'Free';
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: (currency || 'php').toUpperCase()
		}).format(cents / 100);
	}

	/** @param {Date | string} d */
	function formatDate(d) {
		return new Date(d).toLocaleDateString(undefined, {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	/** @param {{ modality?: string, venue?: string | null, city?: string | null, state?: string | null, country?: string | null }} tournament */
	function locationLine(tournament) {
		if (tournament.modality === 'lichess') return 'Online · Lichess';
		return [tournament.venue, tournament.city, tournament.state, tournament.country]
			.filter(Boolean)
			.join(' · ');
	}
</script>

<div class="page stack">
	<header>
		<h1 class="page-title">Find tournaments</h1>
		<p class="page-lede">Search Lichess and OTB events by type, location, and date.</p>
	</header>

	<form method="get" class="panel filters">
		<label class="field">
			Type
			<select name="modality">
				<option value="" selected={data.filters.modality === ''}>All</option>
				<option value="lichess" selected={data.filters.modality === 'lichess'}>Lichess</option>
				<option value="otb" selected={data.filters.modality === 'otb'}>OTB</option>
			</select>
		</label>
		<label class="field">
			City
			<input type="text" name="city" value={data.filters.city} />
		</label>
		<label class="field">
			Country
			<input
				type="text"
				name="country"
				maxlength="2"
				placeholder="PH"
				value={data.filters.country}
				class="uppercase"
			/>
		</label>
		<label class="field">
			From
			<input type="date" name="from" value={data.filters.from} required />
		</label>
		{#if showEndDate}
			<label class="field">
				To
				<input type="date" name="to" value={data.filters.to} />
			</label>
		{:else}
			<div class="field optional-end">
				<span class="optional-end-label">To</span>
				<button type="button" class="link optional-end-btn" onclick={() => (endDateOpen = true)}>
					Add end date
				</button>
			</div>
		{/if}
		<div class="filter-actions">
			<button type="submit" class="btn btn-primary">Search</button>
			{#if hasExtraFilters}
				<a href="{resolve('/tournaments')}?from={encodeURIComponent(data.filters.from)}" class="btn btn-secondary"
					>Clear</a
				>
			{/if}
		</div>
	</form>

	{#if data.tournaments.length === 0}
		<p class="panel-dashed">No published tournaments match your filters.</p>
	{:else}
		<ul class="results">
			{#each data.tournaments as tournament (tournament.id)}
				<li>
					<a href={resolve(`/tournaments/${tournament.id}`)} class="list-link">
						<div class="result-row">
							<div class="result-main">
								<div class="result-heading">
									<span
										class="status-badge status-{tournament.scheduleStatus.key}"
										class:is-live={tournament.scheduleStatus.key === 'live'}
									>
										{#if tournament.scheduleStatus.key === 'live'}
											<span class="live-dot" aria-hidden="true"></span>
										{/if}
										{tournament.scheduleStatus.label}
									</span>
									<p class="result-type">{modalityLabel(tournament.modality)}</p>
									{#if tournament.timeControl}
										<p class="result-tc">
											<span class="tc-speed">{tournament.timeControl.label}</span>
											<span class="tc-clock">{tournament.timeControl.clock}</span>
										</p>
									{/if}
								</div>
								<h2 class="result-title">{tournament.title}</h2>
								<p class="result-meta">{locationLine(tournament)}</p>
								<p class="result-meta">{formatDate(tournament.startDate)}</p>
							</div>
							<div class="result-side">
								<p class="result-fee">{formatFee(tournament.entryFeeCents, tournament.currency)}</p>
								{#if tournament.distanceKm != null}
									<p class="result-meta">{tournament.distanceKm.toFixed(1)} km away</p>
								{/if}
							</div>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.filters {
		display: grid;
		gap: $space-3;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			align-items: end;
		}
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: $space-2;
	}

	.optional-end {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: $space-2;
		min-height: 100%;
	}

	.optional-end-label {
		font-size: $font-size-sm;
		font-weight: $font-weight-medium;
		color: $color-text;
	}

	.optional-end-btn {
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		font: inherit;
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: $space-4;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.result-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: $space-3;
	}

	.result-main {
		min-width: 0;
		flex: 1;
	}

	.result-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		margin-bottom: $space-1;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: $space-1;
		padding: $space-1 $space-2;
		border-radius: $radius-sm;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		line-height: 1.2;
		background: color-mix(in srgb, $color-text-muted 14%, $color-surface);
		color: $color-text-muted;
	}

	.status-upcoming {
		background: $color-primary-soft;
		color: $color-primary;
	}

	.status-ended,
	.status-completed {
		background: color-mix(in srgb, $color-border 55%, $color-surface);
		color: $color-text-muted;
	}

	.status-cancelled {
		background: $color-danger-soft;
		color: $color-danger;
	}

	.status-live,
	.is-live {
		background: $color-danger;
		color: $color-on-primary;
		box-shadow: 0 0 0 1px color-mix(in srgb, $color-danger 35%, transparent);
	}

	.live-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: $radius-full;
		background: currentColor;
		animation: live-pulse 1.4s ease-out infinite;
	}

	@keyframes live-pulse {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		70% {
			opacity: 0.35;
			transform: scale(0.85);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.result-type {
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-primary;
	}

	.result-tc {
		display: inline-flex;
		align-items: baseline;
		gap: $space-2;
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text;
	}

	.tc-clock {
		font-variant-numeric: tabular-nums;
		font-weight: $font-weight-medium;
		letter-spacing: normal;
		text-transform: none;
		color: $color-text-muted;
	}

	.result-title {
		margin: 0;
		font-family: $font-display;
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-tight;
	}

	.result-meta {
		margin: $space-1 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.result-side {
		text-align: right;
	}

	.result-fee {
		margin: 0;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
	}
</style>
