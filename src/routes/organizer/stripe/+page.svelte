<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<div class="page-mid stack">
	<header>
		<h1 class="page-title">Stripe Connect</h1>
		<p class="page-lede">
			Connect your Stripe account to receive tournament entry fees directly.
		</p>
	</header>

	{#if !data.stripeConfigured}
		<p class="alert alert-warning">
			Stripe is not configured. Set <code>STRIPE_SECRET_KEY</code> in the environment.
		</p>
	{:else}
		<section class="panel stack-sm">
			<p class="body">
				{#if data.stripeAccount?.onboardingComplete}
					Your Stripe account is connected and ready for payouts.
				{:else if data.stripeAccount}
					Onboarding is incomplete. Continue setup or refresh status after finishing on Stripe.
				{:else}
					You have not connected a Stripe account yet.
				{/if}
			</p>

			{#if data.returned && !data.stripeAccount?.onboardingComplete}
				<form method="post" action="?/refresh" use:enhance>
					<button type="submit" class="btn btn-ghost">Refresh onboarding status</button>
				</form>
			{/if}

			<form method="post" action="?/connect" use:enhance>
				<button type="submit" class="btn btn-ink">
					{data.stripeAccount ? 'Continue Stripe setup' : 'Connect with Stripe'}
				</button>
			</form>
		</section>
	{/if}

	<a href={resolve('/organizer')} class="link">Back to dashboard</a>
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

	.body {
		margin: 0;
		font-size: $font-size-sm;
		line-height: $line-height-relaxed;
		color: color-mix(in srgb, $color-text 88%, transparent);
	}

	code {
		font-family: ui-monospace, monospace;
		font-size: 0.95em;
	}
</style>
