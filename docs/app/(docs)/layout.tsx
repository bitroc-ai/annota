import { Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";

export const metadata = {
  title: {
    default: "Annota - High-performance Image Annotation",
    template: "%s | Annota",
  },
  description:
    "A high-performance annotation framework for whole slide imaging and digital pathology applications.",
  keywords: [
    "Annota",
    "Digital Pathology",
    "Whole Slide Imaging",
    "WSI",
    "Annotations",
    "OpenSeadragon",
    "React",
    "TypeScript",
  ],
};

const navbar = (
  <Navbar
    logo={
      <>
        <img
          src="/logo.png"
          alt="Annota"
          height="24"
          width="128"
          className="w-auto h-6 mr-2"
        />
        <span className="font-semibold">Annota</span>
      </>
    }
    projectLink="https://github.com/bitroc-ai/annota"
  />
);

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

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageMap = await getPageMap();

  // Filter out the (bare) route group pages from the page map
  const filteredPageMap = pageMap.filter((item: any) => {
    return item.name !== "examples";
  });

  return (
    <Layout
      navbar={navbar}
      editLink="Edit this page on GitHub"
      docsRepositoryBase="https://github.com/bitroc-ai/annota"
      sidebar={{ defaultMenuCollapseLevel: 2 }}
      pageMap={filteredPageMap}
      footer={<Footer />}
    >
      {children}
    </Layout>
  );
}
