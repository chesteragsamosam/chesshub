<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { profileSlug } from '$lib/username';

	let { data } = $props();

	const hasFilters = $derived(
		data.filters.q.length >= 2 || data.filters.city || data.filters.country
	);

	/** @param {number} pageNum */
	function pageHref(pageNum) {
		const params = new URLSearchParams();
		if (data.filters.q) params.set('q', data.filters.q);
		if (data.filters.city) params.set('city', data.filters.city);
		if (data.filters.country) params.set('country', data.filters.country);
		if (pageNum > 1) params.set('page', String(pageNum));
		const qs = params.toString();
		return qs ? `${resolve('/players')}?${qs}` : resolve('/players');
	}

	const pageStart = $derived(
		data.pagination.total === 0 ? 0 : (data.pagination.page - 1) * data.pagination.pageSize + 1
	);
	const pageEnd = $derived(
		Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)
	);
</script>

<div class="page stack">
	<header>
		<h1 class="page-title">Find players</h1>
		<p class="page-lede">
			Browse registered players sorted by classical rating, or search by name, username, city, or
			linked Lichess / Chess.com / FIDE username.
		</p>
	</header>

	<form method="get" class="panel filters">
		<label class="field span-2">
			Search
			<input
				type="search"
				name="q"
				value={data.filters.q}
				placeholder="Name or chess username"
				minlength="2"
			/>
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
				placeholder="US"
				value={data.filters.country}
				class="uppercase"
			/>
		</label>
		<div class="filter-actions">
			<button type="submit" class="btn btn-primary">Search</button>
			{#if $page.url.search}
				<a href={resolve('/players')} class="btn btn-secondary">Clear</a>
			{/if}
		</div>
	</form>

	{#if data.players.length === 0}
		<p class="panel-dashed">
			{hasFilters
				? 'No players found. Try a different name or chess username.'
				: 'No registered players yet.'}
		</p>
	{:else}
		<div class="results-header">
			<p class="results-summary">
				Showing {pageStart}–{pageEnd} of {data.pagination.total} players
			</p>
		</div>

		<ul class="results">
			{#each data.players as player (player.id)}
				<li>
					<a href={resolve(`/profile/${profileSlug(player)}`)} class="list-link player">
						<UserAvatar name={player.name} image={player.image} size="md" />
						<div class="player-meta">
							<p class="player-name">{player.name}</p>
							{#if player.username}
								<p class="result-meta">@{player.username}</p>
							{/if}
							{#if player.city || player.country}
								<p class="result-meta">
									{[player.city, player.country].filter(Boolean).join(', ')}
								</p>
							{/if}
							{#if player.chessAccounts.length}
								<p class="platforms">
									{player.chessAccounts
										.map((a) => `${a.platform}: ${a.username}`)
										.join(' · ')}
								</p>
							{/if}
						</div>
						{#if player.classicalRating != null}
							<p class="classical-rating">{player.classicalRating}</p>
						{/if}
					</a>
				</li>
			{/each}
		</ul>

		{#if data.pagination.totalPages > 1}
			<nav class="pagination" aria-label="Players pagination">
				{#if data.pagination.page > 1}
					<a href={pageHref(data.pagination.page - 1)} class="btn btn-secondary">Previous</a>
				{:else}
					<span class="btn btn-secondary disabled">Previous</span>
				{/if}

				<p class="pagination-status">
					Page {data.pagination.page} of {data.pagination.totalPages}
				</p>

				{#if data.pagination.page < data.pagination.totalPages}
					<a href={pageHref(data.pagination.page + 1)} class="btn btn-secondary">Next</a>
				{:else}
					<span class="btn btn-secondary disabled">Next</span>
				{/if}
			</nav>
		{/if}
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
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.span-2 {
		@media (min-width: $breakpoint-sm) {
			grid-column: span 2;
		}
	}

	.filter-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;

		@media (min-width: $breakpoint-sm) {
			grid-column: 1 / -1;
		}
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.results-summary {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.results {
		display: grid;
		gap: $space-4;
		margin: 0;
		padding: 0;
		list-style: none;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.player {
		display: flex;
		align-items: center;
		gap: $space-4;
	}

	.player-meta {
		min-width: 0;
		flex: 1;
	}

	.player-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: $font-weight-semibold;
	}

	.result-meta {
		margin: $space-1 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.platforms {
		margin: $space-2 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: $font-size-xs;
		color: color-mix(in srgb, $color-text-muted 80%, transparent);
	}

	.classical-rating {
		flex-shrink: 0;
		margin: 0;
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		font-variant-numeric: tabular-nums;
		color: $color-text;
	}

	.pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: $space-4;
	}

	.pagination-status {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
