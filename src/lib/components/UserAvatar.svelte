<script>
	import { userInitials } from '$lib/user';

	let {
		name = '',
		image = null,
		size = 'md'
	} = $props();

	const sizeClasses = {
		sm: 'size-sm',
		md: 'size-md',
		lg: 'size-lg',
		xl: 'size-xl'
	};

	const initials = $derived(userInitials(name));
	const sizeClass = $derived(sizeClasses[/** @type {keyof typeof sizeClasses} */ (size)] ?? sizeClasses.md);
</script>

{#if image}
	<img
		src={image}
		alt="{name} profile"
		class="avatar {sizeClass}"
		loading="lazy"
		referrerpolicy="no-referrer"
	/>
{:else}
	<span class="avatar fallback {sizeClass}" aria-hidden="true">{initials}</span>
{/if}

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.avatar {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: $radius-full;
		object-fit: cover;
		background: $color-primary-soft;
		color: $color-primary;
		font-weight: $font-weight-semibold;
	}

	.fallback {
		user-select: none;
	}

	.size-sm {
		width: calc(var(--spacing) * 10);
		height: calc(var(--spacing) * 10);
		font-size: $font-size-sm;
	}

	.size-md {
		width: calc(var(--spacing) * 14);
		height: calc(var(--spacing) * 14);
		font-size: $font-size-base;
	}

	.size-lg {
		width: calc(var(--spacing) * 24);
		height: calc(var(--spacing) * 24);
		font-size: $font-size-2xl;
	}

	.size-xl {
		width: calc(var(--spacing) * 32);
		height: calc(var(--spacing) * 32);
		font-size: $font-size-3xl;
	}
</style>
