<script>
	import { resolve } from '$app/paths';

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
		<a href={resolve('/organizer/tournaments/new')} class="btn btn-primary">New tournament</a>
	</header>

	{#if !data.paymongoConfigured}
		<section class="panel">
			<h2 class="section-title">Payments</h2>
			<p class="page-lede">
				PayMongo is not configured on this server. Paid tournaments cannot be published until
				<code>PAYMONGO_SECRET_KEY</code> is set.
			</p>
		</section>
	{/if}

	{#if data.tournaments.length === 0}
		<p class="panel-dashed">
			No tournaments yet.
			<a href={resolve('/organizer/tournaments/new')} class="link">Create one</a>
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
							<span class="capitalize">{tournament.status}</span>
							· {formatFee(tournament.entryFeeCents, tournament.currency)}
							· {new Date(tournament.startDate).toLocaleDateString()}
						</p>
					</div>
					<a href={resolve(`/organizer/tournaments/${tournament.id}/edit`)} class="link">Edit</a>
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

	.capitalize {
		text-transform: capitalize;
	}
</style>
