<script lang="ts">
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'

	let { children } = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Motion UI</title>
	<meta name="description" content="Motion camera live view and archive browser" />
</svelte:head>

{@render children()}
