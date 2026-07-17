<script>
	import { resolve } from '$app/paths';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { profileSlug } from '$lib/username';

	let { data } = $props();

	const title = $derived(data.listType === 'followers' ? 'Followers' : 'Following');
	const emptyMessage = $derived(
		data.listType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'
	);

	/** @param {number} pageNum */
	function pageHref(pageNum) {
		const params = new URLSearchParams();
		if (pageNum > 1) params.set('page', String(pageNum));
		const qs = params.toString();
		const base = resolve(`/profile/${data.profileUser.slug}/${data.listType}`);
		return qs ? `${base}?${qs}` : base;
	}
</script>

<div class="page stack">
	<header>
		<p class="back-link">
			<a href={resolve(`/profile/${data.profileUser.slug}`)} class="link">
				← {data.profileUser.name}
			</a>
		</p>
		<h1 class="page-title">{title}</h1>
		<p class="page-lede">
			{data.pagination.total}
			{data.listType === 'followers' ? 'followers' : 'following'}
		</p>
	</header>

	{#if data.users.length === 0}
		<p class="panel-dashed">{emptyMessage}</p>
	{:else}
		<ul class="results">
			{#each data.users as person (person.id)}
				<li>
					<a href={resolve(`/profile/${profileSlug(person)}`)} class="list-link player">
						<UserAvatar name={person.name} image={person.image} size="md" />
						<div class="player-meta">
							<p class="player-name">{person.name}</p>
							{#if person.username}
								<p class="result-meta">@{person.username}</p>
							{/if}
							{#if person.city || person.country}
								<p class="result-meta">
									{[person.city, person.country].filter(Boolean).join(', ')}
								</p>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>

		{#if data.pagination.totalPages > 1}
			<nav class="pagination" aria-label="{title} pagination">
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

	.back-link {
		margin: 0 0 $space-2;
		font-size: $font-size-sm;
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
