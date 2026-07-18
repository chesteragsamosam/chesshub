<script>
	import { resolve } from '$app/paths';

	let { data } = $props();

	const statusLabel = $derived(
		data.request?.status === 'completed'
			? 'Completed'
			: data.request?.status === 'not_found'
				? 'Nothing found to delete'
				: data.request?.status === 'failed'
					? 'Failed'
					: data.request?.status === 'received'
						? 'In progress'
						: null
	);
</script>

<svelte:head>
	<title>Data deletion status · ChessHub</title>
</svelte:head>

<article class="page-mid status-page">
	<header class="header">
		<p class="eyebrow">Legal</p>
		<h1 class="page-title">Deletion request status</h1>
		<p class="page-lede">
			Check a Facebook data deletion request with the confirmation code Facebook gave you.
		</p>
	</header>

	{#if !data.code}
		<section class="panel stack-sm">
			<p>Enter the confirmation code from your Facebook deletion receipt.</p>
			<form method="get" class="lookup">
				<label class="field">
					Confirmation code
					<input
						type="text"
						name="code"
						required
						autocomplete="off"
						placeholder="e.g. a1b2c3…"
					/>
				</label>
				<button type="submit" class="btn btn-primary">Check status</button>
			</form>
		</section>
	{:else if !data.request}
		<section class="panel stack-sm">
			<p class="alert alert-error">No deletion request was found for that confirmation code.</p>
			<a href={resolve('/data-deletion/status')} class="link">Try another code</a>
		</section>
	{:else}
		<section class="panel stack-sm">
			<dl class="meta">
				<div>
					<dt>Confirmation code</dt>
					<dd><code>{data.request.confirmationCode}</code></dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd>
						<span class="badge" data-status={data.request.status}>{statusLabel}</span>
					</dd>
				</div>
				<div>
					<dt>Received</dt>
					<dd>{new Date(data.request.createdAt).toLocaleString()}</dd>
				</div>
				{#if data.request.completedAt}
					<div>
						<dt>Completed</dt>
						<dd>{new Date(data.request.completedAt).toLocaleString()}</dd>
					</div>
				{/if}
			</dl>
			{#if data.request.details}
				<p>{data.request.details}</p>
			{/if}
			<p class="muted">
				<a href={resolve('/data-deletion')} class="link">Data deletion instructions</a>
				·
				<a href={resolve('/privacy')} class="link">Privacy Policy</a>
			</p>
		</section>
	{/if}
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.status-page {
		display: flex;
		flex-direction: column;
		gap: $space-6;
		padding-block: $space-6 $space-12;
	}

	.header {
		.eyebrow {
			margin: 0 0 $space-2;
			color: $color-primary;
			font-size: $font-size-xs;
			font-weight: $font-weight-bold;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
		}

		.page-lede {
			max-width: 42rem;
		}
	}

	.lookup {
		display: flex;
		flex-direction: column;
		gap: $space-4;
		max-width: 24rem;
	}

	.meta {
		display: grid;
		gap: $space-4;
		margin: 0;

		dt {
			margin: 0;
			color: $color-text-muted;
			font-size: $font-size-xs;
			font-weight: $font-weight-semibold;
			letter-spacing: $letter-spacing-wide;
			text-transform: uppercase;
		}

		dd {
			margin: $space-1 0 0;
		}

		code {
			font-size: $font-size-sm;
			word-break: break-all;
		}
	}

	.badge {
		display: inline-block;
		padding: $space-1 $space-2;
		border-radius: $radius-sm;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;
		background: $color-primary-soft;
		color: $color-primary;

		&[data-status='failed'] {
			background: color-mix(in srgb, $color-danger 18%, transparent);
			color: $color-danger;
		}

		&[data-status='completed'],
		&[data-status='not_found'] {
			background: color-mix(in srgb, $color-success 18%, transparent);
			color: $color-success;
		}
	}

	.muted {
		color: $color-text-muted;
		font-size: $font-size-sm;
	}
</style>
