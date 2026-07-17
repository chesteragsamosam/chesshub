<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import UserAvatar from '$lib/components/UserAvatar.svelte';

	let { data, form } = $props();

	let submitting = $state(false);
	let checkoutUrl = $state('');

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
		return new Date(d).toLocaleString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	const isPaid = $derived(data.tournament.entryFeeCents > 0);

	// While a paid registration is pending, poll so the webhook-confirmed
	// status appears without a manual refresh.
	$effect(() => {
		if (!isPaid) return;
		if (data.registration?.status !== 'pending') return;

		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') {
				invalidateAll();
			}
		}, 5000);

		return () => clearInterval(timer);
	});

	function submitRegister() {
		submitting = true;
		checkoutUrl = '';
		// Open the tab synchronously (in the click handler) so the browser
		// does not block the popup. We set its URL once the server responds.
		const checkoutTab = isPaid ? window.open('', '_blank') : null;

		return async (
			/** @type {{ result: any, update: () => Promise<void> }} */ { result, update }
		) => {
			submitting = false;

			if (result.type === 'success' && result.data?.checkoutUrl) {
				checkoutUrl = result.data.checkoutUrl;
				if (checkoutTab && !checkoutTab.closed) {
					checkoutTab.location.href = result.data.checkoutUrl;
				} else {
					window.open(result.data.checkoutUrl, '_blank');
				}
				// Refresh registration status (webhook confirms payment separately).
				await invalidateAll();
				return;
			}

			checkoutTab?.close();
			await update();
		};
	}
</script>

<article class="page stack">
	<header>
		<p class="status">{data.tournament.status}</p>
		<h1 class="page-title">{data.tournament.title}</h1>
		{#if data.organizer}
			<p class="page-lede">
				Organized by
				<a href={resolve(`/profile/${data.organizer.slug}`)} class="link">{data.organizer.name}</a>
			</p>
		{/if}
	</header>

	{#if data.checkoutResult === 'success'}
		{#if data.registration?.status === 'paid'}
			<p class="alert alert-success">Payment confirmed. You are registered for this tournament.</p>
		{:else}
			<p class="alert alert-warning">
				Payment is being confirmed by PayMongo. This page will update automatically once the payment
				webhook is received.
			</p>
		{/if}
	{:else if data.checkoutResult === 'cancelled'}
		<p class="alert alert-warning">Checkout cancelled.</p>
	{/if}

	{#if form?.message}
		<p class="alert alert-error">{form.message}</p>
	{/if}
	{#if form?.free}
		<p class="alert alert-success">You are registered.</p>
	{/if}

	<div class="layout">
		<div class="main-col">
			<section class="panel">
				<h2 class="section-title">Details</h2>
				<dl class="details">
					<div>
						<dt>Starts</dt>
						<dd>{formatDate(data.tournament.startDate)}</dd>
					</div>
					{#if data.tournament.endDate}
						<div>
							<dt>Ends</dt>
							<dd>{formatDate(data.tournament.endDate)}</dd>
						</div>
					{/if}
					<div>
						<dt>Venue</dt>
						<dd>
							{[
								data.tournament.venue,
								data.tournament.city,
								data.tournament.state,
								data.tournament.country
							]
								.filter(Boolean)
								.join(', ') || 'TBA'}
						</dd>
					</div>
					<div>
						<dt>Entry fee</dt>
						<dd>{formatFee(data.tournament.entryFeeCents, data.tournament.currency)}</dd>
					</div>
					<div>
						<dt>Registered</dt>
						<dd>
							{data.paidCount}{#if data.tournament.maxPlayers}
								/ {data.tournament.maxPlayers}{/if}
						</dd>
					</div>
				</dl>
			</section>

			{#if data.tournament.description}
				<section class="panel">
					<h2 class="section-title">About</h2>
					<p class="about">{data.tournament.description}</p>
				</section>
			{/if}

			<section class="panel">
				<h2 class="section-title">Registered players</h2>
				{#if data.registeredPlayers.length === 0}
					<p class="empty-players">No players registered yet.</p>
				{:else}
					<ul class="player-list">
						{#each data.registeredPlayers as player (player.id)}
							<li>
								<a href={resolve(`/profile/${player.slug}`)} class="player-link">
									<UserAvatar name={player.name} image={player.image} size="sm" />
									<span class="player-meta">
										<span class="player-name">{player.name}</span>
										{#if player.username}
											<span class="player-username">@{player.username}</span>
										{/if}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		<aside class="panel register">
			<h2 class="section-title">Registration</h2>
			<p class="fee">{formatFee(data.tournament.entryFeeCents, data.tournament.currency)}</p>

			{#if data.registration?.status === 'paid'}
				<p class="alert alert-success">You are registered for this tournament.</p>
			{:else if data.spotsLeft === 0}
				<p class="full">This tournament is full.</p>
			{:else if !data.user}
				<a href={resolve('/login')} class="btn btn-primary btn-block">Sign in to register</a>
			{:else}
				<form method="post" action="?/register" use:enhance={submitRegister}>
					<button type="submit" class="btn btn-primary btn-block" disabled={submitting}>
						{#if isPaid}
							{#if submitting}
								Starting checkout…
							{:else if data.registration?.status === 'pending'}
								Continue GCash payment
							{:else}
								Pay with GCash
							{/if}
						{:else}
							Register for free
						{/if}
					</button>
				</form>
				{#if isPaid && (checkoutUrl || data.registration?.status === 'pending')}
					<p class="hint">
						Complete your payment in the new tab.
						{#if checkoutUrl}
							Didn’t see it?
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a href={checkoutUrl} target="_blank" rel="noopener" class="link">Open checkout</a>.
						{/if}
						This page updates automatically once PayMongo confirms your payment.
					</p>
				{/if}
				{#if isPaid && !data.paymongoConfigured}
					<p class="hint">PayMongo is not configured on this server yet.</p>
				{/if}
			{/if}
		</aside>
	</div>
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.status {
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-text-muted;
	}

	.layout {
		display: grid;
		gap: $space-6;

		@media (min-width: $breakpoint-lg) {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	.main-col {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: $space-3;
		margin: $space-4 0 0;

		div {
			display: flex;
			justify-content: space-between;
			gap: $space-4;
			font-size: $font-size-sm;
		}

		dt {
			color: $color-text-muted;
		}

		dd {
			margin: 0;
			text-align: right;
		}
	}

	.about {
		margin: $space-3 0 0;
		white-space: pre-wrap;
		line-height: $line-height-relaxed;
		color: color-mix(in srgb, $color-text 88%, transparent);
	}

	.empty-players {
		margin: $space-3 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.player-list {
		margin: $space-3 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: $space-2;
	}

	.player-link {
		display: flex;
		align-items: center;
		gap: $space-3;
		padding: $space-2 $space-3;
		border-radius: $radius-md;
		text-decoration: none;
		color: inherit;

		&:hover {
			background: color-mix(in srgb, $color-border 35%, transparent);
		}
	}

	.player-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.player-name {
		font-weight: $font-weight-medium;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-username {
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.register {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.fee {
		margin: 0;
		font-family: $font-display;
		font-size: $font-size-3xl;
		font-weight: $font-weight-bold;
		letter-spacing: $letter-spacing-tight;
	}

	.full {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-danger;
	}

	.hint {
		margin: 0;
		font-size: $font-size-xs;
		color: $color-warning;
	}
</style>
