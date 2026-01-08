<script lang="ts">
  interface Props {
    children: import("svelte").Snippet;
  }
  let { children }: Props = $props();
</script>

<div
  class="nextra-steps ml-4 mb-12 border-l border-gray-200 dark:border-neutral-800 pl-6 [counter-reset:step]"
>
  {@render children()}
</div>

<style>
  /* Global styles for steps should be handled in app.css or passed through global modifier */
  /* But mdsvex renders content inside slot. We need CSS to target children heading (h3) */
  :global(.nextra-steps h3) {
    counter-increment: step;
    position: relative;
  }
  :global(.nextra-steps h3::before) {
    content: counter(step);
    position: absolute;
    left: -2.4rem; /* Adjust based on padding */
    top: 50%;
    transform: translateY(-50%);
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: var(--background); /* Use variable or default */
    border: 1px solid #e5e7eb; /* gray-200 */
    color: #6b7280; /* gray-500 */
    text-align: center;
    line-height: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
  :global(.dark .nextra-steps h3::before) {
    background-color: #0f172a; /* slate-950 or similar */
    border-color: #262626; /* neutral-800 */
    color: #a3a3a3; /* neutral-400 */
  }
</style>
