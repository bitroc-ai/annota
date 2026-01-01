<script lang="ts">
  import { onMount } from "svelte";
  import {
    Zap,
    Code2,
    Layers,
    Package,
    BookOpen,
    ChevronRight,
    MonitorPlay,
    Microscope,
    Brain,
    Hospital,
    FlaskConical,
    Hash,
    Target,
  } from "lucide-svelte";
  import FeatureCard from "$lib/components/landing/FeatureCard.svelte";
  import Footer from "$lib/components/landing/Footer.svelte";

  let AnnotaDemo:
    | typeof import("$lib/components/demo/AnnotaDemo.svelte").default
    | null = $state(null);

  onMount(async () => {
    const module = await import("$lib/components/demo/AnnotaDemo.svelte");
    AnnotaDemo = module.default;
  });

  // Code Snippet Content
  const codeSnippet = `// npm install annota openseadragon

import { AnnotaProvider, Annotator, Viewer, RectangleTool } from 'annota/svelte';

<AnnotaProvider>
  <Viewer
    options={{ tileSources: "/image.dzi" }}
    onViewerReady={(v) => viewer = v}
  />
  <Annotator viewer={viewer}>
    <!-- Use tools, edit annotations -->
  </Annotator>
</AnnotaProvider>`;
</script>

<div
  class="min-h-screen font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950"
>
  <!-- Hero Section -->
  <section
    class="relative overflow-hidden bg-slate-50 dark:bg-slate-950 pt-20 pb-16"
  >
    <div class="absolute inset-0">
      <div
        class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20"
      />
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"
      />
    </div>

    <div class="relative z-10 container mx-auto px-6 py-16">
      <div
        class="flex flex-col lg:flex-row gap-12 items-center max-w-7xl mx-auto"
      >
        <!-- Left: Text Content -->
        <div class="space-y-8 flex-1 text-center lg:text-left">
          <div>
            <div
              class="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 border border-blue-100 dark:border-blue-800"
            >
              <span class="relative flex h-2 w-2 mr-2">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"
                ></span>
                <span
                  class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"
                ></span>
              </span>
              v0.9.0 is now available
            </div>

            <h1
              class="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.1]"
            >
              High-Performance <br />
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
              >
                Image Annotation
              </span>
            </h1>

            <p
              class="text-xl text-slate-600 dark:text-slate-300 mb-8 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0"
            >
              A framework designed for whole slide imaging and digital
              pathology. Handle thousands of annotations with 60 FPS
              performance.
            </p>
          </div>

          <div
            class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <a
              href="/docs"
              class="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
            >
              Get Started
              <ChevronRight class="ml-2 w-5 h-5" />
            </a>
            <a
              href="/playground"
              class="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <MonitorPlay class="mr-2 w-5 h-5" /> Playground
            </a>
          </div>
        </div>

        <!-- Right: Demo -->
        <div
          class="flex flex-col items-center lg:items-end flex-shrink-0 perspective-1000"
        >
          <div
            class="relative transform transition-transform hover:scale-[1.02] duration-500 w-full min-w-[320px] md:min-w-[500px] lg:w-[640px]"
          >
            <div
              class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 dark:opacity-40 animate-pulse"
            ></div>
            <!-- Browser Window Container -->
            <div
              class="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl"
            >
              <div
                class="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
              >
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div class="ml-4 flex-1">
                  <div
                    class="h-6 w-full max-w-[240px] rounded-md bg-slate-200/50 dark:bg-slate-800/50 text-xs flex items-center px-2 text-slate-400 font-mono"
                  >
                    localhost:3000
                  </div>
                </div>
              </div>
              <div
                class="relative w-full aspect-square md:aspect-video lg:w-[640px] lg:h-[640px]"
              >
                {#if AnnotaDemo}
                  <AnnotaDemo />
                {:else}
                  <div
                    class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900"
                  >
                    <div class="text-slate-400 text-sm">Loading demo...</div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section class="py-16 bg-white dark:bg-slate-900">
    <div class="container mx-auto px-6">
      <div class="text-center mb-12">
        <h2
          class="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-3"
        >
          Everything You Need
        </h2>
        <p
          class="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
        >
          Built for large-scale whole slide images with modern Svelte patterns
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="High Performance"
          description="Efficient spatial indexing and rendering for handling thousands of annotations on gigapixel images"
        >
          {#snippet children()}
            <Zap class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          title="React & Svelte"
          description="Modern hooks and runes API with TypeScript support for intuitive integration in React and Svelte apps"
        >
          {#snippet children()}
            <Code2 class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          title="Layer System"
          description="Organize annotations into multiple layers with independent styling and visibility control"
        >
          {#snippet children()}
            <Layers class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          title="Extensible Tools"
          description="Built-in point, rectangle, and polygon tools with support for custom annotation types"
        >
          {#snippet children()}
            <Package class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          title="OpenSeadragon Integration"
          description="Seamless integration with OpenSeadragon for professional whole slide image viewing"
        >
          {#snippet children()}
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          {/snippet}
        </FeatureCard>
        <FeatureCard
          title="Well Documented"
          description="Comprehensive documentation with examples and API reference for all features"
        >
          {#snippet children()}
            <BookOpen class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
      </div>
    </div>
  </section>

  <!-- Quick Start -->
  <section class="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
    <div
      class="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"
    ></div>
    <div class="container mx-auto px-6 relative z-10">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-10">
          <h2
            class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4"
          >
            Get Started in Seconds
          </h2>
          <p class="text-lg text-slate-600 dark:text-slate-400">
            Simple, intuitive API that feels right at home in your Svelte
            application
          </p>
        </div>

        <div
          class="transform transition-all hover:scale-[1.01] duration-500 shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#1e1e1e]"
        >
          <div
            class="flex items-center px-4 py-2 border-b border-white/10 bg-white/5"
          >
            <span class="text-xs text-slate-400">App.svelte</span>
          </div>
          <div class="p-6 overflow-x-auto">
            <pre class="text-sm leading-relaxed text-[#d4d4d4] font-mono"><code
                >{codeSnippet}</code
              ></pre>
          </div>
        </div>

        <div class="text-center mt-10">
          <a
            href="/docs/getting-started"
            class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-lg transition-colors group"
          >
            Read the full guide
            <svg
              class="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Use Cases -->
  <section class="py-16 bg-white dark:bg-slate-900">
    <div class="container mx-auto px-6">
      <div class="text-center mb-12">
        <h2
          class="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-3"
        >
          Powering Real-World Applications
        </h2>
        <p
          class="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
        >
          From digital pathology to microscopy and beyond, see how Annota
          enables annotation workflows
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          variant="ghost"
          title="Diagnostic Pathology"
          description="Enable pathologists to annotate regions of interest on WSI for diagnostic review and consultation"
        >
          {#snippet children()}
            <Microscope class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          variant="ghost"
          title="AI Model Training"
          description="Create high-quality labeled datasets for training deep learning models in computational pathology"
        >
          {#snippet children()}
            <Brain class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          variant="ghost"
          title="Research & Analysis"
          description="Quantify and analyze tissue features, cell populations, and morphological patterns"
        >
          {#snippet children()}
            <FlaskConical class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          variant="ghost"
          title="Cell Detection & Counting"
          description="Precisely mark nuclei, tumor cells, and immune cells for quantitative analysis"
        >
          {#snippet children()}
            <Hash class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          variant="ghost"
          title="Tumor Delineation"
          description="Outline tumor regions, invasion fronts, and microenvironments with polygon tools"
        >
          {#snippet children()}
            <Target class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
        <FeatureCard
          variant="ghost"
          title="Multi-User Collaboration"
          description="Support team-based annotation workflows with layer management and concurrent editing"
        >
          {#snippet children()}
            <Hospital class="w-6 h-6" />
          {/snippet}
        </FeatureCard>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section
    class="py-16 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white"
  >
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-3xl md:text-4xl font-semibold mb-4">
        Ready to Start Annotating?
      </h2>
      <p class="text-base mb-8 max-w-xl mx-auto text-slate-300">
        Build powerful annotation tools for digital pathology with Annota's
        comprehensive framework
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/docs"
          class="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors duration-200"
        >
          Read Documentation
          <svg
            class="ml-2 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
        <a
          href="/api"
          class="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors duration-200"
        >
          API
        </a>
      </div>
    </div>
  </section>

  <Footer />
</div>
