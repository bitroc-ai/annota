<script lang="ts">
  // Redirect to first guide or show guide index
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  onMount(() => {
    goto('/docs/guides/tools');
  });
</script>

