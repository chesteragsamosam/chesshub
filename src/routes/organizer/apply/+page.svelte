<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="page-mid stack">
	<header>
		<h1 class="page-title">Become an organizer</h1>
		<p class="page-lede">
			Request permission to post tournaments. An admin will review your application.
		</p>
	</header>

	{#if data.pending || form?.success}
		<p class="alert alert-warning">Your organizer request is pending review.</p>
	{:else}
		<form method="post" use:enhance class="panel stack-sm">
			<label class="field">
				Why do you want to organize tournaments?
				<textarea
					name="message"
					rows="4"
					placeholder="Club affiliation, past events, location…"
				></textarea>
			</label>
			{#if form?.message}
				<p class="alert alert-error">{form.message}</p>
			{/if}
			<button type="submit" class="btn btn-primary">Submit request</button>
		</form>
	{/if}
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
</style>
