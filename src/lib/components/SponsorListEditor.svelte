<script>
	/**
	 * Optional sponsor list editor (name + optional URL).
	 * Submits repeated `sponsorName` / `sponsorUrl` fields.
	 */

	/**
	 * @typedef {{ id: number, name: string, url: string }} SponsorRow
	 */

	/** @type {{
	 *   initial?: Array<{ name?: string | null; url?: string | null }> | null;
	 *   open?: boolean;
	 *   invalid?: boolean;
	 * }} */
	let { initial = null, open = false, invalid = false } = $props();

	let nextId = 0;
	/** @type {SponsorRow[]} */
	let sponsors = $state(
		initial?.length
			? initial.map((s) => ({
					id: ++nextId,
					name: s.name ?? '',
					url: s.url ?? ''
				}))
			: []
	);
	let addSponsors = $state(Boolean(open) || sponsors.length > 0);

	function addRow() {
		sponsors.push({ id: ++nextId, name: '', url: '' });
	}

	/** @param {number} index */
	function removeRow(index) {
		sponsors.splice(index, 1);
		if (sponsors.length === 0) addSponsors = false;
	}

	$effect(() => {
		if (addSponsors && sponsors.length === 0) {
			addRow();
		}
	});
</script>

<section class="sponsors-optional stack-sm">
	<label class="check">
		<input
			type="checkbox"
			checked={addSponsors}
			onchange={(e) => {
				addSponsors = e.currentTarget.checked;
				if (!addSponsors) sponsors = [];
				else if (sponsors.length === 0) addRow();
			}}
		/>
		<span>Add sponsors (optional)</span>
	</label>

	{#if addSponsors}
		<div class="rows">
			<div class="heading">
				<h2 class="section-title">Sponsors</h2>
				<button type="button" class="btn btn-secondary" onclick={addRow}>Add sponsor</button>
			</div>
			{#each sponsors as sponsor, index (sponsor.id)}
				<div class="row" class:field-invalid={invalid}>
					<label class="field">
						Name
						<input
							type="text"
							name="sponsorName"
							maxlength="255"
							bind:value={sponsor.name}
							placeholder="Sponsor name"
						/>
					</label>
					<label class="field">
						Website (optional)
						<input
							type="url"
							name="sponsorUrl"
							maxlength="512"
							bind:value={sponsor.url}
							placeholder="https://"
						/>
					</label>
					<button
						type="button"
						class="btn btn-secondary remove"
						onclick={() => removeRow(index)}
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
		<p class="field-hint">Shown on the tournament page. Leave blank rows empty or remove them.</p>
	{/if}
</section>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.stack-sm {
		display: flex;
		flex-direction: column;
		gap: $space-4;
	}

	.sponsors-optional {
		padding-top: $space-2;
		border-top: $border-width solid color-mix(in srgb, $color-border 70%, transparent);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: $space-3;
	}

	.heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: $space-3;
	}

	.row {
		display: grid;
		gap: $space-3;
		align-items: end;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: 1fr 1fr auto;
		}
	}

	.remove {
		justify-self: start;
	}

	.check {
		display: flex;
		align-items: flex-start;
		gap: $space-2;
		font-size: $font-size-sm;
	}

	.field-hint {
		margin: 0;
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.field-invalid :is(input) {
		border-color: $color-danger;
	}
</style>
