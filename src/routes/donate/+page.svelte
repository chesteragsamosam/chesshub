<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let amountChoice = $state(form?.amountChoice ?? '100');
	let listPublic = $state(Boolean(form?.listPublic));
	let submitting = $state(false);

	const showThanks =
		data.outcome === 'paid' || data.outcome === 'confirming';
	const showCancelled = data.outcome === 'cancelled';
	const showFailed = data.outcome === 'failed' || data.outcome === 'expired';
</script>

<svelte:head>
	<title>Support ChessHub</title>
	<meta
		name="description"
		content="Donate to ChessHub — help keep local tournaments, linked profiles, and GCash entry running for the community."
	/>
</svelte:head>

<article class="page-mid donate">
	{#if showThanks}
		<header class="header">
			<p class="eyebrow">Thank you</p>
			<h1 class="page-title">Your gift means a lot</h1>
			<p class="page-lede">
				{#if data.outcome === 'confirming'}
					We’re confirming your payment. This usually only takes a moment.
				{:else}
					Thank you for supporting ChessHub. Players and organizers like you keep this space
					alive.
				{/if}
			</p>
			{#if data.donation?.listPublic}
				<p class="page-lede">
					Once your payment clears, your name will appear on the
					<a href={resolve('/supporters')} class="link">supporters page</a>.
				</p>
			{/if}
			<p class="thanks-actions">
				<a href={resolve('/supporters')} class="btn btn-secondary">See supporters</a>
				<a href={resolve('/tournaments')} class="btn btn-primary">Find tournaments</a>
			</p>
		</header>
	{:else}
		<header class="header">
			<p class="eyebrow">Support ChessHub</p>
			<h1 class="page-title">Help keep ChessHub open for every local board</h1>
		</header>

		<section class="story stack-sm">
			<p>
				ChessHub is built so players can find nearby events, link Lichess, Chess.com, and FIDE, and
				enter with GCash — without ads or paywalls on the basics.
			</p>
			<p>
				It costs real time and money to host the site, pay payment fees, and keep tournaments and
				prize payouts running. Donations are how the community shows this project is worth keeping
				alive.
			</p>
			<p>
				ChessHub is a labor of love — hosting, payment fees, and ongoing work are real costs for the
				developer. Your gift doesn’t buy a feature; it says this community space is worth nurturing
				so it can keep growing with the players who use it.
			</p>
			<p class="closing">
				If ChessHub helped you find a game or run an event, consider leaving a coffee for the board.
			</p>
		</section>

		{#if showCancelled}
			<p class="alert alert-warning">Donation cancelled. You’re welcome back anytime.</p>
		{/if}
		{#if showFailed}
			<p class="alert alert-error">
				{#if data.outcome === 'expired'}
					That checkout expired. Choose an amount below to try again.
				{:else}
					Payment didn’t go through. You can try again below.
				{/if}
			</p>
		{/if}

		{#if !data.paymongoConfigured}
			<p class="alert alert-warning">
				Donations aren’t available right now. Please check back soon.
			</p>
		{:else}
			<form
				method="post"
				class="donate-form stack-sm"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<fieldset class="amounts">
					<legend>Choose an amount (PHP)</legend>
					<div class="amount-grid">
						{#each data.presets as preset (preset)}
							<label class="amount-option">
								<input
									type="radio"
									name="amountChoice"
									value={String(preset)}
									checked={amountChoice === String(preset)}
									onchange={() => (amountChoice = String(preset))}
								/>
								<span>₱{preset}</span>
							</label>
						{/each}
						<label class="amount-option">
							<input
								type="radio"
								name="amountChoice"
								value="custom"
								checked={amountChoice === 'custom'}
								onchange={() => (amountChoice = 'custom')}
							/>
							<span>Custom</span>
						</label>
					</div>
					{#if amountChoice === 'custom'}
						<label class="field">
							Custom amount (₱20–₱50,000)
							<input
								type="number"
								name="customAmount"
								min="20"
								max="50000"
								step="1"
								inputmode="decimal"
								placeholder="100"
								value={form?.customAmount ?? ''}
								required={amountChoice === 'custom'}
							/>
						</label>
					{/if}
				</fieldset>

				<label class="field">
					Optional note <span class="muted">(private)</span>
					<textarea
						name="note"
						rows="3"
						maxlength="500"
						placeholder="A short message for the ChessHub developer…"
					>{form?.note ?? ''}</textarea>
				</label>

				<label class="check">
					<input type="checkbox" name="listPublic" checked={listPublic} onchange={(e) => (listPublic = e.currentTarget.checked)} />
					<span>Add my name to the ChessHub supporters page</span>
				</label>

				{#if listPublic}
					<label class="field">
						Name to display
						<input
							type="text"
							name="publicName"
							maxlength="80"
							required
							placeholder="How you’d like to be listed"
							value={form?.publicName ?? data.user?.name ?? ''}
						/>
					</label>
				{/if}

				{#if form?.message}
					<p class="alert alert-error">{form.message}</p>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={submitting}>
					{submitting ? 'Opening checkout…' : 'Donate with GCash or QR Ph'}
				</button>
				<p class="fineprint">
					You’ll complete payment on PayMongo. See our
					<a href={resolve('/supporters')} class="link">supporters</a>
					and
					<a href={resolve('/privacy')} class="link">privacy policy</a>.
				</p>
			</form>
		{/if}
	{/if}
</article>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.donate {
		display: flex;
		flex-direction: column;
		gap: $space-8;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.eyebrow {
		margin: 0;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
		color: $color-primary;
	}

	.story {
		font-size: $font-size-base;
		line-height: $line-height-relaxed;
		color: $color-text;
	}

	.story p {
		margin: 0;
	}

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.closing {
		font-family: $font-display;
		font-size: $font-size-lg;
		line-height: $line-height-snug;
		color: $color-text;
	}

	.donate-form {
		max-width: 28rem;
	}

	.amounts {
		margin: 0;
		padding: 0;
		border: none;
	}

	.amounts legend {
		margin-bottom: $space-3;
		font-weight: $font-weight-semibold;
	}

	.amount-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: $space-2;
	}

	@media (min-width: $breakpoint-sm) {
		.amount-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.amount-option {
		display: flex;
		cursor: pointer;
	}

	.amount-option input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.amount-option span {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: $space-2 $space-3;
		border: $border-width solid $color-border;
		border-radius: $radius-md;
		background: $color-surface;
		font-weight: $font-weight-semibold;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.amount-option input:checked + span {
		border-color: $color-primary;
		background: color-mix(in srgb, $color-primary 12%, $color-surface);
	}

	.amount-option input:focus-visible + span {
		outline: 2px solid $color-primary;
		outline-offset: 2px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: $space-2;
		font-size: $font-size-sm;
		font-weight: $font-weight-medium;
	}

	.check {
		display: flex;
		align-items: flex-start;
		gap: $space-2;
		font-size: $font-size-sm;
		line-height: $line-height-snug;
	}

	.check input {
		margin-top: 0.2rem;
	}

	.muted {
		font-weight: $font-weight-normal;
		color: $color-text-muted;
	}

	.fineprint {
		margin: 0;
		font-size: $font-size-xs;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}

	.thanks-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
		margin: $space-2 0 0;
	}
</style>
