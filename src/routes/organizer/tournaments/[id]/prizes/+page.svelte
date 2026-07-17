<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';

	let { data, form } = $props();
	let nextTierId = 0;
	let tiers = $state(
		untrack(() =>
			data.prizes.length
				? data.prizes.map((prize) => ({
						id: ++nextTierId,
						placement: prize.placement,
						label: prize.label,
						amount: (prize.amountCents / 100).toFixed(2)
					}))
				: [{ id: ++nextTierId, placement: 1, label: 'Champion', amount: '1000.00' }]
		)
	);

	const finalized = $derived(Boolean(data.tournament.resultsFinalizedAt));

	function addTier() {
		const nextPlacement = Math.max(0, ...tiers.map((tier) => Number(tier.placement) || 0)) + 1;
		tiers.push({
			id: ++nextTierId,
			placement: nextPlacement,
			label: `${nextPlacement} place`,
			amount: '500.00'
		});
	}

	/** @param {number} index */
	function removeTier(index) {
		tiers.splice(index, 1);
	}

	/** @param {number} cents */
	function formatMoney(cents) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'PHP'
		}).format(cents / 100);
	}
</script>

<div class="page-mid stack">
	<header class="header">
		<div>
			<p class="eyebrow">Tournament prizes</p>
			<h1 class="page-title">{data.tournament.title}</h1>
		</div>
		<div class="header-actions">
			<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">Public page</a>
			<a href={resolve(`/organizer/tournaments/${data.tournament.id}/edit`)} class="link">
				Edit tournament
			</a>
		</div>
	</header>

	{#if data.justCreated}
		<p class="alert alert-success">
			Tournament created successfully. Set up prizes below
			{#if data.tournament.status === 'draft'}
				, then publish the tournament so players can register
			{:else}
				, or
				<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">view the public page</a>
			{/if}.
		</p>
	{/if}
	{#if form?.message}
		<p class="alert alert-error">{form.message}</p>
	{/if}
	{#if form?.saved}
		<p class="alert alert-success">Prize setup saved. Import the final standings when ready.</p>
	{/if}
	{#if form?.finalized}
		<p class="alert alert-success">Winners finalized. Eligible winners can now claim.</p>
	{/if}

	{#if finalized}
		<section class="panel stack-sm">
			<div>
				<p class="eyebrow">Final results</p>
				<h2 class="section-title">Awards and claims</h2>
			</div>
			{#if data.awards.length === 0}
				<p class="muted">No finalized awards were found.</p>
			{:else}
				<ul class="award-list">
					{#each data.awards as award (award.id)}
						<li>
							<div>
								<strong>#{award.placement} · {award.prizeLabel}</strong>
								<p>{award.name} · Lichess: {award.lichessUsername}</p>
							</div>
							<div class="award-status">
								<strong>{formatMoney(award.amountCents)}</strong>
								<span>{award.claimStatus}</span>
								{#if award.destinationMasked}
									<small>{award.destinationMasked}</small>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{:else}
		<form method="post" action="?/save" use:enhance class="panel stack">
			<div>
				<p class="eyebrow">Step 1</p>
				<h2 class="section-title">Configure prizes and Lichess source</h2>
			</div>

			<div class="grid-2">
				<label class="field">
					Lichess format
					<select name="lichessFormat">
						<option
							value="arena"
							selected={(data.tournament.lichessTournamentFormat ?? 'arena') === 'arena'}
						>
							Arena
						</option>
						<option value="swiss" selected={data.tournament.lichessTournamentFormat === 'swiss'}>
							Swiss
						</option>
					</select>
				</label>
				<label class="field">
					Lichess tournament ID or URL
					<input
						name="lichessTournament"
						required
						placeholder="https://lichess.org/tournament/..."
						value={data.tournament.lichessTournamentId ?? ''}
					/>
				</label>
			</div>

			{#if data.tournament.lichessTournamentId && data.tournament.lichessTournamentFormat === 'arena'}
				<p class="muted">
					Linked Arena:
					<a
						href={`https://lichess.org/tournament/${data.tournament.lichessTournamentId}`}
						class="link"
						target="_blank"
						rel="noopener noreferrer"
					>
						lichess.org/tournament/{data.tournament.lichessTournamentId}
					</a>
					· Created or saved from ChessHub. Change the ID above only if you need a different source.
				</p>
			{:else if data.tournament.lichessTournamentId && data.tournament.lichessTournamentFormat === 'swiss'}
				<p class="muted">
					Linked Swiss:
					<a
						href={`https://lichess.org/swiss/${data.tournament.lichessTournamentId}`}
						class="link"
						target="_blank"
						rel="noopener noreferrer"
					>
						lichess.org/swiss/{data.tournament.lichessTournamentId}
					</a>
				</p>
			{/if}

			<div class="tiers">
				<div class="tier-heading">
					<h3>Prize tiers</h3>
					<button type="button" class="btn btn-secondary" onclick={addTier}>Add tier</button>
				</div>
				{#each tiers as tier, index (tier.id)}
					<div class="tier-row">
						<label class="field compact">
							Place
							<input type="number" name="placement" min="1" required bind:value={tier.placement} />
						</label>
						<label class="field">
							Label
							<input name="label" maxlength="255" required bind:value={tier.label} />
						</label>
						<label class="field">
							Amount (PHP)
							<input
								type="number"
								name="amount"
								min="1"
								max="50000"
								step="0.01"
								required
								bind:value={tier.amount}
							/>
						</label>
						<button
							type="button"
							class="btn btn-secondary remove"
							disabled={tiers.length === 1}
							onclick={() => removeTier(index)}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>

			<div class="actions">
				<button type="submit" class="btn btn-primary">Save setup</button>
			</div>
		</form>

		<section class="panel stack-sm">
			<div>
				<p class="eyebrow">Step 2</p>
				<h2 class="section-title">Import final standings</h2>
				<p class="muted">
					Only paid registrants with a verified linked Lichess username can receive an award.
				</p>
			</div>
			<form method="post" action="?/preview" use:enhance>
				<button type="submit" class="btn btn-secondary">Preview winner matching</button>
			</form>

			{#if form?.preview}
				<ul class="preview-list">
					{#each form.preview as row (row.prizeId)}
						<li>
							<div>
								<strong>#{row.placement} · {row.prizeLabel}</strong>
								<p>
									{row.lichessUsername ?? 'No Lichess result'} · {formatMoney(row.amountCents)}
								</p>
							</div>
							<span class:matched={row.matched}>
								{row.matched ? row.playerName : 'Not matched'}
							</span>
						</li>
					{/each}
				</ul>

				<form
					method="post"
					action="?/finalize"
					use:enhance
					onsubmit={(event) => {
						if (!confirm('Finalize these winners? Prize tiers and results will be locked.')) {
							event.preventDefault();
						}
					}}
				>
					<button type="submit" class="btn btn-primary" disabled={!form.canFinalize}>
						Finalize winners
					</button>
				</form>
			{/if}
		</section>
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

	.header,
	.tier-heading,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
	}

	.header-actions {
		display: flex;
		gap: $space-4;
	}

	.eyebrow {
		margin: 0 0 $space-1;
		color: $color-text-muted;
		font-size: $font-size-xs;
		font-weight: $font-weight-semibold;
		letter-spacing: $letter-spacing-wide;
		text-transform: uppercase;
	}

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.tiers {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.tier-heading h3 {
		margin: 0;
	}

	.tier-row {
		display: grid;
		align-items: end;
		gap: $space-3;
		padding: $space-3;
		border: 1px solid $color-border;
		border-radius: $radius-md;

		@media (min-width: $breakpoint-md) {
			grid-template-columns: 6rem minmax(0, 1fr) minmax(0, 1fr) auto;
		}
	}

	.remove {
		margin-bottom: 1px;
	}

	.muted,
	.award-list p,
	.preview-list p {
		margin: 0;
		color: $color-text-muted;
		font-size: $font-size-sm;
	}

	.award-list,
	.preview-list {
		display: flex;
		flex-direction: column;
		gap: $space-2;
		margin: 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: $space-4;
			padding: $space-3;
			border: 1px solid $color-border;
			border-radius: $radius-md;
		}
	}

	.award-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-transform: capitalize;
	}

	.preview-list span {
		color: $color-danger;
		font-size: $font-size-sm;
		font-weight: $font-weight-semibold;

		&.matched {
			color: $color-success;
		}
	}
</style>
