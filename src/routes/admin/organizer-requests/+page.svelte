<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="page stack">
	<header>
		<h1 class="page-title">Organizer requests</h1>
		<p class="page-lede">Approve or reject users who want to post tournaments.</p>
	</header>

	{#if form?.success}
		<p class="alert alert-success">Request updated.</p>
	{/if}

	{#if data.requests.length === 0}
		<p class="panel-dashed">No pending requests.</p>
	{:else}
		<ul class="requests">
			{#each data.requests as row (row.request.id)}
				<li class="panel request">
					<div>
						<p class="name">{row.user.name}</p>
						<p class="meta">{row.user.email}</p>
						{#if row.request.message}
							<p class="message">{row.request.message}</p>
						{/if}
						<p class="time">Requested {new Date(row.request.createdAt).toLocaleString()}</p>
					</div>
					<div class="actions">
						<form method="post" action="?/approve" use:enhance>
							<input type="hidden" name="requestId" value={row.request.id} />
							<button type="submit" class="btn btn-primary">Approve</button>
						</form>
						<form method="post" action="?/reject" use:enhance>
							<input type="hidden" name="requestId" value={row.request.id} />
							<button type="submit" class="btn btn-secondary">Reject</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack {
		display: flex;
		flex-direction: column;
		gap: $space-6;
	}

	.requests {
		display: flex;
		flex-direction: column;
		gap: $space-4;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.request {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: $space-4;
	}

	.name {
		margin: 0;
		font-weight: $font-weight-semibold;
	}

	.meta {
		margin: $space-1 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.message {
		margin: $space-3 0 0;
		font-size: $font-size-sm;
		line-height: $line-height-relaxed;
	}

	.time {
		margin: $space-2 0 0;
		font-size: $font-size-xs;
		color: color-mix(in srgb, $color-text-muted 75%, transparent);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
	}
</style>
