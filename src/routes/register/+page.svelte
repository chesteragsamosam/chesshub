<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import SocialLoginButtons from '$lib/components/SocialLoginButtons.svelte';

	let { data, form } = $props();

	const emailFormError = $derived(form?.email !== undefined ? (form.message ?? null) : null);
	const socialError = $derived(
		data.oauthError
			? 'Sign-in failed. Please try again.'
			: form?.email === undefined
				? (form?.message ?? null)
				: null
	);
	const hasSocial = $derived(data.socialProviders.google);

	let showPassword = $state(false);
</script>

<AuthShell title="Create account" lede="Join to connect your chess accounts and find tournaments near you.">
	<div class="auth-body">
		<SocialLoginButtons
			providers={data.socialProviders}
			errorMessage={socialError}
			errorPath="/register"
		/>

		{#if hasSocial}
			<div class="divider" role="separator">
				<span>or</span>
			</div>
		{/if}

		<form method="post" action="?/email" use:enhance class="form">
			<label class="field">
				Email
				<input
					type="email"
					name="email"
					value={form?.email ?? ''}
					required
					autocomplete="email"
					placeholder="you@example.com"
				/>
			</label>
			<div class="field">
				<div class="field-row">
					<label for="register-password">Password</label>
					<button
						type="button"
						class="toggle-visibility"
						aria-controls="register-password"
						onclick={() => (showPassword = !showPassword)}
					>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
				<input
					id="register-password"
					type={showPassword ? 'text' : 'password'}
					name="password"
					required
					minlength="8"
					autocomplete="new-password"
					placeholder="At least 8 characters"
				/>
			</div>
			<p class="hint">At least 8 characters.</p>
			{#if emailFormError}
				<p class="alert alert-error">{emailFormError}</p>
			{/if}
			<button type="submit" class="btn btn-primary btn-block">Create account</button>
		</form>
	</div>

	{#snippet footer()}
		<p>
			Already have an account?
			<a href={resolve('/login')} class="link">Sign in</a>
		</p>
		<p class="legal">
			By creating an account you agree to our
			<a href={resolve('/privacy')} class="link">Privacy Policy</a>.
		</p>
	{/snippet}
</AuthShell>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.auth-body {
		display: flex;
		flex-direction: column;
		gap: $space-5;
	}

	.legal {
		font-size: $font-size-xs;
		color: $color-text-muted;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: $space-3;
		color: $color-text-muted;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;

		&::before,
		&::after {
			content: '';
			flex: 1;
			height: $border-width;
			background: $color-border;
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $space-2;
	}

	.toggle-visibility {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		color: $color-primary;
		cursor: pointer;

		&:hover {
			text-decoration: underline;
		}
	}

	.hint {
		margin: calc(var(--spacing) * -2) 0 0;
		font-size: $font-size-xs;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}
</style>
