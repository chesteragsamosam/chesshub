<script>
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Supporters · ChessHub</title>
	<meta
		name="description"
		content="People who chose to be named for supporting ChessHub."
	/>
</svelte:head>

<article class="page-mid supporters">
	<header class="header">
		<p class="eyebrow">Community</p>
		<h1 class="page-title">ChessHub supporters</h1>
		<p class="page-lede">
			With gratitude to everyone who helps keep ChessHub growing. Names appear only when a donor
			opts in.
		</p>
	</header>

	{#if data.supporters.length === 0}
		<p class="empty">No public supporters yet. Be the first to leave a coffee for the board.</p>
	{:else}
		<ul class="name-list">
			{#each data.supporters as supporter (supporter.id)}
				<li>{supporter.publicName}</li>
			{/each}
		</ul>
	{/if}

	<p class="cta">
		<a href={resolve('/donate')} class="btn btn-primary">Support ChessHub</a>
	</p>
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.supporters {
		display: flex;
		flex-direction: column;
		gap: $space-8;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.eyebrow {
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-primary;
	}

	.empty {
		margin: 0;
		font-size: $font-size-base;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}

	.name-list {
		display: flex;
		flex-direction: column;
		gap: $space-3;
		margin: 0;
		padding: 0;
		list-style: none;
		font-family: $font-display;
		font-size: $font-size-xl;
		line-height: $line-height-snug;
		color: $color-text;
	}

	.name-list li {
		padding-bottom: $space-3;
		border-bottom: $border-width solid color-mix(in srgb, $color-border 70%, transparent);
	}

	.name-list li:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.cta {
		margin: 0;
	}
</style>
