<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth-client';
	import { loadGoogleIdentity } from '$lib/client/social-sdks';

	/**
	 * @typedef {{
	 *   google: boolean,
	 *   googleClientId?: string | null
	 * }} SocialProviders
	 */

	/** @type {{
	 *   providers: SocialProviders,
	 *   errorMessage?: string | null,
	 *   errorPath?: string
	 * }} */
	let { providers, errorMessage = null, errorPath = '/login' } = $props();

	const anyEnabled = $derived(providers.google);

	/** @type {HTMLDivElement | undefined} */
	let rootEl = $state();
	/** @type {HTMLDivElement | undefined} */
	let googleMount = $state();

	let googleReady = $state(false);
	let googleFailed = $state(false);
	let localError = $state(/** @type {string | null} */ (null));
	let busy = $state(false);
	let buttonWidth = $state(320);

	const displayError = $derived(localError ?? errorMessage);

	/**
	 * @param {string | null | undefined} message
	 */
	function fail(message) {
		localError = message || 'Sign-in failed. Please try again.';
		busy = false;
	}

	/**
	 * @param {string} token
	 */
	async function signInWithGoogleToken(token) {
		busy = true;
		localError = null;

		const { error } = await authClient.signIn.social({
			provider: 'google',
			idToken: { token },
			callbackURL: '/',
			errorCallbackURL: `${errorPath}?error=oauth`
		});

		if (error) {
			fail(error.message || 'Sign-in failed. Please try again.');
			return;
		}

		await goto(resolve('/'), { invalidateAll: true });
	}

	$effect(() => {
		if (!rootEl) return;
		buttonWidth = Math.max(240, Math.floor(rootEl.clientWidth || 320));
	});

	$effect(() => {
		if (!providers.google || !providers.googleClientId || !googleMount) {
			if (providers.google && !providers.googleClientId) googleFailed = true;
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				const google = await loadGoogleIdentity();
				if (cancelled || !googleMount) return;

				google.accounts.id.initialize({
					client_id: providers.googleClientId,
					callback: async (response) => {
						const credential =
							response && typeof response === 'object' && 'credential' in response
								? /** @type {{ credential?: string }} */ (response).credential
								: null;
						if (!credential) {
							fail('Google sign-in was cancelled.');
							return;
						}
						await signInWithGoogleToken(credential);
					},
					auto_select: false,
					cancel_on_tap_outside: true,
					use_fedcm_for_prompt: false
				});

				google.accounts.id.renderButton(googleMount, {
					type: 'standard',
					theme: 'outline',
					size: 'large',
					text: 'continue_with',
					shape: 'rectangular',
					logo_alignment: 'left',
					width: buttonWidth
				});

				googleReady = true;
				googleFailed = false;
			} catch (error) {
				console.error('[auth] Google Identity failed', error);
				if (!cancelled) {
					googleFailed = true;
					googleReady = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

{#if anyEnabled}
	<div class="social" class:busy bind:this={rootEl}>
		{#if displayError}
			<p class="alert alert-error">{displayError}</p>
		{/if}

		<div class="buttons">
			<div class="provider">
				<div class="sdk-mount" class:ready={googleReady} aria-hidden={!googleReady}>
					{#key buttonWidth}
						<div class="google-host" bind:this={googleMount}></div>
					{/key}
				</div>
				{#if !googleReady}
					<form method="post" action="?/google" use:enhance>
						<button
							type="submit"
							class="btn-fallback btn-google btn-block"
							disabled={busy && !googleFailed}
						>
							<span class="mark mark-google" aria-hidden="true">
								<svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
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
	</div>
{/if}

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.social {
		display: flex;
		flex-direction: column;
		gap: $space-3;

		&.busy {
			pointer-events: none;
			opacity: 0.85;
		}
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.provider {
		position: relative;
		min-height: 44px;
	}

	.sdk-mount {
		width: 100%;
		min-height: 44px;

		&:not(.ready) {
			position: absolute;
			inset: 0;
			opacity: 0;
			pointer-events: none;
		}

		:global(iframe),
		:global(div[role='button']) {
			width: 100% !important;
		}
	}

	.google-host {
		width: 100%;
		min-height: 44px;
	}

	.btn-block {
		width: 100%;
	}

	.btn-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: $space-3;
		min-height: 44px;
		padding: $space-3 $space-4;
		font-family: $font-sans;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
		line-height: 1;
		border-radius: $radius-md;
		border: $border-width solid transparent;
		cursor: pointer;

		&:disabled {
			opacity: 0.7;
			cursor: wait;
		}
	}

	.mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.mark-google {
		width: 20px;
		height: 20px;
		border-radius: 2px;
		background: #fff;
	}

	.btn-google {
		color: #1f1f1f;
		background: #fff;
		border-color: #747775;

		&:hover:not(:disabled) {
			background: #f8f8f8;
		}
	}
</style>
