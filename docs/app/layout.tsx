import './globals.css';
import { Head } from 'nextra/components';
import { Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';

const navbar = (
  <Navbar
    logo={
      <>
        <img
          src="/logo.png"
          alt="Ticos Docs"
          height="24"
          width="24"
          style={{ height: '24px', width: 'auto' }}
        />
        <span className="ms-2 select-none font-extrabold max-md:hidden">Annota</span>
      </>
    }
    projectLink="https://github.com/bitroc-ai/annota"
  />
);

export const metadata = {
  title: {
    default: 'Annota – Digital Pathology Annotation Framework',
    template: '%s | Annota',
  },
  description:
    'A high-performance annotation framework for whole slide imaging and digital pathology applications.',
  keywords: [
    'Annota',
    'Digital Pathology',
    'Whole Slide Imaging',
    'WSI',
    'Annotations',
    'OpenSeadragon',
    'React',
    'TypeScript',
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/bitroc-ai/annota/tree/main/docs"
          sidebar={{
            defaultMenuCollapseLevel: 1,
            autoCollapse: true,
            defaultOpen: true,
            toggleButton: true,
          }}
          toc={{
            float: true,
          }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
