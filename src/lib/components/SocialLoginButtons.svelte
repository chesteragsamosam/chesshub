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
		{#if errorMessage}
			<p class="alert alert-error">{errorMessage}</p>
		{/if}

		<div class="buttons">
			{#if providers.facebook}
				<form method="post" action="?/facebook" use:enhance>
					<button type="submit" class="btn-social btn-meta btn-block">
						<span class="mark" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
								<path
									fill="currentColor"
									d="M14.5 8.5V6.8c0-.7.5-1.3 1.2-1.3h1.8V3h-2.5C12.7 3 11 4.7 11 6.8v1.7H9v2.7h2V21h3.5v-9.8h2.3l.5-2.7h-2.8z"
								/>
							</svg>
						</span>
						<span>Continue with Meta</span>
					</button>
				</form>
			{/if}
			{#if providers.google}
				<form method="post" action="?/google" use:enhance>
					<button type="submit" class="btn-social btn-google btn-block">
						<span class="mark" aria-hidden="true">
							<svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
						</span>
						<span>Continue with Google</span>
					</button>
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

	.buttons {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.btn-block {
		width: 100%;
	}

	.btn-social {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: $space-3;
		min-height: $size-touch-min;
		padding: $space-3 $space-4;
		font-family: $font-sans;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
		line-height: 1;
		border-radius: $radius-md;
		border: $border-width solid transparent;
		cursor: pointer;
		transition:
			background-color $duration-fast $ease-out,
			border-color $duration-fast $ease-out,
			color $duration-fast $ease-out,
			transform $duration-fast $ease-out;

		&:active {
			transform: translateY(calc(var(--spacing) * 0.25));
		}
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-meta {
		color: #fff;
		background: #1877f2;

		&:hover {
			background: #166fe5;
		}
	}

	.btn-google {
		color: $color-text;
		background: $color-surface;
		border-color: $color-border;

		&:hover {
			background: color-mix(in srgb, $color-surface 92%, $color-text 4%);
			border-color: color-mix(in srgb, $color-text 18%, $color-border);
		}
	}
</style>
