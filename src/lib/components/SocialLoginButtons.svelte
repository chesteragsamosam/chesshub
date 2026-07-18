<script>
	import { enhance } from '$app/forms';

	/**
	 * @typedef {{ google: boolean, facebook: boolean }} SocialProviders
	 */

	/** @type {{ providers: SocialProviders, errorMessage?: string | null }} */
	let { providers, errorMessage = null } = $props();

	const anyEnabled = $derived(providers.google || providers.facebook);
</script>

{#if anyEnabled}
	<div class="social">
		<p class="divider"><span>or continue with</span></p>

		{#if errorMessage}
			<p class="alert alert-error">{errorMessage}</p>
		{/if}

		<div class="buttons">
			{#if providers.google}
				<form method="post" action="?/google" use:enhance>
					<button type="submit" class="btn btn-secondary btn-block">Continue with Google</button>
				</form>
			{/if}
			{#if providers.facebook}
				<form method="post" action="?/facebook" use:enhance>
					<button type="submit" class="btn btn-secondary btn-block">Continue with Meta</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.social {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: $space-3;
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;

		&::before,
		&::after {
			content: '';
			flex: 1;
			height: 1px;
			background: $color-border;
		}

		span {
			flex-shrink: 0;
		}
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}
</style>
