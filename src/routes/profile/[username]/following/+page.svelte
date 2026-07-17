<script>
	import ConnectionList from '$lib/components/ConnectionList.svelte';

	let { data } = $props();
</script>

<ConnectionList {data} />
