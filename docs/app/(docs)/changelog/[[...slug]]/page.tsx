import { generateStaticParamsFor, importPage } from "nextra/pages";
import type { FC } from "react";
import { useMDXComponents as getMDXComponents } from "../../../../mdx-components";

export async function generateStaticParams() {
  const params = await generateStaticParamsFor("slug", "changelog")();
  return params;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const path = params.slug ? ["changelog", ...params.slug] : ["changelog"];
  const { metadata } = await importPage(path);
  return metadata;
}

type PageProps = Readonly<{
  params: Promise<{
    slug?: string[];
  }>;
}>;

const Wrapper = getMDXComponents({}).wrapper!;

const Page: FC<PageProps> = async (props) => {
  const params = await props.params;
  const path = params.slug ? ["changelog", ...params.slug] : ["changelog"];
  const result = await importPage(path);
  const { default: MDXContent, toc, metadata } = result;

  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
};

export default Page;
