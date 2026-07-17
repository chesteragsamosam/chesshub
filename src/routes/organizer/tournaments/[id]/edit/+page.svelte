<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
</script>

<div class="page-mid stack">
	<header class="header">
		<div>
			<h1 class="page-title">Edit tournament</h1>
			<p class="page-lede">{data.tournament.title}</p>
		</div>
		<a href={resolve(`/tournaments/${data.tournament.id}`)} class="link">View public page</a>
	</header>

	<form method="post" action="?/save" use:enhance class="panel stack-sm">
		<label class="field">
			Title
			<input type="text" name="title" required value={data.tournament.title} />
		</label>
		<label class="field">
			Description
			<textarea name="description" rows="4">{data.tournament.description ?? ''}</textarea>
		</label>
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
				<input
					type="number"
					name="maxPlayers"
					min="1"
					value={data.tournament.maxPlayers ?? ''}
				/>
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
