<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let { data } = $props();

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

	/** @param {'lichess' | 'otb' | string | null | undefined} modality */
	function modalityLabel(modality) {
		return modality === 'otb' ? 'OTB local' : 'Lichess';
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
		<p class="page-lede">Search published Lichess and local OTB events by type, location, and date.</p>
	</header>

	<form method="get" class="panel filters">
		<label class="field">
			Type
			<select name="modality">
				<option value="" selected={data.filters.modality === ''}>All</option>
				<option value="lichess" selected={data.filters.modality === 'lichess'}>Lichess</option>
				<option value="otb" selected={data.filters.modality === 'otb'}>OTB local</option>
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
			<input type="date" name="from" value={data.filters.from} />
		</label>
		<label class="field">
			To
			<input type="date" name="to" value={data.filters.to} />
		</label>
		<div class="filter-actions">
			<button type="submit" class="btn btn-primary">Search</button>
			{#if $page.url.search}
				<a href={resolve('/tournaments')} class="btn btn-secondary">Clear</a>
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
							<div>
								<p class="result-type">{tournament.title}</p>
								<h2 class="result-title">{modalityLabel(tournament.modality)}</h2>
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

	.result-type {
		margin: 0 0 $space-1;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-primary;
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
