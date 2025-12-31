<script lang="ts">
	import "../app.css";
	import Navbar from "$lib/components/layout/Navbar.svelte";

	let { children } = $props();
</script>

<div
	class="min-h-screen bg-white dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-50"
>
	<Navbar />
	{@render children()}
</div>
