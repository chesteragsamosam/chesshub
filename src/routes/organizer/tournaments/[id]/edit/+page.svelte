<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	const canEditModality = $derived(data.tournament.status === 'draft');

	/** @type {'lichess' | 'otb'} */
	let modality = $state(
		/** @type {'lichess' | 'otb'} */ (
			form?.modality === 'otb' || form?.modality === 'lichess'
				? form.modality
				: data.tournament.modality
		)
	);
</script>

<div class="page-mid stack">
	<header class="header">
		<div>
			<h1 class="page-title">Edit tournament</h1>
			<p class="page-lede">{data.tournament.title}</p>
		</div>
		<div class="header-links">
			<a href={resolve(`/organizer/tournaments/${data.tournament.id}/prizes`)} class="link">
				Manage prizes
			</a>
			<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">View public page</a>
		</div>
	</header>

	{#if data.justCreated}
		<p class="alert alert-success">
			Tournament created successfully.
			{#if data.tournament.modality === 'lichess' && data.tournament.lichessTournamentId}
				The Lichess Arena description includes your ChessHub join link.
			{/if}
			{#if data.tournament.status === 'draft'}
				Set status to Published below so players can register.
			{:else}
				<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">Open public page</a>
			{/if}
		</p>
	{/if}
	{#if form?.success}
		<p class="alert alert-success">Changes saved.</p>
	{/if}
	{#if form?.message}
		<p class="alert alert-error">{form.message}</p>
	{/if}

	<form method="post" action="?/save" use:enhance class="panel stack-sm">
		{#if canEditModality}
			<fieldset class="modality">
				<legend>Event type</legend>
				<div class="modality-options" role="radiogroup" aria-label="Event type">
					<label class="modality-card" class:active={modality === 'lichess'}>
						<input
							type="radio"
							name="modality"
							value="lichess"
							checked={modality === 'lichess'}
							onchange={() => (modality = 'lichess')}
						/>
						<span class="modality-title">Lichess</span>
						<span class="modality-desc">Online Arena or Swiss on Lichess.</span>
					</label>
					<label class="modality-card" class:active={modality === 'otb'}>
						<input
							type="radio"
							name="modality"
							value="otb"
							checked={modality === 'otb'}
							onchange={() => (modality = 'otb')}
						/>
						<span class="modality-title">OTB local</span>
						<span class="modality-desc">In-person club or venue event.</span>
					</label>
				</div>
			</fieldset>
		{:else}
			<input type="hidden" name="modality" value={data.tournament.modality} />
			<p class="modality-locked">
				Event type:
				<strong>{data.tournament.modality === 'otb' ? 'OTB local' : 'Lichess'}</strong>
				<span class="hint">(locked after publish)</span>
			</p>
		{/if}

		{#if data.tournament.modality === 'lichess' && data.tournament.lichessTournamentId}
			<p class="lichess-link">
				Lichess {data.tournament.lichessTournamentFormat === 'swiss' ? 'Swiss' : 'Arena'}:
				<a
					href={data.tournament.lichessTournamentFormat === 'swiss'
						? `https://lichess.org/swiss/${data.tournament.lichessTournamentId}`
						: `https://lichess.org/tournament/${data.tournament.lichessTournamentId}`}
					class="link"
					target="_blank"
					rel="noopener noreferrer"
				>
					{data.tournament.lichessTournamentId}
				</a>
			</p>
		{/if}

		<label class="field">
			Title
			<input type="text" name="title" required value={data.tournament.title} />
		</label>
		<label class="field">
			Description
			<textarea name="description" rows="4">{data.tournament.description ?? ''}</textarea>
		</label>

		{#if modality === 'otb'}
			<div class="grid-2">
				<label class="field">
					Venue
					<input type="text" name="venue" value={data.tournament.venue ?? ''} />
				</label>
				<label class="field">
					City
					<input type="text" name="city" value={data.tournament.city ?? ''} />
				</label>
				<label class="field">
					State / region
					<input type="text" name="state" value={data.tournament.state ?? ''} />
				</label>
				<label class="field">
					Country (ISO)
					<input
						type="text"
						name="country"
						maxlength="2"
						value={data.tournament.country ?? ''}
						class="uppercase"
					/>
				</label>
			</div>
		{/if}

		<div class="grid-2">
			<label class="field">
				Start
				<input
					type="datetime-local"
					name="startDate"
					required
					value={data.tournament.startDateLocal}
				/>
			</label>
			<label class="field">
				End
				<input type="datetime-local" name="endDate" value={data.tournament.endDateLocal} />
			</label>
			<label class="field">
				Entry fee
				<input
					type="number"
					name="entryFee"
					min="0"
					step="0.01"
					value={(data.tournament.entryFeeCents / 100).toFixed(2)}
				/>
			</label>
			<label class="field">
				Currency
				<input
					type="text"
					name="currency"
					maxlength="3"
					value={data.tournament.currency}
					class="lowercase"
				/>
			</label>
			<label class="field">
				Max players
				<input type="number" name="maxPlayers" min="1" value={data.tournament.maxPlayers ?? ''} />
			</label>
			<label class="field">
				Status
				<select name="status">
					<option value="draft" selected={data.tournament.status === 'draft'}>Draft</option>
					<option value="published" selected={data.tournament.status === 'published'}>
						Published
					</option>
					<option value="cancelled" selected={data.tournament.status === 'cancelled'}>
						Cancelled
					</option>
					<option value="completed" selected={data.tournament.status === 'completed'}>
						Completed
					</option>
				</select>
			</label>
		</div>

		{#if form?.message}
			<p class="alert alert-error">{form.message}</p>
		{/if}
		{#if form?.success}
			<p class="alert alert-success">Tournament saved.</p>
		{/if}

		<div class="actions">
			<button type="submit" class="btn btn-primary">Save changes</button>
			<a href={resolve('/organizer')} class="btn btn-secondary">Back</a>
		</div>
	</form>
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

	.modality {
		margin: 0;
		padding: 0;
		border: none;
		display: flex;
		flex-direction: column;
		gap: $space-3;

		legend {
			padding: 0;
			font-size: $font-size-sm;
			font-weight: $font-weight-medium;
		}
	}

	.modality-options {
		display: grid;
		gap: $space-3;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.modality-card {
		display: flex;
		flex-direction: column;
		gap: $space-1;
		padding: $space-4;
		border: $border-width solid $color-border;
		border-radius: $radius-lg;
		background: color-mix(in srgb, $color-surface 92%, $color-bg);
		cursor: pointer;

		&.active {
			border-color: $color-primary;
			background: $color-primary-soft;
		}

		input {
			position: absolute;
			opacity: 0;
			pointer-events: none;
		}
	}

	.modality-title {
		font-weight: $font-weight-semibold;
	}

	.modality-desc {
		font-size: $font-size-sm;
		color: $color-text-muted;
	}

	.modality-locked {
		margin: 0;
		font-size: $font-size-sm;
	}

	.lichess-link {
		margin: 0;
		font-size: $font-size-sm;
	}

	.hint {
		color: $color-text-muted;
	}

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}

	:global(input.lowercase) {
		text-transform: lowercase;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}
</style>
