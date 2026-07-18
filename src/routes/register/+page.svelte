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
		<h1 class="page-title">Create account</h1>
		<p class="page-lede">Join ChessHub to link profiles and find tournaments.</p>
	</header>

	<SocialLoginButtons
		providers={data.socialProviders}
		errorMessage={socialError}
		errorPath="/register"
	/>

	<details class="email-accordion" open={!hasSocial || Boolean(emailFormError)}>
		<summary>Sign up with email</summary>
		<form method="post" use:enhance class="form">
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
			<button type="submit" class="btn btn-secondary btn-block">Create account</button>
		</form>
	</details>

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

	.email-accordion {
		border-top: $border-width solid $color-border;
		padding-top: $space-4;

		summary {
			cursor: pointer;
			list-style: none;
			font-size: $font-size-sm;
			font-weight: $font-weight-semibold;
			color: $color-text-muted;
			user-select: none;

			&::-webkit-details-marker {
				display: none;
			}

			&::after {
				content: '';
				display: inline-block;
				margin-left: $space-2;
				border: solid currentColor;
				border-width: 0 1.5px 1.5px 0;
				padding: 2.5px;
				transform: rotate(45deg);
				vertical-align: 0.15em;
				transition: transform $duration-fast $ease-out;
			}
		}

		&[open] summary {
			margin-bottom: $space-4;
			color: $color-text;

			&::after {
				transform: rotate(-135deg);
				vertical-align: -0.05em;
			}
		}
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
