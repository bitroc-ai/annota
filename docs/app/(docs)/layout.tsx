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
    <Layout
      navbar={navbar}
      editLink="Edit this page on GitHub"
      docsRepositoryBase="https://github.com/bitroc-ai/annota"
      sidebar={{ defaultMenuCollapseLevel: 2 }}
      pageMap={filteredPageMap}
    >
      {children}
    </Layout>
  );
}
