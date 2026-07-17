<script>
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<section class="hero">
	<div class="hero-board" aria-hidden="true"></div>
	<div class="hero-content">
		<p class="brand-mark">ChessHub</p>
		<h1 class="hero-title">Local play, linked profiles, one place to enter.</h1>
		<p class="hero-copy">
			Connect Lichess, Chess.com, and FIDE — then find and join tournaments near you.
		</p>
		<div class="hero-actions">
			<a href={resolve('/tournaments')} class="btn btn-primary">Find tournaments</a>
			{#if !data.user}
				<a href={resolve('/register')} class="btn btn-secondary hero-secondary">Create account</a>
			{:else}
				<a href={resolve('/settings/profile')} class="btn btn-secondary hero-secondary">
					Link profiles
				</a>
			{/if}
		</div>
	</div>
</section>

<section class="page features">
	<div class="feature">
		<h2 class="section-title">Chess profiles</h2>
		<p>
			Connect Lichess, Chess.com, and FIDE so organizers and opponents can find you.
		</p>
	</div>
	<div class="feature">
		<h2 class="section-title">Local tournaments</h2>
		<p>Search by city, country, and date to find events near you.</p>
	</div>
	<div class="feature">
		<h2 class="section-title">Paid registration</h2>
		<p>Register and pay entry fees securely through Stripe.</p>
	</div>
</section>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.hero {
		position: relative;
		display: grid;
		align-items: end;
		min-height: min(88dvh, var(--container-3xl));
		overflow: hidden;
		color: $color-text;
		background:
			radial-gradient(ellipse 70% 55% at 85% 15%, color-mix(in srgb, $color-accent-glow 22%, transparent), transparent 55%),
			radial-gradient(ellipse 50% 40% at 10% 80%, color-mix(in srgb, $color-primary 10%, transparent), transparent 50%),
			linear-gradient(165deg, $color-ink 0%, $color-hero 52%, $color-hero-mist 100%);
	}

	.hero-board {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(45deg, $color-board-light 25%, transparent 25%),
			linear-gradient(-45deg, $color-board-light 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, $color-board-light 75%),
			linear-gradient(-45deg, transparent 75%, $color-board-light 75%);
		background-size: calc(var(--spacing) * 18) calc(var(--spacing) * 18);
		background-position:
			0 0,
			0 calc(var(--spacing) * 9),
			calc(var(--spacing) * 9) calc(var(--spacing) * -9),
			calc(var(--spacing) * -9) 0;
		opacity: 0.12;
		animation: board-drift 18s $ease-out infinite alternate;
		mask-image: linear-gradient(to top, transparent 0%, black 45%, black 100%);
	}

	.hero-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: $size-container-lg;
		margin-inline: auto;
		padding: $space-16 $space-4 $space-12;
		animation: rise-in $duration-base $ease-out both;
	}

	.brand-mark {
		font-family: $font-display;
		font-size: $font-size-5xl;
		font-weight: $font-weight-extrabold;
		line-height: $line-height-tight;
		letter-spacing: $letter-spacing-tight;
		margin: 0;
		background: linear-gradient(120deg, $color-text 0%, $color-primary 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.hero-title {
		margin: $space-4 0 0;
		max-width: 18ch;
		font-family: $font-display;
		font-size: clamp($font-size-xl, 3.5vw, $font-size-3xl);
		font-weight: $font-weight-semibold;
		line-height: $line-height-snug;
		letter-spacing: $letter-spacing-tight;
		color: color-mix(in srgb, $color-text 92%, $color-primary);
	}

	.hero-copy {
		margin: $space-4 0 0;
		max-width: var(--container-xl);
		font-size: $font-size-lg;
		line-height: $line-height-relaxed;
		color: $color-text-muted;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: $space-3;
		margin-top: $space-8;
	}

	.hero-secondary {
		background: color-mix(in srgb, $color-text 8%, transparent);
		border-color: color-mix(in srgb, $color-text 28%, transparent);
		color: $color-text;
		box-shadow: none;

		&:hover {
			background: color-mix(in srgb, $color-text 14%, transparent);
			border-color: color-mix(in srgb, $color-primary 45%, $color-text);
		}
	}

	.features {
		display: grid;
		gap: $space-10;
		padding-block: $space-16;

		@media (min-width: $breakpoint-md) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: $space-8;
		}
	}

	.feature {
		p {
			margin: $space-3 0 0;
			font-size: $font-size-sm;
			line-height: $line-height-relaxed;
			color: $color-text-muted;
		}
	}

	@keyframes board-drift {
		from {
			transform: translate3d(0, 0, 0) scale(1);
		}
		to {
			transform: translate3d(2%, -2%, 0) scale(1.04);
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
