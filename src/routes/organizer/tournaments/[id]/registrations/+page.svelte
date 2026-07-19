<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import UserAvatar from '$lib/components/UserAvatar.svelte';

	let { data, form } = $props();

	const pending = $derived(data.registrations.filter((r) => r.status === 'pending'));
	const paid = $derived(data.registrations.filter((r) => r.status === 'paid'));
</script>

<div class="page stack">
	<header class="header">
		<div>
			<h1 class="page-title">Registrations</h1>
			<p class="page-lede">{data.tournament.title}</p>
		</div>
		<div class="header-links">
			<a href={resolve(`/organizer/tournaments/${data.tournament.id}/edit`)} class="link">Edit</a>
			<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">Public page</a>
		</div>
	</header>

	{#if form?.message}
		<p class="alert alert-error">{form.message}</p>
	{/if}
	{#if form?.success}
		<p class="alert alert-success">
			{#if form.approved}
				Player approved and marked as paid.
			{:else if form.rejected}
				Join request rejected.
			{:else}
				Updated.
			{/if}
		</p>
	{/if}

	{#if data.tournament.directPaymentToOrganizer}
		<p class="panel hint-panel">
			This event uses direct payment to you. Approve a player only after you confirm they paid the
			entry fee offline — approval marks them as paid and registered.
		</p>
	{/if}

	<section class="panel stack-sm">
		<h2 class="section-title">
			Pending approval
			{#if pending.length > 0}
				<span class="count">{pending.length}</span>
			{/if}
		</h2>
		{#if !data.tournament.directPaymentToOrganizer}
			<p class="empty">Direct payment approval is not enabled for this tournament.</p>
		{:else if pending.length === 0}
			<p class="empty">No pending join requests.</p>
		{:else}
			<ul class="reg-list">
				{#each pending as row (row.id)}
					<li>
						<div class="player">
							<UserAvatar name={row.name} image={row.image} size="sm" />
							<div>
								<p class="name">{row.name}</p>
								<p class="meta">
									{#if row.username}@{row.username} · {/if}
									{row.email}
									· Requested {new Date(row.createdAt).toLocaleString()}
								</p>
							</div>
						</div>
						<div class="actions">
							<form method="post" action="?/approve" use:enhance>
								<input type="hidden" name="registrationId" value={row.id} />
								<button type="submit" class="btn btn-primary">Approve as paid</button>
							</form>
							<form method="post" action="?/reject" use:enhance>
								<input type="hidden" name="registrationId" value={row.id} />
								<button type="submit" class="btn btn-secondary">Reject</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="panel stack-sm">
		<h2 class="section-title">
			Registered (paid)
			<span class="count">{paid.length}</span>
			{#if data.tournament.maxPlayers}
				<span class="cap">/ {data.tournament.maxPlayers}</span>
			{/if}
		</h2>
		{#if paid.length === 0}
			<p class="empty">No paid registrations yet.</p>
		{:else}
			<ul class="reg-list">
				{#each paid as row (row.id)}
					<li>
						<div class="player">
							<UserAvatar name={row.name} image={row.image} size="sm" />
							<div>
								<p class="name">{row.name}</p>
								<p class="meta">
									{#if row.username}@{row.username} · {/if}
									Paid {row.paidAt ? new Date(row.paidAt).toLocaleString() : '—'}
								</p>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
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

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
	}

	.header-links {
		display: flex;
		gap: $space-4;
	}

	.hint-panel {
		margin: 0;
		font-size: $font-size-sm;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}

	.section-title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: $space-2;
	}

	.count,
	.cap {
		font-size: $font-size-sm;
		font-weight: $font-weight-medium;
		color: $color-text-muted;
	}

	.empty {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.reg-list {
		display: flex;
		flex-direction: column;
		gap: $space-3;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.reg-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
		padding-bottom: $space-3;
		border-bottom: 1px solid color-mix(in srgb, $color-border 80%, transparent);

		&:last-child {
			padding-bottom: 0;
			border-bottom: none;
		}
	}

	.player {
		display: flex;
		align-items: center;
		gap: $space-3;
		min-width: 0;
	}

	.name {
		margin: 0;
		font-weight: $font-weight-semibold;
	}

	.meta {
		margin: $space-1 0 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
		word-break: break-word;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-2;
	}
</style>
