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
</script>

<div class="page-narrow stack">
	<header>
		<h1 class="page-title">Create account</h1>
		<p class="page-lede">Join ChessHub to link profiles and find tournaments.</p>
	</header>

	<form method="post" use:enhance class="panel form">
		<label class="field">
			Name
			<input type="text" name="name" value={form?.name ?? ''} required />
		</label>
		<label class="field">
			Email
			<input type="email" name="email" value={form?.email ?? ''} required />
		</label>
		<label class="field">
			Password
			<input type="password" name="password" required minlength="8" />
		</label>
		{#if emailFormError}
			<p class="alert alert-error">{emailFormError}</p>
		{/if}
		<button type="submit" class="btn btn-primary btn-block">Register</button>
	</form>

	<SocialLoginButtons providers={data.socialProviders} errorMessage={socialError} />

	<p class="footer">
		Already have an account?
		<a href={resolve('/login')} class="link">Sign in</a>
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

	.footer {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}
</style>
