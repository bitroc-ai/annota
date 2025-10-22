'use client';

import Link from 'next/link';
import { Code2, Layers, Zap, Package, Github, BookOpen } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/10" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            High-Performance Annotation Framework
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 dark:text-white mb-4 tracking-tight">
            Annota
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-5 font-light">
            Digital Pathology Annotation Framework
          </p>

          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            A high-performance annotation framework for whole slide imaging and digital pathology
            applications. Built with TypeScript and React for modern web development.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              Get Started
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="https://github.com/bitroc-ai/annota"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
            >
              <Github className="mr-2 w-4 h-4" />
              View on GitHub
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
              Built for large-scale whole slide images with modern React patterns
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
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
              Quick Start
            </h2>
            <div className="bg-slate-900 dark:bg-slate-800 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-slate-100">
                <code>{`npm install annota openseadragon react react-dom

import { AnnotaProvider, Annotator, AnnotationEditor } from 'annota';

function App() {
  const [viewer, setViewer] = useState();

  return (
    <AnnotaProvider>
      <Annotator
        viewer={viewer}
        onViewerReady={setViewer}
        tileSources="/image.dzi"
      />
      <AnnotationEditor viewer={viewer} />
    </AnnotaProvider>
  );
}`}</code>
              </pre>
            </div>
            <div className="text-center mt-6">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Read the full guide
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <section className="py-16 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">Ready to Start Annotating?</h2>
          <p className="text-base mb-8 max-w-xl mx-auto text-slate-300">
            Build powerful annotation tools for digital pathology with Annota's comprehensive
            framework
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              Read Documentation
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              API Reference
            </Link>
          </div>
        </div>
      </section>
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
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
