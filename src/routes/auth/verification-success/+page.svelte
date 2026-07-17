<script>
	import { resolve } from '$app/paths';
</script>

<section class="page-narrow center">
	<h1 class="page-title">Email verified</h1>
	<p class="page-lede">Your email has been verified. You can continue using ChessHub.</p>
	<a href={resolve('/')} class="btn btn-primary">Go home</a>
</section>

<style lang="scss">
	@use 'lib/styles/variables' as *;

	.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: $space-4;
		padding-block: $space-16;
	}
</style>
