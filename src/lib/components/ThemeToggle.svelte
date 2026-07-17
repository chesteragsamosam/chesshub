<script>
	import { theme, setThemePreference } from '$lib/theme.svelte.js';

	/** @type {{ compact?: boolean }} */
	let { compact = false } = $props();

	/** @type {const} */
	const options = [
		{ value: 'light', label: 'Light', icon: 'sun' },
		{ value: 'dark', label: 'Dark', icon: 'moon' },
		{ value: 'system', label: 'System', icon: 'system' }
	];
</script>

<div class="theme-toggle" class:compact role="group" aria-label="Color theme">
	{#each options as option (option.value)}
		<button
			type="button"
			class="theme-option"
			class:active={theme.preference === option.value}
			aria-pressed={theme.preference === option.value}
			title={option.label}
			onclick={() => setThemePreference(/** @type {'light' | 'dark' | 'system'} */ (option.value))}
		>
			<span class="theme-icon" aria-hidden="true">
				{#if option.icon === 'sun'}
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="10" cy="10" r="3.25" />
						<path stroke-linecap="round" d="M10 2.5v1.75M10 15.75V17.5M17.5 10h-1.75M4.25 10H2.5M15.07 4.93l-1.24 1.24M6.17 13.83l-1.24 1.24M15.07 15.07l-1.24-1.24M6.17 6.17 4.93 4.93" />
					</svg>
				{:else if option.icon === 'moon'}
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15.8 12.2a6.25 6.25 0 0 1-8-8 5.75 5.75 0 1 0 8 8Z"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="3" y="4.5" width="14" height="10" rx="1.5" />
						<path stroke-linecap="round" d="M7 15.5h6" />
					</svg>
				{/if}
			</span>
			{#if !compact}
				<span class="theme-label">{option.label}</span>
			{/if}
		</button>
	{/each}
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		padding: calc(var(--spacing) * 0.5);
		border: $border-width solid color-mix(in srgb, $color-border 85%, transparent);
		border-radius: $radius-md;
		background: color-mix(in srgb, $color-surface 88%, $color-bg);
		gap: calc(var(--spacing) * 0.5);
	}

	.theme-option {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: $space-1;
		min-height: calc(var(--spacing) * 8);
		padding: $space-1 $space-2;
		border: none;
		border-radius: calc($radius-md - calc(var(--spacing) * 0.5));
		background: transparent;
		color: $color-text-muted;
		font: inherit;
		font-size: $font-size-xs;
		font-weight: $font-weight-medium;
		cursor: pointer;
		transition:
			color $duration-fast $ease-out,
			background-color $duration-fast $ease-out;

		&:hover {
			color: $color-text;
			background: color-mix(in srgb, $color-primary-soft 55%, transparent);
		}

		&.active {
			color: $color-primary;
			background: $color-primary-soft;
		}
	}

	.compact .theme-option {
		width: calc(var(--spacing) * 8);
		padding-inline: 0;
	}

	.theme-icon {
		display: inline-flex;
		width: calc(var(--spacing) * 4);
		height: calc(var(--spacing) * 4);

		svg {
			width: 100%;
			height: 100%;
		}
	}

	.theme-label {
		white-space: nowrap;
	}
</style>
