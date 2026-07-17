<script>
	import './layout.css';
	import '$lib/styles/tokens.scss';
	import '$lib/styles/components.scss';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { isOrganizer, isAdmin } from '$lib/roles';
	import { initTheme } from '$lib/theme.svelte.js';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	onMount(() => {
		initTheme();
	});

	let menuOpen = $state(false);

	const path = $derived($page.url.pathname);

	/** @param {string} href */
	function isActive(href) {
		if (href === '/') return path === '/';
		return path === href || path.startsWith(`${href}/`);
	}

	$effect(() => {
		path;
		menuOpen = false;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="shell">
	<header class="site-header">
		<nav class="site-nav" aria-label="Primary">
			<a href={resolve('/')} class="brand">ChessHub</a>

			<button
				type="button"
				class="menu-toggle"
				aria-expanded={menuOpen}
				aria-controls="site-menu"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<span class="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
				<span class="menu-bars" class:open={menuOpen} aria-hidden="true"></span>
			</button>

			<div id="site-menu" class="nav-panel" class:open={menuOpen}>
				<div class="nav-links">
					<a href={resolve('/tournaments')} class:active={isActive('/tournaments')}>Tournaments</a>
					<a
						href={resolve('/players')}
						class:active={isActive('/players') || path.startsWith('/profile')}
					>
						Players
					</a>
					{#if data.user}
						<a href={resolve('/settings/profile')} class:active={isActive('/settings')}>Profile</a>
						{#if isOrganizer(data.user.role)}
							<a href={resolve('/organizer')} class:active={isActive('/organizer')}>Organizer</a>
						{:else}
							<a href={resolve('/organizer/apply')} class:active={isActive('/organizer')}>Organize</a>
						{/if}
						{#if isAdmin(data.user.role)}
							<a href={resolve('/admin/organizer-requests')} class:active={isActive('/admin')}>
								Admin
							</a>
						{/if}
					{/if}
				</div>

				<div class="nav-actions">
					<ThemeToggle compact />
					{#if data.user}
						<form method="post" action="/logout">
							<button type="submit" class="btn btn-ghost">Sign out</button>
						</form>
					{:else}
						<a href={resolve('/login')} class="btn btn-ghost">Login</a>
						<a href={resolve('/register')} class="btn btn-primary">Register</a>
					{/if}
				</div>
			</div>
		</nav>
	</header>

	<main class="site-main">
		{@render children()}
	</main>
</div>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.shell {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
		background:
			radial-gradient(ellipse 70% 45% at 100% 0%, color-mix(in srgb, $color-accent-glow 14%, transparent), transparent 55%),
			radial-gradient(ellipse 50% 35% at 0% 100%, color-mix(in srgb, $color-primary 8%, transparent), transparent 50%),
			$color-bg;
		color: $color-text;
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 40;
		border-bottom: $border-width solid color-mix(in srgb, $color-border 70%, transparent);
		background: color-mix(in srgb, $color-bg 78%, transparent);
		backdrop-filter: blur(var(--blur-md));
	}

	.site-nav {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $space-4;
		width: 100%;
		max-width: $size-container-lg;
		min-height: $size-header;
		margin-inline: auto;
		padding-inline: $space-4;
	}

	.brand {
		font-family: $font-display;
		font-size: $font-size-xl;
		font-weight: $font-weight-extrabold;
		letter-spacing: $letter-spacing-tight;
		text-decoration: none;
		color: $color-text;
		transition: color $duration-fast $ease-out;

		&:hover {
			color: $color-primary;
		}
	}

	.menu-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: $size-touch-min;
		height: $size-touch-min;
		border: none;
		border-radius: $radius-md;
		background: transparent;
		cursor: pointer;

		@media (min-width: $breakpoint-md) {
			display: none;
		}
	}

	.menu-bars,
	.menu-bars::before,
	.menu-bars::after {
		display: block;
		width: calc(var(--spacing) * 5);
		height: calc(var(--spacing) * 0.5);
		background: $color-text;
		border-radius: $radius-full;
		transition:
			transform $duration-base $ease-out,
			opacity $duration-fast $ease-out;
	}

	.menu-bars {
		position: relative;

		&::before,
		&::after {
			content: '';
			position: absolute;
			left: 0;
		}

		&::before {
			top: calc(var(--spacing) * -1.5);
		}

		&::after {
			top: calc(var(--spacing) * 1.5);
		}

		&.open {
			background: transparent;

			&::before {
				top: 0;
				transform: rotate(45deg);
			}

			&::after {
				top: 0;
				transform: rotate(-45deg);
			}
		}
	}

	.nav-panel {
		display: none;
		flex-direction: column;
		gap: $space-4;
		position: absolute;
		inset-inline: 0;
		top: 100%;
		padding: $space-4;
		background: $color-surface;
		border-bottom: $border-width solid $color-border;
		box-shadow: var(--shadow-md);

		&.open {
			display: flex;
			animation: panel-in $duration-base $ease-out;
		}

		@media (min-width: $breakpoint-md) {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			gap: $space-6;
			position: static;
			padding: 0;
			background: transparent;
			border: none;
			box-shadow: none;
			flex: 1;
		}
	}

	.nav-links {
		display: flex;
		flex-direction: column;
		gap: $space-1;

		a {
			display: flex;
			align-items: center;
			min-height: $size-touch-min;
			padding-inline: $space-3;
			border-radius: $radius-md;
			font-size: $font-size-sm;
			font-weight: $font-weight-medium;
			text-decoration: none;
			color: $color-text-muted;
			transition:
				color $duration-fast $ease-out,
				background-color $duration-fast $ease-out;

			&:hover,
			&.active {
				color: $color-primary;
				background: $color-primary-soft;
			}
		}

		@media (min-width: $breakpoint-md) {
			flex-direction: row;
			align-items: center;
			gap: $space-1;
			margin-left: auto;

			a {
				background: transparent;

				&.active,
				&:hover {
					background: transparent;
				}
			}
		}
	}

	.nav-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: $space-2;
		padding-top: $space-2;
		border-top: $border-width solid $color-border;

		@media (min-width: $breakpoint-md) {
			padding-top: 0;
			border-top: none;
		}
	}

	.site-main {
		flex: 1;
		width: 100%;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(calc(var(--spacing) * -1.5));
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
