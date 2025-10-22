import '../globals.css';
import { Head } from 'nextra/components';
import { Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';

const navbar = (
  <Navbar
    logo={
      <>
        <img
          src="/logo.png"
          alt="Annota"
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

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const pageMap = await getPageMap();
  return (
    <>
      <Head />
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
    </>
  );
}
