<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import SocialLoginButtons from '$lib/components/SocialLoginButtons.svelte';

	let { data, form } = $props();

	const emailFormError = $derived(form?.email !== undefined ? (form.message ?? null) : null);
	const socialError = $derived(
		data.oauthError
			? 'Social sign-in failed. Please try again.'
			: form?.email === undefined
				? (form?.message ?? null)
				: null
	);
	const hasSocial = $derived(data.socialProviders.google || data.socialProviders.facebook);
</script>

<div class="page-narrow stack">
	<header>
		<h1 class="page-title">Sign in</h1>
		<p class="page-lede">Welcome back to ChessHub.</p>
	</header>

	<SocialLoginButtons providers={data.socialProviders} errorMessage={socialError} />

	{#if hasSocial}
		<p class="divider"><span>or sign in with email</span></p>
	{/if}

	<form method="post" use:enhance class="form">
		<label class="field">
			Email
			<input type="email" name="email" value={form?.email ?? ''} required />
		</label>
		<label class="field">
			Password
			<input type="password" name="password" required />
		</label>
		{#if emailFormError}
			<p class="alert alert-error">{emailFormError}</p>
		{/if}
		<button type="submit" class="btn btn-secondary btn-block">Sign in</button>
	</form>

	<p class="footer">
		No account?
		<a href={resolve('/register')} class="link">Register</a>
	</p>
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.form {
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

	.footer {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}
</style>
