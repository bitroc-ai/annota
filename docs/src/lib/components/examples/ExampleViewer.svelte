<script lang="ts">
  interface Props {
    type: string;
    height?: number;
    title?: string;
  }
  let { type, height = 400, title }: Props = $props();

  const defaultTitles: Record<string, string> = {
    rectangle: "Interactive Rectangle Annotation Example",
    polygon: "Interactive Polygon Annotation Example",
    points: "Interactive Points Annotation Example",
  };
</script>

<iframe
  src="/examples/{type}"
  style="width: 100%; height: {height}px; border: 0;"
  title={title || defaultTitles[type] || "Example"}
></iframe>
