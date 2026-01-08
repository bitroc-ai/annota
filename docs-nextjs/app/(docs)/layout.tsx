import { Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";

// Mintlify-inspired theme overrides
const themeStyles = `
  :root {
    --nextra-primary-hue: 158deg !important;
    --nextra-primary-saturation: 64% !important;
    --nextra-primary-lightness: 52% !important;
  }
  .dark {
    --nextra-primary-hue: 160deg !important;
    --nextra-primary-saturation: 84% !important;
    --nextra-primary-lightness: 45% !important;
  }
  /* Dark sidebar */
  aside { background: #0f0f0f !important; border-right: 1px solid #262626 !important; }
  aside > div { background: #0f0f0f !important; }
  .dark aside, .dark aside > div { background: #0a0a0a !important; }
  /* Sidebar links */
  aside a { color: #a3a3a3 !important; }
  aside a:hover { color: #fff !important; background: rgba(255,255,255,0.05) !important; }
  /* Active link - mint green */
  aside a[aria-current="page"] { color: #10b981 !important; background: rgba(16,185,129,0.1) !important; }
  .dark aside a[aria-current="page"] { color: #34d399 !important; background: rgba(52,211,153,0.1) !important; }
  /* Content links - mint green */
  main a:not(aside a) { color: #10b981 !important; }
  .dark main a:not(aside a) { color: #34d399 !important; }
  /* List markers */
  main li::marker { color: #10b981 !important; }
  .dark main li::marker { color: #34d399 !important; }
  /* Inline code - mint tint */
  code:not(pre code) { background: rgba(16,185,129,0.1) !important; color: #047857 !important; }
  .dark code:not(pre code) { background: rgba(52,211,153,0.15) !important; color: #6ee7b7 !important; }
`;

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
          src="/logo.svg"
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
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      <Layout
        navbar={navbar}
        editLink="Edit this page on GitHub"
        docsRepositoryBase="https://github.com/bitroc-ai/annota"
        sidebar={{ defaultMenuCollapseLevel: 2 }}
        pageMap={filteredPageMap}
      >
        {children}
      </Layout>
    </>
  );
}
