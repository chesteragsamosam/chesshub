<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { modalityLabel } from '$lib/time-control';

	let { data } = $props();

	/** @param {number} cents @param {string} currency */
	function formatFee(cents, currency) {
		if (!cents) return 'Free';
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: (currency || 'php').toUpperCase()
		}).format(cents / 100);
	}
</script>

<div class="page stack">
	<header class="header">
		<div>
			<h1 class="page-title">Organizer dashboard</h1>
			<p class="page-lede">Create and manage your tournaments.</p>
		</div>
		<div class="header-actions">
			<a href={resolve('/organizer/guide')} class="btn btn-secondary">Organizer guide</a>
			<a href={resolve('/organizer/tournaments/new')} class="btn btn-primary">New tournament</a>
		</div>
	</header>

	{#if !data.paymongoConfigured}
		<section class="panel">
			<h2 class="section-title">Payments</h2>
			<p class="page-lede">
				Online paid registrations aren’t available yet. You can still collect entry fees by enabling
				<strong>Accept direct payment to organizer</strong> when creating a tournament, then approve
				players after they pay you offline.
			</p>
		</section>
	{/if}

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
			From
			<input type="date" name="from" value={data.filters.from} />
		</label>
		<label class="field">
			To
			<input type="date" name="to" value={data.filters.to} />
		</label>
		<div class="filter-actions">
			<button type="submit" class="btn btn-primary">Filter</button>
			{#if $page.url.search}
				<a href={resolve('/organizer')} class="btn btn-secondary">Clear</a>
			{/if}
		</div>
	</form>

	{#if data.tournaments.length === 0}
		<p class="panel-dashed">
			{#if $page.url.search}
				No tournaments match your filters.
			{:else}
				No tournaments yet.
				<a href={resolve('/organizer/tournaments/new')} class="link">Create one</a>
			{/if}
		</p>
	{:else}
		<ul class="tournament-list">
			{#each data.tournaments as tournament (tournament.id)}
				<li>
					<div>
						<a href={resolve(`/tournaments/${tournament.id}`)} class="tournament-title">
							{tournament.title}
						</a>
						<p class="meta">
							<span class="modality">{modalityLabel(tournament.modality)}</span>
							{#if tournament.timeControl}
								· <span>{tournament.timeControl.label} {tournament.timeControl.clock}</span>
							{/if}
							· <span class="capitalize">{tournament.status}</span>
							· {formatFee(tournament.entryFeeCents, tournament.currency)}
							· {new Date(tournament.startDate).toLocaleDateString()}
						</p>
					</div>
					<div class="row-links">
						<a href={resolve(`/organizer/tournaments/${tournament.id}/edit`)} class="link">Edit</a>
						<a
							href={resolve(`/organizer/tournaments/${tournament.id}/registrations`)}
							class="link"
						>
							Registrations
						</a>
					</div>
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

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-4;
	}

	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}

	.filters {
		display: grid;
		gap: $space-3;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: end;
		}

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: $space-2;
	}

	.tournament-list {
		margin: 0;
		padding: 0;
		list-style: none;
		background: $color-surface;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		overflow: hidden;

		li {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: $space-3;
			padding: $space-4 $space-5;
			border-bottom: $border-width solid color-mix(in srgb, $color-border 70%, transparent);

			&:last-child {
				border-bottom: none;
			}
		}
	}

	.tournament-title {
		font-weight: $font-weight-medium;
		text-decoration: none;

		&:hover {
			color: $color-primary;
		}
	}

	.meta {
		margin: $space-1 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.row-links {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}

	.modality {
		font-weight: $font-weight-medium;
		color: $color-primary;
	}

	.capitalize {
		text-transform: capitalize;
	}
</style>
