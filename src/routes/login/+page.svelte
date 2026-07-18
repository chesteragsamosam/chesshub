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

<AuthShell title="Sign in" lede="Welcome back — pick up where you left off.">
	<div class="auth-body">
		<SocialLoginButtons
			providers={data.socialProviders}
			errorMessage={socialError}
			errorPath="/login"
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
					<label for="login-password">Password</label>
					<button
						type="button"
						class="toggle-visibility"
						aria-controls="login-password"
						onclick={() => (showPassword = !showPassword)}
					>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
				<input
					id="login-password"
					type={showPassword ? 'text' : 'password'}
					name="password"
					required
					autocomplete="current-password"
					placeholder="Your password"
				/>
			</div>
			{#if emailFormError}
				<p class="alert alert-error">{emailFormError}</p>
			{/if}
			<button type="submit" class="btn btn-primary btn-block">Sign in</button>
		</form>
	</div>

	{#snippet footer()}
		<p>
			No account?
			<a href={resolve('/register')} class="link">Create one</a>
		</p>
		<p class="legal">
			<a href={resolve('/privacy')} class="link">Privacy Policy</a>
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
</style>
