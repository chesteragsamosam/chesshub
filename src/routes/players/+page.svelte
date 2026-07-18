<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import {
		LEADERBOARD_PLATFORMS,
		LEADERBOARD_RATING_KEYS,
		PLATFORM_LABELS,
		RATING_LABELS
	} from '$lib/chess-ratings';
	import { countryFlag } from '$lib/country-flag';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { profileSlug } from '$lib/username';

	let { data } = $props();

	const isTop = $derived(data.view === 'top');

	const hasFilters = $derived(
		data.filters.q.length >= 2 || Boolean(data.filters.city) || Boolean(data.filters.country)
	);

	const ratingKeys = $derived(
		LEADERBOARD_RATING_KEYS[
			/** @type {keyof typeof LEADERBOARD_RATING_KEYS} */ (data.leaderboard.platform)
		]
	);

	/**
	 * @param {{ country?: string | null, federation?: string | null }} player
	 */
	function playerFlag(player) {
		if (isTop && data.leaderboard.platform === 'fide') {
			return countryFlag(player.federation) ?? countryFlag(player.country);
		}
		return countryFlag(player.country) ?? countryFlag(player.federation);
	}

	/**
	 * @param {Record<string, string>} extra
	 * @param {number} [pageNum]
	 */
	function hrefFor(extra, pageNum = 1) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(extra)) {
			if (value) params.set(key, value);
		}
		if (pageNum > 1) params.set('page', String(pageNum));
		const qs = params.toString();
		return qs ? `${resolve('/players')}?${qs}` : resolve('/players');
	}

	/** @param {number} pageNum */
	function pageHref(pageNum) {
		if (isTop) {
			return hrefFor(
				{
					view: 'top',
					platform: data.leaderboard.platform,
					rating: data.leaderboard.ratingKey
				},
				pageNum
			);
		}
		return hrefFor(
			{
				q: data.filters.q,
				city: data.filters.city,
				country: data.filters.country
			},
			pageNum
		);
	}

	/** @param {string} platform */
	function platformHref(platform) {
		const keys =
			LEADERBOARD_RATING_KEYS[/** @type {keyof typeof LEADERBOARD_RATING_KEYS} */ (platform)];
		const rating = keys.includes(data.leaderboard.ratingKey)
			? data.leaderboard.ratingKey
			: keys[0];
		return hrefFor({ view: 'top', platform, rating });
	}

	/** @param {string} ratingKey */
	function ratingHref(ratingKey) {
		return hrefFor({
			view: 'top',
			platform: data.leaderboard.platform,
			rating: ratingKey
		});
	}

	const pageStart = $derived(
		data.pagination.total === 0 ? 0 : (data.pagination.page - 1) * data.pagination.pageSize + 1
	);
	const pageEnd = $derived(
		Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)
	);

	const emptyMessage = $derived(
		isTop
			? `No players with a ${PLATFORM_LABELS[data.leaderboard.platform] ?? data.leaderboard.platform} ${RATING_LABELS[data.leaderboard.ratingKey] ?? data.leaderboard.ratingKey} rating yet.`
			: hasFilters
				? 'No players found. Try a different name or chess username.'
				: 'No registered players yet.'
	);
</script>

<div class="page stack">
	<header>
		<h1 class="page-title">{isTop ? 'Top rated' : 'Find players'}</h1>
		<p class="page-lede">
			{#if isTop}
				Players ranked by linked chess ratings.
			{:else}
				Find players by name, city, or chess account.
			{/if}
		</p>

		<nav class="mode-tabs" aria-label="Players view">
			<a
				href={resolve('/players')}
				class="mode-tab"
				class:active={!isTop}
				aria-current={!isTop ? 'page' : undefined}
			>
				Find players
			</a>
			<a
				href={hrefFor({
					view: 'top',
					platform: data.leaderboard.platform,
					rating: data.leaderboard.ratingKey
				})}
				class="mode-tab"
				class:active={isTop}
				aria-current={isTop ? 'page' : undefined}
			>
				Top rated
			</a>
		</nav>
	</header>

	{#if isTop}
		<nav class="platform-tabs" aria-label="Rating platform">
			{#each LEADERBOARD_PLATFORMS as platform (platform)}
				<a
					href={platformHref(platform)}
					class="platform-tab"
					class:active={data.leaderboard.platform === platform}
					aria-current={data.leaderboard.platform === platform ? 'page' : undefined}
				>
					{PLATFORM_LABELS[platform]}
				</a>
			{/each}
		</nav>

		<nav class="rating-tabs" aria-label="Time control">
			{#each ratingKeys as key (key)}
				<a
					href={ratingHref(key)}
					class="rating-tab"
					class:active={data.leaderboard.ratingKey === key}
					aria-current={data.leaderboard.ratingKey === key ? 'page' : undefined}
				>
					{RATING_LABELS[key] ?? key}
				</a>
			{/each}
		</nav>
	{:else}
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
				Country code
				<input
					type="text"
					name="country"
					maxlength="2"
					placeholder="PH"
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
	{/if}

	{#if data.players.length === 0}
		<p class="panel-dashed">{emptyMessage}</p>
	{:else}
		<div class="results-header">
			<p class="results-summary">
				{#if isTop}
					{PLATFORM_LABELS[data.leaderboard.platform]}
					{RATING_LABELS[data.leaderboard.ratingKey] ?? data.leaderboard.ratingKey}
					· {pageStart}–{pageEnd} of {data.pagination.total}
				{:else}
					Showing {pageStart}–{pageEnd} of {data.pagination.total} players
				{/if}
			</p>
		</div>

		<ul class="player-list">
			{#each data.players as player, index (player.id)}
				{@const flag = playerFlag(player)}
				{@const rank = (data.pagination.page - 1) * data.pagination.pageSize + index + 1}
				<li>
					<a href={resolve(`/profile/${profileSlug(player)}`)} class="player-row">
						{#if isTop}
							<span class="rank" aria-hidden="true">{rank}</span>
						{/if}
						<UserAvatar name={player.name} image={player.image} size="md" />
						<span class="player-name">
							{player.name}
							{#if flag}
								<span class="flag" title={player.federation ?? player.country ?? undefined}
									>{flag}</span
								>
							{/if}
						</span>
						{#if player.listRating != null}
							<span class="rating">{player.listRating}</span>
						{:else}
							<span class="rating muted">—</span>
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

	.mode-tabs,
	.platform-tabs,
	.rating-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
		margin: $space-4 0 0;
	}

	.mode-tab,
	.platform-tab,
	.rating-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: $size-touch-min;
		padding: $space-2 $space-4;
		border: $border-width solid $color-border;
		border-radius: $radius-md;
		background: $color-surface;
		color: $color-text-muted;
		font-size: $font-size-sm;
		font-weight: $font-weight-medium;
		text-decoration: none;
		transition:
			border-color $duration-fast $ease-out,
			background-color $duration-fast $ease-out,
			color $duration-fast $ease-out;

		&:hover {
			border-color: color-mix(in srgb, $color-primary 40%, $color-border);
			color: $color-text;
		}

		&.active {
			border-color: $color-primary;
			background: $color-primary-soft;
			color: $color-primary;
		}
	}

	.platform-tabs {
		margin-top: 0;
	}

	.rating-tabs {
		margin-top: 0;
		gap: $space-1;
	}

	.rating-tab {
		min-height: calc(var(--spacing) * 9);
		padding: $space-1 $space-3;
		font-size: $font-size-xs;
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

	.player-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: $color-surface;
		overflow: hidden;
	}

	.player-list li + li {
		border-top: $border-width solid $color-border;
	}

	.player-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: $space-3;
		min-height: calc(var(--spacing) * 16);
		padding: $space-3 $space-4;
		text-decoration: none;
		color: inherit;
		transition: background-color $duration-fast $ease-out;

		&:hover {
			background: color-mix(in srgb, $color-primary 6%, $color-surface);
		}
	}

	.player-list:has(.rank) .player-row {
		grid-template-columns: calc(var(--spacing) * 8) auto minmax(0, 1fr) auto;
	}

	.rank {
		width: calc(var(--spacing) * 8);
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
		font-variant-numeric: tabular-nums;
		color: $color-text-muted;
		text-align: center;
	}

	.player-name {
		display: flex;
		align-items: center;
		gap: $space-2;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: $font-weight-semibold;
	}

	.flag {
		flex-shrink: 0;
		font-size: $font-size-base;
		line-height: 1;
	}

	.rating {
		flex-shrink: 0;
		min-width: calc(var(--spacing) * 12);
		font-size: $font-size-lg;
		font-weight: $font-weight-semibold;
		font-variant-numeric: tabular-nums;
		text-align: right;
		color: $color-text;

		&.muted {
			color: $color-text-muted;
			font-weight: $font-weight-medium;
		}
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
