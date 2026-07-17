<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let {
		targetUserId,
		isFollowing = false,
		size = 'md',
		class: className = ''
	} = $props();
</script>

<form
	method="post"
	action="?/toggleFollow"
	use:enhance
	class={className}
>
	<input type="hidden" name="targetUserId" value={targetUserId} />
	<button
		type="submit"
		class="btn {size === 'sm' ? 'btn-sm' : ''} {isFollowing ? 'btn-secondary' : 'btn-primary'}"
	>
		{isFollowing ? 'Following' : 'Follow'}
	</button>
</form>

<style lang="scss">
	:global(.btn-sm) {
		padding: 0.35rem 0.75rem;
		font-size: 0.875rem;
	}
</style>
