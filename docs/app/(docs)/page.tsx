"use client";

import React from "react";
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
import dynamic from "next/dynamic";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BrowserWindow } from "@/components/ui/browser-window";

const AnnotaDemo = dynamic(
  () =>
    import("@/components/examples").then((mod) => ({
      default: mod.AnnotaDemo,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-800">
        <img
          src="/playground/images/test/0.png"
          alt="Loading preview"
          className="w-full h-full object-cover"
        />
      </div>
    ),
  }
);

function HeroDemo() {
  return (
    <div className="w-full min-w-[640px] lg:w-[640px] flex justify-center lg:justify-end">
      <BrowserWindow>
        <div className="w-[640px] h-[640px]">
          <AnnotaDemo />
        </div>
      </BrowserWindow>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Integrated Demo */}
      {/* Hero Section with Integrated Demo */}
      <section className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 pt-20 pb-16">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row gap-12 items-center max-w-7xl mx-auto">
            {/* Left: Text Content */}
            <div className="space-y-8 flex-1 text-center lg:text-left">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 border border-blue-100 dark:border-blue-800">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  v0.8.3 is now available
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
                  High-Performance <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Image Annotation
                  </span>
                </h1>

                <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  A framework designed for whole slide imaging and digital pathology. 
                  Handle thousands of annotations with 60 FPS performance.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                >
                  Get Started
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/playground"
                  className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <MonitorPlay className="mr-2 w-5 h-5" /> Playground
                </Link>
              </div>
            </div>

            {/* Right: Demo */}
            <div className="flex flex-col items-center lg:items-end flex-shrink-0 perspective-1000">
              <div className="relative transform transition-transform hover:scale-[1.02] duration-500">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 dark:opacity-40 animate-pulse"></div>
                <HeroDemo />
              </div>
            </div>
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

      {/* Quick Start */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Get Started in Seconds
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Simple, intuitive API that feels right at home in your React application
              </p>
            </div>

            <div className="transform transition-all hover:scale-[1.01] duration-500 shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <BrowserWindow title="app.tsx">
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: "0.9rem",
                    lineHeight: "1.6",
                    padding: "1.5rem",
                    background: "#1e1e1e",
                  }}
                  showLineNumbers={true}
                  lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#6e7681", textAlign: "right" }}
                >
                  {`// npm install annota openseadragon react react-dom

import { AnnotaProvider, Annotator, AnnotaViewer, AnnotationEditor } from 'annota';

function App() {
  const [viewer, setViewer] = useState();

  return (
    <AnnotaProvider>
      <AnnotaViewer
        options={{ tileSources: "/image.dzi" }}
        onViewerReady={setViewer}
      />
      <Annotator viewer={viewer}>
        <AnnotationEditor viewer={viewer} />
      </Annotator>
    </AnnotaProvider>
  );
}`}
                </SyntaxHighlighter>
              </BrowserWindow>
            </div>

            <div className="text-center mt-10">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-lg transition-colors group"
              >
                Read the full guide
                <svg
                  className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-white dark:bg-slate-900">
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
              variant="ghost"
              icon={<Microscope className="w-8 h-8" />}
              title="Diagnostic Pathology"
              description="Enable pathologists to annotate regions of interest on WSI for diagnostic review and consultation"
            />
            <FeatureCard
              variant="ghost"
              icon={<Brain className="w-8 h-8" />}
              title="AI Model Training"
              description="Create high-quality labeled datasets for training deep learning models in computational pathology"
            />
            <FeatureCard
              variant="ghost"
              icon={<FlaskConical className="w-8 h-8" />}
              title="Research & Analysis"
              description="Quantify and analyze tissue features, cell populations, and morphological patterns"
            />
            <FeatureCard
              variant="ghost"
              icon={<Hash className="w-8 h-8" />}
              title="Cell Detection & Counting"
              description="Precisely mark nuclei, tumor cells, and immune cells for quantitative analysis"
            />
            <FeatureCard
              variant="ghost"
              icon={<Target className="w-8 h-8" />}
              title="Tumor Delineation"
              description="Outline tumor regions, invasion fronts, and microenvironments with polygon tools"
            />
            <FeatureCard
              variant="ghost"
              icon={<Hospital className="w-8 h-8" />}
              title="Multi-User Collaboration"
              description="Support team-based annotation workflows with layer management and concurrent editing"
            />
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
  variant?: "default" | "ghost";
}

function FeatureCard({
  icon,
  title,
  description,
  variant = "default",
}: FeatureCardProps) {
  const isGhost = variant === "ghost";

  return (
    <div
      className={`group relative p-6 rounded-2xl transition-all duration-300 ${
        isGhost
          ? "bg-transparent border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
          : "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
      }`}
    >
      <div
        className={`mb-4 inline-flex p-3 rounded-xl transition-colors duration-300 ${
          isGhost
            ? "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
            : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
        }`}
      >
        {/* @ts-ignore - cloneElement is safe here given the icon prop type */}
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Annota"
              className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity brightness-0 dark:brightness-100 dark:invert"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Annota Team. Open Source MIT.
            </p>
          </div>
          <div className="flex gap-8">
            <a
              href="https://github.com/bitroc-ai/annota"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/bitroc-ai/annota/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Issues
            </a>
            <a
              href="/docs/changelog"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Changelog
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
