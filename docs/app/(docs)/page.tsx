import Link from "next/link";
import {
  Code2,
  Layers,
  Zap,
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
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/10" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 dark:text-white mb-4 tracking-tight">
            Annota
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-5 font-light">
            High-Performance Image Annotation Framework
          </p>

          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            A high-performance annotation framework for whole slide imaging and
            digital pathology applications. Built with TypeScript and React for
            modern web development.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              Get Started
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/playground"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              <MonitorPlay className="mr-2 w-5 h-5" /> Playground
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-3">
              Everything You Need
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Built for large-scale whole slide images with modern React
              patterns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="High Performance"
              description="Efficient spatial indexing and rendering for handling thousands of annotations on gigapixel images"
            />
            <FeatureCard
              icon={<Code2 className="w-8 h-8" />}
              title="React First"
              description="Modern hooks API with TypeScript support for intuitive integration in React applications"
            />
            <FeatureCard
              icon={<Layers className="w-8 h-8" />}
              title="Layer System"
              description="Organize annotations into multiple layers with independent styling and visibility control"
            />
            <FeatureCard
              icon={<Package className="w-8 h-8" />}
              title="Extensible Tools"
              description="Built-in point, rectangle, and polygon tools with support for custom annotation types"
            />
            <FeatureCard
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
              }
              title="OpenSeadragon Integration"
              description="Seamless integration with OpenSeadragon for professional whole slide image viewing"
            />
            <FeatureCard
              icon={<BookOpen className="w-8 h-8" />}
              title="Well Documented"
              description="Comprehensive documentation with examples and API reference for all features"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-3">
              Powering Real-World Applications
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From digital pathology to microscopy and beyond, see how Annota
              enables annotation workflows
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Microscope className="w-8 h-8" />}
              title="Diagnostic Pathology"
              description="Enable pathologists to annotate regions of interest on WSI for diagnostic review and consultation"
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI Model Training"
              description="Create high-quality labeled datasets for training deep learning models in computational pathology"
            />
            <FeatureCard
              icon={<FlaskConical className="w-8 h-8" />}
              title="Research & Analysis"
              description="Quantify and analyze tissue features, cell populations, and morphological patterns"
            />
            <FeatureCard
              icon={<Hash className="w-8 h-8" />}
              title="Cell Detection & Counting"
              description="Precisely mark nuclei, tumor cells, and immune cells for quantitative analysis"
            />
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Tumor Delineation"
              description="Outline tumor regions, invasion fronts, and microenvironments with polygon tools"
            />
            <FeatureCard
              icon={<Hospital className="w-8 h-8" />}
              title="Multi-User Collaboration"
              description="Support team-based annotation workflows with layer management and concurrent editing"
            />
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
              Quick Start
            </h2>

            {/* Window Frame */}
            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl">
              {/* Window Header */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    app.tsx
                  </span>
                </div>
              </div>

              {/* Code Content */}
              <div className="bg-slate-900 dark:bg-slate-950 p-6 overflow-x-auto">
                <pre className="text-sm leading-relaxed border-0 m-0 p-0 border-none!">
                  <code className="text-slate-100">
                    <span className="text-slate-500">
                      {"// npm install annota openseadragon react react-dom"}
                    </span>
                    {"\n\n"}
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-slate-300">{"{"}</span>{" "}
                    <span className="text-blue-300">AnnotaProvider</span>
                    <span className="text-slate-300">,</span>{" "}
                    <span className="text-blue-300">Annotator</span>
                    <span className="text-slate-300">,</span>{" "}
                    <span className="text-blue-300">AnnotationEditor</span>{" "}
                    <span className="text-slate-300">{"}"}</span>{" "}
                    <span className="text-purple-400">from</span>{" "}
                    <span className="text-green-300">'annota'</span>
                    <span className="text-slate-300">;</span>
                    {"\n\n"}
                    <span className="text-purple-400">function</span>{" "}
                    <span className="text-yellow-300">App</span>
                    <span className="text-slate-300">() {"{"}</span>
                    {"\n  "}
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-slate-300">[</span>
                    <span className="text-blue-300">viewer</span>
                    <span className="text-slate-300">,</span>{" "}
                    <span className="text-blue-300">setViewer</span>
                    <span className="text-slate-300">]</span>{" "}
                    <span className="text-slate-300">=</span>{" "}
                    <span className="text-yellow-300">useState</span>
                    <span className="text-slate-300">();</span>
                    {"\n\n  "}
                    <span className="text-purple-400">return</span>{" "}
                    <span className="text-slate-300">(</span>
                    {"\n    "}
                    <span className="text-slate-300">{"<"}</span>
                    <span className="text-blue-300">AnnotaProvider</span>
                    <span className="text-slate-300">{">"}</span>
                    {"\n      "}
                    <span className="text-slate-300">{"<"}</span>
                    <span className="text-blue-300">Annotator</span>
                    {"\n        "}
                    <span className="text-pink-300">viewer</span>
                    <span className="text-slate-300">=</span>
                    <span className="text-slate-300">{"{"}</span>
                    <span className="text-blue-300">viewer</span>
                    <span className="text-slate-300">{"}"}</span>
                    {"\n        "}
                    <span className="text-pink-300">onViewerReady</span>
                    <span className="text-slate-300">=</span>
                    <span className="text-slate-300">{"{"}</span>
                    <span className="text-blue-300">setViewer</span>
                    <span className="text-slate-300">{"}"}</span>
                    {"\n        "}
                    <span className="text-pink-300">tileSources</span>
                    <span className="text-slate-300">=</span>
                    <span className="text-green-300">"/image.dzi"</span>
                    {"\n      "}
                    <span className="text-slate-300">{"/>"}</span>
                    {"\n      "}
                    <span className="text-slate-300">{"<"}</span>
                    <span className="text-blue-300">AnnotationEditor</span>{" "}
                    <span className="text-pink-300">viewer</span>
                    <span className="text-slate-300">=</span>
                    <span className="text-slate-300">{"{"}</span>
                    <span className="text-blue-300">viewer</span>
                    <span className="text-slate-300">{"}"}</span>{" "}
                    <span className="text-slate-300">{"/>"}</span>
                    {"\n    "}
                    <span className="text-slate-300">{"</"}</span>
                    <span className="text-blue-300">AnnotaProvider</span>
                    <span className="text-slate-300">{">"}</span>
                    {"\n  "}
                    <span className="text-slate-300">);</span>
                    {"\n"}
                    <span className="text-slate-300">{"}"}</span>
                  </code>
                </pre>
              </div>
            </div>

            <div className="text-center mt-6">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Read the full guide
                <svg
                  className="ml-1 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-linear-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Ready to Start Annotating?
          </h2>
          <p className="text-base mb-8 max-w-xl mx-auto text-slate-300">
            Build powerful annotation tools for digital pathology with Annota's
            comprehensive framework
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              Read Documentation
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="/api"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors duration-200"
            >
              API
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-200">
      <div className="text-blue-600 dark:text-blue-400 mb-3">{icon}</div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Footer Content */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Annota"
                className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity brightness-0 dark:brightness-100 dark:invert dark:opacity-40 dark:hover:opacity-60"
              />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © {new Date().getFullYear()} Annota Team.
              </p>
            </div>
            <div className="flex gap-6">
              <a
                href="https://github.com/bitroc-ai/annota"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/bitroc-ai/annota/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Issues
              </a>
              <a
                href="/docs/changelog"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Changelog
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
