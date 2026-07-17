<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
</script>

<div class="page-mid stack">
	<header>
		<h1 class="page-title">New tournament</h1>
		<p class="page-lede">Save as draft or publish when ready.</p>
	</header>

	<form method="post" use:enhance class="panel stack-sm">
		<label class="field">
			Title
			<input type="text" name="title" required />
		</label>
		<label class="field">
			Description
			<textarea name="description" rows="4"></textarea>
		</label>
		<div class="grid-2">
			<label class="field">
				Venue
				<input type="text" name="venue" />
			</label>
			<label class="field">
				City
				<input type="text" name="city" />
			</label>
			<label class="field">
				State / region
				<input type="text" name="state" />
			</label>
			<label class="field">
				Country (ISO)
				<input type="text" name="country" maxlength="2" placeholder="US" class="uppercase" />
			</label>
			<label class="field">
				Start
				<input type="datetime-local" name="startDate" required />
			</label>
			<label class="field">
				End
				<input type="datetime-local" name="endDate" />
			</label>
			<label class="field">
				Entry fee
				<input type="number" name="entryFee" min="0" step="0.01" value="0" />
			</label>
			<label class="field">
				Currency
				<input type="text" name="currency" value="usd" maxlength="3" class="lowercase" />
			</label>
			<label class="field span-2">
				Max players (optional)
				<input type="number" name="maxPlayers" min="1" />
			</label>
		</div>

		<label class="check">
			<input type="checkbox" name="publish" />
			<span>
				Publish immediately
				{#if !data.stripeAccount?.onboardingComplete}
					<span class="hint">(paid events require Stripe Connect)</span>
				{/if}
			</span>
		</label>

		{#if form?.message}
			<p class="alert alert-error">{form.message}</p>
		{/if}

		<div class="actions">
			<button type="submit" class="btn btn-primary">Create tournament</button>
			<a href={resolve('/organizer')} class="btn btn-secondary">Cancel</a>
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

	.grid-2 {
		display: grid;
		gap: $space-4;

		@media (min-width: $breakpoint-sm) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.span-2 {
		@media (min-width: $breakpoint-sm) {
			grid-column: span 2;
		}
	}

	:global(input.uppercase) {
		text-transform: uppercase;
	}

	:global(input.lowercase) {
		text-transform: lowercase;
	}

	.check {
		display: flex;
		align-items: flex-start;
		gap: $space-2;
		font-size: $font-size-sm;
	}

	.hint {
		color: $color-text-muted;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
	}
</style>
