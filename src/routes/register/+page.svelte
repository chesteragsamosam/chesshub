<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form } = $props();
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
		{#if form?.message}
			<p class="alert alert-error">{form.message}</p>
		{/if}
		<button type="submit" class="btn btn-primary btn-block">Register</button>
	</form>

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
