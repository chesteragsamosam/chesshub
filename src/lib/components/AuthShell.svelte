<script>
	/**
	 * @typedef {{
	 *   title: string,
	 *   lede: string,
	 *   children: import('svelte').Snippet,
	 *   footer: import('svelte').Snippet
	 * }} Props
	 */

	/** @type {Props} */
	let { title, lede, children, footer } = $props();
</script>

<section class="auth">
	<div class="auth-board" aria-hidden="true"></div>
	<div class="auth-glow" aria-hidden="true"></div>

	<div class="auth-stage">
		<div class="auth-brand">
			<p class="brand-mark">ChessHub</p>
			<h1 class="auth-title">{title}</h1>
			<p class="auth-lede">{lede}</p>
		</div>

		<div class="auth-panel">
			{@render children()}
		</div>

		<div class="auth-footer">
			{@render footer()}
		</div>
	</div>
</section>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.auth {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100dvh - #{$size-header});
		overflow: hidden;
		padding: $space-8 $space-4 $space-16;
	}

	.auth-board {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(45deg, $color-board-light 25%, transparent 25%),
			linear-gradient(-45deg, $color-board-light 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, $color-board-light 75%),
			linear-gradient(-45deg, transparent 75%, $color-board-light 75%);
		background-size: calc(var(--spacing) * 16) calc(var(--spacing) * 16);
		background-position:
			0 0,
			0 calc(var(--spacing) * 8),
			calc(var(--spacing) * 8) calc(var(--spacing) * -8),
			calc(var(--spacing) * -8) 0;
		opacity: 0.07;
		animation: board-drift 22s $ease-out infinite alternate;
		mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%);
		pointer-events: none;
	}

	.auth-glow {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				ellipse 55% 40% at 70% 10%,
				color-mix(in srgb, $color-accent-glow 18%, transparent),
				transparent 60%
			),
			radial-gradient(
				ellipse 45% 35% at 15% 90%,
				color-mix(in srgb, $color-primary 10%, transparent),
				transparent 55%
			);
		pointer-events: none;
	}

	.auth-stage {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: calc(var(--spacing) * 104);
		display: flex;
		flex-direction: column;
		gap: $space-6;
		animation: rise-in $duration-base $ease-out both;
	}

	.auth-brand {
		text-align: center;
		animation: rise-in calc(#{$duration-base} * 1.2) $ease-out both;
	}

	.brand-mark {
		margin: 0;
		font-family: $font-display;
		font-size: $font-size-3xl;
		font-weight: $font-weight-extrabold;
		line-height: $line-height-tight;
		letter-spacing: $letter-spacing-tight;
		background: linear-gradient(120deg, $color-text 0%, $color-primary 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.auth-title {
		margin: $space-3 0 0;
		font-family: $font-display;
		font-size: $font-size-2xl;
		font-weight: $font-weight-bold;
		line-height: $line-height-tight;
		letter-spacing: $letter-spacing-tight;
		color: $color-text;
	}

	.auth-lede {
		margin: $space-2 0 0;
		font-size: $font-size-sm;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}

	.auth-panel {
		background: color-mix(in srgb, $color-surface 88%, $color-primary 4%);
		border: $border-width solid color-mix(in srgb, $color-border 80%, $color-primary 12%);
		border-radius: $radius-xl;
		padding: $space-6;
		box-shadow:
			0 calc(var(--spacing) * 1) calc(var(--spacing) * 2) color-mix(in srgb, $color-ink 6%, transparent),
			0 0 calc(var(--spacing) * 8) color-mix(in srgb, $color-accent-glow 8%, transparent);
		animation: rise-in calc(#{$duration-base} * 1.4) $ease-out both;
		animation-delay: 40ms;

		@media (min-width: $breakpoint-sm) {
			padding: $space-8;
		}
	}

	.auth-footer {
		display: flex;
		flex-direction: column;
		gap: $space-3;
		text-align: center;
		font-size: $font-size-sm;
		color: $color-text-muted;
		animation: rise-in calc(#{$duration-base} * 1.5) $ease-out both;
		animation-delay: 80ms;

		:global(p) {
			margin: 0;
		}
	}

	@keyframes board-drift {
		from {
			transform: translate3d(0, 0, 0) scale(1);
		}
		to {
			transform: translate3d(1.5%, -1.5%, 0) scale(1.03);
		}
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY($space-3);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
