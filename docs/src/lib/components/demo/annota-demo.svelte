<script lang="ts">
  import { AnnotaProvider, Annotator } from "annota/svelte";
  import DemoContent from "./demo-content.svelte";

  interface Props {
    imageUrl?: string;
    embeddingUrl?: string;
  }

  let { imageUrl, embeddingUrl }: Props = $props();
  // Annotator wrapper requires viewer, but DemoContent creates viewer.
  // Wait. Annotator component WRAPS children that need context.
  // But typically Annotator component needs `viewer` prop.
  // In React demo: <AnnotaProvider> ... <AnnotaViewer onViewerReady={...}/> <Annotator viewer={viewer}> <Content/> </Annotator> ...

  // Here DemoContent contains AnnotaViewer AND uses logic that depends on Annotator.
  // And `useTool` hook needs `annotator` (from context, provided by Annotator component NOT Provider? NO).
  // Provider provides context. `Annotator` component connects logic to Viewer.

  // React Structure:
  // <Provider>
  //   <AnnotaViewer ... onViewerReady={setViewer} />
  //   <Annotator viewer={viewer}>
  //       <InternalComponent />
  //   </Annotator>
  // </Provider>

  // Svelte DemoContent contains Viewer. So it has `viewer` state.
  // It needs to wrap its content in `<Annotator viewer={viewer}>`.
  // BUT DemoContent *is* the one rendering Viewer.
  // So inside DemoContent:
  /*
     <AnnotaViewer ... bind:this={or onViewerReady} />
     <Annotator viewer={viewer}>
        <!-- What goes here? -->
        <!-- Logic hooks must be called inside components that are children of Provider (yes) and initialized (yes). -->
        <!-- But useTool hook logic is inside DemoContent script. -->
        <!-- Is DemoContent inside Annotator? No, it's inside Provider. -->
     </Annotator>
  */

  // `useTool` calls `useAnnotator()`. `Annotator` component sets the annotator in context.
  // If `DemoContent` is the parent of `Annotator` component, `useAnnotator()` in `DemoContent` will access the context provided by `AnnotaProvider` (which is parent of DemoContent).
  // But context.annotator is initially undefined. `Annotator` component (child of DemoContent) will set it when viewer is ready.
  // Since `useTool` uses getters and tracks changes, it will pick up when `annotator` becomes available in context!
  // So this structure works in Svelte 5!

  // DemoContent:
  // <AnnotaViewer ... />
  // <Annotator viewer={viewer} /> <!-- This activates core logic and updates context -->
  // Script: useTool(...) -> tracks context.

  // So Wrapper only needs Provider.
</script>

<AnnotaProvider>
  <DemoContent {imageUrl} {embeddingUrl} />
</AnnotaProvider>
